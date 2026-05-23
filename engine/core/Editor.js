/**
 * engine/core/Editor.js
 *6
 * Núcleo principal da IDE/editor.
 *
 * Responsabilidades:
 * - inicializar módulos
 * - conectar sistemas
 * - controlar documento
 * - controlar renderização
 * - controlar eventos
 * - controlar lifecycle
 * - expor API pública
 *
 * Arquitetura:
 *
 * Editor
 * ├── State
 * ├── Config
 * ├── EventBus
 * ├── Lifecycle
 * ├── Document
 * ├── Renderer
 * ├── DOMManager
 * ├── Cursor
 * ├── Tokenizer
 * ├── HistoryManager
 * ├── Keyboard
 * ├── Mouse
 * ├── Clipboard
 * └── IME
 */

import State from "./State.js";
import Config from "./Config.js";
import EventBus from "./EventBus.js";
import Lifecycle from "./Lifecycle.js";

import Document from "../model/Document.js";
import Position from "../model/Position.js";
import Selection from "../model/Selection.js";

import Renderer from "../view/Renderer.js";
import DOMManager from "../view/DOMManager.js";
import Cursor from "../view/Cursor.js";
import VirtualScroll from "../view/VirtualScroll.js";

import Tokenizer from "../tokenizer/Tokenizer.js";

import HistoryManager from "../history/HistoryManager.js";

import Keyboard from "../input/Keyboard.js";
import Mouse from "../input/Mouse.js";
import Clipboard from "../input/Clipboard.js";
import IME from "../input/IME.js";

import InsertText from "../commands/InsertText.js";
import DeleteText from "../commands/DeleteText.js";
import Undo from "../commands/Undo.js";
import Redo from "../commands/Redo.js";

export default class Editor {
  /**
   * @param {HTMLElement|string} container
   * @param {Object} options
   */
  constructor(
    container,
    options = {}
  ) {
    /**
     * Container
     */
    this.container =
      typeof container ===
      "string"
        ? document.querySelector(
            container
          )
        : container;

    /**
     * Opções
     */
    this.options = options;

    /**
     * Estado editor
     */
    this.ready = false;

    /**
     * Core
     */
    this.state =
      new State();

    this.config =
      new Config(options);

    this.events =
      new EventBus({
        debug:
          options.debug,
      });

    this.lifecycle =
      new Lifecycle({
        name:
          "WebIDEEditor",
      });

    /**
     * Documento
     */
    this.document =
      new Document(
        options.value || ""
      );

    /**
     * Tokenizer
     */
    this.tokenizer =
      new Tokenizer({
        language:
          options.language ||
          "plain",
      });

    /**
     * DOM
     */
    this.dom =
      new DOMManager({
        container:
          this.container,
      });

    /**
     * Renderer
     */
    this.renderer =
      new Renderer({
        editor: this,
        document:
          this.document,
        dom: this.dom,
        tokenizer:
          this.tokenizer,
      });

    
    /**
     * Cursor
     */
    this.cursor =
      new Cursor({

        /**
         * Layer visual
         */
        container:
          this.dom.overlay,

        /**
         * Documento
         */
        document:
          this.document,

        /**
         * Renderer
         */
        renderer:
          this.renderer
      });
      

    /**
     * Virtual scroll
     */
    this.virtualScroll =
      new VirtualScroll({
        document:
          this.document,
        renderer:
          this.renderer,
        dom: this.dom,
      });

    /**
     * History
     */
    this.history =
      new HistoryManager();

    /**
     * Inputs
     */
    this.keyboard =
      new Keyboard({
        editor: this,
      });

    this.mouse =
      new Mouse({
        editor: this,
      });

    this.clipboard =
      new Clipboard({
        editor: this,
      });

    this.ime =
      new IME({
        editor: this,
      });

    /**
     * Seleção
     */
    this.selection =
      new Selection(
        new Position(0, 0),
        new Position(0, 0)
      );

    /**
     * Commands
     */
    this.commands =
      new Map();

    /**
     * Inicializa
     */
    this._registerCommands();

    this._bindEvents();

    this._boot();

    this.renderer.render();
  }

  /**
   * Boot editor.
   * @private
   */
  async _boot() {
    await this.lifecycle.boot();

    await this.lifecycle.init();

    await this.lifecycle.mount(
      this.container
    );

    this.render();

    this.focus();

    this.ready = true;

    this.events.emit(
      "editor:ready",
      {
        editor: this,
      }
    );
  }

  /**
   * Registra comandos.
   * @private
   */
  _registerCommands() {
    this.registerCommand(
      "insertText",
      InsertText
    );

    this.registerCommand(
      "deleteText",
      DeleteText
    );

    this.registerCommand(
      "undo",
      Undo
    );

    this.registerCommand(
      "redo",
      Redo
    );
  }

  /**
   * Eventos internos.
   * @private
   */
  _bindEvents() {
    /**
     * Documento alterado
     */
    this.document.on(
      "change",
      event => {
        this.state.set(
          "dirty",
          true
        );

        this.render();

        this.events.emit(
          "document:change",
          event
        );
      }
    );

    /**
     * Cursor move
     */
    this.cursor.on(
      "move",
      position => {
        this.state.set(
          "cursor",
          position
        );

        this.events.emit(
          "cursor:move",
          position
        );
      }
    );

    /**
     * Scroll
     */
    this.dom.on(
      "scroll",
      scroll => {
        this.state.set(
          "scroll",
          scroll
        );

        this.events.emit(
          "scroll",
          scroll
        );
      }
    );
  }

  /**
   * Render editor.
   */
  render() {
    if (!this.ready) {
      return;
    }

    this.renderer.render();

    this.cursor.render();
  }

  /**
   * Executa comando.
   * @param {string} name
   * @param  {...any} args
   * @returns {*}
   */
  executeCommand(
    name,
    ...args
  ) {
    const Command =
      this.commands.get(name);

    if (!Command) {
      console.warn(
        `Command "${name}" not found`
      );

      return null;
    }

    const command =
      new Command(this);

    const result =
      command.execute(
        ...args
      );

    this.events.emit(
      "command:execute",
      {
        name,
        args,
      }
    );

    return result;
  }

  /**
   * Registra comando.
   * @param {string} name
   * @param {Function} command
   */
  registerCommand(
    name,
    command
  ) {
    this.commands.set(
      name,
      command
    );
  }

  /**
   * Insere texto.
   * @param {string} text
   */
  insertText(text) {
    return this.executeCommand(
      "insertText",
      text
    );
  }

  /**
   * Remove texto.
   * @param {number} count
   */
  deleteText(count = 1) {
    return this.executeCommand(
      "deleteText",
      count
    );
  }

  /**
   * Undo.
   */
  undo() {
    return this.executeCommand(
      "undo"
    );
  }

  /**
   * Redo.
   */
  redo() {
    return this.executeCommand(
      "redo"
    );
  }

  /**
   * Define valor.
   * @param {string} value
   */
  setValue(value) {
    this.document.setValue(
      value
    );

    this.render();
  }

  /**
   * Retorna valor.
   * @returns {string}
   */
  getValue() {
    return this.document.getValue();
  }

  /**
   * Define linguagem.
   * @param {string} language
   */
  setLanguage(language) {
    this.tokenizer.setLanguage(
      language
    );

    this.state.set(
      "language",
      language
    );

    this.render();
  }

  /**
   * Define tema.
   * @param {string} theme
   */
  setTheme(theme) {
    this.config.applyPreset(
      theme
    );

    this.state.set(
      "theme",
      theme
    );

    this.render();
  }

  /**
   * Move cursor.
   * @param {number} line
   * @param {number} column
   */
  setCursorPosition(
    line,
    column
  ) {
    this.cursor.moveTo(
      line,
      column
    );
  }

  /**
   * Retorna posição cursor.
   * @returns {Object}
   */
  getCursorPosition() {
    return this.cursor.getPosition();
  }

  /**
   * Focus editor.
   */
  focus() {
    this.dom.focus();

    this.state.set(
      "focused",
      true
    );
  }

  /**
   * Blur editor.
   */
  blur() {
    this.dom.blur();

    this.state.set(
      "focused",
      false
    );
  }

  /**
   * Resize editor.
   */
  resize() {
    this.renderer.resize();

    this.virtualScroll.update();

    this.render();
  }

  /**
   * Seleciona tudo.
   */
  selectAll() {
    const lastLine =
      this.document.lineCount() -
      1;

    const lastColumn =
      this.document
        .getLine(lastLine)
        ?.length || 0;

    this.selection =
      new Selection(
        new Position(0, 0),
        new Position(
          lastLine,
          lastColumn
        )
      );

    this.render();
  }

  /**
   * Limpa editor.
   */
  clear() {
    this.setValue("");
  }

  /**
   * Salva estado.
   * @returns {Object}
   */
  saveState() {
    return {
      value:
        this.getValue(),
      cursor:
        this.getCursorPosition(),
      language:
        this.tokenizer.getLanguage(),
      theme:
        this.state.get(
          "theme"
        ),
    };
  }

  /**
   * Restaura estado.
   * @param {Object} state
   */
  restoreState(state) {
    if (!state) {
      return;
    }

    if (state.value) {
      this.setValue(
        state.value
      );
    }

    if (state.language) {
      this.setLanguage(
        state.language
      );
    }

    if (state.theme) {
      this.setTheme(
        state.theme
      );
    }

    if (state.cursor) {
      this.setCursorPosition(
        state.cursor.line,
        state.cursor.column
      );
    }
  }

  /**
   * Listener evento.
   * @param {string} event
   * @param {Function} callback
   */
  on(event, callback) {
    this.events.on(
      event,
      callback
    );
  }

  /**
   * Remove listener.
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    this.events.off(
      event,
      callback
    );
  }

  /**
   * Destrói editor.
   */
  async destroy() {
    await this.lifecycle.destroy();

    this.keyboard.destroy();
    this.mouse.destroy();
    this.clipboard.destroy();
    this.ime.destroy();

    this.renderer.destroy();
    this.cursor.destroy();
    this.virtualScroll.destroy();

    this.document.destroy();

    this.history.destroy();

    this.events.destroy();

    this.state.destroy();

    this.config.destroy();

    this.ready = false;
  }
}
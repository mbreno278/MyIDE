/**
 * engine/view/Cursor.js
 *26
 * Responsável pelo cursor visual do editor.
 *
 * Responsabilidades:
 * - renderizar cursor
 * - mover cursor
 * - calcular posição visual
 * - controlar blink
 * - sincronizar com Document
 * - scroll automático
 *
 * Usado em:
 * - EditorView
 * - Selection
 * - Keyboard
 * - Mouse
 */

import Position from "../model/Position.js";
import * as DOM from "../utils/DOM.js";

export default class Cursor {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container
   * @param {Object} options.document
   * @param {Object} [options.renderer]
   */
  constructor(options = {}) {
    /**
     * Container visual
     * @type {HTMLElement}
     */
    this.container =
      options.container;

    /**
     * Documento
     */
    this.document =
      options.document;

    /**
     * Renderer
     */
    this.renderer =
      options.renderer || null;

    /**
     * Estado do cursor
     */
    this.position =
      new Position();

    /**
     * Cursor visível
     */
    this.visible = true;

    /**
     * Blink habilitado
     */
    this.blink = true;

    /**
     * Intervalo blink
     */
    this.blinkInterval = 530;

    /**
     * Timer blink
     */
    this.blinkTimer = null;

    /**
     * Altura do cursor
     */
    this.height = 20;

    /**
     * Largura do cursor
     */
    this.width = 2;

    /**
     * Scroll automático
     */
    this.autoScroll = true;

    /**
     * Estado focus
     */
    this.focused = false;

    /**
     * Elemento DOM
     */
    this.element =
      this._createElement();
      
    /**
     * Eventos
     */
    this.listeners = new Map();

    /**
     * Inicialização
     */
    this._bindEvents();

    this.startBlink();

    this.document.on("cursorChange", () => this.update());
  }

  /**
   * Cria elemento visual.
   * @private
   * @returns {HTMLElement}
   */
  _createElement() {
    const element =
      DOM.createElement("div", {
        className:
          "editor-cursor",
      });

    DOM.css(element, {
      position: "absolute",
      top: "0px",
      left: "0px",
      width:
        `${this.width}px`,
      height:
        `${this.height}px`,
      pointerEvents: "none",
      zIndex: "100",
    });

    DOM.append(
      this.container,
      element
    );

    return element;
  }

  /**
   * Registra eventos.
   * @private
   */
  _bindEvents() {
    if (
      !this.document ||
      typeof this.document.on !==
        "function"
    ) {
      return;
    }

    this.document.on(
      "cursorChange",
      cursor => {
        this.setPosition(
          cursor
        );
      }
    );

    this.document.on(
      "change",
      () => {
        this.render();
      }
    );
  }

  /**
   * Adiciona listener.
   * @param {string} event
   * @param {Function} callback
   */
  on(event, callback) {
  
    if (typeof callback !== "function") {
      return;
    }
  
    if (!this.listeners.has(event)) {
      this.listeners.set(
        event,
        new Set()
      );
    }
  
    this.listeners
      .get(event)
      .add(callback);
  }
  
  /**
   * Remove listener.
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
  
    const listeners =
      this.listeners.get(event);
  
    if (!listeners) {
      return;
    }
  
    listeners.delete(callback);
  }
  
  /**
   * Emite evento.
   * @param {string} event
   * @param {*} payload
   */
  emit(event, payload = {}) {
  
    const listeners =
      this.listeners.get(event);
  
    if (!listeners) {
      return;
    }
  
    for (const callback of listeners) {
  
      try {
        callback(payload);
      } catch (error) {
        console.error(
          `[Cursor.emit:${event}]`,
          error
        );
      }
  
    }
  
  }

  /**
   * Define posição.
   * @param {Position|Object} position
   */
  setPosition(position) {
  
    this.position =
      position instanceof Position
        ? position.clone()
        : new Position(position);
  
    this.render();
  
    this.restartBlink();
  
    if (this.autoScroll) {
      this.scrollIntoView();
    }
  
    /**
     * Evento
     */
    this.emit("move", {
      line: this.position.line,
      column: this.position.column,
      position: this.position
    });
  
  }

  /**
   * Retorna posição.
   * @returns {Position}
   */
  getPosition() {
    return this.position.clone();
  }

  /**
   * Move cursor.
   * @param {number} lineDelta
   * @param {number} columnDelta
   */
  move(
    lineDelta = 0,
    columnDelta = 0
  ) {
    const next =
      this.position.clone();

    next.move(
      lineDelta,
      columnDelta
    );

    this.setPosition(next);
  }

  /**
   * Move para linha.
   * @param {number} line
   */
  moveToLine(line) {
    this.position.setLine(
      line
    );

    this.render();
  }

  /**
   * Move para coluna.
   * @param {number} column
   */
  moveToColumn(column) {
    this.position.setColumn(
      column
    );

    this.render();
  }

  /**
   * Move para offset.
   * @param {number} offset
   */
  moveToOffset(offset) {
    this.position.setOffset(
      offset
    );

    this.render();
  }

  /**
   * Renderiza cursor.
   */
  render() {
    if (!this.element) {
      return;
    }

    const coords =
      this._calculateCoordinates();

    DOM.css(this.element, {
      left:
        `${coords.x}px`,
      top:
        `${coords.y}px`,
      height:
        `${coords.height}px`,
    });
  }

  /**
   * Calcula coordenadas visuais.
   * @private
   * @returns {{x:number,y:number,height:number}}
   */
  _calculateCoordinates() {
    /**
     * Renderer especializado
     */
    if (
      this.renderer &&
      typeof this.renderer
        .getCursorCoordinates ===
        "function"
    ) {
      return (
        this.renderer.getCursorCoordinates(
          this.position
        )
      );
    }

    /**
     * Fallback simples
     */
    const lineHeight = 20;
    const charWidth = 8;

    return {
      x:
        this.position.column *
        charWidth,

      y:
        this.position.line *
        lineHeight,

      height: lineHeight,
    };
  }

  /**
   * Mostra cursor.
   */
  show() {
    this.visible = true;

    DOM.show(
      this.element,
      "block"
    );
  }

  /**
   * Oculta cursor.
   */
  hide() {
    this.visible = false;

    DOM.hide(this.element);
  }

  /**
   * Alterna visibilidade.
   */
  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Inicia blink.
   */
  startBlink() {
    if (!this.blink) {
      return;
    }

    this.stopBlink();

    this.blinkTimer =
      setInterval(() => {
        if (
          !this.focused
        ) {
          return;
        }

        this.toggle();
      }, this.blinkInterval);
  }

  /**
   * Para blink.
   */
  stopBlink() {
    if (this.blinkTimer) {
      clearInterval(
        this.blinkTimer
      );

      this.blinkTimer = null;
    }
  }

  /**
   * Reinicia blink.
   */
  restartBlink() {
    this.show();

    this.startBlink();
  }

  /**
   * Define foco.
   * @param {boolean} value
   */
  setFocused(value) {
    this.focused =
      Boolean(value);

    if (this.focused) {
      this.show();
      this.startBlink();
    } else {
      this.show();
      this.stopBlink();
    }
  }

  /**
   * Scroll automático.
   */
  scrollIntoView() {
    if (!this.container) {
      return;
    }

    const rect =
      this.element.getBoundingClientRect();

    const parentRect =
      this.container.getBoundingClientRect();

    /**
     * Vertical
     */
    if (
      rect.bottom >
      parentRect.bottom
    ) {
      this.container.scrollTop +=
        rect.bottom -
        parentRect.bottom;
    }

    if (
      rect.top <
      parentRect.top
    ) {
      this.container.scrollTop -=
        parentRect.top -
        rect.top;
    }

    /**
     * Horizontal
     */
    if (
      rect.right >
      parentRect.right
    ) {
      this.container.scrollLeft +=
        rect.right -
        parentRect.right;
    }

    if (
      rect.left <
      parentRect.left
    ) {
      this.container.scrollLeft -=
        parentRect.left -
        rect.left;
    }
  }

  /**
   * Method update: Atualiza posição do cursor com base no documento e renderer.
   * @returns {void}
  */
  update() {
    if (!this.renderer) return;

    const pos = this.document.getCursor();
    const coords = this.renderer.getCursorCoordinates(pos);

    DOM.css(this.element, {
      left: `${coords.x}px`,
      top: `${coords.y}px`,
      height: `${coords.height}px`,
    });
  }
  /**
   * Define largura.
   * @param {number} width
   */
  setWidth(width) {
    this.width =
      Math.max(1, width);

    DOM.css(this.element, {
      width:
        `${this.width}px`,
    });
  }

  /**
   * Define altura.
   * @param {number} height
   */
  setHeight(height) {
    this.height =
      Math.max(1, height);

    DOM.css(this.element, {
      height:
        `${this.height}px`,
    });
  }

  /**
   * Define cor.
   * @param {string} color
   */
  setColor(color) {
    DOM.css(this.element, {
      backgroundColor:
        color,
    });
  }

  /**
   * Define estilo.
   * @param {Object} styles
   */
  setStyle(styles = {}) {
    DOM.css(
      this.element,
      styles
    );
  }

  /**
   * Define modo bloco.
   * @param {boolean} value
   */
  setBlockMode(value) {
    if (value) {
      DOM.addClass(
        this.element,
        "block-cursor"
      );
    } else {
      DOM.removeClass(
        this.element,
        "block-cursor"
      );
    }
  }

  /**
   * Define taxa blink.
   * @param {number} interval
   */
  setBlinkInterval(
    interval
  ) {
    this.blinkInterval =
      Math.max(
        100,
        interval
      );

    this.restartBlink();
  }

  /**
   * Destrói cursor.
   */
  destroy() {
    this.stopBlink();

    DOM.remove(
      this.element
    );

    this.element = null;
  }
}
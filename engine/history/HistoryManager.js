/**
 * engine/history/HistoryManager.js
 *10
 * Gerenciador de histórico da IDE/editor.
 *
 * Responsável por:
 * - armazenar snapshots
 * - controlar undo/redo
 * - limitar tamanho do histórico
 * - agrupar alterações
 * - restaurar estados
 *
 * Estrutura:
 * undoStack -> ações que podem ser desfeitas
 * redoStack -> ações que podem ser refeitas
 */

export default class HistoryManager {
  /**
   * @param {Object} options
   * @param {number} [options.maxStackSize=500]
   * @param {boolean} [options.captureSelection=true]
   * @param {boolean} [options.mergeSequentialChanges=true]
   * @param {number} [options.mergeTimeout=1000]
   */
  constructor(options = {}) {
    this.maxStackSize =
      Number.isFinite(options.maxStackSize)
        ? Math.max(1, options.maxStackSize)
        : 500;

    this.captureSelection =
      options.captureSelection !== false;

    this.mergeSequentialChanges =
      options.mergeSequentialChanges !== false;

    this.mergeTimeout =
      Number.isFinite(options.mergeTimeout)
        ? Math.max(0, options.mergeTimeout)
        : 1000;

    /**
     * Pilhas principais
     */
    this.undoStack = [];
    this.redoStack = [];

    /**
     * Estado interno
     */
    this.lastSnapshot = null;
    this.lastPushTime = 0;

    this.enabled = true;
  }

  /**
   * Cria snapshot completo do editor.
   * @param {Object} editor
   * @param {Object} [metadata={}]
   * @returns {Object}
   */
  createSnapshot(editor, metadata = {}) {
    const text = this._getText(editor);

    const snapshot = {
      id: this._generateId(),
      timestamp: Date.now(),

      text,

      selection: this.captureSelection
        ? this._getSelection(editor)
        : null,

      metadata: {
        ...metadata,
      },
    };

    return snapshot;
  }

  /**
   * Salva snapshot no histórico.
   * @param {Object} snapshot
   * @returns {boolean}
   */
  push(snapshot) {
    if (!this.enabled) return false;

    if (!snapshot || typeof snapshot !== "object") {
      return false;
    }

    /**
     * Evita snapshots duplicados
     */
    if (
      this.lastSnapshot &&
      this.lastSnapshot.text === snapshot.text
    ) {
      return false;
    }

    const now = Date.now();

    /**
     * Merge de alterações sequenciais
     */
    if (
      this.mergeSequentialChanges &&
      this.lastSnapshot &&
      now - this.lastPushTime < this.mergeTimeout &&
      this._canMerge(this.lastSnapshot, snapshot)
    ) {
      this.undoStack[this.undoStack.length - 1] = snapshot;
    } else {
      this.undoStack.push(snapshot);

      /**
       * Limita tamanho
       */
      if (this.undoStack.length > this.maxStackSize) {
        this.undoStack.shift();
      }
    }

    /**
     * Nova alteração invalida redo
     */
    this.redoStack.length = 0;

    this.lastSnapshot = snapshot;
    this.lastPushTime = now;

    return true;
  }

  /**
   * Desfaz alteração.
   * @param {Object} editor
   * @returns {Object|null}
   */
  undo(editor) {
    if (!this.canUndo()) {
      return null;
    }

    /**
     * Estado atual vai para redo
     */
    const currentSnapshot =
      this.createSnapshot(editor, {
        type: "redo-snapshot",
      });

    this.redoStack.push(currentSnapshot);

    /**
     * Recupera último snapshot válido
     */
    const snapshot = this.undoStack.pop();

    if (!snapshot) {
      return null;
    }

    this.applySnapshot(editor, snapshot);

    this.lastSnapshot = snapshot;

    return {
      action: "undo",
      snapshot,
    };
  }

  /**
   * Refaz alteração.
   * @param {Object} editor
   * @returns {Object|null}
   */
  redo(editor) {
    if (!this.canRedo()) {
      return null;
    }

    /**
     * Estado atual vai para undo
     */
    const currentSnapshot =
      this.createSnapshot(editor, {
        type: "undo-snapshot",
      });

    this.undoStack.push(currentSnapshot);

    /**
     * Recupera redo
     */
    const snapshot = this.redoStack.pop();

    if (!snapshot) {
      return null;
    }

    this.applySnapshot(editor, snapshot);

    this.lastSnapshot = snapshot;

    return {
      action: "redo",
      snapshot,
    };
  }

  /**
   * Aplica snapshot ao editor.
   * @param {Object} editor
   * @param {Object} snapshot
   * @returns {boolean}
   */
  applySnapshot(editor, snapshot) {
    if (!editor || !snapshot) {
      return false;
    }

    /**
     * Texto
     */
    this._setText(editor, snapshot.text);

    /**
     * Seleção
     */
    if (snapshot.selection) {
      this._setSelection(
        editor,
        snapshot.selection
      );
    }

    return true;
  }

  /**
   * Limpa histórico.
   */
  clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;

    this.lastSnapshot = null;
    this.lastPushTime = 0;
  }

  /**
   * Informa se pode desfazer.
   * @returns {boolean}
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Informa se pode refazer.
   * @returns {boolean}
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Retorna quantidade de undos.
   * @returns {number}
   */
  getUndoCount() {
    return this.undoStack.length;
  }

  /**
   * Retorna quantidade de redos.
   * @returns {number}
   */
  getRedoCount() {
    return this.redoStack.length;
  }

  /**
   * Ativa/desativa histórico.
   * @param {boolean} value
   */
  setEnabled(value) {
    this.enabled = Boolean(value);
  }

  /**
   * Retorna snapshot atual.
   * @returns {Object|null}
   */
  peekUndo() {
    if (!this.canUndo()) return null;
    return this.undoStack[this.undoStack.length - 1];
  }

  /**
   * Retorna próximo redo.
   * @returns {Object|null}
   */
  peekRedo() {
    if (!this.canRedo()) return null;
    return this.redoStack[this.redoStack.length - 1];
  }

  /**
   * Exporta histórico serializável.
   * @returns {Object}
   */
  serialize() {
    return {
      undoStack: [...this.undoStack],
      redoStack: [...this.redoStack],
    };
  }

  /**
   * Importa histórico.
   * @param {Object} data
   */
  deserialize(data) {
    if (!data || typeof data !== "object") {
      return;
    }

    if (Array.isArray(data.undoStack)) {
      this.undoStack = [...data.undoStack];
    }

    if (Array.isArray(data.redoStack)) {
      this.redoStack = [...data.redoStack];
    }
  }

  /**
   * Verifica se snapshots podem ser agrupados.
   * @private
   * @param {Object} previous
   * @param {Object} current
   * @returns {boolean}
   */
  _canMerge(previous, current) {
    if (!previous || !current) {
      return false;
    }

    const prevMeta = previous.metadata || {};
    const currentMeta = current.metadata || {};

    /**
     * Não mistura tipos diferentes
     */
    if (prevMeta.type !== currentMeta.type) {
      return false;
    }

    /**
     * Só mergeia digitação simples
     */
    return prevMeta.type === "insert";
  }

  /**
   * Obtém texto do editor.
   * @private
   * @param {Object} editor
   * @returns {string}
   */
  _getText(editor) {
    if (!editor) return "";

    if (typeof editor.getValue === "function") {
      return String(editor.getValue() ?? "");
    }

    if (typeof editor.getText === "function") {
      return String(editor.getText() ?? "");
    }

    if (typeof editor.value === "string") {
      return editor.value;
    }

    if (typeof editor.text === "string") {
      return editor.text;
    }

    if (typeof editor.content === "string") {
      return editor.content;
    }

    return "";
  }

  /**
   * Define texto no editor.
   * @private
   * @param {Object} editor
   * @param {string} text
   */
  _setText(editor, text) {
    if (!editor) return;

    if (typeof editor.setValue === "function") {
      editor.setValue(text);
      return;
    }

    if (typeof editor.setText === "function") {
      editor.setText(text);
      return;
    }

    if ("value" in editor) {
      editor.value = text;
      return;
    }

    if ("text" in editor) {
      editor.text = text;
      return;
    }

    if ("content" in editor) {
      editor.content = text;
    }
  }

  /**
   * Obtém seleção atual.
   * @private
   * @param {Object} editor
   * @returns {{start:number,end:number}|null}
   */
  _getSelection(editor) {
    if (!editor) return null;

    if (typeof editor.getSelection === "function") {
      return editor.getSelection();
    }

    if (
      typeof editor.selectionStart === "number" &&
      typeof editor.selectionEnd === "number"
    ) {
      return {
        start: editor.selectionStart,
        end: editor.selectionEnd,
      };
    }

    if (typeof editor.cursor === "number") {
      return {
        start: editor.cursor,
        end: editor.cursor,
      };
    }

    return null;
  }

  /**
   * Define seleção/cursor.
   * @private
   * @param {Object} editor
   * @param {{start:number,end:number}} selection
   */
  _setSelection(editor, selection) {
    if (!editor || !selection) return;

    const start =
      typeof selection.start === "number"
        ? selection.start
        : 0;

    const end =
      typeof selection.end === "number"
        ? selection.end
        : start;

    if (typeof editor.setSelection === "function") {
      editor.setSelection({ start, end });
      return;
    }

    if (typeof editor.setSelectionRange === "function") {
      editor.setSelectionRange(start, end);
      return;
    }

    if (
      "selectionStart" in editor &&
      "selectionEnd" in editor
    ) {
      editor.selectionStart = start;
      editor.selectionEnd = end;
      return;
    }

    if ("cursor" in editor && start === end) {
      editor.cursor = start;
    }
  }

  /**
   * Gera ID único simples.
   * @private
   * @returns {string}
   */
  _generateId() {
    return (
      "history_" +
      Math.random().toString(36).slice(2) +
      "_" +
      Date.now().toString(36)
    );
  }
}
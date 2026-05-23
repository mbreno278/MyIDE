/**
 * engine/history/RedoStack.js
 *11
 * Pilha responsável por armazenar estados
 * que podem ser refeitos (Redo).
 *
 * Fluxo:
 *
 * Undo:
 *   estado atual -> redoStack
 *
 * Redo:
 *   redoStack.pop()
 *
 * Este módulo é separado do HistoryManager
 * para manter arquitetura modular.
 */

export default class RedoStack {
  /**
   * @param {Object} options
   * @param {number} [options.maxSize=200]
   */
  constructor(options = {}) {
    /**
     * Quantidade máxima de snapshots
     */
    this.maxSize =
      Number.isFinite(options.maxSize)
        ? Math.max(1, options.maxSize)
        : 200;

    /**
     * Armazenamento interno
     * @type {Array<Object>}
     */
    this.stack = [];

    /**
     * Controle
     */
    this.enabled = true;
  }

  /**
   * Adiciona snapshot na pilha.
   * @param {Object} snapshot
   * @returns {boolean}
   */
  push(snapshot) {
    if (!this.enabled) {
      return false;
    }

    if (!snapshot || typeof snapshot !== "object") {
      return false;
    }

    this.stack.push(snapshot);

    /**
     * Limita tamanho da pilha
     */
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    }

    return true;
  }

  /**
   * Remove último snapshot.
   * @returns {Object|null}
   */
  pop() {
    if (this.stack.length === 0) {
      return null;
    }

    return this.stack.pop() || null;
  }

  /**
   * Retorna topo da pilha.
   * @returns {Object|null}
   */
  peek() {
    if (this.stack.length === 0) {
      return null;
    }

    return this.stack[this.stack.length - 1];
  }

  /**
   * Limpa pilha.
   */
  clear() {
    this.stack.length = 0;
  }

  /**
   * Informa se pilha está vazia.
   * @returns {boolean}
   */
  isEmpty() {
    return this.stack.length === 0;
  }

  /**
   * Quantidade atual.
   * @returns {number}
   */
  size() {
    return this.stack.length;
  }

  /**
   * Informa se possui itens.
   * @returns {boolean}
   */
  hasItems() {
    return this.stack.length > 0;
  }

  /**
   * Ativa/desativa stack.
   * @param {boolean} value
   */
  setEnabled(value) {
    this.enabled = Boolean(value);
  }

  /**
   * Retorna snapshot por índice.
   * @param {number} index
   * @returns {Object|null}
   */
  get(index) {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.stack.length
    ) {
      return null;
    }

    return this.stack[index];
  }

  /**
   * Remove snapshot por índice.
   * @param {number} index
   * @returns {Object|null}
   */
  remove(index) {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.stack.length
    ) {
      return null;
    }

    const removed =
      this.stack.splice(index, 1);

    return removed[0] || null;
  }

  /**
   * Retorna array bruto.
   * @returns {Array<Object>}
   */
  toArray() {
    return [...this.stack];
  }

  /**
   * Substitui pilha inteira.
   * @param {Array<Object>} items
   */
  fromArray(items) {
    if (!Array.isArray(items)) {
      return;
    }

    this.stack = [...items];

    /**
     * Respeita tamanho máximo
     */
    if (this.stack.length > this.maxSize) {
      this.stack =
        this.stack.slice(
          this.stack.length - this.maxSize
        );
    }
  }

  /**
   * Itera snapshots.
   * @param {Function} callback
   */
  forEach(callback) {
    if (typeof callback !== "function") {
      return;
    }

    this.stack.forEach(callback);
  }

  /**
   * Filtra snapshots.
   * @param {Function} callback
   * @returns {Array<Object>}
   */
  filter(callback) {
    if (typeof callback !== "function") {
      return [];
    }

    return this.stack.filter(callback);
  }

  /**
   * Busca snapshot.
   * @param {Function} callback
   * @returns {Object|null}
   */
  find(callback) {
    if (typeof callback !== "function") {
      return null;
    }

    return this.stack.find(callback) || null;
  }

  /**
   * Verifica existência.
   * @param {Function} callback
   * @returns {boolean}
   */
  some(callback) {
    if (typeof callback !== "function") {
      return false;
    }

    return this.stack.some(callback);
  }

  /**
   * Exporta pilha serializável.
   * @returns {Object}
   */
  serialize() {
    return {
      type: "RedoStack",
      maxSize: this.maxSize,
      stack: [...this.stack],
    };
  }

  /**
   * Importa pilha serializada.
   * @param {Object} data
   */
  deserialize(data) {
    if (!data || typeof data !== "object") {
      return;
    }

    if (Number.isFinite(data.maxSize)) {
      this.maxSize =
        Math.max(1, data.maxSize);
    }

    if (Array.isArray(data.stack)) {
      this.fromArray(data.stack);
    }
  }

  /**
   * Clona stack.
   * @returns {RedoStack}
   */
  clone() {
    const cloned =
      new RedoStack({
        maxSize: this.maxSize,
      });

    cloned.fromArray(this.stack);

    return cloned;
  }

  /**
   * Retorna informações da pilha.
   * @returns {Object}
   */
  getInfo() {
    return {
      type: "RedoStack",
      size: this.size(),
      maxSize: this.maxSize,
      enabled: this.enabled,
      empty: this.isEmpty(),
    };
  }

  /**
   * Iterator customizado.
   */
  [Symbol.iterator]() {
    return this.stack[Symbol.iterator]();
  }
}
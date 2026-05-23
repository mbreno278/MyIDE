/**
 * engine/model/Position.js
 *19
 * Representa uma posição dentro do documento.
 *
 * Responsabilidades:
 * - armazenar linha/coluna
 * - armazenar offset absoluto
 * - comparar posições
 * - clonar posição
 * - converter posição
 *
 * Muito usado por:
 * - Cursor
 * - Selection
 * - Parser
 * - Tokenizer
 * - Syntax Highlight
 */

export default class Position {
  /**
   * @param {Object} options
   * @param {number} [options.line=0]
   * @param {number} [options.column=0]
   * @param {number} [options.offset=0]
   */
  constructor(options = {}) {
    /**
     * Linha atual
     * @type {number}
     */
    this.line =
      Number.isInteger(options.line)
        ? Math.max(0, options.line)
        : 0;

    /**
     * Coluna atual
     * @type {number}
     */
    this.column =
      Number.isInteger(options.column)
        ? Math.max(0, options.column)
        : 0;

    /**
     * Offset absoluto
     * @type {number}
     */
    this.offset =
      Number.isInteger(options.offset)
        ? Math.max(0, options.offset)
        : 0;
  }

  /**
   * Define linha.
   * @param {number} line
   */
  setLine(line) {
    this.line =
      Math.max(
        0,
        Number.isInteger(line)
          ? line
          : 0
      );
  }

  /**
   * Define coluna.
   * @param {number} column
   */
  setColumn(column) {
    this.column =
      Math.max(
        0,
        Number.isInteger(column)
          ? column
          : 0
      );
  }

  /**
   * Define offset.
   * @param {number} offset
   */
  setOffset(offset) {
    this.offset =
      Math.max(
        0,
        Number.isInteger(offset)
          ? offset
          : 0
      );
  }

  /**
   * Define posição completa.
   * @param {Object} position
   */
  set(position = {}) {
    if (
      typeof position !== "object"
    ) {
      return;
    }

    if (
      Number.isInteger(position.line)
    ) {
      this.line =
        Math.max(
          0,
          position.line
        );
    }

    if (
      Number.isInteger(
        position.column
      )
    ) {
      this.column =
        Math.max(
          0,
          position.column
        );
    }

    if (
      Number.isInteger(
        position.offset
      )
    ) {
      this.offset =
        Math.max(
          0,
          position.offset
        );
    }
  }

  /**
   * Move posição.
   * @param {number} lineDelta
   * @param {number} columnDelta
   */
  move(
    lineDelta = 0,
    columnDelta = 0
  ) {
    this.line =
      Math.max(
        0,
        this.line + lineDelta
      );

    this.column =
      Math.max(
        0,
        this.column +
          columnDelta
      );
  }

  /**
   * Move offset.
   * @param {number} delta
   */
  moveOffset(delta = 0) {
    this.offset =
      Math.max(
        0,
        this.offset + delta
      );
  }

  /**
   * Verifica igualdade.
   * @param {Position|Object} other
   * @returns {boolean}
   */
  equals(other) {
    if (!other) {
      return false;
    }

    return (
      this.line === other.line &&
      this.column ===
        other.column &&
      this.offset ===
        other.offset
    );
  }

  /**
   * Verifica se está antes.
   * @param {Position|Object} other
   * @returns {boolean}
   */
  isBefore(other) {
    if (!other) {
      return false;
    }

    if (this.line < other.line) {
      return true;
    }

    if (this.line > other.line) {
      return false;
    }

    return (
      this.column <
      other.column
    );
  }

  /**
   * Verifica se está depois.
   * @param {Position|Object} other
   * @returns {boolean}
   */
  isAfter(other) {
    if (!other) {
      return false;
    }

    if (this.line > other.line) {
      return true;
    }

    if (this.line < other.line) {
      return false;
    }

    return (
      this.column >
      other.column
    );
  }

  /**
   * Compara posições.
   * @param {Position|Object} other
   * @returns {number}
   *
   * -1 = antes
   *  0 = igual
   *  1 = depois
   */
  compare(other) {
    if (this.equals(other)) {
      return 0;
    }

    return this.isBefore(other)
      ? -1
      : 1;
  }

  /**
   * Distância entre offsets.
   * @param {Position|Object} other
   * @returns {number}
   */
  distanceTo(other) {
    if (
      !other ||
      typeof other.offset !==
        "number"
    ) {
      return 0;
    }

    return Math.abs(
      this.offset - other.offset
    );
  }

  /**
   * Retorna posição anterior.
   * @returns {Position}
   */
  previous() {
    return new Position({
      line: this.line,
      column:
        this.column > 0
          ? this.column - 1
          : 0,

      offset:
        this.offset > 0
          ? this.offset - 1
          : 0,
    });
  }

  /**
   * Retorna próxima posição.
   * @returns {Position}
   */
  next() {
    return new Position({
      line: this.line,
      column: this.column + 1,
      offset: this.offset + 1,
    });
  }

  /**
   * Clona posição.
   * @returns {Position}
   */
  clone() {
    return new Position({
      line: this.line,
      column: this.column,
      offset: this.offset,
    });
  }

  /**
   * Converte para objeto.
   * @returns {Object}
   */
  toObject() {
    return {
      line: this.line,
      column: this.column,
      offset: this.offset,
    };
  }

  /**
   * Serializa.
   * @returns {Object}
   */
  serialize() {
    return this.toObject();
  }

  /**
   * Importa estado.
   * @param {Object} data
   */
  deserialize(data) {
    this.set(data);
  }

  /**
   * Converte para string.
   * @returns {string}
   */
  toString() {
    return (
      `[${this.line}:${this.column}]` +
      `@${this.offset}`
    );
  }

  /**
   * Valor primitivo.
   * @returns {string}
   */
  valueOf() {
    return this.toString();
  }

  /**
   * Cria posição vazia.
   * @returns {Position}
   */
  static zero() {
    return new Position({
      line: 0,
      column: 0,
      offset: 0,
    });
  }

  /**
   * Cria a partir de objeto.
   * @param {Object} data
   * @returns {Position}
   */
  static from(data = {}) {
    return new Position(data);
  }

  /**
   * Menor posição.
   * @param {Position} a
   * @param {Position} b
   * @returns {Position}
   */
  static min(a, b) {
    return a.compare(b) <= 0
      ? a.clone()
      : b.clone();
  }

  /**
   * Maior posição.
   * @param {Position} a
   * @param {Position} b
   * @returns {Position}
   */
  static max(a, b) {
    return a.compare(b) >= 0
      ? a.clone()
      : b.clone();
  }
}
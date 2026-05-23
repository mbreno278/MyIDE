/**
 * engine/model/Selection.js
 *20
 * Representa uma seleção de texto dentro do documento.
 *
 * Responsabilidades:
 * - armazenar início/fim da seleção
 * - controlar direção da seleção
 * - verificar ranges
 * - expandir/reduzir seleção
 * - retornar texto selecionado
 *
 * Usado por:
 * - Cursor
 * - Mouse
 * - Keyboard
 * - Clipboard
 * - Commands
 */

import Position from "./Position.js";

export default class Selection {
  /**
   * @param {Object} options
   * @param {Position|Object|null} [options.start=null]
   * @param {Position|Object|null} [options.end=null]
   * @param {boolean} [options.reversed=false]
   */
  constructor(options = {}) {
    /**
     * Início da seleção
     * @type {Position}
     */
    this.start =
      options.start instanceof Position
        ? options.start.clone()
        : new Position(
            options.start || {}
          );

    /**
     * Final da seleção
     * @type {Position}
     */
    this.end =
      options.end instanceof Position
        ? options.end.clone()
        : new Position(
            options.end || {}
          );

    /**
     * Direção da seleção
     * @type {boolean}
     */
    this.reversed =
      Boolean(options.reversed);

    /**
     * Estado interno
     */
    this.active = true;
  }

  /**
   * Define início.
   * @param {Position|Object} position
   */
  setStart(position) {
    this.start =
      position instanceof Position
        ? position.clone()
        : new Position(position);
  }

  /**
   * Define final.
   * @param {Position|Object} position
   */
  setEnd(position) {
    this.end =
      position instanceof Position
        ? position.clone()
        : new Position(position);
  }

  /**
   * Define seleção completa.
   * @param {Object} selection
   */
  set(selection = {}) {
    if (
      selection.start
    ) {
      this.setStart(
        selection.start
      );
    }

    if (
      selection.end
    ) {
      this.setEnd(
        selection.end
      );
    }

    if (
      typeof selection.reversed ===
      "boolean"
    ) {
      this.reversed =
        selection.reversed;
    }
  }

  /**
   * Inverte direção.
   */
  reverse() {
    [
      this.start,
      this.end,
    ] = [
      this.end,
      this.start,
    ];

    this.reversed =
      !this.reversed;
  }

  /**
   * Limpa seleção.
   */
  clear() {
    this.end =
      this.start.clone();

    this.active = false;
  }

  /**
   * Ativa seleção.
   */
  activate() {
    this.active = true;
  }

  /**
   * Desativa seleção.
   */
  deactivate() {
    this.active = false;
  }

  /**
   * Verifica se seleção está vazia.
   * @returns {boolean}
   */
  isEmpty() {
    return this.start.equals(
      this.end
    );
  }

  /**
   * Verifica se está ativa.
   * @returns {boolean}
   */
  isActive() {
    return this.active;
  }

  /**
   * Retorna menor posição.
   * @returns {Position}
   */
  getMin() {
    return Position.min(
      this.start,
      this.end
    );
  }

  /**
   * Retorna maior posição.
   * @returns {Position}
   */
  getMax() {
    return Position.max(
      this.start,
      this.end
    );
  }

  /**
   * Retorna range absoluto.
   * @returns {{start:number,end:number}}
   */
  getOffsets() {
    const min =
      this.getMin();

    const max =
      this.getMax();

    return {
      start: min.offset,
      end: max.offset,
    };
  }

  /**
   * Retorna tamanho da seleção.
   * @returns {number}
   */
  length() {
    const {
      start,
      end,
    } = this.getOffsets();

    return Math.abs(
      end - start
    );
  }

  /**
   * Expande seleção.
   * @param {number} amount
   */
  expand(amount = 1) {
    this.end.moveOffset(
      Math.abs(amount)
    );
  }

  /**
   * Reduz seleção.
   * @param {number} amount
   */
  shrink(amount = 1) {
    this.end.moveOffset(
      -Math.abs(amount)
    );
  }

  /**
   * Move seleção inteira.
   * @param {number} lineDelta
   * @param {number} columnDelta
   */
  move(
    lineDelta = 0,
    columnDelta = 0
  ) {
    this.start.move(
      lineDelta,
      columnDelta
    );

    this.end.move(
      lineDelta,
      columnDelta
    );
  }

  /**
   * Move offsets.
   * @param {number} delta
   */
  moveOffset(delta = 0) {
    this.start.moveOffset(
      delta
    );

    this.end.moveOffset(
      delta
    );
  }

  /**
   * Verifica se contém posição.
   * @param {Position|Object} position
   * @returns {boolean}
   */
  contains(position) {
    const pos =
      position instanceof Position
        ? position
        : new Position(position);

    const min =
      this.getMin();

    const max =
      this.getMax();

    return (
      pos.compare(min) >= 0 &&
      pos.compare(max) <= 0
    );
  }

  /**
   * Verifica overlap.
   * @param {Selection} other
   * @returns {boolean}
   */
  overlaps(other) {
    if (
      !(other instanceof Selection)
    ) {
      return false;
    }

    const a =
      this.getOffsets();

    const b =
      other.getOffsets();

    return (
      a.start < b.end &&
      a.end > b.start
    );
  }

  /**
   * Retorna texto selecionado.
   * @param {string} text
   * @returns {string}
   */
  getText(text = "") {
    if (
      typeof text !== "string"
    ) {
      return "";
    }

    const {
      start,
      end,
    } = this.getOffsets();

    return text.slice(
      start,
      end
    );
  }

  /**
   * Seleciona tudo.
   * @param {number} length
   */
  selectAll(length = 0) {
    this.start =
      Position.zero();

    this.end =
      new Position({
        offset:
          Math.max(0, length),
      });

    this.active = true;
  }

  /**
   * Colapsa seleção.
   * @param {"start"|"end"} [to="end"]
   */
  collapse(to = "end") {
    if (to === "start") {
      this.end =
        this.start.clone();
    } else {
      this.start =
        this.end.clone();
    }
  }

  /**
   * Clona seleção.
   * @returns {Selection}
   */
  clone() {
    return new Selection({
      start:
        this.start.clone(),
      end:
        this.end.clone(),
      reversed:
        this.reversed,
    });
  }

  /**
   * Converte para objeto.
   * @returns {Object}
   */
  toObject() {
    return {
      start:
        this.start.toObject(),

      end:
        this.end.toObject(),

      reversed:
        this.reversed,

      active:
        this.active,
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
    if (
      !data ||
      typeof data !== "object"
    ) {
      return;
    }

    if (
      data.start
    ) {
      this.start =
        new Position(
          data.start
        );
    }

    if (
      data.end
    ) {
      this.end =
        new Position(
          data.end
        );
    }

    if (
      typeof data.reversed ===
      "boolean"
    ) {
      this.reversed =
        data.reversed;
    }

    if (
      typeof data.active ===
      "boolean"
    ) {
      this.active =
        data.active;
    }
  }

  /**
   * String debug.
   * @returns {string}
   */
  toString() {
    return (
      `Selection(` +
      `${this.start.toString()} -> ` +
      `${this.end.toString()}` +
      `)`
    );
  }

  /**
   * Cria seleção vazia.
   * @returns {Selection}
   */
  static empty() {
    return new Selection({
      start:
        Position.zero(),

      end:
        Position.zero(),
    });
  }

  /**
   * Cria a partir de offsets.
   * @param {number} start
   * @param {number} end
   * @returns {Selection}
   */
  static fromOffsets(
    start = 0,
    end = 0
  ) {
    return new Selection({
      start:
        new Position({
          offset: start,
        }),

      end:
        new Position({
          offset: end,
        }),
    });
  }
}
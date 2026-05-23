/**
 * engine/model/Line.js
 *18
 * Representa uma única linha do documento.
 *
 * Responsabilidades:
 * - armazenar texto da linha
 * - controlar índice/número da linha
 * - calcular tamanho
 * - controlar indentação
 * - fornecer utilidades de edição
 *
 * Este modelo é usado pelo Document.js
 * para manipulação granular das linhas.
 */

export default class Line {
  /**
   * @param {Object} options
   * @param {number} [options.index=0]
   * @param {string} [options.text=""]
   * @param {string} [options.eol="\n"]
   */
  constructor(options = {}) {
    /**
     * Índice da linha
     * @type {number}
     */
    this.index =
      Number.isInteger(options.index)
        ? options.index
        : 0;

    /**
     * Conteúdo da linha
     * @type {string}
     */
    this.text =
      typeof options.text === "string"
        ? options.text
        : "";

    /**
     * Tipo de quebra de linha
     * @type {string}
     */
    this.eol =
      options.eol === "\r\n"
        ? "\r\n"
        : "\n";

    /**
     * Controle interno
     */
    this.dirty = false;
    this.version = 1;

    /**
     * Metadata opcional
     */
    this.metadata = {};

    /**
     * Tokens/syntax highlight
     */
    this.tokens = [];

    /**
     * Estado de dobra (fold)
     */
    this.folded = false;
  }

  /**
   * Retorna texto da linha.
   * @returns {string}
   */
  getText() {
    return this.text;
  }

  /**
   * Define texto da linha.
   * @param {string} text
   */
  setText(text) {
    const normalized =
      this._normalizeText(text);

    if (normalized === this.text) {
      return;
    }

    this.text = normalized;

    this._touch();
  }

  /**
   * Insere texto.
   * @param {number} column
   * @param {string} text
   */
  insert(column, text) {
    const safeColumn =
      this._clamp(
        column,
        0,
        this.text.length
      );

    const insertText =
      this._normalizeText(text);

    if (!insertText) {
      return;
    }

    this.text =
      this.text.slice(0, safeColumn) +
      insertText +
      this.text.slice(safeColumn);

    this._touch();
  }

  /**
   * Remove trecho.
   * @param {number} start
   * @param {number} end
   * @returns {string}
   */
  delete(start, end) {
    let safeStart =
      this._clamp(
        start,
        0,
        this.text.length
      );

    let safeEnd =
      this._clamp(
        end,
        0,
        this.text.length
      );

    if (safeStart > safeEnd) {
      [safeStart, safeEnd] =
        [safeEnd, safeStart];
    }

    if (safeStart === safeEnd) {
      return "";
    }

    const removed =
      this.text.slice(
        safeStart,
        safeEnd
      );

    this.text =
      this.text.slice(0, safeStart) +
      this.text.slice(safeEnd);

    this._touch();

    return removed;
  }

  /**
   * Substitui trecho.
   * @param {number} start
   * @param {number} end
   * @param {string} text
   */
  replace(start, end, text) {
    this.delete(start, end);
    this.insert(start, text);

    this._touch();
  }

  /**
   * Limpa linha.
   */
  clear() {
    this.text = "";

    this._touch();
  }

  /**
   * Retorna tamanho.
   * @returns {number}
   */
  length() {
    return this.text.length;
  }

  /**
   * Verifica se está vazia.
   * @returns {boolean}
   */
  isEmpty() {
    return this.text.length === 0;
  }

  /**
   * Retorna whitespace inicial.
   * @returns {string}
   */
  getIndentation() {
    const match =
      this.text.match(/^\s+/);

    return match
      ? match[0]
      : "";
  }

  /**
   * Retorna nível de indentação.
   * @param {number} [tabSize=4]
   * @returns {number}
   */
  getIndentLevel(tabSize = 4) {
    const indent =
      this.getIndentation();

    let size = 0;

    for (const char of indent) {
      if (char === "\t") {
        size += tabSize;
      } else {
        size += 1;
      }
    }

    return size;
  }

  /**
   * Define indentação.
   * @param {string} indentation
   */
  setIndentation(indentation) {
    const content =
      this.text.replace(
        /^\s*/,
        ""
      );

    this.text =
      indentation + content;

    this._touch();
  }

  /**
   * Adiciona indentação.
   * @param {string} value
   */
  indent(value = "  ") {
    this.text =
      value + this.text;

    this._touch();
  }

  /**
   * Remove indentação.
   * @param {number} [size=2]
   */
  outdent(size = 2) {
    this.text =
      this.text.replace(
        new RegExp(`^[ \\t]{1,${size}}`),
        ""
      );

    this._touch();
  }

  /**
   * Divide linha.
   * @param {number} column
   * @returns {{left:string,right:string}}
   */
  split(column) {
    const safeColumn =
      this._clamp(
        column,
        0,
        this.text.length
      );

    return {
      left:
        this.text.slice(
          0,
          safeColumn
        ),

      right:
        this.text.slice(
          safeColumn
        ),
    };
  }

  /**
   * Junta com outra linha.
   * @param {Line|string} other
   */
  append(other) {
    if (other instanceof Line) {
      this.text += other.text;
    } else if (
      typeof other === "string"
    ) {
      this.text += other;
    }

    this._touch();
  }

  /**
   * Retorna caractere.
   * @param {number} index
   * @returns {string}
   */
  charAt(index) {
    const safeIndex =
      this._clamp(
        index,
        0,
        this.text.length - 1
      );

    return this.text.charAt(
      safeIndex
    );
  }

  /**
   * Retorna substring.
   * @param {number} start
   * @param {number} end
   * @returns {string}
   */
  substring(start, end) {
    return this.text.substring(
      start,
      end
    );
  }

  /**
   * Define tokens.
   * @param {Array<Object>} tokens
   */
  setTokens(tokens) {
    if (!Array.isArray(tokens)) {
      return;
    }

    this.tokens = [...tokens];
  }

  /**
   * Retorna tokens.
   * @returns {Array<Object>}
   */
  getTokens() {
    return [...this.tokens];
  }

  /**
   * Limpa tokens.
   */
  clearTokens() {
    this.tokens.length = 0;
  }

  /**
   * Define metadata.
   * @param {string} key
   * @param {*} value
   */
  setMetadata(key, value) {
    this.metadata[key] = value;
  }

  /**
   * Obtém metadata.
   * @param {string} key
   * @returns {*}
   */
  getMetadata(key) {
    return this.metadata[key];
  }

  /**
   * Remove metadata.
   * @param {string} key
   */
  removeMetadata(key) {
    delete this.metadata[key];
  }

  /**
   * Limpa metadata.
   */
  clearMetadata() {
    this.metadata = {};
  }

  /**
   * Define estado folded.
   * @param {boolean} value
   */
  setFolded(value) {
    this.folded =
      Boolean(value);
  }

  /**
   * Alterna folded.
   */
  toggleFold() {
    this.folded =
      !this.folded;
  }

  /**
   * Retorna linha serializável.
   * @returns {Object}
   */
  serialize() {
    return {
      index: this.index,
      text: this.text,
      version: this.version,
      folded: this.folded,
      metadata: {
        ...this.metadata,
      },
    };
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
      typeof data.index ===
      "number"
    ) {
      this.index = data.index;
    }

    if (
      typeof data.text ===
      "string"
    ) {
      this.text =
        this._normalizeText(
          data.text
        );
    }

    if (
      typeof data.folded ===
      "boolean"
    ) {
      this.folded =
        data.folded;
    }

    if (
      data.metadata &&
      typeof data.metadata ===
        "object"
    ) {
      this.metadata = {
        ...data.metadata,
      };
    }

    this._touch();
  }

  /**
   * Marca alteração.
   * @private
   */
  _touch() {
    this.version += 1;
    this.dirty = true;
  }

  /**
   * Remove quebras de linha.
   * @private
   * @param {string} text
   * @returns {string}
   */
  _normalizeText(text) {
    return String(text)
      .replace(/\r\n/g, "")
      .replace(/\n/g, "")
      .replace(/\r/g, "");
  }

  /**
   * Limita valores.
   * @private
   */
  _clamp(
    value,
    min,
    max
  ) {
    return Math.min(
      Math.max(value, min),
      max
    );
  }

  /**
   * Clona linha.
   * @returns {Line}
   */
  clone() {
    return new Line({
      index: this.index,
      text: this.text,
      eol: this.eol,
    });
  }

  /**
   * Converte para string.
   * @returns {string}
   */
  toString() {
    return this.text;
  }

  /**
   * Valor primitivo.
   * @returns {string}
   */
  valueOf() {
    return this.text;
  }
}
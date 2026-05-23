/**
 * engine/model/Document.js
 *17
 * Modelo principal de documento da IDE/editor.
 *
 * Responsável por:
 * - armazenar conteúdo
 * - controlar linhas
 * - controlar cursor
 * - controlar seleção
 * - emitir eventos
 * - integração com histórico
 *
 * Este arquivo representa o "estado bruto"
 * do editor, independente da interface visual.
 */

export default class Document {
  /**
   * @param {Object} options
   * @param {string} [options.text=""]
   * @param {string} [options.language="plaintext"]
   * @param {string} [options.eol="\n"]
   * @param {Object|null} [options.history=null]
   */
  constructor(options = {}) {
    /**
     * Conteúdo bruto
     * @type {string}
     */
    this.text =
      typeof options.text === "string"
        ? this._normalizeEOL(options.text)
        : "";

    /**
     * Linguagem atual
     * @type {string}
     */
    this.language =
      typeof options.language === "string"
        ? options.language
        : "plaintext";

    /**
     * End of line
     * @type {string}
     */
    this.eol =
      options.eol === "\r\n"
        ? "\r\n"
        : "\n";

    /**
     * Histórico
     */
    this.history =
      options.history || null;

    /**
     * Cursor atual
     */
    this.cursor = {
      line: 0,
      column: 0,
      offset: 0,
    };

    /**
     * Seleção
     */
    this.selection = {
      start: 0,
      end: 0,
    };

    /**
     * Cache de linhas
     */
    this.lines = [];

    /**
     * Controle
     */
    this.version = 1;
    this.dirty = false;
    this.readOnly = false;

    /**
     * Eventos
     */
    this.listeners = new Map();

    /**
     * Inicializa linhas
     */
    this._rebuildLines();
    this.setText(this.text);

    this.emit("change", {
      type: "init",
    });
  }

  /**
   * Retorna texto completo.
   * @returns {string}
   */
  getText() {
    return this.text;
  }

  /**
   * Define texto completo.
   * @param {string} text
   */
  setText(text) {
    if (this.readOnly) return;

    const normalized =
      this._normalizeEOL(
        typeof text === "string"
          ? text
          : ""
      );

    if (normalized === this.text) {
      return;
    }

    this._saveHistory("setText");

    this.text = normalized;

    this._rebuildLines();

    this._touch();

    this.emit("change", {
      type: "setText",
      text: this.text,
    });
  }

  /**
   * Insere texto.
   * @param {number} offset
   * @param {string} text
   */
  insert(offset, text) {
    if (this.readOnly) return;

    const safeOffset =
      this._clamp(
        offset,
        0,
        this.text.length
      );

    const insertText =
      this._normalizeEOL(
        typeof text === "string"
          ? text
          : ""
      );

    if (!insertText) {
      return;
    }

    this._saveHistory("insert");

    this.text =
      this.text.slice(0, safeOffset) +
      insertText +
      this.text.slice(safeOffset);

    this._rebuildLines();

    this.setCursorOffset(
      safeOffset + insertText.length
    );

    this._touch();

    this.emit("change", {
      type: "insert",
      offset: safeOffset,
      text: insertText,
    });
  }

  /**
   * Remove trecho.
   * @param {number} start
   * @param {number} end
   */
  delete(start, end) {
    if (this.readOnly) return;

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
      return;
    }

    this._saveHistory("delete");

    const removed =
      this.text.slice(
        safeStart,
        safeEnd
      );

    this.text =
      this.text.slice(0, safeStart) +
      this.text.slice(safeEnd);

    this._rebuildLines();

    this.setCursorOffset(safeStart);

    this._touch();

    this.emit("change", {
      type: "delete",
      start: safeStart,
      end: safeEnd,
      removed,
    });
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

    this.emit("change", {
      type: "replace",
      start,
      end,
      text,
    });
  }

  /**
   * Retorna linhas.
   * @returns {Array<string>}
   */
  getLines() {
    return [...this.lines];
  }

  /**
   * Retorna linha específica.
   * @param {number} index
   * @returns {string}
   */
  getLine(index) {
    if (
      index < 0 ||
      index >= this.lines.length
    ) {
      return "";
    }

    return this.lines[index];
  }

  /**
   * Quantidade de linhas.
   * @returns {number}
   */
  getLineCount() {
    return this.lines.length;
  }
  
  /**
   * Alias
   * @returns {number}
   */
  lineCount() {
    return this.getLineCount();
  }

  /**
   * Retorna tamanho do documento.
   * @returns {number}
   */
  getLength() {
    return this.text.length;
  }

  /**
   * Define cursor por offset.
   * @param {number} offset
   */
  setCursorOffset(offset) {
    const safeOffset =
      this._clamp(
        offset,
        0,
        this.text.length
      );

    const position =
      this.offsetToPosition(
        safeOffset
      );

    this.cursor = {
      line: position.line,
      column: position.column,
      offset: safeOffset,
    };

    this.emit("cursorChange", {
      ...this.cursor,
    });
  }

  /**
   * Retorna cursor.
   * @returns {Object}
   */
  getCursor() {
    return {
      ...this.cursor,
    };
  }

  /**
   * Define seleção.
   * @param {number} start
   * @param {number} end
   */
  setSelection(start, end) {
    this.selection = {
      start: this._clamp(
        start,
        0,
        this.text.length
      ),

      end: this._clamp(
        end,
        0,
        this.text.length
      ),
    };

    this.emit("selectionChange", {
      ...this.selection,
    });
  }

  /**
   * Retorna seleção.
   * @returns {Object}
   */
  getSelection() {
    return {
      ...this.selection,
    };
  }

  /**
   * Remove seleção.
   */
  clearSelection() {
    this.setSelection(
      this.cursor.offset,
      this.cursor.offset
    );
  }

  /**
   * Retorna texto selecionado.
   * @returns {string}
   */
  getSelectedText() {
    const { start, end } =
      this.selection;

    return this.text.slice(
      start,
      end
    );
  }

  /**
   * Converte offset em linha/coluna.
   * @param {number} offset
   * @returns {{line:number,column:number}}
   */
  offsetToPosition(offset) {
    const safeOffset =
      this._clamp(
        offset,
        0,
        this.text.length
      );

    let current = 0;

    for (
      let line = 0;
      line < this.lines.length;
      line++
    ) {
      const lineText =
        this.lines[line];

      const next =
        current +
        lineText.length;

      if (safeOffset <= next) {
        return {
          line,
          column:
            safeOffset - current,
        };
      }

      current =
        next + this.eol.length;
    }

    return {
      line:
        this.lines.length - 1,
      column:
        this.lines[
          this.lines.length - 1
        ]?.length || 0,
    };
  }

  /**
   * Converte linha/coluna em offset.
   * @param {number} line
   * @param {number} column
   * @returns {number}
   */
  positionToOffset(
    line,
    column
  ) {
    const safeLine =
      this._clamp(
        line,
        0,
        this.lines.length - 1
      );

    const safeColumn =
      this._clamp(
        column,
        0,
        this.lines[safeLine]
          ?.length || 0
      );

    let offset = 0;

    for (
      let i = 0;
      i < safeLine;
      i++
    ) {
      offset +=
        this.lines[i].length +
        this.eol.length;
    }

    return offset + safeColumn;
  }

  /**
   * Define documento como somente leitura.
   * @param {boolean} value
   */
  setReadOnly(value) {
    this.readOnly =
      Boolean(value);
  }

  /**
   * Salva snapshot no histórico.
   * @private
   * @param {string} type
   */
  _saveHistory(type) {
    if (
      !this.history ||
      typeof this.history.push !==
        "function"
    ) {
      return;
    }

    this.history.push({
      text: this.text,

      selection: {
        ...this.selection,
      },

      cursor: {
        ...this.cursor,
      },

      metadata: {
        type,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Reconstrói linhas.
   * @private
   */
  _rebuildLines() {
    this.lines =
      this.text.split("\n");

    if (this.lines.length === 0) {
      this.lines = [""];
    }
  }

  /**
   * Marca documento como alterado.
   * @private
   */
  _touch() {
    this.version += 1;
    this.dirty = true;
  }

  /**
   * Normaliza EOL.
   * @private
   * @param {string} text
   * @returns {string}
   */
  _normalizeEOL(text) {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");
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
   * Adiciona listener.
   * @param {string} event
   * @param {Function} callback
   */
  on(event, callback) {
    if (
      typeof callback !==
      "function"
    ) {
      return;
    }

    if (
      !this.listeners.has(event)
    ) {
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
    const set =
      this.listeners.get(event);

    if (!set) return;

    set.delete(callback);
  }

  /**
   * Emite evento.
   * @param {string} event
   * @param {Object} payload
   */
  emit(event, payload = {}) {
    const set =
      this.listeners.get(event);

    if (!set) return;

    for (const callback of set) {
      try {
        callback(payload);
      } catch (error) {
        console.error(
          "[Document.emit]",
          error
        );
      }
    }
  }

  /**
   * Exporta estado.
   * @returns {Object}
   */
  serialize() {
    return {
      text: this.text,
      language: this.language,
      version: this.version,
      selection: {
        ...this.selection,
      },
      cursor: {
        ...this.cursor,
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
      typeof data.text ===
      "string"
    ) {
      this.text =
        this._normalizeEOL(
          data.text
        );

      this._rebuildLines();
    }

    if (
      typeof data.language ===
      "string"
    ) {
      this.language =
        data.language;
    }

    if (
      data.selection
    ) {
      this.selection = {
        ...data.selection,
      };
    }

    if (
      data.cursor
    ) {
      this.cursor = {
        ...data.cursor,
      };
    }

    this.emit("change", {
      type: "deserialize",
    });
  }
}
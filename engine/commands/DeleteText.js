/**
 * engine/commands/DeleteText.js
 *1
 * Comando responsável por remover texto do editor.
 * Suporta:
 * - remoção de seleção
 * - backspace (para trás)
 * - delete (para frente)
 * - unidades: caractere, palavra ou linha
 * - undo básico via snapshot
 *
 * Este comando foi escrito para ser flexível e funcionar com
 * editores que expõem métodos diferentes, como:
 * - getValue() / setValue()
 * - getText() / setText()
 * - getSelection() / setSelection()
 * - selectionStart / selectionEnd
 */

export default class DeleteText {
  /**
   * @param {Object} options
   * @param {"backward"|"forward"} [options.direction="backward"]
   * @param {"char"|"word"|"line"} [options.unit="char"]
   * @param {number} [options.count=1]
   * @param {boolean} [options.preferSelection=true]
   */
  constructor(options = {}) {
    this.direction = options.direction === "forward" ? "forward" : "backward";
    this.unit = ["char", "word", "line"].includes(options.unit) ? options.unit : "char";
    this.count = Number.isFinite(options.count) && options.count > 0 ? options.count : 1;
    this.preferSelection = options.preferSelection !== false;

    this._beforeSnapshot = null;
    this._lastResult = null;
  }

  /**
   * Executa a exclusão no editor.
   * @param {Object} editor Instância do editor ou modelo de texto
   * @returns {Object} Resultado da operação
   */
  execute(editor) {
    const text = this._getText(editor);
    const selection = this._getSelection(editor, text.length);

    const beforeSnapshot = {
      text,
      selection: { ...selection },
    };

    const result = this._deleteFromText(text, selection);

    this._beforeSnapshot = beforeSnapshot;
    this._lastResult = result;

    this._setText(editor, result.text);
    this._setSelection(editor, result.selection.start, result.selection.end);

    return {
      ok: true,
      command: "DeleteText",
      before: beforeSnapshot,
      after: {
        text: result.text,
        selection: { ...result.selection },
      },
      deletedText: result.deletedText,
      deletedRange: { ...result.deletedRange },
    };
  }

  /**
   * Desfaz a última execução.
   * @param {Object} editor Instância do editor ou modelo de texto
   * @returns {boolean}
   */
  undo(editor) {
    if (!this._beforeSnapshot) return false;

    this._setText(editor, this._beforeSnapshot.text);
    this._setSelection(
      editor,
      this._beforeSnapshot.selection.start,
      this._beforeSnapshot.selection.end
    );

    return true;
  }

  /**
   * Informa se há algo a deletar.
   * @param {Object} editor
   * @returns {boolean}
   */
  canExecute(editor) {
    const text = this._getText(editor);
    const selection = this._getSelection(editor, text.length);

    if (selection.start !== selection.end) return true;

    const boundary = this._getDeletionBoundary(text, selection.start, selection.end);
    return boundary.start !== boundary.end;
  }

  /**
   * Retorna o último resultado gerado.
   * @returns {Object|null}
   */
  getLastResult() {
    return this._lastResult;
  }

  /**
   * Limpa estado interno do comando.
   */
  reset() {
    this._beforeSnapshot = null;
    this._lastResult = null;
  }

  /**
   * Aplica a remoção no texto bruto.
   * @private
   * @param {string} text
   * @param {{start:number,end:number}} selection
   * @returns {{text:string,selection:{start:number,end:number},deletedText:string,deletedRange:{start:number,end:number}}}
   */
  _deleteFromText(text, selection) {
    const normalizedText = typeof text === "string" ? text : "";
    const length = normalizedText.length;

    let start = this._clamp(selection.start, 0, length);
    let end = this._clamp(selection.end, 0, length);

    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }

    let deletedRange = { start, end };

    if (this.preferSelection && start !== end) {
      const deletedText = normalizedText.slice(start, end);
      const nextText = normalizedText.slice(0, start) + normalizedText.slice(end);

      return {
        text: nextText,
        selection: { start, end: start },
        deletedText,
        deletedRange,
      };
    }

    const boundary = this._getDeletionBoundary(normalizedText, start, end);
    deletedRange = boundary;

    const deletedText = normalizedText.slice(boundary.start, boundary.end);
    const nextText =
      normalizedText.slice(0, boundary.start) + normalizedText.slice(boundary.end);

    return {
      text: nextText,
      selection: { start: boundary.start, end: boundary.start },
      deletedText,
      deletedRange,
    };
  }

  /**
   * Calcula o intervalo que será deletado.
   * @private
   * @param {string} text
   * @param {number} start
   * @param {number} end
   * @returns {{start:number,end:number}}
   */
  _getDeletionBoundary(text, start, end) {
    const length = text.length;

    if (start !== end) {
      return { start, end };
    }

    const cursor = this._clamp(start, 0, length);
    const count = Math.max(1, this.count);

    if (this.unit === "char") {
      if (this.direction === "backward") {
        return {
          start: this._clamp(cursor - count, 0, length),
          end: cursor,
        };
      }

      return {
        start: cursor,
        end: this._clamp(cursor + count, 0, length),
      };
    }

    if (this.unit === "word") {
      if (this.direction === "backward") {
        return {
          start: this._findWordBoundaryBackward(text, cursor),
          end: cursor,
        };
      }

      return {
        start: cursor,
        end: this._findWordBoundaryForward(text, cursor),
      };
    }

    if (this.unit === "line") {
      if (this.direction === "backward") {
        return {
          start: this._findLineBoundaryBackward(text, cursor),
          end: cursor,
        };
      }

      return {
        start: cursor,
        end: this._findLineBoundaryForward(text, cursor),
      };
    }

    return {
      start: this._clamp(cursor - 1, 0, length),
      end: cursor,
    };
  }

  /**
   * Encontra o início da palavra anterior.
   * @private
   * @param {string} text
   * @param {number} cursor
   * @returns {number}
   */
  _findWordBoundaryBackward(text, cursor) {
    let i = this._clamp(cursor, 0, text.length);

    while (i > 0 && /\s/.test(text[i - 1])) {
      i--;
    }

    while (i > 0 && !/\s/.test(text[i - 1])) {
      i--;
    }

    return i;
  }

  /**
   * Encontra o fim da próxima palavra.
   * @private
   * @param {string} text
   * @param {number} cursor
   * @returns {number}
   */
  _findWordBoundaryForward(text, cursor) {
    let i = this._clamp(cursor, 0, text.length);

    while (i < text.length && /\s/.test(text[i])) {
      i++;
    }

    while (i < text.length && !/\s/.test(text[i])) {
      i++;
    }

    return i;
  }

  /**
   * Encontra o início da linha atual.
   * @private
   * @param {string} text
   * @param {number} cursor
   * @returns {number}
   */
  _findLineBoundaryBackward(text, cursor) {
    const safeCursor = this._clamp(cursor, 0, text.length);
    const lastBreak = text.lastIndexOf("\n", safeCursor - 1);
    return lastBreak === -1 ? 0 : lastBreak + 1;
  }

  /**
   * Encontra o fim da linha atual.
   * @private
   * @param {string} text
   * @param {number} cursor
   * @returns {number}
   */
  _findLineBoundaryForward(text, cursor) {
    const safeCursor = this._clamp(cursor, 0, text.length);
    const nextBreak = text.indexOf("\n", safeCursor);
    return nextBreak === -1 ? text.length : nextBreak;
  }

  /**
   * Obtém o texto atual do editor.
   * @private
   * @param {Object} editor
   * @returns {string}
   */
  _getText(editor) {
    if (!editor) return "";

    if (typeof editor.getValue === "function") return String(editor.getValue() ?? "");
    if (typeof editor.getText === "function") return String(editor.getText() ?? "");
    if (typeof editor.value === "string") return editor.value;
    if (typeof editor.text === "string") return editor.text;
    if (typeof editor.content === "string") return editor.content;

    return "";
  }

  /**
   * Define o texto no editor.
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
   * Obtém a seleção/cursor do editor.
   * Aceita várias formas comuns:
   * - { start, end }
   * - { selectionStart, selectionEnd }
   * - { anchor, focus }
   * - métodos getSelection(), getSelectionRange()
   *
   * @private
   * @param {Object} editor
   * @param {number} textLength
   * @returns {{start:number,end:number}}
   */
  _getSelection(editor, textLength) {
    if (!editor) {
      return { start: 0, end: 0 };
    }

    let selection = null;

    if (typeof editor.getSelection === "function") {
      selection = editor.getSelection();
    } else if (typeof editor.getSelectionRange === "function") {
      selection = editor.getSelectionRange();
    } else if (
      typeof editor.selectionStart === "number" &&
      typeof editor.selectionEnd === "number"
    ) {
      selection = {
        start: editor.selectionStart,
        end: editor.selectionEnd,
      };
    } else if (typeof editor.cursor === "number") {
      selection = {
        start: editor.cursor,
        end: editor.cursor,
      };
    } else if (typeof editor.position === "number") {
      selection = {
        start: editor.position,
        end: editor.position,
      };
    } else if (editor.selection && typeof editor.selection === "object") {
      selection = editor.selection;
    }

    return this._normalizeSelection(selection, textLength);
  }

  /**
   * Define a seleção/cursor no editor.
   * @private
   * @param {Object} editor
   * @param {number} start
   * @param {number} end
   */
  _setSelection(editor, start, end) {
    if (!editor) return;

    const selection = { start, end };

    if (typeof editor.setSelection === "function") {
      editor.setSelection(selection);
      return;
    }

    if (typeof editor.setSelectionRange === "function") {
      editor.setSelectionRange(start, end);
      return;
    }

    if (typeof editor.setCursor === "function" && start === end) {
      editor.setCursor(start);
      return;
    }

    if ("selectionStart" in editor && "selectionEnd" in editor) {
      editor.selectionStart = start;
      editor.selectionEnd = end;
      return;
    }

    if ("cursor" in editor && start === end) {
      editor.cursor = start;
      return;
    }

    if ("position" in editor && start === end) {
      editor.position = start;
    }

    if ("selection" in editor) {
      editor.selection = selection;
    }
  }

  /**
   * Normaliza diferentes formatos de seleção.
   * @private
   * @param {any} selection
   * @param {number} textLength
   * @returns {{start:number,end:number}}
   */
  _normalizeSelection(selection, textLength) {
    const max = Math.max(0, textLength);

    if (selection == null) {
      return { start: 0, end: 0 };
    }

    if (typeof selection === "number") {
      const pos = this._clamp(selection, 0, max);
      return { start: pos, end: pos };
    }

    if (typeof selection !== "object") {
      return { start: 0, end: 0 };
    }

    if (
      typeof selection.start === "number" &&
      typeof selection.end === "number"
    ) {
      return {
        start: this._clamp(selection.start, 0, max),
        end: this._clamp(selection.end, 0, max),
      };
    }

    if (
      typeof selection.selectionStart === "number" &&
      typeof selection.selectionEnd === "number"
    ) {
      return {
        start: this._clamp(selection.selectionStart, 0, max),
        end: this._clamp(selection.selectionEnd, 0, max),
      };
    }

    if (
      typeof selection.anchor === "number" &&
      typeof selection.focus === "number"
    ) {
      return {
        start: this._clamp(Math.min(selection.anchor, selection.focus), 0, max),
        end: this._clamp(Math.max(selection.anchor, selection.focus), 0, max),
      };
    }

    if (typeof selection.cursor === "number") {
      const pos = this._clamp(selection.cursor, 0, max);
      return { start: pos, end: pos };
    }

    return { start: 0, end: 0 };
  }

  /**
   * Limita valor entre mínimo e máximo.
   * @private
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  _clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
}
/**
 * engine/commands/InsertText.js
 *2
 * Comando responsável por inserir texto no editor.
 * Suporta:
 * - inserção simples no cursor
 * - substituição de seleção
 * - múltiplas linhas
 * - undo básico via snapshot
 *
 * Este comando foi escrito para funcionar com editores que expõem
 * diferentes APIs, como:
 * - getValue() / setValue()
 * - getText() / setText()
 * - getSelection() / setSelection()
 * - selectionStart / selectionEnd
 */

export default class InsertText {
  /**
   * @param {Object} options
   * @param {boolean} [options.selectInsertedText=false]
   * Se true, seleciona o texto inserido ao final.
   */
  constructor(options = {}) {
    this.selectInsertedText = Boolean(options.selectInsertedText);

    this._beforeSnapshot = null;
    this._lastResult = null;
  }

  /**
   * Executa a inserção no editor.
   * @param {Object} editor Instância do editor ou modelo de texto
   * @param {string} text Texto a ser inserido
   * @returns {Object} Resultado da operação
   */
  execute(editor, text) {
    const insertText = this._sanitizeText(text);
    const currentText = this._getText(editor);
    const selection = this._getSelection(editor, currentText.length);

    const beforeSnapshot = {
      text: currentText,
      selection: { ...selection },
    };

    const result = this._insertIntoText(currentText, selection, insertText);

    this._beforeSnapshot = beforeSnapshot;
    this._lastResult = result;

    this._setText(editor, result.text);
    this._setSelection(editor, result.selection.start, result.selection.end);

    return {
      ok: true,
      command: "InsertText",
      insertedText: insertText,
      before: beforeSnapshot,
      after: {
        text: result.text,
        selection: { ...result.selection },
      },
      insertedRange: { ...result.insertedRange },
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
   * Informa se o comando pode ser executado.
   * @param {Object} editor
   * @param {string} text
   * @returns {boolean}
   */
  canExecute(editor, text) {
    if (typeof text !== "string") return false;
    if (text.length === 0) return false;
    return editor != null;
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
   * Normaliza texto de entrada.
   * Remove caracteres nulos e normaliza quebras de linha.
   * @private
   * @param {string} text
   * @returns {string}
   */
  _sanitizeText(text) {
    if (typeof text !== "string") return "";
    return text
      .replace(/\u0000/g, "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");
  }

  /**
   * Insere texto no conteúdo bruto.
   * @private
   * @param {string} text
   * @param {{start:number,end:number}} selection
   * @param {string} insertText
   * @returns {{
   *   text:string,
   *   selection:{start:number,end:number},
   *   insertedText:string,
   *   insertedRange:{start:number,end:number}
   * }}
   */
  _insertIntoText(text, selection, insertText) {
    const normalizedText = typeof text === "string" ? text : "";
    const length = normalizedText.length;

    let start = this._clamp(selection.start, 0, length);
    let end = this._clamp(selection.end, 0, length);

    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }

    const before = normalizedText.slice(0, start);
    const after = normalizedText.slice(end);
    const nextText = before + insertText + after;

    const insertedStart = start;
    const insertedEnd = start + insertText.length;

    const selectionAfter = this.selectInsertedText
      ? { start: insertedStart, end: insertedEnd }
      : { start: insertedEnd, end: insertedEnd };

    return {
      text: nextText,
      selection: selectionAfter,
      insertedText: insertText,
      insertedRange: {
        start: insertedStart,
        end: insertedEnd,
      },
    };
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
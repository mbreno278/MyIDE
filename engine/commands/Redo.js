/**
 * engine/commands/Redo.js
 *3
 * Comando responsável por refazer a última ação desfeita.
 * Ele normalmente depende de um gerenciador de histórico que expõe
 * pilhas de undo/redo ou métodos equivalentes.
 *
 * Compatível com editores que fornecem:
 * - history.redo()
 * - redo()
 * - applySnapshot(snapshot)
 * - setValue() / setSelection()
 */

export default class Redo {
  /**
   * @param {Object} options
   * @param {boolean} [options.clearSelection=false]
   * Se true, limpa a seleção ao refazer quando o histórico não informar seleção.
   */
  constructor(options = {}) {
    this.clearSelection = Boolean(options.clearSelection);

    this._lastResult = null;
  }

  /**
   * Executa o redo.
   * @param {Object} editor Editor/modelo de texto
   * @returns {Object}
   */
  execute(editor) {
    const history = this._getHistory(editor);

    if (!history) {
      const result = {
        ok: false,
        command: "Redo",
        reason: "no-history",
      };

      this._lastResult = result;
      return result;
    }

    let redoResult = null;

    try {
      if (typeof history.redo === "function") {
        redoResult = history.redo();
      } else if (typeof editor.redo === "function") {
        redoResult = editor.redo();
      } else if (typeof history.popRedo === "function" && typeof history.pushUndo === "function") {
        const snapshot = history.popRedo();
        if (!snapshot) {
          const result = {
            ok: false,
            command: "Redo",
            reason: "empty-redo-stack",
          };

          this._lastResult = result;
          return result;
        }

        redoResult = this._applySnapshot(editor, snapshot);
        history.pushUndo(snapshot);
      } else {
        const result = {
          ok: false,
          command: "Redo",
          reason: "unsupported-history-api",
        };

        this._lastResult = result;
        return result;
      }
    } catch (error) {
      const result = {
        ok: false,
        command: "Redo",
        error,
      };

      this._lastResult = result;
      return result;
    }

    const applied = this._normalizeResult(redoResult, editor);

    this._lastResult = {
      ok: true,
      command: "Redo",
      result: applied,
    };

    return this._lastResult;
  }

  /**
   * Informa se há algo para refazer.
   * @param {Object} editor
   * @returns {boolean}
   */
  canExecute(editor) {
    const history = this._getHistory(editor);
    if (!history) return false;

    if (typeof history.canRedo === "function") {
      return Boolean(history.canRedo());
    }

    if (Array.isArray(history.redoStack)) {
      return history.redoStack.length > 0;
    }

    if (Array.isArray(history.redoHistory)) {
      return history.redoHistory.length > 0;
    }

    return false;
  }

  /**
   * Retorna o último resultado.
   * @returns {Object|null}
   */
  getLastResult() {
    return this._lastResult;
  }

  /**
   * Limpa estado interno.
   */
  reset() {
    this._lastResult = null;
  }

  /**
   * Tenta localizar o gerenciador de histórico.
   * @private
   * @param {Object} editor
   * @returns {Object|null}
   */
  _getHistory(editor) {
    if (!editor || typeof editor !== "object") return null;

    if (editor.history && typeof editor.history === "object") {
      return editor.history;
    }

    if (typeof editor.getHistory === "function") {
      const history = editor.getHistory();
      if (history && typeof history === "object") return history;
    }

    return null;
  }

  /**
   * Aplica snapshot no editor, caso o histórico forneça isso.
   * @private
   * @param {Object} editor
   * @param {Object} snapshot
   * @returns {Object}
   */
  _applySnapshot(editor, snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      return {
        ok: false,
        reason: "invalid-snapshot",
      };
    }

    if (typeof editor.applySnapshot === "function") {
      editor.applySnapshot(snapshot);
      return {
        ok: true,
        applied: true,
        snapshot,
      };
    }

    if (typeof editor.restoreSnapshot === "function") {
      editor.restoreSnapshot(snapshot);
      return {
        ok: true,
        applied: true,
        snapshot,
      };
    }

    if ("value" in editor && typeof snapshot.text === "string") {
      editor.value = snapshot.text;
      this._applySelection(editor, snapshot.selection);
      return {
        ok: true,
        applied: true,
        snapshot,
      };
    }

    if ("text" in editor && typeof snapshot.text === "string") {
      editor.text = snapshot.text;
      this._applySelection(editor, snapshot.selection);
      return {
        ok: true,
        applied: true,
        snapshot,
      };
    }

    if ("content" in editor && typeof snapshot.text === "string") {
      editor.content = snapshot.text;
      this._applySelection(editor, snapshot.selection);
      return {
        ok: true,
        applied: true,
        snapshot,
      };
    }

    return {
      ok: false,
      reason: "no-snapshot-apply-api",
      snapshot,
    };
  }

  /**
   * Normaliza o retorno do histórico.
   * @private
   * @param {any} redoResult
   * @param {Object} editor
   * @returns {Object}
   */
  _normalizeResult(redoResult, editor) {
    if (redoResult == null) {
      return {
        applied: true,
        result: null,
        target: editor || null,
      };
    }

    if (typeof redoResult === "boolean") {
      return {
        applied: redoResult,
        result: redoResult,
        target: editor || null,
      };
    }

    if (typeof redoResult === "object") {
      return {
        applied: true,
        ...redoResult,
      };
    }

    return {
      applied: true,
      result: redoResult,
      target: editor || null,
    };
  }

  /**
   * Aplica seleção ao editor quando houver snapshot.
   * @private
   * @param {Object} editor
   * @param {Object} selection
   */
  _applySelection(editor, selection) {
    if (!editor) return;

    if (selection && typeof selection === "object") {
      const start =
        typeof selection.start === "number"
          ? selection.start
          : typeof selection.selectionStart === "number"
            ? selection.selectionStart
            : null;

      const end =
        typeof selection.end === "number"
          ? selection.end
          : typeof selection.selectionEnd === "number"
            ? selection.selectionEnd
            : null;

      if (start != null && end != null) {
        if (typeof editor.setSelection === "function") {
          editor.setSelection({ start, end });
          return;
        }

        if (typeof editor.setSelectionRange === "function") {
          editor.setSelectionRange(start, end);
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
          return;
        }
      }
    }

    if (this.clearSelection) {
      if (typeof editor.setSelection === "function") {
        const pos = typeof editor.cursor === "number" ? editor.cursor : 0;
        editor.setSelection({ start: pos, end: pos });
        return;
      }

      if ("selectionStart" in editor && "selectionEnd" in editor) {
        const pos =
          typeof editor.selectionStart === "number" ? editor.selectionStart : 0;
        editor.selectionStart = pos;
        editor.selectionEnd = pos;
      }
    }
  }
}
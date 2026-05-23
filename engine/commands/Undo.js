/**
 * engine/commands/Undo.js
 *4
 * Comando responsável por desfazer a última ação do editor.
 * Trabalha em conjunto com um sistema de histórico contendo:
 * - undoStack
 * - redoStack
 *
 * Compatível com:
 * - history.undo()
 * - editor.undo()
 * - applySnapshot(snapshot)
 * - restoreSnapshot(snapshot)
 */

export default class Undo {
  /**
   * @param {Object} options
   * @param {boolean} [options.clearSelection=false]
   * Limpa seleção caso snapshot não tenha seleção.
   */
  constructor(options = {}) {
    this.clearSelection = Boolean(options.clearSelection);

    this._lastResult = null;
  }

  /**
   * Executa o undo.
   * @param {Object} editor
   * @returns {Object}
   */
  execute(editor) {
    const history = this._getHistory(editor);

    if (!history) {
      const result = {
        ok: false,
        command: "Undo",
        reason: "no-history",
      };

      this._lastResult = result;
      return result;
    }

    let undoResult = null;

    try {
      /**
       * API moderna:
       * history.undo()
       */
      if (typeof history.undo === "function") {
        undoResult = history.undo();
      }

      /**
       * API alternativa:
       * editor.undo()
       */
      else if (typeof editor.undo === "function") {
        undoResult = editor.undo();
      }

      /**
       * API manual com stacks
       */
      else if (
        typeof history.popUndo === "function" &&
        typeof history.pushRedo === "function"
      ) {
        const snapshot = history.popUndo();

        if (!snapshot) {
          const result = {
            ok: false,
            command: "Undo",
            reason: "empty-undo-stack",
          };

          this._lastResult = result;
          return result;
        }

        undoResult = this._applySnapshot(editor, snapshot);

        history.pushRedo(snapshot);
      }

      /**
       * API não suportada
       */
      else {
        const result = {
          ok: false,
          command: "Undo",
          reason: "unsupported-history-api",
        };

        this._lastResult = result;
        return result;
      }
    } catch (error) {
      const result = {
        ok: false,
        command: "Undo",
        error,
      };

      this._lastResult = result;
      return result;
    }

    const normalized = this._normalizeResult(undoResult, editor);

    this._lastResult = {
      ok: true,
      command: "Undo",
      result: normalized,
    };

    return this._lastResult;
  }

  /**
   * Verifica se existe algo para desfazer.
   * @param {Object} editor
   * @returns {boolean}
   */
  canExecute(editor) {
    const history = this._getHistory(editor);

    if (!history) return false;

    if (typeof history.canUndo === "function") {
      return Boolean(history.canUndo());
    }

    if (Array.isArray(history.undoStack)) {
      return history.undoStack.length > 0;
    }

    if (Array.isArray(history.undoHistory)) {
      return history.undoHistory.length > 0;
    }

    return false;
  }

  /**
   * Retorna último resultado.
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
   * Obtém histórico do editor.
   * @private
   * @param {Object} editor
   * @returns {Object|null}
   */
  _getHistory(editor) {
    if (!editor || typeof editor !== "object") {
      return null;
    }

    if (editor.history && typeof editor.history === "object") {
      return editor.history;
    }

    if (typeof editor.getHistory === "function") {
      const history = editor.getHistory();

      if (history && typeof history === "object") {
        return history;
      }
    }

    return null;
  }

  /**
   * Aplica snapshot ao editor.
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

    /**
     * API moderna
     */
    if (typeof editor.applySnapshot === "function") {
      editor.applySnapshot(snapshot);

      return {
        ok: true,
        applied: true,
        snapshot,
      };
    }

    /**
     * API alternativa
     */
    if (typeof editor.restoreSnapshot === "function") {
      editor.restoreSnapshot(snapshot);

      return {
        ok: true,
        applied: true,
        snapshot,
      };
    }

    /**
     * Fallback usando texto bruto
     */
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
   * Normaliza retorno do undo.
   * @private
   * @param {any} undoResult
   * @param {Object} editor
   * @returns {Object}
   */
  _normalizeResult(undoResult, editor) {
    if (undoResult == null) {
      return {
        applied: true,
        result: null,
        target: editor || null,
      };
    }

    if (typeof undoResult === "boolean") {
      return {
        applied: undoResult,
        result: undoResult,
        target: editor || null,
      };
    }

    if (typeof undoResult === "object") {
      return {
        applied: true,
        ...undoResult,
      };
    }

    return {
      applied: true,
      result: undoResult,
      target: editor || null,
    };
  }

  /**
   * Aplica seleção/cursor.
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

    /**
     * Fallback opcional
     */
    if (this.clearSelection) {
      if (typeof editor.setSelection === "function") {
        const pos =
          typeof editor.cursor === "number"
            ? editor.cursor
            : 0;

        editor.setSelection({
          start: pos,
          end: pos,
        });

        return;
      }

      if ("selectionStart" in editor && "selectionEnd" in editor) {
        const pos =
          typeof editor.selectionStart === "number"
            ? editor.selectionStart
            : 0;

        editor.selectionStart = pos;
        editor.selectionEnd = pos;
      }
    }
  }
}
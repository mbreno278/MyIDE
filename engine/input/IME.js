/**
 * engine/input/IME.js
 *14
 * IME = Input Method Editor
 * Responsável por lidar com composição de texto:
 * - compositionstart
 * - compositionupdate
 * - compositionend
 * - beforeinput / input relacionados à composição
 *
 * Este módulo não renderiza nada sozinho.
 * Ele apenas controla o estado da composição e dispara callbacks
 * para o restante do editor.
 */

export default class IME {
  /**
   * @param {Object} options
   * @param {HTMLElement|null} [options.target=null] Elemento que recebe os eventos
   * @param {Function} [options.onStart]  Callback quando a composição inicia
   * @param {Function} [options.onUpdate] Callback quando a composição atualiza
   * @param {Function} [options.onEnd]    Callback quando a composição termina
   * @param {Function} [options.onCommit] Callback quando o texto é confirmado
   * @param {Function} [options.onCancel] Callback quando a composição é cancelada
   */
  constructor(options = {}) {
    this.target = options.target || null;

    this.onStart = typeof options.onStart === "function" ? options.onStart : null;
    this.onUpdate = typeof options.onUpdate === "function" ? options.onUpdate : null;
    this.onEnd = typeof options.onEnd === "function" ? options.onEnd : null;
    this.onCommit = typeof options.onCommit === "function" ? options.onCommit : null;
    this.onCancel = typeof options.onCancel === "function" ? options.onCancel : null;

    this.isComposing = false;
    this.compositionText = "";
    this.lastCommittedText = "";
    this.data = "";
    this.activeTarget = null;

    this._bound = false;

    this._listeners = {
      compositionstart: this._handleCompositionStart.bind(this),
      compositionupdate: this._handleCompositionUpdate.bind(this),
      compositionend: this._handleCompositionEnd.bind(this),
      beforeinput: this._handleBeforeInput.bind(this),
      input: this._handleInput.bind(this),
      blur: this._handleBlur.bind(this),
    };

    if (this.target) {
      this.bind(this.target);
    }
  }

  /**
   * Define callbacks dinamicamente.
   * @param {Object} callbacks
   */
  setCallbacks(callbacks = {}) {
    if (typeof callbacks.onStart === "function") this.onStart = callbacks.onStart;
    if (typeof callbacks.onUpdate === "function") this.onUpdate = callbacks.onUpdate;
    if (typeof callbacks.onEnd === "function") this.onEnd = callbacks.onEnd;
    if (typeof callbacks.onCommit === "function") this.onCommit = callbacks.onCommit;
    if (typeof callbacks.onCancel === "function") this.onCancel = callbacks.onCancel;
  }

  /**
   * Conecta o IME a um elemento.
   * @param {HTMLElement} target
   */
  bind(target) {
    if (!target || typeof target.addEventListener !== "function") {
      throw new TypeError("IME.bind(target) espera um elemento DOM válido.");
    }

    this.unbind();

    this.target = target;
    this.activeTarget = target;

    target.addEventListener("compositionstart", this._listeners.compositionstart);
    target.addEventListener("compositionupdate", this._listeners.compositionupdate);
    target.addEventListener("compositionend", this._listeners.compositionend);
    target.addEventListener("beforeinput", this._listeners.beforeinput);
    target.addEventListener("input", this._listeners.input);
    target.addEventListener("blur", this._listeners.blur);

    this._bound = true;
  }

  /**
   * Remove eventos do elemento atual.
   */
  unbind() {
    if (!this.target || !this._bound) return;

    const target = this.target;

    target.removeEventListener("compositionstart", this._listeners.compositionstart);
    target.removeEventListener("compositionupdate", this._listeners.compositionupdate);
    target.removeEventListener("compositionend", this._listeners.compositionend);
    target.removeEventListener("beforeinput", this._listeners.beforeinput);
    target.removeEventListener("input", this._listeners.input);
    target.removeEventListener("blur", this._listeners.blur);

    this._bound = false;
    this.activeTarget = null;
  }

  /**
   * Retorna o estado atual da composição.
   */
  getState() {
    return {
      isComposing: this.isComposing,
      compositionText: this.compositionText,
      lastCommittedText: this.lastCommittedText,
      data: this.data,
      target: this.activeTarget,
    };
  }

  /**
   * Limpa o estado interno.
   */
  reset() {
    this.isComposing = false;
    this.compositionText = "";
    this.lastCommittedText = "";
    this.data = "";
  }

  /**
   * Força cancelamento da composição.
   */
  cancel() {
    if (!this.isComposing) return;

    this.isComposing = false;
    this.compositionText = "";
    this.data = "";

    if (this.onCancel) {
      this.onCancel({
        type: "compositioncancel",
        target: this.activeTarget,
        state: this.getState(),
      });
    }
  }

  /**
   * Indica se o evento está ligado à IME/composição.
   * @param {InputEvent|Event} event
   * @returns {boolean}
   */
  isCompositionEvent(event) {
    if (!event) return false;

    if (event.type && event.type.startsWith("composition")) return true;

    if (typeof event.inputType === "string") {
      return (
        event.inputType === "insertCompositionText" ||
        event.inputType === "deleteCompositionText"
      );
    }

    return false;
  }

  _handleCompositionStart(event) {
    this.isComposing = true;
    this.compositionText = "";
    this.data = typeof event.data === "string" ? event.data : "";

    if (this.onStart) {
      this.onStart({
        type: event.type,
        event,
        data: this.data,
        target: event.target || this.activeTarget,
        state: this.getState(),
      });
    }
  }

  _handleCompositionUpdate(event) {
    this.isComposing = true;
    this.compositionText = typeof event.data === "string" ? event.data : "";
    this.data = this.compositionText;

    if (this.onUpdate) {
      this.onUpdate({
        type: event.type,
        event,
        data: this.compositionText,
        target: event.target || this.activeTarget,
        state: this.getState(),
      });
    }
  }

  _handleCompositionEnd(event) {
    const committedText = typeof event.data === "string" ? event.data : "";

    this.isComposing = false;
    this.compositionText = "";
    this.lastCommittedText = committedText;
    this.data = committedText;

    if (this.onEnd) {
      this.onEnd({
        type: event.type,
        event,
        data: committedText,
        target: event.target || this.activeTarget,
        state: this.getState(),
      });
    }

    if (this.onCommit && committedText) {
      this.onCommit({
        type: "commit",
        event,
        data: committedText,
        target: event.target || this.activeTarget,
        state: this.getState(),
      });
    }
  }

  _handleBeforeInput(event) {
    if (!this.isCompositionEvent(event)) return;

    // Alguns navegadores disparam beforeinput durante composição.
    // Aqui apenas atualizamos o estado, sem interferir no fluxo.
    this.data = typeof event.data === "string" ? event.data : this.data;

    if (event.inputType === "insertCompositionText") {
      this.isComposing = true;
      this.compositionText = typeof event.data === "string" ? event.data : "";
    }

    if (event.inputType === "deleteCompositionText") {
      this.compositionText = "";
    }
  }

  _handleInput(event) {
    // Em alguns browsers o "input" chega antes ou junto do compositionend.
    // Mantemos o estado sincronizado sem assumir commit imediato.
    if (this.isComposing) {
      if (typeof event.data === "string") {
        this.compositionText = event.data;
        this.data = event.data;
      }
      return;
    }

    // Input normal fora de composição.
    if (typeof event.data === "string" && event.data.length > 0) {
      this.lastCommittedText = event.data;

      if (this.onCommit) {
        this.onCommit({
          type: event.type,
          event,
          data: event.data,
          target: event.target || this.activeTarget,
          state: this.getState(),
        });
      }
    }
  }

  _handleBlur() {
    // Se o campo perde foco no meio da composição, encerramos o estado.
    if (this.isComposing) {
      this.cancel();
    }
  }
}
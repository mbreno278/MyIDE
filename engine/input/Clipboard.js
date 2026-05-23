/**
 * engine/input/Clipboard.js
 *13
 * Responsável por operações de clipboard:
 * - copy
 * - cut
 * - paste
 *
 * Este módulo não altera o DOM diretamente do editor.
 * Ele apenas lê/escreve texto no clipboard e dispara callbacks
 * para o restante do motor tratar a inserção/remoção.
 */

export default class Clipboard {
  /**
   * @param {Object} options
   * @param {HTMLElement|null} [options.target=null] Elemento que recebe os eventos
   * @param {Function} [options.onCopy] Callback ao copiar
   * @param {Function} [options.onCut] Callback ao recortar
   * @param {Function} [options.onPaste] Callback ao colar
   * @param {Function} [options.onError] Callback de erro
   */
  constructor(options = {}) {
    this.target = options.target || null;

    this.onCopy = typeof options.onCopy === "function" ? options.onCopy : null;
    this.onCut = typeof options.onCut === "function" ? options.onCut : null;
    this.onPaste = typeof options.onPaste === "function" ? options.onPaste : null;
    this.onError = typeof options.onError === "function" ? options.onError : null;

    this.enabled = true;
    this._bound = false;
    this._lastText = "";

    this.activeTarget = null;
    this._listeners = {
      copy: this._handleCopy.bind(this),
      cut: this._handleCut.bind(this),
      paste: this._handlePaste.bind(this),
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
    if (typeof callbacks.onCopy === "function") this.onCopy = callbacks.onCopy;
    if (typeof callbacks.onCut === "function") this.onCut = callbacks.onCut;
    if (typeof callbacks.onPaste === "function") this.onPaste = callbacks.onPaste;
    if (typeof callbacks.onError === "function") this.onError = callbacks.onError;
  }

  /**
   * Conecta o clipboard a um elemento.
   * @param {HTMLElement} target
   */
  bind(target) {
    if (!target || typeof target.addEventListener !== "function") {
      throw new TypeError("Clipboard.bind(target) espera um elemento DOM válido.");
    }

    this.unbind();

    this.target = target;
    this.activeTarget = target;

    target.addEventListener("copy", this._listeners.copy);
    target.addEventListener("cut", this._listeners.cut);
    target.addEventListener("paste", this._listeners.paste);

    this._bound = true;
  }

  /**
   * Remove eventos do elemento atual.
   */
  unbind() {
    if (!this.target || !this._bound) return;

    const target = this.target;

    target.removeEventListener("copy", this._listeners.copy);
    target.removeEventListener("cut", this._listeners.cut);
    target.removeEventListener("paste", this._listeners.paste);

    this._bound = false;
    this.activeTarget = null;
  }

  /**
   * Retorna o estado atual.
   */
  getState() {
    return {
      enabled: this.enabled,
      bound: this._bound,
      lastText: this._lastText,
      target: this.activeTarget,
    };
  }

  /**
   * Ativa/desativa o módulo.
   * @param {boolean} value
   */
  setEnabled(value) {
    this.enabled = Boolean(value);
  }

  /**
   * Limpa o último texto manipulado.
   */
  reset() {
    this._lastText = "";
  }

  /**
   * Sanitiza texto antes de copiar/colar.
   * Normaliza quebras de linha e remove caracteres nulos.
   * @param {string} text
   * @returns {string}
   */
  sanitizeText(text) {
    if (typeof text !== "string") return "";
    return text
      .replace(/\u0000/g, "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");
  }

  /**
   * Escreve texto no clipboard.
   * Tenta usar navigator.clipboard e cai para fallback se necessário.
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async writeText(text) {
    const safeText = this.sanitizeText(text);

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function" &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(safeText);
        this._lastText = safeText;
        return true;
      }

      const ok = this._fallbackWriteText(safeText);
      this._lastText = safeText;
      return ok;
    } catch (error) {
      this._emitError(error, "writeText");
      return false;
    }
  }

  /**
   * Lê texto do clipboard.
   * Tenta usar navigator.clipboard e cai para fallback se necessário.
   * @returns {Promise<string>}
   */
  async readText() {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.readText === "function" &&
        window.isSecureContext
      ) {
        const text = await navigator.clipboard.readText();
        const safeText = this.sanitizeText(text);
        this._lastText = safeText;
        return safeText;
      }

      return "";
    } catch (error) {
      this._emitError(error, "readText");
      return "";
    }
  }

  /**
   * Copia um texto diretamente.
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async copy(text) {
    return this.writeText(text);
  }

  /**
   * Recorta um texto:
   * copia para o clipboard e permite que o editor remova o conteúdo.
   *
   * O texto a ser recortado pode vir direto como string
   * ou ser retornado por uma função.
   *
   * @param {string|Function} source
   * @returns {Promise<boolean>}
   */
  async cut(source) {
    let text = "";

    try {
      if (typeof source === "function") {
        text = source();
      } else {
        text = source;
      }
    } catch (error) {
      this._emitError(error, "cut-source");
      return false;
    }

    const ok = await this.writeText(text);

    if (ok && this.onCut) {
      this.onCut({
        text: this._lastText,
        target: this.activeTarget,
        state: this.getState(),
      });
    }

    return ok;
  }

  /**
   * Cola texto lendo diretamente do clipboard.
   * @returns {Promise<string>}
   */
  async paste() {
    return this.readText();
  }

  /**
   * Tenta usar a API antiga/recursos do navegador para escrever texto.
   * @private
   * @param {string} text
   * @returns {boolean}
   */
  _fallbackWriteText(text) {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;

      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      textarea.style.left = "-9999px";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);

      return Boolean(ok);
    } catch (error) {
      this._emitError(error, "fallbackWriteText");
      return false;
    }
  }

  /**
   * Extrai texto do evento de paste.
   * @private
   * @param {ClipboardEvent} event
   * @returns {string}
   */
  _getPastedTextFromEvent(event) {
    if (!event) return "";

    const clipboardData = event.clipboardData || window.clipboardData;
    if (!clipboardData) return "";

    let text = "";

    if (typeof clipboardData.getData === "function") {
      text = clipboardData.getData("text/plain") || clipboardData.getData("Text") || "";
    }

    return this.sanitizeText(text);
  }

  /**
   * Manipula o evento copy.
   * @private
   * @param {ClipboardEvent} event
   */
  _handleCopy(event) {
    if (!this.enabled) return;

    try {
      if (this.onCopy) {
        const payload = {
          event,
          target: event.target || this.activeTarget,
          state: this.getState(),
          setText: (text) => {
            const safeText = this.sanitizeText(text);
            if (event.clipboardData && typeof event.clipboardData.setData === "function") {
              event.clipboardData.setData("text/plain", safeText);
              this._lastText = safeText;
              return true;
            }
            return false;
          },
        };

        const result = this.onCopy(payload);

        if (result === false) {
          event.preventDefault();
        }
      }
    } catch (error) {
      this._emitError(error, "copy");
    }
  }

  /**
   * Manipula o evento cut.
   * @private
   * @param {ClipboardEvent} event
   */
  _handleCut(event) {
    if (!this.enabled) return;

    try {
      if (this.onCut) {
        const payload = {
          event,
          target: event.target || this.activeTarget,
          state: this.getState(),
          setText: (text) => {
            const safeText = this.sanitizeText(text);
            if (event.clipboardData && typeof event.clipboardData.setData === "function") {
              event.clipboardData.setData("text/plain", safeText);
              this._lastText = safeText;
              return true;
            }
            return false;
          },
        };

        const result = this.onCut(payload);

        if (result === false) {
          event.preventDefault();
        }
      }
    } catch (error) {
      this._emitError(error, "cut");
    }
  }

  /**
   * Manipula o evento paste.
   * @private
   * @param {ClipboardEvent} event
   */
  _handlePaste(event) {
    if (!this.enabled) return;

    try {
      const pastedText = this._getPastedTextFromEvent(event);
      this._lastText = pastedText;

      if (this.onPaste) {
        const payload = {
          event,
          text: pastedText,
          target: event.target || this.activeTarget,
          state: this.getState(),
          preventDefault: () => event.preventDefault(),
        };

        const result = this.onPaste(payload);

        if (result === false) {
          event.preventDefault();
          return;
        }
      }

      // Por padrão, o editor que usa esse módulo costuma cuidar da inserção.
      // Se o callback não tratou, evitamos duplicação de colagem bruta no DOM.
      event.preventDefault();
    } catch (error) {
      this._emitError(error, "paste");
    }
  }

  /**
   * Dispara erro para callback configurado.
   * @private
   * @param {Error} error
   * @param {string} source
   */
  _emitError(error, source) {
    if (this.onError) {
      this.onError({
        error,
        source,
        target: this.activeTarget,
        state: this.getState(),
      });
    }
  }
}
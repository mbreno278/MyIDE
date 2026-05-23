/**
 * engine/input/Keyboard.js
 *15
 * Responsável por capturar e normalizar eventos de teclado.
 * Este módulo não executa ações de edição diretamente.
 * Ele apenas interpreta o evento e repassa para callbacks.
 */

export default class Keyboard {
  /**
   * @param {Object} options
   * @param {HTMLElement|null} [options.target=null] Elemento que receberá os eventos
   * @param {Function} [options.onKeyDown] Callback para keydown
   * @param {Function} [options.onKeyUp] Callback para keyup
   * @param {Function} [options.onKeyPress] Callback para keypress
   * @param {Function} [options.onShortcut] Callback para atalhos
   * @param {Function} [options.onError] Callback de erro
   */
  constructor(options = {}) {
    this.target = options.target || null;

    this.onKeyDown = typeof options.onKeyDown === "function" ? options.onKeyDown : null;
    this.onKeyUp = typeof options.onKeyUp === "function" ? options.onKeyUp : null;
    this.onKeyPress = typeof options.onKeyPress === "function" ? options.onKeyPress : null;
    this.onShortcut = typeof options.onShortcut === "function" ? options.onShortcut : null;
    this.onError = typeof options.onError === "function" ? options.onError : null;

    this.enabled = true;
    this._bound = false;
    this.activeTarget = null;

    this.pressedKeys = new Set();
    this.modifiers = {
      ctrl: false,
      shift: false,
      alt: false,
      meta: false,
    };

    this.lastKey = null;
    this.lastCode = null;
    this.lastShortcut = null;

    this.blockedKeys = new Set();
    this.blockedShortcuts = new Set();

    this._listeners = {
      keydown: this._handleKeyDown.bind(this),
      keyup: this._handleKeyUp.bind(this),
      keypress: this._handleKeyPress.bind(this),
      blur: this._handleBlur.bind(this),
    };

    if (this.target) {
      this.bind(this.target);
    }
  }

  /**
   * Atualiza callbacks dinamicamente.
   * @param {Object} callbacks
   */
  setCallbacks(callbacks = {}) {
    if (typeof callbacks.onKeyDown === "function") this.onKeyDown = callbacks.onKeyDown;
    if (typeof callbacks.onKeyUp === "function") this.onKeyUp = callbacks.onKeyUp;
    if (typeof callbacks.onKeyPress === "function") this.onKeyPress = callbacks.onKeyPress;
    if (typeof callbacks.onShortcut === "function") this.onShortcut = callbacks.onShortcut;
    if (typeof callbacks.onError === "function") this.onError = callbacks.onError;
  }

  /**
   * Conecta o teclado a um elemento.
   * @param {HTMLElement} target
   */
  bind(target) {
    if (!target || typeof target.addEventListener !== "function") {
      throw new TypeError("Keyboard.bind(target) espera um elemento DOM válido.");
    }

    this.unbind();

    this.target = target;
    this.activeTarget = target;

    target.addEventListener("keydown", this._listeners.keydown);
    target.addEventListener("keyup", this._listeners.keyup);
    target.addEventListener("keypress", this._listeners.keypress);
    target.addEventListener("blur", this._listeners.blur);

    this._bound = true;
  }

  /**
   * Remove eventos do elemento atual.
   */
  unbind() {
    if (!this.target || !this._bound) return;

    const target = this.target;

    target.removeEventListener("keydown", this._listeners.keydown);
    target.removeEventListener("keyup", this._listeners.keyup);
    target.removeEventListener("keypress", this._listeners.keypress);
    target.removeEventListener("blur", this._listeners.blur);

    this._bound = false;
    this.activeTarget = null;
  }

  /**
   * Habilita ou desabilita o módulo.
   * @param {boolean} value
   */
  setEnabled(value) {
    this.enabled = Boolean(value);
  }

  /**
   * Bloqueia uma tecla específica.
   * Ex: "Tab", "Enter", "Escape"
   * @param {string} key
   */
  blockKey(key) {
    if (typeof key === "string" && key) {
      this.blockedKeys.add(key);
    }
  }

  /**
   * Remove bloqueio de uma tecla.
   * @param {string} key
   */
  unblockKey(key) {
    this.blockedKeys.delete(key);
  }

  /**
   * Bloqueia um atalho específico.
   * Ex: "Ctrl+S", "Ctrl+Shift+P"
   * @param {string} shortcut
   */
  blockShortcut(shortcut) {
    if (typeof shortcut === "string" && shortcut) {
      this.blockedShortcuts.add(shortcut);
    }
  }

  /**
   * Remove bloqueio de um atalho.
   * @param {string} shortcut
   */
  unblockShortcut(shortcut) {
    this.blockedShortcuts.delete(shortcut);
  }

  /**
   * Retorna o estado atual do teclado.
   */
  getState() {
    return {
      enabled: this.enabled,
      bound: this._bound,
      pressedKeys: Array.from(this.pressedKeys),
      modifiers: { ...this.modifiers },
      lastKey: this.lastKey,
      lastCode: this.lastCode,
      lastShortcut: this.lastShortcut,
      target: this.activeTarget,
    };
  }

  /**
   * Limpa o estado interno.
   */
  reset() {
    this.pressedKeys.clear();
    this.modifiers.ctrl = false;
    this.modifiers.shift = false;
    this.modifiers.alt = false;
    this.modifiers.meta = false;
    this.lastKey = null;
    this.lastCode = null;
    this.lastShortcut = null;
  }

  /**
   * Normaliza a tecla para formato consistente.
   * @param {KeyboardEvent} event
   * @returns {string}
   */
  normalizeKey(event) {
    if (!event) return "";

    const key = typeof event.key === "string" ? event.key : "";
    if (!key) return "";

    const aliases = {
      Esc: "Escape",
      Del: "Delete",
      Left: "ArrowLeft",
      Right: "ArrowRight",
      Up: "ArrowUp",
      Down: "ArrowDown",
      Spacebar: " ",
      " ": "Space",
    };

    return aliases[key] || key;
  }

  /**
   * Normaliza o código da tecla.
   * @param {KeyboardEvent} event
   * @returns {string}
   */
  normalizeCode(event) {
    if (!event) return "";
    return typeof event.code === "string" ? event.code : "";
  }

  /**
   * Verifica se o evento é um atalho com modificadores.
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  isShortcut(event) {
    if (!event) return false;
    return Boolean(event.ctrlKey || event.metaKey || event.altKey);
  }

  /**
   * Cria uma string de atalho no formato:
   * Ctrl+Shift+P
   * @param {KeyboardEvent} event
   * @returns {string}
   */
  getShortcutString(event) {
    if (!event) return "";

    const parts = [];

    if (event.ctrlKey) parts.push("Ctrl");
    if (event.metaKey) parts.push("Meta");
    if (event.altKey) parts.push("Alt");
    if (event.shiftKey) parts.push("Shift");

    const key = this.normalizeKey(event);
    if (key && key !== "Control" && key !== "Meta" && key !== "Alt" && key !== "Shift") {
      parts.push(key.length === 1 ? key.toUpperCase() : key);
    }

    return parts.join("+");
  }

  /**
   * Indica se a tecla é de navegação.
   * @param {string} key
   * @returns {boolean}
   */
  isNavigationKey(key) {
    return (
      key === "ArrowUp" ||
      key === "ArrowDown" ||
      key === "ArrowLeft" ||
      key === "ArrowRight" ||
      key === "Home" ||
      key === "End" ||
      key === "PageUp" ||
      key === "PageDown"
    );
  }

  /**
   * Indica se a tecla é de ação especial.
   * @param {string} key
   * @returns {boolean}
   */
  isSpecialKey(key) {
    return (
      key === "Backspace" ||
      key === "Delete" ||
      key === "Enter" ||
      key === "Tab" ||
      key === "Escape" ||
      key === "Insert"
    );
  }

  /**
   * Indica se o evento está em modo de composição IME.
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  isComposing(event) {
    return Boolean(event && event.isComposing);
  }

  _updateModifiers(event) {
    this.modifiers.ctrl = Boolean(event.ctrlKey);
    this.modifiers.shift = Boolean(event.shiftKey);
    this.modifiers.alt = Boolean(event.altKey);
    this.modifiers.meta = Boolean(event.metaKey);
  }

  _handleKeyDown(event) {
    if (!this.enabled) return;

    try {
      const key = this.normalizeKey(event);
      const code = this.normalizeCode(event);
      const shortcut = this.getShortcutString(event);

      this._updateModifiers(event);
      this.lastKey = key;
      this.lastCode = code;
      this.lastShortcut = shortcut || null;

      if (key) {
        this.pressedKeys.add(key);
      }

      const blocked =
        this.blockedKeys.has(key) ||
        (shortcut && this.blockedShortcuts.has(shortcut));

      const payload = {
        event,
        key,
        code,
        shortcut: shortcut || null,
        repeat: Boolean(event.repeat),
        composing: this.isComposing(event),
        modifiers: { ...this.modifiers },
        target: event.target || this.activeTarget,
        state: this.getState(),
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation(),
      };

      if (blocked) {
        event.preventDefault();
        if (this.onShortcut && shortcut) {
          this.onShortcut({
            ...payload,
            blocked: true,
          });
        }
        return;
      }

      if (this.onShortcut && shortcut && this.isShortcut(event)) {
        const result = this.onShortcut(payload);
        if (result === false) {
          event.preventDefault();
          return;
        }
      }

      if (this.onKeyDown) {
        const result = this.onKeyDown(payload);
        if (result === false) {
          event.preventDefault();
        }
      }
    } catch (error) {
      this._emitError(error, "keydown");
    }
  }

  _handleKeyUp(event) {
    if (!this.enabled) return;

    try {
      const key = this.normalizeKey(event);
      const code = this.normalizeCode(event);

      this._updateModifiers(event);
      this.lastKey = key;
      this.lastCode = code;

      if (key) {
        this.pressedKeys.delete(key);
      }

      const payload = {
        event,
        key,
        code,
        repeat: Boolean(event.repeat),
        composing: this.isComposing(event),
        modifiers: { ...this.modifiers },
        target: event.target || this.activeTarget,
        state: this.getState(),
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation(),
      };

      if (this.onKeyUp) {
        const result = this.onKeyUp(payload);
        if (result === false) {
          event.preventDefault();
        }
      }
    } catch (error) {
      this._emitError(error, "keyup");
    }
  }

  _handleKeyPress(event) {
    if (!this.enabled) return;

    try {
      const key = this.normalizeKey(event);
      const code = this.normalizeCode(event);

      this._updateModifiers(event);
      this.lastKey = key;
      this.lastCode = code;

      const payload = {
        event,
        key,
        code,
        composing: this.isComposing(event),
        modifiers: { ...this.modifiers },
        target: event.target || this.activeTarget,
        state: this.getState(),
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation(),
      };

      if (this.onKeyPress) {
        const result = this.onKeyPress(payload);
        if (result === false) {
          event.preventDefault();
        }
      }
    } catch (error) {
      this._emitError(error, "keypress");
    }
  }

  _handleBlur() {
    this.reset();
  }

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
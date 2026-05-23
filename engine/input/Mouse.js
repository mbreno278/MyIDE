/**
 * engine/input/Mouse.js
 *16
 * Responsável por capturar e normalizar eventos do mouse/pointer.
 * Este módulo não executa edição diretamente.
 * Ele apenas interpreta o evento e repassa para callbacks.
 */

export default class Mouse {
  /**
   * @param {Object} options
   * @param {HTMLElement|null} [options.target=null] Elemento que receberá os eventos
   * @param {Function} [options.onDown] Callback para mousedown
   * @param {Function} [options.onMove] Callback para mousemove
   * @param {Function} [options.onUp] Callback para mouseup
   * @param {Function} [options.onClick] Callback para click
   * @param {Function} [options.onDoubleClick] Callback para dblclick
   * @param {Function} [options.onContextMenu] Callback para contextmenu
   * @param {Function} [options.onWheel] Callback para wheel
   * @param {Function} [options.onDragStart] Callback quando arrasto começa
   * @param {Function} [options.onDragMove] Callback durante arrasto
   * @param {Function} [options.onDragEnd] Callback quando arrasto termina
   * @param {Function} [options.onError] Callback de erro
   */
  constructor(options = {}) {
    this.target = options.target || null;

    this.onDown = typeof options.onDown === "function" ? options.onDown : null;
    this.onMove = typeof options.onMove === "function" ? options.onMove : null;
    this.onUp = typeof options.onUp === "function" ? options.onUp : null;
    this.onClick = typeof options.onClick === "function" ? options.onClick : null;
    this.onDoubleClick =
      typeof options.onDoubleClick === "function" ? options.onDoubleClick : null;
    this.onContextMenu =
      typeof options.onContextMenu === "function" ? options.onContextMenu : null;
    this.onWheel = typeof options.onWheel === "function" ? options.onWheel : null;
    this.onDragStart =
      typeof options.onDragStart === "function" ? options.onDragStart : null;
    this.onDragMove =
      typeof options.onDragMove === "function" ? options.onDragMove : null;
    this.onDragEnd = typeof options.onDragEnd === "function" ? options.onDragEnd : null;
    this.onError = typeof options.onError === "function" ? options.onError : null;

    this.enabled = true;
    this._bound = false;
    this.activeTarget = null;

    this.position = { x: 0, y: 0 };
    this.previousPosition = { x: 0, y: 0 };
    this.delta = { x: 0, y: 0 };

    this.buttons = {
      left: false,
      middle: false,
      right: false,
    };

    this.isDragging = false;
    this.dragStartPosition = { x: 0, y: 0 };
    this.dragCurrentPosition = { x: 0, y: 0 };
    this.dragButton = null;

    this.clickCount = 0;
    this.lastClickTime = 0;
    this.lastButton = null;

    this.blockContextMenu = false;

    this._listeners = {
      mousedown: this._handleMouseDown.bind(this),
      mousemove: this._handleMouseMove.bind(this),
      mouseup: this._handleMouseUp.bind(this),
      click: this._handleClick.bind(this),
      dblclick: this._handleDoubleClick.bind(this),
      contextmenu: this._handleContextMenu.bind(this),
      wheel: this._handleWheel.bind(this),
      blur: this._handleBlur.bind(this),
      mouseleave: this._handleMouseLeave.bind(this),
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
    if (typeof callbacks.onDown === "function") this.onDown = callbacks.onDown;
    if (typeof callbacks.onMove === "function") this.onMove = callbacks.onMove;
    if (typeof callbacks.onUp === "function") this.onUp = callbacks.onUp;
    if (typeof callbacks.onClick === "function") this.onClick = callbacks.onClick;
    if (typeof callbacks.onDoubleClick === "function")
      this.onDoubleClick = callbacks.onDoubleClick;
    if (typeof callbacks.onContextMenu === "function")
      this.onContextMenu = callbacks.onContextMenu;
    if (typeof callbacks.onWheel === "function") this.onWheel = callbacks.onWheel;
    if (typeof callbacks.onDragStart === "function")
      this.onDragStart = callbacks.onDragStart;
    if (typeof callbacks.onDragMove === "function") this.onDragMove = callbacks.onDragMove;
    if (typeof callbacks.onDragEnd === "function") this.onDragEnd = callbacks.onDragEnd;
    if (typeof callbacks.onError === "function") this.onError = callbacks.onError;
  }

  /**
   * Conecta o mouse a um elemento.
   * @param {HTMLElement} target
   */
  bind(target) {
    if (!target || typeof target.addEventListener !== "function") {
      throw new TypeError("Mouse.bind(target) espera um elemento DOM válido.");
    }

    this.unbind();

    this.target = target;
    this.activeTarget = target;

    target.addEventListener("mousedown", this._listeners.mousedown);
    target.addEventListener("mousemove", this._listeners.mousemove);
    target.addEventListener("mouseup", this._listeners.mouseup);
    target.addEventListener("click", this._listeners.click);
    target.addEventListener("dblclick", this._listeners.dblclick);
    target.addEventListener("contextmenu", this._listeners.contextmenu);
    target.addEventListener("wheel", this._listeners.wheel);
    target.addEventListener("mouseleave", this._listeners.mouseleave);
    target.addEventListener("blur", this._listeners.blur);

    this._bound = true;
  }

  /**
   * Remove eventos do elemento atual.
   */
  unbind() {
    if (!this.target || !this._bound) return;

    const target = this.target;

    target.removeEventListener("mousedown", this._listeners.mousedown);
    target.removeEventListener("mousemove", this._listeners.mousemove);
    target.removeEventListener("mouseup", this._listeners.mouseup);
    target.removeEventListener("click", this._listeners.click);
    target.removeEventListener("dblclick", this._listeners.dblclick);
    target.removeEventListener("contextmenu", this._listeners.contextmenu);
    target.removeEventListener("wheel", this._listeners.wheel);
    target.removeEventListener("mouseleave", this._listeners.mouseleave);
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
   * Ativa/desativa o bloqueio do menu de contexto.
   * @param {boolean} value
   */
  setBlockContextMenu(value) {
    this.blockContextMenu = Boolean(value);
  }

  /**
   * Retorna o estado atual do mouse.
   */
  getState() {
    return {
      enabled: this.enabled,
      bound: this._bound,
      position: { ...this.position },
      previousPosition: { ...this.previousPosition },
      delta: { ...this.delta },
      buttons: { ...this.buttons },
      isDragging: this.isDragging,
      dragStartPosition: { ...this.dragStartPosition },
      dragCurrentPosition: { ...this.dragCurrentPosition },
      dragButton: this.dragButton,
      clickCount: this.clickCount,
      lastButton: this.lastButton,
      target: this.activeTarget,
    };
  }

  /**
   * Limpa o estado interno.
   */
  reset() {
    this.position = { x: 0, y: 0 };
    this.previousPosition = { x: 0, y: 0 };
    this.delta = { x: 0, y: 0 };

    this.buttons.left = false;
    this.buttons.middle = false;
    this.buttons.right = false;

    this.isDragging = false;
    this.dragStartPosition = { x: 0, y: 0 };
    this.dragCurrentPosition = { x: 0, y: 0 };
    this.dragButton = null;

    this.clickCount = 0;
    this.lastClickTime = 0;
    this.lastButton = null;
  }

  /**
   * Verifica se o mouse está pressionado.
   * @param {"left"|"middle"|"right"} button
   * @returns {boolean}
   */
  isButtonDown(button) {
    return Boolean(this.buttons[button]);
  }

  /**
   * Normaliza o botão do evento.
   * @param {MouseEvent} event
   * @returns {"left"|"middle"|"right"|"unknown"}
   */
  normalizeButton(event) {
    if (!event || typeof event.button !== "number") return "unknown";

    switch (event.button) {
      case 0:
        return "left";
      case 1:
        return "middle";
      case 2:
        return "right";
      default:
        return "unknown";
    }
  }

  /**
   * Obtém a posição do evento.
   * @param {MouseEvent} event
   * @returns {{x:number, y:number}}
   */
  getPosition(event) {
    return {
      x: typeof event.clientX === "number" ? event.clientX : 0,
      y: typeof event.clientY === "number" ? event.clientY : 0,
    };
  }

  /**
   * Atualiza posição e delta.
   * @private
   * @param {MouseEvent} event
   */
  _updatePosition(event) {
    const pos = this.getPosition(event);

    this.previousPosition = { ...this.position };
    this.position = pos;
    this.delta = {
      x: this.position.x - this.previousPosition.x,
      y: this.position.y - this.previousPosition.y,
    };
  }

  /**
   * Verifica se o mouse deve iniciar arrasto.
   * @private
   * @param {MouseEvent} event
   * @returns {boolean}
   */
  _shouldStartDrag(event) {
    return Boolean(event.buttons && event.buttons !== 0);
  }

  /**
   * Manipula o evento mousedown.
   * @private
   * @param {MouseEvent} event
   */
  _handleMouseDown(event) {
    if (!this.enabled) return;

    try {
      const button = this.normalizeButton(event);
      this._updatePosition(event);

      if (button !== "unknown") {
        this.buttons[button] = true;
        this.lastButton = button;
        this.dragButton = button;
      }

      this.dragStartPosition = { ...this.position };
      this.dragCurrentPosition = { ...this.position };

      const payload = {
        event,
        button,
        position: { ...this.position },
        previousPosition: { ...this.previousPosition },
        delta: { ...this.delta },
        buttons: { ...this.buttons },
        target: event.target || this.activeTarget,
        state: this.getState(),
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation(),
      };

      if (this.onDown) {
        const result = this.onDown(payload);
        if (result === false) {
          event.preventDefault();
          return;
        }
      }

      if (this._shouldStartDrag(event) && !this.isDragging) {
        this.isDragging = true;
        if (this.onDragStart) {
          const result = this.onDragStart({
            ...payload,
            dragStartPosition: { ...this.dragStartPosition },
          });
          if (result === false) {
            event.preventDefault();
          }
        }
      }
    } catch (error) {
      this._emitError(error, "mousedown");
    }
  }

  /**
   * Manipula o evento mousemove.
   * @private
   * @param {MouseEvent} event
   */
  _handleMouseMove(event) {
    if (!this.enabled) return;

    try {
      this._updatePosition(event);
      this.dragCurrentPosition = { ...this.position };

      const payload = {
        event,
        position: { ...this.position },
        previousPosition: { ...this.previousPosition },
        delta: { ...this.delta },
        buttons: { ...this.buttons },
        isDragging: this.isDragging,
        dragStartPosition: { ...this.dragStartPosition },
        dragCurrentPosition: { ...this.dragCurrentPosition },
        target: event.target || this.activeTarget,
        state: this.getState(),
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation(),
      };

      if (this.onMove) {
        const result = this.onMove(payload);
        if (result === false) {
          event.preventDefault();
        }
      }

      if (this.isDragging && this.onDragMove) {
        const result = this.onDragMove(payload);
        if (result === false) {
          event.preventDefault();
        }
      }
    } catch (error) {
      this._emitError(error, "mousemove");
    }
  }

  /**
   * Manipula o evento mouseup.
   * @private
   * @param {MouseEvent} event
   */
  _handleMouseUp(event) {
    if (!this.enabled) return;

    try {
      const button = this.normalizeButton(event);
      this._updatePosition(event);

      if (button !== "unknown") {
        this.buttons[button] = false;
      }

      const wasDragging = this.isDragging;

      this.dragCurrentPosition = { ...this.position };

      const payload = {
        event,
        button,
        position: { ...this.position },
        previousPosition: { ...this.previousPosition },
        delta: { ...this.delta },
        buttons: { ...this.buttons },
        isDragging: this.isDragging,
        dragStartPosition: { ...this.dragStartPosition },
        dragCurrentPosition: { ...this.dragCurrentPosition },
        target: event.target || this.activeTarget,
        state: this.getState(),
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation(),
      };

      if (this.onUp) {
        const result = this.onUp(payload);
        if (result === false) {
          event.preventDefault();
        }
      }

      if (wasDragging) {
        this.isDragging = false;
        this.dragButton = null;

        if (this.onDragEnd) {
          const result = this.onDragEnd(payload);
          if (result === false) {
            event.preventDefault();
          }
        }
      }
    } catch (error) {
      this._emitError(error, "mouseup");
    }
  }

  /**
   * Manipula clique simples.
   * @private
   * @param {MouseEvent} event
   */
  _handleClick(event) {
    if (!this.enabled) return;

    try {
      this._updatePosition(event);

      const now = Date.now();
      const elapsed = now - this.lastClickTime;
      this.lastClickTime = now;

      if (elapsed < 400) {
        this.clickCount += 1;
      } else {
        this.clickCount = 1;
      }

      const button = this.normalizeButton(event);

      const payload = {
        event,
        button,
        clickCount: this.clickCount,
        position: { ...this.position },
        target: event.target || this.activeTarget,
        state: this.getState(),
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation(),
      };

      if (this.onClick) {
        const result = this.onClick(payload);
        if (result === false) {
          event.preventDefault();
        }
      }
    } catch (error) {
      this._emitError(error, "click");
    }
  }

  /**
   * Manipula duplo clique.
   * @private
   * @param {MouseEvent} event
   */
  _handleDoubleClick(event) {
    if (!this.enabled) return;

    try {
      this._updatePosition(event);

      const payload = {
        event,
        button: this.normalizeButton(event),
        position: { ...this.position },
        target: event.target || this.activeTarget,
        state: this.getState(),
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation(),
      };

      if (this.onDoubleClick) {
        const result = this.onDoubleClick(payload);
        if (result === false) {
          event.preventDefault();
        }
      }
    } catch (error) {
      this._emitError(error, "dblclick");
    }
  }

  /**
   * Manipula menu de contexto.
   * @private
   * @param {MouseEvent} event
   */
  _handleContextMenu(event) {
    if (!this.enabled) return;

    try {
      this._updatePosition(event);

      const payload = {
        event,
        position: { ...this.position },
        target: event.target || this.activeTarget,
        state: this.getState(),
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation(),
      };

      if (this.blockContextMenu) {
        event.preventDefault();
      }

      if (this.onContextMenu) {
        const result = this.onContextMenu(payload);
        if (result === false) {
          event.preventDefault();
        }
      }
    } catch (error) {
      this._emitError(error, "contextmenu");
    }
  }

  /**
   * Manipula scroll do mouse.
   * @private
   * @param {WheelEvent} event
   */
  _handleWheel(event) {
    if (!this.enabled) return;

    try {
      this._updatePosition(event);

      const payload = {
        event,
        position: { ...this.position },
        deltaX: typeof event.deltaX === "number" ? event.deltaX : 0,
        deltaY: typeof event.deltaY === "number" ? event.deltaY : 0,
        deltaMode: typeof event.deltaMode === "number" ? event.deltaMode : 0,
        target: event.target || this.activeTarget,
        state: this.getState(),
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation(),
      };

      if (this.onWheel) {
        const result = this.onWheel(payload);
        if (result === false) {
          event.preventDefault();
        }
      }
    } catch (error) {
      this._emitError(error, "wheel");
    }
  }

  /**
   * Limpa estado quando o elemento perde foco.
   * @private
   */
  _handleBlur() {
    this.reset();
  }

  /**
   * Limpa estado quando o cursor sai do elemento.
   * @private
   */
  _handleMouseLeave() {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragButton = null;
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
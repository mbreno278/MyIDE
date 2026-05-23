/**
 * engine/core/EventBus.js
 *7
 * Barramento central de eventos da IDE/editor.
 *
 * Responsabilidades:
 * - comunicação entre módulos
 * - pub/sub
 * - eventos globais
 * - namespaces
 * - once listeners
 * - middleware
 * - logs/debug
 *
 * Usado por:
 * - Editor
 * - Commands
 * - Renderer
 * - Input
 * - Plugins
 * - Services
 */

export default class EventBus {
  /**
   * @param {Object} options
   */
  constructor(options = {}) {
    /**
     * Eventos registrados
     * @type {Map<string, Set<Function>>}
     */
    this.events =
      new Map();

    /**
     * Middleware
     * @type {Set<Function>}
     */
    this.middlewares =
      new Set();

    /**
     * Histórico eventos
     */
    this.history = [];

    /**
     * Configurações
     */
    this.maxHistory =
      options.maxHistory || 500;

    this.debug =
      options.debug || false;

    /**
     * Estado
     */
    this.destroyed = false;
  }

  /**
   * Registra listener.
   * @param {string} event
   * @param {Function} callback
   * @returns {Function}
   */
  on(event, callback) {
    if (
      this.destroyed
    ) {
      return () => {};
    }

    if (
      typeof callback !==
      "function"
    ) {
      return () => {};
    }

    if (
      !this.events.has(event)
    ) {
      this.events.set(
        event,
        new Set()
      );
    }

    this.events
      .get(event)
      .add(callback);

    /**
     * Unsubscribe
     */
    return () => {
      this.off(
        event,
        callback
      );
    };
  }

  /**
   * Registra listener único.
   * @param {string} event
   * @param {Function} callback
   * @returns {Function}
   */
  once(event, callback) {
    const wrapper =
      payload => {
        this.off(
          event,
          wrapper
        );

        callback(payload);
      };

    return this.on(
      event,
      wrapper
    );
  }

  /**
   * Remove listener.
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    const listeners =
      this.events.get(
        event
      );

    if (!listeners) {
      return;
    }

    listeners.delete(
      callback
    );

    /**
     * Remove vazio
     */
    if (
      listeners.size === 0
    ) {
      this.events.delete(
        event
      );
    }
  }

  /**
   * Emite evento.
   * @param {string} event
   * @param {*} payload
   */
  emit(
    event,
    payload = {}
  ) {
    if (
      this.destroyed
    ) {
      return;
    }

    /**
     * Middleware
     */
    const context = {
      event,
      payload,
      timestamp:
        Date.now(),
      stopped: false,
    };

    for (const middleware of this.middlewares) {
      try {
        middleware(context);

        if (
          context.stopped
        ) {
          return;
        }
      } catch (error) {
        console.error(
          "[EventBus.middleware]",
          error
        );
      }
    }

    /**
     * Histórico
     */
    this._pushHistory(
      context
    );

    /**
     * Debug
     */
    if (this.debug) {
      console.log(
        `[EventBus] ${event}`,
        payload
      );
    }

    /**
     * Evento específico
     */
    this._dispatch(
      event,
      payload
    );

    /**
     * Wildcard
     */
    this._dispatch(
      "*",
      {
        event,
        payload,
      }
    );

    /**
     * Namespace
     */
    this._dispatchNamespace(
      event,
      payload
    );
  }

  /**
   * Dispara listeners.
   * @private
   * @param {string} event
   * @param {*} payload
   */
  _dispatch(
    event,
    payload
  ) {
    const listeners =
      this.events.get(
        event
      );

    if (!listeners) {
      return;
    }

    for (const callback of listeners) {
      try {
        callback(payload);
      } catch (error) {
        console.error(
          `[EventBus:${event}]`,
          error
        );
      }
    }
  }

  /**
   * Dispara namespaces.
   * @private
   * @param {string} event
   * @param {*} payload
   */
  _dispatchNamespace(
    event,
    payload
  ) {
    const parts =
      event.split(":");

    if (
      parts.length <= 1
    ) {
      return;
    }

    let namespace = "";

    for (
      let i = 0;
      i < parts.length - 1;
      i++
    ) {
      namespace +=
        (i > 0 ? ":" : "") +
        parts[i];

      this._dispatch(
        `${namespace}:*`,
        payload
      );
    }
  }

  /**
   * Adiciona middleware.
   * @param {Function} callback
   */
  use(callback) {
    if (
      typeof callback !==
      "function"
    ) {
      return;
    }

    this.middlewares.add(
      callback
    );
  }

  /**
   * Remove middleware.
   * @param {Function} callback
   */
  removeMiddleware(
    callback
  ) {
    this.middlewares.delete(
      callback
    );
  }

  /**
   * Para propagação.
   * @param {Object} context
   */
  stop(context) {
    if (context) {
      context.stopped = true;
    }
  }

  /**
   * Adiciona histórico.
   * @private
   * @param {Object} entry
   */
  _pushHistory(entry) {
    this.history.push(entry);

    /**
     * Limite
     */
    if (
      this.history.length >
      this.maxHistory
    ) {
      this.history.shift();
    }
  }

  /**
   * Retorna histórico.
   * @returns {Array<Object>}
   */
  getHistory() {
    return [
      ...this.history,
    ];
  }

  /**
   * Limpa histórico.
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Retorna listeners.
   * @param {string} event
   * @returns {Array<Function>}
   */
  listeners(event) {
    const listeners =
      this.events.get(
        event
      );

    if (!listeners) {
      return [];
    }

    return Array.from(
      listeners
    );
  }

  /**
   * Conta listeners.
   * @param {string} event
   * @returns {number}
   */
  listenerCount(event) {
    const listeners =
      this.events.get(
        event
      );

    return listeners
      ? listeners.size
      : 0;
  }

  /**
   * Verifica listeners.
   * @param {string} event
   * @returns {boolean}
   */
  has(event) {
    return this.events.has(
      event
    );
  }

  /**
   * Remove todos listeners.
   * @param {string|null} event
   */
  removeAll(
    event = null
  ) {
    if (event) {
      this.events.delete(
        event
      );

      return;
    }

    this.events.clear();
  }

  /**
   * Aguarda evento.
   * @param {string} event
   * @returns {Promise}
   */
  waitFor(event) {
    return new Promise(
      resolve => {
        this.once(
          event,
          resolve
        );
      }
    );
  }

  /**
   * Pipe eventos.
   * @param {EventBus} target
   * @param {Array<string>} events
   */
  pipe(
    target,
    events = []
  ) {
    if (
      !target ||
      typeof target.emit !==
        "function"
    ) {
      return;
    }

    for (const event of events) {
      this.on(
        event,
        payload => {
          target.emit(
            event,
            payload
          );
        }
      );
    }
  }

  /**
   * Retorna eventos registrados.
   * @returns {Array<string>}
   */
  eventNames() {
    return Array.from(
      this.events.keys()
    );
  }

  /**
   * Ativa debug.
   * @param {boolean} value
   */
  setDebug(value) {
    this.debug =
      Boolean(value);
  }

  /**
   * Destrói barramento.
   */
  destroy() {
    this.destroyed = true;

    this.events.clear();

    this.middlewares.clear();

    this.history = [];
  }
}
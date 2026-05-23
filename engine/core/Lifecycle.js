/**
 * engine/core/Lifecycle.js
 *8
 * Sistema de ciclo de vida da IDE/editor.
 *
 * Responsabilidades:
 * - controlar boot
 * - controlar init
 * - controlar mount/unmount
 * - controlar destroy
 * - registrar hooks
 * - controlar estados internos
 * - sincronizar módulos
 *
 * Usado por:
 * - Editor
 * - Plugins
 * - Services
 * - Renderer
 * - DOMManager
 */

export default class Lifecycle {
  /**
   * @param {Object} options
   */
  constructor(options = {}) {
    /**
     * Nome sistema
     */
    this.name =
      options.name ||
      "EditorLifecycle";

    /**
     * Estado atual
     */
    this.phase = "created";

    /**
     * Estados válidos
     */
    this.phases = [
      "created",
      "booting",
      "booted",
      "initializing",
      "initialized",
      "mounting",
      "mounted",
      "ready",
      "updating",
      "destroying",
      "destroyed",
      "error",
    ];

    /**
     * Hooks
     * @type {Map<string, Set<Function>>}
     */
    this.hooks =
      new Map();

    /**
     * Eventos
     */
    this.listeners =
      new Map();

    /**
     * Histórico
     */
    this.history = [];

    /**
     * Estado
     */
    this.startedAt =
      Date.now();

    this.updatedAt =
      Date.now();

    /**
     * Flags
     */
    this.ready = false;
    this.destroyed = false;
    this.booted = false;
    this.mounted = false;

    /**
     * Contexto compartilhado
     */
    this.context =
      options.context || {};
  }

  /**
   * Inicializa boot.
   */
  async boot() {
    if (
      this.booted
    ) {
      return;
    }

    try {
      this._setPhase(
        "booting"
      );

      await this.runHooks(
        "beforeBoot"
      );

      await this.runHooks(
        "boot"
      );

      this.booted = true;

      this._setPhase(
        "booted"
      );

      await this.runHooks(
        "afterBoot"
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Inicializa sistema.
   */
  async init() {
    try {
      this._setPhase(
        "initializing"
      );

      await this.runHooks(
        "beforeInit"
      );

      await this.runHooks(
        "init"
      );

      this._setPhase(
        "initialized"
      );

      await this.runHooks(
        "afterInit"
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Mount sistema.
   * @param {HTMLElement|null} target
   */
  async mount(target = null) {
    try {
      this._setPhase(
        "mounting"
      );

      await this.runHooks(
        "beforeMount",
        target
      );

      await this.runHooks(
        "mount",
        target
      );

      this.mounted = true;

      this._setPhase(
        "mounted"
      );

      await this.runHooks(
        "afterMount",
        target
      );

      this.ready = true;

      this._setPhase(
        "ready"
      );

      this.emit("ready");
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Atualiza sistema.
   * @param {*} payload
   */
  async update(payload = {}) {
    try {
      this._setPhase(
        "updating"
      );

      await this.runHooks(
        "beforeUpdate",
        payload
      );

      await this.runHooks(
        "update",
        payload
      );

      await this.runHooks(
        "afterUpdate",
        payload
      );

      this._setPhase(
        "ready"
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Destroy sistema.
   */
  async destroy() {
    if (
      this.destroyed
    ) {
      return;
    }

    try {
      this._setPhase(
        "destroying"
      );

      await this.runHooks(
        "beforeDestroy"
      );

      await this.runHooks(
        "destroy"
      );

      this.destroyed = true;
      this.ready = false;
      this.mounted = false;

      await this.runHooks(
        "afterDestroy"
      );

      this._setPhase(
        "destroyed"
      );

      this.emit(
        "destroyed"
      );

      this.clear();
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Registra hook.
   * @param {string} name
   * @param {Function} callback
   */
  hook(name, callback) {
    if (
      typeof callback !==
      "function"
    ) {
      return;
    }

    if (
      !this.hooks.has(name)
    ) {
      this.hooks.set(
        name,
        new Set()
      );
    }

    this.hooks
      .get(name)
      .add(callback);
  }

  /**
   * Remove hook.
   * @param {string} name
   * @param {Function} callback
   */
  unhook(
    name,
    callback
  ) {
    const hooks =
      this.hooks.get(name);

    if (!hooks) {
      return;
    }

    hooks.delete(callback);
  }

  /**
   * Executa hooks.
   * @param {string} name
   * @param {*} payload
   */
  async runHooks(
    name,
    payload = null
  ) {
    const hooks =
      this.hooks.get(name);

    if (!hooks) {
      return;
    }

    for (const callback of hooks) {
      try {
        await callback(
          payload,
          this.context
        );
      } catch (error) {
        console.error(
          `[Lifecycle:${name}]`,
          error
        );
      }
    }
  }

  /**
   * Define fase.
   * @private
   * @param {string} phase
   */
  _setPhase(phase) {
    if (
      !this.phases.includes(
        phase
      )
    ) {
      return;
    }

    const previous =
      this.phase;

    this.phase = phase;

    this.updatedAt =
      Date.now();

    this.history.push({
      phase,
      previous,
      timestamp:
        this.updatedAt,
    });

    this.emit("phase", {
      current: phase,
      previous,
    });

    this.emit(
      `phase:${phase}`,
      {
        previous,
      }
    );
  }

  /**
   * Trata erro.
   * @param {Error} error
   */
  handleError(error) {
    this._setPhase(
      "error"
    );

    console.error(
      `[Lifecycle:${this.name}]`,
      error
    );

    this.emit("error", {
      error,
    });
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
    const listeners =
      this.listeners.get(
        event
      );

    if (!listeners) {
      return;
    }

    listeners.delete(
      callback
    );
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
    const listeners =
      this.listeners.get(
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
          `[Lifecycle.emit:${event}]`,
          error
        );
      }
    }
  }

  /**
   * Verifica fase.
   * @param {string} phase
   * @returns {boolean}
   */
  is(phase) {
    return (
      this.phase === phase
    );
  }

  /**
   * Verifica pronto.
   * @returns {boolean}
   */
  isReady() {
    return (
      this.ready &&
      !this.destroyed
    );
  }

  /**
   * Retorna fase atual.
   * @returns {string}
   */
  getPhase() {
    return this.phase;
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
   * Retorna tempo ativo.
   * @returns {number}
   */
  uptime() {
    return (
      Date.now() -
      this.startedAt
    );
  }

  /**
   * Define contexto.
   * @param {string} key
   * @param {*} value
   */
  setContext(key, value) {
    this.context[key] =
      value;
  }

  /**
   * Retorna contexto.
   * @param {string} key
   * @returns {*}
   */
  getContext(key) {
    return this.context[key];
  }

  /**
   * Remove contexto.
   * @param {string} key
   */
  removeContext(key) {
    delete this.context[key];
  }

  /**
   * Limpa sistema.
   * @private
   */
  clear() {
    this.hooks.clear();

    this.listeners.clear();

    this.context = {};
  }
}
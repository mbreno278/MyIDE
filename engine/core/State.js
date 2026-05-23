/**
 * engine/core/State.js
 *9
 * Estado central da IDE/editor.
 *
 * Responsabilidades:
 * - armazenar estado global
 * - sincronizar módulos
 * - controlar reatividade
 * - emitir eventos
 * - controlar sessão
 * - controlar editor ativo
 * - armazenar configurações
 *
 * Usado por:
 * - Editor
 * - Renderer
 * - HistoryManager
 * - Commands
 * - Input
 * - View
 */

export default class State {
  /**
   * @param {Object} initialState
   */
  constructor(initialState = {}) {
    /**
     * Estado interno
     */
    this.state = {
      /**
       * Documento
       */
      document: null,

      /**
       * Cursor
       */
      cursor: {
        line: 0,
        column: 0,
      },

      /**
       * Seleção
       */
      selection: null,

      /**
       * Scroll
       */
      scroll: {
        top: 0,
        left: 0,
      },

      /**
       * Linguagem
       */
      language: "plain",

      /**
       * Tema
       */
      theme: "dark",

      /**
       * Readonly
       */
      readOnly: false,

      /**
       * Focus
       */
      focused: false,

      /**
       * Modificado
       */
      dirty: false,

      /**
       * Configurações
       */
      settings: {
        tabSize: 4,
        insertSpaces: true,
        lineHeight: 20,
        fontSize: 14,
        fontFamily:
          "monospace",
        wordWrap: false,
        minimap: true,
        lineNumbers: true,
        autoSave: false,
      },

      /**
       * Sessão
       */
      session: {
        startedAt:
          Date.now(),

        updatedAt:
          Date.now(),
      },

      /**
       * Editor
       */
      editor: {
        width: 0,
        height: 0,
      },

      /**
       * Histórico
       */
      history: {
        undoCount: 0,
        redoCount: 0,
      },

      /**
       * Plugins
       */
      plugins: {},

      /**
       * Custom
       */
      custom: {},

      ...initialState,
    };

    /**
     * Eventos
     * @type {Map<string, Set<Function>>}
     */
    this.listeners =
      new Map();

    /**
     * Watchers
     */
    this.watchers =
      new Map();

    /**
     * Histórico interno
     */
    this.changes = [];

    /**
     * Freeze state
     */
    this.frozen = false;
  }

  /**
   * Retorna estado completo.
   * @returns {Object}
   */
  getState() {
    return structuredClone(
      this.state
    );
  }

  /**
   * Retorna valor.
   * @param {string} path
   * @param {*} defaultValue
   * @returns {*}
   */
  get(
    path,
    defaultValue = null
  ) {
    if (!path) {
      return this.getState();
    }

    const keys =
      path.split(".");

    let current =
      this.state;

    for (const key of keys) {
      if (
        current == null ||
        !(key in current)
      ) {
        return defaultValue;
      }

      current =
        current[key];
    }

    return current;
  }

  /**
   * Define valor.
   * @param {string} path
   * @param {*} value
   */
  set(path, value) {
    if (
      this.frozen
    ) {
      return;
    }

    if (!path) {
      return;
    }

    const keys =
      path.split(".");

    const last =
      keys.pop();

    let current =
      this.state;

    for (const key of keys) {
      if (
        typeof current[
          key
        ] !== "object"
      ) {
        current[key] = {};
      }

      current =
        current[key];
    }

    const oldValue =
      current[last];

    current[last] = value;

    /**
     * Atualiza sessão
     */
    this.state.session.updatedAt =
      Date.now();

    /**
     * Histórico
     */
    this.changes.push({
      path,
      oldValue,
      newValue: value,
      timestamp:
        Date.now(),
    });

    /**
     * Eventos
     */
    this.emit("change", {
      path,
      value,
      oldValue,
    });

    this.emit(
      `change:${path}`,
      {
        value,
        oldValue,
      }
    );

    /**
     * Watchers
     */
    this._notifyWatchers(
      path,
      value,
      oldValue
    );
  }

  /**
   * Atualiza estado parcial.
   * @param {Object} values
   */
  update(values = {}) {
    if (
      typeof values !==
      "object"
    ) {
      return;
    }

    for (const key in values) {
      this.set(
        key,
        values[key]
      );
    }
  }

  /**
   * Merge profundo.
   * @param {Object} values
   */
  merge(values = {}) {
    this.state =
      this._deepMerge(
        this.state,
        values
      );

    this.emit("merge", {
      values,
    });
  }

  /**
   * Merge profundo.
   * @private
   * @param {Object} target
   * @param {Object} source
   * @returns {Object}
   */
  _deepMerge(
    target,
    source
  ) {
    const output = {
      ...target,
    };

    for (const key in source) {
      if (
        this._isObject(
          source[key]
        ) &&
        this._isObject(
          target[key]
        )
      ) {
        output[key] =
          this._deepMerge(
            target[key],
            source[key]
          );
      } else {
        output[key] =
          source[key];
      }
    }

    return output;
  }

  /**
   * Verifica objeto.
   * @private
   * @param {*} value
   * @returns {boolean}
   */
  _isObject(value) {
    return (
      value &&
      typeof value ===
        "object" &&
      !Array.isArray(value)
    );
  }

  /**
   * Remove valor.
   * @param {string} path
   */
  remove(path) {
    if (!path) {
      return;
    }

    const keys =
      path.split(".");

    const last =
      keys.pop();

    let current =
      this.state;

    for (const key of keys) {
      if (
        !(key in current)
      ) {
        return;
      }

      current =
        current[key];
    }

    delete current[last];

    this.emit("remove", {
      path,
    });
  }

  /**
   * Verifica existência.
   * @param {string} path
   * @returns {boolean}
   */
  has(path) {
    return (
      this.get(path) !== null
    );
  }

  /**
   * Reseta estado.
   */
  reset() {
    this.state = {};

    this.changes = [];

    this.emit("reset");
  }

  /**
   * Congela estado.
   */
  freeze() {
    this.frozen = true;

    this.emit("freeze");
  }

  /**
   * Descongela estado.
   */
  unfreeze() {
    this.frozen = false;

    this.emit("unfreeze");
  }

  /**
   * Alterna freeze.
   */
  toggleFreeze() {
    this.frozen =
      !this.frozen;
  }

  /**
   * Observa path.
   * @param {string} path
   * @param {Function} callback
   */
  watch(path, callback) {
    if (
      typeof callback !==
      "function"
    ) {
      return;
    }

    if (
      !this.watchers.has(path)
    ) {
      this.watchers.set(
        path,
        new Set()
      );
    }

    this.watchers
      .get(path)
      .add(callback);
  }

  /**
   * Remove watcher.
   * @param {string} path
   * @param {Function} callback
   */
  unwatch(
    path,
    callback
  ) {
    const watchers =
      this.watchers.get(
        path
      );

    if (!watchers) {
      return;
    }

    watchers.delete(
      callback
    );
  }

  /**
   * Notifica watchers.
   * @private
   * @param {string} path
   * @param {*} value
   * @param {*} oldValue
   */
  _notifyWatchers(
    path,
    value,
    oldValue
  ) {
    const watchers =
      this.watchers.get(
        path
      );

    if (!watchers) {
      return;
    }

    for (const callback of watchers) {
      try {
        callback(
          value,
          oldValue
        );
      } catch (error) {
        console.error(
          "[State.watch]",
          error
        );
      }
    }
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
   * @param {Object} payload
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
          "[State.emit]",
          error
        );
      }
    }
  }

  /**
   * Retorna histórico.
   * @returns {Array<Object>}
   */
  getChanges() {
    return [
      ...this.changes,
    ];
  }

  /**
   * Limpa histórico.
   */
  clearChanges() {
    this.changes = [];
  }

  /**
   * Serializa estado.
   * @returns {string}
   */
  serialize() {
    return JSON.stringify(
      this.state,
      null,
      2
    );
  }

  /**
   * Carrega estado.
   * @param {string|Object} data
   */
  hydrate(data) {
    try {
      if (
        typeof data ===
        "string"
      ) {
        this.state =
          JSON.parse(data);
      } else {
        this.state = data;
      }

      this.emit(
        "hydrate",
        {
          state:
            this.getState(),
        }
      );
    } catch (error) {
      console.error(
        "[State.hydrate]",
        error
      );
    }
  }

  /**
   * Destrói state.
   */
  destroy() {
    this.listeners.clear();

    this.watchers.clear();

    this.cache = null;

    this.state = null;

    this.changes = [];
  }
}
/**
 * engine/core/Config.js
 *5
 * Sistema central de configuração da IDE/editor.
 *
 * Responsabilidades:
 * - armazenar configs globais
 * - gerenciar temas
 * - persistência local
 * - validação
 * - merge configs
 * - emitir eventos
 * - perfis/config presets
 *
 * Usado por:
 * - Editor
 * - Renderer
 * - Tokenizer
 * - View
 * - Input
 * - Plugins
 */

export default class Config {
  /**
   * @param {Object} initialConfig
   */
  constructor(initialConfig = {}) {
    /**
     * Configuração padrão
     */
    this.defaults = {
      editor: {
        tabSize: 4,
        insertSpaces: true,
        wordWrap: false,
        lineNumbers: true,
        minimap: true,
        autoCloseBrackets: true,
        autoIndent: true,
        fontSize: 14,
        lineHeight: 20,
        fontFamily:
          "monospace",
        readOnly: false,
        smoothScroll: true,
        cursorBlink: true,
      },

      theme: {
        name: "dark",
        background:
          "#1E1E1E",
        foreground:
          "#D4D4D4",
        caret: "#FFFFFF",
        selection:
          "#264F78",
        lineHighlight:
          "#2A2D2E",
        gutter:
          "#252526",
      },

      tokenizer: {
        language: "plain",
        cache: true,
      },

      history: {
        maxUndo: 500,
      },

      scroll: {
        virtual: true,
        buffer: 30,
      },

      files: {
        autoSave: false,
        autoSaveDelay: 1000,
      },

      performance: {
        useRAF: true,
        lazyRender: true,
      },
    };

    /**
     * Config atual
     */
    this.config =
      this._deepMerge(
        structuredClone(
          this.defaults
        ),
        initialConfig
      );

    /**
     * Eventos
     * @type {Map<string, Set<Function>>}
     */
    this.listeners =
      new Map();

    /**
     * Validators
     */
    this.validators =
      new Map();

    /**
     * Presets
     */
    this.presets =
      new Map();

    /**
     * Estado
     */
    this.loaded = false;

    /**
     * Inicializa presets
     */
    this._registerDefaultPresets();
  }

  /**
   * Registra presets padrão.
   * @private
   */
  _registerDefaultPresets() {
    /**
     * Dark
     */
    this.registerPreset(
      "dark",
      {
        theme: {
          name: "dark",
          background:
            "#1E1E1E",
          foreground:
            "#D4D4D4",
          caret:
            "#FFFFFF",
        },
      }
    );

    /**
     * Light
     */
    this.registerPreset(
      "light",
      {
        theme: {
          name: "light",
          background:
            "#FFFFFF",
          foreground:
            "#000000",
          caret:
            "#000000",
        },
      }
    );

    /**
     * Compact
     */
    this.registerPreset(
      "compact",
      {
        editor: {
          fontSize: 12,
          lineHeight: 16,
        },
      }
    );
  }

  /**
   * Retorna config.
   * @param {string|null} path
   * @param {*} defaultValue
   * @returns {*}
   */
  get(
    path = null,
    defaultValue = null
  ) {
    if (!path) {
      return structuredClone(
        this.config
      );
    }

    const keys =
      path.split(".");

    let current =
      this.config;

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
   * Define config.
   * @param {string} path
   * @param {*} value
   */
  set(path, value) {
    if (!path) {
      return;
    }

    /**
     * Validação
     */
    if (
      !this._validate(
        path,
        value
      )
    ) {
      return;
    }

    const keys =
      path.split(".");

    const last =
      keys.pop();

    let current =
      this.config;

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
  }

  /**
   * Merge configs.
   * @param {Object} values
   */
  merge(values = {}) {
    this.config =
      this._deepMerge(
        this.config,
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
   * Reseta configs.
   */
  reset() {
    this.config =
      structuredClone(
        this.defaults
      );

    this.emit("reset");
  }

  /**
   * Reseta path.
   * @param {string} path
   */
  resetPath(path) {
    const value =
      this.getDefault(path);

    if (
      value !== null
    ) {
      this.set(
        path,
        structuredClone(
          value
        )
      );
    }
  }

  /**
   * Retorna valor default.
   * @param {string} path
   * @returns {*}
   */
  getDefault(path) {
    const keys =
      path.split(".");

    let current =
      this.defaults;

    for (const key of keys) {
      if (
        current == null ||
        !(key in current)
      ) {
        return null;
      }

      current =
        current[key];
    }

    return current;
  }

  /**
   * Registra validator.
   * @param {string} path
   * @param {Function} validator
   */
  registerValidator(
    path,
    validator
  ) {
    if (
      typeof validator !==
      "function"
    ) {
      return;
    }

    this.validators.set(
      path,
      validator
    );
  }

  /**
   * Valida config.
   * @private
   * @param {string} path
   * @param {*} value
   * @returns {boolean}
   */
  _validate(
    path,
    value
  ) {
    const validator =
      this.validators.get(
        path
      );

    if (!validator) {
      return true;
    }

    try {
      return validator(
        value
      );
    } catch (error) {
      console.error(
        "[Config.validate]",
        error
      );

      return false;
    }
  }

  /**
   * Registra preset.
   * @param {string} name
   * @param {Object} values
   */
  registerPreset(
    name,
    values
  ) {
    this.presets.set(
      name,
      values
    );
  }

  /**
   * Aplica preset.
   * @param {string} name
   */
  applyPreset(name) {
    const preset =
      this.presets.get(
        name
      );

    if (!preset) {
      return;
    }

    this.merge(preset);

    this.emit("preset", {
      name,
    });
  }

  /**
   * Retorna presets.
   * @returns {Array<string>}
   */
  getPresets() {
    return Array.from(
      this.presets.keys()
    );
  }

  /**
   * Salva localStorage.
   * @param {string} key
   */
  save(
    key = "editor-config"
  ) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(
          this.config
        )
      );

      this.emit("save", {
        key,
      });
    } catch (error) {
      console.error(
        "[Config.save]",
        error
      );
    }
  }

  /**
   * Carrega localStorage.
   * @param {string} key
   */
  load(
    key = "editor-config"
  ) {
    try {
      const raw =
        localStorage.getItem(
          key
        );

      if (!raw) {
        return;
      }

      const parsed =
        JSON.parse(raw);

      this.merge(parsed);

      this.loaded = true;

      this.emit("load", {
        key,
      });
    } catch (error) {
      console.error(
        "[Config.load]",
        error
      );
    }
  }

  /**
   * Remove storage.
   * @param {string} key
   */
  removeStorage(
    key = "editor-config"
  ) {
    localStorage.removeItem(
      key
    );
  }

  /**
   * Exporta config.
   * @returns {string}
   */
  export() {
    return JSON.stringify(
      this.config,
      null,
      2
    );
  }

  /**
   * Importa config.
   * @param {string|Object} data
   */
  import(data) {
    try {
      if (
        typeof data ===
        "string"
      ) {
        this.config =
          JSON.parse(data);
      } else {
        this.config = data;
      }

      this.emit("import");
    } catch (error) {
      console.error(
        "[Config.import]",
        error
      );
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
          `[Config:${event}]`,
          error
        );
      }
    }
  }

  /**
   * Retorna JSON.
   * @returns {Object}
   */
  toJSON() {
    return structuredClone(
      this.config
    );
  }

  /**
   * Destrói config.
   */
  destroy() {
    this.listeners.clear();

    this.validators.clear();

    this.presets.clear();

    this.config = null;
  }
}
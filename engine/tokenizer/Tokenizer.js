/**
 * engine/tokenizer/Tokenizer.js
 *22
 * Gerenciador central de tokenização.
 *
 * Responsabilidades:
 * - registrar tokenizers
 * - selecionar linguagem
 * - tokenizar código
 * - trocar tokenizer ativo
 * - detectar linguagem
 * - fornecer API unificada
 *
 * Usado por:
 * - Renderer
 * - Editor
 * - SyntaxHighlight
 */

import HTMLTokenizer from "./HTML.js";
import JavaScriptTokenizer from "./JavaScript.js";

export default class Tokenizer {
  /**
   * @param {Object} options
   */
  constructor(options = {}) {
    /**
     * Linguagem atual
     */
    this.language =
      options.language ||
      "plain";

    /**
     * Tokenizers registrados
     * @type {Map<string, Object>}
     */
    this.tokenizers =
      new Map();

    /**
     * Cache
     */
    this.cache =
      new Map();

    /**
     * Tokenizer atual
     */
    this.current = null;

    /**
     * Inicialização
     */
    this._registerDefaults();

    this.setLanguage(
      this.language
    );
  }

  /**
   * Registra tokenizers padrão.
   * @private
   */
  _registerDefaults() {
    /**
     * Plain text
     */
    this.register(
      "plain",
      {
        tokenize(text = "") {
          return [
            {
              type: "plain",
              value: text,
            },
          ];
        },

        getLanguage() {
          return "plain";
        },
      }
    );

    /**
     * HTML
     */
    this.register(
      "html",
      new HTMLTokenizer()
    );

    /**
     * JavaScript
     */
    this.register(
      "javascript",
      new JavaScriptTokenizer()
    );

    /**
     * Alias
     */
    this.registerAlias(
      "js",
      "javascript"
    );

    this.registerAlias(
      "htm",
      "html"
    );
  }

  /**
   * Registra tokenizer.
   * @param {string} language
   * @param {Object} tokenizer
   */
  register(
    language,
    tokenizer
  ) {
    if (
      !language ||
      !tokenizer
    ) {
      return;
    }

    this.tokenizers.set(
      language.toLowerCase(),
      tokenizer
    );
  }

  /**
   * Registra alias.
   * @param {string} alias
   * @param {string} target
   */
  registerAlias(
    alias,
    target
  ) {
    const tokenizer =
      this.tokenizers.get(
        target.toLowerCase()
      );

    if (!tokenizer) {
      return;
    }

    this.tokenizers.set(
      alias.toLowerCase(),
      tokenizer
    );
  }

  /**
   * Remove tokenizer.
   * @param {string} language
   */
  unregister(language) {
    this.tokenizers.delete(
      language.toLowerCase()
    );
  }

  /**
   * Define linguagem ativa.
   * @param {string} language
   */
  setLanguage(language) {
    const lang =
      (
        language || "plain"
      ).toLowerCase();

    this.language = lang;

    this.current =
      this.tokenizers.get(
        lang
      ) ||
      this.tokenizers.get(
        "plain"
      );

    this.clearCache();
  }

  /**
   * Retorna linguagem atual.
   * @returns {string}
   */
  getLanguage() {
    return this.language;
  }

  /**
   * Retorna tokenizer atual.
   * @returns {Object|null}
   */
  getCurrentTokenizer() {
    return this.current;
  }

  /**
   * Retorna tokenizer.
   * @param {string} language
   * @returns {Object|null}
   */
  getTokenizer(language) {
    return (
      this.tokenizers.get(
        language.toLowerCase()
      ) || null
    );
  }

  /**
   * Verifica tokenizer.
   * @param {string} language
   * @returns {boolean}
   */
  has(language) {
    return this.tokenizers.has(
      language.toLowerCase()
    );
  }

  /**
   * Tokeniza texto.
   * @param {string} text
   * @param {Object} [options={}]
   * @returns {Array<Object>}
   */
  tokenize(
    text = "",
    options = {}
  ) {
    if (!this.current) {
      return [
        {
          type: "plain",
          value: text,
        },
      ];
    }

    /**
     * Cache key
     */
    const cacheKey =
      `${this.language}:${text}`;

    /**
     * Cache
     */
    if (
      options.cache !==
        false &&
      this.cache.has(
        cacheKey
      )
    ) {
      return this.cache.get(
        cacheKey
      );
    }

    let tokens = [];

    try {
      tokens =
        this.current.tokenize(
          text
        );
    } catch (error) {
      console.error(
        "[Tokenizer.tokenize]",
        error
      );

      tokens = [
        {
          type: "plain",
          value: text,
        },
      ];
    }

    /**
     * Segurança
     */
    if (
      !Array.isArray(tokens)
    ) {
      tokens = [
        {
          type: "plain",
          value: text,
        },
      ];
    }

    /**
     * Cache
     */
    if (
      options.cache !==
      false
    ) {
      this.cache.set(
        cacheKey,
        tokens
      );
    }

    return tokens;
  }

  /**
   * Tokeniza múltiplas linhas.
   * @param {Array<string>} lines
   * @returns {Array<Array<Object>>}
   */
  tokenizeLines(lines = []) {
    if (
      !Array.isArray(lines)
    ) {
      return [];
    }

    return lines.map(line =>
      this.tokenize(line)
    );
  }

  /**
   * Detecta linguagem.
   * @param {string} text
   * @returns {string}
   */
  detectLanguage(
    text = ""
  ) {
    /**
     * HTML
     */
    const html =
      this.tokenizers.get(
        "html"
      );

    if (
      html &&
      typeof html.isHTML ===
        "function" &&
      html.isHTML(text)
    ) {
      return "html";
    }

    /**
     * JavaScript
     */
    const js =
      this.tokenizers.get(
        "javascript"
      );

    if (
      js &&
      typeof js.isJavaScript ===
        "function" &&
      js.isJavaScript(text)
    ) {
      return "javascript";
    }

    return "plain";
  }

  /**
   * Detecta e troca linguagem.
   * @param {string} text
   * @returns {string}
   */
  autoDetect(text = "") {
    const language =
      this.detectLanguage(
        text
      );

    this.setLanguage(
      language
    );

    return language;
  }

  /**
   * Retorna tema padrão.
   * @returns {Object}
   */
  getTheme() {
    if (
      this.current &&
      typeof this.current
        .constructor
        .defaultTheme ===
        "function"
    ) {
      return this.current.constructor.defaultTheme();
    }

    return {
      plain: {
        color: "#D4D4D4",
      },
    };
  }

  /**
   * Limpa cache.
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Reseta tokenizer atual.
   */
  reset() {
    this.clearCache();

    if (
      this.current &&
      typeof this.current
        .reset ===
        "function"
    ) {
      this.current.reset();
    }
  }

  /**
   * Retorna linguagens registradas.
   * @returns {Array<string>}
   */
  getLanguages() {
    return Array.from(
      this.tokenizers.keys()
    );
  }

  /**
   * Retorna total tokenizers.
   * @returns {number}
   */
  size() {
    return this.tokenizers.size;
  }

  /**
   * Destrói tokenizer manager.
   */
  destroy() {
    this.clearCache();

    this.tokenizers.clear();

    this.current = null;
  }
}
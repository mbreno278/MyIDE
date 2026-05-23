/**
 * engine/tokenizer/HTML.js
 *21
 * Tokenizador de HTML para syntax highlight.
 *
 * Responsabilidades:
 * - identificar tags HTML
 * - detectar atributos
 * - detectar strings
 * - detectar comentários
 * - detectar entities
 * - gerar tokens para renderer
 *
 * Usado por:
 * - Renderer
 * - SyntaxHighlight
 * - Editor
 */

export default class HTMLTokenizer {
  /**
   * @param {Object} options
   */
  constructor(options = {}) {
    /**
     * Configurações
     */
    this.options = {
      highlightEntities: true,
      highlightComments: true,
      ...options,
    };

    /**
     * Regex principais
     */
    this.patterns = {
      comment:
        /<!--[\s\S]*?-->/g,

      tag:
        /<\/?[a-zA-Z][a-zA-Z0-9-]*/g,

      attribute:
        /\s([:@a-zA-Z0-9-]+)(?==)/g,

      string:
        /"[^"]*"|'[^']*'/g,

      entity:
        /&[a-zA-Z0-9#]+;/g,

      doctype:
        /<!DOCTYPE[^>]*>/gi,
    };
  }

  /**
   * Tokeniza linha HTML.
   * @param {string} text
   * @returns {Array<Object>}
   */
  tokenize(text = "") {
    if (
      typeof text !== "string"
    ) {
      return [];
    }

    /**
     * Linha vazia
     */
    if (text.length === 0) {
      return [
        {
          type: "plain",
          value: "",
        },
      ];
    }

    const tokens = [];

    let cursor = 0;

    /**
     * Matches encontrados
     */
    const matches = [];

    /**
     * Comentários
     */
    if (
      this.options
        .highlightComments
    ) {
      matches.push(
        ...this._collectMatches(
          text,
          this.patterns.comment,
          "comment"
        )
      );
    }

    /**
     * DOCTYPE
     */
    matches.push(
      ...this._collectMatches(
        text,
        this.patterns.doctype,
        "doctype"
      )
    );

    /**
     * Tags
     */
    matches.push(
      ...this._collectMatches(
        text,
        this.patterns.tag,
        "tag"
      )
    );

    /**
     * Atributos
     */
    matches.push(
      ...this._collectMatches(
        text,
        this.patterns.attribute,
        "attribute",
        match =>
          match.trim()
      )
    );

    /**
     * Strings
     */
    matches.push(
      ...this._collectMatches(
        text,
        this.patterns.string,
        "string"
      )
    );

    /**
     * Entities
     */
    if (
      this.options
        .highlightEntities
    ) {
      matches.push(
        ...this._collectMatches(
          text,
          this.patterns.entity,
          "entity"
        )
      );
    }

    /**
     * Ordena matches
     */
    matches.sort(
      (a, b) =>
        a.start - b.start
    );

    /**
     * Gera tokens
     */
    for (const match of matches) {
      /**
       * Texto puro antes
       */
      if (
        match.start > cursor
      ) {
        tokens.push({
          type: "plain",
          value: text.slice(
            cursor,
            match.start
          ),
        });
      }

      /**
       * Token atual
       */
      tokens.push({
        type: match.type,
        value: match.value,
      });

      cursor = match.end;
    }

    /**
     * Restante
     */
    if (
      cursor < text.length
    ) {
      tokens.push({
        type: "plain",
        value: text.slice(
          cursor
        ),
      });
    }

    /**
     * Fallback
     */
    if (tokens.length === 0) {
      tokens.push({
        type: "plain",
        value: text,
      });
    }

    return this._normalizeTokens(
      tokens
    );
  }

  /**
   * Coleta matches.
   * @private
   * @param {string} text
   * @param {RegExp} regex
   * @param {string} type
   * @param {Function|null} transform
   * @returns {Array<Object>}
   */
  _collectMatches(
    text,
    regex,
    type,
    transform = null
  ) {
    const matches = [];

    /**
     * Reset regex
     */
    regex.lastIndex = 0;

    let result;

    while (
      (result =
        regex.exec(text)) !==
      null
    ) {
      const raw =
        result[0];

      const value =
        typeof transform ===
        "function"
          ? transform(raw)
          : raw;

      matches.push({
        type,
        value,
        start: result.index,
        end:
          result.index +
          raw.length,
      });
    }

    return matches;
  }

  /**
   * Normaliza tokens.
   * @private
   * @param {Array<Object>} tokens
   * @returns {Array<Object>}
   */
  _normalizeTokens(tokens) {
    const normalized = [];

    for (const token of tokens) {
      /**
       * Ignora vazios
       */
      if (
        token.value === ""
      ) {
        continue;
      }

      /**
       * Junta plain consecutivos
       */
      const last =
        normalized[
          normalized.length - 1
        ];

      if (
        last &&
        last.type ===
          "plain" &&
        token.type ===
          "plain"
      ) {
        last.value +=
          token.value;

        continue;
      }

      normalized.push(token);
    }

    return normalized;
  }

  /**
   * Verifica se é HTML.
   * @param {string} text
   * @returns {boolean}
   */
  isHTML(text = "") {
    return /<\/?[a-z][\s\S]*>/i.test(
      text
    );
  }

  /**
   * Retorna tipo linguagem.
   * @returns {string}
   */
  getLanguage() {
    return "html";
  }

  /**
   * Define opção.
   * @param {string} key
   * @param {*} value
   */
  setOption(key, value) {
    this.options[key] =
      value;
  }

  /**
   * Retorna opções.
   * @returns {Object}
   */
  getOptions() {
    return {
      ...this.options,
    };
  }

  /**
   * Limpa caches.
   */
  reset() {
    /**
     * Placeholder
     * para futuras otimizações
     */
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
   * Retorna temas padrão.
   * @returns {Object}
   */
  static defaultTheme() {
    return {
      tag: {
        color: "#569CD6",
      },

      attribute: {
        color: "#9CDCFE",
      },

      string: {
        color: "#CE9178",
      },

      comment: {
        color: "#6A9955",
        fontStyle: "italic",
      },

      entity: {
        color: "#D7BA7D",
      },

      doctype: {
        color: "#C586C0",
      },

      plain: {
        color: "#D4D4D4",
      },
    };
  }
}
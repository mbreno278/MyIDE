/**
 * engine/tokenizer/JavaScript.js
 *21
 * Tokenizador JavaScript para syntax highlight.
 *
 * Responsabilidades:
 * - identificar keywords
 * - identificar strings
 * - identificar comentários
 * - identificar números
 * - identificar funções
 * - identificar operadores
 * - identificar classes
 *
 * Usado por:
 * - Renderer
 * - SyntaxHighlight
 * - Editor
 */

export default class JavaScriptTokenizer {
  /**
   * @param {Object} options
   */
  constructor(options = {}) {
    /**
     * Configurações
     */
    this.options = {
      highlightComments: true,
      highlightNumbers: true,
      highlightRegex: true,
      ...options,
    };

    /**
     * Keywords JS
     */
    this.keywords =
      new Set([
        "break",
        "case",
        "catch",
        "class",
        "const",
        "continue",
        "debugger",
        "default",
        "delete",
        "do",
        "else",
        "export",
        "extends",
        "finally",
        "for",
        "function",
        "if",
        "import",
        "in",
        "instanceof",
        "let",
        "new",
        "return",
        "super",
        "switch",
        "this",
        "throw",
        "try",
        "typeof",
        "var",
        "void",
        "while",
        "with",
        "yield",
        "async",
        "await",
        "static",
        "of",
      ]);

    /**
     * Builtins
     */
    this.builtins =
      new Set([
        "Array",
        "Object",
        "String",
        "Number",
        "Boolean",
        "Math",
        "Date",
        "JSON",
        "Promise",
        "Map",
        "Set",
        "WeakMap",
        "WeakSet",
        "Symbol",
        "console",
        "window",
        "document",
      ]);

    /**
     * Regex
     */
    this.patterns = {
      comment:
        /\/\/.*|\/\*[\s\S]*?\*\//g,

      string:
        /(["'`])(?:\\.|(?!\1)[^\\])*\1/g,

      number:
        /\b\d+(\.\d+)?\b/g,

      keyword:
        /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g,

      operator:
        /[+\-*/%=!<>|&^~?:]+/g,

      function:
        /\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\()/g,

      className:
        /\b[A-Z][a-zA-Z0-9_]*\b/g,

      regex:
        /\/(?!\/)(\\.|[^\/\n])+\/[gimsuy]*/g,
    };
  }

  /**
   * Tokeniza código JS.
   * @param {string} text
   * @returns {Array<Object>}
   */
  tokenize(text = "") {
    if (
      typeof text !== "string"
    ) {
      return [];
    }

    if (text.length === 0) {
      return [
        {
          type: "plain",
          value: "",
        },
      ];
    }

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
     * Regex literal
     */
    if (
      this.options
        .highlightRegex
    ) {
      matches.push(
        ...this._collectMatches(
          text,
          this.patterns.regex,
          "regex"
        )
      );
    }

    /**
     * Numbers
     */
    if (
      this.options
        .highlightNumbers
    ) {
      matches.push(
        ...this._collectMatches(
          text,
          this.patterns.number,
          "number"
        )
      );
    }

    /**
     * Operators
     */
    matches.push(
      ...this._collectMatches(
        text,
        this.patterns.operator,
        "operator"
      )
    );

    /**
     * Functions
     */
    matches.push(
      ...this._collectMatches(
        text,
        this.patterns.function,
        "function"
      )
    );

    /**
     * Classes
     */
    matches.push(
      ...this._collectMatches(
        text,
        this.patterns.className,
        "class"
      )
    );

    /**
     * Keywords / builtins
     */
    this.patterns.keyword.lastIndex =
      0;

    let result;

    while (
      (result =
        this.patterns.keyword.exec(
          text
        )) !== null
    ) {
      const word =
        result[0];

      let type = null;

      if (
        this.keywords.has(word)
      ) {
        type = "keyword";
      } else if (
        this.builtins.has(word)
      ) {
        type = "builtin";
      }

      if (type) {
        matches.push({
          type,
          value: word,
          start:
            result.index,
          end:
            result.index +
            word.length,
        });
      }
    }

    /**
     * Ordenação
     */
    matches.sort(
      (a, b) =>
        a.start - b.start
    );

    /**
     * Resolve overlaps
     */
    const filtered =
      this._filterOverlaps(
        matches
      );

    /**
     * Gera tokens
     */
    return this._buildTokens(
      text,
      filtered
    );
  }

  /**
   * Coleta matches.
   * @private
   * @param {string} text
   * @param {RegExp} regex
   * @param {string} type
   * @returns {Array<Object>}
   */
  _collectMatches(
    text,
    regex,
    type
  ) {
    const matches = [];

    regex.lastIndex = 0;

    let result;

    while (
      (result =
        regex.exec(text)) !==
      null
    ) {
      matches.push({
        type,
        value: result[0],
        start: result.index,
        end:
          result.index +
          result[0].length,
      });
    }

    return matches;
  }

  /**
   * Remove overlaps.
   * @private
   * @param {Array<Object>} matches
   * @returns {Array<Object>}
   */
  _filterOverlaps(matches) {
    const filtered = [];

    let lastEnd = -1;

    for (const match of matches) {
      if (
        match.start >=
        lastEnd
      ) {
        filtered.push(match);

        lastEnd = match.end;
      }
    }

    return filtered;
  }

  /**
   * Constrói tokens finais.
   * @private
   * @param {string} text
   * @param {Array<Object>} matches
   * @returns {Array<Object>}
   */
  _buildTokens(
    text,
    matches
  ) {
    const tokens = [];

    let cursor = 0;

    for (const match of matches) {
      /**
       * Texto puro
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
       * Token
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
   * Normaliza tokens.
   * @private
   * @param {Array<Object>} tokens
   * @returns {Array<Object>}
   */
  _normalizeTokens(tokens) {
    const normalized = [];

    for (const token of tokens) {
      if (
        token.value === ""
      ) {
        continue;
      }

      const last =
        normalized[
          normalized.length - 1
        ];

      /**
       * Merge plain
       */
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
   * Detecta JavaScript.
   * @param {string} text
   * @returns {boolean}
   */
  isJavaScript(
    text = ""
  ) {
    return /\b(function|const|let|var|class|import|export)\b/.test(
      text
    );
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
   * Retorna linguagem.
   * @returns {string}
   */
  getLanguage() {
    return "javascript";
  }

  /**
   * Limpa cache.
   */
  reset() {
    /**
     * Placeholder
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
   * Tema padrão.
   * @returns {Object}
   */
  static defaultTheme() {
    return {
      keyword: {
        color: "#C586C0",
      },

      string: {
        color: "#CE9178",
      },

      number: {
        color: "#B5CEA8",
      },

      comment: {
        color: "#6A9955",
        fontStyle: "italic",
      },

      operator: {
        color: "#D4D4D4",
      },

      function: {
        color: "#DCDCAA",
      },

      class: {
        color: "#4EC9B0",
      },

      builtin: {
        color: "#569CD6",
      },

      regex: {
        color: "#D16969",
      },

      plain: {
        color: "#D4D4D4",
      },
    };
  }
}
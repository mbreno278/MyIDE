/**
 * engine/view/Renderer.js
 *28
 * Renderizador principal da IDE/editor.
 *
 * Responsabilidades:
 * - renderizar linhas
 * - renderizar tokens
 * - renderizar syntax highlight
 * - virtualização
 * - atualização incremental
 * - cálculo visual
 * - renderização eficiente
 *
 * Usado por:
 * - EditorView
 * - Cursor
 * - Selection
 * - DOMManager
 */

import * as DOM from "../utils/DOM.js";
import * as StringUtils from "../utils/String.js";

export default class Renderer {
  /**
   * @param {Object} options
   * @param {Object} options.document
   * @param {Object} options.dom
   * @param {Object} [options.theme]
   * @param {Object} [options.tokenizer]
   */
  constructor(options = {}) {
    /**
     * Documento
     */
    this.document =
      options.document;

    /**
     * DOM Manager
     */
    this.dom =
      options.dom;

    /**
     * Tokenizer
     */
    this.tokenizer =
      options.tokenizer || null;

    /**
     * Tema
     */
    this.theme =
      options.theme || {};

    /**
     * Configuração visual
     */
    this.lineHeight = 20;
    this.charWidth = 8;
    this.tabSize = 4;

    /**
     * Virtualização
     */
    this.virtualScroll =
      true;

    this.bufferLines = 30;

    /**
     * Cache
     */
    this.lineCache =
      new Map();

    this.tokenCache =
      new Map();

    /**
     * Estado render
     */
    this.renderedLines =
      new Set();

    /**
     * Viewport
     */
    this.viewportStart = 0;
    this.viewportEnd = 0;

    /**
     * Inicialização
     */
    this._bindEvents();
  }

  /**
   * Registra eventos.
   * @private
   */
  _bindEvents() {
    if (
      this.document &&
      typeof this.document.on ===
        "function"
    ) {
      this.document.on(
        "change",
        event => {
          this.handleChange(
            event
          );
        }
      );
    }

    if (
      this.dom &&
      typeof this.dom.on ===
        "function"
    ) {
      this.dom.on(
        "scroll",
        () => {
          this.renderVisibleLines();
        }
      );

      this.dom.on(
        "resize",
        () => {
          this.render();
        }
      );
    }
  }

  /**
   * Render completo.
   */
  render() {
    if (
      !this.document ||
      !this.dom
    ) {
      return;
    }

    this.clear();

    this.renderVisibleLines();

    this.renderGutter();
  }

  /**
   * Limpa render.
   */
  clear() {
    this.dom.clearContent();

    this.dom.clearGutter();

    this.renderedLines.clear();
  }

  /**
   * Renderiza linhas visíveis.
   */
  renderVisibleLines() {
    const range =
      this.getVisibleRange();

    this.viewportStart =
      range.start;

    this.viewportEnd =
      range.end;

    const fragment =
      DOM.fragment();

    for (
      let lineIndex =
        range.start;
      lineIndex <= range.end;
      lineIndex++
    ) {
      const line =
        this.document.getLine(
          lineIndex
        );

      if (!line) {
        continue;
      }

      const lineNode =
        this.renderLine(
          line,
          lineIndex
        );

      fragment.appendChild(
        lineNode
      );

      this.renderedLines.add(
        lineIndex
      );
    }

    this.dom.clearContent();

    this.dom.appendContent(
      fragment
    );
  }

  /**
   * Renderiza linha.
   * @param {Object} line
   * @param {number} index
   * @returns {HTMLElement}
   */
  renderLine(line, index) {
    /**
     * Cache
     */
    if (
      this.lineCache.has(index)
    ) {
      return this.lineCache
        .get(index)
        .cloneNode(true);
    }

    const node =
      DOM.createElement("div", {
        className:
          "editor-line",
      });

    DOM.css(node, {
      position: "relative",
      minHeight:
        `${this.lineHeight}px`,
      lineHeight:
        `${this.lineHeight}px`,
      whiteSpace: "pre",
    });

    node.dataset.line =
      index;

    /**
     * Conteúdo
     */
    const content =
      line.text || "";

    /**
     * Syntax highlight
     */
    if (
      this.tokenizer
    ) {
      this.renderTokens(
        node,
        content,
        index
      );
    } else {
      node.textContent =
        this.expandTabs(
          content
        );
    }

    /**
     * Cache
     */
    this.lineCache.set(
      index,
      node.cloneNode(true)
    );

    return node;
  }

  /**
   * Renderiza tokens.
   * @param {HTMLElement} node
   * @param {string} text
   * @param {number} lineIndex
   */
  renderTokens(
    node,
    text,
    lineIndex
  ) {
    let tokens = [];

    /**
     * Cache tokens
     */
    if (
      this.tokenCache.has(
        lineIndex
      )
    ) {
      tokens =
        this.tokenCache.get(
          lineIndex
        );
    } else {
      tokens =
        this.tokenizer.tokenize(
          text
        ) || [];

      this.tokenCache.set(
        lineIndex,
        tokens
      );
    }

    /**
     * Sem tokens
     */
    if (
      !Array.isArray(tokens) ||
      tokens.length === 0
    ) {
      node.textContent =
        this.expandTabs(text);

      return;
    }

    /**
     * Render tokenizado
     */
    for (const token of tokens) {
      const span =
        DOM.createElement("span", {
          className:
            `token ${token.type}`,
          text:
            this.expandTabs(
              token.value
            ),
        });

      /**
       * Tema
       */
      if (
        this.theme[
          token.type
        ]
      ) {
        DOM.css(
          span,
          this.theme[
            token.type
          ]
        );
      }

      node.appendChild(span);
    }
  }

  /**
   * Renderiza gutter.
   */
  renderGutter() {
    const total =
      this.document.lineCount();

    const fragment =
      DOM.fragment();

    for (
      let i =
        this.viewportStart;
      i <= this.viewportEnd;
      i++
    ) {
      const line =
        DOM.createElement("div", {
          className:
            "editor-gutter-line",

          text:
            String(i + 1),
        });

      DOM.css(line, {
        height:
          `${this.lineHeight}px`,
        lineHeight:
          `${this.lineHeight}px`,
        textAlign: "right",
        paddingRight: "10px",
        userSelect: "none",
      });

      fragment.appendChild(
        line
      );
    }

    this.dom.clearGutter();

    this.dom.gutter.appendChild(
      fragment
    );

    /**
     * Largura gutter
     */
    const digits =
      String(total).length;

    DOM.css(this.dom.gutter, {
      width:
        `${digits * 10 + 20}px`,
    });
  }

  /**
   * Atualiza linha específica.
   * @param {number} index
   */
  updateLine(index) {
    this.invalidateLine(index);

    this.render();
  }

  /**
   * Remove cache linha.
   * @param {number} index
   */
  invalidateLine(index) {
    this.lineCache.delete(
      index
    );

    this.tokenCache.delete(
      index
    );
  }

  /**
   * Limpa caches.
   */
  invalidateAll() {
    this.lineCache.clear();

    this.tokenCache.clear();
  }

  /**
   * Trata mudança documento.
   * @param {Object} event
   */
  handleChange(event = {}) {
    /**
     * Atualização incremental
     */
    if (
      typeof event.line ===
      "number"
    ) {
      this.updateLine(
        event.line
      );
    } else {
      this.invalidateAll();

      this.render();
    }
  }

  /**
   * Retorna range visível.
   * @returns {{start:number,end:number}}
   */
  getVisibleRange() {
    if (
      !this.virtualScroll
    ) {
      return {
        start: 0,
        end:
          this.document.lineCount() -
          1,
      };
    }

    const scroll =
      this.dom.getScroll();

    const size =
      this.dom.getSize();

    const start =
      Math.max(
        0,
        Math.floor(
          scroll.top /
            this.lineHeight
        ) - this.bufferLines
      );

    const visibleLines =
      Math.ceil(
        size.height /
          this.lineHeight
      );

    const end =
      Math.min(
        this.document.lineCount() -
          1,

        start +
          visibleLines +
          this.bufferLines * 2
      );

    return {
      start,
      end,
    };
  }

  /**
   * Expande tabs.
   * @param {string} text
   * @returns {string}
   */
  expandTabs(text) {
    return StringUtils.tabsToSpaces(
      text,
      this.tabSize
    );
  }

  /**
   * Calcula coordenadas cursor.
   * @param {Object} position
   * @returns {{x:number,y:number,height:number}}
   */
  getCursorCoordinates(
    position
  ) {
    return {
      x:
        position.column *
        this.charWidth,

      y:
        position.line *
        this.lineHeight,

      height:
        this.lineHeight,
    };
  }

  /**
   * Converte coordenadas em posição.
   * @param {number} x
   * @param {number} y
   * @returns {{line:number,column:number}}
   */
  coordinatesToPosition(
    x,
    y
  ) {
    return {
      line:
        Math.floor(
          y / this.lineHeight
        ),

      column:
        Math.floor(
          x / this.charWidth
        ),
    };
  }

  /**
   * Define tema.
   * @param {Object} theme
   */
  setTheme(theme = {}) {
    this.theme = theme;

    this.render();
  }

  /**
   * Define tokenizer.
   * @param {Object} tokenizer
   */
  setTokenizer(tokenizer) {
    this.tokenizer =
      tokenizer;

    this.invalidateAll();

    this.render();
  }

  /**
   * Define tamanho fonte.
   * @param {Object} options
   */
  setFont(options = {}) {
    if (
      options.lineHeight
    ) {
      this.lineHeight =
        options.lineHeight;
    }

    if (
      options.charWidth
    ) {
      this.charWidth =
        options.charWidth;
    }

    this.render();
  }

  /**
   * Destrói renderer.
   */
  destroy() {
    this.invalidateAll();

    this.renderedLines.clear();
  }
}
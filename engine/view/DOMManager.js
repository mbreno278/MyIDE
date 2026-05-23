/**
 * engine/view/DOMManager.js
 *27
 * Gerenciador principal do DOM da IDE/editor.
 *
 * Responsabilidades:
 * - criar estrutura visual
 * - controlar containers
 * - gerenciar camadas
 * - controlar scroll
 * - controlar resize
 * - atualizar dimensões
 * - fornecer API visual centralizada
 *
 * Usado por:
 * - Renderer
 * - Cursor
 * - Selection
 * - Minimap
 * - Gutter
 * - ScrollManager
 */

import * as DOM from "../utils/DOM.js";

export default class DOMManager {
  /**
   * @param {Object} options
   * @param {HTMLElement|string} options.container
   */
  constructor(options = {}) {
    /**
     * Container raiz
     * @type {HTMLElement}
     */
    this.container =
      this._resolveContainer(
        options.container
      );

    if (!this.container) {
      throw new Error(
        "DOMManager: container inválido."
      );
    }

    /**
     * Estrutura principal
     */
    this.root = null;
    this.viewport = null;
    this.content = null;
    this.overlay = null;
    this.gutter = null;
    this.scroller = null;

    /**
     * Camadas
     */
    this.layers = new Map();

    /**
     * Estado
     */
    this.width = 0;
    this.height = 0;

    this.scrollTop = 0;
    this.scrollLeft = 0;

    /**
     * Eventos
     */
    this.listeners =
      new Map();

    /**
     * Resize observer
     */
    this.resizeObserver =
      null;

    /**
     * Inicialização
     */
    this._createStructure();

    this._bindEvents();

    this.updateLayout();
  }

  /**
   * Resolve container.
   * @private
   * @param {HTMLElement|string} target
   * @returns {HTMLElement|null}
   */
  _resolveContainer(
    target
  ) {
    if (
      target instanceof HTMLElement
    ) {
      return target;
    }

    if (
      typeof target ===
      "string"
    ) {
      return DOM.query(target);
    }

    return null;
  }

  /**
   * Cria estrutura principal.
   * @private
   */
  _createStructure() {
    /**
     * Root
     */
    this.root =
      DOM.createElement("div", {
        className:
          "editor-root",
      });

    /**
     * Gutter
     */
    this.gutter =
      DOM.createElement("div", {
        className:
          "editor-gutter",
      });

    /**
     * Viewport
     */
    this.viewport =
      DOM.createElement("div", {
        className:
          "editor-viewport",
      });

    /**
     * Scroller
     */
    this.scroller =
      DOM.createElement("div", {
        className:
          "editor-scroller",
      });

    /**
     * Content
     */
    this.content =
      DOM.createElement("div", {
        className:
          "editor-content",
      });

    /**
     * Overlay
     */
    this.overlay =
      DOM.createElement("div", {
        className:
          "editor-overlay",
      });

    /**
     * Hierarquia
     */
    DOM.append(
      this.scroller,
      this.content
    );

    DOM.append(
      this.viewport,
      this.scroller
    );

    DOM.append(
      this.viewport,
      this.overlay
    );

    DOM.append(
      this.root,
      this.gutter
    );

    DOM.append(
      this.root,
      this.viewport
    );

    DOM.append(
      this.container,
      this.root
    );

    /**
     * Estilos básicos
     */
    this._applyBaseStyles();
  }

  /**
   * Aplica estilos base.
   * @private
   */
  _applyBaseStyles() {
    DOM.css(this.root, {
      position: "relative",
      display: "flex",
      width: "100%",
      height: "100%",
      overflow: "hidden",
    });

    DOM.css(this.gutter, {
      position: "relative",
      overflow: "hidden",
      userSelect: "none",
    });

    DOM.css(this.viewport, {
      position: "relative",
      flex: "1",
      overflow: "auto",
    });

    DOM.css(this.scroller, {
      position: "relative",
      minWidth: "100%",
      minHeight: "100%",
    });

    DOM.css(this.content, {
      position: "relative",
      whiteSpace: "pre",
      fontFamily:
        "monospace",
    });

    DOM.css(this.overlay, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
    });
  }

  /**
   * Registra eventos.
   * @private
   */
  _bindEvents() {
    DOM.on(
      this.viewport,
      "scroll",
      () => {
        this._handleScroll();
      }
    );

    /**
     * ResizeObserver
     */
    if (
      typeof ResizeObserver !==
      "undefined"
    ) {
      this.resizeObserver =
        new ResizeObserver(() => {
          this.updateLayout();
        });

      this.resizeObserver.observe(
        this.container
      );
    } else {
      DOM.on(
        window,
        "resize",
        () => {
          this.updateLayout();
        }
      );
    }
  }

  /**
   * Evento scroll.
   * @private
   */
  _handleScroll() {
    this.scrollTop =
      this.viewport.scrollTop;

    this.scrollLeft =
      this.viewport.scrollLeft;

    /**
     * Sincroniza gutter
     */
    this.gutter.scrollTop =
      this.scrollTop;

    this.emit("scroll", {
      top: this.scrollTop,
      left: this.scrollLeft,
    });
  }

  /**
   * Atualiza layout.
   */
  updateLayout() {
    const rect =
      this.container.getBoundingClientRect();

    this.width =
      rect.width;

    this.height =
      rect.height;

    this.emit("resize", {
      width: this.width,
      height: this.height,
    });
  }

  /**
   * Cria layer.
   * @param {string} name
   * @param {Object} [options={}]
   * @returns {HTMLElement}
   */
  createLayer(
    name,
    options = {}
  ) {
    if (
      this.layers.has(name)
    ) {
      return this.layers.get(name);
    }

    const layer =
      DOM.createElement("div", {
        className:
          `editor-layer ${name}`,
      });

    DOM.css(layer, {
      position: "absolute",
      inset: "0",
      pointerEvents:
        options.pointerEvents ||
        "none",

      zIndex:
        options.zIndex || 1,
    });

    DOM.append(
      this.overlay,
      layer
    );

    this.layers.set(
      name,
      layer
    );

    return layer;
  }

  /**
   * Remove layer.
   * @param {string} name
   */
  removeLayer(name) {
    const layer =
      this.layers.get(name);

    if (!layer) {
      return;
    }

    DOM.remove(layer);

    this.layers.delete(name);
  }

  /**
   * Retorna layer.
   * @param {string} name
   * @returns {HTMLElement|null}
   */
  getLayer(name) {
    return (
      this.layers.get(name) ||
      null
    );
  }

  /**
   * Define conteúdo.
   * @param {string} html
   */
  setContent(html) {
    this.content.innerHTML =
      html;
  }

  /**
   * Limpa conteúdo.
   */
  clearContent() {
    DOM.empty(this.content);
  }

  /**
   * Adiciona node no content.
   * @param {HTMLElement} node
   */
  appendContent(node) {
    DOM.append(
      this.content,
      node
    );
  }

  /**
   * Define gutter.
   * @param {string} html
   */
  setGutter(html) {
    this.gutter.innerHTML =
      html;
  }

  /**
   * Limpa gutter.
   */
  clearGutter() {
    DOM.empty(this.gutter);
  }

  /**
   * Scroll absoluto.
   * @param {number} x
   * @param {number} y
   */
  scrollTo(x, y) {
    this.viewport.scrollTo(
      x,
      y
    );
  }

  /**
   * Scroll vertical.
   * @param {number} y
   */
  scrollTopTo(y) {
    this.viewport.scrollTop =
      y;
  }

  /**
   * Scroll horizontal.
   * @param {number} x
   */
  scrollLeftTo(x) {
    this.viewport.scrollLeft =
      x;
  }

  /**
   * Retorna scroll.
   * @returns {{top:number,left:number}}
   */
  getScroll() {
    return {
      top: this.scrollTop,
      left: this.scrollLeft,
    };
  }

  /**
   * Retorna viewport rect.
   * @returns {DOMRect}
   */
  getViewportRect() {
    return this.viewport.getBoundingClientRect();
  }

  /**
   * Retorna tamanho.
   * @returns {{width:number,height:number}}
   */
  getSize() {
    return {
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Define tema.
   * @param {string} theme
   */
  setTheme(theme) {
    this.root.dataset.theme =
      theme;
  }

  /**
   * Define fonte.
   * @param {Object} options
   */
  setFont(options = {}) {
    DOM.css(this.content, {
      fontFamily:
        options.family,
      fontSize:
        options.size,
      lineHeight:
        options.lineHeight,
    });
  }

  /**
   * Focus editor.
   */
  focus() {
    DOM.focus(
      this.viewport
    );
  }

  /**
   * Blur editor.
   */
  blur() {
    DOM.blur(
      this.viewport
    );
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
    const set =
      this.listeners.get(event);

    if (!set) return;

    set.delete(callback);
  }

  /**
   * Emite evento.
   * @param {string} event
   * @param {Object} payload
   */
  emit(event, payload = {}) {
    const set =
      this.listeners.get(event);

    if (!set) return;

    for (const callback of set) {
      try {
        callback(payload);
      } catch (error) {
        console.error(
          "[DOMManager.emit]",
          error
        );
      }
    }
  }

  /**
   * Destrói manager.
   */
  destroy() {
    if (
      this.resizeObserver
    ) {
      this.resizeObserver.disconnect();
    }

    this.layers.clear();

    DOM.remove(this.root);

    this.listeners.clear();
  }
}
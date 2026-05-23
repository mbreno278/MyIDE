/**
 * engine/view/VirtualScroll.js
 *29
 * Sistema de virtualização do editor.
 *
 * Responsabilidades:
 * - renderizar apenas linhas visíveis
 * - calcular viewport
 * - otimizar performance
 * - reduzir uso de memória
 * - controlar buffer render
 * - sincronizar scroll
 *
 * Usado por:
 * - Renderer
 * - DOMManager
 * - EditorView
 */

export default class VirtualScroll {
  /**
   * @param {Object} options
   * @param {Object} options.document
   * @param {Object} options.renderer
   * @param {Object} options.dom
   */
  constructor(options = {}) {
    /**
     * Documento
     */
    this.document =
      options.document;

    /**
     * Renderer
     */
    this.renderer =
      options.renderer;

    /**
     * DOM manager
     */
    this.dom =
      options.dom;

    /**
     * Configurações
     */
    this.lineHeight =
      options.lineHeight || 20;

    this.buffer =
      options.buffer || 30;

    /**
     * Estado viewport
     */
    this.startLine = 0;
    this.endLine = 0;

    /**
     * Total linhas
     */
    this.totalLines = 0;

    /**
     * Total altura
     */
    this.totalHeight = 0;

    /**
     * Estado render
     */
    this.visibleLines =
      new Set();

    /**
     * RAF throttle
     */
    this.frame = null;

    /**
     * Scroll anterior
     */
    this.lastScrollTop = 0;

    /**
     * Inicialização
     */
    this._bindEvents();

    this.update();
  }

  /**
   * Registra eventos.
   * @private
   */
  _bindEvents() {
    if (
      this.dom &&
      typeof this.dom.on ===
        "function"
    ) {
      this.dom.on(
        "scroll",
        event => {
          this.handleScroll(
            event
          );
        }
      );

      this.dom.on(
        "resize",
        () => {
          this.update();
        }
      );
    }

    if (
      this.document &&
      typeof this.document.on ===
        "function"
    ) {
      this.document.on(
        "change",
        () => {
          this.update();
        }
      );
    }
  }

  /**
   * Atualiza virtualização.
   */
  update() {
    this.totalLines =
      this.document.lineCount();

    this.totalHeight =
      this.totalLines *
      this.lineHeight;

    this.calculateViewport();

    this.render();
  }

  /**
   * Trata scroll.
   * @param {Object} event
   */
  handleScroll(event = {}) {
    const scrollTop =
      event.top || 0;

    /**
     * Evita renders excessivos
     */
    if (
      Math.abs(
        scrollTop -
          this.lastScrollTop
      ) < this.lineHeight
    ) {
      return;
    }

    this.lastScrollTop =
      scrollTop;

    /**
     * RAF throttle
     */
    if (this.frame) {
      cancelAnimationFrame(
        this.frame
      );
    }

    this.frame =
      requestAnimationFrame(() => {
        this.calculateViewport();

        this.render();
      });
  }

  /**
   * Calcula viewport.
   */
  calculateViewport() {
    const scroll =
      this.dom.getScroll();

    const size =
      this.dom.getSize();

    const visibleCount =
      Math.ceil(
        size.height /
          this.lineHeight
      );

    const start =
      Math.floor(
        scroll.top /
          this.lineHeight
      ) - this.buffer;

    const end =
      start +
      visibleCount +
      this.buffer * 2;

    this.startLine =
      Math.max(0, start);

    this.endLine =
      Math.min(
        this.totalLines - 1,
        end
      );
  }

  /**
   * Renderiza viewport.
   */
  render() {
    if (
      !this.renderer
    ) {
      return;
    }

    this.renderer.viewportStart =
      this.startLine;

    this.renderer.viewportEnd =
      this.endLine;

    this.renderer.renderVisibleLines();

    this.updateContentHeight();
  }

  /**
   * Atualiza altura virtual.
   */
  updateContentHeight() {
    if (
      !this.dom ||
      !this.dom.scroller
    ) {
      return;
    }

    this.dom.scroller.style.height =
      `${this.totalHeight}px`;
  }

  /**
   * Retorna linhas visíveis.
   * @returns {Array<number>}
   */
  getVisibleLines() {
    const lines = [];

    for (
      let i =
        this.startLine;
      i <= this.endLine;
      i++
    ) {
      lines.push(i);
    }

    return lines;
  }

  /**
   * Verifica linha visível.
   * @param {number} line
   * @returns {boolean}
   */
  isLineVisible(line) {
    return (
      line >=
        this.startLine &&
      line <= this.endLine
    );
  }

  /**
   * Scroll para linha.
   * @param {number} line
   * @param {boolean} [center=false]
   */
  scrollToLine(
    line,
    center = false
  ) {
    const size =
      this.dom.getSize();

    let top =
      line * this.lineHeight;

    if (center) {
      top -=
        size.height / 2;
    }

    top = Math.max(0, top);

    this.dom.scrollTopTo(top);
  }

  /**
   * Scroll para posição.
   * @param {Object} position
   * @param {boolean} [center=false]
   */
  scrollToPosition(
    position,
    center = false
  ) {
    if (!position) {
      return;
    }

    this.scrollToLine(
      position.line,
      center
    );
  }

  /**
   * Retorna primeira linha visível.
   * @returns {number}
   */
  getFirstVisibleLine() {
    return this.startLine;
  }

  /**
   * Retorna última linha visível.
   * @returns {number}
   */
  getLastVisibleLine() {
    return this.endLine;
  }

  /**
   * Retorna quantidade visível.
   * @returns {number}
   */
  getVisibleCount() {
    return (
      this.endLine -
      this.startLine +
      1
    );
  }

  /**
   * Define buffer.
   * @param {number} value
   */
  setBuffer(value) {
    this.buffer =
      Math.max(0, value);

    this.update();
  }

  /**
   * Define altura linha.
   * @param {number} value
   */
  setLineHeight(value) {
    this.lineHeight =
      Math.max(1, value);

    this.update();
  }

  /**
   * Atualiza linha específica.
   * @param {number} line
   */
  refreshLine(line) {
    if (
      !this.isLineVisible(
        line
      )
    ) {
      return;
    }

    this.renderer.updateLine(
      line
    );
  }

  /**
   * Atualiza range.
   * @param {number} start
   * @param {number} end
   */
  refreshRange(
    start,
    end
  ) {
    for (
      let i = start;
      i <= end;
      i++
    ) {
      this.refreshLine(i);
    }
  }

  /**
   * Força render.
   */
  forceRender() {
    this.calculateViewport();

    this.render();
  }

  /**
   * Limpa estado.
   */
  clear() {
    this.visibleLines.clear();

    this.startLine = 0;
    this.endLine = 0;
  }

  /**
   * Destrói sistema.
   */
  destroy() {
    if (this.frame) {
      cancelAnimationFrame(
        this.frame
      );
    }

    this.clear();
  }
}
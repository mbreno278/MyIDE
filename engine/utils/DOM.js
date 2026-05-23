/**
 * engine/utils/DOM.js
 *24
 * Utilitários para manipulação do DOM.
 *
 * Responsabilidades:
 * - criação de elementos
 * - manipulação de classes
 * - eventos
 * - atributos
 * - estilos
 * - medições
 * - helpers do editor
 *
 * Usado em:
 * - Renderer
 * - EditorView
 * - Cursor
 * - Selection
 * - Mouse
 * - UI Components
 */

/**
 * Cria elemento HTML.
 * @param {string} tag
 * @param {Object} [options={}]
 * @returns {HTMLElement}
 */
export function createElement(
  tag,
  options = {}
) {
  const element =
    document.createElement(tag);

  const {
    className,
    id,
    text,
    html,
    attrs,
    dataset,
    style,
    children,
  } = options;

  if (className) {
    element.className =
      className;
  }

  if (id) {
    element.id = id;
  }

  if (
    typeof text === "string"
  ) {
    element.textContent =
      text;
  }

  if (
    typeof html === "string"
  ) {
    element.innerHTML = html;
  }

  if (
    attrs &&
    typeof attrs === "object"
  ) {
    for (const key in attrs) {
      element.setAttribute(
        key,
        attrs[key]
      );
    }
  }

  if (
    dataset &&
    typeof dataset === "object"
  ) {
    for (const key in dataset) {
      element.dataset[key] =
        dataset[key];
    }
  }

  if (
    style &&
    typeof style === "object"
  ) {
    Object.assign(
      element.style,
      style
    );
  }

  if (
    Array.isArray(children)
  ) {
    children.forEach(child => {
      if (
        child instanceof Node
      ) {
        element.appendChild(
          child
        );
      }
    });
  }

  return element;
}

/**
 * Seleciona elemento.
 * @param {string} selector
 * @param {HTMLElement|Document} [root=document]
 * @returns {HTMLElement|null}
 */
export function query(
  selector,
  root = document
) {
  return root.querySelector(
    selector
  );
}

/**
 * Seleciona múltiplos elementos.
 * @param {string} selector
 * @param {HTMLElement|Document} [root=document]
 * @returns {Array<HTMLElement>}
 */
export function queryAll(
  selector,
  root = document
) {
  return Array.from(
    root.querySelectorAll(
      selector
    )
  );
}

/**
 * Adiciona classe.
 * @param {HTMLElement} element
 * @param {...string} classes
 */
export function addClass(
  element,
  ...classes
) {
  if (!element) return;

  element.classList.add(
    ...classes.filter(Boolean)
  );
}

/**
 * Remove classe.
 * @param {HTMLElement} element
 * @param {...string} classes
 */
export function removeClass(
  element,
  ...classes
) {
  if (!element) return;

  element.classList.remove(
    ...classes.filter(Boolean)
  );
}

/**
 * Alterna classe.
 * @param {HTMLElement} element
 * @param {string} className
 * @param {boolean} [force]
 */
export function toggleClass(
  element,
  className,
  force
) {
  if (!element) return;

  element.classList.toggle(
    className,
    force
  );
}

/**
 * Verifica classe.
 * @param {HTMLElement} element
 * @param {string} className
 * @returns {boolean}
 */
export function hasClass(
  element,
  className
) {
  if (!element) {
    return false;
  }

  return element.classList.contains(
    className
  );
}

/**
 * Define atributo.
 * @param {HTMLElement} element
 * @param {string} name
 * @param {*} value
 */
export function attr(
  element,
  name,
  value
) {
  if (!element) return;

  if (
    value === undefined
  ) {
    return element.getAttribute(
      name
    );
  }

  element.setAttribute(
    name,
    value
  );
}

/**
 * Remove atributo.
 * @param {HTMLElement} element
 * @param {string} name
 */
export function removeAttr(
  element,
  name
) {
  if (!element) return;

  element.removeAttribute(name);
}

/**
 * Define CSS.
 * @param {HTMLElement} element
 * @param {Object} styles
 */
export function css(
  element,
  styles = {}
) {
  if (!element) return;

  Object.assign(
    element.style,
    styles
  );
}

/**
 * Adiciona evento.
 * @param {EventTarget} target
 * @param {string} event
 * @param {Function} callback
 * @param {Object|boolean} [options]
 */
export function on(
  target,
  event,
  callback,
  options
) {
  if (!target) return;

  target.addEventListener(
    event,
    callback,
    options
  );
}

/**
 * Remove evento.
 * @param {EventTarget} target
 * @param {string} event
 * @param {Function} callback
 * @param {Object|boolean} [options]
 */
export function off(
  target,
  event,
  callback,
  options
) {
  if (!target) return;

  target.removeEventListener(
    event,
    callback,
    options
  );
}

/**
 * Evento único.
 * @param {EventTarget} target
 * @param {string} event
 * @param {Function} callback
 */
export function once(
  target,
  event,
  callback
) {
  if (!target) return;

  const handler = e => {
    callback(e);

    off(
      target,
      event,
      handler
    );
  };

  on(
    target,
    event,
    handler
  );
}

/**
 * Dispara evento.
 * @param {HTMLElement} element
 * @param {string} name
 * @param {Object} [detail={}]
 */
export function emit(
  element,
  name,
  detail = {}
) {
  if (!element) return;

  element.dispatchEvent(
    new CustomEvent(name, {
      detail,
    })
  );
}

/**
 * Remove elemento.
 * @param {HTMLElement} element
 */
export function remove(element) {
  if (
    element &&
    element.parentNode
  ) {
    element.parentNode.removeChild(
      element
    );
  }
}

/**
 * Limpa conteúdo.
 * @param {HTMLElement} element
 */
export function empty(element) {
  if (!element) return;

  element.innerHTML = "";
}

/**
 * Adiciona filho.
 * @param {HTMLElement} parent
 * @param {HTMLElement} child
 */
export function append(
  parent,
  child
) {
  if (
    parent &&
    child
  ) {
    parent.appendChild(child);
  }
}

/**
 * Prepend.
 * @param {HTMLElement} parent
 * @param {HTMLElement} child
 */
export function prepend(
  parent,
  child
) {
  if (
    parent &&
    child
  ) {
    parent.prepend(child);
  }
}

/**
 * Insere antes.
 * @param {HTMLElement} target
 * @param {HTMLElement} element
 */
export function before(
  target,
  element
) {
  if (
    target?.parentNode
  ) {
    target.parentNode.insertBefore(
      element,
      target
    );
  }
}

/**
 * Insere depois.
 * @param {HTMLElement} target
 * @param {HTMLElement} element
 */
export function after(
  target,
  element
) {
  if (
    target?.parentNode
  ) {
    target.parentNode.insertBefore(
      element,
      target.nextSibling
    );
  }
}

/**
 * Mostra elemento.
 * @param {HTMLElement} element
 * @param {string} [display="block"]
 */
export function show(
  element,
  display = "block"
) {
  if (!element) return;

  element.style.display =
    display;
}

/**
 * Oculta elemento.
 * @param {HTMLElement} element
 */
export function hide(element) {
  if (!element) return;

  element.style.display =
    "none";
}

/**
 * Alterna visibilidade.
 * @param {HTMLElement} element
 */
export function toggle(element) {
  if (!element) return;

  const hidden =
    getComputedStyle(element)
      .display === "none";

  show(
    element,
    hidden
      ? "block"
      : "none"
  );
}

/**
 * Retorna posição do elemento.
 * @param {HTMLElement} element
 * @returns {DOMRect|null}
 */
export function rect(element) {
  if (!element) {
    return null;
  }

  return element.getBoundingClientRect();
}

/**
 * Retorna scroll.
 * @param {HTMLElement|Window} target
 * @returns {{x:number,y:number}}
 */
export function scroll(target) {
  if (
    target === window
  ) {
    return {
      x: window.scrollX,
      y: window.scrollY,
    };
  }

  return {
    x: target.scrollLeft,
    y: target.scrollTop,
  };
}

/**
 * Faz scroll.
 * @param {HTMLElement|Window} target
 * @param {number} x
 * @param {number} y
 */
export function scrollTo(
  target,
  x = 0,
  y = 0
) {
  if (
    target === window
  ) {
    window.scrollTo(x, y);
    return;
  }

  target.scrollLeft = x;
  target.scrollTop = y;
}

/**
 * Foca elemento.
 * @param {HTMLElement} element
 */
export function focus(element) {
  if (
    element &&
    typeof element.focus ===
      "function"
  ) {
    element.focus();
  }
}

/**
 * Blur elemento.
 * @param {HTMLElement} element
 */
export function blur(element) {
  if (
    element &&
    typeof element.blur ===
      "function"
  ) {
    element.blur();
  }
}

/**
 * Verifica elemento visível.
 * @param {HTMLElement} element
 * @returns {boolean}
 */
export function isVisible(
  element
) {
  if (!element) {
    return false;
  }

  return !!(
    element.offsetWidth ||
    element.offsetHeight ||
    element.getClientRects()
      .length
  );
}

/**
 * Cria fragment.
 * @returns {DocumentFragment}
 */
export function fragment() {
  return document.createDocumentFragment();
}

/**
 * Cria text node.
 * @param {string} text
 * @returns {Text}
 */
export function textNode(text) {
  return document.createTextNode(
    text
  );
}

/**
 * Aguarda próximo frame.
 * @param {Function} callback
 */
export function raf(callback) {
  return requestAnimationFrame(
    callback
  );
}

/**
 * Cancela frame.
 * @param {number} id
 */
export function cancelRaf(id) {
  cancelAnimationFrame(id);
}

/**
 * Export default
 */
export default {
  createElement,
  query,
  queryAll,
  addClass,
  removeClass,
  toggleClass,
  hasClass,
  attr,
  removeAttr,
  css,
  on,
  off,
  once,
  emit,
  remove,
  empty,
  append,
  prepend,
  before,
  after,
  show,
  hide,
  toggle,
  rect,
  scroll,
  scrollTo,
  focus,
  blur,
  isVisible,
  fragment,
  textNode,
  raf,
  cancelRaf,
};
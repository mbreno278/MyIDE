/**
 * engine/utils/Array.js
 *23
 * Utilitários para manipulação de arrays.
 *
 * Responsabilidades:
 * - clonagem
 * - comparação
 * - chunk
 * - flatten
 * - unique
 * - remove
 * - range
 * - compact
 * - ordenação segura
 *
 * Usado em:
 * - History
 * - Commands
 * - Model
 * - Parser
 * - Render
 */

/**
 * Verifica se valor é array.
 * @param {*} value
 * @returns {boolean}
 */
export function isArray(value) {
  return Array.isArray(value);
}

/**
 * Clona array superficialmente.
 * @param {Array} array
 * @returns {Array}
 */
export function clone(array) {
  if (!Array.isArray(array)) {
    return [];
  }

  return [...array];
}

/**
 * Clona profundamente.
 * @param {*} value
 * @returns {*}
 */
export function deepClone(value) {
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const result = {};

    for (const key in value) {
      result[key] =
        deepClone(value[key]);
    }

    return result;
  }

  return value;
}

/**
 * Remove duplicados.
 * @param {Array} array
 * @returns {Array}
 */
export function unique(array) {
  if (!Array.isArray(array)) {
    return [];
  }

  return [...new Set(array)];
}

/**
 * Remove valores vazios.
 * @param {Array} array
 * @returns {Array}
 */
export function compact(array) {
  if (!Array.isArray(array)) {
    return [];
  }

  return array.filter(Boolean);
}

/**
 * Divide array em blocos.
 * @param {Array} array
 * @param {number} size
 * @returns {Array<Array>}
 */
export function chunk(
  array,
  size = 1
) {
  if (!Array.isArray(array)) {
    return [];
  }

  const safeSize =
    Math.max(
      1,
      Number(size) || 1
    );

  const result = [];

  for (
    let i = 0;
    i < array.length;
    i += safeSize
  ) {
    result.push(
      array.slice(
        i,
        i + safeSize
      )
    );
  }

  return result;
}

/**
 * Achata arrays.
 * @param {Array} array
 * @param {number} [depth=Infinity]
 * @returns {Array}
 */
export function flatten(
  array,
  depth = Infinity
) {
  if (!Array.isArray(array)) {
    return [];
  }

  return array.flat(depth);
}

/**
 * Remove item.
 * @param {Array} array
 * @param {*} item
 * @returns {Array}
 */
export function remove(
  array,
  item
) {
  if (!Array.isArray(array)) {
    return [];
  }

  return array.filter(
    value => value !== item
  );
}

/**
 * Remove item por índice.
 * @param {Array} array
 * @param {number} index
 * @returns {Array}
 */
export function removeAt(
  array,
  index
) {
  if (!Array.isArray(array)) {
    return [];
  }

  if (
    index < 0 ||
    index >= array.length
  ) {
    return clone(array);
  }

  return [
    ...array.slice(0, index),
    ...array.slice(index + 1),
  ];
}

/**
 * Move item.
 * @param {Array} array
 * @param {number} from
 * @param {number} to
 * @returns {Array}
 */
export function move(
  array,
  from,
  to
) {
  if (!Array.isArray(array)) {
    return [];
  }

  const cloned =
    clone(array);

  if (
    from < 0 ||
    from >= cloned.length
  ) {
    return cloned;
  }

  const item =
    cloned.splice(from, 1)[0];

  cloned.splice(to, 0, item);

  return cloned;
}

/**
 * Cria range numérico.
 * @param {number} start
 * @param {number} end
 * @param {number} [step=1]
 * @returns {Array<number>}
 */
export function range(
  start,
  end,
  step = 1
) {
  const result = [];

  const safeStep =
    step === 0 ? 1 : step;

  if (start <= end) {
    for (
      let i = start;
      i <= end;
      i += safeStep
    ) {
      result.push(i);
    }
  } else {
    for (
      let i = start;
      i >= end;
      i -= Math.abs(
        safeStep
      )
    ) {
      result.push(i);
    }
  }

  return result;
}

/**
 * Último item.
 * @param {Array} array
 * @returns {*}
 */
export function last(array) {
  if (
    !Array.isArray(array) ||
    array.length === 0
  ) {
    return undefined;
  }

  return array[array.length - 1];
}

/**
 * Primeiro item.
 * @param {Array} array
 * @returns {*}
 */
export function first(array) {
  if (
    !Array.isArray(array) ||
    array.length === 0
  ) {
    return undefined;
  }

  return array[0];
}

/**
 * Verifica igualdade superficial.
 * @param {Array} a
 * @param {Array} b
 * @returns {boolean}
 */
export function equals(a, b) {
  if (
    !Array.isArray(a) ||
    !Array.isArray(b)
  ) {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }

  for (
    let i = 0;
    i < a.length;
    i++
  ) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Soma valores.
 * @param {Array<number>} array
 * @returns {number}
 */
export function sum(array) {
  if (!Array.isArray(array)) {
    return 0;
  }

  return array.reduce(
    (total, value) =>
      total + Number(value || 0),
    0
  );
}

/**
 * Média.
 * @param {Array<number>} array
 * @returns {number}
 */
export function average(array) {
  if (
    !Array.isArray(array) ||
    array.length === 0
  ) {
    return 0;
  }

  return (
    sum(array) / array.length
  );
}

/**
 * Remove valores falsy.
 * @param {Array} array
 * @returns {Array}
 */
export function clean(array) {
  return compact(array);
}

/**
 * Ordenação segura.
 * @param {Array} array
 * @param {Function|null} compareFn
 * @returns {Array}
 */
export function sort(
  array,
  compareFn = null
) {
  if (!Array.isArray(array)) {
    return [];
  }

  const cloned =
    clone(array);

  return cloned.sort(compareFn);
}

/**
 * Inverte array.
 * @param {Array} array
 * @returns {Array}
 */
export function reverse(array) {
  if (!Array.isArray(array)) {
    return [];
  }

  return clone(array).reverse();
}

/**
 * Interseção.
 * @param {Array} a
 * @param {Array} b
 * @returns {Array}
 */
export function intersection(
  a,
  b
) {
  if (
    !Array.isArray(a) ||
    !Array.isArray(b)
  ) {
    return [];
  }

  return a.filter(value =>
    b.includes(value)
  );
}

/**
 * Diferença.
 * @param {Array} a
 * @param {Array} b
 * @returns {Array}
 */
export function difference(
  a,
  b
) {
  if (
    !Array.isArray(a) ||
    !Array.isArray(b)
  ) {
    return [];
  }

  return a.filter(
    value =>
      !b.includes(value)
  );
}

/**
 * União.
 * @param {Array} a
 * @param {Array} b
 * @returns {Array}
 */
export function union(a, b) {
  return unique([
    ...(a || []),
    ...(b || []),
  ]);
}

/**
 * Agrupa itens.
 * @param {Array} array
 * @param {Function} callback
 * @returns {Object}
 */
export function groupBy(
  array,
  callback
) {
  if (
    !Array.isArray(array) ||
    typeof callback !==
      "function"
  ) {
    return {};
  }

  return array.reduce(
    (groups, item) => {
      const key =
        callback(item);

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(item);

      return groups;
    },
    {}
  );
}

/**
 * Cria array preenchido.
 * @param {number} length
 * @param {*} value
 * @returns {Array}
 */
export function fill(
  length,
  value = null
) {
  return Array.from(
    {
      length: Math.max(
        0,
        length
      ),
    },
    () => value
  );
}

/**
 * Remove elementos repetidos consecutivos.
 * @param {Array} array
 * @returns {Array}
 */
export function dedupe(array) {
  if (!Array.isArray(array)) {
    return [];
  }

  return array.filter(
    (item, index) =>
      item !==
      array[index - 1]
  );
}

/**
 * Export default
 */
export default {
  isArray,
  clone,
  deepClone,
  unique,
  compact,
  chunk,
  flatten,
  remove,
  removeAt,
  move,
  range,
  last,
  first,
  equals,
  sum,
  average,
  clean,
  sort,
  reverse,
  intersection,
  difference,
  union,
  groupBy,
  fill,
  dedupe,
};
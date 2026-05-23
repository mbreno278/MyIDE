/**
 * engine/utils/String.js
 *25
 * Utilitários para manipulação de strings.
 *
 * Responsabilidades:
 * - formatação
 * - normalização
 * - indentação
 * - padding
 * - trim
 * - escape
 * - validações
 * - helpers do editor
 *
 * Usado em:
 * - Parser
 * - Tokenizer
 * - Commands
 * - Document
 * - Renderer
 */

/**
 * Verifica se valor é string.
 * @param {*} value
 * @returns {boolean}
 */
export function isString(value) {
  return (
    typeof value === "string"
  );
}

/**
 * Converte para string.
 * @param {*} value
 * @returns {string}
 */
export function toString(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}

/**
 * Remove espaços laterais.
 * @param {string} value
 * @returns {string}
 */
export function trim(value) {
  return toString(value).trim();
}

/**
 * Remove espaços da esquerda.
 * @param {string} value
 * @returns {string}
 */
export function trimLeft(value) {
  return toString(value)
    .replace(/^\s+/, "");
}

/**
 * Remove espaços da direita.
 * @param {string} value
 * @returns {string}
 */
export function trimRight(value) {
  return toString(value)
    .replace(/\s+$/, "");
}

/**
 * Capitaliza string.
 * @param {string} value
 * @returns {string}
 */
export function capitalize(value) {
  const str =
    toString(value);

  if (!str) {
    return "";
  }

  return (
    str.charAt(0)
      .toUpperCase() +
    str.slice(1)
  );
}

/**
 * Uppercase.
 * @param {string} value
 * @returns {string}
 */
export function upper(value) {
  return toString(value)
    .toUpperCase();
}

/**
 * Lowercase.
 * @param {string} value
 * @returns {string}
 */
export function lower(value) {
  return toString(value)
    .toLowerCase();
}

/**
 * Repete string.
 * @param {string} value
 * @param {number} count
 * @returns {string}
 */
export function repeat(
  value,
  count = 1
) {
  return toString(value)
    .repeat(
      Math.max(0, count)
    );
}

/**
 * Padding esquerda.
 * @param {string} value
 * @param {number} length
 * @param {string} [char=" "]
 * @returns {string}
 */
export function padLeft(
  value,
  length,
  char = " "
) {
  return toString(value)
    .padStart(length, char);
}

/**
 * Padding direita.
 * @param {string} value
 * @param {number} length
 * @param {string} [char=" "]
 * @returns {string}
 */
export function padRight(
  value,
  length,
  char = " "
) {
  return toString(value)
    .padEnd(length, char);
}

/**
 * Verifica string vazia.
 * @param {string} value
 * @returns {boolean}
 */
export function isEmpty(value) {
  return (
    trim(value).length === 0
  );
}

/**
 * Verifica whitespace.
 * @param {string} value
 * @returns {boolean}
 */
export function isWhitespace(
  value
) {
  return /^\s*$/.test(
    toString(value)
  );
}

/**
 * Conta ocorrências.
 * @param {string} value
 * @param {string} search
 * @returns {number}
 */
export function count(
  value,
  search
) {
  const str =
    toString(value);

  if (!search) {
    return 0;
  }

  return (
    str.split(search).length - 1
  );
}

/**
 * Trunca string.
 * @param {string} value
 * @param {number} max
 * @param {string} [suffix="..."]
 * @returns {string}
 */
export function truncate(
  value,
  max = 50,
  suffix = "..."
) {
  const str =
    toString(value);

  if (
    str.length <= max
  ) {
    return str;
  }

  return (
    str.slice(
      0,
      max - suffix.length
    ) + suffix
  );
}

/**
 * Escapa HTML.
 * @param {string} value
 * @returns {string}
 */
export function escapeHTML(
  value
) {
  return toString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Remove tags HTML.
 * @param {string} value
 * @returns {string}
 */
export function stripHTML(
  value
) {
  return toString(value)
    .replace(/<[^>]*>/g, "");
}

/**
 * Escapa regex.
 * @param {string} value
 * @returns {string}
 */
export function escapeRegex(
  value
) {
  return toString(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
}

/**
 * Converte tabs em espaços.
 * @param {string} value
 * @param {number} [size=4]
 * @returns {string}
 */
export function tabsToSpaces(
  value,
  size = 4
) {
  return toString(value)
    .replace(
      /\t/g,
      repeat(" ", size)
    );
}

/**
 * Converte espaços em tabs.
 * @param {string} value
 * @param {number} [size=4]
 * @returns {string}
 */
export function spacesToTabs(
  value,
  size = 4
) {
  return toString(value)
    .replace(
      new RegExp(
        ` {${size}}`,
        "g"
      ),
      "\t"
    );
}

/**
 * Normaliza EOL.
 * @param {string} value
 * @param {string} [eol="\n"]
 * @returns {string}
 */
export function normalizeEOL(
  value,
  eol = "\n"
) {
  return toString(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, eol);
}

/**
 * Divide linhas.
 * @param {string} value
 * @returns {Array<string>}
 */
export function lines(value) {
  return normalizeEOL(
    value
  ).split("\n");
}

/**
 * Conta linhas.
 * @param {string} value
 * @returns {number}
 */
export function lineCount(
  value
) {
  return lines(value).length;
}

/**
 * Indenta texto.
 * @param {string} value
 * @param {string} [indent="  "]
 * @returns {string}
 */
export function indent(
  value,
  indent = "  "
) {
  return lines(value)
    .map(
      line => indent + line
    )
    .join("\n");
}

/**
 * Remove indentação.
 * @param {string} value
 * @returns {string}
 */
export function outdent(value) {
  return lines(value)
    .map(line =>
      line.replace(
        /^\s{1,2}/,
        ""
      )
    )
    .join("\n");
}

/**
 * Inverte string.
 * @param {string} value
 * @returns {string}
 */
export function reverse(
  value
) {
  return toString(value)
    .split("")
    .reverse()
    .join("");
}

/**
 * Verifica prefixo.
 * @param {string} value
 * @param {string} search
 * @returns {boolean}
 */
export function startsWith(
  value,
  search
) {
  return toString(value)
    .startsWith(search);
}

/**
 * Verifica sufixo.
 * @param {string} value
 * @param {string} search
 * @returns {boolean}
 */
export function endsWith(
  value,
  search
) {
  return toString(value)
    .endsWith(search);
}

/**
 * Verifica conteúdo.
 * @param {string} value
 * @param {string} search
 * @returns {boolean}
 */
export function contains(
  value,
  search
) {
  return toString(value)
    .includes(search);
}

/**
 * Remove duplicados consecutivos.
 * @param {string} value
 * @param {string} char
 * @returns {string}
 */
export function dedupe(
  value,
  char = " "
) {
  const escaped =
    escapeRegex(char);

  return toString(value)
    .replace(
      new RegExp(
        `${escaped}+`,
        "g"
      ),
      char
    );
}

/**
 * Gera slug.
 * @param {string} value
 * @returns {string}
 */
export function slugify(
  value
) {
  return lower(value)
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(/^-+|-+$/g, "");
}

/**
 * Gera hash simples.
 * @param {string} value
 * @returns {number}
 */
export function hash(value) {
  const str =
    toString(value);

  let hash = 0;

  for (
    let i = 0;
    i < str.length;
    i++
  ) {
    hash =
      (hash << 5) -
      hash +
      str.charCodeAt(i);

    hash |= 0;
  }

  return hash;
}

/**
 * Export default
 */
export default {
  isString,
  toString,
  trim,
  trimLeft,
  trimRight,
  capitalize,
  upper,
  lower,
  repeat,
  padLeft,
  padRight,
  isEmpty,
  isWhitespace,
  count,
  truncate,
  escapeHTML,
  stripHTML,
  escapeRegex,
  tabsToSpaces,
  spacesToTabs,
  normalizeEOL,
  lines,
  lineCount,
  indent,
  outdent,
  reverse,
  startsWith,
  endsWith,
  contains,
  dedupe,
  slugify,
  hash,
};
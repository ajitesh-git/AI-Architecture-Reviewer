export function lineOf(text, index) {
  return text.slice(0, Math.max(0, index)).split(/\r?\n/).length;
}

export function stripBlockAndLineComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

export function splitSqlStatements(text) {
  return text
    .split(/^\s*GO\s*;?\s*$/gim)
    .flatMap((batch) => batch.split(/;(?=(?:[^']*'[^']*')*[^']*$)/g))
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export function matchAllWithLine(text, pattern, mapper) {
  const hits = [];
  for (const match of text.matchAll(pattern)) {
    hits.push(mapper(match, lineOf(text, match.index || 0)));
  }
  return hits;
}


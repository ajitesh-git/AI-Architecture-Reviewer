import { lineOf, matchAllWithLine, stripBlockAndLineComments } from './text.js';

const keywordCalls = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'await']);

export function parseJavaScriptAst(file, language) {
  const text = stripBlockAndLineComments(file.text);
  const imports = [
    ...matchAllWithLine(text, /\bimport\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g, (match, line) => ({
      type: 'ImportDeclaration',
      source: match[1],
      line
    })),
    ...matchAllWithLine(text, /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g, (match, line) => ({
      type: 'RequireCall',
      source: match[1],
      line
    }))
  ];

  const declarations = [
    ...matchAllWithLine(text, /\b(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/g, (match, line) => ({ type: 'ClassDeclaration', name: match[1], line })),
    ...matchAllWithLine(text, /\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g, (match, line) => ({ type: 'FunctionDeclaration', name: match[1], line })),
    ...matchAllWithLine(text, /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g, (match, line) => ({ type: 'ArrowFunctionDeclaration', name: match[1], line })),
    ...matchAllWithLine(text, /\binterface\s+([A-Za-z_$][\w$]*)/g, (match, line) => ({ type: 'InterfaceDeclaration', name: match[1], line })),
    ...matchAllWithLine(text, /\btype\s+([A-Za-z_$][\w$]*)\s*=/g, (match, line) => ({ type: 'TypeAliasDeclaration', name: match[1], line })),
    ...matchAllWithLine(text, /\benum\s+([A-Za-z_$][\w$]*)/g, (match, line) => ({ type: 'EnumDeclaration', name: match[1], line }))
  ];

  const calls = [];
  for (const match of text.matchAll(/\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*\(/g)) {
    const name = match[1];
    if (!keywordCalls.has(name) && !name.endsWith('.constructor')) {
      calls.push({ type: 'CallExpression', name, line: lineOf(text, match.index || 0) });
    }
  }

  return {
    file: file.name,
    language,
    parser: 'regex-estree-summary',
    parseStatus: 'parsed',
    summary: {
      nodeCount: imports.length + declarations.length + calls.length,
      imports: imports.length,
      declarations: declarations.length,
      calls: calls.length
    },
    nodes: [...imports, ...declarations, ...calls.slice(0, 120)],
    errors: []
  };
}


import { lineOf, matchAllWithLine, stripBlockAndLineComments } from './text.js';

const csharpKeywordCalls = new Set(['if', 'for', 'foreach', 'while', 'switch', 'catch', 'using', 'return', 'lock']);

export function parseCSharpAst(file) {
  const text = stripBlockAndLineComments(file.text);
  const usings = matchAllWithLine(text, /^\s*using\s+([A-Za-z0-9_.]+)\s*;/gm, (match, line) => ({
    type: 'UsingDirective',
    name: match[1],
    line
  }));

  const namespaces = matchAllWithLine(text, /\bnamespace\s+([A-Za-z0-9_.]+)/g, (match, line) => ({
    type: 'NamespaceDeclaration',
    name: match[1],
    line
  }));

  const declarations = [
    ...matchAllWithLine(text, /\b(?:public|private|protected|internal|sealed|abstract|static|partial|\s)*\b(class|interface|record|struct|enum)\s+([A-Za-z_][\w]*)/g, (match, line) => ({
      type: `${match[1][0].toUpperCase()}${match[1].slice(1)}Declaration`,
      name: match[2],
      line
    })),
    ...matchAllWithLine(text, /\b(?:public|private|protected|internal|static|async|virtual|override|sealed|partial|\s)+[A-Za-z0-9_<>,\[\]?]+\s+([A-Za-z_][\w]*)\s*\([^;{}]*\)\s*(?:where\s+[^{]+)?\{/g, (match, line) => ({
      type: 'MethodDeclaration',
      name: match[1],
      line
    }))
  ];

  const attributes = matchAllWithLine(text, /^\s*\[([A-Za-z_][\w]*(?:\([^)]*\))?)\]/gm, (match, line) => ({
    type: 'Attribute',
    name: match[1],
    line
  }));

  const calls = [];
  for (const match of text.matchAll(/\b([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)?)\s*\(/g)) {
    const name = match[1];
    if (!csharpKeywordCalls.has(name)) {
      calls.push({ type: 'InvocationExpression', name, line: lineOf(text, match.index || 0) });
    }
  }

  return {
    file: file.name,
    language: 'csharp',
    parser: 'regex-roslyn-summary',
    parseStatus: 'parsed',
    summary: {
      nodeCount: usings.length + namespaces.length + declarations.length + attributes.length + calls.length,
      usings: usings.length,
      namespaces: namespaces.length,
      declarations: declarations.length,
      attributes: attributes.length,
      calls: calls.length
    },
    nodes: [...usings, ...namespaces, ...attributes, ...declarations, ...calls.slice(0, 120)],
    errors: []
  };
}


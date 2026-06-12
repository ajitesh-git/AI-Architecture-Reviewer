import { detectLanguage } from './language.js';
import { parseCSharpAst } from './csharpAst.js';
import { parseJavaScriptAst } from './javascriptAst.js';
import { parseJsonAst } from './jsonAst.js';
import { parseSqlAst } from './sqlAst.js';

export { detectLanguage } from './language.js';
export { parseCSharpAst } from './csharpAst.js';
export { parseJavaScriptAst } from './javascriptAst.js';
export { parseJsonAst } from './jsonAst.js';
export { parseSqlAst } from './sqlAst.js';

export function parseSourceAst(file) {
  const language = detectLanguage(file.name);
  if (language === 'json') return parseJsonAst(file);
  if (language === 'javascript' || language === 'typescript') return parseJavaScriptAst(file, language);
  if (language === 'csharp') return parseCSharpAst(file);
  if (language === 'sql' || language === 'tsql' || language === 'procedure-sql') return parseSqlAst(file, language);
  return {
    file: file.name,
    language,
    parser: 'unsupported',
    parseStatus: 'skipped',
    summary: { nodeCount: 0 },
    nodes: [],
    errors: []
  };
}

export function parseSourceAsts(sourceFiles) {
  return sourceFiles.map((file) => parseSourceAst(file));
}


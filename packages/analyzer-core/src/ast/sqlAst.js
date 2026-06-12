import { splitSqlStatements } from './text.js';

const statementTypePattern = /^\s*(with|select|insert|update|delete|merge|create|alter|drop|truncate|exec|execute)\b/i;

function collectMatches(statement, pattern, type) {
  const nodes = [];
  for (const match of statement.matchAll(pattern)) {
    nodes.push({ type, name: match[1] || match[2] });
  }
  return nodes;
}

export function parseSqlAst(file, language = 'sql') {
  const statements = splitSqlStatements(file.text);
  const nodes = [];

  statements.forEach((statement, index) => {
    const type = statement.match(statementTypePattern)?.[1]?.toUpperCase() || 'UNKNOWN';
    nodes.push({
      type: 'SqlStatement',
      statementType: type,
      ordinal: index + 1,
      preview: statement.replace(/\s+/g, ' ').slice(0, 140)
    });
    nodes.push(...collectMatches(statement, /\b(?:from|join|update|into|merge\s+into)\s+([#[\]a-z0-9_."]+)/gi, 'TableReference'));
    nodes.push(...collectMatches(statement, /\bcreate\s+(?:or\s+alter\s+)?(?:procedure|proc)\s+([[\]a-z0-9_."]+)/gi, 'ProcedureDeclaration'));
    nodes.push(...collectMatches(statement, /\b(?:exec|execute)\s+([[\]a-z0-9_."]+)/gi, 'ProcedureCall'));
    nodes.push(...collectMatches(statement, /\bcreate\s+(?:or\s+alter\s+)?(?:function)\s+([[\]a-z0-9_."]+)/gi, 'FunctionDeclaration'));
  });

  const statementCounts = nodes
    .filter((node) => node.type === 'SqlStatement')
    .reduce((counts, node) => ({ ...counts, [node.statementType]: (counts[node.statementType] || 0) + 1 }), {});

  return {
    file: file.name,
    language,
    parser: 'sql-statement-summary',
    parseStatus: 'parsed',
    summary: {
      nodeCount: nodes.length,
      statements: statements.length,
      tableReferences: nodes.filter((node) => node.type === 'TableReference').length,
      procedures: nodes.filter((node) => node.type === 'ProcedureDeclaration').length,
      procedureCalls: nodes.filter((node) => node.type === 'ProcedureCall').length,
      statementCounts
    },
    nodes: nodes.slice(0, 180),
    errors: []
  };
}


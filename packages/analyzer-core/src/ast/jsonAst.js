const MAX_JSON_NODES = 500;

function valueType(value) {
  if (Array.isArray(value)) return 'ArrayExpression';
  if (value === null) return 'NullLiteral';
  if (typeof value === 'object') return 'ObjectExpression';
  if (typeof value === 'string') return 'StringLiteral';
  if (typeof value === 'number') return 'NumberLiteral';
  if (typeof value === 'boolean') return 'BooleanLiteral';
  return 'UnknownLiteral';
}

function walkJson(value, path, nodes, summary) {
  if (nodes.length >= MAX_JSON_NODES) return;
  const type = valueType(value);
  const node = { type, path };
  nodes.push(node);
  summary.nodeCount += 1;

  if (type === 'ObjectExpression') {
    const entries = Object.entries(value);
    summary.objects += 1;
    summary.properties += entries.length;
    node.properties = entries.map(([key]) => key);
    entries.forEach(([key, child]) => walkJson(child, `${path}.${key}`, nodes, summary));
  } else if (type === 'ArrayExpression') {
    summary.arrays += 1;
    node.length = value.length;
    value.forEach((child, index) => walkJson(child, `${path}[${index}]`, nodes, summary));
  } else {
    summary.literals += 1;
    node.valueType = typeof value;
  }
}

export function parseJsonAst(file) {
  const summary = { nodeCount: 0, objects: 0, arrays: 0, properties: 0, literals: 0 };
  try {
    const parsed = JSON.parse(file.text);
    const nodes = [];
    walkJson(parsed, '$', nodes, summary);
    return {
      file: file.name,
      language: 'json',
      parser: 'native-json',
      parseStatus: 'parsed',
      summary,
      nodes,
      errors: []
    };
  } catch (error) {
    return {
      file: file.name,
      language: 'json',
      parser: 'native-json',
      parseStatus: 'error',
      summary,
      nodes: [],
      errors: [{ message: error.message }]
    };
  }
}


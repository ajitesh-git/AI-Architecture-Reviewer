function cleanName(value = '') {
  return String(value)
    .replace(/^[./\\]+/, '')
    .replace(/\\/g, '/')
    .replace(/["'[\]]/g, '')
    .trim();
}

function dependency(from, node, type, target, via) {
  return {
    from,
    to: cleanName(target),
    type,
    via,
    file: node.file,
    line: node.line
  };
}

function isArchitecturalTarget(target) {
  return /service|api|client|gateway|worker|repository|database|db|sql|queue|topic|event|bus/i.test(target);
}

function serviceTargetFromName(name) {
  const normalized = cleanName(name).toLowerCase();
  const serviceMatch = normalized.match(/\b([a-z0-9-]+-service)\b/);
  if (serviceMatch) return serviceMatch[1];
  if (isArchitecturalTarget(normalized)) return normalized.split(/[/.]/).at(-1) || normalized;
  return null;
}

export function extractAstDependencies(ast, serviceName) {
  if (!ast || ast.parseStatus !== 'parsed') return [];
  const dependencies = [];

  ast.nodes.forEach((node) => {
    if (node.type === 'ImportDeclaration' || node.type === 'RequireCall') {
      const target = serviceTargetFromName(node.source);
      if (target) dependencies.push(dependency(serviceName, { ...node, file: ast.file }, 'module', target, node.type));
    }

    if (node.type === 'InvocationExpression' || node.type === 'CallExpression') {
      const target = serviceTargetFromName(node.name);
      if (target) dependencies.push(dependency(serviceName, { ...node, file: ast.file }, 'call', target, node.type));
    }

    if (node.type === 'TableReference') {
      dependencies.push(dependency(serviceName, { ...node, file: ast.file }, 'datastore', node.name, node.type));
    }

    if (node.type === 'ProcedureCall') {
      dependencies.push(dependency(serviceName, { ...node, file: ast.file }, 'procedure', node.name, node.type));
    }
  });

  return dependencies.filter((item) => item.to);
}

export function extractDatastoresFromAst(ast) {
  if (!ast || ast.parseStatus !== 'parsed') return [];
  return [...new Set(ast.nodes
    .filter((node) => node.type === 'TableReference')
    .map((node) => cleanName(node.name))
    .filter(Boolean))];
}

export function extractCallsFromAst(ast) {
  if (!ast || ast.parseStatus !== 'parsed') return [];
  return [...new Set(ast.nodes
    .filter((node) => ['ImportDeclaration', 'RequireCall', 'InvocationExpression', 'CallExpression', 'ProcedureCall'].includes(node.type))
    .map((node) => serviceTargetFromName(node.source || node.name))
    .filter(Boolean))];
}

export function createTextCallDependency(serviceName, file, target) {
  const cleanedTarget = cleanName(target.replace(/^https?:\/\//, '').split(/[/:]/)[0]);
  return {
    from: serviceName,
    to: cleanedTarget,
    type: 'call',
    via: 'text-service-reference',
    file: file.name
  };
}

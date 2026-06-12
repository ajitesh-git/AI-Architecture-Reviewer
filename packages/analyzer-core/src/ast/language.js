const extensionLanguageMap = new Map([
  ['.cs', 'csharp'],
  ['.sql', 'sql'],
  ['.tsql', 'tsql'],
  ['.proc', 'procedure-sql'],
  ['.prc', 'procedure-sql'],
  ['.ts', 'typescript'],
  ['.tsx', 'typescript'],
  ['.js', 'javascript'],
  ['.jsx', 'javascript'],
  ['.mjs', 'javascript'],
  ['.cjs', 'javascript'],
  ['.json', 'json']
]);

export function detectLanguage(path) {
  const normalized = path.toLowerCase();
  const extension = normalized.slice(normalized.lastIndexOf('.'));
  return extensionLanguageMap.get(extension) || 'unknown';
}


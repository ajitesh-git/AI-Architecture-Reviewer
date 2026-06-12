export function inferServiceName(path) {
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  const parts = normalized.split('/');
  const hit = parts.find((part) => /service|api|worker|frontend|backend|gateway/.test(part));
  if (hit) return hit.replace(/\.(csproj|sln|json|yaml|yml|tf|js|ts|java|py)$/g, '');
  const file = parts.at(-1)?.replace(/\.[^.]+$/, '') || 'solution';
  return file.includes('-') || file.includes('_') ? file : parts[0] || file;
}

export function inferDatastores(text) {
  const stores = new Set();
  const patterns = [
    /(?:database|db|dbname|initial catalog|catalog)\s*[:=]\s*["']?([a-z0-9_-]{3,})/gi,
    /(?:mongodb|postgres|postgresql|mysql|sqlserver|redis|dynamodb|cosmosdb|oracle|mssql)/gi,
    /resource\s+"(?:aws_db_instance|azurerm_(?:mssql|postgresql|mysql)|google_sql_database_instance)"/gi
  ];
  patterns.forEach((pattern) => {
    for (const match of text.matchAll(pattern)) stores.add((match[1] || match[0]).replace(/["']/g, '').slice(0, 40));
  });
  return [...stores];
}

export function extractCalls(text) {
  const calls = [];
  const httpPattern = /(https?:\/\/[a-z0-9_.:-]+\/?[^\s"'`)<>]*)/gi;
  for (const match of text.matchAll(httpPattern)) calls.push(match[1]);
  const serviceRef = /\b([a-z0-9-]+-service)\b/gi;
  for (const match of text.matchAll(serviceRef)) calls.push(match[1]);
  return [...new Set(calls)];
}

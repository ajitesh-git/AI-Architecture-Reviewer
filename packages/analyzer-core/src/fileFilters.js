export const BINARY_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.pdf',
  '.xlsx',
  '.xls',
  '.dll',
  '.exe',
  '.bin',
  '.lock',
  '.woff',
  '.woff2',
  '.zip',
  '.map'
];

export const IGNORED_PATH_PARTS = [
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '__tests__',
  'tests',
  'testfiles',
  '.next',
  '.turbo',
  '.cache'
];

export function isIgnoredPath(path) {
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  return IGNORED_PATH_PARTS.some((part) => normalized.split('/').includes(part));
}

export function isSupportedTextArtifact(path) {
  const normalized = path.toLowerCase();
  return !BINARY_EXTENSIONS.some((extension) => normalized.endsWith(extension));
}

export function createSourceFile({ name, size, text }) {
  return {
    name,
    size: size ?? text.length,
    text: text ?? ''
  };
}

import { createJsonReport, createMarkdownReport } from '@ai-architecture-reviewer/analyzer-core';

export function downloadReport(analysis, format) {
  const isMarkdown = format === 'markdown';
  const blob = new Blob(
    [isMarkdown ? createMarkdownReport(analysis) : createJsonReport(analysis)],
    { type: isMarkdown ? 'text/markdown' : 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `architecture-review-${Date.now()}.${isMarkdown ? 'md' : 'json'}`;
  link.click();
  URL.revokeObjectURL(url);
}

# AST Extraction

AI Architecture Reviewer now produces language-aware AST summaries for supported source and data files. These ASTs are intentionally compact so they can travel through the browser, API, CLI, JSON reports, and future workers without creating huge payloads.

## Supported Inputs

- C#: `.cs`
- SQL: `.sql`
- T-SQL: `.tsql`
- Stored procedure scripts: `.proc`, `.prc`
- TypeScript: `.ts`, `.tsx`
- JavaScript: `.js`, `.jsx`, `.mjs`, `.cjs`
- JSON: `.json`

## Output Shape

Each analyzed text artifact gets an `asts[]` entry:

```json
{
  "file": "web/app.ts",
  "language": "typescript",
  "parser": "regex-estree-summary",
  "parseStatus": "parsed",
  "summary": {
    "nodeCount": 12,
    "imports": 1,
    "declarations": 2,
    "calls": 9
  },
  "nodes": [
    {
      "type": "ImportDeclaration",
      "source": "./api",
      "line": 1
    }
  ],
  "errors": []
}
```

## Dependency Inference

The analyzer now uses AST nodes before text fallback when building architecture signals:

- JS/TS `ImportDeclaration` and `RequireCall` nodes can produce module dependencies.
- C# `InvocationExpression` nodes can produce call dependencies when names indicate service/client boundaries.
- SQL/T-SQL/proc `TableReference` nodes produce datastore dependencies.
- SQL/T-SQL/proc `ProcedureCall` nodes produce stored procedure dependencies.

These inferred dependencies are returned in `analysis.dependencies[]` with `from`, `to`, `type`, `via`, `file`, and optional `line`.

## Current Parser Strategy

The current implementation is dependency-free and browser-compatible:

- JSON uses native `JSON.parse` and recursively emits object, array, and literal nodes.
- JavaScript and TypeScript emit ESTree-style summary nodes for imports, declarations, and calls.
- C# emits Roslyn-style summary nodes for using directives, namespaces, declarations, attributes, and invocations.
- SQL, T-SQL, and procedure scripts emit statement, table reference, procedure declaration, procedure call, and function declaration nodes.

This establishes a stable AST contract first. Later parser upgrades can replace individual language adapters with Roslyn, Tree-sitter, Babel, TypeScript compiler API, or SQL dialect parsers while preserving the same analyzer output.

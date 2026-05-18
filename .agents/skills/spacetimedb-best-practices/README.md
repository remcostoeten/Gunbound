# SpacetimeDB Best Practices

A structured repository for creating and maintaining SpacetimeDB best practices optimized for agents and LLMs.

## Structure

- `rules/` - Individual rule files (one per rule)
  - `_sections.md` - Section metadata (titles, impacts, descriptions)
  - `_template.md` - Template for creating new rules
  - `area-description.md` - Individual rule files
- `metadata.json` - Document metadata (version, organization, abstract)
- __`AGENTS.md`__ - Compiled output (generated)
- __`SKILL.md`__ - Skill definition for Claude Code

## Getting Started

1. Install dependencies:
   ```bash
   cd packages/spacetimedb-best-practices-build
   pnpm install
   ```

2. Build AGENTS.md from rules:
   ```bash
   pnpm build
   ```

3. Validate rule files:
   ```bash
   pnpm validate
   ```

## Creating a New Rule

1. Copy `rules/_template.md` to `rules/area-description.md`
2. Choose the appropriate area prefix:
   - `module-` for Module Design (Section 1)
   - `table-` for Table Schema & Indexing (Section 2)
   - `reducer-` for Reducer Patterns (Section 3)
   - `subscription-` for Subscription Optimization (Section 4)
   - `client-` for Client State Management (Section 5)
   - `react-` for React Integration (Section 6)
   - `ts-` for TypeScript Patterns (Section 7)
   - `sync-` for Real-time Sync (Section 8)
3. Fill in the frontmatter and content
4. Ensure you have clear examples with explanations
5. Run `pnpm build` to regenerate AGENTS.md

## Rule File Structure

Each rule file should follow this structure:

```markdown
---
title: Rule Title Here
impact: MEDIUM
impactDescription: Optional description
tags: tag1, tag2, tag3
---

## Rule Title Here

Brief explanation of the rule and why it matters.

**Incorrect (description of what's wrong):**

```typescript
// Bad code example
```

**Correct (description of what's right):**

```typescript
// Good code example
```

Optional explanatory text after examples.

Reference: [Link](https://example.com)
```

## File Naming Convention

- Files starting with `_` are special (excluded from build)
- Rule files: `area-description.md` (e.g., `table-indexing.md`)
- Section is automatically inferred from filename prefix
- Rules are sorted alphabetically by title within each section
- IDs (e.g., 1.1, 1.2) are auto-generated during build

## Impact Levels

- `CRITICAL` - Highest priority, major performance/correctness gains
- `HIGH` - Significant improvements
- `MEDIUM-HIGH` - Moderate-high gains
- `MEDIUM` - Moderate improvements
- `LOW-MEDIUM` - Low-medium gains
- `LOW` - Incremental improvements

## Scripts

- `pnpm build` - Compile rules into AGENTS.md
- `pnpm validate` - Validate all rule files
- `pnpm dev` - Build and validate

## Contributing

When adding or modifying rules:

1. Use the correct filename prefix for your section
2. Follow the `_template.md` structure
3. Include clear bad/good examples with explanations
4. Add appropriate tags
5. Run `pnpm build` to regenerate AGENTS.md
6. Rules are automatically sorted by title - no need to manage numbers!

## API Reference

This skill targets SpacetimeDB TypeScript SDK v1.4.0+ with the function-builder API:

- **Server modules:** `spacetimedb.reducer()`, `table()`, `t.*` type builders
- **Client SDK:** `DbConnection.builder()` pattern
- **React:** `spacetimedb/react` with `useTable<DbConnection, Type>()` and `where()` queries

## References

- [SpacetimeDB Documentation](https://spacetimedb.com/docs)
- [TypeScript Module Quickstart](https://spacetimedb.com/docs/modules/typescript/quickstart/)
- [TypeScript SDK Reference](https://spacetimedb.com/docs/sdks/typescript/)

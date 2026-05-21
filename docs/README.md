# Gunbound Docs

This folder is the Fumadocs app for the Gunbound repo.

## Run it

From the repo root:

```bash
bun run dev
```

That starts the main app workflow. The docs app itself can be run on its own:

```bash
cd docs
bun run dev
```

## Check it

```bash
cd docs
bun run types:check
bun run build
```

## Where content lives

- `content/docs/` contains the MDX pages.
- `src/app/` contains the docs app routes and layouts.
- `src/lib/source.ts` wires Fumadocs to the MDX source tree.
- `src/components/` contains shared docs UI.

## What this docs app is for

The docs are meant to explain:

- how the client and SpacetimeDB module fit together
- how to run the repo locally
- where generated bindings live
- which files you edit for gameplay, lobby, auth, and docs changes
- the common git and verification workflow around those changes

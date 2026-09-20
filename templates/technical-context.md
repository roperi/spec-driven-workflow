# Technical Context

<!--
HOW TO USE THIS TEMPLATE

This file is a shape and a worksheet, not your technical context. Write the
project-owned result to `.sdw/project-context/technical-context.md`, replace
every placeholder with real content, and delete every comment (including this
one).

WHAT TECHNICAL CONTEXT IS
- The current, factual technical orientation for the repository: the stack,
  where things live, the commands that are authoritative, the environment that
  is required, and the boundaries work must not cross.
- A living document. Update it whenever a command, dependency, layout, or
  boundary changes, so a fresh session can trust it.
- The orientation counterpart to the constitution: the constitution states
  durable law, this file states present-day technical reality.

WHAT IT IS NOT
- Not the constitution. Principles and non-negotiable rules live in
  `constitution.md`.
- Not a roadmap or design document. Intended direction belongs in `README.md`,
  the roadmap, or `docs/`; link them instead of duplicating them.
- Not a place for secrets, credentials, private data, or raw logs.

GREENFIELD NOTE
A brand-new project has no code and few commands, and that is fine. Record what
is actually decided, label the rest intended or open, and stay honest: "no build
command yet" is a correct and useful entry. Never invent commands that do not
exist, and update this file as soon as the stack or tooling becomes real.

HOW TO BUILD YOURS
1. Read what exists: `README.md`, `AGENTS.md`, `docs/`, package or project
   manifests, CI configuration, and any existing `.sdw/project-context/`.
2. Elicit the minimum from the user in plain language: what is being built, in
   what language and runtime, where the code and tests will live, how it is run
   and checked, what tools and versions are required, and what must never be
   touched or committed.
3. Prefer links to canonical documents over copied text.
4. Delete TODO lines and comments when done; a saved technical context must
   contain no template guidance and no unresolved placeholder.
-->

## Review Status

<!-- Recommended. Keep dates in YYYY-MM-DD form. Example:
     - Maintainer review: refreshed 2026-01-01
     - Purpose: authoritative technical orientation for sessions and maintainers
     - Onboarding mode: greenfield | existing | migration -->

TODO: last review date, purpose, and onboarding mode (or delete this section).

## Authoritative Guidance

<!-- Link the documents a session must read before changing the repository.
     Typical set: README, constitution, architecture or design docs, contributing
     guide, and agent instructions. Link only what exists. -->

TODO: the canonical documents and their purpose, as links.

## Project and Stack

<!-- State what the product is in one line, then the decided and intended stack:
     languages, frameworks, runtime, data stores, and key dependencies. For a
     greenfield project, mark each item decided, intended, or open. Note
     pinned versions and why. -->

TODO: product summary and stack (decided, intended, or open).

## Repository Map

<!-- Describe where the important code, tests, and documents live. For a
     greenfield project, show the intended layout and note that directories do
     not exist yet. Prefer a short tree over prose. -->

```text
TODO: the current or intended top-level layout with a one-line purpose per path.
```

## Authoritative Commands

<!-- List the exact commands for setup, build, test, lint, typecheck, and any
     validation gate. Name the single canonical check when one exists. For a
     greenfield project with none yet, say so explicitly and name the command
     surface you intend to create. -->

TODO: setup, build, test, lint, and validation commands.

## Environment and Tooling

<!-- Record required language and tool versions, package managers, services,
     environment variables (names only, never values), and setup prerequisites.
     Note anything that must be installed before the commands above work. -->

TODO: required versions, tools, and prerequisites.

## Hard Boundaries

<!-- Record what work must never do: commit secrets or private data, modify
     protected paths or external systems, change locked interfaces, or take
     irreversible actions without approval. State each boundary plainly. -->

TODO: forbidden paths, data, systems, and actions.

## Maintenance

<!-- State when this file must be updated, for example when a command,
     dependency, layout, environment, or boundary changes. Example: "Update this
     file in the same change that changes a command, dependency, or boundary;
     update the constitution only through its amendment process." -->

TODO: when and how this file is kept current.

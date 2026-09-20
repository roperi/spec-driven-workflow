# Project Constitution

<!--
HOW TO USE THIS TEMPLATE

This file is a shape and a worksheet, not your constitution. Write the
project-owned result to `.sdw/project-context/constitution.md`, replace every
placeholder with real content, and delete every comment (including this one).

WHAT A CONSTITUTION IS
- The project's durable development law: the principles every scope,
  specification, plan, task, implementation, validation, review, and release
  MUST satisfy.
- Project-specific and checkable. A reviewer should be able to decide whether a
  change violates an article.
- Stable across work items, like a codebase's architectural DNA.

WHAT IT IS NOT
- Not a README, roadmap, product vision, architecture guide, or command list.
  Those belong in `README.md`, the roadmap, `docs/`, and `technical-context.md`.
- Not a record of the current task. Work-specific decisions belong in
  `.sdw/work/<work-id>/`.
- Not a wish list. Generic statements such as "write good code" or "be secure"
  constrain nothing and dilute the binding rules.

HOW SDW USES IT
`sdw.scope`, `sdw.spec`, and `sdw.plan` identify the articles a work item must
satisfy; review rejects a violation unless the work records an approved
exception with its rationale, owner, and evidence. An article no work can
violate is noise, so prefer a few enforceable rules over a long list.

HOW TO BUILD YOURS (GREENFIELD OR EXISTING)
1. Read whatever already exists: `README.md`, `AGENTS.md`, `docs/`, any
   roadmap, ADRs, issues, or design notes.
2. Elicit the minimum from the user in plain language. Useful questions:
   - What is this product for, and who uses it?
   - What must never break, and what behavior is unacceptable?
   - What must be true before a change is accepted (tests, review, checks)?
   - What data, systems, or assets are off-limits, and what must never be
     committed?
   - Who authorizes merge, release, or publication?
   - Which decisions, interfaces, or formats are locked, and why?
   - How may this constitution change, and who approves it?
3. Turn each answer into an article a reviewer could check. Use MUST, MUST NOT,
   or SHOULD, and give the rationale when it is not obvious.
4. Keep the article set small and enforceable. The named articles below are a
   recommended starting set: rename, delete, merge, or add to fit the project,
   then renumber in order.
5. For a brand-new project with no decisions yet, record only the commitments
   the user is actually making, and mark unresolved topics as open questions
   instead of inventing principles.
6. Delete TODO lines and comments when done. A saved constitution must contain
   no template guidance and no unresolved placeholder.
-->

## Preamble

<!-- One short paragraph naming the project, what this constitution governs, and
     where operational detail lives. Example: "This constitution is the durable
     development law for <project>. Specifications, plans, implementation,
     validation, reviews, and releases MUST comply with it. Operational commands
     and repository maps live in `technical-context.md`." -->

TODO: state the project, what this constitution governs, and what lives elsewhere.

## Review Status

<!-- Recommended for an existing project; delete this section if it does not
     help. Keep dates in YYYY-MM-DD form. Example:
     - Maintainer review: established 2026-01-01
     - Stage: prototype | active | maintenance
     - Scope: what this constitution governs -->

TODO: adoption date, current stage, and scope (or delete this section).

## Article I — Intent and Contracts First

<!-- Concern: work starts from stated intent, not from code.
     Making it checkable: require a user-visible outcome, acceptance criteria,
     and a verification route before implementation; resolve or record
     ambiguity instead of silently assuming. -->

TODO: the binding rule, its rationale, and the evidence that shows compliance.

## Article II — Specifications as the Source of Truth

<!-- Concern: the specification, not the code, defines intended behavior.
     Making it checkable: when intent changes, the specification or contract
     changes first and the implementation follows. -->

TODO: the binding rule, who owns the specification, and how it stays current.

## Article III — Test-First and Reality-Based Validation

<!-- Concern: changes are proven before they are accepted.
     Making it checkable: state the required automated checks, the acceptance
     bar, and how a green result is demonstrated against real behavior rather
     than mocks alone. -->

TODO: the required checks, the acceptance bar, and how results are evidenced.

## Article IV — Simplicity Before Abstraction

<!-- Concern: complexity is added only when a real case requires it.
     Making it checkable: require justification for new layers, dependencies,
     services, or frameworks, and name where that justification is recorded. -->

TODO: the simplicity rule, the dependency or abstraction threshold, and where
exceptions are justified.

## Article V — Explicit Interfaces and Observable Behavior

<!-- Concern: behavior is visible at a boundary rather than hidden in internals.
     Making it checkable: require public contracts (APIs, schemas, commands,
     events) to be documented, versioned, and testable; prefer real interfaces
     over wrappers that hide behavior. Adapt to the product; delete this article
     when the project has no external surface. -->

TODO: the interfaces that must stay explicit, how they are described, and how
they are verified.

## Article VI — Canonical Ownership and Boundaries

<!-- Concern: each fact, asset, or decision has one owner and a known boundary.
     Making it checkable: name the source of truth for each important kind of
     data or behavior, and prohibit unauthorized duplication, mutation, or
     cross-boundary access. Include safety boundaries such as secrets, private
     data, and systems that must not be touched. -->

TODO: canonical owners, hard boundaries, and what must never change or be exposed.

## Article VII — Human Authority and Review Gates

<!-- Concern: naming a desired end state is not authorization to ship it.
     Making it checkable: identify which actions require explicit human
     approval (scope, merge, release, publication, destructive or irreversible
     operations) and state that an agent may propose but not silently close a
     human gate. -->

TODO: who approves what, and which actions must never be taken silently.

## Article VIII — Decision Traceability

<!-- Concern: material decisions must be reconstructable later.
     Making it checkable: require material product, architecture, and design
     decisions to record their rationale, evidence, alternatives, and the
     trigger that would cause reconsideration. -->

TODO: what counts as a material decision, what is recorded, and where.

## Article IX — [Project-Defined Principle]

<!-- Add, remove, or rename articles so the set fits this project. Domain rules
     (security, compliance, privacy, accessibility, performance, licensing,
     data residency, and so on) belong here as their own articles when they
     genuinely constrain work. -->

TODO: a project-specific principle, or delete this article if it is not needed.

## Enforcement

<!-- State how the articles are applied. Example: every scope, specification,
     and plan identifies the articles it must satisfy and records any exception
     with its rationale, owner, and validation evidence; reviews reject
     violations of an article without an approved, documented exception. -->

TODO: how compliance is checked and how exceptions are handled.

## Amendments

<!-- State how this constitution may change. Example: amendments require named
     maintainer approval, a written rationale, a compatibility assessment, and
     updates to affected contracts, tests, and context; articles are stable by
     default and implementation tactics may evolve without weakening them. -->

TODO: who may amend this constitution, what the change requires, and how it is
recorded.

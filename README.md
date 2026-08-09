# Obsidian Core

An opinionated Obsidian vault taxonomy, published together with the tooling that keeps it
safe to publish.

There are no real notes here, no personal data, no client or company material, no
application configuration, no attachments, and no internal paths. Empty folders are held
open with `.gitkeep` so the shape survives Git. Read [STRUCTURE.md](STRUCTURE.md) for what
belongs where, or use the repository directly as a starting vault.

## Enforcement

The privacy claim above is checked by machine rather than by discipline:

- `npm run verify` holds the repository to an exact allowlist. A file that is not on the
  list fails the build, and structural placeholders must be empty.
- `npm run scan:public-safety` rejects credentials, contact data, external URLs, internal
  filesystem paths, application configuration, attachments, and commit messages carrying
  any of those.
- CI runs both on every push and re-scans every reachable commit, so nothing can hide in
  history.

The allowlist is the control that actually holds: paths are compared as raw Git bytes, so
one file can never inherit another's permission. The pattern rules are defence in depth,
not a guarantee, and they are deliberately narrow to stay useful.

## Start

1. Clone or download this repository.
2. Open its root folder as a vault in Obsidian.
3. Set `5 - Templates/` as the templates folder if you use that core feature.
4. Start at [Home](4%20-%20Index/Home.md), then capture or refine a note where it belongs.

## Structure

- [0 - Knowledge Base](0%20-%20Knowledge%20Base/README.md) for durable ideas.
- [1 - Rough Notes](1%20-%20Rough%20Notes/README.md) for quick capture and refinement.
- [2 - Source Materials](2%20-%20Source%20Materials/README.md) for neutral source notes.
- [3 - Tags](3%20-%20Tags/README.md) for tag conventions.
- [4 - Index](4%20-%20Index/README.md) for navigation and reusable blocks.
- [5 - Templates](5%20-%20Templates/Daily%20Note.md) for note starting points.
- [7 - Personal](7%20-%20Personal/README.md) as a boundary for material that belongs only in a private vault.

Number 6 is intentionally unused to mirror the workflow this starter demonstrates.
[STRUCTURE.md](STRUCTURE.md) maps every subfolder and explains what belongs where.

## Privacy

The public sample contains no real personal data. The vault content intentionally contains no application configuration, attachments, real personal notes, credentials, contact data, external service references, or company/client material. Keep real personal notes in a private vault.

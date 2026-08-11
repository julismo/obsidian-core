# Obsidian Core

A reference implementation of publishing a vault taxonomy on purpose: the folder structure,
a worked example, and the tooling that keeps the published set explicit.

Everything here was chosen. There are no real notes, no personal data, no client or company
material, no application configuration, no attachments, and no internal paths. Empty folders
are held open with `.gitkeep` so the shape survives Git.

Read [STRUCTURE.md](STRUCTURE.md) for what belongs where, and
[THREAT-MODEL.md](THREAT-MODEL.md) for what the tooling does and does not cover.

You are welcome to copy the parts that fit. Be aware that the exact allowlist in `scripts/`
is what makes the published set explicit, and it is deliberately strict: adding a note means
adding it to the list. That is the right trade for a repository whose job is to publish a
known set, and the wrong one for a vault you intend to grow freely.

## How the published set is kept explicit

Checked by machine rather than by discipline:

- `npm run verify` holds the repository to an exact allowlist. A file that is not on the
  list fails the build, and structural placeholders must be empty.
- `npm run scan:public-safety` rejects credentials, contact data, internal filesystem
  paths, application configuration, attachments, and commit messages carrying any of those.
  Vault notes may not carry external links; the documents that explain this repository may
  cite sources. Either way, a URL with embedded credentials, a private or internal host, or
  a non-web scheme is refused everywhere.
- CI runs both on every push, and re-scans the content of every reachable commit.

The allowlist is the control that actually holds for the current tree: paths are compared
as raw Git paths, so one file can never inherit another's permission. The pattern rules
are defence in depth, not a guarantee, and they are deliberately narrow to stay useful.

### What this does not cover

Worth stating plainly, because a guarantee that overreaches is worse than none:

- History is scanned for content, not for shape. The allowlist and the internal-path rule
  are not applied to past commits, because this repository predates the current taxonomy.
  A file that was committed and later removed is only caught if its *content* matches a
  rule.
- Commits reachable only from a closed pull request are not in `git rev-list --all`, so CI
  never sees them. Force-pushing over a commit does not remove it from a forge.
- Author and committer addresses are not scanned. Every commit carries one by design.
- The pattern rules match common shapes, not every shape. They will miss an unusual one.

Treat the allowlist as the boundary and the rest as help.

## Reading it

The taxonomy is easiest to judge from inside Obsidian, where the links resolve.

1. Clone or download this repository.
2. Open its root folder as a vault.
3. Set `5 - Templates/` as the templates folder if you use that core feature.
4. Start at [Home](4%20-%20Index/Home.md), then read the worked example in order, from brief
   to acceptance.

## Structure

- [0 - Knowledge Base](0%20-%20Knowledge%20Base/README.md) for durable ideas.
- [1 - Rough Notes](1%20-%20Rough%20Notes/README.md) for quick capture and refinement.
- [2 - Source Materials](2%20-%20Source%20Materials/README.md) for neutral source notes.
- [3 - Tags](3%20-%20Tags/README.md) for tag conventions.
- [4 - Index](4%20-%20Index/README.md) for navigation and reusable blocks.
- [5 - Templates](5%20-%20Templates/Daily%20Note.md) for note starting points.
- [7 - Personal](7%20-%20Personal/README.md) as a boundary for material that belongs only in a private vault.

Number 6 is intentionally unused to mirror the workflow this repository demonstrates.
[STRUCTURE.md](STRUCTURE.md) maps every subfolder and explains what belongs where.

## Privacy

The public sample contains no real personal data. The vault content intentionally contains no application configuration, attachments, real personal notes, credentials, contact data, external service references, or company/client material. Keep real personal notes in a private vault.

The tooling here is a guardrail for deliberate publication, not a privacy boundary.
[THREAT-MODEL.md](THREAT-MODEL.md) sets out what it catches, what it does not, and why the
strongest arrangement is keeping the private corpus in a separate repository altogether.

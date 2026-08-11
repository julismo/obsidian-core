# Threat model

This repository publishes a vault taxonomy on purpose. The tooling in `scripts/` is a
guardrail for deliberate publication: it makes the set of published files explicit and
fails the build when reality drifts from that set.

It is not a privacy boundary, and this document exists so that distinction is never
implied by silence.

## What it is built to catch

| Case | How it is caught |
|---|---|
| A file is added that was never meant to be public | The allowlist is exact. Anything not on it fails, whatever it contains. |
| A structural placeholder is used to smuggle text | Placeholders must be empty, checked in both the scanner and the verifier. |
| A distinct path impersonates an allowed one | Paths are authorised as raw Git paths, before any normalisation. |
| Credentials, contact data or an internal machine path in a note | Pattern rules over file content and commit messages. |
| A private share link, a credentialed URL, or an internal host | Refused in every file, including the documents allowed to cite sources. |
| An attachment or application setting is committed | Rejected by extension and by path shape. |

The failure mode that matters is the first row. It does not depend on a pattern matching
anything, which is why the allowlist is the control and the patterns are help.

## What is not defended

Stated plainly, because a boundary that overreaches is worse than none.

- **Accident is caught late.** Checks run in CI, after a push reaches the forge. They do
  not prevent a first exposure; they detect it. Prevention would need a local hook before
  the push leaves the machine.
- **A malicious collaborator is not in scope.** Anyone who can change `scripts/` and
  `.github/workflows/` in the same change can alter the check that would have stopped
  them. `CODEOWNERS` records the intent; enforcement depends on branch settings outside
  the repository.
- **History is scanned for content, not for shape.** The allowlist and the internal-path
  rule are not applied to past commits, because this repository predates its own taxonomy.
  A file committed and later removed is caught only if its content matches a rule.
- **Commits reachable only from a closed pull request are invisible.** They are not in
  `git rev-list --all`, so CI never reads them. Rewriting a branch does not remove them
  from a forge, and a fork or an existing clone keeps whatever it already had.
- **Author and committer metadata is never scanned.** Every commit carries an address by
  design. Flagging it would fail any repository.
- **Semantic disclosure is not detectable.** A folder name that identifies a client, or a
  note that is unmistakable to someone who knows the context, passes every rule here. No
  pattern settles that. Human review does.
- **Pattern rules match common shapes only.** Each additional shape buys false positives
  without closing the class. They are deliberately narrow.
- **Documentation may cite sources.** The five documents that explain this repository are
  exempt from the plain external-link rule, because a reference without a source is worth
  little. They remain subject to every other rule, including the refusal of credentialed,
  private and non-web URLs. A link that is merely unwise is not caught.
- **One company name is refused, no other.** The author's own company is blocked as a
  tripwire against drifting into writing about its operations. Tool and vendor names are
  deliberately writable: naming a tool discloses nothing, and forbidding it made honest
  method writing impossible.

## The honest promise

Everything published here was chosen. The tooling makes that choice explicit and hard to
drift from by accident. It does not make the repository safe, and it says nothing about
any legal obligation.

Anything genuinely sensitive belongs in a private vault that is never a candidate for
publication in the first place. The strongest arrangement is not a better rule set; it is
keeping the private corpus and the public repository as separate repositories, with a
reviewed export between them.

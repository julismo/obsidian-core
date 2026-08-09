import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicDocuments = [
  ".github/workflows/ci.yml",
  ".gitignore",
  "0 - Knowledge Base/README.md",
  "0 - Knowledge Base/Example Knowledge Note.md",
  "0 - Knowledge Base/2. Projects/_example-project/01 - Brief/Engagement Brief.md",
  "0 - Knowledge Base/2. Projects/_example-project/02 - Operations/Operating Rhythm.md",
  "0 - Knowledge Base/2. Projects/_example-project/03 - Manual/Procedures/Intake Procedure.md",
  "0 - Knowledge Base/2. Projects/_example-project/04 - Triage/Triage Log.md",
  "0 - Knowledge Base/2. Projects/_example-project/05 - Demo/Demo Script.md",
  "0 - Knowledge Base/2. Projects/_example-project/06 - Validation/Acceptance Checklist.md",
  "1 - Rough Notes/README.md",
  "1 - Rough Notes/Example Rough Note.md",
  "2 - Source Materials/README.md",
  "2 - Source Materials/Example Source.md",
  "3 - Tags/README.md",
  "3 - Tags/Status.md",
  "4 - Index/README.md",
  "4 - Index/Home.md",
  "5 - Templates/Daily Note.md",
  "5 - Templates/Knowledge Note.md",
  "5 - Templates/Source Note.md",
  "5 - Templates/Project Note.md",
  "7 - Personal/README.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "README.md",
  "SECURITY.md",
  "STRUCTURE.md",
  "package-lock.json",
  "package.json",
  "scripts/scan-public-safety.mjs",
  "scripts/scan-public-safety.node-test.mjs",
  "scripts/verify-starter.mjs",
  "scripts/verify-starter.node-test.mjs",
];

export const structuralDirectories = Object.freeze([
  "0 - Knowledge Base/0. Inbox",
  "0 - Knowledge Base/1. Areas/1.1 Interaction Rules",
  "0 - Knowledge Base/1. Areas/1.2 Profile",
  "0 - Knowledge Base/1. Areas/1.3 Preferences and Style",
  "0 - Knowledge Base/1. Areas/1.4 Tools and Stack/Agent Setup/profiles",
  "0 - Knowledge Base/1. Areas/1.4 Tools and Stack/Agent Setup/templates/aliases",
  "0 - Knowledge Base/1. Areas/1.4 Tools and Stack/Agent Setup/templates/commands",
  "0 - Knowledge Base/1. Areas/1.4 Tools and Stack/Agent Setup/templates/rules",
  "0 - Knowledge Base/1. Areas/1.4 Tools and Stack/Agent Setup/templates/scripts",
  "0 - Knowledge Base/1. Areas/1.4 Tools and Stack/Agent Setup/templates/workflows",
  "0 - Knowledge Base/1. Areas/1.5 Methods and Processes",
  "0 - Knowledge Base/1. Areas/1.6 Vault Structure",
  "0 - Knowledge Base/1. Areas/1.7 Maintenance System",
  "0 - Knowledge Base/1. Areas/Strategic Planning",
  "0 - Knowledge Base/2. Projects/_project-template/00 - Agent Scaffold/02 - Rules and Governance",
  "0 - Knowledge Base/2. Projects/_project-template/00 - Agent Scaffold/03 - Commands",
  "0 - Knowledge Base/2. Projects/_project-template/00 - Agent Scaffold/04 - Skills",
  "0 - Knowledge Base/2. Projects/_project-template/00 - Agent Scaffold/05 - Protocols",
  "0 - Knowledge Base/2. Projects/_project-template/00 - Agent Scaffold/06 - Templates",
  "0 - Knowledge Base/2. Projects/_project-template/00 - Agent Scaffold/07 - Agents",
  "0 - Knowledge Base/2. Projects/_project-template/00 - Agent Scaffold/08 - Memory/feedback",
  "0 - Knowledge Base/2. Projects/_project-template/00 - Agent Scaffold/08 - Memory/project",
  "0 - Knowledge Base/2. Projects/_project-template/00 - Agent Scaffold/08 - Memory/reference",
  "0 - Knowledge Base/2. Projects/_project-template/00 - Agent Scaffold/10 - Examples",
  "0 - Knowledge Base/2. Projects/_project-template/00 - Agent Scaffold/11 - Processes",
  "0 - Knowledge Base/2. Projects/_project-template/00 - Agent Scaffold/12 - Pipeline",
  "0 - Knowledge Base/2. Projects/_project-template/00 - Agent Scaffold/13 - Product",
  "0 - Knowledge Base/2. Projects/_project-template/01 - Brief",
  "0 - Knowledge Base/2. Projects/_project-template/02 - Operations",
  "0 - Knowledge Base/2. Projects/_project-template/03 - Manual/Procedures",
  "0 - Knowledge Base/2. Projects/_project-template/04 - Triage",
  "0 - Knowledge Base/2. Projects/_project-template/05 - Demo",
  "0 - Knowledge Base/2. Projects/_project-template/06 - Validation",
  "0 - Knowledge Base/2. Projects/_project-template/90 - Internal/01 - Internal Meetings",
  "0 - Knowledge Base/2. Projects/_project-template/90 - Internal/02 - Architecture",
  "0 - Knowledge Base/2. Projects/_project-template/90 - Internal/03 - Management",
  "0 - Knowledge Base/2. Projects/_project-template/99 - Models",
  "0 - Knowledge Base/3. Resources/Systems/Agent Patterns/Cross-Project",
  "0 - Knowledge Base/3. Resources/Systems/Agent Patterns/Global",
  "0 - Knowledge Base/3. Resources/Systems/Agent Patterns/Skill Bundle",
  "0 - Knowledge Base/3. Resources/To Study",
  "0 - Knowledge Base/4. Archive",
  "0 - Knowledge Base/_meta",
  "1 - Rough Notes/1. Daily Notes",
  "1 - Rough Notes/2. Newsletter/Archive",
  "1 - Rough Notes/3. Canvas",
  "1 - Rough Notes/4. Study/_course-template/Phase 1",
  "1 - Rough Notes/4. Study/_course-template/Phase 2",
  "2 - Source Materials/Images and Diagrams/Projects",
  "2 - Source Materials/Images and Diagrams/Screenshots",
  "2 - Source Materials/PDFs/Contracts",
  "2 - Source Materials/PDFs/Culture",
  "2 - Source Materials/PDFs/Generated Slides",
  "2 - Source Materials/PDFs/Visual References",
  "2 - Source Materials/Repositories",
  "2 - Source Materials/Talks",
  "2 - Source Materials/Videos",
  "2 - Source Materials/Web Articles",
  "3 - Tags/General",
  "3 - Tags/Management and Projects",
  "3 - Tags/Tools",
  "4 - Index/Agency",
  "4 - Index/Projects/MVP",
  "4 - Index/Software/No-Code",
  "7 - Personal/1. Areas/1.1 Documents and Identity",
  "7 - Personal/2. Projects/_project-template/Leads",
  "7 - Personal/2. Projects/_project-template/Research",
  "7 - Personal/3. Resources",
  "7 - Personal/4. Archive",
]);

export const publicFiles = Object.freeze([
  ...publicDocuments,
  ...structuralDirectories.map((directory) => `${directory}/.gitkeep`),
]);

const publicFileSet = new Set(publicFiles);
const credentialPatterns = [
  /gh[pousr]_[A-Za-z0-9_]{20,}/g,
  new RegExp(`${["git", "hub"].join("")}_pat_[A-Za-z0-9_]{20,}`, "g"),
  /sk-[A-Za-z0-9_-]{20,}/g,
  /(?:AKIA|ASIA)[0-9A-Z]{16}/g,
  /xox[baprs]-[A-Za-z0-9-]{20,}/g,
  /glpat-[A-Za-z0-9_-]{20,}/g,
  /npm_[A-Za-z0-9_-]{20,}/g,
];
const externalUrlPattern = /\bhttps?:\/\/[^\s<>"']+/gi;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.(?!example\b|invalid\b|localhost\b|test\b)[A-Z]{2,}\b/gi;
const telephonePattern = /\+\d(?:[\s().-]*\d){7,14}\b|(?<![A-Za-z0-9])\d{9,10}(?![A-Za-z0-9])|(?<![A-Za-z0-9:.-])(?!(?:\d{4}-\d{2}-\d{2})\b)(?:\(\d{2,4}\)|\d{2,4})(?:[ -]+\d{2,4}){2,4}\b/g;
const configurationPathPattern = /(?<![A-Za-z0-9_.-])\.(?:obsidian|config)(?:[\\/]|$)|(?<![A-Za-z0-9_.-])plugins?[\\/]/gim;
const internalFilesystemRoots = [
  "home", "mnt", "media", "Users", "root", "srv", "opt",
  "Volumes", "private", "var", "workspace",
];
// Examples are described rather than written literally: this module scans its own source,
// so a sample path in a comment would be a finding against itself.
// Network shares are deliberately not matched. Their shape is indistinguishable from an
// escaped backslash sequence in source code, and this module scans its own tests, so the
// rule would report far more noise than signal. The allowlist remains the real control.
const internalFilesystemPathPattern = new RegExp([
  // Drive-qualified path. Either a separator follows the colon, or a drive-relative
  // segment does and a separator appears later. Requiring a separator somewhere keeps
  // ratio notation such as a letter, a colon and a digit from reading as a path.
  `(?<![A-Za-z0-9])[A-Za-z]:(?:[\\\\/][^\\s"'<>|]*|[A-Za-z0-9._$-]+[\\\\/][^\\s"'<>|]*)`,
  // Home shorthand, with or without a trailing user name.
  `(?<![A-Za-z0-9._-])~[A-Za-z0-9._-]*\\/[^\\s"'<>|]*`,
  // Well-known absolute roots that reveal a real machine layout.
  `(?<![A-Za-z0-9._-])\\/(?:${internalFilesystemRoots.join("|")})\\/[^\\s"'<>|]*`,
].join("|"), "gi");
// Git always separates path segments with "/". A literal backslash therefore belongs to a
// filename, and collapsing it would let a distinct file inherit an allowlisted path's
// permission. Such paths are rejected outright rather than normalized.
const forbiddenPathCharacter = String.fromCharCode(92);
const prohibitedBrandPattern = new RegExp(
  `\\b(?:${[
    ["Open", "AI"],
    ["Anth", "ropic"],
    ["Clau", "de"],
    ["Tr", "ion"],
  ].map((fragments) => fragments.join("")).join("|")})\\b`,
  "gi",
);
const approvedLocalStateIgnoreRules = new Set([
  [[".", "obsidian"].join(""), ""].join("/"),
  ".DS_Store",
  "Thumbs.db",
  "*.log",
  ".env",
  "node_modules/",
]);
const contentRules = [
  ["credential_candidate", ...credentialPatterns],
  ["external_url", externalUrlPattern],
  ["contact_data", emailPattern, telephonePattern],
  ["configuration_path", configurationPathPattern],
  ["internal_path", internalFilesystemPathPattern],
  ["prohibited_brand", prohibitedBrandPattern],
];
const structuralPlaceholderPattern = /(?:^|\/)\.gitkeep$/;
const forbiddenAttachment = /\.(?:7z|aac|avi|avif|bmp|bz2|docx?|epub|flac|gif|gz|heic|ico|jpe?g|m4[av]|mkv|mov|mp3|mp4|odp|ods|odt|ogg|pdf|png|pptx?|rar|rtf|svg|tar|tiff?|wav|webm|webp|xlsx?|xz|zip)$/i;
const redactedSpan = "[REDACTED]";

function normalizePath(entryPath) {
  return entryPath.replaceAll("\\", "/");
}

export function redactSensitiveText(value) {
  if (isConfigurationPath(value)) return redactedSpan;
  let redactedValue = value;
  for (const [category, ...patterns] of contentRules) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      redactedValue = redactedValue.replace(pattern, redactedSpan);
    }
  }
  return redactedValue;
}

// Never normalizes: Git already separates segments with "/", so the only paths this would
// change are malformed ones, and hiding the offending character would mislead the reader.
function safePresentationPath(entryPath) {
  const safePath = redactSensitiveText(entryPath);
  return safePath.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, (character) => {
    return `\\u${character.codePointAt(0).toString(16).padStart(4, "0")}`;
  });
}

function finding(category, entryPath, redactPath = false) {
  return { category, path: redactPath ? redactedSpan : safePresentationPath(entryPath) };
}

export function hasForbiddenPathCharacter(entryPath) {
  return entryPath.includes(forbiddenPathCharacter);
}

function isConfigurationPath(value) {
  configurationPathPattern.lastIndex = 0;
  return configurationPathPattern.test(value);
}

function searchableText(entry, normalizedPath) {
  if (normalizedPath !== ".gitignore") return entry.text;
  return entry.text
    .split(/\r?\n/)
    .filter((line) => !approvedLocalStateIgnoreRules.has(line))
    .join("\n");
}

export function scanEntries(entries, { history = false } = {}) {
  const findings = [];
  // Historical blobs predate the internal-path rule and cannot be corrected without
  // rewriting published history. Every secret-bearing rule still applies to them.
  const activeRules = history
    ? contentRules.filter(([category]) => category !== "internal_path")
    : contentRules;
  for (const entry of entries) {
    if (hasForbiddenPathCharacter(entry.path)) {
      findings.push(finding("malformed_path", entry.path));
      continue;
    }
    const normalizedPath = normalizePath(entry.path);
    const entryText = searchableText(entry, normalizedPath);
    if (isConfigurationPath(normalizedPath)) {
      findings.push(finding("configuration_path", normalizedPath, true));
      continue;
    }
    if (
      normalizedPath === ".env" ||
      normalizedPath.startsWith(".env.") ||
      normalizedPath.includes("/.env") ||
      normalizedPath === "node_modules" ||
      normalizedPath.includes("node_modules/")
    ) {
      findings.push(finding("forbidden_path", normalizedPath));
      continue;
    }
    if (forbiddenAttachment.test(normalizedPath)) {
      findings.push(finding("forbidden_attachment", normalizedPath));
      continue;
    }
    if (structuralPlaceholderPattern.test(normalizedPath) && entryText.length > 0) {
      findings.push(finding("non_empty_placeholder", normalizedPath));
    }
    for (const [category, ...patterns] of activeRules) {
      let matched = false;
      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        if (pattern.test(normalizedPath)) {
          matched = true;
          break;
        }
        pattern.lastIndex = 0;
        if (pattern.test(entryText)) {
          matched = true;
          break;
        }
      }
      if (matched) findings.push(finding(category, normalizedPath));
    }
  }
  return findings;
}

function gitBuffer(rootDirectory, args) {
  return execFileSync("git", [
    "--no-replace-objects",
    "--no-lazy-fetch",
    "-C",
    rootDirectory,
    ...args,
  ], {
    env: {
      ...process.env,
      GIT_NO_LAZY_FETCH: "1",
      GIT_NO_REPLACE_OBJECTS: "1",
      GIT_TERMINAL_PROMPT: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parseGitEntries(output, revision) {
  const entries = [];
  let start = 0;
  while (start < output.length) {
    const end = output.indexOf(0, start);
    if (end === -1) break;
    const record = output.subarray(start, end);
    start = end + 1;
    const separator = record.indexOf(0x09);
    if (separator === -1) continue;
    const header = record.subarray(0, separator).toString("ascii").split(" ");
    const objectId = revision ? header[2] : header[1];
    const entryPath = record.subarray(separator + 1).toString("utf8");
    if (!/^[0-7]{6}$/.test(header[0]) || !/^[0-9a-f]{40,64}$/.test(objectId) || entryPath.length === 0) continue;
    entries.push({ mode: header[0], objectId, path: entryPath });
  }
  return entries;
}

function resolveRepositoryRoot(rootDirectory) {
  const output = gitBuffer(rootDirectory, ["rev-parse", "--show-toplevel"]).toString("utf8");
  const repositoryRoot = output.replace(/\r?\n$/, "");
  if (repositoryRoot.length === 0) throw new Error("invalid repository root");
  return repositoryRoot;
}

function resolveTree(rootDirectory, revision) {
  if (typeof revision !== "string" || revision.length === 0) throw new Error("invalid revision");
  const commitId = gitBuffer(rootDirectory, [
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${revision}^{commit}`,
  ]).toString("ascii").trim();
  if (!/^[0-9a-f]{40,64}$/.test(commitId)) throw new Error("invalid commit");
  const treeId = gitBuffer(rootDirectory, [
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${commitId}^{tree}`,
  ]).toString("ascii").trim();
  if (!/^[0-9a-f]{40,64}$/.test(treeId)) throw new Error("invalid tree");
  return treeId;
}

function listTrackedEntries(rootDirectory, revision) {
  if (revision !== undefined) {
    const treeId = resolveTree(rootDirectory, revision);
    return parseGitEntries(gitBuffer(rootDirectory, ["ls-tree", "--full-tree", "-r", "-z", treeId]), true);
  }
  return parseGitEntries(gitBuffer(rootDirectory, ["ls-files", "-s", "-z"]), false);
}

function isText(blob) {
  return !blob.includes(0);
}

function readBlob(rootDirectory, objectId) {
  return gitBuffer(rootDirectory, ["cat-file", "blob", objectId]);
}

// Reads the raw commit object rather than a "git log" format, which is already a
// transformed view subject to mailmap and encoding rules.
//
// Only the message body is scanned. Author and committer headers are inherent Git identity
// that cannot be removed from a commit, so flagging them would make every repository
// unpublishable. The finding carries the commit id alone, never the offending text.
// Headers excluded from scanning, and why each one is safe to skip:
//   tree, parent  object ids, no authored text
//   author,       inherent Git identity. It can be rewritten, but every commit carries an
//   committer     address by design, so flagging it would fail any repository.
//   gpgsig        machine-generated base64 that carries no authored text and would only
//                 produce chance matches.
// Everything else, including mergetag and encoding, is scanned along with the body.
const inertCommitHeaders = new Set(["tree", "parent", "author", "committer", "gpgsig"]);

function commitScannableText(raw) {
  const headerEnd = raw.search(/\r?\n\r?\n/);
  const headerBlock = headerEnd === -1 ? raw : raw.slice(0, headerEnd);
  const body = headerEnd === -1 ? "" : raw.slice(headerEnd).replace(/^\r?\n\r?\n/, "");
  const scannableHeaders = [];
  let currentHeader = "";
  for (const line of headerBlock.split(/\r?\n/)) {
    // A leading space continues the previous header across lines.
    if (!line.startsWith(" ")) currentHeader = line.split(" ", 1)[0];
    if (!inertCommitHeaders.has(currentHeader)) scannableHeaders.push(line);
  }
  return [...scannableHeaders, body].join("\n");
}

function scanCommitMessage(rootDirectory, revision) {
  let raw;
  try {
    raw = gitBuffer(rootDirectory, ["cat-file", "commit", revision]).toString("utf8");
  } catch {
    // A repository with no commits yet has nothing to scan.
    return [];
  }
  const violations = scanEntries([{ path: "COMMIT_MESSAGE", text: commitScannableText(raw) }]);
  return violations.length > 0 ? [{ category: "commit_metadata", path: revision }] : [];
}

export function scanTrackedRepository(rootDirectory, revision, { history = false } = {}) {
  if (history && (typeof revision !== "string" || revision.trim().length === 0)) {
    return [finding("scan_error", ".")];
  }
  const findings = [];
  let repositoryRoot;
  let entries;
  try {
    repositoryRoot = resolveRepositoryRoot(rootDirectory);
    entries = listTrackedEntries(repositoryRoot, revision);
  } catch {
    return [finding("scan_error", ".")];
  }
  // Defaults to HEAD so a local run catches a bad commit message too, rather than leaving
  // it to the history loop in CI.
  findings.push(...scanCommitMessage(repositoryRoot, revision ?? "HEAD"));

  for (const entry of entries) {
    // Matched against the raw Git path: any lossy transformation here would let a
    // distinct file collide with an allowlisted entry and inherit its permission.
    if (!history && !publicFileSet.has(entry.path)) {
      findings.push(finding("unexpected_tracked_file", entry.path, isConfigurationPath(normalizePath(entry.path))));
    }
    const pathFindings = scanEntries([{ path: entry.path, text: "" }], { history });
    if (pathFindings.length > 0) {
      findings.push(...pathFindings);
      continue;
    }
    if (entry.mode === "120000") {
      findings.push(finding("symlink_file", entry.path));
      continue;
    }
    if (entry.mode === "160000") {
      findings.push(finding("unsupported_git_object", entry.path));
      continue;
    }
    try {
      const blob = readBlob(repositoryRoot, entry.objectId);
      if (!isText(blob)) {
        findings.push(finding("non_text_file", entry.path));
        continue;
      }
      findings.push(...scanEntries([{
        path: entry.path,
        text: blob.toString("utf8"),
      }], { history }));
    } catch {
      findings.push(finding("unreadable_file", entry.path));
    }
  }
  return findings;
}

function formatFinding(finding) {
  return `${finding.category}:${JSON.stringify(finding.path)}`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const argumentsList = process.argv.slice(2);
    const history = argumentsList[0] === "--history";
    const revisions = history ? argumentsList.slice(1) : argumentsList;
    if (revisions.length > 1 || (history && revisions.length !== 1)) throw new Error("invalid arguments");
    const findings = scanTrackedRepository(process.cwd(), revisions[0], { history });
    if (findings.length > 0) {
      console.error(findings.some((item) => item.category === "scan_error")
        ? "scan_error"
        : findings.map(formatFinding).join("\n"));
      process.exitCode = 1;
    }
  } catch {
    console.error("scan_error");
    process.exitCode = 1;
  }
}

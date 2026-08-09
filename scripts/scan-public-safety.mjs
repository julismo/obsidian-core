import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const publicFiles = Object.freeze([
  ".github/workflows/ci.yml",
  ".gitignore",
  "0 - Knowledge Base/README.md",
  "0 - Knowledge Base/Example Knowledge Note.md",
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
  "package-lock.json",
  "package.json",
  "scripts/scan-public-safety.mjs",
  "scripts/scan-public-safety.node-test.mjs",
  "scripts/verify-starter.mjs",
  "scripts/verify-starter.node-test.mjs",
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
  ["prohibited_brand", prohibitedBrandPattern],
];
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

function safePresentationPath(entryPath) {
  const safePath = redactSensitiveText(normalizePath(entryPath));
  return safePath.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, (character) => {
    return `\\u${character.codePointAt(0).toString(16).padStart(4, "0")}`;
  });
}

function finding(category, entryPath, redactPath = false) {
  return { category, path: redactPath ? redactedSpan : safePresentationPath(entryPath) };
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

export function scanEntries(entries) {
  const findings = [];
  for (const entry of entries) {
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
    for (const [category, ...patterns] of contentRules) {
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

export function scanTrackedRepository(rootDirectory, revision) {
  const findings = [];
  let repositoryRoot;
  let entries;
  try {
    repositoryRoot = resolveRepositoryRoot(rootDirectory);
    entries = listTrackedEntries(repositoryRoot, revision);
  } catch {
    return [finding("scan_error", ".")];
  }

  for (const entry of entries) {
    if (!publicFileSet.has(normalizePath(entry.path))) {
      findings.push(finding("unexpected_tracked_file", entry.path, isConfigurationPath(normalizePath(entry.path))));
    }
    const pathFindings = scanEntries([{ path: entry.path, text: "" }]);
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
      }]));
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
    const revisions = process.argv.slice(2);
    if (revisions.length > 1) throw new Error("too many arguments");
    const findings = scanTrackedRepository(process.cwd(), revisions[0]);
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

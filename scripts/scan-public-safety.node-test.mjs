import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as scanner from "./scan-public-safety.mjs";

const { scanEntries, scanTrackedRepository } = scanner;

const scannerPath = fileURLToPath(new URL("./scan-public-safety.mjs", import.meta.url));

function classicCredentialCandidate() {
  return ["gh", "p_", "abcdefghijklmnopqrstuvwxyz1234567890"].join("");
}

function genericCredentialCandidate() {
  return ["sk-", "abcdefghijklmnopqrstuvwxyz1234567890"].join("");
}

function longLivedCloudCredentialCandidate() {
  return ["AKIA", "1234567890ABCDEF"].join("");
}

function temporaryCloudCredentialCandidate() {
  return ["ASIA", "1234567890ABCDEF"].join("");
}

function fineGrainedCredentialCandidate() {
  return [["git", "hub"].join(""), "_pat_", "11_abcdefghijklmnopqrstuvwxyz1234567890"].join("");
}

function additionalCredentialCandidates() {
  return [
    ["xox", "b-", "123456789012", "-", "abcdefghijklmnopqrstuvwxyz"].join(""),
    ["gl", "pat-", "abcdefghijklmnopqrstuvwxyz"].join(""),
    ["npm", "_", "abcdefghijklmnopqrstuvwxyz1234567890"].join(""),
  ];
}

function credentialCandidates() {
  return [
    classicCredentialCandidate(),
    fineGrainedCredentialCandidate(),
    genericCredentialCandidate(),
    longLivedCloudCredentialCandidate(),
    temporaryCloudCredentialCandidate(),
    ...additionalCredentialCandidates(),
  ];
}

function externalSymlinkTarget() {
  return ["C", ":", "/external/target.txt"].join("");
}

function prohibitedBrandCandidates() {
  // Only the author's own company remains blocked. It is a boundary, not a brand rule.
  return [["Tr", "ion"].join("")];
}

function toolNamesThatMustBeWritable() {
  return [["Open", "AI"].join(""), ["Anth", "ropic"].join(""), ["Clau", "de"].join("")];
}

function brandCaseVariants() {
  return prohibitedBrandCandidates().flatMap((brand) => [
    brand,
    brand.toLowerCase(),
    brand.toUpperCase(),
    [...brand].map((character, index) => (
      index % 2 === 0 ? character.toLowerCase() : character.toUpperCase()
    )).join(""),
  ]);
}

function git(rootDirectory, args) {
  return execFileSync("git", ["-C", rootDirectory, ...args], { encoding: "utf8" });
}

function withRepository(callback) {
  const rootDirectory = mkdtempSync(path.join(os.tmpdir(), "obsidian-public-safety-"));
  try {
    git(rootDirectory, ["init", "-q"]);
    git(rootDirectory, ["config", "core.autocrlf", "false"]);
    git(rootDirectory, ["config", "user.email", ["scanner", "example.test"].join("@")]);
    git(rootDirectory, ["config", "user.name", "Scanner Test"]);
    return callback(rootDirectory);
  } finally {
    rmSync(rootDirectory, { force: true, recursive: true });
  }
}

function stage(rootDirectory, relativePath) {
  git(rootDirectory, ["add", "--", relativePath]);
}

function writeBlob(rootDirectory, text) {
  return execFileSync("git", ["-C", rootDirectory, "hash-object", "-w", "--stdin"], {
    encoding: "utf8",
    input: text,
  }).trim();
}

function stageBlob(rootDirectory, mode, relativePath, text) {
  const objectId = writeBlob(rootDirectory, text);
  stageObject(rootDirectory, mode, relativePath, objectId);
}

function stageObject(rootDirectory, mode, relativePath, objectId) {
  git(rootDirectory, ["update-index", "--add", "--cacheinfo", `${mode},${objectId},${relativePath}`]);
}

function createTree(rootDirectory, mode, relativePath, text) {
  const objectId = writeBlob(rootDirectory, text);
  const entry = Buffer.concat([
    Buffer.from(`${mode} blob ${objectId}\t`),
    Buffer.from(relativePath),
    Buffer.from([0]),
  ]);
  return execFileSync("git", ["-C", rootDirectory, "mktree", "-z"], {
    encoding: "utf8",
    input: entry,
  }).trim();
}

function createCommit(rootDirectory, treeId) {
  return execFileSync("git", ["-C", rootDirectory, "commit-tree", treeId, "-m", "synthetic tree commit"], {
    encoding: "utf8",
  }).trim();
}

function commit(rootDirectory, message) {
  git(rootDirectory, ["commit", "--allow-empty", "-qm", message]);
  return git(rootDirectory, ["rev-parse", "HEAD"]).trim();
}

function runCli(rootDirectory, ...revisions) {
  return spawnSync(process.execPath, [scannerPath, ...revisions], {
    cwd: rootDirectory,
    encoding: "utf8",
  });
}

test("exports the exact numbered-vault public document allowlist", () => {
  assert.deepEqual(scanner.publicFiles.filter((entry) => !entry.endsWith("/.gitkeep")), [
    ".github/CODEOWNERS",
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
    "THREAT-MODEL.md",
    "package-lock.json",
    "package.json",
    "scripts/scan-public-safety.mjs",
    "scripts/scan-public-safety.node-test.mjs",
    "scripts/verify-starter.mjs",
    "scripts/verify-starter.node-test.mjs",
  ]);
});

test("exports the exact structural directory mirror", () => {
  assert.deepEqual(scanner.structuralDirectories, [
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
});

test("allowlists exactly one placeholder per structural directory", () => {
  assert.deepEqual(
    scanner.publicFiles.filter((entry) => entry.endsWith("/.gitkeep")),
    scanner.structuralDirectories.map((directory) => `${directory}/.gitkeep`),
  );
});

// Names the guarantee accurately: this checks the mechanical rules only. Whether a folder
// name is a real client or person is a human review question that no regex can settle.
test("structural directories are plain ASCII and pass every mechanical rule", () => {
  for (const directory of scanner.structuralDirectories) {
    assert.deepEqual(scanEntries([{ path: `${directory}/.gitkeep`, text: "" }]), []);
    assert.match(directory, /^[0-9A-Za-z _.\-/]+$/);
  }
});

test("reports forbidden paths, attachments, and credential candidates without values", () => {
  const candidates = credentialCandidates();
  const findings = scanEntries([
    { path: [[".", "obsidian"].join(""), "workspace.json"].join("/"), text: "{}" },
    { path: ".env", text: "" },
    { path: "nested/.env.local", text: "" },
    { path: "node_modules/package/index.js", text: "" },
    { path: "attachment.PDF", text: "" },
    ...candidates.map((candidate, index) => ({
      path: `credential-${index}.md`,
      text: candidate,
    })),
  ]);
  assert.deepEqual(findings, [
    { category: "configuration_path", path: "[REDACTED]" },
    { category: "forbidden_path", path: ".env" },
    { category: "forbidden_path", path: "nested/.env.local" },
    { category: "forbidden_path", path: "node_modules/package/index.js" },
    { category: "forbidden_attachment", path: "attachment.PDF" },
    ...candidates.map((candidate, index) => ({
      category: "credential_candidate",
      path: `credential-${index}.md`,
    })),
  ]);
  for (const candidate of candidates) {
    assert.equal(JSON.stringify(findings).includes(candidate), false);
  }
});

test("rejects common archive, audio, video, document, and image attachments", () => {
  const attachmentExtensions = [
    "7z", "aac", "avi", "avif", "bmp", "bz2", "doc", "docx", "epub", "flac", "gif",
    "gz", "heic", "ico", "jpeg", "jpg", "m4a", "m4v", "mkv", "mov", "mp3", "mp4",
    "odp", "ods", "odt", "ogg", "pdf", "png", "ppt", "pptx", "rar", "rtf", "svg",
    "tar", "tif", "tiff", "wav", "webm", "webp", "xls", "xlsx", "xz", "zip",
  ];
  const findings = scanEntries([
    ...attachmentExtensions.map((extension) => ({
      path: `attachments/example.${extension}`,
      text: "text fixture",
    })),
    { path: "README.md", text: "normal Markdown" },
    { path: "package.json", text: "{}" },
    { path: "scripts/check.mjs", text: "export {};" },
    { path: ".github/workflows/ci.yml", text: "name: CI" },
  ]);

  assert.deepEqual(
    findings,
    attachmentExtensions.map((extension) => ({
      category: "forbidden_attachment",
      path: `attachments/example.${extension}`,
    })),
  );
});

test("detects credential-shaped paths while returning only redacted presentation paths", () => {
  const candidates = credentialCandidates().slice(0, 3);
  const attachmentPath = ["attachment-", candidates[0], ".png"].join("");
  const findings = scanEntries([
    ...candidates.map((candidate, index) => ({
      path: ["credential-", String(index), "-", candidate, ".md"].join(""),
      text: "",
    })),
    { path: attachmentPath, text: "" },
  ]);

  assert.deepEqual(findings.map((finding) => finding.category), [
    "credential_candidate",
    "credential_candidate",
    "credential_candidate",
    "forbidden_attachment",
  ]);
  assert.deepEqual(findings.map((finding) => finding.path), [
    "credential-0-[REDACTED].md",
    "credential-1-[REDACTED].md",
    "credential-2-[REDACTED].md",
    "attachment-[REDACTED].png",
  ]);
  for (const candidate of candidates) {
    assert.equal(JSON.stringify(findings).includes(candidate), false);
  }
});

test("detects nested configuration and plugin paths in tracked text", () => {
  const candidates = [
    ["notes", [".", "obsidian"].join(""), "plugins", "sample", "main.js"].join("/"),
    ["home", [".", "config"].join(""), "sample", "settings.json"].join("/"),
    ["nested", "plugins", "sample", "manifest.json"].join("/"),
  ];
  const findings = scanEntries(candidates.map((candidate, index) => ({
    path: `note-${index}.md`,
    text: `Local path: ${candidate}`,
  })));

  assert.deepEqual(findings, candidates.map((candidate, index) => ({
    category: "configuration_path",
    path: `note-${index}.md`,
  })));
});

test("detects configuration markers after prose, whitespace, and comments", () => {
  const markers = [
    [[".", "obsidian"].join(""), "workspace.json"].join("/"),
    [[".", "config"].join(""), "sample", "settings.json"].join("/"),
    ["plugins", "sample", "main.js"].join("/"),
  ];
  const entries = [
    { path: "README.md", text: `Local state: ${markers[0]}` },
    { path: "CONTRIBUTING.md", text: `\t${markers[1]}` },
    { path: ".gitignore", text: `# local state ${markers[2]}\n` },
  ];
  const findings = scanEntries(entries);

  assert.deepEqual(findings, entries.map((entry) => ({
    category: "configuration_path",
    path: entry.path,
  })));
  const serialized = JSON.stringify(findings);
  for (const marker of markers) assert.equal(serialized.includes(marker), false);
});

test("does not treat configuration-like ordinary words as paths", () => {
  const ordinaryText = ["micro", ".", "obsidian", "ized and plugins are optional"].join("");
  assert.deepEqual(scanEntries([{ path: "README.md", text: ordinaryText }]), []);
});

test("does not treat terminal singular or plural plugin prose as paths", () => {
  const entries = [
    { path: "README.md", text: ["This sentence ends with a ", "plugin"].join("") },
    { path: "CONTRIBUTING.md", text: ["This sentence ends with ", "plugins"].join("") },
  ];
  assert.deepEqual(scanEntries(entries), []);
});

test("redacts direct configuration and plugin paths", () => {
  const candidates = [
    ["nested", [".", "obsidian"].join(""), "plugins", "sample", "main.js"].join("/"),
    ["nested", [".", "config"].join(""), "sample", "settings.json"].join("/"),
    ["nested", "plugins", "sample", "manifest.json"].join("/"),
  ];
  const findings = scanEntries(candidates.map((candidate) => ({ path: candidate, text: "" })));

  assert.deepEqual(findings, candidates.map(() => ({
    category: "configuration_path",
    path: "[REDACTED]",
  })));
  const serialized = JSON.stringify(findings);
  for (const candidate of candidates) assert.equal(serialized.includes(candidate), false);
});

test("shared redaction removes configuration and plugin paths", () => {
  const candidates = [
    ["nested", [".", "obsidian"].join(""), "workspace.json"].join("/"),
    ["nested", "plugins", "sample", "main.js"].join("/"),
  ];
  for (const candidate of candidates) {
    assert.equal(scanner.redactSensitiveText(candidate), "[REDACTED]");
  }
});

test("allows only canonical local-state ignore rules", () => {
  const canonicalRules = [
    [[".", "obsidian"].join(""), ""].join("/"),
    ".DS_Store",
    "Thumbs.db",
    "*.log",
    ".env",
    "node_modules/",
  ];
  assert.deepEqual(scanEntries([{
    path: ".gitignore",
    text: `${canonicalRules.join("\n")}\n`,
  }]), []);

  const nestedMarker = ["nested", [".", "obsidian"].join(""), "plugins", "sample"].join("/");
  assert.deepEqual(scanEntries([{
    path: ".gitignore",
    text: `${canonicalRules.join("\n")}\n${nestedMarker}/\n`,
  }]), [{ category: "configuration_path", path: ".gitignore" }]);
});

test("detects external URL, contact, and company boundary text", () => {
  const externalUrl = ["https", "://", "reference.example", "/page"].join("");
  const emailAddress = ["person", "example.com"].join("@");
  const telephone = ["+351", "912", "345", "678"].join(" ");
  const brands = brandCaseVariants();
  const findings = scanEntries([
    { path: "notes/url.md", text: externalUrl },
    { path: "email.md", text: emailAddress },
    { path: "telephone.md", text: telephone },
    ...brands.map((brand, index) => ({ path: `brand-${index}.md`, text: brand })),
  ]);

  assert.deepEqual(findings, [
    { category: "external_url", path: "notes/url.md" },
    { category: "contact_data", path: "email.md" },
    { category: "contact_data", path: "telephone.md" },
    ...brands.map((brand, index) => ({
      category: "company_boundary",
      path: `brand-${index}.md`,
    })),
  ]);
  const serialized = JSON.stringify(findings);
  for (const candidate of [externalUrl, emailAddress, telephone, ...brands]) {
    assert.equal(serialized.includes(candidate), false);
  }
});

test("tool and vendor names are writable, so method notes can name what they use", () => {
  const names = toolNamesThatMustBeWritable();
  assert.deepEqual(scanEntries(names.map((name, index) => ({
    path: `tool-${index}.md`,
    text: `This workflow runs on ${name} and that is worth saying plainly.`,
  }))), []);
});

test("root documentation may cite sources, vault notes may not", () => {
  const citation = ["https", "://", "reference.example", "/article"].join("");
  const documents = ["README.md", "CONTRIBUTING.md", "SECURITY.md", "STRUCTURE.md", "THREAT-MODEL.md"];
  assert.deepEqual(scanEntries(documents.map((path) => ({ path, text: `See ${citation}.` }))), []);
  assert.deepEqual(scanEntries([{ path: "0 - Knowledge Base/note.md", text: `See ${citation}.` }]), [
    { category: "external_url", path: "0 - Knowledge Base/note.md" },
  ]);
});

test("the citation exemption never admits a credentialed, private, or non-web URL", () => {
  const unsafe = [
    ["https", "://", "user:secret", "@", "host.example", "/x"].join(""),
    ["https", "://", "localhost", ":8080/admin"].join(""),
    ["https", "://", "192.168", ".1.20", "/share"].join(""),
    ["https", "://", "wiki.internal", "/runbook"].join(""),
    ["file", "://", "/vault/private"].join(""),
  ];
  // Blocked in the exempt documents too, which is what keeps the exemption honest.
  const findings = scanEntries(unsafe.map((value, index) => ({
    path: index % 2 === 0 ? "README.md" : "STRUCTURE.md",
    text: `Reference: ${value}`,
  })));
  assert.equal(findings.length, unsafe.length);
  assert.equal(findings.every((item) => item.category === "unsafe_url"), true);
  const serialized = JSON.stringify(findings);
  for (const value of unsafe) assert.equal(serialized.includes(value), false);
});

test("detects internal filesystem paths in tracked paths and content", () => {
  const BS = String.fromCharCode(92);
  const candidates = [
    ["C", ":", `${BS}dev${BS}vault${BS}private-note.md`].join(""),
    ["D", ":", "/backup/vault"].join(""),
    ["C", ":", `Users${BS}operator${BS}vault`].join(""),
    ["~", "/vault/private"].join(""),
    ["/", "home", "/operator/vault"].join(""),
    ["/", "Users", "/operator/Documents/vault"].join(""),
    ["/", "mnt", "/c/dev/vault"].join(""),
    ["/", "Volumes", "/Backup/vault"].join(""),
    ["/", "private", "/", "var", "/folders/vault"].join(""),
    ["/", "var", "/", "data/vault"].join(""),
    ["/", "workspace", "/vault"].join(""),
  ];
  const findings = scanEntries(candidates.map((candidate, index) => ({
    path: `internal-${index}.md`,
    text: `Synced from ${candidate} last night.`,
  })));

  assert.deepEqual(findings, candidates.map((candidate, index) => ({
    category: "internal_path",
    path: `internal-${index}.md`,
  })));
  const serialized = JSON.stringify(findings);
  for (const candidate of candidates) assert.equal(serialized.includes(candidate), false);
});

test("redacts internal filesystem paths instead of echoing them", () => {
  const BS = String.fromCharCode(92);
  const candidate = ["C", ":", `${BS}dev${BS}vault`].join("");
  assert.equal(scanner.redactSensitiveText(`from ${candidate} here`), "from [REDACTED] here");
  assert.deepEqual(scanEntries([{ path: "note.md", text: `Synced from ${candidate} today.` }]), [
    { category: "internal_path", path: "note.md" },
  ]);
});

test("does not treat ordinary prose colons or root-relative links as internal paths", () => {
  assert.deepEqual(scanEntries([
    { path: "README.md", text: "Structure: see the index folder for navigation." },
    { path: "CONTRIBUTING.md", text: "Ratio 3:4 and a note about optional extras." },
  ]), []);
});

const BACKSLASH = String.fromCharCode(92);

test("rejects a raw Git path that would collapse onto an allowlisted path", () => {
  // A literal backslash is legal in a Linux filename, so this is a DIFFERENT file from
  // the allowlisted "0 - Knowledge Base/README.md". It must never inherit its permission.
  const collided = `0 - Knowledge Base${BACKSLASH}README.md`;
  assert.deepEqual(scanEntries([{ path: collided, text: "private client prose\n" }]), [
    { category: "malformed_path", path: collided },
  ]);
});

test("never treats a backslash path as allowlisted in a tracked repository", () => {
  withRepository((rootDirectory) => {
    // Written through mktree because Git for Windows rejects such a path in the index,
    // while the Linux runner used by CI accepts it. The scanner must reject it on both.
    const collided = `0 - Knowledge Base${BACKSLASH}README.md`;
    const treeId = createTree(rootDirectory, "100644", collided, "private client prose\n");
    const revision = createCommit(rootDirectory, treeId);

    assert.deepEqual(scanTrackedRepository(rootDirectory, revision), [
      { category: "unexpected_tracked_file", path: collided },
      { category: "malformed_path", path: collided },
    ]);
  });
});

// Guards the assumption that makes decoding safe. While every allowlisted path is ASCII,
// byte-exact and text-exact comparison are equivalent, so no test can demonstrate a bypass.
// If a non-ASCII path is ever allowlisted, this fails and forces the decode question to be
// answered deliberately rather than inherited.
test("every allowlisted path is ASCII, so decoding cannot fold two paths together", () => {
  for (const entry of scanner.publicFiles) {
    assert.match(entry, /^[\x20-\x7e]+$/, `${entry} is not ASCII`);
  }
});

test("rejects a tracked path whose bytes are not valid UTF-8", () => {
  withRepository((rootDirectory) => {
    const invalid = Buffer.from([0x66, 0x69, 0x6c, 0x65, 0xff, 0xfe, 0x2e, 0x6d, 0x64]);
    const objectId = execFileSync("git", ["-C", rootDirectory, "hash-object", "-w", "--stdin"], {
      encoding: "utf8",
      input: "clean text\n",
    }).trim();
    const entry = Buffer.concat([
      Buffer.from(`100644 blob ${objectId}\t`),
      invalid,
      Buffer.from([0]),
    ]);
    const treeId = execFileSync("git", ["-C", rootDirectory, "mktree", "-z"], {
      encoding: "utf8",
      input: entry,
    }).trim();
    const revision = createCommit(rootDirectory, treeId);

    const findings = scanTrackedRepository(rootDirectory, revision);
    assert.equal(findings.some((item) => item.category === "unexpected_tracked_file"), true);
  });
});

test("keeps every other path-confusion class flagged by exact matching", () => {
  const variants = [
    "0 - Knowledge Base//README.md",
    "0 - Knowledge Base/./README.md",
    "0 - Knowledge Base/README.md ",
    "0 - knowledge base/readme.md",
    "/0 - Knowledge Base/README.md",
  ];
  for (const variant of variants) {
    assert.equal(scanner.publicFiles.includes(variant), false, `${variant} must not be allowlisted`);
  }
});

test("scans commit messages, which blobs alone would never reveal", () => {
  withRepository((rootDirectory) => {
    writeFileSync(path.join(rootDirectory, "README.md"), "clean content\n");
    stage(rootDirectory, "README.md");
    const emailAddress = ["author", "example.com"].join("@");
    const revision = commit(rootDirectory, `chore: tidy\n\nCo-Authored-By: Someone <${emailAddress}>\n`);

    const findings = scanTrackedRepository(rootDirectory, revision, { history: true });
    assert.deepEqual(findings, [{ category: "commit_metadata", path: revision }]);
    assert.equal(JSON.stringify(findings).includes(emailAddress), false);
  });
});

test("scans the checked out commit message without an explicit revision", () => {
  withRepository((rootDirectory) => {
    writeFileSync(path.join(rootDirectory, "README.md"), "clean content\n");
    stage(rootDirectory, "README.md");
    const emailAddress = ["author", "example.com"].join("@");
    commit(rootDirectory, `chore: tidy\n\nReported by <${emailAddress}>\n`);

    const findings = scanTrackedRepository(rootDirectory);
    assert.equal(findings.some((item) => item.category === "commit_metadata"), true);
    assert.equal(JSON.stringify(findings).includes(emailAddress), false);
  });
});

test("scans commit headers that carry authored text, not just the body", () => {
  withRepository((rootDirectory) => {
    writeFileSync(path.join(rootDirectory, "README.md"), "clean content\n");
    stage(rootDirectory, "README.md");
    const base = commit(rootDirectory, "base");
    const externalUrl = ["https", "://", "example.test", "/leak"].join("");
    // An arbitrary header, the shape "mergetag" and "encoding" take.
    const raw = [
      `tree ${git(rootDirectory, ["rev-parse", `${base}^{tree}`]).trim()}`,
      // Split so this file does not itself contain a ten digit run, which the compact
      // telephone rule would flag when the scanner reads its own tests.
      `author Test <t@example.test> ${["17", "000", "00000"].join("")} +0000`,
      `committer Test <t@example.test> ${["17", "000", "00000"].join("")} +0000`,
      `note ${externalUrl}`,
      "",
      "clean body",
      "",
    ].join("\n");
    const objectId = execFileSync("git", ["-C", rootDirectory, "hash-object", "-w", "-t", "commit", "--stdin"], {
      encoding: "utf8",
      input: raw,
    }).trim();

    assert.deepEqual(scanTrackedRepository(rootDirectory, objectId, { history: true }), [
      { category: "commit_metadata", path: objectId },
    ]);
  });
});

test("does not treat ratio notation as a drive-relative path", () => {
  assert.deepEqual(scanEntries([{ path: "note.md", text: "Mixed at a ratio of A:1 by volume." }]), []);
});

test("accepts a clean commit message and ignores inherent Git identity lines", () => {
  withRepository((rootDirectory) => {
    writeFileSync(path.join(rootDirectory, "README.md"), "clean content\n");
    stage(rootDirectory, "README.md");
    // The committer address is unavoidable Git metadata, so it must not be a finding.
    const revision = commit(rootDirectory, "feat: add a section\n\nA plain body with no policy violations.\n");

    assert.deepEqual(scanTrackedRepository(rootDirectory, revision, { history: true }), []);
  });
});

test("relaxes internal path detection only in history mode", () => {
  const entries = [{
    path: "note.md",
    text: `Synced from ${["C", ":", `${BACKSLASH}dev${BACKSLASH}vault`].join("")} last night.`,
  }];
  assert.deepEqual(scanEntries(entries), [{ category: "internal_path", path: "note.md" }]);
  assert.deepEqual(scanEntries(entries, { history: true }), []);
});

test("history mode relaxes internal paths while still reporting credentials", () => {
  withRepository((rootDirectory) => {
    const internalPath = ["C", ":", `${BACKSLASH}dev${BACKSLASH}vault${BACKSLASH}note.md`].join("");
    writeFileSync(path.join(rootDirectory, "README.md"), `Synced from ${internalPath}\n`);
    writeFileSync(path.join(rootDirectory, "SECURITY.md"), classicCredentialCandidate());
    stage(rootDirectory, "README.md");
    stage(rootDirectory, "SECURITY.md");
    const revision = commit(rootDirectory, "internal path and credential in history");

    assert.deepEqual(scanTrackedRepository(rootDirectory, revision), [
      { category: "internal_path", path: "README.md" },
      { category: "credential_candidate", path: "SECURITY.md" },
    ]);
    assert.deepEqual(scanTrackedRepository(rootDirectory, revision, { history: true }), [
      { category: "credential_candidate", path: "SECURITY.md" },
    ]);
  });
});

test("rejects a structural placeholder that carries content", () => {
  const directory = scanner.structuralDirectories[0];
  assert.deepEqual(scanEntries([{ path: `${directory}/.gitkeep`, text: "hidden private note\n" }]), [
    { category: "non_empty_placeholder", path: `${directory}/.gitkeep` },
  ]);
  assert.deepEqual(scanEntries([{ path: `${directory}/.gitkeep`, text: "" }]), []);
});

test("distinguishes conventional telephone formats from common numeric metadata", () => {
  const telephoneCandidates = [
    ["+351", "912", "345", "678"].join(" "),
    ["(212)", "555", "0123"].join(" "),
    ["020", "7946", "0958"].join(" "),
  ];
  const numericMetadata = [
    ["2026", "08", "09"].join("-"),
    ["24", "14", "0"].join("."),
    ["192", "0", "2", "1"].join("."),
  ];
  const findings = scanEntries([
    ...telephoneCandidates.map((candidate, index) => ({
      path: `telephone-${index}.md`,
      text: candidate,
    })),
    ...numericMetadata.map((candidate, index) => ({
      path: `metadata-${index}.md`,
      text: candidate,
    })),
  ]);

  assert.deepEqual(findings, telephoneCandidates.map((candidate, index) => ({
    category: "contact_data",
    path: `telephone-${index}.md`,
  })));
});

test("distinguishes compact telephones from ISO datetimes and numeric timezones", () => {
  const compactTelephones = [
    ["912", "345", "678"].join(""),
    ["212", "555", "0123"].join(""),
  ];
  const date = ["2026", "08", "09"].join("-");
  const time = ["12", "34", "56"].join(":");
  const benignMetadata = [
    [date, "T", time, "+", ["01", "00"].join(":")].join(""),
    [date, " ", time, " -", ["0800"].join("")].join(""),
    ["+", "0100"].join(""),
    ["-", "0800"].join(""),
  ];
  const findings = scanEntries([
    ...compactTelephones.map((candidate, index) => ({
      path: `compact-${index}.md`,
      text: candidate,
    })),
    ...benignMetadata.map((candidate, index) => ({
      path: `datetime-${index}.md`,
      text: candidate,
    })),
  ]);

  assert.deepEqual(findings, compactTelephones.map((candidate, index) => ({
    category: "contact_data",
    path: `compact-${index}.md`,
  })));
});

test("ignores reserved test contacts and brand fragments inside identifiers", () => {
  const reservedContact = ["scanner", "example.test"].join("@");
  const identifier = ["open", "Ai", "Candidate"].join("");
  assert.deepEqual(scanEntries([{
    path: "scripts/example.node-test.mjs",
    text: `${reservedContact}\nfunction ${identifier}() {}`,
  }]), []);
});

test("CLI redacts secret-shaped filenames in category/path output", () => {
  withRepository((rootDirectory) => {
    const candidate = classicCredentialCandidate();
    const relativePath = ["filename-", candidate, ".md"].join("");
    writeFileSync(path.join(rootDirectory, relativePath), "clean content");
    stage(rootDirectory, relativePath);

    const result = runCli(rootDirectory);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.deepEqual(result.stderr.split(/\r?\n/).filter(Boolean), [
      'unexpected_tracked_file:"filename-[REDACTED].md"',
      'credential_candidate:"filename-[REDACTED].md"',
    ]);
    assert.equal(result.stderr.includes(candidate), false);
  });
});

test("scans staged blob content instead of a clean working tree", () => {
  withRepository((rootDirectory) => {
    const relativePath = "README.md";
    writeFileSync(path.join(rootDirectory, relativePath), classicCredentialCandidate());
    stage(rootDirectory, relativePath);
    writeFileSync(path.join(rootDirectory, relativePath), "clean working tree");

    assert.deepEqual(scanTrackedRepository(rootDirectory), [
      { category: "credential_candidate", path: relativePath },
    ]);
  });
});

test("CLI scans the full repository from a nested directory in index and historical modes", () => {
  withRepository((rootDirectory) => {
    const nestedDirectory = path.join(rootDirectory, "nested");
    const relativePath = "README.md";
    mkdirSync(nestedDirectory);
    writeFileSync(path.join(nestedDirectory, "marker.md"), "clean");
    writeFileSync(path.join(rootDirectory, relativePath), classicCredentialCandidate());
    stage(rootDirectory, relativePath);

    const indexResult = runCli(nestedDirectory);
    assert.equal(indexResult.status, 1);
    assert.equal(indexResult.stdout, "");
    assert.deepEqual(indexResult.stderr.split(/\r?\n/).filter(Boolean), [
      'credential_candidate:"README.md"',
    ]);

    const secretRevision = commit(rootDirectory, "secret outside nested directory");
    writeFileSync(path.join(rootDirectory, relativePath), "clean current content");
    stage(rootDirectory, relativePath);
    commit(rootDirectory, "clean current");

    const historyResult = runCli(nestedDirectory, secretRevision);
    assert.equal(historyResult.status, 1);
    assert.equal(historyResult.stdout, "");
    assert.deepEqual(historyResult.stderr.split(/\r?\n/).filter(Boolean), [
      'credential_candidate:"README.md"',
    ]);
  });
});

test("parses unusual tracked paths and serializes CLI output to one safe line", () => {
  withRepository((rootDirectory) => {
    const relativePath = ["r\u00e9sum\u00e9", "\n", "entry.md"].join("");
    const presentationPath = "r\u00e9sum\u00e9\\u000aentry.md";
    const treeId = createTree(rootDirectory, "100644", relativePath, classicCredentialCandidate());
    const revision = createCommit(rootDirectory, treeId);

    assert.deepEqual(scanTrackedRepository(rootDirectory, revision), [
      { category: "unexpected_tracked_file", path: presentationPath },
      { category: "credential_candidate", path: presentationPath },
    ]);

    const result = runCli(rootDirectory, revision);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.deepEqual(result.stderr.split(/\r?\n/).filter(Boolean), [
      `unexpected_tracked_file:${JSON.stringify(presentationPath)}`,
      `credential_candidate:${JSON.stringify(presentationPath)}`,
    ]);
    assert.equal(result.stderr.includes(classicCredentialCandidate()), false);
  });
});

test("rejects standalone subtree revisions instead of scanning a clean subset", () => {
  withRepository((rootDirectory) => {
    const nestedDirectory = path.join(rootDirectory, "nested");
    mkdirSync(nestedDirectory);
    writeFileSync(path.join(rootDirectory, "root.md"), classicCredentialCandidate());
    writeFileSync(path.join(nestedDirectory, "clean.md"), "clean nested content");
    stage(rootDirectory, "root.md");
    stage(rootDirectory, "nested/clean.md");
    const revision = commit(rootDirectory, "root candidate with clean subtree");
    const subtreeId = git(rootDirectory, ["rev-parse", `${revision}:nested`]).trim();

    assert.deepEqual(scanTrackedRepository(rootDirectory, subtreeId), [
      { category: "scan_error", path: "." },
    ]);

    const result = runCli(rootDirectory, subtreeId);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "scan_error\n");
  });
});

test("rejects tracked symlink index entries without reading their targets", () => {
  withRepository((rootDirectory) => {
    const relativePath = "README.md";
    stageBlob(rootDirectory, "120000", relativePath, externalSymlinkTarget());

    assert.deepEqual(scanTrackedRepository(rootDirectory), [
      { category: "symlink_file", path: relativePath },
    ]);
  });
});

test("reports current and historical symlink modes from Git metadata", () => {
  withRepository((rootDirectory) => {
    const relativePath = "README.md";
    stageBlob(rootDirectory, "120000", relativePath, externalSymlinkTarget());
    assert.deepEqual(scanTrackedRepository(rootDirectory), [
      { category: "symlink_file", path: relativePath },
    ]);

    const revision = commit(rootDirectory, "tracked symlink");
    assert.deepEqual(scanTrackedRepository(rootDirectory, revision), [
      { category: "symlink_file", path: relativePath },
    ]);
  });
});

test("reports gitlinks, binary blobs, and missing blobs by category and path only", () => {
  withRepository((rootDirectory) => {
    const emptyCommit = commit(rootDirectory, "empty base");
    stageBlob(rootDirectory, "100644", "README.md", Buffer.from([0, 1, 2]));
    stageObject(rootDirectory, "160000", "package.json", emptyCommit);
    stageObject(rootDirectory, "100644", "SECURITY.md", "1".repeat(40));

    assert.deepEqual(scanTrackedRepository(rootDirectory), [
      { category: "non_text_file", path: "README.md" },
      { category: "unreadable_file", path: "SECURITY.md" },
      { category: "unsupported_git_object", path: "package.json" },
    ]);
  });
});

test("scans an explicit historical revision through Git objects", () => {
  withRepository((rootDirectory) => {
    const relativePath = "README.md";
    writeFileSync(path.join(rootDirectory, relativePath), classicCredentialCandidate());
    stage(rootDirectory, relativePath);
    const historicalRevision = commit(rootDirectory, "secret history");
    writeFileSync(path.join(rootDirectory, relativePath), "clean current revision");
    stage(rootDirectory, relativePath);
    commit(rootDirectory, "clean current");

    assert.deepEqual(scanTrackedRepository(rootDirectory, historicalRevision), [
      { category: "credential_candidate", path: relativePath },
    ]);

    const result = runCli(rootDirectory, historicalRevision);
    assert.equal(result.status, 1);
    assert.deepEqual(result.stderr.split(/\r?\n/).filter(Boolean), [
      `credential_candidate:${JSON.stringify(relativePath)}`,
    ]);
  });
});

test("ignores replacement refs when scanning committed Git objects", () => {
  withRepository((rootDirectory) => {
    const relativePath = "README.md";
    writeFileSync(path.join(rootDirectory, relativePath), classicCredentialCandidate());
    stage(rootDirectory, relativePath);
    const revision = commit(rootDirectory, "secret original");
    const originalBlob = git(rootDirectory, ["rev-parse", `${revision}:${relativePath}`]).trim();
    const cleanBlob = writeBlob(rootDirectory, "clean replacement");
    git(rootDirectory, ["replace", originalBlob, cleanBlob]);

    assert.deepEqual(scanTrackedRepository(rootDirectory, revision), [
      { category: "credential_candidate", path: relativePath },
    ]);
  });
});

test("CLI exits zero without findings and one without secret values when findings exist", () => {
  withRepository((rootDirectory) => {
    writeFileSync(path.join(rootDirectory, "README.md"), "safe content");
    stage(rootDirectory, "README.md");
    const cleanResult = runCli(rootDirectory);
    assert.equal(cleanResult.status, 0);
    assert.equal(cleanResult.stdout, "");
    assert.equal(cleanResult.stderr, "");

    writeFileSync(path.join(rootDirectory, "README.md"), classicCredentialCandidate());
    stage(rootDirectory, "README.md");
    writeFileSync(path.join(rootDirectory, "README.md"), "clean working tree");
    const findingResult = runCli(rootDirectory);
    assert.equal(findingResult.status, 1);
    assert.equal(findingResult.stdout, "");
    assert.deepEqual(findingResult.stderr.split(/\r?\n/).filter(Boolean), [
      'credential_candidate:"README.md"',
    ]);
    assert.equal(findingResult.stderr.includes(classicCredentialCandidate()), false);
  });
});

test("rejects an unexpected tracked file", () => {
  withRepository((rootDirectory) => {
    const relativePath = "unexpected.md";
    writeFileSync(path.join(rootDirectory, relativePath), "clean text");
    stage(rootDirectory, relativePath);

    assert.deepEqual(scanTrackedRepository(rootDirectory), [
      { category: "unexpected_tracked_file", path: relativePath },
    ]);
  });
});

test("history mode permits safe legacy paths while strict scanning rejects them", () => {
  withRepository((rootDirectory) => {
    const relativePath = "legacy-vault/old-note.md";
    mkdirSync(path.dirname(path.join(rootDirectory, relativePath)), { recursive: true });
    writeFileSync(path.join(rootDirectory, relativePath), "safe historical text");
    stage(rootDirectory, relativePath);
    const historicalRevision = commit(rootDirectory, "legacy vault path");

    assert.deepEqual(scanTrackedRepository(rootDirectory), [
      { category: "unexpected_tracked_file", path: relativePath },
    ]);
    assert.deepEqual(scanTrackedRepository(rootDirectory, historicalRevision), [
      { category: "unexpected_tracked_file", path: relativePath },
    ]);
    assert.deepEqual(scanTrackedRepository(rootDirectory, historicalRevision, { history: true }), []);

    const result = runCli(rootDirectory, "--history", historicalRevision);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
  });
});

test("history mode API rejects a missing revision without relaxing current-tree paths", () => {
  withRepository((rootDirectory) => {
    const relativePath = "legacy-vault/old-note.md";
    mkdirSync(path.dirname(path.join(rootDirectory, relativePath)), { recursive: true });
    writeFileSync(path.join(rootDirectory, relativePath), "safe current text");
    stage(rootDirectory, relativePath);

    assert.deepEqual(scanTrackedRepository(rootDirectory, undefined, { history: true }), [
      { category: "scan_error", path: "." },
    ]);
  });
});

test("history mode detects credential-shaped historical content without exposing it", () => {
  withRepository((rootDirectory) => {
    const relativePath = "legacy-vault/old-note.md";
    const credential = classicCredentialCandidate();
    mkdirSync(path.dirname(path.join(rootDirectory, relativePath)), { recursive: true });
    writeFileSync(path.join(rootDirectory, relativePath), credential);
    stage(rootDirectory, relativePath);
    const historicalRevision = commit(rootDirectory, "legacy credential");

    assert.deepEqual(scanTrackedRepository(rootDirectory, historicalRevision, { history: true }), [
      { category: "credential_candidate", path: relativePath },
    ]);

    const result = runCli(rootDirectory, "--history", historicalRevision);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.deepEqual(result.stderr.split(/\r?\n/).filter(Boolean), [
      `credential_candidate:${JSON.stringify(relativePath)}`,
    ]);
    assert.equal(result.stderr.includes(credential), false);
  });
});

test("scanner source and regression tests scan cleanly", () => {
  const testPath = fileURLToPath(import.meta.url);
  assert.deepEqual(scanEntries([
    { path: "scripts/scan-public-safety.mjs", text: readFileSync(scannerPath, "utf8") },
    { path: "scripts/scan-public-safety.node-test.mjs", text: readFileSync(testPath, "utf8") },
  ]), []);
});

test("scanner source contains no historical blob exemption", () => {
  const source = readFileSync(scannerPath, "utf8");
  assert.doesNotMatch(source, /knownSyntheticFixtureBlobs|knownSyntheticFixtureBlobs\.has/);
});

test("CLI rejects extra or invalid revision arguments without Git error details", () => {
  withRepository((rootDirectory) => {
    const extraArgumentResult = runCli(rootDirectory, "HEAD", "HEAD");
    const invalidRevisionResult = runCli(rootDirectory, "--invalid-revision");
    const missingHistoryRevisionResult = runCli(rootDirectory, "--history");
    const extraHistoryArgumentResult = runCli(rootDirectory, "--history", "HEAD", "HEAD");

    for (const result of [
      extraArgumentResult,
      invalidRevisionResult,
      missingHistoryRevisionResult,
      extraHistoryArgumentResult,
    ]) {
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "scan_error\n");
    }
  });
});

test("CLI reports a generic failure for a non-repository", () => {
  const rootDirectory = mkdtempSync(path.join(os.tmpdir(), "obsidian-public-safety-nonrepo-"));
  try {
    const result = runCli(rootDirectory);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "scan_error\n");
  } finally {
    rmSync(rootDirectory, { force: true, recursive: true });
  }
});

test("API returns a stable safe finding for non-repository and revision failures", () => {
  const nonRepository = mkdtempSync(path.join(os.tmpdir(), "obsidian-public-safety-api-nonrepo-"));
  try {
    assert.deepEqual(scanTrackedRepository(nonRepository), [
      { category: "scan_error", path: "." },
    ]);
  } finally {
    rmSync(nonRepository, { force: true, recursive: true });
  }

  withRepository((rootDirectory) => {
    assert.deepEqual(scanTrackedRepository(rootDirectory, "--invalid-revision"), [
      { category: "scan_error", path: "." },
    ]);
  });
});

test("centralized Git wrapper disables replacement objects and lazy fetches", () => {
  const source = readFileSync(scannerPath, "utf8");
  assert.equal(source.includes('"--no-replace-objects"'), true);
  assert.equal(source.includes('"--no-lazy-fetch"'), true);
  assert.equal(source.includes('"--full-tree"'), true);
});

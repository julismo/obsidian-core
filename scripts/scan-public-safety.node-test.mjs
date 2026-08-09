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

function prohibitedBrandCandidates() {
  return [
    ["Open", "AI"].join(""),
    ["Anth", "ropic"].join(""),
    ["Clau", "de"].join(""),
    ["Tr", "ion"].join(""),
  ];
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

test("exports the exact public file allowlist", () => {
  assert.deepEqual(scanner.publicFiles, [
    ".github/workflows/ci.yml",
    ".gitignore",
    "00 Inbox/README.md",
    "10 Projects/README.md",
    "20 Areas/README.md",
    "30 Resources/README.md",
    "40 Archive/README.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "README.md",
    "SECURITY.md",
    "Templates/Area.md",
    "Templates/Daily Note.md",
    "Templates/Note.md",
    "Templates/Project.md",
    "Templates/Resource.md",
    "package-lock.json",
    "package.json",
    "scripts/scan-public-safety.mjs",
    "scripts/scan-public-safety.node-test.mjs",
    "scripts/verify-starter.mjs",
    "scripts/verify-starter.node-test.mjs",
  ]);
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

test("detects external URL, contact, and prohibited brand text", () => {
  const externalUrl = ["https", "://", "example.test", "/reference"].join("");
  const emailAddress = ["person", "example.com"].join("@");
  const telephone = ["+351", "912", "345", "678"].join(" ");
  const brands = brandCaseVariants();
  const findings = scanEntries([
    { path: "url.md", text: externalUrl },
    { path: "email.md", text: emailAddress },
    { path: "telephone.md", text: telephone },
    ...brands.map((brand, index) => ({ path: `brand-${index}.md`, text: brand })),
  ]);

  assert.deepEqual(findings, [
    { category: "external_url", path: "url.md" },
    { category: "contact_data", path: "email.md" },
    { category: "contact_data", path: "telephone.md" },
    ...brands.map((brand, index) => ({
      category: "prohibited_brand",
      path: `brand-${index}.md`,
    })),
  ]);
  const serialized = JSON.stringify(findings);
  for (const candidate of [externalUrl, emailAddress, telephone, ...brands]) {
    assert.equal(serialized.includes(candidate), false);
  }
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
    stageBlob(rootDirectory, "120000", relativePath, "C:/external/target.txt");

    assert.deepEqual(scanTrackedRepository(rootDirectory), [
      { category: "symlink_file", path: relativePath },
    ]);
  });
});

test("reports current and historical symlink modes from Git metadata", () => {
  withRepository((rootDirectory) => {
    const relativePath = "README.md";
    stageBlob(rootDirectory, "120000", relativePath, "C:/external/target.txt");
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

    for (const result of [extraArgumentResult, invalidRevisionResult]) {
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

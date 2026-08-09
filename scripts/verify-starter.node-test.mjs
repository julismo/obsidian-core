import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { platform, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { requiredFiles, verifyStarter } from "./verify-starter.mjs";

function credentialCandidate() {
  return ["gh", "p_", "abcdefghijklmnopqrstuvwxyz1234567890"].join("");
}

function createFixture() {
  return mkdtempSync(join(tmpdir(), "obsidian-core-"));
}

function git(rootDirectory, args, options = {}) {
  return execFileSync("git", ["-C", rootDirectory, ...args], {
    encoding: "utf8",
    ...options,
  });
}

function initializeTrackedFixture(rootDirectory) {
  git(rootDirectory, ["init", "-q"]);
  git(rootDirectory, ["config", "core.autocrlf", "false"]);
  git(rootDirectory, ["config", "user.email", ["starter", "example.test"].join("@")]);
  git(rootDirectory, ["config", "user.name", "Starter Test"]);
  git(rootDirectory, ["add", "--", "."]);
}

function writeCompleteFixture(rootDirectory) {
  for (const relativePath of requiredFiles) {
    const target = join(rootDirectory, relativePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, relativePath.endsWith(".md") ? "# Fixture\n" : "", "utf8");
  }
}

test("accepts a complete starter fixture", () => {
  const rootDirectory = createFixture();
  try {
    writeCompleteFixture(rootDirectory);
    assert.deepEqual(verifyStarter(rootDirectory), []);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("rejects an unexpected tracked file", () => {
  const rootDirectory = createFixture();
  try {
    writeCompleteFixture(rootDirectory);
    writeFileSync(join(rootDirectory, "unexpected.md"), "# Unexpected\n", "utf8");
    initializeTrackedFixture(rootDirectory);
    assert.deepEqual(verifyStarter(rootDirectory), [
      "Unexpected tracked file: unexpected.md",
    ]);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("redacts an unexpected configuration path alongside invalid mode diagnostics", () => {
  const rootDirectory = createFixture();
  try {
    writeCompleteFixture(rootDirectory);
    const relativePath = ["nested", [".", "obsidian"].join(""), "plugins", "sample", "main.js"].join("/");
    const target = join(rootDirectory, relativePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, "clean text", "utf8");
    initializeTrackedFixture(rootDirectory);
    const objectId = git(rootDirectory, ["hash-object", "-w", "--stdin"], {
      input: "external target",
    }).trim();
    git(rootDirectory, [
      "update-index",
      "--add",
      "--cacheinfo",
      `120000,${objectId},Templates/Note.md`,
    ]);

    const errors = verifyStarter(rootDirectory);
    assert.equal(errors.includes("Invalid tracked file mode: Templates/Note.md"), true);
    assert.equal(errors.includes("Unexpected tracked file: [REDACTED]"), true);
    assert.equal(JSON.stringify(errors).includes(relativePath), false);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("rejects an untracked required file when Git tracking is available", () => {
  const rootDirectory = createFixture();
  try {
    writeCompleteFixture(rootDirectory);
    initializeTrackedFixture(rootDirectory);
    git(rootDirectory, ["rm", "--cached", "--", "Templates/Note.md"]);
    assert.deepEqual(verifyStarter(rootDirectory), [
      "Required file is not tracked: Templates/Note.md",
    ]);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("rejects a non-regular tracked mode for an allowed file", () => {
  const rootDirectory = createFixture();
  try {
    writeCompleteFixture(rootDirectory);
    initializeTrackedFixture(rootDirectory);
    const objectId = git(rootDirectory, ["hash-object", "-w", "--stdin"], {
      input: "external target",
    }).trim();
    git(rootDirectory, [
      "update-index",
      "--add",
      "--cacheinfo",
      `120000,${objectId},Templates/Note.md`,
    ]);
    assert.deepEqual(verifyStarter(rootDirectory), [
      "Invalid tracked file mode: Templates/Note.md",
    ]);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("fails closed when a Git repository index cannot be enumerated", () => {
  const rootDirectory = createFixture();
  try {
    writeCompleteFixture(rootDirectory);
    initializeTrackedFixture(rootDirectory);
    writeFileSync(join(rootDirectory, ".git", "index"), Buffer.from([0, 1, 2, 3]));
    assert.deepEqual(verifyStarter(rootDirectory), [
      "Git tracking validation failed",
    ]);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("reports a missing required template", () => {
  const rootDirectory = createFixture();
  try {
    writeCompleteFixture(rootDirectory);
    rmSync(join(rootDirectory, "Templates", "Note.md"));
    assert.deepEqual(verifyStarter(rootDirectory), ["Missing required file: Templates/Note.md"]);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("reports a broken relative Markdown link", () => {
  const rootDirectory = createFixture();
  try {
    writeCompleteFixture(rootDirectory);
    writeFileSync(join(rootDirectory, "README.md"), "[Missing](missing.md)\n", "utf8");
    assert.deepEqual(verifyStarter(rootDirectory), ["Broken relative link in README.md: missing.md"]);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("reports malformed URL encoding as a broken relative link", () => {
  const rootDirectory = createFixture();
  try {
    writeCompleteFixture(rootDirectory);
    writeFileSync(join(rootDirectory, "README.md"), "[Malformed](bad%2)\n", "utf8");
    assert.deepEqual(verifyStarter(rootDirectory), ["Broken relative link in README.md: bad%2"]);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("rejects a relative link that resolves outside the starter root", () => {
  const rootDirectory = createFixture();
  const outsideTarget = join(dirname(rootDirectory), `${basename(rootDirectory)}-private.md`);
  try {
    writeCompleteFixture(rootDirectory);
    writeFileSync(outsideTarget, "# Outside\n", "utf8");
    writeFileSync(join(rootDirectory, "README.md"), "[Outside](../" + basename(outsideTarget) + ")\n", "utf8");
    assert.deepEqual(verifyStarter(rootDirectory), [
      `Broken relative link in README.md: ../${basename(outsideTarget)}`,
    ]);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
    rmSync(outsideTarget, { force: true });
  }
});

test("escapes control characters in broken link errors", () => {
  const rootDirectory = createFixture();
  try {
    writeCompleteFixture(rootDirectory);
    writeFileSync(join(rootDirectory, "README.md"), "[Control](<bad\nname\u0000\u0085\u009b\u007f>)\n", "utf8");
    assert.deepEqual(verifyStarter(rootDirectory), [
      "Broken relative link in README.md: bad\\nname\\x00\\x85\\x9b\\x7f",
    ]);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("redacts a secret-shaped relative destination from exported errors", () => {
  const rootDirectory = createFixture();
  try {
    writeCompleteFixture(rootDirectory);
    const candidate = credentialCandidate();
    writeFileSync(
      join(rootDirectory, "README.md"),
      `[Missing](docs/prefix-${candidate}-suffix.md)\n`,
      "utf8",
    );

    const errors = verifyStarter(rootDirectory);
    assert.equal(JSON.stringify(errors).includes(candidate), false);
    assert.deepEqual(errors, [
      "Broken relative link in README.md: docs/prefix-[REDACTED]-suffix.md",
    ]);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("rejects an existing target reached through an external symlink", () => {
  const rootDirectory = createFixture();
  const externalDirectory = createFixture();
  const linkedDirectory = join(rootDirectory, "linked");
  try {
    writeCompleteFixture(rootDirectory);
    writeFileSync(join(externalDirectory, "secret.md"), "# Outside\n", "utf8");
    symlinkSync(externalDirectory, linkedDirectory, platform() === "win32" ? "junction" : "dir");
    writeFileSync(join(rootDirectory, "README.md"), "[External](linked/secret.md)\n", "utf8");
    assert.deepEqual(verifyStarter(rootDirectory), [
      "Broken relative link in README.md: linked/secret.md",
    ]);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
    rmSync(externalDirectory, { recursive: true, force: true });
  }
});

test("accepts a relative destination containing balanced parentheses", () => {
  const rootDirectory = createFixture();
  try {
    writeCompleteFixture(rootDirectory);
    mkdirSync(join(rootDirectory, "docs"), { recursive: true });
    writeFileSync(join(rootDirectory, "docs", "foo(bar).md"), "# Target\n", "utf8");
    writeFileSync(join(rootDirectory, "README.md"), "[Parentheses](docs/foo(bar).md)\n", "utf8");
    assert.deepEqual(verifyStarter(rootDirectory), []);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("rejects a required Markdown source that escapes through a directory junction", () => {
  const rootDirectory = createFixture();
  const externalDirectory = createFixture();
  const inboxDirectory = join(rootDirectory, "00 Inbox");
  try {
    writeCompleteFixture(rootDirectory);
    writeFileSync(join(externalDirectory, "README.md"), "[External](missing.md)\n", "utf8");
    rmSync(inboxDirectory, { recursive: true, force: true });
    symlinkSync(externalDirectory, inboxDirectory, platform() === "win32" ? "junction" : "dir");
    assert.deepEqual(verifyStarter(rootDirectory), ["Invalid required file: 00 Inbox/README.md"]);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
    rmSync(externalDirectory, { recursive: true, force: true });
  }
});

test("rejects a directory occupying a required non-Markdown file", () => {
  const rootDirectory = createFixture();
  try {
    writeCompleteFixture(rootDirectory);
    rmSync(join(rootDirectory, "package.json"));
    mkdirSync(join(rootDirectory, "package.json"));
    assert.deepEqual(verifyStarter(rootDirectory), ["Invalid required file: package.json"]);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("accepts a relative destination with a CommonMark-style title", () => {
  const rootDirectory = createFixture();
  try {
    writeCompleteFixture(rootDirectory);
    mkdirSync(join(rootDirectory, "docs"), { recursive: true });
    writeFileSync(join(rootDirectory, "docs", "guide.md"), "# Guide\n", "utf8");
    writeFileSync(join(rootDirectory, "README.md"), "[Guide](docs/guide.md \"Guide\")\n", "utf8");
    assert.deepEqual(verifyStarter(rootDirectory), []);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("accepts escaped parentheses in a relative destination", () => {
  const rootDirectory = createFixture();
  try {
    writeCompleteFixture(rootDirectory);
    mkdirSync(join(rootDirectory, "docs"), { recursive: true });
    writeFileSync(join(rootDirectory, "docs", "foo(bar).md"), "# Target\n", "utf8");
    writeFileSync(join(rootDirectory, "README.md"), "[Parentheses](docs/foo\\(bar\\).md)\n", "utf8");
    assert.deepEqual(verifyStarter(rootDirectory), []);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("CLI exits successfully for a complete fixture", () => {
  const rootDirectory = createFixture();
  try {
    writeCompleteFixture(rootDirectory);
    const result = spawnSync(process.execPath, [fileURLToPath(new URL("./verify-starter.mjs", import.meta.url))], {
      cwd: rootDirectory,
      encoding: "utf8",
    });
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("CLI exits with a path-oriented error for a missing required file", () => {
  const rootDirectory = createFixture();
  try {
    writeCompleteFixture(rootDirectory);
    rmSync(join(rootDirectory, "Templates", "Note.md"));
    const result = spawnSync(process.execPath, [fileURLToPath(new URL("./verify-starter.mjs", import.meta.url))], {
      cwd: rootDirectory,
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^Missing required file: Templates\/Note\.md\r?$/m);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("CLI redacts a secret-shaped relative destination from stderr", () => {
  const rootDirectory = createFixture();
  try {
    writeCompleteFixture(rootDirectory);
    const candidate = credentialCandidate();
    writeFileSync(
      join(rootDirectory, "README.md"),
      `[Missing](docs/prefix-${candidate}-suffix.md)\n`,
      "utf8",
    );

    const result = spawnSync(process.execPath, [fileURLToPath(new URL("./verify-starter.mjs", import.meta.url))], {
      cwd: rootDirectory,
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr.includes(candidate), false);
    assert.match(
      result.stderr,
      /^Broken relative link in README\.md: docs\/prefix-\[REDACTED\]-suffix\.md\r?$/m,
    );
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test("package metadata declares the MIT license", () => {
  const packageMetadata = JSON.parse(readFileSync(
    fileURLToPath(new URL("../package.json", import.meta.url)),
    "utf8",
  ));
  assert.equal(packageMetadata.license, "MIT");
});

test("lockfile root metadata declares the MIT license", () => {
  const lockMetadata = JSON.parse(readFileSync(
    fileURLToPath(new URL("../package-lock.json", import.meta.url)),
    "utf8",
  ));
  assert.equal(lockMetadata.packages[""].license, "MIT");
});

test("integration and service guidance is scoped to vault content", () => {
  for (const relativePath of ["../README.md", "../CONTRIBUTING.md"]) {
    const content = readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
    assert.match(content, /vault content/i);
  }
});

test("security guidance requires private reporting and forbids sensitive public issues", () => {
  const content = readFileSync(fileURLToPath(new URL("../SECURITY.md", import.meta.url)), "utf8");
  assert.match(content, /GitHub private vulnerability reporting/i);
  assert.match(content, /sensitive information must never[^\n]+public issue/i);
});

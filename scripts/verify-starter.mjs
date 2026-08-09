import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { publicFiles, redactSensitiveText, structuralDirectories } from "./scan-public-safety.mjs";

export const requiredFiles = publicFiles;
export { structuralDirectories };

const isExternalOrAnchor = /^(?:[a-z][a-z\d+.-]*:|#|\/)/i;
const trackingValidationFailed = Symbol("tracking_validation_failed");

function* markdownLinkTargets(content) {
  const linkStart = /(?<!!)\[[^\]]*\]\(/g;
  for (const match of content.matchAll(linkStart)) {
    const start = match.index + match[0].length;
    let depth = 0;
    let destination = "";
    let inTitle = false;
    let titleQuote = "";
    let angleDestination = content[start] === "<";
    let index = start;
    if (angleDestination) index += 1;
    while (index < content.length) {
      const character = content[index];
      if (character === "\\" && index + 1 < content.length) {
        if (!inTitle) destination += content[index + 1];
        index += 2;
        continue;
      }
      if (angleDestination) {
        if (character === ">") {
          angleDestination = false;
          inTitle = true;
        } else {
          destination += character;
        }
        index += 1;
        continue;
      }
      if (!inTitle && depth === 0 && /\s/.test(character)) {
        inTitle = true;
        index += 1;
        while (index < content.length && /\s/.test(content[index])) index += 1;
        if (content[index] === '"' || content[index] === "'") titleQuote = content[index++];
        continue;
      }
      if (inTitle) {
        if (titleQuote && character === titleQuote) titleQuote = "";
        else if (!titleQuote && character === ")") {
          yield destination;
          break;
        }
        index += 1;
        continue;
      }
      if (character === "(") {
        depth += 1;
        destination += character;
      } else if (character === ")") {
        if (depth === 0) {
          yield destination;
          break;
        }
        depth -= 1;
        destination += character;
      } else {
        destination += character;
      }
      index += 1;
    }
  }
}

function sanitizeLinkTarget(target) {
  return [...target]
    .map((character) => {
      const codePoint = character.codePointAt(0);
      if (character === "\n") return "\\n";
      if (character === "\r") return "\\r";
      if (codePoint === 0x2028 || codePoint === 0x2029) {
        return `\\u${codePoint.toString(16).padStart(4, "0")}`;
      }
      if (codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f)) {
        return `\\x${codePoint.toString(16).padStart(2, "0")}`;
      }
      return character;
    })
    .join("");
}

function trackedGitEntries(rootDirectory, canonicalRoot) {
  let repositoryRoot;
  try {
    repositoryRoot = execFileSync(
      "git",
      ["--no-replace-objects", "-C", rootDirectory, "rev-parse", "--show-toplevel"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ).replace(/\r?\n$/, "");
  } catch {
    return existsSync(path.join(rootDirectory, ".git")) ? trackingValidationFailed : null;
  }
  try {
    if (realpathSync.native(repositoryRoot) !== canonicalRoot) return null;
    const output = execFileSync(
      "git",
      ["--no-replace-objects", "-C", repositoryRoot, "ls-files", "-s", "-z"],
      { encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] },
    );
    const entries = [];
    let start = 0;
    while (start < output.length) {
      const end = output.indexOf(0, start);
      if (end === -1) break;
      const record = output.subarray(start, end);
      start = end + 1;
      const separator = record.indexOf(0x09);
      if (separator === -1) continue;
      const [mode, , stage] = record.subarray(0, separator).toString("ascii").split(" ");
      const entryPath = record.subarray(separator + 1).toString("utf8").replaceAll("\\", "/");
      entries.push({ mode, path: entryPath, stage });
    }
    return entries;
  } catch {
    return trackingValidationFailed;
  }
}

export function verifyStarter(rootDirectory) {
  const resolvedRoot = path.resolve(rootDirectory);
  const canonicalRoot = realpathSync.native(resolvedRoot);
  const errors = [];
  const validRequiredFiles = new Set();
  for (const relativePath of requiredFiles) {
    const requiredPath = path.join(resolvedRoot, relativePath);
    if (!existsSync(requiredPath)) {
      errors.push(`Missing required file: ${relativePath}`);
      continue;
    }
    try {
      const canonicalPath = realpathSync.native(requiredPath);
      const relativePathFromRoot = path.relative(canonicalRoot, canonicalPath);
      if (
        relativePathFromRoot === ".." ||
        relativePathFromRoot.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relativePathFromRoot) ||
        !statSync(requiredPath).isFile()
      ) {
        errors.push(`Invalid required file: ${relativePath}`);
      } else {
        validRequiredFiles.add(relativePath);
      }
    } catch {
      errors.push(`Invalid required file: ${relativePath}`);
    }
  }
  const trackedEntries = trackedGitEntries(resolvedRoot, canonicalRoot);
  if (trackedEntries === trackingValidationFailed) {
    errors.push("Git tracking validation failed");
  } else if (trackedEntries !== null) {
    const allowedFiles = new Set(requiredFiles);
    const trackedPaths = new Set(trackedEntries.map((entry) => entry.path));
    for (const entry of trackedEntries) {
      const safePath = sanitizeLinkTarget(redactSensitiveText(entry.path));
      if (!allowedFiles.has(entry.path)) {
        errors.push(`Unexpected tracked file: ${safePath}`);
      } else if (!/^100[0-7]{3}$/.test(entry.mode) || entry.stage !== "0") {
        errors.push(`Invalid tracked file mode: ${safePath}`);
      }
    }
    for (const relativePath of requiredFiles) {
      if (!trackedPaths.has(relativePath)) {
        errors.push(`Required file is not tracked: ${relativePath}`);
      }
    }
  }
  for (const relativePath of requiredFiles.filter((item) => item.endsWith("/.gitkeep"))) {
    if (!validRequiredFiles.has(relativePath)) continue;
    if (readFileSync(path.join(resolvedRoot, relativePath), "utf8").length > 0) {
      errors.push(`Structural placeholder is not empty: ${relativePath}`);
    }
  }
  for (const relativePath of requiredFiles.filter((item) => item.endsWith(".md"))) {
    if (!validRequiredFiles.has(relativePath)) continue;
    const source = path.join(resolvedRoot, relativePath);
    if (!existsSync(source)) continue;
    const content = readFileSync(source, "utf8");
    for (const target of markdownLinkTargets(content)) {
      const rawTarget = target.trim().replace(/^<|>$/g, "");
      const errorTarget = sanitizeLinkTarget(redactSensitiveText(rawTarget));
      const localTarget = rawTarget.split(/[?#]/, 1)[0];
      if (!localTarget || isExternalOrAnchor.test(localTarget)) continue;
      let decodedTarget;
      try {
        decodedTarget = decodeURIComponent(localTarget);
      } catch (error) {
        if (error instanceof URIError) {
          errors.push(`Broken relative link in ${relativePath}: ${errorTarget}`);
          continue;
        }
        throw error;
      }
      const resolvedTarget = path.resolve(path.dirname(source), decodedTarget);
      const relativeTarget = path.relative(resolvedRoot, resolvedTarget);
      if (
        relativeTarget === ".." ||
        relativeTarget.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relativeTarget)
      ) {
        errors.push(`Broken relative link in ${relativePath}: ${errorTarget}`);
        continue;
      }
      if (!existsSync(resolvedTarget)) {
        errors.push(`Broken relative link in ${relativePath}: ${errorTarget}`);
        continue;
      }
      let canonicalTarget;
      try {
        canonicalTarget = realpathSync.native(resolvedTarget);
      } catch {
        errors.push(`Broken relative link in ${relativePath}: ${errorTarget}`);
        continue;
      }
      const canonicalRelativeTarget = path.relative(canonicalRoot, canonicalTarget);
      if (
        canonicalRelativeTarget === ".." ||
        canonicalRelativeTarget.startsWith(`..${path.sep}`) ||
        path.isAbsolute(canonicalRelativeTarget)
      ) {
        errors.push(`Broken relative link in ${relativePath}: ${errorTarget}`);
      }
    }
  }
  return errors;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const errors = verifyStarter(process.cwd());
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  }
}

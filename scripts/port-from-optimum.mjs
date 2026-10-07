#!/usr/bin/env node
/**
 * @file One-way port of roblox-optimum's best-practices references into this skill.
 *
 * Replaces `roblox-best-practices/references/` with the roblox-optimum copy, lists every
 * line that names a part only roblox-optimum has, and prints a summary of how the two
 * SKILL.md files differ. SKILL.md itself is merged by hand. The roblox-optimum checkout
 * is only read, never written.
 *
 * Usage, from this repository's root:
 *   node scripts/port-from-optimum.mjs <path-to-roblox-optimum>
 *
 * Exit codes: 0 after a port, 2 on a missing argument or an invalid path.
 * Procedure: MAINTAINING.md.
 */

import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const source = process.argv[2];
if (!source) {
  console.error("usage: node scripts/port-from-optimum.mjs <path-to-roblox-optimum>");
  process.exit(2);
}

const sourceSkill = join(source, "skills", "best-practices");
const targetSkill = "roblox-best-practices";
if (!existsSync(join(sourceSkill, "SKILL.md")) || !existsSync(join(targetSkill, "SKILL.md"))) {
  console.error("error: run from this repo's root with a valid roblox-optimum path");
  process.exit(2);
}

const pluginOnly = /\b(code-review|diagnose|studio-ops|roblox-auditor|roblox-optimum)\b|check_luau|get_standards|\$\{user_config|\.mjs\b/;

/**
 * @param {string} dir Folder to list.
 * @returns {string[]} Every file path under `dir`, recursively.
 */
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

rmSync(join(targetSkill, "references"), { recursive: true, force: true });
cpSync(join(sourceSkill, "references"), join(targetSkill, "references"), { recursive: true });

let flagged = 0;
for (const file of walk(join(targetSkill, "references"))) {
  readFileSync(file, "utf8").split("\n").forEach((line, index) => {
    if (pluginOnly.test(line)) {
      flagged += 1;
      console.log(`${relative(".", file)}:${index + 1}: ${line.trim().slice(0, 140)}`);
    }
  });
}

const optimumVersion = JSON.parse(readFileSync(join(source, "package.json"), "utf8")).version;
console.log(`\ncopied references from roblox-optimum ${optimumVersion}; ${flagged} line(s) name plugin-only parts and need a standalone rewrite`);
console.log("SKILL.md diff to merge by hand:\n");
spawnSync("git", ["diff", "--no-index", "--stat", join(targetSkill, "SKILL.md"), join(sourceSkill, "SKILL.md")], { stdio: "inherit" });

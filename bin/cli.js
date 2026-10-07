#!/usr/bin/env node
/**
 * @file Installer for the roblox-best-practices skill.
 *
 * Copies the skill folder into the workspace `.agents/skills` path and into
 * the global skills directory of each selected agent listed in `agents.txt`.
 *
 * Usage: npx --allow-git=all github:andrian-syh/roblox-best-practices-skill [options]
 *   -a, --all        install to every detected agent without prompts
 *   -t, --tag <tag>  install a published release instead of the bundled copy
 *   -h, --help       show help
 *
 * Exit codes: 0 on success, 1 when a download or any file copy fails.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { execFileSync } = require('child_process');
const prompts = require('prompts');

const localSkillDir = path.join(__dirname, '../roblox-best-practices');
const cwd = process.cwd();

const { version: bundledVersion } = require('../package.json');

/**
 * Shortens a path for display: home-relative as `~/...`, otherwise relative to the working directory.
 * @param {string} p Absolute path.
 * @returns {string} Display form of the path.
 */
function formatPath(p) {
  const home = os.homedir();
  if (p.startsWith(home)) {
    return '~' + p.slice(home.length).replace(/\\/g, '/');
  }
  return path.relative(cwd, p) || p;
}

// Destinations already written in this run. Two targets can resolve to the same
// folder — running from the home directory makes the workspace ".agents/skills"
// and the global "~/.agents/skills" the same path — and installing twice would
// delete the copy just made before writing it again.
const installedDestinations = new Set();

// Copy errors are reported as they happen; this decides the exit code.
let failures = 0;

/**
 * Replaces `dest` with a fresh copy of `src`, once per run.
 * Removing first clears files deleted in newer versions, matching the shell fallbacks.
 * @param {string} src Skill folder to copy.
 * @param {string} dest Destination skill folder.
 * @returns {boolean} False when `dest` was already written in this run.
 */
function installSkillFolder(src, dest) {
  const resolved = path.resolve(dest);
  if (installedDestinations.has(resolved)) {
    console.log(`\x1b[90m[SKIPPED] ${formatPath(dest)} — already installed in this run\x1b[0m`);
    return false;
  }
  installedDestinations.add(resolved);
  try {
    fs.rmSync(dest, { recursive: true, force: true });
  } catch (err) {
    console.error(`[WARN] Could not clear existing ${formatPath(dest)}: ${err.message}`);
  }
  copyFolderRecursiveSync(src, dest);
  return true;
}

/**
 * Copies a file or folder tree, logging each file and counting failures instead of throwing.
 * @param {string} src Source file or folder.
 * @param {string} dest Destination path.
 */
function copyFolderRecursiveSync(src, dest) {
  try {
    if (!fs.existsSync(src)) return;
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      fs.readdirSync(src).forEach(childItemName => {
        copyFolderRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
      });
    } else {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      console.log(`[CREATED] ${formatPath(dest)}`);
    }
  } catch (err) {
    failures += 1;
    console.error(`[ERROR] Failed to copy from ${src} to ${dest}: ${err.message}`);
  }
}

/**
 * Lists the repository's tag names from the GitHub API.
 * @returns {Promise<string[]>} Tag names, or an empty list when GitHub is unreachable.
 */
function fetchGithubTags() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/andrian-syh/roblox-best-practices-skill/tags',
      headers: {
        'User-Agent': 'roblox-best-practices-skill-installer'
      },
      timeout: 3000
    };

    https.get(options, (res) => {
      if (res.statusCode !== 200) {
        resolve([]);
        return;
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const tags = JSON.parse(data).map(t => t.name);
          resolve(tags);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => {
      resolve([]);
    });
  });
}

/**
 * Accepts only `X.Y.Z` or `vX.Y.Z`, so a crafted `--tag` value cannot reach a command line.
 * @param {unknown} tag Candidate tag.
 * @returns {boolean} True for a well-formed version tag.
 */
function isValidTag(tag) {
  return typeof tag === 'string' && /^v?\d+\.\d+\.\d+$/.test(tag);
}

/**
 * Sort comparator that orders version tags newest first by numeric major, minor, and patch.
 * @param {string} a Version tag.
 * @param {string} b Version tag.
 * @returns {number} Negative when `a` is newer than `b`.
 */
function compareTagsDesc(a, b) {
  const parse = t => t.replace(/^v/, '').split('.').map(Number);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
  }
  return 0;
}

/**
 * Downloads a release tag into a temporary folder with git, or as a zip archive without it.
 * Exits the process with code 1 on an invalid tag or a failed download.
 * @param {string} tag Version tag, with or without the `v` prefix.
 * @returns {{tempDir: string, skillDir: string}} The temporary folder and the skill folder inside it.
 */
function downloadVersion(tag) {
  if (!isValidTag(tag)) {
    console.error(`\x1b[31m[ERROR] Invalid version tag "${tag}". Expected a form like v1.5.1.\x1b[0m`);
    process.exit(1);
  }

  // GitHub tags for this repo are v-prefixed; accept a bare "1.0.0" too.
  if (!tag.startsWith('v')) tag = 'v' + tag;

  const tempDir = path.join(os.tmpdir(), `roblox_skill_${Math.random().toString(36).slice(2, 11)}`);
  console.log(`Downloading version ${tag} to temporary directory...`);

  try {
    let hasGit = false;
    try {
      execFileSync('git', ['--version'], { stdio: 'ignore' });
      hasGit = true;
    } catch (e) {}

    const repoUrl = 'https://github.com/andrian-syh/roblox-best-practices-skill.git';

    if (hasGit) {
      // Argument array (execFileSync) — no shell, so the tag can never be interpreted as a command.
      execFileSync('git', ['clone', '--depth', '1', '--branch', tag, repoUrl, tempDir], { stdio: 'ignore' });
    } else {
      fs.mkdirSync(tempDir, { recursive: true });
      const zipUrl = `https://github.com/andrian-syh/roblox-best-practices-skill/archive/refs/tags/${tag}.zip`;
      const zipPath = path.join(tempDir, 'archive.zip');

      if (process.platform === 'win32') {
        execFileSync('powershell.exe', ['-NoProfile', '-Command', `Invoke-WebRequest -Uri '${zipUrl}' -OutFile '${zipPath}' -UseBasicParsing`], { stdio: 'ignore' });
        execFileSync('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -Path '${zipPath}' -DestinationPath '${tempDir}' -Force`], { stdio: 'ignore' });
      } else {
        execFileSync('curl', ['-fsSL', zipUrl, '-o', zipPath], { stdio: 'ignore' });
        execFileSync('unzip', ['-q', zipPath, '-d', tempDir], { stdio: 'ignore' });
      }

      // Move extracted files up
      const tagFolderSuffix = tag.replace(/^v/, '');
      const extractedDir = path.join(tempDir, `roblox-best-practices-skill-${tagFolderSuffix}`);
      if (fs.existsSync(extractedDir)) {
        fs.readdirSync(extractedDir).forEach(file => {
          fs.renameSync(path.join(extractedDir, file), path.join(tempDir, file));
        });
        fs.rmSync(extractedDir, { recursive: true, force: true });
      }
    }
    
    const downloadedSkillDir = path.join(tempDir, 'roblox-best-practices');
    if (!fs.existsSync(downloadedSkillDir)) {
      throw new Error('Downloaded folder structure invalid.');
    }
    
    return { tempDir, skillDir: downloadedSkillDir };
  } catch (err) {
    console.error(`\x1b[31m[ERROR] Failed to download version ${tag}: ${err.message}\x1b[0m`);
    process.exit(1);
  }
}

/**
 * Deletes a temporary download folder, ignoring errors.
 * @param {string | null} tempDir Folder to delete, or null when nothing was downloaded.
 */
function cleanupTempDir(tempDir) {
  if (tempDir && fs.existsSync(tempDir)) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

/**
 * Reads `agents.txt`, the agent list shared with `install.ps1` and `install.sh`.
 * @returns {{name: string, path: string}[]} Agents with their home-relative skills path.
 */
function loadAgents() {
  const file = path.join(__dirname, 'agents.txt');
  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const [name, agentPath] = line.split('|');
      return { name: name.trim(), path: agentPath.trim() };
    });
}

const additionalAgents = loadAgents();

/**
 * Returns the folder whose presence means an agent is installed: the skills path minus `skills`.
 * `.config/goose/skills` is detected as `~/.config/goose`, never the shared `~/.config`.
 * @param {string} agentPath Home-relative skills path.
 * @returns {string} Home-relative detection folder.
 */
function detectionFolder(agentPath) {
  return agentPath.split('/').slice(0, -1).join('/');
}

/**
 * @param {{path: string}} agent Agent entry from `agents.txt`.
 * @returns {boolean} True when the agent's folder exists in the home directory.
 */
function isDetected(agent) {
  return fs.existsSync(path.join(os.homedir(), detectionFolder(agent.path)));
}

/**
 * Installs the skill into one agent's global skills directory.
 * @param {{name: string, path: string}} agent Agent entry from `agents.txt`.
 * @param {string} skillDir Skill folder to copy.
 */
function executeInstall(agent, skillDir) {
  console.log(`\n--- Installing \x1b[36m${agent.name}\x1b[0m ---`);
  installSkillFolder(skillDir, path.join(os.homedir(), agent.path, 'roblox-best-practices'));
}

/**
 * Cleans up, reports the outcome, and exits: code 1 if any copy failed, otherwise 0.
 * @param {string | null} tempDir Temporary download folder to delete.
 */
function finish(tempDir) {
  cleanupTempDir(tempDir);
  if (failures > 0) {
    console.error(`\n\x1b[31m[FAILED] ${failures} file(s) could not be installed; see the errors above.\x1b[0m`);
    process.exit(1);
  }
  console.log('\n\x1b[32m[SUCCESS] Installation complete!\x1b[0m');
  process.exit(0);
}

// Non-interactive path: --all, with an optional --tag.
const args = process.argv.slice(2);

let chosenTag = null;
const tagArgIndex = args.findIndex(arg => arg === '--tag' || arg === '-t');
if (tagArgIndex !== -1 && args[tagArgIndex + 1]) {
  chosenTag = args[tagArgIndex + 1];
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Roblox Best Practices Skill Installer CLI

Usage:
  npx github:andrian-syh/roblox-best-practices-skill [options]

Options:
  -a, --all                   Install for every agent detected in your home directory, without prompts
  -t, --tag <tag_name>        Target a specific version tag from GitHub (e.g. v1.0.0, v1.1.7)
  -h, --help                  Show this help message
  `);
  process.exit(0);
}

if (args.includes('--all') || args.includes('-a')) {
  console.log(`Installing version '${chosenTag || 'latest'}' to Universal and every detected agent...`);

  let activeSkillDir = localSkillDir;
  let tempCleanDir = null;

  if (chosenTag) {
    const downloadResult = downloadVersion(chosenTag);
    activeSkillDir = downloadResult.skillDir;
    tempCleanDir = downloadResult.tempDir;
  }

  // Named agents first, then the workspace path. When the two resolve to the same
  // folder (running from the home directory), the named target is the one reported
  // and the workspace step reports itself as already covered.
  additionalAgents.filter(isDetected).forEach(agent => {
    executeInstall(agent, activeSkillDir);
  });

  console.log(`\n--- Installing \x1b[36mUniversal (./.agents/skills)\x1b[0m ---`);
  installSkillFolder(activeSkillDir, path.join(cwd, '.agents/skills/roblox-best-practices'));

  finish(tempCleanDir);
}

// Interactive path: choose a version, then the agents to install to.
(async () => {
  console.log('\x1b[36m========================================================\x1b[0m');
  console.log('\x1b[36m       Roblox Best Practices Skill Installer CLI        \x1b[0m');
  console.log('\x1b[36m========================================================\x1b[0m\n');

  let selectedTag = chosenTag;

  // Step 1: Select Version, unless --tag already chose one
  if (!selectedTag) {
    console.log('Fetching available tags from GitHub...');
    const tags = await fetchGithubTags();
    
    const versionChoices = [
      { title: `Latest (Local bundled v${bundledVersion})`, value: 'latest', description: 'Installs the latest version instantly' }
    ];

    const RECENT_LIMIT = 5;

    if (tags.length > 0) {
      // Show only the latest few published versions to keep the menu short;
      // older ones stay installable via the manual-entry option below (or --tag).
      tags
        .filter(isValidTag)
        .sort(compareTagsDesc)
        .slice(0, RECENT_LIMIT)
        .forEach(tag => {
          versionChoices.push({
            title: `${tag} (Download from GitHub)`,
            value: tag,
            description: `Downloads and installs version ${tag}`
          });
        });
    } else {
      console.log('\x1b[90mCould not reach GitHub; older versions stay installable by typing a tag.\x1b[0m');
    }

    // Always let the user reach an older/unlisted version by typing it.
    versionChoices.push({
      title: 'Other version (type manually)…',
      value: '__manual__',
      description: 'Enter any published version tag, e.g. v1.0.0 (for versions not listed above)'
    });

    const versionResponse = await prompts({
      type: 'select',
      name: 'version',
      message: 'Select the skill version to install:',
      choices: versionChoices
    });

    if (!versionResponse.version) {
      console.log('\n\x1b[31m[CANCELLED] Installation cancelled.\x1b[0m');
      process.exit(0);
    }

    selectedTag = versionResponse.version;

    // Manual entry: prompt for a version tag and validate it.
    if (selectedTag === '__manual__') {
      const manualResponse = await prompts({
        type: 'text',
        name: 'tag',
        message: 'Enter the version tag to install (e.g. v1.0.0):',
        validate: value => isValidTag((value || '').trim()) ? true : 'Enter a version like v1.0.0'
      });

      if (!manualResponse.tag) {
        console.log('\n\x1b[31m[CANCELLED] Installation cancelled.\x1b[0m');
        process.exit(0);
      }

      selectedTag = manualResponse.tag.trim();
    }
  }

  // Step 2: Select Targets
  console.log(`\n\x1b[32m•\x1b[0m ${additionalAgents.length} agent locations`);
  console.log('\x1b[32m•\x1b[0m Which agents do you want to install to?\n');
  console.log('  \x1b[90m— Universal (./.agents/skills) — always included —————\x1b[0m');
  console.log('    \x1b[32m•\x1b[0m Amp, Antigravity, Cline, Codex, Cursor, Dexto, Gemini CLI,');
  console.log('    \x1b[32m•\x1b[0m GitHub Copilot, Kimi Code CLI, Loaf, OpenCode, Warp, Zed');
  console.log('    \x1b[90mProject scope only. Pick "Universal global" below for ~/.agents/skills.\x1b[0m\n');

  const targetChoices = additionalAgents.map(agent => ({
    title: `${agent.name} (~/${agent.path})`,
    value: agent,
    selected: isDetected(agent)
  }));

  const response = await prompts({
    type: 'autocompleteMultiselect',
    name: 'selected',
    message: '— Additional agents —',
    choices: targetChoices,
    hint: '- Type to search, Space to select, Enter to confirm',
    instructions: false
  });

  if (response.selected === undefined) {
    console.log('\n\x1b[31m[CANCELLED] Installation cancelled.\x1b[0m');
    process.exit(0);
  }

  const selectedAgents = response.selected || [];

  // Download older version if required
  let activeSkillDir = localSkillDir;
  let tempCleanDir = null;

  if (selectedTag !== 'latest') {
    const downloadResult = downloadVersion(selectedTag);
    activeSkillDir = downloadResult.skillDir;
    tempCleanDir = downloadResult.tempDir;
  }

  console.log(`\n\x1b[32mInstalling skill...\x1b[0m`);
  
  // 1. Selected agents first; picking an undetected one installs it anyway
  selectedAgents.forEach(agent => {
    executeInstall(agent, activeSkillDir);
  });

  // 2. Always install to the workspace path, last: when it resolves to the same
  // folder as a selected target (running from the home directory), that target
  // has already reported it and this step says so rather than redoing the copy.
  console.log(`\n--- Installing \x1b[36mUniversal (./.agents/skills)\x1b[0m ---`);
  installSkillFolder(activeSkillDir, path.join(cwd, '.agents/skills/roblox-best-practices'));

  finish(tempCleanDir);
})();

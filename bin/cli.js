#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { execSync, execFileSync } = require('child_process');
const prompts = require('prompts');

const localSkillDir = path.join(__dirname, '../roblox-best-practices');
const cwd = process.cwd();

// Single source of truth for the bundled version (kept in sync with package.json automatically)
const { version: bundledVersion } = require('../package.json');

function formatPath(p) {
  const home = os.homedir();
  if (p.startsWith(home)) {
    return '~' + p.slice(home.length).replace(/\\/g, '/');
  }
  return path.relative(cwd, p) || p;
}

// Helper to copy file
function copyFileSync(src, dest) {
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`[CREATED] ${formatPath(dest)}`);
  } catch (err) {
    console.error(`[ERROR] Failed to write ${dest}: ${err.message}`);
  }
}

// Destinations already written in this run. Two targets can resolve to the same
// folder — running from the home directory makes the workspace ".agents/skills"
// and the global "~/.agents/skills" the same path — and installing twice would
// delete the copy just made before writing it again.
const installedDestinations = new Set();

// Replace the destination skill folder wholesale, then copy.
// Removing first clears files deleted in newer versions so no stale files linger
// (mirrors the `rm -rf`/`Remove-Item` behavior of the shell/PowerShell fallbacks).
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

// Helper to copy folder recursively
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
    console.error(`[ERROR] Failed to copy from ${src} to ${dest}: ${err.message}`);
  }
}

// Fetch available tags from GitHub API
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

// A git tag/version this installer will accept (e.g. v1.5.1 or 1.5.1).
// Guards against a malicious --tag value reaching a shell command.
function isValidTag(tag) {
  return typeof tag === 'string' && /^v?\d+\.\d+\.\d+$/.test(tag);
}

// Sort version tags newest-first by numeric major.minor.patch (e.g. v1.5.1 before v1.1.7).
function compareTagsDesc(a, b) {
  const parse = t => t.replace(/^v/, '').split('.').map(Number);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
  }
  return 0;
}

// Download a specific tag from GitHub to a temporary directory
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

function cleanupTempDir(tempDir) {
  if (tempDir && fs.existsSync(tempDir)) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

// Load the canonical agent list from the shared data file (bin/agents.txt),
// so cli.js, install.ps1, and install.sh all read the same source.
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

// The folder to look for in $HOME is the skills path minus its final segment:
// ".config/goose/skills" must be detected as "~/.config/goose", never the
// ubiquitous "~/.config", which would pre-select every agent that nests there.
function detectionFolder(agentPath) {
  return agentPath.split('/').slice(0, -1).join('/');
}

// Execute installation for a given target object
function executeInstall(agent, skillDir) {
  const appFolder = path.join(os.homedir(), detectionFolder(agent.path));
  const dest = path.join(os.homedir(), agent.path, 'roblox-best-practices');
  
  if (fs.existsSync(appFolder)) {
    console.log(`\n--- Installing \x1b[36m${agent.name}\x1b[0m ---`);
    installSkillFolder(skillDir, dest);
  } else {
    console.log(`\x1b[32m[INSTALLED]\x1b[0m (Assumed) ${agent.name}`);
  }
}

// Argument parsing for automation/non-interactive
const args = process.argv.slice(2);

let chosenTag = 'latest';
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
  -a, --all                   Install for all supported additional agents
  -t, --tag <tag_name>        Target a specific version tag from GitHub (e.g. v1.0.0, v1.1.7)
  -h, --help                  Show this help message
  `);
  process.exit(0);
}

if (args.includes('--all') || args.includes('-a')) {
  console.log(`Installing version '${chosenTag}' to Universal and all selected additional agents...`);
  
  let activeSkillDir = localSkillDir;
  let tempCleanDir = null;

  if (chosenTag !== 'latest') {
    const downloadResult = downloadVersion(chosenTag);
    activeSkillDir = downloadResult.skillDir;
    tempCleanDir = downloadResult.tempDir;
  }

  // Named agents first, then the workspace path. When the two resolve to the same
  // folder (running from the home directory), the named target is the one reported
  // and the workspace step reports itself as already covered.
  additionalAgents.forEach(agent => {
    executeInstall(agent, activeSkillDir);
  });

  console.log(`\n--- Installing \x1b[36mUniversal (./.agents/skills)\x1b[0m ---`);
  installSkillFolder(activeSkillDir, path.join(cwd, '.agents/skills/roblox-best-practices'));

  cleanupTempDir(tempCleanDir);
  console.log('\n\x1b[32m[SUCCESS] Installation complete!\x1b[0m');
  process.exit(0);
}

// Interactive prompt
(async () => {
  console.log('\x1b[36m========================================================\x1b[0m');
  console.log('\x1b[36m       Roblox Best Practices Skill Installer CLI        \x1b[0m');
  console.log('\x1b[36m========================================================\x1b[0m\n');

  // Step 1: Select Version
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
    // Fallback static choices if offline/rate-limited
    versionChoices.push(
      { title: `v${bundledVersion} (Download from GitHub)`, value: `v${bundledVersion}`, description: `Downloads and installs v${bundledVersion}` },
      { title: 'v1.1.7 (Download from GitHub)', value: 'v1.1.7', description: 'Downloads and installs v1.1.7' },
      { title: 'v1.0.0 (Download from GitHub)', value: 'v1.0.0', description: 'Downloads and installs v1.0.0' }
    );
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

  let selectedTag = versionResponse.version;

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

  // Step 2: Select Targets
  console.log(`\n\x1b[32m•\x1b[0m ${additionalAgents.length} agent locations`);
  console.log('\x1b[32m•\x1b[0m Which agents do you want to install to?\n');
  console.log('  \x1b[90m— Universal (./.agents/skills) — always included —————\x1b[0m');
  console.log('    \x1b[32m•\x1b[0m Amp, Antigravity, Cline, Codex, Cursor, Dexto, Gemini CLI,');
  console.log('    \x1b[32m•\x1b[0m GitHub Copilot, Kimi Code CLI, Loaf, OpenCode, Warp, Zed');
  console.log('    \x1b[90mProject scope only. Pick "Universal global" below for ~/.agents/skills.\x1b[0m\n');

  const targetChoices = additionalAgents.map(agent => {
    const appFolder = path.join(os.homedir(), detectionFolder(agent.path));
    const exists = fs.existsSync(appFolder);
    return {
      title: `${agent.name} (~/${agent.path})`,
      value: agent,
      selected: exists
    };
  });

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
  
  // 1. Selected agents first (only if parent dir exists)
  selectedAgents.forEach(agent => {
    executeInstall(agent, activeSkillDir);
  });

  // 2. Always install to the workspace path, last: when it resolves to the same
  // folder as a selected target (running from the home directory), that target
  // has already reported it and this step says so rather than redoing the copy.
  console.log(`\n--- Installing \x1b[36mUniversal (./.agents/skills)\x1b[0m ---`);
  installSkillFolder(activeSkillDir, path.join(cwd, '.agents/skills/roblox-best-practices'));

  cleanupTempDir(tempCleanDir);
  console.log('\n\x1b[32m[SUCCESS] Installation complete!\x1b[0m');
})();

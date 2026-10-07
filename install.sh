#!/bin/sh
#
# Installs the roblox-best-practices skill for AI coding agents.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/andrian-syh/roblox-best-practices-skill/main/install.sh | bash
#   sh install.sh [--all] [--tag vX.Y.Z]
#
# With Node.js and npm present, runs the npx installer (bin/cli.js) and
# forwards every argument to it. Otherwise downloads the newest release tag
# (or main when no tag exists) with git, curl, or wget, and copies the skill
# into ./.agents/skills and into each detected agent you confirm. The agent
# list is read from bin/agents.txt.
#
# Requires: git, or curl or wget plus unzip, when Node.js is absent.
# Exit status: non-zero when the download or a copy fails.
# Docs: https://github.com/andrian-syh/roblox-best-practices-skill/blob/main/INSTALL.md

set -e

# printf, not a literal: bash's echo does not expand \033, and this script runs under curl | bash.
RED=$(printf '\033[0;31m')
GREEN=$(printf '\033[0;32m')
BLUE=$(printf '\033[0;34m')
YELLOW=$(printf '\033[0;33m')
NC=$(printf '\033[0m')

echo "${BLUE}========================================================${NC}"
echo "${BLUE}       Roblox Best Practices Skill Installer            ${NC}"
echo "${BLUE}========================================================${NC}"

if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  echo "Node.js detected. Launching NPM-based CLI installer..."
  NPM_VERSION=$(npm --version 2>/dev/null || echo "0")
  NPM_MAJOR=$(echo "$NPM_VERSION" | cut -d. -f1)
  if [ -n "$NPM_MAJOR" ] && [ "$NPM_MAJOR" -ge 12 ]; then
    npx --allow-git=all github:andrian-syh/roblox-best-practices-skill "$@"
  else
    npx github:andrian-syh/roblox-best-practices-skill "$@"
  fi
  exit 0
fi

echo "Node.js/NPM not found. Running shell fallback installer..."

# Setup temporary directory
TEMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'roblox_best_practices_skill')
cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Download the newest release tag rather than main, so a half-finished main never ships.
REPO_URL="https://github.com/andrian-syh/roblox-best-practices-skill"
latest_tag() {
  if command -v git >/dev/null 2>&1; then
    git ls-remote --tags --refs "$REPO_URL.git" 2>/dev/null | sed 's:.*/::'
  elif command -v curl >/dev/null 2>&1; then
    curl -fsSL "https://api.github.com/repos/andrian-syh/roblox-best-practices-skill/tags" 2>/dev/null | grep -o '"name": *"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/'
  fi | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -t. -k1.2,1n -k2,2n -k3,3n | tail -n 1
}
TAG=$(latest_tag || true)
REF_NAME=${TAG:-main}
echo "Downloading skill files ($REF_NAME)..."

if command -v git >/dev/null 2>&1; then
  git clone --depth 1 --branch "$REF_NAME" "$REPO_URL.git" "$TEMP_DIR/src" > /dev/null 2>&1
else
  if [ -n "$TAG" ]; then ZIP_URL="$REPO_URL/archive/refs/tags/$TAG.zip"; else ZIP_URL="$REPO_URL/archive/refs/heads/main.zip"; fi
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$ZIP_URL" -o "$TEMP_DIR/archive.zip"
  elif command -v wget >/dev/null 2>&1; then
    wget -q "$ZIP_URL" -O "$TEMP_DIR/archive.zip"
  else
    echo "${RED}[ERROR] Neither git, curl, nor wget is installed. Please install one of them to download the skill.${NC}"
    exit 1
  fi

  if command -v unzip >/dev/null 2>&1; then
    unzip -q "$TEMP_DIR/archive.zip" -d "$TEMP_DIR"
    mv "$TEMP_DIR"/roblox-best-practices-skill-* "$TEMP_DIR/src"
  else
    echo "${RED}[ERROR] 'unzip' utility not found. Please install unzip or Node.js to continue.${NC}"
    exit 1
  fi
fi

# The source skill folder
SRC_SKILL_DIR="$TEMP_DIR/src/roblox-best-practices"

if [ ! -d "$SRC_SKILL_DIR" ]; then
  echo "${RED}[ERROR] Failed to locate roblox-best-practices directory in download.${NC}"
  exit 1
fi

# Destinations already written in this run. Two targets can resolve to the same
# folder -- running from the home directory makes the workspace "./.agents/skills"
# and the global "$HOME/.agents/skills" the same path -- and installing twice would
# delete the copy just made before writing it again.
INSTALLED_DESTINATIONS=""

copy_folder() {
  local src="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  local resolved
  resolved="$(cd "$(dirname "$dest")" && pwd)/$(basename "$dest")"
  case " $INSTALLED_DESTINATIONS " in
    *" $resolved "*)
      echo "[SKIPPED] $dest -- already installed in this run"
      return 0
      ;;
  esac
  INSTALLED_DESTINATIONS="$INSTALLED_DESTINATIONS $resolved"
  rm -rf "$dest"
  cp -R "$src" "$dest"
  echo "${GREEN}[CREATED] $dest${NC}"
}

install_targets() {
  echo ""
  echo "  ${GREEN}•${NC} Which agents do you want to install to?"
  echo ""
  echo "  ${YELLOW}— Universal (.agents/skills) — always included —————${NC}"
  echo "    ${GREEN}•${NC} Amp, Antigravity, Cline, Codex, Cursor, Dexto, Gemini CLI, GitHub Copilot,"
  echo "    ${GREEN}•${NC} Kimi Code CLI, Loaf, OpenCode, Warp, Zed  (project scope)"
  echo ""

  local detected_names=""
  local detected_paths=""
  local count=0

  check_agent() {
    name="$1"
    apath="$2"
    parent="$3"
    if [ -d "$HOME/$parent" ]; then
      count=$((count+1))
      detected_names="$detected_names\n  $count) [x] $name (~/$apath)"
      detected_paths="$detected_paths $apath"
    fi
  }

  # Read the canonical agent list from the shared data file (bin/agents.txt in the download),
  # so this fallback stays in sync with bin/cli.js and install.ps1.
  AGENTS_FILE="$TEMP_DIR/src/bin/agents.txt"
  if [ -f "$AGENTS_FILE" ]; then
    while IFS='|' read -r name apath; do
      name=$(printf '%s' "$name" | tr -d '\r')
      case "$name" in ''|\#*) continue ;; esac
      apath=$(printf '%s' "$apath" | tr -d '\r')
      # Detect on the path minus its final "skills" segment, so ".config/goose/skills"
      # checks "$HOME/.config/goose" rather than the ubiquitous "$HOME/.config".
      parent=$(printf '%s' "$apath" | sed 's:/[^/]*$::')
      check_agent "$name" "$apath" "$parent"
    done < "$AGENTS_FILE"
  fi

  if [ $count -gt 0 ]; then
    echo ""
    echo "Detected existing agent directories in your home directory:"
    printf '%b\n' "$detected_names"
    echo ""
    printf "Do you want to install the skill to these detected agents? (Y/n): "
    # stdin is the script itself under curl | bash; ask the terminal instead.
    { read -r CONFIRM < /dev/tty; } 2>/dev/null || CONFIRM=""
    CONFIRM=$(echo "$CONFIRM" | tr '[:lower:]' '[:upper:]')
    if [ "$CONFIRM" = "" ] || [ "$CONFIRM" = "Y" ]; then
      for path in $detected_paths; do
        echo ""
        echo "Installing to $HOME/$path/roblox-best-practices..."
        copy_folder "$SRC_SKILL_DIR" "$HOME/$path/roblox-best-practices"
      done
    fi
  else
    echo ""
    echo "No other agent directories detected in your home directory. Skip additional agents."
  fi

  # The workspace path goes last, unconditionally. When it resolves to the same
  # folder as an agent target above (running from the home directory), copy_folder
  # reports it as already installed rather than deleting and rewriting the copy.
  echo ""
  echo "Installing to Universal (./.agents/skills)..."
  copy_folder "$SRC_SKILL_DIR" "./.agents/skills/roblox-best-practices"

  echo ""
  echo "${GREEN}[SUCCESS] Installation complete!${NC}"
}

install_targets

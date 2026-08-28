#!/bin/sh

# Stop on errors
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0;0m' # No Color

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

# Download the skill files
echo "Downloading skill files..."
if command -v git >/dev/null 2>&1; then
  git clone --depth 1 https://github.com/andrian-syh/roblox-best-practices-skill.git "$TEMP_DIR" > /dev/null 2>&1
else
  # Fallback to downloading ZIP
  ZIP_URL="https://github.com/andrian-syh/roblox-best-practices-skill/archive/refs/heads/main.zip"
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
    mv "$TEMP_DIR"/roblox-best-practices-skill-main/* "$TEMP_DIR"/ || true
  else
    echo "${RED}[ERROR] 'unzip' utility not found. Please install unzip or Node.js to continue.${NC}"
    exit 1
  fi
fi

# The source skill folder
SRC_SKILL_DIR="$TEMP_DIR/roblox-best-practices"

if [ ! -d "$SRC_SKILL_DIR" ]; then
  echo "${RED}[ERROR] Failed to locate roblox-best-practices directory in download.${NC}"
  exit 1
fi

copy_folder() {
  local src="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  rm -rf "$dest"
  cp -R "$src" "$dest"
  echo "${GREEN}[CREATED] $dest${NC}"
}

install_targets() {
  echo ""
  echo "  ${GREEN}•${NC} 66 agent locations"
  echo "  ${GREEN}•${NC} Which agents do you want to install to?"
  echo ""
  echo "  ${YELLOW}— Universal (.agents/skills) — always included —————${NC}"
  echo "    ${GREEN}•${NC} Amp, Antigravity, Cline, Codex, Cursor, Dexto, Gemini CLI, GitHub Copilot,"
  echo "    ${GREEN}•${NC} Kimi Code CLI, Loaf, OpenCode, Warp, Zed  (project scope)"
  echo ""

  echo "Installing to Universal (.agents/skills)..."
  copy_folder "$SRC_SKILL_DIR" "./.agents/skills/roblox-best-practices"

  local detected_names=""
  local detected_paths=""
  local count=0
  local assumed_installed=""
  
  check_agent() {
    name="$1"
    apath="$2"
    parent="$3"
    if [ -d "$HOME/$parent" ]; then
      count=$((count+1))
      detected_names="$detected_names\n  $count) [x] $name (~/$apath)"
      detected_paths="$detected_paths $apath"
    else
      assumed_installed="$assumed_installed\n${GREEN}[INSTALLED] (Assumed) $name${NC}"
    fi
  }

  # Read the canonical agent list from the shared data file (bin/agents.txt in the download),
  # so this fallback stays in sync with bin/cli.js and install.ps1.
  AGENTS_FILE="$TEMP_DIR/bin/agents.txt"
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
    read -r CONFIRM
    CONFIRM=$(echo "$CONFIRM" | tr '[:lower:]' '[:upper:]')
    if [ "$CONFIRM" = "" ] || [ "$CONFIRM" = "Y" ]; then
      for path in $detected_paths; do
        echo ""
        echo "Installing to $HOME/$path/roblox-best-practices..."
        copy_folder "$SRC_SKILL_DIR" "$HOME/$path/roblox-best-practices"
      done
      printf '%b\n' "$assumed_installed"
    fi
  else
    echo ""
    echo "No other agent directories detected in your home directory. Skip additional agents."
    printf '%b\n' "$assumed_installed"
  fi

  echo ""
  echo "${GREEN}[SUCCESS] Installation complete!${NC}"
}

install_targets

# ========================================================
#  Roblox Best Practices Skill Installer (PowerShell)
# ========================================================

Write-Host "========================================================" -ForegroundColor Blue
Write-Host "       Roblox Best Practices Skill Installer            " -ForegroundColor Blue
Write-Host "========================================================" -ForegroundColor Blue

# Check if Node.js/npm is available, prefer npx-based CLI
if ((Get-Command node -ErrorAction SilentlyContinue) -and (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js detected. Launching NPM-based CLI installer..." -ForegroundColor Green
  $npmVer = (npm --version) -split '\.'
  if ([int]$npmVer[0] -ge 12) {
    & npx --allow-git=all github:andrian-syh/roblox-best-practices-skill $args
  } else {
    & npx github:andrian-syh/roblox-best-practices-skill $args
  }
  return
}

Write-Host "Node.js/NPM not found. Running PowerShell fallback installer..." -ForegroundColor Yellow

# Download skill files to temp directory
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("roblox_skill_" + [System.Guid]::NewGuid().ToString().Substring(0,8))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
  if (Get-Command git -ErrorAction SilentlyContinue) {
    git clone --depth 1 https://github.com/andrian-syh/roblox-best-practices-skill.git $tempDir 2>$null | Out-Null
  } else {
    $zipUrl = "https://github.com/andrian-syh/roblox-best-practices-skill/archive/refs/heads/main.zip"
    $zipPath = Join-Path $tempDir "archive.zip"
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    Expand-Archive -Path $zipPath -DestinationPath $tempDir -Force
    # Move extracted files up
    $extracted = Join-Path $tempDir "roblox-best-practices-skill-main"
    Get-ChildItem $extracted | Move-Item -Destination $tempDir -Force
    Remove-Item $extracted -Recurse -Force -ErrorAction SilentlyContinue
  }

  $srcSkillDir = Join-Path $tempDir "roblox-best-practices"
  if (-not (Test-Path $srcSkillDir)) {
    Write-Host "[ERROR] Failed to locate roblox-best-practices directory in download." -ForegroundColor Red
    return
  }

  # Destinations already written in this run. Two targets can resolve to the same
  # folder -- running from the home directory makes the workspace ".agents\skills"
  # and the global "~\.agents\skills" the same path -- and installing twice would
  # delete the copy just made before writing it again.
  $script:InstalledDestinations = New-Object System.Collections.Generic.HashSet[string]

  function Copy-SkillFolder($src, $dest) {
    $parent = Split-Path $dest -Parent
    if (-not (Test-Path $parent)) {
      New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    $resolved = [System.IO.Path]::GetFullPath((Join-Path (Resolve-Path $parent).Path (Split-Path $dest -Leaf)))
    if (-not $script:InstalledDestinations.Add($resolved)) {
      Write-Host "[SKIPPED] $dest -- already installed in this run" -ForegroundColor DarkGray
      return
    }
    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
    Copy-Item -Path $src -Destination $dest -Recurse -Force
    Write-Host "[CREATED] $dest" -ForegroundColor Green
  }

  # Load the canonical agent list from the shared data file (bin/agents.txt in the download),
  # so this fallback stays in sync with bin/cli.js and install.sh.
  $additionalAgents = @()
  $agentsFile = Join-Path $tempDir "bin/agents.txt"
  if (Test-Path $agentsFile) {
      foreach ($line in Get-Content $agentsFile) {
          $trimmed = $line.Trim()
          if ($trimmed -and -not $trimmed.StartsWith('#')) {
              $parts = $trimmed.Split('|', 2)
              $agentPath = $parts[1].Trim()
              # Detect on the path minus its final "skills" segment, so ".config/goose/skills"
              # checks "~/.config/goose" rather than the ubiquitous "~/.config".
              $segments = $agentPath -split '/'
              $parentPath = ($segments[0..($segments.Length - 2)]) -join '/'
              $additionalAgents += @{ Name = $parts[0].Trim(); Path = $agentPath; Parent = $parentPath }
          }
      }
  }

  # Check which parent folders exist in user's home directory
  $detectedAgents = @()
  foreach ($agent in $additionalAgents) {
      $parentHomePath = Join-Path $HOME $agent.Parent
      if (Test-Path $parentHomePath) {
          $detectedAgents += $agent
      }
  }

  Write-Host ""
  Write-Host "  Which agents do you want to install to?" -ForegroundColor Green
  Write-Host "  --- Universal (.agents/skills) -- always included -------" -ForegroundColor DarkGray
  Write-Host "    * Amp, Antigravity, Cline, Codex, Cursor, Dexto, Gemini CLI, GitHub Copilot," -ForegroundColor Green
  Write-Host "      Kimi Code CLI, Loaf, OpenCode, Warp, Zed  (project scope)" -ForegroundColor Green
  Write-Host ""

  if ($detectedAgents.Count -gt 0) {
      Write-Host ""
      Write-Host "Detected existing agent directories in your home directory:" -ForegroundColor Yellow
      for ($i = 0; $i -lt $detectedAgents.Count; $i++) {
          $idx = $i + 1
          $agentName = $detectedAgents[$i].Name
          $agentPath = $detectedAgents[$i].Path
          Write-Host ("  {0}) [x] {1} (~/{2})" -f $idx, $agentName, $agentPath) -ForegroundColor Cyan
      }
      Write-Host ""
      $confirm = Read-Host "Do you want to install the skill to these detected agents? (Y/n)"
      if ($confirm -eq "" -or $confirm.ToUpper() -eq "Y") {
          foreach ($agent in $detectedAgents) {
              $agentName = $agent.Name
              $agentPath = $agent.Path
              Write-Host ""
              Write-Host ("Installing to {0}..." -f $agentName) -ForegroundColor Cyan
              Copy-SkillFolder $srcSkillDir (Join-Path $HOME ($agentPath + "/roblox-best-practices"))
          }
          # Show assumed installed for non-detected agents
          foreach ($agent in $additionalAgents) {
              if ($detectedAgents.Name -notcontains $agent.Name) {
                  Write-Host ("[INSTALLED] (Assumed) " + $agent.Name) -ForegroundColor Green
              }
          }
      }
  } else {
      Write-Host ""
      Write-Host "No other agent directories detected in your home directory. Skip additional agents." -ForegroundColor Gray
      # Show assumed installed for all
      foreach ($agent in $additionalAgents) {
          Write-Host ("[INSTALLED] (Assumed) " + $agent.Name) -ForegroundColor Green
      }
  }

  # The workspace path goes last, unconditionally. When it resolves to the same
  # folder as an agent target above (running from the home directory), Copy-SkillFolder
  # reports it as already installed rather than deleting and rewriting the copy.
  Write-Host ""
  Write-Host "Installing to Universal (./.agents/skills)..." -ForegroundColor Cyan
  Copy-SkillFolder $srcSkillDir (Join-Path "." ".agents\skills\roblox-best-practices")

  Write-Host ""
  Write-Host "[SUCCESS] Installation complete!" -ForegroundColor Green

} finally {
  # Cleanup temp directory
  if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}

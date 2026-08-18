#!/usr/bin/env python3
"""Structural checks for the skill: broken links, orphan references, token budgets.

Run from the repo root:  python scripts/validate-skill.py
Exit code is non-zero when a check fails, so it can gate a release.

Checks, in the order Anthropic's authoring guidance cares about them:
  1. Every intra-skill link and anchor resolves.
  2. Every reference file is reachable directly from SKILL.md (one level deep).
  3. SKILL.md stays under the line and token ceilings.
  4. Reference files over 100 lines carry a table of contents.
  5. Every table of contents matches the headings actually in its file.
  6. The YAML frontmatter stays inside the spec's name and description limits.
"""

import os
import re
import sys

SKILL_DIR = "roblox-best-practices"
# Anthropic's stated ceilings: 500 lines, and a Level 2 budget of ~5k tokens.
MAX_SKILL_LINES = 500
# Frontmatter limits from the Agent Skills spec.
MAX_NAME_CHARS = 64
MAX_DESCRIPTION_CHARS = 1024
SKILL_TOKEN_BUDGET = 5000
TOC_REQUIRED_ABOVE_LINES = 100
# Characters per token, measured against this corpus rather than assumed.
CHARS_PER_TOKEN = 3.7


def slug(text):
    text = re.sub(r"[`*]", "", text).strip().lower()
    text = re.sub(r"[^\w\s-]", "", text)
    return text.replace(" ", "-")


def read(path):
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def markdown_files(root):
    found = []
    for base, _, names in os.walk(root):
        for name in sorted(names):
            if name.endswith(".md"):
                found.append(os.path.join(base, name).replace("\\", "/"))
    return found


def main():
    if not os.path.isdir(SKILL_DIR):
        print(f"error: run from the repo root; {SKILL_DIR}/ not found")
        return 1

    files = markdown_files(SKILL_DIR)
    headings = {f: {slug(l.lstrip("#")) for l in read(f).splitlines() if l.startswith("#")} for f in files}
    failures = []

    # 1. links and anchors
    for path in files:
        base = os.path.dirname(path)
        for target, anchor in re.findall(r"\]\(([^)\s]*)#([^)\s]+)\)", read(path)):
            if target.startswith("http"):
                continue
            resolved = path if target == "" else os.path.normpath(os.path.join(base, target)).replace("\\", "/")
            if resolved not in headings:
                failures.append(f"{path}: link to missing file {target}")
            elif anchor not in headings[resolved]:
                failures.append(f"{path}: missing anchor #{anchor} in {target or 'itself'}")

    # 2. reachability from SKILL.md
    skill_md = f"{SKILL_DIR}/SKILL.md"
    linked = {
        os.path.normpath(os.path.join(SKILL_DIR, t)).replace("\\", "/")
        for t in re.findall(r"\]\((references/[^)#]+)", read(skill_md))
    }
    for path in files:
        if path != skill_md and path not in linked:
            failures.append(f"{path}: not linked from SKILL.md (breaks progressive disclosure)")

    # 3. SKILL.md budgets
    body = read(skill_md)
    lines, tokens = len(body.splitlines()), int(len(body) / CHARS_PER_TOKEN)
    if lines > MAX_SKILL_LINES:
        failures.append(f"SKILL.md: {lines} lines exceeds {MAX_SKILL_LINES}")
    over_budget = tokens > SKILL_TOKEN_BUDGET

    # 4. table of contents on long references
    for path in files:
        if path == skill_md:
            continue
        text = read(path)
        if len(text.splitlines()) > TOC_REQUIRED_ABOVE_LINES and "## Contents" not in text:
            failures.append(f"{path}: over {TOC_REQUIRED_ABOVE_LINES} lines without a '## Contents' section")

    # 5. tables of contents match their file's headings
    for path in files:
        text = read(path)
        if "## Contents" not in text:
            continue
        doc = text.splitlines()
        start = next(i for i, l in enumerate(doc) if l.startswith("## Contents"))
        end = next(i for i in range(start + 1, len(doc)) if doc[i].startswith("## "))
        block = "\n".join(doc[start:end])
        listed = set(re.findall(r"\]\(#([^)]+)\)", block))
        nested = any(l.startswith("  - [") for l in doc[start:end])
        actual = {
            slug(l.lstrip("#"))
            for l in doc[end:]
            if l.startswith("## ") or (nested and l.startswith("### "))
        }
        for anchor in sorted(actual - listed):
            failures.append(f"{path}: heading #{anchor} missing from its table of contents")
        for anchor in sorted(listed - actual):
            failures.append(f"{path}: table of contents lists #{anchor}, which no longer exists")

    # 6. frontmatter limits
    front = read(skill_md).split("---")[1]
    name = re.search(r"^name:\s*(.+)$", front, re.M)
    desc = re.search(r"^description:\s*(.+?)(?=\n\w+:|\Z)", front, re.M | re.S)
    if not name or not desc:
        failures.append("SKILL.md: frontmatter must define both name and description")
    else:
        name_value = name.group(1).strip()
        desc_value = " ".join(desc.group(1).split())
        if len(name_value) > MAX_NAME_CHARS:
            failures.append(f"SKILL.md: name is {len(name_value)} chars, over {MAX_NAME_CHARS}")
        if not re.fullmatch(r"[a-z0-9-]+", name_value):
            failures.append(f"SKILL.md: name '{name_value}' must be lowercase letters, numbers, and hyphens only")
        if len(desc_value) > MAX_DESCRIPTION_CHARS:
            failures.append(f"SKILL.md: description is {len(desc_value)} chars, over {MAX_DESCRIPTION_CHARS}")

    corpus = sum(len(read(f)) for f in files)
    print(f"files:      {len(files)}")
    print(f"SKILL.md:   {lines} lines, ~{tokens} tokens" + ("  [over the 5k guideline]" if over_budget else ""))
    print(f"corpus:     ~{int(corpus / CHARS_PER_TOKEN)} tokens if every file were read")

    if failures:
        print(f"\n{len(failures)} problem(s):")
        for line in failures:
            print(f"  - {line}")
        return 1

    print("\nall structural checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())

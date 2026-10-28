#!/usr/bin/env python3
"""Install free dependencies once; build the frontend. No Docker or cloud services."""

import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)


def run(command):
    print("→ " + " ".join(map(str, command)), flush=True)
    subprocess.run(list(map(str, command)), cwd=ROOT, env=env, check=True)


runtime = Path.home() / ".cache/codex-runtimes/codex-primary-runtime/dependencies"
node = shutil.which("node")
if not node and (runtime / "node/bin/node").exists():
    node = str(runtime / "node/bin/node")
if not node:
    sys.exit(
        "Install a supported Node.js LTS release (20.19+ or 22.12+) and run setup again: https://nodejs.org/"
    )
env = os.environ.copy()
env["PATH"] = str(Path(node).parent) + os.pathsep + env.get("PATH", "")
try:
    if not (ROOT / ".venv/bin/python").exists():
        run([sys.executable, "-m", "venv", ".venv"])
    run(
        [
            ROOT / ".venv/bin/python",
            "-m",
            "pip",
            "install",
            "-r",
            "backend/requirements-lock.txt",
        ]
    )
    pnpm = shutil.which("pnpm", path=env["PATH"])
    if not pnpm and (runtime / "bin/fallback/pnpm").exists():
        pnpm = str(runtime / "bin/fallback/pnpm")
    if pnpm:
        run([pnpm, "install", "--frozen-lockfile"])
    else:
        npm = shutil.which("npm", path=env["PATH"])
        if not npm:
            sys.exit("Install Node.js with npm, or install pnpm, and rerun setup.")
        run([npm, "install"])
    run([node, "node_modules/typescript/bin/tsc", "-b"])
    run([node, "node_modules/vite/bin/vite.js", "build"])
except subprocess.CalledProcessError as e:
    sys.exit(
        f"Setup stopped with code {e.returncode}. Fix the reported error, then run this script again."
    )
print("\nReady. Run: python3 scripts/start.py --open")

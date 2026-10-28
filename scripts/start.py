#!/usr/bin/env python3
"""Start one local process. The FastAPI server also serves the compiled React UI."""

import os
from pathlib import Path
import shutil
import subprocess
import sys
import webbrowser
import threading

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
python = ROOT / ".venv/bin/python"
if not python.exists():
    sys.exit("First run: python3 scripts/setup.py")
if not (ROOT / "dist/index.html").exists():
    sys.exit("The frontend is not built. Run: python3 scripts/setup.py")
print(
    "\n  WealthLab AI\n  Your financial command center\n\n  Open http://127.0.0.1:8000\n  Press Control+C to stop.\n",
    flush=True,
)
if "--open" in sys.argv:
    threading.Timer(2, lambda: webbrowser.open("http://127.0.0.1:8000")).start()
try:
    subprocess.run(
        [
            str(python),
            "-m",
            "uvicorn",
            "backend.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
        ],
        cwd=ROOT,
        check=True,
    )
except KeyboardInterrupt:
    pass
except subprocess.CalledProcessError as e:
    sys.exit(e.returncode)

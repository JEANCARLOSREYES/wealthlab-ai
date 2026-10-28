#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if [[ ! -f .venv/bin/python || ! -f dist/index.html ]]; then
  python3 scripts/setup.py || { read -k 1 "?Setup stopped. Press any key to close."; exit 1; }
fi
python3 scripts/start.py --open

#!/usr/bin/env python3
"""Development runner with hot reload."""
import subprocess
import sys
import os

def main():
    os.chdir(os.path.dirname(__file__) + "/..")
    # Run with watchfiles for auto-reload
    subprocess.run([
        "python", "-m", "watchfiles",
        "--filter", "python",
        "python", "-m", "sonix.main", "tui"
    ])

if __name__ == "__main__":
    main()
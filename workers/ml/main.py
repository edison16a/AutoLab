"""Optional ML worker entry point: python main.py --device <id> [--simulate]

Kept as a thin shim so the existing command keeps working. The worker itself
lives in autolab_worker.
"""

from autolab_worker.cli import main

if __name__ == "__main__":
    main()

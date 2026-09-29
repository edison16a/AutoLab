"""Outbound-only Raspberry Pi agent: python -m autolab_agent.main --simulate

The systemd unit and the docs start the agent through this module, so it stays
a thin entry point. The command line lives in cli.py.
"""

from .cli import main

if __name__ == "__main__":
    main()

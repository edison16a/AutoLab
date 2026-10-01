"""python -m autolab_agent.identity, which install.sh uses to show the Device ID."""

import json
import uuid

from autolab_agent import identity


def test_identity_is_made_once_and_printed(tmp_path, monkeypatch, capsys):
    credentials = tmp_path / "autolab" / "credentials.json"
    monkeypatch.setattr("sys.argv", ["identity", "--credentials", str(credentials)])
    identity.main()
    identity.main()
    first, second = capsys.readouterr().out.split()
    assert first == second == json.loads(credentials.read_text())["device_id"]
    assert uuid.UUID(first)

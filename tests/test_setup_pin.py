"""The fixed setup PIN in /etc/autolab/setup-pin, written by install.sh."""

import re

import pytest

from autolab_agent.provisioning.pin import read_pin_file, setup_pin


def test_valid_file_gives_the_sticker_pin(tmp_path):
    path = tmp_path / "setup-pin"
    path.write_text(" 042195\n")
    assert read_pin_file(path) == "042195"
    assert setup_pin(path) == ("042195", True)


def test_missing_file_means_a_random_pin(tmp_path, caplog):
    pin, fixed = setup_pin(tmp_path / "missing")
    assert re.fullmatch("[0-9]{6}", pin)
    assert not fixed
    assert caplog.text == ""


@pytest.mark.parametrize(
    "content", [b"", b"12345", b"1234567", b"12a456", b"123 456", "١٢٣٤٥٦".encode()]
)
def test_invalid_file_falls_back_with_a_warning(tmp_path, caplog, content):
    path = tmp_path / "setup-pin"
    path.write_bytes(content)
    pin, fixed = setup_pin(path)
    assert re.fullmatch("[0-9]{6}", pin)
    assert not fixed
    assert "Using a random PIN" in caplog.text


def test_unreadable_file_falls_back_with_a_warning(tmp_path, caplog):
    # A folder where the file should be cannot be read as one.
    assert read_pin_file(tmp_path) is None
    assert "Cannot read" in caplog.text

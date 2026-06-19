import base64

import pytest

from api.services.license import normalize_b64, is_valid_b64


def test_normalize_strips_whitespace():
    raw = base64.b64encode(b"hello world").decode()
    wrapped = raw[:4] + "\n" + raw[4:8] + "  " + raw[8:]
    assert normalize_b64(wrapped) == raw


def test_normalize_rejects_invalid():
    with pytest.raises(ValueError):
        normalize_b64("not valid base64!!!")


def test_is_valid_true_for_good_key():
    assert is_valid_b64(base64.b64encode(b"a license").decode()) is True


def test_is_valid_true_for_wrapped_key():
    raw = base64.b64encode(b"a license blob padded out").decode()
    assert is_valid_b64(raw[:6] + "\n" + raw[6:]) is True


@pytest.mark.parametrize("value", ["", "   ", "\n\t", "%%%not-base64%%%"])
def test_is_valid_false(value):
    assert is_valid_b64(value) is False

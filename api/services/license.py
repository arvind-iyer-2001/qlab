"""Shared base64 kdb+ license helpers.

Pasted license keys often wrap across lines, so callers strip whitespace before
validating. Used by the users router (upload) and the app startup check.
"""

import base64


def normalize_b64(s: str) -> str:
    """Strip whitespace from a pasted base64 key and validate it.

    Returns the cleaned (whitespace-free) base64 string. Raises ValueError if
    the input is not valid base64.
    """
    cleaned = "".join(s.split())
    try:
        base64.b64decode(cleaned, validate=True)
    except Exception as exc:
        raise ValueError("Invalid base64 license") from exc
    return cleaned


def is_valid_b64(s: str) -> bool:
    """True if `s` is non-empty and valid base64 (after whitespace strip)."""
    if not s or not s.strip():
        return False
    try:
        normalize_b64(s)
        return True
    except ValueError:
        return False

"""Load .env once before any test module imports services that capture env at
import time.

`api/services/judge.py` and `runner.py` read QLAB_DOCKER_IMAGE / QLAB_LICENSE_B64
into module-level constants on first import. Unit tests import those modules
without an env, so the live integration tests need .env populated *before* the
first import wins. conftest is imported before any test module, so this runs
first. No .env file in CI → load_dotenv is a harmless no-op and the integration
tests skip themselves (see test_integration_section3.py probes).
"""
from dotenv import load_dotenv

load_dotenv()

import pytest

from api.services.judge import friendly_license_error, LICENSE_ERROR_MESSAGE


@pytest.mark.parametrize(
    "stderr",
    [
        "'kc.lic",
        "k4.lic missing",
        "host is unlicensed",
        "'lic",
        "kdb+ license expired",
        "Your licence has expired",
        "expired evaluation license",
    ],
)
def test_license_errors_are_remapped(stderr):
    assert friendly_license_error(stderr) == LICENSE_ERROR_MESSAGE


@pytest.mark.parametrize(
    "stderr",
    [
        "",
        "'type",
        "'length",
        "'rank",
        "func: '0 (signal)",
        "wsfull",
        "some unrelated runtime error",
    ],
)
def test_non_license_errors_pass_through(stderr):
    assert friendly_license_error(stderr) is None

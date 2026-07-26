import importlib
import sys


def test_api_auth_is_enabled_by_default(monkeypatch):
    monkeypatch.delenv("API_AUTH_ENABLED", raising=False)
    monkeypatch.delenv("API_SECRET_KEY", raising=False)
    sys.modules.pop("fastapi_kossi.core.settings", None)

    import fastapi_kossi.core.settings as settings

    importlib.reload(settings)

    assert settings.API_AUTH_ENABLED is True


def test_api_secret_key_has_no_hardcoded_default(monkeypatch):
    monkeypatch.delenv("API_SECRET_KEY", raising=False)
    monkeypatch.setenv("API_AUTH_ENABLED", "true")
    sys.modules.pop("fastapi_kossi.core.settings", None)

    import fastapi_kossi.core.settings as settings

    importlib.reload(settings)

    assert settings.API_SECRET_KEY == ""

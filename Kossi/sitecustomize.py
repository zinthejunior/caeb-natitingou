import sys
import os
import importlib
import types
# Ensure repository root is on sys.path so tests can import project packages
ROOT = os.path.dirname(__file__)
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# Provide loose aliases used by tests for top-level import paths
# e.g. `import api.chat` and `import services.embedding_service`
try:
    if "fastapi_kossi.api.chat" in sys.modules:
        sys.modules["api.chat"] = sys.modules["fastapi_kossi.api.chat"]
    else:
        api_mod = importlib.import_module("fastapi_kossi.api.chat")
        sys.modules["api.chat"] = api_mod
except Exception:
    pass

try:
    services_pkg = types.ModuleType("services")
    sys.modules["services"] = services_pkg
    embedding_mod = importlib.import_module("fastapi_kossi.services.embedding_service")
    sys.modules["services.embedding_service"] = embedding_mod
    services_pkg.embedding_service = embedding_mod
except Exception:
    pass

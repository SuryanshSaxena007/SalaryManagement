import importlib


def test_import_app() -> None:
    importlib.import_module("app")
    importlib.import_module("app.api.v1")
    importlib.import_module("app.models")

from pathlib import Path
root = Path(r"c:\wamp64\www\Projet Bibliothèque\app1 - Copie\Kossi\fastapi_kossi")
patterns = [
    ("from core.", "from fastapi_kossi.core."),
    ("from services.", "from fastapi_kossi.services."),
    ("from agents.", "from fastapi_kossi.agents."),
    ("from models.", "from fastapi_kossi.models."),
    ("from api.", "from fastapi_kossi.api."),
]
for path in root.rglob("*.py"):
    text = path.read_text(encoding="utf-8")
    lines = []
    changed = False
    for line in text.splitlines(True):
        stripped = line.lstrip()
        if stripped.startswith("#"):
            lines.append(line)
            continue
        new_line = line
        for old, new in patterns:
            if stripped.startswith(old):
                new_line = line.replace(old, new, 1)
                changed = True
                break
        lines.append(new_line)
    if changed:
        path.write_text("".join(lines), encoding="utf-8")
        print("Updated", path)

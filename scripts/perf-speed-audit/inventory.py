# Temporary speed-audit helpers (test-only). Does not change app business logic.
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"

API_RE = re.compile(r"""['"`](/api/[^'"`\s]+)['"`]""")


def normalize(path: str) -> str:
    path = path.split("?")[0]
    path = re.sub(r"\$\{[^}]+\}", ":param", path)
    path = re.sub(r"\[[^\]]+\]", ":param", path)
    return path


def collect_frontend_apis() -> list[str]:
    found: set[str] = set()
    for p in SRC.rglob("*"):
        if p.suffix not in {".ts", ".tsx"}:
            continue
        if ".test." in p.name or p.name.endswith(".test.ts"):
            continue
        try:
            text = p.read_text(encoding="utf-8")
        except OSError:
            continue
        for m in API_RE.finditer(text):
            found.add(normalize(m.group(1)))
    return sorted(found)


def collect_route_pages() -> list[str]:
    pages = []
    app = SRC / "app" / "[locale]"
    for p in app.rglob("page.tsx"):
        rel = p.relative_to(app).as_posix().replace("/page.tsx", "")
        if rel == "page.tsx" or rel == "":
            pages.append("/[locale]")
        else:
            pages.append("/[locale]/" + rel.replace("[projectId]", ":projectId"))
    return sorted(pages)


if __name__ == "__main__":
    apis = collect_frontend_apis()
    pages = collect_route_pages()
    out = {"pages": pages, "apis": apis, "apiCount": len(apis), "pageCount": len(pages)}
    print(json.dumps(out, ensure_ascii=False, indent=2))

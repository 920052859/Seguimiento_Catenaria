"""Refresh the public read-only fallback from the Soportes Google Sheet."""
import json
import sys
from pathlib import Path

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

SHEET_ID = "1wzNnsSueQ1yXRlWBI8qd-xWiGLyo1uf8rSDXXSeXb2s"
RANGE = "Soportes!A:X"
NUMERIC_INT = {"via", "perforacion", "fijacion", "soporte", "mensula", "aislador", "perfil", "hilo"}
NUMERIC_FLOAT = {"km", "pct"}


def cell(row, index):
    return row[index] if index < len(row) else ""


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Uso: python sync_supports_fallback.py google_token.json soportes.json")
    token_path, output_path = map(Path, sys.argv[1:])
    service = build("sheets", "v4", credentials=Credentials.from_authorized_user_file(str(token_path)))
    values = service.spreadsheets().values().get(
        spreadsheetId=SHEET_ID,
        range=RANGE,
        valueRenderOption="UNFORMATTED_VALUE",
        dateTimeRenderOption="FORMATTED_STRING",
    ).execute().get("values", [])
    if not values:
        raise RuntimeError("La hoja Soportes no devolvió datos")
    headers = [str(value).strip() for value in values[0]]
    required = {"id", "via", "km", "pct", "Etapa", "ubicacion"}
    missing = sorted(required.difference(headers))
    if missing:
        raise RuntimeError("Faltan columnas: " + ", ".join(missing))

    supports = []
    for row in values[1:]:
        if not str(cell(row, 0)).strip():
            continue
        item = {}
        for index, header in enumerate(headers):
            value = cell(row, index)
            if header in NUMERIC_INT:
                item[header] = int(float(value or 0))
            elif header in NUMERIC_FLOAT:
                item[header] = float(value or 0)
            else:
                item[header] = "" if value is None else str(value)
        supports.append(item)

    last_update = max((s.get("fecha_update", "") for s in supports), default="")
    payload = {"soportes": supports, "total": len(supports), "last_update": last_update}
    with output_path.open("w", encoding="utf-8", newline="\n") as stream:
        json.dump(payload, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    stages = sorted({s["Etapa"] for s in supports})
    locations = sorted({s["ubicacion"] for s in supports})
    print(json.dumps({"output": str(output_path), "total": len(supports), "stages": stages, "locations": locations}, ensure_ascii=False))


if __name__ == "__main__":
    main()

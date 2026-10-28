from pathlib import Path
import json
import subprocess

ROOT = Path(__file__).resolve().parent
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
UTIL = ROOT / "location_utils.js"

assert UTIL.exists(), "Missing location_utils.js"

cases = [
    {
        "input": {"ubicacion": "Tunel 8", "tunel": "Tunel 8"},
        "expected": {"environment": "Túnel", "location": "Túnel 8", "tunnel": "Túnel 8"},
    },
    {
        "input": {"ubicacion": "E13", "tunel": "Tunel 7"},
        "expected": {"environment": "Estación", "location": "Estación E13", "tunnel": "Túnel 7"},
    },
    {
        "input": {"ubicacion": "", "tunel": "Tunel 11"},
        "expected": {"environment": "Túnel", "location": "Túnel 11", "tunnel": "Túnel 11"},
    },
    {
        "input": {"ubicacion": "", "tunel": ""},
        "expected": {"environment": "No verificado", "location": "No verificado", "tunnel": "No verificado"},
    },
]

script = f"""
const api = require({json.dumps(str(UTIL))});
const cases = {json.dumps(cases, ensure_ascii=False)};
for (const item of cases) {{
  const actual = api.getSupportLocationDetail(item.input);
  if (JSON.stringify(actual) !== JSON.stringify(item.expected)) {{
    console.error(JSON.stringify({{input:item.input, expected:item.expected, actual}}));
    process.exit(1);
  }}
}}
"""
result = subprocess.run(["node", "-e", script], capture_output=True, text=True)
assert result.returncode == 0, result.stderr or result.stdout

for element_id in ["tt-environment", "tt-location", "tt-tunnel"]:
    assert f'id="{element_id}"' in HTML, f"Missing tooltip field {element_id}"

assert "CatenaryLocation.getSupportLocationDetail(s)" in HTML
assert '<script src="./location_utils.js"></script>' in HTML

print("PASS - hover tooltip distinguishes tunnel/station and shows associated tunnel")

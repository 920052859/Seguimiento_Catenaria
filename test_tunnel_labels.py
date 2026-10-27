from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
DATA = json.loads((ROOT / "soportes.json").read_text(encoding="utf-8"))["soportes"]

# The source data contains the nine expected tunnel names.
expected = {f"Tunel {number}" for number in range(6, 15)}
found = {row.get("tunel", "").strip() for row in DATA}
assert expected <= found, f"Missing source tunnel names: {sorted(expected - found)}"

# The graphical map must derive, normalize and render tunnel labels.
assert "function buildTunnelLabels" in HTML, "Missing tunnel-label derivation helper"
assert "function drawTunnelLabels" in HTML, "Missing tunnel-label canvas renderer"
assert "drawTunnelLabels(src" in HTML, "Tunnel labels are not drawn by renderMap"
assert "raw.match(/^Tunel\\s+(\\d+)$/i)" in HTML, "Tunnel field must reject non-tunnel values such as E18"
assert "Túnel ${number}" in HTML, "Visible labels must use the Spanish accent: Túnel"
assert "medianKm" in HTML, "Each tunnel label must be positioned from its median source PK"

# Labels should be rendered before the support symbols so tunnel context remains background information.
labels_call = HTML.index("drawTunnelLabels(src")
supports_block = HTML.index("// ---  SOPORTES DRAWING ---")
assert labels_call < supports_block, "Tunnel labels must be drawn before support symbols"

print("PASS - graphical map renders normalized Túnel 6–14 labels from source PKs")

from pathlib import Path
import json
import re

HTML = Path(r"D:/2026/00_inbox/07. SISTEMAS, IA Y AUTOMATIZACIÓN/Seguimiento_Grafico_Catenaria/web_catenaria/index.html")
text = HTML.read_text(encoding="utf-8")


def test_sequential_helpers_exist():
    assert "function laterActivityIsDone" in text
    assert "function applySequentialMark" in text
    assert "function requestUncheck" in text


def test_table_displays_full_activity_names():
    for label in ["Perforación", "Fijación", "Soporte", "Ménsula", "Aislador", "Perfil", "Hilo de contacto"]:
        assert f">{label}<" in text


def test_map_has_hover_tooltip_logic():
    assert "function findMapSoporteAt" in text
    assert "function showMapTooltip" in text
    assert "mousemove" in text and "map-tooltip" in text


def test_dashboard_refreshes_all_visuals():
    assert "function refreshDashboard" in text
    expected = ["renderKPIs();", "renderGantt();", "renderCrono();", "renderMap();"]
    for call in expected:
        assert call in text


def test_uncheck_confirmation_present():
    assert "Sí, desmarcar" in text
    assert "confirm-bg" in text


def test_map_has_direction_labels_and_support_level_zoom():
    assert "Callao" in text and "Ate" in text
    match = re.search(r"const MAX_ZOOM\s*=\s*(\d+)", text)
    assert match and int(match.group(1)) >= 40
    assert "function drawTechnicalSupport" in text


def test_viewer_mode_guards_all_write_actions():
    for function_name in ["toggleAct", "saveComment", "saveModal", "bulkMarkModal"]:
        start = text.index(f"function {function_name}")
        body = text[start:start + 500]
        assert "isViewerMode" in body, f"{function_name} debe bloquear edición en modo visor"


def test_shared_weekly_history_ui_exists():
    for function_name in ["loadHistory", "renderHistory", "saveSnapshot"]:
        assert f"function {function_name}" in text or f"async function {function_name}" in text
    assert "action=history" in text
    assert "save_snapshot" in text


def test_alignment_profile_comes_from_dwg_pk_points():
    profile_path = HTML.parent / "alignment_profile.json"
    assert profile_path.exists()
    profile = json.loads(profile_path.read_text(encoding="utf-8"))
    assert profile["source"].endswith("_9.dwg")
    assert len(profile["points"]) >= 80
    assert profile["points"][0]["km"] <= 11100
    assert profile["points"][-1]["km"] >= 19200
    assert "alignment_profile.json" in text

from pathlib import Path

CODE = Path(r"D:/2026/00_inbox/07. SISTEMAS, IA Y AUTOMATIZACIÓN/Seguimiento_Grafico_Catenaria/web_catenaria/Code.gs").read_text(encoding="utf-8")


def test_sheet_auto_configuration():
    assert "function configurar()" in CODE
    assert "getActiveSpreadsheet" in CODE
    assert "PropertiesService.getScriptProperties().setProperty('SHEET_ID'" in CODE


def test_health_check():
    assert "function probarConexion()" in CODE
    assert "action === 'health'" in CODE


def test_backend_enforces_sequence():
    assert "No se puede desmarcar" in CODE
    assert "for (let p=0; p<=activityIndex; p++)" in CODE


def test_required_headers_are_validated():
    assert "Faltan encabezados en la fila 1" in CODE


def test_backend_supports_shared_history():
    assert "const HISTORY_SHEET" in CODE
    assert "action === 'history'" in CODE
    assert "body.action === 'save_snapshot'" in CODE
    assert "function getHistory()" in CODE
    assert "function saveHistorySnapshot" in CODE


def test_backend_can_schedule_weekly_snapshots():
    assert "function configurarSnapshotSemanal()" in CODE
    assert ".everyWeeks(1)" in CODE


def test_backend_formats_update_date_for_lima():
    assert "function formatLimaDateTime" in CODE
    assert "'dd/MM/yyyy HH:mm'" in CODE
    assert "formatLimaDateTime(now)" in CODE


def test_backend_tracks_binary_activity_delta():
    assert "que_se_actualiza" in CODE
    assert "function activityDeltaMask" in CODE
    assert "join('')" in CODE


def test_backend_exposes_shared_daily_report():
    assert "action === 'daily_report'" in CODE
    assert "function getDailyReport" in CODE
    assert "America/Lima" in CODE
    assert "LOG_SHEET" in CODE


def test_backend_supports_vehicle_column():
    assert "vehiculo" in CODE
    assert "idx.vehiculo" in CODE

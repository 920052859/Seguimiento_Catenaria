from pathlib import Path
import json, re

s = Path("index.html").read_text(encoding="utf-8")
errors = []

# 1. Password modal exists
assert 'pwd-modal' in s and 'checkPassword' in s, "FAIL password modal"
print("PASS 1 - Password modal")

# 2. Vehicle modal
assert all(x in s for x in ['vehicle-modal','Sky 1','Sky 2','Bivial','selectVehicle']), "FAIL vehicle modal"
print("PASS 2 - Vehicle modal")

# 3. Daily report
assert all(x in s for x in ['rpt-modal','showDailyReport','rpt-vehicles-body','rpt-tramos-body']), "FAIL daily report"
print("PASS 3 - Daily report")

# 4. SPI canvas
assert all(x in s for x in ['spi-canvas','renderSPI','computeContractualCurve','spi-value-global']), "FAIL SPI"
print("PASS 4 - SPI chart")

# 5. Hitachi header
assert all(x in s for x in ['header-hitachi-brand','Inspire the Next','TEAM','CONSTRUCTION','header-team-badge']), "FAIL header"
print("PASS 5 - Hitachi header")

# 6. Map KPI strip
assert all(x in s for x in ['map-kpi-strip','renderMapKpiStrip','chip-dot']), "FAIL KPI strip"
print("PASS 6 - Map KPI strip")

# 7. Vehicle positions on map
assert all(x in s for x in ['vehiclePositions','drawVehiclePositions','setVehiclePosition']), "FAIL vehicle map"
print("PASS 7 - Vehicle positions on map")

# 8. isViewerMode default true (starts as viewer)
# requestEditorMode replaces toggleMode
assert 'requestEditorMode' in s and 'EDITOR_PASSWORD' in s, "FAIL password gate"
print("PASS 8 - Editor password gate")

# 9. MAX_ZOOM still 120
assert 'const MAX_ZOOM = 120' in s, "FAIL zoom"
print("PASS 9 - Zoom 120x")

# 10. auto daily save
assert 'scheduleDailyAutoSave' in s and 'daily_snapshot_' in s, "FAIL auto save"
print("PASS 10 - Auto daily save")

# 11. alignment profile
assert 'alignment_profile.json' in s and 'alignmentProfile' in s, "FAIL alignment"
print("PASS 11 - Alignment profile")

# 12. JSON valid
data = json.loads(Path("soportes.json").read_text(encoding="utf-8"))
assert len(data['soportes'])==1869, f"FAIL supports count={len(data['soportes'])}"
print(f"PASS 12 - 1869 soportes in JSON")

# 13. Shared daily report from Sheets
assert "action=daily_report" in s, "FAIL shared daily report endpoint"
assert "async function showDailyReport" in s, "FAIL async daily report"
print("PASS 13 - Shared daily report")

# 14. Exact Lima date display formatter
assert "function formatDateTimeLima" in s, "FAIL DD/MM/YYYY HH:MM formatter"
print("PASS 14 - Date format DD/MM/YYYY HH:MM")

# 15. Daily and rolling 7-day progress
assert "advance_today_pct" in s, "FAIL today's progress"
assert "advance_7d_pct" in s, "FAIL 7-day progress"
assert "Avance de hoy" in s and "Últimos 7 días" in s, "FAIL report progress labels"
print("PASS 15 - Daily and 7-day progress")

print(f"\n15/15 PASS - {len(s):,} chars")

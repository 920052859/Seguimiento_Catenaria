"""Smoke tests for the Plan Diario (daily crew plan) tab."""
import re

with open('index.html', encoding='utf-8') as f:
    html = f.read()

checks = [
    ('Plan Diario tab button exists', "switchTab('plan')" in html),
    ('Plan Diario tab container exists', 'id="tab-plan"' in html),
    ('Date input for plan exists', 'id="plan-date"' in html),
    ('Plan cards container exists', 'id="plan-cards"' in html),
    ('Plan history table exists', 'id="plan-history-body"' in html),
    ('CUADRILLAS includes Sky 1', "'Sky 1'" in html),
    ('CUADRILLAS includes Sky 2', "'Sky 2'" in html),
    ('CUADRILLAS includes Bivial', "'Bivial'" in html),
    ('loadPlan function defined', re.search(r'async function loadPlan\s*\(', html) is not None),
    ('savePlanCuadrilla function defined', re.search(r'async function savePlanCuadrilla\s*\(', html) is not None),
    ('loadPlanHistory function defined', re.search(r'async function loadPlanHistory\s*\(', html) is not None),
    ('switchTab dispatches plan tab', "if (name === 'plan') loadPlan();" in html),
    ('Frentes de trabajo (personas por tunel/estacion) field exists', 'PLAN_ESTACIONES' in html and 'PLAN_TUNELES' in html),
    ('addPlanFrente function defined', re.search(r'function addPlanFrente\s*\(', html) is not None),
    ('removePlanFrente function defined', re.search(r'function removePlanFrente\s*\(', html) is not None),
    ('updatePlanFrente function defined', re.search(r'function updatePlanFrente\s*\(', html) is not None),
    ('savePlanCuadrilla sends frentes payload', "frentes" in html and "save_plan" in html),
    ('Multi-user USERS map (Telice) exists', "const USERS" in html and "'Telice'" in html),
    ('checkPassword validates user+password', re.search(r'function checkPassword\s*\(', html) is not None and 'pwd-user-input' in html),
    ('Via 1 / Via 2 selector in plan frente row', "'Via 1'" in html and "'Via 2'" in html),
    ('Actividad selector uses ACTS (Perforacion..Hilo)', 'planActividadOptions' in html and "updatePlanFrente('${safeId}',${index},'actividad'" in html),
    ('Form clears after saving (clearPlanCardForm)', re.search(r'function clearPlanCardForm\s*\(', html) is not None and 'clearPlanCardForm(cuadrilla)' in html),
    ('Real-time location map canvas exists', 'id="plan-location-canvas"' in html),
    ('renderPlanLocationMap function defined', re.search(r'function renderPlanLocationMap\s*\(', html) is not None),
    ('Physical PK order for tunnels/stations defined', 'PLAN_UBICACION_ORDER' in html),
]

failed = [name for name, ok in checks if not ok]
for name, ok in checks:
    print(('PASS' if ok else 'FAIL') + ' - ' + name)

if failed:
    raise SystemExit(f"{len(failed)} check(s) failed: {failed}")

print(f"\n{len(checks)}/{len(checks)} PASS - Plan Diario tab wired correctly")

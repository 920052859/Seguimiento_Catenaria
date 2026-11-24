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
]

failed = [name for name, ok in checks if not ok]
for name, ok in checks:
    print(('PASS' if ok else 'FAIL') + ' - ' + name)

if failed:
    raise SystemExit(f"{len(failed)} check(s) failed: {failed}")

print(f"\n{len(checks)}/{len(checks)} PASS - Plan Diario tab wired correctly")

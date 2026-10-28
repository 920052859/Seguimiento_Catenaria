import unittest
from pathlib import Path

ROOT = Path(__file__).parent
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")
SCHEDULE = (ROOT / "schedule_curve.json").read_text(encoding="utf-8")


class StageScheduleUiTests(unittest.TestCase):
    def test_stage_filter_is_visible_and_applied(self):
        self.assertIn('id="f-etapa"', INDEX)
        self.assertIn("etapa: document.getElementById('f-etapa').value", INDEX)
        self.assertIn("CatenariaSchedule.filterSupports", INDEX)

    def test_kpis_and_tramo_progress_follow_active_filters(self):
        filter_body = INDEX[INDEX.index("function applyFilters"):INDEX.index("//  TABS")]
        self.assertIn("const scope = filtered;", INDEX)
        self.assertIn("renderKPIs();", filter_body)
        self.assertIn("renderGantt();", filter_body)
        self.assertIn("renderCrono();", filter_body)

    def test_schedule_curve_and_station_boxes_are_integrated(self):
        self.assertIn('<script src="./kpi_schedule_utils.js"></script>', INDEX)
        self.assertIn("schedule_curve.json", INDEX)
        self.assertIn("buildPlannedCurve", INDEX)
        self.assertIn("drawStationBounds", INDEX)
        self.assertIn('id="stage-kpi-rows"', INDEX)
        self.assertIn('"Tramo 3"', SCHEDULE)
        self.assertIn('"Tramo 4"', SCHEDULE)

    def test_schedule_uses_detailed_activity_mapping(self):
        self.assertIn('"Taladro de Bóveda de Túnel"', SCHEDULE)
        self.assertIn('"Montaje de Espárragos"', SCHEDULE)
        self.assertIn('"aislador": "proxy de Montaje de Tubo + Estribo + Suspensión"', SCHEDULE)
        self.assertNotIn('"source_category": "Aislador de sección"', SCHEDULE)


if __name__ == "__main__":
    unittest.main()

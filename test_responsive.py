from pathlib import Path

HTML = Path("index.html").read_text(encoding="utf-8")


def test_mobile_header_uses_two_row_grid():
    assert "@media(max-width:600px)" in HTML
    assert "grid-template-columns:minmax(0,1fr) 96px" in HTML
    assert ".header-title-block{grid-column:1/-1" in HTML


def test_mobile_has_no_fixed_width_modals():
    assert ".rpt-box,.vehicle-box,.pwd-box" in HTML
    assert "min-width:0" in HTML
    assert "width:calc(100% - 24px)" in HTML


def test_mobile_tabs_keep_editor_visible():
    assert ".tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))" in HTML
    assert ".tab-mode-toggle{grid-column:1/-1" in HTML


def test_mobile_filters_fit_viewport():
    assert ".filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))" in HTML
    assert ".search-box,.user-box{grid-column:1/-1" in HTML


def test_hitachi_tagline_is_readable_on_mobile():
    assert ".hitachi-tagline{font-size:.6rem" in HTML
    assert "color:#cbd5e1" in HTML

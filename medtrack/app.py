# -*- coding: utf-8 -*-
"""
MedTrack — учёт приёма лекарств.
Веб-приложение (Flask + SQLite). Запуск:  python app.py  ->  http://localhost:5000
"""
import json
import os
import sqlite3
from datetime import datetime, date, timedelta

from flask import Flask, g, jsonify, render_template, request

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "medtrack.db")

app = Flask(__name__)

MED_TYPES = ["таблетки", "капсулы", "капли", "сироп", "укол", "мазь",
             "ингаляция", "свечи", "порошок", "другое"]

DOSE_INTERVAL_H = {          # минимальный рекомендуемый интервал между приёмами, часов
    "1×": 24, "2×": 12, "3×": 8, "4×": 6, "по требованию": 4,
}


# ---------------------------------------------------------------- база данных
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.executescript("""
    CREATE TABLE IF NOT EXISTS meds(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        med_type TEXT DEFAULT 'таблетки',
        dosage TEXT DEFAULT '',
        description TEXT DEFAULT '',
        color TEXT DEFAULT '#4ade80',
        archived INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS schedules(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        med_id INTEGER NOT NULL REFERENCES meds(id) ON DELETE CASCADE,
        valid_from TEXT NOT NULL,      -- дата, с которой действует (включительно)
        valid_to   TEXT,               -- NULL = действует по сей день
        frequency TEXT DEFAULT '1×',   -- 1× / 2× / 3× / 4× / по требованию
        planned_times TEXT DEFAULT '[]', -- JSON-массив строк 'HH:MM'
        UNIQUE(med_id, valid_from)
    );
    CREATE TABLE IF NOT EXISTS doses(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        med_id INTEGER NOT NULL REFERENCES meds(id) ON DELETE CASCADE,
        taken_at TEXT NOT NULL,           -- 'YYYY-MM-DD HH:MM'
        note TEXT DEFAULT '',
        undone INTEGER DEFAULT 0          -- отменено?
    );
    """)
    db.commit()
    db.close()


init_db()


# ---------------------------------------------------------------- helpers
def rows(cur):
    return [dict(r) for r in cur.fetchall()]


def parse_dt(s):
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M"):
        try:
            return datetime.strptime(s.strip(), fmt)
        except (ValueError, AttributeError):
            continue
    return None


def schedule_for_date(db, d):
    """План на дату: список словарей {med..., frequency, planned_times[list]}"""
    out = []
    cur = db.execute("""
        SELECT m.id, m.name, m.med_type, m.dosage, m.description, m.color,
               s.frequency, s.planned_times
        FROM schedules s JOIN meds m ON m.id = s.med_id
        WHERE m.archived = 0 AND s.valid_from <= ?
          AND (s.valid_to IS NULL OR s.valid_to >= ?)
    """, (d, d))
    for r in rows(cur):
        r["planned_times"] = json.loads(r["planned_times"] or "[]")
        out.append(r)
    return out


def gaps_hours(taken_list):
    """Промежутки (часы) между последовательными принятыми дозами."""
    gaps = []
    prev = None
    for t in sorted(taken_list):
        if prev is not None:
            gaps.append(round((t - prev).total_seconds() / 3600, 1))
        prev = t
    return gaps


# ---------------------------------------------------------------- API
@app.route("/api/meta")
def api_meta():
    return jsonify(types=MED_TYPES, intervals=DOSE_INTERVAL_H)


@app.route("/api/meds", methods=["GET"])
def list_meds():
    db = get_db()
    only_active = request.args.get("active") == "1"
    q = "SELECT * FROM meds" + (" WHERE archived=0" if only_active else "") + " ORDER BY archived, name"
    return jsonify(rows=db.execute(q))


@app.route("/api/meds", methods=["POST"])
def add_med():
    d = request.get_json(force=True)
    if not d.get("name", "").strip():
        return jsonify(error="Название обязательно"), 400
    db = get_db()
    cur = db.execute(
        "INSERT INTO meds(name, med_type, dosage, description, color) VALUES (?,?,?,?,?)",
        (d["name"].strip(), d.get("med_type", "таблетки"), d.get("dosage", ""),
         d.get("description", ""), d.get("color", "#4ade80")))
    db.commit()
    return jsonify(id=cur.lastrowid), 201


@app.route("/api/meds/<int:mid>", methods=["PUT"])
def edit_med(mid):
    d = request.get_json(force=True)
    db = get_db()
    db.execute("""UPDATE meds SET name=?, med_type=?, dosage=?, description=?, color=?, archived=?
                  WHERE id=?""",
               (d.get("name", ""), d.get("med_type", "таблетки"), d.get("dosage", ""),
                d.get("description", ""), d.get("color", "#4ade80"),
                int(bool(d.get("archived", False))), mid))
    db.commit()
    return jsonify(ok=True)


@app.route("/api/schedules", methods=["GET"])
def list_sched():
    db = get_db()
    cur = db.execute("""SELECT s.*, m.name, m.med_type, m.color FROM schedules s
                        JOIN meds m ON m.id=s.med_id ORDER BY s.valid_from DESC""")
    out = rows(cur)
    for o in out:
        o["planned_times"] = json.loads(o["planned_times"] or "[]")
    return jsonify(out)


@app.route("/api/schedules", methods=["POST"])
def add_sched():
    d = request.get_json(force=True)
    times = [t for t in d.get("planned_times", []) if t]
    db = get_db()
    try:
        cur = db.execute("""INSERT INTO schedules(med_id, valid_from, valid_to, frequency, planned_times)
                            VALUES (?,?,?,?,?)""",
                         (d["med_id"], d["valid_from"], d.get("valid_to") or None,
                          d.get("frequency", "1×"), json.dumps(times)))
        db.commit()
    except sqlite3.IntegrityError:
        return jsonify(error="На эту дату у лекарства уже есть план"), 409
    return jsonify(id=cur.lastrowid), 201


@app.route("/api/schedules/<int:sid>", methods=["PUT"])
def edit_sched(sid):
    d = request.get_json(force=True)
    db = get_db()
    db.execute("""UPDATE schedules SET med_id=?, valid_from=?, valid_to=?, frequency=?, planned_times=?
                  WHERE id=?""",
               (d["med_id"], d["valid_from"], d.get("valid_to") or None,
                d.get("frequency", "1×"), json.dumps(d.get("planned_times", [])), sid))
    db.commit()
    return jsonify(ok=True)


@app.route("/api/schedules/<int:sid>", methods=["DELETE"])
def del_sched(sid):
    db = get_db()
    db.execute("DELETE FROM schedules WHERE id=?", (sid,))
    db.commit()
    return jsonify(ok=True)


@app.route("/api/doses", methods=["GET"])
def list_doses():
    db = get_db()
    day = request.args.get("date")
    q = "SELECT * FROM doses WHERE undone=0"
    args = []
    if day:
        q += " AND taken_at LIKE ?"
        args.append(day + "%")
    q += " ORDER BY taken_at"
    return jsonify(rows(db.execute(q, args)))


@app.route("/api/doses", methods=["POST"])
def take_dose():
    d = request.get_json(force=True)
    dt = parse_dt(d.get("taken_at", "")) or datetime.now()
    db = get_db()
    cur = db.execute("INSERT INTO doses(med_id, taken_at, note) VALUES (?,?,?)",
                     (d["med_id"], dt.strftime("%Y-%m-%d %H:%M"), d.get("note", "")))
    db.commit()
    return jsonify(id=cur.lastrowid), 201


@app.route("/api/doses/<int:did>/undo", methods=["POST"])
def undo_dose(did):
    db = get_db()
    db.execute("UPDATE doses SET undone=1 WHERE id=?", (did,))
    db.commit()
    return jsonify(ok=True)


@app.route("/api/day/<day>")
def day_report(day):
    """Главный отчёт дня: план + факт + промежутки + предупреждения."""
    db = get_db()
    plan = schedule_for_date(db, day)
    taken = rows(db.execute(
        "SELECT * FROM doses WHERE undone=0 AND taken_at LIKE ? ORDER BY taken_at",
        (day + "%",)))
    by_med = {}
    for t in taken:
        by_med.setdefault(t["med_id"], []).append(parse_dt(t["taken_at"]))

    report, warnings = [], []
    for p in plan:
        tl = by_med.get(p["id"], [])
        gaps = gaps_hours(tl)
        min_int = DOSE_INTERVAL_H.get(p["frequency"], 6)
        status = "done" if len(tl) >= len(p["planned_times"]) and p["planned_times"] \
            else ("partial" if tl else "pending")
        last = tl[-1].strftime("%H:%M") if tl else None
        report.append(dict(p, taken_count=len(tl), gaps=gaps, last_taken=last, status=status))
        for i, gap_h in enumerate(gaps):
            if gap_h < min_int - 0.5:
                warnings.append(f"{p['name']}: промежуток {gap_h} ч меньше рекомендованного ({min_int} ч)")
    # лекарства, принятые без плана
    extra = [{"med_id": m, "times": [t.strftime('%H:%M') for t in ts]}
             for m, ts in by_med.items() if not any(p["id"] == m for p in plan)]
    return jsonify(date=day, plan=report, warnings=warnings, extra=extra)


@app.route("/api/history")
def history():
    db = get_db()
    days = request.args.get("days", type=int) or 7
    since = (date.today() - timedelta(days=days)).isoformat()
    cur = db.execute("""
        SELECT substr(taken_at,1,10) d, m.name, m.med_type, m.color, count(*) n
        FROM doses t JOIN meds m ON m.id=t.med_id
        WHERE t.undone=0 AND t.taken_at >= ?
        GROUP BY d, m.id ORDER BY d DESC, m.name""", (since + "%",))
    return jsonify(rows(cur))


@app.route("/api/import_excel", methods=["POST"])
def import_excel():
    """Импорт из таблицы пользователя: строка-заголовок = лекарства,
    ячейки ниже = время приёма, закрашенные зелёным = принято.
    Слева — дата (может быть в объединённой ячейке)."""
    f = request.files.get("file")
    if not f or not f.filename.lower().endswith((".xlsx", ".xlsm")):
        return jsonify(error="Нужен файл .xlsx"), 400
    try:
        from openpyxl import load_workbook
    except ImportError:
        return jsonify(error="Установите openpyxl: pip install openpyxl"), 500
    import io
    wb = load_workbook(io.BytesIO(f.read()), data_only=True)
    ws = wb.active

    def is_green(cell):
        fill = cell.fill
        try:
            rgb = fill.start_color.rgb or ""
        except AttributeError:
            return False
        rgb = str(rgb).lower()
        # светло-зелёные оттенки: много зелёного канала, RGB-подбор по тону
        if len(rgb) >= 8:
            r, gg, b = int(rgb[-6:-4], 16), int(rgb[-4:-2], 16), int(rgb[-2:], 16)
            return gg > 150 and gg > r + 30 and gg > b + 30
        return False

    grid = list(ws.iter_rows())
    if len(grid) < 2:
        return jsonify(error="Файл слишком короткий"), 400
    header = grid[0]
    med_cols = {}          # col_idx -> med_id
    imported = {"doses": 0, "meds": []}
    for ci, c in enumerate(header):
        name = str(c.value).strip() if c.value else ""
        if not name or ci == 0:
            continue
        cur = get_db().execute(
            "INSERT INTO meds(name, med_type, color) VALUES (?, 'другое', '#a7f3d0')",
            (name,))
        get_db().commit()
        med_cols[ci] = cur.lastrowid
        imported["meds"].append(name)

    merged_starts = {(m.min_row, m.min_col) for m in ws.merged_cells.ranges}
    carry_date = None
    for ri in range(1, len(grid)):
        row = grid[ri]
        left = row[0].value if row else None
        day = None
        if left is not None:
            s = str(left)[:10]
            for fmt in ("%Y-%m-%d", "%d.%m.%Y"):
                try:
                    day = datetime.strptime(s, fmt).date().isoformat(); break
                except ValueError:
                    pass
        if day is None and (ri, 0) in merged_starts:
            day = None  # новая объединённая дата без текста — пропускаем
        if day is None:
            day = carry_date
        if not day:
            continue
        carry_date = day
        for ci, mid in med_cols.items():
            if ci >= len(row):
                continue
            cell = row[ci]
            v = cell.value
            if v is None and not is_green(cell):
                continue
            hhmm = None
            s = str(v).strip() if v is not None else ""
            for fmt in ("%H:%M", "%H:%M:%S"):
                try:
                    hhmm = datetime.strptime(s, fmt).strftime("%H:%M"); break
                except ValueError:
                    pass
            if hhmm is None and hasattr(v, "strftime"):
                hhmm = v.strftime("%H:%M")
            tstr = f"{day} {hhmm}" if hhmm else f"{day} 12:00"
            get_db().execute(
                "INSERT INTO doses(med_id, taken_at, note) VALUES (?,?,?)",
                (mid, tstr, "импорт из Excel"))
            imported["doses"] += 1
        get_db().commit()
    return jsonify(imported)


# ---------------------------------------------------------------- pages
@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)

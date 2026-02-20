import { useState, useEffect, createContext, useContext } from "react";

// ============================================================
// SUPABASE CONFIG - Replace with your actual Supabase credentials
// ============================================================
const SUPABASE_URL = "https://ayihorjyxkjpfnevxwfw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5aWhvcmp5eGtqcGZuZXZ4d2Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MTUwNjksImV4cCI6MjA4Njk5MTA2OX0.clAs2Gyna8mYKjJBNVDgwfUQSKNBCvsjz6Jh3TnupOo";

// Simple Supabase client (no SDK needed)
const supabase = {
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY,
  async query(table, method = "GET", data = null, filters = "") {
    const url = `${SUPABASE_URL}/rest/v1/${table}${filters}`;
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "return=representation",
    };
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  from(table) {
    return {
      _table: table,
      _filters: [],
      select(cols = "*") { this._cols = cols; return this; },
      eq(col, val) { this._filters.push(`${col}=eq.${val}`); return this; },
      order(col, { ascending = true } = {}) { this._order = `${col}.${ascending ? "asc" : "desc"}`; return this; },
      async then(resolve, reject) {
        try {
          let qs = `?select=${this._cols || "*"}`;
          if (this._filters.length) qs += "&" + this._filters.join("&");
          if (this._order) qs += `&order=${this._order}`;
          const data = await supabase.query(this._table, "GET", null, qs);
          resolve({ data, error: null });
        } catch (e) { resolve({ data: null, error: e }); }
      },
      insert(rows) {
        return { async then(resolve) {
          try {
            const data = await supabase.query(table, "POST", Array.isArray(rows) ? rows : [rows]);
            resolve({ data, error: null });
          } catch(e) { resolve({ data: null, error: e }); }
        }};
      },
      update(updates) {
        const filters = this._filters;
        return { async then(resolve) {
          try {
            let qs = "?" + filters.join("&");
            const data = await supabase.query(table, "PATCH", updates, qs);
            resolve({ data, error: null });
          } catch(e) { resolve({ data: null, error: e }); }
        }};
      },
      delete() {
        const filters = this._filters;
        return { async then(resolve) {
          try {
            let qs = "?" + filters.join("&");
            await supabase.query(table, "DELETE", null, qs);
            resolve({ data: null, error: null });
          } catch(e) { resolve({ data: null, error: e }); }
        }};
      },
    };
  },
};

// ============================================================
// SQL SCHEMA (run in Supabase SQL editor)
// ============================================================
const SCHEMA_SQL = `
-- Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  grade TEXT NOT NULL,
  class TEXT NOT NULL,
  dob DATE,
  phone TEXT,
  address TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  enrolled_at DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  phone TEXT,
  qualification TEXT,
  experience_years INT DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  teacher_id UUID REFERENCES teachers(id),
  capacity INT DEFAULT 30,
  room TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Grades/Marks table
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  subject TEXT NOT NULL,
  assignment TEXT NOT NULL,
  score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL DEFAULT 100,
  term TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_audience TEXT DEFAULT 'all',
  created_by TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fee payments table
CREATE TABLE IF NOT EXISTS fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  amount NUMERIC NOT NULL,
  fee_type TEXT NOT NULL,
  due_date DATE,
  paid_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at TIMESTAMPTZ DEFAULT now()
);
`;

// ============================================================
// MOCK DATA (used when Supabase is not configured)
// ============================================================
const MOCK = {
  students: [
    { id: "s1", name: "Emma Johnson", email: "emma@school.edu", grade: "10", class: "10-A", dob: "2009-03-15", phone: "555-0101", guardian_name: "Mary Johnson", status: "active", enrolled_at: "2023-09-01" },
    { id: "s2", name: "Liam Chen", email: "liam@school.edu", grade: "10", class: "10-A", dob: "2009-07-22", phone: "555-0102", guardian_name: "Wei Chen", status: "active", enrolled_at: "2023-09-01" },
    { id: "s3", name: "Sophia Williams", email: "sophia@school.edu", grade: "11", class: "11-B", dob: "2008-11-08", phone: "555-0103", guardian_name: "Robert Williams", status: "active", enrolled_at: "2022-09-01" },
    { id: "s4", name: "Noah Martinez", email: "noah@school.edu", grade: "9", class: "9-C", dob: "2010-05-30", phone: "555-0104", guardian_name: "Carlos Martinez", status: "active", enrolled_at: "2024-09-01" },
    { id: "s5", name: "Olivia Brown", email: "olivia@school.edu", grade: "12", class: "12-A", dob: "2007-01-12", phone: "555-0105", guardian_name: "Helen Brown", status: "active", enrolled_at: "2021-09-01" },
    { id: "s6", name: "James Davis", email: "james@school.edu", grade: "11", class: "11-A", dob: "2008-09-03", phone: "555-0106", guardian_name: "Patricia Davis", status: "inactive", enrolled_at: "2022-09-01" },
  ],
  teachers: [
    { id: "t1", name: "Dr. Sarah Mitchell", email: "s.mitchell@school.edu", subject: "Mathematics", phone: "555-0201", qualification: "PhD Mathematics", experience_years: 12, status: "active" },
    { id: "t2", name: "Prof. James Anderson", email: "j.anderson@school.edu", subject: "Physics", phone: "555-0202", qualification: "MSc Physics", experience_years: 8, status: "active" },
    { id: "t3", name: "Ms. Rachel Green", email: "r.green@school.edu", subject: "English Literature", phone: "555-0203", qualification: "MA English", experience_years: 5, status: "active" },
    { id: "t4", name: "Mr. David Park", email: "d.park@school.edu", subject: "Chemistry", phone: "555-0204", qualification: "MSc Chemistry", experience_years: 10, status: "active" },
  ],
  attendance: [
    { id: "a1", student_id: "s1", date: "2026-02-17", status: "present" },
    { id: "a2", student_id: "s2", date: "2026-02-17", status: "present" },
    { id: "a3", student_id: "s3", date: "2026-02-17", status: "absent" },
    { id: "a4", student_id: "s4", date: "2026-02-17", status: "late" },
    { id: "a5", student_id: "s5", date: "2026-02-17", status: "present" },
    { id: "a6", student_id: "s1", date: "2026-02-14", status: "present" },
    { id: "a7", student_id: "s2", date: "2026-02-14", status: "absent" },
    { id: "a8", student_id: "s3", date: "2026-02-14", status: "present" },
  ],
  grades: [
    { id: "g1", student_id: "s1", subject: "Mathematics", assignment: "Midterm Exam", score: 92, max_score: 100, term: "Spring 2026", date: "2026-02-10" },
    { id: "g2", student_id: "s1", subject: "Physics", assignment: "Lab Report", score: 87, max_score: 100, term: "Spring 2026", date: "2026-02-12" },
    { id: "g3", student_id: "s2", subject: "Mathematics", assignment: "Midterm Exam", score: 78, max_score: 100, term: "Spring 2026", date: "2026-02-10" },
    { id: "g4", student_id: "s3", subject: "English Literature", assignment: "Essay", score: 95, max_score: 100, term: "Spring 2026", date: "2026-02-08" },
    { id: "g5", student_id: "s4", subject: "Chemistry", assignment: "Quiz 1", score: 65, max_score: 100, term: "Spring 2026", date: "2026-02-05" },
    { id: "g6", student_id: "s5", subject: "Mathematics", assignment: "Midterm Exam", score: 98, max_score: 100, term: "Spring 2026", date: "2026-02-10" },
  ],
  announcements: [
    { id: "an1", title: "Spring Sports Day Registration", content: "Annual sports day registrations are now open. Students can register for track, swimming, and team sports. Deadline: Feb 28th.", target_audience: "students", created_by: "Admin", priority: "high", created_at: "2026-02-15T09:00:00Z" },
    { id: "an2", title: "Parent-Teacher Meeting", content: "Quarterly parent-teacher meeting scheduled for March 5th. All teachers are requested to prepare student progress reports.", target_audience: "teachers", created_by: "Principal", priority: "high", created_at: "2026-02-14T10:00:00Z" },
    { id: "an3", title: "Library Hours Extended", content: "The school library will now be open until 7 PM on weekdays starting March 1st to support exam preparation.", target_audience: "all", created_by: "Admin", priority: "normal", created_at: "2026-02-13T11:00:00Z" },
  ],
  fees: [
    { id: "f1", student_id: "s1", amount: 1500, fee_type: "Tuition", due_date: "2026-03-01", status: "pending" },
    { id: "f2", student_id: "s2", amount: 1500, fee_type: "Tuition", due_date: "2026-03-01", paid_date: "2026-02-01", status: "paid" },
    { id: "f3", student_id: "s3", amount: 200, fee_type: "Library Fee", due_date: "2026-01-15", status: "overdue" },
    { id: "f4", student_id: "s4", amount: 1500, fee_type: "Tuition", due_date: "2026-03-01", paid_date: "2026-02-10", status: "paid" },
    { id: "f5", student_id: "s5", amount: 500, fee_type: "Activity Fee", due_date: "2026-02-28", status: "pending" },
  ],
};

// ============================================================
// STYLES
// ============================================================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --bg: #0d1117;
    --surface: #161b22;
    --surface2: #1e2530;
    --border: #30363d;
    --text: #e6edf3;
    --text2: #8b949e;
    --accent: #f4a300;
    --accent2: #e85d04;
    --green: #2ea043;
    --red: #f85149;
    --blue: #388bfd;
    --purple: #a371f7;
    --radius: 12px;
    --shadow: 0 8px 32px rgba(0,0,0,0.4);
  }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    overflow-x: hidden;
  }

  .app {
    display: flex;
    min-height: 100vh;
  }

  /* Sidebar */
  .sidebar {
    width: 260px;
    min-width: 260px;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    position: fixed;
    height: 100vh;
    overflow-y: auto;
    z-index: 100;
  }

  .sidebar-logo {
    padding: 28px 24px 20px;
    border-bottom: 1px solid var(--border);
  }

  .sidebar-logo h1 {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    color: var(--accent);
    line-height: 1.1;
  }

  .sidebar-logo p {
    font-size: 11px;
    color: var(--text2);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 4px;
  }

  .sidebar-section {
    padding: 16px 12px 8px;
  }

  .sidebar-section-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--text2);
    padding: 0 12px;
    margin-bottom: 6px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
    color: var(--text2);
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 2px;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
  }

  .nav-item:hover {
    background: var(--surface2);
    color: var(--text);
  }

  .nav-item.active {
    background: rgba(244, 163, 0, 0.12);
    color: var(--accent);
  }

  .nav-item .icon { font-size: 18px; width: 22px; }

  .sidebar-footer {
    margin-top: auto;
    padding: 16px;
    border-top: 1px solid var(--border);
  }

  .user-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border-radius: 8px;
    background: var(--surface2);
  }

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    color: #000;
    flex-shrink: 0;
  }

  .user-info p { font-size: 13px; font-weight: 600; }
  .user-info span { font-size: 11px; color: var(--text2); }

  /* Main content */
  .main {
    margin-left: 260px;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .topbar {
    padding: 20px 32px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--surface);
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .topbar h2 {
    font-family: 'Playfair Display', serif;
    font-size: 26px;
    font-weight: 700;
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .content {
    padding: 32px;
    flex: 1;
  }

  /* Cards */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
  }

  /* Stats grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 28px;
  }

  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px 24px;
    position: relative;
    overflow: hidden;
  }

  .stat-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    border-radius: var(--radius) var(--radius) 0 0;
  }

  .stat-card.gold::before { background: linear-gradient(90deg, var(--accent), var(--accent2)); }
  .stat-card.green::before { background: var(--green); }
  .stat-card.blue::before { background: var(--blue); }
  .stat-card.purple::before { background: var(--purple); }
  .stat-card.red::before { background: var(--red); }

  .stat-icon {
    font-size: 28px;
    margin-bottom: 12px;
  }

  .stat-value {
    font-family: 'Playfair Display', serif;
    font-size: 32px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 6px;
  }

  .stat-label {
    font-size: 13px;
    color: var(--text2);
    font-weight: 500;
  }

  .stat-change {
    font-size: 12px;
    margin-top: 8px;
  }

  .stat-change.up { color: var(--green); }
  .stat-change.down { color: var(--red); }

  /* Grid layouts */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }

  /* Table */
  .table-wrapper {
    overflow-x: auto;
    border-radius: var(--radius);
    border: 1px solid var(--border);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }

  th {
    text-align: left;
    padding: 12px 16px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text2);
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }

  td {
    padding: 13px 16px;
    border-bottom: 1px solid var(--border);
    color: var(--text);
  }

  tr:last-child td { border-bottom: none; }

  tr:hover td { background: var(--surface2); }

  /* Badges */
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .badge-green { background: rgba(46,160,67,0.15); color: var(--green); }
  .badge-red { background: rgba(248,81,73,0.15); color: var(--red); }
  .badge-yellow { background: rgba(244,163,0,0.15); color: var(--accent); }
  .badge-blue { background: rgba(56,139,253,0.15); color: var(--blue); }
  .badge-purple { background: rgba(163,113,247,0.15); color: var(--purple); }
  .badge-gray { background: rgba(139,148,158,0.15); color: var(--text2); }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    border: none;
    font-family: 'DM Sans', sans-serif;
  }

  .btn-primary {
    background: var(--accent);
    color: #000;
  }

  .btn-primary:hover {
    background: #fbb530;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(244,163,0,0.3);
  }

  .btn-secondary {
    background: var(--surface2);
    color: var(--text);
    border: 1px solid var(--border);
  }

  .btn-secondary:hover { background: var(--border); }

  .btn-danger {
    background: rgba(248,81,73,0.12);
    color: var(--red);
    border: 1px solid rgba(248,81,73,0.3);
  }

  .btn-danger:hover { background: rgba(248,81,73,0.2); }

  .btn-sm { padding: 6px 12px; font-size: 12px; }

  /* Form elements */
  .form-group {
    margin-bottom: 16px;
  }

  label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--text2);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }

  input, select, textarea {
    width: 100%;
    padding: 10px 14px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    transition: border-color 0.15s;
    outline: none;
  }

  input:focus, select:focus, textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(244,163,0,0.1);
  }

  select option { background: var(--surface2); }

  textarea { resize: vertical; min-height: 80px; }

  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 28px;
    width: 100%;
    max-width: 560px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: var(--shadow);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .modal-title {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 700;
  }

  .modal-close {
    background: none;
    border: none;
    color: var(--text2);
    cursor: pointer;
    font-size: 20px;
    padding: 4px;
    border-radius: 6px;
    transition: all 0.15s;
  }

  .modal-close:hover { background: var(--surface2); color: var(--text); }

  .modal-footer {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
  }

  /* Search */
  .search-box {
    position: relative;
  }

  .search-box input {
    padding-left: 38px;
    width: 280px;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text2);
    font-size: 16px;
    pointer-events: none;
  }

  /* Attendance status buttons */
  .att-btn {
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: 1.5px solid transparent;
    transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
  }

  .att-present { background: rgba(46,160,67,0.1); border-color: rgba(46,160,67,0.3); color: var(--green); }
  .att-present.active, .att-present:hover { background: var(--green); color: #fff; border-color: var(--green); }
  .att-absent { background: rgba(248,81,73,0.1); border-color: rgba(248,81,73,0.3); color: var(--red); }
  .att-absent.active, .att-absent:hover { background: var(--red); color: #fff; border-color: var(--red); }
  .att-late { background: rgba(244,163,0,0.1); border-color: rgba(244,163,0,0.3); color: var(--accent); }
  .att-late.active, .att-late:hover { background: var(--accent); color: #000; border-color: var(--accent); }
  .att-excused { background: rgba(56,139,253,0.1); border-color: rgba(56,139,253,0.3); color: var(--blue); }
  .att-excused.active, .att-excused:hover { background: var(--blue); color: #fff; border-color: var(--blue); }

  /* Progress bar */
  .progress-bar {
    height: 6px;
    background: var(--surface2);
    border-radius: 100px;
    overflow: hidden;
    margin-top: 8px;
  }

  .progress-fill {
    height: 100%;
    border-radius: 100px;
    transition: width 0.4s;
  }

  /* Announcement cards */
  .announcement-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 12px;
    border-left: 3px solid var(--accent);
  }

  .announcement-card.high { border-left-color: var(--red); }
  .announcement-card.normal { border-left-color: var(--blue); }

  .announcement-card h4 { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
  .announcement-card p { font-size: 13px; color: var(--text2); line-height: 1.5; }
  .announcement-meta { display: flex; align-items: center; gap: 12px; margin-top: 10px; font-size: 11px; color: var(--text2); }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: var(--surface2);
    border-radius: 10px;
    margin-bottom: 24px;
  }

  .tab {
    padding: 8px 18px;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    background: none;
    color: var(--text2);
    font-family: 'DM Sans', sans-serif;
    transition: all 0.15s;
  }

  .tab.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }

  .tab:hover:not(.active) { color: var(--text); }

  /* Fee card */
  .fee-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0;
    border-bottom: 1px solid var(--border);
  }

  .fee-row:last-child { border-bottom: none; }

  /* Grade pill */
  .grade-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    font-weight: 800;
    font-size: 16px;
    font-family: 'Playfair Display', serif;
  }

  .grade-A { background: rgba(46,160,67,0.15); color: var(--green); }
  .grade-B { background: rgba(56,139,253,0.15); color: var(--blue); }
  .grade-C { background: rgba(244,163,0,0.15); color: var(--accent); }
  .grade-D { background: rgba(248,81,73,0.15); color: var(--red); }

  /* Alert banner */
  .alert {
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 13px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .alert-info { background: rgba(56,139,253,0.1); border: 1px solid rgba(56,139,253,0.3); color: var(--blue); }
  .alert-warning { background: rgba(244,163,0,0.1); border: 1px solid rgba(244,163,0,0.3); color: var(--accent); }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 100px; }

  /* Animations */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-in { animation: fadeIn 0.3s ease; }

  /* Loading */
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px;
    color: var(--text2);
    font-size: 14px;
    gap: 12px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .spinner {
    width: 20px; height: 20px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--text2);
  }

  .empty-state .icon { font-size: 48px; margin-bottom: 16px; }
  .empty-state h3 { font-size: 18px; color: var(--text); margin-bottom: 8px; }
  .empty-state p { font-size: 14px; }

  /* Chart bars */
  .chart-bars {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    height: 120px;
    padding-top: 16px;
  }

  .chart-bar-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    justify-content: flex-end;
    gap: 6px;
  }

  .chart-bar {
    width: 100%;
    border-radius: 4px 4px 0 0;
    transition: height 0.5s ease;
    min-height: 4px;
  }

  .chart-bar-label {
    font-size: 10px;
    color: var(--text2);
    text-align: center;
  }

  .chart-bar-val {
    font-size: 10px;
    font-weight: 700;
    color: var(--text);
    text-align: center;
  }

  .schema-box {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    color: var(--text2);
    max-height: 300px;
    overflow-y: auto;
    white-space: pre;
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    .sidebar { transform: translateX(-100%); }
    .main { margin-left: 0; }
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .grid-2 { grid-template-columns: 1fr; }
    .form-row { grid-template-columns: 1fr; }
  }
`;

// ============================================================
// HELPERS
// ============================================================
const getLetterGrade = (score, max) => {
  const pct = (score / max) * 100;
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatCurrency = (n) => `$${Number(n).toLocaleString()}`;

// ============================================================
// COMPONENTS
// ============================================================

function Modal({ title, onClose, onSave, children }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-in">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ students, teachers, attendance, grades, fees, announcements }) {
  const activeStudents = students.filter(s => s.status === "active").length;
  const activeTeachers = teachers.filter(t => t.status === "active").length;
  const todayStr = new Date().toISOString().split("T")[0];
  const todayAtt = attendance.filter(a => a.date === todayStr);
  const presentToday = todayAtt.filter(a => a.status === "present").length;
  const totalFees = fees.reduce((sum, f) => sum + Number(f.amount), 0);
  const collectedFees = fees.filter(f => f.status === "paid").reduce((sum, f) => sum + Number(f.amount), 0);
  const avgScore = grades.length ? Math.round(grades.reduce((s, g) => s + (g.score / g.max_score) * 100, 0) / grades.length) : 0;

  const attByStatus = ["present", "absent", "late", "excused"].map(s => ({
    label: s.charAt(0).toUpperCase() + s.slice(1),
    count: attendance.filter(a => a.status === s).length,
  }));
  const maxAtt = Math.max(...attByStatus.map(a => a.count), 1);

  const colors = { present: "var(--green)", absent: "var(--red)", late: "var(--accent)", excused: "var(--blue)" };

  return (
    <div className="animate-in">
      <div className="alert alert-info">
        ℹ️ Running in demo mode with mock data. Connect your Supabase credentials to enable full database functionality.
      </div>

      <div className="stats-grid">
        <div className="stat-card gold">
          <div className="stat-icon">👨‍🎓</div>
          <div className="stat-value">{activeStudents}</div>
          <div className="stat-label">Active Students</div>
          <div className="stat-change up">↑ {students.length} total enrolled</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">👩‍🏫</div>
          <div className="stat-value">{activeTeachers}</div>
          <div className="stat-label">Teaching Staff</div>
          <div className="stat-change up">↑ {teachers.length} total staff</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{todayAtt.length ? Math.round((presentToday / todayAtt.length) * 100) : 0}%</div>
          <div className="stat-label">Today's Attendance</div>
          <div className="stat-change">{presentToday}/{todayAtt.length} present</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{avgScore}%</div>
          <div className="stat-label">Average Grade</div>
          <div className="stat-change">Across {grades.length} assessments</div>
        </div>
        <div className="stat-card gold">
          <div className="stat-icon">💰</div>
          <div className="stat-value">{formatCurrency(collectedFees)}</div>
          <div className="stat-label">Fees Collected</div>
          <div className="stat-change">{Math.round((collectedFees / totalFees) * 100)}% of {formatCurrency(totalFees)}</div>
          <div className="progress-bar" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${(collectedFees / totalFees) * 100}%`, background: "var(--accent)" }} />
          </div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">⚠️</div>
          <div className="stat-value">{fees.filter(f => f.status === "overdue").length}</div>
          <div className="stat-label">Overdue Payments</div>
          <div className="stat-change down">Requires attention</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Attendance Overview</span>
          </div>
          <div className="chart-bars">
            {attByStatus.map(a => (
              <div key={a.label} className="chart-bar-wrap">
                <div className="chart-bar-val">{a.count}</div>
                <div className="chart-bar" style={{ height: `${(a.count / maxAtt) * 90}%`, background: colors[a.label.toLowerCase()] }} />
                <div className="chart-bar-label">{a.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Announcements</span>
          </div>
          {announcements.slice(0, 3).map(a => (
            <div key={a.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className={`badge badge-${a.priority === "high" ? "red" : "blue"}`}>{a.priority}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text2)" }}>{a.content.substring(0, 90)}...</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Student Grades</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Assignment</th>
                  <th>Score</th>
                  <th>Grade</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {grades.slice(0, 5).map(g => {
                  const student = students.find(s => s.id === g.student_id);
                  const letter = getLetterGrade(g.score, g.max_score);
                  return (
                    <tr key={g.id}>
                      <td>{student?.name || "Unknown"}</td>
                      <td>{g.subject}</td>
                      <td>{g.assignment}</td>
                      <td>{g.score}/{g.max_score}</td>
                      <td><span className={`grade-pill grade-${letter}`}>{letter}</span></td>
                      <td>{formatDate(g.date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STUDENTS
// ============================================================
function Students({ students, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", Basic: "9", class: "", dob: "", phone: "", guardian_name: "", guardian_phone: "", address: "", status: "active" });

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.class.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", email: "", Basic: "9", class: "", dob: "", phone: "", guardian_name: "", guardian_phone: "", address: "", status: "active" });
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditing(s.id);
    setForm({ ...s });
    setShowModal(true);
  };

  const handleSave = () => {
    if (editing) onEdit(editing, form);
    else onAdd(form);
    setShowModal(false);
  };

  const f = form;

  return (
    <div className="animate-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Student</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Basic / Class</th>
              <th>Email</th>
              <th>Guardian</th>
              <th>Enrolled</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{s.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                  </div>
                </td>
                <td>Grade {s.grade} — {s.class}</td>
                <td style={{ color: "var(--text2)", fontSize: 13 }}>{s.email}</td>
                <td style={{ fontSize: 13 }}>{s.guardian_name || "—"}</td>
                <td style={{ fontSize: 13, color: "var(--text2)" }}>{formatDate(s.enrolled_at)}</td>
                <td><span className={`badge badge-${s.status === "active" ? "green" : "gray"}`}>{s.status}</span></td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => onDelete(s.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? "Edit Student" : "Add New Student"} onClose={() => setShowModal(false)} onSave={handleSave}>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name</label>
              <input value={f.name} onChange={e => setForm({...f, name: e.target.value})} placeholder="John Smith" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input value={f.email} onChange={e => setForm({...f, email: e.target.value})} placeholder="john@school.edu" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Class</label>
              <select value={f.grade} onChange={e => setForm({...f, grade: e.target.value})}>
                {["1","2","3","4"].map(g => <option key={g} value={g}>class {g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Class</label>
              <input value={f.class} onChange={e => setForm({...f, class: e.target.value})} placeholder="10-A" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date of Birth</label>
              <input type="date" value={f.dob} onChange={e => setForm({...f, dob: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input value={f.phone} onChange={e => setForm({...f, phone: e.target.value})} placeholder="555-0100" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Guardian Name</label>
              <input value={f.guardian_name} onChange={e => setForm({...f, guardian_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Guardian Phone</label>
              <input value={f.guardian_phone} onChange={e => setForm({...f, guardian_phone: e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label>Address</label>
            <input value={f.address} onChange={e => setForm({...f, address: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={f.status} onChange={e => setForm({...f, status: e.target.value})}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// TEACHERS
// ============================================================
function Teachers({ teachers, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", subject: "", phone: "", qualification: "", experience_years: 0, status: "active" });

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditing(null); setForm({ name: "", email: "", subject: "", phone: "", qualification: "", experience_years: 0, status: "active" }); setShowModal(true); };
  const openEdit = (t) => { setEditing(t.id); setForm({...t}); setShowModal(true); };
  const handleSave = () => { if (editing) onEdit(editing, form); else onAdd(form); setShowModal(false); };

  const subjectColors = { Mathematics: "blue", Physics: "purple", Chemistry: "gold", "English Literature": "green", History: "yellow", Biology: "green" };

  return (
    <div className="animate-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input placeholder="Search teachers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Teacher</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {filtered.map(t => (
          <div key={t.id} className="card" style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div className="avatar" style={{ width: 48, height: 48, fontSize: 16 }}>{t.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "var(--text2)" }}>{t.email}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              <span className="badge badge-blue">{t.subject}</span>
              <span className={`badge badge-${t.status === "active" ? "green" : "gray"}`}>{t.status}</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 2 }}>
              <div>📚 {t.qualification || "—"}</div>
              <div>⏱ {t.experience_years} years experience</div>
              <div>📞 {t.phone || "—"}</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openEdit(t)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => onDelete(t.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title={editing ? "Edit Teacher" : "Add New Teacher"} onClose={() => setShowModal(false)} onSave={handleSave}>
          <div className="form-row">
            <div className="form-group"><label>Full Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div className="form-group"><label>Email</label><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Subject</label><input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} /></div>
            <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Qualification</label><input value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} /></div>
            <div className="form-group"><label>Years Experience</label><input type="number" min="0" value={form.experience_years} onChange={e => setForm({...form, experience_years: e.target.value})} /></div>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// ATTENDANCE
// ============================================================
function Attendance({ students, attendance, onRecord }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [localAtt, setLocalAtt] = useState({});

  useEffect(() => {
    const dayRec = {};
    attendance.filter(a => a.date === selectedDate).forEach(a => { dayRec[a.student_id] = a.status; });
    setLocalAtt(dayRec);
  }, [selectedDate, attendance]);

  const setStatus = (studentId, status) => {
    setLocalAtt(prev => ({ ...prev, [studentId]: status }));
  };

  const saveAttendance = () => {
    Object.entries(localAtt).forEach(([sid, status]) => {
      onRecord(sid, selectedDate, status);
    });
    alert("Attendance saved!");
  };

  const stats = {
    present: Object.values(localAtt).filter(s => s === "present").length,
    absent: Object.values(localAtt).filter(s => s === "absent").length,
    late: Object.values(localAtt).filter(s => s === "late").length,
    excused: Object.values(localAtt).filter(s => s === "excused").length,
  };

  const activeStudents = students.filter(s => s.status === "active");

  return (
    <div className="animate-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ width: "auto" }} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {Object.entries(stats).map(([s, c]) => (
              <div key={s} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{c}</div>
                <div style={{ fontSize: 11, color: "var(--text2)", textTransform: "capitalize" }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" onClick={saveAttendance}>💾 Save Attendance</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              <th>Mark Attendance</th>
            </tr>
          </thead>
          <tbody>
            {activeStudents.map(s => (
              <tr key={s.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{s.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                  </div>
                </td>
                <td style={{ color: "var(--text2)", fontSize: 13 }}>{s.class}</td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["present","absent","late","excused"].map(st => (
                      <button key={st} className={`att-btn att-${st} ${localAtt[s.id] === st ? "active" : ""}`} onClick={() => setStatus(s.id, st)}>
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// GRADES
// ============================================================
function Grades({ students, grades, onAdd }) {
  const [showModal, setShowModal] = useState(false);
  const [filterStudent, setFilterStudent] = useState("");
  const [form, setForm] = useState({ student_id: "", subject: "", assignment: "", score: "", max_score: 100, term: "Spring 2026", date: new Date().toISOString().split("T")[0] });

  const filteredGrades = filterStudent ? grades.filter(g => g.student_id === filterStudent) : grades;

  const handleSave = () => {
    if (!form.student_id || !form.subject || !form.assignment || !form.score) return alert("Please fill all required fields");
    onAdd(form);
    setShowModal(false);
    setForm({ student_id: "", subject: "", assignment: "", score: "", max_score: 100, term: "Spring 2026", date: new Date().toISOString().split("T")[0] });
  };

  return (
    <div className="animate-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <select value={filterStudent} onChange={e => setFilterStudent(e.target.value)} style={{ width: 200 }}>
            <option value="">All Students</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Grade</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Subject</th>
              <th>Assignment</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Grade</th>
              <th>Term</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredGrades.map(g => {
              const student = students.find(s => s.id === g.student_id);
              const pct = Math.round((g.score / g.max_score) * 100);
              const letter = getLetterGrade(g.score, g.max_score);
              return (
                <tr key={g.id}>
                  <td style={{ fontWeight: 600 }}>{student?.name || "Unknown"}</td>
                  <td>{g.subject}</td>
                  <td style={{ color: "var(--text2)" }}>{g.assignment}</td>
                  <td>{g.score}/{g.max_score}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{pct}%</span>
                      <div className="progress-bar" style={{ flex: 1, margin: 0 }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 80 ? "var(--green)" : pct >= 60 ? "var(--accent)" : "var(--red)" }} />
                      </div>
                    </div>
                  </td>
                  <td><span className={`grade-pill grade-${letter}`}>{letter}</span></td>
                  <td style={{ fontSize: 12, color: "var(--text2)" }}>{g.term}</td>
                  <td style={{ fontSize: 13, color: "var(--text2)" }}>{formatDate(g.date)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Record Grade" onClose={() => setShowModal(false)} onSave={handleSave}>
          <div className="form-group">
            <label>Student</label>
            <select value={form.student_id} onChange={e => setForm({...form, student_id: e.target.value})}>
              <option value="">Select student...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} — {s.class}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Subject</label><input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="Mathematics" /></div>
            <div className="form-group"><label>Assignment</label><input value={form.assignment} onChange={e => setForm({...form, assignment: e.target.value})} placeholder="Midterm Exam" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Score</label><input type="number" value={form.score} onChange={e => setForm({...form, score: e.target.value})} placeholder="85" /></div>
            <div className="form-group"><label>Max Score</label><input type="number" value={form.max_score} onChange={e => setForm({...form, max_score: e.target.value})} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Term</label><input value={form.term} onChange={e => setForm({...form, term: e.target.value})} /></div>
            <div className="form-group"><label>Date</label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// FEES
// ============================================================
function Fees({ students, fees, onAdd, onMarkPaid }) {
  const [tab, setTab] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ student_id: "", amount: "", fee_type: "Tuition", due_date: "", status: "pending" });

  const filtered = tab === "all" ? fees : fees.filter(f => f.status === tab);

  const totalPending = fees.filter(f => f.status === "pending").reduce((s, f) => s + Number(f.amount), 0);
  const totalOverdue = fees.filter(f => f.status === "overdue").reduce((s, f) => s + Number(f.amount), 0);
  const totalCollected = fees.filter(f => f.status === "paid").reduce((s, f) => s + Number(f.amount), 0);

  const handleSave = () => {
    if (!form.student_id || !form.amount) return alert("Please fill required fields");
    onAdd(form);
    setShowModal(false);
    setForm({ student_id: "", amount: "", fee_type: "Tuition", due_date: "", status: "pending" });
  };

  return (
    <div className="animate-in">
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{formatCurrency(totalCollected)}</div>
          <div className="stat-label">Collected</div>
        </div>
        <div className="stat-card gold">
          <div className="stat-icon">⏳</div>
          <div className="stat-value">{formatCurrency(totalPending)}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">🚨</div>
          <div className="stat-value">{formatCurrency(totalOverdue)}</div>
          <div className="stat-label">Overdue</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {["all","pending","paid","overdue"].map(t => (
            <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Fee</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Fee Type</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Paid Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => {
              const student = students.find(s => s.id === f.student_id);
              return (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600 }}>{student?.name || "Unknown"}</td>
                  <td>{f.fee_type}</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(f.amount)}</td>
                  <td style={{ fontSize: 13 }}>{formatDate(f.due_date)}</td>
                  <td style={{ fontSize: 13, color: "var(--text2)" }}>{formatDate(f.paid_date)}</td>
                  <td><span className={`badge badge-${f.status === "paid" ? "green" : f.status === "overdue" ? "red" : "yellow"}`}>{f.status}</span></td>
                  <td>
                    {f.status !== "paid" && (
                      <button className="btn btn-secondary btn-sm" onClick={() => onMarkPaid(f.id)}>Mark Paid</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Add Fee" onClose={() => setShowModal(false)} onSave={handleSave}>
          <div className="form-group">
            <label>Student</label>
            <select value={form.student_id} onChange={e => setForm({...form, student_id: e.target.value})}>
              <option value="">Select student...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fee Type</label>
              <select value={form.fee_type} onChange={e => setForm({...form, fee_type: e.target.value})}>
                {["Tuition","Library Fee","Activity Fee","Lab Fee","Transport Fee","Sports Fee"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Amount ($)</label><input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Due Date</label><input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// ANNOUNCEMENTS
// ============================================================
function Announcements({ announcements, onAdd, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", target_audience: "all", created_by: "Admin", priority: "normal" });

  const handleSave = () => {
    if (!form.title || !form.content) return alert("Please fill all required fields");
    onAdd({ ...form, created_at: new Date().toISOString() });
    setShowModal(false);
    setForm({ title: "", content: "", target_audience: "all", created_by: "Admin", priority: "normal" });
  };

  return (
    <div className="animate-in">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>📢 New Announcement</button>
      </div>

      {announcements.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <h3>No announcements yet</h3>
          <p>Create an announcement to inform students and teachers.</p>
        </div>
      ) : (
        announcements.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map(a => (
          <div key={a.id} className={`announcement-card ${a.priority}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <span className={`badge badge-${a.priority === "high" ? "red" : "blue"}`}>{a.priority}</span>
                  <span className="badge badge-gray">{a.target_audience}</span>
                </div>
                <h4>{a.title}</h4>
                <p>{a.content}</p>
                <div className="announcement-meta">
                  <span>👤 {a.created_by}</span>
                  <span>📅 {formatDate(a.created_at)}</span>
                </div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => onDelete(a.id)} style={{ marginLeft: 12 }}>✕</button>
            </div>
          </div>
        ))
      )}

      {showModal && (
        <Modal title="New Announcement" onClose={() => setShowModal(false)} onSave={handleSave}>
          <div className="form-group"><label>Title</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Announcement title..." /></div>
          <div className="form-group"><label>Content</label><textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="Write your announcement here..." rows={4} /></div>
          <div className="form-row">
            <div className="form-group">
              <label>Target Audience</label>
              <select value={form.target_audience} onChange={e => setForm({...form, target_audience: e.target.value})}>
                <option value="all">Everyone</option>
                <option value="students">Students Only</option>
                <option value="teachers">Teachers Only</option>
                <option value="parents">Parents Only</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label>Posted By</label><input value={form.created_by} onChange={e => setForm({...form, created_by: e.target.value})} /></div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// SETTINGS / SETUP
// ============================================================
function Settings() {
  const [url, setUrl] = useState(SUPABASE_URL);
  const [key, setKey] = useState(SUPABASE_ANON_KEY);

  return (
    <div className="animate-in">
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">⚙️ Supabase Configuration</span></div>
          <div className="alert alert-warning" style={{ marginBottom: 16 }}>
            ⚠️ Update these credentials to connect your Supabase database.
          </div>
          <div className="form-group">
            <label>Supabase Project URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://your-project.supabase.co" />
          </div>
          <div className="form-group">
            <label>Supabase Anon Key</label>
            <input value={key} onChange={e => setKey(e.target.value)} placeholder="eyJhbGciOiJIUzI1NiIs..." />
          </div>
          <button className="btn btn-primary" onClick={() => alert("In a deployed app, save to env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY")}>Save Configuration</button>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">🗄️ Database Setup</span></div>
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16, lineHeight: 1.7 }}>
            Run the following SQL in your Supabase SQL Editor to create all required tables.
          </p>
          <div className="schema-box">{SCHEMA_SQL}</div>
          <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => { navigator.clipboard.writeText(SCHEMA_SQL); alert("SQL copied!"); }}>📋 Copy SQL</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><span className="card-title">📋 System Info</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {[
            { label: "System Name", value: "EduManage Pro" },
            { label: "Version", value: "1.0.0" },
            { label: "Database", value: "Supabase (PostgreSQL)" },
            { label: "Framework", value: "React 18" },
            { label: "School Year", value: "2025-2026" },
            { label: "Last Updated", value: formatDate(new Date().toISOString()) },
          ].map(item => (
            <div key={item.label} style={{ padding: 16, background: "var(--surface2)", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{item.label}</div>
              <div style={{ fontWeight: 600 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "students", label: "Students", icon: "👨‍🎓" },
  { id: "teachers", label: "Teachers", icon: "👩‍🏫" },
  { id: "attendance", label: "Attendance", icon: "✅" },
  { id: "grades", label: "Grades", icon: "📊" },
  { id: "fees", label: "Fees", icon: "💰" },
  { id: "announcements", label: "Announcements", icon: "📢" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

const PAGE_TITLES = {
  dashboard: "Dashboard",
  students: "Student Management",
  teachers: "Teacher Management",
  attendance: "Attendance Tracking",
  grades: "Grades & Assessments",
  fees: "Fee Management",
  announcements: "Announcements",
  settings: "Settings & Setup",
};

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [students, setStudents] = useState(MOCK.students);
  const [teachers, setTeachers] = useState(MOCK.teachers);
  const [attendance, setAttendance] = useState(MOCK.attendance);
  const [grades, setGrades] = useState(MOCK.grades);
  const [fees, setFees] = useState(MOCK.fees);
  const [announcements, setAnnouncements] = useState(MOCK.announcements);

  const genId = () => Math.random().toString(36).slice(2);

  // Student CRUD
  const addStudent = (data) => setStudents(prev => [...prev, { ...data, id: genId(), enrolled_at: new Date().toISOString().split("T")[0] }]);
  const editStudent = (id, data) => setStudents(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  const deleteStudent = (id) => { if (confirm("Delete this student?")) setStudents(prev => prev.filter(s => s.id !== id)); };

  // Teacher CRUD
  const addTeacher = (data) => setTeachers(prev => [...prev, { ...data, id: genId() }]);
  const editTeacher = (id, data) => setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  const deleteTeacher = (id) => { if (confirm("Remove this teacher?")) setTeachers(prev => prev.filter(t => t.id !== id)); };

  // Attendance
  const recordAttendance = (studentId, date, status) => {
    setAttendance(prev => {
      const existing = prev.findIndex(a => a.student_id === studentId && a.date === date);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = { ...next[existing], status };
        return next;
      }
      return [...prev, { id: genId(), student_id: studentId, date, status }];
    });
  };

  // Grades
  const addGrade = (data) => setGrades(prev => [...prev, { ...data, id: genId() }]);

  // Fees
  const addFee = (data) => setFees(prev => [...prev, { ...data, id: genId() }]);
  const markPaid = (id) => setFees(prev => prev.map(f => f.id === id ? { ...f, status: "paid", paid_date: new Date().toISOString().split("T")[0] } : f));

  // Announcements
  const addAnnouncement = (data) => setAnnouncements(prev => [{ ...data, id: genId() }, ...prev]);
  const deleteAnnouncement = (id) => setAnnouncements(prev => prev.filter(a => a.id !== id));

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* Sidebar */}
        <nav className="sidebar">
          <div className="sidebar-logo">
            <h1>EduManage</h1>
            <p>School Management System</p>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-label">Main Menu</div>
            {NAV.map(item => (
              <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => setPage(item.id)}>
                <span className="icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className="user-card">
              <div className="avatar">AD</div>
              <div className="user-info">
                <p>Administrator</p>
                <span>admin@school.edu</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Main */}
        <main className="main">
          <div className="topbar">
            <h2>{PAGE_TITLES[page]}</h2>
            <div className="topbar-actions">
              <div style={{ fontSize: 13, color: "var(--text2)" }}>
                📅 {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>

          <div className="content">
            {page === "dashboard" && <Dashboard students={students} teachers={teachers} attendance={attendance} grades={grades} fees={fees} announcements={announcements} />}
            {page === "students" && <Students students={students} onAdd={addStudent} onEdit={editStudent} onDelete={deleteStudent} />}
            {page === "teachers" && <Teachers teachers={teachers} onAdd={addTeacher} onEdit={editTeacher} onDelete={deleteTeacher} />}
            {page === "attendance" && <Attendance students={students} attendance={attendance} onRecord={recordAttendance} />}
            {page === "grades" && <Grades students={students} grades={grades} onAdd={addGrade} />}
            {page === "fees" && <Fees students={students} fees={fees} onAdd={addFee} onMarkPaid={markPaid} />}
            {page === "announcements" && <Announcements announcements={announcements} onAdd={addAnnouncement} onDelete={deleteAnnouncement} />}
            {page === "settings" && <Settings />}
          </div>
        </main>
      </div>
    </>
  );
}

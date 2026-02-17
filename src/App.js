import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// ─────────────────────────────────────────────
// SUPABASE CONFIG  (values come from .env)
// ─────────────────────────────────────────────
const SUPABASE_URL      = process.env.REACT_APP_SUPABASE_URL      || '';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const IS_DEMO = !supabase;

// ─────────────────────────────────────────────
// SQL SCHEMA
// ─────────────────────────────────────────────
const SCHEMA_SQL = `-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
  grade TEXT NOT NULL, class TEXT NOT NULL,
  dob DATE, phone TEXT, address TEXT,
  guardian_name TEXT, guardian_phone TEXT,
  enrolled_at DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL, phone TEXT,
  qualification TEXT, experience_years INT DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present','absent','late','excused')),
  notes TEXT, created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL, assignment TEXT NOT NULL,
  score NUMERIC NOT NULL, max_score NUMERIC NOT NULL DEFAULT 100,
  term TEXT NOT NULL, date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, content TEXT NOT NULL,
  target_audience TEXT DEFAULT 'all',
  created_by TEXT NOT NULL, priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL, fee_type TEXT NOT NULL,
  due_date DATE, paid_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies (open for demo; tighten in production)
ALTER TABLE students       ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance     ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades         ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees           ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open" ON students      FOR ALL USING (true);
CREATE POLICY "open" ON teachers      FOR ALL USING (true);
CREATE POLICY "open" ON attendance    FOR ALL USING (true);
CREATE POLICY "open" ON grades        FOR ALL USING (true);
CREATE POLICY "open" ON announcements FOR ALL USING (true);
CREATE POLICY "open" ON fees          FOR ALL USING (true);`;

// ─────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────
const MOCK = {
  students: [
    { id: 's1', name: 'Emma Johnson',    email: 'emma@school.edu',   grade: '10', class: '10-A', dob: '2009-03-15', phone: '555-0101', guardian_name: 'Mary Johnson',    status: 'active',   enrolled_at: '2023-09-01' },
    { id: 's2', name: 'Liam Chen',       email: 'liam@school.edu',   grade: '10', class: '10-A', dob: '2009-07-22', phone: '555-0102', guardian_name: 'Wei Chen',        status: 'active',   enrolled_at: '2023-09-01' },
    { id: 's3', name: 'Sophia Williams', email: 'sophia@school.edu', grade: '11', class: '11-B', dob: '2008-11-08', phone: '555-0103', guardian_name: 'Robert Williams', status: 'active',   enrolled_at: '2022-09-01' },
    { id: 's4', name: 'Noah Martinez',   email: 'noah@school.edu',   grade: '9',  class: '9-C',  dob: '2010-05-30', phone: '555-0104', guardian_name: 'Carlos Martinez', status: 'active',   enrolled_at: '2024-09-01' },
    { id: 's5', name: 'Olivia Brown',    email: 'olivia@school.edu', grade: '12', class: '12-A', dob: '2007-01-12', phone: '555-0105', guardian_name: 'Helen Brown',     status: 'active',   enrolled_at: '2021-09-01' },
    { id: 's6', name: 'James Davis',     email: 'james@school.edu',  grade: '11', class: '11-A', dob: '2008-09-03', phone: '555-0106', guardian_name: 'Patricia Davis',  status: 'inactive', enrolled_at: '2022-09-01' },
  ],
  teachers: [
    { id: 't1', name: 'Dr. Sarah Mitchell',   email: 's.mitchell@school.edu', subject: 'Mathematics',       phone: '555-0201', qualification: 'PhD Mathematics', experience_years: 12, status: 'active' },
    { id: 't2', name: 'Prof. James Anderson', email: 'j.anderson@school.edu', subject: 'Physics',            phone: '555-0202', qualification: 'MSc Physics',     experience_years: 8,  status: 'active' },
    { id: 't3', name: 'Ms. Rachel Green',     email: 'r.green@school.edu',    subject: 'English Literature', phone: '555-0203', qualification: 'MA English',      experience_years: 5,  status: 'active' },
    { id: 't4', name: 'Mr. David Park',       email: 'd.park@school.edu',     subject: 'Chemistry',          phone: '555-0204', qualification: 'MSc Chemistry',   experience_years: 10, status: 'active' },
  ],
  attendance: [
    { id: 'a1', student_id: 's1', date: '2026-02-17', status: 'present' },
    { id: 'a2', student_id: 's2', date: '2026-02-17', status: 'present' },
    { id: 'a3', student_id: 's3', date: '2026-02-17', status: 'absent'  },
    { id: 'a4', student_id: 's4', date: '2026-02-17', status: 'late'    },
    { id: 'a5', student_id: 's5', date: '2026-02-17', status: 'present' },
  ],
  grades: [
    { id: 'g1', student_id: 's1', subject: 'Mathematics',        assignment: 'Midterm Exam', score: 92, max_score: 100, term: 'Spring 2026', date: '2026-02-10' },
    { id: 'g2', student_id: 's1', subject: 'Physics',            assignment: 'Lab Report',   score: 87, max_score: 100, term: 'Spring 2026', date: '2026-02-12' },
    { id: 'g3', student_id: 's2', subject: 'Mathematics',        assignment: 'Midterm Exam', score: 78, max_score: 100, term: 'Spring 2026', date: '2026-02-10' },
    { id: 'g4', student_id: 's3', subject: 'English Literature', assignment: 'Essay',        score: 95, max_score: 100, term: 'Spring 2026', date: '2026-02-08' },
    { id: 'g5', student_id: 's4', subject: 'Chemistry',          assignment: 'Quiz 1',       score: 65, max_score: 100, term: 'Spring 2026', date: '2026-02-05' },
    { id: 'g6', student_id: 's5', subject: 'Mathematics',        assignment: 'Midterm Exam', score: 98, max_score: 100, term: 'Spring 2026', date: '2026-02-10' },
  ],
  announcements: [
    { id: 'an1', title: 'Spring Sports Day Registration', content: 'Annual sports day registrations are now open. Students can register for track, swimming, and team sports. Deadline: Feb 28th.', target_audience: 'students', created_by: 'Admin',     priority: 'high',   created_at: '2026-02-15T09:00:00Z' },
    { id: 'an2', title: 'Parent-Teacher Meeting',         content: 'Quarterly parent-teacher meeting scheduled for March 5th. All teachers must prepare student progress reports.',                  target_audience: 'teachers', created_by: 'Principal', priority: 'high',   created_at: '2026-02-14T10:00:00Z' },
    { id: 'an3', title: 'Library Hours Extended',         content: 'The school library will now be open until 7 PM on weekdays starting March 1st to support exam preparation.',                    target_audience: 'all',      created_by: 'Admin',     priority: 'normal', created_at: '2026-02-13T11:00:00Z' },
  ],
  fees: [
    { id: 'f1', student_id: 's1', amount: 1500, fee_type: 'Tuition',      due_date: '2026-03-01', paid_date: null,         status: 'pending' },
    { id: 'f2', student_id: 's2', amount: 1500, fee_type: 'Tuition',      due_date: '2026-03-01', paid_date: '2026-02-01', status: 'paid'    },
    { id: 'f3', student_id: 's3', amount: 200,  fee_type: 'Library Fee',  due_date: '2026-01-15', paid_date: null,         status: 'overdue' },
    { id: 'f4', student_id: 's4', amount: 1500, fee_type: 'Tuition',      due_date: '2026-03-01', paid_date: '2026-02-10', status: 'paid'    },
    { id: 'f5', student_id: 's5', amount: 500,  fee_type: 'Activity Fee', due_date: '2026-02-28', paid_date: null,         status: 'pending' },
  ],
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const uid         = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const fmtDate     = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtMoney    = (n) => `$${Number(n).toLocaleString()}`;
const initials    = (name) => name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
const letterGrade = (score, max) => {
  const p = (score / max) * 100;
  if (p >= 90) return 'A';
  if (p >= 80) return 'B';
  if (p >= 70) return 'C';
  if (p >= 60) return 'D';
  return 'F';
};

// ─────────────────────────────────────────────
// DATA HOOK  (works in demo and live mode)
// ─────────────────────────────────────────────
function useTable(table, mockData, orderCol = 'created_at') {
  const [data, setData]     = useState(mockData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (IS_DEMO) return;
    setLoading(true);
    supabase.from(table).select('*').order(orderCol, { ascending: false })
      .then(({ data: rows, error }) => {
        if (!error && rows) setData(rows);
        setLoading(false);
      });
  }, [table, orderCol]);

  const add = async (row) => {
    if (IS_DEMO) { setData((p) => [...p, { ...row, id: uid(), created_at: new Date().toISOString() }]); return; }
    const { data: ins } = await supabase.from(table).insert(row).select();
    if (ins) setData((p) => [...p, ...ins]);
  };

  const update = async (id, changes) => {
    if (IS_DEMO) { setData((p) => p.map((r) => r.id === id ? { ...r, ...changes } : r)); return; }
    const { data: upd } = await supabase.from(table).update(changes).eq('id', id).select();
    if (upd) setData((p) => p.map((r) => r.id === id ? upd[0] : r));
  };

  const remove = async (id) => {
    if (IS_DEMO) { setData((p) => p.filter((r) => r.id !== id)); return; }
    await supabase.from(table).delete().eq('id', id);
    setData((p) => p.filter((r) => r.id !== id));
  };

  // Attendance upsert (insert or update by student+date unique key)
  const upsertAttendance = async (student_id, date, status) => {
    if (IS_DEMO) {
      setData((p) => {
        const i = p.findIndex((a) => a.student_id === student_id && a.date === date);
        if (i >= 0) { const n = [...p]; n[i] = { ...n[i], status }; return n; }
        return [...p, { id: uid(), student_id, date, status }];
      });
      return;
    }
    const { data: upserted } = await supabase
      .from('attendance')
      .upsert({ student_id, date, status }, { onConflict: 'student_id,date' })
      .select();
    if (upserted) {
      setData((p) => {
        const i = p.findIndex((a) => a.student_id === student_id && a.date === date);
        if (i >= 0) { const n = [...p]; n[i] = upserted[0]; return n; }
        return [...p, upserted[0]];
      });
    }
  };

  return { data, loading, add, update, remove, upsertAttendance };
}

// ─────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────
function Avatar({ name, size = 36 }) {
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials(name)}
    </div>
  );
}

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
          <button className="btn btn-primary"   onClick={onSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
function Dashboard({ students, teachers, attendance, grades, fees, announcements }) {
  const active    = students.filter((s) => s.status === 'active').length;
  const today     = new Date().toISOString().split('T')[0];
  const todayAtt  = attendance.filter((a) => a.date === today);
  const present   = todayAtt.filter((a) => a.status === 'present').length;
  const avgScore  = grades.length ? Math.round(grades.reduce((s, g) => s + (g.score / g.max_score) * 100, 0) / grades.length) : 0;
  const collected = fees.filter((f) => f.status === 'paid').reduce((s, f)    => s + Number(f.amount), 0);
  const totalFees = fees.reduce((s, f) => s + Number(f.amount), 0);
  const overdue   = fees.filter((f) => f.status === 'overdue').length;

  const attStats = ['present','absent','late','excused'].map((st) => ({
    label: st[0].toUpperCase() + st.slice(1),
    count: attendance.filter((a) => a.status === st).length,
    color: { present:'var(--green)', absent:'var(--red)', late:'var(--accent)', excused:'var(--blue)' }[st],
  }));
  const maxAtt = Math.max(...attStats.map((a) => a.count), 1);

  return (
    <div className="animate-in">
      {IS_DEMO && (
        <div className="alert alert-info">
          ℹ️ Running in demo mode. Set <code>REACT_APP_SUPABASE_URL</code> and <code>REACT_APP_SUPABASE_ANON_KEY</code> in your <code>.env</code> file for live data.
        </div>
      )}
      <div className="stats-grid">
        <div className="stat-card gold">   <div className="stat-icon">👨‍🎓</div><div className="stat-value">{active}</div>   <div className="stat-label">Active Students</div><div className="stat-change up">↑ {students.length} enrolled</div></div>
        <div className="stat-card blue">   <div className="stat-icon">👩‍🏫</div><div className="stat-value">{teachers.length}</div><div className="stat-label">Teaching Staff</div><div className="stat-change up">↑ All active</div></div>
        <div className="stat-card green">  <div className="stat-icon">✅</div>  <div className="stat-value">{todayAtt.length ? Math.round((present/todayAtt.length)*100) : 0}%</div><div className="stat-label">Today's Attendance</div><div className="stat-change">{present}/{todayAtt.length} present</div></div>
        <div className="stat-card purple"> <div className="stat-icon">📊</div>  <div className="stat-value">{avgScore}%</div><div className="stat-label">Average Grade</div><div className="stat-change">{grades.length} assessments</div></div>
        <div className="stat-card gold">
          <div className="stat-icon">💰</div>
          <div className="stat-value">{fmtMoney(collected)}</div>
          <div className="stat-label">Fees Collected</div>
          <div className="stat-change">{totalFees ? Math.round((collected/totalFees)*100) : 0}% of {fmtMoney(totalFees)}</div>
          <div className="progress-bar" style={{ marginTop:10 }}>
            <div className="progress-fill" style={{ width:`${totalFees?(collected/totalFees)*100:0}%`, background:'var(--accent)' }} />
          </div>
        </div>
        <div className="stat-card red"><div className="stat-icon">⚠️</div><div className="stat-value">{overdue}</div><div className="stat-label">Overdue Payments</div><div className="stat-change down">Requires attention</div></div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Attendance Overview</span></div>
          <div className="chart-bars">
            {attStats.map((a) => (
              <div key={a.label} className="chart-bar-wrap">
                <div className="chart-bar-val">{a.count}</div>
                <div className="chart-bar" style={{ height:`${(a.count/maxAtt)*90}%`, background:a.color }} />
                <div className="chart-bar-label">{a.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Recent Announcements</span></div>
          {announcements.slice(0,3).map((a) => (
            <div key={a.id} style={{ padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span className={`badge badge-${a.priority==='high'?'red':'blue'}`}>{a.priority}</span>
                <span style={{ fontSize:13, fontWeight:600 }}>{a.title}</span>
              </div>
              <p style={{ fontSize:12, color:'var(--text2)' }}>{a.content.substring(0,90)}…</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Recent Grades</span></div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Student</th><th>Subject</th><th>Assignment</th><th>Score</th><th>Grade</th><th>Date</th></tr></thead>
            <tbody>
              {grades.slice(0,5).map((g) => {
                const s = students.find((st) => st.id === g.student_id);
                const l = letterGrade(g.score, g.max_score);
                return (
                  <tr key={g.id}>
                    <td>{s?.name||'Unknown'}</td><td>{g.subject}</td><td>{g.assignment}</td>
                    <td>{g.score}/{g.max_score}</td>
                    <td><span className={`grade-pill grade-${l}`}>{l}</span></td>
                    <td style={{ color:'var(--text2)', fontSize:13 }}>{fmtDate(g.date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STUDENTS
// ─────────────────────────────────────────────
const BLANK_STU = { name:'', email:'', grade:'9', class:'', dob:'', phone:'', guardian_name:'', guardian_phone:'', address:'', status:'active' };

function Students({ students, onAdd, onEdit, onDelete }) {
  const [search, setSearch]   = useState('');
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(BLANK_STU);

  const filtered = students.filter((s) =>
    [s.name, s.email, s.class].some((v) => v.toLowerCase().includes(search.toLowerCase())));
  const F = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const openAdd  = () => { setEditing(null); setForm(BLANK_STU); setModal(true); };
  const openEdit = (s) => { setEditing(s.id); setForm({...s}); setModal(true); };
  const save = () => { editing ? onEdit(editing, form) : onAdd(form); setModal(false); };

  return (
    <div className="animate-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input placeholder="Search students…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Student</button>
      </div>
      <div className="table-wrapper">
        <table>
          <thead><tr><th>Name</th><th>Grade / Class</th><th>Email</th><th>Guardian</th><th>Enrolled</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td><div style={{ display:'flex', alignItems:'center', gap:10 }}><Avatar name={s.name} size={32}/><span style={{ fontWeight:600 }}>{s.name}</span></div></td>
                <td>Grade {s.grade} — {s.class}</td>
                <td style={{ color:'var(--text2)', fontSize:13 }}>{s.email}</td>
                <td style={{ fontSize:13 }}>{s.guardian_name||'—'}</td>
                <td style={{ fontSize:13, color:'var(--text2)' }}>{fmtDate(s.enrolled_at)}</td>
                <td><span className={`badge badge-${s.status==='active'?'green':'gray'}`}>{s.status}</span></td>
                <td><div style={{ display:'flex', gap:6 }}><button className="btn btn-secondary btn-sm" onClick={()=>openEdit(s)}>Edit</button><button className="btn btn-danger btn-sm" onClick={()=>onDelete(s.id)}>Del</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={editing?'Edit Student':'Add Student'} onClose={()=>setModal(false)} onSave={save}>
          <div className="form-row"><div className="form-group"><label>Full Name</label><input value={form.name} onChange={F('name')} placeholder="John Smith"/></div><div className="form-group"><label>Email</label><input value={form.email} onChange={F('email')} placeholder="john@school.edu"/></div></div>
          <div className="form-row"><div className="form-group"><label>Grade</label><select value={form.grade} onChange={F('grade')}>{['9','10','11','12'].map((g)=><option key={g} value={g}>Grade {g}</option>)}</select></div><div className="form-group"><label>Class</label><input value={form.class} onChange={F('class')} placeholder="10-A"/></div></div>
          <div className="form-row"><div className="form-group"><label>Date of Birth</label><input type="date" value={form.dob} onChange={F('dob')}/></div><div className="form-group"><label>Phone</label><input value={form.phone} onChange={F('phone')}/></div></div>
          <div className="form-row"><div className="form-group"><label>Guardian Name</label><input value={form.guardian_name} onChange={F('guardian_name')}/></div><div className="form-group"><label>Guardian Phone</label><input value={form.guardian_phone} onChange={F('guardian_phone')}/></div></div>
          <div className="form-group"><label>Address</label><input value={form.address} onChange={F('address')}/></div>
          <div className="form-group"><label>Status</label><select value={form.status} onChange={F('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TEACHERS
// ─────────────────────────────────────────────
const BLANK_TCH = { name:'', email:'', subject:'', phone:'', qualification:'', experience_years:0, status:'active' };

function Teachers({ teachers, onAdd, onEdit, onDelete }) {
  const [search, setSearch]   = useState('');
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(BLANK_TCH);

  const filtered = teachers.filter((t) => [t.name, t.subject].some((v) => v.toLowerCase().includes(search.toLowerCase())));
  const F = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const openAdd  = () => { setEditing(null); setForm(BLANK_TCH); setModal(true); };
  const openEdit = (t) => { setEditing(t.id); setForm({...t}); setModal(true); };
  const save = () => { editing ? onEdit(editing, form) : onAdd(form); setModal(false); };

  return (
    <div className="animate-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div className="search-box"><span className="search-icon">🔍</span><input placeholder="Search teachers…" value={search} onChange={(e)=>setSearch(e.target.value)}/></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Teacher</button>
      </div>
      <div className="teacher-grid">
        {filtered.map((t) => (
          <div key={t.id} className="card">
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
              <Avatar name={t.name} size={48}/>
              <div><div style={{ fontWeight:700, fontSize:15 }}>{t.name}</div><div style={{ fontSize:12, color:'var(--text2)' }}>{t.email}</div></div>
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}><span className="badge badge-blue">{t.subject}</span><span className={`badge badge-${t.status==='active'?'green':'gray'}`}>{t.status}</span></div>
            <div style={{ fontSize:13, color:'var(--text2)', lineHeight:2 }}>
              <div>📚 {t.qualification||'—'}</div><div>⏱ {t.experience_years} yrs</div><div>📞 {t.phone||'—'}</div>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:16 }}><button className="btn btn-secondary btn-sm" style={{ flex:1 }} onClick={()=>openEdit(t)}>Edit</button><button className="btn btn-danger btn-sm" onClick={()=>onDelete(t.id)}>Remove</button></div>
          </div>
        ))}
      </div>
      {modal && (
        <Modal title={editing?'Edit Teacher':'Add Teacher'} onClose={()=>setModal(false)} onSave={save}>
          <div className="form-row"><div className="form-group"><label>Full Name</label><input value={form.name} onChange={F('name')}/></div><div className="form-group"><label>Email</label><input value={form.email} onChange={F('email')}/></div></div>
          <div className="form-row"><div className="form-group"><label>Subject</label><input value={form.subject} onChange={F('subject')}/></div><div className="form-group"><label>Phone</label><input value={form.phone} onChange={F('phone')}/></div></div>
          <div className="form-row"><div className="form-group"><label>Qualification</label><input value={form.qualification} onChange={F('qualification')}/></div><div className="form-group"><label>Years Exp.</label><input type="number" value={form.experience_years} onChange={F('experience_years')}/></div></div>
          <div className="form-group"><label>Status</label><select value={form.status} onChange={F('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────────
function Attendance({ students, attendance, onRecord }) {
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [localAtt, setLocalAtt] = useState({});

  useEffect(() => {
    const map = {};
    attendance.filter((a) => a.date === date).forEach((a) => { map[a.student_id] = a.status; });
    setLocalAtt(map);
  }, [date, attendance]);

  const mark    = (id, status) => setLocalAtt((p) => ({ ...p, [id]: status }));
  const saveAll = () => { Object.entries(localAtt).forEach(([sid, st]) => onRecord(sid, date, st)); alert('Attendance saved!'); };

  const counts = ['present','absent','late','excused'].reduce((acc, s) => ({ ...acc, [s]: Object.values(localAtt).filter((v)=>v===s).length }), {});

  return (
    <div className="animate-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:24 }}>
          <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} style={{ width:'auto' }}/>
          <div style={{ display:'flex', gap:20 }}>
            {Object.entries(counts).map(([s,c])=>(
              <div key={s} style={{ textAlign:'center' }}>
                <div style={{ fontSize:20, fontWeight:700 }}>{c}</div>
                <div style={{ fontSize:11, color:'var(--text2)', textTransform:'capitalize' }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" onClick={saveAll}>💾 Save Attendance</button>
      </div>
      <div className="table-wrapper">
        <table>
          <thead><tr><th>Student</th><th>Class</th><th>Mark Attendance</th></tr></thead>
          <tbody>
            {students.filter((s)=>s.status==='active').map((s)=>(
              <tr key={s.id}>
                <td><div style={{ display:'flex', alignItems:'center', gap:10 }}><Avatar name={s.name} size={30}/><span style={{ fontWeight:600 }}>{s.name}</span></div></td>
                <td style={{ color:'var(--text2)', fontSize:13 }}>{s.class}</td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    {['present','absent','late','excused'].map((st)=>(
                      <button key={st} className={`att-btn att-${st}${localAtt[s.id]===st?' active':''}`} onClick={()=>mark(s.id,st)}>
                        {st[0].toUpperCase()+st.slice(1)}
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

// ─────────────────────────────────────────────
// GRADES
// ─────────────────────────────────────────────
const BLANK_GRD = { student_id:'', subject:'', assignment:'', score:'', max_score:100, term:'Spring 2026', date:new Date().toISOString().split('T')[0] };

function Grades({ students, grades, onAdd }) {
  const [modal, setModal]             = useState(false);
  const [filterStu, setFilterStu]     = useState('');
  const [form, setForm]               = useState(BLANK_GRD);
  const F = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const list = filterStu ? grades.filter((g)=>g.student_id===filterStu) : grades;
  const save = () => { if(!form.student_id||!form.subject||!form.score) return alert('Fill required fields'); onAdd(form); setModal(false); setForm(BLANK_GRD); };

  return (
    <div className="animate-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <select value={filterStu} onChange={(e)=>setFilterStu(e.target.value)} style={{ width:220 }}>
          <option value="">All Students</option>
          {students.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={()=>setModal(true)}>+ Add Grade</button>
      </div>
      <div className="table-wrapper">
        <table>
          <thead><tr><th>Student</th><th>Subject</th><th>Assignment</th><th>Score</th><th>Percentage</th><th>Grade</th><th>Term</th><th>Date</th></tr></thead>
          <tbody>
            {list.map((g)=>{
              const s=students.find((st)=>st.id===g.student_id);
              const pct=Math.round((g.score/g.max_score)*100);
              const l=letterGrade(g.score,g.max_score);
              return (
                <tr key={g.id}>
                  <td style={{ fontWeight:600 }}>{s?.name||'Unknown'}</td><td>{g.subject}</td><td style={{ color:'var(--text2)' }}>{g.assignment}</td>
                  <td>{g.score}/{g.max_score}</td>
                  <td><div style={{ display:'flex', alignItems:'center', gap:8 }}><span style={{ fontWeight:600, minWidth:36 }}>{pct}%</span><div className="progress-bar" style={{ flex:1, margin:0 }}><div className="progress-fill" style={{ width:`${pct}%`, background:pct>=80?'var(--green)':pct>=60?'var(--accent)':'var(--red)' }}/></div></div></td>
                  <td><span className={`grade-pill grade-${l}`}>{l}</span></td>
                  <td style={{ fontSize:12, color:'var(--text2)' }}>{g.term}</td>
                  <td style={{ fontSize:13, color:'var(--text2)' }}>{fmtDate(g.date)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="Record Grade" onClose={()=>setModal(false)} onSave={save}>
          <div className="form-group"><label>Student</label><select value={form.student_id} onChange={F('student_id')}><option value="">Select student…</option>{students.map((s)=><option key={s.id} value={s.id}>{s.name} — {s.class}</option>)}</select></div>
          <div className="form-row"><div className="form-group"><label>Subject</label><input value={form.subject} onChange={F('subject')} placeholder="Mathematics"/></div><div className="form-group"><label>Assignment</label><input value={form.assignment} onChange={F('assignment')} placeholder="Midterm Exam"/></div></div>
          <div className="form-row"><div className="form-group"><label>Score</label><input type="number" value={form.score} onChange={F('score')}/></div><div className="form-group"><label>Max Score</label><input type="number" value={form.max_score} onChange={F('max_score')}/></div></div>
          <div className="form-row"><div className="form-group"><label>Term</label><input value={form.term} onChange={F('term')}/></div><div className="form-group"><label>Date</label><input type="date" value={form.date} onChange={F('date')}/></div></div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// FEES
// ─────────────────────────────────────────────
const BLANK_FEE = { student_id:'', amount:'', fee_type:'Tuition', due_date:'', status:'pending' };
const FEE_TYPES = ['Tuition','Library Fee','Activity Fee','Lab Fee','Transport Fee','Sports Fee'];

function Fees({ students, fees, onAdd, onMarkPaid }) {
  const [tab, setTab]     = useState('all');
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState(BLANK_FEE);
  const F = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const list       = tab==='all' ? fees : fees.filter((f)=>f.status===tab);
  const collected  = fees.filter((f)=>f.status==='paid').reduce((s,f)=>s+Number(f.amount),0);
  const pending    = fees.filter((f)=>f.status==='pending').reduce((s,f)=>s+Number(f.amount),0);
  const overdueAmt = fees.filter((f)=>f.status==='overdue').reduce((s,f)=>s+Number(f.amount),0);
  const save = () => { if(!form.student_id||!form.amount) return alert('Fill required fields'); onAdd(form); setModal(false); setForm(BLANK_FEE); };

  return (
    <div className="animate-in">
      <div className="stats-grid" style={{ marginBottom:24 }}>
        <div className="stat-card green"><div className="stat-icon">✅</div><div className="stat-value">{fmtMoney(collected)}</div><div className="stat-label">Collected</div></div>
        <div className="stat-card gold"> <div className="stat-icon">⏳</div><div className="stat-value">{fmtMoney(pending)}</div>  <div className="stat-label">Pending</div></div>
        <div className="stat-card red">  <div className="stat-icon">🚨</div><div className="stat-value">{fmtMoney(overdueAmt)}</div><div className="stat-label">Overdue</div></div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div className="tabs" style={{ marginBottom:0 }}>
          {['all','pending','paid','overdue'].map((t)=>(
            <button key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={()=>setModal(true)}>+ Add Fee</button>
      </div>
      <div className="table-wrapper">
        <table>
          <thead><tr><th>Student</th><th>Fee Type</th><th>Amount</th><th>Due Date</th><th>Paid Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {list.map((f)=>{
              const s=students.find((st)=>st.id===f.student_id);
              return (
                <tr key={f.id}>
                  <td style={{ fontWeight:600 }}>{s?.name||'Unknown'}</td><td>{f.fee_type}</td><td style={{ fontWeight:700 }}>{fmtMoney(f.amount)}</td>
                  <td style={{ fontSize:13 }}>{fmtDate(f.due_date)}</td><td style={{ fontSize:13, color:'var(--text2)' }}>{fmtDate(f.paid_date)}</td>
                  <td><span className={`badge badge-${f.status==='paid'?'green':f.status==='overdue'?'red':'yellow'}`}>{f.status}</span></td>
                  <td>{f.status!=='paid'&&<button className="btn btn-secondary btn-sm" onClick={()=>onMarkPaid(f.id)}>Mark Paid</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="Add Fee" onClose={()=>setModal(false)} onSave={save}>
          <div className="form-group"><label>Student</label><select value={form.student_id} onChange={F('student_id')}><option value="">Select student…</option>{students.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div className="form-row"><div className="form-group"><label>Fee Type</label><select value={form.fee_type} onChange={F('fee_type')}>{FEE_TYPES.map((t)=><option key={t} value={t}>{t}</option>)}</select></div><div className="form-group"><label>Amount ($)</label><input type="number" value={form.amount} onChange={F('amount')}/></div></div>
          <div className="form-row"><div className="form-group"><label>Due Date</label><input type="date" value={form.due_date} onChange={F('due_date')}/></div><div className="form-group"><label>Status</label><select value={form.status} onChange={F('status')}><option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select></div></div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ANNOUNCEMENTS
// ─────────────────────────────────────────────
const BLANK_ANN = { title:'', content:'', target_audience:'all', created_by:'Admin', priority:'normal' };

function Announcements({ announcements, onAdd, onDelete }) {
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState(BLANK_ANN);
  const F = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const save = () => { if(!form.title||!form.content) return alert('Fill required fields'); onAdd({...form, created_at:new Date().toISOString()}); setModal(false); setForm(BLANK_ANN); };

  return (
    <div className="animate-in">
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:20 }}>
        <button className="btn btn-primary" onClick={()=>setModal(true)}>📢 New Announcement</button>
      </div>
      {[...announcements].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map((a)=>(
        <div key={a.id} className={`announcement-card ${a.priority}`}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', gap:8, marginBottom:8 }}><span className={`badge badge-${a.priority==='high'?'red':a.priority==='low'?'gray':'blue'}`}>{a.priority}</span><span className="badge badge-gray">{a.target_audience}</span></div>
              <h4>{a.title}</h4><p>{a.content}</p>
              <div className="announcement-meta"><span>👤 {a.created_by}</span><span>📅 {fmtDate(a.created_at)}</span></div>
            </div>
            <button className="btn btn-danger btn-sm" style={{ marginLeft:12 }} onClick={()=>onDelete(a.id)}>✕</button>
          </div>
        </div>
      ))}
      {modal && (
        <Modal title="New Announcement" onClose={()=>setModal(false)} onSave={save}>
          <div className="form-group"><label>Title</label><input value={form.title} onChange={F('title')} placeholder="Announcement title…"/></div>
          <div className="form-group"><label>Content</label><textarea value={form.content} onChange={F('content')} rows={4}/></div>
          <div className="form-row">
            <div className="form-group"><label>Audience</label><select value={form.target_audience} onChange={F('target_audience')}><option value="all">Everyone</option><option value="students">Students</option><option value="teachers">Teachers</option><option value="parents">Parents</option></select></div>
            <div className="form-group"><label>Priority</label><select value={form.priority} onChange={F('priority')}><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></div>
          </div>
          <div className="form-group"><label>Posted By</label><input value={form.created_by} onChange={F('created_by')}/></div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────
function Settings() {
  return (
    <div className="animate-in">
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">⚙️ Supabase Config</span></div>
          <div className="alert alert-warning">⚠️ Never commit credentials. Use <code>.env</code> locally and Vercel env vars in production.</div>
          <div style={{ background:'var(--bg)', borderRadius:8, padding:16, fontFamily:'monospace', fontSize:13, lineHeight:2, border:'1px solid var(--border)' }}>
            <div style={{ color:'var(--text2)' }}># .env (project root — gitignored)</div>
            <div><span style={{ color:'var(--blue)' }}>REACT_APP_SUPABASE_URL</span>=https://xxxx.supabase.co</div>
            <div><span style={{ color:'var(--blue)' }}>REACT_APP_SUPABASE_ANON_KEY</span>=eyJhbGci...</div>
          </div>
          <div style={{ marginTop:16, fontSize:13, color:'var(--text2)', lineHeight:1.9 }}>
            <strong style={{ color:'var(--text)' }}>Setup steps:</strong><br/>
            1. Create project at <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color:'var(--accent)' }}>supabase.com</a><br/>
            2. Copy URL &amp; anon key from Project Settings → API<br/>
            3. Add to <code>.env</code> file locally<br/>
            4. Run the SQL schema in Supabase SQL Editor<br/>
            5. Add same vars in Vercel → Settings → Environment Variables
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">🗄️ Database Schema</span></div>
          <p style={{ fontSize:13, color:'var(--text2)', marginBottom:16, lineHeight:1.7 }}>Run in your Supabase SQL Editor to create all tables + RLS policies.</p>
          <div className="schema-box">{SCHEMA_SQL}</div>
          <button className="btn btn-secondary" style={{ marginTop:12 }} onClick={()=>{navigator.clipboard.writeText(SCHEMA_SQL);alert('SQL copied!');}}>📋 Copy SQL</button>
        </div>
      </div>
      <div className="card" style={{ marginTop:20 }}>
        <div className="card-header"><span className="card-title">📋 System Info</span></div>
        <div className="info-grid">
          {[{label:'System',value:'EduManage Pro'},{label:'Version',value:'1.0.0'},{label:'Database',value:'Supabase (PostgreSQL)'},{label:'SDK',value:'@supabase/supabase-js v2'},{label:'Framework',value:'React 18'},{label:'Hosting',value:'Vercel'}].map((item)=>(
            <div key={item.label} className="info-tile"><div className="info-tile-label">{item.label}</div><div className="info-tile-value">{item.value}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────
const NAV = [
  { id:'dashboard',     label:'Dashboard',    icon:'🏠' },
  { id:'students',      label:'Students',     icon:'👨‍🎓' },
  { id:'teachers',      label:'Teachers',     icon:'👩‍🏫' },
  { id:'attendance',    label:'Attendance',   icon:'✅' },
  { id:'grades',        label:'Grades',       icon:'📊' },
  { id:'fees',          label:'Fees',         icon:'💰' },
  { id:'announcements', label:'Announcements',icon:'📢' },
  { id:'settings',      label:'Settings',     icon:'⚙️' },
];
const PAGE_TITLE = { dashboard:'Dashboard', students:'Student Management', teachers:'Teacher Management', attendance:'Attendance Tracking', grades:'Grades & Assessments', fees:'Fee Management', announcements:'Announcements', settings:'Settings & Setup' };

export default function App() {
  const [page, setPage] = useState('dashboard');

  const stu  = useTable('students',      MOCK.students,      'name');
  const tch  = useTable('teachers',      MOCK.teachers,      'name');
  const att  = useTable('attendance',    MOCK.attendance,    'date');
  const grd  = useTable('grades',        MOCK.grades,        'date');
  const fee  = useTable('fees',          MOCK.fees,          'due_date');
  const ann  = useTable('announcements', MOCK.announcements, 'created_at');

  const dateStr = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="sidebar-logo"><h1>EduManage</h1><p>School Management</p></div>
        <div className="sidebar-section">
          <div className="sidebar-section-label">Main Menu</div>
          {NAV.map((item)=>(
            <button key={item.id} className={`nav-item${page===item.id?' active':''}`} onClick={()=>setPage(item.id)}>
              <span className="icon">{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="avatar">AD</div>
            <div className="user-info"><p>Administrator</p><span>admin@school.edu</span></div>
          </div>
        </div>
      </nav>

      <main className="main">
        <div className="topbar"><h2>{PAGE_TITLE[page]}</h2><span className="topbar-date">📅 {dateStr}</span></div>
        <div className="content">
          {page==='dashboard'     && <Dashboard     students={stu.data} teachers={tch.data} attendance={att.data} grades={grd.data} fees={fee.data} announcements={ann.data}/>}
          {page==='students'      && <Students      students={stu.data} onAdd={stu.add} onEdit={stu.update} onDelete={stu.remove}/>}
          {page==='teachers'      && <Teachers      teachers={tch.data} onAdd={tch.add} onEdit={tch.update} onDelete={tch.remove}/>}
          {page==='attendance'    && <Attendance    students={stu.data} attendance={att.data} onRecord={att.upsertAttendance}/>}
          {page==='grades'        && <Grades        students={stu.data} grades={grd.data} onAdd={grd.add}/>}
          {page==='fees'          && <Fees          students={stu.data} fees={fee.data} onAdd={fee.add} onMarkPaid={(id)=>fee.update(id,{status:'paid',paid_date:new Date().toISOString().split('T')[0]})}/>}
          {page==='announcements' && <Announcements announcements={ann.data} onAdd={ann.add} onDelete={ann.remove}/>}
          {page==='settings'      && <Settings/>}
        </div>
      </main>
    </div>
  );
}
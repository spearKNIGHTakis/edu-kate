import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGraduationCap, faChalkboardTeacher, faCalendarCheck, faChartBar,
  faMoneyBillWave, faBullhorn, faCog, faHome, faSignOutAlt, faMoon, faSun,
  faSearch, faPlus, faEdit, faTrash, faEye, faFilter, faDownload,
  faFileExcel, faFilePdf, faFileCsv, faEnvelope, faSms, faBell, faCheck,
  faTimes, faUserShield, faUserTie, faSchool, faUsers, faBookOpen,
  faChartLine, faCheckCircle, faTimesCircle, faClock, faExclamationTriangle,
  faInfoCircle, faPhone, faPrint, faLock, faUser, faEyeSlash,
  faArrowRight, faArrowLeft, faStar, faRocket, faShieldAlt,
  faDatabase
} from '@fortawesome/free-solid-svg-icons';

// ─────────────────────────────────────────────
// SUPABASE
// ─────────────────────────────────────────────
const SUPABASE_URL      = process.env.REACT_APP_SUPABASE_URL      || '';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const IS_DEMO  = !supabase;

// ─────────────────────────────────────────────
// THEME CONTEXT
// ─────────────────────────────────────────────
const ThemeCtx = createContext({ theme: 'dark', toggleTheme: () => {} });
const useTheme = () => useContext(ThemeCtx);

// ─────────────────────────────────────────────
// AUTH CONTEXT
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// TOAST CONTEXT
// ─────────────────────────────────────────────
const ToastCtx = createContext(() => {});
const useToast = () => useContext(ToastCtx);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const uid          = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const fmtDate      = (d) => d ? new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';
const fmtMoney     = (n) => `$${Number(n).toLocaleString()}`;
const initials     = (name) => name ? name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : 'NA';
const letterGrade  = (score, max) => { const p=(score/max)*100; if(p>=90)return'A'; if(p>=80)return'B'; if(p>=70)return'C'; if(p>=60)return'D'; return'F'; };
const dateToday    = () => new Date().toISOString().split('T')[0];
const ALL_CLASSES  = ['9-A','9-B','9-C','10-A','10-B','10-C','11-A','11-B','12-A','12-B'];
const ALL_GRADES   = ['9','10','11','12'];
const ALL_SUBJECTS = ['Mathematics','Physics','Chemistry','English Literature','Biology','History','Geography','Computer Science'];

// ─────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────
const MOCK = {
  users: [
    { id:'u1', name:'Dr. Sarah Mitchell',   email:'admin@school.edu',   password:'admin123',  role:'admin',   subject:null,        class:null,    phone:'555-0001' },
    { id:'u2', name:'Prof. James Anderson', email:'james@school.edu',   password:'teacher123', role:'teacher', subject:'Physics',   class:'10-A',  phone:'555-0201' },
    { id:'u3', name:'Ms. Rachel Green',     email:'rachel@school.edu',  password:'teacher123', role:'teacher', subject:'English',   class:'11-B',  phone:'555-0202' },
    { id:'u4', name:'Mr. David Park',       email:'david@school.edu',   password:'teacher123', role:'teacher', subject:'Chemistry', class:'9-C',   phone:'555-0203' },
  ],
  students: [
    { id:'s1', name:'Emma Johnson',    email:'emma@school.edu',   grade:'10', class:'10-A', dob:'2009-03-15', phone:'555-0101', guardian_name:'Mary Johnson',    guardian_phone:'555-0150', status:'active', enrolled_at:'2023-09-01' },
    { id:'s2', name:'Liam Chen',       email:'liam@school.edu',   grade:'10', class:'10-A', dob:'2009-07-22', phone:'555-0102', guardian_name:'Wei Chen',        guardian_phone:'555-0151', status:'active', enrolled_at:'2023-09-01' },
    { id:'s3', name:'Sophia Williams', email:'sophia@school.edu', grade:'11', class:'11-B', dob:'2008-11-08', phone:'555-0103', guardian_name:'Robert Williams', guardian_phone:'555-0152', status:'active', enrolled_at:'2022-09-01' },
    { id:'s4', name:'Noah Martinez',   email:'noah@school.edu',   grade:'9',  class:'9-C',  dob:'2010-05-30', phone:'555-0104', guardian_name:'Carlos Martinez', guardian_phone:'555-0153', status:'active', enrolled_at:'2024-09-01' },
    { id:'s5', name:'Olivia Brown',    email:'olivia@school.edu', grade:'12', class:'12-A', dob:'2007-01-12', phone:'555-0105', guardian_name:'Helen Brown',     guardian_phone:'555-0154', status:'active', enrolled_at:'2021-09-01' },
    { id:'s6', name:'James Davis',     email:'james.d@school.edu',grade:'11', class:'11-A', dob:'2008-09-03', phone:'555-0106', guardian_name:'Patricia Davis',  guardian_phone:'555-0155', status:'inactive',enrolled_at:'2022-09-01' },
    { id:'s7', name:'Ava Thompson',    email:'ava@school.edu',    grade:'9',  class:'9-A',  dob:'2010-02-18', phone:'555-0107', guardian_name:'Gary Thompson',   guardian_phone:'555-0156', status:'active', enrolled_at:'2024-09-01' },
    { id:'s8', name:'Mason Lee',       email:'mason@school.edu',  grade:'10', class:'10-B', dob:'2009-11-05', phone:'555-0108', guardian_name:'Linda Lee',       guardian_phone:'555-0157', status:'active', enrolled_at:'2023-09-01' },
  ],
  teachers: [
    { id:'t1', name:'Dr. Sarah Mitchell',   email:'s.mitchell@school.edu', subject:'Mathematics',       phone:'555-0201', qualification:'PhD Mathematics', experience_years:12, status:'active', class:'10-A' },
    { id:'t2', name:'Prof. James Anderson', email:'j.anderson@school.edu', subject:'Physics',            phone:'555-0202', qualification:'MSc Physics',     experience_years:8,  status:'active', class:'10-B' },
    { id:'t3', name:'Ms. Rachel Green',     email:'r.green@school.edu',    subject:'English Literature', phone:'555-0203', qualification:'MA English',      experience_years:5,  status:'active', class:'11-B' },
    { id:'t4', name:'Mr. David Park',       email:'d.park@school.edu',     subject:'Chemistry',          phone:'555-0204', qualification:'MSc Chemistry',   experience_years:10, status:'active', class:'9-C' },
  ],
  attendance: [
    { id:'a1', student_id:'s1', date:'2026-02-17', status:'present', class:'10-A' },
    { id:'a2', student_id:'s2', date:'2026-02-17', status:'present', class:'10-A' },
    { id:'a3', student_id:'s3', date:'2026-02-17', status:'absent',  class:'11-B' },
    { id:'a4', student_id:'s4', date:'2026-02-17', status:'late',    class:'9-C' },
    { id:'a5', student_id:'s5', date:'2026-02-17', status:'present', class:'12-A' },
    { id:'a6', student_id:'s7', date:'2026-02-17', status:'excused', class:'9-A' },
    { id:'a7', student_id:'s8', date:'2026-02-17', status:'present', class:'10-B' },
  ],
  grades: [
    { id:'g1', student_id:'s1', subject:'Mathematics',        assignment:'Midterm Exam', score:92, max_score:100, term:'Spring 2026', date:'2026-02-10', class:'10-A' },
    { id:'g2', student_id:'s1', subject:'Physics',            assignment:'Lab Report',   score:87, max_score:100, term:'Spring 2026', date:'2026-02-12', class:'10-A' },
    { id:'g3', student_id:'s2', subject:'Mathematics',        assignment:'Midterm Exam', score:78, max_score:100, term:'Spring 2026', date:'2026-02-10', class:'10-A' },
    { id:'g4', student_id:'s3', subject:'English Literature', assignment:'Essay',        score:95, max_score:100, term:'Spring 2026', date:'2026-02-08', class:'11-B' },
    { id:'g5', student_id:'s4', subject:'Chemistry',          assignment:'Quiz 1',       score:65, max_score:100, term:'Spring 2026', date:'2026-02-05', class:'9-C' },
    { id:'g6', student_id:'s5', subject:'Mathematics',        assignment:'Midterm Exam', score:98, max_score:100, term:'Spring 2026', date:'2026-02-10', class:'12-A' },
    { id:'g7', student_id:'s7', subject:'Chemistry',          assignment:'Quiz 1',       score:71, max_score:100, term:'Spring 2026', date:'2026-02-05', class:'9-A' },
    { id:'g8', student_id:'s8', subject:'Mathematics',        assignment:'Midterm Exam', score:84, max_score:100, term:'Spring 2026', date:'2026-02-10', class:'10-B' },
  ],
  announcements: [
    { id:'an1', title:'Spring Sports Day Registration', content:'Annual sports day registrations are now open. Students can register for track, swimming, and team sports. Deadline: Feb 28th.', target_audience:'students', created_by:'Admin', priority:'high',   created_at:'2026-02-15T09:00:00Z' },
    { id:'an2', title:'Parent-Teacher Meeting',         content:'Quarterly parent-teacher meeting scheduled for March 5th. All teachers must prepare student progress reports.',               target_audience:'teachers', created_by:'Principal', priority:'high', created_at:'2026-02-14T10:00:00Z' },
    { id:'an3', title:'Library Hours Extended',         content:'The school library will now be open until 7 PM on weekdays starting March 1st to support exam preparation.',                   target_audience:'all', created_by:'Admin', priority:'normal',      created_at:'2026-02-13T11:00:00Z' },
  ],
  fees: [
    { id:'f1', student_id:'s1', amount:1500, fee_type:'Tuition',      due_date:'2026-03-01', paid_date:null,         status:'pending' },
    { id:'f2', student_id:'s2', amount:1500, fee_type:'Tuition',      due_date:'2026-03-01', paid_date:'2026-02-01', status:'paid' },
    { id:'f3', student_id:'s3', amount:200,  fee_type:'Library Fee',  due_date:'2026-01-15', paid_date:null,         status:'overdue' },
    { id:'f4', student_id:'s4', amount:1500, fee_type:'Tuition',      due_date:'2026-03-01', paid_date:'2026-02-10', status:'paid' },
    { id:'f5', student_id:'s5', amount:500,  fee_type:'Activity Fee', due_date:'2026-02-28', paid_date:null,         status:'pending' },
    { id:'f6', student_id:'s7', amount:1500, fee_type:'Tuition',      due_date:'2026-03-01', paid_date:null,         status:'pending' },
    { id:'f7', student_id:'s8', amount:200,  fee_type:'Lab Fee',      due_date:'2026-02-20', paid_date:null,         status:'overdue' },
  ],
};

// ─────────────────────────────────────────────
// DATA HOOK
// ─────────────────────────────────────────────
function useTable(table, mockData) {
  const [data, setData] = useState(mockData);
  const toast = useToast();

  useEffect(() => {
    if (IS_DEMO) return;
    supabase.from(table).select('*').order('created_at', { ascending:false })
      .then(({ data:rows, error }) => { if (!error && rows) setData(rows); });
  }, [table]);

  const add = useCallback(async (row) => {
    if (IS_DEMO) { setData(p => [...p, { ...row, id:uid(), created_at:new Date().toISOString() }]); toast('Record added','success'); return; }
    const { data:ins, error } = await supabase.from(table).insert(row).select();
    if (error) { toast(error.message,'error'); return; }
    setData(p => [...p, ...ins]);
    toast('Record added','success');
  }, [table, toast]);

  const update = useCallback(async (id, changes) => {
    if (IS_DEMO) { setData(p => p.map(r => r.id===id ? {...r,...changes} : r)); toast('Record updated','success'); return; }
    const { data:upd, error } = await supabase.from(table).update(changes).eq('id',id).select();
    if (error) { toast(error.message,'error'); return; }
    setData(p => p.map(r => r.id===id ? upd[0] : r));
    toast('Record updated','success');
  }, [table, toast]);

  const remove = useCallback(async (id) => {
    if (IS_DEMO) { setData(p => p.filter(r => r.id!==id)); toast('Record deleted','info'); return; }
    const { error } = await supabase.from(table).delete().eq('id',id);
    if (error) { toast(error.message,'error'); return; }
    setData(p => p.filter(r => r.id!==id));
    toast('Record deleted','info');
  }, [table, toast]);

  const upsertAtt = useCallback(async (student_id, date, status, cls) => {
    if (IS_DEMO) {
      setData(p => {
        const i = p.findIndex(a => a.student_id===student_id && a.date===date);
        if (i>=0) { const n=[...p]; n[i]={...n[i],status}; return n; }
        return [...p, { id:uid(), student_id, date, status, class:cls }];
      }); return;
    }
    await supabase.from('attendance').upsert({student_id,date,status,class:cls},{onConflict:'student_id,date'});
    setData(p => {
      const i=p.findIndex(a=>a.student_id===student_id&&a.date===date);
      if(i>=0){const n=[...p];n[i]={...n[i],status};return n;}
      return [...p,{id:uid(),student_id,date,status,class:cls}];
    });
  }, []);

  return { data, setData, add, update, remove, upsertAtt };
}

// ─────────────────────────────────────────────
// TOAST PROVIDER
// ─────────────────────────────────────────────
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((msg, type='info') => {
    const id = uid();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id!==id)), 3500);
  }, []);
  const icons = { success:faCheckCircle, error:faTimesCircle, info:faInfoCircle };
  return (
    <ToastCtx.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <FontAwesomeIcon icon={icons[t.type]||faInfoCircle}/>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ─────────────────────────────────────────────
// SHARED UI
// ─────────────────────────────────────────────
function Avatar({ name, size=36 }) {
  return <div className="avatar" style={{width:size,height:size,fontSize:size*0.35}}>{initials(name)}</div>;
}

function Modal({ title, icon, onClose, onSave, children, lg }) {
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={`modal${lg?' modal-lg':''}`}>
        <div className="modal-header">
          <span className="modal-title">{icon&&<FontAwesomeIcon icon={icon}/>}{title}</span>
          <button className="modal-close" onClick={onClose}><FontAwesomeIcon icon={faTimes}/></button>
        </div>
        {children}
        {onSave && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary"   onClick={onSave}><FontAwesomeIcon icon={faCheck}/> Save Changes</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SMS MODAL
// ─────────────────────────────────────────────
function SmsModal({ onClose, students, fees }) {
  const toast = useToast();
  const [type,    setType]    = useState('reminder');
  const [target,  setTarget]  = useState('overdue');
  const [preview, setPreview] = useState('');

  useEffect(() => {
    const templates = {
      reminder: (s,f) => `Dear ${s?.guardian_name||'Parent'}, this is a reminder that ${s?.name}'s ${f?.fee_type} fee of ${fmtMoney(f?.amount)} was due on ${fmtDate(f?.due_date)}. Please settle at your earliest convenience. — EduManage`,
      receipt:  (s,f) => `Dear ${s?.guardian_name||'Parent'}, payment of ${fmtMoney(f?.amount)} for ${s?.name}'s ${f?.fee_type} has been received on ${fmtDate(f?.paid_date)}. Thank you! — EduManage`,
      absent:   (s)   => `Dear ${s?.guardian_name||'Parent'}, ${s?.name} was marked absent today (${fmtDate(dateToday())}). Please contact the school if you have any concerns. — EduManage`,
    };
    const sample = students[0];
    const sampleFee = fees.find(f=>f.student_id===sample?.id) || fees[0];
    setPreview(templates[type](sample, sampleFee));
  }, [type, students, fees]);

  const handleSend = () => {
    const count = target==='overdue'
      ? fees.filter(f=>f.status==='overdue').length
      : students.filter(s=>s.status==='active').length;
    toast(`SMS sent to ${count} recipient(s) ✓`,'success');
    onClose();
  };

  return (
    <Modal title="Send SMS" icon={faSms} onClose={onClose} onSave={handleSend}>
      <div className="form-group">
        <label>Message Type</label>
        <select value={type} onChange={e=>setType(e.target.value)}>
          <option value="reminder">Fee Reminder</option>
          <option value="receipt">Payment Receipt</option>
          <option value="absent">Absence Alert</option>
        </select>
      </div>
      <div className="form-group">
        <label>Send To</label>
        <select value={target} onChange={e=>setTarget(e.target.value)}>
          <option value="overdue">Students with Overdue Fees</option>
          <option value="all">All Active Students</option>
          <option value="pending">Students with Pending Fees</option>
        </select>
      </div>
      <div className="sms-preview">{preview}</div>
      <div className="alert alert-info" style={{marginTop:14}}>
        <FontAwesomeIcon icon={faInfoCircle}/>
        <span>This will send SMS via your configured SMS gateway. In demo mode, no actual SMS is sent.</span>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// EXPORT MODAL
// ─────────────────────────────────────────────
function ExportModal({ onClose, dataLabel }) {
  const toast = useToast();
  const exp = (fmt) => { toast(`${dataLabel} exported as ${fmt} ✓`,'success'); onClose(); };
  return (
    <Modal title="Export Data" icon={faDownload} onClose={onClose}>
      <p style={{fontSize:13,color:'var(--text2)',marginBottom:16}}>Choose a format to export <strong>{dataLabel}</strong>:</p>
      <div className="export-options">
        <button className="export-option" onClick={()=>exp('Excel')}>
          <FontAwesomeIcon icon={faFileExcel} style={{color:'#1d6f42'}}/>
          <span>Excel (.xlsx)</span><small>Spreadsheet with all columns</small>
        </button>
        <button className="export-option" onClick={()=>exp('PDF')}>
          <FontAwesomeIcon icon={faFilePdf} style={{color:'#e53e3e'}}/>
          <span>PDF Report</span><small>Formatted printable report</small>
        </button>
        <button className="export-option" onClick={()=>exp('CSV')}>
          <FontAwesomeIcon icon={faFileCsv} style={{color:'#38a169'}}/>
          <span>CSV (.csv)</span><small>Raw comma-separated values</small>
        </button>
        <button className="export-option" onClick={()=>exp('Print')}>
          <FontAwesomeIcon icon={faPrint} style={{color:'var(--blue)'}}/>
          <span>Print</span><small>Print-friendly layout</small>
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// WELCOME PAGE
// ─────────────────────────────────────────────
const FEATURES = [
  { icon:faGraduationCap, color:'var(--accent)',  bg:'rgba(244,163,0,0.12)',   title:'Student Management', desc:'Complete student profiles, enrollment & class management.' },
  { icon:faCalendarCheck, color:'var(--green)',   bg:'rgba(46,160,67,0.12)',   title:'Attendance Tracking', desc:'Real-time daily attendance with SMS alerts to parents.' },
  { icon:faChartBar,      color:'var(--blue)',    bg:'rgba(56,139,253,0.12)',  title:'Grades & Reports',    desc:'Record scores, auto-calculate letter grades & export reports.' },
  { icon:faMoneyBillWave, color:'var(--purple)',  bg:'rgba(163,113,247,0.12)', title:'Fee Management',      desc:'Track payments, send SMS receipts & overdue reminders.' },
  { icon:faBullhorn,      color:'var(--red)',     bg:'rgba(248,81,73,0.12)',   title:'Announcements',       desc:'Broadcast to students, teachers or parents instantly.' },
  { icon:faShieldAlt,     color:'var(--accent2)', bg:'rgba(232,93,4,0.12)',   title:'Role-Based Access',   desc:'Admins and teachers each see only what they need.' },
];

function WelcomePage({ onLogin, onRegister }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="welcome-page" data-theme={theme}>
      <div className="welcome-bg"/>
      <div className="welcome-orb welcome-orb-1"/>
      <div className="welcome-orb welcome-orb-2"/>
      <div className="welcome-orb welcome-orb-3"/>

      <nav className="welcome-nav">
        <div className="welcome-logo">
          <div className="welcome-logo-icon"><FontAwesomeIcon icon={faSchool}/></div>
          <div className="welcome-logo-text">
            <h1>EduManage Pro</h1>
            <span>School Management</span>
          </div>
        </div>
        <div className="welcome-nav-actions">
          <button className="btn btn-ghost" onClick={toggleTheme} style={{gap:8}}>
            <FontAwesomeIcon icon={theme==='dark'?faSun:faMoon}/>
          </button>
          <button className="btn btn-secondary" onClick={onLogin}>Sign In</button>
          <button className="btn btn-primary"   onClick={onRegister}><FontAwesomeIcon icon={faRocket}/> Get Started</button>
        </div>
      </nav>

      <div className="welcome-hero">
        <div className="welcome-badge"><FontAwesomeIcon icon={faStar}/> All-in-One School Platform</div>
        <h1 className="welcome-title">
          Manage Your School<br/>
          <span className="welcome-title-grad">Smarter & Faster</span>
        </h1>
        <p className="welcome-sub">
          From attendance to fee management, EduManage Pro gives administrators and teachers
          everything they need in one beautiful, easy-to-use platform.
        </p>
        <div className="welcome-actions">
          <button className="btn btn-primary btn-lg" onClick={onLogin}>
            <FontAwesomeIcon icon={faArrowRight}/> Sign In to Dashboard
          </button>
          <button className="btn btn-secondary btn-lg" onClick={onRegister}>
            <FontAwesomeIcon icon={faPlus}/> Create Account
          </button>
        </div>
      </div>

      <div className="welcome-features">
        {FEATURES.map(f=>(
          <div key={f.title} className="welcome-feature-card">
            <div className="welcome-feature-icon" style={{background:f.bg,color:f.color}}>
              <FontAwesomeIcon icon={f.icon}/>
            </div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────
function LoginPage({ onLogin, onRegister, onBack }) {
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const [role,  setRole]  = useState('admin');
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');
  const [show,  setShow]  = useState(false);
  const [busy,  setBusy]  = useState(false);

  const prefill = (r) => {
    setRole(r);
    setEmail(r==='admin'?'admin@school.edu':'james@school.edu');
    setPass(r==='admin'?'admin123':'teacher123');
  };

  const handleLogin = async () => {
    setBusy(true);
    await new Promise(r=>setTimeout(r,700));
    const user = MOCK.users.find(u=>u.email===email && u.password===pass && u.role===role);
    if (user) { toast(`Welcome back, ${user.name.split(' ')[0]}!`,'success'); onLogin(user); }
    else { toast('Invalid email, password or role','error'); }
    setBusy(false);
  };

  return (
    <div className="auth-page" data-theme={theme}>
      <div className="auth-left">
        <div className="auth-left-orb-1"/><div className="auth-left-orb-2"/>
        <div className="auth-left-content">
          <div className="auth-left-logo">
            <div className="auth-left-logo-icon"><FontAwesomeIcon icon={faSchool}/></div>
            <h1>EduManage Pro</h1>
          </div>
          <div className="auth-illustration">🏫</div>
          <h2>Welcome Back!</h2>
          <p>Sign in to access your school management dashboard and stay on top of everything.</p>
          <div className="auth-left-features">
            {[['Manage students & teachers','faUsers'],['Track daily attendance','faCalendarCheck'],['Monitor grades & fees','faChartBar'],['Send SMS notifications','faSms']].map(([t])=>(
              <div key={t} className="auth-left-feature"><FontAwesomeIcon icon={faCheckCircle}/><span>{t}</span></div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box animate-in">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <button className="btn btn-ghost btn-sm" onClick={onBack}><FontAwesomeIcon icon={faArrowLeft}/> Back</button>
            <button className="btn btn-ghost btn-sm" onClick={toggleTheme}><FontAwesomeIcon icon={theme==='dark'?faSun:faMoon}/></button>
          </div>
          <div className="auth-box-header">
            <h2>Sign In</h2>
            <p>Select your role and enter your credentials</p>
          </div>

          <div className="auth-role-select">
            <div className={`role-card ${role==='admin'?'active':''}`} onClick={()=>prefill('admin')}>
              <FontAwesomeIcon icon={faUserShield} style={{color:role==='admin'?'var(--accent)':'var(--text2)',fontSize:26,display:'block',marginBottom:8}}/>
              <span>Administrator</span>
              <small>Full access</small>
            </div>
            <div className={`role-card ${role==='teacher'?'active':''}`} onClick={()=>prefill('teacher')}>
              <FontAwesomeIcon icon={faUserTie} style={{color:role==='teacher'?'var(--accent)':'var(--text2)',fontSize:26,display:'block',marginBottom:8}}/>
              <span>Teacher</span>
              <small>Limited access</small>
            </div>
          </div>

          <div className="auth-divider">or enter credentials manually</div>

          <div className="form-group">
            <label>Email Address</label>
            <div className="input-icon-wrap">
              <FontAwesomeIcon icon={faEnvelope} className="input-icon"/>
              <input type="email" placeholder="you@school.edu" value={email} onChange={e=>setEmail(e.target.value)}/>
            </div>
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="input-icon-wrap" style={{position:'relative'}}>
              <FontAwesomeIcon icon={faLock} className="input-icon"/>
              <input type={show?'text':'password'} placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)}/>
              <button onClick={()=>setShow(s=>!s)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:14}}>
                <FontAwesomeIcon icon={show?faEyeSlash:faEye}/>
              </button>
            </div>
          </div>

          <div className="alert alert-info" style={{fontSize:12}}>
            <FontAwesomeIcon icon={faInfoCircle}/>
            <div><strong>Demo:</strong> Admin — admin@school.edu / admin123 &nbsp;|&nbsp; Teacher — james@school.edu / teacher123</div>
          </div>

          <button className="btn btn-primary btn-block btn-lg" onClick={handleLogin} disabled={busy} style={{marginTop:8}}>
            {busy ? 'Signing in…' : <><FontAwesomeIcon icon={faArrowRight}/> Sign In</>}
          </button>

          <div className="auth-footer-link">
            Don't have an account? <button onClick={onRegister}>Register here</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// REGISTER PAGE
// ─────────────────────────────────────────────
function RegisterPage({ onLogin, onBack }) {
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const [form, setForm] = useState({ name:'', email:'', phone:'', role:'teacher', subject:'', class:'', password:'', confirm:'' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const F = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const handleRegister = async () => {
    if (!form.name||!form.email||!form.password) return toast('Please fill all required fields','error');
    if (form.password!==form.confirm) return toast('Passwords do not match','error');
    if (form.password.length<6) return toast('Password must be at least 6 characters','error');
    setBusy(true);
    await new Promise(r=>setTimeout(r,800));
    toast('Account created! You can now sign in.','success');
    setBusy(false);
    onBack();
  };

  return (
    <div className="auth-page" data-theme={theme}>
      <div className="auth-left">
        <div className="auth-left-orb-1"/><div className="auth-left-orb-2"/>
        <div className="auth-left-content">
          <div className="auth-left-logo">
            <div className="auth-left-logo-icon"><FontAwesomeIcon icon={faSchool}/></div>
            <h1>EduManage Pro</h1>
          </div>
          <div className="auth-illustration">📚</div>
          <h2>Join Our Platform</h2>
          <p>Create your account and start managing your school more efficiently today.</p>
          <div className="auth-left-features">
            {['Free to get started','Role-based access control','Secure & encrypted data','SMS notifications included'].map(t=>(
              <div key={t} className="auth-left-feature"><FontAwesomeIcon icon={faCheckCircle}/><span>{t}</span></div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box animate-in">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <button className="btn btn-ghost btn-sm" onClick={onBack}><FontAwesomeIcon icon={faArrowLeft}/> Back</button>
            <button className="btn btn-ghost btn-sm" onClick={toggleTheme}><FontAwesomeIcon icon={theme==='dark'?faSun:faMoon}/></button>
          </div>
          <div className="auth-box-header">
            <h2>Create Account</h2>
            <p>Fill in your details to get started</p>
          </div>

          <div className="auth-role-select">
            <div className={`role-card ${form.role==='admin'?'active':''}`} onClick={()=>setForm(p=>({...p,role:'admin'}))}>
              <FontAwesomeIcon icon={faUserShield} style={{color:form.role==='admin'?'var(--accent)':'var(--text2)',fontSize:26,display:'block',marginBottom:8}}/>
              <span>Administrator</span><small>School admin</small>
            </div>
            <div className={`role-card ${form.role==='teacher'?'active':''}`} onClick={()=>setForm(p=>({...p,role:'teacher'}))}>
              <FontAwesomeIcon icon={faUserTie} style={{color:form.role==='teacher'?'var(--accent)':'var(--text2)',fontSize:26,display:'block',marginBottom:8}}/>
              <span>Teacher</span><small>Class teacher</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <div className="input-icon-wrap"><FontAwesomeIcon icon={faUser} className="input-icon"/><input value={form.name} onChange={F('name')} placeholder="Dr. Jane Smith"/></div>
            </div>
            <div className="form-group">
              <label>Email *</label>
              <div className="input-icon-wrap"><FontAwesomeIcon icon={faEnvelope} className="input-icon"/><input type="email" value={form.email} onChange={F('email')} placeholder="jane@school.edu"/></div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <div className="input-icon-wrap"><FontAwesomeIcon icon={faPhone} className="input-icon"/><input value={form.phone} onChange={F('phone')} placeholder="555-0000"/></div>
            </div>
            {form.role==='teacher' && (
              <div className="form-group">
                <label>Subject</label>
                <select value={form.subject} onChange={F('subject')}>
                  <option value="">Select…</option>
                  {ALL_SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
          {form.role==='teacher' && (
            <div className="form-group">
              <label>Assigned Class</label>
              <select value={form.class} onChange={F('class')}>
                <option value="">Select class…</option>
                {ALL_CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label>Password *</label>
              <div className="input-icon-wrap" style={{position:'relative'}}>
                <FontAwesomeIcon icon={faLock} className="input-icon"/>
                <input type={show?'text':'password'} value={form.password} onChange={F('password')} placeholder="Min 6 chars"/>
                <button onClick={()=>setShow(s=>!s)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--text3)',cursor:'pointer'}}>
                  <FontAwesomeIcon icon={show?faEyeSlash:faEye}/>
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Confirm Password *</label>
              <div className="input-icon-wrap"><FontAwesomeIcon icon={faLock} className="input-icon"/><input type="password" value={form.confirm} onChange={F('confirm')} placeholder="Repeat password"/></div>
            </div>
          </div>

          <button className="btn btn-primary btn-block btn-lg" onClick={handleRegister} disabled={busy}>
            {busy ? 'Creating account…' : <><FontAwesomeIcon icon={faCheck}/> Create Account</>}
          </button>
          <div className="auth-footer-link">
            Already have an account? <button onClick={onBack}>Sign in</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
function Dashboard({ user, students, teachers, attendance, grades, fees, announcements }) {
  const active    = students.filter(s=>s.status==='active').length;
  const today     = dateToday();
  const todayAtt  = attendance.filter(a=>a.date===today);
  const present   = todayAtt.filter(a=>a.status==='present').length;
  const avgScore  = grades.length ? Math.round(grades.reduce((s,g)=>s+(g.score/g.max_score)*100,0)/grades.length) : 0;
  const collected = fees.filter(f=>f.status==='paid').reduce((s,f)=>s+Number(f.amount),0);
  const totalFees = fees.reduce((s,f)=>s+Number(f.amount),0);
  const overdue   = fees.filter(f=>f.status==='overdue').length;
  const attRate   = todayAtt.length ? Math.round((present/todayAtt.length)*100) : 0;

  const attStats = ['present','absent','late','excused'].map(st=>({
    label:st[0].toUpperCase()+st.slice(1),
    count:attendance.filter(a=>a.status===st).length,
    color:{present:'var(--green)',absent:'var(--red)',late:'var(--yellow)',excused:'var(--blue)'}[st],
  }));
  const maxAtt = Math.max(...attStats.map(a=>a.count),1);

  return (
    <div className="animate-in">
      {IS_DEMO && (
        <div className="alert alert-info">
          <FontAwesomeIcon icon={faInfoCircle}/>
          <span>Running in <strong>demo mode</strong>. Set <code>REACT_APP_SUPABASE_URL</code> and <code>REACT_APP_SUPABASE_ANON_KEY</code> in your <code>.env</code> for live data.</span>
        </div>
      )}

      {user.role==='teacher' ? (
        // Teacher dashboard
        <>
          <div className="stats-grid">
            <div className="stat-card green">
              <div className="stat-card-icon"><FontAwesomeIcon icon={faCalendarCheck}/></div>
              <div className="stat-value">{attRate}%</div>
              <div className="stat-label">Today's Attendance</div>
              <div className="stat-change up"><FontAwesomeIcon icon={faUsers}/>{present} present</div>
            </div>
            <div className="stat-card blue">
              <div className="stat-card-icon"><FontAwesomeIcon icon={faUsers}/></div>
              <div className="stat-value">{students.filter(s=>s.class===user.class&&s.status==='active').length}</div>
              <div className="stat-label">My Class ({user.class})</div>
              <div className="stat-change">Active students</div>
            </div>
            <div className="stat-card gold">
              <div className="stat-card-icon"><FontAwesomeIcon icon={faChartBar}/></div>
              <div className="stat-value">{avgScore}%</div>
              <div className="stat-label">Class Average</div>
              <div className="stat-change up">{grades.length} assessments</div>
            </div>
            <div className="stat-card purple">
              <div className="stat-card-icon"><FontAwesomeIcon icon={faBookOpen}/></div>
              <div className="stat-value">{user.subject}</div>
              <div className="stat-label">My Subject</div>
              <div className="stat-change">Assigned subject</div>
            </div>
          </div>
        </>
      ) : (
        // Admin dashboard
        <>
          <div className="stats-grid">
            <div className="stat-card gold">
              <div className="stat-card-icon"><FontAwesomeIcon icon={faGraduationCap}/></div>
              <div className="stat-value">{active}</div>
              <div className="stat-label">Active Students</div>
              <div className="stat-change up"><FontAwesomeIcon icon={faCheckCircle}/> {students.length} total</div>
            </div>
            <div className="stat-card blue">
              <div className="stat-card-icon"><FontAwesomeIcon icon={faChalkboardTeacher}/></div>
              <div className="stat-value">{teachers.length}</div>
              <div className="stat-label">Teaching Staff</div>
              <div className="stat-change up">{teachers.filter(t=>t.status==='active').length} active</div>
            </div>
            <div className="stat-card green">
              <div className="stat-card-icon"><FontAwesomeIcon icon={faCalendarCheck}/></div>
              <div className="stat-value">{attRate}%</div>
              <div className="stat-label">Today's Attendance</div>
              <div className="stat-change">{present}/{todayAtt.length} present</div>
            </div>
            <div className="stat-card purple">
              <div className="stat-card-icon"><FontAwesomeIcon icon={faChartLine}/></div>
              <div className="stat-value">{avgScore}%</div>
              <div className="stat-label">Average Grade</div>
              <div className="stat-change">{grades.length} assessments</div>
            </div>
            <div className="stat-card gold">
              <div className="stat-card-icon"><FontAwesomeIcon icon={faMoneyBillWave}/></div>
              <div className="stat-value">{fmtMoney(collected)}</div>
              <div className="stat-label">Fees Collected</div>
              <div className="stat-change">{totalFees?Math.round((collected/totalFees)*100):0}% of {fmtMoney(totalFees)}</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width:`${totalFees?(collected/totalFees)*100:0}%`,background:'var(--accent)'}}/>
              </div>
            </div>
            <div className="stat-card red">
              <div className="stat-card-icon"><FontAwesomeIcon icon={faExclamationTriangle}/></div>
              <div className="stat-value">{overdue}</div>
              <div className="stat-label">Overdue Payments</div>
              <div className="stat-change down">Needs attention</div>
            </div>
          </div>
        </>
      )}

      <div className="grid-2" style={{marginBottom:20}}>
        <div className="card">
          <div className="card-header">
            <span className="card-title"><FontAwesomeIcon icon={faChartBar}/> Attendance Overview</span>
          </div>
          <div className="chart-bars">
            {attStats.map(a=>(
              <div key={a.label} className="chart-bar-wrap">
                <div className="chart-bar-val">{a.count}</div>
                <div className="chart-bar" style={{height:`${(a.count/maxAtt)*90}%`,background:a.color}}/>
                <div className="chart-bar-label">{a.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title"><FontAwesomeIcon icon={faBullhorn}/> Announcements</span>
          </div>
          {announcements.slice(0,3).map(a=>(
            <div key={a.id} style={{padding:'9px 0',borderBottom:'1px solid var(--border)'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <span className={`badge badge-${a.priority==='high'?'red':'blue'}`}>{a.priority}</span>
                <span style={{fontSize:13,fontWeight:600}}>{a.title}</span>
              </div>
              <p style={{fontSize:12,color:'var(--text2)'}}>{a.content.substring(0,80)}…</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title"><FontAwesomeIcon icon={faChartBar}/> Recent Grades</span></div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Student</th><th>Subject</th><th>Assignment</th><th>Score</th><th>Grade</th><th>Class</th><th>Date</th></tr></thead>
            <tbody>
              {grades.slice(0,6).map(g=>{
                const s=students.find(st=>st.id===g.student_id);
                const l=letterGrade(g.score,g.max_score);
                return (
                  <tr key={g.id}>
                    <td><div style={{display:'flex',alignItems:'center',gap:9}}><Avatar name={s?.name||'?'} size={28}/><span style={{fontWeight:600}}>{s?.name||'Unknown'}</span></div></td>
                    <td>{g.subject}</td><td style={{color:'var(--text2)'}}>{g.assignment}</td>
                    <td>{g.score}/{g.max_score}</td>
                    <td><span className={`grade-pill grade-${l}`}>{l}</span></td>
                    <td><span className="badge badge-gray">{g.class}</span></td>
                    <td style={{color:'var(--text2)',fontSize:12}}>{fmtDate(g.date)}</td>
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
const BLANK_STU = { name:'',email:'',grade:'9',class:'9-A',dob:'',phone:'',guardian_name:'',guardian_phone:'',address:'',status:'active' };

function Students({ students, onAdd, onEdit, onDelete }) {
  const [search, setSearch]     = useState('');
  const [filterCls, setFilterCls] = useState('');
  const [filterGrd, setFilterGrd] = useState('');
  const [filterSts, setFilterSts] = useState('');
  const [modal, setModal]       = useState(false);
  const [expModal, setExpModal] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(BLANK_STU);

  const F = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const filtered = students.filter(s=>{
    const q=search.toLowerCase();
    return (
      (!search || s.name.toLowerCase().includes(q)||s.email.toLowerCase().includes(q)) &&
      (!filterCls || s.class===filterCls) &&
      (!filterGrd || s.grade===filterGrd) &&
      (!filterSts || s.status===filterSts)
    );
  });

  const openAdd  = ()=>{setEditing(null);setForm(BLANK_STU);setModal(true);};
  const openEdit = s=>{setEditing(s.id);setForm({...s});setModal(true);};
  const save = ()=>{editing?onEdit(editing,form):onAdd(form);setModal(false);};
  const del  = id=>{if(window.confirm('Delete this student?')) onDelete(id);};

  return (
    <div className="animate-in">
      <div className="filter-bar">
        <div className="search-box">
          <FontAwesomeIcon icon={faSearch} className="input-icon"/>
          <input placeholder="Search students…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="filter-select" value={filterCls} onChange={e=>setFilterCls(e.target.value)}>
          <option value="">All Classes</option>
          {ALL_CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={filterGrd} onChange={e=>setFilterGrd(e.target.value)}>
          <option value="">All Grades</option>
          {ALL_GRADES.map(g=><option key={g} value={g}>Grade {g}</option>)}
        </select>
        <select className="filter-select" value={filterSts} onChange={e=>setFilterSts(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span style={{marginLeft:'auto',fontSize:12,color:'var(--text2)'}}>{filtered.length} student{filtered.length!==1?'s':''}</span>
        <button className="btn btn-secondary btn-sm" onClick={()=>setExpModal(true)}><FontAwesomeIcon icon={faDownload}/> Export</button>
        <button className="btn btn-primary btn-sm"  onClick={openAdd}><FontAwesomeIcon icon={faPlus}/> Add Student</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead><tr><th>Name</th><th>Class</th><th>Grade</th><th>Email</th><th>Guardian</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(s=>(
              <tr key={s.id}>
                <td><div style={{display:'flex',alignItems:'center',gap:10}}><Avatar name={s.name} size={32}/><div><div style={{fontWeight:600,fontSize:13.5}}>{s.name}</div><div style={{fontSize:11,color:'var(--text2)'}}>{fmtDate(s.enrolled_at)}</div></div></div></td>
                <td><span className="badge badge-gray">{s.class}</span></td>
                <td>Gr.{s.grade}</td>
                <td style={{color:'var(--text2)',fontSize:12}}>{s.email}</td>
                <td style={{fontSize:13}}>{s.guardian_name||'—'}</td>
                <td style={{fontSize:12,color:'var(--text2)'}}>{s.phone||'—'}</td>
                <td><span className={`badge badge-${s.status==='active'?'green':'gray'}`}>{s.status}</span></td>
                <td><div style={{display:'flex',gap:5}}>
                  <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(s)} title="Edit"><FontAwesomeIcon icon={faEdit}/></button>
                  <button className="btn btn-danger btn-sm"    onClick={()=>del(s.id)}   title="Delete"><FontAwesomeIcon icon={faTrash}/></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0&&<div className="empty-state"><div className="empty-state-icon"><FontAwesomeIcon icon={faUsers}/></div><h3>No students found</h3><p>Try adjusting your filters or add a new student.</p></div>}
      </div>

      {modal&&(
        <Modal title={editing?'Edit Student':'Add Student'} icon={faGraduationCap} onClose={()=>setModal(false)} onSave={save}>
          <div className="form-row">
            <div className="form-group"><label>Full Name *</label><input value={form.name} onChange={F('name')} placeholder="John Smith"/></div>
            <div className="form-group"><label>Email *</label><input type="email" value={form.email} onChange={F('email')} placeholder="john@school.edu"/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Grade</label><select value={form.grade} onChange={F('grade')}>{ALL_GRADES.map(g=><option key={g} value={g}>Grade {g}</option>)}</select></div>
            <div className="form-group"><label>Class</label><select value={form.class} onChange={F('class')}>{ALL_CLASSES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Date of Birth</label><input type="date" value={form.dob} onChange={F('dob')}/></div>
            <div className="form-group"><label>Phone</label><input value={form.phone} onChange={F('phone')} placeholder="555-0100"/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Guardian Name</label><input value={form.guardian_name} onChange={F('guardian_name')}/></div>
            <div className="form-group"><label>Guardian Phone</label><input value={form.guardian_phone} onChange={F('guardian_phone')}/></div>
          </div>
          <div className="form-group"><label>Address</label><input value={form.address} onChange={F('address')}/></div>
          <div className="form-group"><label>Status</label><select value={form.status} onChange={F('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        </Modal>
      )}
      {expModal&&<ExportModal onClose={()=>setExpModal(false)} dataLabel="Students"/>}
    </div>
  );
}

// ─────────────────────────────────────────────
// TEACHERS
// ─────────────────────────────────────────────
const BLANK_TCH = { name:'',email:'',subject:'',phone:'',qualification:'',experience_years:0,status:'active',class:'' };

function Teachers({ teachers, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState('');
  const [filterSub, setFilterSub] = useState('');
  const [modal, setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]     = useState(BLANK_TCH);
  const F = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const filtered = teachers.filter(t=>{
    const q=search.toLowerCase();
    return (!search||t.name.toLowerCase().includes(q)||t.subject.toLowerCase().includes(q)) &&
           (!filterSub||t.subject===filterSub);
  });

  const openAdd  = ()=>{setEditing(null);setForm(BLANK_TCH);setModal(true);};
  const openEdit = t=>{setEditing(t.id);setForm({...t});setModal(true);};
  const save = ()=>{editing?onEdit(editing,form):onAdd(form);setModal(false);};
  const del  = id=>{if(window.confirm('Remove this teacher?')) onDelete(id);};

  return (
    <div className="animate-in">
      <div className="filter-bar">
        <div className="search-box"><FontAwesomeIcon icon={faSearch} className="input-icon"/><input placeholder="Search teachers…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <select className="filter-select" value={filterSub} onChange={e=>setFilterSub(e.target.value)}>
          <option value="">All Subjects</option>
          {ALL_SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{marginLeft:'auto',fontSize:12,color:'var(--text2)'}}>{filtered.length} teacher{filtered.length!==1?'s':''}</span>
        <button className="btn btn-primary btn-sm" onClick={openAdd}><FontAwesomeIcon icon={faPlus}/> Add Teacher</button>
      </div>

      <div className="teacher-grid">
        {filtered.map(t=>(
          <div key={t.id} className="card" style={{transition:'var(--transition)'}}>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
              <Avatar name={t.name} size={48}/>
              <div><div style={{fontWeight:700,fontSize:15}}>{t.name}</div><div style={{fontSize:12,color:'var(--text2)'}}>{t.email}</div></div>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:7,marginBottom:14}}>
              <span className="badge badge-blue"><FontAwesomeIcon icon={faBookOpen}/> {t.subject}</span>
              {t.class&&<span className="badge badge-gold">{t.class}</span>}
              <span className={`badge badge-${t.status==='active'?'green':'gray'}`}>{t.status}</span>
            </div>
            <div style={{fontSize:12.5,color:'var(--text2)',lineHeight:2}}>
              <div><FontAwesomeIcon icon={faGraduationCap} style={{marginRight:7}}/>{t.qualification||'—'}</div>
              <div><FontAwesomeIcon icon={faClock} style={{marginRight:7}}/>{t.experience_years} yrs experience</div>
              <div><FontAwesomeIcon icon={faPhone} style={{marginRight:7}}/>{t.phone||'—'}</div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button className="btn btn-secondary btn-sm" style={{flex:1}} onClick={()=>openEdit(t)}><FontAwesomeIcon icon={faEdit}/> Edit</button>
              <button className="btn btn-danger btn-sm"  onClick={()=>del(t.id)}><FontAwesomeIcon icon={faTrash}/></button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length===0&&<div className="empty-state"><div className="empty-state-icon"><FontAwesomeIcon icon={faChalkboardTeacher}/></div><h3>No teachers found</h3><p>Add a teacher or adjust your search.</p></div>}

      {modal&&(
        <Modal title={editing?'Edit Teacher':'Add Teacher'} icon={faChalkboardTeacher} onClose={()=>setModal(false)} onSave={save}>
          <div className="form-row">
            <div className="form-group"><label>Full Name *</label><input value={form.name} onChange={F('name')}/></div>
            <div className="form-group"><label>Email *</label><input type="email" value={form.email} onChange={F('email')}/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Subject</label><select value={form.subject} onChange={F('subject')}><option value="">Select…</option>{ALL_SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            <div className="form-group"><label>Assigned Class</label><select value={form.class} onChange={F('class')}><option value="">None</option>{ALL_CLASSES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Phone</label><input value={form.phone} onChange={F('phone')}/></div>
            <div className="form-group"><label>Qualification</label><input value={form.qualification} onChange={F('qualification')}/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Years Experience</label><input type="number" min="0" value={form.experience_years} onChange={F('experience_years')}/></div>
            <div className="form-group"><label>Status</label><select value={form.status} onChange={F('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────────
function Attendance({ user, students, attendance, onRecord }) {
  const toast = useToast();
  const [date,     setDate]     = useState(dateToday());
  const [filterCls,setFilterCls]= useState(user.role==='teacher' ? user.class||'' : '');
  const [localAtt, setLocalAtt] = useState({});
  const [smsModal, setSmsModal] = useState(false);
  const [expModal, setExpModal] = useState(false);

  useEffect(()=>{
    const map={};
    attendance.filter(a=>a.date===date).forEach(a=>{map[a.student_id]=a.status;});
    setLocalAtt(map);
  },[date,attendance]);

  const mark    = (id,st)=>setLocalAtt(p=>({...p,[id]:st}));
  const saveAll = ()=>{
    const cls=filterCls||'all';
    Object.entries(localAtt).forEach(([sid,st])=>onRecord(sid,date,st,cls));
    toast('Attendance saved!','success');
  };

  const filteredStudents = students.filter(s=>{
    if(s.status!=='active') return false;
    if(filterCls) return s.class===filterCls;
    return true;
  });

  const counts=['present','absent','late','excused'].reduce((acc,s)=>({...acc,[s]:Object.values(localAtt).filter(v=>v===s).length}),{});

  const colors={present:'var(--green)',absent:'var(--red)',late:'var(--yellow)',excused:'var(--blue)'};

  return (
    <div className="animate-in">
      <div className="filter-bar">
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{width:'auto'}}/>
        <select className="filter-select" value={filterCls} onChange={e=>setFilterCls(e.target.value)} disabled={user.role==='teacher'}>
          <option value="">All Classes</option>
          {ALL_CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{display:'flex',gap:16,alignItems:'center',marginLeft:12}}>
          {Object.entries(counts).map(([st,c])=>(
            <div key={st} style={{textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:700,color:colors[st]}}>{c}</div>
              <div style={{fontSize:10,color:'var(--text2)',textTransform:'capitalize'}}>{st}</div>
            </div>
          ))}
        </div>
        <span style={{marginLeft:'auto',fontSize:12,color:'var(--text2)'}}>{filteredStudents.length} students</span>
        <button className="btn btn-secondary btn-sm" onClick={()=>setExpModal(true)}><FontAwesomeIcon icon={faDownload}/> Export</button>
        <button className="btn btn-secondary btn-sm" onClick={()=>setSmsModal(true)}><FontAwesomeIcon icon={faSms}/> SMS Alert</button>
        <button className="btn btn-primary btn-sm"   onClick={saveAll}><FontAwesomeIcon icon={faCheck}/> Save</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead><tr><th>Student</th><th>Class</th><th>Mark Attendance</th><th>Current Status</th></tr></thead>
          <tbody>
            {filteredStudents.map(s=>(
              <tr key={s.id}>
                <td><div style={{display:'flex',alignItems:'center',gap:9}}><Avatar name={s.name} size={30}/><span style={{fontWeight:600}}>{s.name}</span></div></td>
                <td><span className="badge badge-gray">{s.class}</span></td>
                <td>
                  <div className="att-btns">
                    {['present','absent','late','excused'].map(st=>(
                      <button key={st} className={`att-btn ${st}${localAtt[s.id]===st?' active':''}`} onClick={()=>mark(s.id,st)}>
                        {st[0].toUpperCase()+st.slice(1)}
                      </button>
                    ))}
                  </div>
                </td>
                <td>
                  {localAtt[s.id]&&(
                    <span className={`badge badge-${localAtt[s.id]==='present'?'green':localAtt[s.id]==='absent'?'red':localAtt[s.id]==='late'?'yellow':'blue'}`}>
                      {localAtt[s.id]}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStudents.length===0&&<div className="empty-state"><div className="empty-state-icon"><FontAwesomeIcon icon={faCalendarCheck}/></div><h3>No students</h3><p>Select a class or add students first.</p></div>}
      </div>

      {smsModal&&<SmsModal onClose={()=>setSmsModal(false)} students={students} fees={[]}/>}
      {expModal&&<ExportModal onClose={()=>setExpModal(false)} dataLabel="Attendance Register"/>}
    </div>
  );
}

// ─────────────────────────────────────────────
// GRADES
// ─────────────────────────────────────────────
const BLANK_GRD = { student_id:'',subject:'',assignment:'',score:'',max_score:100,term:'Spring 2026',date:dateToday(),class:'' };

function Grades({ user, students, grades, onAdd }) {
  const [modal, setModal]       = useState(false);
  const [expModal, setExpModal] = useState(false);
  const [filterStu, setFilterStu] = useState('');
  const [filterCls, setFilterCls] = useState(user.role==='teacher'?user.class||'':'');
  const [filterSub, setFilterSub] = useState(user.role==='teacher'?user.subject||'':'');
  const [form, setForm]         = useState({...BLANK_GRD,subject:user.subject||'',class:user.class||''});
  const F = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const list = grades.filter(g=>{
    return (!filterStu||g.student_id===filterStu) &&
           (!filterCls||g.class===filterCls) &&
           (!filterSub||g.subject===filterSub);
  });

  const save = ()=>{
    if(!form.student_id||!form.subject||!form.score) return alert('Fill required fields');
    const stu=students.find(s=>s.id===form.student_id);
    onAdd({...form,class:stu?.class||form.class});
    setModal(false);
    setForm({...BLANK_GRD,subject:user.subject||'',class:user.class||''});
  };

  return (
    <div className="animate-in">
      <div className="filter-bar">
        <div className="search-box" style={{position:'relative'}}>
          <FontAwesomeIcon icon={faFilter} className="input-icon"/>
          <select className="filter-select" style={{paddingLeft:34}} value={filterStu} onChange={e=>setFilterStu(e.target.value)}>
            <option value="">All Students</option>
            {students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <select className="filter-select" value={filterCls} onChange={e=>setFilterCls(e.target.value)} disabled={user.role==='teacher'}>
          <option value="">All Classes</option>
          {ALL_CLASSES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={filterSub} onChange={e=>setFilterSub(e.target.value)} disabled={user.role==='teacher'}>
          <option value="">All Subjects</option>
          {ALL_SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{marginLeft:'auto',fontSize:12,color:'var(--text2)'}}>{list.length} record{list.length!==1?'s':''}</span>
        <button className="btn btn-secondary btn-sm" onClick={()=>setExpModal(true)}><FontAwesomeIcon icon={faDownload}/> Export</button>
        <button className="btn btn-primary btn-sm"   onClick={()=>setModal(true)}><FontAwesomeIcon icon={faPlus}/> Add Grade</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead><tr><th>Student</th><th>Class</th><th>Subject</th><th>Assignment</th><th>Score</th><th>Pct</th><th>Grade</th><th>Term</th><th>Date</th></tr></thead>
          <tbody>
            {list.map(g=>{
              const s=students.find(st=>st.id===g.student_id);
              const pct=Math.round((g.score/g.max_score)*100);
              const l=letterGrade(g.score,g.max_score);
              return (
                <tr key={g.id}>
                  <td><div style={{display:'flex',alignItems:'center',gap:9}}><Avatar name={s?.name||'?'} size={28}/><span style={{fontWeight:600,fontSize:13}}>{s?.name||'Unknown'}</span></div></td>
                  <td><span className="badge badge-gray">{g.class}</span></td>
                  <td style={{fontSize:12.5}}>{g.subject}</td>
                  <td style={{color:'var(--text2)',fontSize:12.5}}>{g.assignment}</td>
                  <td style={{fontWeight:700}}>{g.score}/{g.max_score}</td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:7,minWidth:80}}>
                      <span style={{fontWeight:600,fontSize:12,minWidth:30}}>{pct}%</span>
                      <div className="progress-bar" style={{flex:1,margin:0}}>
                        <div className="progress-fill" style={{width:`${pct}%`,background:pct>=80?'var(--green)':pct>=60?'var(--yellow)':'var(--red)'}}/>
                      </div>
                    </div>
                  </td>
                  <td><span className={`grade-pill grade-${l}`}>{l}</span></td>
                  <td style={{fontSize:11,color:'var(--text2)'}}>{g.term}</td>
                  <td style={{fontSize:12,color:'var(--text2)'}}>{fmtDate(g.date)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length===0&&<div className="empty-state"><div className="empty-state-icon"><FontAwesomeIcon icon={faChartBar}/></div><h3>No grades found</h3><p>Add a grade or adjust your filters.</p></div>}
      </div>

      {modal&&(
        <Modal title="Record Grade" icon={faChartBar} onClose={()=>setModal(false)} onSave={save}>
          <div className="form-group">
            <label>Student *</label>
            <select value={form.student_id} onChange={e=>{const stu=students.find(s=>s.id===e.target.value);setForm(p=>({...p,student_id:e.target.value,class:stu?.class||p.class}));}}>
              <option value="">Select student…</option>
              {students.filter(s=>user.role==='teacher'?s.class===user.class:true).map(s=><option key={s.id} value={s.id}>{s.name} — {s.class}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Subject *</label>
              {user.role==='teacher'
                ? <input value={form.subject} readOnly style={{opacity:0.7}}/>
                : <select value={form.subject} onChange={F('subject')}><option value="">Select…</option>{ALL_SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}</select>}
            </div>
            <div className="form-group"><label>Assignment *</label><input value={form.assignment} onChange={F('assignment')} placeholder="Midterm Exam"/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Score *</label><input type="number" min="0" value={form.score} onChange={F('score')}/></div>
            <div className="form-group"><label>Max Score</label><input type="number" min="1" value={form.max_score} onChange={F('max_score')}/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Term</label><input value={form.term} onChange={F('term')}/></div>
            <div className="form-group"><label>Date</label><input type="date" value={form.date} onChange={F('date')}/></div>
          </div>
          {form.score&&form.max_score&&(
            <div className="alert alert-info">
              <FontAwesomeIcon icon={faInfoCircle}/>
              <span>Letter grade: <strong>{letterGrade(Number(form.score),Number(form.max_score))}</strong> ({Math.round((form.score/form.max_score)*100)}%)</span>
            </div>
          )}
        </Modal>
      )}
      {expModal&&<ExportModal onClose={()=>setExpModal(false)} dataLabel="Grades Report"/>}
    </div>
  );
}

// ─────────────────────────────────────────────
// FEES
// ─────────────────────────────────────────────
const BLANK_FEE = { student_id:'',amount:'',fee_type:'Tuition',due_date:'',status:'pending' };
const FEE_TYPES = ['Tuition','Library Fee','Activity Fee','Lab Fee','Transport Fee','Sports Fee','Exam Fee'];

function Fees({ students, fees, onAdd, onUpdate }) {
  const toast = useToast();
  const [tab,      setTab]      = useState('all');
  const [modal,    setModal]    = useState(false);
  const [smsModal, setSmsModal] = useState(false);
  const [expModal, setExpModal] = useState(false);
  const [form, setForm]         = useState(BLANK_FEE);
  const F = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const list = tab==='all' ? fees : fees.filter(f=>f.status===tab);
  const collected  = fees.filter(f=>f.status==='paid').reduce((s,f)=>s+Number(f.amount),0);
  const pending    = fees.filter(f=>f.status==='pending').reduce((s,f)=>s+Number(f.amount),0);
  const overdueAmt = fees.filter(f=>f.status==='overdue').reduce((s,f)=>s+Number(f.amount),0);

  const save = ()=>{
    if(!form.student_id||!form.amount) return toast('Fill required fields','error');
    onAdd(form);
    setModal(false);
    setForm(BLANK_FEE);
  };

  const markPaid = id => onUpdate(id,{status:'paid',paid_date:dateToday()});

  return (
    <div className="animate-in">
      <div className="stats-grid" style={{marginBottom:20}}>
        <div className="stat-card green"><div className="stat-card-icon"><FontAwesomeIcon icon={faCheckCircle}/></div><div className="stat-value">{fmtMoney(collected)}</div><div className="stat-label">Collected</div></div>
        <div className="stat-card gold"> <div className="stat-card-icon"><FontAwesomeIcon icon={faClock}/></div>      <div className="stat-value">{fmtMoney(pending)}</div>  <div className="stat-label">Pending</div></div>
        <div className="stat-card red">  <div className="stat-card-icon"><FontAwesomeIcon icon={faExclamationTriangle}/></div><div className="stat-value">{fmtMoney(overdueAmt)}</div><div className="stat-label">Overdue</div></div>
      </div>

      <div className="filter-bar">
        <div className="tabs" style={{marginBottom:0}}>
          {['all','pending','paid','overdue'].map(t=>(
            <button key={t} className={`tab${tab===t?' active':''}`} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>
          ))}
        </div>
        <span style={{marginLeft:'auto',fontSize:12,color:'var(--text2)'}}>{list.length} record{list.length!==1?'s':''}</span>
        <button className="btn btn-secondary btn-sm" onClick={()=>setExpModal(true)}><FontAwesomeIcon icon={faDownload}/> Export</button>
        <button className="btn btn-secondary btn-sm" onClick={()=>setSmsModal(true)}><FontAwesomeIcon icon={faSms}/> Send SMS</button>
        <button className="btn btn-primary btn-sm"   onClick={()=>setModal(true)}><FontAwesomeIcon icon={faPlus}/> Add Fee</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead><tr><th>Student</th><th>Class</th><th>Fee Type</th><th>Amount</th><th>Due Date</th><th>Paid Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {list.map(f=>{
              const s=students.find(st=>st.id===f.student_id);
              return (
                <tr key={f.id}>
                  <td><div style={{display:'flex',alignItems:'center',gap:9}}><Avatar name={s?.name||'?'} size={28}/><span style={{fontWeight:600,fontSize:13}}>{s?.name||'Unknown'}</span></div></td>
                  <td><span className="badge badge-gray">{s?.class||'—'}</span></td>
                  <td>{f.fee_type}</td>
                  <td style={{fontWeight:700,color:'var(--accent)'}}>{fmtMoney(f.amount)}</td>
                  <td style={{fontSize:12.5}}>{fmtDate(f.due_date)}</td>
                  <td style={{fontSize:12,color:'var(--text2)'}}>{fmtDate(f.paid_date)}</td>
                  <td><span className={`badge badge-${f.status==='paid'?'green':f.status==='overdue'?'red':'yellow'}`}>{f.status}</span></td>
                  <td>{f.status!=='paid'&&<button className="btn btn-success btn-sm" onClick={()=>markPaid(f.id)}><FontAwesomeIcon icon={faCheck}/> Paid</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length===0&&<div className="empty-state"><div className="empty-state-icon"><FontAwesomeIcon icon={faMoneyBillWave}/></div><h3>No records</h3><p>All clear in this category.</p></div>}
      </div>

      {modal&&(
        <Modal title="Add Fee" icon={faMoneyBillWave} onClose={()=>setModal(false)} onSave={save}>
          <div className="form-group"><label>Student *</label>
            <select value={form.student_id} onChange={F('student_id')}>
              <option value="">Select student…</option>
              {students.map(s=><option key={s.id} value={s.id}>{s.name} — {s.class}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Fee Type</label><select value={form.fee_type} onChange={F('fee_type')}>{FEE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            <div className="form-group"><label>Amount ($) *</label><input type="number" min="0" value={form.amount} onChange={F('amount')}/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Due Date</label><input type="date" value={form.due_date} onChange={F('due_date')}/></div>
            <div className="form-group"><label>Status</label><select value={form.status} onChange={F('status')}><option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select></div>
          </div>
        </Modal>
      )}
      {smsModal&&<SmsModal onClose={()=>setSmsModal(false)} students={students} fees={fees}/>}
      {expModal&&<ExportModal onClose={()=>setExpModal(false)} dataLabel="Fee Records"/>}
    </div>
  );
}

// ─────────────────────────────────────────────
// ANNOUNCEMENTS
// ─────────────────────────────────────────────
const BLANK_ANN = { title:'',content:'',target_audience:'all',created_by:'Admin',priority:'normal' };

function Announcements({ user, announcements, onAdd, onDelete }) {
  const [modal, setModal] = useState(false);
  const [smsModal, setSmsModal] = useState(false);
  const [form, setForm]   = useState({...BLANK_ANN,created_by:user.name});
  const F = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const save = ()=>{
    if(!form.title||!form.content) return alert('Fill required fields');
    onAdd({...form,created_at:new Date().toISOString()});
    setModal(false);
    setForm({...BLANK_ANN,created_by:user.name});
  };

  return (
    <div className="animate-in">
      <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginBottom:20}}>
        <button className="btn btn-secondary" onClick={()=>setSmsModal(true)}><FontAwesomeIcon icon={faSms}/> Send SMS</button>
        <button className="btn btn-primary"   onClick={()=>setModal(true)}><FontAwesomeIcon icon={faPlus}/> New Announcement</button>
      </div>

      {[...announcements].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map(a=>(
        <div key={a.id} className={`announcement-card ${a.priority}`}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div style={{flex:1}}>
              <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center',flexWrap:'wrap'}}>
                <span className={`badge badge-${a.priority==='high'?'red':a.priority==='low'?'gray':'blue'}`}><FontAwesomeIcon icon={faExclamationTriangle}/> {a.priority}</span>
                <span className="badge badge-gray"><FontAwesomeIcon icon={faUsers}/> {a.target_audience}</span>
              </div>
              <h4>{a.title}</h4>
              <p>{a.content}</p>
              <div className="announcement-meta">
                <span><FontAwesomeIcon icon={faUser} style={{marginRight:5}}/>{a.created_by}</span>
                <span><FontAwesomeIcon icon={faClock} style={{marginRight:5}}/>{fmtDate(a.created_at)}</span>
              </div>
            </div>
            <button className="btn btn-danger btn-sm" style={{marginLeft:12}} onClick={()=>onDelete(a.id)}><FontAwesomeIcon icon={faTrash}/></button>
          </div>
        </div>
      ))}

      {announcements.length===0&&<div className="empty-state"><div className="empty-state-icon"><FontAwesomeIcon icon={faBullhorn}/></div><h3>No announcements</h3><p>Create one to notify your school community.</p></div>}

      {modal&&(
        <Modal title="New Announcement" icon={faBullhorn} onClose={()=>setModal(false)} onSave={save}>
          <div className="form-group"><label>Title *</label><input value={form.title} onChange={F('title')} placeholder="Announcement title…"/></div>
          <div className="form-group"><label>Content *</label><textarea value={form.content} onChange={F('content')} rows={4} placeholder="Write your message here…"/></div>
          <div className="form-row">
            <div className="form-group"><label>Target Audience</label>
              <select value={form.target_audience} onChange={F('target_audience')}>
                <option value="all">Everyone</option>
                <option value="students">Students</option>
                <option value="teachers">Teachers</option>
                <option value="parents">Parents</option>
              </select>
            </div>
            <div className="form-group"><label>Priority</label>
              <select value={form.priority} onChange={F('priority')}>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label>Posted By</label><input value={form.created_by} onChange={F('created_by')}/></div>
        </Modal>
      )}
      {smsModal&&<SmsModal onClose={()=>setSmsModal(false)} students={[]} fees={[]}/>}
    </div>
  );
}

// ─────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────
const SCHEMA_SQL=`CREATE TABLE students (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  name TEXT, email TEXT UNIQUE,\n  grade TEXT, class TEXT,\n  dob DATE, phone TEXT, address TEXT,\n  guardian_name TEXT, guardian_phone TEXT,\n  enrolled_at DATE DEFAULT CURRENT_DATE,\n  status TEXT DEFAULT 'active',\n  created_at TIMESTAMPTZ DEFAULT now()\n);\n\nCREATE TABLE teachers (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  name TEXT, email TEXT UNIQUE,\n  subject TEXT, phone TEXT, qualification TEXT,\n  experience_years INT DEFAULT 0,\n  status TEXT DEFAULT 'active',\n  class TEXT, created_at TIMESTAMPTZ DEFAULT now()\n);\n\nCREATE TABLE attendance (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  student_id UUID REFERENCES students(id),\n  date DATE, status TEXT, class TEXT,\n  created_at TIMESTAMPTZ DEFAULT now(),\n  UNIQUE(student_id, date)\n);\n\nCREATE TABLE grades (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  student_id UUID REFERENCES students(id),\n  subject TEXT, assignment TEXT,\n  score NUMERIC, max_score NUMERIC DEFAULT 100,\n  term TEXT, date DATE DEFAULT CURRENT_DATE,\n  class TEXT, created_at TIMESTAMPTZ DEFAULT now()\n);\n\nCREATE TABLE announcements (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  title TEXT, content TEXT,\n  target_audience TEXT DEFAULT 'all',\n  created_by TEXT, priority TEXT DEFAULT 'normal',\n  created_at TIMESTAMPTZ DEFAULT now()\n);\n\nCREATE TABLE fees (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  student_id UUID REFERENCES students(id),\n  amount NUMERIC, fee_type TEXT,\n  due_date DATE, paid_date DATE,\n  status TEXT DEFAULT 'pending',\n  created_at TIMESTAMPTZ DEFAULT now()\n);`;

function Settings() {
  const toast = useToast();
  return (
    <div className="animate-in">
      <div className="grid-2" style={{marginBottom:20}}>
        <div className="card">
          <div className="card-header"><span className="card-title"><FontAwesomeIcon icon={faCog}/> Supabase Configuration</span></div>
          <div className="alert alert-warning"><FontAwesomeIcon icon={faExclamationTriangle}/><span>Never commit real credentials. Use <code>.env</code> locally, env vars on Vercel.</span></div>
          <div style={{background:'var(--bg)',borderRadius:8,padding:16,fontFamily:'monospace',fontSize:12.5,lineHeight:2,border:'1px solid var(--border)',color:'var(--text2)'}}>
            <div style={{opacity:0.5}}># .env (gitignored)</div>
            <div><span style={{color:'var(--blue)'}}>REACT_APP_SUPABASE_URL</span>=https://xxxx.supabase.co</div>
            <div><span style={{color:'var(--blue)'}}>REACT_APP_SUPABASE_ANON_KEY</span>=eyJhbGci...</div>
          </div>
          <div style={{marginTop:16,fontSize:13,color:'var(--text2)',lineHeight:2}}>
            <strong style={{color:'var(--text)'}}>Steps to connect:</strong><br/>
            1. Create project at <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{color:'var(--accent)'}}>supabase.com</a><br/>
            2. Settings → API → copy URL &amp; anon key<br/>
            3. Add to <code>.env</code> and redeploy
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title"><FontAwesomeIcon icon={faDatabase}/> Database Schema</span></div>
          <p style={{fontSize:13,color:'var(--text2)',marginBottom:12,lineHeight:1.7}}>Run in your Supabase SQL Editor to create all tables.</p>
          <div className="schema-box">{SCHEMA_SQL}</div>
          <button className="btn btn-secondary btn-sm" style={{marginTop:12}} onClick={()=>{navigator.clipboard.writeText(SCHEMA_SQL);toast('SQL copied!','success');}}>
            <FontAwesomeIcon icon={faCog}/> Copy SQL
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title"><FontAwesomeIcon icon={faInfoCircle}/> System Info</span></div>
        <div className="info-grid">
          {[{l:'System',v:'EduManage Pro'},{l:'Version',v:'2.0.0'},{l:'Database',v:'Supabase (PostgreSQL)'},{l:'Supabase SDK',v:'v2.47.2'},{l:'React',v:'18.3.1'},{l:'Font Awesome',v:'6.7.2'},{l:'Hosting',v:'Vercel'},{l:'Mode',v:IS_DEMO?'Demo (mock data)':'Live (Supabase)'}].map(i=>(
            <div key={i.l} className="info-tile"><div className="info-tile-label">{i.l}</div><div className="info-tile-value">{i.v}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// NAV CONFIG
// ─────────────────────────────────────────────
const NAV_ADMIN   = [
  { id:'dashboard',     label:'Dashboard',    icon:faHome },
  { id:'students',      label:'Students',     icon:faGraduationCap },
  { id:'teachers',      label:'Teachers',     icon:faChalkboardTeacher },
  { id:'attendance',    label:'Attendance',   icon:faCalendarCheck },
  { id:'grades',        label:'Grades',       icon:faChartBar },
  { id:'fees',          label:'Fees',         icon:faMoneyBillWave },
  { id:'announcements', label:'Announcements',icon:faBullhorn },
  { id:'settings',      label:'Settings',     icon:faCog },
];

const NAV_TEACHER = [
  { id:'dashboard',     label:'Dashboard',    icon:faHome },
  { id:'attendance',    label:'Attendance',   icon:faCalendarCheck },
  { id:'grades',        label:'Grades',       icon:faChartBar },
  { id:'announcements', label:'Announcements',icon:faBullhorn },
];

const PAGE_TITLE = {
  dashboard:'Dashboard', students:'Student Management', teachers:'Teacher Management',
  attendance:'Attendance Tracking', grades:'Grades & Assessments', fees:'Fee Management',
  announcements:'Announcements', settings:'Settings & Setup',
};

// ─────────────────────────────────────────────
// MAIN APP SHELL
// ─────────────────────────────────────────────
function AppShell({ user, onLogout }) {
  const { theme, toggleTheme } = useTheme();
  const [page, setPage] = useState('dashboard');

  const stu = useTable('students',      MOCK.students);
  const tch = useTable('teachers',      MOCK.teachers);
  const att = useTable('attendance',    MOCK.attendance);
  const grd = useTable('grades',        MOCK.grades);
  const fee = useTable('fees',          MOCK.fees);
  const ann = useTable('announcements', MOCK.announcements);

  const nav = user.role==='admin' ? NAV_ADMIN : NAV_TEACHER;
  const dateStr = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});

  return (
    <div className="app" data-theme={theme}>
      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><FontAwesomeIcon icon={faSchool}/></div>
          <div className="sidebar-logo-text">
            <h1>EduManage</h1>
            <p>Pro</p>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Menu</div>
          {nav.map(item=>(
            <button key={item.id} className={`nav-item${page===item.id?' active':''}`} onClick={()=>setPage(item.id)}>
              <span className="nav-icon"><FontAwesomeIcon icon={item.icon}/></span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-card" title="Click to logout" onClick={onLogout}>
            <Avatar name={user.name} size={34}/>
            <div className="user-card-info">
              <p>{user.name.split(' ').slice(0,2).join(' ')}</p>
              <span>{user.email}</span>
            </div>
            <div className="user-role-badge">{user.role==='admin'?'Admin':'Teacher'}</div>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="main">
        <div className="topbar">
          <div className="topbar-left">
            <h2>{PAGE_TITLE[page]}</h2>
            <p><FontAwesomeIcon icon={faClock} style={{marginRight:5}}/>{dateStr}</p>
          </div>
          <div className="topbar-right">
            <button className="topbar-btn" onClick={toggleTheme} title="Toggle theme">
              <FontAwesomeIcon icon={theme==='dark'?faSun:faMoon}/>
            </button>
            <button className="topbar-btn" title="Notifications">
              <FontAwesomeIcon icon={faBell}/>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onLogout}>
              <FontAwesomeIcon icon={faSignOutAlt}/> Sign Out
            </button>
          </div>
        </div>

        <div className="content">
          {page==='dashboard'     && <Dashboard     user={user} students={stu.data} teachers={tch.data} attendance={att.data} grades={grd.data} fees={fee.data} announcements={ann.data}/>}
          {page==='students'      && <Students      students={stu.data} onAdd={stu.add} onEdit={stu.update} onDelete={stu.remove}/>}
          {page==='teachers'      && <Teachers      teachers={tch.data} onAdd={tch.add} onEdit={tch.update} onDelete={tch.remove}/>}
          {page==='attendance'    && <Attendance    user={user} students={stu.data} attendance={att.data} onRecord={att.upsertAtt}/>}
          {page==='grades'        && <Grades        user={user} students={stu.data} grades={grd.data} onAdd={grd.add}/>}
          {page==='fees'          && <Fees          students={stu.data} fees={fee.data} onAdd={fee.add} onUpdate={fee.update}/>}
          {page==='announcements' && <Announcements user={user} announcements={ann.data} onAdd={ann.add} onDelete={ann.remove}/>}
          {page==='settings'      && <Settings/>}
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────


export default function App() {
  const [theme,   setTheme] = useState(() => localStorage.getItem('theme')||'dark');
  const [page,    setPage]  = useState('welcome');
  const [user,    setUser]  = useState(null);

  const toggleTheme = () => setTheme(t=>{const n=t==='dark'?'light':'dark'; localStorage.setItem('theme',n); return n;});

  const handleLogin  = (u) => { setUser(u); setPage('app'); };
  const handleLogout = ()  => { setUser(null); setPage('welcome'); };

  return (
    <ThemeCtx.Provider value={{theme,toggleTheme}}>
      <ToastProvider>
        {page==='welcome'  && <WelcomePage  onLogin={()=>setPage('login')} onRegister={()=>setPage('register')}/>}
        {page==='login'    && <LoginPage    onLogin={handleLogin} onRegister={()=>setPage('register')} onBack={()=>setPage('welcome')}/>}
        {page==='register' && <RegisterPage onBack={()=>setPage('login')}/>}
        {page==='app' && user && <AppShell user={user} onLogout={handleLogout}/>}
      </ToastProvider>
    </ThemeCtx.Provider>
  );
}
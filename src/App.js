import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGraduationCap, faChalkboardTeacher, faCalendarCheck, faChartBar,
  faMoneyBillWave, faBullhorn, faCog, faHome, faSignOutAlt, faBars, faTimes,
  faSearch, faPlus, faEdit, faTrash, faDownload, faFileExcel, faFilePdf,
  faFileCsv, faSms, faCheck, faUserShield, faUserTie, faUsers, faBookOpen,
  faChartLine, faCheckCircle, faTimesCircle, faClock, faExclamationTriangle,
  faInfoCircle, faPhone, faPrint, faLock, faUser, faEyeSlash, faEye,
  faArrowRight, faArrowLeft, faStar, faRocket, faShieldAlt, faDatabase,
  faEnvelope, faBell
} from '@fortawesome/free-solid-svg-icons';
import './App.css';

// ─── SUPABASE ───────────────────────────────
const SUPABASE_URL      = process.env.REACT_APP_SUPABASE_URL      || '';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

console.log('Raw env vars:', {
  REACT_APP_SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
  REACT_APP_SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY ? 'defined' : 'undefined'
});
console.log('Processed vars:', {
  SUPABASE_URL,
  SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? 'defined' : 'undefined'
});

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const IS_DEMO = !supabase;

// ─── CONTEXT ────────────────────────────────
const ToastCtx = createContext(() => {});
const useToast = () => useContext(ToastCtx);

// ─── GHANA CURRICULUM ───────────────────────
const SCHOOL_LEVELS = [
  { label: 'Nursery', classes: ['Nursery 1', 'Nursery 2'] },
  { label: 'KG',      classes: ['KG 1', 'KG 2'] },
  { label: 'Primary', classes: ['Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6'] },
  { label: 'JHS',     classes: ['JHS 1', 'JHS 2', 'JHS 3'] },
];
const ALL_CLASSES = SCHOOL_LEVELS.flatMap(l => l.classes);

const SUBJECTS_BY_LEVEL = {
  Nursery: ['Phonics & Reading','Numbers & Counting','Arts & Crafts','Rhymes & Songs','Play & Social Skills'],
  KG:      ['English Language','Mathematics','Our World & Our People','Creative Arts','Physical Education','Ghanaian Language'],
  Primary: ['English Language','Mathematics','Science','Our World & Our People','Creative Arts & Design','Ghanaian Language & Culture','Religious & Moral Education','Computing / ICT','Physical Education'],
  JHS:     ['English Language','Mathematics','Integrated Science','Social Studies','Ghanaian Language','French','Religious & Moral Education','Computing / ICT','Career Technology','Creative Arts & Design','Physical Education'],
};
const ALL_SUBJECTS = [...new Set(Object.values(SUBJECTS_BY_LEVEL).flat())];
const FEE_TYPES = ['Tuition','Canteen','PTA Levy','Examination Fee','Sports Fee','Library Fee','Uniform'];

const getLevelForClass = cls => {
  for (const lvl of SCHOOL_LEVELS) if (lvl.classes.includes(cls)) return lvl.label;
  return 'Primary';
};
const getSubjectsForClass = cls => SUBJECTS_BY_LEVEL[getLevelForClass(cls)] || SUBJECTS_BY_LEVEL.Primary;

// ─── HELPERS ────────────────────────────────
const uid        = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const fmtDate    = d  => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtMoney   = n  => `GH₵ ${Number(n).toLocaleString('en-GH',{minimumFractionDigits:2})}`;
const initials   = n  => n ? n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : 'NA';
const dateToday  = () => new Date().toISOString().split('T')[0];
const letterGrade= (s,m)=>{ const p=(s/m)*100; if(p>=80)return'A';if(p>=70)return'B';if(p>=60)return'C';if(p>=50)return'D';return'F'; };

// ─── MOCK DATA ───────────────────────────────
const MOCK = {
  users: [
    {id:'u1',name:'Mr. Kwame Asante',  email:'admin@school.edu',  password:'admin123',  role:'admin',  subject:null,             class:null,       phone:'0244-000001'},
    {id:'u2',name:'Mrs. Abena Mensah', email:'abena@school.edu',  password:'teacher123',role:'teacher',subject:'Mathematics',     class:'Primary 5',phone:'0244-000002'},
    {id:'u3',name:'Mr. Kofi Boateng',  email:'kofi@school.edu',   password:'teacher123',role:'teacher',subject:'English Language',class:'JHS 2',    phone:'0244-000003'},
  ],
  students: [
    {id:'s1', name:'Ama Owusu',       email:'ama@sch.edu',   class:'Primary 5',dob:'2014-03-15',guardian_name:'Mr. Owusu',   guardian_phone:'0244-201',status:'active'},
    {id:'s2', name:'Kweku Mensah',    email:'kweku@sch.edu', class:'Primary 5',dob:'2014-07-22',guardian_name:'Mrs. Mensah', guardian_phone:'0244-202',status:'active'},
    {id:'s3', name:'Adjoa Agyeman',   email:'adjoa@sch.edu', class:'JHS 2',    dob:'2011-11-08',guardian_name:'Mr. Agyeman', guardian_phone:'0244-203',status:'active'},
    {id:'s4', name:'Yaw Darko',       email:'yaw@sch.edu',   class:'JHS 1',    dob:'2012-05-30',guardian_name:'Mrs. Darko',  guardian_phone:'0244-204',status:'active'},
    {id:'s5', name:'Akosua Frimpong', email:'akos@sch.edu',  class:'JHS 3',    dob:'2010-01-12',guardian_name:'Mr. Frimpong',guardian_phone:'0244-205',status:'active'},
    {id:'s6', name:'Kofi Amoah',      email:'kof2@sch.edu',  class:'Primary 3',dob:'2016-09-03',guardian_name:'Mrs. Amoah',  guardian_phone:'0244-206',status:'inactive'},
    {id:'s7', name:'Abena Asare',     email:'aben@sch.edu',  class:'KG 2',     dob:'2019-02-18',guardian_name:'Mr. Asare',   guardian_phone:'0244-207',status:'active'},
    {id:'s8', name:'Yaa Boateng',     email:'yaa@sch.edu',   class:'Nursery 1',dob:'2021-11-05',guardian_name:'Mrs. Boateng',guardian_phone:'0244-208',status:'active'},
    {id:'s9', name:'Kwame Appiah',    email:'kwa@sch.edu',   class:'Primary 1',dob:'2018-04-20',guardian_name:'Mr. Appiah',  guardian_phone:'0244-209',status:'active'},
    {id:'s10',name:'Efua Quansah',    email:'efu@sch.edu',   class:'JHS 2',    dob:'2011-08-14',guardian_name:'Mrs. Quansah',guardian_phone:'0244-210',status:'active'},
  ],
  teachers: [
    {id:'t1',name:'Mrs. Abena Mensah',email:'abena@school.edu', subject:'Mathematics',       phone:'0244-000002',qualification:'BSc Mathematics Education',experience_years:8, status:'active',class:'Primary 5'},
    {id:'t2',name:'Mr. Kofi Boateng', email:'kofi@school.edu',  subject:'English Language',  phone:'0244-000003',qualification:'BA English & Linguistics',  experience_years:12,status:'active',class:'JHS 2'},
    {id:'t3',name:'Ms. Akua Amponsah',email:'akua@school.edu',  subject:'Integrated Science',phone:'0244-000004',qualification:'BSc Science Education',     experience_years:5, status:'active',class:'JHS 1'},
    {id:'t4',name:'Mr. Yaw Asante',   email:'yaw.t@school.edu', subject:'Social Studies',    phone:'0244-000005',qualification:'BA Social Studies',          experience_years:10,status:'active',class:'JHS 3'},
    {id:'t5',name:'Mrs. Ama Boadu',   email:'ama.t@school.edu', subject:'Ghanaian Language', phone:'0244-000006',qualification:'Diploma in Education',       experience_years:7, status:'active',class:'Primary 3'},
    {id:'t6',name:'Mr. Kweku Darko',  email:'kweku.t@school.edu',subject:'Computing / ICT',  phone:'0244-000007',qualification:'BSc Information Technology',experience_years:4, status:'active',class:'KG 2'},
  ],
  attendance: [
    {id:'a1',student_id:'s1', date:'2026-02-17',status:'present',class:'Primary 5'},
    {id:'a2',student_id:'s2', date:'2026-02-17',status:'present',class:'Primary 5'},
    {id:'a3',student_id:'s3', date:'2026-02-17',status:'absent', class:'JHS 2'},
    {id:'a4',student_id:'s4', date:'2026-02-17',status:'late',   class:'JHS 1'},
    {id:'a5',student_id:'s5', date:'2026-02-17',status:'present',class:'JHS 3'},
    {id:'a6',student_id:'s7', date:'2026-02-17',status:'excused',class:'KG 2'},
    {id:'a7',student_id:'s10',date:'2026-02-17',status:'present',class:'JHS 2'},
  ],
  grades: [
    {id:'g1',student_id:'s1', subject:'Mathematics',       assignment:'Mid-Term Exam',  score:75,max_score:100,term:'Term 1 2026',date:'2026-02-10',class:'Primary 5'},
    {id:'g2',student_id:'s2', subject:'Mathematics',       assignment:'Mid-Term Exam',  score:62,max_score:100,term:'Term 1 2026',date:'2026-02-10',class:'Primary 5'},
    {id:'g3',student_id:'s3', subject:'English Language',  assignment:'Essay Writing',  score:88,max_score:100,term:'Term 1 2026',date:'2026-02-08',class:'JHS 2'},
    {id:'g4',student_id:'s4', subject:'Integrated Science',assignment:'Practical Test', score:55,max_score:100,term:'Term 1 2026',date:'2026-02-05',class:'JHS 1'},
    {id:'g5',student_id:'s5', subject:'Social Studies',    assignment:'Class Test',     score:92,max_score:100,term:'Term 1 2026',date:'2026-02-10',class:'JHS 3'},
    {id:'g6',student_id:'s10',subject:'English Language',  assignment:'Essay Writing',  score:79,max_score:100,term:'Term 1 2026',date:'2026-02-08',class:'JHS 2'},
  ],
  announcements: [
    {id:'an1',title:'End of Term Examination Timetable',content:'Mid-term examination timetable released. Students collect copies from class teachers. Exams begin Monday, 2nd March 2026.',    created_by:'Headmaster',priority:'high',  created_at:'2026-02-15T09:00:00Z',target_audience:'all'},
    {id:'an2',title:'PTA Meeting — 7th March 2026',     content:'All parents invited to quarterly PTA meeting on Saturday 7th March at 9:00 AM in the school hall. Attendance compulsory.',  created_by:'Headmaster',priority:'high',  created_at:'2026-02-14T10:00:00Z',target_audience:'parents'},
    {id:'an3',title:'School Fees Deadline',             content:'Outstanding fees (tuition and canteen) must be paid by 28th February. Students with unpaid fees may not sit mid-term exams.',created_by:'Bursar',    priority:'high',  created_at:'2026-02-13T11:00:00Z',target_audience:'all'},
    {id:'an4',title:'Independence Day Celebration',     content:"Special cultural programme on 6th March for Ghana's 69th Independence Day. Students should wear national colours.",         created_by:'Admin',     priority:'normal',created_at:'2026-02-12T08:00:00Z',target_audience:'all'},
  ],
  fees: [
    {id:'f1',student_id:'s1', amount:850, fee_type:'Tuition',due_date:'2026-03-01',paid_date:null,          status:'pending',term:'Term 1 2026'},
    {id:'f2',student_id:'s1', amount:120, fee_type:'Canteen',due_date:'2026-03-01',paid_date:'2026-02-01', status:'paid',   term:'Term 1 2026'},
    {id:'f3',student_id:'s2', amount:850, fee_type:'Tuition',due_date:'2026-03-01',paid_date:'2026-02-05', status:'paid',   term:'Term 1 2026'},
    {id:'f4',student_id:'s3', amount:950, fee_type:'Tuition',due_date:'2026-01-15',paid_date:null,          status:'overdue',term:'Term 1 2026'},
    {id:'f5',student_id:'s4', amount:950, fee_type:'Tuition',due_date:'2026-03-01',paid_date:'2026-02-10', status:'paid',   term:'Term 1 2026'},
    {id:'f6',student_id:'s5', amount:950, fee_type:'Tuition',due_date:'2026-02-28',paid_date:null,          status:'pending',term:'Term 1 2026'},
    {id:'f7',student_id:'s7', amount:450, fee_type:'Tuition',due_date:'2026-03-01',paid_date:null,          status:'pending',term:'Term 1 2026'},
    {id:'f8',student_id:'s10',amount:120, fee_type:'Canteen',due_date:'2026-01-31',paid_date:null,          status:'overdue',term:'Term 1 2026'},
    {id:'f9',student_id:'s9', amount:600, fee_type:'Tuition',due_date:'2026-03-01',paid_date:null,          status:'pending',term:'Term 1 2026'},
  ],
};

// ─── DATA HOOK ──────────────────────────────
function useTable(table, mockData) {
  const [data, setData] = useState(mockData);
  const toast = useToast();
  useEffect(() => {
    if (IS_DEMO) return;
    supabase.from(table).select('*').order('created_at',{ascending:false})
      .then(({data:rows,error}) => { if (!error && rows) setData(rows); });
  }, [table]);
  const add = useCallback(async row => {
    if (IS_DEMO) { setData(p=>[...p,{...row,id:uid(),created_at:new Date().toISOString()}]); toast('Added','success'); return; }
    const {data:ins,error} = await supabase.from(table).insert(row).select();
    if (error) { toast(error.message,'error'); return; }
    setData(p=>[...p,...ins]); toast('Added','success');
  },[table,toast]);
  const update = useCallback(async (id,changes) => {
    if (IS_DEMO) { setData(p=>p.map(r=>r.id===id?{...r,...changes}:r)); toast('Updated','success'); return; }
    const {data:upd,error} = await supabase.from(table).update(changes).eq('id',id).select();
    if (error) { toast(error.message,'error'); return; }
    setData(p=>p.map(r=>r.id===id?upd[0]:r)); toast('Updated','success');
  },[table,toast]);
  const remove = useCallback(async id => {
    if (IS_DEMO) { setData(p=>p.filter(r=>r.id!==id)); toast('Deleted','info'); return; }
    const {error} = await supabase.from(table).delete().eq('id',id);
    if (error) { toast(error.message,'error'); return; }
    setData(p=>p.filter(r=>r.id!==id)); toast('Deleted','info');
  },[table,toast]);
  const upsertAtt = useCallback(async (student_id,date,status,cls) => {
    setData(p => {
      const i = p.findIndex(a=>a.student_id===student_id&&a.date===date);
      if (i>=0) { const n=[...p]; n[i]={...n[i],status}; return n; }
      return [...p,{id:uid(),student_id,date,status,class:cls}];
    });
    if (!IS_DEMO) await supabase.from('attendance').upsert({student_id,date,status,class:cls},{onConflict:'student_id,date'});
  },[]);
  return {data, add, update, remove, upsertAtt};
}

// ─── TOAST PROVIDER ─────────────────────────
function ToastProvider({children}) {
  const [toasts,setToasts] = useState([]);
  const addToast = useCallback((msg,type='info') => {
    const id=uid(); setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500);
  },[]);
  const icons={success:faCheckCircle,error:faTimesCircle,info:faInfoCircle};
  return (
    <ToastCtx.Provider value={addToast}>
      {children}
      <div className="toast-wrap">
        {toasts.map(t=>(
          <div key={t.id} className={`toast ${t.type}`}>
            <FontAwesomeIcon icon={icons[t.type]||faInfoCircle}/>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ─── AVATAR ─────────────────────────────────
function Avatar({name,size=36}) {
  return <div className="avatar" style={{width:size,height:size,fontSize:size*0.34}}>{initials(name)}</div>;
}

// ─── SCHOOL LOGO ────────────────────────────
function SchoolLogo({size=44,style={}}) {
  const [err,setErr] = useState(false);
  if (err) return (
    <div style={{width:size,height:size,borderRadius:'50%',background:'linear-gradient(135deg,#22803f,#f4a300)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.46,flexShrink:0,...style}}>
      🏫
    </div>
  );
  return <img src="/logo.png" alt="School Logo" style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0,...style}} onError={()=>setErr(true)}/>;
}

// ─── MODAL ──────────────────────────────────
function Modal({title,icon,onClose,onSave,children,lg}) {
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={`modal${lg?' modal-lg':''}`}>
        <div className="modal-hd">
          <span className="modal-title">{icon&&<FontAwesomeIcon icon={icon}/>}{title}</span>
          <button className="modal-close" onClick={onClose}><FontAwesomeIcon icon={faTimes}/></button>
        </div>
        {children}
        {onSave&&(
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary"   onClick={onSave}><FontAwesomeIcon icon={faCheck}/> Save</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EXPORT MODAL ───────────────────────────
function ExportModal({onClose,dataLabel}) {
  const toast=useToast();
  const exp=fmt=>{toast(`${dataLabel} exported as ${fmt}`,'success');onClose();};
  return (
    <Modal title="Export Data" icon={faDownload} onClose={onClose}>
      <p style={{fontSize:13,color:'var(--gray500)',marginBottom:14}}>Export <strong>{dataLabel}</strong> as:</p>
      <div className="export-options">
        <button className="export-opt" onClick={()=>exp('Excel')}><FontAwesomeIcon icon={faFileExcel} style={{color:'#1d6f42',fontSize:22}}/><span>Excel (.xlsx)</span><small>Full spreadsheet</small></button>
        <button className="export-opt" onClick={()=>exp('PDF')}>  <FontAwesomeIcon icon={faFilePdf}   style={{color:'#e53e3e',fontSize:22}}/><span>PDF Report</span>  <small>Formatted report</small></button>
        <button className="export-opt" onClick={()=>exp('CSV')}>  <FontAwesomeIcon icon={faFileCsv}   style={{color:'#2e7d32',fontSize:22}}/><span>CSV</span>          <small>Raw data</small></button>
        <button className="export-opt" onClick={()=>exp('Print')}><FontAwesomeIcon icon={faPrint}     style={{color:'var(--blue)',fontSize:22}}/><span>Print</span>      <small>Print view</small></button>
      </div>
    </Modal>
  );
}

// ─── SMS MODAL ──────────────────────────────
function SmsModal({onClose,students,fees}) {
  const toast=useToast();
  const [type,setType]=useState('reminder');
  const [target,setTarget]=useState('overdue');
  const [preview,setPreview]=useState('');
  useEffect(()=>{
    const s=students[0]||{}; const f=fees.find(x=>x.student_id===s.id)||fees[0]||{};
    const tpls={
      reminder:`Dear ${s.guardian_name||'Parent/Guardian'}, your ward ${s.name||''}'s ${f.fee_type||'school'} fee of ${fmtMoney(f.amount||0)} was due on ${fmtDate(f.due_date)}. Please pay promptly. — School Admin`,
      receipt: `Dear ${s.guardian_name||'Parent/Guardian'}, payment of ${fmtMoney(f.amount||0)} for ${s.name||'your ward'} (${f.fee_type||'fees'}) received. Thank you. — School Admin`,
      absent:  `Dear ${s.guardian_name||'Parent/Guardian'}, your ward ${s.name||''} was absent today (${fmtDate(dateToday())}). Please contact the class teacher. — School Admin`,
    };
    setPreview(tpls[type]);
  },[type,students,fees]);
  const send=()=>{
    const count=target==='overdue'?fees.filter(f=>f.status==='overdue').length:students.filter(s=>s.status==='active').length;
    toast(`SMS sent to ${count} recipient(s) ✓`,'success'); onClose();
  };
  return (
    <Modal title="Send SMS Notification" icon={faSms} onClose={onClose} onSave={send}>
      <div className="form-group"><label>Message Type</label>
        <select value={type} onChange={e=>setType(e.target.value)}>
          <option value="reminder">Fee Reminder</option>
          <option value="receipt">Payment Receipt</option>
          <option value="absent">Absence Alert</option>
        </select>
      </div>
      <div className="form-group"><label>Send To</label>
        <select value={target} onChange={e=>setTarget(e.target.value)}>
          <option value="overdue">Parents with Overdue Fees</option>
          <option value="pending">Parents with Pending Fees</option>
          <option value="all">All Active Students' Parents</option>
        </select>
      </div>
      <div className="sms-preview">{preview}</div>
      <div className="alert alert-info" style={{marginTop:12}}>
        <FontAwesomeIcon icon={faInfoCircle}/>
        <span>Connect a Ghana SMS gateway (Hubtel, Wigal) in Settings to enable live sending.</span>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════
// WELCOME PAGE
// ═══════════════════════════════════════════
const FEATURES = [
  {icon:faGraduationCap, title:'Student Records',  desc:'Complete profiles from Nursery to JHS 3 with enrollment management.'},
  {icon:faCalendarCheck, title:'Daily Attendance',  desc:'Track attendance for all classes and send SMS alerts to parents.'},
  {icon:faChartBar,      title:'Grades & Reports',  desc:'Record assessments, auto-calculate grades and export term reports.'},
  {icon:faMoneyBillWave, title:'Fees in GH₵',       desc:'Track tuition, canteen and other fees with SMS payment receipts.'},
  {icon:faBullhorn,      title:'Announcements',     desc:'Broadcast notices to students, teachers and parents instantly.'},
  {icon:faShieldAlt,     title:'Role-Based Access', desc:'Administrators control all; teachers access only their own class.'},
];

function WelcomePage({onLogin,onRegister}) {
  return (
    <div className="welcome-page">
      {/* NAV */}
      <nav className="welcome-nav">
        <div className="welcome-nav-brand">
          <SchoolLogo size={42} style={{border:'2px solid rgba(255,255,255,.4)',background:'#fff'}}/>
          <div className="welcome-nav-brand-text">
            <h1>EduManage Pro</h1>
            <p>Ghana School Management</p>
          </div>
        </div>
        <div className="welcome-nav-actions">
          <button className="btn btn-outline-w btn-sm" onClick={onLogin}>Sign In</button>
          <button className="btn btn-gold btn-sm" onClick={onRegister}>
            <FontAwesomeIcon icon={faRocket}/> Get Started
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div className="welcome-hero">
        <div className="welcome-hero-inner">
          <div className="welcome-hero-text anim-up">
            <div className="welcome-hero-eyebrow">
              <FontAwesomeIcon icon={faStar}/> Ghana School Management System
            </div>
            <h1>Manage Your School<br/><span>The Smart Way</span></h1>
            <p>From Nursery to JHS 3 — track attendance, record grades, manage fees in Ghana Cedis, and communicate with parents via SMS.</p>
            <div className="welcome-hero-ctas">
              <button className="btn btn-gold btn-lg" onClick={onLogin}>
                <FontAwesomeIcon icon={faArrowRight}/> Sign In to Dashboard
              </button>
              <button className="btn btn-outline-w btn-lg" onClick={onRegister}>
                <FontAwesomeIcon icon={faPlus}/> Create Account
              </button>
            </div>
          </div>

          {/* Photo grid — replace img src with real school photos */}
          <div className="welcome-photo-grid">
            <div className="welcome-photo-cell">
              {/* Slot 1: tall left cell — ideal for a teacher + class photo */}
              <img src="/photos/school1.jpg" alt="School kids" onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}}/>
              <div className="welcome-photo-placeholder" style={{display:'none'}}>
                <span className="ph-emoji">👩‍🏫</span>
                <span className="ph-label">Quality Teaching</span>
              </div>
            </div>
            <div className="welcome-photo-cell">
              {/* Slot 2: top-right */}
              <img src="/photos/school2.jpg" alt="Students learning" onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}}/>
              <div className="welcome-photo-placeholder" style={{display:'none'}}>
                <span className="ph-emoji">📚</span>
                <span className="ph-label">Ghana Curriculum</span>
              </div>
            </div>
            <div className="welcome-photo-cell">
              {/* Slot 3: bottom-right */}
              <img src="/photos/school3.jpg" alt="School activities" onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}}/>
              <div className="welcome-photo-placeholder" style={{display:'none'}}>
                <span className="ph-emoji">🎓</span>
                <span className="ph-label">Academic Excellence</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="welcome-stats-bar">
        {[
          {icon:faGraduationCap,   value:'500+',   label:'Students Enrolled'},
          {icon:faChalkboardTeacher,value:'30+',    label:'Qualified Teachers'},
          {icon:faBookOpen,        value:'Nur–JHS', label:'All Levels Covered'},
          {icon:faChartLine,       value:'99%',     label:'Attendance Tracked'},
        ].map(s=>(
          <div key={s.label} className="welcome-stat-item">
            <div className="welcome-stat-icon"><FontAwesomeIcon icon={s.icon}/></div>
            <h3>{s.value}</h3>
            <p>{s.label}</p>
          </div>
        ))}
      </div>

      {/* FEATURES */}
      <div className="welcome-features-section">
        <div className="welcome-section-title">
          <h2>Everything Your School Needs</h2>
          <p>One platform for administration, teachers and parents</p>
        </div>
        <div className="welcome-features-grid">
          {FEATURES.map(f=>(
            <div key={f.title} className="welcome-feature-card">
              <div className="welcome-feature-icon"><FontAwesomeIcon icon={f.icon}/></div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="welcome-footer">
        &copy; 2026 <strong>EduManage Pro</strong> — Built for Ghanaian Schools &nbsp;|&nbsp; Nursery · KG · Primary · JHS
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════
function LoginPage({onLogin,onRegister,onBack}) {
  const toast=useToast();
  const [role,setRole]=useState('admin');
  const [email,setEmail]=useState('admin@school.edu');
  const [pass,setPass]=useState('admin123');
  const [show,setShow]=useState(false);
  const [busy,setBusy]=useState(false);

  const prefill=r=>{
    setRole(r);
    setEmail(r==='admin'?'admin@school.edu':'abena@school.edu');
    setPass(r==='admin'?'admin123':'teacher123');
  };

  const handleLogin=async()=>{
    setBusy(true);
    await new Promise(r=>setTimeout(r,600));
    const user=MOCK.users.find(u=>u.email===email&&u.password===pass&&u.role===role);
    if(user){toast(`Welcome, ${user.name.split(' ').pop()}!`,'success');onLogin(user);}
    else toast('Invalid credentials or role selection','error');
    setBusy(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-sidebar">
        <div className="auth-sidebar-inner">
          <div className="auth-logo-wrap">
            <SchoolLogo size={88} style={{border:'4px solid rgba(255,255,255,.3)',background:'#fff',boxShadow:'0 8px 24px rgba(0,0,0,.3)'}}/>
            <h2>EduManage Pro</h2>
            <p>School Management System</p>
          </div>
          <div className="auth-sidebar-features">
            {['Nursery to JHS 3 coverage','Ghana curriculum subjects','SMS alerts to parents','Fees tracked in GH₵','Role-based access control'].map(t=>(
              <div key={t} className="auth-sidebar-feature"><FontAwesomeIcon icon={faCheckCircle}/><span>{t}</span></div>
            ))}
          </div>
          <div className="auth-sidebar-quote">
            "Education is the most powerful weapon which you can use to change the world." — Nelson Mandela
          </div>
        </div>
      </div>

      <div className="auth-main">
        <div className="auth-box anim-up">
          <div style={{marginBottom:8}}>
            <button className="btn btn-ghost btn-sm" onClick={onBack}><FontAwesomeIcon icon={faArrowLeft}/> Back</button>
          </div>
          <div className="auth-box-hd">
            <h2>Sign In</h2>
            <p>Select your role and enter your credentials</p>
          </div>

          <div className="role-grid">
            <div className={`role-card${role==='admin'?' active':''}`} onClick={()=>prefill('admin')}>
              <span className="rc-icon"><FontAwesomeIcon icon={faUserShield} style={{color:role==='admin'?'var(--g700)':'var(--gray400)'}}/></span>
              <span>Administrator</span><small>Full access</small>
            </div>
            <div className={`role-card${role==='teacher'?' active':''}`} onClick={()=>prefill('teacher')}>
              <span className="rc-icon"><FontAwesomeIcon icon={faUserTie} style={{color:role==='teacher'?'var(--g700)':'var(--gray400)'}}/></span>
              <span>Teacher</span><small>Class access</small>
            </div>
          </div>

          <div className="auth-divider">enter credentials</div>

          <div className="form-group">
            <label>Email Address</label>
            <div className="input-wrap">
              <FontAwesomeIcon icon={faEnvelope} className="input-icon"/>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@school.edu"/>
            </div>
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="input-wrap" style={{position:'relative'}}>
              <FontAwesomeIcon icon={faLock} className="input-icon"/>
              <input type={show?'text':'password'} value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••"/>
              <button className="pw-toggle" onClick={()=>setShow(s=>!s)}><FontAwesomeIcon icon={show?faEyeSlash:faEye}/></button>
            </div>
          </div>

          <div className="alert alert-success" style={{fontSize:12}}>
            <FontAwesomeIcon icon={faInfoCircle}/>
            <div><strong>Demo:</strong> Admin — admin@school.edu / admin123 &nbsp;|&nbsp; Teacher — abena@school.edu / teacher123</div>
          </div>

          <button className="btn btn-primary btn-block btn-lg" onClick={handleLogin} disabled={busy}>
            {busy?'Signing in…':<><FontAwesomeIcon icon={faArrowRight}/> Sign In</>}
          </button>
          <div className="auth-footer-note">Don't have an account? <button onClick={onRegister}>Register here</button></div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// REGISTER PAGE
// ═══════════════════════════════════════════
function RegisterPage({onBack}) {
  const toast=useToast();
  const [form,setForm]=useState({name:'',email:'',phone:'',role:'teacher',subject:'',class:'',password:'',confirm:''});
  const [show,setShow]=useState(false);
  const [busy,setBusy]=useState(false);
  const F=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const classSubs=form.class?getSubjectsForClass(form.class):ALL_SUBJECTS;

  const submit=async()=>{
    if(!form.name||!form.email||!form.password) return toast('Fill all required fields','error');
    if(form.password!==form.confirm) return toast('Passwords do not match','error');
    if(form.password.length<6) return toast('Password must be at least 6 characters','error');
    setBusy(true); await new Promise(r=>setTimeout(r,800));
    toast('Account created! You can now sign in.','success'); setBusy(false); onBack();
  };

  return (
    <div className="auth-page">
      <div className="auth-sidebar">
        <div className="auth-sidebar-inner">
          <div className="auth-logo-wrap">
            <SchoolLogo size={88} style={{border:'4px solid rgba(255,255,255,.3)',background:'#fff',boxShadow:'0 8px 24px rgba(0,0,0,.3)'}}/>
            <h2>EduManage Pro</h2>
            <p>Create Your Account</p>
          </div>
          <div className="auth-sidebar-features">
            {['Quick 2-minute setup','Choose your role & class','Auto subject assignment','Start tracking immediately'].map(t=>(
              <div key={t} className="auth-sidebar-feature"><FontAwesomeIcon icon={faCheckCircle}/><span>{t}</span></div>
            ))}
          </div>
        </div>
      </div>
      <div className="auth-main">
        <div className="auth-box anim-up">
          <div style={{marginBottom:8}}><button className="btn btn-ghost btn-sm" onClick={onBack}><FontAwesomeIcon icon={faArrowLeft}/> Back to Login</button></div>
          <div className="auth-box-hd"><h2>Create Account</h2><p>Fill in your details to get started</p></div>

          <div className="role-grid">
            <div className={`role-card${form.role==='admin'?' active':''}`} onClick={()=>setForm(p=>({...p,role:'admin'}))}>
              <span className="rc-icon"><FontAwesomeIcon icon={faUserShield} style={{color:form.role==='admin'?'var(--g700)':'var(--gray400)'}}/></span>
              <span>Administrator</span><small>School admin</small>
            </div>
            <div className={`role-card${form.role==='teacher'?' active':''}`} onClick={()=>setForm(p=>({...p,role:'teacher'}))}>
              <span className="rc-icon"><FontAwesomeIcon icon={faUserTie} style={{color:form.role==='teacher'?'var(--g700)':'var(--gray400)'}}/></span>
              <span>Teacher</span><small>Class teacher</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group"><label>Full Name *</label><div className="input-wrap"><FontAwesomeIcon icon={faUser} className="input-icon"/><input value={form.name} onChange={F('name')} placeholder="Mr. Kwame Asante"/></div></div>
            <div className="form-group"><label>Email *</label><div className="input-wrap"><FontAwesomeIcon icon={faEnvelope} className="input-icon"/><input type="email" value={form.email} onChange={F('email')} placeholder="you@school.edu"/></div></div>
          </div>
          <div className="form-group"><label>Phone</label><div className="input-wrap"><FontAwesomeIcon icon={faPhone} className="input-icon"/><input value={form.phone} onChange={F('phone')} placeholder="0244-000000"/></div></div>

          {form.role==='teacher'&&(
            <div className="form-row">
              <div className="form-group">
                <label>Assigned Class</label>
                <select value={form.class} onChange={F('class')}>
                  <option value="">Select class…</option>
                  {SCHOOL_LEVELS.map(lvl=>(
                    <optgroup key={lvl.label} label={`── ${lvl.label} ──`}>
                      {lvl.classes.map(c=><option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Subject</label>
                <select value={form.subject} onChange={F('subject')}>
                  <option value="">Select…</option>
                  {classSubs.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Password *</label>
              <div className="input-wrap" style={{position:'relative'}}>
                <FontAwesomeIcon icon={faLock} className="input-icon"/>
                <input type={show?'text':'password'} value={form.password} onChange={F('password')} placeholder="Min 6 characters"/>
                <button className="pw-toggle" onClick={()=>setShow(s=>!s)}><FontAwesomeIcon icon={show?faEyeSlash:faEye}/></button>
              </div>
            </div>
            <div className="form-group"><label>Confirm Password *</label><div className="input-wrap"><FontAwesomeIcon icon={faLock} className="input-icon"/><input type="password" value={form.confirm} onChange={F('confirm')} placeholder="Repeat password"/></div></div>
          </div>

          <button className="btn btn-primary btn-block btn-lg" onClick={submit} disabled={busy}>
            {busy?'Creating…':<><FontAwesomeIcon icon={faCheck}/> Create Account</>}
          </button>
          <div className="auth-footer-note">Already have an account? <button onClick={onBack}>Sign in</button></div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════
function Dashboard({user,students,teachers,attendance,grades,fees,announcements}) {
  const active   =students.filter(s=>s.status==='active').length;
  const today    =dateToday();
  const todayAtt =attendance.filter(a=>a.date===today);
  const present  =todayAtt.filter(a=>a.status==='present').length;
  const avgScore =grades.length?Math.round(grades.reduce((s,g)=>s+(g.score/g.max_score)*100,0)/grades.length):0;
  const collected=fees.filter(f=>f.status==='paid').reduce((s,f)=>s+Number(f.amount),0);
  const totalFees=fees.reduce((s,f)=>s+Number(f.amount),0);
  const overdue  =fees.filter(f=>f.status==='overdue').length;
  const attRate  =todayAtt.length?Math.round((present/todayAtt.length)*100):0;

  const attStats=['present','absent','late','excused'].map(st=>({
    label:st[0].toUpperCase()+st.slice(1),
    count:attendance.filter(a=>a.status===st).length,
    color:{present:'var(--g600)',absent:'var(--red)',late:'var(--gold)',excused:'var(--blue)'}[st],
  }));
  const maxAtt=Math.max(...attStats.map(a=>a.count),1);

  return (
    <div className="anim-up">
      {IS_DEMO&&(
        <div className="alert alert-info">
          <FontAwesomeIcon icon={faInfoCircle}/>
          <span><strong>Demo mode</strong> — Set <code>REACT_APP_SUPABASE_URL</code> + <code>REACT_APP_SUPABASE_ANON_KEY</code> in <code>.env</code> for live data.</span>
        </div>
      )}
      <div className="stats-grid">
        {user.role==='admin'&&<>
          <div className="stat-card green"><div className="stat-card-icon"><FontAwesomeIcon icon={faGraduationCap}/></div><div className="stat-value">{active}</div><div className="stat-label">Active Students</div><div className="stat-change up">{students.length} total enrolled</div></div>
          <div className="stat-card blue"> <div className="stat-card-icon"><FontAwesomeIcon icon={faChalkboardTeacher}/></div><div className="stat-value">{teachers.length}</div><div className="stat-label">Teachers</div><div className="stat-change">{teachers.filter(t=>t.status==='active').length} active</div></div>
        </>}
        <div className="stat-card green"><div className="stat-card-icon"><FontAwesomeIcon icon={faCalendarCheck}/></div><div className="stat-value">{attRate}%</div><div className="stat-label">Today's Attendance</div><div className="stat-change">{present}/{todayAtt.length} present</div></div>
        <div className="stat-card purple"><div className="stat-card-icon"><FontAwesomeIcon icon={faChartLine}/></div><div className="stat-value">{avgScore}%</div><div className="stat-label">Average Grade</div><div className="stat-change">{grades.length} assessments</div></div>
        {user.role==='admin'&&<>
          <div className="stat-card gold">
            <div className="stat-card-icon"><FontAwesomeIcon icon={faMoneyBillWave}/></div>
            <div className="stat-value" style={{fontSize:18}}>{fmtMoney(collected)}</div>
            <div className="stat-label">Fees Collected</div>
            <div className="stat-change">{totalFees?Math.round((collected/totalFees)*100):0}% of {fmtMoney(totalFees)}</div>
            <div className="progress-bar"><div className="progress-fill" style={{width:`${totalFees?(collected/totalFees)*100:0}%`,background:'var(--g500)'}}/></div>
          </div>
          <div className="stat-card red"><div className="stat-card-icon"><FontAwesomeIcon icon={faExclamationTriangle}/></div><div className="stat-value">{overdue}</div><div className="stat-label">Overdue Fees</div><div className="stat-change down">Needs attention</div></div>
        </>}
        {user.role==='teacher'&&(
          <div className="stat-card gold"><div className="stat-card-icon"><FontAwesomeIcon icon={faBookOpen}/></div><div className="stat-value" style={{fontSize:16}}>{user.class}</div><div className="stat-label">My Class</div><div className="stat-change">{students.filter(s=>s.class===user.class&&s.status==='active').length} students</div></div>
        )}
      </div>

      <div className="grid-2" style={{marginBottom:20}}>
        <div className="card">
          <div className="card-header"><span className="card-title"><FontAwesomeIcon icon={faChartBar}/> Attendance Overview</span></div>
          <div className="chart-bars">
            {attStats.map(a=>(
              <div key={a.label} className="chart-bar-col">
                <div className="chart-bar-val">{a.count}</div>
                <div className="chart-bar" style={{height:`${(a.count/maxAtt)*90}%`,background:a.color}}/>
                <div className="chart-bar-lbl">{a.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title"><FontAwesomeIcon icon={faBullhorn}/> Latest Notices</span></div>
          {announcements.slice(0,3).map(a=>(
            <div key={a.id} style={{padding:'8px 0',borderBottom:'1px solid var(--gray100)'}}>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
                <span className={`badge badge-${a.priority==='high'?'red':'blue'}`}>{a.priority}</span>
                <span style={{fontSize:13,fontWeight:700}}>{a.title}</span>
              </div>
              <p style={{fontSize:12,color:'var(--gray500)'}}>{a.content.substring(0,80)}…</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title"><FontAwesomeIcon icon={faChartBar}/> Recent Grades</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Class</th><th>Subject</th><th>Score</th><th>Grade</th><th>Date</th></tr></thead>
            <tbody>
              {grades.slice(0,6).map(g=>{
                const s=students.find(st=>st.id===g.student_id);
                const l=letterGrade(g.score,g.max_score);
                return(
                  <tr key={g.id}>
                    <td><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={s?.name||'?'} size={28}/><span style={{fontWeight:700}}>{s?.name||'Unknown'}</span></div></td>
                    <td><span className="badge badge-green">{g.class}</span></td>
                    <td style={{fontSize:12,color:'var(--gray500)'}}>{g.subject}</td>
                    <td style={{fontWeight:700}}>{g.score}/{g.max_score}</td>
                    <td><span className={`grade-pill grade-${l}`}>{l}</span></td>
                    <td style={{fontSize:12,color:'var(--gray400)'}}>{fmtDate(g.date)}</td>
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

// ═══════════════════════════════════════════
// STUDENTS
// ═══════════════════════════════════════════
const BLANK_STU={name:'',email:'',class:'Primary 1',dob:'',phone:'',guardian_name:'',guardian_phone:'',address:'',status:'active'};

function Students({students,onAdd,onEdit,onDelete}) {
  const [search,setSearch]=useState('');
  const [fLvl,setFLvl]=useState('');
  const [fCls,setFCls]=useState('');
  const [fSts,setFSts]=useState('');
  const [modal,setModal]=useState(false);
  const [expModal,setExpModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState(BLANK_STU);
  const F=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const lvlClasses=fLvl?(SCHOOL_LEVELS.find(l=>l.label===fLvl)?.classes||[]):ALL_CLASSES;
  const filtered=students.filter(s=>{
    const q=search.toLowerCase();
    return(!search||s.name.toLowerCase().includes(q)||(s.email||'').toLowerCase().includes(q))
      &&(!fCls||s.class===fCls)&&(!fLvl||getLevelForClass(s.class)===fLvl)&&(!fSts||s.status===fSts);
  });

  const openAdd =()=>{setEditing(null);setForm(BLANK_STU);setModal(true);};
  const openEdit=s=>{setEditing(s.id);setForm({...s});setModal(true);};
  const save    =()=>{editing?onEdit(editing,form):onAdd(form);setModal(false);};
  const del     =id=>{if(window.confirm('Delete this student?'))onDelete(id);};

  return (
    <div className="anim-up">
      <div className="filter-bar">
        <div className="search-wrap"><FontAwesomeIcon icon={faSearch} className="search-icon"/><input placeholder="Search students…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <select className="filter-sel" value={fLvl} onChange={e=>{setFLvl(e.target.value);setFCls('');}}>
          <option value="">All Levels</option>
          {SCHOOL_LEVELS.map(l=><option key={l.label} value={l.label}>{l.label}</option>)}
        </select>
        <select className="filter-sel" value={fCls} onChange={e=>setFCls(e.target.value)}>
          <option value="">All Classes</option>
          {lvlClasses.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select className="filter-sel" value={fSts} onChange={e=>setFSts(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span style={{marginLeft:'auto',fontSize:12,color:'var(--gray500)',fontWeight:600}}>{filtered.length} students</span>
        <button className="btn btn-secondary btn-sm" onClick={()=>setExpModal(true)}><FontAwesomeIcon icon={faDownload}/> Export</button>
        <button className="btn btn-primary btn-sm"   onClick={openAdd}><FontAwesomeIcon icon={faPlus}/> Add Student</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Class</th><th>Level</th><th>Guardian</th><th>Guardian Phone</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(s=>(
              <tr key={s.id}>
                <td><div style={{display:'flex',alignItems:'center',gap:9}}><Avatar name={s.name} size={32}/><div><div style={{fontWeight:700}}>{s.name}</div><div style={{fontSize:11,color:'var(--gray400)'}}>{s.email}</div></div></div></td>
                <td><span className="badge badge-green">{s.class}</span></td>
                <td><span className="badge badge-gray">{getLevelForClass(s.class)}</span></td>
                <td style={{fontSize:13}}>{s.guardian_name||'—'}</td>
                <td style={{fontSize:12,color:'var(--gray500)'}}>{s.guardian_phone||'—'}</td>
                <td><span className={`badge badge-${s.status==='active'?'green':'gray'}`}>{s.status}</span></td>
                <td><div style={{display:'flex',gap:5}}>
                  <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(s)}><FontAwesomeIcon icon={faEdit}/></button>
                  <button className="btn btn-danger btn-sm"    onClick={()=>del(s.id)}><FontAwesomeIcon icon={faTrash}/></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length&&<div className="empty-state"><div className="empty-state-icon"><FontAwesomeIcon icon={faUsers}/></div><h3>No students found</h3><p>Adjust filters or add a new student.</p></div>}
      </div>

      {modal&&(
        <Modal title={editing?'Edit Student':'Add Student'} icon={faGraduationCap} onClose={()=>setModal(false)} onSave={save}>
          <div className="form-row">
            <div className="form-group"><label>Full Name *</label><input value={form.name} onChange={F('name')} placeholder="Ama Owusu"/></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={F('email')} placeholder="ama@school.edu"/></div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Class *</label>
              <select value={form.class} onChange={e=>setForm(p=>({...p,class:e.target.value}))}>
                {SCHOOL_LEVELS.map(lvl=>(
                  <optgroup key={lvl.label} label={`── ${lvl.label} ──`}>
                    {lvl.classes.map(c=><option key={c} value={c}>{c}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="form-group"><label>Date of Birth</label><input type="date" value={form.dob} onChange={F('dob')}/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Guardian Name</label><input value={form.guardian_name} onChange={F('guardian_name')}/></div>
            <div className="form-group"><label>Guardian Phone</label><input value={form.guardian_phone} onChange={F('guardian_phone')} placeholder="0244-000000"/></div>
          </div>
          <div className="form-group"><label>Home Address</label><input value={form.address} onChange={F('address')}/></div>
          <div className="form-group"><label>Status</label><select value={form.status} onChange={F('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        </Modal>
      )}
      {expModal&&<ExportModal onClose={()=>setExpModal(false)} dataLabel="Students List"/>}
    </div>
  );
}

// ═══════════════════════════════════════════
// TEACHERS
// ═══════════════════════════════════════════
const BLANK_TCH={name:'',email:'',subject:'',phone:'',qualification:'',experience_years:0,status:'active',class:''};

function Teachers({teachers,onAdd,onEdit,onDelete}) {
  const [search,setSearch]=useState('');
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState(BLANK_TCH);
  const F=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const classSubs=form.class?getSubjectsForClass(form.class):ALL_SUBJECTS;
  const filtered=teachers.filter(t=>!search||t.name.toLowerCase().includes(search.toLowerCase())||t.subject.toLowerCase().includes(search.toLowerCase()));

  const openAdd =()=>{setEditing(null);setForm(BLANK_TCH);setModal(true);};
  const openEdit=t=>{setEditing(t.id);setForm({...t});setModal(true);};
  const save    =()=>{editing?onEdit(editing,form):onAdd(form);setModal(false);};
  const del     =id=>{if(window.confirm('Remove this teacher?'))onDelete(id);};

  return (
    <div className="anim-up">
      <div className="filter-bar">
        <div className="search-wrap"><FontAwesomeIcon icon={faSearch} className="search-icon"/><input placeholder="Search teachers…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <span style={{marginLeft:'auto',fontSize:12,color:'var(--gray500)',fontWeight:600}}>{filtered.length} teachers</span>
        <button className="btn btn-primary btn-sm" onClick={openAdd}><FontAwesomeIcon icon={faPlus}/> Add Teacher</button>
      </div>
      <div className="teacher-grid">
        {filtered.map(t=>(
          <div key={t.id} className="card">
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
              <Avatar name={t.name} size={46}/>
              <div><div style={{fontWeight:700,fontSize:14.5}}>{t.name}</div><div style={{fontSize:11.5,color:'var(--gray500)'}}>{t.email}</div></div>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
              <span className="badge badge-green"><FontAwesomeIcon icon={faBookOpen}/> {t.subject}</span>
              {t.class&&<span className="badge badge-gold">{t.class}</span>}
              <span className={`badge badge-${t.status==='active'?'green':'gray'}`}>{t.status}</span>
            </div>
            <div style={{fontSize:12.5,color:'var(--gray500)',lineHeight:2}}>
              <div><FontAwesomeIcon icon={faGraduationCap} style={{marginRight:7,color:'var(--g600)'}}/>{t.qualification||'—'}</div>
              <div><FontAwesomeIcon icon={faClock}         style={{marginRight:7,color:'var(--g600)'}}/>{t.experience_years} yrs experience</div>
              <div><FontAwesomeIcon icon={faPhone}         style={{marginRight:7,color:'var(--g600)'}}/>{t.phone||'—'}</div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button className="btn btn-secondary btn-sm" style={{flex:1}} onClick={()=>openEdit(t)}><FontAwesomeIcon icon={faEdit}/> Edit</button>
              <button className="btn btn-danger btn-sm" onClick={()=>del(t.id)}><FontAwesomeIcon icon={faTrash}/></button>
            </div>
          </div>
        ))}
      </div>
      {!filtered.length&&<div className="empty-state"><div className="empty-state-icon"><FontAwesomeIcon icon={faChalkboardTeacher}/></div><h3>No teachers</h3><p>Add a teacher to get started.</p></div>}

      {modal&&(
        <Modal title={editing?'Edit Teacher':'Add Teacher'} icon={faChalkboardTeacher} onClose={()=>setModal(false)} onSave={save}>
          <div className="form-row">
            <div className="form-group"><label>Full Name *</label><input value={form.name} onChange={F('name')}/></div>
            <div className="form-group"><label>Email *</label><input type="email" value={form.email} onChange={F('email')}/></div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Assigned Class</label>
              <select value={form.class} onChange={F('class')}>
                <option value="">None</option>
                {SCHOOL_LEVELS.map(lvl=>(
                  <optgroup key={lvl.label} label={`── ${lvl.label} ──`}>
                    {lvl.classes.map(c=><option key={c} value={c}>{c}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Subject</label>
              <select value={form.subject} onChange={F('subject')}>
                <option value="">Select…</option>
                {classSubs.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Phone</label><input value={form.phone} onChange={F('phone')} placeholder="0244-000000"/></div>
            <div className="form-group"><label>Qualification</label><input value={form.qualification} onChange={F('qualification')}/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Yrs Experience</label><input type="number" min="0" value={form.experience_years} onChange={F('experience_years')}/></div>
            <div className="form-group"><label>Status</label><select value={form.status} onChange={F('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// ATTENDANCE
// ═══════════════════════════════════════════
function Attendance({user,students,attendance,onRecord}) {
  const [date,setDate]=useState(dateToday());
  const [fLvl,setFLvl]=useState('');
  const [fCls,setFCls]=useState(user.role==='teacher'?user.class||'':'');
  const [local,setLocal]=useState({});
  const [smsModal,setSmsModal]=useState(false);
  const [expModal,setExpModal]=useState(false);

  useEffect(()=>{
    const map={};
    attendance.filter(a=>a.date===date).forEach(a=>{map[a.student_id]=a.status;});
    setLocal(map);
  },[date,attendance]);

  const mark   =(id,st)=>setLocal(p=>({...p,[id]:st}));
  const saveAll=()=>{
    Object.entries(local).forEach(([sid,st])=>{
      const stu=students.find(s=>s.id===sid);
      onRecord(sid,date,st,stu?.class||'');
    });
    alert('Attendance saved successfully!');
  };

  const lvlClasses=fLvl?(SCHOOL_LEVELS.find(l=>l.label===fLvl)?.classes||[]):ALL_CLASSES;
  const shown=students.filter(s=>{
    if(s.status!=='active') return false;
    if(user.role==='teacher') return s.class===user.class;
    if(fCls) return s.class===fCls;
    if(fLvl) return getLevelForClass(s.class)===fLvl;
    return true;
  });

  const counts=['present','absent','late','excused'].reduce((a,st)=>({...a,[st]:Object.values(local).filter(v=>v===st).length}),{});
  const colors={present:'var(--g600)',absent:'var(--red)',late:'var(--gold)',excused:'var(--blue)'};

  return (
    <div className="anim-up">
      <div className="filter-bar">
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{width:'auto',minWidth:140}}/>
        {user.role==='admin'&&<>
          <select className="filter-sel" value={fLvl} onChange={e=>{setFLvl(e.target.value);setFCls('');}}>
            <option value="">All Levels</option>
            {SCHOOL_LEVELS.map(l=><option key={l.label} value={l.label}>{l.label}</option>)}
          </select>
          <select className="filter-sel" value={fCls} onChange={e=>setFCls(e.target.value)}>
            <option value="">All Classes</option>
            {lvlClasses.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </>}
        <div style={{display:'flex',gap:14,padding:'0 4px'}}>
          {Object.entries(counts).map(([st,c])=>(
            <div key={st} style={{textAlign:'center'}}>
              <div style={{fontSize:17,fontWeight:800,color:colors[st]}}>{c}</div>
              <div style={{fontSize:9.5,color:'var(--gray400)',textTransform:'capitalize',fontWeight:700}}>{st}</div>
            </div>
          ))}
        </div>
        <span style={{marginLeft:'auto',fontSize:12,color:'var(--gray500)',fontWeight:600}}>{shown.length} students</span>
        <button className="btn btn-secondary btn-sm" onClick={()=>setExpModal(true)}><FontAwesomeIcon icon={faDownload}/></button>
        <button className="btn btn-secondary btn-sm" onClick={()=>setSmsModal(true)}><FontAwesomeIcon icon={faSms}/> SMS</button>
        <button className="btn btn-primary btn-sm"   onClick={saveAll}><FontAwesomeIcon icon={faCheck}/> Save</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Student</th><th>Class</th><th>Level</th><th>Mark Attendance</th><th>Status</th></tr></thead>
          <tbody>
            {shown.map(s=>(
              <tr key={s.id}>
                <td><div style={{display:'flex',alignItems:'center',gap:9}}><Avatar name={s.name} size={30}/><span style={{fontWeight:700}}>{s.name}</span></div></td>
                <td><span className="badge badge-green">{s.class}</span></td>
                <td><span className="badge badge-gray">{getLevelForClass(s.class)}</span></td>
                <td>
                  <div className="att-btns">
                    {['present','absent','late','excused'].map(st=>(
                      <button key={st} className={`att-btn ${st}${local[s.id]===st?' active':''}`} onClick={()=>mark(s.id,st)}>
                        {st[0].toUpperCase()+st.slice(1)}
                      </button>
                    ))}
                  </div>
                </td>
                <td>{local[s.id]&&<span className={`badge badge-${local[s.id]==='present'?'green':local[s.id]==='absent'?'red':local[s.id]==='late'?'yellow':'blue'}`}>{local[s.id]}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length&&<div className="empty-state"><div className="empty-state-icon"><FontAwesomeIcon icon={faCalendarCheck}/></div><h3>No students</h3><p>Select a class or level to begin.</p></div>}
      </div>

      {smsModal&&<SmsModal onClose={()=>setSmsModal(false)} students={students} fees={[]}/>}
      {expModal &&<ExportModal onClose={()=>setExpModal(false)} dataLabel="Attendance Register"/>}
    </div>
  );
}

// ═══════════════════════════════════════════
// GRADES
// ═══════════════════════════════════════════
const BLANK_GRD={student_id:'',subject:'',assignment:'',score:'',max_score:100,term:'Term 1 2026',date:dateToday(),class:''};

function Grades({user,students,grades,onAdd}) {
  const [modal,setModal]=useState(false);
  const [expModal,setExpModal]=useState(false);
  const [fStu,setFStu]=useState('');
  const [fLvl,setFLvl]=useState('');
  const [fCls,setFCls]=useState(user.role==='teacher'?user.class||'':'');
  const [form,setForm]=useState({...BLANK_GRD,subject:user.subject||'',class:user.class||''});
  const F=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const lvlClasses=fLvl?(SCHOOL_LEVELS.find(l=>l.label===fLvl)?.classes||[]):ALL_CLASSES;
  const formSubs=form.class?getSubjectsForClass(form.class):ALL_SUBJECTS;
  const list=grades.filter(g=>(!fStu||g.student_id===fStu)&&(!fCls||g.class===fCls)&&(!fLvl||getLevelForClass(g.class)===fLvl));

  const save=()=>{
    if(!form.student_id||!form.subject||!form.score) return alert('Fill all required fields');
    const stu=students.find(s=>s.id===form.student_id);
    onAdd({...form,class:stu?.class||form.class});
    setModal(false);
    setForm({...BLANK_GRD,subject:user.subject||'',class:user.class||''});
  };

  return (
    <div className="anim-up">
      <div className="filter-bar">
        <select className="filter-sel" value={fStu} onChange={e=>setFStu(e.target.value)} style={{minWidth:160}}>
          <option value="">All Students</option>
          {students.map(s=><option key={s.id} value={s.id}>{s.name} ({s.class})</option>)}
        </select>
        {user.role==='admin'&&<>
          <select className="filter-sel" value={fLvl} onChange={e=>{setFLvl(e.target.value);setFCls('');}}>
            <option value="">All Levels</option>
            {SCHOOL_LEVELS.map(l=><option key={l.label} value={l.label}>{l.label}</option>)}
          </select>
          <select className="filter-sel" value={fCls} onChange={e=>setFCls(e.target.value)}>
            <option value="">All Classes</option>
            {lvlClasses.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </>}
        <span style={{marginLeft:'auto',fontSize:12,color:'var(--gray500)',fontWeight:600}}>{list.length} records</span>
        <button className="btn btn-secondary btn-sm" onClick={()=>setExpModal(true)}><FontAwesomeIcon icon={faDownload}/> Export</button>
        <button className="btn btn-primary btn-sm"   onClick={()=>setModal(true)}><FontAwesomeIcon icon={faPlus}/> Add Grade</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Student</th><th>Class</th><th>Subject</th><th>Assessment</th><th>Score</th><th>%</th><th>Grade</th><th>Term</th></tr></thead>
          <tbody>
            {list.map(g=>{
              const s=students.find(st=>st.id===g.student_id);
              const pct=Math.round((g.score/g.max_score)*100);
              const l=letterGrade(g.score,g.max_score);
              return(
                <tr key={g.id}>
                  <td><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={s?.name||'?'} size={28}/><span style={{fontWeight:700}}>{s?.name||'Unknown'}</span></div></td>
                  <td><span className="badge badge-green">{g.class}</span></td>
                  <td style={{fontSize:12,color:'var(--gray500)'}}>{g.subject}</td>
                  <td style={{fontSize:12,color:'var(--gray400)'}}>{g.assignment}</td>
                  <td style={{fontWeight:700}}>{g.score}/{g.max_score}</td>
                  <td><div style={{display:'flex',alignItems:'center',gap:6,minWidth:80}}>
                    <span style={{fontWeight:700,fontSize:12,minWidth:32}}>{pct}%</span>
                    <div className="progress-bar" style={{flex:1,margin:0}}><div className="progress-fill" style={{width:`${pct}%`,background:pct>=80?'var(--g500)':pct>=60?'var(--gold)':'var(--red)'}}/></div>
                  </div></td>
                  <td><span className={`grade-pill grade-${l}`}>{l}</span></td>
                  <td style={{fontSize:11,color:'var(--gray400)'}}>{g.term}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!list.length&&<div className="empty-state"><div className="empty-state-icon"><FontAwesomeIcon icon={faChartBar}/></div><h3>No grades found</h3><p>Add a grade or adjust filters.</p></div>}
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
            <div className="form-group">
              <label>Subject *</label>
              {user.role==='teacher'
                ?<input value={form.subject} readOnly style={{opacity:.7,cursor:'not-allowed'}}/>
                :<select value={form.subject} onChange={F('subject')}><option value="">Select…</option>{formSubs.map(s=><option key={s} value={s}>{s}</option>)}</select>}
            </div>
            <div className="form-group"><label>Assessment *</label><input value={form.assignment} onChange={F('assignment')} placeholder="Mid-Term Exam"/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Score *</label><input type="number" min="0" value={form.score} onChange={F('score')}/></div>
            <div className="form-group"><label>Total Marks</label><input type="number" min="1" value={form.max_score} onChange={F('max_score')}/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Term</label><input value={form.term} onChange={F('term')}/></div>
            <div className="form-group"><label>Date</label><input type="date" value={form.date} onChange={F('date')}/></div>
          </div>
          {form.score&&form.max_score&&(
            <div className="alert alert-success">
              <FontAwesomeIcon icon={faCheckCircle}/>
              <span>Grade: <strong>{letterGrade(Number(form.score),Number(form.max_score))}</strong> ({Math.round((form.score/form.max_score)*100)}%)</span>
            </div>
          )}
        </Modal>
      )}
      {expModal&&<ExportModal onClose={()=>setExpModal(false)} dataLabel="Grades Report"/>}
    </div>
  );
}

// ═══════════════════════════════════════════
// FEES
// ═══════════════════════════════════════════
const BLANK_FEE={student_id:'',amount:'',fee_type:'Tuition',due_date:'',status:'pending',term:'Term 1 2026'};

function Fees({students,fees,onAdd,onUpdate}) {
  const [tab,setTab]=useState('all');
  const [modal,setModal]=useState(false);
  const [smsModal,setSmsModal]=useState(false);
  const [expModal,setExpModal]=useState(false);
  const [fCls,setFCls]=useState('');
  const [form,setForm]=useState(BLANK_FEE);
  const F=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const list=fees.filter(f=>{
    const s=students.find(st=>st.id===f.student_id);
    return(tab==='all'||f.status===tab)&&(!fCls||s?.class===fCls);
  });

  const collected =fees.filter(f=>f.status==='paid').reduce((s,f)=>s+Number(f.amount),0);
  const pending   =fees.filter(f=>f.status==='pending').reduce((s,f)=>s+Number(f.amount),0);
  const overdueAmt=fees.filter(f=>f.status==='overdue').reduce((s,f)=>s+Number(f.amount),0);

  const save    =()=>{if(!form.student_id||!form.amount)return alert('Fill required fields');onAdd(form);setModal(false);setForm(BLANK_FEE);};
  const markPaid=id=>onUpdate(id,{status:'paid',paid_date:dateToday()});

  return (
    <div className="anim-up">
      <div className="stats-grid" style={{marginBottom:18}}>
        <div className="stat-card green"><div className="stat-card-icon"><FontAwesomeIcon icon={faCheckCircle}/></div><div className="stat-value" style={{fontSize:18}}>{fmtMoney(collected)}</div><div className="stat-label">Collected</div></div>
        <div className="stat-card gold"> <div className="stat-card-icon"><FontAwesomeIcon icon={faClock}/></div>           <div className="stat-value" style={{fontSize:18}}>{fmtMoney(pending)}</div>  <div className="stat-label">Pending</div></div>
        <div className="stat-card red">  <div className="stat-card-icon"><FontAwesomeIcon icon={faExclamationTriangle}/></div><div className="stat-value" style={{fontSize:18}}>{fmtMoney(overdueAmt)}</div><div className="stat-label">Overdue</div></div>
      </div>

      <div className="filter-bar">
        <div className="tabs" style={{border:'none',background:'none',padding:0}}>
          {['all','pending','paid','overdue'].map(t=>(
            <button key={t} className={`tab${tab===t?' active':''}`} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>
          ))}
        </div>
        <select className="filter-sel" value={fCls} onChange={e=>setFCls(e.target.value)}>
          <option value="">All Classes</option>
          {SCHOOL_LEVELS.map(lvl=>(
            <optgroup key={lvl.label} label={`── ${lvl.label} ──`}>
              {lvl.classes.map(c=><option key={c} value={c}>{c}</option>)}
            </optgroup>
          ))}
        </select>
        <span style={{marginLeft:'auto',fontSize:12,color:'var(--gray500)',fontWeight:600}}>{list.length} records</span>
        <button className="btn btn-secondary btn-sm" onClick={()=>setExpModal(true)}><FontAwesomeIcon icon={faDownload}/></button>
        <button className="btn btn-secondary btn-sm" onClick={()=>setSmsModal(true)}><FontAwesomeIcon icon={faSms}/> SMS</button>
        <button className="btn btn-primary btn-sm"   onClick={()=>setModal(true)}><FontAwesomeIcon icon={faPlus}/> Add Fee</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Student</th><th>Class</th><th>Fee Type</th><th>Amount (GH₵)</th><th>Due Date</th><th>Paid Date</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {list.map(f=>{
              const s=students.find(st=>st.id===f.student_id);
              return(
                <tr key={f.id}>
                  <td><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={s?.name||'?'} size={28}/><span style={{fontWeight:700}}>{s?.name||'Unknown'}</span></div></td>
                  <td><span className="badge badge-green">{s?.class||'—'}</span></td>
                  <td>{f.fee_type}</td>
                  <td style={{fontWeight:800,color:'var(--g800)'}}>{fmtMoney(f.amount)}</td>
                  <td style={{fontSize:12}}>{fmtDate(f.due_date)}</td>
                  <td style={{fontSize:12,color:'var(--gray400)'}}>{fmtDate(f.paid_date)}</td>
                  <td><span className={`badge badge-${f.status==='paid'?'green':f.status==='overdue'?'red':'yellow'}`}>{f.status}</span></td>
                  <td>{f.status!=='paid'&&<button className="btn btn-success btn-sm" onClick={()=>markPaid(f.id)}><FontAwesomeIcon icon={faCheck}/> Paid</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!list.length&&<div className="empty-state"><div className="empty-state-icon"><FontAwesomeIcon icon={faMoneyBillWave}/></div><h3>No fee records</h3><p>All clear in this category.</p></div>}
      </div>

      {modal&&(
        <Modal title="Add Fee Record" icon={faMoneyBillWave} onClose={()=>setModal(false)} onSave={save}>
          <div className="form-group">
            <label>Student *</label>
            <select value={form.student_id} onChange={F('student_id')}>
              <option value="">Select student…</option>
              {students.filter(s=>s.status==='active').map(s=><option key={s.id} value={s.id}>{s.name} — {s.class}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fee Type *</label>
              <select value={form.fee_type} onChange={F('fee_type')}>
                {FEE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Amount (GH₵) *</label><input type="number" min="0" value={form.amount} onChange={F('amount')} placeholder="0.00"/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Due Date</label><input type="date" value={form.due_date} onChange={F('due_date')}/></div>
            <div className="form-group"><label>Term</label><input value={form.term} onChange={F('term')}/></div>
          </div>
          <div className="form-group"><label>Status</label><select value={form.status} onChange={F('status')}><option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select></div>
        </Modal>
      )}
      {smsModal&&<SmsModal onClose={()=>setSmsModal(false)} students={students} fees={fees}/>}
      {expModal &&<ExportModal onClose={()=>setExpModal(false)} dataLabel="Fee Records"/>}
    </div>
  );
}

// ═══════════════════════════════════════════
// ANNOUNCEMENTS
// ═══════════════════════════════════════════
const BLANK_ANN={title:'',content:'',target_audience:'all',priority:'normal',created_by:''};

function Announcements({user,announcements,onAdd,onDelete}) {
  const [modal,setModal]=useState(false);
  const [smsModal,setSmsModal]=useState(false);
  const [form,setForm]=useState(BLANK_ANN);
  const F=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const save=()=>{
    if(!form.title||!form.content) return alert('Fill all required fields');
    onAdd({...form,created_by:user.name,created_at:new Date().toISOString()});
    setModal(false); setForm(BLANK_ANN);
  };
  const del=id=>{if(window.confirm('Delete this announcement?'))onDelete(id);};

  return (
    <div className="anim-up">
      <div className="filter-bar">
        <span style={{marginLeft:'auto',fontSize:12,color:'var(--gray500)',fontWeight:600}}>{announcements.length} notices</span>
        {user.role==='admin'&&<>
          <button className="btn btn-secondary btn-sm" onClick={()=>setSmsModal(true)}><FontAwesomeIcon icon={faSms}/> SMS Blast</button>
          <button className="btn btn-primary btn-sm"   onClick={()=>setModal(true)}><FontAwesomeIcon icon={faPlus}/> New Notice</button>
        </>}
      </div>

      {announcements.map(a=>(
        <div key={a.id} className={`ann-card ${a.priority}`}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8,gap:10}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <span className={`badge badge-${a.priority==='high'?'red':'blue'}`}>{a.priority}</span>
              <span className="badge badge-gray">{a.target_audience}</span>
              <h4 style={{margin:0}}>{a.title}</h4>
            </div>
            {user.role==='admin'&&<button className="btn btn-danger btn-sm" onClick={()=>del(a.id)}><FontAwesomeIcon icon={faTrash}/></button>}
          </div>
          <p>{a.content}</p>
          <div className="ann-meta">
            <span><FontAwesomeIcon icon={faUser} style={{marginRight:5}}/>{a.created_by}</span>
            <span><FontAwesomeIcon icon={faClock} style={{marginRight:5}}/>{fmtDate(a.created_at)}</span>
          </div>
        </div>
      ))}
      {!announcements.length&&<div className="empty-state"><div className="empty-state-icon"><FontAwesomeIcon icon={faBullhorn}/></div><h3>No announcements</h3><p>Post a notice to staff and students.</p></div>}

      {modal&&(
        <Modal title="New Announcement" icon={faBullhorn} onClose={()=>setModal(false)} onSave={save}>
          <div className="form-group"><label>Title *</label><input value={form.title} onChange={F('title')} placeholder="Announcement title"/></div>
          <div className="form-group"><label>Content *</label><textarea value={form.content} onChange={F('content')} placeholder="Write the announcement…" style={{minHeight:100}}/></div>
          <div className="form-row">
            <div className="form-group"><label>Audience</label><select value={form.target_audience} onChange={F('target_audience')}><option value="all">All</option><option value="students">Students</option><option value="parents">Parents</option><option value="teachers">Teachers</option></select></div>
            <div className="form-group"><label>Priority</label><select value={form.priority} onChange={F('priority')}><option value="normal">Normal</option><option value="high">High</option><option value="low">Low</option></select></div>
          </div>
        </Modal>
      )}
      {smsModal&&<SmsModal onClose={()=>setSmsModal(false)} students={[]} fees={[]}/>}
    </div>
  );
}

// ═══════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════
function Settings() {
  const toast=useToast();
  const schema=`-- SUPABASE SQL SCHEMA
CREATE TABLE students (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text,
  class text NOT NULL,
  dob date,
  guardian_name text,
  guardian_phone text,
  address text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE teachers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text,
  subject text,
  class text,
  phone text,
  qualification text,
  experience_years int DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE attendance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL,
  class text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, date)
);

CREATE TABLE grades (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  subject text NOT NULL,
  assignment text,
  score numeric NOT NULL,
  max_score numeric DEFAULT 100,
  term text,
  class text,
  date date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE fees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  fee_type text NOT NULL,
  due_date date,
  paid_date date,
  status text DEFAULT 'pending',
  term text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE announcements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text,
  target_audience text DEFAULT 'all',
  priority text DEFAULT 'normal',
  created_by text,
  created_at timestamptz DEFAULT now()
);`;

  return (
    <div className="anim-up">
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title"><FontAwesomeIcon icon={faDatabase}/> Supabase Connection</span></div>
          <div className="alert alert-info"><FontAwesomeIcon icon={faInfoCircle}/><span>Add these to your <code>.env</code> file to connect live data.</span></div>
          <div className="schema-box">{`REACT_APP_SUPABASE_URL=https://your-project.supabase.co\nREACT_APP_SUPABASE_ANON_KEY=your-anon-key`}</div>
          <div style={{marginTop:12,fontSize:13,color:'var(--gray500)'}}>
            <strong>Steps:</strong> Create project at supabase.com → Copy Project URL &amp; anon key → Add to .env → Restart server
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title"><FontAwesomeIcon icon={faDatabase}/> System Info</span></div>
          <div className="info-grid">
            {[
              ['System','EduManage Pro'],['Version','3.0.0'],['Database','Supabase PostgreSQL'],
              ['Mode',IS_DEMO?'Demo':'Live'],['Curriculum','Ghana GES'],['Levels','Nursery · KG · Primary · JHS'],
              ['SMS Gateway','Hubtel / Wigal'],['Hosting','Vercel'],
            ].map(([k,v])=>(
              <div key={k} className="info-tile"><div className="info-tile-label">{k}</div><div className="info-tile-value">{v}</div></div>
            ))}
          </div>
        </div>
      </div>
      <div className="card" style={{marginTop:18}}>
        <div className="card-header">
          <span className="card-title"><FontAwesomeIcon icon={faDatabase}/> Database Schema</span>
          <button className="btn btn-secondary btn-sm" onClick={()=>{navigator.clipboard.writeText(schema);toast('SQL copied!','success');}}>Copy SQL</button>
        </div>
        <div className="schema-box">{schema}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// APP SHELL — with fully working mobile sidebar
// ═══════════════════════════════════════════
const NAV_ADMIN  = [
  {id:'dashboard',    label:'Dashboard',    icon:faHome},
  {id:'students',     label:'Students',     icon:faGraduationCap},
  {id:'teachers',     label:'Teachers',     icon:faChalkboardTeacher},
  {id:'attendance',   label:'Attendance',   icon:faCalendarCheck},
  {id:'grades',       label:'Grades',       icon:faChartBar},
  {id:'fees',         label:'Fees',         icon:faMoneyBillWave},
  {id:'announcements',label:'Announcements',icon:faBullhorn},
  {id:'settings',     label:'Settings',     icon:faCog},
];
const NAV_TEACHER = [
  {id:'dashboard',    label:'Dashboard',    icon:faHome},
  {id:'attendance',   label:'Attendance',   icon:faCalendarCheck},
  {id:'grades',       label:'Grades',       icon:faChartBar},
  {id:'announcements',label:'Announcements',icon:faBullhorn},
];

function AppShell({user,onLogout}) {
  const [page,setPage]           = useState('dashboard');
  const [sidebarOpen,setSidebar] = useState(false);

  const stu = useTable('students',    MOCK.students);
  const tch = useTable('teachers',    MOCK.teachers);
  const att = useTable('attendance',  MOCK.attendance);
  const grd = useTable('grades',      MOCK.grades);
  const fee = useTable('fees',        MOCK.fees);
  const ann = useTable('announcements',MOCK.announcements);

  const navItems = user.role==='admin' ? NAV_ADMIN : NAV_TEACHER;
  const current  = navItems.find(n=>n.id===page)||navItems[0];

  const navigate = id => { setPage(id); setSidebar(false); };

  // Close sidebar on escape key
  useEffect(()=>{
    const h=e=>{ if(e.key==='Escape') setSidebar(false); };
    document.addEventListener('keydown',h);
    return ()=>document.removeEventListener('keydown',h);
  },[]);

  return (
    <div className="app">
      {/* Mobile overlay — clicking it closes sidebar */}
      <div className={`sidebar-overlay${sidebarOpen?' show':''}`} onClick={()=>setSidebar(false)}/>

      {/* SIDEBAR */}
      <aside className={`sidebar${sidebarOpen?' open':''}`}>
        <div className="sidebar-header">
          <SchoolLogo size={36} style={{border:'2px solid rgba(255,255,255,.25)',background:'#fff'}}/>
          <div className="sidebar-logo-text">
            <h1>Brighter Life Mission School</h1>
            <p>School Management</p>
          </div>
          {/* Close button — visible on mobile */}
          <button className="sidebar-close" onClick={()=>setSidebar(false)}>
            <FontAwesomeIcon icon={faTimes}/>
          </button>
        </div>

        <div className="sidebar-nav">
          <div className="sidebar-sec-label">Navigation</div>
          {navItems.map(n=>(
            <button key={n.id} className={`nav-item${page===n.id?' active':''}`} onClick={()=>navigate(n.id)}>
              <span className="nav-icon"><FontAwesomeIcon icon={n.icon}/></span>
              {n.label}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-tile" onClick={onLogout} title="Click to sign out">
            <Avatar name={user.name} size={34}/>
            <div className="user-tile-info">
              <p>{user.name}</p>
              <span>{user.email}</span>
            </div>
            <span className="user-role-tag">{user.role}</span>
          </div>
          <button className="btn btn-ghost btn-block" style={{marginTop:8,color:'rgba(255,255,255,.5)',fontSize:12}} onClick={onLogout}>
            <FontAwesomeIcon icon={faSignOutAlt}/> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main">
        <div className="topbar">
          <div className="topbar-left">
            {/* Hamburger — visible only on mobile */}
            <button className="hamburger" onClick={()=>setSidebar(true)} aria-label="Open menu">
              <FontAwesomeIcon icon={faBars}/>
            </button>
            <div className="topbar-titles">
              <h2>{current.label}</h2>
              <p>{user.role==='admin'?'Administrator':'Teacher'} · {user.name}</p>
            </div>
          </div>
          <div className="topbar-right">
            <button className="topbar-action" title="Notifications"><FontAwesomeIcon icon={faBell}/></button>
            <button className="btn btn-secondary btn-sm" onClick={onLogout}>
              <FontAwesomeIcon icon={faSignOutAlt}/> Sign Out
            </button>
          </div>
        </div>

        <div className="content">
          {page==='dashboard'    &&<Dashboard     user={user} students={stu.data} teachers={tch.data} attendance={att.data} grades={grd.data} fees={fee.data} announcements={ann.data}/>}
          {page==='students'     &&<Students      students={stu.data} onAdd={stu.add} onEdit={stu.update} onDelete={stu.remove}/>}
          {page==='teachers'     &&<Teachers      teachers={tch.data} onAdd={tch.add} onEdit={tch.update} onDelete={tch.remove}/>}
          {page==='attendance'   &&<Attendance    user={user} students={stu.data} attendance={att.data} onRecord={att.upsertAtt}/>}
          {page==='grades'       &&<Grades        user={user} students={stu.data} grades={grd.data} onAdd={grd.add}/>}
          {page==='fees'         &&<Fees          students={stu.data} fees={fee.data} onAdd={fee.add} onUpdate={fee.update}/>}
          {page==='announcements'&&<Announcements user={user} announcements={ann.data} onAdd={ann.add} onDelete={ann.remove}/>}
          {page==='settings'     &&<Settings/>}
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════
export default function App() {
  const [page,setPage] = useState('welcome');
  const [user,setUser] = useState(null);

  const handleLogin  = u => { setUser(u); setPage('app'); };
  const handleLogout = () => { setUser(null); setPage('welcome'); };

  return (
    <ToastProvider>
      {page==='welcome'  && <WelcomePage  onLogin={()=>setPage('login')} onRegister={()=>setPage('register')}/>}
      {page==='login'    && <LoginPage    onLogin={handleLogin} onRegister={()=>setPage('register')} onBack={()=>setPage('welcome')}/>}
      {page==='register' && <RegisterPage onBack={()=>setPage('login')}/>}
      {page==='app' && user && <AppShell user={user} onLogout={handleLogout}/>}
    </ToastProvider>
  );
}
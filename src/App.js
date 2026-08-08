import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGraduationCap, faChalkboardTeacher, faCalendarCheck, faChartBar,
  faMoneyBillWave, faBullhorn, faCog, faHome, faSignOutAlt, faBars, faTimes,
  faSearch, faPlus, faEdit, faTrash, faDownload, faFileExcel, faFilePdf,
  faFileCsv, faSms, faCheck, faUserShield, faUserTie, faUsers, faBookOpen,
  faChartLine, faCheckCircle, faTimesCircle, faClock, faExclamationTriangle,
  faInfoCircle, faPhone, faPrint, faLock, faUser, faEyeSlash, faEye,
  faArrowRight, faArrowLeft, faArrowUp, faStar, faRocket, faShieldAlt, faDatabase,
  faEnvelope, faBell, faCalculator, faAddressBook, faWallet
  , faUtensils, faFileImport
} from '@fortawesome/free-solid-svg-icons';
import './App.css';
import Papa from 'papaparse';
import { shouldUseLiveSupabase, getSupabaseConfig } from './supabaseConfig';
import { resolveLoginProfile, syncProfileAndTeacher } from './authHelpers';

// ─── SUPABASE ───────────────────────────────
const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = getSupabaseConfig(process.env);
const USE_LIVE_SUPABASE = shouldUseLiveSupabase(process.env);

const supabase = USE_LIVE_SUPABASE && SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
const IS_CONNECTED = Boolean(supabase);

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
const CONTACT_ROLES = ['Parent','Guardian','Teacher','Admin','Accountant'];
const FINANCIAL_TYPES = ['income','expense'];
const FINANCIAL_CATEGORIES = ['Tuition','Canteen','Donations','Grants','Salaries','Maintenance','Utilities','Stationery','Transport'];

const OnlineCtx = createContext(true);
const useOnline = () => useContext(OnlineCtx);
const OFFLINE_QUEUE_KEY = 'edu-manage-offline-queue';
const OFFLINE_CACHE_PREFIX = 'edu-manage-cache-';
const isTempId = id => typeof id === 'string' && id.startsWith('offline-');
const readOfflineQueue = () => {
  try {
    return JSON.parse(window.localStorage.getItem(OFFLINE_QUEUE_KEY) || '{}');
  } catch (err) {
    console.warn('Unable to read offline queue', err);
    return {};
  }
};
const writeOfflineQueue = queue => {
  try {
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('Unable to write offline queue', err);
  }
};
const readCachedTable = table => {
  try {
    return JSON.parse(window.localStorage.getItem(`${OFFLINE_CACHE_PREFIX}${table}`) || '[]');
  } catch (err) {
    console.warn(`Unable to read cached ${table}`, err);
    return [];
  }
};
const writeCachedTable = (table, rows) => {
  try {
    window.localStorage.setItem(`${OFFLINE_CACHE_PREFIX}${table}`, JSON.stringify(rows));
  } catch (err) {
    console.warn(`Unable to write cached ${table}`, err);
  }
};
const mergeOfflineAction = (table, action) => {
  const queue = readOfflineQueue();
  queue[table] = [...(queue[table] || []), action];
  writeOfflineQueue(queue);
};
const applyOfflineQueue = (table, rows=[]) => {
  const queue = readOfflineQueue()[table] || [];
  let result = [...rows];
  queue.forEach(action => {
    if (action.type === 'add') {
      result.unshift(action.row);
    } else if (action.type === 'update') {
      result = result.map(row => row.id === action.id ? {...row, ...action.changes} : row);
    } else if (action.type === 'remove') {
      result = result.filter(row => row.id !== action.id);
    }
  });
  return result;
};

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

// ─── LIVE DATA ONLY ──────────────────────────────
// This app now relies on live Supabase data for all tables and no longer
// uses demo/mock records for students, teachers, attendance, grades, fees,
// and announcements.

// ─── DATA HOOK ──────────────────────────────
function useTable(table) {
  const [data, setData] = useState([]);
  const online = useOnline();
  const toast = useToast();

  const persistRows = useCallback(rows => {
    setData(rows);
    writeCachedTable(table, rows);
  }, [table]);

  const flushOfflineQueue = useCallback(async () => {
    if (!supabase || !online) return;
    const queue = readOfflineQueue()[table] || [];
    if (!queue.length) return;

    const idMap = new Map();
    const nextQueue = [];

    for (const action of queue) {
      try {
        if (action.type === 'add') {
          const row = { ...action.row };
          const tempId = row.id;
          if (isTempId(tempId)) delete row.id;
          const { data: ins, error } = await supabase.from(table).insert(row).select();
          if (error) throw error;
          if (ins?.[0]) {
            if (tempId && isTempId(tempId)) idMap.set(tempId, ins[0].id);
            setData(prev => prev.map(r => r.id === tempId ? ins[0] : r));
          }
        } else if (action.type === 'update') {
          let targetId = action.id;
          if (isTempId(targetId) && idMap.has(targetId)) targetId = idMap.get(targetId);
          if (isTempId(targetId)) {
            setData(prev => prev.map(r => r.id === action.id ? { ...r, ...action.changes } : r));
            continue;
          }
          const { data: upd, error } = await supabase.from(table).update(action.changes).eq('id', targetId).select();
          if (error) throw error;
          if (upd?.[0]) {
            setData(prev => prev.map(r => r.id === targetId ? upd[0] : r));
          }
        } else if (action.type === 'remove') {
          let targetId = action.id;
          if (isTempId(targetId) && idMap.has(targetId)) targetId = idMap.get(targetId);
          if (isTempId(targetId)) {
            continue;
          }
          const { error } = await supabase.from(table).delete().eq('id', targetId);
          if (error) throw error;
          setData(prev => prev.filter(r => r.id !== targetId && r.id !== action.id));
        } else if (action.type === 'upsert') {
          const row = { ...action.row };
          if (isTempId(row.id)) delete row.id;
          const { error } = await supabase.from(table).upsert(row, { onConflict: action.onConflict || 'id' });
          if (error) throw error;
        }
      } catch (err) {
        console.warn(`Failed to sync offline action for ${table}`, err);
        nextQueue.push(action);
      }
    }

    const allQueues = readOfflineQueue();
    if (nextQueue.length) {
      allQueues[table] = nextQueue;
      writeOfflineQueue(allQueues);
      toast('Some offline changes remain unsynced','error');
    } else {
      delete allQueues[table];
      writeOfflineQueue(allQueues);
      toast('Offline changes synced','success');
    }

    if (!nextQueue.length) {
      try {
        const { data: rows, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
        if (!error && rows) {
          const merged = applyOfflineQueue(table, rows);
          persistRows(merged);
        }
      } catch (err) {
        console.warn(`[${table}] live fetch failed after sync`, err);
      }
    }
  }, [online, persistRows, table, toast]);

  useEffect(() => {
    const loadData = async () => {
      const cached = readCachedTable(table);
      if (!supabase || !online) {
        persistRows(applyOfflineQueue(table, cached));
        return;
      }

      let fetched = [];
      try {
        const { data: rows, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
        if (!error && rows) fetched = rows;
        else console.warn(`[${table}] live fetch failed; using cached data`, error?.message || 'unknown error');
      } catch (err) {
        console.warn(`[${table}] live fetch failed`, err);
      }
      const merged = applyOfflineQueue(table, fetched.length ? fetched : cached);
      persistRows(merged);
    };

    loadData();
  }, [online, persistRows, table]);

  useEffect(() => {
    if (online) {
      flushOfflineQueue();
    }
  }, [online, flushOfflineQueue]);

  const add = useCallback(async row => {
    if (!supabase || !online) {
      const offlineRow = { ...row, id: `offline-${uid()}`, created_at: new Date().toISOString() };
      setData(p => {
        const next = [offlineRow, ...p];
        writeCachedTable(table, next);
        return next;
      });
      mergeOfflineAction(table, { type: 'add', row: offlineRow });
      toast('Saved offline — will sync when online','info');
      return;
    }
    try {
      const { data: ins, error } = await supabase.from(table).insert(row).select();
      if (error) throw error;
      setData(p => {
        const next = [...(ins || []), ...p];
        writeCachedTable(table, next);
        return next;
      });
      toast('Added','success');
      return ins?.[0] || null;
    } catch (err) {
      const offlineRow = { ...row, id: `offline-${uid()}`, created_at: new Date().toISOString() };
      setData(p => {
        const next = [offlineRow, ...p];
        writeCachedTable(table, next);
        return next;
      });
      mergeOfflineAction(table, { type: 'add', row: offlineRow });
      toast('Saved offline — will sync when online','info');
      return offlineRow;
    }
  }, [online, table, toast]);

  const update = useCallback(async (id, changes) => {
    if (!supabase || !online || isTempId(id)) {
      setData(p => {
        const next = p.map(r => r.id === id ? { ...r, ...changes } : r);
        writeCachedTable(table, next);
        return next;
      });
      if (!isTempId(id)) mergeOfflineAction(table, { type: 'update', id, changes });
      toast('Saved offline — will sync when online','info');
      return;
    }
    try {
      const { data: upd, error } = await supabase.from(table).update(changes).eq('id', id).select();
      if (error) throw error;
      setData(p => {
        const next = p.map(r => r.id === id ? upd[0] : r);
        writeCachedTable(table, next);
        return next;
      });
      toast('Updated','success');
    } catch (err) {
      setData(p => {
        const next = p.map(r => r.id === id ? { ...r, ...changes } : r);
        writeCachedTable(table, next);
        return next;
      });
      mergeOfflineAction(table, { type: 'update', id, changes });
      toast('Saved offline — will sync when online','info');
    }
  }, [online, table, toast]);

  const remove = useCallback(async id => {
    if (!supabase || !online || isTempId(id)) {
      setData(p => {
        const next = p.filter(r => r.id !== id);
        writeCachedTable(table, next);
        return next;
      });
      if (!isTempId(id)) mergeOfflineAction(table, { type: 'remove', id });
      toast(isTempId(id) ? 'Removed local record' : 'Saved offline deletion — will sync when online','info');
      return;
    }
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      setData(p => {
        const next = p.filter(r => r.id !== id);
        writeCachedTable(table, next);
        return next;
      });
      toast('Deleted','info');
    } catch (err) {
      setData(p => {
        const next = p.filter(r => r.id !== id);
        writeCachedTable(table, next);
        return next;
      });
      mergeOfflineAction(table, { type: 'remove', id });
      toast('Saved offline deletion — will sync when online','info');
    }
  }, [online, table, toast]);

  const upsertAtt = useCallback(async (student_id, date, status, cls) => {
    const existing = data.find(a => a.student_id === student_id && a.date === date);
    const row = existing ? { ...existing, status } : { id: `offline-${uid()}`, student_id, date, status, class: cls, created_at: new Date().toISOString() };

    setData(p => {
      const i = p.findIndex(a => a.student_id === student_id && a.date === date);
      const next = i >= 0 ? p.map((item, index) => index === i ? { ...item, status } : item) : [...p, row];
      writeCachedTable(table, next);
      return next;
    });

    if (!supabase || !online) {
      mergeOfflineAction(table, { type: 'upsert', row, onConflict: 'student_id,date' });
      toast('Attendance saved offline — will sync later','info');
      return;
    }

    try {
      const payload = { student_id, date, status, class: cls };
      await supabase.from('attendance').upsert(payload, { onConflict: 'student_id,date' });
    } catch (err) {
      mergeOfflineAction(table, { type: 'upsert', row, onConflict: 'student_id,date' });
      toast('Attendance saved offline — will sync later','info');
    }
  }, [data, online, table, toast]);

  return { data, add, update, remove, upsertAtt };
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
  useEffect(()=>{
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    return ()=>{
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, []);

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
function ExportModal({onClose,dataLabel,rows=[]}) {
  const toast=useToast();

  const stringifyCsv = (items) => {
    if (!items.length) return '';
    const headers = Object.keys(items[0]);
    const escape = value => {
      const stringValue = value == null ? '' : String(value);
      return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g,'""')}"` : stringValue;
    };
    const lines = [headers.join(',')];
    items.forEach(item => lines.push(headers.map(h => escape(item[h])).join(',')));
    return lines.join('\n');
  };

  const downloadFile = (fmt) => {
    if (fmt !== 'CSV' || !rows.length) {
      toast(`${dataLabel} exported as ${fmt}`,'success');
      onClose();
      return;
    }

    const csv = stringifyCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dataLabel.toLowerCase().replace(/\s+/g,'-') || 'export'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast(`${dataLabel} exported as CSV`,'success');
    onClose();
  };

  const exp=fmt=>{
    if (fmt === 'CSV') {
      downloadFile(fmt);
      return;
    }
    toast(`${dataLabel} exported as ${fmt}`,'success');
    onClose();
  };

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
  const [role,setRole]=useState('teacher');
  const [email,setEmail]=useState('');
  const [pass,setPass]=useState('');
  const [show,setShow]=useState(false);
  const [busy,setBusy]=useState(false);

  const prefill=r=>setRole(r);

  const handleLogin=async()=>{
    setBusy(true);
    if (!supabase) {
      toast('Supabase is not configured. Please set REACT_APP_ENABLE_LIVE_SUPABASE, REACT_APP_SUPABASE_URL, and REACT_APP_SUPABASE_ANON_KEY in .env.','error');
      setBusy(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error || !data?.user) {
      toast(error?.message || 'Login failed','error');
      setBusy(false);
      return;
    }

    if (!data.user.email_confirmed_at) {
      toast('Please verify your email before signing in.','error');
      setBusy(false);
      return;
    }

    const userId = data.user.id;
    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    const { profile: resolvedProfile, shouldCreateProfile } = resolveLoginProfile({
      authUser: data.user,
      selectedRole: role,
      profile,
      profileError,
    });

    const { profile: syncedProfile, profileError: syncProfileError, teacherError } = await syncProfileAndTeacher(supabase, {
      authUser: data.user,
      selectedRole: role,
      profileData: profile || resolvedProfile,
      teacherData: {
        qualification: '',
        experience_years: 0,
        status: 'active',
      },
    });

    if (shouldCreateProfile || syncProfileError || teacherError) {
      const messages = [];
      if (syncProfileError) messages.push(`profile: ${syncProfileError.message}`);
      if (teacherError) messages.push(`teacher: ${teacherError.message}`);
      if (messages.length) {
        toast(`Signed in, but Supabase sync had issues (${messages.join('; ')})`,'warning');
      }
    }

    if (role !== (syncedProfile?.role || resolvedProfile.role)) {
      toast(`Please sign in using the ${resolvedProfile.role} role.`,`error`);
      setBusy(false);
      return;
    }

    toast(`Welcome, ${(syncedProfile?.name || resolvedProfile.name).split(' ').pop()}!`,'success');
    onLogin({ ...resolvedProfile, ...syncedProfile, user_id: userId });
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
            <div className={`role-card${role==='accountant'?' active':''}`} onClick={()=>prefill('accountant')}>
              <span className="rc-icon"><FontAwesomeIcon icon={faCalculator} style={{color:role==='accountant'?'var(--g700)':'var(--gray400)'}}/></span>
              <span>Accountant</span><small>Financial access</small>
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

          <div className="auth-highlight-card">
            <div className="auth-highlight-icon"><FontAwesomeIcon icon={faInfoCircle}/></div>
            <div>
              <strong>Need live access?</strong>
              <div>Connect your Supabase credentials and sign in with a registered account to unlock the full dashboard.</div>
            </div>
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
    if (!supabase) {
      toast('Supabase is not configured. Please set your environment variables.','error');
      return;
    }

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password });
    if (error) {
      toast(error.message,'error');
      setBusy(false);
      return;
    }

    if (!data?.user?.id) {
      toast('Failed to create account. Please try again.','error');
      setBusy(false);
      return;
    }

    const userId = data.user.id;
    const { profileError, teacherError } = await syncProfileAndTeacher(supabase, {
      authUser: data.user,
      selectedRole: form.role,
      profileData: {
        user_id: userId,
        email: form.email,
        name: form.name,
        role: form.role,
        subject: form.subject,
        class: form.class,
        phone: form.phone,
      },
      teacherData: {
        qualification: '',
        experience_years: 0,
        status: 'active',
      },
    });

    if (profileError || teacherError) {
      const messages = [];
      if (profileError) messages.push(`profile: ${profileError.message}`);
      if (teacherError) messages.push(`teacher: ${teacherError.message}`);
      toast(`Account created, but Supabase sync had issues (${messages.join('; ')})`,'warning');
      setBusy(false);
      onBack();
      return;
    }

    toast('Account created! Please verify your email and then sign in.','success');
    setBusy(false);
    onBack();
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
          <div className="auth-box-hd">
            <h2>Create Account</h2>
            <p>Set up your school account in a few simple steps.</p>
          </div>

          <div className="auth-highlight-card">
            <div className="auth-highlight-icon"><FontAwesomeIcon icon={faRocket}/></div>
            <div>
              <strong>Start tracking quickly</strong>
              <div>Choose your role and class so the right tools appear as soon as your account is ready.</div>
            </div>
          </div>

          <div className="role-grid">
            <div className={`role-card${form.role==='admin'?' active':''}`} onClick={()=>setForm(p=>({...p,role:'admin'}))}>
              <span className="rc-icon"><FontAwesomeIcon icon={faUserShield} style={{color:form.role==='admin'?'var(--g700)':'var(--gray400)'}}/></span>
              <span>Administrator</span><small>School admin</small>
            </div>
            <div className={`role-card${form.role==='teacher'?' active':''}`} onClick={()=>setForm(p=>({...p,role:'teacher'}))}>
              <span className="rc-icon"><FontAwesomeIcon icon={faUserTie} style={{color:form.role==='teacher'?'var(--g700)':'var(--gray400)'}}/></span>
              <span>Teacher</span><small>Class teacher</small>
            </div>
            <div className={`role-card${form.role==='accountant'?' active':''}`} onClick={()=>setForm(p=>({...p,role:'accountant'}))}>
              <span className="rc-icon"><FontAwesomeIcon icon={faCalculator} style={{color:form.role==='accountant'?'var(--g700)':'var(--gray400)'}}/></span>
              <span>Accountant</span><small>Financial admin</small>
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
export function Dashboard({user,students,teachers,attendance,grades,fees,announcements,profiles=[],contacts=[],financials=[],onNavigate=()=>{}}) {
  const active   =students.filter(s=>s.status==='active').length;
  const today    =dateToday();
  const todayAtt =attendance.filter(a=>a.date===today);
  const totalIncome = financials.filter(f=>f.record_type==='income').reduce((sum,f)=>sum+Number(f.amount||0),0);
  const totalExpenses = financials.filter(f=>f.record_type==='expense').reduce((sum,f)=>sum+Number(f.amount||0),0);
  const netBalance = totalIncome - totalExpenses;
  const contactCount = contacts.length;
  const present  =todayAtt.filter(a=>a.status==='present').length;
  const avgScore =grades.length?Math.round(grades.reduce((s,g)=>s+(g.score/g.max_score)*100,0)/grades.length):0;
  const collected=fees.filter(f=>f.status==='paid').reduce((s,f)=>s+Number(f.amount),0);
  const totalFees=fees.reduce((s,f)=>s+Number(f.amount),0);
  const overdue  =fees.filter(f=>f.status==='overdue').length;
  const attRate  =todayAtt.length?Math.round((present/todayAtt.length)*100):0;
  const pendingAttendance = todayAtt.length ? todayAtt.filter(a=>a.status!=='present').length : 0;

  const attStats=['present','absent','late','excused'].map(st=>({
    label:st[0].toUpperCase()+st.slice(1),
    count:attendance.filter(a=>a.status===st).length,
    color:{present:'var(--g600)',absent:'var(--red)',late:'var(--gold)',excused:'var(--blue)'}[st],
  }));
  const maxAtt=Math.max(...attStats.map(a=>a.count),1);
  const accountProfile = profiles.find(p => p.user_id === user.user_id || p.email === user.email) || user;
  const linkedTeacher = teachers.find(t => t.email === accountProfile.email || t.name === accountProfile.name);

  const quickActions = user.role==='admin' ? [
    {label:'Add Student', icon:faGraduationCap, target:'students', hint:'Create a new learner profile'},
    {label:'Record Attendance', icon:faCalendarCheck, target:'attendance', hint:'Mark today’s present and absent students'},
    {label:'Create Notice', icon:faBullhorn, target:'announcements', hint:'Keep staff and families updated'},
    {label:'Review Fees', icon:faMoneyBillWave, target:'fees', hint:'Follow up on overdue balances'},
  ] : user.role==='accountant' ? [
    {label:'Add Income', icon:faWallet, target:'financials', hint:'Record a new income item'},
    {label:'Add Expense', icon:faWallet, target:'financials', hint:'Track outgoing costs'},
    {label:'Manage Fees', icon:faMoneyBillWave, target:'fees', hint:'Review school fee records'},
    {label:'Contacts', icon:faAddressBook, target:'contacts', hint:'View guardians and staff contacts'},
  ] : [
    {label:'Take Attendance', icon:faCalendarCheck, target:'attendance', hint:'Update your class register'},
    {label:'Post Grade', icon:faChartBar, target:'grades', hint:'Enter the latest assessment results'},
  ];

  const attentionItems = [
    overdue>0 ? {title:`${overdue} overdue fee${overdue>1?'s':''}`, detail:'Follow up on outstanding balances before they grow.', target:'fees'} : null,
    pendingAttendance>0 ? {title:`${pendingAttendance} attendance record${pendingAttendance>1?'s':''} still pending`, detail:'Close today’s attendance before the end of the day.', target:'attendance'} : null,
    announcements.length===0 ? {title:'No notices posted yet', detail:'Share a quick update to keep the school informed.', target:'announcements'} : null,
  ].filter(Boolean);

  const recentActivity = [
    ...grades.slice(0,2).map(g => ({
      title: `${students.find(st=>st.id===g.student_id)?.name || 'Student'} received ${letterGrade(g.score,g.max_score)} in ${g.subject}`,
      detail: fmtDate(g.date),
      target: 'grades',
    })),
    ...announcements.slice(0,2).map(a => ({
      title: a.title,
      detail: a.content.substring(0,70),
      target: 'announcements',
    })),
  ].slice(0,4);

  const trendSummary = [
    {label:'Attendance', value:`${attRate}%`, tone:'good'},
    {label:'Fee Collection', value:`${totalFees ? Math.round((collected/totalFees)*100) : 0}%`, tone:'good'},
    {label:'Overdue', value:`${overdue}`, tone: overdue ? 'warn' : 'good'},
    {label:'Income', value: fmtMoney(totalIncome), tone:'good'},
    {label:'Expenses', value: fmtMoney(totalExpenses), tone: totalExpenses ? 'warn' : 'good'},
  ];

  return (
    <div className="anim-up">
      {!IS_CONNECTED&&(
        <div className="alert alert-error">
          <FontAwesomeIcon icon={faInfoCircle}/>
          <span><strong>Supabase is not connected.</strong> Please configure <code>REACT_APP_ENABLE_LIVE_SUPABASE=true</code>, <code>REACT_APP_SUPABASE_URL</code>, and <code>REACT_APP_SUPABASE_ANON_KEY</code> in your .env file.</span>
        </div>
      )}
      <div className="card dashboard-hero" style={{marginBottom:18}}>
        <div className="dashboard-hero-copy">
          <div className="dashboard-eyebrow">Today at a glance</div>
          <h3>Welcome back, {accountProfile.name || user.name}.</h3>
          <p>{user.role==='admin' ? 'Use the quick actions below to keep student records, attendance, and fees current.' : 'Your class dashboard is ready for the next attendance or grade update.'}</p>
        </div>
        <div className="dashboard-hero-meta">
          <div className="info-tile"><div className="info-tile-label">Attendance</div><div className="info-tile-value">{attRate}% today</div></div>
          <div className="info-tile"><div className="info-tile-label">Pending</div><div className="info-tile-value">{pendingAttendance || 0} records</div></div>
        </div>
      </div>

      <div className="card" style={{marginBottom:18}}>
        <div className="card-header"><span className="card-title"><FontAwesomeIcon icon={faUserShield}/> Supabase Profile Sync</span></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
          <div style={{padding:'10px 12px',background:'var(--gray50)',borderRadius:12}}>
            <div style={{fontSize:12,color:'var(--gray500)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Signed-in user</div>
            <div style={{fontWeight:800}}>{accountProfile.name || user.name}</div>
            <div style={{fontSize:13,color:'var(--gray500)'}}>{accountProfile.email || user.email}</div>
          </div>
          <div style={{padding:'10px 12px',background:'var(--gray50)',borderRadius:12}}>
            <div style={{fontSize:12,color:'var(--gray500)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Role in Supabase</div>
            <div style={{fontWeight:800,textTransform:'capitalize'}}>{accountProfile.role || user.role}</div>
            <div style={{fontSize:13,color:'var(--gray500)'}}>{accountProfile.class ? `Class: ${accountProfile.class}` : 'No class assigned yet'}</div>
          </div>
          <div style={{padding:'10px 12px',background:'var(--gray50)',borderRadius:12}}>
            <div style={{fontSize:12,color:'var(--gray500)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Teacher record</div>
            <div style={{fontWeight:800}}>{linkedTeacher?.name || 'No linked teacher row'}</div>
            <div style={{fontSize:13,color:'var(--gray500)'}}>{linkedTeacher ? `${linkedTeacher.subject || 'Subject pending'} - ${linkedTeacher.class || 'No class'}` : 'Create a teacher record to make teacher access visible in Supabase'}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:18}}>
        <div className="card-header"><span className="card-title"><FontAwesomeIcon icon={faChartLine}/> Quick Actions</span></div>
        <div className="quick-action-grid">
          {quickActions.map(action=>(
            <button key={action.label} className="quick-action-card" onClick={()=>onNavigate(action.target)}>
              <span className="quick-action-icon"><FontAwesomeIcon icon={action.icon}/></span>
              <span className="quick-action-title">{action.label}</span>
              <small>{action.hint}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="stats-grid">
        {user.role==='admin'&&<>
          <div className="stat-card green"><div className="stat-card-icon"><FontAwesomeIcon icon={faGraduationCap}/></div><div className="stat-value">{active}</div><div className="stat-label">Active Students</div><div className="stat-change up">{students.length} total enrolled</div></div>
          <div className="stat-card blue"> <div className="stat-card-icon"><FontAwesomeIcon icon={faChalkboardTeacher}/></div><div className="stat-value">{teachers.length}</div><div className="stat-label">Teachers</div><div className="stat-change">{teachers.filter(t=>t.status==='active').length} active</div></div>
          <div className="stat-card gold"><div className="stat-card-icon"><FontAwesomeIcon icon={faWallet}/></div><div className="stat-value" style={{fontSize:18}}>{fmtMoney(netBalance)}</div><div className="stat-label">Net Funds</div><div className="stat-change">{totalIncome?`${(totalIncome/Math.max(totalIncome,totalExpenses)*100).toFixed(0)}%`:'0%'}</div></div>
          <div className="stat-card blue"><div className="stat-card-icon"><FontAwesomeIcon icon={faAddressBook}/></div><div className="stat-value">{contactCount}</div><div className="stat-label">Contacts</div><div className="stat-change">{contacts.length} total</div></div>
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
          <div className="card-header"><span className="card-title"><FontAwesomeIcon icon={faExclamationTriangle}/> Needs Attention</span></div>
          {attentionItems.length ? (
            <div className="attention-list">
              {attentionItems.map(item=>(
                <div key={item.title} className="attention-item">
                  <div>
                    <div className="attention-title">{item.title}</div>
                    <div className="attention-detail">{item.detail}</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={()=>onNavigate(item.target)}>{item.target==='fees'?'Review':'Open'}</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{padding:'16px 8px'}}>
              <div className="empty-state-icon" style={{fontSize:28}}><FontAwesomeIcon icon={faCheckCircle}/></div>
              <h3>Everything looks on track</h3>
              <p>There are no urgent items at the moment.</p>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{marginBottom:20}}>
        <div className="card-header"><span className="card-title"><FontAwesomeIcon icon={faChartLine}/> School Trends</span></div>
        <div className="trend-grid">
          {trendSummary.map(item=>(
            <div key={item.label} className={`trend-pill ${item.tone}`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title"><FontAwesomeIcon icon={faBell}/> Recent Activity</span></div>
        <div className="attention-list">
          {recentActivity.map((item,index)=>(
            <div key={`${item.title}-${index}`} className="attention-item">
              <div>
                <div className="attention-title">{item.title}</div>
                <div className="attention-detail">{item.detail}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={()=>onNavigate(item.target)}>View</button>
            </div>
          ))}
        </div>
      </div>

      {user.role==='admin'&&(
        <div className="card" style={{marginBottom:20}}>
          <div className="card-header"><span className="card-title"><FontAwesomeIcon icon={faUsers}/> Supabase Profiles</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Class</th></tr></thead>
              <tbody>
                {profiles.slice(0,6).map(p=>(
                  <tr key={p.user_id || p.email}>
                    <td style={{fontWeight:700}}>{p.name}</td>
                    <td style={{fontSize:12,color:'var(--gray500)'}}>{p.email}</td>
                    <td><span className={`badge badge-${p.role==='admin'?'gold':'green'}`}>{p.role || 'teacher'}</span></td>
                    <td style={{fontSize:12,color:'var(--gray500)'}}>{p.class || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
const BLANK_STU={name:'',email:'',class:'Primary 1',dob:'',guardian_name:'',guardian_phone:'',address:'',status:'active'};

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
  const filtered=teachers.filter(t=>!search||t.name.toLowerCase().includes(search.toLowerCase())||(t.subject||'').toLowerCase().includes(search.toLowerCase()));

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

function Grades({user,students,grades,onAdd,onDelete}) {
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
  const exportRows=list.map(g=>({
    Student: students.find(st=>st.id===g.student_id)?.name || 'Unknown',
    Class: g.class,
    Subject: g.subject,
    Assessment: g.assignment,
    Score: `${g.score}/${g.max_score}`,
    Percentage: `${Math.round((g.score/g.max_score)*100)}%`,
    Grade: letterGrade(g.score,g.max_score),
    Term: g.term,
    Date: g.date,
  }));

  const save=()=>{
    if(!form.student_id||!form.subject||!form.score) return alert('Fill all required fields');
    const stu=students.find(s=>s.id===form.student_id);
    onAdd({...form,class:stu?.class||form.class});
    setModal(false);
    setForm({...BLANK_GRD,subject:user.subject||'',class:user.class||''});
  };
  const del=id=>{ if(window.confirm('Delete this grade entry?')) onDelete(id); };

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
          <thead><tr><th>Student</th><th>Class</th><th>Subject</th><th>Assessment</th><th>Score</th><th>%</th><th>Grade</th><th>Term</th><th>Delete</th></tr></thead>
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
                  <td><button className="btn btn-danger btn-sm" onClick={()=>del(g.id)}><FontAwesomeIcon icon={faTrash}/></button></td>
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
      {expModal&&<ExportModal onClose={()=>setExpModal(false)} dataLabel="Grades Report" rows={exportRows}/>} 
    </div>
  );
}

// ═══════════════════════════════════════════
// FEES
// ═══════════════════════════════════════════
const BLANK_FEE={student_id:'',amount:'',fee_type:'Tuition',days:'',rate_per_day:'10',due_date:'',status:'pending',term:'Term 1 2026'};

const BLANK_CONTACT={name:'',role:'Parent',email:'',phone:'',relation:'Guardian',class:'',notes:'',status:'active'};
const BLANK_FINANCIAL={record_type:'income',category:'Tuition',student_id:'',class:'',amount:'',date:dateToday(),term:'Term 1 2026',description:''};

function Fees({students,fees,onAdd,onUpdate,onDelete}) {
  const [tab,setTab]=useState('all');
  const [feeTypePage,setFeeTypePage]=useState('all');
  const [showForm,setShowForm]=useState(false);
  const [smsModal,setSmsModal]=useState(false);
  const [expModal,setExpModal]=useState(false);
  const [fCls,setFCls]=useState('');
  const [form,setForm]=useState(BLANK_FEE);
  const [editingFee,setEditingFee]=useState(null);
  const F=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const list=fees.filter(f=>{
    const s=students.find(st=>st.id===f.student_id);
    return (tab==='all'||f.status===tab)
      &&(!fCls||s?.class===fCls)
      &&(feeTypePage==='all'||f.fee_type===feeTypePage);
  });
  const exportRows=list.map(f=>({
    Student: students.find(st=>st.id===f.student_id)?.name || 'Unknown',
    Class: students.find(st=>st.id===f.student_id)?.class || '—',
    FeeType: f.fee_type,
    Amount: fmtMoney(f.amount),
    Days: f.days || '—',
    Rate: f.rate_per_day ? `GH₵ ${Number(f.rate_per_day).toFixed(2)}` : '—',
    DueDate: fmtDate(f.due_date),
    PaidDate: fmtDate(f.paid_date),
    Status: f.status,
    Term: f.term,
  }));

  const collected =fees.filter(f=>f.status==='paid').reduce((s,f)=>s+Number(f.amount),0);
  const pending   =fees.filter(f=>f.status==='pending').reduce((s,f)=>s+Number(f.amount),0);
  const overdueAmt=fees.filter(f=>f.status==='overdue').reduce((s,f)=>s+Number(f.amount),0);

  const openAddFee = () => {
    setEditingFee(null);
    setShowForm(true);
    setForm({
      ...BLANK_FEE,
      fee_type: feeTypePage==='all' ? 'Tuition' : feeTypePage,
    });
  };

  const openEditFee = (feeRecord) => {
    setEditingFee(feeRecord.id);
    setForm({
      student_id: feeRecord.student_id || '',
      amount: feeRecord.amount || '',
      fee_type: feeRecord.fee_type || 'Tuition',
      days: feeRecord.days || '',
      rate_per_day: feeRecord.rate_per_day || '10',
      due_date: feeRecord.due_date || '',
      status: feeRecord.status || 'pending',
      term: feeRecord.term || 'Term 1 2026',
      paid_date: feeRecord.paid_date || '',
    });
    setShowForm(true);
  };

  const save = () => {
    if(!form.student_id||!form.amount) return alert('Fill required fields');
    const payload = {
      ...form,
      amount: form.fee_type==='Canteen' ? String((Number(form.days)||0) * (Number(form.rate_per_day)||0)) : form.amount,
    };
    if (editingFee) {
      onUpdate(editingFee, payload);
    } else {
      onAdd(payload);
    }
    setShowForm(false);
    setForm(BLANK_FEE);
    setEditingFee(null);
  };
  const markPaid=id=>onUpdate(id,{status:'paid',paid_date:dateToday()});
  const del=id=>{ if(window.confirm('Delete this fee record?')) onDelete(id); };

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
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginLeft:12}}>
          <button className={`tab${feeTypePage==='all'?' active':''}`} onClick={()=>setFeeTypePage('all')}>All Fees</button>
          {FEE_TYPES.map(t=>(
            <button key={t} className={`tab${feeTypePage===t?' active':''}`} onClick={()=>setFeeTypePage(t)}>{t}</button>
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
        <button className="btn btn-primary btn-sm" onClick={openAddFee}><FontAwesomeIcon icon={faPlus}/> Add Fee</button>
      </div>

      {showForm&&(
        <div className="fee-add-panel" style={{marginBottom:18,background:'var(--white)',border:'1px solid var(--gray200)',borderRadius:'14px',padding:'18px',boxShadow:'var(--shadow-sm)'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14}}>
            <div className="form-group"><label>Student *</label><select value={form.student_id} onChange={F('student_id')}><option value="">Select student…</option>{students.filter(s=>s.status==='active').map(s=><option key={s.id} value={s.id}>{s.name} — {s.class}</option>)}</select></div>
            <div className="form-group"><label>Fee Type *</label>{feeTypePage==='all'
              ? <select value={form.fee_type} onChange={F('fee_type')}>{FEE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select>
              : <input value={form.fee_type} readOnly style={{opacity:.8,cursor:'not-allowed'}} />
            }</div>
            <div className="form-group"><label>Amount (GH₵) *</label><input type="number" min="0" value={form.amount} onChange={F('amount')} placeholder="0.00" disabled={form.fee_type==='Canteen'} /></div>
            <div className="form-group"><label>Due Date</label><input type="date" value={form.due_date} onChange={F('due_date')}/></div>
          </div>
          {form.fee_type==='Canteen' && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14,marginTop:8}}>
              <div className="form-group"><label>Days *</label><input type="number" min="0" value={form.days} onChange={F('days')} placeholder="Days served"/></div>
              <div className="form-group"><label>Rate per Day (GH₵) *</label><input type="number" min="0" value={form.rate_per_day} onChange={F('rate_per_day')} placeholder="Rate per day"/></div>
              <div className="form-group" style={{alignSelf:'end'}}>
                <label>Total Canteen</label>
                <div style={{padding:'11px 12px',borderRadius:'10px',border:'1.5px solid var(--gray300)',background:'var(--gray50)'}}>
                  GH₵ {((Number(form.days)||0)*(Number(form.rate_per_day)||0)).toFixed(2)}
                </div>
              </div>
            </div>
          )}
          <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:16}}>
            <button className="btn btn-secondary btn-sm" onClick={()=>{setShowForm(false);setForm(BLANK_FEE);setEditingFee(null);}}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={save}><FontAwesomeIcon icon={faCheck}/> Save Fee</button>
          </div>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              <th>Fee Type</th>
              <th>Amount (GH₵)</th>
              <th>Due Date</th>
              <th>Paid Date</th>
              <th>Status</th>
              <th>Action</th>
              <th>Delete</th>
            </tr>
          </thead>
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
                  <td><div style={{display:'flex',gap:6}}>
                    <button className="btn btn-secondary btn-sm" onClick={()=>openEditFee(f)}><FontAwesomeIcon icon={faEdit}/></button>
                    <button className="btn btn-danger btn-sm" onClick={()=>del(f.id)}><FontAwesomeIcon icon={faTrash}/></button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!list.length&&<div className="empty-state"><div className="empty-state-icon"><FontAwesomeIcon icon={faMoneyBillWave}/></div><h3>No fee records</h3><p>All clear in this category.</p></div>}
      </div>

      {smsModal&&<SmsModal onClose={()=>setSmsModal(false)} students={students} fees={fees}/>}
      {expModal &&<ExportModal onClose={()=>setExpModal(false)} dataLabel="Fee Records" rows={exportRows}/>}
    </div>
  );
}

// ═══════════════════════════════════════════
// ANNOUNCEMENTS
// ═══════════════════════════════════════════
const BLANK_ANN={title:'',content:'',target_audience:'all',priority:'normal',created_by:''};

function Financials({user,students,financials,onAdd,onUpdate,onDelete}) {
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [search,setSearch]=useState('');
  const [filterType,setFilterType]=useState('');
  const [filterCategory,setFilterCategory]=useState('');
  const [form,setForm]=useState(BLANK_FINANCIAL);
  const F=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const filtered = financials.filter(item => {
    const matchesSearch = !search || item.description?.toLowerCase().includes(search.toLowerCase()) || item.category?.toLowerCase().includes(search.toLowerCase()) || item.record_type?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch
      &&(!filterType||item.record_type===filterType)
      &&(!filterCategory||item.category===filterCategory);
  });

  const totalIncome = filtered.filter(f=>f.record_type==='income').reduce((sum,f)=>sum+Number(f.amount||0),0);
  const totalExpenses = filtered.filter(f=>f.record_type==='expense').reduce((sum,f)=>sum+Number(f.amount||0),0);
  const netTotal = totalIncome - totalExpenses;

  const openAdd = () => { setEditing(null); setForm({...BLANK_FINANCIAL}); setModal(true); };
  const openEdit = item => { setEditing(item.id); setForm({...item}); setModal(true); };
  const save = () => {
    if(!form.record_type||!form.category||!form.amount||!form.date) return alert('Fill all required fields');
    if (editing) {
      onUpdate(editing, form);
    } else {
      onAdd(form);
    }
    setModal(false);
    setForm(BLANK_FINANCIAL);
    setEditing(null);
  };
  const remove = id => { if(window.confirm('Delete this entry?')) onDelete(id); };

  const rows = filtered.map(entry => {
    const student = students.find(s=>s.id===entry.student_id);
    return {
      ...entry,
      studentName: student?.name || '—',
      className: student?.class || entry.class || '—',
    };
  });

  return (
    <div className="anim-up">
      <div className="stats-grid" style={{marginBottom:18}}>
        <div className="stat-card green"><div className="stat-card-icon"><FontAwesomeIcon icon={faWallet}/></div><div className="stat-value" style={{fontSize:18}}>{fmtMoney(totalIncome)}</div><div className="stat-label">Income</div></div>
        <div className="stat-card red"><div className="stat-card-icon"><FontAwesomeIcon icon={faWallet}/></div><div className="stat-value" style={{fontSize:18}}>{fmtMoney(totalExpenses)}</div><div className="stat-label">Expenses</div></div>
        <div className="stat-card gold"><div className="stat-card-icon"><FontAwesomeIcon icon={faCheckCircle}/></div><div className="stat-value" style={{fontSize:18}}>{fmtMoney(netTotal)}</div><div className="stat-label">Net</div></div>
      </div>

      <div className="filter-bar">
        <div className="search-wrap"><FontAwesomeIcon icon={faSearch} className="search-icon"/><input placeholder="Search income / expenses…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <select className="filter-sel" value={filterType} onChange={e=>setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {FINANCIAL_TYPES.map(type=><option key={type} value={type}>{type[0].toUpperCase()+type.slice(1)}</option>)}
        </select>
        <select className="filter-sel" value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {FINANCIAL_CATEGORIES.map(cat=><option key={cat} value={cat}>{cat}</option>)}
        </select>
        <span style={{marginLeft:'auto',fontSize:12,color:'var(--gray500)',fontWeight:600}}>{rows.length} entries</span>
        <button className="btn btn-primary btn-sm" onClick={openAdd}><FontAwesomeIcon icon={faPlus}/> Add Entry</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Type</th><th>Category</th><th>Amount</th><th>Student</th><th>Class</th><th>Date</th><th>Description</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map(entry=> (
              <tr key={entry.id}>
                <td><span className={`badge badge-${entry.record_type==='income'?'green':'red'}`}>{entry.record_type}</span></td>
                <td>{entry.category}</td>
                <td style={{fontWeight:700}}>{fmtMoney(entry.amount)}</td>
                <td>{entry.studentName}</td>
                <td>{entry.className}</td>
                <td style={{fontSize:12,color:'var(--gray500)'}}>{fmtDate(entry.date)}</td>
                <td style={{fontSize:12,color:'var(--gray500)'}}>{entry.description || '—'}</td>
                <td><div style={{display:'flex',gap:6}}><button className="btn btn-secondary btn-sm" onClick={()=>openEdit(entry)}><FontAwesomeIcon icon={faEdit}/></button><button className="btn btn-danger btn-sm" onClick={()=>remove(entry.id)}><FontAwesomeIcon icon={faTrash}/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="empty-state"><div className="empty-state-icon"><FontAwesomeIcon icon={faWallet}/></div><h3>No financial records</h3><p>Create income or expense entries to track school funds.</p></div>}
      </div>

      {modal && (
        <Modal title={editing ? 'Edit Financial Entry' : 'New Financial Entry'} icon={faWallet} onClose={()=>{setModal(false);setEditing(null);setForm(BLANK_FINANCIAL);}} onSave={save}>
          <div className="form-row">
            <div className="form-group"><label>Type *</label><select value={form.record_type} onChange={F('record_type')}>{FINANCIAL_TYPES.map(type=><option key={type} value={type}>{type[0].toUpperCase()+type.slice(1)}</option>)}</select></div>
            <div className="form-group"><label>Category *</label><select value={form.category} onChange={F('category')}>{FINANCIAL_CATEGORIES.map(cat=><option key={cat} value={cat}>{cat}</option>)}</select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Amount *</label><input type="number" min="0" value={form.amount} onChange={F('amount')}/></div>
            <div className="form-group"><label>Date *</label><input type="date" value={form.date} onChange={F('date')}/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Student</label><select value={form.student_id} onChange={F('student_id')}><option value="">None</option>{students.map(s=><option key={s.id} value={s.id}>{s.name} — {s.class}</option>)}</select></div>
            <div className="form-group"><label>Term</label><input value={form.term} onChange={F('term')}/></div>
          </div>
          <div className="form-group"><label>Description</label><textarea value={form.description} onChange={F('description')} placeholder="Optional notes"/></div>
        </Modal>
      )}
    </div>
  );
}

function Contacts({contacts,onAdd,onEdit,onDelete}) {
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [search,setSearch]=useState('');
  const [filterRole,setFilterRole]=useState('');
  const [form,setForm]=useState(BLANK_CONTACT);
  const F=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  const filtered = contacts.filter(item => {
    const q=search.toLowerCase();
    return (!search || item.name?.toLowerCase().includes(q) || item.email?.toLowerCase().includes(q) || item.phone?.toLowerCase().includes(q) || item.relation?.toLowerCase().includes(q))
      &&(!filterRole||item.role===filterRole);
  });

  const openAdd = () => { setEditing(null); setForm(BLANK_CONTACT); setModal(true); };
  const openEdit = item => { setEditing(item.id); setForm({...item}); setModal(true); };
  const save = () => { if(!form.name||!form.role||!form.phone) return alert('Fill all required fields'); if(editing){onEdit(editing, form);} else {onAdd(form);} setModal(false); setForm(BLANK_CONTACT); setEditing(null);} ;
  const remove = id => { if(window.confirm('Delete this contact?')) onDelete(id); };

  return (
    <div className="anim-up">
      <div className="filter-bar">
        <div className="search-wrap"><FontAwesomeIcon icon={faSearch} className="search-icon"/><input placeholder="Search contacts…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <select className="filter-sel" value={filterRole} onChange={e=>setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          {CONTACT_ROLES.map(role=><option key={role} value={role}>{role}</option>)}
        </select>
        <span style={{marginLeft:'auto',fontSize:12,color:'var(--gray500)',fontWeight:600}}>{filtered.length} contacts</span>
        <button className="btn btn-primary btn-sm" onClick={openAdd}><FontAwesomeIcon icon={faPlus}/> Add Contact</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Relation</th><th>Phone</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(contact=>(
              <tr key={contact.id}>
                <td>{contact.name}</td>
                <td><span className="badge badge-blue">{contact.role}</span></td>
                <td>{contact.relation}</td>
                <td>{contact.phone}</td>
                <td>{contact.email || '—'}</td>
                <td><span className={`badge badge-${contact.status==='active'?'green':'gray'}`}>{contact.status}</span></td>
                <td><div style={{display:'flex',gap:6}}><button className="btn btn-secondary btn-sm" onClick={()=>openEdit(contact)}><FontAwesomeIcon icon={faEdit}/></button><button className="btn btn-danger btn-sm" onClick={()=>remove(contact.id)}><FontAwesomeIcon icon={faTrash}/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length&&<div className="empty-state"><div className="empty-state-icon"><FontAwesomeIcon icon={faAddressBook}/></div><h3>No contacts</h3><p>Add contacts to track parents, guardians and staff.</p></div>}
      </div>

      {modal && (
        <Modal title={editing ? 'Edit Contact' : 'Add Contact'} icon={faAddressBook} onClose={()=>{setModal(false);setEditing(null);setForm(BLANK_CONTACT);}} onSave={save}>
          <div className="form-row">
            <div className="form-group"><label>Name *</label><input value={form.name} onChange={F('name')}/></div>
            <div className="form-group"><label>Role *</label><select value={form.role} onChange={F('role')}>{CONTACT_ROLES.map(role=><option key={role} value={role}>{role}</option>)}</select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Relation</label><input value={form.relation} onChange={F('relation')}/></div>
            <div className="form-group"><label>Class</label><input value={form.class} onChange={F('class')}/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Phone *</label><input value={form.phone} onChange={F('phone')}/></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={F('email')}/></div>
          </div>
          <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={F('notes')} placeholder="Additional contact details"/></div>
          <div className="form-group"><label>Status</label><select value={form.status} onChange={F('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        </Modal>
      )}
    </div>
  );
}

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

CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'teacher',
  subject text,
  class text,
  phone text,
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
  days int,
  rate_per_day numeric,
  due_date date,
  paid_date date,
  status text DEFAULT 'pending',
  term text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE canteen (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  date date NOT NULL,
  meal_type text DEFAULT 'Lunch',
  rate_per_day numeric DEFAULT 10,
  notes text,
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
);

CREATE TABLE contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL,
  relation text,
  class text,
  phone text,
  email text,
  notes text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE financials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  record_type text NOT NULL,
  category text NOT NULL,
  student_id uuid REFERENCES students(id),
  class text,
  amount numeric NOT NULL,
  date date,
  term text,
  description text,
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
              ['Mode',IS_CONNECTED?'Live':'Disconnected'],['Curriculum','Ghana GES'],['Levels','Nursery · KG · Primary · JHS'],
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
// CANTEEN TRACKER
// ═══════════════════════════════════════════
function CanteenTracker({students,canteen,onAdd,onDelete,onGenerateFees}){
  const [date,setDate]=useState(dateToday());
  const [selected,setSelected]=useState({});
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [rate,setRate]=useState(10);
  const toggle=(id)=>setSelected(s=>({...s,[id]:!s[id]}));
  const markForDate=()=>{
    const toAdd = Object.keys(selected).filter(k=>selected[k]).map(student_id=>({student_id,date,notes:'canteen'}));
    toAdd.forEach(r=>onAdd(r));
    setSelected({});
  };
  const genFees=()=>{
    if(!from||!to) return alert('Select from and to dates');
    // compute days per student
    const start = new Date(from); const end = new Date(to);
    const daysMap = {};
    canteen.forEach(rec=>{
      const d=new Date(rec.date);
      if(d>=start && d<=end){ daysMap[rec.student_id] = (daysMap[rec.student_id]||0)+1; }
    });
    const batch = Object.keys(daysMap).map(student_id=>({student_id,days:daysMap[student_id],rate_per_day:rate,term:'Term 1 2026'}));
    onGenerateFees(batch);
  };
  return (
    <div className="anim-up">
      <div className="import-panel">
        <h3>Canteen Daily Tracking</h3>
        <div style={{display:'flex',gap:12,alignItems:'center',marginTop:8}}>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
          <button className="btn btn-primary btn-small" onClick={markForDate}><FontAwesomeIcon icon={faPlus}/> Mark Selected</button>
          <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
            <label style={{fontSize:13}}>Rate/day</label>
            <input type="number" value={rate} min="0" onChange={e=>setRate(e.target.value)} style={{width:90}}/>
          </div>
        </div>
        <div style={{marginTop:12}} className="canteen-grid">
          {students.filter(s=>s.status!=='inactive').map(s=>{
            const count = canteen.filter(c=>c.student_id===s.id).length;
            return (
              <div key={s.id} className="canteen-day">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <strong>{s.name}</strong><label><input type="checkbox" checked={!!selected[s.id]} onChange={()=>toggle(s.id)}/></label>
                </div>
                <div style={{fontSize:13,color:'var(--gray500)'}}>{s.class}</div>
                <div style={{marginTop:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontWeight:700}}>Days: {count}</div>
                  <div>
                    <button className="btn btn-secondary btn-small" onClick={()=>onDelete(s.id)}>Clear</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="import-preview" style={{marginTop:12,display:'flex',gap:12,alignItems:'center'}}>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <label>From</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/>
            <label>To</label><input type="date" value={to} onChange={e=>setTo(e.target.value)}/>
            <button className="btn btn-primary btn-small" onClick={genFees}><FontAwesomeIcon icon={faFileCsv}/> Generate Fees</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// IMPORT / EXPORT
// ═══════════════════════════════════════════
function ImportExport({students,fees,contacts,onImport,onUndo,lastImported}){
  const [table,setTable]=useState('students');
  const [preview,setPreview]=useState([]);
  const onFile = e=>{
    const f = e.target.files[0]; if(!f) return;
    Papa.parse(f, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => setPreview(results.data),
      error: (err) => alert('CSV parse error: '+err.message),
    });
  };
  const applyImport = ()=>{ if(!preview.length) return alert('No data to import'); onImport(table,preview); setPreview([]); };
  return (
    <div className="anim-up">
      <div className="import-panel">
        <h3>Import / Export</h3>
        <div style={{display:'flex',gap:12,alignItems:'center',marginTop:8}}>
          <select value={table} onChange={e=>setTable(e.target.value)}>
            <option value="students">Students</option>
            <option value="fees">Fees</option>
            <option value="contacts">Contacts</option>
          </select>
          <input type="file" accept=".csv,text/csv" onChange={onFile}/>
          <button className="btn btn-primary btn-small" onClick={applyImport}><FontAwesomeIcon icon={faFileCsv}/> Import</button>
        </div>
        {preview.length>0 && (
          <div className="import-preview">
            <div style={{fontSize:13,color:'var(--gray500)'}}>{preview.length} rows parsed — first row keys: {Object.keys(preview[0]).join(', ')}</div>
            <div style={{marginTop:8}}>
              <pre style={{maxHeight:160,overflow:'auto'}}>{JSON.stringify(preview.slice(0,10),null,2)}</pre>
            </div>
          </div>
        )}
        {lastImported && (
          <div style={{marginTop:12,display:'flex',alignItems:'center',gap:8}}>
            <div style={{fontSize:13,color:'var(--gray500)'}}>Last import: <strong>{lastImported.batchId}</strong> ({lastImported.ids.length} rows)</div>
            <button className="btn btn-secondary btn-small" onClick={()=>onUndo && onUndo(table,lastImported.batchId)}>Undo Import</button>
          </div>
        )}
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
  {id:'canteen',      label:'Canteen',      icon:faUtensils},
  {id:'financials',   label:'Income & Expenses', icon:faWallet},
  {id:'contacts',     label:'Contacts',     icon:faAddressBook},
  {id:'imports',      label:'Import/Export', icon:faFileImport},
  {id:'announcements',label:'Announcements',icon:faBullhorn},
  {id:'settings',     label:'Settings',     icon:faCog},
];
const NAV_TEACHER = [
  {id:'dashboard',    label:'Dashboard',    icon:faHome},
  {id:'attendance',   label:'Attendance',   icon:faCalendarCheck},
  {id:'grades',       label:'Grades',       icon:faChartBar},
  {id:'announcements',label:'Announcements',icon:faBullhorn},
];
const NAV_ACCOUNTANT = [
  {id:'dashboard',    label:'Dashboard',    icon:faHome},
  {id:'fees',         label:'Fees',         icon:faMoneyBillWave},
  {id:'canteen',      label:'Canteen',      icon:faUtensils},
  {id:'financials',   label:'Income & Expenses', icon:faWallet},
  {id:'contacts',     label:'Contacts',     icon:faAddressBook},
  {id:'imports',      label:'Import/Export', icon:faFileImport},
  {id:'announcements',label:'Announcements',icon:faBullhorn},
];

function AppShell({user,onLogout}) {
  const [page,setPage]           = useState('dashboard');
  const [lastImports,setLastImports] = useState({});
  const [sidebarOpen,setSidebar] = useState(false);
  const toast = useToast();
  const [showScrollTop,setShowScrollTop] = useState(false);
  const online = useOnline();
  const contentRef = useRef(null);

  const stu = useTable('students');
  const tch = useTable('teachers');
  const prof = useTable('profiles');
  const att = useTable('attendance');
  const grd = useTable('grades');
  const fee = useTable('fees');
  const canteen = useTable('canteen');
  const ann = useTable('announcements');
  const contacts = useTable('contacts');
  const financials = useTable('financials');

  const navItems = user.role==='admin' ? NAV_ADMIN : user.role==='accountant' ? NAV_ACCOUNTANT : NAV_TEACHER;
  const current  = navItems.find(n=>n.id===page)||navItems[0];

  const navigate = id => { setPage(id); setSidebar(false); };

  // Close sidebar on escape key
  useEffect(()=>{
    const h=e=>{ if(e.key==='Escape') setSidebar(false); };
    document.addEventListener('keydown',h);
    return ()=>document.removeEventListener('keydown',h);
  },[]);

  useEffect(()=>{
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollTop(el.scrollTop > 220);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [contentRef]);

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
              <p>{user.role==='admin'?'Administrator':user.role==='accountant'?'Accountant':'Teacher'} · {user.name}</p>
            </div>
          </div>
          <div className="topbar-right" style={{alignItems:'center'}}>
            <span style={{marginRight:12,fontSize:12,fontWeight:600,color:online?'var(--g700)':'var(--red)'}}>{online ? 'Online' : 'Offline'}</span>
            <button className="topbar-action" title="Notifications"><FontAwesomeIcon icon={faBell}/></button>
            <button className="btn btn-secondary btn-sm" onClick={onLogout}>
              <FontAwesomeIcon icon={faSignOutAlt}/> Sign Out
            </button>
          </div>
        </div>

        {!online && (
          <div className="alert alert-warning" style={{margin:'0 0 18px 0',display:'flex',alignItems:'center',gap:10}}>
            <FontAwesomeIcon icon={faInfoCircle}/>
            <span>Offline mode enabled. Changes will queue locally and sync when you are back online.</span>
          </div>
        )}

        <div className="content" ref={contentRef}>
          {page==='dashboard'    &&<Dashboard     user={user} students={stu.data} teachers={tch.data} attendance={att.data} grades={grd.data} fees={fee.data} announcements={ann.data} profiles={prof.data} contacts={contacts.data} financials={financials.data} onNavigate={navigate}/>}
          {page==='students'     &&<Students      students={stu.data} onAdd={stu.add} onEdit={stu.update} onDelete={stu.remove}/>}
          {page==='contacts'     &&<Contacts      contacts={contacts.data} onAdd={contacts.add} onEdit={contacts.update} onDelete={contacts.remove}/>}
          {page==='financials'   &&<Financials    user={user} students={stu.data} financials={financials.data} onAdd={financials.add} onUpdate={financials.update} onDelete={financials.remove}/>}
                  {page==='canteen'      &&<CanteenTracker students={stu.data} canteen={canteen.data} onAdd={canteen.add} onDelete={canteen.remove} onGenerateFees={(batch)=>{
                    // batch: [{student_id, days, rate_per_day, term}]
                    batch.forEach(b=>{
                      const payload = { student_id:b.student_id, fee_type:'Canteen', days:b.days, rate_per_day:b.rate_per_day, amount: String((Number(b.days)||0)*(Number(b.rate_per_day)||0)), term:b.term, status:'pending' };
                      fee.add(payload);
                    });
                    toast('Canteen fees generated','success');
                  }}/>} 
          {page==='imports' && (
            <ImportExport
              students={stu.data}
              fees={fee.data}
              contacts={contacts.data}
              lastImported={lastImports['students'] || lastImports['fees'] || lastImports['contacts']}
              onImport={async (table,rows)=>{
                const batchId = `import-${Date.now()}`;
                const ids = [];
                for (const r of rows) {
                  const payload = { ...r, import_batch_id: batchId, created_at: new Date().toISOString() };
                  if (table==='students') {
                    const created = await stu.add(payload);
                    if (created) ids.push(created.id || created);
                  }
                  if (table==='fees') {
                    const created = await fee.add(payload);
                    if (created) ids.push(created.id || created);
                  }
                  if (table==='contacts') {
                    const created = await contacts.add(payload);
                    if (created) ids.push(created.id || created);
                  }
                }
                setLastImports(prev=>({...prev,[table]:{batchId,ids}}));
                toast(`${rows.length} rows imported into ${table}`,'success');
              }}
              onUndo={async (table,batchId)=>{
                const entry = lastImports[table];
                if (!entry || entry.batchId !== batchId) return toast('Nothing to undo','info');
                const ids = entry.ids || [];
                for (const id of ids) {
                  await (table==='students' ? stu.remove(id) : table==='fees' ? fee.remove(id) : contacts.remove(id));
                }
                setLastImports(prev=>{ const copy={...prev}; delete copy[table]; return copy; });
                toast('Import undone','success');
              }}
            />
          )}

          {page==='teachers'     &&<Teachers      teachers={tch.data} onAdd={tch.add} onEdit={tch.update} onDelete={tch.remove}/>}
          {page==='attendance'   &&<Attendance    user={user} students={stu.data} attendance={att.data} onRecord={att.upsertAtt}/>}
          {page==='grades'       &&<Grades        user={user} students={stu.data} grades={grd.data} onAdd={grd.add} onDelete={grd.remove}/>}
          {page==='fees'         &&<Fees          students={stu.data} fees={fee.data} onAdd={fee.add} onUpdate={fee.update} onDelete={fee.remove}/>}
          {page==='announcements'&&<Announcements user={user} announcements={ann.data} onAdd={ann.add} onDelete={ann.remove}/>}
          {page==='settings'     &&<Settings/>}
          </div>
          <button className={`scroll-top${showScrollTop ? ' show' : ''}`} onClick={()=>contentRef.current?.scrollTo({top:0,behavior:'smooth'})} title="Scroll to top">
            <FontAwesomeIcon icon={faArrowUp}/>
          </button>
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
  const [online,setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin  = u => { setUser(u); setPage('app'); };
  const handleLogout = () => { setUser(null); setPage('welcome'); };

  return (
    <ToastProvider>
      <OnlineCtx.Provider value={online}>
        {page==='welcome'  && <WelcomePage  onLogin={()=>setPage('login')} onRegister={()=>setPage('register')}/>}
        {page==='login'    && <LoginPage    onLogin={handleLogin} onRegister={()=>setPage('register')} onBack={()=>setPage('welcome')}/>}
        {page==='register' && <RegisterPage onBack={()=>setPage('login')}/>}
        {page==='app' && user && <AppShell user={user} onLogout={handleLogout}/>}
      </OnlineCtx.Provider>
    </ToastProvider>
  );
}

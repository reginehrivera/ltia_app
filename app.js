// ─── STATE ────────────────────────────────────────────────────────────────────
let state = {
  page: 'dashboard',
  cases: [], schedules: [],
  searchQuery: '',
  filterYear: String(new Date().getFullYear()),
  filterStatus: '',
  filterStatCard: null,
  filters: { cases: { year: '', status: '' } },
  wizard: null,
  schedWizard: null,
  schedulesModalOpen: false,
  schedModalView: 'list', // 'list' or 'form'
  schedModalFormData: null,
  kpFormsData: null,
  kpFormsReturnCaseId: null,
  importRows: [], importHeaders: [],
  selectedCases: new Set(),
  reportYear: String(new Date().getFullYear()),
  calPopup: null,
  calViewYear: new Date().getFullYear(),
  calViewMonth: new Date().getMonth(),
  archiveModal: null,
  kpRecordCaseId: null,
  viewCasePage: null,
  form7ModalOpen: false,
  dashPage: 1
};

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const NATURE_OF_CASE = ['Civil','Criminal'];
const CASE_STATUSES = ['Ongoing','CFA','Settled'];
const DEFAULT_CASE_TITLES = ['Collection of Sum of Money','Failure to Turnover Sale Proceed','Misunderstanding','Neglect of Responsibility','Oral Defamation','Serious Physical Injury','Slight Physical Injury','Theft','Unjust Vexation'];
const DEFAULT_ACTION_TAKEN = ['Mediation','Conciliation'];
function getCaseTitles(){try{const s=localStorage.getItem(_k('ltia_case_titles'));return s?JSON.parse(s):DEFAULT_CASE_TITLES;}catch(e){return DEFAULT_CASE_TITLES;}}
function getActionTaken(){try{const s=localStorage.getItem(_k('ltia_action_taken'));return s?JSON.parse(s):DEFAULT_ACTION_TAKEN;}catch(e){return DEFAULT_ACTION_TAKEN;}}
function saveCaseTitles(arr){try{localStorage.setItem(_k('ltia_case_titles'),JSON.stringify(arr));}catch(e){}}
function saveActionTaken(arr){try{localStorage.setItem(_k('ltia_action_taken'),JSON.stringify(arr));}catch(e){}}
const TIME_SLOTS    = ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM'];
const LUPON_MEMBERS = ['Kagawad A. Cruz','Kagawad B. Santos','Kagawad C. Reyes','Kagawad D. Garcia','Kagawad E. Lopez','Kagawad F. Dela Cruz'];
const PAGES = [
  { id:'dashboard',  icon:'<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',  label:'Dashboard' },
  { id:'schedules',  icon:'<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>',  label:'New Case', modal:true },
  { id:'report',     icon:'<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',  label:'Reports' },
];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─── STORAGE ─────────────────────────────────────────────────────────────────
// Returns a per-user storage key prefix so each account has isolated data
function _uid(){
  try{
    const s=sessionStorage.getItem('lcms_session');
    if(s){ const u=JSON.parse(s); return u&&u.id?('u_'+u.id+'_'):'shared_'; }
  }catch(e){}
  return 'shared_';
}
function _k(key){ return _uid()+key; } // namespaced key

function loadData() {
  try {
    const c=localStorage.getItem(_k('ltia_cases')); if(c) state.cases=JSON.parse(c);
    const s=localStorage.getItem(_k('ltia_schedules')); if(s) state.schedules=JSON.parse(s);
  } catch(e){}
  // Purge orphaned schedules — any schedule whose case no longer exists
  const caseIds=new Set(state.cases.map(x=>x.id));
  const caseNos=new Set(state.cases.map(x=>x.caseNo).filter(Boolean));
  const before=state.schedules.length;
  state.schedules=state.schedules.filter(s=>caseIds.has(s._caseId)||caseNos.has(s.caseNo));
  if(state.schedules.length!==before) saveData('ltia_schedules',state.schedules);
  render();
}
function saveData(k,d) { try{localStorage.setItem(_k(k),JSON.stringify(d));}catch(e){} }
function genId() { return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

// ─── TOAST NOTIFICATIONS ─────────────────────────────────────────────────────
function showToast(msg, type='success', duration=3000){
  let wrap=document.getElementById('toast-wrap');
  if(!wrap){
    wrap=document.createElement('div');
    wrap.id='toast-wrap';
    wrap.style.cssText='position:fixed;bottom:28px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none';
    document.body.appendChild(wrap);
  }
  const id='toast-'+genId();
  const colors={success:{bg:'#0d3d3a',icon:'✅'},error:{bg:'#b93232',icon:'❌'},info:{bg:'#0d3d3a',icon:'ℹ️'},warning:{bg:'#9a6200',icon:'⚠️'}};
  const c=colors[type]||colors.success;
  const el=document.createElement('div');
  el.id=id;
  el.style.cssText=`background:${c.bg};color:#fff;padding:11px 22px;border-radius:10px;font-size:13px;font-weight:600;box-shadow:0 6px 24px rgba(0,0,0,0.22);display:flex;align-items:center;gap:9px;pointer-events:auto;opacity:0;transform:translateY(12px);transition:opacity 0.22s,transform 0.22s;max-width:90vw`;
  el.innerHTML=`<span style="font-size:16px">${c.icon}</span><span>${msg}</span>`;
  wrap.appendChild(el);
  requestAnimationFrame(()=>{el.style.opacity='1';el.style.transform='translateY(0)';});
  setTimeout(()=>{el.style.opacity='0';el.style.transform='translateY(12px)';setTimeout(()=>el.remove(),300);},duration);
}

// ─── CUSTOM CONFIRM MODAL ────────────────────────────────────────────────────
function showConfirm(title, msg, onConfirm, confirmLabel='Delete', confirmColor='#b93232'){
  const existing=document.getElementById('confirm-modal-root');
  if(existing)existing.remove();
  const html=`<div id="confirm-modal-root" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:800;display:flex;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:14px;width:400px;max-width:94vw;box-shadow:0 16px 50px rgba(0,0,0,0.22);overflow:hidden">
      <div style="padding:20px 22px 14px;border-bottom:1px solid #f0f0f0">
        <div style="font-size:15px;font-weight:700;color:#0d2137;margin-bottom:6px">⚠️ ${title}</div>
        <div style="font-size:13px;color:#5c6370;line-height:1.55">${msg}</div>
      </div>
      <div style="padding:14px 22px;display:flex;gap:10px;justify-content:flex-end;background:#f9fafb">
        <button onclick="document.getElementById('confirm-modal-root').remove()" style="padding:8px 18px;border-radius:8px;background:#fff;border:1px solid #ddd;font-size:13px;font-weight:500;cursor:pointer;color:#6b7280">Cancel</button>
        <button id="confirm-modal-ok" style="padding:8px 20px;border-radius:8px;background:${confirmColor};color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer">${confirmLabel}</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html);
  document.getElementById('confirm-modal-ok').onclick=()=>{
    document.getElementById('confirm-modal-root').remove();
    onConfirm();
  };
}

function genCaseNo(yr, mo) {
  const now = new Date();
  yr = yr || now.getFullYear();
  mo = mo || (now.getMonth() + 1);
  const mm = String(mo).padStart(2, '0');
  // Sequential number counts ALL cases filed in the same year (regardless of month)
  const existing = state.cases.filter(c => (c.caseNo||'').split('-')[1] === String(yr));
  let maxNum = 0;
  existing.forEach(c => { const parts=c.caseNo.split('-'); const n=parseInt(parts[parts.length-1]||'0'); if(n>maxNum)maxNum=n; });
  return `${mm}-${yr}-${String(maxNum+1).padStart(2,'0')}`;
}
function wizSyncCaseNoFromDate(){
  const df=document.getElementById('w_dateFiled');
  const cn=document.getElementById('w_caseNo');
  if(!df||!cn||!state.wizard)return;
  const dateVal=df.value;
  if(!dateVal)return;
  const dateParts=dateVal.split('-');
  const yr=parseInt(dateParts[0]);
  const mo=parseInt(dateParts[1]||'1');
  if(!yr||isNaN(yr))return;
  const mm=String(mo).padStart(2,'0');
  // Auto-update if month or year changed in the case number
  const current=cn.value||'';
  const parts=current.split('-');
  const cnoMo=parts.length>=1?parseInt(parts[0]):null;
  const cnoYr=parts.length>=2?parseInt(parts[1]):null;
  if(cnoYr!==yr||cnoMo!==mo){
    // Re-generate with new month/year
    // If editing an existing case, keep the sequential number but update month+year
    if(state.wizard.editId){
      const num=parts[2]||'01';
      cn.value=`${mm}-${yr}-${num}`;
    } else {
      cn.value=genCaseNo(yr,mo);
    }
    state.wizard.data.caseNo=cn.value;
    state.wizard.data.dateFiled=dateVal;
    wizAutoSave();
  }
}
function f7SyncCaseNo(isEdit){
  const dfEl=document.getElementById('f7_dateFiled');
  const cnEl=document.getElementById('f7_caseNo');
  if(!dfEl||!cnEl)return;
  const dateVal=dfEl.value;
  if(!dateVal)return;
  const parts=dateVal.split('-');
  const yr=parseInt(parts[0]);
  const mo=parseInt(parts[1]||'1');
  if(!yr||isNaN(yr)||!mo||isNaN(mo))return;
  const mm=String(mo).padStart(2,'0');
  const current=cnEl.value||'';
  const cParts=current.split('-');
  const cMo=parseInt(cParts[0]);
  const cYr=parseInt(cParts[1]);
  if(cMo!==mo||cYr!==yr){
    if(isEdit){
      // Keep the existing sequential number — only update month + year
      const num=cParts[2]||'01';
      cnEl.value=`${mm}-${yr}-${num}`;
    } else {
      // New case — generate correct sequential number for this month/year
      cnEl.value=genCaseNo(yr,mo);
    }
  }
}
function todayStr() {
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatTime12(t){
  if(!t||t==='—')return t||'';
  if(/am|pm/i.test(t))return t;
  const m=t.match(/^(\d{1,2}):(\d{2})/);
  if(!m)return t;
  let h=parseInt(m[1]),min=m[2],ampm='AM';
  if(h===0){h=12;}else if(h===12){ampm='PM';}else if(h>12){h-=12;ampm='PM';}
  return `${h}:${min} ${ampm}`;
}
// Format YYYY-MM-DD → MM-DD-YYYY for table display
function formatDate(d){
  if(!d||d==='—')return d||'—';
  const parts=d.split('-');
  if(parts.length!==3)return d;
  const dt=new Date(d+'T00:00:00');
  if(isNaN(dt))return d;
  return dt.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'2-digit'});
}
function fmtDateWords(d){
  if(!d)return '—';
  const parts=(d||'').split('-');
  if(parts.length!==3)return d||'—';
  const dt=new Date(d+'T00:00:00');
  if(isNaN(dt))return d;
  return dt.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'2-digit'});
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
function setPage(p) { state.page=p; state.searchQuery=''; state.selectedCases.clear(); state.kpRecordCaseId=null; state.viewCasePage=null; render(); }
function setGlobalSearch(v){
  state.searchQuery=v;
  const btn=document.getElementById('global-search-clear');
  if(btn) btn.style.display=v?'block':'none';
  render();
  // Re-focus and restore cursor after render
  const inp=document.getElementById('global-search-input');
  if(inp&&document.activeElement!==inp){inp.focus();inp.setSelectionRange(v.length,v.length);}
}
function clearGlobalSearch(){
  state.searchQuery='';
  const inp=document.getElementById('global-search-input');
  if(inp){inp.value='';inp.focus();}
  const btn=document.getElementById('global-search-clear');
  if(btn) btn.style.display='none';
  render();
}
function g(id) { const el=document.getElementById(id); return el?el.value.trim():''; }
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function selectOpts(opts,val) { return opts.map(o=>`<option value="${o}"${o===val?' selected':''}>${o}</option>`).join(''); }
function statusBadge(s) {
  const map={'Settled':'badge-green','Ongoing':'badge-amber','CFA':'badge-purple'};
  return `<span class="badge ${map[s]||'badge-gray'}">${s||'—'}</span>`;
}
function renderNav() {
  document.getElementById('nav').innerHTML = PAGES.map(p=>`
    <div class="nav-item${p.modal?(state.form7ModalOpen?' active':''):(state.page===p.id?' active':'')}" onclick="${p.modal?`openSchedulesModalForm()`:`setPage('${p.id}')`}">
      <span class="nav-icon">${p.icon}</span><span>${p.label}</span>
    </div>`).join('')+`
    <div class="nav-section">Tools</div>
    <div class="nav-export-wrap">
      <div class="nav-item" onclick="toggleExportYearDropdown(event)" id="nav-export-excel-btn">
        <span class="nav-icon"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span>
        <span>Export Excel</span>
        <span class="nav-export-arrow" id="nav-export-arrow"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
      </div>
      <div class="nav-year-dropdown" id="nav-year-dropdown"></div>
    </div>`;
}
function exportJSON() {
  const blob=new Blob([JSON.stringify({cases:state.cases,schedules:state.schedules,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ltia_data.json';a.click();
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function settledDate(c) { return c.dateResolved || c.dateFiled || ''; }

// ─── SUBMISSION TO COURT (10 days after settlement) ──────────────────────────
// ─── COURT SUBMISSION WORKFLOW ────────────────────────────────────────────────
// Phases stored on each case (c._courtPhase):
//   null          — not yet reached 10 days
//   'ready'       — 10 days passed, notification shown, waiting for user "Got it"
//   'notified'    — user acknowledged 10-day notification; 2-day finalization starts
//   'submitted'   — user confirmed case was submitted to court ✅
//   'not_submitted'— user said No on the 12-day confirmation
//
// c._courtNotifDate      — date user clicked "Got it" on 10-day notification
// c._courtSubmitted      — true/false after user answers Yes/No at 12-day
// c._courtSubmittedDate  — date of user confirmation
// c._courtFinalShown     — date the day-15 final reminder was shown

function isSettledCase(c){
  return c.status==='Settled'
    || (c._medSessions||[]).some(s=>s.outcome==='settled')
    || (c._concSessions||[]).some(s=>s.outcome==='settled');
}
function getSettledDate(c){ return c.dateResolved || ''; }
function daysSinceSettled(c){
  const sd = getSettledDate(c); if(!sd) return null;
  return Math.round((new Date(todayStr()+'T00:00:00') - new Date(sd+'T00:00:00')) / 86400000);
}
function getSubmissionDeadline(c) {
  if(!isSettledCase(c)) return null;
  const settled = getSettledDate(c); if(!settled) return null;
  const d = new Date(settled+'T00:00:00'); d.setDate(d.getDate()+10);
  return d.toISOString().slice(0,10);
}
function getFinalizationDeadline(c) {
  if(!isSettledCase(c)) return null;
  const settled = getSettledDate(c); if(!settled) return null;
  const d = new Date(settled+'T00:00:00'); d.setDate(d.getDate()+12);
  return d.toISOString().slice(0,10);
}
function submissionDeadlineStatus(c) {
  const dl = getSubmissionDeadline(c); if(!dl) return null;
  const today = todayStr();
  const daysLeft = Math.round((new Date(dl+'T00:00:00') - new Date(today+'T00:00:00')) / 86400000);
  const finDl = getFinalizationDeadline(c);
  const finDaysLeft = finDl ? Math.round((new Date(finDl+'T00:00:00') - new Date(today+'T00:00:00')) / 86400000) : null;
  const days = daysSinceSettled(c);
  const phase = c._courtPhase || null;
  const userConfirmed = c._courtSubmitted === true;
  const userDeclined  = c._courtSubmitted === false;
  return {
    deadline: dl, daysLeft, overdue: daysLeft < 0, dueToday: daysLeft === 0,
    finalizationDeadline: finDl, finDaysLeft,
    submittedToCourt: daysLeft < 0,
    inFinalization: daysLeft < 0 && finDaysLeft !== null && finDaysLeft >= 0,
    finalized: finDaysLeft !== null && finDaysLeft < 0,
    daysSince: days, phase, userConfirmed, userDeclined
  };
}

// ── Show the 10-day "Ready to Submit" notification (user must click Got It) ──
function showCourtReadyNotif(caseId){
  if(document.getElementById('court-ready-modal')) return;
  const c = state.cases.find(x=>x.id===caseId); if(!c) return;
  const sd = getSettledDate(c);
  const sdFmt = sd ? new Date(sd+'T00:00:00').toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'}) : '—';
  const dl = getSubmissionDeadline(c);
  const dlFmt = dl ? new Date(dl+'T00:00:00').toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'}) : '—';
  const html = `<div id="court-ready-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:3000;display:flex;align-items:center;justify-content:center;animation:cpm-pop 0.2s ease">
  <style>@keyframes cpm-pop{from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}</style>
  <div style="background:#fff;border-radius:16px;width:460px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.28);overflow:hidden">
    <div style="background:linear-gradient(135deg,#0d3d3a,#2563eb);padding:18px 22px;display:flex;align-items:center;gap:12px">
      <div style="width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">⚖️</div>
      <div style="flex:1">
        <div style="font-size:15px;font-weight:700;color:#fff">Court Submission Ready</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.75);margin-top:2px">${escHtml(c.caseNo||'')} — 10 days since settlement</div>
      </div>
      <button onclick="document.getElementById('court-ready-modal').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:28px;height:28px;border-radius:50%;font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center">×</button>
    </div>
    <div style="padding:22px 24px">
      <div style="display:flex;gap:12px;margin-bottom:16px">
        <div style="width:40px;height:40px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">📋</div>
        <div>
          <div style="font-size:14px;font-weight:700;color:#0d2137;margin-bottom:4px">10-day settlement period has lapsed</div>
          <div style="font-size:13px;color:#374151;line-height:1.6">Case <strong>${escHtml(c.caseNo||'')}</strong> — <em>${escHtml((c.complainant||'').toUpperCase())} vs ${escHtml((c.respondent||'').toUpperCase())}</em> — is now due for submission to court.</div>
        </div>
      </div>
      <div style="background:#eff6ff;border:1px solid #6dd4da;border-radius:10px;padding:12px 14px;font-size:12px;color:#1d4ed8;margin-bottom:4px">
        <div style="font-weight:700;margin-bottom:5px">📅 Timeline</div>
        <div>Settlement date: <strong>${sdFmt}</strong></div>
        <div style="margin-top:3px">Court submission deadline: <strong>${dlFmt}</strong></div>
        <div style="margin-top:3px;color:#6b7280">After acknowledgment, a 2-day finalization window begins. You will be asked to confirm if the case was submitted to court.</div>
      </div>
    </div>
    <div style="padding:12px 24px 18px;display:flex;justify-content:flex-end">
      <button onclick="courtReadyGotIt('${caseId}')" style="padding:10px 28px;border-radius:9px;background:#0d3d3a;color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer" onmouseover="this.style.background='#0a5055'" onmouseout="this.style.background='#0d3d3a'">Got it — I understand</button>
    </div>
  </div></div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}
function courtReadyGotIt(caseId){
  const c = state.cases.find(x=>x.id===caseId); if(!c) return;
  c._courtPhase = 'notified';
  c._courtNotifDate = todayStr();
  saveData('ltia_cases', state.cases);
  document.getElementById('court-ready-modal').remove();
  showToast('Court submission noted. You will be reminded again in 2 days to confirm submission.','info',5000);
}

// ── Show the 12-day "Was it submitted?" confirmation modal ──
function showCourtConfirmNotif(caseId){
  if(document.getElementById('court-confirm-modal')) return;
  const c = state.cases.find(x=>x.id===caseId); if(!c) return;
  const sd = getSettledDate(c);
  const finDl = getFinalizationDeadline(c);
  const finDlFmt = finDl ? new Date(finDl+'T00:00:00').toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'}) : '—';
  const html = `<div id="court-confirm-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:3000;display:flex;align-items:center;justify-content:center;animation:cpm-pop 0.2s ease">
  <div style="background:#fff;border-radius:16px;width:460px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.28);overflow:hidden">
    <div style="background:linear-gradient(135deg,#065f46,#16a34a);padding:18px 22px;display:flex;align-items:center;gap:12px">
      <div style="width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">🏛️</div>
      <div style="flex:1">
        <div style="font-size:15px;font-weight:700;color:#fff">Finalization Confirmation</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.75);margin-top:2px">${escHtml(c.caseNo||'')} — 12 days since settlement</div>
      </div>
    </div>
    <div style="padding:22px 24px">
      <div style="display:flex;gap:12px;margin-bottom:16px">
        <div style="width:40px;height:40px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">✅</div>
        <div>
          <div style="font-size:14px;font-weight:700;color:#0d2137;margin-bottom:4px">Has this case been submitted to court?</div>
          <div style="font-size:13px;color:#374151;line-height:1.6">The 2-day finalization period for <strong>${escHtml(c.caseNo||'')}</strong> has ended. Please confirm whether this case has been officially submitted to court.</div>
        </div>
      </div>
      <div style="background:#f0fdf4;border:1px solid #6ee7b7;border-radius:10px;padding:11px 13px;font-size:12px;color:#15803d">
        <div style="font-weight:700;margin-bottom:3px">📅 Finalization Deadline: ${finDlFmt}</div>
        <div style="color:#6b7280">Settlement date: ${sd || '—'} · Case: ${escHtml((c.complainant||'').toUpperCase())} vs ${escHtml((c.respondent||'').toUpperCase())}</div>
      </div>
    </div>
    <div style="padding:12px 24px 18px;display:flex;justify-content:flex-end;gap:10px">
      <button onclick="courtConfirmAnswer('${caseId}',false)" style="padding:10px 24px;border-radius:9px;background:#fff;border:1.5px solid #d1d5db;color:#374151;font-size:13px;font-weight:700;cursor:pointer" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='#fff'">No, not yet</button>
      <button onclick="courtConfirmAnswer('${caseId}',true)" style="padding:10px 24px;border-radius:9px;background:#16a34a;color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'">Yes, submitted ✅</button>
    </div>
  </div></div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}
function courtConfirmAnswer(caseId, submitted){
  const c = state.cases.find(x=>x.id===caseId); if(!c) return;
  c._courtPhase = submitted ? 'submitted' : 'not_submitted';
  c._courtSubmitted = submitted;
  c._courtSubmittedDate = todayStr();
  saveData('ltia_cases', state.cases);
  const modal = document.getElementById('court-confirm-modal');
  if(modal) modal.remove();
  if(submitted){
    showToast('Case marked as submitted to court!','success',5000);
    render();
  } else {
    showToast('Noted. Please follow up on court submission.','warning',4000);
  }
}

// ── Show the day-15 final reminder modal (for unanswered cases) ──
function showCourtFinalReminder(caseId){
  if(document.getElementById('court-final-modal')) return;
  const c = state.cases.find(x=>x.id===caseId); if(!c) return;
  const sd = getSettledDate(c);
  const html = `<div id="court-final-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:3100;display:flex;align-items:center;justify-content:center;animation:cpm-pop 0.2s ease">
  <div style="background:#fff;border-radius:16px;width:480px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.32);overflow:hidden">
    <div style="background:linear-gradient(135deg,#b45309,#d97706);padding:18px 22px;display:flex;align-items:center;gap:12px">
      <div style="width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">⏰</div>
      <div style="flex:1">
        <div style="font-size:15px;font-weight:700;color:#fff">Final Reminder — Day 15</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.8);margin-top:2px">${escHtml(c.caseNo||'')} — Action required</div>
      </div>
    </div>
    <div style="padding:22px 24px">
      <div style="display:flex;gap:12px;margin-bottom:16px">
        <div style="width:40px;height:40px;border-radius:50%;background:#d4f1f1;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">⚠️</div>
        <div>
          <div style="font-size:14px;font-weight:700;color:#0d3d3a;margin-bottom:4px">Court submission status unconfirmed</div>
          <div style="font-size:13px;color:#374151;line-height:1.6">It has been <strong>15 days</strong> since case <strong>${escHtml(c.caseNo||'')}</strong> was settled (${sd||'—'}). You have not yet confirmed whether this case was submitted to court.</div>
        </div>
      </div>
      <div style="background:#e8f6f7;border:1.5px solid #14919b;border-radius:10px;padding:12px 14px;font-size:12px;color:#0d3d3a;margin-bottom:4px">
        <div style="font-weight:700;margin-bottom:3px">⚠️ This is the final reminder</div>
        <div>Please confirm the court submission status for: <strong>${escHtml((c.complainant||'').toUpperCase())} vs ${escHtml((c.respondent||'').toUpperCase())}</strong></div>
        <div style="margin-top:3px;color:#b45309">You can also update this from the case detail page at any time.</div>
      </div>
    </div>
    <div style="padding:12px 24px 18px;display:flex;justify-content:space-between;align-items:center;gap:10px">
      <button onclick="document.getElementById('court-final-modal').remove();viewCase('${caseId}')" style="padding:10px 18px;border-radius:9px;background:#0d3d3a;color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer">Open Case Details</button>
      <div style="display:flex;gap:8px">
        <button onclick="courtFinalAnswer('${caseId}',false)" style="padding:10px 20px;border-radius:9px;background:#fff;border:1.5px solid #d1d5db;color:#374151;font-size:13px;font-weight:700;cursor:pointer">No</button>
        <button onclick="courtFinalAnswer('${caseId}',true)" style="padding:10px 24px;border-radius:9px;background:#16a34a;color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer">Yes, submitted ✅</button>
      </div>
    </div>
  </div></div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  // Mark that final reminder was shown today
  const c2 = state.cases.find(x=>x.id===caseId);
  if(c2){ c2._courtFinalShown = todayStr(); saveData('ltia_cases', state.cases); }
}
function courtFinalAnswer(caseId, submitted){
  const c = state.cases.find(x=>x.id===caseId); if(!c) return;
  c._courtPhase = submitted ? 'submitted' : 'not_submitted';
  c._courtSubmitted = submitted;
  c._courtSubmittedDate = todayStr();
  saveData('ltia_cases', state.cases);
  const modal = document.getElementById('court-final-modal');
  if(modal) modal.remove();
  if(submitted){
    showToast('Case marked as submitted to court!','success',5000);
    render();
  } else {
    showToast('Status noted. Please follow up on submission.','warning',4000);
  }
}

// ── Check all settled cases for pending court notifications (runs on dashboard) ──
function checkCourtSubmissionNotifs(){
  const today = todayStr();
  // Only check cases not yet confirmed
  const pending = state.cases.filter(c=>{
    if(!isSettledCase(c)) return false;
    if(c._courtPhase==='submitted') return false; // already done
    const days = daysSinceSettled(c); if(days===null) return false;
    return days >= 10;
  });
  if(!pending.length) return;
  // Process one at a time to avoid modal stacking
  for(const c of pending){
    const days = daysSinceSettled(c);
    const phase = c._courtPhase || null;
    // Day 15+ final reminder (only if still not answered, show once per day)
    if(days >= 15 && phase !== 'not_submitted'){
      if(c._courtFinalShown !== today){
        setTimeout(()=>showCourtFinalReminder(c.id), 500);
        return;
      }
    }
    // Day 12+: show confirmation modal (only if user already clicked "Got it" at day 10)
    if(days >= 12 && phase === 'notified'){
      setTimeout(()=>showCourtConfirmNotif(c.id), 500);
      return;
    }
    // Day 10-11: show "ready" notification (only if not yet notified)
    if(days >= 10 && !phase){
      setTimeout(()=>showCourtReadyNotif(c.id), 500);
      return;
    }
  }
}

// Returns live current year/month from real clock
function nowYm(){ const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; }
function nowYear(){ return String(new Date().getFullYear()); }
function nowMonthName(){ return MONTHS[new Date().getMonth()]; }

// Sync filterYear to real current year when actual year rolls over
function syncRealTimeYear(){
  const realYear=nowYear();
  if(!state._lastRealYear) state._lastRealYear=realYear;
  if(state._lastRealYear!==realYear){
    if(state.filterYear===state._lastRealYear) state.filterYear=realYear;
    state._lastRealYear=realYear;
    render();
  }
}
setInterval(syncRealTimeYear, 60000);

// Build year list: only years that have at least one case, plus the real current year
function getYearList(){
  const realYr=parseInt(nowYear());
  const caseYears=state.cases.map(c=>{
    // Try dateFiled/dateResolved first, then fall back to caseNo (MM-YYYY-NN)
    const fromDate=parseInt((c.dateFiled||c.dateResolved||'').slice(0,4));
    const fromCaseNo=parseInt((c.caseNo||'').split('-')[1]||'');
    return !isNaN(fromDate)&&fromDate>1989 ? fromDate : (!isNaN(fromCaseNo)&&fromCaseNo>1989 ? fromCaseNo : NaN);
  }).filter(y=>!isNaN(y));
  // Only include years that actually have cases, plus the current real year
  const yearSet=new Set([realYr, ...caseYears]);
  const years=[...yearSet].sort((a,b)=>b-a);
  return years.map(String);
}

function getStats() {
  const ym=nowYm();
  const yr=state.filterYear;
  return {
    ongoing: state.cases.filter(c=>c.status==='Ongoing').length,
    month:   state.cases.filter(c=>c.status==='Settled'&&settledDate(c).startsWith(ym)).length,
    year:    yr
      ? state.cases.filter(c=>c.status==='Settled'&&settledDate(c).startsWith(yr)).length
      : state.cases.filter(c=>c.status==='Settled').length,
    total:   state.cases.filter(c=>c.status==='Settled').length
  };
}
function getFilteredCases() {
  const yr=state.filterYear, st=state.filterStatus, sf=state.filterStatCard;
  const ym=nowYm();
  let list=state.cases;
  if(sf==='ongoing')     list=list.filter(c=>c.status==='Ongoing');
  else if(sf==='month')  list=list.filter(c=>c.status==='Settled'&&settledDate(c).startsWith(ym));
  else if(sf==='year')   list=yr
    ? list.filter(c=>c.status==='Settled'&&settledDate(c).startsWith(yr))
    : list.filter(c=>c.status==='Settled');
  else if(sf==='total')  list=list.filter(c=>c.status==='Settled');
  else {
    if(yr) list=list.filter(c=>{
      // Extract year from dateFiled, dateResolved, or the caseNo (format MM-YYYY-NN)
      const caseNoYr=(c.caseNo||'').split('-')[1]||'';
      return (c.dateFiled||'').startsWith(yr)
        ||(c.dateResolved||'').startsWith(yr)
        ||(caseNoYr===yr);
    });
    if(st) list=list.filter(c=>c.status===st);
  }
  return list;
}
function setFilterYear(y){state.filterYear=y;state.filterStatCard=null;state.dashPage=1;render();}
function setFilterStatus(s){state.filterStatus=s;state.filterStatCard=null;state.dashPage=1;render();}
function setStatCardFilter(f){state.filterStatCard=state.filterStatCard===f?null:f;state.dashPage=1;render();}
function clearAllFilters(){state.filterYear=nowYear();state.filterStatus='';state.filterStatCard=null;state.dashPage=1;render();}

function renderDashboard() {
  const stats=getStats(), allCases=getFilteredCases(), sf=state.filterStatCard;
  const ROWS_PER_PAGE=10;
  const totalPages=Math.max(1,Math.ceil(allCases.length/ROWS_PER_PAGE));
  if(state.dashPage<1)state.dashPage=1;
  if(state.dashPage>totalPages)state.dashPage=totalPages;
  const pageStart=(state.dashPage-1)*ROWS_PER_PAGE;
  const cases=[...allCases].reverse().slice(pageStart, pageStart+ROWS_PER_PAGE);
  const years=getYearList();
  const hasFilters=state.filterStatus||state.filterStatCard;
  let filterDesc='';
  if(sf==='ongoing') filterDesc='Showing Ongoing complaints';
  else if(sf==='month') filterDesc=`Showing complaints settled in ${nowMonthName()} ${nowYear()}`;
  else if(sf==='year') filterDesc=`Showing complaints settled in ${state.filterYear}`;
  else if(sf==='total') filterDesc='Showing all settled complaints';
  // Court submission pending alert banner
  const today = todayStr();
  const pendingCourtCases = state.cases.filter(c=>{
    if(!isSettledCase(c)) return false;
    if(c._courtPhase==='submitted') return false;
    const days = daysSinceSettled(c); if(days===null||days<10) return false;
    return true;
  });
  const courtBanner = pendingCourtCases.length ? (()=>{
    const urgent = pendingCourtCases.filter(c=>daysSinceSettled(c)>=15);
    const bg = urgent.length ? '#fffbeb' : '#eff6ff';
    const border = urgent.length ? '#14919b' : '#6dd4da';
    const color = urgent.length ? '#0d3d3a' : '#1d4ed8';
    const icon = urgent.length ? '⏰' : '⚖️';
    const label = urgent.length
      ? `${urgent.length} case${urgent.length>1?'s':''} need${urgent.length===1?'s':''} final court submission confirmation`
      : `${pendingCourtCases.length} settled case${pendingCourtCases.length>1?'s':''} pending court submission response`;
    const items = pendingCourtCases.slice(0,3).map(c=>{
      const days = daysSinceSettled(c);
      const phase = c._courtPhase;
      const actionLabel = days>=15?'Final Reminder':days>=12?'Confirm Submission':'Acknowledge';
      const actionFn = days>=12&&phase==='notified'?`showCourtConfirmNotif('${c.id}')`:days>=10&&!phase?`showCourtReadyNotif('${c.id}')`:days>=15?`showCourtFinalReminder('${c.id}')`:null;
      return actionFn?`<span onclick="${actionFn}" style="cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;background:${urgent.length?'#fef3c7':'#dbeafe'};border:1px solid ${border};font-size:11px;font-weight:700;color:${color}">${escHtml(c.caseNo||'—')} <span style="font-size:10px;opacity:0.7">${days}d</span> · ${actionLabel}</span>`:'';
    }).filter(Boolean).join('');
    return `<div style="margin-bottom:12px;background:${bg};border:1.5px solid ${border};border-radius:10px;padding:11px 16px;display:flex;align-items:flex-start;gap:10px">
      <span style="font-size:20px;flex-shrink:0;margin-top:1px">${icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:700;color:${color};margin-bottom:5px">${label}</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">${items}</div>
      </div>
    </div>`;
  })() : '';

  return `
  <div class="dash-sticky-header">
    <div class="page-header">
      <div><div class="page-title">Dashboard</div><div class="page-sub">${state.cases.length} total complaint(s) on record</div></div>
    </div>
    ${courtBanner}
    <div class="stats-grid">
    <div class="stat-card${sf==='ongoing'?' active':''}" onclick="setStatCardFilter('ongoing')">
      <div class="stat-label">Ongoing</div><div class="stat-value" style="color:#0d3d3a">${stats.ongoing}</div>
      <div class="stat-sub">Active complaints</div>
    </div>
    <div class="stat-card${sf==='month'?' active':''}" onclick="setStatCardFilter('month')">
      <div class="stat-label">This Month</div><div class="stat-value" style="color:#0d3d3a">${stats.month}</div>
      <div class="stat-sub">Settled in ${nowMonthName()} ${nowYear()}</div>
    </div>
    <div class="stat-card${sf==='year'?' active':''}" onclick="setStatCardFilter('year')">
      <div class="stat-label">${state.filterYear||'All Years'}</div><div class="stat-value" style="color:#0d3d3a">${stats.year}</div>
      <div class="stat-sub">Settled in ${state.filterYear||'all years'}</div>
    </div>
    <div class="stat-card${sf==='total'?' active':''}" onclick="setStatCardFilter('total')">
      <div class="stat-label">All-Time Settled</div><div class="stat-value">${stats.total}</div>
      <div class="stat-sub">Total settled cases</div>
    </div>
    </div>
    <div class="filter-bar sticky-filter">
    <div class="filter-group"><span class="filter-label">Year</span>
      <select class="filter-select" onchange="setFilterYear(this.value)" ${sf?'disabled':''}>
        <option value="">All Years</option>
        ${years.map(y=>`<option value="${y}"${state.filterYear===y?' selected':''}>${y}</option>`).join('')}
      </select></div>
    <div class="filter-group"><span class="filter-label">Status</span>
      <select class="filter-select" onchange="setFilterStatus(this.value)" ${sf?'disabled':''}>
        <option value="">All Status</option>
        ${CASE_STATUSES.map(s=>`<option value="${s}"${state.filterStatus===s?' selected':''}>${s}</option>`).join('')}
      </select></div>
    ${hasFilters?`<button class="filter-clear" onclick="clearAllFilters()">✕ Clear Filters</button>`:''}
    <span class="filter-result-count">${filterDesc?`<strong>${filterDesc}</strong> · `:''}Showing ${allCases.length} of ${state.cases.length}</span>
    </div>
    <div data-bulk-toolbar style="display:none;align-items:center;gap:8px;padding:7px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,0.07);width:fit-content">
    <button onclick="clearSelection()" title="Clear selection" style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;background:none;border:none;cursor:pointer;color:#6b7280;font-size:14px;padding:0;line-height:1;border-radius:4px">&#x2715;</button>
    <span data-bulk-count style="font-size:13px;font-weight:600;color:#374151">0 selected</span>
    <div style="width:1px;height:18px;background:#e5e7eb;margin:0 2px"></div>
    <button onclick="deleteBulkCases()" title="Delete selected" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:none;border:none;cursor:pointer;color:#6b7280;border-radius:6px;padding:0"><svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2'/></svg></button>
    </div>
  </div>
  <div class="dash-table-area">
    <div class="tbl-outer"><table>
    <thead><tr>
      <th style="width:36px;text-align:center"><input type="checkbox" id="dash-chk-all" onchange="toggleSelectAll(this,'dash')" title="Select all" style="cursor:pointer;width:15px;height:15px"></th>
      <th>Actions</th><th>Case No.</th><th>Parties</th><th>Case Title</th><th>Nature</th>
      <th>Date Filed</th><th>Time</th><th>Action Taken</th><th>Confrontation</th>
      <th>Settlement</th><th>Status</th><th>Remarks</th><th>Schedule</th>
    </tr></thead>
    <tbody>${cases.length?cases.map(c=>{
      const _today=todayStr();
      const _allSess=[...(c._medSessions||[]).map((s,i)=>({date:s.date||'',time:s.time||'',outcome:s.outcome||'',phase:'med',label:`Mediation Session ${i+1}`})),...(c._concSessions||[]).map((s,i)=>({date:s.date||'',time:s.time||'',outcome:s.outcome||'',phase:'conc',label:`Conciliation Session ${i+1}`}))];
      const _upcoming=_allSess.filter(s=>s.date&&s.date>=_today&&s.outcome!=='settled'&&s.outcome!=='not_settled').sort((a,b)=>a.date.localeCompare(b.date));
      const _nextSess=_upcoming[0]||null;
      const _sessIsToday=_nextSess&&_nextSess.date===_today;
      const f10badge=c._form10?`<div style="margin-top:4px;padding:4px 7px;background:#f5f3ff;border:1px solid #c4b5fd;border-radius:5px;font-size:10px;color:#14919b;font-weight:700;cursor:pointer" onclick="event.stopPropagation();openForm10Modal('${c.id}')">📋 Form 10: ${escHtml(c._form10.appearDate||'')} ${escHtml(c._form10.time||'')}</div>`:'';
      // ── Submission to Court notification for settled cases ──
      const _subm = submissionDeadlineStatus(c);
      const submissionCell = _subm ? (()=>{
        const dl = _subm.deadline;
        const dlFmt = new Date(dl+'T00:00:00').toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'});
        const finDlFmt = _subm.finalizationDeadline ? new Date(_subm.finalizationDeadline+'T00:00:00').toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'}) : '';
        // ✅ User confirmed submission
        if(_subm.userConfirmed) return `<div style="padding:5px 8px;background:#dcfce7;border:1.5px solid #16a34a;border-radius:7px;font-size:11px;font-weight:700;color:#15803d;cursor:pointer" onclick="viewCase('${c.id}')">🏛️ Submitted to Court<br><span style="font-size:10px;font-weight:400">Confirmed: ${c._courtSubmittedDate||''}</span><br><span style="font-size:10px;padding:1px 5px;border-radius:4px;background:#16a34a;color:#fff">✅ SUBMITTED</span></div>`;
        // ❌ User said not submitted yet
        if(_subm.userDeclined) return `<div style="padding:5px 8px;background:#e6f4f5;border:1.5px solid #14919b;border-radius:7px;font-size:11px;font-weight:700;color:#0d3d3a;cursor:pointer" onclick="viewCase('${c.id}')">⚠️ Not Yet Submitted<br><span style="font-size:10px;font-weight:400">Follow-up needed</span><br><span style="font-size:10px;padding:1px 5px;border-radius:4px;background:#14919b;color:#fff">PENDING</span></div>`;
        // Day 12+: waiting for user answer
        if(_subm.finalized || _subm.inFinalization) return `<div style="padding:5px 8px;background:#f0fdf4;border:1.5px solid #22c55e;border-radius:7px;font-size:11px;font-weight:700;color:#065f46;cursor:pointer" onclick="showCourtConfirmNotif('${c.id}')">🏛️ Ready to Confirm<br><span style="font-size:10px;font-weight:400">Was it submitted?</span><br><span style="font-size:10px;padding:1px 5px;border-radius:4px;background:#22c55e;color:#fff">CONFIRM NOW</span></div>`;
        // Day 10-11: notified, in finalization window
        if(_subm.phase === 'notified') return `<div style="padding:5px 8px;background:#eff6ff;border:1px solid #6dd4da;border-radius:7px;font-size:11px;font-weight:700;color:#1d4ed8">⚖️ Finalization Window<br><span style="font-size:10px;font-weight:400">Due: ${finDlFmt}</span><br><span style="font-size:10px;color:#2563eb">${_subm.finDaysLeft !== null ? _subm.finDaysLeft+' day(s) left' : ''}</span></div>`;
        // Day 10: ready to notify
        if(_subm.daysSince >= 10 && !_subm.phase) return `<div style="padding:5px 8px;background:#d4f1f1;border:1px solid #14919b;border-radius:7px;font-size:11px;font-weight:700;color:#0d3d3a;cursor:pointer" onclick="showCourtReadyNotif('${c.id}')">🔔 Submit to Court<br><span style="font-size:10px;font-weight:400">Due: ${dlFmt}</span><br><span style="font-size:10px;padding:1px 5px;border-radius:4px;background:#14919b;color:#fff">ACTION NEEDED</span></div>`;
        if(_subm.dueToday) return `<div style="padding:5px 8px;background:#d4f1f1;border:1px solid #14919b;border-radius:7px;font-size:11px;font-weight:700;color:#0d3d3a">🔔 Submission to Court<br><span style="font-size:10px;font-weight:400">Due: ${dlFmt}</span><br><span style="font-size:10px;padding:1px 5px;border-radius:4px;background:#14919b;color:#fff">DUE TODAY</span></div>`;
        return `<div style="padding:5px 8px;background:#f0fdf4;border:1px solid #6ee7b7;border-radius:7px;font-size:11px;font-weight:700;color:#065f46">⚖️ Submission to Court<br><span style="font-size:10px;font-weight:400">Due: ${dlFmt}</span><br><span style="font-size:10px;color:#059669">${_subm.daysLeft} day${_subm.daysLeft!==1?'s':''} left</span></div>`;
      })() : null;
      const hearingCell=submissionCell ? submissionCell
        : _nextSess ? `<div style="font-size:12px${_sessIsToday?';background:#fff8e1;border:1px solid #ffe082;border-radius:7px;padding:5px 8px':''}"><span style="color:${_sessIsToday?'#9a6200':'#14919b'};font-weight:600">${_sessIsToday?'🔔':'📅'} ${escHtml(new Date(_nextSess.date+'T00:00:00').toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}))}</span>${_sessIsToday?'<span style="display:inline-block;margin-left:5px;padding:1px 6px;background:#ff9800;color:#fff;border-radius:4px;font-size:10px;font-weight:700;vertical-align:middle">TODAY</span>':''}<br><span style="color:var(--text2)">${escHtml(_nextSess.time||'—')}</span><br><span style="color:var(--text3);font-size:11px">${escHtml(_nextSess.label)}</span></div>${f10badge}`
        : `<span style="color:var(--text3);font-size:12px">—</span>${f10badge}`
      const _isCFA=c.status==='CFA';
      const _rowBg=_isCFA?'#ffd6d6':_sessIsToday?'#fffde7':c.status==='Settled'?'#dcfce7':c.status==='Ongoing'?'#fef9c3':'';
      const _rowClass=_isCFA?'cfa-row':_sessIsToday?'':c.status==='Ongoing'?'ongoing-row':c.status==='Settled'?'settled-row':'';
      const isChecked=state.selectedCases.has(c.id);
      return `<tr data-rowbg="${_rowBg}" ${_rowClass?`class="${_rowClass}"`:''}  style="background:${isChecked?'#dbeafe':_rowBg};transition:background 0.1s">
      <td style="text-align:center"><input type="checkbox" data-id="${c.id}" data-ctx="dash" onchange="toggleRowSelect(this)" ${isChecked?'checked':''} style="cursor:pointer;width:15px;height:15px"></td>
      <td><div class="action-col">
        ${(()=>{const _vSubm=submissionDeadlineStatus(c);const _vGreen=_vSubm&&_vSubm.userConfirmed;return `<button class="btn btn-sm" style="${_vGreen?'background:#16a34a;color:#fff;border-color:#16a34a;':''}" onclick="${c._archive?`viewArchiveCase('${c.id}')`:`viewCase('${c.id}')`}" title="${_vGreen?'Confirmed: Submitted to Court':''}">View${_vGreen?' ✅':''}</button>`;})()}
        <button class="btn btn-sm btn-danger" onclick="deleteCase('${c.id}')">Delete</button>
      </div></td>
      <td><strong>${escHtml(c.caseNo||'—')}</strong></td>
      <td style="font-size:12px;white-space:normal;min-width:110px;max-width:160px;word-break:break-word">${escHtml((c.complainant||'—').toUpperCase())}<br><span style="color:var(--text3);font-size:11px">vs</span><br>${escHtml((c.respondent||'—').toUpperCase())}</td>
      <td>${escHtml(c.caseTitle||'—')}</td>
      <td>${escHtml(c.nature||c.type||'—')}</td>
      <td style="font-size:12px;color:var(--text2)">${escHtml(formatDate(c.dateFiled||'—'))}</td>
      <td style="font-size:12px;color:var(--text2)">${escHtml(formatTime12(c.timeFiled||'—'))}</td>
      <td>${escHtml(c.actionTaken||'—')}</td>
      <td style="font-size:12px;color:var(--text2)">${escHtml(formatDate(c.dateConfrontation||'—'))}</td>
      <td style="font-size:12px;color:var(--text2)">${escHtml(formatDate(c.dateResolved||'—'))}</td>
      <td>${statusBadge(c.status)}</td>
      <td style="font-size:12px;color:var(--text2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(c.remarks||'')}">${escHtml(c.remarks||'—')}</td>
      <td>${hearingCell}</td>
    </tr>`;}).join(''):`<tr><td colspan="15" class="empty">No complaints found matching your filters</td></tr>`}
    </tbody>
  </table></div>
  ${(()=>{
    if(totalPages<=1) return '';
    const cur=state.dashPage;
    // Build page number buttons with ellipsis
    const pages=[];
    for(let i=1;i<=totalPages;i++) pages.push(i);
    // Always show: first, last, cur-1, cur, cur+1 — collapse rest with ellipsis
    const shown=new Set([1,totalPages,cur,cur-1,cur+1].filter(p=>p>=1&&p<=totalPages));
    let btns='';
    let prev=0;
    for(const p of [...shown].sort((a,b)=>a-b)){
      if(p-prev>1) btns+=`<span style="padding:0 4px;color:var(--text3);line-height:32px">…</span>`;
      const active=p===cur;
      btns+=`<button onclick="setDashPage(${p})" style="min-width:32px;height:32px;padding:0 10px;border-radius:7px;border:${active?'none':'1px solid var(--border)'};background:${active?'var(--teal)':'var(--surface)'};color:${active?'#fff':'var(--text)'};font-size:13px;font-weight:${active?'700':'400'};cursor:${active?'default':'pointer'};font-family:inherit;transition:background 0.15s,color 0.15s" ${active?'disabled':''}>${p}</button>`;
      prev=p;
    }
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--surface);border-top:1px solid var(--border);border-radius:0 0 var(--radius-lg) var(--radius-lg);margin-top:-1px">
      <span style="font-size:12px;color:var(--text3)">Page ${cur} of ${totalPages} &nbsp;·&nbsp; ${allCases.length} record${allCases.length!==1?'s':''}</span>
      <div style="display:flex;align-items:center;gap:6px">
        <button onclick="setDashPage(${cur-1})" ${cur<=1?'disabled':''} style="min-width:32px;height:32px;padding:0 10px;border-radius:7px;border:1px solid var(--border);background:var(--surface);color:${cur<=1?'var(--text3)':'var(--text)'};font-size:13px;cursor:${cur<=1?'default':'pointer'};font-family:inherit;opacity:${cur<=1?'0.4':'1'}">‹</button>
        ${btns}
        <button onclick="setDashPage(${cur+1})" ${cur>=totalPages?'disabled':''} style="min-width:32px;height:32px;padding:0 10px;border-radius:7px;border:1px solid var(--border);background:var(--surface);color:${cur>=totalPages?'var(--text3)':'var(--text)'};font-size:13px;cursor:${cur>=totalPages?'default':'pointer'};font-family:inherit;opacity:${cur>=totalPages?'0.4':'1'}">›</button>
      </div>
    </div>`;
  })()}
  </div>
`;
}
function setDashPage(p){state.dashPage=p;render();}
function deleteCase(id){
  const c=state.cases.find(x=>x.id===id);
  const label=c?`<strong>${escHtml(c.caseNo||'')}</strong> — ${escHtml((c.complainant||'').toUpperCase())} vs ${escHtml((c.respondent||'').toUpperCase())}`:''
  showConfirm(
    'Delete Complaint',
    `Are you sure you want to delete ${label}? This action <strong>cannot be undone</strong>.`,
    ()=>{
      state.cases=state.cases.filter(x=>x.id!==id);
      // Remove schedules that belonged to the deleted case
      if(c) state.schedules=state.schedules.filter(s=>s._caseId!==c.id&&s.caseNo!==c.caseNo);
      // Renumber cases per year to fill gaps
      const byYear={};
      state.cases.forEach(x=>{
        const yr=(x.dateFiled||x.caseNo||'').slice(0,4)||'0000';
        if(!byYear[yr])byYear[yr]=[];
        byYear[yr].push(x);
      });
      Object.keys(byYear).forEach(yr=>{
        byYear[yr].sort((a,b)=>{
          const na=parseInt((a.caseNo||'').split('-').pop())||0;
          const nb=parseInt((b.caseNo||'').split('-').pop())||0;
          return na-nb;
        });
        byYear[yr].forEach((x,i)=>{
          const oldNo=x.caseNo||'';
          const parts=oldNo.split('-');
          const caseMo=x.dateFiled?String(parseInt((x.dateFiled||'').split('-')[1]||new Date().getMonth()+1)).padStart(2,'0'):String(new Date().getMonth()+1).padStart(2,'0');
          const prefix=parts.length>=3?parts.slice(0,2).join('-'):`${caseMo}-${yr}`;
          const newNo=`${prefix}-${String(i+1).padStart(2,'0')}`;
          if(newNo!==oldNo){
            state.schedules.forEach(s=>{if(s.caseNo===oldNo)s.caseNo=newNo;});
            x.caseNo=newNo;
          }
        });
      });
      saveData('ltia_cases',state.cases);
      saveData('ltia_schedules',state.schedules);
      render();
      showToast('Complaint deleted and cases renumbered.','success');
    },
    'Yes, Delete',
    '#b93232'
  );
}

// ─── BULK SELECT & DELETE ────────────────────────────────────────────────────
function toggleRowSelect(cb){
  const id=cb.dataset.id;
  if(cb.checked) state.selectedCases.add(id);
  else state.selectedCases.delete(id);
  // Update select-all checkbox state without full re-render
  _syncSelectAllCheckbox(cb.dataset.ctx);
  // Highlight the row
  const row=cb.closest('tr');
  if(row){
    const base=row.getAttribute('data-rowbg')||'';
    row.style.background=cb.checked?'#dbeafe':base;
  }
  // Update toolbar visibility without full re-render
  _updateBulkToolbar();
}
function toggleSelectAll(masterCb, ctx){
  const checkboxes=document.querySelectorAll(`input[type=checkbox][data-ctx="${ctx}"]`);
  checkboxes.forEach(cb=>{
    cb.checked=masterCb.checked;
    const id=cb.dataset.id;
    if(masterCb.checked) state.selectedCases.add(id);
    else state.selectedCases.delete(id);
    const row=cb.closest('tr');
    if(row) row.style.background=masterCb.checked?'#dbeafe':(row.getAttribute('data-rowbg')||'');
  });
  _updateBulkToolbar();
}
function clearSelection(){
  state.selectedCases.clear();
  render();
}
function _syncSelectAllCheckbox(ctx){
  const id=ctx==='dash'?'dash-chk-all':'cases-chk-all';
  const master=document.getElementById(id);
  if(!master)return;
  const all=document.querySelectorAll(`input[type=checkbox][data-ctx="${ctx}"]`);
  const checkedCount=[...all].filter(c=>c.checked).length;
  master.checked=all.length>0&&checkedCount===all.length;
  master.indeterminate=checkedCount>0&&checkedCount<all.length;
}
function _updateBulkToolbar(){
  // Update all bulk toolbars on current page without re-rendering
  document.querySelectorAll('[data-bulk-toolbar]').forEach(el=>{
    el.style.display=state.selectedCases.size?'flex':'none';
    const lbl=el.querySelector('[data-bulk-count]');
    if(lbl) lbl.textContent=`${state.selectedCases.size} selected`;
  });
}
function deleteBulkCases(){
  const ids=[...state.selectedCases];
  if(!ids.length)return;
  showConfirm(
    'Delete Selected Complaints',
    `Are you sure you want to delete <strong>${ids.length} complaint${ids.length>1?'s':''}</strong>? This action <strong>cannot be undone</strong>.`,
    ()=>{
      // Collect caseNos and ids of deleted cases before removing them
      const deletedCases=state.cases.filter(x=>ids.includes(x.id));
      const deletedIds=new Set(deletedCases.map(x=>x.id));
      const deletedNos=new Set(deletedCases.map(x=>x.caseNo).filter(Boolean));
      state.cases=state.cases.filter(x=>!ids.includes(x.id));
      // Remove schedules that belonged to any deleted case
      state.schedules=state.schedules.filter(s=>!deletedIds.has(s._caseId)&&!deletedNos.has(s.caseNo));
      // Renumber remaining cases per year
      const byYear={};
      state.cases.forEach(x=>{
        const yr=(x.dateFiled||x.caseNo||'').slice(0,4)||'0000';
        if(!byYear[yr])byYear[yr]=[];
        byYear[yr].push(x);
      });
      Object.keys(byYear).forEach(yr=>{
        byYear[yr].sort((a,b)=>{
          const na=parseInt((a.caseNo||'').split('-').pop())||0;
          const nb=parseInt((b.caseNo||'').split('-').pop())||0;
          return na-nb;
        });
        byYear[yr].forEach((x,i)=>{
          const oldNo=x.caseNo||'';
          const parts=oldNo.split('-');
          const caseMo=x.dateFiled?String(parseInt((x.dateFiled||'').split('-')[1]||new Date().getMonth()+1)).padStart(2,'0'):String(new Date().getMonth()+1).padStart(2,'0');
          const prefix=parts.length>=3?parts.slice(0,2).join('-'):`${caseMo}-${yr}`;
          const newNo=`${prefix}-${String(i+1).padStart(2,'0')}`;
          if(newNo!==oldNo){
            state.schedules.forEach(s=>{if(s.caseNo===oldNo)s.caseNo=newNo;});
            x.caseNo=newNo;
          }
        });
      });
      state.selectedCases.clear();
      saveData('ltia_cases',state.cases);
      saveData('ltia_schedules',state.schedules);
      render();
      showToast(`${ids.length} complaint${ids.length>1?'s':''} deleted and cases renumbered.`,'success');
    },
    'Yes, Delete All',
    '#b91c1c'
  );
}


function applyCaseFilters(list) {
  const f=state.filters.cases;
  return list.filter(c=>{
    if(f.status&&c.status!==f.status) return false;
    if(f.year&&!(c.dateFiled||'').startsWith(f.year)) return false;
    return true;
  });
}
function filterBarCases() {
  const f=state.filters.cases;
  const years=[...new Set(state.cases.map(c=>(c.dateFiled||'').slice(0,4)).filter(Boolean))].sort().reverse();
  const has=f.year||f.status;
  return `<div class="filter-bar">
    <div class="filter-group"><span class="filter-label">Year</span>
      <select class="filter-select" onchange="setCaseFilter('year',this.value)">
        <option value="">All Years</option>
        ${years.map(y=>`<option value="${y}"${f.year===y?' selected':''}>${y}</option>`).join('')}
      </select></div>
    <div class="filter-group"><span class="filter-label">Status</span>
      <select class="filter-select" onchange="setCaseFilter('status',this.value)">
        <option value="">All Status</option>
        ${CASE_STATUSES.map(s=>`<option value="${s}"${f.status===s?' selected':''}>${s}</option>`).join('')}
      </select></div>
    ${has?`<button class="filter-clear" onclick="clearCaseFilters()">✕ Clear</button>`:''}
    <span class="filter-result-count">Showing ${applyCaseFilters(state.cases).length} of ${state.cases.length}</span>
  </div>`;
}
function setCaseFilter(k,v){state.filters.cases[k]=v;render();}
function clearCaseFilters(){state.filters.cases={year:'',status:''};render();}

function renderCases() {
  const filtered=applyCaseFilters(state.cases);
  return `
  <div class="page-header">
    <div><div class="page-title">Complaints</div><div class="page-sub">${state.cases.length} total complaint(s)</div></div>
    <div class="hdr-actions"></div>
  </div>
  ${filterBarCases()}
  <div data-bulk-toolbar style="display:none;align-items:center;gap:8px;padding:7px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,0.07);width:fit-content">
    <button onclick="clearSelection()" title="Clear selection" style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;background:none;border:none;cursor:pointer;color:#6b7280;font-size:14px;padding:0;line-height:1;border-radius:4px">&#x2715;</button>
    <span data-bulk-count style="font-size:13px;font-weight:600;color:#374151">0 selected</span>
    <div style="width:1px;height:18px;background:#e5e7eb;margin:0 2px"></div>
    <button onclick="deleteBulkCases()" title="Delete selected" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:none;border:none;cursor:pointer;color:#6b7280;border-radius:6px;padding:0"><svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2'/></svg></button>
  </div>
  <div class="card">
    ${filtered.length?`<div class="tbl-outer"><table>
      <thead><tr>
        <th style="width:36px;text-align:center"><input type="checkbox" id="cases-chk-all" onchange="toggleSelectAll(this,'cases')" title="Select all" style="cursor:pointer;width:15px;height:15px"></th>
        <th>Actions</th><th>Case No.</th><th>Parties</th><th>Case Title</th><th>Nature</th>
        <th>Date Filed</th><th>Time</th><th>Action Taken</th><th>Confrontation</th>
        <th>Settlement</th><th>Status</th><th>Remarks</th><th>Court Submission</th>
      </tr></thead>
      <tbody>${[...filtered].reverse().map(c=>{
        const _isCFA2=c.status==='CFA';
        const _cb=_isCFA2?'#ffd6d6':c.status==='Settled'?'#dcfce7':c.status==='Ongoing'?'#fef9c3':'';
        const _rowClass2=_isCFA2?'cfa-row':c.status==='Ongoing'?'ongoing-row':c.status==='Settled'?'settled-row':'';
        const isChecked=state.selectedCases.has(c.id);
        return `<tr data-rowbg="${_cb}" ${_rowClass2?`class="${_rowClass2}"`:''}  style="background:${isChecked?'#dbeafe':_cb};transition:background 0.1s">
          <td style="text-align:center"><input type="checkbox" data-id="${c.id}" data-ctx="cases" onchange="toggleRowSelect(this)" ${isChecked?'checked':''} style="cursor:pointer;width:15px;height:15px"></td>
          <td><div class="action-col">
            ${(()=>{const _vSubm2=submissionDeadlineStatus(c);const _vGreen2=_vSubm2&&_vSubm2.userConfirmed;return `<button class="btn btn-sm" style="${_vGreen2?'background:#16a34a;color:#fff;border-color:#16a34a;':''}" onclick="${c._archive?`viewArchiveCase('${c.id}')`:`viewCase('${c.id}')`}" title="${_vGreen2?'Confirmed: Submitted to Court':''}">View${_vGreen2?' ✅':''}</button>`;})()}
            <button class="btn btn-sm btn-danger" onclick="deleteCase('${c.id}')">Delete</button>
          </div></td>
          <td><strong>${escHtml(c.caseNo)}</strong></td>
          <td style="font-size:12px">${escHtml(c.complainant&&c.respondent?(c.complainant+' vs '+c.respondent).toUpperCase():'—')}</td>
          <td>${escHtml(c.caseTitle||'—')}</td>
          <td>${escHtml(c.nature||c.type||'—')}</td>
          <td style="font-size:12px;color:var(--text2)">${escHtml(formatDate(c.dateFiled||'—'))}</td>
          <td style="font-size:12px;color:var(--text2)">${escHtml(formatTime12(c.timeFiled||'—'))}</td>
          <td>${escHtml(c.actionTaken||'—')}</td>
          <td style="font-size:12px;color:var(--text2)">${escHtml(formatDate(c.dateConfrontation||'—'))}</td>
          <td style="font-size:12px;color:var(--text2)">${escHtml(formatDate(c.dateResolved||'—'))}</td>
          <td>${statusBadge(c.status)}</td>
          <td style="font-size:12px;color:var(--text2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(c.remarks||'')}">${escHtml(c.remarks||'—')}</td>
          ${(()=>{
            const _subm2 = submissionDeadlineStatus(c);
            if(!_subm2) return '<td></td>';
            const dl2 = _subm2.deadline;
            const dlFmt2 = new Date(dl2+'T00:00:00').toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'});
            const finDlFmt2 = _subm2.finalizationDeadline ? new Date(_subm2.finalizationDeadline+'T00:00:00').toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'}) : '';
            if(_subm2.userConfirmed) return `<td><div style="padding:4px 7px;background:#dcfce7;border:1.5px solid #16a34a;border-radius:6px;font-size:10px;font-weight:700;color:#15803d;white-space:nowrap;cursor:pointer" onclick="viewCase('${c.id}')">🏛️ Submitted to Court<br>Confirmed: ${c._courtSubmittedDate||''} <span style="background:#16a34a;color:#fff;padding:1px 4px;border-radius:3px">✅ DONE</span></div></td>`;
            if(_subm2.userDeclined) return `<td><div style="padding:4px 7px;background:#e8f6f7;border:1.5px solid #14919b;border-radius:6px;font-size:10px;font-weight:700;color:#0d3d3a;white-space:nowrap;cursor:pointer" onclick="showCourtConfirmNotif('${c.id}')">⚠️ Not Submitted Yet<br>${dlFmt2} <span style="background:#14919b;color:#fff;padding:1px 4px;border-radius:3px">UPDATE</span></div></td>`;
            if(_subm2.daysSince>=12||_subm2.inFinalization||_subm2.finalized) return `<td><div style="padding:4px 7px;background:#f0fdf4;border:1.5px solid #22c55e;border-radius:6px;font-size:10px;font-weight:700;color:#065f46;white-space:nowrap;cursor:pointer" onclick="showCourtConfirmNotif('${c.id}')">🏛️ Confirm Submission<br>${finDlFmt2} <span style="background:#22c55e;color:#fff;padding:1px 4px;border-radius:3px">CONFIRM</span></div></td>`;
            if(_subm2.daysSince>=10&&!_subm2.phase) return `<td><div style="padding:4px 7px;background:#d4f1f1;border:1px solid #14919b;border-radius:6px;font-size:10px;font-weight:700;color:#0d3d3a;white-space:nowrap;cursor:pointer" onclick="showCourtReadyNotif('${c.id}')">🔔 Ready to Submit<br>${dlFmt2} <span style="background:#14919b;color:#fff;padding:1px 4px;border-radius:3px">ACTION</span></div></td>`;
            if(_subm2.dueToday) return `<td><div style="padding:4px 7px;background:#d4f1f1;border:1px solid #14919b;border-radius:6px;font-size:10px;font-weight:700;color:#0d3d3a;white-space:nowrap">🔔 Submit to Court<br>${dlFmt2} <span style="background:#14919b;color:#fff;padding:1px 4px;border-radius:3px">TODAY</span></div></td>`;
            return `<td><div style="padding:4px 7px;background:#f0fdf4;border:1px solid #6ee7b7;border-radius:6px;font-size:10px;font-weight:700;color:#065f46;white-space:nowrap">⚖️ Submit to Court<br>${dlFmt2} (${_subm2.daysLeft}d left)</div></td>`;
          })()}
        </tr>`;}).join('')}</tbody>
    </table></div>`:
    `<div class="empty">${state.cases.length?'No complaints match filters.':'No complaints yet.'}</div>`}
  </div>`;
}

// ─── SCHEDULES PAGE ──────────────────────────────────────────────────────────
function renderSchedules() {
  const scheds=state.schedules;
  return `
  <div class="page-header">
    <div><div class="page-title">Schedules</div><div class="page-sub">${scheds.length} schedule(s) on record</div></div>
    <div class="hdr-actions"><button class="btn btn-primary" onclick="openSchedWizard()">+ Set Schedule</button></div>
  </div>
  <div class="card">
    ${scheds.length?`<div class="table-wrap"><table>
      <thead><tr>
        <th>Complaint No.</th><th>Case Title</th><th>Date</th><th>Time</th>
        <th>Location</th><th>Lupon Members</th><th>Actions</th>
      </tr></thead>
      <tbody>${scheds.map(s=>`<tr>
        <td><strong>${escHtml(s.caseNo||'—')}</strong></td>
        <td>${escHtml(s.caseTitle||'—')}</td>
        <td style="font-size:12px;color:var(--text2)">${escHtml(s.schedDate||'—')}</td>
        <td style="font-size:12px">${escHtml(s.schedTime||'—')}</td>
        <td>${escHtml(s.location||'—')}</td>
        <td style="font-size:12px;color:var(--text2);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml((s.lupons||[]).join(', ')||'—')}</td>
        <td><div class="action-group">
          <button class="btn btn-sm btn-danger" onclick="deleteSched('${s.id}')">Delete</button>
        </div></td>
      </tr>`).join('')}</tbody>
    </table></div>`:
    `<div class="empty">No schedules yet. Click "Set Schedule" to add one.</div>`}
  </div>`;
}
function showSchedDetail(schedId){
  const s=state.schedules.find(x=>x.id===schedId);
  if(!s)return;
  const existing=document.getElementById('sched-detail-modal');
  if(existing)existing.remove();
  const c=state.cases.find(x=>x.id===s._caseId||x.caseNo===s.caseNo);
  const luponsHtml=(s.lupons&&s.lupons.length)?s.lupons.map(l=>`<span style="display:inline-block;padding:3px 9px;background:#e0f4f4;color:#14919b;border-radius:12px;font-size:11px;font-weight:600;margin:2px">${escHtml(l)}</span>`).join(''):'<span style="color:#9ba3ae;font-size:12px">—</span>';
  const modal=`<div id="sched-detail-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:600;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()">
    <div style="background:#fff;border-radius:14px;width:480px;max-width:96vw;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 16px 50px rgba(0,0,0,0.22);overflow:hidden">
      <div style="padding:16px 22px;background:#0d3d3a;border-radius:14px 14px 0 0;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:15px;font-weight:700;color:#fff">📅 Hearing Schedule</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:2px">${escHtml(s.caseNo||'—')}</div>
        </div>
        <button onclick="document.getElementById('sched-detail-modal').remove()" style="border:none;background:rgba(255,255,255,0.18);color:#fff;font-size:17px;font-weight:700;cursor:pointer;line-height:1;padding:5px 10px;border-radius:8px;transition:background 0.15s" onmouseover="this.style.background='rgba(255,255,255,0.32)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'">✕</button>
      </div>
      <div style="padding:20px 22px;overflow-y:auto;flex:1">
        <div style="display:grid;gap:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0">
            <span style="font-size:12px;color:#6b7280;font-weight:500;width:140px;flex-shrink:0">Complaint No.</span>
            <span style="font-size:13px;font-weight:600;color:#0d2137">${escHtml(s.caseNo||'—')}</span>
          </div>
          ${c?`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0">
            <span style="font-size:12px;color:#6b7280;font-weight:500;width:140px;flex-shrink:0">Parties</span>
            <span style="font-size:12px;color:#0d2137;text-align:right">${escHtml((c.complainant||'—').toUpperCase())} <span style="color:#9ba3ae">vs</span> ${escHtml((c.respondent||'—').toUpperCase())}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0">
            <span style="font-size:12px;color:#6b7280;font-weight:500;width:140px;flex-shrink:0">Case Title</span>
            <span style="font-size:13px;color:#0d2137">${escHtml(c.caseTitle||s.caseTitle||'—')}</span>
          </div>`:''}
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0">
            <span style="font-size:12px;color:#6b7280;font-weight:500;width:140px;flex-shrink:0">Hearing Date</span>
            <span style="font-size:13px;font-weight:700;color:#14919b">${escHtml(s.schedDate||'—')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0">
            <span style="font-size:12px;color:#6b7280;font-weight:500;width:140px;flex-shrink:0">Time</span>
            <span style="font-size:13px;font-weight:600;color:#0d2137">${escHtml(s.schedTime||'—')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0">
            <span style="font-size:12px;color:#6b7280;font-weight:500;width:140px;flex-shrink:0">Location</span>
            <span style="font-size:13px;color:#0d2137">${escHtml(s.location||'—')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0">
            <span style="font-size:12px;color:#6b7280;font-weight:500;width:140px;flex-shrink:0">Chairman</span>
            <span style="font-size:12px;color:#0d2137">${escHtml(s.chairman||'—')}</span>
          </div>
          <div style="padding:8px 0">
            <div style="font-size:12px;color:#6b7280;font-weight:500;margin-bottom:8px">Lupon Members</div>
            <div>${luponsHtml}</div>
          </div>
        </div>
      </div>
      <div style="padding:12px 22px;border-top:1px solid #eee;display:flex;gap:8px;justify-content:flex-end;background:#f9fafb;border-radius:0 0 14px 14px">
        ${c?`<button onclick="document.getElementById('sched-detail-modal').remove();viewCase('${c.id}')" style="padding:7px 16px;background:#0d3d3a;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer">📋 View Case</button>`:''}
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',modal);
}

function deleteSched(id){
  showConfirm(
    'Delete Schedule',
    'Are you sure you want to delete this schedule? This action <strong>cannot be undone</strong>.',
    ()=>{
      state.schedules=state.schedules.filter(s=>s.id!==id);
      saveData('ltia_schedules',state.schedules);
      if(state.schedulesModalOpen){
        document.getElementById('content').innerHTML=renderDashboard();
        rerenderSchedModal();
      } else {
        render();
      }
      showToast('Schedule deleted successfully.','success');
    },
    'Yes, Delete',
    '#b93232'
  );
}

// ─── SCHEDULES MODAL ─────────────────────────────────────────────────────────
function _detectPhase(c){
  // Returns 'med' or 'conc' based on case session state
  if(!c) return 'med';
  const medSessions=c._medSessions||[];
  const medSettled=medSessions.some(s=>s.outcome==='settled');
  const medAllDone=medSessions.length>=3||c._medFailed;
  const medPhaseComplete=medSettled||medAllDone;
  if(medPhaseComplete&&!medSettled) return 'conc';
  return 'med';
}

function openSchedulesModal(caseId){
  state.schedulesModalOpen=true;
  if(caseId){
    // opened from a case row — go straight to form with prefill
    const c=state.cases.find(x=>x.id===caseId);
    const phase=_detectPhase(c);
    state.schedModalView='form';
    state.schedModalFormData=c?{
      _caseId:caseId, caseNo:c.caseNo, dateFiled:c.dateFiled,
      complainantName:c.complainant, complainantContact:c.complainantContact||'',
      complainantAddress:c.complainantAddress||'',
      respondentName:c.respondent, respondentContact:c.respondentContact||'',
      respondentAddress:c.respondentAddress||'',
      caseTitle:c.caseTitle||c.type||'',
      lupons:[], schedDate:'', schedTime:'', location:'',
      chairman:'HON. ABUNDIO A. LEONES', timeFiled:c.timeFiled||'',
      _phase:phase
    }:{lupons:[],schedDate:'',schedTime:'',location:'',chairman:'HON. ABUNDIO A. LEONES',_phase:'med'};
    state.calPopup=null;
  } else {
    state.schedModalView='list';
    state.schedModalFormData=null;
  }
  renderSchedulesModalDom();
}
function openSchedulesModalForm(){
  // Open new Form 7 (Complaint) dark modal directly
  openNewCaseForm7Modal();
}

// ── FILE COMPLAINT — KP FORMS PREVIEW SPLASH ──────────────────────────────────
function openFileComplaintPreview(){
  const existing=document.getElementById('fc-preview-root');
  if(existing)existing.remove();
  const now=new Date();
  const caseNo=genCaseNo();
  const dateStr=now.toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'});
  const dayOrd=(d)=>{const s=['th','st','nd','rd'];const v=d%100;return d+(s[(v-20)%10]||s[v]||s[0]);};
  const monthNames=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const dayN=now.getDate(), monN=monthNames[now.getMonth()], yrN=now.getFullYear();
  const chairman='HON. ABUNDIO A. LEONES';

  const pdfPreviewHtml=`
    <div style="font-family:'Times New Roman',serif;font-size:12px;color:#111;padding:28px 32px;max-width:560px;margin:0 auto;line-height:1.6">
      <div style="text-align:center;font-weight:700;font-size:13px;margin-bottom:2px">KP Form No. 7</div>
      <div style="text-align:center;font-size:12px">Republic of the Philippines</div>
      <div style="text-align:center;font-size:12px">City of Butuan</div>
      <div style="text-align:center;font-size:12px">Barangay PANGABUGAN</div>
      <div style="text-align:center;font-weight:700;font-size:13px;margin-top:4px">OFFICE OF THE LUPONG TAGAPAMAYAPA</div>
      <div style="display:flex;justify-content:space-between;margin-top:18px;font-size:12px">
        <div>
          <div style="font-weight:700;text-transform:uppercase">[Complainant Name]</div>
          <div>Butuan City</div>
          <div>Complainant</div>
        </div>
        <div style="text-align:right">
          <div>DF: ${now.toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'numeric'}).replace(/\//g,'-')}</div>
          <div>Barangay Case No. <span style="font-weight:700">${caseNo}</span></div>
          <div>For: [Nature of Complaint]</div>
        </div>
      </div>
      <div style="text-align:left;margin:8px 0;font-size:12px;width:100%;font-style:italic">-against-</div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <div>
          <div style="font-weight:700;text-transform:uppercase">[Respondent Name]</div>
          <div>Butuan City</div>
          <div>Respondent/s</div>
        </div>
      </div>
      <div style="text-align:center;font-weight:700;font-size:14px;letter-spacing:3px;margin:18px 0 10px">C O M P L A I N T</div>
      <p style="text-indent:32px;margin-bottom:8px">I/We hereby complaint against the above-named respondent for violating my/our rights and interests in the following manner:</p>
      <p style="text-indent:32px;margin-bottom:8px;font-style:italic;color:#555">[Complaint narrative will appear here after filing]</p>
      <p style="text-indent:32px;margin-bottom:8px">Therefore, I/We pray that the following relief/s be granted to me/us in accordance with law and or/equity:</p>
      <p style="text-indent:32px;margin-bottom:18px;font-style:italic;color:#555">[Relief/Prayer will appear here after filing]</p>
      <div style="margin-bottom:6px">Made this <u style="letter-spacing:2px">&nbsp;${dayOrd(dayN)}&nbsp;</u> day of <u>&nbsp;${monN}&nbsp;</u> 20 <u>&nbsp;${String(yrN).slice(-2)}&nbsp;</u>.</div>
      <div style="display:flex;justify-content:space-between;margin-top:24px">
        <div></div>
        <div style="text-align:center;min-width:200px">
          <div style="border-bottom:1px solid #111;min-width:180px;margin-bottom:3px">&nbsp;</div>
          <div style="font-weight:700">[Complainant Name]</div>
          <div>Complainant</div>
        </div>
      </div>
      <div style="margin-top:18px;font-size:11px">Received and filed this ________________ day of ${monN} 20 ${String(yrN).slice(-2)}.</div>
      <div style="margin-top:18px;text-align:center">
        <div style="border-bottom:1px solid #111;min-width:220px;margin:0 auto 3px">&nbsp;</div>
        <div style="font-weight:700">${chairman}</div>
        <div>Punong Barangay/Lupon Chairman</div>
      </div>
    </div>`;

  const html=`<div id="fc-preview-root" style="position:fixed;inset:0;z-index:500;display:flex;align-items:stretch;background:rgba(0,0,0,0.65);overflow:hidden">
    <!-- LEFT PANEL -->
    <div style="width:340px;min-width:220px;background:#1e2229;display:flex;flex-direction:column;box-shadow:4px 0 24px rgba(0,0,0,0.3);z-index:2;flex-shrink:0">
      <!-- Header -->
      <div style="background:#0d3d3a;color:#fff;padding:14px 18px;display:flex;align-items:flex-start;justify-content:space-between;flex-shrink:0">
        <div>
          <div style="font-size:14px;font-weight:700;margin-bottom:2px">📋 File a Complaint</div>
          <div style="font-size:10px;opacity:0.65">KP Form 7 — Preview</div>
        </div>
        <button onclick="closeFcPreviewAndOpenForm7()" title="Close preview and proceed to form" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-left:8px" onmouseover="this.style.background='rgba(255,255,255,0.28)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">✕</button>
      </div>
      <!-- Body -->
      <div style="flex:1;overflow-y:auto;padding:18px 16px;color:#e8eaed">
        <div style="background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.35);border-radius:8px;padding:12px 14px;font-size:12px;color:#6dd4da;line-height:1.6;margin-bottom:18px">
          📄 <strong>KP Form 7 — Complaint</strong><br>
          This is a preview of how your complaint document will look. Click <strong>✕</strong> to proceed to filling out and filing the form.
        </div>
        <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid rgba(255,255,255,0.1)">What happens next?</div>
        <div style="display:flex;flex-direction:column;gap:10px;font-size:12px;color:#adb5bd">
          <div style="display:flex;gap:10px;align-items:flex-start">
            <span style="background:rgba(200,150,12,0.25);color:#14919b;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">1</span>
            <span>Fill in complainant & respondent details</span>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start">
            <span style="background:rgba(200,150,12,0.25);color:#14919b;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">2</span>
            <span>Enter the nature and narrative of the complaint</span>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start">
            <span style="background:rgba(200,150,12,0.25);color:#14919b;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">3</span>
            <span>Form 7 PDF is auto-generated and saved to the case</span>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start">
            <span style="background:rgba(200,150,12,0.25);color:#14919b;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">4</span>
            <span>Case is tracked through the full KP process</span>
          </div>
        </div>
        <div style="margin-top:28px">
          <button onclick="closeFcPreviewAndOpenForm7()" style="width:100%;padding:11px;border-radius:8px;background:#14919b;color:#0d2137;border:none;font-size:13px;font-weight:700;cursor:pointer" onmouseover="this.style.background='#e0a80e'" onmouseout="this.style.background='#14919b'">
            ✍️ Proceed to File Complaint →
          </button>
        </div>
      </div>
    </div>
    <!-- RIGHT PANEL: PDF Preview -->
    <div style="flex:1;background:#525659;display:flex;flex-direction:column;overflow:hidden">
      <!-- Toolbar -->
      <div style="background:#3c3f41;padding:8px 18px;display:flex;align-items:center;gap:12px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.1)">
        <span style="font-size:12px;color:#ccc;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">KP Form No. 7 — Complaint (Preview)</span>
        <span style="font-size:11px;color:#aaa;background:rgba(255,255,255,0.1);padding:3px 10px;border-radius:4px">100%</span>
      </div>
      <!-- "PDF" page -->
      <div style="flex:1;overflow-y:auto;padding:24px;display:flex;justify-content:center">
        <div style="background:#fff;width:595px;min-height:842px;box-shadow:0 4px 24px rgba(0,0,0,0.4);border-radius:2px;padding:0">
          ${pdfPreviewHtml}
        </div>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend',html);
}

function closeFcPreviewAndOpenForm7(){
  const el=document.getElementById('fc-preview-root');
  if(el)el.remove();
  openNewCaseForm7Modal();
}

// Open KP Forms split-panel for a specific case's Form 7 attachment
function openForm7AttachmentPreview(caseId){
  openKpFormsFromView(caseId);
}

// ── NEW CASE — FORM 7 (COMPLAINT) DARK MODAL ─────────────────────────────────
function openNewCaseForm7Modal(){
  const existing=document.getElementById('form7-modal-root');
  if(existing)existing.remove();
  state.form7ModalOpen=true;
  const now=new Date();
  const autoTime=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const caseNo=genCaseNo();
  const caseTitles=getCaseTitles();
  const html=`<div id="form7-modal-root" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:400;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)closeForm7Modal()">
    <div style="background:#ffffff;border-radius:12px;width:560px;max-width:97vw;max-height:94vh;display:flex;flex-direction:column;box-shadow:0 16px 50px rgba(0,0,0,0.18);color:#0d2137">
      <!-- Header -->
      <div style="padding:16px 22px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:#f9fafb;border-radius:12px 12px 0 0">
        <div style="font-size:15px;font-weight:700;color:#0d3d3a">New Case</div>
        <button onclick="closeForm7Modal()" style="border:none;background:#e5e7eb;color:#6b7280;font-size:15px;font-weight:700;cursor:pointer;padding:4px 10px;border-radius:6px;line-height:1" onmouseover="this.style.background='#d1d5db'" onmouseout="this.style.background='#e5e7eb'">×</button>
      </div>
      <!-- Body -->
      <div style="padding:18px 22px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:12px">
        <!-- Case number + Date filed -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Case number</label>
            <input id="f7_caseNo" value="${escHtml(caseNo)}" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
          </div>
          <div>
            <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Date filed</label>
            <input type="date" id="f7_dateFiled" value="${todayStr()}" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" oninput="f7SyncCaseNo(false)" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
          </div>
        </div>
        <!-- Time filed + Nature of case -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Time filed</label>
            <input type="time" id="f7_timeFiled" value="${autoTime}" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
          </div>
          <div>
            <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Nature of case</label>
            <select id="f7_nature" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box;cursor:pointer" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
              <option value="">Select...</option>
              <option value="Civil">Civil</option>
              <option value="Criminal">Criminal</option>
            </select>
          </div>
        </div>
        <!-- Case Title -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
            <label style="font-size:12px;color:#6b7280;font-weight:500">Case Title</label>
            <button onclick="openManageCaseTitlesModal()" title="Manage case titles" style="border:none;background:#f3f4f6;color:#6b7280;font-size:13px;font-weight:700;cursor:pointer;padding:2px 8px;border-radius:5px;line-height:1.4" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">⋮</button>
          </div>
          <select id="f7_caseTitle" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box;cursor:pointer" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
            <option value="">Select...</option>
            ${caseTitles.map(t=>`<option value="${escHtml(t)}">${escHtml(t)}</option>`).join('')}
          </select>
        </div>
        <!-- Complainant -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Complainant</label>
            <input id="f7_complainant" placeholder="Full name" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
          </div>
          <div>
            <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Complainant contact no.</label>
            <input id="f7_complainantContact" placeholder="e.g. 09XXXXXXXXX" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
          </div>
        </div>
        <!-- Complainant address -->
        <div>
          <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Complainant address</label>
          <input id="f7_complainantAddr" placeholder="Purok, Barangay, City" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
        </div>
        <!-- Respondent(s) -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Respondent(s)</label>
            <input id="f7_respondent" placeholder="Full name(s)" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
          </div>
          <div>
            <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Respondent contact no.</label>
            <input id="f7_respondentContact" placeholder="e.g. 09XXXXXXXXX" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
          </div>
        </div>
        <!-- Respondent address -->
        <div>
          <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Respondent address</label>
          <input id="f7_respondentAddr" placeholder="Purok, Barangay, City" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
        </div>
        <!-- Lupon Chairman/Punong Barangay -->
        <div>
          <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Lupon Chairman/Punong Barangay</label>
          <input id="f7_chairman" value="HON. ABUNDIO A. LEONES" placeholder="Hon. ..." style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
        </div>
        <!-- Complaint narrative -->
        <div>
          <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Complaint narrative</label>
          <textarea id="f7_narrative" rows="4" placeholder="Brief description..." style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box;resize:vertical;font-family:inherit" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'"></textarea>
        </div>
      </div>
      <!-- Footer -->
      <div style="padding:14px 22px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;background:#f9fafb;border-radius:0 0 12px 12px">
        <button onclick="closeForm7Modal()" style="padding:9px 20px;border-radius:8px;background:#fff;border:1px solid #d1d5db;color:#374151;font-size:13px;font-weight:500;cursor:pointer" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='#fff'">Cancel</button>
        <button onclick="fileComplaintForm7()" style="padding:9px 22px;border-radius:8px;background:#0d3d3a;color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer" onmouseover="this.style.background='#0a5055'" onmouseout="this.style.background='#0d3d3a'">File Complaint</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  renderNav();
}

function closeForm7Modal(){
  const el=document.getElementById('form7-modal-root');
  if(el)el.remove();
  state.form7ModalOpen=false;
  renderNav();
}

// ── EDIT CASE — reuse Form 7 modal pre-filled ─────────────────────────────────
// ─── CASE ACTIONS DROPDOWN ────────────────────────────────────────────────────
function toggleCaseActionsMenu(caseId){
  const menu=document.getElementById('case-actions-menu-'+caseId);
  if(!menu)return;
  const isOpen=menu.style.display!=='none';
  // Close all open menus first
  document.querySelectorAll('[id^="case-actions-menu-"]').forEach(m=>m.style.display='none');
  if(!isOpen){
    menu.style.display='block';
    // Close when clicking outside
    setTimeout(()=>{
      document.addEventListener('click',function _close(e){
        if(!menu.contains(e.target)&&!document.getElementById('case-actions-wrap-'+caseId)?.contains(e.target)){
          menu.style.display='none';
          document.removeEventListener('click',_close);
        }
      });
    },10);
  }
}
function closeCaseActionsMenu(caseId){
  const menu=document.getElementById('case-actions-menu-'+caseId);
  if(menu)menu.style.display='none';
}

// ─── ADD REMARKS MODAL ────────────────────────────────────────────────────────
function openAddRemarksModal(caseId){
  const existing=document.getElementById('add-remarks-modal');
  if(existing)existing.remove();
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;
  const html=`<div id="add-remarks-modal" style="position:fixed;inset:0;z-index:9200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55)" onclick="if(event.target===this)document.getElementById('add-remarks-modal').remove()">
    <div style="background:#fff;border-radius:14px;width:480px;max-width:95vw;box-shadow:0 16px 48px rgba(0,0,0,0.26);overflow:hidden;display:flex;flex-direction:column">
      <div style="background:#0891b2;padding:16px 20px;display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:15px;font-weight:700;color:#fff">✏️ Add / Update Remarks</div>
        <button onclick="document.getElementById('add-remarks-modal').remove()" style="background:rgba(255,255,255,0.18);border:none;color:#fff;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">×</button>
      </div>
      <div style="padding:20px">
        <div style="font-size:12px;font-weight:600;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.4px">Case No.</div>
        <div style="font-size:13px;font-weight:700;color:#0d3d3a;margin-bottom:14px">${escHtml(c.caseNo||'—')}</div>
        <div style="font-size:12px;font-weight:600;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.4px">Remarks</div>
        <textarea id="add-remarks-textarea" rows="4" placeholder="Enter remarks or notes for this case..." style="width:100%;padding:10px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box;resize:vertical;font-family:inherit;line-height:1.5" onfocus="this.style.borderColor='#0891b2'" onblur="this.style.borderColor='#d1d5db'">${escHtml(c.remarks||'')}</textarea>
        <div style="font-size:11px;color:#9ba3ae;margin-top:6px">This replaces the current remarks. Leave blank to clear.</div>
      </div>
      <div style="padding:14px 20px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;gap:10px;justify-content:flex-end">
        <button onclick="document.getElementById('add-remarks-modal').remove()" style="padding:9px 20px;border-radius:8px;border:1px solid #d1d5db;background:#fff;color:#374151;font-size:13px;font-weight:600;cursor:pointer">Cancel</button>
        <button onclick="saveAddRemarks('${caseId}')" style="padding:9px 20px;border-radius:8px;border:none;background:#0891b2;color:#fff;font-size:13px;font-weight:600;cursor:pointer" onmouseover="this.style.background='#0e7490'" onmouseout="this.style.background='#0891b2'">Save Remarks</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html);
  setTimeout(()=>{const ta=document.getElementById('add-remarks-textarea');if(ta){ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);}},50);
}
function saveAddRemarks(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;
  const ta=document.getElementById('add-remarks-textarea');
  if(!ta)return;
  c.remarks=ta.value.trim();
  saveData('ltia_cases',state.cases);
  document.getElementById('add-remarks-modal').remove();
  showToast('Remarks saved successfully.','success',3000);
  render();
}

// ─── UPLOAD ATTACHMENT MODAL ──────────────────────────────────────────────────
function openUploadAttachmentModal(caseId){
  const existing=document.getElementById('upload-attachment-modal');
  if(existing)existing.remove();
  window._uploadAttachFile=null;

  const html=`<div id="upload-attachment-modal" style="position:fixed;inset:0;z-index:9200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55)" onclick="if(event.target===this)closeUploadAttachmentModal()">
    <div style="background:#fff;border-radius:14px;width:480px;max-width:95vw;box-shadow:0 16px 48px rgba(0,0,0,0.26);overflow:hidden;display:flex;flex-direction:column">
      <!-- Header -->
      <div style="background:#0d3d3a;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div>
          <div style="font-size:15px;font-weight:700;color:#fff">📎 Upload Attachment</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px">Add a document to this case</div>
        </div>
        <button onclick="closeUploadAttachmentModal()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center" onmouseover="this.style.background='rgba(255,255,255,0.28)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">✕</button>
      </div>
      <!-- Body -->
      <div style="padding:22px 22px 16px">
        <!-- Custom file name -->
        <div style="margin-bottom:16px">
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px">Document Label <span style="font-weight:400;color:#9ba3ae">(optional — uses file name if blank)</span></label>
          <input id="upload-attach-label" type="text" placeholder="e.g. Sinumpaang Salaysay, Affidavit, Form 16…" style="width:100%;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#0d3d3a'" onblur="this.style.borderColor='#e5e7eb'">
        </div>
        <!-- Drop zone -->
        <div id="upload-attach-dropzone" style="border:2px dashed #b2dfe2;border-radius:10px;padding:28px 20px;text-align:center;cursor:pointer;background:#f8faff;transition:all 0.15s"
          onclick="document.getElementById('upload-attach-input').click()"
          ondragover="event.preventDefault();this.style.background='#e6f4f5';this.style.borderColor='#0d3d3a'"
          ondragleave="this.style.background='#f8faff';this.style.borderColor='#b2dfe2'"
          ondrop="handleUploadAttachDrop(event)">
          <div style="font-size:36px;margin-bottom:8px">📄</div>
          <div style="font-size:13px;font-weight:700;color:#0d3d3a">Click to upload or drag &amp; drop</div>
          <div style="font-size:11px;color:#9ba3ae;margin-top:4px">PDF, DOCX, JPG, PNG accepted</div>
        </div>
        <input type="file" id="upload-attach-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="display:none" onchange="handleUploadAttachFileSelect(this)">
        <!-- File preview -->
        <div id="upload-attach-preview" style="display:none;margin-top:12px;padding:10px 14px;background:#e6f4f5;border:1px solid #b2dfe2;border-radius:8px;align-items:center;gap:10px">
          <span style="font-size:22px">📎</span>
          <div style="flex:1;min-width:0">
            <div id="upload-attach-fname" style="font-size:13px;font-weight:600;color:#0d3d3a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div>
            <div id="upload-attach-fsize" style="font-size:11px;color:#6b7280"></div>
          </div>
          <button onclick="clearUploadAttachFile()" style="border:none;background:none;color:#dc2626;font-size:20px;cursor:pointer;line-height:1;padding:0 4px;flex-shrink:0" title="Remove">×</button>
        </div>
      </div>
      <!-- Footer -->
      <div style="padding:14px 22px;border-top:1px solid #f0f2f5;display:flex;justify-content:flex-end;gap:8px;background:#fafafa;flex-shrink:0">
        <button onclick="closeUploadAttachmentModal()" style="padding:9px 18px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;color:#374151;font-size:13px;font-weight:600;cursor:pointer" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='#fff'">Cancel</button>
        <button onclick="confirmUploadAttachment('${caseId}')" style="padding:9px 22px;border-radius:8px;border:none;background:#0d3d3a;color:#fff;font-size:13px;font-weight:700;cursor:pointer" onmouseover="this.style.background='#0a5055'" onmouseout="this.style.background='#0d3d3a'">📎 Save Attachment</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}
function closeUploadAttachmentModal(){
  const m=document.getElementById('upload-attachment-modal');
  if(m)m.remove();
  window._uploadAttachFile=null;
}
function handleUploadAttachFileSelect(input){
  if(input.files&&input.files[0]) applyUploadAttachFile(input.files[0]);
}
function handleUploadAttachDrop(e){
  e.preventDefault();
  const dz=document.getElementById('upload-attach-dropzone');
  if(dz){dz.style.background='#f8faff';dz.style.borderColor='#b2dfe2';}
  const f=e.dataTransfer.files[0];
  if(f) applyUploadAttachFile(f);
}
function applyUploadAttachFile(file){
  window._uploadAttachFile=file;
  const preview=document.getElementById('upload-attach-preview');
  const fname=document.getElementById('upload-attach-fname');
  const fsize=document.getElementById('upload-attach-fsize');
  if(preview){preview.style.display='flex';}
  if(fname) fname.textContent=file.name;
  if(fsize) fsize.textContent=file.size?Math.round(file.size/1024)+' KB':'';
  // Auto-fill label if blank
  const lbl=document.getElementById('upload-attach-label');
  if(lbl&&!lbl.value.trim()){
    lbl.value=file.name.replace(/\.[^.]+$/,''); // strip extension
  }
}
function clearUploadAttachFile(){
  window._uploadAttachFile=null;
  const inp=document.getElementById('upload-attach-input');
  if(inp) inp.value='';
  const preview=document.getElementById('upload-attach-preview');
  if(preview) preview.style.display='none';
}
function confirmUploadAttachment(caseId){
  const file=window._uploadAttachFile;
  if(!file){ showToast('Please select a file to upload.','warning'); return; }
  const labelEl=document.getElementById('upload-attach-label');
  const customLabel=(labelEl&&labelEl.value.trim())||file.name;
  const reader=new FileReader();
  reader.onload=e=>{
    const c=state.cases.find(x=>x.id===caseId);
    if(!c){ showToast('Case not found.','error'); return; }
    if(!c.attachments) c.attachments=[];
    const now=new Date().toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'});
    c.attachments.push({
      name:`${customLabel} (${now})`,
      dataUrl:e.target.result,
      size:file.size,
    });
    saveData('ltia_cases',state.cases);
    closeUploadAttachmentModal();
    render();
    showToast('Attachment saved to case.','success',3000);
  };
  reader.readAsDataURL(file);
}

function openEditCaseForm7Modal(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;
  const existing=document.getElementById('form7-modal-root');
  if(existing)existing.remove();
  const caseTitles=getCaseTitles();
  const esc=escHtml;
  const html=`<div id="form7-modal-root" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:400;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)closeForm7Modal()">
    <div style="background:#ffffff;border-radius:12px;width:560px;max-width:97vw;max-height:94vh;display:flex;flex-direction:column;box-shadow:0 16px 50px rgba(0,0,0,0.18);color:#0d2137">
      <!-- Header -->
      <div style="padding:16px 22px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:#f9fafb;border-radius:12px 12px 0 0">
        <div style="font-size:15px;font-weight:700;color:#0d3d3a">Edit Case</div>
        <button onclick="closeForm7Modal()" style="border:none;background:#e5e7eb;color:#6b7280;font-size:15px;font-weight:700;cursor:pointer;padding:4px 10px;border-radius:6px;line-height:1" onmouseover="this.style.background='#d1d5db'" onmouseout="this.style.background='#e5e7eb'">×</button>
      </div>
      <!-- Body -->
      <div style="padding:18px 22px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Case number</label>
            <input id="f7_caseNo" value="${esc(c.caseNo||'')}" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
          </div>
          <div>
            <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Date filed</label>
            <input type="date" id="f7_dateFiled" value="${esc(c.dateFiled||'')}" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" oninput="f7SyncCaseNo(true)" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Time filed</label>
            <input type="time" id="f7_timeFiled" value="${esc(c.timeFiled||'')}" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
          </div>
          <div>
            <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Nature of case</label>
            <select id="f7_nature" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box;cursor:pointer" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
              <option value="">Select...</option>
              <option value="Civil" ${c.nature==='Civil'?'selected':''}>Civil</option>
              <option value="Criminal" ${c.nature==='Criminal'?'selected':''}>Criminal</option>
            </select>
          </div>
        </div>
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
            <label style="font-size:12px;color:#6b7280;font-weight:500">Case Title</label>
            <button onclick="openManageCaseTitlesModal()" title="Manage case titles" style="border:none;background:#f3f4f6;color:#6b7280;font-size:13px;font-weight:700;cursor:pointer;padding:2px 8px;border-radius:5px;line-height:1.4" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">⋮</button>
          </div>
          <select id="f7_caseTitle" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box;cursor:pointer" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
            <option value="">Select...</option>
            ${caseTitles.map(t=>`<option value="${esc(t)}" ${(c.caseTitle||c.type)===t?'selected':''}>${esc(t)}</option>`).join('')}
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Complainant</label>
            <input id="f7_complainant" value="${esc(c.complainant||'')}" placeholder="Full name" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
          </div>
          <div>
            <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Complainant contact no.</label>
            <input id="f7_complainantContact" value="${esc(c.complainantContact||'')}" placeholder="e.g. 09XXXXXXXXX" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
          </div>
        </div>
        <div>
          <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Complainant address</label>
          <input id="f7_complainantAddr" value="${esc(c.complainantAddress||'')}" placeholder="Purok, Barangay, City" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Respondent(s)</label>
            <input id="f7_respondent" value="${esc(c.respondent||'')}" placeholder="Full name(s)" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
          </div>
          <div>
            <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Respondent contact no.</label>
            <input id="f7_respondentContact" value="${esc(c.respondentContact||'')}" placeholder="e.g. 09XXXXXXXXX" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
          </div>
        </div>
        <div>
          <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Respondent address</label>
          <input id="f7_respondentAddr" value="${esc(c.respondentAddress||'')}" placeholder="Purok, Barangay, City" style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
        </div>
        <div>
          <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Lupon Chairman/Punong Barangay</label>
          <input id="f7_chairman" value="${esc(c._lupanChairman||c.mediator||'')}" placeholder="Hon. ..." style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
        </div>
        <div>
          <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:5px">Complaint narrative</label>
          <textarea id="f7_narrative" rows="4" placeholder="Brief description..." style="width:100%;padding:9px 11px;background:#fff;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box;resize:vertical;font-family:inherit" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">${esc(c._narrative||'')}</textarea>
        </div>
      </div>
      <!-- Footer -->
      <div style="padding:14px 22px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;background:#f9fafb;border-radius:0 0 12px 12px">
        <button onclick="closeForm7Modal()" style="padding:9px 20px;border-radius:8px;background:#fff;border:1px solid #d1d5db;color:#374151;font-size:13px;font-weight:500;cursor:pointer" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='#fff'">Cancel</button>
        <button onclick="saveEditCaseForm7('${caseId}')" style="padding:9px 22px;border-radius:8px;background:#0d3d3a;color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer" onmouseover="this.style.background='#0a5055'" onmouseout="this.style.background='#0d3d3a'">Save Changes</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function saveEditCaseForm7(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;
  const gv=id=>{const el=document.getElementById(id);return el?el.value.trim():'';};
  if(!gv('f7_complainant')){alert('Complainant name is required.');return;}
  if(!gv('f7_respondent')){alert('Respondent name is required.');return;}
  c.caseNo       = gv('f7_caseNo')||c.caseNo;
  c.dateFiled    = gv('f7_dateFiled')||c.dateFiled;
  c.timeFiled    = gv('f7_timeFiled')||c.timeFiled;
  c.nature       = gv('f7_nature')||c.nature;
  c.type         = c.nature;
  c.caseTitle    = gv('f7_caseTitle')||c.caseTitle;
  c.complainant  = gv('f7_complainant');
  c.complainantAddress = gv('f7_complainantAddr');
  c.complainantContact = gv('f7_complainantContact');
  c.respondent   = gv('f7_respondent');
  c.respondentAddress  = gv('f7_respondentAddr');
  c.respondentContact  = gv('f7_respondentContact');
  c._lupanChairman = gv('f7_chairman')||c._lupanChairman;
  c.mediator     = c._lupanChairman;
  c._narrative   = gv('f7_narrative');
  saveData('ltia_cases',state.cases);
  closeForm7Modal();
  state.viewCasePage=caseId;
  render();
  showToast('Case updated successfully!','success',3000);
}

// ── MANAGE CASE TITLES MODAL ──────────────────────────────────────────────────
function openManageCaseTitlesModal(){
  const existing=document.getElementById('manage-titles-modal-root');
  if(existing)existing.remove();
  renderManageCaseTitlesModal();
}
function renderManageCaseTitlesModal(){
  const titles=getCaseTitles();
  const itemsHtml=titles.map((t,i)=>{
    const isDefault=DEFAULT_CASE_TITLES.includes(t);
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;margin-bottom:8px">
      <span style="font-size:13px;color:#0d2137">${escHtml(t)}</span>
      ${isDefault
        ? `<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:#f0f2f5;color:#6b7280;font-weight:500">default</span>`
        : `<button onclick="removeCaseTitleItem(${i})" style="display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;background:#fff5f5;color:#c0392b;border:1px solid #fbbaba;font-size:12px;font-weight:600;cursor:pointer" onmouseover="this.style.background='#ffe8e8'" onmouseout="this.style.background='#fff5f5'">&#x2715; Remove</button>`
      }
    </div>`;
  }).join('');
  const html=`<div id="manage-titles-modal-root" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:500;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)closeManageCaseTitlesModal()">
    <div style="background:#fff;border-radius:14px;width:460px;max-width:97vw;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 16px 50px rgba(0,0,0,0.22)">
      <div style="padding:18px 22px 12px;border-bottom:1px solid #f0f0f0;display:flex;align-items:flex-start;justify-content:space-between;flex-shrink:0">
        <div>
          <div style="font-size:15px;font-weight:700;color:#0d2137">Manage Case Titles</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px">Add or remove case title options</div>
        </div>
        <button onclick="closeManageCaseTitlesModal()" style="border:none;background:#f0f2f5;color:#6b7280;font-size:16px;font-weight:700;cursor:pointer;padding:4px 10px;border-radius:6px;line-height:1" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f0f2f5'">&#x2715;</button>
      </div>
      <div style="padding:18px 22px;overflow-y:auto;flex:1">
        <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px">Current Options</div>
        <div id="mct-items-list">${itemsHtml}</div>
        <div style="margin-top:8px;padding:14px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px">
          <div style="font-size:12px;font-weight:700;color:#14919b;margin-bottom:10px">+ ADD NEW OPTION</div>
          <div style="display:flex;gap:8px">
            <input id="mct-new-input" placeholder="Enter case title..." style="flex:1;padding:9px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;color:#0d2137;outline:none;background:#fff" onfocus="this.style.borderColor='#14919b'" onblur="this.style.borderColor='#ddd'" onkeydown="if(event.key==='Enter')addNewCaseTitleItem()">
            <button onclick="addNewCaseTitleItem()" style="padding:9px 18px;border-radius:8px;background:#14919b;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer" onmouseover="this.style.background='#077a7d'" onmouseout="this.style.background='#14919b'">Add</button>
          </div>
        </div>
      </div>
      <div style="padding:14px 22px;border-top:1px solid #f0f0f0;display:flex;justify-content:flex-end;background:#f9fafb;border-radius:0 0 14px 14px;flex-shrink:0">
        <button onclick="closeSaveCaseTitlesModal()" style="padding:9px 24px;border-radius:8px;background:#0d3d3a;color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer" onmouseover="this.style.background='#0a5055'" onmouseout="this.style.background='#0d3d3a'">Done</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}
function removeCaseTitleItem(idx){
  let titles=getCaseTitles();
  titles.splice(idx,1);
  saveCaseTitles(titles);
  const el=document.getElementById('manage-titles-modal-root');
  if(el)el.remove();
  renderManageCaseTitlesModal();
}
function addNewCaseTitleItem(){
  const inp=document.getElementById('mct-new-input');
  if(!inp)return;
  const val=inp.value.trim();
  if(!val){inp.focus();return;}
  let titles=getCaseTitles();
  if(titles.includes(val)){showToast('That case title already exists.','warning');return;}
  titles.push(val);
  saveCaseTitles(titles);
  const el=document.getElementById('manage-titles-modal-root');
  if(el)el.remove();
  renderManageCaseTitlesModal();
}
function closeSaveCaseTitlesModal(){
  const el=document.getElementById('manage-titles-modal-root');
  if(el)el.remove();
  const sel=document.getElementById('f7_caseTitle');
  if(sel){
    const titles=getCaseTitles();
    const cur=sel.value;
    sel.innerHTML=`<option value="">Select...</option>`+titles.map(t=>`<option value="${escHtml(t)}" style="background:#2a2d35"${t===cur?' selected':''}>${escHtml(t)}</option>`).join('');
  }
}
function closeManageCaseTitlesModal(){
  closeSaveCaseTitlesModal();
}

function fileComplaintForm7(){
  const gv=id=>{const el=document.getElementById(id);return el?el.value.trim():'';};
  const caseNo=gv('f7_caseNo');
  const complainant=gv('f7_complainant');
  const respondent=gv('f7_respondent');
  if(!complainant){alert('Complainant name is required.');return;}
  if(!respondent){alert('Respondent name is required.');return;}

  const newCase={
    id:genId(),
    caseNo:caseNo||genCaseNo(),
    dateFiled:gv('f7_dateFiled')||todayStr(),
    timeFiled:gv('f7_timeFiled')||'',
    complainant, complainantAddress:gv('f7_complainantAddr'),
    complainantContact:gv('f7_complainantContact'),
    respondent, respondentAddress:gv('f7_respondentAddr'),
    respondentContact:gv('f7_respondentContact'),
    caseTitle:gv('f7_caseTitle'),
    nature:gv('f7_nature'), type:gv('f7_nature'),
    actionTaken:'', dateConfrontation:'', dateResolved:'',
    status:'Ongoing',
    mediator:gv('f7_chairman'),
    remarks:'',
    attachments:[],
    _kpStep:1,
    _lupanChairman:gv('f7_chairman'),
    _narrative:gv('f7_narrative')
  };
  state.cases.push(newCase);
  // Auto-generate Form 7 PDF and save to attachments BEFORE first render
  try {
    const {jsPDF}=window.jspdf;
    const doc7=new jsPDF({unit:'mm',format:'a4'});
    const formData={
      caseNo:newCase.caseNo, dateFiled:newCase.dateFiled, timeFiled:newCase.timeFiled,
      complainant:newCase.complainant, complainantAddress:newCase.complainantAddress,
      respondent:newCase.respondent, respondentAddress:newCase.respondentAddress,
      caseTitle:newCase.caseTitle, chairman:newCase.mediator||'HON. ABUNDIO A. LEONES'
    };
    _fillKpForm7(doc7,formData);
    const uri7=doc7.output('datauristring');
    const now=new Date().toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'});
    newCase.attachments=[{name:`Form 7 – Complaint (${now})`, dataUrl:uri7, size:0, _generated:true}];
  } catch(e){ /* jsPDF not loaded yet — will show Generate button in attachments panel */ }
  saveData('ltia_cases',state.cases);
  closeForm7Modal();
  state.page='dashboard';
  state.viewCasePage=newCase.id;
  render();
  showToast('Complaint filed successfully! Case ' + newCase.caseNo + ' has been created.', 'success', 4000);
}
function schedModalBack(){
  // Close modal entirely instead of going back to list
  closeSchedulesModal();
}
function closeSchedulesModal(){
  state.schedulesModalOpen=false;
  state.schedModalView='list';
  state.schedModalFormData=null;
  state.calPopup=null;
  const el=document.getElementById('sched-modal-root');
  if(el)el.remove();
}
function rerenderSchedModal(){
  // Preserve the scroll position of the modal body before re-render
  let scrollTop=0;
  const existing=document.getElementById('sched-modal-root');
  if(existing){
    const scrollEl=document.getElementById('sched-modal-body');
    if(scrollEl)scrollTop=scrollEl.scrollTop;
    existing.remove();
  }
  renderSchedulesModalDom();
  // Restore scroll position after new DOM is inserted
  if(scrollTop>0){
    const scrollEl=document.getElementById('sched-modal-body');
    if(scrollEl)scrollEl.scrollTop=scrollTop;
  }
}

function schedModalGetData(){
  const d=state.schedModalFormData||{};
  const gv=id=>{const el=document.getElementById(id);return el?el.value.trim():'';};
  return {
    ...d,
    caseNo:      gv('sm_caseNo')||d.caseNo||'',
    dateFiled:   gv('sm_dateFiled')||d.dateFiled||'',
    timeFiled:   gv('sm_timeFiled')||d.timeFiled||'',
    complainantName:    gv('sm_cName')||d.complainantName||'',
    complainantContact: gv('sm_cContact')||d.complainantContact||'',
    complainantAddress: gv('sm_cAddress')||d.complainantAddress||'',
    respondentName:     gv('sm_rName')||d.respondentName||'',
    respondentContact:  gv('sm_rContact')||d.respondentContact||'',
    respondentAddress:  gv('sm_rAddress')||d.respondentAddress||'',
    caseTitle:   gv('sm_caseTitle')||d.caseTitle||'',
    location:    gv('sm_location')||d.location||'',
    chairman:    gv('sm_chairman')||d.chairman||'HON. ABUNDIO A. LEONES',
    schedDate:   d.schedDate||'',
    schedTime:   d.schedTime||'',
    lupons:      d.lupons||[],
  };
}
function schedModalAddLupon(){
  if(!state.schedModalFormData)return;
  _syncSchedModalInputs();
  const existing=state.schedModalFormData.lupons||[];
  const available=LUPON_MEMBERS.filter(m=>!existing.includes(m));
  showLuponPickerModal(available,(name)=>{
    state.schedModalFormData.lupons=[...existing,name];
    rerenderSchedModal();
  });
}
function schedModalRemoveLupon(idx){
  if(!state.schedModalFormData)return;
  _syncSchedModalInputs();
  const lupons=[...(state.schedModalFormData.lupons||[])];
  lupons.splice(idx,1);
  state.schedModalFormData.lupons=lupons;
  rerenderSchedModal();
}
function wizAddLupon(){
  const w=state.schedWizard; if(!w)return;
  const existing=w.data.lupons||[];
  const available=LUPON_MEMBERS.filter(m=>!existing.includes(m));
  showLuponPickerModal(available,(name)=>{
    w.data.lupons=[...existing,name];render();
  });
}
function wizRemoveLupon(idx){
  const w=state.schedWizard; if(!w)return;
  const lupons=[...(w.data.lupons||[])];
  lupons.splice(idx,1);
  w.data.lupons=lupons;render();
}
function showLuponPickerModal(available,onSelect){
  const oldEl=document.getElementById('lupon-picker-overlay');if(oldEl)oldEl.remove();
  window._luponPickerCallback=onSelect;
  window._luponPickerOptions=available;
  const opts=available.map((m,i)=>`<div onclick="luponPickerSelect(${i})" style="padding:10px 14px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='#e0f4f4'" onmouseout="this.style.background='#fff'"><span style="color:#14919b;font-weight:700">+</span>${m}</div>`).join('');
  const html=`<div id="lupon-picker-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:600;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)closeLuponPicker()">
    <div style="background:#fff;border-radius:14px;width:400px;max-width:95vw;box-shadow:0 12px 40px rgba(0,0,0,0.22);overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:15px;font-weight:700">Add Lupon Member</div>
        <button onclick="closeLuponPicker()" style="border:none;background:none;font-size:22px;cursor:pointer;color:#888;line-height:1">&times;</button>
      </div>
      <div style="padding:16px 20px;display:flex;flex-direction:column;gap:8px;max-height:340px;overflow-y:auto">
        ${opts.length>0?opts:'<div style="text-align:center;color:#9ba3ae;font-size:13px;padding:12px">All default members already added.</div>'}
        <div onclick="luponPickerCustom()" style="padding:10px 14px;border-radius:8px;border:1px dashed #b2e0e0;background:#f0fafa;cursor:pointer;font-size:13px;color:#14919b;font-weight:600;text-align:center;margin-top:4px">+ Enter custom name...</div>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}
function luponPickerSelect(idx){
  const name=window._luponPickerOptions[idx];
  closeLuponPicker();
  if(window._luponPickerCallback)window._luponPickerCallback(name);
}
function luponPickerCustom(){
  const name=prompt('Enter lupon member name:','');
  if(name&&name.trim()){closeLuponPicker();if(window._luponPickerCallback)window._luponPickerCallback(name.trim());}
}
function closeLuponPicker(){const el=document.getElementById('lupon-picker-overlay');if(el)el.remove();}
function schedModalSaveConfirm(){
  const d=schedModalGetData();
  if(d._isNewCase&&!d._caseId){
    if(!d.complainantName){alert('Complainant name is required.');return;}
    if(!d.respondentName){alert('Respondent name is required.');return;}
  }
  if(!d.schedDate){alert('Please select a hearing date.');return;}
  if(!d.schedTime){alert('Please select a hearing time.');return;}
  showConfirmDialog(
    'Save Schedule',
    'Are you sure you want to save this schedule?<br><br><strong>Case No.:</strong> '+escHtml(d.caseNo||'—')+'<br><strong>Hearing:</strong> '+escHtml(d.schedDate)+' at '+escHtml(d.schedTime)+'<br><strong>Lupon Members:</strong> '+escHtml((d.lupons||[]).join(', ')||'None'),
    ()=>schedModalSave()
  );
}
function showConfirmDialog(title,msg,onConfirm){
  const oldEl=document.getElementById('confirm-dialog-overlay');if(oldEl)oldEl.remove();
  window._confirmCallback=onConfirm;
  const html=`<div id="confirm-dialog-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:700;display:flex;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:14px;width:420px;max-width:95vw;box-shadow:0 12px 40px rgba(0,0,0,0.22);overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px">
        <span style="font-size:22px">&#128203;</span>
        <div style="font-size:15px;font-weight:700">${title}</div>
      </div>
      <div style="padding:18px 20px;font-size:13px;color:#374151;line-height:1.7">${msg}</div>
      <div style="padding:14px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:10px">
        <button onclick="closeConfirmDialog()" style="padding:8px 18px;border-radius:8px;background:#fff;border:1px solid #ddd;font-size:13px;font-weight:500;cursor:pointer;color:#5c6370">Cancel</button>
        <button onclick="confirmDialogOk()" style="padding:8px 20px;border-radius:8px;background:#0d3d3a;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer">&#10004; Confirm</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}
function closeConfirmDialog(){const el=document.getElementById('confirm-dialog-overlay');if(el)el.remove();}
function confirmDialogOk(){closeConfirmDialog();if(window._confirmCallback)window._confirmCallback();}
function showSuccessDialog(msg){
  const oldEl=document.getElementById('success-dialog-overlay');if(oldEl)oldEl.remove();
  const html=`<div id="success-dialog-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:800;display:flex;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:14px;width:380px;max-width:95vw;box-shadow:0 12px 40px rgba(0,0,0,0.22);overflow:hidden;text-align:center">
      <div style="padding:32px 28px 24px">
        <div style="font-size:52px;margin-bottom:14px">&#9989;</div>
        <div style="font-size:17px;font-weight:700;margin-bottom:8px;color:#0d3d3a">Schedule Saved!</div>
        <div style="font-size:13px;color:#5c6370;line-height:1.6">${msg}</div>
      </div>
      <div style="padding:0 24px 22px">
        <button onclick="closeSuccessDialog()" style="width:100%;padding:10px 0;border-radius:8px;background:#0d3d3a;color:#fff;border:none;font-size:14px;font-weight:600;cursor:pointer">OK</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}
function closeSuccessDialog(){const el=document.getElementById('success-dialog-overlay');if(el)el.remove();}


// ── KP PROCESS RECORD ─────────────────────────────────────────────────────────
const KP_STEPS = [
  { step:1, form:'Form 7',  title:'Complaint filed',       desc:'Complaint received and docketed' },
  { step:2, form:'Form 8',  title:'Mediation scheduled',   desc:'Notice of hearing sent to complainant' },
  { step:3, form:'Form 9',  title:'Respondents summoned',  desc:'Summons issued to respondents' },
  { step:4, form:'Form 10', title:'Pangkat formed',        desc:'Pangkat Tagapagkasundo constituted' },
  { step:5, form:'Form 11', title:'Members assigned',      desc:'Notices sent to chosen members' },
  { step:6, form:'Form 12', title:'Conciliation hearing',  desc:'Pangkat hears and conciliates dispute' },
  { step:7, form:'Form 16', title:'Amicable settlement',   desc:'Agreement signed by all parties' },
];

function openKpProcessRecord(caseId){
  state.page='dashboard';
  state.kpRecordCaseId=caseId;
  state.filterStatCard=null;
  render();
}
function closeKpProcessRecord(){
  state.kpRecordCaseId=null;
  render();
}
function kpAdvanceStep(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;
  const cur=c._kpStep||1;
  if(cur>=7)return;
  c._kpStep=cur+1;
  saveData('ltia_cases',state.cases);
  render();
}
function kpMarkDismissed(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;
  showConfirm('Mark as Dismissed','Mark this case as dismissed? Status will be set to CFA.',()=>{
    c.status='CFA'; c._kpDismissed=true;
    saveData('ltia_cases',state.cases);
    showToast('Case marked as dismissed.','info');
    render();
  },'Mark Dismissed','#7c3aed');
}
function kpCertifyToCourt(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;
  showConfirm('Certify to Court','Issue Certificate to File Action (CFA) for this case?',()=>{
    c.status='CFA'; c._kpCertified=true;
    saveData('ltia_cases',state.cases);
    showToast('Case certified to court (CFA issued).','info');
    render();
  },'Certify','#0d3d3a');
}

function issueCFA(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;
  showConfirm(
    'File Certificate to File Action',
    'Are you sure you want to file a certificate to file action?',
    ()=>{
      c.status='CFA';
      c._cfaFiled=true;
      c._cfaDate=todayStr();
      saveData('ltia_cases',state.cases);
      showToast('Certificate to File Action filed. Case marked as dismissed.','info');
      render();
    },
    'File CFA',
    '#dc2626'
  );
}

function reopenCase(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;
  const prevStatus=c.status;
  const prevResolved=c.dateResolved||'';
  const prevAction=c.actionTaken||'';
  let prevSummary='';
  if(prevStatus==='Settled') prevSummary='Settled'+(prevResolved?' on '+prevResolved:'')+(prevAction?' via '+prevAction:'');
  else if(prevStatus==='CFA') prevSummary=c._cfaFiled?'CFA - Certificate to File Action Filed':c._kpCertified?'CFA - Certified to Court':c._kpDismissed?'CFA - Dismissed':'CFA';
  else prevSummary=prevStatus;
  const medSessions=c._medSessions||[];
  const concSessions=c._concSessions||[];
  let continueFrom='';
  for(let i=concSessions.length-1;i>=0;i--){if(concSessions[i].outcome==='settled'){continueFrom='Lupon Conciliation Session '+(i+1);break;}}
  if(!continueFrom){for(let i=medSessions.length-1;i>=0;i--){if(medSessions[i].outcome==='settled'){continueFrom='Mediation Session '+(i+1);break;}}}
  const continueNote=continueFrom?'<br><br>Will continue from <strong>'+continueFrom+'</strong> &mdash; that session outcome will be cleared so it can proceed.':'';
  showConfirm(
    'Reopen Case',
    'Reopen <strong>'+escHtml(c.caseNo||'this case')+'</strong>?<br><br>Current resolution: <strong>'+prevSummary+'</strong>'+continueNote+'<br><br>The case will be restored to <strong>Ongoing</strong> and sessions will continue from where it was settled.',
    ()=>_doReopenCase(caseId),
    'Reopen Case',
    '#b45309'
  );
}

function _doReopenCase(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;
  if(!c._reopenLog) c._reopenLog=[];
  c._reopenLog.push({
    date:todayStr(),
    prevStatus:c.status,
    prevResolved:c.dateResolved||'',
    prevAction:c.actionTaken||'',
    prevMedSessions:JSON.parse(JSON.stringify(c._medSessions||[])),
    prevConcSessions:JSON.parse(JSON.stringify(c._concSessions||[]))
  });
  // Clear only the last settled session outcome so the case continues from there
  const mSess=c._medSessions||[];
  const cSess=c._concSessions||[];
  let cleared=false;
  for(let i=cSess.length-1;i>=0;i--){if(cSess[i].outcome==='settled'){cSess[i].outcome='';cleared=true;break;}}
  if(!cleared){for(let i=mSess.length-1;i>=0;i--){if(mSess[i].outcome==='settled'){mSess[i].outcome='';break;}}}
  // Reset case-level status only; all sessions preserved
  c.status='Ongoing';
  c.dateResolved='';
  c.actionTaken='';
  c._kpDismissed=false;
  c._kpCertified=false;
  c._cfaFiled=false;
  c._cfaDate=null;
  c._submissionDeadline=null;
  saveData('ltia_cases',state.cases);
  showToast('Case reopened - continuing from last settled session.','info',4000);
  state.viewCasePage=caseId;
  render();
}

function renderKpProcessRecord(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return'';
  const step=c._kpStep||1;
  const esc=escHtml;

  // LEFT: Case details panel
  const left=`<div style="width:260px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">
    <button onclick="closeKpProcessRecord()" style="display:flex;align-items:center;gap:6px;padding:7px 14px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:12px;font-weight:600;color:#ccc;cursor:pointer;align-self:flex-start" onmouseover="this.style.background='#353840'" onmouseout="this.style.background='#2a2d35'">← Back to cases</button>
    <div style="background:#2a2d35;border-radius:10px;padding:16px">
      <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px">CASE DETAILS</div>
      ${kpDRow('Case no.', esc(c.caseNo||'—'), true)}
      ${kpDRow('Nature', esc(c.caseTitle||c.nature||c.type||'—'))}
      ${kpDRow('Date filed', esc(fmtDateWords(c.dateFiled||'—')))}
      ${kpDRow('Complainant', esc((c.complainant||'—').toUpperCase()))}
      ${kpDRow('Respondent(s)', esc((c.respondent||'—').toUpperCase()))}
      ${kpDRow('Lupon Chairman/Punong Barangay', esc(c.mediator||c._lupanChairman||'—'))}
    </div>

    <div style="background:#2a2d35;border-radius:10px;padding:16px">
      <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px">HEARING SCHEDULE</div>
      ${(()=>{const scheds=state.schedules.filter(s=>s._caseId===c.id||s.caseNo===c.caseNo);
        if(!scheds.length)return`<div style="font-size:12px;color:#6b7280;margin-bottom:10px">No hearings scheduled.</div>
          <button onclick="openSchedulesModal('${c.id}')" style="padding:7px 14px;background:#2d3748;border:1px solid rgba(255,255,255,0.2);border-radius:7px;font-size:12px;font-weight:600;color:#e8eaed;cursor:pointer">+ Add hearing</button>`;
        return scheds.map(s=>`<div style="font-size:12px;color:#d1d5db;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.07)">${esc(s.schedDate||'—')} at ${esc(s.schedTime||'—')}${s.location?' — '+esc(s.location):''}</div>`).join('')
         +`<button onclick="openSchedulesModal('${c.id}')" style="margin-top:10px;padding:7px 14px;background:#2d3748;border:1px solid rgba(255,255,255,0.2);border-radius:7px;font-size:12px;font-weight:600;color:#e8eaed;cursor:pointer">+ Add hearing</button>`;
      })()}
    </div>
  </div>`;

  // RIGHT: KP Process steps
  const stepsHtml=KP_STEPS.map(s=>{
    const isDone=step>s.step;
    const isCurrent=step===s.step;
    const dateLine=isCurrent&&c.dateFiled?`${c.dateFiled} — Filed and docketed`:'';
    return `<div style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-radius:10px;background:${isCurrent?'rgba(255,255,255,0.06)':'transparent'};border:${isCurrent?'1px solid rgba(255,255,255,0.18)':'1px solid transparent'}">
      <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;margin-top:2px;background:${isDone?'#e8eaed':isCurrent?'#3b82f6':'#2a2d35'};color:${isDone?'#1a1d23':isCurrent?'#fff':'#6b7280'};border:${isDone||isCurrent?'none':'1px solid rgba(255,255,255,0.15)'}">
        ${isDone?'✓':s.step}
      </div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:${isDone?'rgba(255,255,255,0.12)':isCurrent?'rgba(59,130,246,0.25)':'rgba(255,255,255,0.07)'};color:${isDone?'#9ca3af':isCurrent?'#6dd4da':'#6b7280'}">${s.form}</span>
          <span style="font-size:13px;font-weight:600;color:${isDone?'#9ca3af':isCurrent?'#e8eaed':'#6b7280'}">${s.title}</span>
          ${isCurrent&&step<7?`<button onclick="kpAdvanceStep('${c.id}')" style="margin-left:auto;padding:3px 10px;background:#e8eaed;color:#1a1d23;border:none;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer" onmouseover="this.style.background='#fff'" onmouseout="this.style.background='#e8eaed'">Advance ›</button>`:''}
        </div>
        <div style="font-size:12px;color:#6b7280">${s.desc}</div>
        ${dateLine?`<div style="font-size:11px;color:#4b5563;margin-top:3px">${esc(dateLine)}</div>`:''}
      </div>
    </div>`;
  }).join('');

  const right=`<div style="flex:1;min-width:0">
    <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:14px">KP PROCESS RECORD</div>
    <div style="display:flex;flex-direction:column;gap:4px">
      ${stepsHtml}
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:20px">
      <button onclick="kpMarkDismissed('${c.id}')" style="padding:10px 0;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;font-weight:600;color:#e8eaed;cursor:pointer;width:100%" onmouseover="this.style.background='#353840'" onmouseout="this.style.background='#2a2d35'">Mark dismissed</button>
      <button onclick="kpCertifyToCourt('${c.id}')" style="padding:10px 0;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;font-weight:600;color:#e8eaed;cursor:pointer;width:100%" onmouseover="this.style.background='#353840'" onmouseout="this.style.background='#2a2d35'">Certify to court</button>
    </div>
  </div>`;

  return `<div style="min-height:100vh;background:#1a1d23;padding:28px 32px;display:flex;gap:24px;align-items:flex-start">
    ${left}
    ${right}
  </div>`;
}

function kpDRow(label, val, isLink){
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
    <span style="font-size:12px;color:#6b7280;flex-shrink:0;margin-right:10px">${label}</span>
    <span style="font-size:12px;font-weight:600;color:${isLink?'#60a5fa':'#e8eaed'};text-align:right;word-break:break-word">${val}</span>
  </div>`;
}

function schedModalSave(){
  const d=schedModalGetData();
  if(d._isNewCase&&!d._caseId){
    if(!d.complainantName){alert('Complainant name is required.');return;}
    if(!d.respondentName){alert('Respondent name is required.');return;}
  }
  if(!d.schedDate){alert('Please select a hearing date.');return;}
  if(!d.schedTime){alert('Please select a hearing time.');return;}

  // Create new case if standalone
  if(d._isNewCase&&!d._caseId){
    const newCase={
      id:genId(), caseNo:d.caseNo, dateFiled:d.dateFiled||todayStr(),
      timeFiled:d.timeFiled||'',
      complainant:d.complainantName, complainantContact:d.complainantContact||'',
      complainantAddress:d.complainantAddress||'',
      respondent:d.respondentName, respondentContact:d.respondentContact||'',
      respondentAddress:d.respondentAddress||'',
      caseTitle:d.caseTitle||'', nature:d.nature||'', type:d.nature||d.caseTitle||'',
      actionTaken:'', dateConfrontation:d.schedDate||'', dateResolved:'',
      status:'Ongoing', mediator:'', remarks:'', attachments:[]
    };
    state.cases.push(newCase);
    saveData('ltia_cases',state.cases);
    d._caseId=newCase.id;
  }

  const rec={
    id:genId(), caseNo:d.caseNo, dateFiled:d.dateFiled,
    complainant:d.complainantName, complainantContact:d.complainantContact,
    complainantAddress:d.complainantAddress,
    respondent:d.respondentName, respondentContact:d.respondentContact,
    respondentAddress:d.respondentAddress,
    caseTitle:d.caseTitle, schedDate:d.schedDate, schedTime:d.schedTime,
    location:d.location, chairman:d.chairman||'HON. ABUNDIO A. LEONES',
    timeFiled:d.timeFiled, lupons:d.lupons||[], _caseId:d._caseId||null
  };
  state.schedules.push(rec);
  saveData('ltia_schedules',state.schedules);

  // Close modal, open KP Forms print preview
  state.schedulesModalOpen=false;
  state.schedModalView='list';
  state.schedModalFormData=null;
  state.calPopup=null;
  state.page='dashboard';
  state.filterStatCard=null;
  // Open KP Forms modal with the newly saved schedule
  state.kpFormsData={
    caseNo: rec.caseNo,
    dateFiled: rec.dateFiled,
    timeFiled: rec.timeFiled,
    complainant: rec.complainant,
    complainantAddress: rec.complainantAddress||'',
    respondent: rec.respondent,
    respondentAddress: rec.respondentAddress||'',
    caseTitle: rec.caseTitle,
    schedDate: rec.schedDate,
    schedTime: rec.schedTime,
    chairman: rec.chairman||'HON. ABUNDIO A. LEONES',
    officer: 'RAMIL  ROSALES'
  };
  render();
  showToast('Schedule saved successfully!','success');
  showSuccessDialog('The schedule for Case No. <strong>'+escHtml(rec.caseNo||'')+'</strong> has been saved. Hearing on <strong>'+escHtml(rec.schedDate||'')+'</strong> at <strong>'+escHtml(rec.schedTime||'')+'</strong>.');
}

function schedModalToggleLupon(name){
  if(!state.schedModalFormData)return;
  const lupons=state.schedModalFormData.lupons||[];
  const idx=lupons.indexOf(name);
  if(idx>-1)lupons.splice(idx,1);else lupons.push(name);
  state.schedModalFormData.lupons=[...lupons];
  // Sync input values before rerender
  _syncSchedModalInputs();
  rerenderSchedModal();
}
function _syncSchedModalInputs(){
  const d=state.schedModalFormData; if(!d)return;
  const gv=id=>{const el=document.getElementById(id);return el?el.value.trim():null;};
  const upd={};
  ['sm_caseNo','sm_dateFiled','sm_timeFiled','sm_cName','sm_cContact','sm_cAddress',
   'sm_rName','sm_rContact','sm_rAddress','sm_caseTitle','sm_location','sm_chairman'].forEach(id=>{
    const v=gv(id); if(v!==null)upd[id.replace('sm_','')]=v;
  });
  if(upd.caseNo!==undefined)d.caseNo=upd.caseNo;
  if(upd.dateFiled!==undefined)d.dateFiled=upd.dateFiled;
  if(upd.timeFiled!==undefined)d.timeFiled=upd.timeFiled;
  if(upd.cName!==undefined)d.complainantName=upd.cName;
  if(upd.cContact!==undefined)d.complainantContact=upd.cContact;
  if(upd.cAddress!==undefined)d.complainantAddress=upd.cAddress;
  if(upd.rName!==undefined)d.respondentName=upd.rName;
  if(upd.rContact!==undefined)d.respondentContact=upd.rContact;
  if(upd.rAddress!==undefined)d.respondentAddress=upd.rAddress;
  if(upd.caseTitle!==undefined)d.caseTitle=upd.caseTitle;
  if(upd.location!==undefined)d.location=upd.location;
  if(upd.chairman!==undefined)d.chairman=upd.chairman;
}
function schedModalSelectDate(dateStr){
  if(!state.schedModalFormData)return;
  _syncSchedModalInputs();
  state.schedModalFormData.schedDate=dateStr;
  state.calPopup='smtime';
  rerenderSchedModal();
}
function schedModalSelectTime(t){
  if(!state.schedModalFormData)return;
  _syncSchedModalInputs();
  state.schedModalFormData.schedTime=t;
  state.calPopup=null;
  rerenderSchedModal();
}
function schedModalToggleCal(which){
  _syncSchedModalInputs();
  state.calPopup=state.calPopup===which?null:which;
  const selDate=state.schedModalFormData&&state.schedModalFormData.schedDate;
  const dateFiled=state.schedModalFormData&&state.schedModalFormData.dateFiled;
  const navFrom=selDate||dateFiled||null;
  if(navFrom){const dt=new Date(navFrom+'T00:00:00');state.calViewYear=dt.getFullYear();state.calViewMonth=dt.getMonth();}
  else{state.calViewYear=new Date().getFullYear();state.calViewMonth=new Date().getMonth();}
  rerenderSchedModal();
}
function schedModalCalNav(dir){
  _syncSchedModalInputs();
  state.calViewMonth+=dir;
  if(state.calViewMonth>11){state.calViewMonth=0;state.calViewYear++;}
  if(state.calViewMonth<0){state.calViewMonth=11;state.calViewYear--;}
  rerenderSchedModal();
}
function renderSchedModalCalendar(){
  const yr=state.calViewYear,mo=state.calViewMonth;
  const firstDay=new Date(yr,mo,1).getDay(),daysInMonth=new Date(yr,mo+1,0).getDate();
  const today=new Date();
  const ts=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const selected=state.schedModalFormData&&state.schedModalFormData.schedDate;

  // 15-day window from dateFiled
  const dateFiled=state.schedModalFormData&&state.schedModalFormData.dateFiled;
  let windowStart='', windowEnd='';
  if(dateFiled){
    const filedMs=new Date(dateFiled+'T00:00:00').getTime();
    windowStart=dateFiled;
    windowEnd=new Date(filedMs+15*24*60*60*1000).toISOString().slice(0,10);
  }
  const hasWindow=windowStart&&windowEnd;

  let cells='';
  for(let i=0;i<firstDay;i++)cells+=`<div class="cal-day empty"></div>`;
  for(let d=1;d<=daysInMonth;d++){
    const ds=`${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isDeadline=hasWindow&&ds===windowEnd;
    const inWindow=hasWindow&&ds>=windowStart&&ds<=windowEnd;
    const outWindow=hasWindow&&!inWindow;
    const extraClass=isDeadline?'deadline-day':inWindow?'in-window':outWindow?'out-window':'';
    const onclick=outWindow?'':`onclick="schedModalSelectDate('${ds}')"`;
    cells+=`<button class="cal-day ${calClass(getDateLoad(ds))} ${ds===ts?'today':''} ${ds===selected?'selected':''} ${extraClass}" ${onclick}>${d}</button>`;
  }

  const deadlineBanner=hasWindow?`<div class="cal-deadline-banner">
    ⏰ <strong>15-day window:</strong> ${windowStart} → <strong>${windowEnd}</strong><br>
    <span style="opacity:0.8">KP requires hearing within 15 days of filing.</span>
  </div>`:'';

  return `<div class="cal-popup" onclick="event.stopPropagation()">
    <div style="font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:${hasWindow?'6px':'10px'}">Select Date</div>
    ${deadlineBanner}
    <div class="cal-header">
      <button class="cal-nav" onclick="schedModalCalNav(-1)">‹</button>
      <span class="cal-month-label">${MONTHS[mo]} ${yr}</span>
      <button class="cal-nav" onclick="schedModalCalNav(1)">›</button>
    </div>
    <div class="cal-days-header">${['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>`<span>${d}</span>`).join('')}</div>
    <div class="cal-days">${cells}</div>
    <div class="cal-legend">
      <div class="cal-legend-item"><div class="cal-legend-dot" style="background:rgba(34,197,94,0.4)"></div>Available</div>
      <div class="cal-legend-item"><div class="cal-legend-dot" style="background:rgba(251,191,36,0.4)"></div>Limited</div>
      <div class="cal-legend-item"><div class="cal-legend-dot" style="background:rgba(239,68,68,0.4)"></div>Full</div>
      ${hasWindow?`<div class="cal-legend-item"><div class="cal-legend-dot" style="outline:2px solid rgba(200,150,12,0.7);background:transparent"></div>In window</div>`:''}
      ${hasWindow?`<div class="cal-legend-item"><div class="cal-legend-dot" style="background:rgba(200,150,12,0.35)"></div>Deadline</div>`:''}
    </div>
  </div>`;
}
function renderSchedModalTimePopup(){
  const sel=state.schedModalFormData&&state.schedModalFormData.schedTime;
  const selDate=state.schedModalFormData&&state.schedModalFormData.schedDate;
  const avail=Math.max(0,4-(selDate?getDateLoad(selDate):0));
  return `<div class="time-popup" onclick="event.stopPropagation()">
    <div class="time-label">Select Time Slot</div>
    <div class="time-slots">${TIME_SLOTS.map(t=>`<button class="time-slot${t===sel?' selected':''}" onclick="schedModalSelectTime('${t}')">${t}</button>`).join('')}</div>
    <div class="time-note">${avail} slots available on this day (max 4)</div>
  </div>`;
}

function renderSchedulesModalDom(){
  const existing=document.getElementById('sched-modal-root');
  if(existing)existing.remove();
  const scheds=state.schedules;
  const isForm=state.schedModalView==='form';
  const d=state.schedModalFormData||{};
  const isNew=d._isNewCase&&!d._caseId;
  const caseTitles=getCaseTitles();

  let innerContent='';
  if(!isForm){
    // ── LIST VIEW ──
    const rows=scheds.length?`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr>
        <th style="padding:9px 14px;text-align:left;font-weight:600;font-size:11px;color:#5c6370;border-bottom:1px solid #eee;white-space:nowrap;text-transform:uppercase;letter-spacing:0.4px;background:#f0f2f5">Complaint No.</th>
        <th style="padding:9px 14px;text-align:left;font-weight:600;font-size:11px;color:#5c6370;border-bottom:1px solid #eee;text-transform:uppercase;letter-spacing:0.4px;background:#f0f2f5">Case Title</th>
        <th style="padding:9px 14px;text-align:left;font-weight:600;font-size:11px;color:#5c6370;border-bottom:1px solid #eee;text-transform:uppercase;letter-spacing:0.4px;background:#f0f2f5">Parties</th>
        <th style="padding:9px 14px;text-align:left;font-weight:600;font-size:11px;color:#5c6370;border-bottom:1px solid #eee;text-transform:uppercase;letter-spacing:0.4px;background:#f0f2f5">Date</th>
        <th style="padding:9px 14px;text-align:left;font-weight:600;font-size:11px;color:#5c6370;border-bottom:1px solid #eee;text-transform:uppercase;letter-spacing:0.4px;background:#f0f2f5">Time</th>
        <th style="padding:9px 14px;text-align:left;font-weight:600;font-size:11px;color:#5c6370;border-bottom:1px solid #eee;text-transform:uppercase;letter-spacing:0.4px;background:#f0f2f5">Location</th>
        <th style="padding:9px 14px;text-align:left;font-weight:600;font-size:11px;color:#5c6370;border-bottom:1px solid #eee;text-transform:uppercase;letter-spacing:0.4px;background:#f0f2f5">Lupon Members</th>
        <th style="padding:9px 14px;text-align:left;font-weight:600;font-size:11px;color:#5c6370;border-bottom:1px solid #eee;text-transform:uppercase;letter-spacing:0.4px;background:#f0f2f5">Actions</th>
      </tr></thead>
      <tbody>${scheds.map((s,i)=>`<tr>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;vertical-align:middle"><strong>${escHtml(s.caseNo||'—')}</strong></td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;vertical-align:middle">${escHtml(s.caseTitle||'—')}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;vertical-align:middle;font-size:12px">${escHtml(s.complainant&&s.respondent?(s.complainant+' vs '+s.respondent).toUpperCase():'—')}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;vertical-align:middle;font-size:12px;color:#5c6370">${escHtml(s.schedDate||'—')}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;vertical-align:middle;font-size:12px">${escHtml(s.schedTime||'—')}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;vertical-align:middle">${escHtml(s.location||'—')}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;vertical-align:middle;font-size:12px;color:#5c6370;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml((s.lupons||[]).join(', ')||'—')}</td>
        <td style="padding:10px 14px;border-bottom:${i===scheds.length-1?'none':'1px solid #eee'};vertical-align:middle">
          <button onclick="deleteSched('${s.id}')" style="padding:4px 11px;font-size:12px;border-radius:6px;background:#fff5f5;color:#c0392b;border:1px solid #fbbaba;cursor:pointer">Delete</button>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>`
    :`<div style="text-align:center;padding:60px 24px;color:#9ba3ae;font-size:13px">No schedules yet. Click "+ Set Schedule" to add one.</div>`;
    innerContent=rows;
  } else {
    // ── FORM VIEW ──
    const selDate=d.schedDate, selTime=d.schedTime, selectedLupons=d.lupons||[];
    innerContent=`<div style="padding:20px 24px">
      ${isNew
        ?`<div style="padding:10px 14px;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;font-size:12px;color:#2e7d32;margin-bottom:16px">
            🆕 <strong>New Complaint</strong> — Auto Case No.: <strong>${escHtml(d.caseNo||'')}</strong> · Status will be set to <strong>Ongoing</strong>
          </div>
          <div style="background:#f5f5f5;border-radius:10px;padding:16px 18px;margin-bottom:14px">
            <div style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:14px;text-decoration:underline">PARTIES INVOLVED</div>
            <div style="background:#fff;border-radius:10px;padding:14px 16px;margin-bottom:10px;border:1px solid #e5e7eb">
              <div style="display:flex;align-items:center;gap:7px;margin-bottom:12px"><div style="width:28px;height:28px;border-radius:50%;background:#14919b;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff">C</div><span style="font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;background:#e0f4f4;color:#14919b">Complainant</span></div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                <div><label style="font-size:12px;color:#5c6370;font-weight:500;display:block;margin-bottom:4px">Full Name</label><input class="wiz-input" id="sm_cName" value="${escHtml(d.complainantName||'')}" placeholder="e.g Juan Dela Cruz" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase"></div>
                <div><label style="font-size:12px;color:#5c6370;font-weight:500;display:block;margin-bottom:4px">Contact No.</label><input class="wiz-input" id="sm_cContact" value="${escHtml(d.complainantContact||'')}" placeholder="e.g 09XXXXXXXXX"></div>
              </div>
              <div><label style="font-size:12px;color:#5c6370;font-weight:500;display:block;margin-bottom:4px">Address</label><input class="wiz-input" id="sm_cAddress" value="${escHtml(d.complainantAddress||'')}" placeholder="Block, Lot, Street, Barangay"></div>
            </div>
            <div style="background:#fff;border-radius:10px;padding:14px 16px;border:1px solid #e5e7eb">
              <div style="display:flex;align-items:center;gap:7px;margin-bottom:12px"><div style="width:28px;height:28px;border-radius:50%;background:#2a9d8f;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff">R</div><span style="font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;background:#fde8e2;color:#2a9d8f">Respondent</span></div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                <div><label style="font-size:12px;color:#5c6370;font-weight:500;display:block;margin-bottom:4px">Full Name</label><input class="wiz-input" id="sm_rName" value="${escHtml(d.respondentName||'')}" placeholder="e.g Juan Dela Cruz" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase"></div>
                <div><label style="font-size:12px;color:#5c6370;font-weight:500;display:block;margin-bottom:4px">Contact No.</label><input class="wiz-input" id="sm_rContact" value="${escHtml(d.respondentContact||'')}" placeholder="e.g 09XXXXXXXXX"></div>
              </div>
              <div><label style="font-size:12px;color:#5c6370;font-weight:500;display:block;margin-bottom:4px">Address</label><input class="wiz-input" id="sm_rAddress" value="${escHtml(d.respondentAddress||'')}" placeholder="Block, Lot, Street, Barangay"></div>
            </div>
          </div>`
        :`<div style="padding:8px 14px;background:#e6f4f5;border:1px solid #b2dfe2;border-radius:8px;font-size:12px;color:#0d3d3a;margin-bottom:16px">
            📄 Scheduling for: <strong>${escHtml(d.caseNo||'')}</strong> — ${escHtml(d.complainantName||'')} vs ${escHtml(d.respondentName||'')}
          </div>`}

      <div style="background:#f5f5f5;border-radius:10px;padding:16px 18px;margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:14px;text-decoration:underline">CASE INFORMATION</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#5c6370;font-weight:500;display:block;margin-bottom:4px">Case Title</label>
            <div style="display:flex;gap:6px">
              <select class="wiz-input" id="sm_caseTitle" style="flex:1">
                <option value="">Select...</option>
                ${caseTitles.map(t=>`<option value="${escHtml(t)}"${d.caseTitle===t?' selected':''}>${escHtml(t)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div>
            <label style="font-size:12px;color:#5c6370;font-weight:500;display:block;margin-bottom:4px">Time Filed (TF)</label>
            <input type="time" class="wiz-input" id="sm_timeFiled" value="${escHtml(d.timeFiled||'')}">
          </div>
        </div>
      </div>

      <div style="background:#f5f5f5;border-radius:10px;padding:16px 18px;margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:14px;text-decoration:underline">HEARING SCHEDULE</div>
        ${(()=>{
          const filed=d.dateFiled;
          if(!filed) return '';
          const filedMs=new Date(filed+'T00:00:00').getTime();
          const deadline=new Date(filedMs+15*24*60*60*1000).toISOString().slice(0,10);
          const today=todayStr();
          const daysLeft=Math.round((new Date(deadline+'T00:00:00')-new Date(today+'T00:00:00'))/86400000);
          const isOver=daysLeft<0, isDue=daysLeft===0, isUrgent=daysLeft>=0&&daysLeft<=3;
          const bg=isOver?'rgba(185,50,50,0.12)':isDue||isUrgent?'rgba(251,191,36,0.15)':'rgba(200,150,12,0.1)';
          const border=isOver?'rgba(185,50,50,0.35)':isDue||isUrgent?'rgba(251,191,36,0.5)':'rgba(200,150,12,0.35)';
          const color=isOver?'#c0392b':isDue||isUrgent?'#0d3d3a':'#7c5c00';
          const icon=isOver?'⚠️':isDue?'🔔':isUrgent?'⏰':'📅';
          const msg=isOver?`Deadline passed (${Math.abs(daysLeft)} days ago) — ${deadline}`:isDue?`Deadline is TODAY — ${deadline}`:isUrgent?`${daysLeft} day${daysLeft===1?'':'s'} left — deadline ${deadline}`:`${daysLeft} days left — deadline ${deadline}`;
          return `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:${bg};border:1px solid ${border};border-radius:8px;font-size:12px;color:${color};font-weight:600;margin-bottom:12px">
            <span style="font-size:15px">${icon}</span>
            <div><strong>15-day KP window:</strong> ${msg}<span style="font-weight:400;opacity:0.8;margin-left:6px">· Filed: ${filed}</span></div>
          </div>`;
        })()}
        <div style="background:#fff;border-radius:8px;padding:14px;border:1px solid #e5e7eb">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label style="font-size:12px;color:#5c6370;font-weight:500;display:block;margin-bottom:4px">Hearing Date</label>
              <div class="cal-wrap">
                <button class="cal-trigger" type="button" onclick="schedModalToggleCal('smdate')">
                  ${selDate?`<span>${selDate}</span>`:`<span class="cal-trigger-placeholder">Select date</span>`}
                </button>
                ${state.calPopup==='smdate'?renderSchedModalCalendar():''}
              </div>
            </div>
            <div>
              <label style="font-size:12px;color:#5c6370;font-weight:500;display:block;margin-bottom:4px">Hearing Time</label>
              <div class="cal-wrap">
                <button class="cal-trigger" type="button" onclick="schedModalToggleCal('smtime')">
                  ${selTime?`<span>${selTime}</span>`:`<span class="cal-trigger-placeholder">Select time</span>`}
                </button>
                ${state.calPopup==='smtime'?renderSchedModalTimePopup():''}
              </div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="font-size:12px;color:#5c6370;font-weight:500;display:block;margin-bottom:4px">Location / Venue</label>
              <input class="wiz-input" id="sm_location" value="${escHtml(d.location||'')}" placeholder="e.g Barangay Hall, Session Room">
            </div>
            <div>
              <label style="font-size:12px;color:#5c6370;font-weight:500;display:block;margin-bottom:4px">Punong Barangay / Lupon Chairman</label>
              <input class="wiz-input" id="sm_chairman" value="${escHtml(d.chairman||'HON. ABUNDIO A. LEONES')}" placeholder="Full name of chairman">
            </div>
          </div>
        </div>
      </div>

      <div style="background:#f5f5f5;border-radius:10px;padding:16px 18px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.8px;text-decoration:underline">LUPON MEMBERS ATTENDING</div>
          <button onclick="schedModalAddLupon()" style="display:flex;align-items:center;gap:5px;padding:5px 11px;border-radius:7px;background:#e0f4f4;color:#14919b;border:1px solid #b2e0e0;font-size:12px;font-weight:600;cursor:pointer">＋ Add Member</button>
        </div>
        <div style="background:#fff;border-radius:8px;padding:12px;border:1px solid #e5e7eb">
          ${selectedLupons.length===0
            ?`<div style="text-align:center;padding:18px;color:#9ba3ae;font-size:12px">No lupon members added yet. Click &ldquo;＋ Add Member&rdquo; to add.</div>`
            :`<div style="display:flex;flex-direction:column;gap:6px">
            ${selectedLupons.map((m,idx)=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f0fafa;border:1px solid #d0eeee;border-radius:8px;font-size:13px">
              <span style="display:flex;align-items:center;gap:8px"><span style="color:#14919b;font-weight:700">✓</span>${escHtml(m)}</span>
              <button onclick="schedModalRemoveLupon(${idx})" style="padding:3px 9px;border-radius:5px;background:#fff5f5;color:#c0392b;border:1px solid #fbbaba;font-size:11px;font-weight:600;cursor:pointer">− Remove</button>
            </div>`).join('')}
            </div>`}
        </div>
      </div>
    </div>`;
  }

  const headerTitle = isForm
    ? `<div style="font-size:16px;font-weight:700">📅 ${d._caseId&&!isNew?'Set Schedule — '+escHtml(d.caseNo||''):'New Schedule'}</div>
       <div style="font-size:12px;color:#5c6370;margin-top:2px">Fill in the hearing details below</div>`
    : `<div style="font-size:16px;font-weight:700">📅 Schedules</div>
       <div style="font-size:12px;color:#5c6370;margin-top:2px">${scheds.length} schedule(s) on record</div>`;

  const headerActions = isForm
    ? `<button onclick="closeSchedulesModal()" title="Close" style="border:none;background:#f0f2f5;font-size:17px;font-weight:700;cursor:pointer;color:#6b7280;line-height:1;padding:5px 10px;border-radius:8px;transition:all 0.15s" onmouseover="this.style.background='#e5e7eb';this.style.color='#1a1a1a'" onmouseout="this.style.background='#f0f2f5';this.style.color='#6b7280'">✕</button>`
    : `<div style="display:flex;align-items:center;gap:10px">
        <button onclick="openSchedulesModalForm()" style="display:flex;align-items:center;gap:7px;padding:8px 16px;border-radius:8px;background:#0d3d3a;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer">＋ Set Schedule</button>
        <button onclick="closeSchedulesModal()" title="Close" style="border:none;background:#f0f2f5;font-size:17px;font-weight:700;cursor:pointer;color:#6b7280;line-height:1;padding:5px 10px;border-radius:8px;transition:all 0.15s" onmouseover="this.style.background='#e5e7eb';this.style.color='#1a1a1a'" onmouseout="this.style.background='#f0f2f5';this.style.color='#6b7280'">✕</button>
      </div>`;
  const smPhase=d._phase||'med';
  const smIsConc=smPhase==='conc';
  const footerActions = isForm
    ? `<div style="padding:14px 24px;border-top:1px solid #eee;background:#fafafa;border-radius:0 0 14px 14px;flex-shrink:0">
        <div style="margin-bottom:12px">
          ${smIsConc
            ? `<div style="padding:8px 14px;background:#f3e8ff;border:1px solid #c4b5fd;border-radius:8px;font-size:12px;color:#14919b;font-weight:600;display:flex;align-items:center;gap:7px;margin-bottom:8px">
                ⚖️ <strong>Conciliation Phase</strong> — Forms to print with this schedule
               </div>
               <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px">
                 <button onclick="schedModalPreviewFormConc('form10')" style="padding:8px 4px;border-radius:7px;border:1px solid #c4b5fd;background:#f3e8ff;color:#14919b;font-size:11px;font-weight:600;cursor:pointer">📋 Form 10</button>
                 <button onclick="schedModalPreviewFormConc('form11')" style="padding:8px 4px;border-radius:7px;border:1px solid #c4b5fd;background:#f3e8ff;color:#14919b;font-size:11px;font-weight:600;cursor:pointer">📋 Form 11</button>
                 <button onclick="schedModalPreviewFormConc('form12')" style="padding:8px 4px;border-radius:7px;border:1px solid #c4b5fd;background:#f3e8ff;color:#14919b;font-size:11px;font-weight:600;cursor:pointer">📋 Form 12</button>
                 <button onclick="schedWizPreviewForm_modal('form9')" style="padding:8px 4px;border-radius:7px;border:1px solid #b2dfe2;background:#e6f4f5;color:#0d3d3a;font-size:11px;font-weight:600;cursor:pointer">👁 Form 9</button>
               </div>
               <div style="margin-top:7px">
                 <button onclick="schedModalDownloadConcForms()" style="width:100%;padding:8px 0;border-radius:7px;border:none;background:#0d3d3a;color:#fff;font-size:12px;font-weight:600;cursor:pointer">⬇ Download All Conciliation Forms (10, 11, 12 &amp; 9)</button>
               </div>`
            : `<div style="padding:8px 14px;background:#e0f4f4;border:1px solid #b2e0e0;border-radius:8px;font-size:12px;color:#14919b;font-weight:600;display:flex;align-items:center;gap:7px;margin-bottom:8px">
                🤝 <strong>Mediation Phase</strong> — Forms to print with this schedule
               </div>
               <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px">
                 <button onclick="schedWizPreviewForm_modal('form8')" style="padding:8px 4px;border-radius:7px;border:1px solid #b2dfe2;background:#e6f4f5;color:#0d3d3a;font-size:12px;font-weight:600;cursor:pointer">👁 Preview Form 8</button>
                 <button onclick="schedWizPreviewForm_modal('form9')" style="padding:8px 4px;border-radius:7px;border:1px solid #b2dfe2;background:#e6f4f5;color:#0d3d3a;font-size:12px;font-weight:600;cursor:pointer">👁 Preview Form 9</button>
                 <button onclick="schedModalDownloadBoth()" style="padding:8px 4px;border-radius:7px;border:none;background:#0d3d3a;color:#fff;font-size:12px;font-weight:600;cursor:pointer">⬇ Download Both</button>
               </div>`
          }
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:12px;color:#9ba3ae">Fill in all required fields before saving</span>
          <div style="display:flex;gap:10px">
            <button onclick="schedModalBack()" style="padding:9px 16px;border-radius:8px;background:#fff;border:1px solid #ddd;font-size:13px;font-weight:500;cursor:pointer;color:#5c6370">← Back</button>
            <button onclick="schedModalSaveConfirm()" style="display:flex;align-items:center;gap:7px;padding:9px 20px;border-radius:8px;background:#0d3d3a;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer">💾 Save Schedule</button>
          </div>
        </div>
      </div>`
    : '';

  const html=`<div id="sched-modal-root" style="position:fixed;inset:0;background:rgba(0,0,0,0.38);z-index:300;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)closeSchedulesModal()">
    <div style="background:#fff;border-radius:14px;width:${isForm?'700px':'920px'};max-width:96vw;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,0.2)">
      <div style="padding:18px 24px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div>${headerTitle}</div>
        ${headerActions}
      </div>
      <div id="sched-modal-body" style="flex:1;overflow-y:auto">
        ${innerContent}
      </div>
      ${footerActions}
    </div>
  </div>`;
  document.getElementById('app').insertAdjacentHTML('beforeend',html);
}
function printSettledForms(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c||(c.attachments||[]).length===0)return;
  const existing=document.getElementById('settled-print-area');
  if(existing)existing.remove();
  const items=c.attachments.map((a,i)=>`
    <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:10px;background:#fafafa">
      <span style="font-size:28px">${a.name.match(/\.(pdf)$/i)?'📑':a.name.match(/\.(docx?|doc)$/i)?'📝':a.name.match(/\.(xlsx?|xls)$/i)?'📊':a.name.match(/\.(jpe?g|png)$/i)?'🖼️':'📄'}</span>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:700">${escHtml(a.name)}</div>
        <div style="font-size:12px;color:#888">${a.size?(Math.round(a.size/1024)+' KB'):'—'}</div>
      </div>
    </div>`).join('');
  const printArea=`<div id="settled-print-area" style="display:none;font-family:serif;color:#111">
    <div style="text-align:center;margin-bottom:24px;border-bottom:2px solid #333;padding-bottom:16px">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#666">Republic of the Philippines · City of Butuan · Barangay Pangabugan</div>
      <div style="font-size:20px;font-weight:700;margin-top:8px">Office of the Lupong Tagapamayapa</div>
      <div style="font-size:14px;font-weight:600;margin-top:4px;color:#0d3d3a">SETTLED CASE — FILED FORMS ON RECORD</div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
      <tr><td style="padding:6px 12px;background:#f5f5f5;font-weight:700;width:40%">Complaint No.</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${escHtml(c.caseNo||'—')}</td></tr>
      <tr><td style="padding:6px 12px;background:#f5f5f5;font-weight:700">Parties</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${escHtml((c.complainant||'—').toUpperCase())} vs. ${escHtml((c.respondent||'—').toUpperCase())}</td></tr>
      <tr><td style="padding:6px 12px;background:#f5f5f5;font-weight:700">Case Title</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${escHtml(c.caseTitle||c.type||'—')}</td></tr>
      <tr><td style="padding:6px 12px;background:#f5f5f5;font-weight:700">Date Filed</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${escHtml(fmtDateWords(c.dateFiled||''))}</td></tr>
      <tr><td style="padding:6px 12px;background:#f5f5f5;font-weight:700">Date Settled</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${escHtml(fmtDateWords(c.dateResolved||''))}</td></tr>
    </table>
    <div style="font-size:14px;font-weight:700;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #ccc;padding-bottom:6px">Filed Forms (${c.attachments.length} file${c.attachments.length!==1?'s':''})</div>
    ${c.attachments.map((a,i)=>`<div style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px"><strong>${i+1}.</strong> ${escHtml(a.name)}</div>`).join('')}
    <div style="margin-top:40px;text-align:right;font-size:11px;color:#888">Printed: ${new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}</div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',printArea);
  document.getElementById('settled-print-area').style.display='block';
  window.print();
  setTimeout(()=>{const el=document.getElementById('settled-print-area');if(el)el.remove();},500);
}

function viewAttachments(caseId,startIdx){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;
  const existing=document.getElementById('attach-modal-root');
  if(existing)existing.remove();

  const atts=c.attachments||[];

  function fileIcon(name){
    if(name.match(/\.pdf$/i))return'📑';
    if(name.match(/\.(docx?|doc)$/i))return'📝';
    if(name.match(/\.(xlsx?|xls)$/i))return'📊';
    if(name.match(/\.(jpe?g|png|gif|webp)$/i))return'🖼️';
    return'📄';
  }

  // Determine which KP Forms tab maps to this attachment name
  function kpTabForName(name){
    if(/Form 8/i.test(name))  return 'form8';
    if(/Form 9/i.test(name))  return 'form9';
    if(/Form 10/i.test(name)) return 'form10';
    if(/Form 11/i.test(name)) return 'form11';
    if(/Form 12/i.test(name)) return 'form12';
    return 'form7';
  }

  const listItems=atts.length?atts.map((a,i)=>{
    const isGenerated  = !!a._generated;
    const isSettlement = !!a._settlement || /Amicable Settlement/i.test(a.name);
    const rowBg     = isSettlement ? '#f0fdf4' : isGenerated ? '#fffbeb' : '#fafafa';
    const rowBorder = isSettlement ? '1px solid #6ee7b7' : isGenerated ? '1px solid #fde68a' : '1px solid #e5e7eb';
    const iconEl    = isSettlement ? '✅' : isGenerated ? '📋' : fileIcon(a.name);
    const subtitleEl = isSettlement
      ? `<div style="font-size:11px;color:#059669;font-weight:600">Amicable Settlement — Form 16</div>`
      : isGenerated
        ? `<div style="font-size:11px;color:#b45309;font-weight:500">KP Generated Form — Edit &amp; Preview</div>`
        : `<div style="font-size:11px;color:#888">${a.size?(Math.round(a.size/1024)+' KB'):'—'}</div>`;
    const dlBtn = `<a href="${a.dataUrl}" download="${escHtml(a.name)}" onclick="event.stopPropagation()" title="Download" style="flex-shrink:0;padding:4px 9px;background:#0d3d3a;color:#fff;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none">⬇</a>`;
    return `<div id="attrow_${i}" onclick="attachSelectRow(${i})" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:${rowBorder};border-radius:8px;margin-bottom:8px;background:${rowBg};cursor:pointer;transition:all 0.12s" data-generated="${isGenerated}" data-settlement="${isSettlement}" data-kptab="${kpTabForName(a.name)}">
      <span style="font-size:20px">${iconEl}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(a.name)}">${escHtml(a.name)}</div>
        ${subtitleEl}
      </div>
      <div style="display:flex;gap:5px;flex-shrink:0;align-items:center">
        ${dlBtn}
      </div>
    </div>`;
  }).join('')
  :`<div style="text-align:center;padding:40px 24px;color:#9ba3ae;font-size:13px">
      <div style="font-size:36px;margin-bottom:10px">📂</div>
      No documents yet.
    </div>`;

  const modal=`<div id="attach-modal-root" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:700;display:flex;align-items:stretch">
    <div style="background:#fff;width:100vw;height:100vh;display:flex;flex-direction:column">
      <!-- Header -->
      <div style="padding:12px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:#0d3d3a">
        <div>
          <div style="font-size:14px;font-weight:700;color:#fff">📎 Documents — ${escHtml(c.caseNo)}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:1px">${escHtml((c.complainant||'').toUpperCase())}${c.respondent?' vs '+escHtml(c.respondent.toUpperCase()):''} · ${atts.length} file(s)</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button onclick="closeAttachModal()" style="border:none;background:rgba(255,255,255,0.15);color:#fff;font-size:20px;cursor:pointer;line-height:1;padding:4px 9px;border-radius:6px">×</button>
        </div>
      </div>
      <!-- 3-panel body -->
      <div style="display:flex;flex:1;overflow:hidden">

        <!-- PANEL 1: File list (fixed width) -->
        <div style="width:280px;min-width:240px;border-right:1px solid #e5e7eb;overflow-y:auto;padding:12px;flex-shrink:0;background:#f9fafb">
          ${listItems}
        </div>

        <!-- PANEL 2: KP Edit fields (shown for generated forms, hidden otherwise) -->
        <div id="attach-kpf-panel" style="width:320px;min-width:280px;border-right:1px solid #e5e7eb;overflow-y:auto;flex-shrink:0;background:#fff;display:none;flex-direction:column">
          <!-- kpf fields injected here -->
        </div>

        <!-- PANEL 3: Preview pane -->
        <div id="attach-preview-pane" style="flex:1;display:flex;align-items:center;justify-content:center;background:#525659;overflow:hidden">
          <div style="text-align:center;color:#888">
            <div style="font-size:56px;margin-bottom:12px">📄</div>
            <div style="font-size:14px;font-weight:600;color:#aaa">Select a file to preview</div>
          </div>
        </div>

      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',modal);

  // Store state for preview/edit functions
  window._attachModalAtts    = atts;
  window._attachModalCaseId  = caseId;
  window._attachModalCase    = c;

  // Auto-select: given index, or first attachment
  const openIdx = (typeof startIdx==='number' && atts[startIdx]) ? startIdx : (atts.length?0:-1);
  if(openIdx>=0) setTimeout(()=>attachSelectRow(openIdx),50);
}

function closeAttachModal(){
  const el=document.getElementById('attach-modal-root');
  if(el)el.remove();
  const caseId=window._attachModalCaseId;
  if(caseId) setTimeout(()=>viewCaseNoNotif(caseId),50);
}

function viewCaseNoNotif(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;
  const existing=document.getElementById('view-case-modal-root');
  if(existing)existing.remove();
  state.viewCasePage=caseId;
  state.page='dashboard';
  // Suppress CFA auto-show modal — caller came from attachment preview, not dashboard
  window._suppressCFAAutoShow = true;
  render();
  // Do NOT show hearing notification modal — caller came from attachment preview
}

// Called when any row in the file list is clicked
function attachSelectRow(idx){
  const atts = window._attachModalAtts||[];
  const a = atts[idx]; if(!a)return;

  // Track which attachment is currently selected (used for session-date-aware preview)
  window._attachModalCurrentIdx = idx;

  // Highlight active row
  document.querySelectorAll('[id^="attrow_"]').forEach(el=>{
    const isGen  = el.dataset.generated==='true';
    const isSett = el.dataset.settlement==='true';
    el.style.background = isSett ? '#f0fdf4' : isGen ? '#fffbeb' : '#fafafa';
    el.style.border     = isSett ? '1px solid #6ee7b7' : isGen ? '1px solid #fde68a' : '1px solid #e5e7eb';
    el.style.fontWeight = '';
    el.classList.remove('att-active');
  });
  const row = document.getElementById('attrow_'+idx);
  if(row){ row.classList.add('att-active'); row.style.background='#dbeafe'; row.style.border='1px solid #6dd4da'; }

  if(a._generated){
    const isSettlement = !!a._settlement || /Amicable Settlement/i.test(a.name);
    if(isSettlement){
      // Amicable Settlement: show edit panel + live PDF preview
      attachShowSettlementEditor(idx);
      // Show stored dataUrl immediately, then live-update re-renders from fields
      const pane2 = document.getElementById('attach-preview-pane');
      if(pane2 && a.dataUrl){ pane2.innerHTML=`<iframe src="${a.dataUrl}" style="width:100%;height:100%;border:none"></iframe>`; }
      const pb = document.getElementById('attach-print-btn');
      if(pb && a.dataUrl){ pb.style.display=''; window._attachPrintUrl=a.dataUrl; window._attachPrintType='pdf'; }
      setTimeout(()=>attachSettlementLiveUpdate(idx), 80);
    } else {
      // Show KP edit panel + live PDF preview
      const tab = row ? row.dataset.kptab : 'form7';
      attachShowKpEditor(idx, tab);
    }
  } else {
    // Hide KP panel, show plain file preview
    const kpPanel = document.getElementById('attach-kpf-panel');
    if(kpPanel){ kpPanel.style.display='none'; }
    attachPlainPreview(idx);
  }
}

// Render the KP edit fields + live PDF in the merged panels
function attachShowKpEditor(idx, tab){
  const c   = window._attachModalCase;
  const atts= window._attachModalAtts||[];
  if(!c) return;

  // Show KP panel
  const kpPanel = document.getElementById('attach-kpf-panel');
  if(!kpPanel) return;
  kpPanel.style.display = 'flex';

  // Use the session date stored on the attachment (_sessionDate) if available
  const att = atts[idx];
  const attSessionDate = att && att._sessionDate ? att._sessionDate : null;
  // Detect if this is a conciliation attachment
  const isConc = att && /Conciliation|Form 11|Form 12|Form 9.*Conc/i.test(att.name);
  const sched = state.schedules
    .filter(s=>s.caseNo===c.caseNo||s._caseId===c.id)
    .sort((a,b)=>(a.schedDate||'').localeCompare(b.schedDate||''))[0] || null;
  // Match session time from med/conc sessions
  let _sessionTime = sched ? sched.schedTime : '1:00 PM';
  if(attSessionDate){
    const allSessions = [...(c._medSessions||[]),...(c._concSessions||[])];
    const ms = allSessions.find(s=>s.date===attSessionDate);
    if(ms && ms.time) _sessionTime = ms.time;
  }
  const d = {
    caseNo:    c.caseNo,
    dateFiled: c.dateFiled,
    timeFiled: sched ? sched.timeFiled : (c.timeFiled||''),
    complainant:        c.complainant,
    complainantAddress: c.complainantAddress||'',
    respondent:         c.respondent,
    respondentAddress:  c.respondentAddress||'',
    schedDate: attSessionDate || (sched ? sched.schedDate : (c.dateConfrontation||c.dateFiled||'')),
    schedTime: _sessionTime,
    caseTitle: c.caseTitle||c.type||'',
    chairman:  sched ? sched.chairman : (c._lupanChairman||c.mediator||'HON. ABUNDIO A. LEONES'),
    officer:   c._servingOfficer||'RAMIL  ROSALES',
    complainantAge: c._complainantAge||'',
    narrative: c._narrative||'',
    relief:    c._relief||'',
    isConc:    isConc || false,
    pangkatChair:     c._pangkatChair     || '',
    pangkatSecretary: c._pangkatSecretary || '',
    pangkatMember:    c._pangkatMember    || ''
  };
  window._attachKpfData = d;
  window._attachKpfData._origSessionDate = attSessionDate || d.schedDate || null;
  window._attachKpfCaseId = c.id;

  const escH = s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  kpPanel.innerHTML = `
    <!-- KPF Panel Header -->
    <div style="background:var(--navy);color:#fff;padding:11px 14px;flex-shrink:0">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="font-size:12px;font-weight:700">✏️ KP Forms — ${escH(d.caseNo)}</div>
        <div style="display:flex;align-items:center;gap:6px">
          <span id="akpf-save-status" style="display:none;font-size:10px;color:#4ade80;font-weight:700;background:rgba(74,222,128,0.15);padding:2px 8px;border-radius:4px">✅ Saved</span>
          <button onclick="attachKpfSave(false)" style="padding:4px 12px;background:#14919b;border:none;color:#fff;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">💾 Save</button>
        </div>
      </div>
      <div style="font-size:10px;opacity:0.65;display:flex;flex-wrap:wrap;gap:2px">
        <span onclick="attachKpfTab('form7')" id="akpftab-form7" style="cursor:pointer;padding:1px 6px;border-radius:3px">Form 7</span>
        <span onclick="attachKpfTab('form8')" id="akpftab-form8" style="cursor:pointer;padding:1px 6px;border-radius:3px">Form 8</span>
        <span onclick="attachKpfTab('form9')" id="akpftab-form9" style="cursor:pointer;padding:1px 6px;border-radius:3px">Form 9</span>
        <span onclick="attachKpfTab('form11')" id="akpftab-form11" style="cursor:pointer;padding:1px 6px;border-radius:3px">Form 11</span>
        <span onclick="attachKpfTab('form12')" id="akpftab-form12" style="cursor:pointer;padding:1px 6px;border-radius:3px">Form 12</span>
      </div>
    </div>
    <!-- Scrollable fields -->
    <div style="flex:1;overflow-y:auto;padding:12px 13px">

      <!-- GENERAL FIELDS -->
      <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid #e5e7eb">General Form Fields</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
        <div>
          <div style="font-size:11px;color:#888;margin-bottom:2px">Complaint No.</div>
          <input class="wiz-input" id="akpf_caseNo" value="${escH(d.caseNo)}" oninput="attachKpfLiveUpdate()" style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          <div>
            <div style="font-size:11px;color:#888;margin-bottom:2px">Date Filed (DF)</div>
            <input type="date" class="wiz-input" id="akpf_dateFiled" value="${escH(d.dateFiled)}" oninput="attachKpfLiveUpdate()" style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box">
          </div>
          <div>
            <div style="font-size:11px;color:#888;margin-bottom:2px">Time Filed (TF)</div>
            <input type="time" class="wiz-input" id="akpf_timeFiled" value="${escH(d.timeFiled)}" oninput="attachKpfLiveUpdate()" style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box">
          </div>
        </div>
        <div>
          <div style="font-size:11px;color:#888;margin-bottom:2px">Complainant Name</div>
          <input class="wiz-input" id="akpf_complainant" value="${escH(d.complainant)}" oninput="attachKpfLiveUpdate()" style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box">
        </div>
        <div>
          <div style="font-size:11px;color:#888;margin-bottom:2px">Respondent Name</div>
          <input class="wiz-input" id="akpf_respondent" value="${escH(d.respondent)}" oninput="attachKpfLiveUpdate()" style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box">
        </div>
        <!-- hidden address inputs so attachKpfGetData() still reads them -->
        <input type="hidden" id="akpf_complainantAddr" value="${escH(d.complainantAddress)}">
        <input type="hidden" id="akpf_respondentAddr" value="${escH(d.respondentAddress)}">
        <div id="akpf-non-form7-fields" style="display:none;flex-direction:column;gap:6px">
        <div>
          <div style="font-size:11px;color:#888;margin-bottom:2px">Nature / For: (Form 9)</div>
          <input class="wiz-input" id="akpf_caseTitle" value="${escH(d.caseTitle)}" oninput="attachKpfLiveUpdate()" style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          <div>
            <div style="font-size:11px;color:#888;margin-bottom:2px">Hearing Date</div>
            <input type="date" class="wiz-input" id="akpf_schedDate" value="${escH(d.schedDate)}" oninput="attachKpfLiveUpdate()" style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box">
          </div>
          <div>
            <div style="font-size:11px;color:#888;margin-bottom:2px">Hearing Time</div>
            <input class="wiz-input" id="akpf_schedTime" value="${escH(d.schedTime)}" placeholder="e.g 1:00 PM" oninput="attachKpfLiveUpdate()" style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box">
          </div>
        </div>
        </div>
        <div>
          <div style="font-size:11px;color:#888;margin-bottom:2px">Punong Barangay / Lupon Chairman</div>
          <input class="wiz-input" id="akpf_chairman" value="${escH(d.chairman)}" oninput="attachKpfLiveUpdate()" style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box">
        </div>
      </div>

      <!-- PANGKAT MEMBERS — shown only for Form 11/12 -->
      <div id="akpf-conc-details" style="display:none">
        <div style="font-size:10px;font-weight:700;color:#14919b;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid #e9d5ff">Pangkat Members</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
          <div>
            <div style="font-size:11px;color:#14919b;font-weight:600;margin-bottom:2px">● Pangkat Chair</div>
            <input class="wiz-input" id="akpf_pangkatChair" value="${escH(d.pangkatChair)}" oninput="attachKpfLiveUpdate()" placeholder="e.g. Juan Dela Cruz" style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box;border-color:#c4b5fd">
          </div>
          <div>
            <div style="font-size:11px;color:#14919b;font-weight:600;margin-bottom:2px">● Pangkat Secretary</div>
            <input class="wiz-input" id="akpf_pangkatSecretary" value="${escH(d.pangkatSecretary)}" oninput="attachKpfLiveUpdate()" placeholder="e.g. Maria Santos" style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box;border-color:#c4b5fd">
          </div>
          <div>
            <div style="font-size:11px;color:#14919b;font-weight:600;margin-bottom:2px">● Pangkat Member</div>
            <input class="wiz-input" id="akpf_pangkatMember" value="${escH(d.pangkatMember)}" oninput="attachKpfLiveUpdate()" placeholder="e.g. Pedro Reyes" style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box;border-color:#c4b5fd">
          </div>
        </div>
      </div>

      <!-- FORM 9 OFFICER — shown only when Form 9 tab is active -->
      <div id="akpf-form9-details" style="display:none">
        <div style="font-size:10px;font-weight:700;color:#14919b;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid #b2e0e0">Form 9 — Page 2 (Officer's Return)</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
          <div>
            <div style="font-size:11px;color:#888;margin-bottom:2px">Serving Officer</div>
            <input class="wiz-input" id="akpf_officer" value="${escH(d.officer||'RAMIL  ROSALES')}" oninput="attachKpfLiveUpdate()" placeholder="e.g. RAMIL ROSALES" style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box">
          </div>
        </div>
      </div>

      <!-- FORM 7 COMPLAINT DETAILS — shown only when Form 7 tab is active -->
      <div id="akpf-form7-details" style="display:block">
        <div style="font-size:10px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid #fee2e2">Form 7 — Complaint Details</div>
        <div style="padding:6px 9px;background:#fff7f7;border:1px solid #fecaca;border-radius:6px;font-size:11px;color:#b91c1c;margin-bottom:8px">✏️ <strong>Red fields</strong> = user-typed text (printed in black)</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
          <div>
            <div style="font-size:11px;color:#dc2626;font-weight:600;margin-bottom:2px">● Complaint Narrative <span style="font-weight:400;color:#888">(printed in black)</span></div>
            <textarea class="wiz-input" id="akpf_narrative" rows="4" oninput="attachKpfLiveUpdate()" placeholder="e.g. Ako si [Name]..." style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box;border-color:#fca5a5;resize:vertical">${escH(d.narrative)}</textarea>
          </div>
          <div>
            <div style="font-size:11px;color:#dc2626;font-weight:600;margin-bottom:2px">● Relief / Prayer <span style="font-weight:400;color:#888">(printed in black)</span></div>
            <textarea class="wiz-input" id="akpf_relief" rows="3" oninput="attachKpfLiveUpdate()" placeholder="e.g. Ang akong purpose..." style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box;border-color:#fca5a5;resize:vertical">${escH(d.relief)}</textarea>
          </div>
        </div>
      </div>

      <!-- hidden placeholders so highlight logic doesn't break -->
      <button id="akpfbtn-form7" style="display:none"></button>
      <button id="akpfbtn-form8" style="display:none"></button>
      <button id="akpfbtn-form9" style="display:none"></button>
    </div>
  `;

  // Set active tab highlight
  attachKpfTab(tab||'form7');
}

// Switch the KP preview tab & re-render the PDF preview inline
function attachKpfTab(which){
  window._attachKpfCurrentTab = which;

  // Update tab header highlights
  ['form7','form8','form9','form11','form12'].forEach(t=>{
    const tabEl = document.getElementById('akpftab-'+t);
    const active = t===which;
    if(tabEl) tabEl.style.cssText = active
      ? 'cursor:pointer;padding:1px 6px;border-radius:3px;margin-right:4px;background:rgba(255,255,255,0.25);font-weight:700'
      : 'cursor:pointer;padding:1px 6px;border-radius:3px;margin-right:4px';
  });

  // Show/hide Form 7 details section
  const f7details = document.getElementById('akpf-form7-details');
  if(f7details) f7details.style.display = which==='form7' ? 'block' : 'none';

  // Hide Nature/For + Hearing Date/Time on Form 7 and Form 11 (not used in those prints)
  const nonF7 = document.getElementById('akpf-non-form7-fields');
  if(nonF7) nonF7.style.display = (which==='form7'||which==='form11') ? 'none' : 'flex';

  // Show/hide Form 9 officer section
  const f9details = document.getElementById('akpf-form9-details');
  if(f9details) f9details.style.display = which==='form9' ? 'block' : 'none';

  // Show/hide Pangkat Members section for Form 11/12 and Form 9 conciliation
  const concDetails = document.getElementById('akpf-conc-details');
  const isConcForm9 = which==='form9' && !!(window._attachKpfData && window._attachKpfData.isConc);
  if(concDetails) concDetails.style.display = (which==='form11'||which==='form12'||isConcForm9) ? 'block' : 'none';

  attachKpfRenderPreview(which);
}

// Read live field values from the embedded edit panel
function attachKpfGetData(){
  const gv = id=>{ const el=document.getElementById(id); return el?el.value.trim():null; };
  const d = window._attachKpfData||{};
  return {
    caseNo:     gv('akpf_caseNo')     ??d.caseNo,
    dateFiled:  gv('akpf_dateFiled')  ??d.dateFiled,
    timeFiled:  gv('akpf_timeFiled')  ??d.timeFiled,
    complainant:gv('akpf_complainant')??d.complainant,
    complainantAddress: gv('akpf_complainantAddr')??d.complainantAddress,
    respondent: gv('akpf_respondent') ??d.respondent,
    respondentAddress:  gv('akpf_respondentAddr') ??d.respondentAddress,
    caseTitle:  gv('akpf_caseTitle')  ??d.caseTitle,
    schedDate:  gv('akpf_schedDate')  ??d.schedDate,
    schedTime:  gv('akpf_schedTime')  ??d.schedTime,
    chairman:   gv('akpf_chairman')   ??(d.chairman||'HON. ABUNDIO A. LEONES'),
    officer:    gv('akpf_officer')    ??(d.officer||'RAMIL  ROSALES'),
    complainantAge: gv('akpf_complainantAge')??d.complainantAge,
    narrative:  gv('akpf_narrative')  ??d.narrative,
    relief:     gv('akpf_relief')     ??d.relief,
    isConc:        d.isConc        || false,
    pangkatChair:     gv('akpf_pangkatChair')     ?? d.pangkatChair     ?? '',
    pangkatSecretary: gv('akpf_pangkatSecretary') ?? d.pangkatSecretary ?? '',
    pangkatMember:    gv('akpf_pangkatMember')    ?? d.pangkatMember    ?? '',
    lupons: (()=>{
      const chair = gv('akpf_pangkatChair') ?? d.pangkatChair ?? '';
      const sec   = gv('akpf_pangkatSecretary') ?? d.pangkatSecretary ?? '';
      const mem   = gv('akpf_pangkatMember')    ?? d.pangkatMember    ?? '';
      return [chair,sec,mem].filter(Boolean);
    })()
  };
}

// Re-render PDF in the preview pane (reuses existing _fillKpForm* functions)
function attachKpfRenderPreview(which){
  const pane = document.getElementById('attach-preview-pane');
  if(!pane) return;

  try{
    const {jsPDF} = window.jspdf;
    const doc = new jsPDF({unit:'mm',format:'a4'});
    const data = attachKpfGetData();
    if(which==='form7'){
      _fillKpForm7(doc, data);
    } else if(which==='form8'){
      _fillKpForm8(doc, data);
    } else if(which==='form9'){
      _fillKpForm9(doc, data);
      doc.addPage();
      _fillKpForm9Page2(doc, data);
    } else if(which==='form11'){
      // Render 3 pages — one per Chosen Pangkat member
      const members = [
        { name: data.pangkatChair     || '____________________________', role:'Chosen Pangkat' },
        { name: data.pangkatSecretary || '____________________________', role:'Chosen Pangkat' },
        { name: data.pangkatMember    || '____________________________', role:'Chosen Pangkat' }
      ];
      members.forEach((pm, idx) => { if(idx>0) doc.addPage(); _fillKpForm11(doc, data, pm); });
    } else if(which==='form12'){
      _fillKpForm12(doc, data);
    } else if(which==='form10'){
      // Form 10 uses its own shared builder — generate and display directly
      const result10 = _buildForm10Doc({kpD: data, linkedCase: window._attachModalCase||null});
      const uri10 = result10.doc.output('datauristring');
      pane.innerHTML = `<iframe id="attach-kpf-iframe" src="${uri10}" style="width:100%;height:100%;border:none"></iframe>`;
      const printBtn10 = document.getElementById('attach-print-btn');
      if(printBtn10){ printBtn10.style.display=''; window._attachPrintUrl=uri10; window._attachPrintType='pdf'; }
      return;
    }
    const uri = doc.output('datauristring');
    pane.innerHTML = `<iframe id="attach-kpf-iframe" src="${uri}" style="width:100%;height:100%;border:none"></iframe>`;
    const printBtn = document.getElementById('attach-print-btn');
    if(printBtn){ printBtn.style.display=''; window._attachPrintUrl=uri; window._attachPrintType='pdf'; }
  } catch(e){
    pane.innerHTML = `<div style="color:#aaa;text-align:center;padding:40px"><div style="font-size:40px">⚠️</div><div style="margin-top:10px;font-size:13px">Could not render preview</div></div>`;
  }
}

// Live update the preview AND auto-save after a short debounce
let _attachKpfSaveTimer = null;
function attachKpfLiveUpdate(){
  const tab = window._attachKpfCurrentTab||'form7';
  attachKpfRenderPreview(tab);
  // Debounced auto-save: waits 900ms after last keystroke
  clearTimeout(_attachKpfSaveTimer);
  _attachKpfSaveTimer = setTimeout(()=>attachKpfSave(true), 900);
}

// Save edited field values back to the case, session, schedule, and stored attachment PDFs
function attachKpfSave(silent){
  const c = window._attachModalCase;
  if(!c){ if(!silent) showToast('No case loaded.','warning'); return; }
  const data = attachKpfGetData();

  // ── 1. Update core case fields ──
  if(data.caseNo)            c.caseNo            = data.caseNo;
  if(data.dateFiled)         c.dateFiled         = data.dateFiled;
  if(data.timeFiled)         c.timeFiled         = data.timeFiled;
  if(data.complainant)       c.complainant       = data.complainant;
  if(data.complainantAddress)c.complainantAddress= data.complainantAddress;
  if(data.respondent)        c.respondent        = data.respondent;
  if(data.respondentAddress) c.respondentAddress = data.respondentAddress;
  if(data.caseTitle)         c.caseTitle         = data.caseTitle;
  if(data.chairman)          c.chairman          = data.chairman;
  if(data.narrative)         c._narrative        = data.narrative;
  if(data.relief)            c._relief           = data.relief;
  if(data.pangkatChair)      c._pangkatChair     = data.pangkatChair;
  if(data.pangkatSecretary)  c._pangkatSecretary = data.pangkatSecretary;
  if(data.pangkatMember)     c._pangkatMember    = data.pangkatMember;

  // ── 2. Update matching session (med or conc) by _sessionDate ──
  const sessionDate = data.schedDate;
  if(sessionDate){
    const allSessions = [...(c._medSessions||[]), ...(c._concSessions||[])];
    const sess = allSessions.find(s=>s.date===sessionDate);
    if(sess){
      if(data.schedTime) sess.time = data.schedTime;
    } else {
      // Try updating the session whose date matches what was originally loaded
      const origDate = window._attachKpfData && window._attachKpfData._origSessionDate;
      if(origDate){
        const s2 = allSessions.find(s=>s.date===origDate);
        if(s2){ s2.date=sessionDate; if(data.schedTime)s2.time=data.schedTime; }
      }
    }
  }

  // ── 3. Update linked schedule ──
  const sched = state.schedules.find(s=>s.caseNo===c.caseNo||s._caseId===c.id);
  if(sched){
    if(data.schedDate)  sched.schedDate  = data.schedDate;
    if(data.schedTime)  sched.schedTime  = data.schedTime;
    if(data.caseTitle)  sched.caseTitle  = data.caseTitle;
    if(data.chairman)   sched.chairman   = data.chairman;
    if(data.complainant)sched.complainant= data.complainant;
    if(data.respondent) sched.respondent = data.respondent;
    saveData('ltia_schedules', state.schedules);
  }

  // ── 4. Re-generate stored PDF dataUrls for all generated attachments ──
  try{
    const {jsPDF} = window.jspdf;
    const atts = c.attachments||[];
    atts.forEach(att=>{
      if(!att._generated) return;
      const name = att.name||'';
      let newDoc = null;
      if(/Form 7/i.test(name)){
        newDoc = new jsPDF({unit:'mm',format:'a4'});
        _fillKpForm7(newDoc, data);
      } else if(/Form 8/i.test(name)){
        newDoc = new jsPDF({unit:'mm',format:'a4'});
        _fillKpForm8(newDoc, data);
      } else if(/Form 9/i.test(name)){
        newDoc = new jsPDF({unit:'mm',format:'a4'});
        _fillKpForm9(newDoc, data);
        newDoc.addPage();
        _fillKpForm9Page2(newDoc, data);
      } else if(/Form 11/i.test(name)){
        newDoc = new jsPDF({unit:'mm',format:'a4'});
        const members=[
          {name:data.pangkatChair     ||'____________________________',role:'Chosen Pangkat'},
          {name:data.pangkatSecretary ||'____________________________',role:'Chosen Pangkat'},
          {name:data.pangkatMember    ||'____________________________',role:'Chosen Pangkat'}
        ];
        members.forEach((pm,i)=>{if(i>0)newDoc.addPage();_fillKpForm11(newDoc,data,pm);});
      } else if(/Form 12/i.test(name)){
        newDoc = new jsPDF({unit:'mm',format:'a4'});
        _fillKpForm12(newDoc, data);
      } else if(/Form 10/i.test(name)){
        // Form 10 uses the shared builder so its stored PDF stays in sync
        try {
          const r10 = _buildForm10Doc({kpD: data, linkedCase: c});
          newDoc = r10.doc;
        } catch(e10){ console.warn('Form 10 re-gen error:',e10); }
      }
      if(newDoc) att.dataUrl = newDoc.output('datauristring');
    });
    // Also keep _attachModalAtts in sync
    window._attachModalAtts = c.attachments;
  } catch(e){ console.warn('PDF re-gen error:',e); }

  // ── 5. Persist ──
  saveData('ltia_cases', state.cases);

  // ── 6. Show save indicator ──
  if(!silent){
    showToast('Saved successfully!','success',2500);
  }
  const statusEl = document.getElementById('akpf-save-status');
  if(statusEl){
    statusEl.textContent = '✅ Saved';
    statusEl.style.display='inline-block';
    clearTimeout(window._akpfStatusTimer);
    window._akpfStatusTimer = setTimeout(()=>{ statusEl.style.display='none'; }, 2500);
  }
}

// Download a KP form from the Documents modal edit panel
function attachKpfDownload(which){
  try{
    const {jsPDF} = window.jspdf;
    const data = attachKpfGetData();
    if(which==='all'){
      const doc = new jsPDF({unit:'mm',format:'a4'});
      _fillKpForm7(doc,data); doc.addPage(); _fillKpForm8(doc,data); doc.addPage(); _fillKpForm9(doc,data);
      doc.save(`KP_Forms_All_${data.caseNo||'form'}.pdf`);
    } else {
      const doc = new jsPDF({unit:'mm',format:'a4'});
      if(which==='form7') _fillKpForm7(doc,data);
      else if(which==='form8') _fillKpForm8(doc,data);
      else if(which==='form9'){ _fillKpForm9(doc,data); doc.addPage(); _fillKpForm9Page2(doc,data); }
      const label = which==='form7'?'Form7':which==='form8'?'Form8':'Form9';
      doc.save(`KP_${label}_${data.caseNo||'form'}.pdf`);
    }
  } catch(e){ alert('Could not generate PDF.'); }
}

function attachPlainPreview(idx){
  const atts = window._attachModalAtts||[];
  const a = atts[idx]; if(!a) return;
  const pane = document.getElementById('attach-preview-pane'); if(!pane) return;
  const printBtn = document.getElementById('attach-print-btn');
  if(printBtn) printBtn.style.display='none';

  const isPdf = a.name.match(/\.pdf$/i)||(a.dataUrl&&a.dataUrl.startsWith('data:application/pdf'));
  const isImg = a.name.match(/\.(jpe?g|png|gif|webp)$/i)||(a.dataUrl&&a.dataUrl.startsWith('data:image'));

  if(isPdf){
    pane.innerHTML=`<iframe id="attach-iframe" src="${a.dataUrl}" style="width:100%;height:100%;border:none"></iframe>`;
    if(printBtn){printBtn.style.display='';window._attachPrintUrl=a.dataUrl;window._attachPrintType='pdf';}
  } else if(isImg){
    pane.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;padding:20px;overflow:auto;background:#525659">
      <img src="${a.dataUrl}" style="max-width:100%;max-height:calc(100% - 60px);border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);object-fit:contain" alt="${escHtml(a.name)}">
      <div style="margin-top:12px;font-size:12px;color:#ccc">${escHtml(a.name)}</div>
    </div>`;
    if(printBtn){printBtn.style.display='';window._attachPrintUrl=a.dataUrl;window._attachPrintType='img';}
  } else {
    pane.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;background:#525659;padding:40px">
      <div style="background:#fff;border-radius:16px;padding:36px 40px;box-shadow:0 4px 24px rgba(0,0,0,0.3);text-align:center;max-width:380px;width:100%">
        <div style="font-size:56px;margin-bottom:14px">📄</div>
        <div style="font-size:15px;font-weight:700;color:#0d3d3a;margin-bottom:6px;word-break:break-word">${escHtml(a.name)}</div>
        <div style="font-size:12px;color:#9ba3ae;margin-bottom:20px">${a.size?Math.round(a.size/1024)+' KB · ':''}This file type cannot be previewed directly.</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button onclick="window.open(window._attachModalAtts[${idx}].dataUrl,'_blank')" style="padding:10px 20px;background:#0d3d3a;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">🔗 Open in New Tab</button>
          <a href="${a.dataUrl}" download="${escHtml(a.name)}" style="padding:10px 20px;background:#0d3d3a;color:#fff;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;display:block">⬇ Download File</a>
        </div>
      </div>
    </div>`;
  }
}

function attachPreview(idx){ attachSelectRow(idx); }

// Show Amicable Settlement edit panel (Panel 2) — mirrors the KP form editor
function attachShowSettlementEditor(idx){
  const c   = window._attachModalCase;
  const atts= window._attachModalAtts||[];
  if(!c) return;

  const kpPanel = document.getElementById('attach-kpf-panel');
  if(!kpPanel) return;
  kpPanel.style.display = 'flex';

  const att = atts[idx] || {};
  // Restore saved metadata, or fall back to sensible defaults
  const savedTerms  = att._settlementTerms || [];
  const savedDay    = att._settlementDay   || (()=>{const d=new Date().getDate();const s=['th','st','nd','rd'];const v=d%100;return d+(s[(v-20)%10]||s[v]||s[0]);})();
  const savedMonth  = att._settlementMonth || ['January','February','March','April','May','June','July','August','September','October','November','December'][new Date().getMonth()];
  const savedYear   = att._settlementYear  || String(new Date().getFullYear());
  // Detect phase: prefer stored metadata, fall back to name ("Lupon" = conciliation), then 'med'
  const savedPhase  = att._settlementPhase || (/Lupon/i.test(att.name||'') ? 'conc' : 'med');
  const phaseLabel  = savedPhase==='conc' ? 'Lupon' : 'Mediation';

  const escH = s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthOpts = months.map(m=>`<option value="${m}" ${m===savedMonth?'selected':''}>${m}</option>`).join('');

  const termsHtml = savedTerms.length
    ? savedTerms.map((t,i)=>`
      <div id="asett-row-${i}" style="display:flex;align-items:flex-start;gap:6px;margin-bottom:7px">
        <span style="min-width:18px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#059669;background:#f0fdf4;border-radius:50%;width:18px;flex-shrink:0;margin-top:3px">${i+1}</span>
        <textarea data-asett-idx="${i}" rows="2" oninput="window._asettTerms[${i}]=this.value;attachSettlementLiveUpdate(${idx})" style="flex:1;padding:6px 8px;border:1px solid #d1d5db;border-radius:7px;font-size:11px;color:#0d2137;outline:none;box-sizing:border-box;resize:vertical;font-family:inherit;line-height:1.5" onfocus="this.style.borderColor='#059669'" onblur="this.style.borderColor='#d1d5db'">${escH(t)}</textarea>
        <button onclick="attachSettlementRemoveTerm(${i},${idx})" style="border:none;background:none;color:#dc2626;font-size:16px;cursor:pointer;padding:3px;margin-top:2px;flex-shrink:0" title="Remove">×</button>
      </div>`).join('')
    : `<div id="asett-row-0" style="display:flex;align-items:flex-start;gap:6px;margin-bottom:7px">
        <span style="min-width:18px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#059669;background:#f0fdf4;border-radius:50%;width:18px;flex-shrink:0;margin-top:3px">1</span>
        <textarea data-asett-idx="0" rows="2" oninput="window._asettTerms[0]=this.value;attachSettlementLiveUpdate(${idx})" style="flex:1;padding:6px 8px;border:1px solid #d1d5db;border-radius:7px;font-size:11px;color:#0d2137;outline:none;box-sizing:border-box;resize:vertical;font-family:inherit;line-height:1.5" onfocus="this.style.borderColor='#059669'" onblur="this.style.borderColor='#d1d5db'"></textarea>
        <button onclick="attachSettlementRemoveTerm(0,${idx})" style="border:none;background:none;color:#dc2626;font-size:16px;cursor:pointer;padding:3px;margin-top:2px;flex-shrink:0" title="Remove">×</button>
      </div>`;

  kpPanel.innerHTML = `
    <!-- Header bar matching KP forms editor style -->
    <div style="background:#0d3d3a;color:#fff;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
      <div style="font-size:12px;font-weight:700;letter-spacing:-0.01em">✅ Amicable Settlement</div>
      <div style="display:flex;align-items:center;gap:6px">
        <span id="asett-save-status" style="font-size:10px;color:#5dd6de;display:none"></span>
        <button onclick="attachSettlementSave(${idx},false)" style="padding:4px 12px;background:#14919b;border:none;color:#fff;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer" title="Save changes">💾 Save</button>
      </div>
    </div>

    <!-- Phase badge -->
    <div style="padding:8px 14px 0;flex-shrink:0">
      <div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.6px;background:#f0fdf4;border:1px solid #6ee7b7;border-radius:5px;padding:4px 8px;display:inline-block">${phaseLabel} Phase</div>
    </div>

    <!-- Scrollable fields -->
    <div style="flex:1;overflow-y:auto;padding:10px 14px">

      <!-- Settlement Terms -->
      <div style="font-size:10px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;margin-top:4px">Settlement Terms</div>
      <div id="asett-terms-list" style="margin-bottom:6px">${termsHtml}</div>
      <button onclick="attachSettlementAddTerm(${idx})" style="padding:5px 10px;border-radius:6px;border:1px dashed #059669;background:#f0fdf4;color:#059669;font-size:11px;font-weight:600;cursor:pointer;width:100%;margin-bottom:12px">+ Add Term</button>

      <!-- Date Entered -->
      <div style="font-size:10px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Date Entered</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        <div>
          <div style="font-size:10px;color:#6b7280;margin-bottom:3px">Day</div>
          <input id="asett-day" type="text" value="${escH(savedDay)}" placeholder="e.g. 26th" oninput="attachSettlementLiveUpdate(${idx})" style="width:100%;padding:6px 8px;border:1px solid #d1d5db;border-radius:7px;font-size:11px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#059669'" onblur="this.style.borderColor='#d1d5db'">
        </div>
        <div>
          <div style="font-size:10px;color:#6b7280;margin-bottom:3px">Month</div>
          <select id="asett-month" onchange="attachSettlementLiveUpdate(${idx})" style="width:100%;padding:6px 8px;border:1px solid #d1d5db;border-radius:7px;font-size:11px;color:#0d2137;outline:none;box-sizing:border-box;background:#fff;cursor:pointer" onfocus="this.style.borderColor='#059669'" onblur="this.style.borderColor='#d1d5db'">${monthOpts}</select>
        </div>
      </div>
      <div style="margin-bottom:12px">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px">Year</div>
        <input id="asett-year" type="text" value="${escH(savedYear)}" oninput="attachSettlementLiveUpdate(${idx})" style="width:100%;padding:6px 8px;border:1px solid #d1d5db;border-radius:7px;font-size:11px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#059669'" onblur="this.style.borderColor='#d1d5db'">
      </div>

    </div>
  `;

  // Initialise the in-memory terms array (mirrors window._settlementTerms pattern)
  window._asettTerms = savedTerms.length ? savedTerms.slice() : [''];
  window._asettAttIdx = idx;
  window._asettPhase  = savedPhase;
}

function attachSettlementAddTerm(attIdx){
  const list = document.getElementById('asett-terms-list');
  if(!list) return;
  if(!window._asettTerms) window._asettTerms = [];
  const i = window._asettTerms.length;
  window._asettTerms.push('');
  const row = document.createElement('div');
  row.id = 'asett-row-' + i;
  row.style.cssText = 'display:flex;align-items:flex-start;gap:6px;margin-bottom:7px';
  row.innerHTML = `
    <span style="min-width:18px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#059669;background:#f0fdf4;border-radius:50%;width:18px;flex-shrink:0;margin-top:3px">${i+1}</span>
    <textarea data-asett-idx="${i}" rows="2" oninput="window._asettTerms[${i}]=this.value;attachSettlementLiveUpdate(${attIdx})" style="flex:1;padding:6px 8px;border:1px solid #d1d5db;border-radius:7px;font-size:11px;color:#0d2137;outline:none;box-sizing:border-box;resize:vertical;font-family:inherit;line-height:1.5" onfocus="this.style.borderColor='#059669'" onblur="this.style.borderColor='#d1d5db'"></textarea>
    <button onclick="attachSettlementRemoveTerm(${i},${attIdx})" style="border:none;background:none;color:#dc2626;font-size:16px;cursor:pointer;padding:3px;margin-top:2px;flex-shrink:0" title="Remove">×</button>
  `;
  list.appendChild(row);
}

function attachSettlementRemoveTerm(i, attIdx){
  const row = document.getElementById('asett-row-' + i);
  if(row) row.remove();
  if(window._asettTerms) window._asettTerms[i] = null;
  attachSettlementLiveUpdate(attIdx);
}

function _getAsettTerms(){
  return (window._asettTerms||[]).filter(t=>t!==null && String(t).trim()!=='');
}

let _asettSaveTimer = null;
function attachSettlementLiveUpdate(attIdx){
  // Re-generate the preview iframe from current field values
  const c = window._attachModalCase;
  if(!c) return;
  const pane = document.getElementById('attach-preview-pane');
  if(!pane) return;
  try{
    const terms  = _getAsettTerms();
    const day    = (document.getElementById('asett-day')||{}).value||'';
    const month  = (document.getElementById('asett-month')||{}).value||'';
    const year   = (document.getElementById('asett-year')||{}).value||'';
    const phase  = window._asettPhase||'med';
    const doc = _buildSettlementDocFromFields(c, phase, terms, day, month, year);
    if(!doc) return;
    const uri = doc.output('datauristring');
    pane.innerHTML = `<iframe src="${uri}" style="width:100%;height:100%;border:none"></iframe>`;
    const printBtn = document.getElementById('attach-print-btn');
    if(printBtn){ printBtn.style.display=''; window._attachPrintUrl=uri; window._attachPrintType='pdf'; }
  } catch(e){ /* silent */ }
  // Debounced auto-save
  clearTimeout(_asettSaveTimer);
  _asettSaveTimer = setTimeout(()=>attachSettlementSave(attIdx, true), 900);
}

// Save the re-edited settlement back to the stored attachment
function attachSettlementSave(attIdx, silent){
  const c    = window._attachModalCase;
  const atts = window._attachModalAtts||[];
  const att  = atts[attIdx];
  if(!c || !att){ if(!silent) showToast('Nothing to save.','warning'); return; }

  const terms = _getAsettTerms();
  if(!silent && terms.length===0){ showToast('Please add at least one term.','warning'); return; }

  const day   = (document.getElementById('asett-day')||{}).value||'';
  const month = (document.getElementById('asett-month')||{}).value||'';
  const year  = (document.getElementById('asett-year')||{}).value||'';
  const phase = window._asettPhase||'med';

  const doc = _buildSettlementDocFromFields(c, phase, terms, day, month, year);
  if(!doc){ if(!silent) showToast('Cannot build PDF — check fields.','warning'); return; }

  // Update the stored dataUrl and metadata
  const uri = doc.output('datauristring');
  att.dataUrl = uri;
  att._settlementTerms = terms.slice();
  att._settlementDay   = day;
  att._settlementMonth = month;
  att._settlementYear  = year;
  att._settlementPhase = phase;

  // Keep _attachModalAtts in sync
  window._attachModalAtts = c.attachments;

  // Also update case._settlementTerms (plain text) for the case record
  c._settlementTerms = terms.join('\n');

  saveData('ltia_cases', state.cases);

  // Refresh the preview iframe to the newly saved URL
  const pane = document.getElementById('attach-preview-pane');
  if(pane){ pane.innerHTML = `<iframe src="${uri}" style="width:100%;height:100%;border:none"></iframe>`; }
  const printBtn = document.getElementById('attach-print-btn');
  if(printBtn){ printBtn.style.display=''; window._attachPrintUrl=uri; window._attachPrintType='pdf'; }

  if(!silent){
    showToast('Amicable Settlement saved!','success',2500);
  }
  const statusEl = document.getElementById('asett-save-status');
  if(statusEl){
    statusEl.textContent='✅ Saved';
    statusEl.style.display='inline-block';
    clearTimeout(window._asettStatusTimer);
    window._asettStatusTimer = setTimeout(()=>{ statusEl.style.display='none'; }, 2500);
  }
}

// Build a settlement PDF purely from supplied field values (no DOM modal required)
function _buildSettlementDocFromFields(c, phase, terms, day, month, year){
  try{
    const {jsPDF} = window.jspdf;
    if(!c || !terms || terms.length===0) return null;

    const isConc       = phase === 'conc';
    const complainant  = (c.complainant||'').toUpperCase();
    const complainantAddr = c.complainantAddress||'Butuan City';
    const respondent   = (c.respondent||'').toUpperCase();
    const respondentAddr  = c.respondentAddress||'Butuan City';
    const caseNo = c.caseNo||'';
    const nature = (c.caseTitle||c.type||c.nature||'SLIGHT PHYSICAL INJURY').toUpperCase();
    const dateFiled = c.dateFiled||'';
    const timeFiled = c.timeFiled||'';
    let dfStr='';
    if(dateFiled){const d=new Date(dateFiled);if(!isNaN(d)){dfStr=(d.getMonth()+1)+'-'+d.getDate()+'-'+d.getFullYear();}}
    const tfStr=timeFiled ? formatTime12(timeFiled) : '';
    const chairman     = (c._lupanChairman||c.mediator||'HON. ABUNDIO A. LEONES');
    const pangkatChair = c._pangkatChair||'';
    const pangkatSec   = c._pangkatSecretary||'';
    const pangkatMem   = c._pangkatMember||'';

    const doc = new jsPDF({unit:'mm',format:'a4'});
    const W=210,ml=25,mr=25,mt=20,cw=W-ml-mr,FONT='times';
    let y=mt;
    function _sf(style,size){doc.setFont(FONT,style);doc.setFontSize(size);}
    function _tw(t){return doc.getTextWidth(t);}
    function ct(text,yPos,style,size){_sf(style||'normal',size||11);doc.text(text,W/2,yPos,{align:'center'});}

    _sf('normal',10);
    ct('Republic of the Philippines',y);y+=5;
    ct('City of Butuan',y);y+=5;
    ct('Barangay Pangabugan',y);y+=6;
    ct('OFFICE OF THE LUPONG TAGAPAMAYAPA',y,'bold',11);y+=9;

    _sf('normal',10);
    const leftX=ml,rightX=W/2+5;
    let yLeft=y,yRight=y;
    _sf('bold',10);doc.text(complainant,leftX,yLeft);yLeft+=5;_sf('normal',10);
    doc.splitTextToSize(complainantAddr,cw/2-5).forEach(l=>{doc.text(l,leftX,yLeft);yLeft+=5;});
    doc.text('Butuan City',leftX,yLeft);yLeft+=5;
    _sf('italic',10);doc.text('    Complainant/s',leftX,yLeft);yLeft+=5;_sf('normal',10);

    doc.text('Barangay Case No. '+caseNo,rightX,yRight);yRight+=5;
    doc.splitTextToSize('For: '+nature,cw/2-5).forEach(l=>{doc.text(l,rightX,yRight);yRight+=5;});
    if(dfStr){doc.text('DF: '+dfStr,rightX,yRight);yRight+=5;}
    if(tfStr){doc.text('TF: '+tfStr,rightX,yRight);yRight+=5;}
    y=Math.max(yLeft,yRight)+3;

    _sf('italic',10);
    doc.text('-against-',leftX,y);y+=7;
    _sf('normal',10);
    _sf('bold',10);doc.text(respondent,leftX,y);y+=5;_sf('normal',10);
    doc.splitTextToSize(respondentAddr,cw/2-5).forEach(l=>{doc.text(l,leftX,y);y+=5;});
    doc.text('Butuan City',leftX,y);y+=5;
    _sf('italic',10);doc.text('    Respondent/s',leftX,y);y+=8;_sf('normal',10);

    ct('AMICABLE SETTLEMENT',y,'bold',12);y+=9;
    _sf('normal',11);
    const intro='    We, complainant/s and respondent/s in the above-captioned case, do hereby agree to settle our dispute as follows:';
    doc.text(intro,ml,y,{align:'justify',maxWidth:cw});
    y+=doc.splitTextToSize(intro,cw).length*5.5+2;

    terms.forEach((term,i)=>{
      const num=(i+1)+'.  ';
      const termText=term.trim().toUpperCase();
      const indent=ml+8, indentW=cw-8;
      _sf('bold',11);
      const fullText=num+termText;
      doc.text(fullText,ml+3,y,{align:'justify',maxWidth:cw-6});
      y+=doc.splitTextToSize(fullText,cw-6).length*5.5+2;
    });

    _sf('normal',11);y+=1;
    const bindText='and bind us to comply honestly and faithfully with the above terms of settlement.';
    doc.text(bindText,ml,y,{align:'justify',maxWidth:cw});
    y+=doc.splitTextToSize(bindText,cw).length*5.5+5;

    _sf('normal',11);
    let px=ml;
    doc.text('Entered this ',px,y);px+=_tw('Entered this ');
    doc.setLineWidth(0.3);
    doc.text(day,px,y);doc.line(px,y+0.8,px+_tw(day)+1,y+0.8);px+=_tw(day)+2;
    doc.text(' day of    ',px,y);px+=_tw(' day of    ');
    doc.text(month.toUpperCase(),px,y);doc.line(px,y+0.8,px+_tw(month.toUpperCase())+1,y+0.8);px+=_tw(month.toUpperCase())+2;
    doc.text(', ',px,y);px+=_tw(', ');
    doc.text(year,px,y);doc.line(px,y+0.8,px+_tw(year)+1,y+0.8);
    doc.text('.',px+_tw(year)+1,y);y+=12;

    _sf('normal',11);
    const halfW=cw/2;
    doc.text('COMPLAINANT/S:',ml,y);doc.text('RESPONDENT/S:',ml+halfW,y);y+=10;

    _sf('bold',11);
    const cNames=complainant.split(/\s*[&,]\s*/).map(n=>n.trim()).filter(Boolean);
    cNames.forEach(n=>{doc.text(n,ml,y);y+=6;});
    let yR=y-(cNames.length*6);
    respondent.split(/\s*[&,]\s*/).map(n=>n.trim()).filter(Boolean).forEach(n=>{doc.text(n,ml+halfW,yR);yR+=6;});
    y=Math.max(y,yR)+8;

    ct('ATTESTATION',y,'bold',12);y+=8;
    const attestText='    I hereby certify that the foregoing amicable settlement was entered into by the parties freely and voluntarily, after I had explained to them the nature and consequences of such settlement.';
    _sf('bold',11);
    doc.splitTextToSize(attestText,cw).forEach(l=>{doc.text(l,ml,y);y+=5.5;});y+=10;

    if(!isConc){
      _sf('bold',11);
      const pbName=chairman.toUpperCase();
      doc.text(pbName,W-mr,y,{align:'right'});
      doc.line(W-mr-_tw(pbName)-4,y+1,W-mr,y+1);y+=5;
      _sf('normal',10);doc.text('Punong Barangay / Lupon Chairman',W-mr,y,{align:'right'});y+=12;
    } else {
      _sf('bold',11);
      const pcName=(pangkatChair||chairman).toUpperCase();
      doc.text(pcName,W-mr,y,{align:'right'});
      doc.line(W-mr-_tw(pcName)-4,y+1,W-mr,y+1);y+=5;
      _sf('normal',10);doc.text('Pangkat Chairman',W-mr,y,{align:'right'});y+=10;
      const psName=pangkatSec.toUpperCase(),pmName=pangkatMem.toUpperCase();
      const secLabelW=_tw('Pangkat Secretary'),secNameW=psName?_tw(psName):secLabelW;
      const leftBlockW=Math.max(secNameW,secLabelW),memColX=ml+leftBlockW+16;
      _sf('bold',11);
      if(psName){doc.text(psName,ml,y);doc.line(ml,y+1,ml+_tw(psName),y+1);}
      if(pmName){doc.text(pmName,memColX,y);doc.line(memColX,y+1,memColX+_tw(pmName),y+1);}
      y+=5;_sf('normal',10);
      if(psName||pangkatSec)doc.text('Pangkat Secretary',ml,y);
      if(pmName||pangkatMem)doc.text('Pangkat Member',memColX,y);
    }
    return doc;
  } catch(e){ return null; }
}

function attachPrintCurrent(){
  const url=window._attachPrintUrl;
  const type=window._attachPrintType;
  if(!url)return;
  if(type==='pdf'){
    const iframe=document.getElementById('attach-iframe')||document.getElementById('attach-kpf-iframe');
    if(iframe&&iframe.contentWindow){try{iframe.contentWindow.print();return;}catch(e){}}
    const w=window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><style>body{margin:0}iframe{width:100vw;height:100vh;border:none}</style></head><body><iframe src="${url}"></iframe><script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
  } else if(type==='img'){
    const w=window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><style>body{margin:0;display:flex;justify-content:center;align-items:flex-start;background:#fff}img{max-width:100%;height:auto}</style></head><body><img src="${url}"><script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
  }
}

function removeAttachment(caseId, idx){
  showConfirm(
    'Remove Attachment',
    'Are you sure you want to remove this attachment? This action <strong>cannot be undone</strong>.',
    ()=>{
      const c=state.cases.find(x=>x.id===caseId);
      if(!c)return;
      (c.attachments||[]).splice(idx,1);
      saveData('ltia_cases',state.cases);
      document.getElementById('view-case-modal-root')&&document.getElementById('view-case-modal-root').remove();
      viewCase(caseId);
      showToast('Attachment removed.','success');
    },
    'Yes, Remove',
    '#b93232'
  );
}

function generateMissingForm7(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;
  showConfirm(
    'Generate Form 7',
    'This will generate a <strong>KP Form 7 – Complaint</strong> PDF and add it to this case\'s attachments. Continue?',
    ()=>{
      try{
        const {jsPDF}=window.jspdf;
        const doc7=new jsPDF({unit:'mm',format:'a4'});
        const formData={
          caseNo:c.caseNo, dateFiled:c.dateFiled, timeFiled:c.timeFiled,
          complainant:c.complainant, complainantAddress:c.complainantAddress||'',
          respondent:c.respondent, respondentAddress:c.respondentAddress||'',
          caseTitle:c.caseTitle||c.nature||'',
          chairman:c.mediator||c._lupanChairman||'HON. ABUNDIO A. LEONES'
        };
        _fillKpForm7(doc7,formData);
        const uri7=doc7.output('datauristring');
        const now=new Date().toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'});
        if(!c.attachments)c.attachments=[];
        // Remove any old Form 7 first to avoid duplicates
        const oldIdx=c.attachments.findIndex(a=>a._generated&&/Form 7/i.test(a.name));
        if(oldIdx>-1)c.attachments.splice(oldIdx,1);
        c.attachments.unshift({name:`Form 7 – Complaint (${now})`,dataUrl:uri7,size:0,_generated:true});
        saveData('ltia_cases',state.cases);
        document.getElementById('view-case-modal-root')&&document.getElementById('view-case-modal-root').remove();
        viewCase(caseId);
        showToast('Form 7 generated and saved to attachments.','success',3500);
      } catch(e){
        showToast('⚠️ Could not generate Form 7. Please try again.','error',4000);
      }
    },
    '✅ Generate Form 7',
    '#1a4a8a'
  );
}

function viewCase(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;
  // Remove any existing modal
  const existing=document.getElementById('view-case-modal-root');
  if(existing)existing.remove();
  // Remember which page we came from so Back returns there
  state._prevPage=state.page||'dashboard';
  state._prevStatCard=state.filterStatCard||null;
  state.viewCasePage=caseId;
  state.page='dashboard';
  render();
  // Show hearing notification modal after page renders
  requestAnimationFrame(()=>showHearingNotificationModal(caseId));
}

// ─── HEARING NOTIFICATION MODAL ──────────────────────────────────────────────
function showHearingNotificationModal(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;

  // Do not show hearing notifications for CFA cases — they are closed
  if(c.status==='CFA') return;

  const today=todayStr();

  // Check "don't show again" suppression (resets next day)
  if(state._notifDismissed&&state._notifDismissed[caseId]){
    if(state._notifDismissed[caseId]===today) return;
  }

  // Submission to court
  const subm = submissionDeadlineStatus(c);

  // Check if case is settled — only show court submission deadline, no hearing sections
  const caseIsSettled = c.status==='Settled'
    || (c._medSessions||[]).some(s=>s.outcome==='settled')
    || (c._concSessions||[]).some(s=>s.outcome==='settled');

  // Gather all session hearings (only relevant when not settled)
  let upcomingHearings=[], todayHearings=[], expiredHearings=[];
  if(!caseIsSettled){
    const allSessions=[];
    (c._medSessions||[]).forEach((s,i)=>{
      if(s&&s.date) allSessions.push({date:s.date,time:s.time||'',outcome:s.outcome||'pending',label:`Mediation Session ${i+1}`,phase:'med',idx:i});
    });
    (c._concSessions||[]).forEach((s,i)=>{
      if(s&&s.date) allSessions.push({date:s.date,time:s.time||'',outcome:s.outcome||'pending',label:`Lupon Conciliation Session ${i+1}`,phase:'conc',idx:i});
    });
    upcomingHearings = allSessions.filter(s=>s.date>today && s.outcome!=='settled' && s.outcome!=='not_settled');
    todayHearings    = allSessions.filter(s=>s.date===today && s.outcome!=='settled' && s.outcome!=='not_settled');
    expiredHearings  = allSessions.filter(s=>s.date<today && s.outcome!=='settled' && s.outcome!=='not_settled');
  }

  // Nothing to notify → skip
  if(!todayHearings.length&&!upcomingHearings.length&&!expiredHearings.length&&!subm) return;

  // Don't re-show if already open
  if(document.getElementById('hearing-notif-modal')) return;

  function fmtDate(ds){
    return new Date(ds+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  }
  function daysLabel(ds){
    const diff=Math.round((new Date(ds+'T00:00:00')-new Date(today+'T00:00:00'))/86400000);
    if(diff===0) return 'Today';
    if(diff===1) return 'Tomorrow';
    if(diff>0)   return `In ${diff} day${diff!==1?'s':''}`;
    const abs=Math.abs(diff);
    return `${abs} day${abs!==1?'s':''} ago`;
  }
  function phaseColor(phase){ return phase==='med'?'#1d4ed8':'#7c3aed'; }
  function phaseBg(phase)   { return phase==='med'?'#eff6ff':'#f3e8ff'; }
  function phaseBorder(phase){ return phase==='med'?'#6dd4da':'#c4b5fd'; }

  let sections='';

  // ── Today's Hearings ──
  if(todayHearings.length){
    sections+=`<div style="margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
        <div style="width:8px;height:8px;border-radius:50%;background:#dc2626;flex-shrink:0"></div>
        <span style="font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.6px">Hearing Today — Action Required</span>
      </div>
      ${todayHearings.map(s=>`
        <div style="border:1.5px solid #fca5a5;border-radius:9px;background:#fef2f2;padding:10px 13px;margin-bottom:6px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:11px;font-weight:700;color:${phaseColor(s.phase)};background:${phaseBg(s.phase)};padding:2px 8px;border-radius:6px">${s.label}</span>
            <span style="font-size:11px;font-weight:700;padding:2px 9px;border-radius:8px;background:#dc2626;color:#fff">TODAY</span>
          </div>
          <div style="font-size:13px;font-weight:700;color:#0d3d3a;margin-top:3px">${fmtDate(s.date)}</div>
          ${s.time?`<div style="font-size:12px;color:#374151;margin-top:2px">${s.time}</div>`:''}
        </div>`).join('')}
    </div>`;
  }

  // ── Upcoming Hearings ──
  if(upcomingHearings.length){
    sections+=`<div style="margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
        <div style="width:8px;height:8px;border-radius:50%;background:#059669;flex-shrink:0"></div>
        <span style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.6px">Upcoming Hearings</span>
      </div>
      ${upcomingHearings.map(s=>{
        const diff=Math.round((new Date(s.date+'T00:00:00')-new Date(today+'T00:00:00'))/86400000);
        const urgentColor=diff<=3?'#0d3d3a':'#059669';
        const urgentBg=diff<=3?'#fef3c7':'#d1fae5';
        return `<div style="border:1px solid ${phaseBorder(s.phase)};border-radius:9px;background:${phaseBg(s.phase)};padding:10px 13px;margin-bottom:6px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:11px;font-weight:700;color:${phaseColor(s.phase)}">${s.label}</span>
            <span style="font-size:11px;font-weight:700;padding:2px 9px;border-radius:8px;background:${urgentBg};color:${urgentColor}">${daysLabel(s.date)}</span>
          </div>
          <div style="font-size:13px;font-weight:700;color:#0d3d3a;margin-top:3px">${fmtDate(s.date)}</div>
          ${s.time?`<div style="font-size:12px;color:#374151;margin-top:2px">${s.time}</div>`:''}
        </div>`;
      }).join('')}
    </div>`;
  }

  // ── Expired / Missed Hearings ──
  if(expiredHearings.length){
    sections+=`<div style="margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
        <div style="width:8px;height:8px;border-radius:50%;background:#b91c1c;flex-shrink:0"></div>
        <span style="font-size:11px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:0.6px">Missed / Expired Hearings</span>
      </div>
      <div style="background:#fff;border:1px solid #fca5a5;border-radius:9px;overflow:hidden">
        ${expiredHearings.map((s,i)=>`
          <div style="padding:10px 13px;${i<expiredHearings.length-1?'border-bottom:1px solid #fecaca':''}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
              <span style="font-size:11px;font-weight:700;color:${phaseColor(s.phase)};background:${phaseBg(s.phase)};padding:2px 8px;border-radius:6px">${s.label}</span>
              <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;background:#fee2e2;color:#b91c1c">${daysLabel(s.date)}</span>
            </div>
            <div style="font-size:13px;font-weight:700;color:#0d3d3a">${fmtDate(s.date)}</div>
            ${s.time?`<div style="font-size:12px;color:#6b7280;margin-top:1px">${s.time}</div>`:''}
            <div style="margin-top:5px;font-size:11px;color:#b91c1c;font-weight:600">No outcome recorded — please mark as Settled or Not Settled.</div>
          </div>`).join('')}
      </div>
    </div>`;
  }

  // ── Submission to Court ──
  if(subm){
    const dlFmt=new Date(subm.deadline+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
    const finDlFmt=subm.finalizationDeadline?new Date(subm.finalizationDeadline+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}):'';
    if(subm.userConfirmed){
      // ✅ User confirmed submitted
      sections+=`<div style="margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
          <div style="width:8px;height:8px;border-radius:50%;background:#16a34a;flex-shrink:0"></div>
          <span style="font-size:11px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.6px">🏛️ Submitted to Court</span>
        </div>
        <div style="border:1.5px solid #16a34a;border-radius:9px;background:#dcfce7;padding:12px 14px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
            <span style="font-size:13px;font-weight:700;color:#15803d">Case submitted to court ✅</span>
            <span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:8px;background:#16a34a;color:#fff">CONFIRMED</span>
          </div>
          <div style="font-size:11px;color:#15803d">Confirmed on: ${c._courtSubmittedDate||'—'}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px">Settlement date: ${c.dateResolved||'—'}</div>
        </div>
      </div>`;
    } else if(subm.userDeclined){
      // ❌ User said not yet submitted
      sections+=`<div style="margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
          <div style="width:8px;height:8px;border-radius:50%;background:#d97706;flex-shrink:0"></div>
          <span style="font-size:11px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:0.6px">⚠️ Not Yet Submitted</span>
        </div>
        <div style="border:1.5px solid #14919b;border-radius:9px;background:#e8f6f7;padding:12px 14px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
            <span style="font-size:13px;font-weight:700;color:#0d3d3a">Court submission pending</span>
            <span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:8px;background:#14919b;color:#fff">FOLLOW UP</span>
          </div>
          <div style="font-size:11px;color:#0d3d3a;margin-top:2px">You confirmed this was not yet submitted as of ${c._courtSubmittedDate||'—'}.</div>
          <button onclick="closeHearingNotifModal();showCourtConfirmNotif('${c.id}')" style="margin-top:8px;padding:5px 14px;border-radius:7px;background:#14919b;color:#fff;border:none;font-size:11px;font-weight:700;cursor:pointer">Update Status</button>
        </div>
      </div>`;
    } else if(subm.daysSince>=12 || subm.inFinalization || subm.finalized){
      // Day 12+: awaiting confirmation
      sections+=`<div style="margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
          <div style="width:8px;height:8px;border-radius:50%;background:#16a34a;flex-shrink:0"></div>
          <span style="font-size:11px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:0.6px">🏛️ Finalization Period</span>
        </div>
        <div style="border:1.5px solid #22c55e;border-radius:9px;background:#f0fdf4;padding:12px 14px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
            <span style="font-size:13px;font-weight:700;color:#065f46">Was this case submitted to court?</span>
            <span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:8px;background:#22c55e;color:#fff">CONFIRM NOW</span>
          </div>
          <div style="font-size:11px;color:#065f46">Finalization deadline: ${finDlFmt}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px">Settlement date: ${c.dateResolved||'—'} · 12 days have passed</div>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button onclick="closeHearingNotifModal();courtConfirmAnswer('${c.id}',false)" style="flex:1;padding:7px 0;border-radius:7px;background:#fff;border:1.5px solid #d1d5db;color:#374151;font-size:12px;font-weight:700;cursor:pointer">No, not yet</button>
            <button onclick="closeHearingNotifModal();courtConfirmAnswer('${c.id}',true)" style="flex:1;padding:7px 0;border-radius:7px;background:#16a34a;color:#fff;border:none;font-size:12px;font-weight:700;cursor:pointer">Yes, submitted ✅</button>
          </div>
        </div>
      </div>`;
    } else if(subm.daysSince>=10 && !subm.phase){
      // Day 10-11: show "Got it" prompt
      sections+=`<div style="margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
          <div style="width:8px;height:8px;border-radius:50%;background:#2563eb;flex-shrink:0"></div>
          <span style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.6px">⚖️ Court Submission Ready</span>
        </div>
        <div style="border:1.5px solid #6dd4da;border-radius:9px;background:#eff6ff;padding:12px 14px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
            <span style="font-size:13px;font-weight:700;color:#1d4ed8">10-day period has lapsed</span>
            <span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:8px;background:#2563eb;color:#fff">ACTION NEEDED</span>
          </div>
          <div style="font-size:11px;color:#1d4ed8">Deadline: ${dlFmt}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px">Settlement date: ${c.dateResolved||'—'} · After acknowledging, 2-day finalization begins</div>
          <button onclick="closeHearingNotifModal();courtReadyGotIt('${c.id}')" style="margin-top:10px;width:100%;padding:8px 0;border-radius:7px;background:#0d3d3a;color:#fff;border:none;font-size:12px;font-weight:700;cursor:pointer">Got it — I understand</button>
        </div>
      </div>`;
    } else {
      const submBg    =subm.dueToday?'#fef3c7':'#f0fdf4';
      const submBorder=subm.dueToday?'#14919b':'#6ee7b7';
      const submColor =subm.dueToday?'#0d3d3a':'#065f46';
      const submTag   =subm.dueToday?'DUE TODAY':`${subm.daysLeft} day${subm.daysLeft!==1?'s':''} left`;
      const submTagBg =subm.dueToday?'#14919b':'#059669';
      sections+=`<div style="margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
          <div style="width:8px;height:8px;border-radius:50%;background:#374151;flex-shrink:0"></div>
          <span style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.6px">Court Submission Deadline</span>
        </div>
        <div style="border:1.5px solid ${submBorder};border-radius:9px;background:${submBg};padding:12px 14px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
            <span style="font-size:13px;font-weight:700;color:${submColor}">Submission to Court</span>
            <span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:8px;background:${submTagBg};color:#fff">${submTag}</span>
          </div>
          <div style="font-size:12px;font-weight:700;color:#0d3d3a">${dlFmt}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px">Settlement date: ${c.dateResolved||'—'} · Deadline: 10 days + 2 days finalization</div>
        </div>
      </div>`;
    }
  }

  const caseIsSubmittedToCourt = subm && subm.userConfirmed;
  const totalAlerts = todayHearings.length+expiredHearings.length+upcomingHearings.length+(subm?1:0);
  const hasUrgent   = todayHearings.length>0||expiredHearings.length>0||(subm&&!subm.userConfirmed&&(subm.dueToday||subm.daysSince>=10));
  const headerBg    = caseIsSubmittedToCourt?'#15803d':hasUrgent?'#b91c1c':'#0d3d3a';

  const html=`<div id="hearing-notif-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:2000;display:flex;align-items:center;justify-content:center;animation:fadeInNotif 0.2s ease" onclick="if(event.target===this)closeHearingNotifModal()">
    <style>@keyframes fadeInNotif{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}</style>
    <div style="background:#fff;border-radius:14px;width:460px;max-width:95vw;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.28);overflow:hidden">

      <!-- Header -->
      <div style="background:${headerBg};padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div>
          <div style="font-size:15px;font-weight:700;color:#fff">Hearing Notification</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:1px">${escHtml(c.caseNo||'')} · ${totalAlerts} alert${totalAlerts!==1?'s':''}</div>
        </div>
        <button onclick="closeHearingNotifModal()" style="border:none;background:rgba(255,255,255,0.18);color:#fff;width:30px;height:30px;border-radius:50%;font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background 0.15s" onmouseover="this.style.background='rgba(255,255,255,0.32)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'">x</button>
      </div>

      <!-- Case banner -->
      <div style="padding:10px 20px;background:#f9fafb;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:10px;flex-shrink:0">
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:700;color:#0d3d3a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml((c.complainant||'').toUpperCase())} <span style="color:#9ba3ae;font-weight:400">vs</span> ${escHtml((c.respondent||'').toUpperCase())}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(c.caseTitle||c.nature||'')}</div>
        </div>
        ${hasUrgent?`<span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:10px;background:#fee2e2;color:#b91c1c;flex-shrink:0;white-space:nowrap">Action Required</span>`:''}
      </div>

      <!-- Body -->
      <div style="padding:16px 20px;overflow-y:auto;flex:1">
        ${sections}
      </div>

      <!-- Footer -->
      <div style="padding:12px 20px;border-top:1px solid #e5e7eb;display:flex;flex-direction:column;gap:8px;background:#f9fafb;flex-shrink:0">
        ${caseIsSubmittedToCourt?`<div style="background:#dcfce7;border:1.5px solid #16a34a;border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:8px">
          <span style="font-size:16px">🏛️</span>
          <span style="font-size:12px;font-weight:700;color:#15803d;flex:1">This case has been submitted to court</span>
          <button onclick="closeHearingNotifModal();viewCase('${c.id}')" style="padding:6px 14px;border-radius:7px;background:#16a34a;color:#fff;border:none;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">View Case ✅</button>
        </div>`:''}
        <div style="display:flex;justify-content:space-between;align-items:center">
          <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:12px;color:#6b7280;user-select:none">
            <input type="checkbox" id="notif-dont-show" style="width:14px;height:14px;cursor:pointer;accent-color:#0d3d3a">
            Don't show again for this case today
          </label>
          <button onclick="closeHearingNotifModal()" style="padding:8px 22px;border-radius:8px;background:#0d3d3a;color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer" onmouseover="this.style.background='#0a5055'" onmouseout="this.style.background='#0d3d3a'">Got it</button>
        </div>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
}

function closeHearingNotifModal(){
  const modal=document.getElementById('hearing-notif-modal');
  if(!modal)return;
  // Check "don't show again"
  const chk=document.getElementById('notif-dont-show');
  if(chk&&chk.checked&&state.viewCasePage){
    if(!state._notifDismissed) state._notifDismissed={};
    state._notifDismissed[state.viewCasePage]=todayStr();
  }
  modal.style.opacity='0';
  modal.style.transform='scale(0.96)';
  modal.style.transition='opacity 0.18s,transform 0.18s';
  setTimeout(()=>modal.remove(),200);
}
function viewCaseLegacy(caseId){
  const sched=state.schedules.filter(s=>s._caseId===c.id||s.caseNo===c.caseNo).sort((a,b)=>(a.schedDate||'').localeCompare(b.schedDate||'')).find(s=>s.schedDate>=todayStr())||null;
  function row(label,val,isRemarks){
    if(val===undefined||val===null)return'';
    if(!val)val='—';
    const valCell=isRemarks
      ?`<div style="font-size:12px;font-weight:600;color:#0d2137;flex:1;max-height:80px;overflow-y:auto;overflow-x:hidden;white-space:pre-wrap;word-break:break-word;padding-right:4px">${val}</div>`
      :`<span style="font-size:12px;font-weight:600;color:#0d2137;flex:1">${val}</span>`;
    return `<div style="display:flex;gap:0;border-bottom:1px solid #f0f0f0;padding:7px 0"><span style="width:170px;flex-shrink:0;font-size:12px;color:#6b7280;font-weight:500">${label}</span>${valCell}</div>`;
  }
  const attList=(c.attachments||[]).length
    ?`<div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
      ${(c.attachments||[]).map((a,i)=>`
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px">
          <span style="font-size:18px">📄</span>
          <span style="flex:1;font-size:12px;font-weight:600;color:#0d3d3a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(a.name)}">${escHtml(a.name)}</span>
          <span style="font-size:11px;color:#9ba3ae;flex-shrink:0">${a.size?Math.round(a.size/1024)+' KB':''}</span>
          <button onclick="viewAttachments('${c.id}',${i})" style="padding:3px 10px;background:#e6f4f5;color:#0d3d3a;border:1px solid #b2dfe2;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;flex-shrink:0">👁 View</button>
          <button onclick="removeAttachment('${c.id}',${i})" style="padding:3px 8px;background:#fff5f5;color:#c0392b;border:1px solid #fbbaba;border-radius:5px;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0;line-height:1" title="Remove attachment">×</button>
        </div>`).join('')}
      ${sched?`<div onclick="showKpForms('${sched.id}','${c.id}')" style="display:flex;align-items:center;gap:5px;padding:6px 12px;background:#fff8e1;border:1px solid #ffe082;border-radius:8px;font-size:12px;color:#7c5c00;cursor:pointer;margin-top:2px">📋 KP Forms (Form 7, 8 &amp; 9)</div>`:''}
    </div>`
    :`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">${sched
      ?`<div onclick="showKpForms('${sched.id}','${c.id}')" style="display:flex;align-items:center;gap:5px;padding:6px 12px;background:#fff8e1;border:1px solid #ffe082;border-radius:8px;font-size:12px;color:#7c5c00;cursor:pointer">📋 KP Forms (Form 7, 8 &amp; 9)</div>`
      :''
    }</div>`;
  const schedBlock=sched?`<div style="padding:10px 14px;background:#e0f4f4;border-radius:8px;border:1px solid #b2e0e0;font-size:12px;margin-top:8px">
    <span style="color:#14919b;font-weight:700">📅 Next Hearing:</span> <strong>${escHtml(sched.schedDate)}</strong> at <strong>${escHtml(sched.schedTime||'—')}</strong>${sched.location?' — '+escHtml(sched.location):''}
  </div>`:'';

  // ── KP Progress Panel (right column, sticky) ──────────────────────────────
  const kpRightPanel = !c._archive ? (()=>{
    const dateFiled = c.dateFiled||'';
    const filedMs = dateFiled ? new Date(dateFiled+'T00:00:00').getTime() : 0;
    const deadline15 = filedMs ? new Date(filedMs + 15*24*60*60*1000).toISOString().slice(0,10) : '';

    const medSessions = c._medSessions||[];
    const concSessions = c._concSessions||[];
    const medSettled = medSessions.some(s=>s.outcome==='settled');
    const medAllDone = medSessions.length>=3 || c._medFailed;
    const medPhaseComplete = medSettled || medAllDone;
    const concPhaseActive = medPhaseComplete && !medSettled;
    // Derive conciliation window start: 1 day after 3rd med session (or fall back to _concStartDate)
    const _thirdMed = medSessions[2];
    function _addDaysStr(ds,n){const d=new Date(ds+'T00:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
    const _concWinStart = (_thirdMed&&_thirdMed.date) ? _addDaysStr(_thirdMed.date,1) : (c._concStartDate||'');
    const concDeadline = _concWinStart ? _addDaysStr(_concWinStart, 14) : '';
    const concSettled = concSessions.some(s=>s.outcome==='settled');

    function daysBetween(a,b){if(!a||!b)return null;const ms=new Date(b+'T00:00:00')-new Date(a+'T00:00:00');return Math.round(ms/86400000);}
    function deadlineBadge(deadline, startDate){
      if(!deadline||!startDate) return '';
      const today=todayStr();
      const daysLeft=daysBetween(today,deadline);
      if(daysLeft<0) return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:#fee2e2;color:#b91c1c">⚠ Deadline passed</span>`;
      if(daysLeft===0) return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:#d4f1f1;color:#0d3d3a">🔔 Due today</span>`;
      if(daysLeft<=3) return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:#d4f1f1;color:#0d3d3a">⏰ ${daysLeft}d left · due ${deadline}</span>`;
      return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:#dbeafe;color:#1e40af">📅 ${daysLeft}d left · due ${deadline}</span>`;
    }

    function outcomeBadge(outcome){
      if(outcome==='settled') return `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:#d1fae5;color:#065f46;flex-shrink:0">✓ Settled</span>`;
      if(outcome==='not_settled') return `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:#fee2e2;color:#b91c1c;flex-shrink:0">✗ Not Settled</span>`;
      return `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:#f3f4f6;color:#6b7280;flex-shrink:0">⏳ Scheduled</span>`;
    }

    function sessionCard(s, i, phase){
      const stepNums = phase==='med' ? [1,2,3] : [4,5,6];
      const stepLabel = `Step ${stepNums[i]}`;
      const dotColor = s.outcome==='settled'?'#059669':s.outcome==='not_settled'?'#dc2626':'#6b7280';
      const isMedPhase = phase==='med';
      const dateStr = s.date||'';
      const timeStr = s.time||'';
      const genFormFn = isMedPhase
        ? `kpGenerateForms('${c.id}','${dateStr.replace(/'/g,"\\'")}','${timeStr.replace(/'/g,"\\'")}')`
        : `kpGenerateConcForms('${c.id}','${dateStr.replace(/'/g,"\\'")}','${timeStr.replace(/'/g,"\\'")}')`;
      const genFormLabel = isMedPhase ? '📄 Forms (8 &amp; 9)' : '📄 Forms (11, 12 &amp; 9)';
      const genBtn = `<button onclick="${genFormFn}" style="padding:4px 10px;border-radius:6px;border:1px solid ${isMedPhase?'#b2dfe2':'#c4b5fd'};background:${isMedPhase?'#e6f4f5':'#f3e8ff'};color:${isMedPhase?'#0d3d3a':'#7c3aed'};font-size:10px;font-weight:600;cursor:pointer;white-space:nowrap">${genFormLabel}</button>`;
      return `<div style="margin-bottom:8px;border:1px solid ${s.outcome==='settled'?'#6ee7b7':s.outcome==='not_settled'?'#fca5a5':'#e5e7eb'};border-radius:9px;overflow:hidden;background:#fff">
        <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:${s.outcome==='settled'?'#f0fdf4':s.outcome==='not_settled'?'#fef2f2':'#f9fafb'};border-bottom:1px solid ${s.outcome==='settled'?'#6ee7b7':s.outcome==='not_settled'?'#fca5a5':'#e5e7eb'}">
          <div style="width:20px;height:20px;border-radius:50%;background:${dotColor};color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0">${i+1}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px">${stepLabel}</div>
            <div style="font-size:11px;font-weight:600;color:#0d2137">${s.date||'—'}</div>
          </div>
          ${outcomeBadge(s.outcome)}
        </div>
        ${(s.outcome!=='settled'&&s.outcome!=='not_settled')?`<div style="padding:6px 10px;display:flex;gap:5px;flex-wrap:wrap;align-items:center">
          <button onclick="kpConfirmSessionOutcome('${c.id}','${phase}',${i},'settled')" style="flex:1;min-width:60px;padding:4px 0;border-radius:6px;border:1px solid #6ee7b7;background:#f0fdf4;color:#065f46;font-size:11px;font-weight:600;cursor:pointer">✅ Settled</button>
          <button onclick="kpConfirmSessionOutcome('${c.id}','${phase}',${i},'not_settled')" style="flex:1;min-width:60px;padding:4px 0;border-radius:6px;border:1px solid #fca5a5;background:#fef2f2;color:#b91c1c;font-size:11px;font-weight:600;cursor:pointer">❌ Not Settled</button>
          ${genBtn}
        </div>`:''}
        ${s.outcome==='not_settled'?`<div style="padding:6px 10px;display:flex;gap:5px;flex-wrap:wrap;align-items:center">
          <button onclick="kpConfirmSessionOutcome('${c.id}','${phase}',${i},'settled')" style="font-size:10px;padding:3px 9px;border-radius:5px;border:1px solid #e5e7eb;background:#f9fafb;color:#6b7280;cursor:pointer">↩ Change to Settled</button>
          ${genBtn}
        </div>`:''}
        ${s.outcome==='settled'?`<div style="padding:5px 10px;display:flex;justify-content:flex-end">${genBtn}</div>`:''}
      </div>`;
    }

    // ── KP STEPS LABELS ──
    const medStepLabels = ['Mediation scheduled','Respondents summoned','1st mediation hearing'];
    const concStepLabels = ['Pangkat formed','Members assigned','Conciliation hearing'];

    // ── MEDIATION PHASE (Steps 1–3) ──
    const medActive = !medPhaseComplete;
    const medHtml = `
      <div style="padding:12px 14px;border-bottom:2px solid #e5e7eb;background:${medSettled?'#f0fdf4':'#fff'}">
        <!-- Phase header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:7px">
            <div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;background:${medSettled?'#059669':medActive?'#0d3d3a':'#9ca3af'};color:#fff">${medSettled?'✓':'M'}</div>
            <div>
              <div style="font-size:12px;font-weight:700;color:${medSettled?'#065f46':medActive?'#1a1a1a':'#9ca3af'}">Mediation Phase</div>
              <div style="font-size:10px;color:#9ba3ae">Steps 1–3 · max 3 sessions</div>
            </div>
          </div>
          <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;background:${medSettled?'#d1fae5':medPhaseComplete?'#f3f4f6':medSessions.length>0?'#fef3c7':'#eff6ff'};color:${medSettled?'#065f46':medPhaseComplete?'#6b7280':medSessions.length>0?'#0d3d3a':'#1e40af'}">${medSettled?'Settled':medPhaseComplete?'Ended':medSessions.length+'/3'}</span>
        </div>
        <!-- Deadline badge -->
        ${dateFiled&&medActive?`<div style="margin-bottom:10px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">${deadlineBadge(deadline15,dateFiled)}<span style="font-size:10px;color:#9ba3ae">within 15 days of filing</span></div>`:''}
        <!-- Session cards -->
        ${medSessions.map((s,i)=>sessionCard(s,i,'med')).join('')}
        <!-- Add session button -->
        ${!medSettled&&!medPhaseComplete&&medSessions.length<3?`
          <button onclick="openKpAddSession('${c.id}','med')" style="width:100%;padding:7px;border-radius:8px;border:2px dashed #6dd4da;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:700;cursor:pointer;margin-top:${medSessions.length?'4px':'0'}">＋ Add Session ${medSessions.length+1}/3</button>`:''}
        <!-- Terminal states -->
        ${medPhaseComplete&&!medSettled?`<div style="margin-top:6px;padding:6px 10px;background:#d4f1f1;border-radius:7px;font-size:10px;color:#0d3d3a;font-weight:700;display:flex;align-items:center;gap:5px">⟶ All 3 sessions done — proceeding to Conciliation</div>`:''}
        ${medSettled?`<div style="margin-top:6px;padding:6px 10px;background:#d1fae5;border-radius:7px;font-size:10px;color:#065f46;font-weight:700;display:flex;align-items:center;gap:5px">✓ Dispute resolved at Mediation</div>`:''}
      </div>`;

    // ── CONCILIATION PHASE (Steps 4–7) ──
    const concHtml = `
      <div style="padding:12px 14px;background:${concSettled?'#f0fdf4':!concPhaseActive?'#f9fafb':'#fff'}">
        <!-- Phase header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${concPhaseActive?'8px':'4px'}">
          <div style="display:flex;align-items:center;gap:7px">
            <div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;background:${concSettled?'#059669':concPhaseActive?'#0d3d3a':'#d1d5db'};color:${concPhaseActive||concSettled?'#fff':'#9ca3af'}">${concSettled?'✓':'C'}</div>
            <div>
              <div style="font-size:12px;font-weight:700;color:${concSettled?'#065f46':concPhaseActive?'#1a1a1a':'#9ca3af'}">Conciliation Phase</div>
              <div style="font-size:10px;color:#9ba3ae">Steps 4–7 · max 3 sessions</div>
            </div>
          </div>
          <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;background:${concSettled?'#d1fae5':!concPhaseActive?'#f3f4f6':concSessions.length>0?'#fef3c7':'#eff6ff'};color:${concSettled?'#065f46':!concPhaseActive?'#9ca3af':concSessions.length>0?'#0d3d3a':'#1e40af'}">${concSettled?'Settled':!concPhaseActive?'Locked':concSessions.length+'/3'}</span>
        </div>
        ${!concPhaseActive?`<div style="font-size:11px;color:#9ba3ae;padding:4px 0 2px;display:flex;align-items:center;gap:5px">🔒 Unlocks after mediation fails (3 sessions unsettled)</div>`:`
          <!-- Deadline badge -->
          ${concDeadline?`<div style="margin-bottom:10px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">${deadlineBadge(concDeadline,_concWinStart)}<span style="font-size:10px;color:#9ba3ae">within 15 days of mediation 3rd session</span></div>`:''}
          <!-- Session cards -->
          ${concSessions.map((s,i)=>sessionCard(s,i,'conc')).join('')}
          <!-- Add session button -->
          ${!concSettled&&concSessions.length<3?`
            <button onclick="openKpAddSession('${c.id}','conc')" style="width:100%;padding:7px;border-radius:8px;border:2px dashed #6dd4da;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:700;cursor:pointer;margin-top:${concSessions.length?'4px':'0'}">＋ Add Session ${concSessions.length+1}/3</button>`:''}
          <!-- Terminal states -->
          ${concSessions.length>=3&&!concSettled?`<div style="margin-top:6px;padding:6px 10px;background:#fee2e2;border-radius:7px;font-size:10px;color:#b91c1c;font-weight:700;display:flex;align-items:center;gap:5px">⚠ 3 sessions done — issue CFA or dismiss</div>`:''}
          ${concSettled?`<div style="margin-top:6px;padding:6px 10px;background:#d1fae5;border-radius:7px;font-size:10px;color:#065f46;font-weight:700;display:flex;align-items:center;gap:5px">✓ Dispute resolved at Conciliation</div>`:''}
        `}
      </div>`;

    // ── Form 7 print row ──
    const form7Row = `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #e5e7eb;background:#e8f6f7">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:#d4f1f1;color:#0d3d3a">Form 7</span>
        <span style="font-size:11px;font-weight:600;color:#0d2137">Complaint filed</span>
      </div>
      <button onclick="viewCaseOpenForm7('${c.id}')" style="padding:3px 10px;background:#e6f4f5;color:#0d3d3a;border:1px solid #b2dfe2;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer">🖨️ Print</button>
    </div>`;

    return `<div style="width:300px;flex-shrink:0;border-left:2px solid #e5e7eb;display:flex;flex-direction:column;overflow:hidden;background:#f8fafc;border-radius:0 0 14px 0">
      <div style="padding:10px 14px 8px;border-bottom:2px solid #e5e7eb;flex-shrink:0;background:#0d3d3a">
        <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:1px">KP Process Record</div>
        <div style="font-size:12px;font-weight:600;color:#fff">Barangay Justice System</div>
      </div>
      <div style="flex:1;overflow-y:auto">
        ${form7Row}
        ${medHtml}
        ${concHtml}
      </div>
    </div>`;
  })() : '';

  const modal=`<div id="view-case-modal-root" style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:500;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()">
    <div style="background:#fff;border-radius:14px;width:${c._archive?'620px':'920px'};max-width:97vw;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 16px 50px rgba(0,0,0,0.22)">

      <!-- Header -->
      <div style="padding:16px 22px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:var(--navy);border-radius:14px 14px 0 0">
        <div>
          <div style="font-size:16px;font-weight:700;color:#fff">${escHtml(c.caseNo||'—')}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.65);margin-top:2px">${escHtml((c.complainant||'').toUpperCase())}${c.respondent?' vs '+escHtml(c.respondent.toUpperCase()):''}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          ${statusBadge(c.status)}
          <button onclick="document.getElementById('view-case-modal-root').remove()" style="border:none;background:rgba(255,255,255,0.18);color:#fff;font-size:17px;font-weight:700;cursor:pointer;line-height:1;padding:5px 10px;border-radius:8px;transition:background 0.15s" onmouseover="this.style.background='rgba(255,255,255,0.32)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'">✕</button>
        </div>
      </div>

      <!-- Two-column body -->
      <div style="display:flex;flex:1;overflow:hidden;min-height:0">

        <!-- LEFT: scrollable case details -->
        <div style="flex:1;padding:18px 22px;overflow-y:auto;min-width:0">
          <div style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px">Case Reference</div>
          ${row('Case Number',escHtml(c.caseNo||''))}
          ${row('Date Filed',escHtml(fmtDateWords(c.dateFiled||'')))}
          ${row('Time Filed',escHtml(formatTime12(c.timeFiled||'')))}
          <div style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.8px;margin:14px 0 10px">Parties</div>
          ${row('Complainant',escHtml((c.complainant||'').toUpperCase()))}
          ${row('Complainant Address',escHtml(c.complainantAddress||''))}
          ${row('Complainant Contact',escHtml(c.complainantContact||''))}
          ${row('Respondent',escHtml((c.respondent||'').toUpperCase()))}
          ${row('Respondent Address',escHtml(c.respondentAddress||''))}
          ${row('Respondent Contact',escHtml(c.respondentContact||''))}
          <div style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.8px;margin:14px 0 10px">Case Details</div>
          ${row('Case Title',escHtml(c.caseTitle||''))}
          ${row('Nature of Case',escHtml(c.nature||c.type||'—'))}
          ${row('Action Taken',escHtml(c.actionTaken||''))}
          <div style="display:flex;gap:0;border-bottom:1px solid #f0f0f0;padding:7px 0"><span style="width:170px;flex-shrink:0;font-size:12px;color:#6b7280;font-weight:500">Status</span>${statusBadge(c.status)}</div>
          ${row('Date of Confrontation',escHtml(fmtDateWords(c.dateConfrontation||'')))}
          ${row('Date of Settlement',escHtml(fmtDateWords(c.dateResolved||'')))}
          ${row('Mediator / Facilitator',escHtml(c.mediator||''))}
          ${row('Remarks',escHtml(c.remarks||''),true)}
          ${schedBlock}
          <div style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.8px;margin:14px 0 8px">Attachments</div>
          ${attList}
        </div>

        <!-- RIGHT: sticky KP progress panel -->
        ${kpRightPanel}
      </div>

      <!-- Footer -->
      <div style="padding:12px 22px;border-top:1px solid #eee;display:flex;gap:8px;justify-content:flex-end;flex-shrink:0;background:#f9fafb;border-radius:0 0 14px 14px">
        <button onclick="document.getElementById('view-case-modal-root').remove();openSchedulesModal('${c.id}')" style="padding:7px 16px;background:#14919b;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px">📅 Add Hearing</button>
        ${sched
          ?`<button onclick="showKpForms('${sched.id}','${c.id}')" style="padding:7px 16px;background:#7c5c00;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px">📋 KP Forms (7, 8 &amp; 9)</button>`
          :`<button onclick="viewCaseOpenForm7('${c.id}')" style="padding:7px 16px;background:#14919b;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px">🖨️ Print Forms</button>`}
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',modal);
}
function viewCaseOpenForm7(caseId){
  // Close the view modal or full-page view, then open Form 7 KP print preview
  const el=document.getElementById('view-case-modal-root');
  if(el)el.remove();
  openKpFormsFromView(caseId);
}

// ─── KP SESSION MANAGEMENT ────────────────────────────────────────────────────
function openKpAddSession(caseId, phase){
  const c=state.cases.find(x=>x.id===caseId); if(!c)return;
  const isConc = phase==='conc';
  const sessions = isConc ? (c._concSessions||[]) : (c._medSessions||[]);
  const num = sessions.length+1;
  const phaseLabel = isConc?'Conciliation':'Mediation';
  const old=document.getElementById('kp-session-modal'); if(old)old.remove();
  const html=`<div id="kp-session-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:700;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()">
    <div style="background:#fff;border-radius:12px;width:400px;max-width:96vw;box-shadow:0 12px 40px rgba(0,0,0,0.22);overflow:hidden">
      <div style="padding:14px 20px;background:#0d3d3a;display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:14px;font-weight:700;color:#fff">📅 Add ${phaseLabel} Session ${num}/3</div>
        <button onclick="document.getElementById('kp-session-modal').remove()" style="border:none;background:rgba(255,255,255,0.15);color:#fff;font-size:16px;cursor:pointer;padding:2px 8px;border-radius:5px">×</button>
      </div>
      <div style="padding:18px 20px;display:flex;flex-direction:column;gap:12px">
        <div>
          <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:4px">Session Date</label>
          <input type="date" id="kps_date" value="${todayStr()}" style="width:100%;padding:9px 11px;border:1px solid #ddd;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:4px">Session Time</label>
          <input type="time" id="kps_time" value="09:00" style="width:100%;padding:9px 11px;border:1px solid #ddd;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:4px">Notes <span style="font-weight:400;color:#9ba3ae">(optional)</span></label>
          <input type="text" id="kps_notes" placeholder="e.g. Parties appeared, no agreement reached" style="width:100%;padding:9px 11px;border:1px solid #ddd;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box">
        </div>
      </div>
      <div style="padding:12px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:8px;background:#f9fafb">
        <button onclick="document.getElementById('kp-session-modal').remove()" style="padding:8px 16px;border-radius:7px;border:1px solid #ddd;background:#fff;font-size:13px;cursor:pointer;color:#6b7280">Cancel</button>
        <button onclick="saveKpSession('${caseId}','${phase}')" style="padding:8px 18px;border-radius:7px;border:none;background:#0d3d3a;color:#fff;font-size:13px;font-weight:600;cursor:pointer">Save Session</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}
function saveKpSession(caseId, phase){
  const c=state.cases.find(x=>x.id===caseId); if(!c)return;
  const dateEl=document.getElementById('kps_date');
  const timeEl=document.getElementById('kps_time');
  const notesEl=document.getElementById('kps_notes');
  const date=(dateEl&&dateEl.value)||todayStr();
  const time=(timeEl&&timeEl.value)||'09:00';
  const notes=(notesEl&&notesEl.value.trim())||'';
  const isConc=phase==='conc';
  if(isConc){
    if(!c._concSessions)c._concSessions=[];
    if(!c._concStartDate){
      // Derive conciliation start as 1 day after the 3rd mediation session
      const medSess=c._medSessions||[];
      const thirdMed=medSess[2];
      function _addOneDay(ds){const d=new Date(ds+'T00:00:00');d.setDate(d.getDate()+1);return d.toISOString().slice(0,10);}
      c._concStartDate = (thirdMed&&thirdMed.date) ? _addOneDay(thirdMed.date) : date;
    }
    c._concSessions.push({date,time,notes,outcome:'pending'});
  } else {
    if(!c._medSessions)c._medSessions=[];
    c._medSessions.push({date,time,notes,outcome:'pending'});
    // Always keep dateConfrontation in sync with the first mediation session date
    if(c._medSessions.length===1){
      c.dateConfrontation = date;
    }
  }
  saveData('ltia_cases',state.cases);
  document.getElementById('kp-session-modal').remove();
  // Reopen view modal
  viewCase(caseId);
}
function openKpSessionOutcome(caseId, phase, idx){
  const c=state.cases.find(x=>x.id===caseId); if(!c)return;
  const isConc=phase==='conc';
  const sessions=isConc?(c._concSessions||[]):(c._medSessions||[]);
  const s=sessions[idx]; if(!s)return;
  const phaseLabel=isConc?'Conciliation':'Mediation';
  const old=document.getElementById('kp-outcome-modal'); if(old)old.remove();
  const html=`<div id="kp-outcome-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:700;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()">
    <div style="background:#fff;border-radius:12px;width:380px;max-width:96vw;box-shadow:0 12px 40px rgba(0,0,0,0.22);overflow:hidden">
      <div style="padding:14px 20px;background:#0d3d3a;display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:14px;font-weight:700;color:#fff">Set Outcome — ${phaseLabel} Session ${idx+1}</div>
        <button onclick="document.getElementById('kp-outcome-modal').remove()" style="border:none;background:rgba(255,255,255,0.15);color:#fff;font-size:16px;cursor:pointer;padding:2px 8px;border-radius:5px">×</button>
      </div>
      <div style="padding:18px 20px;display:flex;flex-direction:column;gap:10px">
        <div style="font-size:12px;color:#6b7280">Session date: <strong>${escHtml(s.date)}</strong></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button onclick="setKpSessionOutcome('${caseId}','${phase}',${idx},'settled')" style="padding:12px 16px;border-radius:9px;border:2px solid #059669;background:#d1fae5;color:#065f46;font-size:13px;font-weight:700;cursor:pointer;text-align:left">✅ Settled — parties reached an agreement</button>
          <button onclick="setKpSessionOutcome('${caseId}','${phase}',${idx},'not_settled')" style="padding:12px 16px;border-radius:9px;border:2px solid #dc2626;background:#fee2e2;color:#b91c1c;font-size:13px;font-weight:700;cursor:pointer;text-align:left">❌ Not Settled — no agreement reached</button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}
function setKpSessionOutcome(caseId, phase, idx, outcome){
  const c=state.cases.find(x=>x.id===caseId); if(!c)return;
  const isConc=phase==='conc';
  const sessions=isConc?(c._concSessions||[]):(c._medSessions||[]);
  if(!sessions[idx])return;
  sessions[idx].outcome=outcome;
  // If settled, mark case as Settled
  if(outcome==='settled'){
    c.status='Settled';
    c.actionTaken=isConc?'Conciliation':'Mediation';
    c.dateResolved=sessions[idx].date;
    // Dissolve all hearing schedules for this case upon settlement
    state.schedules = state.schedules.filter(s=>s._caseId!==c.id&&s.caseNo!==c.caseNo);
    saveData('ltia_schedules', state.schedules);
    // Set submission-to-court deadline (10 days)
    c._submissionDeadline = getSubmissionDeadline(c);
    showToast('Case marked as Settled! 🎉 Submission to court deadline: '+c._submissionDeadline,'success',5000);
  }
  // If 3 med sessions all not-settled, mark mediation as failed
  if(!isConc){
    const all=c._medSessions||[];
    if(all.length>=3&&all.every(s=>s.outcome==='not_settled'||s.outcome==='settled')){
      c._medFailed=true;
    }
  }
  // If 3 conc sessions all not-settled, prompt CFA
  if(isConc){
    const all=c._concSessions||[];
    if(all.length>=3&&all.every(s=>s.outcome==='not_settled')){
      showToast('All conciliation sessions failed. Consider issuing a CFA.','warning',5000);
    }
  }
  saveData('ltia_cases',state.cases);
  document.getElementById('kp-outcome-modal').remove();
  viewCase(caseId);
}
// ── CONFIRMATION MODAL ───────────────────────────────────────────────────────
function showKpConfirmModal({title, message, confirmLabel, confirmBg, onConfirm}){
  const existing=document.getElementById('kp-confirm-modal');
  if(existing)existing.remove();
  const bg=confirmBg||'#059669';
  const html=`<div id="kp-confirm-modal" style="position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55)" onclick="if(event.target===this)document.getElementById('kp-confirm-modal').remove()">
    <div style="background:#fff;border-radius:12px;width:380px;max-width:94vw;box-shadow:0 12px 40px rgba(0,0,0,0.25);overflow:hidden">
      <div style="padding:18px 22px 14px;border-bottom:1px solid #f0f2f5">
        <div style="font-size:15px;font-weight:700;color:#0d2137;margin-bottom:4px">${title}</div>
        <div style="font-size:13px;color:#4b5563;line-height:1.55">${message}</div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 18px">
        <button onclick="document.getElementById('kp-confirm-modal').remove()" style="padding:8px 18px;border-radius:7px;border:1px solid #e5e7eb;background:#f9fafb;color:#374151;font-size:13px;font-weight:600;cursor:pointer" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='#f9fafb'">Cancel</button>
        <button id="kp-confirm-ok" style="padding:8px 20px;border-radius:7px;border:none;background:${bg};color:#fff;font-size:13px;font-weight:700;cursor:pointer" onmouseover="this.style.opacity='0.88'" onmouseout="this.style.opacity='1'">${confirmLabel||'Confirm'}</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html);
  document.getElementById('kp-confirm-ok').onclick=()=>{
    document.getElementById('kp-confirm-modal').remove();
    onConfirm();
  };
}

function kpConfirmSessionOutcome(caseId, phase, idx, outcome){
  const c=state.cases.find(x=>x.id===caseId); if(!c)return;
  const isConc=phase==='conc';
  const sessions=isConc?(c._concSessions||[]):(c._medSessions||[]);
  const sessionNum=idx+1;
  const phaseLabel=isConc?'Lupon Conciliation':'Mediation';
  const existingOutcome=sessions[idx]?sessions[idx].outcome:null;
  const isChange=existingOutcome==='settled'||existingOutcome==='not_settled';

  if(outcome==='settled'){
    showSettlementUploadModal(caseId, phase, idx, phaseLabel, sessionNum, isChange);
  } else {
    showKpConfirmModal({
      title: '❌ Mark as Not Settled?',
      message: `You are about to mark <strong>${phaseLabel} Session ${sessionNum}</strong> as <strong>Not Settled</strong>.${isChange?' This will override the existing outcome.':''}`,
      confirmLabel: 'Yes, Mark Not Settled',
      confirmBg: '#dc2626',
      onConfirm: ()=>kpSetSessionOutcomeInline(caseId,phase,idx,outcome)
    });
  }
}

function showSettlementUploadModal(caseId, phase, idx, phaseLabel, sessionNum, isChange){
  const existing=document.getElementById('settlement-upload-modal');
  if(existing)existing.remove();

  const html=`<div id="settlement-upload-modal" style="position:fixed;inset:0;z-index:9100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6)" onclick="if(event.target===this)document.getElementById('settlement-upload-modal').remove()">
    <div style="background:#fff;border-radius:14px;width:520px;max-width:95vw;max-height:90vh;box-shadow:0 16px 48px rgba(0,0,0,0.28);overflow:hidden;display:flex;flex-direction:column">
      <!-- Header -->
      <div style="background:#059669;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div>
          <div style="font-size:15px;font-weight:700;color:#fff">✅ Mark as Settled</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:2px">${phaseLabel} — Session ${sessionNum}</div>
        </div>
        <button onclick="document.getElementById('settlement-upload-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center" onmouseover="this.style.background='rgba(255,255,255,0.32)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">✕</button>
      </div>
      <!-- Body -->
      <div style="padding:20px 22px;overflow-y:auto;flex:1">
        <div style="background:#f0fdf4;border:1px solid #6ee7b7;border-radius:8px;padding:11px 14px;font-size:12px;color:#065f46;line-height:1.55;margin-bottom:16px">
          📋 Generate the <strong>Amicable Settlement document</strong> from the system. Fill in the settlement terms below — the PDF will be auto-saved to the case attachments.
        </div>

        <!-- Settlement Terms (user-editable, shown in red in the document) -->
        <div style="margin-bottom:14px">
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px">Settlement Terms / Agreement Items <span style="color:#dc2626;font-weight:600">(required — these appear in the document)</span></label>
          <div id="settlement-terms-list" style="margin-bottom:8px"></div>
          <button onclick="addSettlementTerm()" style="padding:6px 14px;border-radius:7px;border:1px dashed #059669;background:#f0fdf4;color:#059669;font-size:12px;font-weight:600;cursor:pointer;width:100%">+ Add Term / Agreement Item</button>
        </div>

        <!-- Entered date for the document -->
        <div style="margin-bottom:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:5px">Date Entered (Day)</label>
            <input id="sett-day" type="text" placeholder="e.g. 26th" value="${(()=>{const n=new Date();const d=n.getDate();const s=['th','st','nd','rd'];const v=d%100;return d+(s[(v-20)%10]||s[v]||s[0]);})()}" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#059669'" onblur="this.style.borderColor='#d1d5db'">
          </div>
          <div>
            <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:5px">Month</label>
            <select id="sett-month" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box;background:#fff;cursor:pointer" onfocus="this.style.borderColor='#059669'" onblur="this.style.borderColor='#d1d5db'">
              ${['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i)=>`<option value="${m}" ${new Date().getMonth()===i?'selected':''}>${m}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="margin-bottom:14px">
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:5px">Year</label>
          <input id="sett-year" type="text" value="${new Date().getFullYear()}" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#059669'" onblur="this.style.borderColor='#d1d5db'">
        </div>

        <!-- Remarks input -->
        <div style="margin-bottom:14px">
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px">Remarks <span style="color:#6b7280;font-weight:400">(optional — will appear in the case remarks column)</span></label>
          <textarea id="settlement-remarks-input" rows="2" placeholder="Enter any settlement remarks or notes..." style="width:100%;padding:9px 11px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#0d2137;outline:none;box-sizing:border-box;resize:vertical;font-family:inherit" onfocus="this.style.borderColor='#059669'" onblur="this.style.borderColor='#d1d5db'"></textarea>
        </div>
        ${isChange?`<div style="font-size:11px;color:#0d3d3a;background:#fff8e1;border:1px solid #fde68a;border-radius:6px;padding:8px 12px;margin-bottom:14px">⚠️ This will override the existing outcome for this session.</div>`:''}
      </div>
      <!-- Footer -->
      <div style="padding:14px 20px;border-top:1px solid #f0f2f5;display:flex;justify-content:space-between;align-items:center;gap:8px;background:#fafafa;flex-shrink:0">
        <button onclick="document.getElementById('settlement-upload-modal').remove()" style="padding:9px 18px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;color:#374151;font-size:13px;font-weight:600;cursor:pointer" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='#fff'">Cancel</button>
        <button onclick="confirmSettlement('${caseId}','${phase}',${idx})" style="padding:9px 22px;border-radius:8px;border:none;background:#059669;color:#fff;font-size:13px;font-weight:700;cursor:pointer" onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">✅ Generate & Confirm</button>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  window._settlementFile = null;
  window._settlementTerms = [];
  // Add one empty term to start
  addSettlementTerm();
}

function addSettlementTerm() {
  const list = document.getElementById('settlement-terms-list');
  if (!list) return;
  const idx = window._settlementTerms ? window._settlementTerms.length : 0;
  if (!window._settlementTerms) window._settlementTerms = [];
  window._settlementTerms.push('');
  const row = document.createElement('div');
  row.id = 'sterm-row-' + idx;
  row.style.cssText = 'display:flex;align-items:flex-start;gap:8px;margin-bottom:8px';
  row.innerHTML = `
    <span style="min-width:20px;height:32px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#059669;background:#f0fdf4;border-radius:50%;width:20px;flex-shrink:0;margin-top:4px">${idx+1}</span>
    <textarea data-term-idx="${idx}" rows="2" placeholder="Enter term or agreement item..." oninput="window._settlementTerms[${idx}]=this.value" style="flex:1;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;color:#0d2137;outline:none;box-sizing:border-box;resize:vertical;font-family:inherit;line-height:1.5" onfocus="this.style.borderColor='#059669'" onblur="this.style.borderColor='#d1d5db'"></textarea>
    <button onclick="removeSettlementTerm(${idx})" style="border:none;background:none;color:#dc2626;font-size:18px;cursor:pointer;padding:4px;margin-top:2px;flex-shrink:0" title="Remove">×</button>
  `;
  list.appendChild(row);
}

function removeSettlementTerm(idx) {
  const row = document.getElementById('sterm-row-' + idx);
  if (row) row.remove();
  if (window._settlementTerms) window._settlementTerms[idx] = null;
}

function getSettlementTerms() {
  return (window._settlementTerms || []).filter(t => t !== null && t.trim() !== '');
}

function previewAmicableSettlement(caseId, phase) {
  const doc = buildAmicableSettlementPdf(caseId, phase);
  if (!doc) return;
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

function buildAmicableSettlementPdf(caseId, phase) {
  const {jsPDF} = window.jspdf;
  const c = state.cases.find(x => x.id === caseId);
  if (!c) { alert('Case not found.'); return null; }

  const terms = getSettlementTerms();
  if (terms.length === 0) { alert('Please enter at least one settlement term or agreement item.'); return null; }

  const day = (document.getElementById('sett-day') || {}).value || '';
  const month = (document.getElementById('sett-month') || {}).value || '';
  const year = (document.getElementById('sett-year') || {}).value || '';
  const isConc = phase === 'conc';
  const complainant = (c.complainant || '').toUpperCase();
  const complainantAddr = c.complainantAddress || 'Butuan City';
  const respondent = (c.respondent || '').toUpperCase();
  const respondentAddr = c.respondentAddress || 'Butuan City';
  const caseNo = c.caseNo || '';
  const nature = (c.caseTitle || c.type || c.nature || 'SLIGHT PHYSICAL INJURY').toUpperCase();
  const dateFiled = c.dateFiled || '';
  const timeFiled = c.timeFiled || '';

  // Date-filed display (DF)
  let dfStr = '';
  if (dateFiled) { const d = new Date(dateFiled); if (!isNaN(d)) { dfStr = (d.getMonth()+1)+'-'+d.getDate()+'-'+d.getFullYear(); } }
  const tfStr = timeFiled ? formatTime12(timeFiled) : '';

  // Officials
  const chairman = (c._lupanChairman || c.mediator || 'HON. ABUNDIO A. LEONES');
  const pangkatChair = c._pangkatChair || '';
  const pangkatSec   = c._pangkatSecretary || '';
  const pangkatMem   = c._pangkatMember || '';

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297;
  const ml = 25, mr = 25, mt = 20;
  const cw = W - ml - mr;
  const FONT = 'times';
  let y = mt;

  function _setFont(style, size) { doc.setFont(FONT, style); doc.setFontSize(size); }
  function _tw(text) { return doc.getTextWidth(text); }
  function centerText(text, yPos, style, size) {
    _setFont(style || 'normal', size || 11);
    doc.text(text, W/2, yPos, { align: 'center' });
  }

  // Header
  _setFont('normal', 10);
  centerText('Republic of the Philippines', y); y += 5;
  centerText('City of Butuan', y); y += 5;
  centerText('Barangay Pangabugan', y); y += 6;
  centerText('OFFICE OF THE LUPONG TAGAPAMAYAPA', y, 'bold', 11); y += 9;

  // Case info block (two columns)
  _setFont('normal', 10);
  const leftX = ml;
  const rightX = W / 2 + 5;
  let yLeft = y, yRight = y;

  // Left: complainant block
  _setFont('bold', 10); doc.text(complainant, leftX, yLeft); yLeft += 5; _setFont('normal', 10);
  const cAddrLines = doc.splitTextToSize(complainantAddr, cw/2 - 5);
  cAddrLines.forEach(l => { doc.text(l, leftX, yLeft); yLeft += 5; });
  doc.text('Butuan City', leftX, yLeft); yLeft += 5;
  _setFont('italic', 10); doc.text('    Complainant/s', leftX, yLeft); yLeft += 5; _setFont('normal', 10);

  // Right: case no, nature, dates
  doc.text('Barangay Case No. ' + caseNo, rightX, yRight); yRight += 5;
  const natLines = doc.splitTextToSize('For: ' + nature, cw/2 - 5);
  natLines.forEach(l => { doc.text(l, rightX, yRight); yRight += 5; });
  if (dfStr) { doc.text('DF: ' + dfStr, rightX, yRight); yRight += 5; }
  if (tfStr) { doc.text('TF: ' + tfStr, rightX, yRight); yRight += 5; }

  y = Math.max(yLeft, yRight) + 3;

  // "-against-" — left-aligned between the two party blocks
  _setFont('italic', 10);
  const againstText = '-against-';
  doc.text(againstText, leftX, y);
  y += 7;
  _setFont('normal', 10);

  // Respondent block (left)
  _setFont('bold', 10); doc.text(respondent, leftX, y); y += 5; _setFont('normal', 10);
  const rAddrLines = doc.splitTextToSize(respondentAddr, cw/2 - 5);
  rAddrLines.forEach(l => { doc.text(l, leftX, y); y += 5; });
  doc.text('Butuan City', leftX, y); y += 5;
  _setFont('italic', 10); doc.text('    Respondent/s', leftX, y); y += 8; _setFont('normal', 10);

  // Title
  centerText('AMICABLE SETTLEMENT', y, 'bold', 12); y += 9;

  // Intro paragraph
  _setFont('normal', 11);
  const introPara = '    We, complainant/s and respondent/s in the above-captioned case, do hereby agree to settle our dispute as follows:';
  doc.text(introPara, ml, y, { align: 'justify', maxWidth: cw });
  y += doc.splitTextToSize(introPara, cw).length * 5.5 + 2;

  // Settlement terms
  terms.forEach((term, i) => {
    const fullText = (i + 1) + '.  ' + term.trim().toUpperCase();
    _setFont('bold', 11);
    doc.text(fullText, ml + 3, y, { align: 'justify', maxWidth: cw - 6 });
    y += doc.splitTextToSize(fullText, cw - 6).length * 5.5 + 2;
  });

  // "and bind us..."
  _setFont('normal', 11);
  y += 1;
  const bindText = 'and bind us to comply honestly and faithfully with the above terms of settlement.';
  doc.text(bindText, ml, y, { align: 'justify', maxWidth: cw });
  y += doc.splitTextToSize(bindText, cw).length * 5.5 + 5;

  // "Entered this __ day of __ 20__."
  _setFont('normal', 11);
  let px = ml;
  doc.text('Entered this ', px, y); px += _tw('Entered this ');
  // underline the day
  doc.setLineWidth(0.3);
  doc.text(day, px, y);
  doc.line(px, y + 0.8, px + _tw(day) + 1, y + 0.8);
  px += _tw(day) + 2;
  doc.text(' day of    ', px, y); px += _tw(' day of    ');
  // underline month
  doc.text(month.toUpperCase(), px, y);
  doc.line(px, y + 0.8, px + _tw(month.toUpperCase()) + 1, y + 0.8);
  px += _tw(month.toUpperCase()) + 2;
  doc.text(', ', px, y); px += _tw(', ');
  doc.text(year, px, y);
  doc.line(px, y + 0.8, px + _tw(year) + 1, y + 0.8);
  doc.text('.', px + _tw(year) + 1, y);
  y += 12;

  // Signatures block
  _setFont('normal', 11);
  const halfW = cw / 2;
  doc.text('COMPLAINANT/S:', ml, y);
  doc.text('RESPONDENT/S:', ml + halfW, y);
  y += 10;

  _setFont('bold', 11);
  // Complainant names
  const cNames = complainant.split(/\s*[&,]\s*/).map(n => n.trim()).filter(Boolean);
  cNames.forEach(n => { doc.text(n, ml, y); y += 6; });

  // Respondent names (reset y to signature row)
  let yR = y - (cNames.length * 6);
  const rNames = respondent.split(/\s*[&,]\s*/).map(n => n.trim()).filter(Boolean);
  rNames.forEach(n => { doc.text(n, ml + halfW, yR); yR += 6; });
  y = Math.max(y, yR) + 8;

  // ATTESTATION
  centerText('ATTESTATION', y, 'bold', 12); y += 8;

  // Attestation text varies by phase
  _setFont('bold', 11);
  let attestText = '';
  if (isConc) {
    // Mediation: Punong Barangay attests
    attestText = '    I hereby certify that the foregoing amicable settlement was entered into by the parties freely and voluntarily, after I had explained to them the nature and consequences of such settlement.';
  } else {
    // Conciliation (pangkat): same attestation
    attestText = '    I hereby certify that the foregoing amicable settlement was entered into by the parties freely and voluntarily, after I had explained to them the nature and consequences of such settlement.';
  }
  const attLines = doc.splitTextToSize(attestText, cw);
  attLines.forEach(l => { doc.text(l, ml, y); y += 5.5; });
  y += 10;

  if (!isConc) {
    // Mediation: Punong Barangay signs (center-right)
    _setFont('bold', 11);
    const pbName = chairman.toUpperCase();
    doc.text(pbName, W - mr, y, { align: 'right' });
    doc.line(W - mr - _tw(pbName) - 4, y + 1, W - mr, y + 1);
    y += 5;
    _setFont('normal', 10);
    doc.text('Punong Barangay / Lupon Chairman', W - mr, y, { align: 'right' });
    y += 12;
  } else {
    // Conciliation: 3 pangkat members sign
    _setFont('bold', 11);
    const pcName = (pangkatChair || chairman).toUpperCase();
    doc.text(pcName, W - mr, y, { align: 'right' });
    doc.line(W - mr - _tw(pcName) - 4, y + 1, W - mr, y + 1);
    y += 5;
    _setFont('normal', 10);
    doc.text('Pangkat Chairman', W - mr, y, { align: 'right' });
    y += 10;

    // Secretary and Member row
    _setFont('bold', 11);
    const psName = pangkatSec.toUpperCase();
    const pmName = pangkatMem.toUpperCase();
    const secLabelW = _tw('Pangkat Secretary');
    const secNameW = psName ? _tw(psName) : secLabelW;
    const leftBlockW = Math.max(secNameW, secLabelW);
    const memColX = ml + leftBlockW + 16;
    if (psName) { doc.text(psName, ml, y); doc.line(ml, y + 1, ml + secNameW, y + 1); }
    if (pmName) { doc.text(pmName, memColX, y); doc.line(memColX, y + 1, memColX + _tw(pmName), y + 1); }
    y += 5;
    _setFont('normal', 10);
    if (psName || pangkatSec) doc.text('Pangkat Secretary', ml, y);
    if (pmName || pangkatMem) doc.text('Pangkat Member', memColX, y);
    y += 10;
  }

  return doc;
}

// Settlement file helpers (kept for compatibility)
function handleSettlementFileSelect(input){ /* replaced by PDF generation */ }
function handleSettlementDrop(e){ e.preventDefault(); /* replaced by PDF generation */ }
function applySettlementFile(file){ /* replaced by PDF generation */ }
function clearSettlementFile(){ /* replaced by PDF generation */ }

function confirmSettlement(caseId, phase, idx){
  const remarksEl=document.getElementById('settlement-remarks-input');
  const remarksVal=remarksEl?remarksEl.value.trim():'';

  // Generate the amicable settlement PDF
  const doc = buildAmicableSettlementPdf(caseId, phase);
  if (!doc) return; // validation failed inside buildAmicableSettlementPdf

  if(remarksVal){
    const cObj=state.cases.find(x=>x.id===caseId);
    if(cObj){
      const existing=(cObj.remarks||'').trim();
      cObj.remarks=existing?existing+' | '+remarksVal:remarksVal;
    }
  }

  const proceed=()=>{
    document.getElementById('settlement-upload-modal').remove();
    kpSetSessionOutcomeInline(caseId, phase, parseInt(idx), 'settled');
  };

  // Save generated PDF to attachments
  const pdfBlob = doc.output('blob');
  const reader = new FileReader();
  reader.onload = e => {
    const c = state.cases.find(x => x.id === caseId);
    if (c) {
      if (!c.attachments) c.attachments = [];
      const now = new Date().toLocaleDateString('en-PH', {year:'numeric',month:'short',day:'numeric'});
      const phaseLabel = phase === 'conc' ? 'Lupon' : 'Mediation';
      c.attachments.push({
        name: `Amicable Settlement — ${phaseLabel} Session ${parseInt(idx)+1} (${now})`,
        dataUrl: e.target.result,
        size: pdfBlob.size,
        _generated: true,
        _settlement: true,
        _settlementPhase: phase,
        _settlementTerms: getSettlementTerms().slice(),
        _settlementDay:   (document.getElementById('sett-day')||{}).value||'',
        _settlementMonth: (document.getElementById('sett-month')||{}).value||'',
        _settlementYear:  (document.getElementById('sett-year')||{}).value||''
      });
      saveData('ltia_cases', state.cases);
    }
    proceed();
    // Open the Documents panel and auto-select the newly added Amicable Settlement
    setTimeout(() => {
      const cUpdated = state.cases.find(x => x.id === caseId);
      if (cUpdated) {
        const newIdx = (cUpdated.attachments || []).length - 1;
        viewAttachments(caseId, newIdx >= 0 ? newIdx : 0);
      }
    }, 350);
  };
  reader.readAsDataURL(pdfBlob);
}

function kpSetSessionOutcomeInline(caseId, phase, idx, outcome){
  const c=state.cases.find(x=>x.id===caseId); if(!c)return;
  const isConc=phase==='conc';
  const sessions=isConc?(c._concSessions||[]):(c._medSessions||[]);
  if(!sessions[idx])return;
  sessions[idx].outcome=outcome;
  if(outcome==='settled'){
    c.status='Settled';
    c.actionTaken=isConc?'Conciliation':'Mediation';
    c.dateResolved=sessions[idx].date;
    // ── Dissolve all hearing schedules for this case upon settlement ──
    const removedCount = state.schedules.filter(s=>s._caseId===c.id||s.caseNo===c.caseNo).length;
    state.schedules = state.schedules.filter(s=>s._caseId!==c.id&&s.caseNo!==c.caseNo);
    saveData('ltia_schedules', state.schedules);
    // ── Set submission-to-court deadline (10 days) ──
    const dl = getSubmissionDeadline(c);
    c._submissionDeadline = dl;
    showToast('Case marked as Settled! 🎉 Submission to court deadline: '+dl,'success',5000);
  } else {
    // If un-settling (changing from settled back), revert case status
    if(c.status==='Settled'){
      const stillSettled=(isConc?(c._concSessions||[]):(c._medSessions||[])).some((s,i)=>i!==idx&&s.outcome==='settled');
      if(!stillSettled){ c.status='Ongoing'; c._submissionDeadline=null; }
    }
  }
  if(!isConc){
    const all=c._medSessions||[];
    if(all.length>=3&&all.every(s=>s.outcome==='not_settled'||s.outcome==='settled')){
      c._medFailed=true;
    }
  }
  if(isConc){
    const all=c._concSessions||[];
    if(all.length>=3&&all.every(s=>s.outcome==='not_settled')){
      showToast('All conciliation sessions failed. Consider issuing a CFA.','warning',5000);
    }
  }
  saveData('ltia_cases',state.cases);
  state.viewCasePage=caseId;
  render();
}

// ── KP SESSION CALENDAR SCHEDULER ────────────────────────────────────────────
// Rich calendar modal: shows 15-day window, legend, click to pick dates per session
// _kpsState holds the working state for the scheduler modal
window._kpsState = null;

function kpScheduleSessionOne(caseId, phase){
  const c=state.cases.find(x=>x.id===caseId); if(!c)return;
  const isConc=phase==='conc';
  const existing=isConc?(c._concSessions||[]):(c._medSessions||[]);
  if(existing.length>0){ showToast('Sessions are already scheduled.','info'); return; }

  // Determine 15-day window start: filing date for med, concStartDate or today for conc
  function addDays(ds,n){ const d=new Date(ds+'T00:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
  // For conciliation: derive start as 1 day after the 3rd mediation session date
  // (i.e. the day mediation's 15-day window ends + 1), falling back to _concStartDate or today
  function getConcWindowStart(cas){
    const medSess = cas._medSessions || [];
    const thirdMed = medSess[2]; // 0-indexed: index 2 = 3rd session
    if(thirdMed && thirdMed.date) return addDays(thirdMed.date, 1);
    return cas._concStartDate || todayStr();
  }
  const windowStart = isConc
    ? getConcWindowStart(c)
    : (c.dateFiled || todayStr());
  // Window end = windowStart + 14 days (15 days inclusive)
  const windowEnd = addDays(windowStart, 14);

  // Default auto picks: day 0, +5, +10 from window start (capped within window)
  const auto1 = windowStart;
  const auto2 = addDays(windowStart, 5);
  const auto3 = addDays(windowStart, 10);

  window._kpsState = {
    caseId, phase, isConc, windowStart, windowEnd,
    dates: [auto1, auto2, auto3],
    time: '09:00',
    pangkatChair:     c._pangkatChair     || '',
    pangkatSecretary: c._pangkatSecretary || '',
    pangkatMember:    c._pangkatMember    || '',
    activeSession: null,   // which session calendar is open (0,1,2 or null)
    calYear: new Date(auto1+'T00:00:00').getFullYear(),
    calMonth: new Date(auto1+'T00:00:00').getMonth()
  };

  const old=document.getElementById('kp-sched1-modal'); if(old)old.remove();
  document.body.insertAdjacentHTML('beforeend', kpsRenderModal());
}

function kpsRenderModal(){
  const st=window._kpsState; if(!st) return '';
  const phaseLabel=st.isConc?'Lupon Conciliation':'Mediation';
  function addDays(ds,n){ const d=new Date(ds+'T00:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
  function fmt(s){ if(!s)return'—'; const d=new Date(s+'T00:00:00'); return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}); }
  function isInWindow(ds){ return ds>=st.windowStart && ds<=st.windowEnd; }

  // Build session row (no inline calendar — calendar is shown in right panel)
  function sessionRow(idx){
    const labels=['Session 1','Session 2','Session 3'];
    const colors=['#3b82f6','#8b5cf6','#14919b'];
    const d=st.dates[idx];
    const isActive=st.activeSession===idx;
    const inWindow=d?isInWindow(d):false;
    const warn=d&&!inWindow?`<span style="font-size:10px;color:#b91c1c;font-weight:600;margin-left:6px">⚠ Outside window</span>`:'';
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:9px;border:2px solid ${isActive?colors[idx]:'#e5e7eb'};background:${isActive?'#f8faff':'#fff'};cursor:pointer;transition:all 0.15s;box-shadow:${isActive?`0 0 0 3px ${colors[idx]}22`:''}" onclick="kpsOpenCal(${idx})">
      <div style="width:28px;height:28px;border-radius:50%;background:${colors[idx]};color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">${idx+1}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.4px">${labels[idx]}</div>
        <div style="font-size:12px;font-weight:600;color:${d?colors[idx]:'#9ba3ae'}">${d?fmt(d):'Click to pick date'}${warn}</div>
      </div>
      <div style="font-size:13px;color:${isActive?colors[idx]:'#9ba3ae'}">${isActive?'◀':'▶'}</div>
    </div>`;
  }

  // (Legacy inline calendar — kept for reference only, not used in two-column layout)
  function kpsRenderCal_unused(idx){
    const colors=['#3b82f6','#8b5cf6','#14919b'];
    const color=colors[idx];
    const yr=st.calYear, mo=st.calMonth;
    const firstDay=new Date(yr,mo,1).getDay();
    const daysInMonth=new Date(yr,mo+1,0).getDate();
    const today=todayStr();
    const prevLabel=MONTHS[mo===0?11:mo-1].slice(0,3);
    const nextLabel=MONTHS[mo===11?0:mo+1].slice(0,3);

    let cells='';
    // Empty cells before first day
    for(let i=0;i<firstDay;i++) cells+=`<div></div>`;
    for(let d=1;d<=daysInMonth;d++){
      const ds=`${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const inWindow=ds>=st.windowStart&&ds<=st.windowEnd;
      const isDeadline=ds===st.windowEnd;
      const isSelected=st.dates[idx]===ds;
      const isOtherSession=st.dates.some((x,i)=>i!==idx&&x===ds);
      const isToday=ds===today;

      let bg='transparent', txtColor='#374151', border='none', cursor='pointer', opacity='1', fw='normal';
      if(!inWindow){ opacity='0.3'; cursor='default'; txtColor='#9ba3ae'; }
      if(inWindow){ bg='#f0fdf4'; txtColor='#065f46'; } // in-window green tint
      if(isDeadline && inWindow){ bg='#fef3c7'; txtColor='#0d3d3a'; fw='700'; border=`2px solid #14919b`; }
      if(isOtherSession && inWindow){ bg='#e0e7ff'; txtColor='#3730a3'; } // another session
      if(isSelected){ bg=color; txtColor='#fff'; fw='700'; border=`2px solid ${color}`; }
      if(isToday && !isSelected){ fw='700'; border=`2px solid ${color}`; }

      const click=inWindow?`onclick="kpsPickDate(${idx},'${ds}')"`:'' ;
      cells+=`<div ${click} title="${ds}" style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:7px;font-size:12px;font-weight:${fw};background:${bg};color:${txtColor};border:${border};cursor:${cursor};opacity:${opacity};transition:all 0.1s">${d}</div>`;
    }

    return `<div style="margin-top:4px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,0.1)">
      <!-- Cal header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb">
        <button onclick="kpsCalNav(-1,${idx})" style="border:none;background:#e5e7eb;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:13px;color:#374151;font-weight:600" title="Previous month">‹ ${prevLabel}</button>
        <span style="font-size:13px;font-weight:700;color:#0d3d3a">${MONTHS[mo]} ${yr}</span>
        <button onclick="kpsCalNav(1,${idx})" style="border:none;background:#e5e7eb;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:13px;color:#374151;font-weight:600" title="Next month">${nextLabel} ›</button>
      </div>
      <!-- Day headers -->
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;padding:8px 10px 4px;background:#f9fafb">
        ${['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>`<div style="text-align:center;font-size:10px;font-weight:700;color:#9ba3ae;padding:2px 0">${d}</div>`).join('')}
      </div>
      <!-- Day cells -->
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;padding:4px 10px 10px">${cells}</div>
      <!-- Legend -->
      <div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 12px;border-top:1px solid #f0f0f0;background:#f9fafb">
        <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#374151"><div style="width:12px;height:12px;border-radius:3px;background:#f0fdf4;border:1px solid #6ee7b7"></div>Within 15-day window</div>
        <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#374151"><div style="width:12px;height:12px;border-radius:3px;background:#d4f1f1;border:2px solid #14919b"></div>Deadline (Day 15)</div>
        <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#374151"><div style="width:12px;height:12px;border-radius:3px;background:${color};border:2px solid ${color}"></div>Selected date</div>
        <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#374151"><div style="width:12px;height:12px;border-radius:3px;background:#e0e7ff;border:1px solid #a5b4fc"></div>Another session</div>
        <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#374151"><div style="width:12px;height:12px;border-radius:3px;opacity:0.3;background:#9ba3ae"></div>Outside window</div>
      </div>
      <!-- Window info -->
      <div style="padding:6px 12px 10px;font-size:11px;color:#6b7280;background:#f9fafb">
        📅 15-day window: <strong>${st.windowStart}</strong> → <strong>${st.windowEnd}</strong>${st.isConc?' <span style="font-size:10px;color:#9ba3ae">(from mediation 3rd session + 1 day)</span>':''}
      </div>
    </div>`;
  }

  const allSet=st.dates.every(d=>!!d);
  const anyOutside=st.dates.some(d=>d&&(d<st.windowStart||d>st.windowEnd));

  // Render the calendar panel (always visible on right side)
  function kpsRenderCalPanel(){
    if(st.activeSession===null){
      return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:260px;color:#9ba3ae;font-size:13px;text-align:center;gap:10px;padding:20px">
        <div style="font-size:36px">📅</div>
        <div style="font-weight:600;color:#6b7280">Select a session on the left</div>
        <div style="font-size:12px">The calendar will appear here so you can pick a date</div>
      </div>`;
    }
    const idx=st.activeSession;
    const colors=['#3b82f6','#8b5cf6','#14919b'];
    const labels=['Session 1','Session 2','Session 3'];
    const color=colors[idx];
    const yr=st.calYear, mo=st.calMonth;
    const firstDay=new Date(yr,mo,1).getDay();
    const daysInMonth=new Date(yr,mo+1,0).getDate();
    const today=todayStr();
    const prevLabel=MONTHS[mo===0?11:mo-1].slice(0,3);
    const nextLabel=MONTHS[mo===11?0:mo+1].slice(0,3);

    let cells='';
    for(let i=0;i<firstDay;i++) cells+=`<div></div>`;
    for(let d=1;d<=daysInMonth;d++){
      const ds=`${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const inWindow=ds>=st.windowStart&&ds<=st.windowEnd;
      const isDeadline=ds===st.windowEnd;
      const isSelected=st.dates[idx]===ds;
      const isOtherSession=st.dates.some((x,i)=>i!==idx&&x===ds);
      const isToday=ds===today;

      let bg='transparent', txtColor='#374151', border='none', cursor='pointer', opacity='1', fw='normal';
      if(!inWindow){ opacity='0.3'; cursor='default'; txtColor='#9ba3ae'; }
      if(inWindow){ bg='#f0fdf4'; txtColor='#065f46'; }
      if(isDeadline && inWindow){ bg='#fef3c7'; txtColor='#0d3d3a'; fw='700'; border=`2px solid #14919b`; }
      if(isOtherSession && inWindow){ bg='#e0e7ff'; txtColor='#3730a3'; }
      if(isSelected){ bg=color; txtColor='#fff'; fw='700'; border=`2px solid ${color}`; }
      if(isToday && !isSelected){ fw='700'; border=`2px solid ${color}`; }

      const click=inWindow?`onclick="kpsPickDate(${idx},'${ds}')"`:'' ;
      cells+=`<div ${click} title="${ds}" style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:7px;font-size:12px;font-weight:${fw};background:${bg};color:${txtColor};border:${border};cursor:${cursor};opacity:${opacity};transition:all 0.1s">${d}</div>`;
    }

    return `<div style="display:flex;flex-direction:column;height:100%">
      <!-- Cal label -->
      <div style="padding:10px 14px 8px;display:flex;align-items:center;gap:8px">
        <div style="width:22px;height:22px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0">${idx+1}</div>
        <span style="font-size:12px;font-weight:700;color:#0d3d3a;text-transform:uppercase;letter-spacing:0.4px">${labels[idx]} — Pick a Date</span>
      </div>
      <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#fff;flex:1;display:flex;flex-direction:column">
        <!-- Cal header -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;flex-shrink:0">
          <button onclick="kpsCalNav(-1,${idx})" style="border:none;background:#e5e7eb;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:13px;color:#374151;font-weight:600" title="Previous month">‹ ${prevLabel}</button>
          <span style="font-size:13px;font-weight:700;color:#0d3d3a">${MONTHS[mo]} ${yr}</span>
          <button onclick="kpsCalNav(1,${idx})" style="border:none;background:#e5e7eb;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:13px;color:#374151;font-weight:600" title="Next month">${nextLabel} ›</button>
        </div>
        <!-- Day headers -->
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;padding:8px 10px 4px;background:#f9fafb;flex-shrink:0">
          ${['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>`<div style="text-align:center;font-size:10px;font-weight:700;color:#9ba3ae;padding:2px 0">${d}</div>`).join('')}
        </div>
        <!-- Day cells -->
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;padding:4px 10px 10px;flex:1">${cells}</div>
        <!-- Legend -->
        <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px;border-top:1px solid #f0f0f0;background:#f9fafb;flex-shrink:0">
          <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#374151"><div style="width:12px;height:12px;border-radius:3px;background:#f0fdf4;border:1px solid #6ee7b7"></div>In window</div>
          <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#374151"><div style="width:12px;height:12px;border-radius:3px;background:#d4f1f1;border:2px solid #14919b"></div>Deadline</div>
          <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#374151"><div style="width:12px;height:12px;border-radius:3px;background:${color};border:2px solid ${color}"></div>Selected</div>
          <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#374151"><div style="width:12px;height:12px;border-radius:3px;background:#e0e7ff;border:1px solid #a5b4fc"></div>Other session</div>
        </div>
        <!-- Window info -->
        <div style="padding:6px 12px 10px;font-size:11px;color:#6b7280;background:#f9fafb;flex-shrink:0">
          📅 15-day window: <strong>${st.windowStart}</strong> → <strong>${st.windowEnd}</strong>${st.isConc?' <span style="font-size:10px;color:#9ba3ae">(from med. 3rd session + 1 day)</span>':''}
        </div>
      </div>
    </div>`;
  }

  return `<div id="kp-sched1-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:700;display:flex;align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)this.remove()">
    <div style="background:#fff;border-radius:14px;width:860px;max-width:98vw;height:${st.isConc?'680px':'600px'};display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.28);overflow:hidden">
      <!-- Header -->
      <div style="padding:14px 20px;background:#0d3d3a;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div>
          <div style="font-size:14px;font-weight:700;color:#fff">📅 Schedule ${phaseLabel} Sessions</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:2px">Click each session to pick a date from the calendar</div>
        </div>
        <button onclick="document.getElementById('kp-sched1-modal').remove()" style="border:none;background:rgba(255,255,255,0.15);color:#fff;font-size:16px;cursor:pointer;padding:4px 10px;border-radius:6px">×</button>
      </div>

      <!-- Two-column body — fixed height, no resize -->
      <div style="display:flex;flex:1;overflow:hidden;min-height:0">

        <!-- LEFT: session list + time picker — fixed, no scroll needed -->
        <div style="width:340px;min-width:300px;padding:16px 18px;display:flex;flex-direction:column;gap:10px;border-right:1px solid #e5e7eb;background:#f9fafb;overflow-y:auto">

          <!-- Time picker -->
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fff;border:1px solid #e5e7eb;border-radius:9px;flex-shrink:0">
            <span style="font-size:13px">🕐</span>
            <label style="font-size:12px;font-weight:600;color:#374151;white-space:nowrap">Session Time</label>
            <input type="time" id="kps1_time" value="${st.time}" oninput="window._kpsState.time=this.value" style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:7px;font-size:13px;outline:none;background:#fff">
            <span style="font-size:11px;color:#9ba3ae">applies to all sessions</span>
          </div>

          <!-- Session rows -->
          <div style="display:flex;flex-direction:column;gap:8px;flex-shrink:0">
            ${sessionRow(0)}
            ${sessionRow(1)}
            ${sessionRow(2)}
          </div>

          <!-- Pangkat Members — only for conciliation -->
          ${st.isConc ? `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:9px;padding:12px 14px;flex-shrink:0">
            <div style="font-size:11px;font-weight:700;color:#14919b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">⚖️ Pangkat Members</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <div>
                <label style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.4px;display:block;margin-bottom:3px">Pangkat Chairman</label>
                <input id="kps1_pangkatChair" type="text" placeholder="Full name" value="${escHtml(st.pangkatChair||'')}" oninput="window._kpsState.pangkatChair=this.value" style="width:100%;padding:6px 10px;border:1px solid #ddd;border-radius:7px;font-size:12px;outline:none">
              </div>
              <div>
                <label style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.4px;display:block;margin-bottom:3px">Pangkat Secretary</label>
                <input id="kps1_pangkatSecretary" type="text" placeholder="Full name" value="${escHtml(st.pangkatSecretary||'')}" oninput="window._kpsState.pangkatSecretary=this.value" style="width:100%;padding:6px 10px;border:1px solid #ddd;border-radius:7px;font-size:12px;outline:none">
              </div>
              <div>
                <label style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.4px;display:block;margin-bottom:3px">Pangkat Member</label>
                <input id="kps1_pangkatMember" type="text" placeholder="Full name" value="${escHtml(st.pangkatMember||'')}" oninput="window._kpsState.pangkatMember=this.value" style="width:100%;padding:6px 10px;border:1px solid #ddd;border-radius:7px;font-size:12px;outline:none">
              </div>
            </div>
          </div>` : ''}

          <!-- Warning if outside window -->
          ${anyOutside?`<div style="padding:9px 12px;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;font-size:12px;color:#b91c1c;font-weight:600;flex-shrink:0">⚠️ One or more sessions are outside the 15-day window. Please adjust the dates.</div>`:''}
        </div>

        <!-- RIGHT: calendar panel — fixed, internal scroll only -->
        <div style="flex:1;padding:14px 16px;display:flex;flex-direction:column;min-width:0;overflow:hidden">
          ${kpsRenderCalPanel()}
        </div>

      </div>

      <!-- Footer -->
      <div style="padding:12px 20px;border-top:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;background:#f9fafb;flex-shrink:0">
        <div style="font-size:11px;color:#9ba3ae">Tip: click a session row to open its calendar</div>
        <div style="display:flex;gap:8px">
          <button onclick="document.getElementById('kp-sched1-modal').remove()" style="padding:8px 16px;border-radius:7px;border:1px solid #ddd;background:#fff;font-size:13px;cursor:pointer;color:#6b7280">Cancel</button>
          ${st.editMode
            ? `<button onclick="kpSaveEditSchedule()" style="padding:8px 18px;border-radius:7px;border:none;background:#0d3d3a;color:#fff;font-size:13px;font-weight:600;cursor:pointer">✏️ Update Schedule</button>`
            : `<button onclick="kpSaveAutoSchedule()" ${!allSet?'disabled title="Select dates for all 3 sessions"':''} style="padding:8px 18px;border-radius:7px;border:none;background:${allSet?'#0d3d3a':'#9ba3ae'};color:#fff;font-size:13px;font-weight:600;cursor:${allSet?'pointer':'not-allowed'}">✅ Save All 3 Sessions</button>`
          }
        </div>
      </div>
    </div>
  </div>`;
}

function kpsOpenCal(idx){
  const st=window._kpsState; if(!st)return;
  if(st.activeSession===idx){ st.activeSession=null; }
  else {
    st.activeSession=idx;
    // Set cal view to show the month of currently selected date (or window start)
    const refDate=st.dates[idx]||st.windowStart;
    const d=new Date(refDate+'T00:00:00');
    st.calYear=d.getFullYear(); st.calMonth=d.getMonth();
  }
  // Re-render modal in place
  const old=document.getElementById('kp-sched1-modal'); if(old)old.remove();
  document.body.insertAdjacentHTML('beforeend', kpsRenderModal());
}

function kpsCalNav(dir, idx){
  const st=window._kpsState; if(!st)return;
  st.calMonth+=dir;
  if(st.calMonth<0){st.calMonth=11;st.calYear--;}
  if(st.calMonth>11){st.calMonth=0;st.calYear++;}
  const old=document.getElementById('kp-sched1-modal'); if(old)old.remove();
  document.body.insertAdjacentHTML('beforeend', kpsRenderModal());
}

function kpsPickDate(idx, ds){
  const st=window._kpsState; if(!st)return;
  st.dates[idx]=ds;
  // Auto-suggest next sessions if not yet set
  function addDays(dateStr,n){ const d=new Date(dateStr+'T00:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
  if(idx===0){
    if(!st.dates[1]) st.dates[1]=addDays(ds,5);
    if(!st.dates[2]) st.dates[2]=addDays(ds,10);
  }
  // Move to next unset session, or close cal if all set
  const nextUnset=st.dates.findIndex((d,i)=>i>idx&&!d);
  if(nextUnset>=0){
    st.activeSession=nextUnset;
    const d=new Date(st.dates[nextUnset]+'T00:00:00');
    st.calYear=d.getFullYear(); st.calMonth=d.getMonth();
  } else {
    st.activeSession=null;
  }
  const old=document.getElementById('kp-sched1-modal'); if(old)old.remove();
  document.body.insertAdjacentHTML('beforeend', kpsRenderModal());
}

function kpSaveAutoSchedule(){
  const st=window._kpsState; if(!st)return;
  const c=state.cases.find(x=>x.id===st.caseId); if(!c)return;
  if(st.dates.some(d=>!d)){showToast('Please select dates for all 3 sessions.','warning');return;}
  const time=st.time||'09:00';
  const sessions=st.dates.map(date=>({date, time, outcome:'pending'}));
  if(st.isConc){
    c._concSessions=sessions;
    // Set _concStartDate from 3rd mediation session + 1 day if available, else first conc session date
    if(!c._concStartDate){
      const medSess=c._medSessions||[];
      const thirdMed=medSess[2];
      function _addD(ds,n){const d=new Date(ds+'T00:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
      c._concStartDate = (thirdMed&&thirdMed.date) ? _addD(thirdMed.date,1) : st.dates[0];
    }
    // Save Pangkat members entered in the scheduling modal
    if(st.pangkatChair)    c._pangkatChair    = st.pangkatChair;
    if(st.pangkatSecretary)c._pangkatSecretary = st.pangkatSecretary;
    if(st.pangkatMember)   c._pangkatMember   = st.pangkatMember;
  } else {
    c._medSessions=sessions;
    // Always set dateConfrontation to the first mediation session date
    if(st.dates[0]){
      c.dateConfrontation = st.dates[0];
    }
  }
  saveData('ltia_cases',state.cases);
  document.getElementById('kp-sched1-modal').remove();
  window._kpsState=null;
  showToast(`All 3 ${st.isConc?'Conciliation':'Mediation'} sessions scheduled!`,'success',4000);
  state.viewCasePage=st.caseId;
  render();
}

// Open the KP Forms modal pre-selected on a specific form
function kpOpenFormForSession(caseId, formKey){
  openKpFormsFromView(caseId);
  setTimeout(()=>kpShowPreview(formKey),180);
}

// Edit an existing session's date/time
function kpEditSession(caseId, phase, idx){
  const c=state.cases.find(x=>x.id===caseId); if(!c)return;
  const isConc=phase==='conc';
  const sessions=isConc?(c._concSessions||[]):(c._medSessions||[]);
  const s=sessions[idx]; if(!s)return;

  function addDays(ds,n){ const d=new Date(ds+'T00:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
  // For conciliation: derive window start from 3rd mediation session + 1 day, fallback to _concStartDate
  function getConcWindowStart(cas){
    const medSess=cas._medSessions||[];
    const thirdMed=medSess[2];
    if(thirdMed&&thirdMed.date) return addDays(thirdMed.date,1);
    return cas._concStartDate||cas.dateFiled||s.date;
  }
  const windowStart = isConc ? getConcWindowStart(c) : (c.dateFiled||s.date);
  const windowEnd = addDays(windowStart, 14);

  window._kpsState = {
    caseId, phase, isConc, windowStart, windowEnd,
    dates: sessions.map(x=>x.date||''),
    time: s.time||'09:00',
    pangkatChair:     c._pangkatChair     || '',
    pangkatSecretary: c._pangkatSecretary || '',
    pangkatMember:    c._pangkatMember    || '',
    editMode: true,
    activeSession: idx,
    calYear: new Date((s.date||windowStart)+'T00:00:00').getFullYear(),
    calMonth: new Date((s.date||windowStart)+'T00:00:00').getMonth()
  };
  const old=document.getElementById('kp-sched1-modal'); if(old)old.remove();
  document.body.insertAdjacentHTML('beforeend', kpsRenderModal());
}

// Override kpSaveAutoSchedule to handle edit mode too — save updates individual session dates
function kpSaveEditSchedule(){
  const st=window._kpsState; if(!st)return;
  const c=state.cases.find(x=>x.id===st.caseId); if(!c)return;
  const sessions=st.isConc?(c._concSessions||[]):(c._medSessions||[]);
  const time=st.time||'09:00';
  st.dates.forEach((date,i)=>{
    if(sessions[i]) { sessions[i].date=date; sessions[i].time=time; }
  });
  if(st.isConc){
    c._concSessions=sessions;
    if(st.pangkatChair)    c._pangkatChair    = st.pangkatChair;
    if(st.pangkatSecretary)c._pangkatSecretary = st.pangkatSecretary;
    if(st.pangkatMember)   c._pangkatMember   = st.pangkatMember;
  } else {
    c._medSessions=sessions;
    // Always keep dateConfrontation in sync with the first mediation session date
    if(sessions[0] && sessions[0].date){
      c.dateConfrontation = sessions[0].date;
    }
  }
  saveData('ltia_cases',state.cases);
  document.getElementById('kp-sched1-modal').remove();
  window._kpsState=null;
  showToast('Session schedule updated!','success',3000);
  state.viewCasePage=st.caseId;
  render();
}

// Generate conciliation forms (Form 9, 11, 12) for a specific session
function kpGenerateConcForms(caseId, sessionDate, sessionTime){
  const {jsPDF}=window.jspdf;
  const c=state.cases.find(x=>x.id===caseId);
  if(!c){alert('Case not found.');return;}

  const schedDate = sessionDate || '';
  const schedTime = sessionTime || '';
  const chairman  = c._lupanChairman||c.mediator||'HON. ABUNDIO A. LEONES';

  const data = {
    caseNo: c.caseNo, dateFiled: c.dateFiled||'', timeFiled: c.timeFiled||'',
    complainant: c.complainant||'', complainantAddress: c.complainantAddress||'',
    respondent: c.respondent||'', respondentAddress: c.respondentAddress||'',
    caseTitle: c.caseTitle||c.type||'', schedDate, schedTime, chairman,
    officer: 'RAMIL  ROSALES',
    pangkatChair:     c._pangkatChair     || '',
    pangkatSecretary: c._pangkatSecretary || '',
    pangkatMember:    c._pangkatMember    || '',
    lupons: [c._pangkatChair||'', c._pangkatSecretary||'', c._pangkatMember||''].filter(Boolean),
    isConc: true
  };

  // Build Form 11 (3 copies, one per pangkat member)
  const pangkatMembers = [
    { role:'Chosen Pangkat', name: data.pangkatChair     || '____________________________' },
    { role:'Chosen Pangkat', name: data.pangkatSecretary || '____________________________' },
    { role:'Chosen Pangkat', name: data.pangkatMember    || '____________________________' }
  ];
  const doc11 = new jsPDF({unit:'mm',format:'a4'});
  pangkatMembers.forEach((pm,idx)=>{ if(idx>0) doc11.addPage(); _fillKpForm11(doc11, data, pm); });
  const uri11 = doc11.output('datauristring');

  // Build Form 12
  const doc12 = new jsPDF({unit:'mm',format:'a4'});
  _fillKpForm12(doc12, data);
  const uri12 = doc12.output('datauristring');

  // Build Form 9 (Summons + Officer's Return)
  const doc9 = new jsPDF({unit:'mm',format:'a4'});
  _fillKpForm9(doc9, data);
  doc9.addPage();
  _fillKpForm9Page2(doc9, data);
  const uri9 = doc9.output('datauristring');

  // Save to attachments immediately
  if(!c.attachments) c.attachments=[];
  const nowShort = new Date().toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'});
  const sessionTag = schedDate ? ` [${schedDate}]` : '';
  c.attachments = c.attachments.filter(a=>!(a._generated && a._sessionDate===schedDate && /Form 11|Form 12|Form 9.*Conc/i.test(a.name)));
  const idx11 = c.attachments.length;
  c.attachments.push({name:`Form 11 – Notice to Pangkat Members${sessionTag} (${nowShort})`, dataUrl:uri11, size:0, _generated:true, _sessionDate:schedDate});
  c.attachments.push({name:`Form 12 – Notice of Hearing (Conciliation)${sessionTag} (${nowShort})`, dataUrl:uri12, size:0, _generated:true, _sessionDate:schedDate});
  c.attachments.push({name:`Form 9 – Summons (Conciliation)${sessionTag} (${nowShort})`, dataUrl:uri9, size:0, _generated:true, _sessionDate:schedDate});
  saveData('ltia_cases', state.cases);

  // Show toast and open attachment viewer directly on the Form 11 row
  showToast('Forms 11, 12 & 9 saved to Attachments!', 'success', 3000);
  if(state.viewCasePage===caseId){
    render();
    setTimeout(()=>viewAttachments(caseId, idx11), 80);
  } else {
    viewAttachments(caseId, idx11);
  }
}

function kpcfSwitchTab(tab){
  ['11','12','9'].forEach(t=>{
    const f=document.getElementById('kpcf-frame'+t);
    const b=document.getElementById('kpcf-tab'+t);
    if(!f||!b)return;
    const active=t===tab;
    f.style.display=active?'block':'none';
    b.style.borderBottom=active?'3px solid #7c3aed':'3px solid transparent';
    b.style.color=active?'#7c3aed':'#6b7280';
    b.style.fontWeight=active?'700':'600';
  });
}

function kpcfPrintAndSave(caseId){
  const d=window._kpcfData; if(!d)return;
  // Print currently visible tab
  ['11','12','9'].forEach(t=>{
    const f=document.getElementById('kpcf-frame'+t);
    if(f&&f.style.display!=='none'){ try{f.contentWindow.print();}catch(e){window.open(f.src,'_blank');} }
  });
  document.getElementById('kp-conc-forms-modal').remove();
  showToast('Forms saved to Attachments!','success',3000);
  state.viewCasePage=caseId;
  render();
}

// ── Form 11: Notice to Chosen Pangkat Member (one copy per member) ──────────
function _fillKpForm11(doc, d, pangkatMember){
  const W=210, ml=KP_ML, mr=KP_MR, cw=W-ml-mr;
  const schedDt=d.schedDate?new Date(d.schedDate+'T00:00:00'):null;
  const filedDt=d.dateFiled?new Date(d.dateFiled+'T00:00:00'):null;
  doc.setCharSpace(KP_CHAR_SPACE);
  doc.setTextColor(0,0,0); doc.setDrawColor(0,0,0);

  // Top-left label
  doc.setFontSize(KP_FONT_BASE); doc.setFont(KP_FONT,'bold');
  doc.text('KP Form No. 11', ml, KP_MT-6);

  // Header
  let y=KP_MT+2;
  doc.setFontSize(KP_FONT_BASE); doc.setFont(KP_FONT,'normal');
  doc.text('Republic of the Philippines', W/2, y, {align:'center'}); y+=KP_LH;
  doc.text('City of Butuan', W/2, y, {align:'center'}); y+=KP_LH;
  doc.setFont(KP_FONT,'bold');
  doc.text('Barangay Pangabugan', W/2, y, {align:'center'});
  y+=KP_LH+8;
  doc.setFontSize(KP_FONT_TITLE); doc.setFont(KP_FONT,'bold');
  doc.text('OFFICE OF THE LUPONG TAGAPAMAYAPA', W/2, y, {align:'center'}); y+=KP_LH+8;

  // Two-column case header
  const rightCol=W/2+8;
  doc.setFontSize(KP_FONT_BASE); doc.setFont(KP_FONT,'bold');
  const compName=(d.complainant||'').toUpperCase();
  doc.text(compName, ml, y);
  // No underline on complainant name per style update

  // Right: Barangay Case No.
  doc.setFont(KP_FONT,'normal');
  const filedStr=filedDt?filedDt.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):'';
  doc.text('Barangay Case No. '+(d.caseNo||''), rightCol, y);
  y+=KP_LH;

  doc.setFont(KP_FONT,'normal');
  // Complainant address (purok/street/barangay from user input)
  if(d.complainantAddress) doc.text(d.complainantAddress, ml, y);
  doc.text('For: '+(d.caseTitle||''), rightCol, y);
  y+=KP_LH;

  doc.text('Butuan City', ml, y);
  // DF = Date Filed, formatted as "May 1, 2026"
  doc.text('DF: '+(filedStr), rightCol, y);
  y+=KP_LH;
  doc.text('Complainant/s', ml, y);
  const tf='TF: '+(d.timeFiled||'');
  doc.text(tf, rightCol, y);
  y+=KP_LH+4;
  doc.text('   - against', ml, y); y+=KP_LH+4;

  doc.setFont(KP_FONT,'bold');
  const respName=(d.respondent||'').toUpperCase();
  doc.text(respName, ml, y);
  y+=KP_LH;
  doc.setFont(KP_FONT,'normal');
  // Respondent address (purok/street/barangay from user input)
  if(d.respondentAddress) doc.text(d.respondentAddress, ml, y);
  y+=KP_LH;
  doc.text('Butuan City', ml, y);
  y+=KP_LH;
  doc.text('Respondent/s', ml, y); y+=KP_LH+10;

  // Title
  doc.setFontSize(KP_FONT_TITLE); doc.setFont(KP_FONT,'bold');
  doc.text('NOTICE TO CHOSEN PANGKAT MEMBERS', W/2, y, {align:'center'}); y+=KP_LH+8;

  // Date issued line — use today's date (date user clicks Generate)
  doc.setFontSize(KP_FONT_BASE); doc.setFont(KP_FONT,'normal');
  const issuedMon = new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  doc.text(issuedMon, ml, y); y+=KP_LH+4;

  // To:
  doc.text('To: ', ml, y);
  let px=ml+_tw(doc,'To: ');
  doc.setFont(KP_FONT,'bold');
  const pmName=(pangkatMember.name||'').toUpperCase();
  doc.text(pmName, px, y);
  const pmW=_tw(doc,pmName);
  doc.line(px, y+1.2, px+pmW, y+1.2);
  y+=KP_LH+6;

  // Body
  doc.setFont(KP_FONT,'normal');
  const bodyText = '     Notice is hereby given that you have been chosen a member of the Pangkat ng Tagapagkasundo to amicably conciliate the dispute between the parties in the above-titled case.';
  const lines = doc.splitTextToSize(bodyText, cw);
  lines.forEach((ln, li) => {
    doc.text(ln, ml, y + li * KP_LH, {align:'justify'});
  });
  y += lines.length * KP_LH + 28;

  // Chairman signature
  const ch=(d.chairman||'HON. ABUNDIO A. LEONES').toUpperCase();
  const chW=_tw(doc,ch);
  doc.setFont(KP_FONT,'bold');
  doc.text(' '+ch+' ', W-mr, y, {align:'right'});
  doc.line(W-mr-chW-8, y+1.2, W-mr+2, y+1.2);
  y+=KP_LH;
  doc.setFont(KP_FONT,'normal');
  doc.text('Punong Barangay/Lupon Secretary', W-mr, y, {align:'right'}); y+=KP_LH+14;

  // Received this line
  const recMon = schedDt ? MONTHS[schedDt.getMonth()] : '___';
  const recYr  = schedDt ? schedDt.getFullYear() : '____';
  doc.text('Received this ', ml, y); px=ml+_tw(doc,'Received this ');
  doc.line(px, y+0.5, px+26, y+0.5); px+=28;
  doc.text(' day of ', px, y); px+=_tw(doc,' day of ');
  doc.setFont(KP_FONT,'bold'); doc.text(' '+recMon+' ', px, y); px+=_tw(doc,' '+recMon+' ');
  doc.line(px-_tw(doc,' '+recMon+' ')-2, y+1.2, px, y+1.2);
  doc.setFont(KP_FONT,'normal'); doc.text(' '+recYr, px, y); y+=KP_LH+18;

  // Chosen Pangkat signature
  doc.text(pmName, W/2, y, {align:'center'});
  doc.line(W/2-40, y+1.2, W/2+40, y+1.2); y+=KP_LH;
  doc.text(pangkatMember.role||'Chosen Pangkat', W/2, y, {align:'center'});
}

// ── Form 12: Notice of Hearing (Conciliation Proceedings) ────────────────────
function _fillKpForm12(doc, d){
  const W=210, ml=KP_ML, mr=KP_MR, cw=W-ml-mr;
  const schedDt=d.schedDate?new Date(d.schedDate+'T00:00:00'):null;
  const filedDt=d.dateFiled?new Date(d.dateFiled+'T00:00:00'):null;
  doc.setCharSpace(KP_CHAR_SPACE);
  doc.setTextColor(0,0,0); doc.setDrawColor(0,0,0);

  // Top-left label
  doc.setFontSize(KP_FONT_BASE); doc.setFont(KP_FONT,'bold');
  doc.text('KP Form No. 12', ml, KP_MT-6);

  // Header
  let y=KP_MT+2;
  doc.setFontSize(KP_FONT_BASE); doc.setFont(KP_FONT,'normal');
  doc.text('Republic of the Philippines', W/2, y, {align:'center'}); y+=KP_LH;
  doc.text('City of Butuan', W/2, y, {align:'center'}); y+=KP_LH;
  doc.setFont(KP_FONT,'bold');
  doc.text('Barangay Pangabugan', W/2, y, {align:'center'});
  y+=KP_LH+8;
  doc.setFontSize(KP_FONT_TITLE); doc.setFont(KP_FONT,'bold');
  doc.text('OFFICE OF THE LUPONG TAGAPAMAYAPA', W/2, y, {align:'center'}); y+=KP_LH+8;

  // Right-side case info block
  doc.setFontSize(KP_FONT_BASE); doc.setFont(KP_FONT,'normal');
  const rightCol2=W/2+8;
  const filedStr=filedDt?filedDt.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):'';
  doc.text('DF: '+filedStr, rightCol2, y); y+=KP_LH;
  doc.text('Barangay Case No. '+(d.caseNo||''), rightCol2, y); y+=KP_LH;
  doc.text('For: '+(d.caseTitle||''), rightCol2, y); y+=KP_LH;
  doc.text('TF: '+_fmt12hrTime(d.timeFiled||''), rightCol2, y); y+=KP_LH+4;

  // To: parties
  const compName=(d.complainant||'').toUpperCase();
  const respName=(d.respondent||'').toUpperCase();
  doc.text('To: ', ml, y);
  let px=ml+_tw(doc,'To: ');
  doc.setFont(KP_FONT,'bold'); doc.text(compName, px, y); doc.line(px, y+1.2, px+_tw(doc,compName), y+1.2);
  // respondent right side
  const rightParty=W/2+8;
  doc.text(respName, rightParty, y); doc.line(rightParty, y+1.2, rightParty+_tw(doc,respName), y+1.2); y+=KP_LH;
  // second respondent line if any additional
  doc.setFont(KP_FONT,'normal'); doc.text('   Complainant/s', px, y);
  doc.text('   Respondent/s', rightParty, y); y+=KP_LH+10;

  // Title
  doc.setFontSize(KP_FONT_TITLE); doc.setFont(KP_FONT,'bold');
  doc.text('NOTICE OF HEARING', W/2, y, {align:'center'}); y+=KP_LH;
  doc.text('(CONCILIATION PROCEEDINGS)', W/2, y, {align:'center'}); y+=KP_LH+8;

  // Body paragraph
  doc.setFontSize(KP_FONT_BASE); doc.setFont(KP_FONT,'normal');
  const sDay=schedDt?ordinalDay(schedDt):'____';
  const sMon=schedDt?MONTHS[schedDt.getMonth()].toUpperCase():'____';
  const sYr=schedDt?String(schedDt.getFullYear()):'____';
  const sTime=_fmt12hrTime(d.schedTime||'1:00 PM');
  const isAM=!/pm/i.test(sTime);
  const sTimeDisplay=sTime.replace(/\s*(AM|PM)$/i,'').trim();

  // Body line 1: "You are hereby required ... at [time] o'clock in the"
  px=ml;
  const bodyPart1 = 'You are hereby required to appear before the Pangkat on the ';
  doc.text(bodyPart1, px, y); px+=_tw(doc,bodyPart1);
  px+=_tw(doc,' '); // explicit word space so day ordinal doesn't overlap "on the"
  px=_utext(doc,sDay,px,y,[0,0,0]);
  doc.setTextColor(0,0,0); doc.text(' day of ', px, y); px+=_tw(doc,' day of ');
  px=_utext(doc,sMon,px,y,[0,0,0]);
  doc.setTextColor(0,0,0); doc.text(' ', px, y); px+=_tw(doc,' ');
  px=_utext(doc,sYr,px,y,[0,0,0]);
  doc.setTextColor(0,0,0); doc.text(' at ', px, y); px+=_tw(doc,' at ');
  px=_utext(doc,sTimeDisplay,px,y,[0,0,0]);
  doc.setTextColor(0,0,0); doc.text(" o'clock in the", px, y);
  y+=KP_LH;
  // Body line 2: "[morning]/afternoon for the hearing of the above-titled case."
  px=ml;
  if(isAM){
    px=_utext(doc,'morning',px,y,[0,0,0]);
    doc.setTextColor(0,0,0); doc.text('/afternoon for the hearing of the above-titled case.',px,y);
  } else {
    doc.text('morning/',px,y); px+=_tw(doc,'morning/');
    px=_utext(doc,'afternoon',px,y,[0,0,0]);
    doc.setTextColor(0,0,0); doc.text(' for the hearing of the above-titled case.',px,y);
  }
  y+=KP_LH+6;

  // "This ___ day of ..." — auto-filled from today (generation date), full 4-digit year
  const issuedDt = new Date();
  const issuedDay = ordinalDay(issuedDt);
  const issuedMon = MONTHS[issuedDt.getMonth()].toUpperCase();
  const issuedYr  = String(issuedDt.getFullYear());
  px=ml;
  doc.text('This ', px, y); px+=_tw(doc,'This ');
  px=_utext(doc,issuedDay,px,y,[0,0,0]);
  doc.setTextColor(0,0,0); doc.text(' day of ', px, y); px+=_tw(doc,' day of ');
  px=_utext(doc,issuedMon,px,y,[0,0,0]);
  doc.setTextColor(0,0,0); doc.text(', ', px, y); px+=_tw(doc,', ');
  px=_utext(doc,issuedYr,px,y,[0,0,0]);
  doc.setTextColor(0,0,0); doc.text('.', px, y); y+=KP_LH+16;

  // Pangkat Chairman signature (right)
  const chairName = (d.pangkatChair||'Mrs. Maria Elvira L. Rosales').toUpperCase();
  doc.setFont(KP_FONT,'bold');
  doc.text(chairName, W-mr, y, {align:'right'});
  doc.line(W-mr-_tw(doc,chairName)-4, y+1.2, W-mr, y+1.2); y+=KP_LH;
  doc.setFont(KP_FONT,'normal');
  doc.text('Pangkat Chairman', W-mr, y, {align:'right'}); y+=KP_LH+10;

  // Secretary and Member row — right col starts right after secretary name + gap
  const secName =(d.pangkatSecretary||'').toUpperCase();
  const memName =(d.pangkatMember||'').toUpperCase();
  doc.setFont(KP_FONT,'bold');
  // Measure secretary name width to position member column snugly
  const secNameW = secName ? _tw(doc, secName) : _tw(doc, 'Pangkat Secretary');
  const labelSecW = _tw(doc, 'Pangkat Secretary');
  const leftColW = Math.max(secNameW, labelSecW); // left block takes the wider of name or label
  const memColX = ml + leftColW + 16; // 16 mm gap between the two blocks
  if(secName){ doc.text(secName, ml, y); doc.line(ml, y+1.2, ml+secNameW, y+1.2); }
  if(memName){ doc.text(memName, memColX, y); doc.line(memColX, y+1.2, memColX+_tw(doc,memName), y+1.2); }
  y+=KP_LH;
  doc.setFont(KP_FONT,'normal');
  if(secName) doc.text('Pangkat Secretary', ml, y);
  if(memName) doc.text('Pangkat Member', memColX, y); y+=KP_LH+10;

  // "Notified this" line
  const notifyMon=schedDt?MONTHS[schedDt.getMonth()].toUpperCase():'___';
  const notifyYr2=schedDt?String(schedDt.getFullYear()).slice(-2):'__';
  px=ml; doc.text('Notified this ', px, y); px+=_tw(doc,'Notified this ');
  doc.line(px, y+0.5, px+28, y+0.5); px+=30;
  doc.text(' day of  ', px, y); px+=_tw(doc,' day of  ');
  px=_utext(doc,notifyMon,px,y,[0,0,0]);
  doc.setTextColor(0,0,0); doc.text(' 20 ', px, y); px+=_tw(doc,' 20 ');
  px=_utext(doc,notifyYr2,px,y,[0,0,0]);
  doc.setTextColor(0,0,0); doc.text(' .', px, y); y+=KP_LH+12;

  // Complainant / Respondent signatory block — keep as equal half-page columns
  const colW = cw/2;
  doc.setFont(KP_FONT,'normal');
  doc.text('Complainant/s', ml, y); doc.text('Respondent/s', ml+colW+10, y); y+=KP_LH+2;
  // Draw signature lines
  const sigLineW = colW - 4;
  doc.line(ml, y, ml + sigLineW, y);
  doc.line(ml+colW+10, y, ml+colW+10+sigLineW, y);
  y += KP_LH;
  // Print names below the lines (bold, centered over each line)
  doc.setFont(KP_FONT,'bold');
  const compLines12 = doc.splitTextToSize(compName, sigLineW);
  const respLines12 = doc.splitTextToSize(respName, sigLineW);
  compLines12.forEach((ln, i) => doc.text(ln, ml + sigLineW/2, y + i*KP_LH, {align:'center'}));
  respLines12.forEach((ln, i) => doc.text(ln, ml+colW+10 + sigLineW/2, y + i*KP_LH, {align:'center'}));
}


// Generate Form 8 & 9 together — show combined print preview, then save to attachments
function kpGenerateForms(caseId, sessionDate, sessionTime){
  const {jsPDF}=window.jspdf;
  const c=state.cases.find(x=>x.id===caseId);
  if(!c){alert('Case not found.');return;}
  let schedDate = sessionDate || '';
  let schedTime = sessionTime || '';
  let chairman = c._lupanChairman||c.mediator||'HON. ABUNDIO A. LEONES';
  if(!schedDate){
    const sched = state.schedules
      .filter(s=>s._caseId===caseId||s.caseNo===c.caseNo)
      .sort((a,b)=>(b.schedDate||'').localeCompare(a.schedDate||''))[0] || null;
    schedDate = sched ? sched.schedDate : '';
    schedTime = sched ? sched.schedTime : '';
    if(sched) chairman = sched.chairman || chairman;
  }
  const data={
    caseNo: c.caseNo, dateFiled: c.dateFiled||'', timeFiled: c.timeFiled||'',
    complainant: c.complainant||'', complainantAddress: c.complainantAddress||'',
    respondent: c.respondent||'', respondentAddress: c.respondentAddress||'',
    caseTitle: c.caseTitle||c.type||'', schedDate, schedTime, chairman,
    officer: 'RAMIL  ROSALES'
  };

  // Build Form 8
  const doc8=new jsPDF({unit:'mm',format:'a4'});
  _fillKpForm8(doc8,data);
  const uri8=doc8.output('datauristring');

  // Build Form 9 (with Page 2 — Officer's Return)
  const doc9=new jsPDF({unit:'mm',format:'a4'});
  _fillKpForm9(doc9,data);
  doc9.addPage();
  _fillKpForm9Page2(doc9,data);
  const uri9=doc9.output('datauristring');

  // Save to attachments immediately
  if(!c.attachments) c.attachments=[];
  const nowShort = new Date().toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'});
  const sessionTag = schedDate ? ` [${schedDate}]` : '';
  c.attachments = c.attachments.filter(a=>!(a._generated && a._sessionDate===schedDate && /Form 8|Form 9/i.test(a.name)));
  const idx8 = c.attachments.length;
  c.attachments.push({name:`Form 8 – Notice of Hearing${sessionTag} (${nowShort})`, dataUrl:uri8, size:0, _generated:true, _sessionDate:schedDate});
  c.attachments.push({name:`Form 9 – Summons${sessionTag} (${nowShort})`, dataUrl:uri9, size:0, _generated:true, _sessionDate:schedDate});
  saveData('ltia_cases', state.cases);

  // Show toast and open attachment viewer directly on the Form 8 row
  showToast('Forms 8 & 9 saved to Attachments!', 'success', 3000);
  // If on case detail page, refresh first then open viewer
  if(state.viewCasePage===caseId){
    render();
    setTimeout(()=>viewAttachments(caseId, idx8), 80);
  } else {
    viewAttachments(caseId, idx8);
  }
}

function kpfpSwitchTab(tab){
  const f8=document.getElementById('kpfp-frame8');
  const f9=document.getElementById('kpfp-frame9');
  const t8=document.getElementById('kpfp-tab8');
  const t9=document.getElementById('kpfp-tab9');
  if(!f8||!f9||!t8||!t9) return;
  if(tab==='8'){
    f8.style.display='block'; f9.style.display='none';
    t8.style.borderBottom='3px solid #0d3d3a'; t8.style.color='#0d3d3a'; t8.style.fontWeight='700';
    t9.style.borderBottom='3px solid transparent'; t9.style.color='#6b7280'; t9.style.fontWeight='600';
  } else {
    f8.style.display='none'; f9.style.display='block';
    t9.style.borderBottom='3px solid #0d3d3a'; t9.style.color='#0d3d3a'; t9.style.fontWeight='700';
    t8.style.borderBottom='3px solid transparent'; t8.style.color='#6b7280'; t8.style.fontWeight='600';
  }
}

function kpfpPrintAndSave(caseId){
  const d = window._kpfpData;
  if(!d) return;

  // Print current visible frame
  const f8=document.getElementById('kpfp-frame8');
  const f9=document.getElementById('kpfp-frame9');
  const activeFrame = (f8&&f8.style.display!=='none') ? f8 : f9;
  if(activeFrame){
    try{ activeFrame.contentWindow.print(); }
    catch(e){ window.open(activeFrame.src,'_blank'); }
  }

  // Close preview and refresh case page
  document.getElementById('kp-forms-preview-modal').remove();
  showToast('Forms saved to Attachments!', 'success', 3000);
  state.viewCasePage = caseId;
  render();
}

function showKpForms(schedId,returnCaseId){
  const s=state.schedules.find(x=>x.id===schedId);
  if(s){
    document.getElementById('view-case-modal-root')&&document.getElementById('view-case-modal-root').remove();
    state.kpFormsReturnCaseId=returnCaseId||null;
    state.kpFormsData=s;
    render();
    setTimeout(()=>kpShowPreview('form7'),120);
  }
}

// ─── SEARCH ──────────────────────────────────────────────────────────────────
function renderSearch() {
  const q=state.searchQuery.toLowerCase();
  const cR=state.cases.filter(c=>JSON.stringify(c).toLowerCase().includes(q));
  return `
  <div class="page-header">
    <div><div class="page-title">Search Results</div><div class="page-sub">${cR.length} complaint(s) found for "${escHtml(state.searchQuery)}"</div></div>
  </div>
  <div class="card">
    ${!cR.length?`<div class="empty">No results for "${escHtml(state.searchQuery)}"</div>`:''}
    ${cR.map(c=>{
      const clickFn = c._archive ? `viewArchiveCase('${c.id}')` : `viewCase('${c.id}')`;
      const tagBg   = c._archive ? '#e8f0fe' : '#eaf6e8';
      const tagColor= c._archive ? '#1d4ed8' : '#0d3d3a';
      const tagLabel= c._archive ? 'Archived' : 'Case';
      const nature  = escHtml(c.nature||c.type||'');
      const title   = escHtml(c.caseTitle||'');
      return `<div class="result-item" onclick="${clickFn}" style="display:flex;align-items:flex-start;gap:14px">
        <div style="flex-shrink:0;margin-top:2px">
          <span class="result-tag" style="background:${tagBg};color:${tagColor}">${tagLabel}</span>
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span class="result-main" style="margin:0">${escHtml(c.caseNo||'—')}</span>
            ${title?`<span style="font-size:12px;color:var(--text2)">·</span><span style="font-size:12px;color:var(--text2)">${title}</span>`:''}
            ${nature?`<span style="font-size:12px;color:var(--text2)">·</span><span style="font-size:12px;color:var(--text2)">${nature}</span>`:''}
          </div>
          <div class="result-sub" style="margin-top:3px">${escHtml((c.complainant||'—').toUpperCase())} <span style="color:var(--text3)">vs</span> ${escHtml((c.respondent||'—').toUpperCase())}</div>
          <div style="margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            ${statusBadge(c.status)}
            ${c.dateFiled?`<span style="font-size:11px;color:var(--text3)">Filed: ${escHtml(fmtDateWords(c.dateFiled))}</span>`:''}
          </div>
        </div>
        <div style="flex-shrink:0;font-size:12px;color:var(--text3);margin-top:2px">View →</div>
      </div>`;
    }).join('')}
  </div>`;
}

// ─── CASE WIZARD ─────────────────────────────────────────────────────────────
function openWizard(editId) {
  let data={};
  if(editId){
    const c=state.cases.find(x=>x.id===editId); if(c)data={...c};
  } else {
    // For new complaints: only restore case reference fields from draft (caseNo, dateFiled, timeFiled)
    // Party/name fields are always blank so each new complaint starts fresh
    let draftRef={};
    try{const dr=localStorage.getItem(_k('ltia_draft'));if(dr){const parsed=JSON.parse(dr);draftRef={caseNo:parsed.caseNo,dateFiled:parsed.dateFiled,timeFiled:parsed.timeFiled};}}catch(e){}
    data.caseNo=draftRef.caseNo||genCaseNo();
    data.dateFiled=draftRef.dateFiled||todayStr();
    // Auto-fill current time for new complaints
    const now=new Date();
    data.timeFiled=draftRef.timeFiled||`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    // Party fields always blank for new complaint
    data.complainantName=''; data.complainantContact=''; data.complainantAddress='';
    data.respondentName=''; data.respondentContact=''; data.respondentAddress='';
  }
  state.wizard={step:1,editId:editId||null,data};
  render();
}
function closeWizard(){
  if(state.wizard&&!state.wizard.editId){
    const d=state.wizard.data;
    if(d.caseNo||d.complainantName) saveData('ltia_draft',d);
  }
  const returnId=state.wizard&&state.wizard._fromViewCase||null;
  state.wizard=null;
  if(returnId){
    state.viewCasePage=returnId;
  }
  render();
}
function openWizardFromView(editId){
  let data={};
  const c=state.cases.find(x=>x.id===editId); if(c)data={...c};
  state.wizard={step:1,editId:editId||null,data,_fromViewCase:editId};
  state.viewCasePage=null;
  render();
}
function wizBack(){state.wizard.step--;state.calPopup=null;render();}
function wizAutoSave(){
  if(!state.wizard||state.wizard.editId) return;
  const d=state.wizard.data;
  d.caseNo=g('w_caseNo')||d.caseNo; d.dateFiled=g('w_dateFiled')||d.dateFiled; d.timeFiled=g('w_timeFiled')||d.timeFiled;
  d.complainantName=g('w_cName')||d.complainantName; d.complainantContact=g('w_cContact')||d.complainantContact;
  d.complainantAddress=g('w_cAddress')||d.complainantAddress;
  d.respondentName=g('w_rName')||d.respondentName; d.respondentContact=g('w_rContact')||d.respondentContact;
  d.respondentAddress=g('w_rAddress')||d.respondentAddress;
  saveData('ltia_draft',d);
  const ind=document.getElementById('wiz-autosave-ind');
  if(ind){ind.textContent='✓ Draft saved';ind.style.opacity='1';setTimeout(()=>{ind.style.opacity='0';},1500);}
}
function clearDraft(){try{localStorage.removeItem(_k('ltia_draft'));}catch(e){}state.wizard.data={caseNo:genCaseNo(),dateFiled:todayStr()};render();}

function openWizardStep2(editId){
  // Open the wizard directly at step 2 (Case Details) for quick status change
  let data={};
  const existing=state.cases.find(x=>x.id===editId);
  if(existing) data={...existing};
  state.wizard={step:2, editId:editId, data};
  state.calPopup=null;
  render();
}
function wizCollectCurrentStep(){
  const w=state.wizard; if(!w)return;
  if(w.step===1){
    w.data.caseNo=g('w_caseNo')||w.data.caseNo;
    w.data.dateFiled=g('w_dateFiled')||w.data.dateFiled;
    w.data.timeFiled=g('w_timeFiled')||w.data.timeFiled;
    w.data.complainantName=g('w_cName')||w.data.complainantName;
    w.data.complainantContact=g('w_cContact')||w.data.complainantContact;
    w.data.complainantAddress=g('w_cAddress')||w.data.complainantAddress;
    w.data.respondentName=g('w_rName')||w.data.respondentName;
    w.data.respondentContact=g('w_rContact')||w.data.respondentContact;
    w.data.respondentAddress=g('w_rAddress')||w.data.respondentAddress;
  } else if(w.step===2){
    w.data.caseTitle=g('w_caseTitle')||w.data.caseTitle;
    w.data.nature=g('w_nature')||w.data.nature;
    w.data.actionTaken=g('w_actionTaken')||w.data.actionTaken;
    w.data.dateConfrontation=g('w_dateConfront')||w.data.dateConfrontation;
    w.data.dateResolved=g('w_dateResolved')||w.data.dateResolved;
    w.data.status=g('w_status')||w.data.status;
    w.data.mediator=g('w_mediator')||w.data.mediator;
    w.data.remarks=g('w_remarks')||w.data.remarks;
  }
}
function wizGoToStep(n){
  const w=state.wizard; if(!w)return;
  if(n===w.step)return;
  // validate step 1 min requirement before leaving
  if(w.step===1&&n>1){
    wizCollectCurrentStep();
    if(!w.data.caseNo){alert('Case Number is required.');return;}
  } else {
    wizCollectCurrentStep();
  }
  w.step=n;
  state.calPopup=null;
  render();
}
function wizNext() {
  const w=state.wizard;
  if(w.step===1){
    w.data.caseNo=g('w_caseNo'); w.data.dateFiled=g('w_dateFiled'); w.data.timeFiled=g('w_timeFiled');
    w.data.complainantName=g('w_cName'); w.data.complainantContact=g('w_cContact');
    w.data.complainantAddress=g('w_cAddress');
    w.data.respondentName=g('w_rName'); w.data.respondentContact=g('w_rContact');
    w.data.respondentAddress=g('w_rAddress');
    if(!w.data.caseNo){alert('Case Number is required.');return;}
    saveData('ltia_draft',w.data); w.step=2;
  } else if(w.step===2){
    w.data.caseTitle=g('w_caseTitle'); w.data.nature=g('w_nature');
    w.data.actionTaken=g('w_actionTaken');
    w.data.dateConfrontation=g('w_dateConfront'); w.data.dateResolved=g('w_dateResolved');
    w.data.status=g('w_status'); w.data.mediator=g('w_mediator');
    w.data.remarks=g('w_remarks');
    if(w.data.status==='Settled'&&!w.data.dateResolved) w.data.dateResolved=todayStr();
    saveData('ltia_draft',w.data);
    // If status is Settled, show upload reminder before proceeding
    if(w.data.status==='Settled'){
      showSettledUploadReminder(()=>{w.step=3;render();});
      return;
    }
    w.step=3;
  } else if(w.step===3){
    const d=w.data;
    const rec={
      id:w.editId||genId(),
      caseNo:d.caseNo, dateFiled:d.dateFiled, timeFiled:d.timeFiled,
      complainant:d.complainantName, complainantContact:d.complainantContact, complainantAddress:d.complainantAddress,
      respondent:d.respondentName, respondentContact:d.respondentContact, respondentAddress:d.respondentAddress,
      caseTitle:d.caseTitle, nature:d.nature,
      type:d.nature||d.type, actionTaken:d.actionTaken,
      dateConfrontation:d.dateConfrontation, dateResolved:d.dateResolved,
      status:d.status||'Ongoing', mediator:d.mediator,
      remarks:d.remarks,
      attachments:d.attachments||[]
    };
    if(w.editId){const i=state.cases.findIndex(x=>x.id===w.editId);if(i>-1)state.cases[i]=rec;}
    else state.cases.push(rec);
    saveData('ltia_cases',state.cases);
    try{localStorage.removeItem(_k('ltia_draft'));}catch(e){}
    const isEdit=!!w.editId;
    const returnId=w._fromViewCase||rec.id||null;
    state.wizard=null;
    if(returnId){ state.viewCasePage=returnId; }
    render();
    showToast(isEdit?'Complaint updated successfully!':'New complaint saved successfully!','success');
    return;
  }
  render();
}

function openManageModal(type){
  // type: 'caseTitle' or 'actionTaken'
  const existing=document.getElementById('manage-opts-modal-root');
  if(existing)existing.remove();
  const isTitle=type==='caseTitle';
  const title=isTitle?'Manage Case Titles':'Manage Action Taken';
  const items=isTitle?getCaseTitles():getActionTaken();
  const defaults=isTitle?DEFAULT_CASE_TITLES:DEFAULT_ACTION_TAKEN;
  const selectId=isTitle?'w_caseTitle':'w_actionTaken';
  const selectedVal=(document.getElementById(selectId)||{}).value||'';

  function renderList(){
    const list=isTitle?getCaseTitles():getActionTaken();
    const listEl=document.getElementById('mopt-list');
    if(!listEl)return;
    listEl.innerHTML=list.map(item=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;gap:8px">
        <div style="display:flex;align-items:center;gap:7px;flex:1;min-width:0">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1" title="${escHtml(item)}">${escHtml(item)}</span>
          ${defaults.includes(item)?`<span style="flex-shrink:0;font-size:10px;font-weight:600;padding:2px 7px;background:#f0f2f5;color:#9ba3ae;border-radius:10px">default</span>`:''}
        </div>
        ${defaults.includes(item)?'':`<button type="button" onclick="moptRemove('${escHtml(item).replace(/'/g,"\\'")}')" style="flex-shrink:0;padding:4px 10px;background:#fff5f5;color:#c0392b;border:1px solid #fbbaba;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:background 0.15s" onmouseover="this.style.background='#ffe0e0'" onmouseout="this.style.background='#fff5f5'">✕ Remove</button>`}
      </div>
    `).join('');
  }

  window._manageModalType=type;
  window.moptRemove=function(val){
    const def=isTitle?DEFAULT_CASE_TITLES:DEFAULT_ACTION_TAKEN;
    if(def.includes(val)){showToast('Default items cannot be removed.','warning');return;}
    // Show inline confirm within the modal
    const confirmBanner=document.getElementById('mopt-confirm-banner');
    if(confirmBanner){
      confirmBanner.style.display='flex';
      confirmBanner.querySelector('.mopt-confirm-msg').textContent=`Remove "${val}"?`;
      confirmBanner._pendingVal=val;
    }
  };
  window.moptConfirmRemove=function(){
    const banner=document.getElementById('mopt-confirm-banner');
    if(!banner)return;
    const val=banner._pendingVal;
    banner.style.display='none';
    if(isTitle){
      let titles=getCaseTitles().filter(t=>t!==val);
      saveCaseTitles(titles);
      if(state.wizard&&state.wizard.data.caseTitle===val){state.wizard.data.caseTitle='';}
    } else {
      let actions=getActionTaken().filter(a=>a!==val);
      saveActionTaken(actions);
      if(state.wizard&&state.wizard.data.actionTaken===val){state.wizard.data.actionTaken='';}
    }
    renderList();
    // Refresh the dropdown in the wizard
    _refreshWizDropdowns();
    showManageModalSuccess(`"${val}" removed successfully.`);
  };
  window.moptCancelRemove=function(){
    const banner=document.getElementById('mopt-confirm-banner');
    if(banner)banner.style.display='none';
  };
  window.moptAdd=function(){
    const inp=document.getElementById('mopt-new-input');
    const val=(inp&&inp.value)||'';
    if(!val.trim()){inp&&(inp.style.borderColor='#e74c3c');setTimeout(()=>{if(inp)inp.style.borderColor='#ddd';},1500);return;}
    const existing2=isTitle?getCaseTitles():getActionTaken();
    if(existing2.map(x=>x.toLowerCase()).includes(val.trim().toLowerCase())){
      showToast('This item already exists.','warning');return;
    }
    if(isTitle){const t=[...existing2,val.trim()];saveCaseTitles(t);}
    else{const a=[...existing2,val.trim()];saveActionTaken(a);}
    if(state.wizard){
      if(isTitle)state.wizard.data.caseTitle=val.trim();
      else state.wizard.data.actionTaken=val.trim();
    }
    inp.value='';
    renderList();
    _refreshWizDropdowns();
    showManageModalSuccess(`"${val.trim()}" added successfully.`);
  };

  function showManageModalSuccess(msg){
    const s=document.getElementById('mopt-success-banner');
    if(!s)return;
    s.textContent='✅ '+msg;
    s.style.display='block';
    s.style.opacity='1';
    setTimeout(()=>{s.style.opacity='0';setTimeout(()=>{s.style.display='none';s.style.opacity='1';},350);},2200);
  }

  const html=`<div id="manage-opts-modal-root" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:600;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this){document.getElementById('manage-opts-modal-root').remove();}">
    <div style="background:#fff;border-radius:14px;width:440px;max-width:96vw;max-height:90vh;box-shadow:0 16px 50px rgba(0,0,0,0.22);display:flex;flex-direction:column;overflow:hidden;position:relative">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #f0f0f0;flex-shrink:0">
        <div>
          <div style="font-size:15px;font-weight:700;color:#0d2137">${title}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px">Add or remove ${isTitle?'case title':'action taken'} options</div>
        </div>
        <button onclick="document.getElementById('manage-opts-modal-root').remove()" style="border:none;background:#f0f2f5;font-size:17px;cursor:pointer;color:#6b7280;line-height:1;padding:5px 10px;border-radius:8px;font-weight:700;transition:all 0.15s" onmouseover="this.style.background='#e5e7eb';this.style.color='#1a1a1a'" onmouseout="this.style.background='#f0f2f5';this.style.color='#6b7280'">✕</button>
      </div>
      <!-- Success banner -->
      <div id="mopt-success-banner" style="display:none;margin:10px 16px 0;padding:9px 14px;background:#eaf6e8;border:1px solid #b7dfb8;border-radius:8px;font-size:13px;font-weight:600;color:#0d3d3a;transition:opacity 0.35s"></div>
      <!-- Confirm overlay (centered in modal) -->
      <div id="mopt-confirm-banner" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,0.38);z-index:10;align-items:center;justify-content:center;border-radius:14px">
        <div style="background:#fff;border-radius:12px;width:320px;max-width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.22);padding:22px 22px 18px;text-align:center">
          <div style="font-size:26px;margin-bottom:10px">⚠️</div>
          <div style="font-size:14px;font-weight:700;color:#0d2137;margin-bottom:6px">Confirm Removal</div>
          <div class="mopt-confirm-msg" style="font-size:13px;color:#5c6370;line-height:1.5;margin-bottom:18px"></div>
          <div style="display:flex;gap:10px;justify-content:center">
            <button onclick="moptCancelRemove()" style="padding:8px 20px;background:#fff;color:#6b7280;border:1px solid #ddd;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer">Cancel</button>
            <button onclick="moptConfirmRemove()" style="padding:8px 20px;background:#c0392b;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Remove</button>
          </div>
        </div>
      </div>
      <!-- Body -->
      <div style="padding:14px 16px;flex:1;overflow-y:auto">
        <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Current Options</div>
        <div id="mopt-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px"></div>
        <!-- Add new -->
        <div style="background:#f8fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px">
          <div style="font-size:11px;font-weight:700;color:#14919b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">＋ Add New Option</div>
          <div style="display:flex;gap:8px">
            <input type="text" id="mopt-new-input" placeholder="Enter ${isTitle?'case title':'action taken'}..." style="flex:1;padding:8px 11px;border:1px solid #ddd;border-radius:8px;font-size:13px;outline:none;transition:border-color 0.15s" onfocus="this.style.borderColor='#14919b'" onblur="this.style.borderColor='#ddd'" onkeydown="if(event.key==='Enter')moptAdd()">
            <button type="button" onclick="moptAdd()" style="padding:8px 18px;background:#14919b;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background 0.15s" onmouseover="this.style.background='#077a7d'" onmouseout="this.style.background='#14919b'">Add</button>
          </div>
        </div>
      </div>
      <!-- Footer -->
      <div style="padding:12px 16px;border-top:1px solid #f0f0f0;display:flex;justify-content:flex-end;background:#f9fafb;flex-shrink:0">
        <button onclick="document.getElementById('manage-opts-modal-root').remove()" style="padding:8px 22px;border-radius:8px;background:#0d3d3a;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer">Done</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html);
  renderList();
  setTimeout(()=>{const inp=document.getElementById('mopt-new-input');if(inp)inp.focus();},100);
}

function _refreshWizDropdowns(){
  // Refresh caseTitle and actionTaken selects in the wizard without full re-render
  const ctSel=document.getElementById('w_caseTitle');
  const atSel=document.getElementById('w_actionTaken');
  if(ctSel){
    const curVal=ctSel.value;
    const titles=getCaseTitles();
    ctSel.innerHTML=`<option value="">Select...</option>`+titles.map(t=>`<option value="${escHtml(t)}"${t===curVal?' selected':''}>${escHtml(t)}</option>`).join('');
    if(state.wizard&&state.wizard.data.caseTitle)ctSel.value=state.wizard.data.caseTitle;
  }
  if(atSel){
    const curVal=atSel.value;
    const actions=getActionTaken();
    atSel.innerHTML=`<option value="">Select...</option>`+actions.map(a=>`<option value="${escHtml(a)}"${a===curVal?' selected':''}>${escHtml(a)}</option>`).join('');
    if(state.wizard&&state.wizard.data.actionTaken)atSel.value=state.wizard.data.actionTaken;
  }
}

function addCustomCaseTitleSched(){
  const val=prompt('Enter new case title:');
  if(!val||!val.trim())return;
  const titles=getCaseTitles();
  if(titles.includes(val.trim())){alert('This case title already exists.');return;}
  titles.push(val.trim());
  saveCaseTitles(titles);
  if(state.schedWizard)state.schedWizard.data.caseTitle=val.trim();
  render();
  setTimeout(()=>{const el=document.getElementById('sw_caseTitle');if(el)el.value=val.trim();},0);
}
function addCustomCaseTitle(){
  // Legacy: open modal instead
  _wizSaveStep2Inputs();
  openManageModal('caseTitle');
}
function removeCustomCaseTitle(titleVal){
  const DEFAULT=DEFAULT_CASE_TITLES;
  if(DEFAULT.includes(titleVal)){showToast('Default case titles cannot be removed.','warning');return;}
  _wizSaveStep2Inputs();
  const current=state.wizard&&state.wizard.data.caseTitle;
  let titles=getCaseTitles().filter(t=>t!==titleVal);
  saveCaseTitles(titles);
  if(state.wizard&&current===titleVal)state.wizard.data.caseTitle='';
  render();
  showToast(`"${titleVal}" removed.`,'success');
}
function addCustomActionTaken(){
  // Legacy: open modal instead
  _wizSaveStep2Inputs();
  openManageModal('actionTaken');
}
function removeCustomActionTaken(actionVal){
  const DEFAULT=DEFAULT_ACTION_TAKEN;
  if(DEFAULT.includes(actionVal)){showToast('Default action taken cannot be removed.','warning');return;}
  _wizSaveStep2Inputs();
  const current=state.wizard&&state.wizard.data.actionTaken;
  let actions=getActionTaken().filter(a=>a!==actionVal);
  saveActionTaken(actions);
  if(state.wizard&&current===actionVal)state.wizard.data.actionTaken='';
  render();
  showToast(`"${actionVal}" removed.`,'success');
}
function _wizSaveStep2Inputs(){
  // Persist all step-2 form field values into state before any re-render
  if(!state.wizard||state.wizard.step!==2)return;
  const d=state.wizard.data;
  const gv=id=>{const el=document.getElementById(id);return el?el.value:'';};
  d.caseTitle    = gv('w_caseTitle')    || d.caseTitle;
  d.nature       = gv('w_nature')       || d.nature;
  d.status       = gv('w_status')       || d.status;
  d.actionTaken  = gv('w_actionTaken')  || d.actionTaken;
  d.dateConfrontation = gv('w_dateConfront')  || d.dateConfrontation;
  d.dateResolved = gv('w_dateResolved') || d.dateResolved;
  d.mediator     = gv('w_mediator')     || d.mediator;
  d.remarks      = gv('w_remarks')      || d.remarks;
}
function handleWizFileUpload(input){
  if(!input.files||!input.files.length)return;
  _wizSaveStep2Inputs();
  const atts=state.wizard.data.attachments||[];
  const nonPdf=Array.from(input.files).filter(f=>!f.name.match(/\.pdf$/i));
  if(nonPdf.length){showToast('Only PDF files are allowed. Please upload PDF files only.','error',4000);input.value='';return;}
  let loaded=0;
  const total=input.files.length;
  Array.from(input.files).forEach(f=>{
    const reader=new FileReader();
    reader.onload=e=>{
      atts.push({name:f.name,size:f.size,dataUrl:e.target.result});
      state.wizard.data.attachments=[...atts];
      loaded++;
      if(loaded===total){
        render();
        showToast(`${total} file${total>1?'s':''} uploaded successfully!`,'success');
      }
    };
    reader.onerror=()=>{showToast('Failed to read file. Please try again.','error');};
    reader.readAsDataURL(f);
  });
}
function removeWizAttachment(idx){
  if(!state.wizard)return;
  _wizSaveStep2Inputs();
  const atts=state.wizard.data.attachments||[];
  atts.splice(idx,1);
  state.wizard.data.attachments=[...atts];
  render();
}

function showSettledUploadReminder(onContinue){
  const existing=document.getElementById('settled-reminder-root');
  if(existing)existing.remove();
  window._settledReminderCb=onContinue;
  window._settledReminderFiles=[];
  function closeReminder(){document.getElementById('settled-reminder-root').remove();}
  function refreshFileList(){
    const files=window._settledReminderFiles||[];
    const listEl=document.getElementById('srem-file-list');
    if(!listEl)return;
    if(!files.length){listEl.innerHTML=`<div style="text-align:center;color:#9ba3ae;font-size:12px;padding:12px 0">No files added yet</div>`;return;}
    listEl.innerHTML=files.map((f,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:#e8f6f7;border:1px solid #b2dfe2;border-radius:7px;margin-bottom:6px">
      <span style="font-size:16px">📄</span>
      <span style="flex:1;font-size:12px;font-weight:600;color:#0d3d3a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.name}</span>
      <span style="font-size:11px;color:#888">${Math.round(f.size/1024)} KB</span>
      <button onclick="window._settledReminderFiles.splice(${i},1);refreshSremFileList()" style="border:none;background:none;color:#c0392b;cursor:pointer;font-size:16px;line-height:1;padding:0 2px">×</button>
    </div>`).join('');
  }
  window.refreshSremFileList=refreshFileList;
  window.sremHandleUpload=function(input){
    if(!input.files||!input.files.length)return;
    const nonPdf=Array.from(input.files).filter(f=>!f.name.match(/\.pdf$/i));
    if(nonPdf.length){showToast('Only PDF files are allowed.','error',3500);input.value='';return;}
    const files=window._settledReminderFiles||[];
    let loaded=0;const total=input.files.length;
    Array.from(input.files).forEach(f=>{
      const reader=new FileReader();
      reader.onload=e=>{files.push({name:f.name,size:f.size,dataUrl:e.target.result});window._settledReminderFiles=files;loaded++;if(loaded===total){refreshFileList();showToast(`${total} file${total>1?'s':''} added!`,'success');}};
      reader.readAsDataURL(f);
    });
    input.value='';
  };
  window.sremContinue=function(){
    // Attach uploaded files into wizard data
    if(!state.wizard)return;
    const atts=state.wizard.data.attachments||[];
    (window._settledReminderFiles||[]).forEach(f=>atts.push(f));
    state.wizard.data.attachments=atts;
    document.getElementById('settled-reminder-root').remove();
    window._settledReminderCb&&window._settledReminderCb();
  };
  const html=`<div id="settled-reminder-root" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:600;display:flex;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:16px;width:480px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);display:flex;flex-direction:column;overflow:hidden">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0d3d3a,#2d4f7c);padding:18px 22px;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">✅</div>
          <div>
            <div style="font-size:15px;font-weight:700;color:#fff">Case Marked as Settled</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.65);margin-top:2px">Please upload the KP Forms before saving</div>
          </div>
        </div>
        <button onclick="document.getElementById('settled-reminder-root').remove()" style="border:none;background:rgba(255,255,255,0.15);color:#fff;font-size:22px;cursor:pointer;line-height:1;padding:2px 9px;border-radius:7px;transition:background 0.15s" onmouseover="this.style.background='rgba(255,255,255,0.28)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">×</button>
      </div>
      <!-- Body -->
      <div style="padding:20px 22px">
        <!-- Warning notice -->
        <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:9px;padding:12px 14px;margin-bottom:16px;display:flex;gap:9px;align-items:flex-start">
          <span style="font-size:18px;flex-shrink:0">⚠️</span>
          <div style="font-size:13px;color:#7c5c00;line-height:1.55">
            <strong>Reminder:</strong> For settled cases, please upload the required KP Forms and other supporting documents as PDF.
          </div>
        </div>
        <!-- Upload zone -->
        <div style="border:2px dashed #6dd4da;border-radius:10px;padding:18px 16px;background:#e8f6f7;cursor:pointer;text-align:center;margin-bottom:12px" onclick="document.getElementById('srem-file-input').click()">
          <input type="file" id="srem-file-input" multiple accept=".pdf" style="display:none" onchange="sremHandleUpload(this)">
          <div style="font-size:28px;margin-bottom:6px">📎</div>
          <div style="font-size:13px;font-weight:600;color:#0d3d3a">Click to upload KP Forms</div>
          <div style="font-size:11px;color:#6b7280;margin-top:3px">PDF files only · You can select multiple files</div>
        </div>
        <!-- File list -->
        <div id="srem-file-list" style="max-height:140px;overflow-y:auto">
          <div style="text-align:center;color:#9ba3ae;font-size:12px;padding:12px 0">No files added yet</div>
        </div>
      </div>
      <!-- Footer -->
      <div style="padding:14px 22px;border-top:1px solid #eee;display:flex;gap:10px;justify-content:flex-end;background:#f9fafb">
        <button onclick="document.getElementById('settled-reminder-root').remove()" style="padding:8px 18px;border-radius:8px;background:#fff;border:1px solid #ddd;font-size:13px;font-weight:500;cursor:pointer;color:#6b7280">← Go Back</button>
        <button onclick="sremContinue()" style="padding:8px 20px;border-radius:8px;background:#2d7a3a;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer">✓ Save &amp; Continue</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}

function renderWizard() {
  const w=state.wizard; if(!w) return '';
  const {step,data}=w;
  const sc=(n)=>step===n?'active':step>n?'done':'';
  const sl=(n)=>step===n?' active':'';
  const stepCursor=(n)=>step===n?'default':'pointer';
  const stepper=`<div class="stepper">
    <div class="step-item" onclick="wizGoToStep(1)" style="cursor:${stepCursor(1)}" title="Complaint Info & Parties"><div class="step-circle ${sc(1)}">${step>1?'✓':'1'}</div><div class="step-lbl${sl(1)}">Complaint Info &amp;<br>Parties</div></div>
    <div class="step-line${step>1?' done':''}"></div>
    <div class="step-item" onclick="wizGoToStep(2)" style="cursor:${stepCursor(2)}" title="Case Details"><div class="step-circle ${sc(2)}">${step>2?'✓':'2'}</div><div class="step-lbl${sl(2)}">Case<br>Details</div></div>
    <div class="step-line${step>2?' done':''}"></div>
    <div class="step-item" onclick="wizGoToStep(3)" style="cursor:${stepCursor(3)}" title="Confirmation"><div class="step-circle ${sc(3)}">3</div><div class="step-lbl${sl(3)}">Confirmation</div></div>
  </div>`;
  let body='';
  if(step===1){
    const hasDraft=!w.editId&&(data.complainantName||data.respondentName);
    body=`
    ${hasDraft?`<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#fff8e1;border:1px solid #ffe082;border-radius:8px;margin-bottom:12px;font-size:12px;color:#7c5c00">
      <span>💾</span><span><strong>Draft restored</strong> — your previous unsaved progress has been loaded.</span>
      <button onclick="clearDraft()" style="margin-left:auto;border:none;background:none;color:#0d3d3a;cursor:pointer;font-size:12px">✕ Clear</button>
    </div>`:''}
    <div class="wiz-section">
      <div class="wiz-sec-title">Case Reference</div>
      <div class="wiz-row">
        <div class="wiz-group"><label class="wiz-lbl">Case Number</label><input class="wiz-input" id="w_caseNo" value="${escHtml(data.caseNo||'')}" oninput="wizAutoSave()"></div>
        <div class="wiz-group"><label class="wiz-lbl">Date Filed</label><input type="date" class="wiz-input" id="w_dateFiled" value="${escHtml(data.dateFiled||'')}" oninput="wizAutoSave();wizSyncCaseNoFromDate()"></div>
      </div>
      <div class="wiz-row">
        <div class="wiz-group"><label class="wiz-lbl">Time Filed</label><input type="time" class="wiz-input" id="w_timeFiled" value="${escHtml(data.timeFiled||'')}" oninput="wizAutoSave()"></div>
        <div class="wiz-group"></div>
      </div>
    </div>
    <div class="wiz-section">
      <div class="wiz-sec-title">Parties Involved</div>
      <div class="wiz-party">
        <div class="party-badge"><div class="party-avatar c">C</div><span class="party-tag c">Complainant</span></div>
        <div class="wiz-row">
          <div class="wiz-group"><label class="wiz-lbl">Full Name</label><input class="wiz-input" id="w_cName" value="${escHtml(data.complainantName||data.complainant||'')}" placeholder="e.g Juan Dela Cruz" oninput="this.value=this.value.toUpperCase();wizAutoSave()" style="text-transform:uppercase"></div>
          <div class="wiz-group"><label class="wiz-lbl">Contact No.</label><input class="wiz-input" id="w_cContact" value="${escHtml(data.complainantContact||'')}" placeholder="e.g 09XXXXXXXXX" oninput="wizAutoSave()"></div>
        </div>
        <div class="wiz-group"><label class="wiz-lbl">Address</label><input class="wiz-input" id="w_cAddress" value="${escHtml(data.complainantAddress||'')}" placeholder="Block, Lot, Street, Barangay" oninput="wizAutoSave()"></div>
      </div>
      <div class="wiz-party">
        <div class="party-badge"><div class="party-avatar r">R</div><span class="party-tag r">Respondent</span></div>
        <div class="wiz-row">
          <div class="wiz-group"><label class="wiz-lbl">Full Name</label><input class="wiz-input" id="w_rName" value="${escHtml(data.respondentName||data.respondent||'')}" placeholder="e.g Juan Dela Cruz" oninput="this.value=this.value.toUpperCase();wizAutoSave()" style="text-transform:uppercase"></div>
          <div class="wiz-group"><label class="wiz-lbl">Contact No.</label><input class="wiz-input" id="w_rContact" value="${escHtml(data.respondentContact||'')}" placeholder="e.g 09XXXXXXXXX" oninput="wizAutoSave()"></div>
        </div>
        <div class="wiz-group"><label class="wiz-lbl">Address</label><input class="wiz-input" id="w_rAddress" value="${escHtml(data.respondentAddress||'')}" placeholder="Block, Lot, Street, Barangay" oninput="wizAutoSave()"></div>
      </div>
    </div>`;
  } else if(step===2){
    const caseTitles=getCaseTitles();
    const actionTakenOpts=getActionTaken();
    body=`
    <div class="wiz-section">
      <div class="wiz-sec-title">Case Details</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div class="wiz-group">
          <label class="wiz-lbl">Case Title</label>
          <div style="display:flex;align-items:center;gap:6px">
            <select class="wiz-input" id="w_caseTitle" style="flex:1">
              <option value="">Select...</option>
              ${caseTitles.map(t=>`<option value="${escHtml(t)}"${data.caseTitle===t?' selected':''}>${escHtml(t)}</option>`).join('')}
            </select>
            <button type="button" onclick="_wizSaveStep2Inputs();openManageModal('caseTitle')" title="Manage Case Titles" style="flex-shrink:0;width:34px;height:34px;border:1px solid #ddd;border-radius:8px;background:#f8fafb;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;padding:0" onmouseover="this.style.background='#e5e7eb';this.style.borderColor='#999'" onmouseout="this.style.background='#f8fafb';this.style.borderColor='#ddd'">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="3" r="1.5" fill="#6b7280"/>
                <circle cx="8" cy="8" r="1.5" fill="#6b7280"/>
                <circle cx="8" cy="13" r="1.5" fill="#6b7280"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="wiz-group"><label class="wiz-lbl">Nature of Case</label>
          <select class="wiz-input" id="w_nature"><option value="">Select...</option>${NATURE_OF_CASE.map(n=>`<option value="${n}"${data.nature===n?' selected':''}>${n}</option>`).join('')}</select>
        </div>
        <div class="wiz-group"><label class="wiz-lbl">Status</label>
          <select class="wiz-input" id="w_status"><option value="">Select...</option>
            ${CASE_STATUSES.map(s=>`<option value="${s}"${data.status===s?' selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="wiz-group">
          <label class="wiz-lbl">Action Taken</label>
          <div style="display:flex;align-items:center;gap:6px">
            <select class="wiz-input" id="w_actionTaken" style="flex:1">
              <option value="">Select...</option>
              ${actionTakenOpts.map(a=>`<option value="${escHtml(a)}"${data.actionTaken===a?' selected':''}>${escHtml(a)}</option>`).join('')}
            </select>
            <button type="button" onclick="_wizSaveStep2Inputs();openManageModal('actionTaken')" title="Manage Action Taken" style="flex-shrink:0;width:34px;height:34px;border:1px solid #ddd;border-radius:8px;background:#f8fafb;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;padding:0" onmouseover="this.style.background='#e5e7eb';this.style.borderColor='#999'" onmouseout="this.style.background='#f8fafb';this.style.borderColor='#ddd'">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="3" r="1.5" fill="#6b7280"/>
                <circle cx="8" cy="8" r="1.5" fill="#6b7280"/>
                <circle cx="8" cy="13" r="1.5" fill="#6b7280"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="wiz-group"><label class="wiz-lbl">Date of Confrontation</label>
          <input type="date" class="wiz-input" id="w_dateConfront" value="${escHtml(data.dateConfrontation||'')}"></div>
        <div class="wiz-group"><label class="wiz-lbl">Date of Settlement</label>
          <input type="date" class="wiz-input" id="w_dateResolved" value="${escHtml(data.dateResolved||'')}"></div>
        <div class="wiz-group"><label class="wiz-lbl">Mediator / Facilitator</label>
          <input class="wiz-input" id="w_mediator" value="${escHtml(data.mediator||'')}" placeholder="Name of mediator"></div>
        <div class="wiz-group"></div>
      </div>
      <div style="margin-bottom:12px">
        <div class="wiz-group"><label class="wiz-lbl">Remarks</label>
          <textarea class="wiz-input" id="w_remarks" rows="3" placeholder="Enter any remarks or notes..." style="resize:vertical">${escHtml(data.remarks||'')}</textarea>
        </div>
      </div>
      <div style="margin-bottom:6px">
        <div class="wiz-group">
          <label class="wiz-lbl">Upload Form / Attachment</label>
          <div style="border:2px dashed #ddd;border-radius:8px;padding:14px 16px;background:#fafafa;cursor:pointer;position:relative" onclick="document.getElementById('w_fileInput').click()">
            <input type="file" id="w_fileInput" multiple accept=".pdf" style="display:none" onchange="handleWizFileUpload(this)">
            <div style="text-align:center;color:#888;font-size:13px">
              <div style="font-size:22px;margin-bottom:4px">📎</div>
              <div><strong>Click to upload</strong> or drag & drop</div>
              <div style="font-size:11px;margin-top:3px">PDF files only</div>
            </div>
          </div>
          ${(data.attachments||[]).length?`<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
            ${(data.attachments||[]).map((f,i)=>`<div style="display:flex;align-items:center;gap:5px;padding:4px 9px;background:#e8f0fe;border-radius:6px;font-size:12px;color:#0d3d3a">
              <span>📄</span><span>${escHtml(f.name)}</span>
              <button onclick="removeWizAttachment(${i})" style="border:none;background:none;color:#888;cursor:pointer;font-size:13px;padding:0 2px;line-height:1">×</button>
            </div>`).join('')}
          </div>`:''}
        </div>
      </div>
    </div>
    <div style="padding:10px 14px;background:#e8f6f7;border:1px solid #b2dfe2;border-radius:8px;font-size:12px;color:#0d3d3a">
      ℹ️ <strong>Ongoing</strong> — active case &nbsp;|&nbsp; <strong>CFA</strong> — Certificate to File Action issued &nbsp;|&nbsp; <strong>Settled</strong> — resolved, increments settlement counters
    </div>`;
  } else {
    body=`<div class="wiz-section">
      <div class="wiz-sec-title" style="color:var(--text2);text-decoration:none">Review &amp; Confirm</div>
      <div class="confirm-group"><div class="confirm-group-title">Case Reference</div>
        <div class="confirm-row"><span class="confirm-key">Case Number</span><span class="confirm-val">${escHtml(data.caseNo||'---')}</span></div>
        <div class="confirm-row"><span class="confirm-key">Date Filed</span><span class="confirm-val">${escHtml(data.dateFiled||'---')}</span></div>
        <div class="confirm-row"><span class="confirm-key">Time Filed</span><span class="confirm-val">${escHtml(data.timeFiled||'---')}</span></div>
      </div>
      <div class="confirm-group"><div class="confirm-group-title">Parties Involved</div>
        <div class="confirm-row"><span class="confirm-key">Complainant</span><span class="confirm-val">${escHtml(data.complainantName||'---')}</span></div>
        <div class="confirm-row"><span class="confirm-key">Respondent</span><span class="confirm-val">${escHtml(data.respondentName||'---')}</span></div>
      </div>
      <div class="confirm-group"><div class="confirm-group-title">Case Details</div>
        <div class="confirm-row"><span class="confirm-key">Case Title</span><span class="confirm-val">${escHtml(data.caseTitle||'---')}</span></div>
        <div class="confirm-row"><span class="confirm-key">Nature of Case</span><span class="confirm-val">${escHtml(data.nature||'---')}</span></div>
        <div class="confirm-row"><span class="confirm-key">Action Taken</span><span class="confirm-val">${escHtml(data.actionTaken||'---')}</span></div>
        <div class="confirm-row"><span class="confirm-key">Status</span><span class="confirm-val">${statusBadge(data.status||'Ongoing')}</span></div>
        <div class="confirm-row"><span class="confirm-key">Date of Confrontation</span><span class="confirm-val">${escHtml(data.dateConfrontation||'---')}</span></div>
        <div class="confirm-row"><span class="confirm-key">Date of Settlement</span><span class="confirm-val">${escHtml(data.dateResolved||'---')}</span></div>
        <div class="confirm-row"><span class="confirm-key">Mediator</span><span class="confirm-val">${escHtml(data.mediator||'---')}</span></div>
        ${(data.attachments||[]).length?`<div class="confirm-row"><span class="confirm-key">Attachments</span><span class="confirm-val">${(data.attachments||[]).map(a=>escHtml(a.name)).join(', ')}</span></div>`:''}
      </div>
    </div>`;
  }
  return `<div class="wiz-overlay" onclick="if(event.target===this)closeWizard()">
    <div class="wiz-box">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px 0 20px;flex-shrink:0">
        <span style="font-size:13px;font-weight:600;color:var(--text2)">${w.editId?'Edit Complaint':'New Complaint'}</span>
        <button onclick="closeWizard()" title="Close" style="border:none;background:#f0f2f5;font-size:18px;cursor:pointer;color:#6b7280;line-height:1;padding:5px 10px;border-radius:8px;transition:all 0.15s;font-weight:700" onmouseover="this.style.background='#e5e7eb';this.style.color='#1a1a1a'" onmouseout="this.style.background='#f0f2f5';this.style.color='#6b7280'">✕</button>
      </div>
      <div class="wiz-body">${stepper}${body}</div>
      <div class="wiz-footer">
        <span class="wiz-step-lbl">Step ${step} of 3${!w.editId?` &nbsp;<span id="wiz-autosave-ind" style="font-size:11px;color:#0d3d3a;opacity:0;transition:opacity 0.4s"></span>`:''}</span>
        <div class="wiz-footer-right">
          ${step>1?`<button class="btn-wiz-back" onclick="wizBack()">← Back</button>`:`<button class="btn-wiz-back" onclick="closeWizard()">Cancel</button>`}
          <button class="btn-wiz-next" onclick="wizNext()">${step===3?'Submit':'Next →'}</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ─── ARCHIVE (LOG OLD CASE) MODAL ────────────────────────────────────────────
function openArchiveModal() {
  const now = new Date();
  const defaultCaseNo = genArchiveCaseNo(now.getFullYear(), now.getMonth() + 1);
  state.archiveModal = {
    caseNo: defaultCaseNo, dateFiled:'', timeFiled:'', natureOfCase:'Civil', caseTitle:'', actionTaken:'',
    complainant:'', complainantAddress:'', respondent:'', respondentAddress:'',
    narrative:'',
    mediationDate:'', lupanChairman:'',
    summonsDate:'', servingOfficer:'',
    pangkatDate:'', pangkatChair:'', pangkatSecretary:'', pangkatMember:'',
    conciliationDate:'', venue:'',
    outcome:'Settled — amicable agreement (Form 16)', dateOfOutcome:'', settlementTerms:'',
    additionalNotes:'',
    attachments:[],
    _caseNoManual: false
  };
  render();
}
function closeArchiveModal() {
  state.archiveModal = null;
  render();
}
// Generate archive case number: MM-YYYY-NN format
// MM = month (2 digits), YYYY = year (4 digits), NN = sequence count for that year (2 digits)
function genArchiveCaseNo(yr, mo) {
  yr = parseInt(yr) || new Date().getFullYear();
  mo = parseInt(mo) || (new Date().getMonth() + 1);
  const mm = String(mo).padStart(2, '0');
  const yrStr = String(yr);
  // Count all existing cases in the same year (any month) to get the next sequence number
  const existing = state.cases.filter(c => {
    const m = (c.caseNo||'').match(/^(\d{2})-(\d{4})-(\d{2,})$/);
    return m && m[2] === yrStr;
  });
  let maxNum = 0;
  existing.forEach(c => {
    const m = (c.caseNo||'').match(/-(\d{2,})$/);
    if (m) { const n = parseInt(m[1]); if (n > maxNum) maxNum = n; }
  });
  return `${mm}-${yrStr}-${String(maxNum+1).padStart(2,'0')}`;
}
// Called when Date Filed changes — always regenerate Case ID unless user manually typed in the Case No field
function arcDateFiledChanged(val) {
  if (!state.archiveModal) return;
  _archiveCollectSafe();
  state.archiveModal.dateFiled = val;
  // Regenerate unless the user deliberately typed a custom Case No
  if (!state.archiveModal._caseNoManual) {
    let yr = new Date().getFullYear();
    let mo = new Date().getMonth() + 1;
    if (val) {
      // Parse directly from the YYYY-MM-DD string to avoid timezone issues
      const parts = val.split('-');
      const parsedYr = parseInt(parts[0]);
      const parsedMo = parseInt(parts[1]);
      if (!isNaN(parsedYr) && parsedYr > 1900) yr = parsedYr;
      if (!isNaN(parsedMo) && parsedMo >= 1 && parsedMo <= 12) mo = parsedMo;
    }
    const newCaseNo = genArchiveCaseNo(yr, mo);
    state.archiveModal.caseNo = newCaseNo;
    state.archiveModal._caseNoMatch = false;
    state.archiveModal._caseNoExists = null;
    const cnoEl = document.getElementById('arc_caseNo');
    if (cnoEl) cnoEl.value = newCaseNo;
  }
}
// Called on blur of Case No — do the match check without re-rendering mid-type
function arcCaseNoBlur(val) {
  if (!state.archiveModal) return;
  const trimmed = val.trim();
  if (!trimmed) { state.archiveModal._caseNoManual = false; return; }
  state.archiveModal.caseNo = trimmed;
  state.archiveModal._caseNoManual = true;
  const match = state.cases.find(c => (c.caseNo||'').toLowerCase() === trimmed.toLowerCase());
  if (match) {
    _archiveCollectSafe();
    const d = state.archiveModal;
    d.caseNo             = trimmed;
    d.dateFiled          = d.dateFiled          || match.dateFiled          || '';
    d.timeFiled          = d.timeFiled          || match.timeFiled          || '';
    d.natureOfCase       = d.natureOfCase       || match.nature             || 'Civil';
    d.caseTitle          = d.caseTitle          || match.caseTitle          || '';
    d.actionTaken        = d.actionTaken        || match.actionTaken        || '';
    d.complainant        = d.complainant        || match.complainant        || '';
    d.complainantAddress = d.complainantAddress || match.complainantAddress || '';
    d.respondent         = d.respondent         || match.respondent         || '';
    d.respondentAddress  = d.respondentAddress  || match.respondentAddress  || '';
    d.lupanChairman      = d.lupanChairman      || match.mediator           || '';
    d.mediationDate      = d.mediationDate      || match.dateConfrontation  || '';
    d.narrative          = d.narrative          || match.remarks            || '';
    d._caseNoMatch       = true;
    d._caseNoExists      = true;
  } else {
    state.archiveModal._caseNoMatch  = false;
    state.archiveModal._caseNoExists = false;
  }
  render();
}
// Called on input of Case No — just track the value, mark as manually edited, no re-render
function arcCaseNoInput(val) {
  if (!state.archiveModal) return;
  state.archiveModal.caseNo = val;
  state.archiveModal._caseNoManual = true;
  // Clear match banner without re-render
  state.archiveModal._caseNoMatch  = false;
  state.archiveModal._caseNoExists = null;
}
// Collect without overwriting fields that haven't been touched (avoids losing existing values on re-render)
function _archiveCollectSafe() {
  const gv = id => { const el = document.getElementById(id); return el ? el.value : null; };
  const d = state.archiveModal; if (!d) return;
  const fields = {
    arc_dateFiled:'dateFiled', arc_timeFiled:'timeFiled', arc_nature:'natureOfCase',
    arc_caseTitle:'caseTitle', arc_complainant:'complainant', arc_complainantAddr:'complainantAddress',
    arc_respondent:'respondent', arc_respondentAddr:'respondentAddress', arc_narrative:'narrative',
    arc_mediationDate:'mediationDate', arc_lupanChairman:'lupanChairman',
    arc_summonsDate:'summonsDate', arc_servingOfficer:'servingOfficer',
    arc_pangkatDate:'pangkatDate', arc_pangkatChair:'pangkatChair',
    arc_pangkatSecretary:'pangkatSecretary', arc_pangkatMember:'pangkatMember',
    arc_conciliationDate:'conciliationDate', arc_venue:'venue',
    arc_outcome:'outcome', arc_dateOfOutcome:'dateOfOutcome', arc_settlementTerms:'settlementTerms',
    arc_actionTaken:'actionTaken'
  };
  Object.entries(fields).forEach(([elId, key]) => {
    const v = gv(elId); if (v !== null) d[key] = v;
  });
}
function archiveCollect() {
  _archiveCollectSafe();
  const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const d = state.archiveModal;
  // Also capture caseNo from the input directly (may not be in _archiveCollectSafe map)
  const cnoEl = document.getElementById('arc_caseNo');
  if (cnoEl) d.caseNo = cnoEl.value.trim() || d.caseNo;
}
function handleArchiveFileUpload(input) {
  if (!input.files || !input.files.length) return;
  archiveCollect();
  const atts = state.archiveModal.attachments || [];
  const nonPdf = Array.from(input.files).filter(f => !f.name.match(/\.pdf$/i));
  if (nonPdf.length) { showToast('Only PDF files are allowed.', 'error', 4000); input.value = ''; return; }
  let loaded = 0;
  const total = input.files.length;
  Array.from(input.files).forEach(f => {
    const reader = new FileReader();
    reader.onload = e => {
      atts.push({ name: f.name, size: f.size, dataUrl: e.target.result });
      state.archiveModal.attachments = [...atts];
      loaded++;
      if (loaded === total) { render(); showToast(`${total} file${total > 1 ? 's' : ''} uploaded!`, 'success'); }
    };
    reader.onerror = () => showToast('Failed to read file.', 'error');
    reader.readAsDataURL(f);
  });
}
function removeArchiveAttachment(idx) {
  archiveCollect();
  const atts = state.archiveModal.attachments || [];
  atts.splice(idx, 1);
  state.archiveModal.attachments = [...atts];
  render();
}
function saveArchiveModal() {
  archiveCollect();
  const d = state.archiveModal;
  if (!d.caseNo) { alert('Case Number is required.'); return; }
  if (!d.complainant) { alert('Complainant name is required.'); return; }
  // Old cases logged via Log Old Case are always Settled + Submitted to Court
  // This mirrors the confirmed state a new case reaches after the user clicks "Yes, submitted"
  const isEdit = !!d._editId;
  const courtConfirmedDate = d.dateOfOutcome || d.dateFiled || todayStr();
  const rec = {
    id: isEdit ? d._editId : genId(),
    caseNo: d.caseNo,
    dateFiled: d.dateFiled,
    timeFiled: d.timeFiled,
    complainant: d.complainant,
    complainantAddress: d.complainantAddress,
    respondent: d.respondent,
    respondentAddress: d.respondentAddress,
    nature: d.natureOfCase,
    type: d.natureOfCase,
    caseTitle: d.caseTitle || d.natureOfCase,
    actionTaken: (d.mediationDate && d.conciliationDate) ? 'Conciliation' : (d.conciliationDate ? 'Conciliation' : (d.mediationDate ? 'Mediation' : (d.actionTaken || ''))),
    dateConfrontation: d.mediationDate || '',
    dateResolved: d.dateOfOutcome || '',
    status: 'Settled',
    _courtPhase: 'submitted',
    _courtSubmitted: true,
    _courtSubmittedDate: courtConfirmedDate,
    mediator: d.lupanChairman || '',
    remarks: d.narrative || '',
    attachments: d.attachments || [],
    _archive: true,
    _pangkatChair: d.pangkatChair,
    _pangkatSecretary: d.pangkatSecretary,
    _pangkatMember: d.pangkatMember,
    _summonsDate: d.summonsDate,
    _servingOfficer: d.servingOfficer,
    _conciliationDate: d.conciliationDate,
    _venue: d.venue,
    _outcome: d.outcome,
    _lupanChairman: d.lupanChairman,
    _narrative: d.narrative,
    _settlementTerms: d.settlementTerms
  };
  if (isEdit) {
    const idx = state.cases.findIndex(x => x.id === d._editId);
    if (idx > -1) state.cases[idx] = rec;
  } else {
    state.cases.push(rec);
  }
  saveData('ltia_cases', state.cases);
  const savedId = rec.id;
  state.archiveModal = null;
  if (isEdit) { state.viewCasePage = savedId; state.page = 'cases'; }
  render();
  showToast(isEdit ? 'Archived case updated successfully!' : 'Archived case record saved successfully!', 'success');
}

// ── View modal for archived cases — now routes to full detail page ──────────
function viewArchiveCase(caseId) {
  const c = state.cases.find(x => x.id === caseId);
  if (!c) return;
  const existing = document.getElementById('arc-view-modal-root');
  if (existing) existing.remove();
  // Remember which page we came from so Back returns there
  state._prevPage = state.page || 'dashboard';
  state._prevStatCard = state.filterStatCard || null;
  // Navigate to full-page case detail (same as viewCase)
  state.viewCasePage = caseId;
  state.page = 'dashboard';
  render();
}
function openEditArchiveModal(caseId) {
  const c = state.cases.find(x => x.id === caseId);
  if (!c) return;
  // Re-map the stored case fields back into archiveModal form fields
  state.archiveModal = {
    _editId:            caseId,
    _caseNoManual:      true,
    caseNo:             c.caseNo             || '',
    dateFiled:          c.dateFiled           || '',
    timeFiled:          c.timeFiled           || '',
    natureOfCase:       c.nature || c.type    || 'Civil',
    caseTitle:          c.caseTitle           || '',
    actionTaken:        c.actionTaken         || '',
    complainant:        c.complainant         || '',
    complainantAddress: c.complainantAddress  || '',
    respondent:         c.respondent          || '',
    respondentAddress:  c.respondentAddress   || '',
    narrative:          c._narrative || c.remarks || '',
    mediationDate:      c.dateConfrontation   || '',
    lupanChairman:      c._lupanChairman || c.mediator || '',
    summonsDate:        c._summonsDate        || '',
    servingOfficer:     c._servingOfficer     || '',
    pangkatDate:        c._pangkatDate        || '',
    pangkatChair:       c._pangkatChair       || '',
    pangkatSecretary:   c._pangkatSecretary   || '',
    pangkatMember:      c._pangkatMember      || '',
    conciliationDate:   c._conciliationDate   || '',
    venue:              c._venue              || '',
    outcome:            c._outcome            || 'Settled — amicable agreement (Form 16)',
    dateOfOutcome:      c.dateResolved        || '',
    settlementTerms:    c._settlementTerms    || '',
    additionalNotes:    '',
    attachments:        c.attachments         || [],
    _caseNoMatch:       false,
    _caseNoExists:      null
  };
  render();
}

function arcViewAttachment(caseId, idx) {
  const c = state.cases.find(x => x.id === caseId);
  if (!c) return;
  window._arcViewReturnCaseId = caseId;
  viewAttachments(caseId, idx);
  window._arcAttachOverride = true;
}

function closeArcAttachAndReturn() {
  const el = document.getElementById('attach-modal-root');
  if (el) el.remove();
  const caseId = window._arcViewReturnCaseId;
  if (caseId) { window._arcViewReturnCaseId = null; setTimeout(() => viewArchiveCase(caseId), 50); }
}

function printArchiveCase(caseId) {
  const c = state.cases.find(x => x.id === caseId);
  if (!c) return;
  const esc = v => (v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  function row(label, val) {
    if (!val) return '';
    return `<tr><td style="width:185px;padding:5px 8px;font-size:12px;color:#555;font-weight:500;vertical-align:top;border-bottom:1px solid #eee">${label}</td><td style="padding:5px 8px;font-size:12px;font-weight:600;color:#111;border-bottom:1px solid #eee">${val}</td></tr>`;
  }
  function sec(title) {
    return `<tr><td colspan="2" style="padding:12px 8px 4px;font-size:10px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.8px;border-bottom:2px solid #dbeafe">${title}</td></tr>`;
  }
  const atts = (c.attachments||[]);
  const attRows = atts.length
    ? atts.map(a=>`<tr><td colspan="2" style="padding:4px 8px;font-size:12px;border-bottom:1px solid #eee">📄 ${esc(a.name)}${a.size?' ('+Math.round(a.size/1024)+' KB)':''}</td></tr>`).join('')
    : `<tr><td colspan="2" style="padding:4px 8px;font-size:12px;color:#999;border-bottom:1px solid #eee">None</td></tr>`;

  const html = `<!DOCTYPE html><html><head><title>Archived Case — ${esc(c.caseNo)}</title>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:24px 32px;color:#111}
    h1{font-size:18px;font-weight:700;margin:0 0 2px}
    .sub{font-size:13px;color:#555;margin-bottom:16px}
    .badge{display:inline-block;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.04em;margin-left:8px}
    table{width:100%;border-collapse:collapse;margin-bottom:6px}
    @media print{body{padding:16px}button{display:none}}
  </style></head><body>
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #0d3d3a">
    <div>
      <h1>Case Record — ${esc(c.caseNo)} <span class="badge" style="background:#e8f4fd;color:#0d3d3a">ARCHIVED</span></h1>
      <div class="sub">${esc((c.complainant||'').toUpperCase())}${c.respondent?' <strong>vs</strong> '+esc(c.respondent.toUpperCase()):''} &nbsp;·&nbsp; Status: <strong>${esc(c.status||'')}</strong></div>
    </div>
    <div style="font-size:11px;color:#999;text-align:right">Printed: ${new Date().toLocaleDateString()}</div>
  </div>
  <table>
    ${sec('Form 7 — Case Identity')}
    ${row('Case Number', esc(c.caseNo||''))}
    ${row('Date Filed', esc(fmtDateWords(c.dateFiled||'')))}
    ${row('Time Filed', esc(c.timeFiled ? (()=>{const[h,m]=(c.timeFiled||'').split(':');const hr=parseInt(h);return hr===0?`12:${m} AM`:hr<12?`${h}:${m} AM`:hr===12?`12:${m} PM`:`${hr-12}:${m} PM`;})() : ''))}
    ${row('Nature of Case', esc(c.nature||c.type||''))}
    ${row('Complainant', esc((c.complainant||'').toUpperCase()))}
    ${row('Complainant Address', esc(c.complainantAddress||''))}
    ${row('Respondent(s)', esc((c.respondent||'').toUpperCase()))}
    ${row('Respondent Address', esc(c.respondentAddress||''))}
    ${row('Remarks', esc(c._narrative||c.remarks||''))}
    ${(c.dateConfrontation||c._lupanChairman||c.mediator)?sec('Form 8 — Mediation'):''}
    ${row('Mediation Date', esc(fmtDateWords(c.dateConfrontation||'')))}
    ${row('Lupon Chairman/Punong Barangay', esc(c._lupanChairman||c.mediator||''))}
    ${(c._summonsDate||c._servingOfficer)?sec('Form 9 — Summons'):''}
    ${row('Summons Date', esc(fmtDateWords(c._summonsDate||'')))}
    ${row('Serving Officer', esc(c._servingOfficer||''))}
    ${(c._pangkatChair||c._pangkatSecretary||c._pangkatMember)?sec('Forms 10 & 11 — Pangkat'):''}
    ${row('Pangkat Chair', esc(c._pangkatChair||''))}
    ${row('Pangkat Secretary', esc(c._pangkatSecretary||''))}
    ${row('Pangkat Member', esc(c._pangkatMember||''))}
    ${(c._conciliationDate||c._venue)?sec('Form 12 — Conciliation Hearing'):''}
    ${row('Conciliation Date', esc(fmtDateWords(c._conciliationDate||'')))}
    ${row('Venue', esc(c._venue||''))}
    ${sec('Form 16 — Final Outcome')}
    ${row('Outcome', esc(c._outcome||''))}
    ${row('Date of Outcome', esc(fmtDateWords(c.dateResolved||'')))}
    ${row('Settlement / Resolution Terms', esc(c._settlementTerms||''))}
    ${sec('Attachments')}
    ${attRows}
  </table>
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
  else alert('Please allow pop-ups to print.');
}

const ARCHIVE_CASE_TITLE_OPTIONS = [
  'Collection of Sum of Money','Failure to Turnover Sale Proceed','Misunderstanding',
  'Neglect of Responsibility','Oral Defamation','Serious Physical Injury',
  'Slight Physical Injury','Theft','Unjust Vexation'
];
const ARCHIVE_NATURE_OPTIONS = [
  'Civil','Criminal'
];
const ARCHIVE_OUTCOME_OPTIONS = [
  'Settled — amicable agreement (Form 16)',
  'CFA — Certificate to File Action issued',
  'Dismissed — lack of merit'
];

// ── Archive modal manage helpers ──────────────────────────────────────────────
function _arcCollectBeforeManage() {
  _archiveCollectSafe();
  const cnoEl = document.getElementById('arc_caseNo');
  if (cnoEl && state.archiveModal) state.archiveModal.caseNo = cnoEl.value.trim() || state.archiveModal.caseNo;
}
function _refreshArcDropdowns() {
  const ctSel = document.getElementById('arc_caseTitle');
  const atSel = document.getElementById('arc_actionTaken');
  if (ctSel) {
    const cur = ctSel.value;
    ctSel.innerHTML = `<option value="">Select...</option>` + getCaseTitles().map(t => `<option value="${escHtml(t)}"${t===cur?' selected':''}>${escHtml(t)}</option>`).join('');
    if (state.archiveModal && state.archiveModal.caseTitle) ctSel.value = state.archiveModal.caseTitle;
  }
  if (atSel) {
    const cur = atSel.value;
    atSel.innerHTML = `<option value="">Select...</option>` + getActionTaken().map(a => `<option value="${escHtml(a)}"${a===cur?' selected':''}>${escHtml(a)}</option>`).join('');
    if (state.archiveModal && state.archiveModal.actionTaken) atSel.value = state.archiveModal.actionTaken;
  }
}
function openArchiveManageModal(type) {
  const existing = document.getElementById('arc-manage-modal-root');
  if (existing) existing.remove();
  const isTitle = type === 'caseTitle';
  const title   = isTitle ? 'Manage Case Titles' : 'Manage Action Taken';
  const ph      = isTitle ? 'Enter case title...' : 'Enter action taken...';
  const DEFAULT = isTitle ? DEFAULT_CASE_TITLES : DEFAULT_ACTION_TAKEN;

  function getList() { return isTitle ? getCaseTitles() : getActionTaken(); }
  function saveList(arr) { if (isTitle) saveCaseTitles(arr); else saveActionTaken(arr); }

  function renderList() {
    const listEl = document.getElementById('arc-mopt-list');
    if (!listEl) return;
    listEl.innerHTML = getList().map(item => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;gap:8px">
        <div style="display:flex;align-items:center;gap:7px;flex:1;min-width:0">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1" title="${escHtml(item)}">${escHtml(item)}</span>
          ${DEFAULT.includes(item)?`<span style="flex-shrink:0;font-size:10px;font-weight:600;padding:2px 7px;background:#f0f2f5;color:#9ba3ae;border-radius:10px">default</span>`:''}
        </div>
        ${DEFAULT.includes(item)?'':`<button type="button" onclick="arcMoptRemove('${escHtml(item).replace(/'/g,"\\'")}')" style="flex-shrink:0;padding:4px 10px;background:#fff5f5;color:#c0392b;border:1px solid #fbbaba;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer" onmouseover="this.style.background='#ffe0e0'" onmouseout="this.style.background='#fff5f5'">✕ Remove</button>`}
      </div>`).join('');
  }

  window.arcMoptRemove = function(val) {
    if (DEFAULT.includes(val)) { showToast('Default items cannot be removed.', 'warning'); return; }
    const banner = document.getElementById('arc-mopt-confirm-banner');
    if (banner) { banner.style.display='flex'; banner.querySelector('.arc-mopt-confirm-msg').textContent=`Remove "${val}"?`; banner._pendingVal=val; }
  };
  window.arcMoptConfirmRemove = function() {
    const banner = document.getElementById('arc-mopt-confirm-banner');
    if (!banner) return;
    const val = banner._pendingVal;
    banner.style.display = 'none';
    saveList(getList().filter(x => x !== val));
    if (state.archiveModal) {
      if (isTitle && state.archiveModal.caseTitle === val) state.archiveModal.caseTitle = '';
      if (!isTitle && state.archiveModal.actionTaken === val) state.archiveModal.actionTaken = '';
    }
    renderList();
    _refreshArcDropdowns();
    // Also keep main wizard dropdowns in sync
    _refreshWizDropdowns();
    arcMoptSuccess(`"${val}" removed successfully.`);
  };
  window.arcMoptCancelRemove = function() {
    const b = document.getElementById('arc-mopt-confirm-banner'); if (b) b.style.display='none';
  };
  window.arcMoptAdd = function() {
    const inp = document.getElementById('arc-mopt-new-input');
    const val = (inp && inp.value) || '';
    if (!val.trim()) { if(inp){inp.style.borderColor='#e74c3c';setTimeout(()=>{inp.style.borderColor='#ddd';},1500);} return; }
    const existing2 = getList();
    if (existing2.map(x=>x.toLowerCase()).includes(val.trim().toLowerCase())) { showToast('This item already exists.','warning'); return; }
    saveList([...existing2, val.trim()]);
    if (state.archiveModal) {
      if (isTitle) state.archiveModal.caseTitle = val.trim();
      else state.archiveModal.actionTaken = val.trim();
    }
    inp.value = '';
    renderList();
    _refreshArcDropdowns();
    _refreshWizDropdowns();
    arcMoptSuccess(`"${val.trim()}" added successfully.`);
  };
  function arcMoptSuccess(msg) {
    const s = document.getElementById('arc-mopt-success-banner');
    if (!s) return;
    s.textContent = '✅ ' + msg; s.style.display='block'; s.style.opacity='1';
    setTimeout(()=>{ s.style.opacity='0'; setTimeout(()=>{ s.style.display='none'; s.style.opacity='1'; }, 350); }, 2200);
  }

  const html = `<div id="arc-manage-modal-root" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:700;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this){document.getElementById('arc-manage-modal-root').remove();}">
    <div style="background:#fff;border-radius:14px;width:440px;max-width:96vw;max-height:90vh;box-shadow:0 16px 50px rgba(0,0,0,0.22);display:flex;flex-direction:column;overflow:hidden;position:relative">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #f0f0f0;flex-shrink:0">
        <div>
          <div style="font-size:15px;font-weight:700;color:#0d2137">${title}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px">Add or remove ${isTitle?'case title':'action taken'} options</div>
        </div>
        <button onclick="document.getElementById('arc-manage-modal-root').remove()" style="border:none;background:#f0f2f5;font-size:17px;cursor:pointer;color:#6b7280;line-height:1;padding:5px 10px;border-radius:8px;font-weight:700;transition:all 0.15s" onmouseover="this.style.background='#e5e7eb';this.style.color='#1a1a1a'" onmouseout="this.style.background='#f0f2f5';this.style.color='#6b7280'">✕</button>
      </div>
      <div id="arc-mopt-success-banner" style="display:none;margin:10px 16px 0;padding:9px 14px;background:#eaf6e8;border:1px solid #b7dfb8;border-radius:8px;font-size:13px;font-weight:600;color:#0d3d3a;transition:opacity 0.35s"></div>
      <div id="arc-mopt-confirm-banner" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,0.38);z-index:10;align-items:center;justify-content:center;border-radius:14px">
        <div style="background:#fff;border-radius:12px;width:320px;max-width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.22);padding:22px 22px 18px;text-align:center">
          <div style="font-size:26px;margin-bottom:10px">⚠️</div>
          <div style="font-size:14px;font-weight:700;color:#0d2137;margin-bottom:6px">Confirm Removal</div>
          <div class="arc-mopt-confirm-msg" style="font-size:13px;color:#5c6370;line-height:1.5;margin-bottom:18px"></div>
          <div style="display:flex;gap:10px;justify-content:center">
            <button onclick="arcMoptCancelRemove()" style="padding:8px 20px;background:#fff;color:#6b7280;border:1px solid #ddd;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer">Cancel</button>
            <button onclick="arcMoptConfirmRemove()" style="padding:8px 20px;background:#c0392b;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Remove</button>
          </div>
        </div>
      </div>
      <div style="padding:14px 16px;flex:1;overflow-y:auto">
        <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Current Options</div>
        <div id="arc-mopt-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px"></div>
        <div style="background:#f8fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px">
          <div style="font-size:11px;font-weight:700;color:#14919b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">＋ Add New Option</div>
          <div style="display:flex;gap:8px">
            <input type="text" id="arc-mopt-new-input" placeholder="${ph}" style="flex:1;padding:8px 11px;border:1px solid #ddd;border-radius:8px;font-size:13px;outline:none;transition:border-color 0.15s" onfocus="this.style.borderColor='#14919b'" onblur="this.style.borderColor='#ddd'" onkeydown="if(event.key==='Enter')arcMoptAdd()">
            <button type="button" onclick="arcMoptAdd()" style="padding:8px 18px;background:#14919b;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background 0.15s" onmouseover="this.style.background='#077a7d'" onmouseout="this.style.background='#14919b'">Add</button>
          </div>
        </div>
      </div>
      <div style="padding:12px 16px;border-top:1px solid #f0f0f0;display:flex;justify-content:flex-end;background:#f9fafb;flex-shrink:0">
        <button onclick="document.getElementById('arc-manage-modal-root').remove()" style="padding:8px 22px;border-radius:8px;background:#0d3d3a;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer">Done</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  renderList();
  setTimeout(() => { const inp = document.getElementById('arc-mopt-new-input'); if (inp) inp.focus(); }, 100);
}

function renderArchiveModal() {
  if (!state.archiveModal) return '';
  const d = state.archiveModal;
  const esc = escHtml;
  const inp = (id, val, ph='') => `<input class="wiz-input" id="${id}" value="${esc(val||'')}" placeholder="${esc(ph)}" style="width:100%;box-sizing:border-box">`;
  const dateInp = (id, val) => `<input type="date" class="wiz-input" id="${id}" value="${esc(val||'')}" style="width:100%;box-sizing:border-box">`;
  const timeInp = (id, val) => `<input type="time" class="wiz-input" id="${id}" value="${esc(val||'')}" style="width:100%;box-sizing:border-box">`;
  const row2 = (a, b) => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${a}${b}</div>`;
  const grp = (lbl, content, req='') => `<div class="wiz-group"><label class="wiz-lbl">${esc(lbl)}${req?` <span style="color:#e53e3e">*</span>`:''}</label>${content}</div>`;
  const atts = d.attachments || [];
  const attList = atts.length ? `<div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">
    ${atts.map((f,i)=>`<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;background:#e8f0fe;border-radius:7px;font-size:12px;color:#0d3d3a">
      <span>📄</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(f.name)}">${esc(f.name)}</span>
      <span style="font-size:11px;color:#888;flex-shrink:0">${f.size?Math.round(f.size/1024)+' KB':''}</span>
      <button onclick="removeArchiveAttachment(${i})" style="border:none;background:none;color:#888;cursor:pointer;font-size:14px;padding:0 3px;line-height:1" title="Remove">×</button>
    </div>`).join('')}
  </div>` : '';

  return `<div id="archive-modal-root" class="wiz-overlay" onclick="if(event.target===this)closeArchiveModal()">
    <div class="wiz-box" style="max-width:580px;width:95vw">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px 0 20px;flex-shrink:0">
        <span style="font-size:13px;font-weight:600;color:var(--text2)">${d._editId ? 'Edit archived case record' : 'Log archived / old case record'}</span>
        <button onclick="closeArchiveModal()" title="Close" style="border:none;background:#f0f2f5;font-size:18px;cursor:pointer;color:#6b7280;line-height:1;padding:5px 10px;border-radius:8px;font-weight:700" onmouseover="this.style.background='#e5e7eb';this.style.color='#1a1a1a'" onmouseout="this.style.background='#f0f2f5';this.style.color='#6b7280'">✕</button>
      </div>

      <!-- Body -->
      <div class="wiz-body" style="padding:16px 20px;display:flex;flex-direction:column;gap:16px">

        <!-- Notice -->
        <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:10px 14px;font-size:12px;color:#7c5c00">
          For hardcopy records that are already resolved. Fill in what you have — all fields except Case No. and Complainant are optional.
        </div>

        <!-- FORM 7 -->
        <div class="wiz-section" style="margin:0">
          <div class="wiz-sec-title" style="font-size:11px;letter-spacing:.05em;color:#888;text-transform:uppercase;font-weight:700;margin-bottom:10px">Form 7 — Case Identity</div>
          ${row2(
            grp('Case number',`<input class="wiz-input" id="arc_caseNo" value="${esc(d.caseNo||'')}" placeholder="e.g. 04-2026-01" oninput="arcCaseNoInput(this.value)" onblur="arcCaseNoBlur(this.value)" style="width:100%;box-sizing:border-box">${d._caseNoMatch?`<div style="margin-top:5px;padding:6px 10px;background:#e0f4f4;border:1px solid #b2e0e0;border-radius:7px;font-size:11px;color:#0a7075;font-weight:600">✓ Matched existing case — fields pre-filled. All fields remain editable.</div>`:(d._caseNoExists===false?`<div style="margin-top:5px;padding:6px 10px;background:#fff8e1;border:1px solid #ffe082;border-radius:7px;font-size:11px;color:#7c5c00;font-weight:600">⚠ No existing case found — a new record will be created.</div>`:'')}`,''),
            grp('Date filed', `<input type="date" class="wiz-input" id="arc_dateFiled" value="${esc(d.dateFiled||'')}" onchange="arcDateFiledChanged(this.value)" style="width:100%;box-sizing:border-box">`)
          )}
          <div style="height:10px"></div>
          ${row2(
            grp('Time filed', timeInp('arc_timeFiled', d.timeFiled)),
            grp('Nature of case', `<select class="wiz-input" id="arc_nature" style="width:100%;box-sizing:border-box">${ARCHIVE_NATURE_OPTIONS.map(n=>`<option value="${esc(n)}"${d.natureOfCase===n?' selected':''}>${esc(n)}</option>`).join('')}</select>`)
          )}
          <div style="height:10px"></div>
          ${grp('Case Title', `<div style="display:flex;align-items:center;gap:6px">
            <select class="wiz-input" id="arc_caseTitle" style="flex:1;box-sizing:border-box"><option value="">Select...</option>${getCaseTitles().map(t=>`<option value="${esc(t)}"${d.caseTitle===t?' selected':''}>${esc(t)}</option>`).join('')}</select>
            <button type="button" onclick="_arcCollectBeforeManage();openArchiveManageModal('caseTitle')" title="Manage Case Titles" style="flex-shrink:0;width:34px;height:34px;border:1px solid #ddd;border-radius:8px;background:#f8fafb;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;padding:0" onmouseover="this.style.background='#e5e7eb';this.style.borderColor='#999'" onmouseout="this.style.background='#f8fafb';this.style.borderColor='#ddd'">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="3" r="1.5" fill="#6b7280"/><circle cx="8" cy="8" r="1.5" fill="#6b7280"/><circle cx="8" cy="13" r="1.5" fill="#6b7280"/></svg>
            </button>
          </div>`)}
          <div style="height:10px"></div>
          ${grp('Complainant', inp('arc_complainant', d.complainant, 'Full name'), true)}
          <div style="height:10px"></div>
          ${grp('Complainant address', inp('arc_complainantAddr', d.complainantAddress, 'Purok, Barangay, City'))}
          <div style="height:10px"></div>
          ${grp('Respondent(s)', inp('arc_respondent', d.respondent, 'Full name(s)'))}
          <div style="height:10px"></div>
          ${grp('Respondent address', inp('arc_respondentAddr', d.respondentAddress, 'Purok, Barangay, City'))}
        </div>

        <!-- FORM 8 -->
        <div class="wiz-section" style="margin:0">
          <div class="wiz-sec-title" style="font-size:11px;letter-spacing:.05em;color:#888;text-transform:uppercase;font-weight:700;margin-bottom:10px">Form 8 — Mediation (if recorded)</div>
          ${row2(
            grp('Mediation date', dateInp('arc_mediationDate', d.mediationDate)),
            grp('Lupon Chairman', inp('arc_lupanChairman', d.lupanChairman, 'Hon. ...'))
          )}
        </div>

        <!-- FORM 9 -->
        <div class="wiz-section" style="margin:0">
          <div class="wiz-sec-title" style="font-size:11px;letter-spacing:.05em;color:#888;text-transform:uppercase;font-weight:700;margin-bottom:10px">Form 9 — Summons (if recorded)</div>
          ${row2(
            grp('Summons date', dateInp('arc_summonsDate', d.summonsDate)),
            grp('Serving officer', inp('arc_servingOfficer', d.servingOfficer, 'Name'))
          )}
        </div>

        <!-- FORMS 10 & 11 -->
        <div class="wiz-section" style="margin:0">
          <div class="wiz-sec-title" style="font-size:11px;letter-spacing:.05em;color:#888;text-transform:uppercase;font-weight:700;margin-bottom:10px">Forms 10 &amp; 11 — Pangkat (if formed)</div>
          ${row2(
            grp('Pangkat date', dateInp('arc_pangkatDate', d.pangkatDate)),
            grp('Pangkat Chair', inp('arc_pangkatChair', d.pangkatChair, 'Full name'))
          )}
          <div style="height:10px"></div>
          ${row2(
            grp('Pangkat Secretary', inp('arc_pangkatSecretary', d.pangkatSecretary, 'Full name')),
            grp('Pangkat Member', inp('arc_pangkatMember', d.pangkatMember, 'Full name'))
          )}
        </div>

        <!-- FORM 12 -->
        <div class="wiz-section" style="margin:0">
          <div class="wiz-sec-title" style="font-size:11px;letter-spacing:.05em;color:#888;text-transform:uppercase;font-weight:700;margin-bottom:10px">Form 12 — Conciliation Hearing (if held)</div>
          ${row2(
            grp('Conciliation date', dateInp('arc_conciliationDate', d.conciliationDate)),
            grp('Venue', inp('arc_venue', d.venue, 'Barangay Hall'))
          )}
        </div>

        <!-- FORM 16 -->
        <div class="wiz-section" style="margin:0">
          <div class="wiz-sec-title" style="font-size:11px;letter-spacing:.05em;color:#888;text-transform:uppercase;font-weight:700;margin-bottom:10px">Form 16 — Final Outcome</div>
          ${grp('Outcome', `<select class="wiz-input" id="arc_outcome" style="width:100%;box-sizing:border-box">${ARCHIVE_OUTCOME_OPTIONS.map(o=>`<option value="${esc(o)}"${d.outcome===o?' selected':''}>${esc(o)}</option>`).join('')}</select>`)}
          <div style="height:10px"></div>
          ${grp('Date of outcome', dateInp('arc_dateOfOutcome', d.dateOfOutcome))}
          <div style="height:10px"></div>
          ${grp('Remarks', `<textarea class="wiz-input" id="arc_narrative" rows="3" placeholder="Summary of the dispute from the hardcopy..." style="width:100%;box-sizing:border-box;resize:vertical">${esc(d.narrative||'')}</textarea>`)}
        </div>

        <!-- Attachments upload -->
        <div class="wiz-section" style="margin:0">
          <div class="wiz-sec-title" style="font-size:11px;letter-spacing:.05em;color:#888;text-transform:uppercase;font-weight:700;margin-bottom:10px">Attach KP Forms / Documents</div>
          <div style="border:2px dashed #ddd;border-radius:8px;padding:14px 16px;background:#fafafa;cursor:pointer;position:relative;text-align:center" onclick="document.getElementById('arc_fileInput').click()">
            <input type="file" id="arc_fileInput" multiple accept=".pdf" style="display:none" onchange="handleArchiveFileUpload(this)">
            <div style="font-size:22px;margin-bottom:4px">📎</div>
            <div style="font-size:13px;color:#888"><strong>Click to upload</strong> KP Forms or supporting documents</div>
            <div style="font-size:11px;color:#aaa;margin-top:3px">PDF files only · Multiple files allowed</div>
          </div>
          ${attList}
        </div>

      </div>

      <!-- Footer -->
      <div class="wiz-footer">
        <span class="wiz-step-lbl">Archived / old record${atts.length ? ` &nbsp;·&nbsp; <span style="color:#0d3d3a;font-weight:600">${atts.length} file${atts.length>1?'s':''} attached</span>` : ''}</span>
        <div class="wiz-footer-right">
          <button class="btn-wiz-back" onclick="closeArchiveModal()">Cancel</button>
          <button class="btn-wiz-next" onclick="saveArchiveModal()">${d._editId ? '💾 Update Record' : 'Save to system'}</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ─── SCHEDULE WIZARD ─────────────────────────────────────────────────────────
function openSchedWizard(caseId) {
  let prefill={};
  if(caseId){
    const c=state.cases.find(x=>x.id===caseId);
    const phase=_detectPhase(c);
    if(c) prefill={caseNo:c.caseNo,dateFiled:c.dateFiled,complainantName:c.complainant,complainantContact:c.complainantContact||'',
      complainantAddress:c.complainantAddress||'',respondentName:c.respondent,respondentContact:c.respondentContact||'',
      respondentAddress:c.respondentAddress||'',caseTitle:c.caseTitle||c.type||'',_caseId:caseId,_phase:phase};
    // Skip step 1 — go directly to schedule details since case is already selected
    state.schedWizard={step:2,data:{lupons:[],schedDate:'',schedTime:'',...prefill}};
  } else {
    // New standalone schedule: auto-generate case number, go straight to step 2 (form shown immediately)
    const newCaseNo=genCaseNo();
    prefill={caseNo:newCaseNo,dateFiled:todayStr(),_isNewCase:true};
    state.schedWizard={step:2,data:{lupons:[],schedDate:'',schedTime:'',...prefill}};
  }
  state.calPopup=null; render();
}
function schedLoadCase(caseId){
  if(!caseId){state.schedWizard.data._caseId=null;render();return;}
  const c=state.cases.find(x=>x.id===caseId); if(!c)return;
  Object.assign(state.schedWizard.data,{_caseId:caseId,caseNo:c.caseNo,dateFiled:c.dateFiled,
    complainantName:c.complainant,complainantContact:c.complainantContact||'',complainantAddress:c.complainantAddress||'',
    respondentName:c.respondent,respondentContact:c.respondentContact||'',respondentAddress:c.respondentAddress||'',caseTitle:c.type||''});
  render();
}
function closeSchedWizard(){state.schedWizard=null;state.calPopup=null;render();}

function schedWizGetData(){
  const w=state.schedWizard; if(!w)return{};
  const d=w.data;
  const gv=id=>{const el=document.getElementById(id);return el?el.value.trim():null;};
  return {
    caseNo:    gv('sw_caseNo')    ||d.caseNo||'',
    dateFiled: gv('sw_dateFiled') ||d.dateFiled||'',
    timeFiled: gv('sw_timeFiled') ||d.timeFiled||'',
    complainantName:    gv('sw_cName')    ||d.complainantName||'',
    complainantAddress: gv('sw_cAddress') ||d.complainantAddress||'',
    respondentName:     gv('sw_rName')    ||d.respondentName||'',
    respondentAddress:  gv('sw_rAddress') ||d.respondentAddress||'',
    caseTitle:  gv('sw_caseTitle') ||d.caseTitle||'',
    schedDate:  d.schedDate||'',
    schedTime:  d.schedTime||'',
    location:   gv('sw_location')  ||d.location||'',
    chairman:   gv('sw_chairman')  ||d.chairman||'HON. ABUNDIO A. LEONES',
    lupons:     d.lupons||[],
    complainant:gv('sw_cName')||d.complainantName||'',
    respondent: gv('sw_rName')||d.respondentName||'',
  };
}

function schedWizDownloadBoth(){
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const raw=schedWizGetData();
  const data={
    caseNo:raw.caseNo, dateFiled:raw.dateFiled, timeFiled:raw.timeFiled,
    complainant:raw.complainantName, complainantAddress:raw.complainantAddress,
    respondent:raw.respondentName, respondentAddress:raw.respondentAddress,
    caseTitle:raw.caseTitle, schedDate:raw.schedDate, schedTime:raw.schedTime,
    chairman:raw.chairman
  };
  _fillKpForm8(doc,data);
  doc.addPage();
  _fillKpForm9(doc,data);
  doc.addPage();
  _fillKpForm9Page2(doc,data);
  doc.save(`KP_Forms_8_9_${data.caseNo||'sched'}.pdf`);
}

// ── Conciliation form helpers ──────────────────────────────────────────────────
function _getConcFormData(){
  // When called from the KP Forms modal preview, use the override data
  if(window._kpfConcOverride) return {...window._kpfConcOverride, isConc:true};
  const raw=state.schedWizard?schedWizGetData():schedModalGetData();
  // Also grab pangkat members from the linked case if available
  const caseId = raw._caseId || (state.schedModalFormData && state.schedModalFormData._caseId);
  const c = caseId ? state.cases.find(x=>x.id===caseId) : null;
  return {
    caseNo:raw.caseNo||'', dateFiled:raw.dateFiled||'', timeFiled:raw.timeFiled||'',
    complainant:raw.complainantName||raw.complainant||'', complainantAddress:raw.complainantAddress||'',
    respondent:raw.respondentName||raw.respondent||'', respondentAddress:raw.respondentAddress||'',
    caseTitle:raw.caseTitle||'', schedDate:raw.schedDate||'', schedTime:raw.schedTime||'',
    chairman:raw.chairman||'HON. ABUNDIO A. LEONES',
    lupons:raw.lupons||(c?[c._pangkatChair||'',c._pangkatSecretary||'',c._pangkatMember||''].filter(Boolean):[]),
    pangkatChair:     (c&&c._pangkatChair)     || raw.pangkatChair     || '',
    pangkatSecretary: (c&&c._pangkatSecretary) || raw.pangkatSecretary || '',
    pangkatMember:    (c&&c._pangkatMember)    || raw.pangkatMember    || '',
    isConc: true
  };
}
function _buildConcFormPdf(which){
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const d=_getConcFormData();
  const W=210,ml=25,mr=25,cw=W-ml-mr;
  const KP_FONT='times'; const KP_LH=6.5;
  // Helper to write centred bold heading
  function heading(text,y,sz){doc.setFont(KP_FONT,'bold');doc.setFontSize(sz||11);doc.text(text,W/2,y,{align:'center'});doc.setFont(KP_FONT,'normal');}
  function subhead(text,y){doc.setFont(KP_FONT,'italic');doc.setFontSize(9);doc.text(text,W/2,y,{align:'center'});doc.setFont(KP_FONT,'normal');}
  function fieldLine(label,value,x,y,lw,vw){
    doc.setFontSize(10);doc.setFont(KP_FONT,'normal');
    doc.text(label,x,y);
    doc.line(x+lw,y+1,x+lw+vw,y+1);
    if(value)doc.text(value,x+lw+1,y);
  }
  const schedDt=d.schedDate?new Date(d.schedDate+'T00:00:00'):null;
  const MONTHS_UC=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const sDay=schedDt?String(schedDt.getDate()):'___';
  const sMon=schedDt?MONTHS_UC[schedDt.getMonth()]:'___';
  const sYr=schedDt?String(schedDt.getFullYear()):'___';
  const sTime=_fmt12hrTime(d.schedTime||'')||'___';

  if(which==='form10'){
    let y=25;
    doc.setFontSize(10);subhead('Republic of the Philippines',y);y+=5;
    subhead('Barangay Pangabugan, City of Butuan',y);y+=5;
    subhead('Office of the Lupong Tagapamayapa',y);y+=8;
    heading('PANGKAT TAGAPAGKASUNDO',y,12);y+=6;
    heading('(KP Form 10 — Constitution of Pangkat)',y,9);y+=10;
    doc.setFontSize(10);doc.setFont(KP_FONT,'normal');
    doc.text('Complaint No.:',ml,y);doc.text(d.caseNo||'',ml+35,y);doc.line(ml+35,y+1,W-mr,y+1);y+=10;
    doc.text(`In the Matter of the complaint of ${d.complainant||'_______________________'} against ${d.respondent||'_______________________'},`,ml,y,{maxWidth:cw});y+=14;
    doc.text('the following members of the Lupon are hereby constituted as the Pangkat Tagapagkasundo:',ml,y,{maxWidth:cw});y+=12;
    const members=d.lupons&&d.lupons.length?d.lupons:['1. ___________________________','2. ___________________________','3. ___________________________'];
    members.slice(0,3).forEach((m,i)=>{doc.text(`${i+1}. ${m}`,ml+10,y);y+=8;});
    y+=8;
    doc.text(`This ${sDay} day of ${sMon}, ${sYr}.`,ml,y);y+=14;
    doc.setFont(KP_FONT,'bold');
    doc.text(d.chairman||'HON. ABUNDIO A. LEONES',W-mr,y,{align:'right'});
    doc.line(W-mr-60,y+1.5,W-mr,y+1.5);y+=5;
    doc.setFont(KP_FONT,'normal');doc.text('Punong Barangay / Lupon Chairman',W-mr,y,{align:'right'});
  } else if(which==='form11'){
    let y=25;
    subhead('Republic of the Philippines',y);y+=5;
    subhead('Barangay Pangabugan, City of Butuan',y);y+=5;
    subhead('Office of the Lupong Tagapamayapa',y);y+=8;
    heading('NOTICE TO PANGKAT MEMBERS',y,12);y+=6;
    heading('(KP Form 11 — Notice of Assignment)',y,9);y+=10;
    doc.setFontSize(10);doc.setFont(KP_FONT,'normal');
    doc.text('Complaint No.:',ml,y);doc.text(d.caseNo||'',ml+35,y);doc.line(ml+35,y+1,W-mr,y+1);y+=10;
    doc.text('You are hereby notified of your assignment as a member of the Pangkat Tagapagkasundo',ml,y,{maxWidth:cw});y+=7;
    doc.text('to hear and conciliate the following case:',ml,y);y+=10;
    doc.text(`Complainant: ${d.complainant||'______________________'}`,ml+5,y);y+=7;
    doc.text(`Respondent: ${d.respondent||'______________________'}`,ml+5,y);y+=12;
    doc.text(`This ${sDay} day of ${sMon}, ${sYr}.`,ml,y);y+=14;
    doc.setFont(KP_FONT,'bold');
    doc.text(d.chairman||'HON. ABUNDIO A. LEONES',W-mr,y,{align:'right'});
    doc.line(W-mr-60,y+1.5,W-mr,y+1.5);y+=5;
    doc.setFont(KP_FONT,'normal');doc.text('Punong Barangay / Lupon Chairman',W-mr,y,{align:'right'});
  } else if(which==='form12'){
    let y=25;
    subhead('Republic of the Philippines',y);y+=5;
    subhead('Barangay Pangabugan, City of Butuan',y);y+=5;
    subhead('Office of the Lupong Tagapamayapa',y);y+=8;
    heading('NOTICE OF HEARING — CONCILIATION',y,12);y+=6;
    heading('(KP Form 12 — Conciliation Hearing Notice)',y,9);y+=10;
    doc.setFontSize(10);doc.setFont(KP_FONT,'normal');
    doc.text('Complaint No.:',ml,y);doc.text(d.caseNo||'',ml+35,y);doc.line(ml+35,y+1,W-mr,y+1);y+=10;
    doc.text('To:',ml,y);y+=6;
    doc.text(d.complainant||'______________________',ml+10,y);y+=6;
    doc.text(d.respondent||'______________________',ml+10,y);y+=10;
    doc.text('You are hereby notified that a conciliation hearing in the above-entitled case has been',ml,y,{maxWidth:cw});y+=7;
    doc.text('scheduled as follows:',ml,y);y+=10;
    doc.text(`Date: ${sDay} day of ${sMon}, ${sYr}`,ml+10,y);y+=7;
    doc.text(`Time: ${sTime}`,ml+10,y);y+=7;
    doc.text(`Venue: Barangay Hall, Session Room`,ml+10,y);y+=10;
    doc.text('You are required to personally appear before the Pangkat Tagapagkasundo with your',ml,y,{maxWidth:cw});y+=7;
    doc.text('witnesses. Failure to appear may result in the issuance of a CFA.',ml,y,{maxWidth:cw});y+=12;
    doc.text(`This ${sDay} day of ${sMon}, ${sYr}.`,ml,y);y+=14;
    doc.setFont(KP_FONT,'bold');
    doc.text(d.chairman||'HON. ABUNDIO A. LEONES',W-mr,y,{align:'right'});
    doc.line(W-mr-60,y+1.5,W-mr,y+1.5);y+=5;
    doc.setFont(KP_FONT,'normal');doc.text('Punong Barangay / Lupon Chairman',W-mr,y,{align:'right'});
  }
  return doc;
}

function schedWizPreviewFormConc(which){
  const doc=_buildConcFormPdf(which);
  const dataUri=doc.output('datauristring');
  const win=window.open('','_blank');
  if(win){win.document.write(`<html><body style="margin:0"><iframe src="${dataUri}" style="width:100%;height:100vh;border:none"></iframe></body></html>`);win.document.close();}
  else alert('Please allow popups to preview the form.');
}
function schedWizDownloadConcForms(){
  const raw=state.schedWizard?schedWizGetData():schedModalGetData();
  const data9={
    caseNo:raw.caseNo,dateFiled:raw.dateFiled,timeFiled:raw.timeFiled,
    complainant:raw.complainantName||raw.complainant,complainantAddress:raw.complainantAddress,
    respondent:raw.respondentName||raw.respondent,respondentAddress:raw.respondentAddress,
    caseTitle:raw.caseTitle,schedDate:raw.schedDate,schedTime:raw.schedTime,
    chairman:raw.chairman||'HON. ABUNDIO A. LEONES'
  };
  const {jsPDF}=window.jspdf;
  const finalDoc=new jsPDF({unit:'mm',format:'a4'});
  _buildConcIntoDoc(finalDoc,'form10');
  finalDoc.addPage();
  _buildConcIntoDoc(finalDoc,'form11');
  finalDoc.addPage();
  _buildConcIntoDoc(finalDoc,'form12');
  finalDoc.addPage();
  _fillKpForm9(finalDoc,data9);
  finalDoc.addPage();
  _fillKpForm9Page2(finalDoc,data9);
  finalDoc.save(`KP_ConcForms_${data9.caseNo||'sched'}.pdf`);
}
function schedModalPreviewFormConc(which){
  schedWizPreviewFormConc(which);
}
function schedModalDownloadConcForms(){
  schedWizDownloadConcForms();
}
function schedWizPreviewForm_modal(which){
  // Preview form8 or form9 from schedModal context
  // If multiple med sessions exist, let user pick which session's date to use
  const d = schedModalGetData();
  const caseId = d._caseId || (state.schedModalFormData && state.schedModalFormData._caseId);
  const c = caseId ? state.cases.find(x=>x.id===caseId) : null;
  const medSessions = (c&&c._medSessions&&c._medSessions.length>1) ? c._medSessions : null;

  if(medSessions){
    // Show a small picker modal so user selects which session's date
    const old=document.getElementById('sw-session-pick-modal'); if(old)old.remove();
    const opts = medSessions.map((s,i)=>`<button onclick="schedWizPreviewFormWithDate('${which}','${s.date||''}','${(s.time||d.schedTime||'').replace(/'/g,"\\'")}')" style="width:100%;padding:8px 14px;border-radius:7px;border:1px solid #b2dfe2;background:#e6f4f5;color:#0d3d3a;font-size:13px;font-weight:600;cursor:pointer;text-align:left;margin-bottom:6px">📅 Session ${i+1} — ${s.date||'(no date)'}</button>`).join('');
    const html=`<div id="sw-session-pick-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:800;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()">
      <div style="background:#fff;border-radius:12px;width:360px;max-width:96vw;box-shadow:0 12px 40px rgba(0,0,0,0.2);overflow:hidden">
        <div style="padding:12px 18px;background:#0d3d3a;color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:space-between">
          <span>📋 Select Session for ${which==='form8'?'Form 8 – Notice':'Form 9 – Summons'}</span>
          <button onclick="document.getElementById('sw-session-pick-modal').remove()" style="border:none;background:rgba(255,255,255,0.15);color:#fff;font-size:15px;cursor:pointer;padding:2px 8px;border-radius:5px">×</button>
        </div>
        <div style="padding:16px 18px">
          <div style="font-size:12px;color:#6b7280;margin-bottom:10px">Which session date should appear in the form?</div>
          ${opts}
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend',html);
  } else {
    // Single session or no sessions — use schedDate directly
    schedWizPreviewFormWithDate(which, d.schedDate, d.schedTime);
  }
}
function schedWizPreviewFormWithDate(which, schedDate, schedTime){
  const old=document.getElementById('sw-session-pick-modal'); if(old)old.remove();
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const d=schedModalGetData();
  const data={
    caseNo:d.caseNo, dateFiled:d.dateFiled, timeFiled:d.timeFiled,
    complainant:d.complainantName||d.complainant, complainantAddress:d.complainantAddress||'',
    respondent:d.respondentName||d.respondent, respondentAddress:d.respondentAddress||'',
    caseTitle:d.caseTitle, schedDate:schedDate||d.schedDate, schedTime:schedTime||d.schedTime,
    chairman:d.chairman||'HON. ABUNDIO A. LEONES'
  };
  if(which==='form8') _fillKpForm8(doc,data);
  else _fillKpForm9(doc,data);
  const dataUri=doc.output('datauristring');
  const win=window.open('','_blank');
  if(win){win.document.write(`<html><body style="margin:0"><iframe src="${dataUri}" style="width:100%;height:100vh;border:none"></iframe></body></html>`);win.document.close();}
  else alert('Please allow popups to preview the form.');
}
function schedModalDownloadBoth(){
  const d=schedModalGetData();
  const caseId = d._caseId || (state.schedModalFormData && state.schedModalFormData._caseId);
  const c = caseId ? state.cases.find(x=>x.id===caseId) : null;
  const medSessions = (c&&c._medSessions&&c._medSessions.length>1) ? c._medSessions : null;

  if(medSessions){
    const old=document.getElementById('sw-session-pick-modal'); if(old)old.remove();
    const opts = medSessions.map((s,i)=>`<button onclick="schedModalDownloadBothWithDate('${s.date||''}','${(s.time||d.schedTime||'').replace(/'/g,"\\'")}')" style="width:100%;padding:8px 14px;border-radius:7px;border:1px solid #b2dfe2;background:#e6f4f5;color:#0d3d3a;font-size:13px;font-weight:600;cursor:pointer;text-align:left;margin-bottom:6px">📅 Session ${i+1} — ${s.date||'(no date)'}</button>`).join('');
    const html=`<div id="sw-session-pick-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:800;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()">
      <div style="background:#fff;border-radius:12px;width:360px;max-width:96vw;box-shadow:0 12px 40px rgba(0,0,0,0.2);overflow:hidden">
        <div style="padding:12px 18px;background:#0d3d3a;color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:space-between">
          <span>📋 Select Session to Download Forms 8 &amp; 9</span>
          <button onclick="document.getElementById('sw-session-pick-modal').remove()" style="border:none;background:rgba(255,255,255,0.15);color:#fff;font-size:15px;cursor:pointer;padding:2px 8px;border-radius:5px">×</button>
        </div>
        <div style="padding:16px 18px">
          <div style="font-size:12px;color:#6b7280;margin-bottom:10px">Which session date should appear in the forms?</div>
          ${opts}
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend',html);
  } else {
    schedModalDownloadBothWithDate(d.schedDate, d.schedTime);
  }
}
function schedModalDownloadBothWithDate(schedDate, schedTime){
  const old=document.getElementById('sw-session-pick-modal'); if(old)old.remove();
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const d=schedModalGetData();
  const data={
    caseNo:d.caseNo, dateFiled:d.dateFiled, timeFiled:d.timeFiled,
    complainant:d.complainantName||d.complainant, complainantAddress:d.complainantAddress||'',
    respondent:d.respondentName||d.respondent, respondentAddress:d.respondentAddress||'',
    caseTitle:d.caseTitle, schedDate:schedDate||d.schedDate, schedTime:schedTime||d.schedTime,
    chairman:d.chairman||'HON. ABUNDIO A. LEONES'
  };
  _fillKpForm8(doc,data);
  doc.addPage();
  _fillKpForm9(doc,data);
  doc.addPage();
  _fillKpForm9Page2(doc,data);
  doc.save(`KP_Forms_8_9_${data.caseNo||'sched'}.pdf`);
}
function _buildConcIntoDoc(doc,which){
  const d=_getConcFormData();
  const W=210,ml=25,mr=25,cw=W-ml-mr;
  const KP_FONT='times';
  const MONTHS_UC=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const schedDt=d.schedDate?new Date(d.schedDate+'T00:00:00'):null;
  const sDay=schedDt?String(schedDt.getDate()):'___';
  const sMon=schedDt?MONTHS_UC[schedDt.getMonth()]:'___';
  const sYr=schedDt?String(schedDt.getFullYear()):'___';
  const sTime=_fmt12hrTime(d.schedTime||'')||'___';
  function sh(text,y,sz){doc.setFont(KP_FONT,'bold');doc.setFontSize(sz||11);doc.text(text,W/2,y,{align:'center'});doc.setFont(KP_FONT,'normal');}
  function sub(text,y){doc.setFont(KP_FONT,'italic');doc.setFontSize(9);doc.text(text,W/2,y,{align:'center'});doc.setFont(KP_FONT,'normal');}
  if(which==='form10'){
    let y=25;
    sub('Republic of the Philippines',y);y+=5;sub('Barangay Pangabugan, City of Butuan',y);y+=5;sub('Office of the Lupong Tagapamayapa',y);y+=8;
    sh('PANGKAT TAGAPAGKASUNDO',y,12);y+=6;sh('(KP Form 10 — Constitution of Pangkat)',y,9);y+=10;
    doc.setFontSize(10);doc.setFont(KP_FONT,'normal');
    doc.text('Complaint No.:',ml,y);doc.text(d.caseNo||'',ml+35,y);doc.line(ml+35,y+1,W-mr,y+1);y+=10;
    doc.text(`In the Matter of the complaint of ${d.complainant||'_______________________'} against ${d.respondent||'_______________________'},`,ml,y,{maxWidth:cw});y+=14;
    doc.text('the following members of the Lupon are hereby constituted as the Pangkat Tagapagkasundo:',ml,y,{maxWidth:cw});y+=12;
    const members=d.lupons&&d.lupons.length?d.lupons:['___________________________','___________________________','___________________________'];
    members.slice(0,3).forEach((m,i)=>{doc.text(`${i+1}. ${m}`,ml+10,y);y+=8;});
    y+=8;doc.text(`This ${sDay} day of ${sMon}, ${sYr}.`,ml,y);y+=14;
    doc.setFont(KP_FONT,'bold');doc.text(d.chairman||'HON. ABUNDIO A. LEONES',W-mr,y,{align:'right'});
    doc.line(W-mr-60,y+1.5,W-mr,y+1.5);y+=5;doc.setFont(KP_FONT,'normal');doc.text('Punong Barangay / Lupon Chairman',W-mr,y,{align:'right'});
  } else if(which==='form11'){
    let y=25;
    sub('Republic of the Philippines',y);y+=5;sub('Barangay Pangabugan, City of Butuan',y);y+=5;sub('Office of the Lupong Tagapamayapa',y);y+=8;
    sh('NOTICE TO PANGKAT MEMBERS',y,12);y+=6;sh('(KP Form 11 — Notice of Assignment)',y,9);y+=10;
    doc.setFontSize(10);doc.setFont(KP_FONT,'normal');
    doc.text('Complaint No.:',ml,y);doc.text(d.caseNo||'',ml+35,y);doc.line(ml+35,y+1,W-mr,y+1);y+=10;
    doc.text('You are hereby notified of your assignment as a member of the Pangkat Tagapagkasundo',ml,y,{maxWidth:cw});y+=7;
    doc.text('to hear and conciliate the following case:',ml,y);y+=10;
    doc.text(`Complainant: ${d.complainant||'______________________'}`,ml+5,y);y+=7;
    doc.text(`Respondent: ${d.respondent||'______________________'}`,ml+5,y);y+=12;
    doc.text(`This ${sDay} day of ${sMon}, ${sYr}.`,ml,y);y+=14;
    doc.setFont(KP_FONT,'bold');doc.text(d.chairman||'HON. ABUNDIO A. LEONES',W-mr,y,{align:'right'});
    doc.line(W-mr-60,y+1.5,W-mr,y+1.5);y+=5;doc.setFont(KP_FONT,'normal');doc.text('Punong Barangay / Lupon Chairman',W-mr,y,{align:'right'});
  } else if(which==='form12'){
    let y=25;
    sub('Republic of the Philippines',y);y+=5;sub('Barangay Pangabugan, City of Butuan',y);y+=5;sub('Office of the Lupong Tagapamayapa',y);y+=8;
    sh('NOTICE OF HEARING — CONCILIATION',y,12);y+=6;sh('(KP Form 12 — Conciliation Hearing Notice)',y,9);y+=10;
    doc.setFontSize(10);doc.setFont(KP_FONT,'normal');
    doc.text('Complaint No.:',ml,y);doc.text(d.caseNo||'',ml+35,y);doc.line(ml+35,y+1,W-mr,y+1);y+=10;
    doc.text('To:',ml,y);y+=6;
    doc.text(d.complainant||'______________________',ml+10,y);y+=6;doc.text(d.respondent||'______________________',ml+10,y);y+=10;
    doc.text('You are hereby notified that a conciliation hearing in the above-entitled case has been',ml,y,{maxWidth:cw});y+=7;
    doc.text('scheduled as follows:',ml,y);y+=10;
    doc.text(`Date: ${sDay} day of ${sMon}, ${sYr}`,ml+10,y);y+=7;
    doc.text(`Time: ${sTime}`,ml+10,y);y+=7;
    doc.text(`Venue: Barangay Hall, Session Room`,ml+10,y);y+=10;
    doc.text('You are required to personally appear before the Pangkat Tagapagkasundo with your',ml,y,{maxWidth:cw});y+=7;
    doc.text('witnesses. Failure to appear may result in the issuance of a CFA.',ml,y,{maxWidth:cw});y+=12;
    doc.text(`This ${sDay} day of ${sMon}, ${sYr}.`,ml,y);y+=14;
    doc.setFont(KP_FONT,'bold');doc.text(d.chairman||'HON. ABUNDIO A. LEONES',W-mr,y,{align:'right'});
    doc.line(W-mr-60,y+1.5,W-mr,y+1.5);y+=5;doc.setFont(KP_FONT,'normal');doc.text('Punong Barangay / Lupon Chairman',W-mr,y,{align:'right'});
  }
}
function schedWizPreviewForm(which){
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const raw=schedWizGetData();
  const data={
    caseNo:raw.caseNo, dateFiled:raw.dateFiled, timeFiled:raw.timeFiled,
    complainant:raw.complainantName, complainantAddress:raw.complainantAddress,
    respondent:raw.respondentName, respondentAddress:raw.respondentAddress,
    caseTitle:raw.caseTitle, schedDate:raw.schedDate, schedTime:raw.schedTime,
    chairman:raw.chairman
  };
  if(which==='form8') _fillKpForm8(doc,data);
  else _fillKpForm9(doc,data);
  const dataUri=doc.output('datauristring');
  const win=window.open('','_blank');
  if(win){
    win.document.write(`<html><body style="margin:0"><iframe src="${dataUri}" style="width:100%;height:100vh;border:none"></iframe></body></html>`);
    win.document.close();
  } else {alert('Please allow popups to preview the form.');}
  ['form8','form9'].forEach(f=>{
    const btn=document.getElementById('swbtn-'+f);
    if(btn){btn.classList.toggle('active',f===which);}
  });
}
function schedWizBack(){state.schedWizard.step--;state.calPopup=null;render();}

function schedWizNext(){
  const w=state.schedWizard;
  if(w.step===1){
    // Step 1 is only for new standalone schedules (not linked to existing case)
    w.data.caseNo=g('sw_caseNo')||w.data.caseNo;
    w.data.complainantName=g('sw_cName');w.data.complainantContact=g('sw_cContact');w.data.complainantAddress=g('sw_cAddress');
    w.data.respondentName=g('sw_rName');w.data.respondentContact=g('sw_rContact');w.data.respondentAddress=g('sw_rAddress');
    if(!w.data.complainantName){alert('Complainant name is required.');return;}
    if(!w.data.respondentName){alert('Respondent name is required.');return;}
    w.step=2;state.calPopup=null;
  } else if(w.step===2){
    w.data.caseTitle=g('sw_caseTitle');w.data.location=g('sw_location');
    w.data.chairman=g('sw_chairman')||'HON. ABUNDIO A. LEONES';
    w.data.timeFiled=g('sw_timeFiled');
    // Capture party info if this is a new standalone schedule
    if(w.data._isNewCase&&!w.data._caseId){
      w.data.complainantName=g('sw_cName')||w.data.complainantName||'';
      w.data.complainantContact=g('sw_cContact')||w.data.complainantContact||'';
      w.data.complainantAddress=g('sw_cAddress')||w.data.complainantAddress||'';
      w.data.respondentName=g('sw_rName')||w.data.respondentName||'';
      w.data.respondentContact=g('sw_rContact')||w.data.respondentContact||'';
      w.data.respondentAddress=g('sw_rAddress')||w.data.respondentAddress||'';
      if(!w.data.complainantName){alert('Complainant name is required.');return;}
      if(!w.data.respondentName){alert('Respondent name is required.');return;}
    }
    if(!w.data.schedDate){alert('Please select a date.');return;}
    if(!w.data.schedTime){alert('Please select a time slot.');return;}
    w.step=3;state.calPopup=null;
  } else if(w.step===3){
    const d=w.data;
    // If this is a new standalone schedule, auto-create a complaint with Ongoing status
    if(d._isNewCase && !d._caseId){
      const newCase={
        id:genId(),
        caseNo:d.caseNo,
        dateFiled:d.dateFiled||todayStr(),
        timeFiled:d.timeFiled||'',
        complainant:d.complainantName,complainantContact:d.complainantContact||'',complainantAddress:d.complainantAddress||'',
        respondent:d.respondentName,respondentContact:d.respondentContact||'',respondentAddress:d.respondentAddress||'',
        caseTitle:d.caseTitle||'',nature:d.nature||'',type:d.nature||d.caseTitle||'',
        actionTaken:'',dateConfrontation:d.schedDate||'',dateResolved:'',
        status:'Ongoing',mediator:'',remarks:'',attachments:[]
      };
      state.cases.push(newCase);
      saveData('ltia_cases',state.cases);
      d._caseId=newCase.id;
    }
    const rec={id:genId(),caseNo:d.caseNo,dateFiled:d.dateFiled,
      complainant:d.complainantName,complainantContact:d.complainantContact,complainantAddress:d.complainantAddress,
      respondent:d.respondentName,respondentContact:d.respondentContact,respondentAddress:d.respondentAddress,
      caseTitle:d.caseTitle,schedDate:d.schedDate,schedTime:d.schedTime,location:d.location,
      chairman:d.chairman||'HON. ABUNDIO A. LEONES',timeFiled:d.timeFiled,
      lupons:d.lupons||[],_caseId:d._caseId||null};
    state.schedules.push(rec);
    saveData('ltia_schedules',state.schedules);
    state.schedWizard=null;state.calPopup=null;
    // Navigate to dashboard so the new Ongoing case is visible
    state.page='dashboard';
    state.filterStatCard=null;
    // Open KP Forms print preview with saved schedule data
    state.kpFormsData={
      caseNo: rec.caseNo,
      dateFiled: rec.dateFiled,
      timeFiled: rec.timeFiled,
      complainant: rec.complainant,
      complainantAddress: rec.complainantAddress||'',
      respondent: rec.respondent,
      respondentAddress: rec.respondentAddress||'',
      caseTitle: rec.caseTitle,
      schedDate: rec.schedDate,
      schedTime: rec.schedTime,
      chairman: rec.chairman||'HON. ABUNDIO A. LEONES',
      officer: 'RAMIL  ROSALES'
    };
    render();return;
  }
  render();
}

function getDateLoad(dateStr){return state.schedules.filter(s=>s.schedDate===dateStr).length;}
function calClass(count){if(count===0)return 'available';if(count<=2)return 'available';if(count<=3)return 'limited';return 'full';}
function toggleCalPopup(which){
  state.calPopup=state.calPopup===which?null:which;
  const selDate=state.schedWizard&&state.schedWizard.data.schedDate;
  const dateFiled=state.schedWizard&&state.schedWizard.data.dateFiled;
  // Navigate to: selected date > dateFiled month > current month
  const navFrom=selDate||dateFiled||null;
  if(navFrom){const dt=new Date(navFrom+'T00:00:00');state.calViewYear=dt.getFullYear();state.calViewMonth=dt.getMonth();}
  else{state.calViewYear=new Date().getFullYear();state.calViewMonth=new Date().getMonth();}
  render();
}
function calNav(dir){
  state.calViewMonth+=dir;
  if(state.calViewMonth>11){state.calViewMonth=0;state.calViewYear++;}
  if(state.calViewMonth<0){state.calViewMonth=11;state.calViewYear--;}
  render();
}
function selectCalDate(dateStr){state.schedWizard.data.schedDate=dateStr;state.calPopup='time';render();}
function selectTimeSlot(t){state.schedWizard.data.schedTime=t;state.calPopup=null;render();}
function toggleLupon(name){
  const lupons=state.schedWizard.data.lupons||[];
  const idx=lupons.indexOf(name);
  if(idx>-1)lupons.splice(idx,1);else lupons.push(name);
  state.schedWizard.data.lupons=[...lupons];render();
}
function renderCalendar(){
  const yr=state.calViewYear,mo=state.calViewMonth;
  const firstDay=new Date(yr,mo,1).getDay(),daysInMonth=new Date(yr,mo+1,0).getDate();
  const today=new Date();
  const ts=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const selected=state.schedWizard&&state.schedWizard.data.schedDate;

  // 15-day window from dateFiled
  const dateFiled=state.schedWizard&&state.schedWizard.data.dateFiled;
  let windowStart='', windowEnd='';
  if(dateFiled){
    const filedMs=new Date(dateFiled+'T00:00:00').getTime();
    windowStart=dateFiled;
    windowEnd=new Date(filedMs+15*24*60*60*1000).toISOString().slice(0,10);
  }
  const hasWindow=windowStart&&windowEnd;

  let cells='';
  for(let i=0;i<firstDay;i++)cells+=`<div class="cal-day empty"></div>`;
  for(let d=1;d<=daysInMonth;d++){
    const ds=`${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isDeadline=hasWindow&&ds===windowEnd;
    const inWindow=hasWindow&&ds>=windowStart&&ds<=windowEnd;
    const outWindow=hasWindow&&!inWindow;
    const extraClass=isDeadline?'deadline-day':inWindow?'in-window':outWindow?'out-window':'';
    const onclick=outWindow?'':`onclick="selectCalDate('${ds}')"`;
    cells+=`<button class="cal-day ${calClass(getDateLoad(ds))} ${ds===ts?'today':''} ${ds===selected?'selected':''} ${extraClass}" ${onclick}>${d}</button>`;
  }

  const deadlineBanner=hasWindow?`<div class="cal-deadline-banner">
    ⏰ <strong>15-day window:</strong> ${windowStart} → <strong>${windowEnd}</strong><br>
    <span style="opacity:0.8">KP requires hearing within 15 days of filing.</span>
  </div>`:'';

  return `<div class="cal-popup" onclick="event.stopPropagation()">
    <div style="font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:${hasWindow?'6px':'10px'}">Select Date</div>
    ${deadlineBanner}
    <div class="cal-header">
      <button class="cal-nav" onclick="calNav(-1)">‹</button>
      <span class="cal-month-label">${MONTHS[mo]} ${yr}</span>
      <button class="cal-nav" onclick="calNav(1)">›</button>
    </div>
    <div class="cal-days-header">${['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>`<span>${d}</span>`).join('')}</div>
    <div class="cal-days">${cells}</div>
    <div class="cal-legend">
      <div class="cal-legend-item"><div class="cal-legend-dot" style="background:rgba(34,197,94,0.4)"></div>Available</div>
      <div class="cal-legend-item"><div class="cal-legend-dot" style="background:rgba(251,191,36,0.4)"></div>Limited</div>
      <div class="cal-legend-item"><div class="cal-legend-dot" style="background:rgba(239,68,68,0.4)"></div>Full</div>
      ${hasWindow?`<div class="cal-legend-item"><div class="cal-legend-dot" style="outline:2px solid rgba(200,150,12,0.7);background:transparent"></div>In window</div>`:''}
      ${hasWindow?`<div class="cal-legend-item"><div class="cal-legend-dot" style="background:rgba(200,150,12,0.35)"></div>Deadline</div>`:''}
    </div>
  </div>`;
}
function renderTimePopup(){
  const sel=state.schedWizard&&state.schedWizard.data.schedTime;
  const selDate=state.schedWizard&&state.schedWizard.data.schedDate;
  const avail=Math.max(0,4-(selDate?getDateLoad(selDate):0));
  return `<div class="time-popup" onclick="event.stopPropagation()">
    <div class="time-label">Select Time Slot</div>
    <div class="time-slots">${TIME_SLOTS.map(t=>`<button class="time-slot${t===sel?' selected':''}" onclick="selectTimeSlot('${t}')">${t}</button>`).join('')}</div>
    <div class="time-note">${avail} slots available on this day (max 4)</div>
  </div>`;
}

function renderSchedWizard(){
  const w=state.schedWizard; if(!w)return'';
  const {step,data}=w;
  const isNew=data._isNewCase&&!data._caseId;
  // step 2 = schedule details, step 3 = confirm
  const s1done=step>2, s1active=step===2, s2active=step===3;
  const stepper=`<div class="stepper">
    <div class="step-item"><div class="step-circle ${s1done?'done':s1active?'active':''}">${s1done?'✓':'1'}</div><div class="step-lbl${s1active?' active':''}">Schedule<br>Details</div></div>
    <div class="step-line${s1done?' done':''}"></div>
    <div class="step-item"><div class="step-circle ${s2active?'active':''}">${s2active?'2':'2'}</div><div class="step-lbl${s2active?' active':''}">Confirm &amp;<br>Save</div></div>
  </div>`;
  let body='';
  if(step===2){
    const selDate=data.schedDate,selTime=data.schedTime,selectedLupons=data.lupons||[];
    const caseTitles=getCaseTitles();
    body=`
    ${isNew
      ?`<div style="padding:10px 14px;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;font-size:12px;color:#2e7d32;margin-bottom:14px">
          🆕 <strong>New Complaint</strong> — Auto Case No.: <strong>${escHtml(data.caseNo||'')}</strong> · Status: <strong>Ongoing</strong>
        </div>
        <div class="wiz-section" style="margin-bottom:14px">
          <div class="wiz-sec-title">Parties Involved</div>
          <div class="wiz-party">
            <div class="party-badge"><div class="party-avatar c">C</div><span class="party-tag c">Complainant</span></div>
            <div class="wiz-row">
              <div class="wiz-group"><label class="wiz-lbl">Full Name</label><input class="wiz-input" id="sw_cName" value="${escHtml(data.complainantName||'')}" placeholder="e.g Juan Dela Cruz" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase"></div>
              <div class="wiz-group"><label class="wiz-lbl">Contact No.</label><input class="wiz-input" id="sw_cContact" value="${escHtml(data.complainantContact||'')}" placeholder="e.g 09XXXXXXXXX"></div>
            </div>
            <div class="wiz-group" style="margin-top:8px"><label class="wiz-lbl">Address</label><input class="wiz-input" id="sw_cAddress" value="${escHtml(data.complainantAddress||'')}" placeholder="Block, Lot, Street, Barangay"></div>
          </div>
          <div class="wiz-party">
            <div class="party-badge"><div class="party-avatar r">R</div><span class="party-tag r">Respondent</span></div>
            <div class="wiz-row">
              <div class="wiz-group"><label class="wiz-lbl">Full Name</label><input class="wiz-input" id="sw_rName" value="${escHtml(data.respondentName||'')}" placeholder="e.g Juan Dela Cruz" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase"></div>
              <div class="wiz-group"><label class="wiz-lbl">Contact No.</label><input class="wiz-input" id="sw_rContact" value="${escHtml(data.respondentContact||'')}" placeholder="e.g 09XXXXXXXXX"></div>
            </div>
            <div class="wiz-group" style="margin-top:8px"><label class="wiz-lbl">Address</label><input class="wiz-input" id="sw_rAddress" value="${escHtml(data.respondentAddress||'')}" placeholder="Block, Lot, Street, Barangay"></div>
          </div>
        </div>`
      :`<div style="padding:8px 14px;background:#e6f4f5;border:1px solid #b2dfe2;border-radius:8px;font-size:12px;color:#0d3d3a;margin-bottom:14px">
          📄 Scheduling for: <strong>${escHtml(data.caseNo||'')}</strong> — ${escHtml(data.complainantName||'')} vs ${escHtml(data.respondentName||'')}
        </div>`}
    <div class="wiz-section">
      <div class="wiz-sec-title">Case Information</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="wiz-group">
          <label class="wiz-lbl">Case Title</label>
          <div style="display:flex;gap:6px">
            <select class="wiz-input" id="sw_caseTitle" style="flex:1">
              <option value="">Select...</option>
              ${caseTitles.map(t=>`<option value="${escHtml(t)}"${data.caseTitle===t?' selected':''}>${escHtml(t)}</option>`).join('')}
            </select>
            <button type="button" onclick="addCustomCaseTitleSched()" title="Add new case title" style="padding:0 10px;border:1px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;font-size:16px;color:#14919b;flex-shrink:0">＋</button>
          </div>
        </div>
        <div class="wiz-group"><label class="wiz-lbl">Time Filed (TF)</label>
          <input type="time" class="wiz-input" id="sw_timeFiled" value="${escHtml(data.timeFiled||'')}">
        </div>
      </div>
    </div>
    <div class="wiz-section">
      <div class="wiz-sec-title">Hearing Schedule</div>
      ${(()=>{
        const filed=data.dateFiled;
        if(!filed) return '';
        const filedMs=new Date(filed+'T00:00:00').getTime();
        const deadline=new Date(filedMs+15*24*60*60*1000).toISOString().slice(0,10);
        const today=todayStr();
        const daysLeft=Math.round((new Date(deadline+'T00:00:00')-new Date(today+'T00:00:00'))/86400000);
        const isOver=daysLeft<0, isDue=daysLeft===0, isUrgent=daysLeft>=0&&daysLeft<=3;
        const bg=isOver?'#feecec':isDue||isUrgent?'#fff4e0':'#f0fafa';
        const border=isOver?'#fbbaba':isDue||isUrgent?'#ffe082':'#b2e0e0';
        const color=isOver?'#b93232':isDue||isUrgent?'#9a6200':'#0a7075';
        const icon=isOver?'⚠️':isDue?'🔔':isUrgent?'⏰':'📅';
        const msg=isOver?`Deadline passed ${Math.abs(daysLeft)} day${Math.abs(daysLeft)===1?'':'s'} ago (${deadline})`:isDue?`Deadline is TODAY — ${deadline}`:isUrgent?`${daysLeft} day${daysLeft===1?'':'s'} left — deadline ${deadline}`:`Hearing must be scheduled by <strong>${deadline}</strong> (${daysLeft} days from now)`;
        return `<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:${bg};border:1px solid ${border};border-radius:8px;font-size:12px;color:${color};margin-bottom:10px">
          <span style="font-size:15px;flex-shrink:0">${icon}</span>
          <div><strong>15-day KP window</strong> · Filed: ${filed} → ${msg}</div>
        </div>`;
      })()}
      <div style="background:#fff;border-radius:8px;padding:14px;border:1px solid var(--border)">
        <div class="wiz-row" style="margin-bottom:12px">
          <div class="wiz-group"><label class="wiz-lbl">Hearing Date</label>
            <div class="cal-wrap">
              <button class="cal-trigger" type="button" onclick="toggleCalPopup('date')">
                ${selDate?`<span>${selDate}</span>`:`<span class="cal-trigger-placeholder">Select date</span>`}
              </button>
              ${state.calPopup==='date'?renderCalendar():''}
            </div>
          </div>
          <div class="wiz-group"><label class="wiz-lbl">Hearing Time</label>
            <div class="cal-wrap">
              <button class="cal-trigger" type="button" onclick="toggleCalPopup('time')">
                ${selTime?`<span>${selTime}</span>`:`<span class="cal-trigger-placeholder">Select time</span>`}
              </button>
              ${state.calPopup==='time'?renderTimePopup():''}
            </div>
          </div>
        </div>
        <div class="wiz-row">
          <div class="wiz-group"><label class="wiz-lbl">Location / Venue</label>
            <input class="wiz-input" id="sw_location" value="${escHtml(data.location||'')}" placeholder="e.g Barangay Hall, Session Room">
          </div>
          <div class="wiz-group"><label class="wiz-lbl">Punong Barangay / Lupon Chairman</label>
            <input class="wiz-input" id="sw_chairman" value="${escHtml(data.chairman||'HON. ABUNDIO A. LEONES')}" placeholder="Full name of chairman">
          </div>
        </div>
      </div>
    </div>
    <div class="wiz-section">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div class="wiz-sec-title" style="margin-bottom:0">Lupon Members Attending</div>
        <button onclick="wizAddLupon()" style="display:flex;align-items:center;gap:5px;padding:5px 11px;border-radius:7px;background:#e0f4f4;color:#14919b;border:1px solid #b2e0e0;font-size:12px;font-weight:600;cursor:pointer">＋ Add Member</button>
      </div>
      <div class="lupon-box">
        ${selectedLupons.length===0
          ?`<div style="text-align:center;padding:18px;color:#9ba3ae;font-size:12px">No lupon members added yet. Click &ldquo;＋ Add Member&rdquo; to add.</div>`
          :`<div style="display:flex;flex-direction:column;gap:6px">
          ${selectedLupons.map((m,idx)=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f0fafa;border:1px solid #d0eeee;border-radius:8px;font-size:13px">
            <span style="display:flex;align-items:center;gap:8px"><span style="color:#14919b;font-weight:700">✓</span>${escHtml(m)}</span>
            <button onclick="wizRemoveLupon(${idx})" style="padding:3px 9px;border-radius:5px;background:#fff5f5;color:#c0392b;border:1px solid #fbbaba;font-size:11px;font-weight:600;cursor:pointer">− Remove</button>
          </div>`).join('')}
          </div>`}
      </div>
    </div>`;
  } else {
    const d=data;
    body=`<div class="wiz-section">
      <div style="font-size:13px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.7px;margin-bottom:16px">Review &amp; Confirm</div>
      <div class="confirm-group"><div class="confirm-group-title">Case Reference</div>
        <div class="confirm-row"><span class="confirm-key">Case Number</span><span class="confirm-val">${escHtml(d.caseNo||'---')}</span></div>
        <div class="confirm-row"><span class="confirm-key">Date Filed</span><span class="confirm-val">${escHtml(d.dateFiled||'---')}</span></div>
      </div>
      <div class="confirm-group"><div class="confirm-group-title">Parties</div>
        <div class="confirm-row"><span class="confirm-key">Complainant</span><span class="confirm-val">${escHtml(d.complainantName||'---')}</span></div>
        <div class="confirm-row"><span class="confirm-key">Respondent</span><span class="confirm-val">${escHtml(d.respondentName||'---')}</span></div>
      </div>
      <div class="confirm-group"><div class="confirm-group-title">Schedule Details</div>
        <div class="confirm-row"><span class="confirm-key">Case Title</span><span class="confirm-val">${escHtml(d.caseTitle||'---')}</span></div>
        <div class="confirm-row"><span class="confirm-key">Hearing Date</span><span class="confirm-val">${escHtml(d.schedDate||'---')}</span></div>
        <div class="confirm-row"><span class="confirm-key">Hearing Time</span><span class="confirm-val">${escHtml(d.schedTime||'---')}</span></div>
        <div class="confirm-row"><span class="confirm-key">Location</span><span class="confirm-val">${escHtml(d.location||'---')}</span></div>
        <div class="confirm-row"><span class="confirm-key">Chairman</span><span class="confirm-val">${escHtml(d.chairman||'HON. ABUNDIO A. LEONES')}</span></div>
        <div class="confirm-row"><span class="confirm-key">Lupon Members</span><span class="confirm-val" style="font-size:12px">${escHtml((d.lupons||[]).join(', ')||'None selected')}</span></div>
      </div>
      ${isNew?`<div style="padding:10px 14px;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;font-size:12px;color:#2e7d32;margin-bottom:12px">
        ✅ A new complaint <strong>${escHtml(d.caseNo||'')}</strong> will be created with <strong>Ongoing</strong> status and shown on the Dashboard.
      </div>`:''}
      ${(()=>{
        const isConc=(data._phase||'med')==='conc';
        const phaseLabel=isConc?'Conciliation':'Mediation';
        const phaseBg=isConc?'#f3e8ff':'#e0f4f4';
        const phaseBorder=isConc?'#c4b5fd':'#b2e0e0';
        const phaseColor=isConc?'#7c3aed':'#14919b';
        const phaseIcon=isConc?'⚖️':'🤝';
        if(isConc){
          return `<div style="margin-bottom:10px;padding:8px 14px;background:${phaseBg};border:1px solid ${phaseBorder};border-radius:8px;font-size:12px;color:${phaseColor};font-weight:600;display:flex;align-items:center;gap:7px">
            ${phaseIcon} <strong>Conciliation Phase</strong> — Forms to print: Form 10, Form 11, Form 12 &amp; Form 9 (Summons)
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-top:4px">
            <button onclick="schedWizPreviewFormConc('form10')" style="padding:9px 6px;border-radius:8px;border:1px solid #c4b5fd;background:#f3e8ff;color:#14919b;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px">📋 Form 10</button>
            <button onclick="schedWizPreviewFormConc('form11')" style="padding:9px 6px;border-radius:8px;border:1px solid #c4b5fd;background:#f3e8ff;color:#14919b;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px">📋 Form 11</button>
            <button onclick="schedWizPreviewFormConc('form12')" style="padding:9px 6px;border-radius:8px;border:1px solid #c4b5fd;background:#f3e8ff;color:#14919b;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px">📋 Form 12</button>
            <button onclick="schedWizPreviewForm('form9')" style="padding:9px 6px;border-radius:8px;border:1px solid #b2dfe2;background:#e6f4f5;color:#0d3d3a;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px">👁 Form 9</button>
          </div>
          <div style="margin-top:8px">
            <button onclick="schedWizDownloadConcForms()" style="width:100%;padding:9px 10px;border-radius:8px;border:none;background:var(--navy);color:#fff;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">⬇ Download All Conciliation Forms</button>
          </div>`;
        } else {
          return `<div style="margin-bottom:10px;padding:8px 14px;background:${phaseBg};border:1px solid ${phaseBorder};border-radius:8px;font-size:12px;color:${phaseColor};font-weight:600;display:flex;align-items:center;gap:7px">
            ${phaseIcon} <strong>Mediation Phase</strong> — Forms to print: Form 8 (Notice of Hearing) &amp; Form 9 (Summons)
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:4px">
            <button onclick="schedWizPreviewForm('form8')" style="padding:9px 10px;border-radius:8px;border:1px solid #b2dfe2;background:#e6f4f5;color:#0d3d3a;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">👁 Preview Form 8</button>
            <button onclick="schedWizPreviewForm('form9')" style="padding:9px 10px;border-radius:8px;border:1px solid #b2dfe2;background:#e6f4f5;color:#0d3d3a;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">👁 Preview Form 9</button>
            <button onclick="schedWizDownloadBoth()" style="padding:9px 10px;border-radius:8px;border:none;background:var(--navy);color:#fff;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">⬇ Download Both</button>
          </div>`;
        }
      })()}
    </div>`;
  }
  return `<div class="wiz-overlay" onclick="if(event.target===this)closeSchedWizard()">
    <div class="wiz-box">
      <div class="wiz-body">${stepper}${body}</div>
      <div class="wiz-footer">
        <span class="wiz-step-lbl">Step ${step===2?1:2} of 2</span>
        <div class="wiz-footer-right">
          ${step===3?`<button class="btn-wiz-back" onclick="schedWizBack()">← Back</button>`:`<button class="btn-wiz-back" onclick="closeSchedWizard()">Cancel</button>`}
          ${step===3?`<button class="btn-wiz-save" onclick="schedWizNext()">💾 Save Schedule</button>`:`<button class="btn-wiz-next" onclick="schedWizNext()">Next →</button>`}
        </div>
      </div>
    </div>
  </div>`;
}

// ─── REPORTS PAGE ────────────────────────────────────────────────────────────
function renderReport(){
  const yr=state.reportYear; // may be 'all'
  const isAll=yr==='all';

  // Build year list from actual case data + current year, newest first
  const realYr=new Date().getFullYear();
  const caseYears=state.cases.map(c=>parseInt((c.dateFiled||c.caseNo||'').slice(0,4))).filter(y=>!isNaN(y)&&y>1989);
  const allYearSet=new Set([realYr,...caseYears]);
  const years=[...allYearSet].sort((a,b)=>b-a).map(String);
  const allCases=state.cases;
  const yrCases=isAll?allCases:allCases.filter(c=>(c.dateFiled||'').startsWith(yr));
  const settled=isAll
    ?allCases.filter(c=>c.status==='Settled')
    :allCases.filter(c=>c.status==='Settled'&&settledDate(c).startsWith(yr));
  const ongoing=allCases.filter(c=>c.status==='Ongoing');
  const cfa=allCases.filter(c=>c.status==='CFA');
  const rate=yrCases.length?Math.round(settled.length/yrCases.length*100):0;

  // Case Title breakdown
  const titleCount={};
  yrCases.forEach(c=>{const t=c.caseTitle||c.type||'Uncategorized';titleCount[t]=(titleCount[t]||0)+1;});
  const maxTitle=Math.max(1,...Object.values(titleCount));

  // Monthly settled — for All Years, aggregate across all years per month
  const monthData=Array(12).fill(0);
  settled.forEach(c=>{const m=parseInt(settledDate(c).slice(5,7));if(m>=1&&m<=12)monthData[m-1]++;});
  const maxMonth=Math.max(1,...monthData);

  // Status counts — always all-time
  const statusCount={'Ongoing':0,'CFA':0,'Settled':0};
  allCases.forEach(c=>{const s=c.status||'Ongoing';if(s in statusCount)statusCount[s]++;});

  const schYr=isAll?state.schedules:state.schedules.filter(s=>(s.schedDate||'').startsWith(yr));
  const yrLabel=isAll?'All Years':yr;

  return `
  <div class="page-header">
    <div><div class="page-title">Reports</div><div class="page-sub">Case analytics and summary</div></div>
    <div class="hdr-actions">
      <div class="year-sel" style="margin-right:4px">
        <select onchange="setReportYear(this.value)">
            <option value="all"${yr==='all'?' selected':''}>All Years</option>
            ${years.map(y=>`<option value="${y}"${yr===y?' selected':''}>${y}</option>`).join('')}
          </select>
      </div>
    </div>
  </div>
  <div class="report-stat-grid" style="grid-template-columns:repeat(4,1fr)">
    <div class="report-stat"><div class="report-stat-label">Total Cases (${yrLabel})</div><div class="report-stat-val">${yrCases.length}</div><div class="report-stat-sub">${allCases.length} all-time</div></div>
    <div class="report-stat"><div class="report-stat-label">Settled (${yrLabel})</div><div class="report-stat-val" style="color:#0d3d3a">${settled.length}</div><div class="report-stat-sub">${rate}% settlement rate</div></div>
    <div class="report-stat"><div class="report-stat-label">Ongoing</div><div class="report-stat-val" style="color:#0d3d3a">${ongoing.length}</div><div class="report-stat-sub">Active complaints</div></div>
    <div class="report-stat"><div class="report-stat-label">CFA Issued</div><div class="report-stat-val" style="color:#14919b">${cfa.length}</div><div class="report-stat-sub">Certificate to File Action</div></div>
  </div>
  <div class="two-col">
    <div class="card" style="padding:18px">
      <div class="card-title" style="margin-bottom:14px">Case Title Breakdown (${yrLabel})</div>
      ${Object.keys(titleCount).length ? `
      <div style="display:flex;flex-direction:column;gap:0">
        ${Object.entries(titleCount).sort((a,b)=>b[1]-a[1]).map(([t,n])=>{
          const pct=yrCases.length?Math.round(n/yrCases.length*100):0;
          const barW=Math.round(n/maxTitle*100);
          return `<div style="display:grid;grid-template-columns:1fr auto;align-items:center;padding:9px 0;border-bottom:1px solid #f0f2f5;gap:10px">
            <div style="display:flex;align-items:center;gap:0;min-width:0">
              <span style="font-size:12px;color:#0d2137;font-weight:500;white-space:nowrap;flex-shrink:0">${escHtml(t)}</span>
              <span style="flex:1;border-bottom:2px dotted #d1d5db;margin:0 8px;min-width:12px;position:relative;top:-1px"></span>
              <div style="width:100px;height:10px;background:#e5e7eb;border-radius:20px;overflow:hidden;flex-shrink:0">
                <div style="height:100%;width:${barW}%;background:var(--teal);border-radius:20px;transition:width 0.4s"></div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
              <span style="font-size:12px;font-weight:600;color:#14919b;min-width:34px;text-align:right">${pct}%</span>
              <span style="font-size:12px;font-weight:700;color:var(--navy);min-width:20px;text-align:right">(${n})</span>
            </div>
          </div>`;
        }).join('')}
        <div style="padding-top:8px;font-size:11px;color:var(--text3);text-align:right">Total: ${yrCases.length} case(s)</div>
      </div>` :
      `<div style="color:var(--text3);font-size:13px;text-align:center;padding:24px 0">No data for ${yrLabel}</div>`}
    </div>
    <div class="card" style="padding:18px">
      <div class="card-title" style="margin-bottom:14px">Monthly Settled Cases (${yrLabel})</div>
      <div class="bar-chart">${MONTHS.map((m,i)=>`
        <div class="bar-row"><div class="bar-label">${m.slice(0,3)}</div><div class="bar-track"><div class="bar-fill" style="width:${monthData[i]?Math.round(monthData[i]/maxMonth*100):0}%"></div></div><div class="bar-count">${monthData[i]}</div></div>`).join('')}
      </div>
    </div>
  </div>
  <div style="margin-top:16px" class="two-col">
    <div class="card" style="padding:18px">
      <div class="card-title" style="margin-bottom:14px">Case Status Overview (All Time)</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${Object.entries(statusCount).map(([s,n])=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--surface2);border-radius:8px;font-size:13px">
          <span>${statusBadge(s)}</span>
          <strong style="font-size:18px">${n}</strong>
        </div>`).join('')}
      </div>
    </div>
    <div class="card" style="padding:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div class="card-title">Schedules (${yrLabel})</div>
        <span style="font-size:22px;font-weight:700;color:var(--navy)">${schYr.length}</span>
      </div>
      ${(()=>{
        // Separate ongoing vs other schedules
        const ongoingSchedIds=new Set(ongoing.map(c=>c.id));
        const ongoingScheds=schYr.filter(s=>ongoingSchedIds.has(s._caseId)||ongoing.find(c=>c.caseNo===s.caseNo));
        const otherScheds=schYr.filter(s=>!ongoingSchedIds.has(s._caseId)&&!ongoing.find(c=>c.caseNo===s.caseNo));

        const renderSchedItem=(s,isOngoing)=>`
        <div onclick="showSchedDetail('${s.id}')" title="Click to view hearing details" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border:1px solid ${isOngoing?'#fbbf24':'var(--border)'};border-radius:8px;cursor:pointer;transition:background 0.15s;background:${isOngoing?'#fffbeb':'#fff'}" onmouseover="this.style.background='${isOngoing?'#fef3c7':'#e8f6f7'}';this.style.borderColor='${isOngoing?'#14919b':'#6dd4da'}'" onmouseout="this.style.background='${isOngoing?'#fffbeb':'#fff'}';this.style.borderColor='${isOngoing?'#fbbf24':'var(--border)'}'" >
          <div style="display:flex;align-items:center;gap:8px;min-width:0">
            <span style="font-size:16px;flex-shrink:0">${isOngoing?'⏳':'📅'}</span>
            <div style="min-width:0">
              <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
                <span style="font-size:12px;font-weight:600;color:#0d2137;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(s.caseNo||'—')}</span>
                ${isOngoing?`<span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;background:#fff4e0;color:#0d3d3a;flex-shrink:0">Ongoing</span>`:''}
              </div>
              <div style="font-size:11px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(s.caseTitle||'—')}</div>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0;margin-left:10px">
            <div style="font-size:12px;font-weight:600;color:#14919b">${escHtml(s.schedDate||'—')}</div>
            <div style="font-size:11px;color:#6b7280">${escHtml(s.schedTime||'')}</div>
          </div>
        </div>`;

        if(!schYr.length) return `<div style="color:var(--text3);font-size:13px;text-align:center;padding:24px 0">No schedules in ${yrLabel}</div>`;

        let html='<div style="display:flex;flex-direction:column;gap:4px">';
        if(ongoingScheds.length){
          html+=`<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#0d3d3a;margin:6px 0 4px;padding:0 2px">⏳ Ongoing Hearings (${ongoingScheds.length})</div>`;
          html+=ongoingScheds.map(s=>renderSchedItem(s,true)).join('');
        }
        if(otherScheds.length){
          if(ongoingScheds.length) html+=`<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:var(--text3);margin:10px 0 4px;padding:0 2px">📋 Other Schedules (${otherScheds.length})</div>`;
          html+=otherScheds.map(s=>renderSchedItem(s,false)).join('');
        }
        html+='</div>';
        return html;
      })()}
    </div>
  </div>`;
}
function setReportYear(y){state.reportYear=y;render();}
function exportReportExcel(){
  const yr=state.reportYear;
  const isAll=yr==='all';
  const label=isAll?'All_Years':yr;
  const wb=XLSX.utils.book_new();
  const casesData=isAll?state.cases:state.cases.filter(c=>(c.dateFiled||'').startsWith(yr));
  const schedsData=isAll?state.schedules:state.schedules.filter(s=>(s.schedDate||'').startsWith(yr));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(casesData),`Cases ${label}`);
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(schedsData),`Schedules ${label}`);
  XLSX.writeFile(wb,`ltia_report_${label}.xlsx`);
}

// ─── IMPORT / EXPORT ─────────────────────────────────────────────────────────
// Column headers exactly matching the PKP Excel format
const XLS_COLS = [
  'Case No.',
  'Case Title',
  'Complainant Title',
  'Nature',
  'Date Filed',
  'Date of Initial Confrontation',
  'Action Taken',
  'Date of Settlement or Award',
  'Date of Execution of Settlement or Award',
  'Main Point of Agreement',
  'Status of Compliance on the Settlement or Award',
  'Remarks'
];
// Map XLS column → internal field
const XLS_TO_FIELD = {
  'Case No.':                                          'caseNo',
  'Case Title':                                        'complainant',       // "Complainant vs Respondent"
  'Complainant Title':                                 'caseTitle',
  'Nature':                                            'nature',
  'Date Filed':                                        'dateFiled',
  'Date of Initial Confrontation':                     'dateConfrontation',
  'Action Taken':                                      'actionTaken',
  'Date of Settlement or Award':                       'dateResolved',
  'Date of Execution of Settlement or Award':          'dateResolved',      // same field, duplicated
  'Main Point of Agreement':                           'remarks',
  'Status of Compliance on the Settlement or Award':   '_statusCompliance', // always "Complete"
  'Remarks':                                           'remarks'
};
// Map internal field → XLS column
const FIELD_TO_XLS = Object.fromEntries(Object.entries(XLS_TO_FIELD).map(([k,v])=>[v,k]));

function fmtDateWords(dateStr){
  if(!dateStr) return '';
  const d = new Date(dateStr);
  if(isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-US', {month:'long', day:'2-digit', year:'numeric'});
}

function toTitleCase(str){
  if(!str) return '';
  return String(str).toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());
}

function caseToXlsRow(c){
  const row={};
  // "Case Title" column = "Complainant vs Respondent"
  const partiesStr = [c.complainant, c.respondent].filter(Boolean).join(' vs. ');
  row['Case No.']       = String(c.caseNo||'');
  row['Case Title']     = toTitleCase(partiesStr);
  row['Complainant Title'] = toTitleCase(c.caseTitle||'');
  row['Nature']         = toTitleCase(c.nature||c.type||'');
  row['Date Filed']     = fmtDateWords(c.dateFiled);
  row['Date of Initial Confrontation'] = fmtDateWords(c.dateConfrontation);
  row['Action Taken']   = toTitleCase(c.actionTaken||'');
  row['Date of Settlement or Award']   = fmtDateWords(c.dateResolved);
  row['Date of Execution of Settlement or Award'] = fmtDateWords(c.dateResolved);
  row['Main Point of Agreement']       = toTitleCase(c.remarks||'');
  row['Status of Compliance on the Settlement or Award'] = 'Complete';
  row['Remarks']        = toTitleCase(c.remarks||'');
  return row;
}

function toggleExportYearDropdown(e){
  e.stopPropagation();
  const dd = document.getElementById('nav-year-dropdown');
  const arrow = document.getElementById('nav-export-arrow');
  const isOpen = dd.classList.contains('open');
  if(!isOpen){
    // Build year list from cases
    const years = [...new Set(
      state.cases.map(c=>(c.dateFiled||'').slice(0,4)).filter(y=>y && /^\d{4}$/.test(y))
    )].sort().reverse();
    let html = `<div class="nav-year-option all-years" onclick="exportExcelForYear('ALL')">All Years</div>`;
    years.forEach(y=>{
      html += `<div class="nav-year-option" onclick="exportExcelForYear('${y}')">${y}</div>`;
    });
    if(!years.length){
      html += `<div class="nav-year-option" style="opacity:0.5;cursor:default">No cases found</div>`;
    }
    dd.innerHTML = html;
  }
  dd.classList.toggle('open', !isOpen);
  arrow.classList.toggle('open', !isOpen);
  // Close when clicking outside
  if(!isOpen){
    setTimeout(()=>{
      function outsideClick(ev){
        if(!document.getElementById('nav-year-dropdown').contains(ev.target) &&
           !document.getElementById('nav-export-excel-btn').contains(ev.target)){
          document.getElementById('nav-year-dropdown').classList.remove('open');
          document.getElementById('nav-export-arrow').classList.remove('open');
          document.removeEventListener('click', outsideClick);
        }
      }
      document.addEventListener('click', outsideClick);
    }, 0);
  }
}

function exportExcelForYear(year){
  // Close dropdown
  document.getElementById('nav-year-dropdown').classList.remove('open');
  document.getElementById('nav-export-arrow').classList.remove('open');

  if(year === 'ALL'){
    _buildAndDownloadAllYears();
  } else {
    const filtered = state.cases.filter(c=>(c.dateFiled||'').startsWith(year));
    _buildAndDownloadListOfCases(filtered, `LCMS-List of Case-${year}.xlsx`);
  }
}

function exportExcel(){
  // Legacy: kept for compatibility, opens dropdown instead
  const btn = document.getElementById('nav-export-excel-btn');
  if(btn) btn.click();
}

function _buildAndDownloadAllYears(){
  const years = [...new Set(
    state.cases.map(c=>(c.dateFiled||'').slice(0,4)).filter(y=>y && /^\d{4}$/.test(y))
  )].sort();

  const YELLOW = 'FFFFFF00';
  const GREEN  = 'FF00B050';
  const BLACK  = 'FF000000';
  const WHITE  = 'FFFFFFFF';
  const BORDER = {style:'thin', color:{rgb:BLACK}};
  const ALL_BORDERS = {top:BORDER,bottom:BORDER,left:BORDER,right:BORDER};

  function sc(v, opts={}){
    const {bold=false, italic=false, color=BLACK, bg=WHITE, wrapText=true, sz=10, halign='center', valign='center'}=opts;
    return {
      v, t:'s',
      s:{
        font:{name:'Arial',sz,bold,italic,color:{rgb:color}},
        fill:{patternType:'solid',fgColor:{rgb:bg}},
        alignment:{wrapText,horizontal:halign,vertical:valign},
        border:ALL_BORDERS
      }
    };
  }

  function buildSheet(caseList){
    const ws = {};
    let R = 0;
    const NCOLS = XLS_COLS.length;
    for(let c=0;c<NCOLS;c++){
      ws[XLSX.utils.encode_cell({r:R,c})] = sc(c===0?'LIST OF CASES':'', {bold:true, sz:12, bg:YELLOW, color:BLACK});
    }
    R++;
    XLS_COLS.forEach((h,c)=>{
      ws[XLSX.utils.encode_cell({r:R,c})] = sc(h, {bold:true, sz:9, bg:BLACK, color:WHITE});
    });
    R++;
    for(let c=0;c<NCOLS;c++){
      ws[XLSX.utils.encode_cell({r:R,c})] = sc('', {bg:WHITE});
    }
    R++;
    caseList.forEach(cas=>{
      const row = caseToXlsRow(cas);
      XLS_COLS.forEach((h,c)=>{
        ws[XLSX.utils.encode_cell({r:R,c})] = sc(row[h]||'', {italic:true, sz:10, halign:'left', color:BLACK, bg:WHITE});
      });
      R++;
    });
    ws['!ref'] = XLSX.utils.encode_range({s:{r:0,c:0}, e:{r:R-1,c:NCOLS-1}});
    ws['!merges'] = [{s:{r:0,c:0}, e:{r:0,c:NCOLS-1}}];
    ws['!cols'] = [
      {wch:8},{wch:18},{wch:18},{wch:10},{wch:11},{wch:13},{wch:10},{wch:14},{wch:14},{wch:22},{wch:16},{wch:22},
    ];
    return ws;
  }

  const wb = XLSX.utils.book_new();
  years.forEach(yr=>{
    const caseList = state.cases.filter(c=>(c.dateFiled||'').startsWith(yr));
    const ws = buildSheet(caseList);
    XLSX.utils.book_append_sheet(wb, ws, yr);
  });

  // If no years found, add empty sheet
  if(!years.length){
    const ws = buildSheet([]);
    XLSX.utils.book_append_sheet(wb, ws, 'All Cases');
  }

  XLSX.writeFile(wb, `LCMS-List of Case-All Years.xlsx`);
}

function _buildAndDownloadListOfCases(caseList, filename){
  const YELLOW  = 'FFFFFF00';
  const GREEN   = 'FF00B050';
  const BLACK   = 'FF000000';
  const WHITE   = 'FFFFFFFF';
  const BORDER  = {style:'thin', color:{rgb:BLACK}};
  const ALL_BORDERS = {top:BORDER,bottom:BORDER,left:BORDER,right:BORDER};

  // ── Helper: styled cell ──
  function sc(v, opts={}){
    const {bold=false, italic=false, color=BLACK, bg=WHITE, wrapText=true, sz=10, halign='center', valign='center'}=opts;
    return {
      v, t:'s',
      s:{
        font:{name:'Arial',sz,bold,italic,color:{rgb:color}},
        fill:{patternType:'solid',fgColor:{rgb:bg}},
        alignment:{wrapText,horizontal:halign,vertical:valign},
        border:ALL_BORDERS
      }
    };
  }

  const ws = {};
  let R = 0; // current row index (0-based)

  // ── ROW 0: Title row — "LIST OF CASES" merged across all 12 cols ──
  const NCOLS = XLS_COLS.length;
  for(let c=0;c<NCOLS;c++){
    const addr = XLSX.utils.encode_cell({r:R,c});
    ws[addr] = sc(c===0?'LIST OF CASES':'', {bold:true, sz:12, bg:YELLOW, color:BLACK});
  }
  R++;

  // ── ROW 1: Column headers ──
  XLS_COLS.forEach((h,c)=>{
    ws[XLSX.utils.encode_cell({r:R,c})] = sc(h, {bold:true, sz:9, bg:BLACK, color:WHITE});
  });
  R++;

  // ── ROW 2: blank separator ──
  for(let c=0;c<NCOLS;c++){
    ws[XLSX.utils.encode_cell({r:R,c})] = sc('', {bg:WHITE});
  }
  R++;

  // ── DATA ROWS ──
  caseList.forEach(cas=>{
    const row = caseToXlsRow(cas);
    XLS_COLS.forEach((h,c)=>{
      ws[XLSX.utils.encode_cell({r:R,c})] = sc(row[h]||'', {italic:true, sz:10, halign:'left', color:BLACK, bg:WHITE});
    });
    R++;
  });

  // Set sheet range
  ws['!ref'] = XLSX.utils.encode_range({s:{r:0,c:0}, e:{r:R-1,c:NCOLS-1}});

  // Merge "LIST OF CASES" title across all columns
  ws['!merges'] = [{s:{r:0,c:0}, e:{r:0,c:NCOLS-1}}];

  // Column widths
  ws['!cols'] = [
    {wch:8},   // Case No.
    {wch:18},  // Case Title (Parties)
    {wch:18},  // Complainant Title
    {wch:10},  // Nature
    {wch:11},  // Date Filed
    {wch:13},  // Date of Initial Confrontation
    {wch:10},  // Action Taken
    {wch:14},  // Date of Settlement or Award
    {wch:14},  // Date of Execution of Settlement or Award
    {wch:22},  // Main Point of Agreement
    {wch:16},  // Status of Compliance
    {wch:22},  // Remarks
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'LIST OF CASES');
  XLSX.writeFile(wb, filename);
}

function renderImport(){
  return `<div class="page-header"><div><div class="page-title">Import from Excel</div><div class="page-sub">Bulk-upload complaint records</div></div></div>
  <div class="card" style="padding:22px">
    <div class="notice">Expected columns: <code>${XLS_COLS.join(' | ')}</code><br>Valid status values: <code>Ongoing</code>, <code>CFA</code>, <code>Settled</code></div>
    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      <button class="btn" onclick="downloadTemplate()">&#8595; Download Template</button>
      <label class="btn btn-excel" style="cursor:pointer">Choose File
        <input type="file" accept=".xlsx,.xls,.csv" style="display:none" onchange="handleFileUpload(event)">
      </label>
    </div>
    <div class="import-zone" onclick="document.querySelector('input[type=file]').click()">
      <div style="font-size:32px;margin-bottom:10px">&#128193;</div>
      <div style="font-size:14px;font-weight:600;margin-bottom:6px">Drop your file here or click to browse</div>
      <div style="font-size:12px;color:var(--text2)">Supports .xlsx, .xls, .csv</div>
    </div>
    ${state.importRows.length?renderImportPreview():''}
  </div>`;
}
function renderImportPreview(){
  const rows=state.importRows,preview=rows.slice(0,6);
  return `<div style="font-size:14px;font-weight:600;margin-bottom:10px">Preview — ${rows.length} row(s)</div>
  <div class="preview-table-wrap"><table>
    <thead><tr>${XLS_COLS.map(h=>`<th>${escHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>${preview.map(r=>`<tr>${XLS_COLS.map(h=>`<td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(String(r[h]||''))}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>
  ${rows.length>6?`<div style="font-size:12px;color:var(--text3);margin-bottom:12px">…and ${rows.length-6} more</div>`:''}
  <div style="display:flex;gap:8px">
    <button class="btn btn-primary" onclick="confirmImport()">&#10003; Import ${rows.length} complaint(s)</button>
    <button class="btn" onclick="clearImport()">Cancel</button>
  </div>`;
}
function clearImport(){state.importRows=[];state.importHeaders=[];render();}
function downloadTemplate(){
  const sampleCase = {
    caseNo:'2022-01',
    complainant:'Juan Dela Cruz',respondent:'Juana Change',
    caseTitle:'Collection of Sum of Money',
    nature:'Civil',actionTaken:'M',
    dateFiled:'January 22, 2022',
    dateConfrontation:'January 25, 2022',
    dateResolved:'January 28, 2022',
    remarks:'Respondent agreed to pay Complainant Php 500.00 per month starting February to pay for the...'
  };
  _buildAndDownloadListOfCases([sampleCase], 'PKP_Template.xlsx');
}
function handleFileUpload(event){
  const file=event.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const data=new Uint8Array(e.target.result);
      const wb=XLSX.read(data,{type:'array',cellDates:false});
      const ws=wb.Sheets[wb.SheetNames[0]];
      // Read raw rows — skip header rows that don't have 'Case No.'
      const allRows=XLSX.utils.sheet_to_json(ws,{defval:'',header:1});
      // Find the row index that contains the XLS column headers
      let headerRowIdx=-1;
      for(let i=0;i<allRows.length;i++){
        const row=allRows[i];
        if(row.some(cell=>String(cell).trim()==='Case No.')){headerRowIdx=i;break;}
      }
      let rows;
      if(headerRowIdx>=0){
        const headers=allRows[headerRowIdx].map(h=>String(h).trim());
        rows=allRows.slice(headerRowIdx+1)
          .filter(r=>r.some(cell=>cell!==''))
          .map(r=>{
            const obj={};
            headers.forEach((h,i)=>{ obj[h]=r[i]!==undefined?String(r[i]).trim():''; });
            return obj;
          })
          // Filter out summary/total rows
          .filter(r=>{
            const cn=String(r['Case No.']||'').trim();
            return cn&&!['TOTAL','JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY',
              'AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'].includes(cn.toUpperCase());
          });
      } else {
        // Fallback: read as normal json
        rows=XLSX.utils.sheet_to_json(ws,{defval:''})
          .filter(r=>r['Case No.']&&!String(r['Case No.']).toUpperCase().startsWith('TOTAL'));
      }
      if(!rows.length){alert('No valid case data found. Make sure the file has a "Case No." column header.');return;}
      state.importRows=rows;state.importHeaders=XLS_COLS;render();
    }catch(err){alert('Could not read the file: '+err.message);}
  };
  reader.readAsArrayBuffer(file);
}
function confirmImport(){
  const validStatuses=new Set(CASE_STATUSES);
  const imported=state.importRows.map(row=>{
    const obj={id:genId(),attachments:[]};
    // New column format mapping
    obj.caseNo            = String(row['Case No.']||'').trim();
    // "Case Title" column = "Complainant vs Respondent" — split on ' vs. ' or ' vs '
    const partiesRaw = String(row['Case Title']||'').trim();
    const vsSplit = partiesRaw.split(/ vs\.? /i);
    obj.complainant       = vsSplit[0]||partiesRaw;
    obj.respondent        = vsSplit.slice(1).join(' vs ')||'';
    obj.caseTitle         = String(row['Complainant Title']||'').trim();
    obj.nature            = String(row['Nature']||'').trim();
    obj.dateFiled         = String(row['Date Filed']||'').trim();
    obj.dateConfrontation = String(row['Date of Initial Confrontation']||'').trim();
    obj.actionTaken       = String(row['Action Taken']||'').trim();
    obj.dateResolved      = String(row['Date of Settlement or Award']||'').trim();
    obj.remarks           = String(row['Remarks']||row['Main Point of Agreement']||'').trim();
    // Fallback: also try old column names for backward compatibility
    if(!obj.caseNo && row['Case No.']) obj.caseNo=String(row['Case No.']).trim();
    if(!obj.complainant && row['Complainant Name']) obj.complainant=String(row['Complainant Name']).trim();
    if(!obj.respondent  && row['Respondent Name'])  obj.respondent=String(row['Respondent Name']).trim();
    if(!obj.caseTitle   && row['Case Title (old)']) obj.caseTitle=String(row['Case Title (old)']).trim();
    // Status: derive from Status of Compliance or default Ongoing
    const complianceVal = String(row['Status of Compliance on the Settlement or Award']||'').trim();
    obj.status = complianceVal==='Complete'?'Settled':(validStatuses.has(complianceVal)?complianceVal:'Ongoing');
    if(!obj.complainantContact)obj.complainantContact='';
    if(!obj.respondentContact)obj.respondentContact='';
    return obj;
  });
  state.cases=[...state.cases,...imported];
  saveData('ltia_cases',state.cases);
  state.importRows=[];state.importHeaders=[];
  alert(`Imported ${imported.length} complaint(s)!`);
  setPage('dashboard');
}

// ─── PREVIEW KP FROM CASE ROW ────────────────────────────────────────────────
function previewKP(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c){alert('Case not found.');return;}
  // Look for a linked schedule to get the most accurate hearing details
  const sched=state.schedules.find(s=>s.caseNo===c.caseNo);
  state.kpFormsReturnCaseId=null;
  state.kpFormsData={
    _caseId:c.id,
    caseNo:c.caseNo, dateFiled:c.dateFiled,
    timeFiled:sched?sched.timeFiled:(c.timeFiled||''),
    complainant:c.complainant, complainantAddress:c.complainantAddress||'',
    respondent:c.respondent, respondentAddress:c.respondentAddress||'',
    schedDate:sched?sched.schedDate:(c.dateConfrontation||c.dateFiled||''),
    schedTime:sched?sched.schedTime:'1:00 PM',
    caseTitle:c.caseTitle||c.type||'',
    location:sched?sched.location:'Barangay Hall',
    chairman:sched?sched.chairman:'HON. ABUNDIO A. LEONES'
  };
  render();
  setTimeout(()=>kpShowPreview('form7'),120);
}

// ─── KP FORMS MODAL (split-panel with editable fields + live preview) ──────────
function renderKpFormsModal(){
  const d=state.kpFormsData; if(!d)return'';
  // Enrich d with linked case pangkat members if not already present
  if(!d.pangkatChair||!d.pangkatSecretary||!d.pangkatMember){
    const linkedCase=state.cases.find(c=>c.caseNo===d.caseNo);
    if(linkedCase){
      if(!d.pangkatChair)     d.pangkatChair=linkedCase._pangkatChair||'';
      if(!d.pangkatSecretary) d.pangkatSecretary=linkedCase._pangkatSecretary||'';
      if(!d.pangkatMember)    d.pangkatMember=linkedCase._pangkatMember||'';
    }
  }
  const schedDt=d.schedDate?new Date(d.schedDate+'T00:00:00'):null;
  const fmtDateLine=(dt)=>{
    if(!dt)return'____';
    return `${ordinalDay(dt)} day of ${MONTHS[dt.getMonth()].toUpperCase()} ${dt.getFullYear()}`;
  };
  const noSched=!d.schedDate;
  return `<div id="kpf-modal-root" style="position:fixed;inset:0;z-index:600;display:flex;align-items:stretch;background:rgba(0,0,0,0.6);overflow:hidden">
    <!-- LEFT PANEL: Fields & Actions -->
    <div id="kpf-left-panel" style="width:360px;min-width:220px;max-width:90vw;background:#fff;display:flex;flex-direction:column;box-shadow:4px 0 24px rgba(0,0,0,0.18);z-index:2;overflow:hidden;flex-shrink:0">
      <!-- Panel Header -->
      <div style="background:var(--navy);color:#fff;padding:14px 18px 0 18px;display:flex;align-items:flex-start;justify-content:space-between;flex-shrink:0;flex-direction:column">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;width:100%;margin-bottom:10px">
          <div style="font-size:14px;font-weight:700">📋 KP Forms — ${escHtml(d.caseNo||'')}</div>
          <button onclick="closeKpForms()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-left:8px">✕</button>
        </div>
        <div style="display:flex;gap:2px;align-items:flex-end;flex-wrap:wrap">
          <button id="kpf-tab-form7" onclick="kpfSwitchTab('form7')" style="padding:6px 14px;border-radius:7px 7px 0 0;border:none;background:rgba(255,255,255,0.18);color:#fff;font-size:12px;font-weight:700;cursor:pointer;border-bottom:3px solid var(--teal)">Form 7: Complaint</button>
          <button id="kpf-tab-form8" onclick="kpfSwitchTab('form8')" style="padding:6px 14px;border-radius:7px 7px 0 0;border:none;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);font-size:12px;font-weight:600;cursor:pointer;border-bottom:3px solid transparent">Form 8: Notice</button>
          <button id="kpf-tab-form9" onclick="kpfSwitchTab('form9')" style="padding:6px 14px;border-radius:7px 7px 0 0;border:none;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);font-size:12px;font-weight:600;cursor:pointer;border-bottom:3px solid transparent">Form 9: Summons</button>
          <button id="kpf-tab-form10" onclick="kpfSwitchTab('form10')" style="padding:6px 14px;border-radius:7px 7px 0 0;border:none;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);font-size:12px;font-weight:600;cursor:pointer;border-bottom:3px solid transparent">Form 10: Pangkat</button>
          <button id="kpf-tab-form11" onclick="kpfSwitchTab('form11')" style="padding:6px 14px;border-radius:7px 7px 0 0;border:none;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);font-size:12px;font-weight:600;cursor:pointer;border-bottom:3px solid transparent">Form 11: Members</button>
          <button id="kpf-tab-form12" onclick="kpfSwitchTab('form12')" style="padding:6px 14px;border-radius:7px 7px 0 0;border:none;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);font-size:12px;font-weight:600;cursor:pointer;border-bottom:3px solid transparent">Form 12: Conciliation</button>
        </div>
      </div>
      <!-- Scrollable content -->
      <div style="padding:14px 16px;flex:1;overflow-y:auto">
        ${noSched?`<div style="padding:8px 11px;background:#fff8e1;border:1px solid #ffe082;border-radius:7px;font-size:11px;color:#7c5c00;margin-bottom:12px;line-height:1.5">⚠️ No hearing date set — edit fields below to update forms.</div>`:''}

        <!-- ── GENERAL FORM FIELDS ── -->
        <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:7px;padding-bottom:4px;border-bottom:1px solid #e5e7eb">General Form Fields</div>
        <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:14px">
          <div>
            <div style="font-size:11px;color:#888;margin-bottom:3px">Complaint No.</div>
            <input class="wiz-input" id="kpf_caseNo" value="${escHtml(d.caseNo||'')}" oninput="kpfUpdate()" style="font-size:12px;padding:6px 9px">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
            <div>
              <div style="font-size:11px;color:#888;margin-bottom:3px">Date Filed (DF)</div>
              <input type="date" class="wiz-input" id="kpf_dateFiled" value="${escHtml(d.dateFiled||'')}" oninput="kpfUpdate()" style="font-size:12px;padding:6px 9px">
            </div>
            <div>
              <div style="font-size:11px;color:#888;margin-bottom:3px">Time Filed (TF)</div>
              <input type="time" class="wiz-input" id="kpf_timeFiled" value="${escHtml(d.timeFiled||'')}" oninput="kpfUpdate()" style="font-size:12px;padding:6px 9px">
            </div>
          </div>
          <div>
            <div style="font-size:11px;color:#888;margin-bottom:3px">Complainant Name</div>
            <input class="wiz-input" id="kpf_complainant" value="${escHtml(d.complainant||'')}" oninput="kpfUpdate()" style="font-size:12px;padding:6px 9px">
          </div>
          <div>
            <div style="font-size:11px;color:#888;margin-bottom:3px">Complainant Address</div>
            <input class="wiz-input" id="kpf_complainantAddr" value="${escHtml(d.complainantAddress||'')}" oninput="kpfUpdate()" style="font-size:12px;padding:6px 9px">
          </div>
          <div>
            <div style="font-size:11px;color:#888;margin-bottom:3px">Respondent Name</div>
            <input class="wiz-input" id="kpf_respondent" value="${escHtml(d.respondent||'')}" oninput="kpfUpdate()" style="font-size:12px;padding:6px 9px">
          </div>
          <div>
            <div style="font-size:11px;color:#888;margin-bottom:3px">Respondent Address</div>
            <input class="wiz-input" id="kpf_respondentAddr" value="${escHtml(d.respondentAddress||'')}" oninput="kpfUpdate()" style="font-size:12px;padding:6px 9px">
          </div>
          <div id="kpf-non-form7-fields" style="display:none;flex-direction:column;gap:7px">
          <div>
            <div style="font-size:11px;color:#888;margin-bottom:3px">Nature / For: (Form 9)</div>
            <input class="wiz-input" id="kpf_caseTitle" value="${escHtml(d.caseTitle||'')}" oninput="kpfUpdate()" style="font-size:12px;padding:6px 9px">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
            <div>
              <div style="font-size:11px;color:#888;margin-bottom:3px">Hearing Date</div>
              <input type="date" class="wiz-input" id="kpf_schedDate" value="${escHtml(d.schedDate||'')}" oninput="kpfUpdate()" style="font-size:12px;padding:6px 9px">
            </div>
            <div>
              <div style="font-size:11px;color:#888;margin-bottom:3px">Hearing Time</div>
              <input class="wiz-input" id="kpf_schedTime" value="${escHtml(d.schedTime||'')}" placeholder="e.g 1:00 PM" oninput="kpfUpdate()" style="font-size:12px;padding:6px 9px">
            </div>
          </div>
          </div>
          <div>
            <div style="font-size:11px;color:#888;margin-bottom:3px">Punong Barangay / Lupon Chairman</div>
            <input class="wiz-input" id="kpf_chairman" value="${escHtml(d.chairman||'HON. ABUNDIO A. LEONES')}" oninput="kpfUpdate()" style="font-size:12px;padding:6px 9px">
          </div>
        </div>

        <!-- ── FORM 7 — COMPLAINT DETAILS (only shown when Form 7 tab is active) ── -->
        <div id="kpf-form7-details" style="display:block">
        <div style="font-size:10px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:7px;padding-bottom:4px;border-bottom:1px solid #fee2e2">Form 7 — Complaint Details</div>
        <div style="padding:8px 10px;background:#fff7f7;border:1px solid #fecaca;border-radius:7px;font-size:11px;color:#b91c1c;margin-bottom:10px;line-height:1.5">
          ✏️ <strong>Red fields</strong> = user-typed text (printed in black)
        </div>
        <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:14px">
          <div>
            <div style="font-size:11px;color:#dc2626;font-weight:600;margin-bottom:3px">● Complaint Narrative <span style="font-weight:400;color:#888">(printed in black)</span></div>
            <textarea class="wiz-input" id="kpf_narrative" rows="5" placeholder="e.g. Ako si [Name] [Age] years old, nagpuyo sa [Address], akong ipatawag ssi [Respondent] tungod ssa [reason] May 6, 2025 11:10PM sa P-Lawaan-A." oninput="kpfUpdate()" style="font-size:12px;padding:6px 9px;border-color:#fca5a5;resize:vertical">${escHtml(d.narrative||'')}</textarea>
          </div>
          <div>
            <div style="font-size:11px;color:#dc2626;font-weight:600;margin-bottom:3px">● Relief / Prayer <span style="font-weight:400;color:#888">(printed in black)</span></div>
            <textarea class="wiz-input" id="kpf_relief" rows="3" placeholder="e.g. Ang akong purpose aron masayran ngano ila kong quisumbag nga sila ang nakipagstorya sa ako." oninput="kpfUpdate()" style="font-size:12px;padding:6px 9px;border-color:#fca5a5;resize:vertical">${escHtml(d.relief||'')}</textarea>
          </div>
        </div>
        </div>

        <!-- hidden id placeholders for kpbtn- so highlight logic won't break -->
        <button id="kpbtn-form8" style="display:none"></button>
        <button id="kpbtn-form9" style="display:none"></button>

        <!-- ── FORM 10/11/12 — PANGKAT FIELDS (only shown when Form 10/11/12 tab is active) ── -->
        <div id="kpf-conc-details" style="display:none">
        <div style="font-size:10px;font-weight:700;color:#14919b;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:7px;padding-bottom:4px;border-bottom:1px solid #e9d5ff">Pangkat Members</div>
        <div style="padding:8px 10px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:7px;font-size:11px;color:#6d28d9;margin-bottom:10px;line-height:1.5">
          ✏️ These members appear in <strong>Forms 9 (Conciliation), 10, 11 &amp; 12</strong>
        </div>
        <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:14px">
          <div>
            <div style="font-size:11px;color:#14919b;font-weight:600;margin-bottom:3px">● Pangkat Chair</div>
            <input class="wiz-input" id="kpf_pangkatChair" value="${escHtml(d.pangkatChair||d._pangkatChair||'')}" oninput="kpfUpdate()" placeholder="e.g. Juan Dela Cruz" style="font-size:12px;padding:6px 9px;border-color:#c4b5fd">
          </div>
          <div>
            <div style="font-size:11px;color:#14919b;font-weight:600;margin-bottom:3px">● Pangkat Secretary</div>
            <input class="wiz-input" id="kpf_pangkatSecretary" value="${escHtml(d.pangkatSecretary||d._pangkatSecretary||'')}" oninput="kpfUpdate()" placeholder="e.g. Maria Santos" style="font-size:12px;padding:6px 9px;border-color:#c4b5fd">
          </div>
          <div>
            <div style="font-size:11px;color:#14919b;font-weight:600;margin-bottom:3px">● Pangkat Member</div>
            <input class="wiz-input" id="kpf_pangkatMember" value="${escHtml(d.pangkatMember||d._pangkatMember||'')}" oninput="kpfUpdate()" placeholder="e.g. Pedro Reyes" style="font-size:12px;padding:6px 9px;border-color:#c4b5fd">
          </div>
        </div>
        </div>

        <!-- ── SAVE TO CASE ── -->
        <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:7px;padding-bottom:4px;border-bottom:1px solid #e5e7eb">Save Changes</div>
        <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:14px">
          <button onclick="kpfSaveToCase()" style="padding:9px 12px;border-radius:7px;background:#14919b;color:#fff;border:none;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px">💾 Save to Case / Schedule</button>
          <div id="kpf-save-status" style="font-size:11px;color:#0d3d3a;display:none;padding:6px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px">✅ Saved successfully!</div>
        </div>

        <!-- ── DOWNLOAD BUTTONS ── -->
        <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:7px;padding-bottom:4px;border-bottom:1px solid #e5e7eb">Download PDF</div>
        <div id="kpf-download-buttons" style="display:flex;flex-direction:column;gap:7px">
          <button id="kpf-dl-form7" onclick="downloadKpForm7()" style="padding:9px 12px;border-radius:7px;background:var(--navy);color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px">⬇ Download Form 7 — Complaint</button>
          <button id="kpf-dl-form8" onclick="downloadKpForm8()" style="padding:9px 12px;border-radius:7px;background:var(--navy);color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px">⬇ Download Form 8 — Notice</button>
          <button id="kpf-dl-form9" onclick="downloadKpForm9()" style="padding:9px 12px;border-radius:7px;background:var(--navy);color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px">⬇ Download Form 9 — Summons</button>
          <button id="kpf-dl-form10" onclick="downloadKpForm10()" style="display:none;padding:9px 12px;border-radius:7px;background:#7c3aed;color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer;align-items:center;gap:6px">⬇ Download Form 10 — Pangkat Constitution</button>
          <button id="kpf-dl-form11" onclick="downloadKpForm11()" style="display:none;padding:9px 12px;border-radius:7px;background:#7c3aed;color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer;align-items:center;gap:6px">⬇ Download Form 11 — Members Notice</button>
          <button id="kpf-dl-form12" onclick="downloadKpForm12()" style="display:none;padding:9px 12px;border-radius:7px;background:#7c3aed;color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer;align-items:center;gap:6px">⬇ Download Form 12 — Conciliation Notice</button>
          <button onclick="downloadKpAll()" style="padding:9px 12px;border-radius:7px;background:#2d7a3a;color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px">⬇ Download All Forms (1 PDF)</button>
        </div>
      </div>
    </div>

    <!-- DRAG HANDLE -->
    <div id="kpf-drag-handle" style="width:6px;background:#3c3f41;cursor:col-resize;flex-shrink:0;position:relative;z-index:3;transition:background 0.15s" title="Drag to resize"
      onmousedown="kpfStartDrag(event)"
      onmouseover="this.style.background='#14919b'"
      onmouseout="if(!window._kpfDragging)this.style.background='#3c3f41'">
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#888;font-size:10px;writing-mode:vertical-rl;user-select:none;pointer-events:none">⠿</div>
    </div>

    <!-- RIGHT PANEL: PDF Preview -->
    <div style="flex:1;min-width:0;background:#525659;display:flex;flex-direction:column;overflow:hidden">
      <div style="background:#3c3f41;padding:10px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0">
        <span id="kpf-preview-label" style="color:#ccc;font-size:12px;font-weight:600">← Click a form on the left to preview</span>
        <div style="margin-left:auto;display:flex;gap:4px;align-items:center;flex-wrap:wrap">
          <button onclick="kpfSwitchTab('form7')" style="padding:5px 10px;border-radius:6px;background:#555;color:#fff;border:none;font-size:11px;cursor:pointer">Form 7</button>
          <button onclick="kpfSwitchTab('form8')" style="padding:5px 10px;border-radius:6px;background:#555;color:#fff;border:none;font-size:11px;cursor:pointer">Form 8</button>
          <button onclick="kpfSwitchTab('form9')" style="padding:5px 10px;border-radius:6px;background:#555;color:#fff;border:none;font-size:11px;cursor:pointer">Form 9</button>
          <button onclick="kpfSwitchTab('form10')" style="padding:5px 10px;border-radius:6px;background:#6d28d9;color:#fff;border:none;font-size:11px;cursor:pointer">Form 10</button>
          <button onclick="kpfSwitchTab('form11')" style="padding:5px 10px;border-radius:6px;background:#6d28d9;color:#fff;border:none;font-size:11px;cursor:pointer">Form 11</button>
          <button onclick="kpfSwitchTab('form12')" style="padding:5px 10px;border-radius:6px;background:#6d28d9;color:#fff;border:none;font-size:11px;cursor:pointer">Form 12</button>
        </div>
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative">
        <iframe id="kpf-pdf-frame" style="width:100%;height:100%;border:none;display:none" src=""></iframe>
        <iframe id="kpf-html-frame" style="width:100%;height:100%;border:none;display:none" srcdoc=""></iframe>
        <div id="kpf-empty-state" style="text-align:center;color:#888">
          <div style="font-size:56px;margin-bottom:12px">📄</div>
          <div style="font-size:14px;font-weight:600;color:#aaa">Select a form to preview</div>
          <div style="font-size:12px;color:#777;margin-top:6px">Click any KP Form tab on the left (Forms 7–12)</div>
        </div>
      </div>
    </div>
  </div>`;
}

function kpfGetData(){
  // Read live values from the editable fields in the modal, fallback to state
  const gv=id=>{const el=document.getElementById(id);return el?el.value.trim():null;};
  const d=state.kpFormsData||{};
  // Also try to pull pangkat data from the linked case
  const caseId=d._caseId||(d.id&&state.schedules.find(s=>s.id===d.id)?d.id:null);
  const linkedSched=caseId?state.schedules.find(s=>s.id===caseId):null;
  const linkedCase=linkedSched?state.cases.find(c=>c.caseNo===linkedSched.caseNo):null;
  return {
    caseNo:     gv('kpf_caseNo')     ??d.caseNo,
    dateFiled:  gv('kpf_dateFiled')  ??d.dateFiled,
    timeFiled:  gv('kpf_timeFiled')  ??d.timeFiled,
    complainant:gv('kpf_complainant')??d.complainant,
    complainantAddress:gv('kpf_complainantAddr')??d.complainantAddress,
    respondent: gv('kpf_respondent') ??d.respondent,
    respondentAddress:gv('kpf_respondentAddr')??d.respondentAddress,
    caseTitle:  gv('kpf_caseTitle')  ??d.caseTitle,
    schedDate:  gv('kpf_schedDate')  ??d.schedDate,
    schedTime:  gv('kpf_schedTime')  ??d.schedTime,
    chairman:   gv('kpf_chairman')   ??(d.chairman||'HON. ABUNDIO A. LEONES'),
    officer:    gv('kpf_officer')    ??(d.officer||'RAMIL  ROSALES'),
    complainantAge: gv('kpf_complainantAge')??d.complainantAge,
    narrative:  gv('kpf_narrative')  ??d.narrative,
    relief:     gv('kpf_relief')     ??d.relief,
    pangkatChair:     gv('kpf_pangkatChair')     ??(d.pangkatChair||(linkedCase&&linkedCase._pangkatChair)||''),
    pangkatSecretary: gv('kpf_pangkatSecretary') ??(d.pangkatSecretary||(linkedCase&&linkedCase._pangkatSecretary)||''),
    pangkatMember:    gv('kpf_pangkatMember')    ??(d.pangkatMember||(linkedCase&&linkedCase._pangkatMember)||''),
    lupons: (()=>{
      const chair=gv('kpf_pangkatChair')??(d.pangkatChair||(linkedCase&&linkedCase._pangkatChair)||'');
      const sec=gv('kpf_pangkatSecretary')??(d.pangkatSecretary||(linkedCase&&linkedCase._pangkatSecretary)||'');
      const mem=gv('kpf_pangkatMember')??(d.pangkatMember||(linkedCase&&linkedCase._pangkatMember)||'');
      return [chair,sec,mem].filter(Boolean);
    })(),
  };
}
function kpfUpdate(){
  // Live-refresh the visible preview whenever a field changes
  const label=document.getElementById('kpf-preview-label');
  if(label&&label.dataset.current){
    kpShowPreview(label.dataset.current);
  }
}

function kpfSaveToCase(){
  const d=kpfGetData();
  const src=state.kpFormsData||{};
  // Try to find the linked schedule by id
  const schedId=src.id;
  let savedToSched=false, savedToCase=false;
  if(schedId){
    const sched=state.schedules.find(s=>s.id===schedId);
    if(sched){
      sched.caseNo=d.caseNo;
      sched.dateFiled=d.dateFiled;
      sched.timeFiled=d.timeFiled;
      sched.complainant=d.complainant;
      sched.complainantAddress=d.complainantAddress;
      sched.respondent=d.respondent;
      sched.respondentAddress=d.respondentAddress;
      sched.caseTitle=d.caseTitle;
      sched.schedDate=d.schedDate;
      sched.schedTime=d.schedTime;
      sched.chairman=d.chairman;
      sched.officer=d.officer||sched.officer;
      sched.narrative=d.narrative||sched.narrative;
      sched.relief=d.relief||sched.relief;
      saveData('ltia_schedules',state.schedules);
      // Also update state.kpFormsData so it stays in sync
      Object.assign(src,{caseNo:d.caseNo,dateFiled:d.dateFiled,timeFiled:d.timeFiled,complainant:d.complainant,complainantAddress:d.complainantAddress,respondent:d.respondent,respondentAddress:d.respondentAddress,caseTitle:d.caseTitle,schedDate:d.schedDate,schedTime:d.schedTime,chairman:d.chairman});
      savedToSched=true;
    }
  }
  // Also update the linked case record
  const targetCaseNo=d.caseNo||src.caseNo;
  if(targetCaseNo){
    const c=state.cases.find(x=>x.caseNo===targetCaseNo);
    if(c){
      c.dateFiled=d.dateFiled||c.dateFiled;
      c.timeFiled=d.timeFiled||c.timeFiled;
      c.complainant=d.complainant||c.complainant;
      c.complainantAddress=d.complainantAddress||c.complainantAddress;
      c.respondent=d.respondent||c.respondent;
      c.respondentAddress=d.respondentAddress||c.respondentAddress;
      c.caseTitle=d.caseTitle||c.caseTitle;
      // Save pangkat members back to case
      if(d.pangkatChair)    c._pangkatChair=d.pangkatChair;
      if(d.pangkatSecretary)c._pangkatSecretary=d.pangkatSecretary;
      if(d.pangkatMember)   c._pangkatMember=d.pangkatMember;
      if(d.chairman)        c.chairman=d.chairman;
      saveData('ltia_cases',state.cases);
      savedToCase=true;
    }
  }
  // Show feedback
  const statusEl=document.getElementById('kpf-save-status');
  if(statusEl){
    if(savedToSched||savedToCase){
      statusEl.textContent='✅ Saved successfully'+(savedToSched?' (schedule)':'')+(savedToCase?' (case)':'')+'!';
      statusEl.style.color='#2d7a3a';
      statusEl.style.background='#f0fdf4';
      statusEl.style.border='1px solid #bbf7d0';
    } else {
      statusEl.textContent='⚠️ No linked schedule or case found to save to.';
      statusEl.style.color='#0d3d3a';
      statusEl.style.background='#fffbeb';
      statusEl.style.border='1px solid #fde68a';
    }
    statusEl.style.display='block';
    setTimeout(()=>{statusEl.style.display='none';},3500);
  }
}

// ── Shared Form 10 PDF builder — used by both preview and download ─────────────
function _buildForm10Doc(overrideData){
  // overrideData: optional object with {linkedCase, f10data, f10case} pre-resolved
  const kpD = overrideData && overrideData.kpD ? overrideData.kpD : kpfGetData();
  const kpS = state.kpFormsData || {};
  const linkedCase = overrideData && overrideData.linkedCase !== undefined ? overrideData.linkedCase : (()=>{
    const caseId = (state.kpFormsData&&state.kpFormsData._caseId) || state.kpFormsReturnCaseId;
    return caseId ? state.cases.find(x=>x.id===caseId) : null;
  })();
  // Build merged data — saved _form10 values win over kpfGetData fallbacks
  const f10saved = linkedCase&&linkedCase._form10 ? linkedCase._form10 : {};
  const f10data = {
    appearDate:        f10saved.appearDate        || kpD.schedDate  || kpS.schedDate  || '',
    time:              f10saved.time              || kpD.schedTime  || kpS.schedTime  || '9:00 AM',
    noticeDate:        f10saved.noticeDate        || kpD.dateFiled  || kpS.dateFiled  || '',
    chairman:          f10saved.chairman          || kpD.chairman   || kpS.chairman   || 'HON. ABUNDIO A. LEONES',
    extraComplainants: f10saved.extraComplainants || [],
    extraRespondents:  f10saved.extraRespondents  || [],
  };
  const f10case = {
    complainant: (linkedCase&&linkedCase.complainant) || kpD.complainant || kpS.complainant || '',
    respondent:  (linkedCase&&linkedCase.respondent)  || kpD.respondent  || kpS.respondent  || '',
    dateFiled:   (linkedCase&&linkedCase.dateFiled)   || kpD.dateFiled   || kpS.dateFiled   || '',
    caseNo:      (linkedCase&&linkedCase.caseNo)      || kpD.caseNo      || kpS.caseNo      || '',
    _lupanChairman: (linkedCase&&linkedCase._lupanChairman) || kpD.chairman || kpS.chairman || '',
  };

  const {jsPDF:jsPDF10}=window.jspdf;
  const doc10=new jsPDF10({unit:'mm',format:'a4'});
  const F10='times', W10=210, ML10=25, MR10=25, CW10=W10-ML10-MR10, MID10=W10/2, LH10=6.5;
  const MONS10=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const ordSfx10=n=>{const d=parseInt(n);const m10=d%10,m100=d%100;return(m100>=11&&m100<=13)?'th':m10===1?'st':m10===2?'nd':m10===3?'rd':'th';};

  const appDt10  = f10data.appearDate ? new Date(f10data.appearDate+'T00:00:00') : null;
  const sDay10   = appDt10 ? String(appDt10.getDate()) : '___';
  const sMon10   = appDt10 ? MONS10[appDt10.getMonth()] : '___';
  const noticeDt10 = f10data.noticeDate ? new Date(f10data.noticeDate+'T00:00:00') : new Date();
  const nDay10   = String(noticeDt10.getDate());
  const nOrd10   = ordSfx10(nDay10);
  const nMon10   = MONS10[noticeDt10.getMonth()];
  const nYrFull10= String(noticeDt10.getFullYear());
  const nYr210   = nYrFull10.slice(-2);

  const cName10  = (f10case.complainant||'').toUpperCase();
  const rName10  = (f10case.respondent||'').toUpperCase();
  const cNames10 = [cName10,...(f10data.extraComplainants||[])].filter(v=>v);
  const rNames10 = [rName10,...(f10data.extraRespondents||[])].filter(v=>v);
  // Ensure at least a blank placeholder so columns render
  if(!cNames10.length) cNames10.push('______________________');
  if(!rNames10.length) rNames10.push('______________________');

  const tRaw10       = f10data.time||'9:00 AM';
  const tDisp10      = _fmt12hrTime(tRaw10)||'9:00 AM';
  const isAM10       = !/pm/i.test(tDisp10);
  const tDispDisplay10 = tDisp10.replace(/\s*(AM|PM)$/i,'').trim();
  const chairman10   = (f10data.chairman||f10case._lupanChairman||'HON. ABUNDIO A. LEONES').toUpperCase();

  doc10.setDrawColor(0); doc10.setTextColor(0);
  let y10=20;

  // Header
  doc10.setFont(F10,'bold'); doc10.setFontSize(10);
  doc10.text('KP Form No.10',ML10,y10); doc10.setFont(F10,'normal'); y10+=12;
  doc10.setFontSize(10);
  doc10.text('Republic of the Philippines',MID10,y10,{align:'center'}); y10+=5;
  doc10.text('City of Butuan',MID10,y10,{align:'center'}); y10+=5;
  doc10.text('Barangay Pangabugan',MID10,y10,{align:'center'}); y10+=10;
  doc10.setFont(F10,'bold'); doc10.setFontSize(11);
  doc10.text('OFFICE OF THE LUPONG TAGAPAMAYAPA',MID10,y10,{align:'center'}); y10+=8;
  doc10.setFontSize(12);
  doc10.text('NOTICE FOR THE CONSTITUTION OF THE PANGKAT',MID10,y10,{align:'center'}); y10+=14;

  // To: columns
  const TO_LBL10='To:  ';
  const toLblW10=doc10.getTextWidth(TO_LBL10);
  const LX10=ML10+toLblW10, RX10=MID10+6;
  const NCOL_W10=MID10-ML10-toLblW10-6;
  const renderNameCol10=(names,colX,colW,startY)=>{
    let cy=startY;
    names.forEach((nm,idx)=>{
      if(idx>0) cy+=LH10;
      const nmLines=doc10.splitTextToSize(nm,colW);
      doc10.setFont(F10,'bold'); doc10.setFontSize(12);
      nmLines.forEach((ln,li)=>{doc10.text(ln,colX+colW/2,cy+li*LH10,{align:'center'});});
      const lineY=cy+(nmLines.length-1)*LH10+1.5;
      doc10.line(colX,lineY,colX+colW,lineY);
      cy=lineY;
    });
    return cy;
  };
  doc10.setFont(F10,'normal'); doc10.setFontSize(12);
  doc10.text(TO_LBL10,ML10,y10);
  const cEndY10=renderNameCol10(cNames10,LX10,NCOL_W10,y10);
  const rEndY10=renderNameCol10(rNames10,RX10,NCOL_W10,y10);
  y10=Math.max(cEndY10,rEndY10)+6;
  doc10.setFont(F10,'normal'); doc10.setFontSize(12);
  doc10.text('Complainant/s',LX10+NCOL_W10/2,y10,{align:'center'});
  doc10.text('Respondent/s',RX10+NCOL_W10/2,y10,{align:'center'});
  y10+=14;

  // Body paragraph with underlined date/time tokens
  const dayOrdStr10=sDay10+ordSfx10(sDay10);
  const SPACE_W10=doc10.getTextWidth(' ');
  const segments10=[
    {text:'You are hereby required to appear before me on the ',underline:false},
    {text:dayOrdStr10,underline:true},{text:' day ',underline:false},
    {text:sMon10,underline:true},{text:' , ',underline:false},
    {text:String(appDt10?appDt10.getFullYear():new Date().getFullYear()),underline:true},
    {text:' at ',underline:false},{text:tDispDisplay10,underline:true},
    {text:" o\u2019clock in the ",underline:false},
    {text:isAM10?'morning':'afternoon',underline:true},
    {text:isAM10?'/afternoon':'/morning',underline:false},
    {text:' for the Constitution of the Pangkat Tagapagkasundo which shall',underline:false},
    {text:' conciliate your dispute. ',underline:false},
    {text:'Should you fail to agree on the Pangkat membership or to appear on the aforesaid date for the constitution of the Pangkat, I shall determine membership thereof by drawing of lots.',underline:false},
  ];
  const tokens10=[];
  segments10.forEach(seg=>{seg.text.split(' ').forEach(w=>{tokens10.push({word:w,underline:seg.underline});});});
  const INDENT10=12;
  const lines2D10=[];let lineTokensArr10=[];let lineWidthAcc10=0;let isFirstLine10=true;
  const firstLineMaxW10=CW10-INDENT10;
  tokens10.forEach(tok=>{
    const tw=doc10.getTextWidth(tok.word);
    const maxW=isFirstLine10?firstLineMaxW10:CW10;
    const spaceNeeded=lineTokensArr10.length>0?SPACE_W10:0;
    if(lineWidthAcc10+spaceNeeded+tw>maxW&&lineTokensArr10.length>0){
      lines2D10.push({tokens:lineTokensArr10,startX:isFirstLine10?ML10+INDENT10:ML10,isFirst:isFirstLine10});
      lineTokensArr10=[];lineWidthAcc10=0;isFirstLine10=false;
    }
    if(lineTokensArr10.length>0) lineWidthAcc10+=SPACE_W10;
    lineWidthAcc10+=tw; lineTokensArr10.push(tok);
  });
  if(lineTokensArr10.length>0) lines2D10.push({tokens:lineTokensArr10,startX:isFirstLine10?ML10+INDENT10:ML10,isFirst:isFirstLine10});
  lines2D10.forEach((ln,i)=>{
    const isLast=(i===lines2D10.length-1);
    let totalW10=0,wordCount10=0;
    ln.tokens.forEach(t=>{if(t.word.trim()){totalW10+=doc10.getTextWidth(t.word);wordCount10++;}});
    const numSpaces10=wordCount10-1;
    const extraSpace10=isLast?SPACE_W10:(numSpaces10>0?(CW10-(ln.startX-ML10)-totalW10)/numSpaces10:SPACE_W10);
    const spaceAdj10=isLast?SPACE_W10:Math.max(SPACE_W10*0.5,Math.min(SPACE_W10*2.5,extraSpace10));
    let rx10=ln.startX;
    ln.tokens.forEach((t,ti)=>{
      if(t.word==='') return;
      doc10.setFont(F10,'normal'); doc10.text(t.word,rx10,y10);
      if(t.underline) doc10.line(rx10,y10+1.5,rx10+doc10.getTextWidth(t.word),y10+1.5);
      if(ti<ln.tokens.length-1) rx10+=doc10.getTextWidth(t.word)+spaceAdj10;
    });
    y10+=LH10;
  });

  // "This ___ day of ___, ____"
  y10+=8;
  const txtThis10='This ';
  let tx10=ML10;
  doc10.setFont(F10,'normal');
  doc10.text(txtThis10,tx10,y10); tx10+=doc10.getTextWidth(txtThis10);
  const txtDay10=nDay10+nOrd10;
  doc10.text(txtDay10,tx10,y10); doc10.line(tx10,y10+1.5,tx10+doc10.getTextWidth(txtDay10),y10+1.5); tx10+=doc10.getTextWidth(txtDay10);
  doc10.text('  day of ',tx10,y10); tx10+=doc10.getTextWidth('  day of ');
  doc10.text(nMon10,tx10,y10); doc10.line(tx10,y10+1.5,tx10+doc10.getTextWidth(nMon10),y10+1.5); tx10+=doc10.getTextWidth(nMon10);
  doc10.text(' , ',tx10,y10); tx10+=doc10.getTextWidth(' , ');
  doc10.text(nYrFull10,tx10,y10); doc10.line(tx10,y10+1.5,tx10+doc10.getTextWidth(nYrFull10),y10+1.5);
  y10+=20;

  // Signature
  const sigLineW10=70;
  doc10.setFont(F10,'bold'); doc10.setFontSize(12);
  doc10.text(chairman10,MID10,y10,{align:'center'});
  doc10.line(MID10-sigLineW10/2,y10+1.5,MID10+sigLineW10/2,y10+1.5); y10+=5;
  doc10.setFont(F10,'normal'); doc10.setFontSize(12);
  doc10.text('Punong Barangay',MID10,y10,{align:'center'}); y10+=18;

  // "Notified this __ day of __, 20__"
  const filedDt10 = f10case.dateFiled ? new Date(f10case.dateFiled+'T00:00:00') : null;
  const ntfYr210  = filedDt10 ? String(filedDt10.getFullYear()).slice(-2) : '____';
  const ntfDayBlankW10=14;
  const ntfMonBlankW10=doc10.getTextWidth('DECEMBER');
  let ntx10=ML10;
  doc10.text('Notified this ',ntx10,y10); ntx10+=doc10.getTextWidth('Notified this ');
  doc10.line(ntx10,y10+1.5,ntx10+ntfDayBlankW10,y10+1.5); ntx10+=ntfDayBlankW10;
  doc10.text(' day of ',ntx10,y10); ntx10+=doc10.getTextWidth(' day of ');
  doc10.line(ntx10,y10+1.5,ntx10+ntfMonBlankW10,y10+1.5); ntx10+=ntfMonBlankW10;
  doc10.text(', 20',ntx10,y10); ntx10+=doc10.getTextWidth(', 20');
  doc10.text(ntfYr210,ntx10,y10); doc10.line(ntx10,y10+1.5,ntx10+doc10.getTextWidth(ntfYr210),y10+1.5);
  y10+=18;

  // Bottom signature columns
  const BOT_LX10=ML10, BOT_RX10=MID10+6, BOT_COL_W10=MID10-ML10-6;
  doc10.setFont(F10,'normal'); doc10.setFontSize(12);
  doc10.text('Complainant/s',BOT_LX10+BOT_COL_W10/2,y10,{align:'center'});
  doc10.text('Respondent/s',BOT_RX10+BOT_COL_W10/2,y10,{align:'center'});
  y10+=LH10+4;
  const renderBotCol10=(names,colX,colW,startY)=>{
    let cy=startY;
    names.forEach((nm,idx)=>{
      if(idx>0) cy+=LH10+4;
      doc10.line(colX,cy,colX+colW,cy);
      doc10.setFont(F10,'bold'); doc10.setFontSize(12); cy+=LH10-1.5;
      const nmLines=doc10.splitTextToSize(nm,colW);
      nmLines.forEach((ln,li)=>{doc10.text(ln,colX+colW/2,cy+li*LH10,{align:'center'});});
      cy+=nmLines.length*LH10;
    });
    return cy;
  };
  renderBotCol10(cNames10,BOT_LX10,BOT_COL_W10,y10);
  renderBotCol10(rNames10,BOT_RX10,BOT_COL_W10,y10);

  return {doc:doc10, caseNo: f10case.caseNo||kpD.caseNo||kpS.caseNo||'form'};
}

function downloadKpForm10(){
  const data=kpfGetData();
  // Try to find the linked case — if a saved PDF exists, download it directly
  const caseId = (state.kpFormsData&&state.kpFormsData._caseId) || state.kpFormsReturnCaseId;
  const linkedCase = caseId ? state.cases.find(x=>x.id===caseId) : null;
  const form10Att = linkedCase ? (linkedCase.attachments||[]).find(a=>a._generated&&/Form 10/i.test(a.name)) : null;
  if(form10Att && form10Att.dataUrl){
    const a=document.createElement('a');
    a.href=form10Att.dataUrl;
    a.download=`KP_Form10_${data.caseNo||'form'}.pdf`;
    a.click();
    return;
  }
  try {
    const result=_buildForm10Doc();
    result.doc.save(`KP_Form10_${result.caseNo}.pdf`);
  } catch(e){
    console.error('Form 10 download error:',e);
  }
}
function downloadKpForm11(){
  const data=kpfGetData();
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const members=[
    {name:data.pangkatChair     ||'____________________________',role:'Chosen Pangkat'},
    {name:data.pangkatSecretary ||'____________________________',role:'Chosen Pangkat'},
    {name:data.pangkatMember    ||'____________________________',role:'Chosen Pangkat'}
  ];
  members.forEach((pm,idx)=>{if(idx>0)doc.addPage();_fillKpForm11(doc,data,pm);});
  doc.save(`KP_Form11_${data.caseNo||'form'}.pdf`);
}
function downloadKpForm12(){
  const data=kpfGetData();
  window._kpfConcOverride=data;
  const doc=_buildConcFormPdf('form12');
  window._kpfConcOverride=null;
  doc.save(`KP_Form12_${data.caseNo||'form'}.pdf`);
}

function kpfSwitchTab(which){
  // Switch the header tab highlight
  ['form7','form8','form9','form10','form11','form12'].forEach(f=>{
    const tab=document.getElementById('kpf-tab-'+f);
    if(!tab)return;
    const active=f===which;
    const isConc=f==='form10'||f==='form11'||f==='form12';
    tab.style.background=active?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.08)';
    tab.style.color=active?'#fff':'rgba(255,255,255,0.6)';
    tab.style.borderBottom=active?('3px solid '+(isConc?'#a78bfa':'var(--teal)')):'3px solid transparent';
    tab.style.fontWeight=active?'700':'600';
  });
  // Show/hide Form 7 details section
  const f7details=document.getElementById('kpf-form7-details');
  if(f7details) f7details.style.display=which==='form7'?'block':'none';
  // Hide Nature/For + Hearing Date/Time fields on Form 7 and Form 11 (not used in those prints)
  const nonF7fields=document.getElementById('kpf-non-form7-fields');
  if(nonF7fields) nonF7fields.style.display=(which==='form7'||which==='form11')?'none':'flex';
  // Show/hide Form 10/11/12 pangkat fields (also Form 9 when in conciliation context)
  const concDetails=document.getElementById('kpf-conc-details');
  const isConc=which==='form10'||which==='form11'||which==='form12';
  const isConcForm9=which==='form9'&&!!(state.kpFormsData&&state.kpFormsData.isConc);
  if(concDetails) concDetails.style.display=(isConc||isConcForm9)?'block':'none';
  // Toggle download buttons: show/hide conc download buttons
  ['form10','form11','form12'].forEach(f=>{
    const btn=document.getElementById('kpf-dl-'+f);
    if(btn) btn.style.display=isConc?'flex':'none';
  });
  ['form7','form8','form9'].forEach(f=>{
    const btn=document.getElementById('kpf-dl-'+f);
    if(btn) btn.style.display=!isConc?'flex':'none';
  });
  // Trigger preview
  kpShowPreview(which);
}

function kpShowPreview(which){
  const frame=document.getElementById('kpf-pdf-frame');
  const htmlFrame=document.getElementById('kpf-html-frame');
  const empty=document.getElementById('kpf-empty-state');
  const label=document.getElementById('kpf-preview-label');
  const data=kpfGetData();

  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});

  if(which==='form7') _fillKpForm7(doc,data);
  else if(which==='form8') _fillKpForm8(doc,data);
  else if(which==='form9'){
    _fillKpForm9(doc,data);
    doc.addPage();
    _fillKpForm9Page2(doc,data);
  } else if(which==='form10'){
    // Use the shared _buildForm10Doc helper — always has content from case/schedule data
    const caseId10 = (state.kpFormsData&&state.kpFormsData._caseId) || state.kpFormsReturnCaseId;
    const linkedCase10 = caseId10 ? state.cases.find(x=>x.id===caseId10) : null;
    const form10Att = linkedCase10 ? (linkedCase10.attachments||[]).find(a=>a._generated&&/Form 10/i.test(a.name)) : null;
    if(form10Att && form10Att.dataUrl){
      if(htmlFrame){htmlFrame.style.display='none';htmlFrame.srcdoc='';}
      if(frame){frame.src=form10Att.dataUrl;frame.style.display='block';}
      if(empty)empty.style.display='none';
      if(label){label.textContent='KP Form No. 10 — Pangkat Constitution';label.dataset.current=which;}
      ['form7','form8','form9','form10','form11','form12'].forEach(f=>{
        const btn=document.getElementById('kpbtn-'+f);
        if(btn){btn.style.borderColor=f===which?'var(--navy)':'#e5e7eb';btn.style.background=f===which?'#e6f4f5':'#fff';}
      });
      return;
    }
    try {
      const result10=_buildForm10Doc();
      const dataUri10=result10.doc.output('datauristring');
      if(htmlFrame){htmlFrame.style.display='none';htmlFrame.srcdoc='';}
      if(frame){frame.src=dataUri10;frame.style.display='block';}
      if(empty)empty.style.display='none';
      if(label){label.textContent='KP Form No. 10 — Pangkat Constitution';label.dataset.current=which;}
      ['form7','form8','form9','form10','form11','form12'].forEach(f=>{
        const btn=document.getElementById('kpbtn-'+f);
        if(btn){btn.style.borderColor=f===which?'var(--navy)':'#e5e7eb';btn.style.background=f===which?'#e6f4f5':'#fff';}
      });
      return;
    } catch(e){ console.error('Form 10 preview error:',e); }
  } else if(which==='form11'){
    const members = [
      { name: data.pangkatChair     || '____________________________', role:'Chosen Pangkat' },
      { name: data.pangkatSecretary || '____________________________', role:'Chosen Pangkat' },
      { name: data.pangkatMember    || '____________________________', role:'Chosen Pangkat' }
    ];
    members.forEach((pm, idx) => { if(idx>0) doc.addPage(); _fillKpForm11(doc, data, pm); });
  } else if(which==='form12'){
    _fillKpForm12(doc, data);
  }

  const dataUri=doc.output('datauristring');
  if(htmlFrame){htmlFrame.style.display='none';htmlFrame.srcdoc='';}
  if(frame){frame.src=dataUri;frame.style.display='block';}
  if(empty)empty.style.display='none';
  if(label){
    const labels={form7:'KP Form No. 7 — Complaint',form8:'KP Form No. 8 — Notice of Hearing',form9:'KP Form No. 9 — Summons + Officer\'s Return',form10:'KP Form No. 10 — Pangkat Constitution',form11:'KP Form No. 11 — Notice to Pangkat Members',form12:'KP Form No. 12 — Conciliation Hearing Notice'};
    label.textContent=labels[which]||which;
    label.dataset.current=which;
  }
  ['form7','form8','form9','form10','form11','form12'].forEach(f=>{
    const btn=document.getElementById('kpbtn-'+f);
    if(btn){btn.style.borderColor=f===which?'var(--navy)':'#e5e7eb';btn.style.background=f===which?'#e6f4f5':'#fff';}
  });
}

function _fmt12hrTime(t){
  if(!t)return'';
  t=t.trim();
  // Already has AM/PM — normalize leading zeros and return
  if(/AM|PM/i.test(t)){
    // Strip leading zero from hour: "09:00 PM" -> "9:00 PM"
    return t.replace(/^0(\d)(:\d{2}\s*(AM|PM))/i,'$1$2');
  }
  // 24h format: "HH:MM" or "H:MM"
  const parts=t.split(':');
  if(parts.length<2)return t;
  let h=parseInt(parts[0],10);
  const m=parts[1].substring(0,2);
  const ampm=h>=12?'PM':'AM';
  const h12=h%12||12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

function renderKpForm9Html(d){
  const schedDt=d.schedDate?new Date(d.schedDate+'T00:00:00'):null;
  const filedDt=d.dateFiled?new Date(d.dateFiled+'T00:00:00'):null;
  const MONTHS_FULL=['January','February','March','April','May','June','July','August','September','October','November','December'];

  function ordDay(dt){
    if(!dt)return'____';
    const n=dt.getDate();
    const s=['th','st','nd','rd'];
    const v=n%100;
    return n+(s[(v-20)%10]||s[v]||s[0]);
  }
  function fmtMon(dt){return dt?MONTHS_FULL[dt.getMonth()].toUpperCase():'_____';}
  function fmtYr2(dt){return dt?String(dt.getFullYear()).slice(-2):'__';}
  function fmtMonServe(dt){return dt?MONTHS_FULL[dt.getMonth()]:'_____';}

  // User input field — blank underlined span
  function inp(val, minW='80px'){
    const v=val?(escHtml(String(val))):'';
    return `<span class="inp" style="min-width:${minW}">${v}</span>`;
  }

  const respName=(d.respondent||'').toUpperCase();
  const time9=_fmt12hrTime(d.schedTime||'');
  const time9Display=time9.replace(/\s*(AM|PM)$/i,'').trim();
  const timeParts=time9.toUpperCase();
  const isMorning=timeParts.includes('AM');
  const isAfternoon=timeParts.includes('PM');
  const morningStyle=isMorning?'text-decoration:underline;':'';
  const afternoonStyle=isAfternoon?'text-decoration:underline;':'';

  const chairman=(d.chairman||'HON. ABUNDIO A. LEONES').toUpperCase();
  const officer=(d.officer||'RAMIL ROSALES').toUpperCase();
  const caseNo=escHtml(d.caseNo||'');
  const dfVal=d.dateFiled?`${ordDay(filedDt)} of ${fmtMon(filedDt)}, 20${fmtYr2(filedDt)}`:'';
  const caseTitle=escHtml(d.caseTitle||'');
  const complainant=(d.complainant||'').toUpperCase();
  const complainantAddr=escHtml(d.complainantAddress||'');
  const respondentAddr=escHtml(d.respondentAddress||'');

  // Time filed formatting
  let tfDisplay='';
  if(d.timeFiled){
    tfDisplay=_fmt12hrTime(d.timeFiled);
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{
    font-family:'Times New Roman',Times,serif;
    font-size:10pt;
    color:#000;
    background:#e0e0e0;
    padding:20px 0;
    letter-spacing:0.01em;
  }
  .page{
    width:210mm;
    min-height:297mm;
    background:#fff;
    margin:0 auto 24px auto;
    padding:25.4mm 25.4mm 25.4mm 25.4mm;
    box-shadow:0 2px 16px rgba(0,0,0,0.18);
    position:relative;
  }
  .page-label{font-size:10pt;font-weight:normal;margin-bottom:1px;color:#000;}
  .kp-form-title{font-weight:bold;}
  .page-num{font-weight:normal;}
  .center{text-align:center;}
  .bold{font-weight:bold;}
  .justify{text-align:justify;}
  .right{text-align:right;}
  .inp{
    display:inline-block;
    border-bottom:1.2px solid #000;
    min-width:80px;
    color:#000;
    font-weight:normal;
    vertical-align:baseline;
    line-height:1.4;
    text-align:center;
    background:transparent;
    padding-bottom:1px;
  }
  .inp:empty::after{content:' ';display:inline-block;min-width:80px;}
  .inp-plain{
    display:inline-block;
    min-width:60px;
    color:#000;
    font-weight:normal;
    vertical-align:baseline;
  }
  /* keep the "20" text from floating up */
  .yr-prefix{vertical-align:baseline;display:inline;}
  .to-block{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:8px 0;}
  .sig-line{border-top:1px solid #000;display:inline-block;min-width:140px;text-align:center;margin-top:4px;}
  .sig-label{font-size:9pt;text-align:center;}
  .items-table{width:100%;margin:8px 0;}
  .items-table td{padding:3px 0;vertical-align:top;}
  .items-table .left-blank{width:45%;border-bottom:1px solid #000;padding-right:10px;}
  .items-table .right-text{width:55%;padding-left:10px;}
  .officer-sig-wrap{text-align:center;margin:18px 0 6px;}
  .officer-name-line{display:inline-block;border-bottom:1.5px solid #000;min-width:180px;text-align:center;padding:0 8px;font-weight:bold;}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px;}
  .sig-cell{text-align:center;}
  .sig-cell .sig-line{display:block;width:100%;border-top:1px solid #000;margin-bottom:3px;}
  p{margin:4px 0;}
  .header-section{margin-bottom:10px;}
  .parties-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0;}
  .party-right{text-align:left;}
  .summons-title{text-align:center;letter-spacing:4px;font-weight:bold;font-size:11pt;margin:10px 0;}
</style>
</head>
<body>

<!-- ═══════════ PAGE 1: SUMMONS ═══════════ -->
<div class="page">
  <div class="page-label"><span class="kp-form-title">KP Form No. 9</span><br><span class="page-num">Page 1</span></div>

  <!-- Centered header -->
  <div class="center header-section" style="margin-top:10px">
    <div>Republic of the Philippines</div>
    <div>City of Butuan</div>
    <div>Barangay Pangabugan</div>
  </div>

  <!-- Office title — bold, NO underline -->
  <div class="center bold" style="margin:12px 0 10px;font-size:11pt;">OFFICE OF THE LUPONG TAGAPAMAYAPA</div>

  <!-- Parties + DF/Case info -->
  <div class="parties-row">
    <div class="party-left">
      <div class="bold" style="text-transform:uppercase">${escHtml(complainant)}</div>
      <div>${complainantAddr}</div>
      <div>Butuan City</div>
      <br>
      <div>- against -</div>
      <br>
      <div class="bold" style="text-transform:uppercase">${respName}</div>
      <div>${respondentAddr}</div>
      <div>Butuan City</div>
      <div>Respondent/s</div>
    </div>
    <div class="party-right">
      <div>DF: <span class="inp-plain">${d.dateFiled?`${fmtMon(filedDt).slice(0,1)}${fmtMon(filedDt).slice(1).toLowerCase()}-${filedDt.getDate()}-${filedDt.getFullYear()}`:''}</span></div>
      <div>Barangay Case No. <span class="inp-plain">${caseNo}</span></div>
      <div>For: <span class="inp-plain">${caseTitle}</span></div>
      <div>TF: <span class="inp-plain">${tfDisplay}</span></div>
    </div>
  </div>

  <!-- SUMMONS title — NO hr lines above/below -->
  <div class="summons-title">S U M M O N S</div>

  <!-- To: block -->
  <div class="to-block" style="margin-top:8px">
    <div>
      <div style="display:flex;align-items:baseline;gap:4px">
        <span>To:&nbsp;</span>
        <span class="bold" style="${respName ? 'border-bottom:1px solid #000;' : ''}min-width:160px;display:inline-block;text-align:left">${respName}</span>
      </div>
      <br>
      <div>Respondent/s</div>
    </div>
    <div></div>
  </div>

  <!-- Body paragraphs -->
  <p class="justify" style="margin-top:12px;line-height:1.8">
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;You are hereby summoned to appear before me in person, together with your witness/es,
    on the ${inp(ordDay(schedDt),'50px')} day of ${inp(fmtMon(schedDt),'70px')}, <span class="yr-prefix">20</span>${inp(fmtYr2(schedDt),'30px')}
    at ${inp(time9Display,'60px')} o'clock in the
    <span style="${morningStyle}">morning</span>/<span style="${afternoonStyle}">afternoon</span>,
    then and their answer to a complaint made before me, copy of which is attached hereto, for mediation/conciliation of your dispute with complainant/s.
  </p>

  <p class="justify" style="margin-top:10px;line-height:1.8">
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;You are hereby warned that if you refuse or willfully fail to appear in obedience to this summons, you may be barred from filing any counterclaim arising from said complaint.
  </p>

  <p style="margin-top:10px;line-height:1.8">
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;FAIL NOT or else faces punishment as for contempt of court.
  </p>

  <!-- This day line -->
  <p style="margin-top:14px;line-height:1.8">
    This ${inp(ordDay(filedDt),'50px')}&nbsp; day of &nbsp;${inp(fmtMon(filedDt),'70px')}&nbsp; <span class="yr-prefix">20</span> ${inp(fmtYr2(filedDt),'30px')} .
  </p>

  <!-- Chairman signature — bold, NO underline on text -->
  <div style="margin-top:28px;text-align:right">
    <div style="display:inline-block;border-bottom:1.5px solid #000;padding:0 4px">
      <span class="bold">${escHtml(chairman)}</span>
    </div>
    <div>Punong Barangay/Lupon Chairman</div>
  </div>
</div>

<!-- ═══════════ PAGE 2: OFFICER'S RETURN ═══════════ -->
<div class="page">
  <div class="page-label"><span class="kp-form-title">KP Form No. 9</span><br><span class="page-num">Page 2</span></div>

  <!-- Title — bold, NO underline -->
  <div class="center bold" style="font-size:11pt;margin:14px 0 18px;">OFFICER'S RETURN</div>

  <!-- Intro line -->
  <p style="line-height:2">
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;I serve this summons upon respondent &nbsp;${inp(respName,'160px')}
  </p>
  <p style="line-height:2;margin-top:4px">
    on the &nbsp;${inp('','50px')}&nbsp; day of &nbsp;${inp(fmtMonServe(filedDt),'70px')}&nbsp; ${inp(d.dateFiled?String(filedDt.getFullYear()):'','60px')}&nbsp;, and upon respondent/s &nbsp;${inp('','100px')}&nbsp; on the day of &nbsp;${inp('','120px')}&nbsp; by:
  </p>
  <p style="font-size:9pt;color:#000;margin-top:2px">
    (Write your name/s of respondent/s and by which mode he/they was/were served.)
  </p>

  <p style="margin:10px 0 6px;margin-left:60px">Respondent/s</p>

  <!-- 4-item list -->
  <table class="items-table" cellspacing="0" cellpadding="0">
    <tr style="height:36px">
      <td class="left-blank">&nbsp;</td>
      <td class="right-text">1. Handing to him/them said summons in<br>&nbsp;&nbsp;&nbsp;&nbsp;person or;</td>
    </tr>
    <tr style="height:10px"><td colspan="2"></td></tr>
    <tr style="height:36px">
      <td class="left-blank">&nbsp;</td>
      <td class="right-text">2. Handing to him/them said summons and<br>&nbsp;&nbsp;&nbsp;&nbsp;he/they refuse to receive it;</td>
    </tr>
    <tr style="height:10px"><td colspan="2"></td></tr>
    <tr style="height:36px">
      <td class="left-blank">&nbsp;</td>
      <td class="right-text">3. Leaving said summons at his/their dwelling with</td>
    </tr>
    <tr>
      <td>&nbsp;</td>
      <td style="padding:6px 0 2px 10px">
        <div style="border-top:1px solid #000;width:200px;margin:0 0 2px 0">&nbsp;</div>
        <div style="font-size:9pt;text-align:center;width:200px">(Name)</div>
        <div style="margin-top:2px">a person of suitable age, discretion, and residing<br>therein, or;</div>
      </td>
    </tr>
    <tr style="height:10px"><td colspan="2"></td></tr>
    <tr style="height:36px">
      <td class="left-blank">&nbsp;</td>
      <td class="right-text">4. Leaving said summons at his/ their office/place<br>&nbsp;&nbsp;&nbsp;&nbsp;of business with</td>
    </tr>
    <tr>
      <td>&nbsp;</td>
      <td style="padding:6px 0 2px 10px">
        <div style="border-top:1px solid #000;width:200px;margin:0 0 2px 0">&nbsp;</div>
        <div style="font-size:9pt;text-align:center;width:200px">(Name)</div>
        <div style="margin-top:2px">a competent person in charge thereof.</div>
      </td>
    </tr>
  </table>

  <!-- Officer signature — bold, NO text-underline -->
  <div class="officer-sig-wrap">
    <div class="officer-name-line">${escHtml(officer)}</div>
    <div style="text-align:center;margin-top:4px">Officer</div>
  </div>

  <!-- Received by -->
  <p style="margin-top:18px">Received by Respondent/s or Representative/s:</p>
  <div class="sig-grid" style="margin-top:18px">
    <div class="sig-cell">
      <span class="sig-line"></span>
      <div class="sig-label">(Signature)</div>
    </div>
    <div class="sig-cell">
      <span class="sig-line"></span>
      <div class="sig-label">(Signature)</div>
    </div>
    <div class="sig-cell" style="margin-top:20px">
      <span class="sig-line"></span>
      <div class="sig-label">(Signature)</div>
    </div>
    <div class="sig-cell" style="margin-top:20px">
      <span class="sig-line"></span>
      <div class="sig-label">(Signature)</div>
    </div>
  </div>
</div>

</body>
<!-- Floating Footer: Made by San and Reg -->
<style>
#sanreg-footer {
  position: fixed;
  bottom: 14px;
  right: 18px;
  z-index: 99999;
  display: flex;
  align-items: center;
  gap: 9px;
  background: #14919b;
  border: none;
  border-radius: 40px;
  padding: 5px 16px 5px 5px;
  box-shadow: 0 4px 18px rgba(20,145,155,0.35), 0 1.5px 5px rgba(0,0,0,0.12);
  pointer-events: none;
  user-select: none;
  transition: opacity 0.2s;
}
#sanreg-footer img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  display: block;
  border: 2px solid rgba(255,255,255,0.4);
}
#sanreg-footer span {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.01em;
  white-space: nowrap;
  line-height: 1;
}
#sanreg-footer em {
  font-style: normal;
  color: #ffffff;
  font-weight: 700;
}
@media (max-width: 480px) {
  #sanreg-footer {
    bottom: 10px;
    right: 10px;
    padding: 4px 12px 4px 4px;
    gap: 7px;
  }
  #sanreg-footer img { width: 26px; height: 26px; }
  #sanreg-footer span { font-size: 11px; }
}
</style>
<div id="sanreg-footer">
  <img src="data:image/jpeg;base64,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BTRJEdx33D0jmil+8fNHGpbMzwpLsEG1LPYtyBtHDMj1J9oQtIp7GSN4WMFE/wBbFC3V8m1yXMruFCdzULjl43a8ZpQyX7Z41sJaf6gaAH4QQiFpaUkccrCyzins27fqQop5IVDkmn0a9jxsxgoxaTbNiJR32OTJI3/bOc1g269GE+aeRSXa1dWr8s6p42xb/dWqQVG6+2IRC0tdJsfTnUuAhKfgroTsVkWI1LYXYnTatt6bick9MwF9yi+HGKDEY+FN0Br8L0iEQiFpWKkFoKzi7EG3A9GSPj9Ysm5qjuQyr0K7YToU2azEm33JtyApskbve9AnWoGI3gjLaendtvrLkIo/Sa5NIq9axbdqph4INP39zpaRC0tLXXblyeuTltb6BD8O0iFpa6WKdaypsPYZ6nbHFu1tR2541HlEy/A9BzHLTSu2EYlqVqE9lq8bYC8e9DIL9RjX6hEvHsXj2rx6N2VeKslF9l6MQW67FJkoI1LlJXp8z3qCvYtFQYWJunDTWhvTSA+40tLS0uK0uK4rS0tLS0tID8P0tLSIWuksUU7eM+FjPrNSt1/UOBW+jJXsTbs4TMm4JuTiQvQFCeMruMXJi/hrUa/hL+EucSM8QRvQtT8nGnZN6fcncjI5y+Z1Dibs3rXxFSH136AddLX3mlpaWlpcVxXFcVpaWvxHS0tLS0tL5KWrWnUuFhKkxN1ikjlhQcCtra2trm5CaVeImXiZ14mZd+Vdx5W1tFyjimmUeHuvUWDrNUMMNca66Wlr/BaWlpaWvxbSIWlpaWlrpsp9atKnYmg5OwcSOEmRw14L9KyAX6dkF+n5BfpuQX6XkUMPfKGEspuDCZh6LUyrUiWz5dLS0tfn+lpaWlpcVpa9/S0tLS0tLX/QelpaWlpaWlpaWlpaWlpaWlpaWlpaWlpa/wCi9LS0tLS0tLS0tLS0tLS0tLX/AEhpaWlpaWlpa/8A65X/xAAC/9oADAMBAAIAAwAAABD333kF330l3lW3X3333213nU0132000lWnnX0U0kUlX1X3332V31X33V2003n2X23k03233l2mEE000z333z3H3n323X2332133333X333333133013lHW3H23l33321333Wk3303211132kn33332033HW11Xy3333321H2n033332lW0n23n333331X1333221n23323333333313333z3331F3m32333nnH32n333X3zzX3m2WWnUHnH31333mn2G323HXX1n3nX3U00EX3321n3333nn332F33nnnXH2332331X31X33XH1kH3133n232013mn33zz2133HHH33l333313nX2n3333l23X331X3322H321213X3X33331l3332X01W3H3333333333230333z33300nH3l333333F3311333333FX333V13333333333n2U2X32332331331n333mV333333333mn333333333Hm133m2Xn3z3lE3333mX3333H213333333332H32UHnn23knmH33H3nF23nX333lX3m3n3333333323n22GH33kXHH3kXl2121333nGX33333333332333lHn0F3Gmnnn33nUkF333H33W0133V3333333nH33m12nn32mkG133mH03HX331mn3333333n333213322322nXkm1133E3033X3nX32H0H3H3333332n0133320132nH3H32HnX32XH323W3H3333213HH30HnG033X33nHV3GGEX3H131X1XV3333X33333X21333l32k3WXUX333321nXkW33331H32E332000322mnX3U13H2HX33X1F3UH3300313XmH3mX330133333n2232021133332V33HEkn3X3X322knnX333333301313U023n3lHEE3kF33113133133333333333333X33321SiGXiYGXUf3X2333333333m0013H33333203333HX33nnmHn332nmX33H21333333333333333333hnLVvtS4+MNXGAqn3WulnX3G3HW3kHHX3332lX012333GGH21203F233V33X333n331X333nX3GEGGv/odYXiiQwQT8n975e010GW3l3303XnW33nHGk3333131mXH3nFX1130X1n1n3313332lWV322W0nUuZigLEnU012n2QyuYcyfGm33n3nH33333323GV33V0V3V33X233XHH3333m0l333lHX331V2n3F333xnVKszUHHHX1ml1FQVbj3kkn33nXGX33333331122lnn3XnUkU3130333n33333H3H33H30FW330HWXpN+cm23331n3X221HC5R+FnnX33333UnH33333H20m3X30Gn333HX31n3n3GXW133nX012nHH33320Cl2zCWX3m1m3HHH3233zjhmGmnHHH223H3333GG3333F33X2HH32230zX2103X0nnX33333323nX2lhuu+03H33201n22HH3201jIP33knl333023nG202m3333HXn23HX33nU32U1X32WkVH3nnX1mXX320kj6/Rimn3nHU0H32X0210WuGmk22G2n333Hn313333WX3l31X3nn33X33333X3321323H30E2X233mEVBbVH71XGF33n3W3H33nWkFSEX133m333333U23HHWk3lXnEW320n0m33322X22lWnml3k033X3313l06DtWkF333Xm3X213330GHkiX3l3mH3333333V3kV332Gn32F2m1n333nH2130X33nn3F312nX/wCl5dRACeeGqx9p9vzjHz/w9pEBnZn0vyhdr99R9t9Zlxd1BV1tt9t9h999999B999955xt5hx99199t09ttNpr8sMHb19dHa7yZuQ1W2L5sj3jKQDfow39N5xxF1d9JZ99p5lN9lVpRlB19t9NlVtd9xd9Zxk14J99N9BZHITB89tFFEmxjZPmJPTrNRhTP0Q5NFwdN5tt999tNx1dJR95x9lx9Btdt99R999t9tNd31Gw/wDeYSRGQeDLwRhlZTfHTQ1VJpeFfbUVUOmkzTBMvfbcfffffaceffcRZTVbccecfffbdVfXffffa1VVbGXbdVYGG749mgWcRUT3QbIyDdXfffYaQLmKDlME8dfVfedffbZfcffTfWfdQTWVffRXXffffedR990J4fffVbfFepUyMJYN9T1c8Owh/fYXbTQTdRQ+PzisMcbcVfVcdffQffffdfbQZfdfbbWdffffbbX1qKrMXfbfRS4t7FQactDw3effMhq+cSfffebaaReIzKda/TcWfbRXffXfffdedbQefffXUZdfffedeSAzi+JedbbUeYj5fLRra2mh9IOqduyfafffXecdfg1u4l9CbfTcccfccffcUaUcXfXeXfVeffffffXacUGQIlffdffyXbVJQuno6ejpyhsd66ddfXedfbQeevo+SMjfbfbcfbcfffccffcecfbXfYRfdffffTRdSH67NPZei6xbbULbePEmcNtZdNT7fcdTQXdffbabuw2/PJfffdTffaRefbfebfffffbXbTUXbXffXYc11YnefVZUUMVRadalKOjl94SkuAvTffYXfdffWXXqNBzP6dffffedXfffafTbVfffffccZffffffSAxcsaCU+SviDPQRaddSHVYziSZOtauHfXaffWceeQanmKydbVccffbRXfaVaedfWTQedfXfffdedef8ARwbDFi5GGzhfxUV31kWkQxZ6uya1RtX3H13331m22l5/jI2vmX0nHmlGX3320H33mH1Gm33X313nH1ETN30wzGj3WtbtFUVmUUmn2RKhrSATxb6pn3X32n1lfXjhqEqXn2133HX333WX3FHX32WH31E03331lUl5nOZnYDjydvxEWn1HX2nVnWinF+5rJGhBFX331mUGxJRvSEn0VHX31nX2kHHHV330HmH3n321nX31Umh8yRQZ3cJHsXHX31k1n0XV9M79wDu8a6/6lX333osdRDk8nXV3lHHGmX21032E330H33nX0V120U32XESZvPQNitjgG1qpvSd13F0fA+ZI48TL2A4H3m01JLyQ0dW0HHGHHFVnH3HX3nGH30332mXGWkX23H2V338elSOuEFtJ/wCSAHh84jNN4B2APBVNvxiF5d96u07t/phxt91p5lN9B9dh99999999tF9919px95Nd9NZMTMgUJ0lhAwUMU/4gnzvsxLruqK6fL6b194wSeOcQt199ZdtdNN9599t999999B9t999xxhBFp95995NxneUTTDtZZhVVVk56ByV3H7wBeip7ytV31HklnEh5R15d9999tZl999999999999999999d9t5jTMxglOP/U7spRZFNBN5lkvboBIyftd7DM9ofH29wwMh5lRhl99999NlZ5Nd99F9999pV99919999dFptYUM7VT9ZhlpdqRdZFdVFo5YGfmXFXOkKEz+uLY/K5Z9ZNRV99x9t99ppp99999x199td9tZ1995p1NIws11RL+7VlZIxz9Fd9t59YdX2cbbHdTLkX8I6LANvN95xN99BB1p9pd9NN9999JRBV5h99tFl99tJvw4r7FHQRg9hJF4vVx95199RR3U95lFNzJ9lL+pI5H8n19NdV99VZ1p9V5hxRRx99tN9t995d91d9B1xwqyAHqkLd5nFXggVNZxpBB3pGrWMVNJabp9B1IOJRfon19x19p9xdp5dVt9Ndlp5N9d599599Vtd5dpNQdIkG/JfVh2MFKxZ99N9pFCXAYG7JVw9JFtN6AGdRG/TxlV99N99hZ95tJ9999txBhN119xh199ZV9lJNcsfi2ktJwD8ptRx99ZlNZuM9rwNpkGnNh1gEmLA8xzpx199999Zd9p9999995FBFJJ999t999pd9xVd9dNwRJddRLLRhx199tVpzO6SE3bYvjUdNtpZmmJPiPD9999Rx9l999Nx9995FtNV5151919p99d9d9dd7NtpXTn1s1x1pd55Jxh3BlC3Wg4qO1F995JfdDqHlg/wCYXbdUcSQfffffXfcXfbTTXdffbTSeZTfftZqY178IUnJAbfabfdffaTn8444z9FQTXdffedZCFniCnLTdfaXfXfQcQffUdffTffbRffcdeYcZTfcYXRh/FBaz6TeXffbdXfbYdE5zYufB/aATfffdVd5NdfSyk/WffcbfaXfcdbcdffffffWcVTTXffZcYdKwiAm0DaDEpfccXfffeXUwjnAog8NP3wMcdfXVRQpDAK7WsYfffafbffdffcfdfffffVVfecfZTfccYVHbp4dkPVeXffffdXfbTTNExCCXeeYUexNPTXTdYMAjT2ZbQfffYRXffcUfYTddfffffffeffffffecTZLqhswjQh92dTSUfffefkBaAwXXj8eYcsjYffecZrzPHaqt0dfcbXdfdcTdfcdfffffffffVfffcVXRZcYOFJFM5dO/ffffftaRZccBm+Dt3BKTOrnv+Ncfb1M4tEJtffZfffdTfffTbdTefTXbfffTTXcbWSRSQRUVTUVC4M78dffbmPEgAniWbIJQlOTUUaZLb3SfXvRzhfm4QffffaffffbVaffRffYXffffbfWdfeRXbSVfSQaOepr8ffRXZFLPLHEFMPdefcWRXZivaQQdFp98Vwi3ffRWfQfbTeffQWVfffXffccffcXbeYffeVfbeXbFS5R/fUZRQcQYffccRffSfRTeS1acdXcbRFKvP1yHfVfTfebXfdfTYfXafTXecRbTfdfRcdfbffffXXdIH0RdN/fbXfffffbTUZfVeTGrUQefaccdiTaxLh+88jXZfdUddffLXcYZeccbSdecfZffdfffffdZbUUBuj+ZOzdffffffTffau/ryoDTVYcYZUWXcvH23/zbG4ffffSfecffffWbddSXffeXcdbffdWdWfffeURPh68YDdQt/dMOo8uQl4jXZfSTXadbSaRfICs6qFUUdffYbXfaQfffaQWZWfffUecdfaXeZffbfdffSaXWNHj/AK6k0XiwFuj5kRSW332n0EFH1E3H3XG33kVlnHHXFXWmnGn33333201lVHX3Xm3GFHXn2HHHX30UW1SQKfpv4Wi8GhhSCG1VXl2l3En333231FnFGGEX0231W2UkG02XlG1HXGW330lX333333nXn3223mU3l013ESRSSSBwjyXlV33133kH23H3X33333320n333HX330U333WlWmk32nX32k3mH332k22W33333X3312GHkXGFn2UWm13333HHXnGU002FX3X3333232lXGH330EH3212lnl3k13310133332133n3331nG33Ek321nGkGU2nn332kHEU21nX3nX3nH3nH302013333331kE13X13XX2X3X323X333311X3333333H33n3332HV3332n2FHH301X331XlEH0330X33H33333333320H212kGnX0E3133333knHX2XH333H31GXG31H2n33332n1FWnHH33n33G1GE1HHEEV3U0221n33n30E3333133333VlX332k3n1m12333HVW1EV2VXn30EWln20k022n212n3200l30GHH3nG3U3323333WH33HAE13n3n312UnX3Gn313331XmnWkn2000l13F11nXm013331XX3n0n32mU3X21Gl3FX333nH022HHX33F322333X33213l3nX233k31HV2m1X3nH33mXk1123XX3H302FHHFX03nV3n300Gn0nX333n3XnX330E3HHVHG3333HW1n11322n3231V3k2k132knFlX3HHV3232132X32X1GFnE3V3V1GHHF333303W033333G2nX333H2n3W2XlHH3H1nnVX301l1n3WnHW0nX3mmnl333GV3mGH333k03H130203mHX333333333FX0X3nn3l32X33X1nX3VlGW3E33HWnnnX33m22n3220V2131mE13W02013332333HHX332E30F3303nH0EFV2nXX33331n2n320n0333332033000l3n1l322XH3332X3H3WlX33333nH333X2mm2333nn3332X3H332F333330EH2F3310EF0EH32EH2H2H330E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" alt="SR Logo">
  <span>Made by <em>San</em> and <em>Reg</em></span>
</div>
</html>`;
}
function closeKpForms(){
  // If we came from a view modal, reopen it
  if(state.kpFormsReturnCaseId){
    const rid=state.kpFormsReturnCaseId;
    state.kpFormsData=null;
    state.kpFormsReturnCaseId=null;
    render();
    viewCase(rid);
  } else {
    state.kpFormsData=null;
    state.kpFormsReturnCaseId=null;
    render();
  }
}

// Open KP Forms from the view modal (stores caseId so X goes back)
function openKpFormsFromView(caseId){
  openKpFormsFromViewTab(caseId,'form7');
}

// Open KP Forms from the view modal pre-selecting a specific tab
// Now opens the Documents modal and selects the matching generated form row inline
function openKpFormsFromViewTab(caseId, tab){
  const c=state.cases.find(x=>x.id===caseId); if(!c)return;
  const atts=c.attachments||[];
  // Find the index of the best matching generated form for this tab
  let targetIdx = atts.findIndex(a=>a._generated && (
    (tab==='form7'  && /Form 7/i.test(a.name))  ||
    (tab==='form8'  && /Form 8/i.test(a.name))  ||
    (tab==='form9'  && /Form 9/i.test(a.name))  ||
    (tab==='form10' && /Form 10/i.test(a.name)) ||
    (tab==='form11' && /Form 11/i.test(a.name)) ||
    (tab==='form12' && /Form 12/i.test(a.name))
  ));
  // Fall back to first generated form if exact match not found
  if(targetIdx<0) targetIdx = atts.findIndex(a=>a._generated);
  // Fall back to 0
  if(targetIdx<0) targetIdx = 0;
  // Remove existing modals
  document.getElementById('view-case-modal-root')&&document.getElementById('view-case-modal-root').remove();
  document.getElementById('attach-modal-root')&&document.getElementById('attach-modal-root').remove();
  // Open Documents modal, auto-select the right row, which shows the edit panel + PDF inline
  viewAttachments(caseId, targetIdx);
  // After row is selected, switch to the correct KP tab in the edit panel
  setTimeout(()=>{ if(window._attachKpfCurrentTab) attachKpfTab(tab||'form7'); },200);
}

// ─── KP FORMS SIDEBAR DRAG RESIZE ────────────────────────────────────────────
window._kpfDragging=false;
function kpfStartDrag(e){
  e.preventDefault();
  window._kpfDragging=true;
  const panel=document.getElementById('kpf-left-panel');
  const handle=document.getElementById('kpf-drag-handle');
  const startX=e.clientX;
  const startW=panel?panel.offsetWidth:360;

  // Create a full-screen transparent overlay so mousemove never gets blocked
  // by the PDF iframe (iframes swallow pointer events from the parent document)
  const overlay=document.createElement('div');
  overlay.id='kpf-drag-overlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:9999;cursor:col-resize;user-select:none;';
  document.body.appendChild(overlay);

  function onMove(ev){
    const maxW=Math.floor(window.innerWidth*0.5);
    const newW=Math.min(maxW,Math.max(220,startW+(ev.clientX-startX)));
    if(panel) panel.style.width=newW+'px';
  }
  function onUp(){
    window._kpfDragging=false;
    if(handle) handle.style.background='#3c3f41';
    const ov=document.getElementById('kpf-drag-overlay');
    if(ov) ov.remove();
    document.removeEventListener('mousemove',onMove);
    document.removeEventListener('mouseup',onUp);
  }
  if(handle) handle.style.background='#14919b';
  document.addEventListener('mousemove',onMove);
  document.addEventListener('mouseup',onUp);
}

function downloadKpForm7(){
  const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:'mm',format:'a4'});
  _fillKpForm7(doc,kpfGetData());
  doc.save(`KP_Form7_${(kpfGetData().caseNo)||'form'}.pdf`);
}
function downloadKpForm8(){
  const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:'mm',format:'a4'});
  _fillKpForm8(doc,kpfGetData());
  doc.save(`KP_Form8_${(kpfGetData().caseNo)||'form'}.pdf`);
}
function downloadKpForm9(){
  const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:'mm',format:'a4'});
  const data=kpfGetData();
  _fillKpForm9(doc,data);
  doc.addPage();
  _fillKpForm9Page2(doc,data);
  doc.save(`KP_Form9_${data.caseNo||'form'}.pdf`);
}
function downloadKpBoth(){
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const data=kpfGetData();
  _fillKpForm8(doc,data);
  doc.addPage();
  _fillKpForm9(doc,data);
  doc.addPage();
  _fillKpForm9Page2(doc,data);
  doc.save(`KP_Forms_8_9_${data.caseNo||'form'}.pdf`);
}
function downloadKpAll(){
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const data=kpfGetData();
  _fillKpForm7(doc,data);
  doc.addPage();
  _fillKpForm8(doc,data);
  doc.addPage();
  _fillKpForm9(doc,data);
  doc.addPage();
  _fillKpForm9Page2(doc,data);
  doc.save(`KP_Forms_7_8_9_${data.caseNo||'form'}.pdf`);
}

// ─── PDF HELPERS ─────────────────────────────────────────────────────────────
function ordinalDay(dt){
  if(!dt)return'____';
  const day=dt.getDate(),mod10=day%10,mod100=day%100;
  return `${day}${(mod100>=11&&mod100<=13)?'th':mod10===1?'st':mod10===2?'nd':mod10===3?'rd':'th'}`;
}
function ordinalSuffix(dayStr){
  const day=parseInt(dayStr,10);if(isNaN(day))return'';
  const mod10=day%10,mod100=day%100;
  return(mod100>=11&&mod100<=13)?'th':mod10===1?'st':mod10===2?'nd':mod10===3?'rd':'th';
}
// Convert time string (e.g. "1:00 PM", "11:19 AM") to 24-hour military format ("13:00", "11:19")
function to24Hour(t){
  if(!t)return'';
  t=t.trim();
  // Already 24h if no AM/PM and hours >=0
  if(!/am|pm/i.test(t)) return t;
  const m=t.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if(!m)return t;
  let h=parseInt(m[1],10), min=m[2], period=m[3].toLowerCase();
  if(period==='am'){ if(h===12) h=0; }
  else { if(h!==12) h+=12; }
  return `${String(h).padStart(2,'0')}:${min}`;
}


// charSpace used across all KP forms (pt units, jsPDF converts internally)
const KP_CHAR_SPACE = 0;

// ── Print form global settings ──────────────────────────────────────────────
// Word-standard margins: 1 inch = 25.4 mm
const KP_ML = 25.4;   // left margin  (mm)
const KP_MR = 25.4;   // right margin (mm)
const KP_MT = 25.4;   // top margin   (mm)
// Base font size 10pt; line-height ~5.5 mm at 10pt
const KP_FONT_BASE  = 10;
const KP_FONT_SMALL = 8;
const KP_FONT_MED   = 11;
const KP_FONT_TITLE = 12;
const KP_LH         = 5.5;   // normal line height (mm)
const KP_LH_SM      = 4.0;   // small line height
// jsPDF built-in fonts: times = Times New Roman
const KP_FONT = 'times';

// Returns the true rendered width of a string including charSpace gaps.
// jsPDF's getTextWidth does NOT include charSpace, so we add it manually.
// charSpace in jsPDF is in pt; 1pt = 0.3528mm
function _tw(doc, text) {
  if (!text || text.length === 0) return 0;
  return doc.getTextWidth(text) + (text.length - 1) * KP_CHAR_SPACE * 0.3528;
}

// Helper: draw underlined text, return x end position.
// Uses _tw so the underline always covers the full rendered text.
function _utext(doc, text, x, y, color, bold) {
  doc.setTextColor(...(color || [0,0,0]));
  doc.setFont(KP_FONT, bold ? 'bold' : 'normal');
  if (text) {
    doc.text(text, x, y);
    const w = _tw(doc, text);
    doc.setDrawColor(...(color || [0,0,0]));
    doc.line(x, y + 1.2, x + w, y + 1.2);
    return x + w;
  }
  return x;
}

// Helper: render a justified text block.
// Returns new Y after all lines. lastLineLeft=true → last line is left-aligned.
function _justifyBlock(doc, text, x, y, maxWidth, lineHeight, lastLineLeft) {
  const lines = doc.splitTextToSize(text, maxWidth);
  lines.forEach((line, idx) => {
    const isLast = (idx === lines.length - 1);
    if (isLast || lastLineLeft) {
      doc.text(line, x, y);
    } else {
      const words = line.split(' ');
      if (words.length <= 1) {
        doc.text(line, x, y);
      } else {
        // Use _tw for accurate word widths including charSpace
        const totalWordWidth = words.reduce((acc, w) => acc + _tw(doc, w), 0);
        const totalSpace = maxWidth - totalWordWidth;
        const gap = totalSpace / (words.length - 1);
        let px = x;
        words.forEach((word, wi) => {
          doc.text(word, px, y);
          px += _tw(doc, word) + (wi < words.length - 1 ? gap : 0);
        });
      }
    }
    y += lineHeight;
  });
  return y;
}

// ─── KP FORM 7: Complaint ────────────────────────────────────────────────────
function _fillKpForm7(doc,d){
  const filedDt=d.dateFiled?new Date(d.dateFiled+'T00:00:00'):null;
  const W=210,ml=KP_ML,mr=KP_MR,cw=W-ml-mr;
  doc.setCharSpace(KP_CHAR_SPACE);
  doc.setTextColor(0,0,0);doc.setDrawColor(0,0,0);

  // ── "KP Form No. 7" — top-left, small, bold ──
  doc.setFontSize(KP_FONT_BASE);doc.setFont(KP_FONT,'bold');
  doc.text('KP Form No. 7',ml,KP_MT-6);

  // ── Centered header block ──
  let y=KP_MT+2;
  doc.setFontSize(KP_FONT_BASE);doc.setFont(KP_FONT,'normal');
  doc.text('Republic of the Philippines',W/2,y,{align:'center'});y+=KP_LH;
  doc.text('City of Butuan',W/2,y,{align:'center'});y+=KP_LH;
  doc.text('Barangay PANGABUGAN',W/2,y,{align:'center'});y+=KP_LH+2;

  // "OFFICE OF THE LUPONG TAGAPAMAYAPA" — bold, slightly larger
  doc.setFontSize(KP_FONT_TITLE);doc.setFont(KP_FONT,'bold');
  doc.text('OFFICE OF THE LUPONG TAGAPAMAYAPA',W/2,y,{align:'center'});y+=KP_LH+5;

  // ── Two-column case header ──
  // Left col: complainant info | Right col: DF / Case No / For / TF
  const rightCol=W/2+6;
  doc.setFontSize(KP_FONT_BASE);

  // RIGHT: DF (date filed)
  const filed7str=filedDt?filedDt.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):'';
  doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  let px=rightCol;
  doc.text('DF: ',px,y);px+=_tw(doc,'DF: ');
  doc.text(filed7str,px,y);

  // LEFT: Complainant name — bold, no underline
  const compName=(d.complainant||'').toUpperCase();
  doc.setFont(KP_FONT,'bold');doc.setTextColor(0,0,0);
  doc.text(compName,ml,y);

  // Row 2
  y+=KP_LH;
  // LEFT: complainant address — no underline
  const compAddr=d.complainantAddress||'';
  doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  // Show user-entered address (purok/street/barangay) — not Butuan City (that's the next line)
  if(compAddr) doc.text(compAddr,ml,y);
  // RIGHT: Barangay Case No.
  px=rightCol;
  doc.text('Barangay Case No. ',px,y);px+=_tw(doc,'Barangay Case No. ');
  doc.text(d.caseNo||'',px,y);

  // Row 3
  y+=KP_LH;
  doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  doc.text('Butuan City',ml,y);
  // RIGHT: For:
  px=rightCol;
  doc.text('For: ',px,y);px+=_tw(doc,'For: ');
  doc.text((d.caseTitle||'').toUpperCase(),px,y);

  // Row 4
  y+=KP_LH;
  doc.setTextColor(0,0,0);doc.setFont(KP_FONT,'normal');
  doc.text('Complainant',ml,y);
  // RIGHT: TF
  px=rightCol;
  doc.text('TF: ',px,y);px+=_tw(doc,'TF: ');
  doc.text(_fmt12hrTime(d.timeFiled||d.schedTime||''),px,y);

  // ── "- against -" — indented left, matching image ──
  y+=KP_LH+3;
  doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  doc.text('- against -',ml+8,y);

  // ── Respondent block ──
  y+=KP_LH+2;
  const respName=(d.respondent||'').toUpperCase();
  doc.setFont(KP_FONT,'bold');doc.setTextColor(0,0,0);
  doc.text(respName,ml,y);
  y+=KP_LH;
  const respAddr=d.respondentAddress||'';
  doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  // Show user-entered address (purok/street/barangay) — not Butuan City (that's the next line)
  if(respAddr) doc.text(respAddr,ml,y);
  y+=KP_LH;
  doc.text('Butuan City',ml,y);
  y+=KP_LH;
  doc.text('Respondent/s',ml,y);

  // ── COMPLAINT title ──
  y+=KP_LH+4;
  doc.setFontSize(KP_FONT_TITLE);doc.setFont(KP_FONT,'bold');doc.setTextColor(0,0,0);
  doc.text('C O M P L A I N T',W/2,y,{align:'center'});
  y+=KP_LH_SM+1;

  // ── Paragraph 1 — fixed text, justified ──
  y+=KP_LH+2;
  doc.setFontSize(KP_FONT_BASE);doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  const para1='     I/We hereby complaint against the above-named respondent for violating my/our rights and interests in the following manner:';
  y=_justifyBlock(doc,para1,ml,y,cw,KP_LH,true);

  // ── Paragraph 2 — narrative (user input), justified ──
  y+=2;doc.setTextColor(0,0,0);
  const age=d.complainantAge?` ${d.complainantAge} years old,`:'';
  let narrative='';
  if(d.narrative&&d.narrative.trim()){
    narrative='     '+d.narrative.trim();
  } else {
    const schedDt7=d.schedDate?new Date(d.schedDate+'T00:00:00'):null;
    const incidentDate=schedDt7?`${MONTHS[schedDt7.getMonth()]} ${schedDt7.getDate()}, ${schedDt7.getFullYear()}`:'_______';
    const incidentTime=d.schedTime||'_______';
    narrative=`     Ako si ${compName}${age} nagpuyo sa ${compAddr||'_______'}, akong ipatawag ssi ${respName} tungod ssa pagpanumba ssa ako kagabie ${incidentDate} ${incidentTime} sa ${respAddr||'_______'}.`;
  }
  y=_justifyBlock(doc,narrative,ml,y,cw,KP_LH,false);

  // ── Paragraph 3 — fixed text, justified ──
  y+=2;doc.setTextColor(0,0,0);
  const para3='     Therefore, I/We pray that the following relief/s be granted to me/us in accordance with law and or/equity:';
  y=_justifyBlock(doc,para3,ml,y,cw,KP_LH,true);

  // ── Paragraph 4 — relief (user input), justified ──
  y+=2;doc.setTextColor(0,0,0);
  const reliefText=d.relief&&d.relief.trim()
    ?'     '+d.relief.trim()
    :'     Ang akong purpose aron masayran ngano ila kong quisumbag nga sila ang nakipagstorya sa ako.';
  y=_justifyBlock(doc,reliefText,ml,y,cw,KP_LH,false);

  // ── "Made this __th day of ___MAY___ 20 __25__." ──
  y+=KP_LH+3;
  const filed7day=filedDt?ordinalDay(filedDt):'____';
  const filed7mon=filedDt?MONTHS[filedDt.getMonth()].toUpperCase():'____';
  const filed7yr2=filedDt?String(filedDt.getFullYear()).slice(-2):'__';
  doc.setFontSize(KP_FONT_BASE);doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  px=ml;
  doc.text('Made this  ',px,y);px+=_tw(doc,'Made this  ');
  px=_utext(doc,filed7day,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text('  day of  ',px,y);px+=_tw(doc,'  day of  ');
  px=_utext(doc,filed7mon,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text('  20  ',px,y);px+=_tw(doc,'  20  ');
  px=_utext(doc,filed7yr2,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text('.',px,y);

  // ── Complainant signature block — centered on right half ──
  y+=KP_LH+10;
  doc.setFont(KP_FONT,'bold');doc.setTextColor(0,0,0);
  const compSigCx=W*3/4;                      // center anchor = right column center
  const compSigW=_tw(doc,compName);
  const extC=20;                              // underline extension each side
  // underline: extends beyond both sides of name
  doc.line(compSigCx-compSigW/2-extC,y+0.5,compSigCx+compSigW/2+extC,y+0.5);
  // name centered
  doc.text(compName,compSigCx,y,{align:'center'});
  y+=KP_LH;
  // "Complainant" label centered under name
  doc.setFont(KP_FONT,'normal');
  doc.text('Complainant',compSigCx,y,{align:'center'});

  // ── "Received and filed this ____ ___ day of ___MAY___ 20 __25__." ──
  y+=KP_LH+4;
  doc.setTextColor(0,0,0);doc.setFont(KP_FONT,'normal');
  px=ml;
  doc.text('Received and filed this ',px,y);px+=_tw(doc,'Received and filed this ');
  // Long blank line for day number
  const blankLineEnd=px+30;
  doc.line(px,y+0.5,blankLineEnd,y+0.5);px=blankLineEnd+2;
  doc.text(' day of ',px,y);px+=_tw(doc,' day of ');
  px=_utext(doc,filed7mon,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text(' 20 ',px,y);px+=_tw(doc,' 20 ');
  px=_utext(doc,filed7yr2,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text('.',px,y);

  // ── Chairman signature block — centered on right half ──
  y+=KP_LH+10;
  const ch7=(d.chairman||'HON. ABUNDIO A. LEONES').toUpperCase();
  doc.setFont(KP_FONT,'bold');doc.setTextColor(0,0,0);
  const ch7W=_tw(doc,ch7);
  const extCh=10;
  const ch7Cx=W*3/4;
  // underline extends beyond both sides
  doc.line(ch7Cx-ch7W/2-extCh,y+0.5,ch7Cx+ch7W/2+extCh,y+0.5);
  // name centered
  doc.text(ch7,ch7Cx,y,{align:'center'});
  y+=KP_LH;
  // label centered under name
  doc.setFont(KP_FONT,'normal');
  doc.text('Punong Barangay/Lupon Chairman',ch7Cx,y,{align:'center'});
}

// ─── KP FORM 9 PAGE 2: Officer's Return ──────────────────────────────────────
function _fillKpForm9Page2(doc,d){
  const filedDt=d.dateFiled?new Date(d.dateFiled+'T00:00:00'):null;
  const W=210,ml=KP_ML,mr=KP_MR,cw=W-ml-mr;
  doc.setCharSpace(KP_CHAR_SPACE);
  doc.setTextColor(0,0,0);doc.setDrawColor(0,0,0);

  // ── Top-left label ──
  doc.setFontSize(KP_FONT_BASE);doc.setFont(KP_FONT,'bold');
  doc.text('KP Form No. 9',ml,KP_MT-6);
  doc.setFont(KP_FONT,'normal');
  doc.text('Page 2',ml,KP_MT-1);

  // ── Title ──
  doc.setFontSize(KP_FONT_TITLE);doc.setFont(KP_FONT,'bold');doc.setTextColor(0,0,0);
  doc.text("OFFICER'S RETURN",W/2,KP_MT+8,{align:'center'});

  // ── INTRO BLOCK: dynamically wraps if respondent name is long ──
  let y=KP_MT+20;
  doc.setFontSize(KP_FONT_BASE);doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  const respName=(d.respondent||'').toUpperCase();
  const filed2mon=filedDt?MONTHS[filedDt.getMonth()].toUpperCase():'_____';
  const filed2yr=filedDt?String(filedDt.getFullYear()):'____';

  // Measure each segment
  const prefix1='     I serve this summons upon respondent ';
  const suffix1=' on the ';
  const dayBlankW=14;
  const seg_dayof=' day of ';
  const seg_monyr_w=_tw(doc,filed2mon)+_tw(doc,' ')+_tw(doc,filed2yr);
  const seg_andupon=' , and upon';
  const prefix1W=_tw(doc,prefix1);
  const respNameW=_tw(doc,respName);
  const suffix1W=_tw(doc,suffix1);
  const afterNameW=suffix1W+dayBlankW+2+_tw(doc,seg_dayof)+seg_monyr_w+_tw(doc,seg_andupon);
  const totalLine1W=prefix1W+respNameW+afterNameW;

  let px;

  if(totalLine1W<=cw){
    // ── Fits on one line — render centered (justified spread) ──
    const gap=(cw-totalLine1W)/(10); // spread across full width
    px=ml;
    // Render line 1 fully inline
    doc.text(prefix1,px,y);px+=prefix1W;
    doc.setFont(KP_FONT,'bold');
    _utext(doc,respName,px,y,[0,0,0]);px+=respNameW;
    doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
    doc.text(suffix1,px,y);px+=suffix1W;
    doc.line(px,y+0.5,px+dayBlankW,y+0.5);px+=dayBlankW+2;
    doc.text(seg_dayof,px,y);px+=_tw(doc,seg_dayof);
    _utext(doc,filed2mon,px,y,[0,0,0]);px+=_tw(doc,filed2mon);
    doc.setTextColor(0,0,0);doc.text(' ',px,y);px+=_tw(doc,' ');
    _utext(doc,filed2yr,px,y,[0,0,0]);px+=_tw(doc,filed2yr);
    doc.setTextColor(0,0,0);doc.text(seg_andupon,px,y);
    y+=KP_LH+2;
  } else {
    // ── Name is long — wrap: line 1 = prefix + name, line 2 = rest ──
    // Line 1A: prefix text
    px=ml;
    doc.text(prefix1,px,y);px+=prefix1W;
    doc.setFont(KP_FONT,'bold');
    _utext(doc,respName,px,y,[0,0,0]);
    doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
    y+=KP_LH;
    // Line 1B: " on the ___ day of MONTH YEAR , and upon" — left margin
    px=ml;
    doc.text(suffix1,px,y);px+=suffix1W;
    doc.line(px,y+0.5,px+dayBlankW,y+0.5);px+=dayBlankW+2;
    doc.text(seg_dayof,px,y);px+=_tw(doc,seg_dayof);
    _utext(doc,filed2mon,px,y,[0,0,0]);px+=_tw(doc,filed2mon);
    doc.setTextColor(0,0,0);doc.text(' ',px,y);px+=_tw(doc,' ');
    _utext(doc,filed2yr,px,y,[0,0,0]);px+=_tw(doc,filed2yr);
    doc.setTextColor(0,0,0);doc.text(seg_andupon,px,y);
    y+=KP_LH+2;
  }

  // ── LINE 2: "respondent/s ______ on the day of __________ by:" ──
  px=ml;
  doc.text('respondent/s ',px,y);px+=_tw(doc,'respondent/s ');
  // short underlined blank
  doc.line(px,y+0.5,px+28,y+0.5);px+=30;
  doc.text(' on the day of ',px,y);px+=_tw(doc,' on the day of ');
  // second underlined blank for date, then by:
  doc.line(px,y+0.5,px+45,y+0.5);px+=47;
  doc.text(' by:',px,y);

  // ── Instruction note ──
  y+=KP_LH+2;
  doc.setFontSize(KP_FONT_SMALL);doc.setFont(KP_FONT,'normal');
  doc.text('(Write your name/s of respondent/s and by which mode he/they was/were served.)',ml,y);

  // ── Respondent/s label ──
  y+=KP_LH+3;
  doc.setFontSize(KP_FONT_BASE);
  doc.text('Respondent/s',ml+18,y);

  // ── 4-item list with blank lines on left, text on right ──
  const leftLineX=ml;
  const rightColX=W/2+8;
  const lineLen=W/2-ml-8;

  // Item 1
  y+=KP_LH+5;
  doc.line(leftLineX,y+0.5,leftLineX+lineLen,y+0.5);
  const i1=doc.splitTextToSize('1. Handing to him/them said summons in\n    person or;',cw/2-4);
  doc.text(i1,rightColX,y);

  // Item 2
  y+=KP_LH+8;
  doc.line(leftLineX,y+0.5,leftLineX+lineLen,y+0.5);
  const i2=doc.splitTextToSize('2. Handing to him/them said summons and\n    he/they refuse to receive it;',cw/2-4);
  doc.text(i2,rightColX,y);
  y+=KP_LH;

  // Item 3
  y+=KP_LH+4;
  doc.line(leftLineX,y+0.5,leftLineX+lineLen,y+0.5);
  doc.text('3. Leaving said summons at his/their dwelling with',rightColX,y);
  y+=KP_LH+5;
  // Name underline centered on right half
  const nameLineX=rightColX+10;
  const nameLineLen=60;
  doc.line(nameLineX,y+0.5,nameLineX+nameLineLen,y+0.5);
  y+=KP_LH_SM+1;
  doc.setFontSize(KP_FONT_SMALL);
  doc.text('(Name)',(nameLineX+nameLineX+nameLineLen)/2,y,{align:'center'});
  y+=KP_LH_SM+1;
  doc.setFontSize(KP_FONT_BASE);
  const i3sub=doc.splitTextToSize('a person of suitable age, discretion, and residing\ntherein, or;',cw/2-4);
  doc.text(i3sub,rightColX,y);
  y+=KP_LH+5;

  // Item 4
  doc.line(leftLineX,y+0.5,leftLineX+lineLen,y+0.5);
  const i4=doc.splitTextToSize('4. Leaving said summons at his/ their office/place\n    of business with',cw/2-4);
  doc.text(i4,rightColX,y);
  y+=KP_LH+6;
  doc.line(nameLineX,y+0.5,nameLineX+nameLineLen,y+0.5);
  y+=KP_LH_SM+1;
  doc.setFontSize(KP_FONT_SMALL);
  doc.text('(Name)',(nameLineX+nameLineX+nameLineLen)/2,y,{align:'center'});
  y+=KP_LH_SM+1;
  doc.setFontSize(KP_FONT_BASE);
  doc.text('a competent person in charge thereof.',ml,y);
  y+=KP_LH+10;

  // ── Officer signature block — aligned with right signature column ──
  const officerName=(d.officer||'RAMIL ROSALES').toUpperCase();
  doc.setFont(KP_FONT,'bold');doc.setTextColor(0,0,0);
  const ow=_tw(doc,officerName);
  // Center the name over the right signature column (W*3/4)
  const offCx=W*3/4;
  const extLen=20;
  // underline extends extLen beyond both sides of the name
  doc.line(offCx-ow/2-extLen,y+0.5,offCx+ow/2+extLen,y+0.5);
  doc.text(officerName,offCx,y,{align:'center'});
  y+=KP_LH;
  doc.setFont(KP_FONT,'normal');
  doc.text('Officer',offCx,y,{align:'center'});

  // ── Received by Respondent/s ──
  y+=KP_LH+6;
  doc.text('Received by Respondent/s or Representative/s:',ml,y);

  // ── 4 signature lines in 2x2 grid — centered like image ──
  y+=KP_LH+8;
  const sigLen2=70;
  const col1Cx=W/4;           // center of left column
  const col2Cx=W*3/4;         // center of right column
  const sigL1x=col1Cx-sigLen2/2;
  const sigR1x=col2Cx-sigLen2/2;

  // Row 1 — lines then (Signature) below
  doc.line(sigL1x,y,sigL1x+sigLen2,y);
  doc.line(sigR1x,y,sigR1x+sigLen2,y);
  y+=KP_LH+1;
  doc.text('(Signature)',col1Cx,y,{align:'center'});
  doc.text('(Signature)',col2Cx,y,{align:'center'});

  // Row 2
  y+=KP_LH+10;
  doc.line(sigL1x,y,sigL1x+sigLen2,y);
  doc.line(sigR1x,y,sigR1x+sigLen2,y);
  y+=KP_LH+1;
  doc.text('(Signature)',col1Cx,y,{align:'center'});
  doc.text('(Signature)',col2Cx,y,{align:'center'});
}

// ─── KP FORM 8: Notice of Hearing ────────────────────────────────────────────
function _fillKpForm8(doc,d){
  const schedDt=d.schedDate?new Date(d.schedDate+'T00:00:00'):null;
  const filedDt=d.dateFiled?new Date(d.dateFiled+'T00:00:00'):null;
  const W=210,ml=KP_ML,mr=KP_MR,cw=W-ml-mr;
  doc.setCharSpace(KP_CHAR_SPACE);
  doc.setTextColor(0,0,0);doc.setDrawColor(0,0,0);

  // ── "KP Form No. 8" — top-left, bold ──
  doc.setFontSize(KP_FONT_BASE);doc.setFont(KP_FONT,'bold');
  doc.text('KP Form No. 8',ml,KP_MT-6);

  // ── Centered header ──
  let y=KP_MT+2;
  doc.setFontSize(KP_FONT_BASE);doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  doc.text('Republic of the Philippines',W/2,y,{align:'center'});y+=KP_LH;
  doc.text('City of Butuan',W/2,y,{align:'center'});y+=KP_LH;
  doc.text('Barangay Pangabugan',W/2,y,{align:'center'});y+=KP_LH+10;

  // ── Title block — bold, centered, 12pt ──
  doc.setFontSize(KP_FONT_TITLE);doc.setFont(KP_FONT,'bold');doc.setTextColor(0,0,0);
  doc.text('NOTICE OF HEARING',W/2,y,{align:'center'});y+=KP_LH+1;
  doc.text('(MEDIATION PROCEEDINGS)',W/2,y,{align:'center'});y+=KP_LH+12;

  // ── TO: block ──
  // "TO:" left-aligned at ml, complainant name bold (no underline) beside it
  doc.setFontSize(KP_FONT_BASE);doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  const compName=(d.complainant||'').toUpperCase();
  let px=ml;
  doc.text('TO: ',px,y);px+=_tw(doc,'TO: ');
  // Complainant name — bold, underlined (matches image: name is underlined in red = user input)
  doc.setFont(KP_FONT,'bold');doc.setTextColor(0,0,0);
  doc.text(compName,px,y);
  // underline below name
  const compNameW8=_tw(doc,compName);
  doc.line(px,y+1.2,px+compNameW8,y+1.2);
  y+=KP_LH;
  doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  doc.text('   Complainant/s',ml,y);

  // ── Body paragraph ──
  y+=KP_LH+8;
  const day8=schedDt?ordinalDay(schedDt):'____';
  const mon8=schedDt?MONTHS[schedDt.getMonth()].toUpperCase():'____';
  const yr8=schedDt?String(schedDt.getFullYear()):'____';
  const yr8short=schedDt?String(schedDt.getFullYear()).slice(-2):'__';
  const time8=_fmt12hrTime(d.schedTime||'1:00 PM');
  const isAM8=!/pm/i.test(time8);
  const time8Display=time8.replace(/\s*(AM|PM)$/i,'').trim();

  doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);

  // Paragraph rendered line by line, each line stretched full width (justified)
  // Line 1
  const L1pre = '     You are hereby required to appear before me on the';
  const L1suf = ' day of';
  // Calculate remaining space after static text + underlined values
  const d8w = _tw(doc, day8);
  const m8w = _tw(doc, mon8);
  // Justify line 1 by stretching the leading static text
  const L1static = L1pre + ' ' + day8 + L1suf + ' ' + mon8;
  const L1words = L1pre.trim().split(' ');
  // Line 1 — "You are hereby required ... day of MONTH, YEAR at TIME o'clock in the"
  px = ml;
  const _L1lead = '     You are hereby required to appear before me on the ';
  doc.text(_L1lead, px, y);
  px += _tw(doc, _L1lead) + 0.5; // +0.5mm gap so ordinal (e.g. "1st") never merges with "the"
  px = _utext(doc, day8, px, y, [0,0,0]);
  doc.setTextColor(0,0,0); doc.text(' day of ', px, y); px += _tw(doc,' day of ');
  px = _utext(doc, mon8, px, y, [0,0,0]);
  doc.setTextColor(0,0,0); doc.text(', ', px, y); px += _tw(doc, ', ');
  px = _utext(doc, yr8, px, y, [0,0,0]);
  doc.setTextColor(0,0,0);
  const L2mid = " at ";
  doc.text(L2mid, px, y); px += _tw(doc, L2mid);
  px = _utext(doc, time8Display, px, y, [0,0,0]);
  doc.setTextColor(0,0,0);
  const L2cont = " o'clock in the";
  doc.text(L2cont, px, y);
  y += KP_LH;

  // Line 2 — "morning/afternoon for the hearing of your complaint."
  px = ml;
  if(isAM8){
    px = _utext(doc, 'morning', px, y, [0,0,0]);
    doc.setTextColor(0,0,0);
    const L2tail = '/afternoon for the hearing of your complaint.';
    doc.text(L2tail, px, y); px += _tw(doc, L2tail);
  } else {
    doc.text('morning/', px, y); px += _tw(doc, 'morning/');
    px = _utext(doc, 'afternoon', px, y, [0,0,0]);
    doc.setTextColor(0,0,0);
    const L2tail = ' for the hearing of your complaint.';
    doc.text(L2tail, px, y); px += _tw(doc, L2tail);
  }
  y += KP_LH;

  // ── "This __14th__ day of __APRIL__ __2026__." — auto-filled from generation date ──
  y+=KP_LH+10;
  const genDt8    = new Date(); // date user clicked Generate Form
  const filed8day = ordinalDay(genDt8);
  const filed8mon = MONTHS[genDt8.getMonth()].toUpperCase();
  const filed8yr  = String(genDt8.getFullYear());
  // Separate variables for the "Notified this" block (still uses filedDt)
  const notif8mon = filedDt ? MONTHS[filedDt.getMonth()].toUpperCase() : '____';
  const filed8yr2 = filedDt ? String(filedDt.getFullYear()).slice(-2) : '__';
  doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  px=ml;
  doc.text('This ',px,y);px+=_tw(doc,'This ');
  px=_utext(doc,filed8day,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text(' day of ',px,y);px+=_tw(doc,' day of ');
  px=_utext(doc,filed8mon,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text(' ',px,y);px+=_tw(doc,' ');
  px=_utext(doc,filed8yr,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text('.',px,y);

  // ── Chairman signature block — right-aligned ──
  // Name bold → underline below → label
  y+=KP_LH+10;
  const ch8=(d.chairman||'HON. ABUNDIO A. LEONES').toUpperCase();
  const sigRightEdge=W-mr;
  doc.setFont(KP_FONT,'bold');doc.setTextColor(0,0,0);
  doc.text(ch8,sigRightEdge,y,{align:'right'});
  const ch8w=_tw(doc,ch8);
  doc.line(sigRightEdge-ch8w-4,y+1.2,sigRightEdge,y+1.2);
  y+=KP_LH;
  doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  doc.text('Punong Barangay/Lupon Chairman',sigRightEdge,y,{align:'right'});

  // ── "Notified this _________ day of ___APRIL___, 20__25__." ──
  y+=KP_LH+10;
  doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  px=ml;
  doc.text('Notified this ',px,y);px+=_tw(doc,'Notified this ');
  // blank line for day (no value — leave blank)
  doc.line(px,y+0.5,px+30,y+0.5);px+=32;
  doc.text('day of ',px,y);px+=_tw(doc,'day of ');
  // month — single underline via _utext only
  px=_utext(doc,notif8mon,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text(', 20',px,y);px+=_tw(doc,', 20');
  // year — single underline via _utext only
  px=_utext(doc,filed8yr2,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text('.',px,y);

  // ── Complainant/s signature block — centered below "Complainant/s:" label ──
  y+=KP_LH+16;
  doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  // "Complainant/s:" label — left of center
  const sigBlockCenter=W/2+10;
  const sigLineLen=72;
  doc.text('Complainant/s:',sigBlockCenter-sigLineLen/2,y);
  y+=KP_LH+2;
  // Signature line
  doc.line(sigBlockCenter-sigLineLen/2,y,sigBlockCenter+sigLineLen/2,y);
  y+=KP_LH_SM+1;
  // Name bold, centered under line
  doc.setFont(KP_FONT,'bold');doc.setTextColor(0,0,0);
  doc.text(compName,sigBlockCenter,y,{align:'center'});
  doc.setFont(KP_FONT,'normal');
}

// ─── KP FORM 9: Summons — Page 1 ─────────────────────────────────────────────
function _fillKpForm9(doc,d){
  const schedDt=d.schedDate?new Date(d.schedDate+'T00:00:00'):null;
  const filedDt=d.dateFiled?new Date(d.dateFiled+'T00:00:00'):null;
  const W=210,ml=KP_ML,mr=KP_MR,cw=W-ml-mr;
  doc.setCharSpace(KP_CHAR_SPACE);
  doc.setTextColor(0,0,0);doc.setDrawColor(0,0,0);

  // ── Top-left label: KP Form No. 9 / Page 1 (bold) ──
  doc.setFontSize(KP_FONT_BASE);doc.setFont(KP_FONT,'bold');
  doc.text('KP Form No. 9',ml,KP_MT-6);
  doc.setFont(KP_FONT,'normal');
  doc.text('Page 1',ml,KP_MT-1);

  // ── Centered header ──
  let y=KP_MT+5;
  doc.setFontSize(KP_FONT_BASE);doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  doc.text('Republic of the Philippines',W/2,y,{align:'center'});y+=KP_LH;
  doc.text('City of Butuan',W/2,y,{align:'center'});y+=KP_LH;
  doc.text('Barangay Pangabugan',W/2,y,{align:'center'});y+=KP_LH+2;
  doc.setFontSize(KP_FONT_TITLE);doc.setFont(KP_FONT,'bold');
  doc.text('OFFICE OF THE LUPONG TAGAPAMAYAPA',W/2,y,{align:'center'});y+=KP_LH+6;

  // ── Two-column case header ──
  const rightCol=W/2+8;
  doc.setFontSize(KP_FONT_BASE);doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);

  // LEFT: Complainant name (bold)
  const compName=(d.complainant||'').toUpperCase();
  doc.setFont(KP_FONT,'bold');
  doc.text(compName,ml,y);

  // RIGHT: DF (formatted as "May 1, 2026")
  const filed9str=filedDt?filedDt.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):'';
  doc.setFont(KP_FONT,'normal');
  doc.text('DF: '+filed9str,rightCol,y);

  y+=KP_LH;
  // LEFT: complainant address (purok/street/barangay from user input)
  doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  const compAddr=d.complainantAddress||'';
  if(compAddr) doc.text(compAddr,ml,y);
  // RIGHT: Barangay Case No.
  doc.text('Barangay Case No. '+(d.caseNo||''),rightCol,y);

  y+=KP_LH;
  doc.text('Butuan City',ml,y);
  doc.text('For: '+(d.caseTitle||''),rightCol,y);

  y+=KP_LH;
  doc.text('Complainant/s',ml,y);
  const tfText=d.timeFiled||d.schedTime||'';
  doc.text('TF: '+tfText,rightCol,y);

  // ── Against ──
  y+=KP_LH+4;
  doc.text('- against -',ml,y);

  // ── Respondent block ──
  y+=KP_LH+2;
  const respName=(d.respondent||'').toUpperCase();
  doc.setFont(KP_FONT,'bold');doc.setTextColor(0,0,0);
  doc.text(respName,ml,y);

  y+=KP_LH;
  doc.setFont(KP_FONT,'normal');
  const respAddr=d.respondentAddress||'';
  // Show user-entered address (purok/street/barangay) — not Butuan City (that's the next line)
  if(respAddr) doc.text(respAddr,ml,y);
  y+=KP_LH;
  doc.text('Butuan City',ml,y);
  y+=KP_LH;
  doc.text('Respondent/s',ml,y);

  // ── SUMMONS title — no horizontal rules ──
  y+=KP_LH+3;
  doc.setFontSize(KP_FONT_TITLE);doc.setFont(KP_FONT,'bold');
  doc.text('S U M M O N S',W/2,y,{align:'center'});

  // ── To: block ──
  y+=KP_LH+4;
  doc.setFontSize(KP_FONT_BASE);doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  let px=ml;
  doc.text('To:  ',px,y);px+=_tw(doc,'To:  ');
  doc.setFont(KP_FONT,'bold');
  doc.text(respName,px,y);
  const rnW=_tw(doc,respName);
  doc.line(px,y+1.2,px+rnW,y+1.2);

  y+=KP_LH+2;
  doc.setFont(KP_FONT,'normal');
  doc.text('Respondent/s',ml,y);

  // ── Body paragraph ──
  y+=KP_LH+4;
  const day9=schedDt?ordinalDay(schedDt):'____';
  const mon9=schedDt?MONTHS[schedDt.getMonth()].toUpperCase():'____';
  const yr9short=schedDt?String(schedDt.getFullYear()).slice(-2):'__';
  const time9=_fmt12hrTime(d.schedTime||'1:00 PM');
  const isAM9=!/pm/i.test(time9);
  const time9Display=time9.replace(/\s*(AM|PM)$/i,'').trim();

  doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);

  // ── Line 1: justified — opening sentence up to "on the" ──
  const p9L1='     You are hereby summoned to appear before me in person, together with your witness/es, on the';
  const p9L1words=p9L1.split(' ');
  const p9L1totalW=p9L1words.reduce((a,w)=>a+_tw(doc,w),0);
  const p9L1gap=(cw-p9L1totalW)/(p9L1words.length-1);
  let px9=ml;
  p9L1words.forEach((w,i)=>{doc.text(w,px9,y);px9+=_tw(doc,w)+(i<p9L1words.length-1?p9L1gap:0);});
  y+=KP_LH;

  // ── Line 2: inline underlined values — day, month, year, time, morning/afternoon + rest of clause ──
  // This line has mixed underlined content so we render inline from ml, filling the full width naturally
  px=ml;
  px=_utext(doc,day9,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text(' day of ',px,y);px+=_tw(doc,' day of ');
  px=_utext(doc,mon9,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text(', 20',px,y);px+=_tw(doc,', 20');
  px=_utext(doc,yr9short,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text('  at  ',px,y);px+=_tw(doc,'  at  ');
  px=_utext(doc,time9Display,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text(" o'clock in the ",px,y);px+=_tw(doc," o'clock in the ");
  if(isAM9){
    px=_utext(doc,'morning',px,y,[0,0,0]);
    doc.setTextColor(0,0,0);
    // justify remaining text to right margin
    const rem1='/afternoon, then and their answer to a';
    const remW1=cw-(px-ml);
    doc.text(rem1,px,y);
  } else {
    doc.text('morning/',px,y);px+=_tw(doc,'morning/');
    px=_utext(doc,'afternoon',px,y,[0,0,0]);
    doc.setTextColor(0,0,0);
    doc.text(', then and their answer to a',px,y);
  }
  y+=KP_LH;

  // ── Line 3: justified — complaint copy clause ──
  const p9L3='complaint made before me, copy of which is attached hereto, for mediation/conciliation of your';
  const p9L3words=p9L3.split(' ');
  const p9L3totalW=p9L3words.reduce((a,w)=>a+_tw(doc,w),0);
  const p9L3gap=(cw-p9L3totalW)/(p9L3words.length-1);
  let px3=ml;
  p9L3words.forEach((w,i)=>{doc.text(w,px3,y);px3+=_tw(doc,w)+(i<p9L3words.length-1?p9L3gap:0);});
  y+=KP_LH;

  // ── Line 4: last line of paragraph — left-aligned (standard for justified last line) ──
  doc.text('dispute with complainant/s.',ml,y);
  y+=KP_LH;

  // ── Paragraph 2 — Warning — fully justified ──
  y+=KP_LH*0.5;
  const warn9L1='     You are hereby warned that if you refuse or willfully fail to appear in obedience to this';
  const w9L1words=warn9L1.split(' ');
  const w9L1totalW=w9L1words.reduce((a,w)=>a+_tw(doc,w),0);
  const w9L1gap=(cw-w9L1totalW)/(w9L1words.length-1);
  let pxw=ml;
  w9L1words.forEach((w,i)=>{doc.text(w,pxw,y);pxw+=_tw(doc,w)+(i<w9L1words.length-1?w9L1gap:0);});
  y+=KP_LH;
  // Last line of warning — left-aligned
  doc.text('summons, you may be barred from filing any counterclaim arising from said complaint.',ml,y);
  y+=KP_LH;

  // ── FAIL NOT ──
  y+=KP_LH*0.5;
  const failnot='     FAIL NOT or else faces punishment as for contempt of court.';
  doc.text(failnot,ml,y);

  // ── This ___ day of ___ 20 __ . ──
  y+=KP_LH+5;
  const filed9day=filedDt?ordinalDay(filedDt):'____';
  const filed9mon=filedDt?MONTHS[filedDt.getMonth()].toUpperCase():'____';
  const filed9yr2=filedDt?String(filedDt.getFullYear()).slice(-2):'__';
  px=ml;
  doc.text('This ',px,y);px+=_tw(doc,'This ');
  px=_utext(doc,filed9day,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text('  day of  ',px,y);px+=_tw(doc,'  day of  ');
  px=_utext(doc,filed9mon,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text('  20',px,y);px+=_tw(doc,'  20');
  px=_utext(doc,filed9yr2,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text(' .',px,y);

  // ── Signature block — Punong Barangay (mediation) OR Pangkat officers (conciliation) ──
  y+=KP_LH+14;
  if(d.isConc){
    // Conciliation: Pangkat Chairman (right-aligned), Secretary + Member (left side)
    const chairName9c = (d.pangkatChair||'____________________________').toUpperCase();
    const secName9c   = (d.pangkatSecretary||'').toUpperCase();
    const memName9c   = (d.pangkatMember||'').toUpperCase();

    // Pangkat Chairman — right-aligned bold underlined (same style as Form 12)
    doc.setFont(KP_FONT,'bold'); doc.setTextColor(0,0,0);
    const ch9cW = _tw(doc, chairName9c);
    doc.line(W-mr-ch9cW-4, y+1.2, W-mr+4, y+1.2);
    doc.text(chairName9c, W-mr, y, {align:'right'});
    y+=KP_LH;
    doc.setFont(KP_FONT,'normal');
    doc.text('Pangkat Chairman', W-mr, y, {align:'right'});
    y+=KP_LH+10;

    // Secretary and Member — side by side, same dynamic spacing as Form 12
    doc.setFont(KP_FONT,'bold');
    const secNameW9 = secName9c ? _tw(doc,secName9c) : _tw(doc,'Pangkat Secretary');
    const labelSecW9 = _tw(doc,'Pangkat Secretary');
    const leftColW9 = Math.max(secNameW9, labelSecW9);
    const memColX9 = ml + leftColW9 + 16;
    if(secName9c){ doc.text(secName9c, ml, y); doc.line(ml, y+1.2, ml+_tw(doc,secName9c), y+1.2); }
    if(memName9c){ doc.text(memName9c, memColX9, y); doc.line(memColX9, y+1.2, memColX9+_tw(doc,memName9c), y+1.2); }
    y+=KP_LH;
    doc.setFont(KP_FONT,'normal');
    if(secName9c) doc.text('Pangkat Secretary', ml, y);
    if(memName9c) doc.text('Pangkat Member', memColX9, y);
  } else {
    // Mediation: Punong Barangay/Lupon Chairman — right-aligned bold underlined
    const ch9=(d.chairman||'HON. ABUNDIO A. LEONES').toUpperCase();
    doc.setFont(KP_FONT,'bold');doc.setTextColor(0,0,0);
    const ch9w=_tw(doc,ch9);
    doc.line(W-mr-ch9w-4,y+1.2,W-mr+4,y+1.2);
    doc.text(ch9,W-mr,y,{align:'right'});
    y+=KP_LH;
    doc.setFont(KP_FONT,'normal');
    doc.text('Punong Barangay/Lupon Chairman',W-mr,y,{align:'right'});
  }
}
// ─── FULL-PAGE CASE DETAIL VIEW ──────────────────────────────────────────────


function renderCaseDetailPage(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c) return `<div class="empty">Case not found.</div>`;
  const esc=escHtml;

  // Helpers
  function infoRow(label,val){
    return `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:6px 0;border-bottom:1px solid #f0f2f5">
      <span style="font-size:12px;color:#6b7280;font-weight:500;flex-shrink:0;width:140px">${label}</span>
      <span style="font-size:12px;font-weight:600;color:#0d2137;text-align:right;flex:1;word-break:break-word">${val||'—'}</span>
    </div>`;
  }

  // ── ARCHIVE CASE: full-page detail (same layout, archive-specific right panel) ──
  if(c._archive){
    const attachments = c.attachments||[];

    // Left panel — identical structure to new case
    const arcLeftPanel = `
    <div style="position:fixed;left:254px;top:118px;width:280px;bottom:24px;display:flex;flex-direction:column;gap:0;z-index:10">

      <!-- CASE INFORMATION -->
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:12px;flex-shrink:0">
        <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f0f2f5;background:#f9fafb">
          <span style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">Case Information</span>
          <span style="margin-left:auto;font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;background:#e8f4fd;color:#0d3d3a;border:1px solid #b2dfe2">ARCHIVED</span>
        </div>
        <div style="padding:10px 14px;display:flex;flex-direction:column;gap:0">
          ${infoRow('Case Number', `<strong style="color:#0d3d3a">${esc(c.caseNo||'')}</strong>`)}
          ${infoRow('Date Filed', esc(fmtDateWords(c.dateFiled||'')))}
          ${infoRow('Time Filed', esc(c.timeFiled?formatTime12(c.timeFiled):''))}
          ${infoRow('Status', statusBadge(c.status))}
          ${infoRow('Case Title', esc(c.caseTitle||c.nature||''))}
          ${infoRow('Nature of Case', esc(c.nature||c.type||''))}
          ${c.actionTaken?infoRow('Action Taken', esc(c.actionTaken)):''}
        </div>
      </div>

      <!-- PARTIES -->
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:12px;flex-shrink:0">
        <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f0f2f5;background:#f9fafb">
          <span style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">Parties</span>
        </div>
        <div style="padding:10px 14px">
          <div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:8px">
            <div style="width:26px;height:26px;border-radius:50%;background:#14919b;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;margin-top:2px">C</div>
            <div style="min-width:0;flex:1;overflow:hidden">
              <div style="font-size:10px;color:#14919b;font-weight:700;text-transform:uppercase;letter-spacing:0.4px">Complainant</div>
              <div style="font-size:13px;font-weight:700;color:#0d3d3a;word-break:break-word;overflow-wrap:break-word">${esc((c.complainant||'—').toUpperCase())}</div>
              ${c.complainantContact?`<div style="font-size:11px;color:#14919b;margin-top:2px;display:flex;align-items:center;gap:4px"><span style="font-size:10px">📞</span>${esc(c.complainantContact)}</div>`:''}
              ${c.complainantAddress?`<div style="font-size:11px;color:#6b7280;margin-top:1px;word-break:break-word;overflow-wrap:break-word">${esc(c.complainantAddress)}</div>`:''}
            </div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:7px">
            <div style="width:26px;height:26px;border-radius:50%;background:#2a9d8f;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;margin-top:2px">R</div>
            <div style="min-width:0;flex:1;overflow:hidden">
              <div style="font-size:10px;color:#2a9d8f;font-weight:700;text-transform:uppercase;letter-spacing:0.4px">Respondent</div>
              <div style="font-size:13px;font-weight:700;color:#0d3d3a;word-break:break-word;overflow-wrap:break-word">${esc((c.respondent||'—').toUpperCase())}</div>
              ${c.respondentContact?`<div style="font-size:11px;color:#2a9d8f;margin-top:2px;display:flex;align-items:center;gap:4px"><span style="font-size:10px">📞</span>${esc(c.respondentContact)}</div>`:''}
              ${c.respondentAddress?`<div style="font-size:11px;color:#6b7280;margin-top:1px;word-break:break-word;overflow-wrap:break-word">${esc(c.respondentAddress)}</div>`:''}
            </div>
          </div>
        </div>
      </div>

      <!-- ATTACHMENTS (scrollable) -->
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;min-height:0;flex:1">
        <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f0f2f5;background:#f9fafb;flex-shrink:0">
          <span style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">Attachments</span>
        </div>
        <div style="padding:10px 14px;overflow-y:auto;flex:1">
          ${attachments.length ? attachments.map((a,i)=>`
            <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:7px;margin-bottom:6px">
              <span style="font-size:16px;cursor:pointer" onclick="arcViewAttachment('${c.id}',${i})">📄</span>
              <div style="flex:1;min-width:0;cursor:pointer" onclick="arcViewAttachment('${c.id}',${i})">
                <div style="font-size:12px;font-weight:600;color:#0d3d3a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.name)}</div>
                <div style="font-size:10px;color:#9ba3ae">${a.size?Math.round(a.size/1024)+' KB':''}</div>
              </div>
              ${a.dataUrl?`<a href="${a.dataUrl}" download="${esc(a.name)}" style="flex-shrink:0;padding:3px 8px;background:#0d3d3a;color:#fff;border-radius:5px;font-size:11px;font-weight:600;text-decoration:none">⬇</a>`:''}
            </div>`).join('')
          : `<div style="padding:10px 0;font-size:12px;color:#9ba3ae;text-align:center">No attachments uploaded.</div>`}
        </div>
      </div>

    </div>`;

    // Right panel — archive case details
    function arcSec(title){
      return `<div style="font-size:11px;font-weight:700;color:#0d3d3a;text-transform:uppercase;letter-spacing:0.8px;margin:16px 0 8px;padding-bottom:4px;border-bottom:2px solid #dbeafe">${title}</div>`;
    }
    function arcRow(label,val){
      if(!val)return '';
      return `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:6px 0;border-bottom:1px solid #f0f2f5">
        <span style="font-size:12px;color:#6b7280;font-weight:500;flex-shrink:0;width:160px">${label}</span>
        <span style="font-size:12px;font-weight:600;color:#0d2137;text-align:right;flex:1;word-break:break-word">${val}</span>
      </div>`;
    }

    const hasMediation  = c._lupanChairman || c.mediator || c.dateConfrontation;
    const hasSummons    = c._summonsDate   || c._servingOfficer;
    const hasPangkat    = c._pangkatChair  || c._pangkatSecretary || c._pangkatMember;
    const hasConc       = c._conciliationDate || c._venue;

    const arcRightPanel = `
    <div style="flex:1;display:flex;flex-direction:column;gap:14px;min-width:0">

      <!-- OVERVIEW CARD -->
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
        <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f0f2f5;background:#e8f4fd">
          <span style="font-size:14px">📦</span>
          <span style="font-size:11px;font-weight:700;color:#0d3d3a;text-transform:uppercase;letter-spacing:0.5px">Archived Case Record</span>
          <span style="margin-left:auto;font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;background:#0d3d3a;color:#fff">OLD CASE</span>
        </div>
        <div style="padding:14px 18px">
          ${arcSec('Case Reference')}
          ${arcRow('Case Number', `<strong style="color:#0d3d3a">${esc(c.caseNo||'')}</strong>`)}
          ${arcRow('Date Filed', esc(fmtDateWords(c.dateFiled||'')))}
          ${arcRow('Time Filed', esc(c.timeFiled?formatTime12(c.timeFiled):''))}
          ${arcRow('Nature of Case', esc(c.nature||c.type||''))}
          ${arcRow('Case Title', esc(c.caseTitle||''))}
          ${arcRow('Action Taken', esc(c.actionTaken||''))}
          <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:6px 0;border-bottom:1px solid #f0f2f5">
            <span style="font-size:12px;color:#6b7280;font-weight:500;flex-shrink:0;width:160px">Status</span>
            <span style="flex:1;text-align:right">${statusBadge(c.status)}</span>
          </div>
          ${arcRow('Date of Confrontation', esc(fmtDateWords(c.dateConfrontation||'')))}
          ${arcRow('Date of Settlement / Resolution', esc(fmtDateWords(c.dateResolved||'')))}
          ${arcRow('Mediator / Lupon Chairman', esc(c.mediator||c._lupanChairman||''))}
          ${c._narrative||c.remarks ? `<div style="margin-top:10px;padding:10px 12px;background:#e8f6f7;border:1px solid #fde68a;border-radius:8px">
            <div style="font-size:10px;font-weight:700;color:#0d3d3a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">💬 Remarks / Narrative</div>
            <div style="font-size:12px;color:#0d2137;white-space:pre-wrap;word-break:break-word;line-height:1.6">${esc(c._narrative||c.remarks||'')}</div>
          </div>` : ''}
        </div>
      </div>

      <!-- KP PROCESS DETAILS -->
      ${(hasMediation||hasSummons||hasPangkat||hasConc) ? `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
        <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f0f2f5;background:#f9fafb">
          <span style="font-size:14px">⚖️</span>
          <span style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">KP Process Details (Logged)</span>
        </div>
        <div style="padding:14px 18px">
          ${hasMediation ? arcSec('Mediation (Form 8)') + arcRow('Mediation Date', esc(fmtDateWords(c.dateConfrontation||''))) + arcRow('Lupon Chairman/Punong Barangay', esc(c._lupanChairman||c.mediator||'')) : ''}
          ${hasSummons   ? arcSec('Summons (Form 9)')   + arcRow('Summons Date', esc(fmtDateWords(c._summonsDate||'')))   + arcRow('Serving Officer', esc(c._servingOfficer||'')) : ''}
          ${hasPangkat   ? arcSec('Pangkat (Forms 10 & 11)') + arcRow('Pangkat Chair', esc(c._pangkatChair||'')) + arcRow('Pangkat Secretary', esc(c._pangkatSecretary||'')) + arcRow('Pangkat Member', esc(c._pangkatMember||'')) : ''}
          ${hasConc      ? arcSec('Conciliation Hearing (Form 12)') + arcRow('Conciliation Date', esc(fmtDateWords(c._conciliationDate||''))) + arcRow('Venue', esc(c._venue||'')) : ''}
          ${c._settlementTerms ? `<div style="margin-top:10px;padding:10px 12px;background:#f0fdf4;border:1px solid #6ee7b7;border-radius:8px">
            <div style="font-size:10px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">✅ Settlement Terms</div>
            <div style="font-size:12px;color:#0d2137;white-space:pre-wrap;word-break:break-word;line-height:1.6">${esc(c._settlementTerms)}</div>
          </div>` : ''}
        </div>
      </div>` : ''}

    </div>`;

    return `
    <!-- Top nav bar — STICKY (Archive) -->
    <div id="cdp-topbar" style="position:sticky;top:0;z-index:100;background:#f4f5f7;padding-bottom:10px;margin-bottom:6px">
      <div style="display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:10px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <button onclick="(function(){state.viewCasePage=null;state.page=state._prevPage||'dashboard';state.filterStatCard=state._prevStatCard||null;state._prevPage=null;state._prevStatCard=null;render();})()" style="display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:#f4f5f7;border:1px solid #e5e7eb;color:#374151;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0">← Back</button>
        <div style="flex-shrink:0">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:17px;font-weight:700;color:#0d3d3a">${esc(c.caseNo||'—')}</span>
            ${statusBadge(c.status)}
            <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;background:#e8f4fd;color:#0d3d3a;border:1px solid #b2dfe2">ARCHIVED</span>
          </div>
          <div style="font-size:12px;color:#6b7280;margin-top:1px">${esc((c.complainant||'').toUpperCase())}${c.respondent?' vs '+esc(c.respondent.toUpperCase()):''}</div>
        </div>
        <div style="width:1px;height:36px;background:#e5e7eb;flex-shrink:0;margin:0 4px"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:5px"><div style="width:6px;height:6px;border-radius:50%;background:#0d3d3a"></div>Archived / Old Case Record</div>
          <div style="font-size:12px;font-weight:700;color:#0d3d3a;margin-top:1px">${esc(c.caseTitle||c.nature||'Logged Old Case')}</div>
          <div style="font-size:10px;color:#9ba3ae"></div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;margin-left:auto">
          <button onclick="openUploadAttachmentModal('${c.id}')" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:#0d3d3a;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer" onmouseover="this.style.background='#0a5055'" onmouseout="this.style.background='#0d3d3a'">Upload Attachment</button>
          <button onclick="state.viewCasePage=null;openEditArchiveModal('${c.id}')" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:#3b82f6;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer">Edit Case</button>

        </div>
      </div>
    </div>

    <!-- Two-column layout (same as new case) -->
    <div style="display:flex;gap:0;align-items:flex-start;padding-bottom:24px">
      ${arcLeftPanel}
      <div style="margin-left:296px;flex:1;min-width:0">
        ${arcRightPanel}
      </div>
    </div>`;
  }
  // ── END ARCHIVE CASE ──

  // Compute KP process data
  const dateFiled = c.dateFiled||'';
  const filedMs = dateFiled ? new Date(dateFiled+'T00:00:00').getTime() : 0;
  const medDeadline = filedMs ? new Date(filedMs+15*24*60*60*1000).toISOString().slice(0,10) : '';
  const today = todayStr();
  const daysLeftMed = medDeadline ? Math.round((new Date(medDeadline+'T00:00:00')-new Date(today+'T00:00:00'))/86400000) : null;

  const medSessions = c._medSessions||[];
  const concSessions = c._concSessions||[];
  const medSettled = medSessions.some(s=>s.outcome==='settled');
  const medAllDone = medSessions.length>=3||c._medFailed;
  const medPhaseComplete = medSettled||medAllDone;
  const concPhaseActive = medPhaseComplete&&!medSettled;
  // Derive conciliation window start: 1 day after 3rd med session, fallback to _concStartDate
  function _addDStr(ds,n){const d=new Date(ds+'T00:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
  const _thirdMedSess = medSessions[2];
  const _concWinStart2 = (_thirdMedSess&&_thirdMedSess.date) ? _addDStr(_thirdMedSess.date,1) : (c._concStartDate||'');
  const concDeadline = _concWinStart2 ? _addDStr(_concWinStart2, 14) : '';
  const concSettled = concSessions.some(s=>s.outcome==='settled');
  const caseSettled = medSettled||concSettled;

  // Next hearing
  const allScheds = state.schedules.filter(s=>s._caseId===c.id||s.caseNo===c.caseNo);
  const nextSched = allScheds.filter(s=>s.schedDate>=today).sort((a,b)=>a.schedDate.localeCompare(b.schedDate))[0]||null;

  // KP Phase status badge
  let overallStatus = 'Ongoing';
  if(c.status==='Settled'||caseSettled) overallStatus='Case Settled';
  else if(c.status==='CFA') overallStatus='CFA';

  // ── LEFT PANEL ──
  const attachments = c.attachments||[];
  const leftPanel = `
  <div style="position:fixed;left:254px;top:118px;width:280px;bottom:24px;display:flex;flex-direction:column;gap:0;z-index:10">

    <!-- CASE INFORMATION (sticky, does not scroll) -->
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:12px;flex-shrink:0">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f0f2f5;background:#f9fafb">
        <span style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">Case Information</span>
      </div>
      <div style="padding:10px 14px;display:flex;flex-direction:column;gap:0">
        ${infoRow('Case Number', `<strong style="color:#0d3d3a">${esc(c.caseNo||'')}</strong>`)}
        ${infoRow('Date Filed', esc(fmtDateWords(c.dateFiled||'')))}
        ${infoRow('Time Filed', esc(formatTime12(c.timeFiled||'')))}
        ${infoRow('Status', statusBadge(c.status))}
        ${infoRow('Case Title', esc(c.caseTitle||c.nature||''))}
        ${infoRow('Nature of Case', esc(c.nature||c.type||''))}
      </div>
    </div>

    <!-- PARTIES (sticky, does not scroll) -->
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:12px;flex-shrink:0">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f0f2f5;background:#f9fafb">
        <span style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">Parties</span>
      </div>
      <div style="padding:10px 14px">
        <div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:8px">
          <div style="width:26px;height:26px;border-radius:50%;background:#14919b;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;margin-top:2px">C</div>
          <div style="min-width:0;flex:1;overflow:hidden">
            <div style="font-size:10px;color:#14919b;font-weight:700;text-transform:uppercase;letter-spacing:0.4px">Complainant</div>
            <div style="font-size:13px;font-weight:700;color:#0d3d3a;word-break:break-word;overflow-wrap:break-word">${esc((c.complainant||'—').toUpperCase())}</div>
            ${c.complainantContact?`<div style="font-size:11px;color:#14919b;margin-top:2px;display:flex;align-items:center;gap:4px"><span style="font-size:10px">📞</span>${esc(c.complainantContact)}</div>`:''}
            ${c.complainantAddress?`<div style="font-size:11px;color:#6b7280;margin-top:1px;word-break:break-word;overflow-wrap:break-word">${esc(c.complainantAddress)}</div>`:''}
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:7px">
          <div style="width:26px;height:26px;border-radius:50%;background:#2a9d8f;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;margin-top:2px">R</div>
          <div style="min-width:0;flex:1;overflow:hidden">
            <div style="font-size:10px;color:#2a9d8f;font-weight:700;text-transform:uppercase;letter-spacing:0.4px">Respondent</div>
            <div style="font-size:13px;font-weight:700;color:#0d3d3a;word-break:break-word;overflow-wrap:break-word">${esc((c.respondent||'—').toUpperCase())}</div>
            ${c.respondentContact?`<div style="font-size:11px;color:#2a9d8f;margin-top:2px;display:flex;align-items:center;gap:4px"><span style="font-size:10px">📞</span>${esc(c.respondentContact)}</div>`:''}
            ${c.respondentAddress?`<div style="font-size:11px;color:#6b7280;margin-top:1px;word-break:break-word;overflow-wrap:break-word">${esc(c.respondentAddress)}</div>`:''}
          </div>
        </div>
      </div>
    </div>

    <!-- ATTACHMENTS (scrollable only) -->
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;min-height:0;flex:1">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f0f2f5;background:#f9fafb;flex-shrink:0">
        <span style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">Attachments</span>
        <button onclick="viewAttachments('${c.id}',0)" title="View all attachments" style="margin-left:auto;padding:3px 10px;background:#0d3d3a;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;flex-shrink:0" onmouseover="this.style.background='#0a5055'" onmouseout="this.style.background='#0d3d3a'">View All</button>
      </div>
      <div style="padding:10px 14px;overflow-y:auto;flex:1">
        ${(()=>{
          const generatedForms = attachments.filter(a=>a._generated);
          const uploadedFiles  = attachments.filter(a=>!a._generated);
          let html = '';

          // Helper: derive a short display label for each generated KP form
          function kpFormLabel(name){
            if(/Form 7/i.test(name))  return {tag:'Form 7',  desc:'Complaint',                    bg:'#fef3c7',color:'#0d3d3a'};
            if(/Form 8/i.test(name))  return {tag:'Form 8',  desc:'Notice of Hearing',             bg:'#dbeafe',color:'#1e40af'};
            if(/Form 9/i.test(name))  return {tag:'Form 9',  desc:'Summons',                       bg:'#ede9fe',color:'#5b21b6'};
            if(/Form 10/i.test(name)) return {tag:'Form 10', desc:'Notice — Pangkat Constitution', bg:'#ede9fe',color:'#6d28d9'};
            if(/Form 11/i.test(name)) return {tag:'Form 11', desc:'Conciliation',                  bg:'#fce7f3',color:'#9d174d'};
            if(/Form 12/i.test(name)) return {tag:'Form 12', desc:'CFA',                           bg:'#fee2e2',color:'#b91c1c'};
            if(/Amicable Settlement/i.test(name)) return {tag:'Form 16', desc:'Amicable Settlement', bg:'#dcfce7',color:'#15803d'};
            return {tag:'Form',       desc:name,                                                    bg:'#f3f4f6',color:'#374151'};
          }

          // Show each generated KP form as its own row with specific label
          // Amicable Settlement opens viewAttachments modal; all others open the KP Forms split-panel
          generatedForms.forEach(a=>{
            const realIdx = attachments.indexOf(a);
            const lbl = kpFormLabel(a.name);
            const isAmicable = !!a._settlement || /Amicable Settlement/i.test(a.name);
            let clickHandler;
            if(isAmicable){
              // Open Documents panel and auto-select this attachment (shows PDF in right pane)
              clickHandler = `viewAttachments('${c.id}',${realIdx})`;
            } else {
              let kpTab = 'form7';
              if(/Form 8/i.test(a.name))  kpTab = 'form8';
              if(/Form 9/i.test(a.name))  kpTab = 'form9';
              if(/Form 10/i.test(a.name)) kpTab = 'form10';
              if(/Form 11/i.test(a.name)) kpTab = 'form11';
              if(/Form 12/i.test(a.name)) kpTab = 'form12';
              clickHandler = `openKpFormsFromViewTab('${c.id}','${kpTab}')`;
            }
            const rowBg   = isAmicable ? '#f0fdf4' : '#e8f6f7';
            const rowBorder = isAmicable ? '#6ee7b7' : '#fde68a';
            const iconEmoji = isAmicable ? '✅' : '📋';
            html += `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:${rowBg};border:1px solid ${rowBorder};border-radius:7px;font-size:12px;color:#0d3d3a;margin-bottom:6px">
              <span style="font-size:14px;cursor:pointer" onclick="${clickHandler}">${iconEmoji}</span>
              <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:${lbl.bg};color:${lbl.color};flex-shrink:0;cursor:pointer" onclick="${clickHandler}">${lbl.tag}</span>
              <span style="font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" onclick="${clickHandler}">${isAmicable?'Amicable Settlement':lbl.desc}</span>
              <span style="font-size:14px;color:#d97706;flex-shrink:0;cursor:pointer" onclick="${clickHandler}">›</span>
              <button onclick="event.stopPropagation();removeAttachment('${c.id}',${realIdx})" title="Delete this form" style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:#fee2e2;border:1px solid #fca5a5;color:#dc2626;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;padding:0;margin-left:2px" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">✕</button>
            </div>`;
          });

          // Show uploaded files
          uploadedFiles.forEach((a,i)=>{
            const realIdx = attachments.indexOf(a);
            html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:7px;margin-bottom:6px">
              <span style="font-size:16px;cursor:pointer" onclick="viewAttachments('${c.id}',${realIdx})">📄</span>
              <div style="flex:1;min-width:0;cursor:pointer" onclick="viewAttachments('${c.id}',${realIdx})">
                <div style="font-size:12px;font-weight:600;color:#0d3d3a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.name)}</div>
                <div style="font-size:10px;color:#9ba3ae">${a.size?Math.round(a.size/1024)+' KB':''}</div>
              </div>
              <button onclick="event.stopPropagation();removeAttachment('${c.id}',${realIdx})" title="Delete this file" style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:#fee2e2;border:1px solid #fca5a5;color:#dc2626;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;padding:0" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">✕</button>
            </div>`;
          });

          // If no generated Form 7 exists yet, always show a Form 7 placeholder row
          const hasForm7 = generatedForms.some(a=>/Form 7/i.test(a.name));
          if(!hasForm7){
            const form7Placeholder = `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#e8f6f7;border:1px solid #fde68a;border-radius:7px;font-size:12px;color:#0d3d3a;cursor:pointer;margin-bottom:6px" onclick="generateMissingForm7('${c.id}')" title="Click to generate Form 7">
              <span style="font-size:14px">📋</span>
              <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:#d4f1f1;color:#0d3d3a;flex-shrink:0">Form 7</span>
              <span style="font-weight:600;flex:1">Complaint</span>
              <span style="font-size:10px;color:#b45309;background:#d4f1f1;padding:1px 6px;border-radius:4px;border:1px dashed #d97706;flex-shrink:0">Generate</span>
            </div>`;
            html = form7Placeholder + html;
          }

          // If truly nothing at all after checks, show empty state
          if(!html){
            html = `<div style="padding:10px 0;font-size:12px;color:#9ba3ae;text-align:center">No attachments yet.</div>`;
          }
          return html;
        })()}
      </div>
    </div>

  </div>`;

  // ── RIGHT PANEL: KP Process Tracker ──
  // Phase progress bar top
  const phase1Done = medPhaseComplete;
  const phase2Done = concSettled||(c.status==='Settled'&&concPhaseActive);

  function sessionDot(num, sessions, phase){
    const s = sessions[num-1];
    const outcome = s ? s.outcome : null;
    const isActive = !outcome && (phase==='med' ? !medPhaseComplete : concPhaseActive);
    const isNext = !s && (phase==='med' ? !medPhaseComplete&&medSessions.length===num-1 : concPhaseActive&&concSessions.length===num-1);
    let bg='#e5e7eb', color='#9ca3af', border='2px solid #e5e7eb';
    if(outcome==='settled'){bg='#059669';color='#fff';border='2px solid #059669';}
    else if(outcome==='not_settled'){bg='#dc2626';color='#fff';border='2px solid #dc2626';}
    else if(isNext){bg='#3b82f6';color='#fff';border='2px solid #3b82f6';}
    return `<div style="width:28px;height:28px;border-radius:50%;background:${bg};color:${color};border:${border};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">${outcome==='settled'?'✓':outcome==='not_settled'?'✗':num}</div>`;
  }

  // Build session cards for a phase
  // Mediation: Session 1 → Form 8, Session 2 → Form 9, Session 3 → Form 9
  // Conciliation: Session 1 → Form 10, Session 2 → Form 11, Session 3 → Form 12
  function medFormNum(sessionIdx){ return sessionIdx===0 ? 8 : 9; }
  function concFormNum(sessionIdx){ return 10 + sessionIdx; }

  function buildSessionCards(phase, sessions, maxSessions, phaseActive, phaseComplete, phaseSettled, isCFA){
    const cards = [];
    for(let i=0;i<maxSessions;i++){
      const s = sessions[i];
      const num = i+1;
      const isScheduled = !!s;
      const outcome = s ? s.outcome : null;
      const isLocked = !phaseActive && !s;
      const isMed = phase==='med';
      const formNum = isMed ? medFormNum(i) : concFormNum(i);
      const isFirst = i===0;

      let borderColor = '#e5e7eb', bg = '#fff';
      if(outcome==='settled'){borderColor='#6ee7b7';bg='#f0fdf4';}
      else if(outcome==='not_settled'){borderColor='#fca5a5';bg='#fef2f2';}
      else if(isFirst&&!phaseComplete&&isMed&&!isScheduled){borderColor='#3b82f6';bg='#fff';}

      const sessionLabel = isMed ? `Session ${num}` : `Session ${num} (Lupon)`;
      const dateStr = s&&s.date ? s.date : (isScheduled&&s.schedDate ? s.schedDate : '');
      const dateFmt = dateStr ? new Date(dateStr+'T00:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : '';
      const schedInfo = dateStr ? `<div style="font-size:11px;color:#6b7280;margin-top:2px">${dateFmt}${s&&s.time?' &nbsp;•&nbsp; '+s.time:''}</div>` : '';

      const isOverallSettled = caseSettled;
      let outcomeButtons = '';
      if(isScheduled && outcome !== 'settled' && outcome !== 'not_settled'){
        if(isOverallSettled || isCFA){
          outcomeButtons = `<div style="display:flex;gap:6px;margin-top:8px;opacity:0.4;pointer-events:none">
            <button style="flex:1;padding:6px 0;border-radius:6px;border:1.5px solid #059669;background:#d1fae5;color:#065f46;font-size:11px;font-weight:700;cursor:not-allowed">✅ Settled</button>
            <button style="flex:1;padding:6px 0;border-radius:6px;border:1.5px solid #dc2626;background:#fee2e2;color:#b91c1c;font-size:11px;font-weight:700;cursor:not-allowed">❌ Not Settled</button>
          </div>`;
        } else {
          outcomeButtons = `<div style="display:flex;gap:6px;margin-top:8px">
            <button onclick="kpConfirmSessionOutcome('${c.id}','${phase}',${i},'settled')" style="flex:1;padding:6px 0;border-radius:6px;border:1.5px solid #059669;background:#d1fae5;color:#065f46;font-size:11px;font-weight:700;cursor:pointer">✅ Settled</button>
            <button onclick="kpConfirmSessionOutcome('${c.id}','${phase}',${i},'not_settled')" style="flex:1;padding:6px 0;border-radius:6px;border:1.5px solid #dc2626;background:#fee2e2;color:#b91c1c;font-size:11px;font-weight:700;cursor:pointer">❌ Not Settled</button>
          </div>`;
        }
      }
      if(isScheduled && outcome==='not_settled' && !isOverallSettled && !isCFA){
        outcomeButtons += `<div style="margin-top:6px">
          <button onclick="kpConfirmSessionOutcome('${c.id}','${phase}',${i},'settled')" style="font-size:10px;padding:3px 9px;border-radius:5px;border:1px solid #e5e7eb;background:#f9fafb;color:#6b7280;cursor:pointer">↩ Change to Settled</button>
        </div>`;
      }

        // Schedule button: only for session 1 (sessions 2 & 3 are auto-scheduled)
        // Edit button: shown for any scheduled session
        let schedButton = '', genFormButton = '', editButton = '';
        if(!isLocked && !isCFA){
          if(!isScheduled && i===0){
            schedButton = `<button onclick="kpScheduleSessionOne('${c.id}','${phase}')" style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:6px;border:1px solid #6dd4da;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:600;cursor:pointer">Schedule Session 1</button>`;
          } else if(!isScheduled && i>0){
            // Auto-scheduled based on session 1
            schedButton = `<span style="font-size:10px;color:#9ba3ae;padding:5px 0">⏳ Auto-scheduled after Session 1</span>`;
          }
          // Edit button for any already-scheduled session
          if(isScheduled){
            editButton = `<button onclick="kpEditSession('${c.id}','${phase}',${i})" style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:6px;border:1px solid #fde68a;background:#fefce8;color:#0d3d3a;font-size:11px;font-weight:600;cursor:pointer">✏️ Edit</button>`;
          }
          // Only show Generate Form button when the session is actually scheduled
          if(isScheduled){
            const genFormFn = isMed
              ? `kpGenerateForms('${c.id}','${dateStr.replace(/'/g,"\\'")}','${(s&&s.time?s.time:'').replace(/'/g,"\\'")}')`
              : `kpGenerateConcForms('${c.id}','${dateStr.replace(/'/g,"\\'")}','${(s&&s.time?s.time:'').replace(/'/g,"\\'")}')`;
            const genFormLabel = isMed ? '📄 Generate Form (8 &amp; 9)' : '📄 Generate Forms (11, 12 &amp; 9)';
            // If case is overall settled or CFA, disable the Generate Form button too
            if(isOverallSettled || isCFA){
              genFormButton = `<button style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:6px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:11px;font-weight:600;cursor:not-allowed;opacity:0.5" disabled>${genFormLabel}</button>`;
            } else {
              genFormButton = `<button onclick="${genFormFn}" style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:6px;border:1px solid ${isMed?'#b2dfe2':'#c4b5fd'};background:${isMed?'#e6f4f5':'#f3e8ff'};color:${isMed?'#0d3d3a':'#7c3aed'};font-size:11px;font-weight:600;cursor:pointer">${genFormLabel}</button>`;
            }
          }
        }

      const lockIcon = isLocked ? `<span style="font-size:14px;margin-right:4px">🔒</span>` : '';

      // Settled card: minimized — just show label + date prominently, no action buttons
      if(outcome==='settled'){
        cards.push(`
        <div style="border:1px solid #6ee7b7;border-radius:9px;background:#f0fdf4;padding:8px 12px;margin-bottom:6px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center;gap:6px">
              ${lockIcon}
              <span style="font-size:12px;font-weight:700;color:#0d2137">${sessionLabel}</span>
              <span style="font-size:10px;font-weight:700;padding:2px 7px;background:#d1fae5;color:#065f46;border-radius:10px">✓ Settled</span>
            </div>
            ${dateStr?`<span style="font-size:13px;font-weight:700;color:#065f46">${dateFmt}</span>`:''}
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:6px">${genFormButton}</div>
        </div>`);
      } else {
        cards.push(`
        <div style="border:1px solid ${isLocked?'#e5e7eb':borderColor};border-radius:9px;background:${isLocked?'#f9fafb':bg};padding:10px 12px;${isLocked?'opacity:0.7':''}margin-bottom:6px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <div style="display:flex;align-items:center;gap:6px">
              ${lockIcon}
              <span style="font-size:12px;font-weight:700;color:${isLocked?'#9ca3af':'#1a1a1a'}">${sessionLabel}</span>
              ${outcome==='not_settled'?`<span style="font-size:10px;font-weight:700;padding:2px 7px;background:#fee2e2;color:#b91c1c;border-radius:10px">✗ Not Settled</span>`:''}
            </div>
            <span style="font-size:11px;color:${isScheduled?'#14919b':'#9ba3ae'}">${isLocked?'Locked':isScheduled?'Scheduled':'Not yet scheduled'}</span>
          </div>
          ${schedInfo}
          ${outcomeButtons}
          ${!isLocked?`<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;align-items:center">${schedButton}${editButton}${genFormButton}</div>`:''}
        </div>`);
      }
    }
    return cards.join('');
  }

  const isCFA = c.status === 'CFA';

  const medSessionCards = buildSessionCards('med', medSessions, 3, !medPhaseComplete, medPhaseComplete, medSettled, isCFA);
  const concSessionCards = buildSessionCards('conc', concSessions, 3, concPhaseActive, !concPhaseActive||concSessions.length>=3, concSettled, isCFA);

  // Phase badge
  const phase1StatusBadge = medSettled
    ? `<div style="display:flex;align-items:center;gap:4px;padding:3px 10px;background:#d1fae5;border:1px solid #6ee7b7;border-radius:12px;font-size:10px;font-weight:700;color:#065f46">✓ CASE SETTLED</div>`
    : medPhaseComplete ? `<span style="font-size:10px;color:#9ca3af;font-weight:600">Not settled → Lupon</span>` : '';
  const phase2StatusBadge = concSettled
    ? `<div style="display:flex;align-items:center;gap:4px;padding:3px 10px;background:#d1fae5;border:1px solid #6ee7b7;border-radius:12px;font-size:10px;font-weight:700;color:#065f46">✓ CASE SETTLED</div>`
    : '';

  const rightPanel = `
  <div style="flex:1;display:flex;flex-direction:column;gap:14px;min-width:0">

    <!-- NEXT HEARING / SCHEDULED SESSIONS (moved to top) -->
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:visible">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f0f2f5;background:#f9fafb;border-radius:10px 10px 0 0">
        ${!caseSettled?'<span style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">'+(c.status==='CFA'&&c._cfaFiled?'Certificate to File Action':'Next Hearing')+'</span>':''}
      </div>
      <div style="padding:12px 14px">
        ${(()=>{
          const allSessionRows=[];
          (c._medSessions||[]).forEach((s,i)=>{
            if(s&&s.date) allSessionRows.push({date:s.date,time:s.time||'',outcome:s.outcome||'',label:`Mediation Session ${i+1}`,phase:'med'});
          });
          (c._concSessions||[]).forEach((s,i)=>{
            if(s&&s.date) allSessionRows.push({date:s.date,time:s.time||'',outcome:s.outcome||'',label:`Lupon Session ${i+1}`,phase:'conc'});
          });
          if(c.status==='CFA'&&c._cfaFiled){
            return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 0;text-align:center">
              <div style="width:36px;height:36px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;font-size:18px">❌</div>
              <div style="font-size:13px;font-weight:700;color:#b91c1c">Case Dismissed</div>
              <div style="font-size:11px;color:#9ba3ae">Certificate to File Action has been filed.</div>
            </div>
            <div style="margin-top:10px;background:#fee2e2;border:1.5px solid #fca5a5;border-radius:10px;padding:12px 14px">
              <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
                <span style="font-size:18px">📄</span>
                <div>
                  <div style="font-size:11px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:0.5px">CFA Filed</div>
                  <div style="font-size:10px;color:#6b7280">Certificate to File Action</div>
                </div>
                <span style="margin-left:auto;font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;background:#dc2626;color:#fff">DISMISSED</span>
              </div>
              <div style="font-size:11px;color:#6b7280;margin-top:3px">Filed on: ${c._cfaDate||'—'}</div>
            </div>`;
          }
          if(caseSettled){
            const _subm3 = submissionDeadlineStatus(c);
            let submBlock = '';
            if(_subm3){
              const dl3 = _subm3.deadline;
              const dlFmt3 = new Date(dl3+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
              const submColor = _subm3.overdue ? '#b91c1c' : _subm3.dueToday ? '#0d3d3a' : '#065f46';
              const submBg = _subm3.overdue ? '#fee2e2' : _subm3.dueToday ? '#fef3c7' : '#f0fdf4';
              const submBorder = _subm3.overdue ? '#fca5a5' : _subm3.dueToday ? '#14919b' : '#6ee7b7';
              const submIcon = _subm3.overdue ? '⚠️' : _subm3.dueToday ? '🔔' : '⚖️';
              const submLabel = _subm3.overdue ? 'OVERDUE' : _subm3.dueToday ? 'DUE TODAY' : `${_subm3.daysLeft} day${_subm3.daysLeft!==1?'s':''} remaining`;
              const submStatusBg = _subm3.overdue ? '#b91c1c' : _subm3.dueToday ? '#14919b' : '#059669';
              const finDl3 = _subm3.finalizationDeadline;
              const finDlFmt3 = finDl3 ? new Date(finDl3+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}) : '';
              if(_subm3.userConfirmed){
                submBlock = `<div style="margin-top:10px;background:#dcfce7;border:1.5px solid #16a34a;border-radius:10px;padding:12px 14px">
                  <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
                    <span style="font-size:18px">🏛️</span>
                    <div><div style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.5px">Submitted to Court ✅</div>
                    <div style="font-size:10px;color:#15803d">User confirmed submission</div></div>
                    <span style="margin-left:auto;font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;background:#16a34a;color:#fff">CONFIRMED</span>
                  </div>
                  <div style="font-size:12px;color:#15803d">Confirmed on: ${c._courtSubmittedDate||'—'}</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:2px">Settled on: ${c.dateResolved||'—'}</div>
                </div>`;
              } else if(_subm3.userDeclined){
                submBlock = `<div style="margin-top:10px;background:#e8f6f7;border:1.5px solid #14919b;border-radius:10px;padding:12px 14px">
                  <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
                    <span style="font-size:18px">⚠️</span>
                    <div><div style="font-size:11px;font-weight:700;color:#0d3d3a;text-transform:uppercase;letter-spacing:0.5px">Not Yet Submitted</div>
                    <div style="font-size:10px;color:#0d3d3a">Follow-up required</div></div>
                    <span style="margin-left:auto;font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;background:#14919b;color:#fff">PENDING</span>
                  </div>
                  <div style="font-size:12px;color:#0d3d3a">As of: ${c._courtSubmittedDate||'—'}</div>
                  <button onclick="showCourtConfirmNotif('${c.id}')" style="margin-top:8px;padding:6px 16px;border-radius:7px;background:#14919b;color:#fff;border:none;font-size:11px;font-weight:700;cursor:pointer">Update Submission Status</button>
                </div>`;
              } else if(_subm3.daysSince>=12||_subm3.inFinalization||_subm3.finalized){
                submBlock = `<div style="margin-top:10px;background:#f0fdf4;border:1.5px solid #22c55e;border-radius:10px;padding:12px 14px">
                  <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
                    <span style="font-size:18px">🏛️</span>
                    <div><div style="font-size:11px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:0.5px">Finalization Period — Confirm Submission</div>
                    <div style="font-size:10px;color:#065f46">12 days since settlement</div></div>
                    <span style="margin-left:auto;font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;background:#22c55e;color:#fff">CONFIRM NOW</span>
                  </div>
                  <div style="font-size:12px;color:#065f46">Finalization deadline: ${finDlFmt3}</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:2px">Settled on: ${c.dateResolved||'—'}</div>
                  <div style="display:flex;gap:8px;margin-top:10px">
                    <button onclick="courtConfirmAnswer('${c.id}',false)" style="flex:1;padding:7px 0;border-radius:7px;background:#fff;border:1.5px solid #d1d5db;color:#374151;font-size:12px;font-weight:700;cursor:pointer">No, not yet</button>
                    <button onclick="courtConfirmAnswer('${c.id}',true)" style="flex:1;padding:7px 0;border-radius:7px;background:#16a34a;color:#fff;border:none;font-size:12px;font-weight:700;cursor:pointer">Yes, submitted ✅</button>
                  </div>
                </div>`;
              } else if(_subm3.daysSince>=10&&!_subm3.phase){
                submBlock = `<div style="margin-top:10px;background:#eff6ff;border:1.5px solid #6dd4da;border-radius:10px;padding:12px 14px">
                  <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
                    <span style="font-size:18px">⚖️</span>
                    <div><div style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.5px">Court Submission Ready</div>
                    <div style="font-size:10px;color:#1d4ed8">10 days have passed since settlement</div></div>
                    <span style="margin-left:auto;font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;background:#2563eb;color:#fff">ACTION NEEDED</span>
                  </div>
                  <div style="font-size:12px;color:#1d4ed8">Deadline: ${dlFmt3}</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:2px">Settled on: ${c.dateResolved||'—'} · Acknowledging starts 2-day finalization window</div>
                  <button onclick="courtReadyGotIt('${c.id}')" style="margin-top:10px;width:100%;padding:8px 0;border-radius:7px;background:#0d3d3a;color:#fff;border:none;font-size:12px;font-weight:700;cursor:pointer">Got it — I understand</button>
                </div>`;
              } else {
                submBlock = `<div style="margin-top:10px;background:${submBg};border:1.5px solid ${submBorder};border-radius:10px;padding:12px 14px">
                  <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">

                    <div>
                      <div style="font-size:11px;font-weight:700;color:${submColor};text-transform:uppercase;letter-spacing:0.5px">Submission to Court</div>

                    </div>
                    <span style="margin-left:auto;font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;background:${submStatusBg};color:#fff">${submLabel}</span>
                  </div>
                  <div style="font-size:13px;font-weight:700;color:${submColor}">${dlFmt3}</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:3px">Settled on: ${c.dateResolved||'—'}</div>
                </div>`;
              }
            }
            return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 0;text-align:center">
              <div style="width:36px;height:36px;border-radius:50%;background:#d1fae5;display:flex;align-items:center;justify-content:center;font-size:18px">✅</div>
              <div style="font-size:13px;font-weight:700;color:#065f46">Case Settled</div>
              <div style="font-size:11px;color:#9ba3ae">Hearing schedule has been dissolved.</div>
            </div>${submBlock}`;
          }
          const upcoming=allSessionRows.filter(s=>s.date>=today&&s.outcome!=='settled'&&s.outcome!=='not_settled').sort((a,b)=>a.date.localeCompare(b.date));
          const next=upcoming[0]||null;
          if(!next){
            const f10=c._form10;
            const form10Block=f10?`<div style="background:#f5f3ff;border:1px solid #c4b5fd;border-radius:8px;padding:10px 12px;margin-top:4px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:10px;font-weight:700;color:#14919b;text-transform:uppercase;letter-spacing:0.5px">📋 PANGKAT CONSTITUTION (Form 10)</span>
                <button onclick="openForm10Preview('${c.id}')" style="font-size:10px;padding:2px 8px;border-radius:5px;border:1px solid #c4b5fd;background:#ede9fe;color:#6d28d9;cursor:pointer;font-weight:600">✏️ Edit &amp; Preview</button>
              </div>
              <div style="font-size:13px;font-weight:700;color:#0d3d3a">${f10.appearDate?new Date(f10.appearDate+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric',year:'numeric'}):''}</div>
              <div style="font-size:12px;color:#374151;margin-top:2px">🕐 ${esc(f10.time||'')}</div>
              ${f10.pangkatChair?`<div style="font-size:11px;color:#6b7280;margin-top:4px">Chair: ${esc(f10.pangkatChair)}</div>`:''}
            </div>`:'';
            return `<div style="font-size:12px;color:#9ba3ae;text-align:center;padding:8px 0">No upcoming hearing scheduled yet</div>`+form10Block;
          }
          function sessionBlock(row){
            const dtFmt=new Date(row.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric',year:'numeric'});
            const daysAway=Math.round((new Date(row.date+'T00:00:00')-new Date(today+'T00:00:00'))/86400000);
            const daysLabel=daysAway===0?'Today':daysAway===1?'Tomorrow':`In ${daysAway} day${daysAway!==1?'s':''}`;
            const daysColor=daysAway===0?'#dc2626':daysAway<=3?'#0d3d3a':'#059669';
            const phaseColor=row.phase==='med'?'#1d4ed8':'#7c3aed';
            const phaseBg=row.phase==='med'?'#eff6ff':'#f3e8ff';
            return `<div style="background:${phaseBg};border-radius:8px;padding:10px 12px;margin-bottom:6px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:10px;font-weight:700;color:${phaseColor};text-transform:uppercase;letter-spacing:0.5px">${row.label}</span>
                <span style="font-size:11px;font-weight:700;color:${daysColor}">${daysLabel}</span>
              </div>
              <div style="font-size:14px;font-weight:700;color:#0d3d3a">${dtFmt}</div>
              ${row.time?`<div style="font-size:12px;color:#374151;margin-top:2px">🕐 ${esc(row.time)}</div>`:''}
            </div>`;
          }
          const rest=upcoming.slice(1);
          const restId='nhx-right-more-'+c.id;
          const restHtml=rest.length?`
            <div id="${restId}" style="display:none;overflow:hidden">
              ${rest.map(r=>sessionBlock(r)).join('')}
            </div>
            <button id="${restId}-btn" onclick="(function(btn){const el=document.getElementById('${restId}');const open=el.style.display==='none';el.style.display=open?'block':'none';btn.textContent=open?'▲ Hide ${rest.length} session${rest.length>1?'s':''}':'＋ ${rest.length} more upcoming session${rest.length>1?'s':''}';})(this)"
              style="font-size:11px;color:#0d3d3a;background:none;border:none;cursor:pointer;padding:4px 0 2px;font-weight:600;display:block;width:100%;text-align:left">
              ＋ ${rest.length} more upcoming session${rest.length>1?'s':''}
            </button>`:'';
          // Form 10 block
          const f10=c._form10;
          const form10Block=f10?`<div style="background:#f5f3ff;border:1px solid #c4b5fd;border-radius:8px;padding:10px 12px;margin-top:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:10px;font-weight:700;color:#14919b;text-transform:uppercase;letter-spacing:0.5px">📋 PANGKAT CONSTITUTION (Form 10)</span>
              <button onclick="openForm10Preview('${c.id}')" style="font-size:10px;padding:2px 8px;border-radius:5px;border:1px solid #c4b5fd;background:#ede9fe;color:#6d28d9;cursor:pointer;font-weight:600">✏️ Edit &amp; Preview</button>
            </div>
            <div style="font-size:13px;font-weight:700;color:#0d3d3a">${f10.appearDate?new Date(f10.appearDate+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric',year:'numeric'}):''}</div>
            <div style="font-size:12px;color:#374151;margin-top:2px">🕐 ${esc(f10.time||'')}</div>
            ${f10.pangkatChair?`<div style="font-size:11px;color:#6b7280;margin-top:4px">Chair: ${esc(f10.pangkatChair)}</div>`:''}
          </div>`:'';
          return sessionBlock(next)+restHtml+form10Block;
        })()}
      </div>
    </div>

    <!-- REMARKS CARD -->
    ${c.remarks ? `
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:0">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f0f2f5;background:#e8f6f7">
        <span style="font-size:14px">💬</span>
        <span style="font-size:11px;font-weight:700;color:#0d3d3a;text-transform:uppercase;letter-spacing:0.5px">Remarks</span>
      </div>
      <div style="padding:12px 14px;font-size:13px;color:#0d2137;white-space:pre-wrap;word-break:break-word;line-height:1.6;max-height:120px;overflow-y:auto">${esc(c.remarks)}</div>
    </div>` : ''}

    <!-- REOPEN HISTORY CARD -->
    ${(c._reopenLog&&c._reopenLog.length) ? `
    <div style="background:#fff;border:1px solid #fed7aa;border-radius:10px;overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #fed7aa;background:#e6f4f5">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:14px">🔄</span>
          <span style="font-size:11px;font-weight:700;color:#c2410c;text-transform:uppercase;letter-spacing:0.5px">Reopen History</span>
        </div>
        <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:#fed7aa;color:#c2410c">${c._reopenLog.length} time${c._reopenLog.length>1?'s':''}</span>
      </div>
      <div style="padding:10px 14px;display:flex;flex-direction:column;gap:8px;max-height:200px;overflow-y:auto">
        ${c._reopenLog.slice().reverse().map((log,i)=>`
          <div style="padding:9px 12px;background:#e6f4f5;border:1px solid #fed7aa;border-radius:8px;font-size:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
              <span style="font-weight:700;color:#c2410c">Reopen #${c._reopenLog.length-i}</span>
              <span style="color:#9ba3ae;font-size:11px">${log.date||''}</span>
            </div>
            <div style="color:#374151"><strong>Was:</strong> ${log.prevStatus||''}${log.prevResolved?' - Settled '+log.prevResolved:''}${log.prevAction?' via '+log.prevAction:''}</div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <!-- KP PROCESS TRACKER HEADER -->
    <div style="background:#fff;border:1px solid ${isCFA?'#c4b5fd':'#e5e7eb'};border-radius:12px;overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid ${isCFA?'#c4b5fd':'#e5e7eb'};background:${isCFA?'#f3e8ff':'#f9fafb'}">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:14px;font-weight:700;color:#0d3d3a">KP PROCESS TRACKER</span>
          ${isCFA?`<span style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:10px;background:#ede9fe;color:#14919b;border:1px solid #c4b5fd">🔒 CFA — Locked</span>`:''}
        </div>
      </div>
      ${isCFA?`<div style="margin:12px 18px;padding:11px 14px;background:#faf5ff;border:1.5px solid #c4b5fd;border-radius:9px;display:flex;align-items:center;gap:10px;font-size:12px;color:#6d28d9">
        <span style="font-size:18px;flex-shrink:0">🔒</span>
        <div><strong>This case is CFA (Certificate to File Action).</strong> All session actions and scheduling are locked. Use <strong>Reopen Case</strong> to continue processing.</div>
      </div>`:''}

      <!-- Phase progress bar -->
      <div style="display:flex;align-items:center;gap:0;padding:14px 18px;border-bottom:1px solid #f0f2f5">
        <!-- Phase 1 -->
        <div style="display:flex;align-items:center;gap:10px;flex:1;padding:10px 14px;background:${medPhaseComplete?'#f0fdf4':'#eff6ff'};border-radius:8px;border:1px solid ${medPhaseComplete?'#6ee7b7':'#6dd4da'}">
          <div style="width:36px;height:36px;border-radius:50%;background:${medPhaseComplete?'#059669':'#0d3d3a'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <span style="color:#fff;font-size:14px">👥</span>
          </div>
          <div>
            <div style="font-size:9px;color:${medPhaseComplete?'#065f46':'#6b7280'};font-weight:700;text-transform:uppercase;letter-spacing:0.5px">PHASE 1</div>
            <div style="font-size:12px;font-weight:700;color:${medPhaseComplete?'#065f46':'#0d3d3a'}">MEDIATION (1–15 DAYS)</div>
            <div style="font-size:10px;color:#9ba3ae">Max 3 Sessions</div>
          </div>
          ${phase1StatusBadge}
        </div>

        <!-- Phase 2 -->
        <div style="display:flex;align-items:center;gap:10px;flex:1;padding:10px 14px;background:${concSettled?'#f0fdf4':concPhaseActive?'#f3e8ff':'#f9fafb'};border-radius:8px;border:1px solid ${concSettled?'#6ee7b7':concPhaseActive?'#c4b5fd':'#e5e7eb'}">
          <div style="width:36px;height:36px;border-radius:50%;background:${concSettled?'#059669':concPhaseActive?'#7c3aed':'#d1d5db'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <span style="color:#fff;font-size:14px">⚖️</span>
          </div>
          <div>
            <div style="font-size:9px;color:${concSettled?'#065f46':concPhaseActive?'#7c3aed':'#9ca3af'};font-weight:700;text-transform:uppercase;letter-spacing:0.5px">PHASE 2</div>
            <div style="font-size:12px;font-weight:700;color:${concSettled?'#065f46':concPhaseActive?'#7c3aed':'#9ca3af'}">LUPON CONCILIATION (16–30 DAYS)</div>
            <div style="font-size:10px;color:#9ba3ae">Max 3 Sessions</div>
          </div>
          ${phase2StatusBadge}
        </div>
      </div>

      <!-- Two-column session area -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;align-items:start">

        <!-- MEDIATION PHASE column -->
        <div style="padding:14px 16px;border-right:1px solid #e5e7eb">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:6px">
              <div style="width:8px;height:8px;border-radius:50%;background:#3b82f6"></div>
              <span style="font-size:11px;font-weight:700;color:#0d3d3a">MEDIATION PHASE</span>
            </div>
            ${daysLeftMed!==null&&!medPhaseComplete?`<span style="font-size:10px;font-weight:700;color:${daysLeftMed<0?'#b91c1c':daysLeftMed<=3?'#0d3d3a':'#059669'}">${daysLeftMed<0?'Overdue':daysLeftMed+' days left'}</span>`:''}
          </div>
          ${medDeadline&&!medPhaseComplete?`<div style="font-size:10px;color:#9ba3ae;margin-bottom:8px">Deadline: ${new Date(medDeadline+'T00:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})} (15 days from filing)</div>`:''}

          <!-- Step dots -->
          <div style="display:flex;align-items:center;gap:4px;margin-bottom:12px;justify-content:center">
            ${sessionDot(1,medSessions,'med')}
            <div style="flex:1;height:2px;background:${medSessions.length>0?'#3b82f6':'#e5e7eb'}"></div>
            ${sessionDot(2,medSessions,'med')}
            <div style="flex:1;height:2px;background:${medSessions.length>1?'#3b82f6':'#e5e7eb'}"></div>
            ${sessionDot(3,medSessions,'med')}
          </div>
          <div style="font-size:9px;color:#9ba3ae;display:flex;justify-content:space-between;margin-bottom:10px">
            <span>Session 1</span><span>Session 2</span><span>Session 3</span>
          </div>

          ${medSessionCards}

          ${medPhaseComplete&&!medSettled?`<div style="margin-top:8px;padding:8px 10px;background:#d4f1f1;border-radius:7px;font-size:10px;color:#0d3d3a;font-weight:700;display:flex;align-items:center;gap:5px">🔒 If not settled after 3 sessions, Conciliation Phase will be unlocked automatically.</div>`:''}
        </div>

        <!-- LUPON CONCILIATION PHASE column -->
        <div style="padding:14px 16px;background:${concPhaseActive?'#fff':'#fafafa'}">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:6px">
              <div style="width:8px;height:8px;border-radius:50%;background:${concPhaseActive?'#7c3aed':'#d1d5db'}"></div>
              <span style="font-size:11px;font-weight:700;color:${concPhaseActive?'#0d3d3a':'#9ca3af'}">LUPON CONCILIATION PHASE</span>
            </div>
            <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:${concPhaseActive?'#eff6ff':'#f3f4f6'};color:${concPhaseActive?'#1d4ed8':'#9ca3af'}">${concPhaseActive?'Active':'Locked'}</span>
          </div>
          ${!concPhaseActive?`<div style="font-size:11px;color:#9ba3ae;padding:4px 0 8px">Will unlock after Mediation Phase is not settled</div>`:''}

          <!-- Step dots -->
          <div style="display:flex;align-items:center;gap:4px;margin-bottom:12px;justify-content:center;${!concPhaseActive?'opacity:0.4':''}">
            ${sessionDot(1,concSessions,'conc')}
            <div style="flex:1;height:2px;background:${concSessions.length>0?'#7c3aed':'#e5e7eb'}"></div>
            ${sessionDot(2,concSessions,'conc')}
            <div style="flex:1;height:2px;background:${concSessions.length>1?'#7c3aed':'#e5e7eb'}"></div>
            ${sessionDot(3,concSessions,'conc')}
          </div>
          <div style="font-size:9px;color:#9ba3ae;display:flex;justify-content:space-between;margin-bottom:10px">
            <span>Session 1</span><span>Session 2</span><span>Session 3</span>
          </div>

          ${concSessionCards}

          ${concPhaseActive&&concSessions.length>=3&&!concSettled?`<div style="margin-top:8px;padding:8px 10px;background:#fee2e2;border-radius:7px;font-size:10px;color:#b91c1c;font-weight:700;display:flex;align-items:center;gap:5px">⚠ If still not settled after 3 Lupon sessions, you may generate Form 11 &amp; Form 12.</div>`:''}
        </div>
      </div>

    </div>



  </div>`;

  return `
  <!-- Top nav bar — STICKY -->
  <div id="cdp-topbar" style="position:sticky;top:0;z-index:100;background:#f4f5f7;padding-bottom:10px;margin-bottom:6px">
    <div style="display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:10px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
      <!-- Back + Case No -->
      <button onclick="(function(){state.viewCasePage=null;state.page=state._prevPage||'dashboard';state.filterStatCard=state._prevStatCard||null;state._prevPage=null;state._prevStatCard=null;render();})()" style="display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:#f4f5f7;border:1px solid #e5e7eb;color:#374151;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0">← Back</button>
      <div style="flex-shrink:0">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:17px;font-weight:700;color:#0d3d3a">${esc(c.caseNo||'—')}</span>
          ${statusBadge(c.status)}
        </div>
        <div style="font-size:12px;color:#6b7280;margin-top:1px">${esc((c.complainant||'').toUpperCase())}${c.respondent?' vs '+esc(c.respondent.toUpperCase()):''}</div>
      </div>
      <!-- Divider -->
      <div style="width:1px;height:36px;background:#e5e7eb;flex-shrink:0;margin:0 4px"></div>
      <!-- Current Status (inline) -->
      <div style="flex:1;min-width:0">
        <div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:5px"><div style="width:6px;height:6px;border-radius:50%;background:#3b82f6"></div>Current Status</div>
        <div style="font-size:12px;font-weight:700;color:#0d3d3a;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${caseSettled?'Case Settled':concPhaseActive&&concSessions.length>0?'Under Lupon Conciliation':medSessions.length>0?`Under Mediation – Session ${medSessions.length} Scheduled`:'Under Mediation – Pending Schedule'}${(c._reopenLog&&c._reopenLog.length)?` <span style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;background:#fed7aa;color:#c2410c;vertical-align:middle">Reopened ×${c._reopenLog.length}</span>`:''}</div>
        <div style="font-size:10px;color:#9ba3ae">${caseSettled?'Resolved':concPhaseActive&&concSessions.length>0?'Conciliation Phase: '+concSessions.length+' of 3 used':'Mediation Phase: '+medSessions.length+' of 3 used'}${(c._reopenLog&&c._reopenLog.length)?' · Previously '+c._reopenLog[c._reopenLog.length-1].prevStatus:''}</div>
      </div>
      <!-- Action Buttons -->
      <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;margin-left:auto">
        ${isCFA || caseSettled
          ? `<button disabled style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:#e5e7eb;color:#9ca3af;border:1px solid #d1d5db;font-size:13px;font-weight:600;cursor:not-allowed;opacity:0.55" title="${isCFA?'Case is CFA — Form 10 unavailable':'Case is settled — Form 10 unavailable'}">Form 10</button>`
          : `<button onclick="openForm10Modal('${c.id}')" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:#7c3aed;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer" onmouseover="this.style.background='#6d28d9'" onmouseout="this.style.background='#7c3aed'" title="Generate KP Form 10 — Notice for Constitution of Pangkat">Form 10</button>`
        }
        <button onclick="openUploadAttachmentModal('${c.id}')" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:#0d3d3a;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer" onmouseover="this.style.background='#0a5055'" onmouseout="this.style.background='#0d3d3a'">Upload Attachment</button>
        <button onclick="openAddRemarksModal('${c.id}')" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:#0891b2;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer" onmouseover="this.style.background='#0e7490'" onmouseout="this.style.background='#0891b2'" title="Add or update remarks for this case">Add Remarks</button>
        ${isCFA || caseSettled
          ? `<button disabled style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:#e5e7eb;color:#9ca3af;border:1px solid #d1d5db;font-size:13px;font-weight:600;cursor:not-allowed;opacity:0.55" title="${isCFA?'Case is CFA — editing disabled':'Case is settled — editing disabled'}">Edit Case</button>`
          : `<button onclick="openEditCaseForm7Modal('${c.id}')" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:#3b82f6;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer">Edit Case</button>`
        }
        ${c.status==='CFA'
          ? `<button disabled style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:#e5e7eb;color:#9ca3af;border:1px solid #d1d5db;font-size:13px;font-weight:600;cursor:not-allowed;opacity:0.55" title="CFA already filed">CFA</button>`
          : caseSettled
            ? `<button disabled style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:#e5e7eb;color:#9ca3af;border:1px solid #d1d5db;font-size:13px;font-weight:600;cursor:not-allowed;opacity:0.55" title="Case is settled — CFA not applicable">CFA</button>`
            : `<button onclick="issueCFA('${c.id}')" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:#dc2626;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer" onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'" title="File Certificate to File Action">CFA</button>`
        }
        ${(c.status==='Settled'||c.status==='CFA')
          ? `<button onclick="reopenCase('${c.id}')" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:#b45309;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer" onmouseover="this.style.background='#0d3d3a'" onmouseout="this.style.background='#b45309'" title="Reopen this case and continue from last settled session">Reopen Case</button>`
          : ''
        }
      </div>
    </div>
  </div>

  <!-- Two-column layout -->
  <div style="display:flex;gap:0;align-items:flex-start;padding-bottom:24px">
    ${leftPanel}
    <div style="margin-left:296px;flex:1;min-width:0">
      ${rightPanel}
    </div>
  </div>
  `;}

function viewAllHearings_cdp(caseId){
  // Show all hearings for this case in the schedules modal
  openSchedulesModal(caseId);
}

// ─── FORM 10 MODAL — Notice for Constitution of Pangkat ──────────────────────
function openForm10Preview(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;
  const atts=c.attachments||[];
  const idx=atts.findIndex(a=>a._generated&&/Form 10/i.test(a.name));
  if(idx>=0){
    // Attachment exists — open the Edit & Preview panel directly on it
    viewAttachments(caseId,idx);
  } else {
    // Not yet generated — open the generation modal as fallback
    openForm10Modal(caseId);
  }
}
function openForm10Modal(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;
  const old=document.getElementById('form10-modal-root');
  if(old)old.remove();
  const today=todayStr();
  const chairman=(c._lupanChairman||c.mediator||'HON. ABUNDIO A. LEONES').toUpperCase();
  const html=`<div id="form10-modal-root" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:600;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()">
    <div style="background:#fff;border-radius:14px;width:560px;max-width:97vw;max-height:96vh;display:flex;flex-direction:column;box-shadow:0 16px 50px rgba(0,0,0,0.22);overflow:hidden">

      <!-- Header -->
      <div style="padding:14px 20px;background:#0d3d3a;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:15px;font-weight:700;color:#fff">KP Form No. 10</span>
          </div>
          <div style="font-size:12px;color:rgba(255,255,255,0.65);margin-top:2px">Notice for the Constitution of the Pangkat</div>
        </div>
        <button onclick="document.getElementById('form10-modal-root').remove()" style="border:none;background:rgba(255,255,255,0.15);color:#fff;font-size:17px;font-weight:700;cursor:pointer;padding:5px 10px;border-radius:8px">✕</button>
      </div>

      <!-- Case Info Banner -->
      <div style="margin:16px 20px 0;padding:12px 14px;background:#f0f4ff;border:1px solid #b2dfe2;border-radius:8px;font-size:13px">
        <div style="color:#0d3d3a;font-weight:700;margin-bottom:3px">Case: ${escHtml(c.caseNo||'—')}</div>
        <div><span style="color:#374151;font-weight:600">Complainant:</span> <span style="color:#0d3d3a">${escHtml((c.complainant||'—').toUpperCase())}</span></div>
        <div><span style="color:#374151;font-weight:600">Respondent:</span> <span style="color:#0d3d3a">${escHtml((c.respondent||'—').toUpperCase())}</span></div>
      </div>

      <!-- Body -->
      <div style="padding:16px 20px;overflow-y:auto;flex:1">

        <!-- Section: Appearance Schedule -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">Schedule for Pangkat Constitution Appearance</span>
        </div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:14px;line-height:1.5">Set the date and time when the parties (complainant &amp; respondent) must appear before the Punong Barangay to constitute the Pangkat Tagapagkasundo.</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="font-size:12px;color:#374151;font-weight:600;display:block;margin-bottom:5px">Appearance Date <span style="color:#dc2626">*</span></label>
            <input type="date" id="f10_appearDate" value="${today}" style="width:100%;padding:9px 11px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#7c3aed'" onblur="this.style.borderColor='#d1d5db'">
          </div>
          <div>
            <label style="font-size:12px;color:#374151;font-weight:600;display:block;margin-bottom:5px">Time <span style="color:#dc2626">*</span></label>
            <select id="f10_time" style="width:100%;padding:9px 11px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;outline:none;background:#fff;box-sizing:border-box;cursor:pointer" onfocus="this.style.borderColor='#7c3aed'" onblur="this.style.borderColor='#d1d5db'">
              ${['8:00 AM','9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM'].map(t=>`<option value="${t}"${t==='9:00 AM'?' selected':''}>${t}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="margin-bottom:12px">
          <label style="font-size:12px;color:#374151;font-weight:600;display:block;margin-bottom:5px">Date of This Notice</label>
          <input type="date" id="f10_noticeDate" value="${today}" style="width:100%;padding:9px 11px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#7c3aed'" onblur="this.style.borderColor='#d1d5db'">
        </div>

        <div style="margin-bottom:14px">
          <label style="font-size:12px;color:#374151;font-weight:600;display:block;margin-bottom:5px">Punong Barangay / Chairman</label>
          <input type="text" id="f10_chairman" value="${escHtml(chairman)}" placeholder="HON. ABUNDIO A. LEONES" style="width:100%;padding:9px 11px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#7c3aed'" onblur="this.style.borderColor='#d1d5db'">
        </div>

        <!-- Additional Complainants/Respondents -->
        <div style="background:#f8f4ff;border:1px solid #e9d5ff;border-radius:10px;padding:14px 16px;margin-bottom:14px">
          <div style="font-size:11px;font-weight:700;color:#14919b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">👥 Additional Party Names (if more than 1)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="font-size:12px;color:#374151;font-weight:600;display:block;margin-bottom:5px">Additional Complainant/s</label>
              <div id="f10_extra_complainants">
                <div style="display:flex;gap:6px;margin-bottom:6px">
                  <input type="text" placeholder="Name (line 2)" style="flex:1;padding:7px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:12px;outline:none" onfocus="this.style.borderColor='#7c3aed'" onblur="this.style.borderColor='#d1d5db'">
                </div>
                <div style="display:flex;gap:6px;margin-bottom:6px">
                  <input type="text" placeholder="Name (line 3)" style="flex:1;padding:7px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:12px;outline:none" onfocus="this.style.borderColor='#7c3aed'" onblur="this.style.borderColor='#d1d5db'">
                </div>
                <div style="display:flex;gap:6px">
                  <input type="text" placeholder="Name (line 4)" style="flex:1;padding:7px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:12px;outline:none" onfocus="this.style.borderColor='#7c3aed'" onblur="this.style.borderColor='#d1d5db'">
                </div>
              </div>
            </div>
            <div>
              <label style="font-size:12px;color:#374151;font-weight:600;display:block;margin-bottom:5px">Additional Respondent/s</label>
              <div id="f10_extra_respondents">
                <div style="display:flex;gap:6px;margin-bottom:6px">
                  <input type="text" placeholder="Name (line 2)" style="flex:1;padding:7px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:12px;outline:none" onfocus="this.style.borderColor='#7c3aed'" onblur="this.style.borderColor='#d1d5db'">
                </div>
                <div style="display:flex;gap:6px;margin-bottom:6px">
                  <input type="text" placeholder="Name (line 3)" style="flex:1;padding:7px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:12px;outline:none" onfocus="this.style.borderColor='#7c3aed'" onblur="this.style.borderColor='#d1d5db'">
                </div>
                <div style="display:flex;gap:6px">
                  <input type="text" placeholder="Name (line 4)" style="flex:1;padding:7px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:12px;outline:none" onfocus="this.style.borderColor='#7c3aed'" onblur="this.style.borderColor='#d1d5db'">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Info Notice -->
        <div style="padding:10px 13px;background:#e8f6f7;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#0d3d3a;display:flex;align-items:flex-start;gap:8px">
          <span style="font-size:14px;flex-shrink:0">📌</span>
          <span style="line-height:1.5">This form notifies both parties to appear before the Punong Barangay for the constitution of the Pangkat Tagapagkasundo. Both parties will agree on pangkat membership or the chairman will determine by drawing of lots.</span>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:12px 20px;border-top:1px solid #e5e7eb;display:flex;gap:8px;justify-content:flex-end;background:#f9fafb;flex-shrink:0">
        <button onclick="document.getElementById('form10-modal-root').remove()" style="padding:8px 18px;border-radius:8px;border:1px solid #d1d5db;background:#fff;font-size:13px;font-weight:500;cursor:pointer;color:#374151">Cancel</button>
        <button onclick="generateSaveForm10('${c.id}')" style="display:flex;align-items:center;gap:7px;padding:9px 20px;border-radius:8px;border:none;background:#7c3aed;color:#fff;font-size:13px;font-weight:700;cursor:pointer" onmouseover="this.style.background='#6d28d9'" onmouseout="this.style.background='#7c3aed'">📄 Generate &amp; Save Form 10</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}

function generateSaveForm10(caseId){
  const c=state.cases.find(x=>x.id===caseId);
  if(!c)return;
  const gv=id=>{const el=document.getElementById(id);return el?el.value.trim():'';};
  const appearDate=gv('f10_appearDate');
  const time=gv('f10_time');
  const noticeDate=gv('f10_noticeDate');
  const chairman=(gv('f10_chairman')||'HON. ABUNDIO A. LEONES').toUpperCase();

  // Collect extra complainant/respondent names
  function getExtraNames(containerId){
    const cont=document.getElementById(containerId);
    if(!cont)return[];
    return Array.from(cont.querySelectorAll('input')).map(i=>i.value.trim().toUpperCase()).filter(v=>v);
  }
  const extraComplainants = getExtraNames('f10_extra_complainants');
  const extraRespondents  = getExtraNames('f10_extra_respondents');

  if(!appearDate){alert('Please set the appearance date.');return;}

  c._lupanChairman = chairman;

  // Save Form 10 schedule info to case for display in Next Hearing and case row
  c._form10 = { appearDate, time, noticeDate, chairman, extraComplainants, extraRespondents, generatedAt: new Date().toISOString() };

  // Generate PDF using jsPDF — KP Form No. 10 official layout
  try {
    const {jsPDF}=window.jspdf;
    const F='times';
    const doc=new jsPDF({unit:'mm',format:'a4'});
    const W=210, ML=25, MR=25, CW=W-ML-MR;
    const MID=W/2;
    const LH=6.5; // line height mm (for font size 12)

    const MONS=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
    function ordSfx(n){const d=parseInt(n);const m10=d%10,m100=d%100;return(m100>=11&&m100<=13)?'th':m10===1?'st':m10===2?'nd':m10===3?'rd':'th';}

    // Dates
    const appDt = appearDate ? new Date(appearDate+'T00:00:00') : null;
    const sDay  = appDt ? String(appDt.getDate()) : '___';
    const sMon  = appDt ? MONS[appDt.getMonth()] : '___';
    const noticeDt = noticeDate ? new Date(noticeDate+'T00:00:00') : new Date();
    const nDay  = String(noticeDt.getDate());
    const nOrd  = ordSfx(nDay);
    const nMon  = MONS[noticeDt.getMonth()];
    const nYr2  = String(noticeDt.getFullYear()).slice(-2);

    // Names — build arrays (primary + extras)
    const cName = (c.complainant||'').toUpperCase();
    const rName = (c.respondent||'').toUpperCase();
    const cNames = [cName, ...(extraComplainants||[])].filter(v=>v);
    const rNames = [rName, ...(extraRespondents||[])].filter(v=>v);

    // Time / morning-afternoon
    const tDisp = _fmt12hrTime(time||'9:00 AM')||'9:00 AM';
    const isAM  = !/pm/i.test(tDisp);
    const tWord = isAM ? 'morning' : 'afternoon';
    const tDispDisplay = tDisp.replace(/\s*(AM|PM)$/i,'').trim();

    doc.setDrawColor(0);
    doc.setTextColor(0);

    let y = 20;

    // ── KP Form No.10 ──
    doc.setFont(F,'bold'); doc.setFontSize(10);
    doc.text('KP Form No.10', ML, y);
    doc.setFont(F,'normal'); y+=12;

    // ── Centered header ──
    doc.setFontSize(10);
    doc.text('Republic of the Philippines', MID, y, {align:'center'}); y+=5;
    doc.text('City of Butuan',              MID, y, {align:'center'}); y+=5;
    doc.text('Barangay Pangabugan',         MID, y, {align:'center'}); y+=10;

    doc.setFont(F,'bold'); doc.setFontSize(11);
    doc.text('OFFICE OF THE LUPONG TAGAPAMAYAPA', MID, y, {align:'center'}); y+=8;

    doc.setFontSize(12);
    doc.text('NOTICE FOR THE CONSTITUTION OF THE PANGKAT', MID, y, {align:'center'}); y+=14;

    // ── To: block ──
    // Layout:
    //   To:    ___COMPLAINANT NAME___          ___RESPONDENT NAME___
    //                Complainant/s                   Respondent/s
    // Columns: left col starts after "To: ", right col at MID+gap
    const TO_LABEL = 'To:  ';
    const toLabelW = doc.getTextWidth(TO_LABEL);
    const LX = ML + toLabelW;            // left name column x start (right after "To:")
    const RX = MID + 6;                  // right name column x start
    const NCOL_W = MID - ML - toLabelW - 6; // width of each name column

    // Helper: render a column of name(s) — name bold centered, underline drawn just below name, no gap between names
    function renderNameCol(names, colX, colW, startY){
      let cy = startY;
      names.forEach((nm, idx) => {
        if(idx > 0) cy += LH; // only one line-height to position next name after previous underline
        const nmLines = doc.splitTextToSize(nm, colW);
        // Print bold name centered
        doc.setFont(F,'bold'); doc.setFontSize(12);
        nmLines.forEach((ln, li) => {
          doc.text(ln, colX + colW/2, cy + li * LH, {align:'center'});
        });
        // Draw underline just below the last line of name text
        const lineY = cy + (nmLines.length - 1) * LH + 1.5;
        doc.line(colX, lineY, colX + colW, lineY);
        cy = lineY;
      });
      return cy;
    }

    doc.setFont(F,'normal'); doc.setFontSize(12);
    // "To:" label on same line as names
    doc.text(TO_LABEL, ML, y);

    const toBlockStartY = y;
    const cEndY = renderNameCol(cNames, LX, NCOL_W, toBlockStartY);
    const rEndY = renderNameCol(rNames, RX, NCOL_W, toBlockStartY);
    y = Math.max(cEndY, rEndY) + 6;

    // Labels — centered under each name column
    doc.setFont(F,'normal'); doc.setFontSize(12);
    doc.text('Complainant/s', LX + NCOL_W/2, y, {align:'center'});
    doc.text('Respondent/s', RX + NCOL_W/2, y, {align:'center'});
    y += 14;

    // ── Body paragraph — inline rendering with underlined values, font 12, justified ──
    doc.setFont(F,'normal'); doc.setFontSize(12);
    const dayOrdStr = sDay + ordSfx(sDay);
    const timeStr = tDispDisplay;

    // Helper: justified text block render (word-wrap, justified spacing)
    function renderJustified(lines, x, lineY, colW) {
      lines.forEach((line, i) => {
        const isLast = (i === lines.length - 1);
        if(isLast || line.trim() === '') {
          doc.text(line, x, lineY);
        } else {
          const words = line.split(' ').filter(w => w.length > 0);
          if(words.length <= 1) { doc.text(line, x, lineY); }
          else {
            const totalWordW = words.reduce((s,w) => s + doc.getTextWidth(w), 0);
            const spaceW = (colW - totalWordW) / (words.length - 1);
            let cx = x;
            words.forEach((w, wi) => {
              doc.text(w, cx, lineY);
              if(wi < words.length - 1) cx += doc.getTextWidth(w) + spaceW;
            });
          }
        }
        lineY += LH;
      });
      return lineY;
    }

    // Build inline segments for the body paragraph with underlined tokens
    // We'll render line by line, tracking x position and injecting underlines
    const INDENT = 12; // mm indent for first line
    const segments = [
      { text: 'You are hereby required to appear before me on the ', underline: false },
      { text: dayOrdStr, underline: true },
      { text: ' day ', underline: false },
      { text: sMon, underline: true },
      { text: ' , ', underline: false },
      { text: String(appDt ? appDt.getFullYear() : new Date().getFullYear()), underline: true },
      { text: ' at ', underline: false },
      { text: timeStr, underline: true },
      { text: " o\u2019clock in the ", underline: false },
      { text: isAM ? 'morning' : 'afternoon', underline: true },
      { text: isAM ? '/afternoon' : '/morning', underline: false },
      { text: ' for the Constitution of the Pangkat Tagapagkasundo which shall', underline: false },
      { text: ' conciliate your dispute. ', underline: false },
      { text: 'Should you fail to agree on the Pangkat membership or to appear on the aforesaid date for the constitution of the Pangkat, I shall determine membership thereof by drawing of lots.', underline: false },
    ];

    // Word-wrap inline segments preserving underlines per word
    // Build word list with underline flag
    let wordList = []; // [{word, underline}]
    segments.forEach(seg => {
      const words = seg.text.split(/(?<=\S)(?=\s)|(?<=\s)(?=\S)/); // split keeping spaces
      seg.text.split(' ').forEach((w, wi, arr) => {
        if(w === '' && wi === 0) return;
        wordList.push({ word: w, underline: seg.underline, space: wi < arr.length-1 });
      });
    });

    // Re-build as token list (word + trailing space), with underline flag
    let tokens = [];
    segments.forEach(seg => {
      const words = seg.text.split(' ');
      words.forEach((w, wi) => {
        if(wi === 0 && tokens.length > 0 && !tokens[tokens.length-1].word.endsWith(' ')) {
          // prepend space to this word
        }
        tokens.push({ word: w, underline: seg.underline });
      });
    });

    // Render inline with line-wrapping, underlines, and first-line indent
    let curX = ML + INDENT;
    let lineStartX = ML + INDENT;
    let lineTokens = []; // tokens accumulated on current line
    let curLineW = 0;
    const SPACE_W = doc.getTextWidth(' ');

    function flushLine(toks, lx, ly, isLastLine) {
      // render tokens left-to-right; justify only if not last line and >1 word
      if(toks.length === 0) return;
      let totalW = 0;
      let wordCount = 0;
      toks.forEach(t => { if(t.word.trim()) { totalW += doc.getTextWidth(t.word); wordCount++; } });
      const numSpaces = wordCount - 1;
      const extraSpace = isLastLine ? SPACE_W : (numSpaces > 0 ? (CW - (lx - ML) - totalW) / numSpaces : SPACE_W);
      const spaceAdj = isLastLine ? SPACE_W : Math.max(SPACE_W * 0.5, Math.min(SPACE_W * 2.5, extraSpace));

      let rx = lx;
      toks.forEach((t, ti) => {
        if(t.word === '') return;
        if(t.underline) {
          doc.setFont(F,'normal');
          doc.text(t.word, rx, ly);
          doc.line(rx, ly+1.5, rx+doc.getTextWidth(t.word), ly+1.5);
        } else {
          doc.setFont(F,'normal');
          doc.text(t.word, rx, ly);
        }
        if(ti < toks.length - 1) rx += doc.getTextWidth(t.word) + spaceAdj;
      });
    }

    // Accumulate tokens into lines
    let lines2D = []; // [{tokens, startX, isFirst}]
    let lineTokensArr = [];
    let lineWidthAcc = 0;
    let isFirstLine = true;
    const firstLineMaxW = CW - INDENT;

    tokens.forEach((tok, ti) => {
      const tw = doc.getTextWidth(tok.word);
      const maxW = isFirstLine ? firstLineMaxW : CW;
      const spaceNeeded = lineTokensArr.length > 0 ? SPACE_W : 0;
      if(lineWidthAcc + spaceNeeded + tw > maxW && lineTokensArr.length > 0) {
        lines2D.push({ tokens: lineTokensArr, startX: isFirstLine ? ML+INDENT : ML, isFirst: isFirstLine });
        lineTokensArr = [];
        lineWidthAcc = 0;
        isFirstLine = false;
      }
      if(lineTokensArr.length > 0) lineWidthAcc += SPACE_W;
      lineWidthAcc += tw;
      lineTokensArr.push(tok);
    });
    if(lineTokensArr.length > 0) {
      lines2D.push({ tokens: lineTokensArr, startX: isFirstLine ? ML+INDENT : ML, isFirst: isFirstLine });
    }

    // Render all lines
    lines2D.forEach((ln, i) => {
      const isLast = (i === lines2D.length - 1);
      flushLine(ln.tokens, ln.startX, y, isLast);
      y += LH;
    });
    y += 8; // extra space after paragraph

    // ── "This __ day of ___, ____" — with underlined date values ──
    // Format: This  [day+ord]  day of  [MONTH]  ,  [YYYY]
    doc.setFont(F,'normal'); doc.setFontSize(12);
    const nYrFull = String(noticeDt.getFullYear());
    const nDayOrd = nDay+nOrd;

    // Measure each segment for positioning
    const txtThis  = 'This ';
    const txtDay   = nDayOrd;
    const txtDayOf = '  day of ';
    const txtMon   = nMon;
    const txtComma = ' , ';
    const txtYear  = nYrFull;

    let tx = ML;
    doc.setFont(F,'normal');
    doc.text(txtThis, tx, y);  tx += doc.getTextWidth(txtThis);
    // underlined day
    doc.setFont(F,'normal');
    doc.text(txtDay, tx, y);
    doc.line(tx, y+1.5, tx+doc.getTextWidth(txtDay), y+1.5);
    tx += doc.getTextWidth(txtDay);
    doc.text(txtDayOf, tx, y); tx += doc.getTextWidth(txtDayOf);
    // underlined month
    doc.text(txtMon, tx, y);
    doc.line(tx, y+1.5, tx+doc.getTextWidth(txtMon), y+1.5);
    tx += doc.getTextWidth(txtMon);
    doc.text(txtComma, tx, y); tx += doc.getTextWidth(txtComma);
    // underlined year
    doc.text(txtYear, tx, y);
    doc.line(tx, y+1.5, tx+doc.getTextWidth(txtYear), y+1.5);
    y+=20;

    // ── Signature — centered (chairman name bold, underlined) ──
    const sigLineW = 70;
    const sigX1 = MID - sigLineW/2;
    const sigX2 = MID + sigLineW/2;
    doc.setFont(F,'bold'); doc.setFontSize(12);
    doc.text(chairman, MID, y, {align:'center'});
    doc.line(sigX1, y+1.5, sigX2, y+1.5);
    y+=5;
    doc.setFont(F,'normal'); doc.setFontSize(12);
    doc.text('Punong Barangay', MID, y, {align:'center'});
    y+=18;

    // ── Notified this ___ day of ___________ 20__ ── (day & month=blank underlines; year from dateFiled)
    doc.setFont(F,'normal'); doc.setFontSize(12);
    const filedDt = c.dateFiled ? new Date(c.dateFiled+'T00:00:00') : null;
    const ntfYr2  = filedDt ? String(filedDt.getFullYear()).slice(-2) : '____';

    // Fixed blank underline widths
    const ntfDayBlankW = 14; // mm — blank underline for day
    const ntfMonBlankW = doc.getTextWidth('DECEMBER'); // mm — blank underline sized for longest month

    let ntx = ML;
    const ntfNotifiedThis = 'Notified this ';
    const ntfDayOf        = ' day of ';
    const ntfComma        = ', 20';

    // "Notified this "
    doc.text(ntfNotifiedThis, ntx, y); ntx += doc.getTextWidth(ntfNotifiedThis);
    // blank underline for day (no text)
    doc.line(ntx, y+1.5, ntx+ntfDayBlankW, y+1.5);
    ntx += ntfDayBlankW;
    // " day of "
    doc.text(ntfDayOf, ntx, y); ntx += doc.getTextWidth(ntfDayOf);
    // blank underline for month (DECEMBER-width, no text)
    doc.line(ntx, y+1.5, ntx+ntfMonBlankW, y+1.5);
    ntx += ntfMonBlankW;
    // ", 20"
    doc.text(ntfComma, ntx, y); ntx += doc.getTextWidth(ntfComma);
    // underlined 2-digit year (auto-filled)
    doc.text(ntfYr2, ntx, y);
    doc.line(ntx, y+1.5, ntx+doc.getTextWidth(ntfYr2), y+1.5);
    y+=18;

    // ── Bottom sig lines ──
    // Layout:
    //   Complainant/s                          Respondent/s
    //
    //   _________________                      _________________
    //   COMPLAINANT NAME                       RESPONDENT NAME 1
    //
    //                                          _________________
    //                                          RESPONDENT NAME 2
    doc.setFont(F,'normal'); doc.setFontSize(12);

    // Column geometry reuse from top block
    const BOT_LX = ML;
    const BOT_RX = MID + 6;
    const BOT_COL_W = MID - ML - 6;

    // Header labels
    doc.text('Complainant/s', BOT_LX + BOT_COL_W/2, y, {align:'center'});
    doc.text('Respondent/s', BOT_RX + BOT_COL_W/2, y, {align:'center'});
    y += LH + 4;

    // Render complainant names (one per slot, left column)
    function renderBotNameCol(names, colX, colW, startY) {
      let cy = startY;
      names.forEach((nm, idx) => {
        if(idx > 0) cy += LH + 4;
        // Underline first
        doc.line(colX, cy, colX + colW, cy);
        // Bold name below line
        doc.setFont(F,'bold'); doc.setFontSize(12);
        cy += LH - 1.5;
        const nmLines = doc.splitTextToSize(nm, colW);
        nmLines.forEach((ln, li) => {
          doc.text(ln, colX + colW/2, cy + li*LH, {align:'center'});
        });
        cy += nmLines.length * LH;
      });
      return cy;
    }

    const botCEndY = renderBotNameCol(cNames, BOT_LX, BOT_COL_W, y);
    const botREndY = renderBotNameCol(rNames, BOT_RX, BOT_COL_W, y);
    y = Math.max(botCEndY, botREndY);

    const dataUri=doc.output('datauristring');
    const now=new Date().toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'});
    if(!c.attachments)c.attachments=[];
    // Remove any existing Form 10 attachment
    c.attachments=c.attachments.filter(a=>!/Form 10/i.test(a.name));
    c.attachments.push({name:`Form 10 – Pangkat Notice (${now})`,dataUrl:dataUri,size:0,_generated:true,_form10:true});
    saveData('ltia_cases',state.cases);
    document.getElementById('form10-modal-root').remove();
    state.viewCasePage=caseId;
    render();
    showToast('Form 10 generated and saved to attachments!','success',4000);
    // Auto-open the Edit & Preview panel directly on the Form 10 attachment
    setTimeout(()=>openForm10Preview(caseId), 80);
  } catch(e){
    console.error('Form 10 PDF error:',e);
    // Save without PDF
    saveData('ltia_cases',state.cases);
    document.getElementById('form10-modal-root').remove();
    state.viewCasePage=caseId;
    render();
    showToast('Form 10 scheduled (PDF library not available).','warning');
    setTimeout(()=>openForm10Preview(caseId), 80);
  }
}

// ─── MAIN RENDER ─────────────────────────────────────────────────────────────
function render(){
  renderNav();
  const isDash = !state.viewCasePage && !(state.searchQuery&&state.searchQuery.trim()) && state.page!=='cases' && state.page!=='report';
  let html='';
  if(state.viewCasePage)        html=renderCaseDetailPage(state.viewCasePage);
  else if(state.searchQuery&&state.searchQuery.trim()) html=renderSearch();
  else if(state.page==='cases') html=renderCases();
  else if(state.page==='report')html=renderReport();
  else                          html=renderDashboard();
  const contentEl=document.getElementById('content');
  if(isDash){
    contentEl.innerHTML=html;
  } else {
    contentEl.innerHTML=`<div class="content-scroll">${html}</div>`;
  }
  const gsi=document.getElementById('global-search-input');
  if(gsi&&document.activeElement!==gsi)gsi.value=state.searchQuery||'';
  const gsclear=document.getElementById('global-search-clear');
  if(gsclear) gsclear.style.display=(state.searchQuery&&state.searchQuery.trim())?'block':'none';
  document.querySelectorAll('.wiz-overlay,#kpf-modal-root,#sched-modal-root,#archive-modal-root,#arc-view-modal-root').forEach(el=>el.remove());
  const wh=renderWizard(); if(wh)document.getElementById('app').insertAdjacentHTML('beforeend',wh);
  const swh=renderSchedWizard(); if(swh)document.getElementById('app').insertAdjacentHTML('beforeend',swh);
  const kpf=renderKpFormsModal(); if(kpf){document.body.insertAdjacentHTML('beforeend',kpf);requestAnimationFrame(()=>kpfSwitchTab('form7'));}
  if(state.schedulesModalOpen) renderSchedulesModalDom();
  const amh=renderArchiveModal(); if(amh)document.getElementById('app').insertAdjacentHTML('beforeend',amh);
  window._suppressCFAAutoShow = false;
  // Check court submission notifications for settled cases (dashboard & case list only)
  if(!state.viewCasePage){
    setTimeout(checkCourtSubmissionNotifs, 300);
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// AUTH SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

// Simple deterministic hash (not cryptographic, but prevents plain-text storage)
function authHash(str){
  let h=5381; for(let i=0;i<str.length;i++) h=((h<<5)+h)+str.charCodeAt(i)|0;
  return (h>>>0).toString(16);
}

function authGetAccounts(){
  try{ const r=localStorage.getItem('lcms_accounts'); return r?JSON.parse(r):[]; }catch(e){return [];}
}
function authSaveAccounts(accounts){
  try{ localStorage.setItem('lcms_accounts',JSON.stringify(accounts)); }catch(e){}
}
function authGetSession(){
  try{ const r=sessionStorage.getItem('lcms_session'); return r?JSON.parse(r):null; }catch(e){return null;}
}
function authSaveSession(user){
  try{ sessionStorage.setItem('lcms_session',JSON.stringify(user)); }catch(e){}
}
function authClearSession(){
  try{ sessionStorage.removeItem('lcms_session'); }catch(e){}
}

let _authMode = 'login'; // 'login' | 'setup'

/* ── Auth loading overlay ── */
function authShowLoading(msg){
  document.getElementById('auth-loader-text').textContent = msg || 'Please wait…';
  document.getElementById('auth-loading-overlay').classList.add('show');
}
function authHideLoading(){
  document.getElementById('auth-loading-overlay').classList.remove('show');
}

function authInit(){
  const accounts = authGetAccounts();
  const session  = authGetSession();

  const loadStatuses = ['Loading system...','Almost ready...'];
  let si = 0;
  const statusEl = document.getElementById('load-status');
  const statusInterval = setInterval(()=>{ si++; if(statusEl && si < loadStatuses.length) statusEl.textContent = loadStatuses[si]; }, 700);

  setTimeout(()=>{
    clearInterval(statusInterval);

    // 1) Fade out loading screen
    const ls = document.getElementById('loading-screen');
    ls.style.transition = 'opacity 0.4s ease';
    ls.style.opacity = '0';

    // 2) Slide panel slides IN from left
    const sp = document.getElementById('slide-panel');
    sp.style.pointerEvents = 'all';
    setTimeout(()=>{
      ls.style.display = 'none';
      sp.classList.add('slide-in');
    }, 400);

    // 3) After a brief hold, slide panel slides OUT to the right, then show auth
    setTimeout(()=>{
      sp.classList.add('slide-out');
      setTimeout(()=>{
        sp.style.display = 'none';

        if(session && accounts.find(a => a.id === session.id)){
          authShowApp(session);
          return;
        }

        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app').style.display = 'none';

        if(accounts.length === 0){
          _authMode = 'setup';
          document.getElementById('auth-setup-notice').classList.remove('hidden');
          document.getElementById('auth-form-title').textContent = 'Create Admin Account';
          document.getElementById('auth-form-sub').textContent   = 'No accounts found. Set up the first administrator account.';
        }
        // Always show signup form first
        authOpenSignup();
      }, 520);
    }, 1000);

  }, 1500);
}

function authOpenSignup(){
  document.getElementById('auth-login-card').style.display = 'none';
  document.getElementById('auth-signup-card').classList.add('visible');
  setTimeout(()=>{ const fn = document.getElementById('auth-fullname'); if(fn) fn.focus(); }, 80);
}
function authCloseSignup(){
  document.getElementById('auth-signup-card').classList.remove('visible');
  document.getElementById('auth-login-card').style.display = '';
  authClearSignupError();
}

function authGoToForm(){ /* legacy no-op */ }
function authGoToLanding(){ /* legacy no-op */ }

function authTogglePw(fieldId, btn){
  const inp = document.getElementById(fieldId || 'auth-password');
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  const eyeOpen  = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeClosed = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  if(btn) btn.innerHTML = isText ? eyeOpen : eyeClosed;
}

function authShowError(msg){
  const el = document.getElementById('auth-error');
  document.getElementById('auth-error-text').textContent = msg;
  el.classList.remove('hidden');
  el.style.animation='none'; el.offsetHeight; el.style.animation='';
  document.getElementById('auth-username').classList.add('error');
  document.getElementById('auth-password').classList.add('error');
}
function authClearError(){
  document.getElementById('auth-error').classList.add('hidden');
  document.getElementById('auth-username').classList.remove('error');
  document.getElementById('auth-password').classList.remove('error');
}
function authShowSignupError(msg){
  const el = document.getElementById('auth-error-signup');
  document.getElementById('auth-error-signup-text').textContent = msg;
  el.classList.remove('hidden');
  el.style.animation='none'; el.offsetHeight; el.style.animation='';
}
function authClearSignupError(){
  const el = document.getElementById('auth-error-signup');
  if(el) el.classList.add('hidden');
}

// LOGIN
function authSubmit(){
  authClearError();
  const fullname = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;

  if(!fullname){ authShowError('Please enter your full name.'); return; }
  if(!password){ authShowError('Please enter your password.'); return; }

  const accounts = authGetAccounts();
  const match = accounts.find(a =>
    a.fullname.toLowerCase() === fullname.toLowerCase() &&
    a.passwordHash === authHash(password + a.username)
  );
  if(!match){
    authShowError('Incorrect name or password. Please try again.');
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-password').focus();
    return;
  }

  // Show loading overlay then enter app
  authShowLoading('Signing in…');
  setTimeout(()=>{
    const sess = { id:match.id, username:match.username, fullname:match.fullname, role:match.role };
    authSaveSession(sess);
    authShowApp(sess);
    authHideLoading();
  }, 1500);
}

// SIGNUP
function checkPasswordStrength(pw){
  const wrap  = document.getElementById('pw-strength-bar-wrap');
  const label = document.getElementById('pw-strength-label');
  const hints = document.getElementById('pw-strength-hints');
  const segs  = [1,2,3,4].map(i => document.getElementById('pw-seg-'+i));

  if(!pw){ wrap.style.display='none'; return; }
  wrap.style.display='block';

  const checks = {
    length:  pw.length >= 8,
    lower:   /[a-z]/.test(pw),
    number:  /[0-9]/.test(pw),
    symbol:  /[^A-Za-z0-9]/.test(pw),
  };
  const score = Object.values(checks).filter(Boolean).length;

  const levels = [
    { color:'#e74c3c', text:'Weak',        textColor:'#e74c3c' },
    { color:'#e74c3c', text:'Weak',        textColor:'#e74c3c' },
    { color:'#f39c12', text:'Fair',        textColor:'#f39c12' },
    { color:'#2ecc71', text:'Strong',      textColor:'#2ecc71' },
    { color:'#14919b', text:'Very Strong', textColor:'#14919b' },
  ];
  const lvl = levels[score] || levels[0];

  segs.forEach((s,i) => {
    s.style.background = i < score ? lvl.color : '#e4e8ef';
  });
  label.textContent = lvl.text;
  label.style.color = lvl.textColor;

  const missing = [];
  if(!checks.length)  missing.push('at least 8 characters');
  if(!checks.lower)   missing.push('lowercase letter (a–z)');
  if(!checks.number)  missing.push('number (0–9)');
  if(!checks.symbol)  missing.push('special character (!@#$...)');
  hints.textContent = missing.length ? 'Missing: ' + missing.join(', ') : '✓ Password meets all requirements';
  hints.style.color = missing.length ? '#9aa3b0' : '#14919b';
}

function authSubmitSignup(){
  authClearSignupError();
  const fullname = document.getElementById('auth-fullname').value.trim();
  const password = document.getElementById('auth-signup-password').value;
  const confirm  = document.getElementById('auth-confirm').value;

  if(!fullname){ authShowSignupError('Please enter your full name.'); return; }

  // Password strength check — allow if Strong or Very Strong (score ≥ 3/4)
  if(!password){ authShowSignupError('Please enter a password.'); return; }
  const pwChecks = {
    length: password.length >= 8,
    lower:  /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
  const pwScore = Object.values(pwChecks).filter(Boolean).length;
  if(pwScore < 3){ authShowSignupError('Password is too weak. Make it stronger by adding numbers, symbols, or more characters.'); return; }
  if(password !== confirm){ authShowSignupError('Passwords do not match. Please re-enter.'); return; }

  let accounts = authGetAccounts();
  const username = fullname.toLowerCase().replace(/\s+/g,'.') + '_' + Date.now().toString(36);

  if(accounts.find(a => a.fullname.toLowerCase() === fullname.toLowerCase())){
    authShowSignupError('⚠️ An account with the name "' + fullname + '" already exists. Please use a different name or sign in instead.'); return;
  }

  const role = accounts.length === 0 ? 'admin' : 'staff';
  const newUser = { id:genId(), username, passwordHash:authHash(password+username), fullname, role, created:new Date().toISOString() };
  accounts.push(newUser);
  authSaveAccounts(accounts);

  // Show loading then enter app
  authShowLoading('Creating your account…');
  setTimeout(()=>{
    authSaveSession({ id:newUser.id, username, fullname, role });
    authShowApp({ id:newUser.id, username, fullname, role });
    authHideLoading();
    showToast((role==='admin'?'Admin':'Staff')+' account created! Welcome, '+fullname.split(' ')[0]+'!', 'success');
  }, 1500);
}

function authShowApp(user){
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').style.display = '';

  const initials  = (user.fullname||user.username).split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const roleLabel = user.role === 'admin' ? 'Admin' : 'Staff';
  const manageItem = user.role==='admin' ? `
    <div class="nav-dropdown-item" onclick="openAdminModal();toggleUserDropdown(false)">
      <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      Manage Accounts
    </div>` : '';

  document.getElementById('auth-sidebar-user').innerHTML = `
    <div class="nav-user-card" onclick="toggleUserDropdown()" id="nav-user-card-btn">
      <div class="nav-user-dropdown hidden" id="nav-user-dropdown">
        <div class="nav-dropdown-header">
          <div class="nav-dropdown-name">${user.fullname||user.username}</div>
          <div class="nav-dropdown-role ${user.role}">${roleLabel}</div>
        </div>
        ${manageItem}
        <div class="nav-dropdown-item danger" onclick="authSignOut()">
          <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </div>
      </div>
      <div class="nav-user-avatar">${initials}</div>
      <div class="nav-user-info">
        <div class="nav-user-name">${user.fullname||user.username}</div>
        <div class="nav-user-role">${roleLabel}</div>
      </div>
    </div>`;

  // Close dropdown when clicking outside
  document.addEventListener('click', function(e){
    const card = document.getElementById('nav-user-card-btn');
    if(card && !card.contains(e.target)) toggleUserDropdown(false);
  });

  loadData();
}

function toggleUserDropdown(force){
  const dd = document.getElementById('nav-user-dropdown');
  if(!dd) return;
  const show = force !== undefined ? force : dd.classList.contains('hidden');
  dd.classList.toggle('hidden', !show);
}

function authSignOut(){
  // Clear in-memory state so next user starts fresh
  state.cases=[];
  state.schedules=[];
  state.searchQuery='';
  state.filterYear=String(new Date().getFullYear());
  state.filterStatus='';
  state.filterStatCard=null;
  state.viewCasePage=null;
  state.dashPage=1;
  authClearSession();
  location.reload();
}

// Admin modal
function openAdminModal(){
  renderAccountsList();
  document.getElementById('auth-admin-overlay').classList.remove('hidden');
}
function closeAdminModal(){
  document.getElementById('auth-admin-overlay').classList.add('hidden');
}
function renderAccountsList(){
  const accounts = authGetAccounts();
  const session  = authGetSession();
  const list = document.getElementById('auth-accounts-list');
  if(accounts.length === 0){
    list.innerHTML = '<div style="text-align:center;color:var(--text3);font-size:13px;padding:16px">No accounts yet.</div>';
    return;
  }
  list.innerHTML = accounts.map(a=>{
    const initials = a.fullname.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
    const isSelf   = a.id === session?.id;
    const delBtn   = isSelf ? `<span style="font-size:11px;color:var(--text3)">You</span>`
      : `<button class="auth-del-account" onclick="deleteAccount('${a.id}')">🗑 Remove</button>`;
    return `<div class="auth-account-row">
      <div class="auth-account-avatar">${initials}</div>
      <div class="auth-account-info">
        <div class="auth-account-name">${a.fullname}</div>
        <div class="auth-account-meta">@${a.username}</div>
      </div>
      <span class="auth-account-badge-role ${a.role}">${a.role}</span>
      ${delBtn}
    </div>`;
  }).join('');
}
function deleteAccount(id){
  const session = authGetSession();
  if(id === session?.id){ showToast('Cannot delete your own account.','error'); return; }
  let accounts = authGetAccounts().filter(a=>a.id!==id);
  authSaveAccounts(accounts);
  renderAccountsList();
  showToast('Account removed.','success');
}
function addAccount(){
  const name = document.getElementById('new-acc-name').value.trim();
  const pw   = document.getElementById('new-acc-pw').value;
  const role = document.getElementById('new-acc-role').value;
  if(!name||!pw){ showToast('All fields are required.','error'); return; }
  if(pw.length < 6){ showToast('Password must be at least 6 characters.','error'); return; }
  let accounts = authGetAccounts();
  if(accounts.find(a=>a.fullname.toLowerCase()===name.toLowerCase())){ showToast('An account with this name already exists.','error'); return; }
  const user = name.toLowerCase().replace(/\s+/g,'.') + '_' + Date.now().toString(36);
  const newUser = { id:genId(), username:user, passwordHash:authHash(pw+user), fullname:name, role, created:new Date().toISOString() };
  accounts.push(newUser);
  authSaveAccounts(accounts);
  document.getElementById('new-acc-name').value='';
  document.getElementById('new-acc-pw').value='';
  renderAccountsList();
  showToast('Account created for '+name.split(' ')[0]+'!','success');
}

// Start the auth check (replaces calling loadData directly)
authInit();
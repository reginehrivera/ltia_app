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
  viewCasePage: null
};

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const NATURE_OF_CASE = ['Civil','Criminal'];
const CASE_STATUSES = ['Ongoing','CFA','Settled'];
const DEFAULT_CASE_TITLES = ['Collection of Sum of Money','Failure to Turnover Sale Proceed','Misunderstanding','Neglect of Responsibility','Oral Defamation','Serious Physical Injury','Slight Physical Injury','Theft','Unjust Vexation'];
const DEFAULT_ACTION_TAKEN = ['Mediation','Conciliation'];
function getCaseTitles(){try{const s=localStorage.getItem('ltia_case_titles');return s?JSON.parse(s):DEFAULT_CASE_TITLES;}catch(e){return DEFAULT_CASE_TITLES;}}
function getActionTaken(){try{const s=localStorage.getItem('ltia_action_taken');return s?JSON.parse(s):DEFAULT_ACTION_TAKEN;}catch(e){return DEFAULT_ACTION_TAKEN;}}
function saveCaseTitles(arr){try{localStorage.setItem('ltia_case_titles',JSON.stringify(arr));}catch(e){}}
function saveActionTaken(arr){try{localStorage.setItem('ltia_action_taken',JSON.stringify(arr));}catch(e){}}
const TIME_SLOTS    = ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM'];
const LUPON_MEMBERS = ['Kagawad A. Cruz','Kagawad B. Santos','Kagawad C. Reyes','Kagawad D. Garcia','Kagawad E. Lopez','Kagawad F. Dela Cruz'];
const PAGES = [
  { id:'dashboard',  icon:'▣',  label:'Dashboard' },
  { id:'schedules',  icon:'⊕',  label:'+New Case', modal:true },
  { id:'report',     icon:'▤',  label:'Reports' },
];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─── STORAGE ─────────────────────────────────────────────────────────────────
function loadData() {
  try {
    const c=localStorage.getItem('ltia_cases'); if(c) state.cases=JSON.parse(c);
    const s=localStorage.getItem('ltia_schedules'); if(s) state.schedules=JSON.parse(s);
  } catch(e){}
  // Purge orphaned schedules — any schedule whose case no longer exists
  const caseIds=new Set(state.cases.map(x=>x.id));
  const caseNos=new Set(state.cases.map(x=>x.caseNo).filter(Boolean));
  const before=state.schedules.length;
  state.schedules=state.schedules.filter(s=>caseIds.has(s._caseId)||caseNos.has(s.caseNo));
  if(state.schedules.length!==before) saveData('ltia_schedules',state.schedules);
  render();
}
function saveData(k,d) { try{localStorage.setItem(k,JSON.stringify(d));}catch(e){} }
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
  const colors={success:{bg:'#1a2e4a',icon:'✅'},error:{bg:'#b93232',icon:'❌'},info:{bg:'#1a56a0',icon:'ℹ️'},warning:{bg:'#9a6200',icon:'⚠️'}};
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
        <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:6px">⚠️ ${title}</div>
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

function genCaseNo(yr) {
  yr = yr || new Date().getFullYear();
  const existing = state.cases.filter(c => (c.caseNo||'').includes(`-${yr}-`));
  let maxNum = 0;
  existing.forEach(c => { const parts=c.caseNo.split('-'); const n=parseInt(parts[parts.length-1]||'0'); if(n>maxNum)maxNum=n; });
  return `04-${yr}-${String(maxNum+1).padStart(2,'0')}`;
}
function wizSyncCaseNoFromDate(){
  const df=document.getElementById('w_dateFiled');
  const cn=document.getElementById('w_caseNo');
  if(!df||!cn||!state.wizard)return;
  const dateVal=df.value;
  if(!dateVal)return;
  const yr=parseInt(dateVal.split('-')[0]);
  if(!yr||isNaN(yr))return;
  // Only auto-update if it's a NEW case (not editing an existing one)
  // or if the current caseNo belongs to a different year
  const current=cn.value||'';
  const parts=current.split('-');
  const cnoYr=parts.length>=2?parseInt(parts[1]):null;
  if(cnoYr!==yr){
    // Re-generate for the new year
    // If editing, keep the sequential number but update year
    if(state.wizard.editId){
      const num=parts[2]||'01';
      cn.value=`04-${yr}-${num}`;
    } else {
      cn.value=genCaseNo(yr);
    }
    state.wizard.data.caseNo=cn.value;
    state.wizard.data.dateFiled=dateVal;
    wizAutoSave();
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
    <div class="nav-item${state.page===p.id&&!p.modal?' active':''}" onclick="${p.modal?`openSchedulesModalForm()`:`setPage('${p.id}')`}">
      <span class="nav-icon">${p.icon}</span><span>${p.label}</span>
    </div>`).join('')+`
    <div class="nav-section">Tools</div>
    <div class="nav-item" onclick="exportExcel()"><span class="nav-icon">⇩</span><span>Export Excel</span></div>`;
}
function exportJSON() {
  const blob=new Blob([JSON.stringify({cases:state.cases,schedules:state.schedules,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ltia_data.json';a.click();
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function settledDate(c) { return c.dateResolved || c.dateFiled || ''; }

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

// Build year list: includes real current year, all years from cases, filterYear — from 1990 up
function getYearList(){
  const realYr=parseInt(nowYear());
  const caseYears=state.cases.map(c=>parseInt((c.dateFiled||c.dateResolved||'').slice(0,4))).filter(y=>!isNaN(y)&&y>1989);
  const filterYr=parseInt(state.filterYear)||realYr;
  const maxYear=Math.max(realYr, filterYr, ...(caseYears.length?caseYears:[realYr]));
  const minYear=Math.min(1990, ...(caseYears.length?caseYears:[1990]));
  const years=[];
  for(let y=maxYear;y>=minYear;y--) years.push(String(y));
  return years;
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
    if(yr) list=list.filter(c=>(c.dateFiled||'').startsWith(yr)||(c.dateResolved||'').startsWith(yr));
    if(st) list=list.filter(c=>c.status===st);
  }
  return list;
}
function setFilterYear(y){state.filterYear=y;state.filterStatCard=null;render();}
function setFilterStatus(s){state.filterStatus=s;state.filterStatCard=null;render();}
function setStatCardFilter(f){state.filterStatCard=state.filterStatCard===f?null:f;render();}
function clearAllFilters(){state.filterYear=nowYear();state.filterStatus='';state.filterStatCard=null;render();}

function renderDashboard() {
  const stats=getStats(), cases=getFilteredCases(), sf=state.filterStatCard;
  const years=getYearList();
  const hasFilters=state.filterStatus||state.filterStatCard;
  let filterDesc='';
  if(sf==='ongoing') filterDesc='Showing Ongoing complaints';
  else if(sf==='month') filterDesc=`Showing complaints settled in ${nowMonthName()} ${nowYear()}`;
  else if(sf==='year') filterDesc=`Showing complaints settled in ${state.filterYear}`;
  else if(sf==='total') filterDesc='Showing all settled complaints';
  return `
  <div class="page-header">
    <div><div class="page-title">Dashboard</div><div class="page-sub">${state.cases.length} total complaint(s) on record</div></div>
  </div>
  <div class="stats-grid">
    <div class="stat-card${sf==='ongoing'?' active':''}" onclick="setStatCardFilter('ongoing')">
      <div class="stat-label">Ongoing</div><div class="stat-value" style="color:#9a6200">${stats.ongoing}</div>
      <div class="stat-sub">Active complaints</div>
    </div>
    <div class="stat-card${sf==='month'?' active':''}" onclick="setStatCardFilter('month')">
      <div class="stat-label">This Month</div><div class="stat-value" style="color:#2d7a3a">${stats.month}</div>
      <div class="stat-sub">Settled in ${nowMonthName()} ${nowYear()}</div>
    </div>
    <div class="stat-card${sf==='year'?' active':''}" onclick="setStatCardFilter('year')">
      <div class="stat-label">${state.filterYear||'All Years'}</div><div class="stat-value" style="color:#1a56a0">${stats.year}</div>
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
    <span class="filter-result-count">${filterDesc?`<strong>${filterDesc}</strong> · `:''}Showing ${cases.length} of ${state.cases.length}</span>
  </div>
  <div data-bulk-toolbar style="display:none;align-items:center;gap:8px;padding:7px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,0.07);width:fit-content">
    <button onclick="clearSelection()" title="Clear selection" style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;background:none;border:none;cursor:pointer;color:#6b7280;font-size:14px;padding:0;line-height:1;border-radius:4px">&#x2715;</button>
    <span data-bulk-count style="font-size:13px;font-weight:600;color:#374151">0 selected</span>
    <div style="width:1px;height:18px;background:#e5e7eb;margin:0 2px"></div>
    <button onclick="deleteBulkCases()" title="Delete selected" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:none;border:none;cursor:pointer;color:#6b7280;border-radius:6px;padding:0"><svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2'/></svg></button>
  </div>
  <div class="tbl-outer"><table>
    <thead><tr>
      <th style="width:36px;text-align:center"><input type="checkbox" id="dash-chk-all" onchange="toggleSelectAll(this,'dash')" title="Select all" style="cursor:pointer;width:15px;height:15px"></th>
      <th>Actions</th><th>Complaint No.</th><th>Year</th><th>Parties</th><th>Case Title</th><th>Nature</th>
      <th>Date Filed</th><th>Time</th><th>Action Taken</th><th>Confrontation</th>
      <th>Settlement</th><th>Status</th><th>Remarks</th><th>Next Hearing</th>
    </tr></thead>
    <tbody>${cases.length?[...cases].reverse().map(c=>{
      const cScheds=state.schedules.filter(s=>s._caseId===c.id||s.caseNo===c.caseNo);
      const upcoming=cScheds.filter(s=>s.schedDate>=todayStr()).sort((a,b)=>(a.schedDate||'').localeCompare(b.schedDate||''));
      const sched=upcoming.length?upcoming[0]:cScheds.sort((a,b)=>(b.schedDate||'').localeCompare(a.schedDate||''))[0];
      const isToday=sched&&sched.schedDate===todayStr();
      const hearingCell=sched?`<div style="font-size:12px${isToday?';background:#fff8e1;border:1px solid #ffe082;border-radius:7px;padding:5px 8px':''}" onclick="showSchedDetail('${sched.id}')" title="Click to view schedule details" style="cursor:pointer"><span style="color:${isToday?'#9a6200':'#0a9396'};font-weight:600;cursor:pointer">${isToday?'🔔':'📅'} ${escHtml(sched.schedDate)}</span>${isToday?`<span style="display:inline-block;margin-left:5px;padding:1px 6px;background:#ff9800;color:#fff;border-radius:4px;font-size:10px;font-weight:700;vertical-align:middle">HEARING TODAY</span>`:''}<br><span style="color:var(--text2)">${escHtml(sched.schedTime||'')}</span>${sched.location?`<br><span style="color:var(--text3);font-size:11px">${escHtml(sched.location)}</span>`:''}<br><button onclick="event.stopPropagation();deleteSched('${sched.id}')" style="margin-top:3px;padding:2px 7px;font-size:11px;border-radius:5px;background:#fff5f5;color:#c0392b;border:1px solid #fbbaba;cursor:pointer">✕ Remove</button></div>`:'<span style="color:var(--text3);font-size:12px">—</span>';
      const _rowBg=isToday?'#fffde7':c.status==='Settled'?'#edf7ed':c.status==='CFA'?'#fdecea':c.status==='Ongoing'?'#fffbea':'';
      const isChecked=state.selectedCases.has(c.id);
      return `<tr data-rowbg="${_rowBg}" style="background:${isChecked?'#dbeafe':_rowBg};transition:background 0.1s">
      <td style="text-align:center"><input type="checkbox" data-id="${c.id}" data-ctx="dash" onchange="toggleRowSelect(this)" ${isChecked?'checked':''} style="cursor:pointer;width:15px;height:15px"></td>
      <td><div class="action-col">
        <button class="btn btn-sm" onclick="${c._archive?`viewArchiveCase('${c.id}')`:`viewCase('${c.id}')`}">View</button>
        <button class="btn btn-sm btn-danger" onclick="deleteCase('${c.id}')">Delete</button>
      </div></td>
      <td><strong>${escHtml(c.caseNo||'—')}</strong></td>
      <td style="font-size:12px;color:var(--text2);font-weight:600">${escHtml((c.dateFiled||'').slice(0,4)||'—')}</td>
      <td style="font-size:12px;white-space:normal;min-width:110px;max-width:160px;word-break:break-word">${escHtml(c.complainant||'—')}<br><span style="color:var(--text3);font-size:11px">vs</span><br>${escHtml(c.respondent||'—')}</td>
      <td>${escHtml(c.caseTitle||'—')}</td>
      <td>${escHtml(c.nature||c.type||'—')}</td>
      <td style="font-size:12px;color:var(--text2)">${escHtml(c.dateFiled||'—')}</td>
      <td style="font-size:12px;color:var(--text2)">${escHtml(formatTime12(c.timeFiled||'—'))}</td>
      <td>${escHtml(c.actionTaken||'—')}</td>
      <td style="font-size:12px;color:var(--text2)">${escHtml(c.dateConfrontation||'—')}</td>
      <td style="font-size:12px;color:var(--text2)">${escHtml(c.dateResolved||'—')}</td>
      <td style="cursor:pointer" onclick="openWizardStep2('${c.id}')" title="Click to change status">${statusBadge(c.status)}</td>
      <td style="font-size:12px;color:var(--text2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(c.remarks||'')}">${escHtml(c.remarks||'—')}</td>
      <td>${hearingCell}</td>
    </tr>`;}).join(''):`<tr><td colspan="15" class="empty">No complaints found matching your filters</td></tr>`}
    </tbody>
  </table></div>
`;
}
function deleteCase(id){
  const c=state.cases.find(x=>x.id===id);
  const label=c?`<strong>${escHtml(c.caseNo||'')}</strong> — ${escHtml(c.complainant||'')} vs ${escHtml(c.respondent||'')}`:''
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
          const prefix=parts.length>=3?parts.slice(0,2).join('-'):`04-${yr}`;
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
          const prefix=parts.length>=3?parts.slice(0,2).join('-'):`04-${yr}`;
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
    <div class="hdr-actions"><button class="btn btn-primary" onclick="openArchiveModal()">+ Log Old Case</button></div>
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
        <th>Actions</th><th>Complaint No.</th><th>Year</th><th>Parties</th><th>Case Title</th><th>Nature</th>
        <th>Date Filed</th><th>Time</th><th>Action Taken</th><th>Confrontation</th>
        <th>Settlement</th><th>Status</th><th>Remarks</th>
      </tr></thead>
      <tbody>${[...filtered].reverse().map(c=>{
        const _cb=c.status==='Settled'?'#edf7ed':c.status==='CFA'?'#fdecea':c.status==='Ongoing'?'#fffbea':'';
        const isChecked=state.selectedCases.has(c.id);
        return `<tr data-rowbg="${_cb}" style="background:${isChecked?'#dbeafe':_cb};transition:background 0.1s">
          <td style="text-align:center"><input type="checkbox" data-id="${c.id}" data-ctx="cases" onchange="toggleRowSelect(this)" ${isChecked?'checked':''} style="cursor:pointer;width:15px;height:15px"></td>
          <td><div class="action-col">
            <button class="btn btn-sm" onclick="${c._archive?`viewArchiveCase('${c.id}')`:`viewCase('${c.id}')`}">View</button>
            <button class="btn btn-sm btn-danger" onclick="deleteCase('${c.id}')">Delete</button>
          </div></td>
          <td><strong>${escHtml(c.caseNo)}</strong></td>
          <td style="font-size:12px;color:var(--text2);font-weight:600">${escHtml((c.dateFiled||'').slice(0,4)||'—')}</td>
          <td style="font-size:12px">${escHtml(c.complainant&&c.respondent?c.complainant+' vs '+c.respondent:'—')}</td>
          <td>${escHtml(c.caseTitle||'—')}</td>
          <td>${escHtml(c.nature||c.type||'—')}</td>
          <td style="font-size:12px;color:var(--text2)">${escHtml(c.dateFiled||'—')}</td>
          <td style="font-size:12px;color:var(--text2)">${escHtml(formatTime12(c.timeFiled||'—'))}</td>
          <td>${escHtml(c.actionTaken||'—')}</td>
          <td style="font-size:12px;color:var(--text2)">${escHtml(c.dateConfrontation||'—')}</td>
          <td style="font-size:12px;color:var(--text2)">${escHtml(c.dateResolved||'—')}</td>
          <td style="cursor:pointer" onclick="openWizardStep2('${c.id}')" title="Click to change status">${statusBadge(c.status)}</td>
          <td style="font-size:12px;color:var(--text2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(c.remarks||'')}">${escHtml(c.remarks||'—')}</td>
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
  const luponsHtml=(s.lupons&&s.lupons.length)?s.lupons.map(l=>`<span style="display:inline-block;padding:3px 9px;background:#e0f4f4;color:#0a9396;border-radius:12px;font-size:11px;font-weight:600;margin:2px">${escHtml(l)}</span>`).join(''):'<span style="color:#9ba3ae;font-size:12px">—</span>';
  const modal=`<div id="sched-detail-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:600;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()">
    <div style="background:#fff;border-radius:14px;width:480px;max-width:96vw;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 16px 50px rgba(0,0,0,0.22);overflow:hidden">
      <div style="padding:16px 22px;background:#1a2e4a;border-radius:14px 14px 0 0;display:flex;align-items:center;justify-content:space-between">
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
            <span style="font-size:13px;font-weight:600;color:#1a1a1a">${escHtml(s.caseNo||'—')}</span>
          </div>
          ${c?`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0">
            <span style="font-size:12px;color:#6b7280;font-weight:500;width:140px;flex-shrink:0">Parties</span>
            <span style="font-size:12px;color:#1a1a1a;text-align:right">${escHtml(c.complainant||'—')} <span style="color:#9ba3ae">vs</span> ${escHtml(c.respondent||'—')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0">
            <span style="font-size:12px;color:#6b7280;font-weight:500;width:140px;flex-shrink:0">Case Title</span>
            <span style="font-size:13px;color:#1a1a1a">${escHtml(c.caseTitle||s.caseTitle||'—')}</span>
          </div>`:''}
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0">
            <span style="font-size:12px;color:#6b7280;font-weight:500;width:140px;flex-shrink:0">Hearing Date</span>
            <span style="font-size:13px;font-weight:700;color:#0a9396">${escHtml(s.schedDate||'—')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0">
            <span style="font-size:12px;color:#6b7280;font-weight:500;width:140px;flex-shrink:0">Time</span>
            <span style="font-size:13px;font-weight:600;color:#1a1a1a">${escHtml(s.schedTime||'—')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0">
            <span style="font-size:12px;color:#6b7280;font-weight:500;width:140px;flex-shrink:0">Location</span>
            <span style="font-size:13px;color:#1a1a1a">${escHtml(s.location||'—')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0">
            <span style="font-size:12px;color:#6b7280;font-weight:500;width:140px;flex-shrink:0">Chairman</span>
            <span style="font-size:12px;color:#1a1a1a">${escHtml(s.chairman||'—')}</span>
          </div>
          <div style="padding:8px 0">
            <div style="font-size:12px;color:#6b7280;font-weight:500;margin-bottom:8px">Lupon Members</div>
            <div>${luponsHtml}</div>
          </div>
        </div>
      </div>
      <div style="padding:12px 22px;border-top:1px solid #eee;display:flex;gap:8px;justify-content:flex-end;background:#f9fafb;border-radius:0 0 14px 14px">
        ${c?`<button onclick="document.getElementById('sched-detail-modal').remove();viewCase('${c.id}')" style="padding:7px 16px;background:#1a2e4a;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer">📋 View Case</button>`:''}
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
          <div style="font-weight:700">[Complainant Name]</div>
          <div>Butuan City</div>
          <div>Complainant</div>
        </div>
        <div style="text-align:right">
          <div>DF: ${now.toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'numeric'}).replace(/\//g,'-')}</div>
          <div>Barangay Case No. <span style="font-weight:700">${caseNo}</span></div>
          <div>For: [Nature of Complaint]</div>
        </div>
      </div>
      <div style="text-align:center;margin:8px 0;font-size:12px">- against -</div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <div>
          <div style="font-weight:700">[Respondent Name]</div>
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
      <div style="background:#1a2e4a;color:#fff;padding:14px 18px;display:flex;align-items:flex-start;justify-content:space-between;flex-shrink:0">
        <div>
          <div style="font-size:14px;font-weight:700;margin-bottom:2px">📋 File a Complaint</div>
          <div style="font-size:10px;opacity:0.65">KP Form 7 — Preview</div>
        </div>
        <button onclick="closeFcPreviewAndOpenForm7()" title="Close preview and proceed to form" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-left:8px" onmouseover="this.style.background='rgba(255,255,255,0.28)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">✕</button>
      </div>
      <!-- Body -->
      <div style="flex:1;overflow-y:auto;padding:18px 16px;color:#e8eaed">
        <div style="background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.35);border-radius:8px;padding:12px 14px;font-size:12px;color:#93c5fd;line-height:1.6;margin-bottom:18px">
          📄 <strong>KP Form 7 — Complaint</strong><br>
          This is a preview of how your complaint document will look. Click <strong>✕</strong> to proceed to filling out and filing the form.
        </div>
        <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid rgba(255,255,255,0.1)">What happens next?</div>
        <div style="display:flex;flex-direction:column;gap:10px;font-size:12px;color:#adb5bd">
          <div style="display:flex;gap:10px;align-items:flex-start">
            <span style="background:rgba(200,150,12,0.25);color:#c8960c;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">1</span>
            <span>Fill in complainant & respondent details</span>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start">
            <span style="background:rgba(200,150,12,0.25);color:#c8960c;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">2</span>
            <span>Enter the nature and narrative of the complaint</span>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start">
            <span style="background:rgba(200,150,12,0.25);color:#c8960c;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">3</span>
            <span>Form 7 PDF is auto-generated and saved to the case</span>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start">
            <span style="background:rgba(200,150,12,0.25);color:#c8960c;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">4</span>
            <span>Case is tracked through the full KP process</span>
          </div>
        </div>
        <div style="margin-top:28px">
          <button onclick="closeFcPreviewAndOpenForm7()" style="width:100%;padding:11px;border-radius:8px;background:#c8960c;color:#1a1a1a;border:none;font-size:13px;font-weight:700;cursor:pointer" onmouseover="this.style.background='#e0a80e'" onmouseout="this.style.background='#c8960c'">
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
  const now=new Date();
  const autoTime=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const caseNo=genCaseNo();
  const caseTitles=getCaseTitles();
  const html=`<div id="form7-modal-root" style="position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:400;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)closeForm7Modal()">
    <div style="background:#1e2229;border-radius:12px;width:560px;max-width:97vw;max-height:94vh;display:flex;flex-direction:column;box-shadow:0 16px 50px rgba(0,0,0,0.5);color:#e8eaed">
      <!-- Header -->
      <div style="padding:16px 22px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div style="font-size:15px;font-weight:700">New Case</div>
        <button onclick="closeForm7Modal()" style="border:none;background:rgba(255,255,255,0.12);color:#ccc;font-size:15px;font-weight:700;cursor:pointer;padding:4px 10px;border-radius:6px;line-height:1" onmouseover="this.style.background='rgba(255,255,255,0.22)'" onmouseout="this.style.background='rgba(255,255,255,0.12)'">x</button>
      </div>
      <!-- Body -->
      <div style="padding:18px 22px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:12px">
        <!-- Case number + Date filed -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Case number</label>
            <input id="f7_caseNo" value="${escHtml(caseNo)}" style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
          </div>
          <div>
            <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Date filed</label>
            <input type="date" id="f7_dateFiled" value="${todayStr()}" style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box;color-scheme:dark" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
          </div>
        </div>
        <!-- Time filed + Nature of case -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Time filed</label>
            <input type="time" id="f7_timeFiled" value="${autoTime}" style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box;color-scheme:dark" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
          </div>
          <div>
            <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Nature of case</label>
            <select id="f7_nature" style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box;cursor:pointer" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
              <option value="" style="background:#2a2d35">Select...</option>
              <option value="Civil" style="background:#2a2d35">Civil</option>
              <option value="Criminal" style="background:#2a2d35">Criminal</option>
            </select>
          </div>
        </div>
        <!-- Case Title -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
            <label style="font-size:12px;color:#9ca3af;font-weight:500">Case Title</label>
            <button onclick="openManageCaseTitlesModal()" title="Manage case titles" style="border:none;background:rgba(255,255,255,0.1);color:#9ca3af;font-size:13px;font-weight:700;cursor:pointer;padding:2px 8px;border-radius:5px;line-height:1.4" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">⋮</button>
          </div>
          <select id="f7_caseTitle" style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box;cursor:pointer" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
            <option value="" style="background:#2a2d35">Select...</option>
            ${caseTitles.map(t=>`<option value="${escHtml(t)}" style="background:#2a2d35">${escHtml(t)}</option>`).join('')}
          </select>
        </div>
        <!-- Complainant -->
        <div>
          <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Complainant</label>
          <input id="f7_complainant" placeholder="Full name" style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'" placeholder="Full name">
        </div>
        <!-- Complainant address -->
        <div>
          <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Complainant address</label>
          <input id="f7_complainantAddr" placeholder="Purok, Barangay, City" style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
        </div>
        <!-- Respondent(s) -->
        <div>
          <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Respondent(s)</label>
          <input id="f7_respondent" placeholder="Full name(s)" style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
        </div>
        <!-- Respondent address -->
        <div>
          <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Respondent address</label>
          <input id="f7_respondentAddr" placeholder="Purok, Barangay, City" style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
        </div>
        <!-- Lupon Chairman -->
        <div>
          <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Lupon Chairman</label>
          <input id="f7_chairman" placeholder="Hon. ..." style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
        </div>
        <!-- Complaint narrative -->
        <div>
          <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Complaint narrative</label>
          <textarea id="f7_narrative" rows="4" placeholder="Brief description..." style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box;resize:vertical;font-family:inherit" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'"></textarea>
        </div>
      </div>
      <!-- Footer -->
      <div style="padding:14px 22px;border-top:1px solid rgba(255,255,255,0.1);display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;background:#1a1d23;border-radius:0 0 12px 12px">
        <button onclick="closeForm7Modal()" style="padding:9px 20px;border-radius:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#ccc;font-size:13px;font-weight:500;cursor:pointer" onmouseover="this.style.background='rgba(255,255,255,0.14)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'">Cancel</button>
        <button onclick="fileComplaintForm7()" style="padding:9px 22px;border-radius:8px;background:#e8eaed;color:#1a1d23;border:none;font-size:13px;font-weight:700;cursor:pointer" onmouseover="this.style.background='#fff'" onmouseout="this.style.background='#e8eaed'">File Complaint</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function closeForm7Modal(){
  const el=document.getElementById('form7-modal-root');
  if(el)el.remove();
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

// ─── UPLOAD ATTACHMENT MODAL ──────────────────────────────────────────────────
function openUploadAttachmentModal(caseId){
  const existing=document.getElementById('upload-attachment-modal');
  if(existing)existing.remove();
  window._uploadAttachFile=null;

  const html=`<div id="upload-attachment-modal" style="position:fixed;inset:0;z-index:9200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55)" onclick="if(event.target===this)closeUploadAttachmentModal()">
    <div style="background:#fff;border-radius:14px;width:480px;max-width:95vw;box-shadow:0 16px 48px rgba(0,0,0,0.26);overflow:hidden;display:flex;flex-direction:column">
      <!-- Header -->
      <div style="background:#1a2e4a;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
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
          <input id="upload-attach-label" type="text" placeholder="e.g. Sinumpaang Salaysay, Affidavit, Form 16…" style="width:100%;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#1a1a1a;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#1a2e4a'" onblur="this.style.borderColor='#e5e7eb'">
        </div>
        <!-- Drop zone -->
        <div id="upload-attach-dropzone" style="border:2px dashed #c3d8fa;border-radius:10px;padding:28px 20px;text-align:center;cursor:pointer;background:#f8faff;transition:all 0.15s"
          onclick="document.getElementById('upload-attach-input').click()"
          ondragover="event.preventDefault();this.style.background='#eef4ff';this.style.borderColor='#1a2e4a'"
          ondragleave="this.style.background='#f8faff';this.style.borderColor='#c3d8fa'"
          ondrop="handleUploadAttachDrop(event)">
          <div style="font-size:36px;margin-bottom:8px">📄</div>
          <div style="font-size:13px;font-weight:700;color:#1a2e4a">Click to upload or drag &amp; drop</div>
          <div style="font-size:11px;color:#9ba3ae;margin-top:4px">PDF, DOCX, JPG, PNG accepted</div>
        </div>
        <input type="file" id="upload-attach-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="display:none" onchange="handleUploadAttachFileSelect(this)">
        <!-- File preview -->
        <div id="upload-attach-preview" style="display:none;margin-top:12px;padding:10px 14px;background:#eef4ff;border:1px solid #c3d8fa;border-radius:8px;align-items:center;gap:10px">
          <span style="font-size:22px">📎</span>
          <div style="flex:1;min-width:0">
            <div id="upload-attach-fname" style="font-size:13px;font-weight:600;color:#1a2e4a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div>
            <div id="upload-attach-fsize" style="font-size:11px;color:#6b7280"></div>
          </div>
          <button onclick="clearUploadAttachFile()" style="border:none;background:none;color:#dc2626;font-size:20px;cursor:pointer;line-height:1;padding:0 4px;flex-shrink:0" title="Remove">×</button>
        </div>
      </div>
      <!-- Footer -->
      <div style="padding:14px 22px;border-top:1px solid #f0f2f5;display:flex;justify-content:flex-end;gap:8px;background:#fafafa;flex-shrink:0">
        <button onclick="closeUploadAttachmentModal()" style="padding:9px 18px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;color:#374151;font-size:13px;font-weight:600;cursor:pointer" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='#fff'">Cancel</button>
        <button onclick="confirmUploadAttachment('${caseId}')" style="padding:9px 22px;border-radius:8px;border:none;background:#1a2e4a;color:#fff;font-size:13px;font-weight:700;cursor:pointer" onmouseover="this.style.background='#243d5e'" onmouseout="this.style.background='#1a2e4a'">📎 Save Attachment</button>
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
  if(dz){dz.style.background='#f8faff';dz.style.borderColor='#c3d8fa';}
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
    showToast('✅ Attachment saved to case.','success',3000);
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
  const html=`<div id="form7-modal-root" style="position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:400;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)closeForm7Modal()">
    <div style="background:#1e2229;border-radius:12px;width:560px;max-width:97vw;max-height:94vh;display:flex;flex-direction:column;box-shadow:0 16px 50px rgba(0,0,0,0.5);color:#e8eaed">
      <!-- Header -->
      <div style="padding:16px 22px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div style="font-size:15px;font-weight:700">Edit Case</div>
        <button onclick="closeForm7Modal()" style="border:none;background:rgba(255,255,255,0.12);color:#ccc;font-size:15px;font-weight:700;cursor:pointer;padding:4px 10px;border-radius:6px;line-height:1" onmouseover="this.style.background='rgba(255,255,255,0.22)'" onmouseout="this.style.background='rgba(255,255,255,0.12)'">x</button>
      </div>
      <!-- Body -->
      <div style="padding:18px 22px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Case number</label>
            <input id="f7_caseNo" value="${esc(c.caseNo||'')}" style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
          </div>
          <div>
            <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Date filed</label>
            <input type="date" id="f7_dateFiled" value="${esc(c.dateFiled||'')}" style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box;color-scheme:dark" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Time filed</label>
            <input type="time" id="f7_timeFiled" value="${esc(c.timeFiled||'')}" style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box;color-scheme:dark" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
          </div>
          <div>
            <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Nature of case</label>
            <select id="f7_nature" style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box;cursor:pointer" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
              <option value="" style="background:#2a2d35">Select...</option>
              <option value="Civil" ${c.nature==='Civil'?'selected':''} style="background:#2a2d35">Civil</option>
              <option value="Criminal" ${c.nature==='Criminal'?'selected':''} style="background:#2a2d35">Criminal</option>
            </select>
          </div>
        </div>
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
            <label style="font-size:12px;color:#9ca3af;font-weight:500">Case Title</label>
            <button onclick="openManageCaseTitlesModal()" title="Manage case titles" style="border:none;background:rgba(255,255,255,0.1);color:#9ca3af;font-size:13px;font-weight:700;cursor:pointer;padding:2px 8px;border-radius:5px;line-height:1.4" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">⋮</button>
          </div>
          <select id="f7_caseTitle" style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box;cursor:pointer" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
            <option value="" style="background:#2a2d35">Select...</option>
            ${caseTitles.map(t=>`<option value="${esc(t)}" ${(c.caseTitle||c.type)===t?'selected':''} style="background:#2a2d35">${esc(t)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Complainant</label>
          <input id="f7_complainant" value="${esc(c.complainant||'')}" placeholder="Full name" style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
        </div>
        <div>
          <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Complainant address</label>
          <input id="f7_complainantAddr" value="${esc(c.complainantAddress||'')}" placeholder="Purok, Barangay, City" style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
        </div>
        <div>
          <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Respondent(s)</label>
          <input id="f7_respondent" value="${esc(c.respondent||'')}" placeholder="Full name(s)" style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
        </div>
        <div>
          <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Respondent address</label>
          <input id="f7_respondentAddr" value="${esc(c.respondentAddress||'')}" placeholder="Purok, Barangay, City" style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
        </div>
        <div>
          <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Lupon Chairman</label>
          <input id="f7_chairman" value="${esc(c._lupanChairman||c.mediator||'')}" placeholder="Hon. ..." style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
        </div>
        <div>
          <label style="font-size:12px;color:#9ca3af;font-weight:500;display:block;margin-bottom:5px">Complaint narrative</label>
          <textarea id="f7_narrative" rows="4" placeholder="Brief description..." style="width:100%;padding:9px 11px;background:#2a2d35;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;color:#e8eaed;outline:none;box-sizing:border-box;resize:vertical;font-family:inherit" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">${esc(c._narrative||'')}</textarea>
        </div>
      </div>
      <!-- Footer -->
      <div style="padding:14px 22px;border-top:1px solid rgba(255,255,255,0.1);display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;background:#1a1d23;border-radius:0 0 12px 12px">
        <button onclick="closeForm7Modal()" style="padding:9px 20px;border-radius:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#ccc;font-size:13px;font-weight:500;cursor:pointer" onmouseover="this.style.background='rgba(255,255,255,0.14)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'">Cancel</button>
        <button onclick="saveEditCaseForm7('${caseId}')" style="padding:9px 22px;border-radius:8px;background:#e8eaed;color:#1a1d23;border:none;font-size:13px;font-weight:700;cursor:pointer" onmouseover="this.style.background='#fff'" onmouseout="this.style.background='#e8eaed'">Save Changes</button>
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
  c.respondent   = gv('f7_respondent');
  c.respondentAddress  = gv('f7_respondentAddr');
  c._lupanChairman = gv('f7_chairman')||c._lupanChairman;
  c.mediator     = c._lupanChairman;
  c._narrative   = gv('f7_narrative');
  saveData('ltia_cases',state.cases);
  closeForm7Modal();
  state.viewCasePage=caseId;
  render();
  showToast('✅ Case updated successfully!','success',3000);
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
      <span style="font-size:13px;color:#1a1a1a">${escHtml(t)}</span>
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
          <div style="font-size:15px;font-weight:700;color:#1a1a1a">Manage Case Titles</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px">Add or remove case title options</div>
        </div>
        <button onclick="closeManageCaseTitlesModal()" style="border:none;background:#f0f2f5;color:#6b7280;font-size:16px;font-weight:700;cursor:pointer;padding:4px 10px;border-radius:6px;line-height:1" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f0f2f5'">&#x2715;</button>
      </div>
      <div style="padding:18px 22px;overflow-y:auto;flex:1">
        <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px">Current Options</div>
        <div id="mct-items-list">${itemsHtml}</div>
        <div style="margin-top:8px;padding:14px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px">
          <div style="font-size:12px;font-weight:700;color:#0a9396;margin-bottom:10px">+ ADD NEW OPTION</div>
          <div style="display:flex;gap:8px">
            <input id="mct-new-input" placeholder="Enter case title..." style="flex:1;padding:9px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;color:#1a1a1a;outline:none;background:#fff" onfocus="this.style.borderColor='#0a9396'" onblur="this.style.borderColor='#ddd'" onkeydown="if(event.key==='Enter')addNewCaseTitleItem()">
            <button onclick="addNewCaseTitleItem()" style="padding:9px 18px;border-radius:8px;background:#0a9396;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer" onmouseover="this.style.background='#077a7d'" onmouseout="this.style.background='#0a9396'">Add</button>
          </div>
        </div>
      </div>
      <div style="padding:14px 22px;border-top:1px solid #f0f0f0;display:flex;justify-content:flex-end;background:#f9fafb;border-radius:0 0 14px 14px;flex-shrink:0">
        <button onclick="closeSaveCaseTitlesModal()" style="padding:9px 24px;border-radius:8px;background:#1a2e4a;color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer" onmouseover="this.style.background='#243d5e'" onmouseout="this.style.background='#1a2e4a'">Done</button>
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
    complainantContact:'',
    respondent, respondentAddress:gv('f7_respondentAddr'),
    respondentContact:'',
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
  showToast('✅ Complaint filed successfully! Case ' + newCase.caseNo + ' has been created.', 'success', 4000);
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
  const opts=available.map((m,i)=>`<div onclick="luponPickerSelect(${i})" style="padding:10px 14px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='#e0f4f4'" onmouseout="this.style.background='#fff'"><span style="color:#0a9396;font-weight:700">+</span>${m}</div>`).join('');
  const html=`<div id="lupon-picker-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:600;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)closeLuponPicker()">
    <div style="background:#fff;border-radius:14px;width:400px;max-width:95vw;box-shadow:0 12px 40px rgba(0,0,0,0.22);overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:15px;font-weight:700">Add Lupon Member</div>
        <button onclick="closeLuponPicker()" style="border:none;background:none;font-size:22px;cursor:pointer;color:#888;line-height:1">&times;</button>
      </div>
      <div style="padding:16px 20px;display:flex;flex-direction:column;gap:8px;max-height:340px;overflow-y:auto">
        ${opts.length>0?opts:'<div style="text-align:center;color:#9ba3ae;font-size:13px;padding:12px">All default members already added.</div>'}
        <div onclick="luponPickerCustom()" style="padding:10px 14px;border-radius:8px;border:1px dashed #b2e0e0;background:#f0fafa;cursor:pointer;font-size:13px;color:#0a9396;font-weight:600;text-align:center;margin-top:4px">+ Enter custom name...</div>
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
        <button onclick="confirmDialogOk()" style="padding:8px 20px;border-radius:8px;background:#1a2e4a;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer">&#10004; Confirm</button>
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
        <div style="font-size:17px;font-weight:700;margin-bottom:8px;color:#1a2e4a">Schedule Saved!</div>
        <div style="font-size:13px;color:#5c6370;line-height:1.6">${msg}</div>
      </div>
      <div style="padding:0 24px 22px">
        <button onclick="closeSuccessDialog()" style="width:100%;padding:10px 0;border-radius:8px;background:#1a2e4a;color:#fff;border:none;font-size:14px;font-weight:600;cursor:pointer">OK</button>
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
  },'Certify','#1a56a0');
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
      ${kpDRow('Date filed', esc(c.dateFiled||'—'))}
      ${kpDRow('Complainant', esc(c.complainant||'—'))}
      ${kpDRow('Respondent(s)', esc(c.respondent||'—'))}
      ${kpDRow('Lupon Chairman', esc(c.mediator||c._lupanChairman||'—'))}
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
          <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:${isDone?'rgba(255,255,255,0.12)':isCurrent?'rgba(59,130,246,0.25)':'rgba(255,255,255,0.07)'};color:${isDone?'#9ca3af':isCurrent?'#93c5fd':'#6b7280'}">${s.form}</span>
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
        <td style="padding:10px 14px;border-bottom:1px solid #eee;vertical-align:middle;font-size:12px">${escHtml(s.complainant&&s.respondent?s.complainant+' vs '+s.respondent:'—')}</td>
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
              <div style="display:flex;align-items:center;gap:7px;margin-bottom:12px"><div style="width:28px;height:28px;border-radius:50%;background:#0a9396;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff">C</div><span style="font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;background:#e0f4f4;color:#0a9396">Complainant</span></div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                <div><label style="font-size:12px;color:#5c6370;font-weight:500;display:block;margin-bottom:4px">Full Name</label><input class="wiz-input" id="sm_cName" value="${escHtml(d.complainantName||'')}" placeholder="e.g Juan Dela Cruz"></div>
                <div><label style="font-size:12px;color:#5c6370;font-weight:500;display:block;margin-bottom:4px">Contact No.</label><input class="wiz-input" id="sm_cContact" value="${escHtml(d.complainantContact||'')}" placeholder="e.g 09XXXXXXXXX"></div>
              </div>
              <div><label style="font-size:12px;color:#5c6370;font-weight:500;display:block;margin-bottom:4px">Address</label><input class="wiz-input" id="sm_cAddress" value="${escHtml(d.complainantAddress||'')}" placeholder="Block, Lot, Street, Barangay"></div>
            </div>
            <div style="background:#fff;border-radius:10px;padding:14px 16px;border:1px solid #e5e7eb">
              <div style="display:flex;align-items:center;gap:7px;margin-bottom:12px"><div style="width:28px;height:28px;border-radius:50%;background:#e76f51;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff">R</div><span style="font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;background:#fde8e2;color:#e76f51">Respondent</span></div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                <div><label style="font-size:12px;color:#5c6370;font-weight:500;display:block;margin-bottom:4px">Full Name</label><input class="wiz-input" id="sm_rName" value="${escHtml(d.respondentName||'')}" placeholder="e.g Juan Dela Cruz"></div>
                <div><label style="font-size:12px;color:#5c6370;font-weight:500;display:block;margin-bottom:4px">Contact No.</label><input class="wiz-input" id="sm_rContact" value="${escHtml(d.respondentContact||'')}" placeholder="e.g 09XXXXXXXXX"></div>
              </div>
              <div><label style="font-size:12px;color:#5c6370;font-weight:500;display:block;margin-bottom:4px">Address</label><input class="wiz-input" id="sm_rAddress" value="${escHtml(d.respondentAddress||'')}" placeholder="Block, Lot, Street, Barangay"></div>
            </div>
          </div>`
        :`<div style="padding:8px 14px;background:#eef4ff;border:1px solid #c3d8fa;border-radius:8px;font-size:12px;color:#1a56a0;margin-bottom:16px">
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
          const color=isOver?'#c0392b':isDue||isUrgent?'#92400e':'#7c5c00';
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
          <button onclick="schedModalAddLupon()" style="display:flex;align-items:center;gap:5px;padding:5px 11px;border-radius:7px;background:#e0f4f4;color:#0a9396;border:1px solid #b2e0e0;font-size:12px;font-weight:600;cursor:pointer">＋ Add Member</button>
        </div>
        <div style="background:#fff;border-radius:8px;padding:12px;border:1px solid #e5e7eb">
          ${selectedLupons.length===0
            ?`<div style="text-align:center;padding:18px;color:#9ba3ae;font-size:12px">No lupon members added yet. Click &ldquo;＋ Add Member&rdquo; to add.</div>`
            :`<div style="display:flex;flex-direction:column;gap:6px">
            ${selectedLupons.map((m,idx)=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f0fafa;border:1px solid #d0eeee;border-radius:8px;font-size:13px">
              <span style="display:flex;align-items:center;gap:8px"><span style="color:#0a9396;font-weight:700">✓</span>${escHtml(m)}</span>
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
        <button onclick="openSchedulesModalForm()" style="display:flex;align-items:center;gap:7px;padding:8px 16px;border-radius:8px;background:#1a2e4a;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer">＋ Set Schedule</button>
        <button onclick="closeSchedulesModal()" title="Close" style="border:none;background:#f0f2f5;font-size:17px;font-weight:700;cursor:pointer;color:#6b7280;line-height:1;padding:5px 10px;border-radius:8px;transition:all 0.15s" onmouseover="this.style.background='#e5e7eb';this.style.color='#1a1a1a'" onmouseout="this.style.background='#f0f2f5';this.style.color='#6b7280'">✕</button>
      </div>`;
  const smPhase=d._phase||'med';
  const smIsConc=smPhase==='conc';
  const footerActions = isForm
    ? `<div style="padding:14px 24px;border-top:1px solid #eee;background:#fafafa;border-radius:0 0 14px 14px;flex-shrink:0">
        <div style="margin-bottom:12px">
          ${smIsConc
            ? `<div style="padding:8px 14px;background:#f3e8ff;border:1px solid #c4b5fd;border-radius:8px;font-size:12px;color:#7c3aed;font-weight:600;display:flex;align-items:center;gap:7px;margin-bottom:8px">
                ⚖️ <strong>Conciliation Phase</strong> — Forms to print with this schedule
               </div>
               <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px">
                 <button onclick="schedModalPreviewFormConc('form10')" style="padding:8px 4px;border-radius:7px;border:1px solid #c4b5fd;background:#f3e8ff;color:#7c3aed;font-size:11px;font-weight:600;cursor:pointer">📋 Form 10</button>
                 <button onclick="schedModalPreviewFormConc('form11')" style="padding:8px 4px;border-radius:7px;border:1px solid #c4b5fd;background:#f3e8ff;color:#7c3aed;font-size:11px;font-weight:600;cursor:pointer">📋 Form 11</button>
                 <button onclick="schedModalPreviewFormConc('form12')" style="padding:8px 4px;border-radius:7px;border:1px solid #c4b5fd;background:#f3e8ff;color:#7c3aed;font-size:11px;font-weight:600;cursor:pointer">📋 Form 12</button>
                 <button onclick="schedWizPreviewForm_modal('form9')" style="padding:8px 4px;border-radius:7px;border:1px solid #c3d8fa;background:#eef4ff;color:#1a56a0;font-size:11px;font-weight:600;cursor:pointer">👁 Form 9</button>
               </div>
               <div style="margin-top:7px">
                 <button onclick="schedModalDownloadConcForms()" style="width:100%;padding:8px 0;border-radius:7px;border:none;background:#1a2e4a;color:#fff;font-size:12px;font-weight:600;cursor:pointer">⬇ Download All Conciliation Forms (10, 11, 12 &amp; 9)</button>
               </div>`
            : `<div style="padding:8px 14px;background:#e0f4f4;border:1px solid #b2e0e0;border-radius:8px;font-size:12px;color:#0a9396;font-weight:600;display:flex;align-items:center;gap:7px;margin-bottom:8px">
                🤝 <strong>Mediation Phase</strong> — Forms to print with this schedule
               </div>
               <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px">
                 <button onclick="schedWizPreviewForm_modal('form8')" style="padding:8px 4px;border-radius:7px;border:1px solid #c3d8fa;background:#eef4ff;color:#1a56a0;font-size:12px;font-weight:600;cursor:pointer">👁 Preview Form 8</button>
                 <button onclick="schedWizPreviewForm_modal('form9')" style="padding:8px 4px;border-radius:7px;border:1px solid #c3d8fa;background:#eef4ff;color:#1a56a0;font-size:12px;font-weight:600;cursor:pointer">👁 Preview Form 9</button>
                 <button onclick="schedModalDownloadBoth()" style="padding:8px 4px;border-radius:7px;border:none;background:#1a2e4a;color:#fff;font-size:12px;font-weight:600;cursor:pointer">⬇ Download Both</button>
               </div>`
          }
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:12px;color:#9ba3ae">Fill in all required fields before saving</span>
          <div style="display:flex;gap:10px">
            <button onclick="schedModalBack()" style="padding:9px 16px;border-radius:8px;background:#fff;border:1px solid #ddd;font-size:13px;font-weight:500;cursor:pointer;color:#5c6370">← Back</button>
            <button onclick="schedModalSaveConfirm()" style="display:flex;align-items:center;gap:7px;padding:9px 20px;border-radius:8px;background:#1a2e4a;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer">💾 Save Schedule</button>
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
      <div style="font-size:14px;font-weight:600;margin-top:4px;color:#2d7a3a">SETTLED CASE — FILED FORMS ON RECORD</div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
      <tr><td style="padding:6px 12px;background:#f5f5f5;font-weight:700;width:40%">Complaint No.</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${escHtml(c.caseNo||'—')}</td></tr>
      <tr><td style="padding:6px 12px;background:#f5f5f5;font-weight:700">Parties</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${escHtml(c.complainant||'—')} vs. ${escHtml(c.respondent||'—')}</td></tr>
      <tr><td style="padding:6px 12px;background:#f5f5f5;font-weight:700">Case Title</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${escHtml(c.caseTitle||c.type||'—')}</td></tr>
      <tr><td style="padding:6px 12px;background:#f5f5f5;font-weight:700">Date Filed</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${escHtml(c.dateFiled||'—')}</td></tr>
      <tr><td style="padding:6px 12px;background:#f5f5f5;font-weight:700">Date Settled</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${escHtml(c.dateResolved||'—')}</td></tr>
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
    const isGenerated = !!a._generated;
    const rowBg     = isGenerated ? '#fffbeb' : '#fafafa';
    const rowBorder = isGenerated ? '1px solid #fde68a' : '1px solid #e5e7eb';
    const iconEl    = isGenerated ? '📋' : fileIcon(a.name);
    const subtitleEl = isGenerated
      ? `<div style="font-size:11px;color:#b45309;font-weight:500">KP Generated Form — Edit &amp; Preview</div>`
      : `<div style="font-size:11px;color:#888">${a.size?(Math.round(a.size/1024)+' KB'):'—'}</div>`;
    const dlBtn = `<a href="${a.dataUrl}" download="${escHtml(a.name)}" onclick="event.stopPropagation()" title="Download" style="flex-shrink:0;padding:4px 9px;background:#1a2e4a;color:#fff;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none">⬇</a>`;
    return `<div id="attrow_${i}" onclick="attachSelectRow(${i})" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:${rowBorder};border-radius:8px;margin-bottom:8px;background:${rowBg};cursor:pointer;transition:all 0.12s" data-generated="${isGenerated}" data-kptab="${kpTabForName(a.name)}">
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
      <div style="padding:12px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:#1a2e4a">
        <div>
          <div style="font-size:14px;font-weight:700;color:#fff">📎 Documents — ${escHtml(c.caseNo)}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:1px">${escHtml(c.complainant||'')}${c.respondent?' vs '+escHtml(c.respondent):''} · ${atts.length} file(s)</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button id="attach-print-btn" onclick="attachPrintCurrent()" style="display:none;padding:5px 13px;background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">🖨️ Print</button>
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
  if(caseId) setTimeout(()=>viewCase(caseId),50);
}

// Called when any row in the file list is clicked
function attachSelectRow(idx){
  const atts = window._attachModalAtts||[];
  const a = atts[idx]; if(!a)return;

  // Highlight active row
  document.querySelectorAll('[id^="attrow_"]').forEach(el=>{
    const isGen = el.dataset.generated==='true';
    el.style.background = isGen ? '#fffbeb' : '#fafafa';
    el.style.border     = isGen ? '1px solid #fde68a' : '1px solid #e5e7eb';
    el.style.fontWeight = '';
    el.classList.remove('att-active');
  });
  const row = document.getElementById('attrow_'+idx);
  if(row){ row.classList.add('att-active'); row.style.background='#dbeafe'; row.style.border='1px solid #93c5fd'; }

  if(a._generated){
    // Show KP edit panel + live PDF preview
    const tab = row ? row.dataset.kptab : 'form7';
    attachShowKpEditor(idx, tab);
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

  // Build the fields data from the case
  const sched = state.schedules.find(s=>s.caseNo===c.caseNo||s._caseId===c.id);
  const d = {
    caseNo:    c.caseNo,
    dateFiled: c.dateFiled,
    timeFiled: sched ? sched.timeFiled : (c.timeFiled||''),
    complainant:        c.complainant,
    complainantAddress: c.complainantAddress||'',
    respondent:         c.respondent,
    respondentAddress:  c.respondentAddress||'',
    schedDate: sched ? sched.schedDate : (c.dateConfrontation||c.dateFiled||''),
    schedTime: sched ? sched.schedTime : '1:00 PM',
    caseTitle: c.caseTitle||c.type||'',
    chairman:  sched ? sched.chairman : (c._lupanChairman||c.mediator||'HON. ABUNDIO A. LEONES'),
    officer:   c._servingOfficer||'RAMIL  ROSALES',
    complainantAge: c._complainantAge||'',
    narrative: c._narrative||'',
    relief:    c._relief||''
  };
  window._attachKpfData = d;
  window._attachKpfCaseId = c.id;

  const escH = s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  kpPanel.innerHTML = `
    <!-- KPF Panel Header -->
    <div style="background:var(--navy);color:#fff;padding:11px 14px;flex-shrink:0">
      <div style="font-size:12px;font-weight:700">✏️ KP Forms — ${escH(d.caseNo)}</div>
      <div style="font-size:10px;opacity:0.65;margin-top:2px">
        <span onclick="attachKpfTab('form7')" id="akpftab-form7" style="cursor:pointer;padding:1px 6px;border-radius:3px;margin-right:4px">Form 7: Complaint</span>
        <span onclick="attachKpfTab('form8')" id="akpftab-form8" style="cursor:pointer;padding:1px 6px;border-radius:3px;margin-right:4px">Form 8: Notice</span>
        <span onclick="attachKpfTab('form9')" id="akpftab-form9" style="cursor:pointer;padding:1px 6px;border-radius:3px">Form 9: Summons</span>
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
          <div style="font-size:11px;color:#888;margin-bottom:2px">Complainant Address</div>
          <input class="wiz-input" id="akpf_complainantAddr" value="${escH(d.complainantAddress)}" oninput="attachKpfLiveUpdate()" style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box">
        </div>
        <div>
          <div style="font-size:11px;color:#888;margin-bottom:2px">Respondent Name</div>
          <input class="wiz-input" id="akpf_respondent" value="${escH(d.respondent)}" oninput="attachKpfLiveUpdate()" style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box">
        </div>
        <div>
          <div style="font-size:11px;color:#888;margin-bottom:2px">Respondent Address</div>
          <input class="wiz-input" id="akpf_respondentAddr" value="${escH(d.respondentAddress)}" oninput="attachKpfLiveUpdate()" style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box">
        </div>
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
        <div>
          <div style="font-size:11px;color:#888;margin-bottom:2px">Punong Barangay / Lupon Chairman</div>
          <input class="wiz-input" id="akpf_chairman" value="${escH(d.chairman)}" oninput="attachKpfLiveUpdate()" style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box">
        </div>
        <div>
          <div style="font-size:11px;color:#888;margin-bottom:2px">Serving Officer (Form 9 Page 2)</div>
          <input class="wiz-input" id="akpf_officer" value="${escH(d.officer)}" oninput="attachKpfLiveUpdate()" style="font-size:12px;padding:5px 8px;width:100%;box-sizing:border-box">
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
  ['form7','form8','form9'].forEach(t=>{
    const tabEl = document.getElementById('akpftab-'+t);
    const active = t===which;
    if(tabEl) tabEl.style.cssText = active
      ? 'cursor:pointer;padding:1px 6px;border-radius:3px;margin-right:4px;background:rgba(255,255,255,0.25);font-weight:700'
      : 'cursor:pointer;padding:1px 6px;border-radius:3px;margin-right:4px';
  });

  // Show/hide Form 7 details section
  const f7details = document.getElementById('akpf-form7-details');
  if(f7details) f7details.style.display = which==='form7' ? 'block' : 'none';

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
    }
    const uri = doc.output('datauristring');
    pane.innerHTML = `<iframe id="attach-kpf-iframe" src="${uri}" style="width:100%;height:100%;border:none"></iframe>`;
    const printBtn = document.getElementById('attach-print-btn');
    if(printBtn){ printBtn.style.display=''; window._attachPrintUrl=uri; window._attachPrintType='pdf'; }
  } catch(e){
    pane.innerHTML = `<div style="color:#aaa;text-align:center;padding:40px"><div style="font-size:40px">⚠️</div><div style="margin-top:10px;font-size:13px">Could not render preview</div></div>`;
  }
}

// Live update the preview whenever a field changes
function attachKpfLiveUpdate(){
  const tab = window._attachKpfCurrentTab||'form7';
  attachKpfRenderPreview(tab);
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
      else if(which==='form9') _fillKpForm9(doc,data);
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
        <div style="font-size:15px;font-weight:700;color:#1a2e4a;margin-bottom:6px;word-break:break-word">${escHtml(a.name)}</div>
        <div style="font-size:12px;color:#9ba3ae;margin-bottom:20px">${a.size?Math.round(a.size/1024)+' KB · ':''}This file type cannot be previewed directly.</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button onclick="window.open(window._attachModalAtts[${idx}].dataUrl,'_blank')" style="padding:10px 20px;background:#1a56a0;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">🔗 Open in New Tab</button>
          <a href="${a.dataUrl}" download="${escHtml(a.name)}" style="padding:10px 20px;background:#1a2e4a;color:#fff;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;display:block">⬇ Download File</a>
        </div>
      </div>
    </div>`;
  }
}

function attachPreview(idx){ attachSelectRow(idx); }

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
        showToast('✅ Form 7 generated and saved to attachments.','success',3500);
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
  // Navigate to full-page case detail
  state.viewCasePage=caseId;
  state.page='dashboard';
  render();
}
function viewCaseLegacy(caseId){
  const sched=state.schedules.filter(s=>s._caseId===c.id||s.caseNo===c.caseNo).sort((a,b)=>(a.schedDate||'').localeCompare(b.schedDate||'')).find(s=>s.schedDate>=todayStr())||null;
  function row(label,val,isRemarks){
    if(val===undefined||val===null)return'';
    if(!val)val='—';
    const valCell=isRemarks
      ?`<div style="font-size:12px;font-weight:600;color:#1a1a1a;flex:1;max-height:80px;overflow-y:auto;overflow-x:hidden;white-space:pre-wrap;word-break:break-word;padding-right:4px">${val}</div>`
      :`<span style="font-size:12px;font-weight:600;color:#1a1a1a;flex:1">${val}</span>`;
    return `<div style="display:flex;gap:0;border-bottom:1px solid #f0f0f0;padding:7px 0"><span style="width:170px;flex-shrink:0;font-size:12px;color:#6b7280;font-weight:500">${label}</span>${valCell}</div>`;
  }
  const attList=(c.attachments||[]).length
    ?`<div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
      ${(c.attachments||[]).map((a,i)=>`
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px">
          <span style="font-size:18px">📄</span>
          <span style="flex:1;font-size:12px;font-weight:600;color:#1a2e4a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(a.name)}">${escHtml(a.name)}</span>
          <span style="font-size:11px;color:#9ba3ae;flex-shrink:0">${a.size?Math.round(a.size/1024)+' KB':''}</span>
          <button onclick="viewAttachments('${c.id}',${i})" style="padding:3px 10px;background:#eef4ff;color:#1a56a0;border:1px solid #c3d8fa;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;flex-shrink:0">👁 View</button>
          <button onclick="removeAttachment('${c.id}',${i})" style="padding:3px 8px;background:#fff5f5;color:#c0392b;border:1px solid #fbbaba;border-radius:5px;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0;line-height:1" title="Remove attachment">×</button>
        </div>`).join('')}
      ${sched?`<div onclick="showKpForms('${sched.id}','${c.id}')" style="display:flex;align-items:center;gap:5px;padding:6px 12px;background:#fff8e1;border:1px solid #ffe082;border-radius:8px;font-size:12px;color:#7c5c00;cursor:pointer;margin-top:2px">📋 KP Forms (Form 7, 8 &amp; 9)</div>`:''}
    </div>`
    :`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">${sched
      ?`<div onclick="showKpForms('${sched.id}','${c.id}')" style="display:flex;align-items:center;gap:5px;padding:6px 12px;background:#fff8e1;border:1px solid #ffe082;border-radius:8px;font-size:12px;color:#7c5c00;cursor:pointer">📋 KP Forms (Form 7, 8 &amp; 9)</div>`
      :''
    }</div>`;
  const schedBlock=sched?`<div style="padding:10px 14px;background:#e0f4f4;border-radius:8px;border:1px solid #b2e0e0;font-size:12px;margin-top:8px">
    <span style="color:#0a9396;font-weight:700">📅 Next Hearing:</span> <strong>${escHtml(sched.schedDate)}</strong> at <strong>${escHtml(sched.schedTime||'—')}</strong>${sched.location?' — '+escHtml(sched.location):''}
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
    const concDeadline = (c._concStartDate) ? new Date(new Date(c._concStartDate+'T00:00:00').getTime()+15*24*60*60*1000).toISOString().slice(0,10) : '';
    const concSettled = concSessions.some(s=>s.outcome==='settled');

    function daysBetween(a,b){if(!a||!b)return null;const ms=new Date(b+'T00:00:00')-new Date(a+'T00:00:00');return Math.round(ms/86400000);}
    function deadlineBadge(deadline, startDate){
      if(!deadline||!startDate) return '';
      const today=todayStr();
      const daysLeft=daysBetween(today,deadline);
      if(daysLeft<0) return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:#fee2e2;color:#b91c1c">⚠ Deadline passed</span>`;
      if(daysLeft===0) return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:#fef3c7;color:#92400e">🔔 Due today</span>`;
      if(daysLeft<=3) return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:#fef3c7;color:#92400e">⏰ ${daysLeft}d left · due ${deadline}</span>`;
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
      const genBtn = `<button onclick="${genFormFn}" style="padding:4px 10px;border-radius:6px;border:1px solid ${isMedPhase?'#c3d8fa':'#c4b5fd'};background:${isMedPhase?'#eef4ff':'#f3e8ff'};color:${isMedPhase?'#1a56a0':'#7c3aed'};font-size:10px;font-weight:600;cursor:pointer;white-space:nowrap">${genFormLabel}</button>`;
      return `<div style="margin-bottom:8px;border:1px solid ${s.outcome==='settled'?'#6ee7b7':s.outcome==='not_settled'?'#fca5a5':'#e5e7eb'};border-radius:9px;overflow:hidden;background:#fff">
        <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:${s.outcome==='settled'?'#f0fdf4':s.outcome==='not_settled'?'#fef2f2':'#f9fafb'};border-bottom:1px solid ${s.outcome==='settled'?'#6ee7b7':s.outcome==='not_settled'?'#fca5a5':'#e5e7eb'}">
          <div style="width:20px;height:20px;border-radius:50%;background:${dotColor};color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0">${i+1}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px">${stepLabel}</div>
            <div style="font-size:11px;font-weight:600;color:#1a1a1a">${s.date||'—'}</div>
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
            <div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;background:${medSettled?'#059669':medActive?'#1a2e4a':'#9ca3af'};color:#fff">${medSettled?'✓':'M'}</div>
            <div>
              <div style="font-size:12px;font-weight:700;color:${medSettled?'#065f46':medActive?'#1a1a1a':'#9ca3af'}">Mediation Phase</div>
              <div style="font-size:10px;color:#9ba3ae">Steps 1–3 · max 3 sessions</div>
            </div>
          </div>
          <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;background:${medSettled?'#d1fae5':medPhaseComplete?'#f3f4f6':medSessions.length>0?'#fef3c7':'#eff6ff'};color:${medSettled?'#065f46':medPhaseComplete?'#6b7280':medSessions.length>0?'#92400e':'#1e40af'}">${medSettled?'Settled':medPhaseComplete?'Ended':medSessions.length+'/3'}</span>
        </div>
        <!-- Deadline badge -->
        ${dateFiled&&medActive?`<div style="margin-bottom:10px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">${deadlineBadge(deadline15,dateFiled)}<span style="font-size:10px;color:#9ba3ae">within 15 days of filing</span></div>`:''}
        <!-- Session cards -->
        ${medSessions.map((s,i)=>sessionCard(s,i,'med')).join('')}
        <!-- Add session button -->
        ${!medSettled&&!medPhaseComplete&&medSessions.length<3?`
          <button onclick="openKpAddSession('${c.id}','med')" style="width:100%;padding:7px;border-radius:8px;border:2px dashed #93c5fd;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:700;cursor:pointer;margin-top:${medSessions.length?'4px':'0'}">＋ Add Session ${medSessions.length+1}/3</button>`:''}
        <!-- Terminal states -->
        ${medPhaseComplete&&!medSettled?`<div style="margin-top:6px;padding:6px 10px;background:#fef3c7;border-radius:7px;font-size:10px;color:#92400e;font-weight:700;display:flex;align-items:center;gap:5px">⟶ All 3 sessions done — proceeding to Conciliation</div>`:''}
        ${medSettled?`<div style="margin-top:6px;padding:6px 10px;background:#d1fae5;border-radius:7px;font-size:10px;color:#065f46;font-weight:700;display:flex;align-items:center;gap:5px">✓ Dispute resolved at Mediation</div>`:''}
      </div>`;

    // ── CONCILIATION PHASE (Steps 4–7) ──
    const concHtml = `
      <div style="padding:12px 14px;background:${concSettled?'#f0fdf4':!concPhaseActive?'#f9fafb':'#fff'}">
        <!-- Phase header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${concPhaseActive?'8px':'4px'}">
          <div style="display:flex;align-items:center;gap:7px">
            <div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;background:${concSettled?'#059669':concPhaseActive?'#1a2e4a':'#d1d5db'};color:${concPhaseActive||concSettled?'#fff':'#9ca3af'}">${concSettled?'✓':'C'}</div>
            <div>
              <div style="font-size:12px;font-weight:700;color:${concSettled?'#065f46':concPhaseActive?'#1a1a1a':'#9ca3af'}">Conciliation Phase</div>
              <div style="font-size:10px;color:#9ba3ae">Steps 4–7 · max 3 sessions</div>
            </div>
          </div>
          <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;background:${concSettled?'#d1fae5':!concPhaseActive?'#f3f4f6':concSessions.length>0?'#fef3c7':'#eff6ff'};color:${concSettled?'#065f46':!concPhaseActive?'#9ca3af':concSessions.length>0?'#92400e':'#1e40af'}">${concSettled?'Settled':!concPhaseActive?'Locked':concSessions.length+'/3'}</span>
        </div>
        ${!concPhaseActive?`<div style="font-size:11px;color:#9ba3ae;padding:4px 0 2px;display:flex;align-items:center;gap:5px">🔒 Unlocks after mediation fails (3 sessions unsettled)</div>`:`
          <!-- Deadline badge -->
          ${concDeadline?`<div style="margin-bottom:10px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">${deadlineBadge(concDeadline,c._concStartDate)}<span style="font-size:10px;color:#9ba3ae">within 15 days of 1st conciliation</span></div>`:''}
          <!-- Session cards -->
          ${concSessions.map((s,i)=>sessionCard(s,i,'conc')).join('')}
          <!-- Add session button -->
          ${!concSettled&&concSessions.length<3?`
            <button onclick="openKpAddSession('${c.id}','conc')" style="width:100%;padding:7px;border-radius:8px;border:2px dashed #93c5fd;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:700;cursor:pointer;margin-top:${concSessions.length?'4px':'0'}">＋ Add Session ${concSessions.length+1}/3</button>`:''}
          <!-- Terminal states -->
          ${concSessions.length>=3&&!concSettled?`<div style="margin-top:6px;padding:6px 10px;background:#fee2e2;border-radius:7px;font-size:10px;color:#b91c1c;font-weight:700;display:flex;align-items:center;gap:5px">⚠ 3 sessions done — issue CFA or dismiss</div>`:''}
          ${concSettled?`<div style="margin-top:6px;padding:6px 10px;background:#d1fae5;border-radius:7px;font-size:10px;color:#065f46;font-weight:700;display:flex;align-items:center;gap:5px">✓ Dispute resolved at Conciliation</div>`:''}
        `}
      </div>`;

    // ── Form 7 print row ──
    const form7Row = `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #e5e7eb;background:#fffbeb">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:#fef3c7;color:#92400e">Form 7</span>
        <span style="font-size:11px;font-weight:600;color:#1a1a1a">Complaint filed</span>
      </div>
      <button onclick="viewCaseOpenForm7('${c.id}')" style="padding:3px 10px;background:#eef4ff;color:#1a56a0;border:1px solid #c3d8fa;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer">🖨️ Print</button>
    </div>`;

    return `<div style="width:300px;flex-shrink:0;border-left:2px solid #e5e7eb;display:flex;flex-direction:column;overflow:hidden;background:#f8fafc;border-radius:0 0 14px 0">
      <div style="padding:10px 14px 8px;border-bottom:2px solid #e5e7eb;flex-shrink:0;background:#1a2e4a">
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
          <div style="font-size:16px;font-weight:700;color:#fff">📋 ${escHtml(c.caseNo||'—')}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.65);margin-top:2px">${escHtml(c.complainant||'')}${c.respondent?' vs '+escHtml(c.respondent):''}</div>
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
          ${row('Date Filed',escHtml(c.dateFiled||''))}
          ${row('Time Filed',escHtml(formatTime12(c.timeFiled||'')))}
          <div style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.8px;margin:14px 0 10px">Parties</div>
          ${row('Complainant',escHtml(c.complainant||''))}
          ${row('Complainant Address',escHtml(c.complainantAddress||''))}
          ${row('Complainant Contact',escHtml(c.complainantContact||''))}
          ${row('Respondent',escHtml(c.respondent||''))}
          ${row('Respondent Address',escHtml(c.respondentAddress||''))}
          ${row('Respondent Contact',escHtml(c.respondentContact||''))}
          <div style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.8px;margin:14px 0 10px">Case Details</div>
          ${row('Case Title',escHtml(c.caseTitle||''))}
          ${row('Nature of Case',escHtml(c.nature||c.type||'—'))}
          ${row('Action Taken',escHtml(c.actionTaken||''))}
          <div style="display:flex;gap:0;border-bottom:1px solid #f0f0f0;padding:7px 0"><span style="width:170px;flex-shrink:0;font-size:12px;color:#6b7280;font-weight:500">Status</span>${statusBadge(c.status)}</div>
          ${row('Date of Confrontation',escHtml(c.dateConfrontation||''))}
          ${row('Date of Settlement',escHtml(c.dateResolved||''))}
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
        <button onclick="document.getElementById('view-case-modal-root').remove();openSchedulesModal('${c.id}')" style="padding:7px 16px;background:#0a9396;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px">📅 Add Hearing</button>
        ${sched
          ?`<button onclick="showKpForms('${sched.id}','${c.id}')" style="padding:7px 16px;background:#7c5c00;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px">📋 KP Forms (7, 8 &amp; 9)</button>`
          :`<button onclick="viewCaseOpenForm7('${c.id}')" style="padding:7px 16px;background:#0a9396;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px">🖨️ Print Forms</button>`}
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
      <div style="padding:14px 20px;background:#1a2e4a;display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:14px;font-weight:700;color:#fff">📅 Add ${phaseLabel} Session ${num}/3</div>
        <button onclick="document.getElementById('kp-session-modal').remove()" style="border:none;background:rgba(255,255,255,0.15);color:#fff;font-size:16px;cursor:pointer;padding:2px 8px;border-radius:5px">×</button>
      </div>
      <div style="padding:18px 20px;display:flex;flex-direction:column;gap:12px">
        <div>
          <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:4px">Session Date</label>
          <input type="date" id="kps_date" value="${todayStr()}" style="width:100%;padding:9px 11px;border:1px solid #ddd;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:4px">Notes <span style="font-weight:400;color:#9ba3ae">(optional)</span></label>
          <input type="text" id="kps_notes" placeholder="e.g. Parties appeared, no agreement reached" style="width:100%;padding:9px 11px;border:1px solid #ddd;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box">
        </div>
      </div>
      <div style="padding:12px 20px;border-top:1px solid #eee;display:flex;justify-content:flex-end;gap:8px;background:#f9fafb">
        <button onclick="document.getElementById('kp-session-modal').remove()" style="padding:8px 16px;border-radius:7px;border:1px solid #ddd;background:#fff;font-size:13px;cursor:pointer;color:#6b7280">Cancel</button>
        <button onclick="saveKpSession('${caseId}','${phase}')" style="padding:8px 18px;border-radius:7px;border:none;background:#1a2e4a;color:#fff;font-size:13px;font-weight:600;cursor:pointer">Save Session</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}
function saveKpSession(caseId, phase){
  const c=state.cases.find(x=>x.id===caseId); if(!c)return;
  const dateEl=document.getElementById('kps_date');
  const notesEl=document.getElementById('kps_notes');
  const date=(dateEl&&dateEl.value)||todayStr();
  const notes=(notesEl&&notesEl.value.trim())||'';
  const isConc=phase==='conc';
  if(isConc){
    if(!c._concSessions)c._concSessions=[];
    if(!c._concStartDate)c._concStartDate=date;
    c._concSessions.push({date,notes,outcome:'pending'});
  } else {
    if(!c._medSessions)c._medSessions=[];
    c._medSessions.push({date,notes,outcome:'pending'});
    // Auto-set dateConfrontation to first mediation session date
    if(c._medSessions.length===1 && !c.dateConfrontation){
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
      <div style="padding:14px 20px;background:#1a2e4a;display:flex;align-items:center;justify-content:space-between">
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
    showToast('Case marked as Settled! 🎉','success');
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
        <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:4px">${title}</div>
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
    <div style="background:#fff;border-radius:14px;width:460px;max-width:95vw;box-shadow:0 16px 48px rgba(0,0,0,0.28);overflow:hidden">
      <!-- Header -->
      <div style="background:#059669;padding:16px 20px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:15px;font-weight:700;color:#fff">✅ Mark as Settled</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:2px">${phaseLabel} — Session ${sessionNum}</div>
        </div>
        <button onclick="document.getElementById('settlement-upload-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center" onmouseover="this.style.background='rgba(255,255,255,0.32)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">✕</button>
      </div>
      <!-- Body -->
      <div style="padding:20px 22px">
        <div style="background:#f0fdf4;border:1px solid #6ee7b7;border-radius:8px;padding:11px 14px;font-size:12px;color:#065f46;line-height:1.55;margin-bottom:18px">
          📋 Please upload the <strong>Amicable Settlement document</strong> (e.g. signed agreement, Form 16, or equivalent). This will be saved as an attachment to the case.
        </div>

        <!-- Upload area -->
        <div style="margin-bottom:14px">
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:8px">Amicable Settlement Document <span style="color:#6b7280;font-weight:400">(optional — you can upload later)</span></label>
          <div id="settlement-drop-zone" style="border:2px dashed #6ee7b7;border-radius:10px;padding:24px;text-align:center;cursor:pointer;background:#f9fefb;transition:background 0.15s"
            onclick="document.getElementById('settlement-file-input').click()"
            ondragover="event.preventDefault();this.style.background='#ecfdf5';this.style.borderColor='#059669'"
            ondragleave="this.style.background='#f9fefb';this.style.borderColor='#6ee7b7'"
            ondrop="handleSettlementDrop(event)">
            <div style="font-size:28px;margin-bottom:6px">📄</div>
            <div style="font-size:13px;font-weight:600;color:#065f46">Click to upload or drag & drop</div>
            <div style="font-size:11px;color:#6b7280;margin-top:3px">PDF, DOCX, JPG, PNG accepted</div>
          </div>
          <input type="file" id="settlement-file-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="display:none" onchange="handleSettlementFileSelect(this)">
          <div id="settlement-file-preview" style="display:none;margin-top:10px;padding:10px 14px;background:#f0fdf4;border:1px solid #6ee7b7;border-radius:8px;display:none;align-items:center;gap:10px">
            <span style="font-size:22px">📎</span>
            <div style="flex:1;min-width:0">
              <div id="settlement-file-name" style="font-size:13px;font-weight:600;color:#065f46;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div>
              <div id="settlement-file-size" style="font-size:11px;color:#6b7280"></div>
            </div>
            <button onclick="clearSettlementFile()" style="border:none;background:none;color:#dc2626;font-size:18px;cursor:pointer;line-height:1;padding:0 4px" title="Remove file">×</button>
          </div>
        </div>

        ${isChange?`<div style="font-size:11px;color:#92400e;background:#fff8e1;border:1px solid #fde68a;border-radius:6px;padding:8px 12px;margin-bottom:14px">⚠️ This will override the existing outcome for this session.</div>`:''}
      </div>
      <!-- Footer -->
      <div style="padding:14px 20px;border-top:1px solid #f0f2f5;display:flex;justify-content:flex-end;gap:8px;background:#fafafa">
        <button onclick="document.getElementById('settlement-upload-modal').remove()" style="padding:9px 18px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;color:#374151;font-size:13px;font-weight:600;cursor:pointer" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='#fff'">Cancel</button>
        <button onclick="confirmSettlement('${caseId}','${phase}',${idx})" style="padding:9px 22px;border-radius:8px;border:none;background:#059669;color:#fff;font-size:13px;font-weight:700;cursor:pointer" onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">✅ Confirm Settled</button>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  window._settlementFile = null;
}

function handleSettlementFileSelect(input){
  if(input.files&&input.files[0]) applySettlementFile(input.files[0]);
}
function handleSettlementDrop(e){
  e.preventDefault();
  const dz=document.getElementById('settlement-drop-zone');
  if(dz){dz.style.background='#f9fefb';dz.style.borderColor='#6ee7b7';}
  const f=e.dataTransfer.files[0];
  if(f) applySettlementFile(f);
}
function applySettlementFile(file){
  window._settlementFile=file;
  const prev=document.getElementById('settlement-file-preview');
  const nm=document.getElementById('settlement-file-name');
  const sz=document.getElementById('settlement-file-size');
  if(prev){prev.style.display='flex';}
  if(nm) nm.textContent=file.name;
  if(sz) sz.textContent=file.size?(Math.round(file.size/1024)+' KB'):'';
}
function clearSettlementFile(){
  window._settlementFile=null;
  const inp=document.getElementById('settlement-file-input');
  if(inp)inp.value='';
  const prev=document.getElementById('settlement-file-preview');
  if(prev)prev.style.display='none';
}

function confirmSettlement(caseId, phase, idx){
  const file=window._settlementFile||null;
  const proceed=()=>{
    document.getElementById('settlement-upload-modal').remove();
    kpSetSessionOutcomeInline(caseId, phase, parseInt(idx), 'settled');
  };
  if(file){
    const reader=new FileReader();
    reader.onload=e=>{
      const c=state.cases.find(x=>x.id===caseId);
      if(c){
        if(!c.attachments) c.attachments=[];
        const now=new Date().toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'});
        const phaseLabel=phase==='conc'?'Lupon':'Mediation';
        c.attachments.push({
          name:`Amicable Settlement — ${phaseLabel} Session ${parseInt(idx)+1} (${now})`,
          dataUrl:e.target.result,
          size:file.size,
          _generated:false,
          _settlement:true
        });
        saveData('ltia_cases',state.cases);
      }
      proceed();
    };
    reader.readAsDataURL(file);
  } else {
    proceed();
  }
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
    showToast('Case marked as Settled! 🎉','success');
  } else {
    // If un-settling (changing from settled back), revert case status
    if(c.status==='Settled'){
      const stillSettled=(isConc?(c._concSessions||[]):(c._medSessions||[])).some((s,i)=>i!==idx&&s.outcome==='settled');
      if(!stillSettled) c.status='Ongoing';
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
  const windowStart = isConc
    ? (c._concStartDate || todayStr())
    : (c.dateFiled || todayStr());
  // Window end = windowStart + 14 days (15 days inclusive)
  function addDays(ds,n){ const d=new Date(ds+'T00:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
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
    const colors=['#3b82f6','#8b5cf6','#0a9396'];
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
    const colors=['#3b82f6','#8b5cf6','#0a9396'];
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
      if(isDeadline && inWindow){ bg='#fef3c7'; txtColor='#92400e'; fw='700'; border=`2px solid #f59e0b`; }
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
        <span style="font-size:13px;font-weight:700;color:#1a2e4a">${MONTHS[mo]} ${yr}</span>
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
        <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#374151"><div style="width:12px;height:12px;border-radius:3px;background:#fef3c7;border:2px solid #f59e0b"></div>Deadline (Day 15)</div>
        <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#374151"><div style="width:12px;height:12px;border-radius:3px;background:${color};border:2px solid ${color}"></div>Selected date</div>
        <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#374151"><div style="width:12px;height:12px;border-radius:3px;background:#e0e7ff;border:1px solid #a5b4fc"></div>Another session</div>
        <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#374151"><div style="width:12px;height:12px;border-radius:3px;opacity:0.3;background:#9ba3ae"></div>Outside window</div>
      </div>
      <!-- Window info -->
      <div style="padding:6px 12px 10px;font-size:11px;color:#6b7280;background:#f9fafb">
        📅 15-day window: <strong>${st.windowStart}</strong> → <strong>${st.windowEnd}</strong>
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
    const colors=['#3b82f6','#8b5cf6','#0a9396'];
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
      if(isDeadline && inWindow){ bg='#fef3c7'; txtColor='#92400e'; fw='700'; border=`2px solid #f59e0b`; }
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
        <span style="font-size:12px;font-weight:700;color:#1a2e4a;text-transform:uppercase;letter-spacing:0.4px">${labels[idx]} — Pick a Date</span>
      </div>
      <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#fff;flex:1;display:flex;flex-direction:column">
        <!-- Cal header -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;flex-shrink:0">
          <button onclick="kpsCalNav(-1,${idx})" style="border:none;background:#e5e7eb;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:13px;color:#374151;font-weight:600" title="Previous month">‹ ${prevLabel}</button>
          <span style="font-size:13px;font-weight:700;color:#1a2e4a">${MONTHS[mo]} ${yr}</span>
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
          <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#374151"><div style="width:12px;height:12px;border-radius:3px;background:#fef3c7;border:2px solid #f59e0b"></div>Deadline</div>
          <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#374151"><div style="width:12px;height:12px;border-radius:3px;background:${color};border:2px solid ${color}"></div>Selected</div>
          <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#374151"><div style="width:12px;height:12px;border-radius:3px;background:#e0e7ff;border:1px solid #a5b4fc"></div>Other session</div>
        </div>
        <!-- Window info -->
        <div style="padding:6px 12px 10px;font-size:11px;color:#6b7280;background:#f9fafb;flex-shrink:0">
          📅 15-day window: <strong>${st.windowStart}</strong> → <strong>${st.windowEnd}</strong>
        </div>
      </div>
    </div>`;
  }

  return `<div id="kp-sched1-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:700;display:flex;align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)this.remove()">
    <div style="background:#fff;border-radius:14px;width:860px;max-width:98vw;height:${st.isConc?'680px':'600px'};display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.28);overflow:hidden">
      <!-- Header -->
      <div style="padding:14px 20px;background:#1a2e4a;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
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
            <div style="font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">⚖️ Pangkat Members</div>
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
            ? `<button onclick="kpSaveEditSchedule()" style="padding:8px 18px;border-radius:7px;border:none;background:#92400e;color:#fff;font-size:13px;font-weight:600;cursor:pointer">✏️ Update Schedule</button>`
            : `<button onclick="kpSaveAutoSchedule()" ${!allSet?'disabled title="Select dates for all 3 sessions"':''} style="padding:8px 18px;border-radius:7px;border:none;background:${allSet?'#1a2e4a':'#9ba3ae'};color:#fff;font-size:13px;font-weight:600;cursor:${allSet?'pointer':'not-allowed'}">✅ Save All 3 Sessions</button>`
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
    if(!c._concStartDate)c._concStartDate=st.dates[0];
    // Save Pangkat members entered in the scheduling modal
    if(st.pangkatChair)    c._pangkatChair    = st.pangkatChair;
    if(st.pangkatSecretary)c._pangkatSecretary = st.pangkatSecretary;
    if(st.pangkatMember)   c._pangkatMember   = st.pangkatMember;
  } else {
    c._medSessions=sessions;
    // Auto-set dateConfrontation to the first mediation session date
    if(!c.dateConfrontation && st.dates[0]){
      c.dateConfrontation = st.dates[0];
    }
  }
  saveData('ltia_cases',state.cases);
  document.getElementById('kp-sched1-modal').remove();
  window._kpsState=null;
  showToast(`✅ All 3 ${st.isConc?'Conciliation':'Mediation'} sessions scheduled!`,'success',4000);
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
  const windowStart = isConc ? (c._concStartDate||c.dateFiled||s.date) : (c.dateFiled||s.date);
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
  }
  saveData('ltia_cases',state.cases);
  document.getElementById('kp-sched1-modal').remove();
  window._kpsState=null;
  showToast('✅ Session schedule updated!','success',3000);
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
    lupons: [c._pangkatChair||'', c._pangkatSecretary||'', c._pangkatMember||''].filter(Boolean)
  };

  // Build Form 11 (3 copies, one per pangkat member)
  const pangkatMembers = [
    { role:'Pangkat Chairman',   name: data.pangkatChair     || '____________________________' },
    { role:'Pangkat Secretary',  name: data.pangkatSecretary || '____________________________' },
    { role:'Pangkat Member',     name: data.pangkatMember    || '____________________________' }
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
  showToast('✅ Forms 11, 12 & 9 saved to Attachments!', 'success', 3000);
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
  showToast('✅ Forms saved to Attachments!','success',3000);
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
  doc.text('Barangay  PANGABUGAN', W/2, y, {align:'center'});
  const bw=_tw(doc,'Barangay  PANGABUGAN');
  doc.line(W/2-bw/2, y+1.2, W/2+bw/2, y+1.2);
  y+=KP_LH+8;
  doc.setFontSize(KP_FONT_TITLE); doc.setFont(KP_FONT,'bold');
  doc.text('OFFICE OF THE LUPONG TAGAPAMAYAPA', W/2, y, {align:'center'}); y+=KP_LH+8;

  // Two-column case header
  const rightCol=W/2+8;
  doc.setFontSize(KP_FONT_BASE); doc.setFont(KP_FONT,'bold');
  const compName=(d.complainant||'').toUpperCase();
  doc.text(compName, ml, y);
  doc.line(ml, y+1.2, ml+70, y+1.2);

  // Right: Barangay Case No.
  doc.setFont(KP_FONT,'normal');
  const filedStr=filedDt?`${filedDt.getMonth()+1}-${filedDt.getDate()}-${filedDt.getFullYear()}`:'';
  doc.text('Barangay Case No. '+(d.caseNo||''), rightCol, y);
  doc.line(rightCol+_tw(doc,'Barangay Case No. '), y+1.2, W-mr, y+1.2);
  y+=KP_LH;

  doc.setFont(KP_FONT,'normal');
  doc.text(d.complainantAddress||'', ml, y);
  doc.line(ml, y+1.2, ml+70, y+1.2);
  doc.text('For: '+(d.caseTitle||''), rightCol, y);
  doc.line(rightCol+_tw(doc,'For: '), y+1.2, W-mr, y+1.2);
  y+=KP_LH;

  doc.text('Butuan City', ml, y);
  doc.line(ml, y+1.2, ml+70, y+1.2);
  doc.text('DE:-'+(filedStr), rightCol, y);
  doc.line(rightCol+_tw(doc,'DE:-'), y+1.2, W-mr, y+1.2);
  y+=KP_LH;
  doc.text('Complainant/s', ml, y);
  const tf='TF: '+(d.timeFiled||'');
  doc.text(tf, rightCol, y);
  y+=KP_LH;
  doc.text('   - against', ml, y); y+=KP_LH+4;

  doc.setFont(KP_FONT,'bold');
  const respName=(d.respondent||'').toUpperCase();
  doc.text(respName, ml, y);
  doc.line(ml, y+1.2, ml+70, y+1.2);
  y+=KP_LH;
  doc.setFont(KP_FONT,'normal');
  doc.text(d.respondentAddress||'', ml, y);
  doc.line(ml, y+1.2, ml+70, y+1.2);
  y+=KP_LH;
  doc.text('Respondent/s', ml, y); y+=KP_LH+10;

  // Title
  doc.setFontSize(KP_FONT_TITLE); doc.setFont(KP_FONT,'bold');
  doc.text('NOTICE TO CHOSEN PANGKAT MEMBERS', W/2, y, {align:'center'}); y+=KP_LH+8;

  // Date issued line
  doc.setFontSize(KP_FONT_BASE); doc.setFont(KP_FONT,'normal');
  const issuedMon = filedDt ? `${filedDt.getMonth()+1}-${filedDt.getDate()}-${filedDt.getFullYear()}` : '';
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
  doc.text(lines, ml, y, {align:'justify'}); y+=lines.length*KP_LH+16;

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
  doc.text('Barangay PANGABUGAN', W/2, y, {align:'center'});
  const bw=_tw(doc,'Barangay PANGABUGAN');
  doc.line(W/2-bw/2, y+1.2, W/2+bw/2, y+1.2);
  y+=KP_LH+8;
  doc.setFontSize(KP_FONT_TITLE); doc.setFont(KP_FONT,'bold');
  doc.text('OFFICE OF THE LUPONG TAGAPAMAYAPA', W/2, y, {align:'center'}); y+=KP_LH+8;

  // Right-side case info block
  doc.setFontSize(KP_FONT_BASE); doc.setFont(KP_FONT,'normal');
  const rightCol2=W/2+8;
  const filedStr=filedDt?`${filedDt.getMonth()+1}-${filedDt.getDate()}-${filedDt.getFullYear()}`:'';
  doc.text('DF: '+filedStr, rightCol2, y); y+=KP_LH;
  doc.text('Barangay Case No. '+(d.caseNo||''), rightCol2, y); y+=KP_LH;
  doc.text('For: '+(d.caseTitle||''), rightCol2, y); y+=KP_LH;
  doc.text('_TF: '+(d.timeFiled||''), rightCol2, y); y+=KP_LH+4;

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
  const sTime=d.schedTime||'____';
  const isAM=!/pm/i.test(sTime);

  px=ml;
  doc.text('You are hereby required to appear before the Pangkat on the ', px, y);
  px+=_tw(doc,'You are hereby required to appear before the Pangkat on the ');
  px=_utext(doc,sDay,px,y,[0,0,0]);
  doc.setTextColor(0,0,0); doc.text(' day of ', px, y); px+=_tw(doc,' day of ');
  px=_utext(doc,sMon,px,y,[0,0,0]);
  doc.setTextColor(0,0,0); doc.text(' ', px, y); px+=_tw(doc,' ');
  px=_utext(doc,sYr,px,y,[0,0,0]);
  doc.setTextColor(0,0,0); doc.text(' at ', px, y); px+=_tw(doc,' at ');
  px=_utext(doc,sTime,px,y,[0,0,0]);
  y+=KP_LH;
  px=ml;
  doc.text("o'clock in the ", px, y); px+=_tw(doc,"o'clock in the ");
  if(isAM){ px=_utext(doc,'morning',px,y,[0,0,0]); doc.setTextColor(0,0,0); doc.text('/afternoon for the hearing of the above-titled case.',px,y); }
  else { doc.text('morning/',px,y); px+=_tw(doc,'morning/'); px=_utext(doc,'afternoon',px,y,[0,0,0]); doc.setTextColor(0,0,0); doc.text(' for the hearing of the above-titled case.',px,y); }
  y+=KP_LH+6;

  // "This ___ day of ..."
  const issuedDt=filedDt;
  const issuedDay=issuedDt?String(issuedDt.getDate()):'___';
  const issuedMon=issuedDt?MONTHS[issuedDt.getMonth()].toUpperCase():'___';
  const issuedYr2=issuedDt?String(issuedDt.getFullYear()).slice(-2):'__';
  px=ml;
  doc.text('This ', px, y); px+=_tw(doc,'This ');
  px=_utext(doc,issuedDay,px,y,[0,0,0]);
  doc.setTextColor(0,0,0); doc.text('      day of ', px, y); px+=_tw(doc,'      day of ');
  px=_utext(doc,issuedMon,px,y,[0,0,0]);
  doc.setTextColor(0,0,0); doc.text(', 20', px, y); px+=_tw(doc,', 20');
  px=_utext(doc,issuedYr2,px,y,[0,0,0]);
  doc.setTextColor(0,0,0); doc.text('.', px, y); y+=KP_LH+16;

  // Pangkat Chairman signature (right)
  const chairName = (d.pangkatChair||'Mrs. Maria Elvira L. Rosales').toUpperCase();
  doc.setFont(KP_FONT,'bold');
  doc.text(chairName, W-mr, y, {align:'right'});
  doc.line(W-mr-_tw(doc,chairName)-4, y+1.2, W-mr, y+1.2); y+=KP_LH;
  doc.setFont(KP_FONT,'normal');
  doc.text('Pangkat Chairman', W-mr, y, {align:'right'}); y+=KP_LH+10;

  // Secretary and Member row
  const secName =(d.pangkatSecretary||'').toUpperCase();
  const memName =(d.pangkatMember||'').toUpperCase();
  const colW=cw/2;
  doc.setFont(KP_FONT,'bold');
  if(secName){ doc.text(secName, ml, y); doc.line(ml, y+1.2, ml+_tw(doc,secName), y+1.2); }
  if(memName){ doc.text(memName, ml+colW+10, y); doc.line(ml+colW+10, y+1.2, ml+colW+10+_tw(doc,memName), y+1.2); }
  y+=KP_LH;
  doc.setFont(KP_FONT,'normal');
  if(secName) doc.text('Pangkat Secretary', ml, y);
  if(memName) doc.text('Pangkat Member', ml+colW+10, y); y+=KP_LH+10;

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

  // Complainant / Respondent signature lines
  doc.setFont(KP_FONT,'normal');
  doc.text('Complainant/s', ml, y); doc.text('Respondent/s', ml+colW+10, y); y+=KP_LH+2;
  doc.setFont(KP_FONT,'bold');
  doc.text(compName, ml, y); doc.line(ml, y+1.2, ml+_tw(doc,compName), y+1.2);
  doc.text(respName, ml+colW+10, y); doc.line(ml+colW+10, y+1.2, ml+colW+10+_tw(doc,respName), y+1.2);
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
  showToast('✅ Forms 8 & 9 saved to Attachments!', 'success', 3000);
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
    t8.style.borderBottom='3px solid #1a2e4a'; t8.style.color='#1a2e4a'; t8.style.fontWeight='700';
    t9.style.borderBottom='3px solid transparent'; t9.style.color='#6b7280'; t9.style.fontWeight='600';
  } else {
    f8.style.display='none'; f9.style.display='block';
    t9.style.borderBottom='3px solid #1a2e4a'; t9.style.color='#1a2e4a'; t9.style.fontWeight='700';
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
  showToast('✅ Forms saved to Attachments!', 'success', 3000);
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
    ${cR.map(c=>`<div class="result-item" onclick="openWizard('${c.id}')">
      <span class="result-tag" style="background:#eaf6e8;color:#2d7a3a">Complaint</span>
      <div class="result-main">${escHtml(c.caseNo)} — ${escHtml(c.type||'')}</div>
      <div class="result-sub">${escHtml(c.complainant||'')} vs ${escHtml(c.respondent||'')} · ${statusBadge(c.status)}</div>
    </div>`).join('')}
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
    try{const dr=localStorage.getItem('ltia_draft');if(dr){const parsed=JSON.parse(dr);draftRef={caseNo:parsed.caseNo,dateFiled:parsed.dateFiled,timeFiled:parsed.timeFiled};}}catch(e){}
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
function clearDraft(){try{localStorage.removeItem('ltia_draft');}catch(e){}state.wizard.data={caseNo:genCaseNo(),dateFiled:todayStr()};render();}

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
    try{localStorage.removeItem('ltia_draft');}catch(e){}
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
          <div style="font-size:15px;font-weight:700;color:#1a1a1a">${title}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px">Add or remove ${isTitle?'case title':'action taken'} options</div>
        </div>
        <button onclick="document.getElementById('manage-opts-modal-root').remove()" style="border:none;background:#f0f2f5;font-size:17px;cursor:pointer;color:#6b7280;line-height:1;padding:5px 10px;border-radius:8px;font-weight:700;transition:all 0.15s" onmouseover="this.style.background='#e5e7eb';this.style.color='#1a1a1a'" onmouseout="this.style.background='#f0f2f5';this.style.color='#6b7280'">✕</button>
      </div>
      <!-- Success banner -->
      <div id="mopt-success-banner" style="display:none;margin:10px 16px 0;padding:9px 14px;background:#eaf6e8;border:1px solid #b7dfb8;border-radius:8px;font-size:13px;font-weight:600;color:#2d7a3a;transition:opacity 0.35s"></div>
      <!-- Confirm overlay (centered in modal) -->
      <div id="mopt-confirm-banner" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,0.38);z-index:10;align-items:center;justify-content:center;border-radius:14px">
        <div style="background:#fff;border-radius:12px;width:320px;max-width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.22);padding:22px 22px 18px;text-align:center">
          <div style="font-size:26px;margin-bottom:10px">⚠️</div>
          <div style="font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:6px">Confirm Removal</div>
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
          <div style="font-size:11px;font-weight:700;color:#0a9396;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">＋ Add New Option</div>
          <div style="display:flex;gap:8px">
            <input type="text" id="mopt-new-input" placeholder="Enter ${isTitle?'case title':'action taken'}..." style="flex:1;padding:8px 11px;border:1px solid #ddd;border-radius:8px;font-size:13px;outline:none;transition:border-color 0.15s" onfocus="this.style.borderColor='#0a9396'" onblur="this.style.borderColor='#ddd'" onkeydown="if(event.key==='Enter')moptAdd()">
            <button type="button" onclick="moptAdd()" style="padding:8px 18px;background:#0a9396;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background 0.15s" onmouseover="this.style.background='#077a7d'" onmouseout="this.style.background='#0a9396'">Add</button>
          </div>
        </div>
      </div>
      <!-- Footer -->
      <div style="padding:12px 16px;border-top:1px solid #f0f0f0;display:flex;justify-content:flex-end;background:#f9fafb;flex-shrink:0">
        <button onclick="document.getElementById('manage-opts-modal-root').remove()" style="padding:8px 22px;border-radius:8px;background:#1a2e4a;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer">Done</button>
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
    listEl.innerHTML=files.map((f,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:#f0f7ff;border:1px solid #c3d8fa;border-radius:7px;margin-bottom:6px">
      <span style="font-size:16px">📄</span>
      <span style="flex:1;font-size:12px;font-weight:600;color:#1a2e4a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.name}</span>
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
      <div style="background:linear-gradient(135deg,#1a2e4a,#2d4f7c);padding:18px 22px;display:flex;align-items:center;justify-content:space-between">
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
        <div style="border:2px dashed #93c5fd;border-radius:10px;padding:18px 16px;background:#f0f7ff;cursor:pointer;text-align:center;margin-bottom:12px" onclick="document.getElementById('srem-file-input').click()">
          <input type="file" id="srem-file-input" multiple accept=".pdf" style="display:none" onchange="sremHandleUpload(this)">
          <div style="font-size:28px;margin-bottom:6px">📎</div>
          <div style="font-size:13px;font-weight:600;color:#1a56a0">Click to upload KP Forms</div>
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
      <button onclick="clearDraft()" style="margin-left:auto;border:none;background:none;color:#9a6200;cursor:pointer;font-size:12px">✕ Clear</button>
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
          <div class="wiz-group"><label class="wiz-lbl">Full Name</label><input class="wiz-input" id="w_cName" value="${escHtml(data.complainantName||data.complainant||'')}" placeholder="e.g Juan Dela Cruz" oninput="wizAutoSave()"></div>
          <div class="wiz-group"><label class="wiz-lbl">Contact No.</label><input class="wiz-input" id="w_cContact" value="${escHtml(data.complainantContact||'')}" placeholder="e.g 09XXXXXXXXX" oninput="wizAutoSave()"></div>
        </div>
        <div class="wiz-group"><label class="wiz-lbl">Address</label><input class="wiz-input" id="w_cAddress" value="${escHtml(data.complainantAddress||'')}" placeholder="Block, Lot, Street, Barangay" oninput="wizAutoSave()"></div>
      </div>
      <div class="wiz-party">
        <div class="party-badge"><div class="party-avatar r">R</div><span class="party-tag r">Respondent</span></div>
        <div class="wiz-row">
          <div class="wiz-group"><label class="wiz-lbl">Full Name</label><input class="wiz-input" id="w_rName" value="${escHtml(data.respondentName||data.respondent||'')}" placeholder="e.g Juan Dela Cruz" oninput="wizAutoSave()"></div>
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
            ${(data.attachments||[]).map((f,i)=>`<div style="display:flex;align-items:center;gap:5px;padding:4px 9px;background:#e8f0fe;border-radius:6px;font-size:12px;color:#1a56a0">
              <span>📄</span><span>${escHtml(f.name)}</span>
              <button onclick="removeWizAttachment(${i})" style="border:none;background:none;color:#888;cursor:pointer;font-size:13px;padding:0 2px;line-height:1">×</button>
            </div>`).join('')}
          </div>`:''}
        </div>
      </div>
    </div>
    <div style="padding:10px 14px;background:#f0f7ff;border:1px solid #c3d8fa;border-radius:8px;font-size:12px;color:#1a56a0">
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
        <span class="wiz-step-lbl">Step ${step} of 3${!w.editId?` &nbsp;<span id="wiz-autosave-ind" style="font-size:11px;color:#2d7a3a;opacity:0;transition:opacity 0.4s"></span>`:''}</span>
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
  let status = 'Settled';
  if (d.outcome && d.outcome.toLowerCase().includes('cfa')) status = 'CFA';
  else if (d.outcome && d.outcome.toLowerCase().includes('ongoing')) status = 'Ongoing';
  const isEdit = !!d._editId;
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
    actionTaken: d.actionTaken || ((d.mediationDate && d.conciliationDate) ? 'Conciliation' : (d.mediationDate ? 'Mediation' : (d.conciliationDate ? 'Conciliation' : ''))),
    dateConfrontation: d.mediationDate || '',
    dateResolved: d.dateOfOutcome || '',
    status: status,
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
  state.archiveModal = null;
  render();
  showToast(isEdit ? 'Archived case updated successfully!' : 'Archived case record saved successfully!', 'success');
}

// ── View modal for archived cases ──────────────────────────────────────────
function viewArchiveCase(caseId) {
  const c = state.cases.find(x => x.id === caseId);
  if (!c) return;
  const existing = document.getElementById('arc-view-modal-root');
  if (existing) existing.remove();

  // ── helpers identical to viewCase ──────────────────────────────────────────
  function row(label, val, isRemarks) {
    if (val === undefined || val === null) return '';
    if (!val) val = '—';
    const valCell = isRemarks
      ? `<div style="font-size:12px;font-weight:600;color:#1a1a1a;flex:1;max-height:80px;overflow-y:auto;overflow-x:hidden;white-space:pre-wrap;word-break:break-word;padding-right:4px">${val}</div>`
      : `<span style="font-size:12px;font-weight:600;color:#1a1a1a;flex:1">${val}</span>`;
    return `<div style="display:flex;gap:0;border-bottom:1px solid #f0f0f0;padding:7px 0">
      <span style="width:170px;flex-shrink:0;font-size:12px;color:#6b7280;font-weight:500">${label}</span>
      ${valCell}
    </div>`;
  }
  function sec(title) {
    return `<div style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.8px;margin:14px 0 10px">${title}</div>`;
  }

  // ── attachments block ───────────────────────────────────────────────────────
  const atts = c.attachments || [];
  const attList = atts.length
    ? `<div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
        ${atts.map((a, i) => `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px">
            <span style="font-size:18px">📄</span>
            <span style="flex:1;font-size:12px;font-weight:600;color:#1a2e4a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(a.name)}">${escHtml(a.name)}</span>
            <span style="font-size:11px;color:#9ba3ae;flex-shrink:0">${a.size ? Math.round(a.size/1024)+' KB' : ''}</span>
            <button onclick="arcViewAttachment('${caseId}',${i})" style="padding:3px 10px;background:#eef4ff;color:#1a56a0;border:1px solid #c3d8fa;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;flex-shrink:0">👁 View</button>
            <a href="${a.dataUrl}" download="${escHtml(a.name)}" style="padding:3px 10px;background:#1a2e4a;color:#fff;border-radius:5px;font-size:11px;font-weight:600;text-decoration:none;flex-shrink:0">⬇</a>
          </div>`).join('')}
      </div>`
    : `<div style="padding:10px 0;font-size:12px;color:#9ba3ae">No attachments uploaded.</div>`;

  // ── optional KP / archive-specific sections ────────────────────────────────
  const hasMediation  = c._lupanChairman || c.mediator || c.dateConfrontation;
  const hasSummons    = c._summonsDate   || c._servingOfficer;
  const hasPangkat    = c._pangkatChair  || c._pangkatSecretary || c._pangkatMember;
  const hasConc       = c._conciliationDate || c._venue;

  const modal = `<div id="arc-view-modal-root" style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:500;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()">
    <div style="background:#fff;border-radius:14px;width:620px;max-width:97vw;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 16px 50px rgba(0,0,0,0.22)">

      <!-- Header — identical to viewCase -->
      <div style="padding:16px 22px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:var(--navy);border-radius:14px 14px 0 0">
        <div>
          <div style="font-size:16px;font-weight:700;color:#fff">🗂️ ${escHtml(c.caseNo||'—')}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.65);margin-top:2px">${escHtml(c.complainant||'')}${c.respondent?' vs '+escHtml(c.respondent):''}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          ${statusBadge(c.status)}
          <button onclick="document.getElementById('arc-view-modal-root').remove()" style="border:none;background:rgba(255,255,255,0.18);color:#fff;font-size:17px;font-weight:700;cursor:pointer;line-height:1;padding:5px 10px;border-radius:8px;transition:background 0.15s" onmouseover="this.style.background='rgba(255,255,255,0.32)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'">✕</button>
        </div>
      </div>

      <!-- Body — same flat section style as viewCase -->
      <div style="padding:18px 22px;overflow-y:auto;flex:1">

        ${sec('Case Reference')}
        ${row('Case Number',  escHtml(c.caseNo||''))}
        ${row('Date Filed',   escHtml(c.dateFiled||''))}
        ${row('Time Filed',   escHtml(c.timeFiled ? formatTime12(c.timeFiled) : ''))}

        ${sec('Parties')}
        ${row('Complainant',         escHtml(c.complainant||''))}
        ${row('Complainant Address', escHtml(c.complainantAddress||''))}
        ${row('Respondent',          escHtml(c.respondent||''))}
        ${row('Respondent Address',  escHtml(c.respondentAddress||''))}

        ${sec('Case Details')}
        ${row('Case Title',    escHtml(c.caseTitle||''))}
        ${row('Nature of Case', escHtml(c.nature||c.type||''))}
        ${row('Action Taken',  escHtml(c.actionTaken||''))}
        <div style="display:flex;gap:0;border-bottom:1px solid #f0f0f0;padding:7px 0">
          <span style="width:170px;flex-shrink:0;font-size:12px;color:#6b7280;font-weight:500">Status</span>
          ${statusBadge(c.status)}
        </div>
        ${row('Date of Confrontation', escHtml(c.dateConfrontation||''))}
        ${row('Date of Settlement',    escHtml(c.dateResolved||''))}
        ${row('Mediator / Facilitator',escHtml(c.mediator||c._lupanChairman||''))}
        ${row('Remarks', escHtml(c._narrative||c.remarks||''), true)}

        ${hasMediation ? sec('Mediation (Form 8)') + row('Mediation Date', escHtml(c.dateConfrontation||'')) + row('Lupon Chairman', escHtml(c._lupanChairman||c.mediator||'')) : ''}
        ${hasSummons   ? sec('Summons (Form 9)')   + row('Summons Date', escHtml(c._summonsDate||''))   + row('Serving Officer', escHtml(c._servingOfficer||'')) : ''}
        ${hasPangkat   ? sec('Pangkat (Forms 10 & 11)') + row('Pangkat Chair', escHtml(c._pangkatChair||'')) + row('Pangkat Secretary', escHtml(c._pangkatSecretary||'')) + row('Pangkat Member', escHtml(c._pangkatMember||'')) : ''}
        ${hasConc      ? sec('Conciliation Hearing (Form 12)') + row('Conciliation Date', escHtml(c._conciliationDate||'')) + row('Venue', escHtml(c._venue||'')) : ''}


        <div style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.8px;margin:14px 0 8px">Attachments</div>
        ${attList}
      </div>

      <!-- Footer — identical to viewCase -->
      <div style="padding:12px 22px;border-top:1px solid #eee;display:flex;gap:8px;justify-content:flex-end;flex-shrink:0;background:#f9fafb;border-radius:0 0 14px 14px">
        <button onclick="printArchiveCase('${caseId}')" style="padding:7px 16px;background:#0a9396;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px">🖨️ Print Forms</button>
        <button onclick="document.getElementById('arc-view-modal-root').remove();openEditArchiveModal('${caseId}')" style="padding:7px 16px;background:#1a2e4a;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer">✏️ Edit</button>
      </div>

    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', modal);
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
  document.getElementById('arc-view-modal-root') && document.getElementById('arc-view-modal-root').remove();
  window._arcViewReturnCaseId = caseId;
  viewAttachments(caseId, idx);
  // Override closeAttachModal to return to arc view
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
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #1a2e4a">
    <div>
      <h1>🗂️ Case Record — ${esc(c.caseNo)} <span class="badge" style="background:#e8f4fd;color:#1a56a0">ARCHIVED</span></h1>
      <div class="sub">${esc(c.complainant||'')}${c.respondent?' <strong>vs</strong> '+esc(c.respondent):''} &nbsp;·&nbsp; Status: <strong>${esc(c.status||'')}</strong></div>
    </div>
    <div style="font-size:11px;color:#999;text-align:right">Printed: ${new Date().toLocaleDateString()}</div>
  </div>
  <table>
    ${sec('Form 7 — Case Identity')}
    ${row('Case Number', esc(c.caseNo||''))}
    ${row('Date Filed', esc(c.dateFiled||''))}
    ${row('Time Filed', esc(c.timeFiled ? (()=>{const[h,m]=(c.timeFiled||'').split(':');const hr=parseInt(h);return hr===0?`12:${m} AM`:hr<12?`${h}:${m} AM`:hr===12?`12:${m} PM`:`${hr-12}:${m} PM`;})() : ''))}
    ${row('Nature of Case', esc(c.nature||c.type||''))}
    ${row('Complainant', esc(c.complainant||''))}
    ${row('Complainant Address', esc(c.complainantAddress||''))}
    ${row('Respondent(s)', esc(c.respondent||''))}
    ${row('Respondent Address', esc(c.respondentAddress||''))}
    ${row('Remarks', esc(c._narrative||c.remarks||''))}
    ${(c.dateConfrontation||c._lupanChairman||c.mediator)?sec('Form 8 — Mediation'):''}
    ${row('Mediation Date', esc(c.dateConfrontation||''))}
    ${row('Lupon Chairman', esc(c._lupanChairman||c.mediator||''))}
    ${(c._summonsDate||c._servingOfficer)?sec('Form 9 — Summons'):''}
    ${row('Summons Date', esc(c._summonsDate||''))}
    ${row('Serving Officer', esc(c._servingOfficer||''))}
    ${(c._pangkatChair||c._pangkatSecretary||c._pangkatMember)?sec('Forms 10 & 11 — Pangkat'):''}
    ${row('Pangkat Chair', esc(c._pangkatChair||''))}
    ${row('Pangkat Secretary', esc(c._pangkatSecretary||''))}
    ${row('Pangkat Member', esc(c._pangkatMember||''))}
    ${(c._conciliationDate||c._venue)?sec('Form 12 — Conciliation Hearing'):''}
    ${row('Conciliation Date', esc(c._conciliationDate||''))}
    ${row('Venue', esc(c._venue||''))}
    ${sec('Form 16 — Final Outcome')}
    ${row('Outcome', esc(c._outcome||''))}
    ${row('Date of Outcome', esc(c.dateResolved||''))}
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
          <div style="font-size:15px;font-weight:700;color:#1a1a1a">${title}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px">Add or remove ${isTitle?'case title':'action taken'} options</div>
        </div>
        <button onclick="document.getElementById('arc-manage-modal-root').remove()" style="border:none;background:#f0f2f5;font-size:17px;cursor:pointer;color:#6b7280;line-height:1;padding:5px 10px;border-radius:8px;font-weight:700;transition:all 0.15s" onmouseover="this.style.background='#e5e7eb';this.style.color='#1a1a1a'" onmouseout="this.style.background='#f0f2f5';this.style.color='#6b7280'">✕</button>
      </div>
      <div id="arc-mopt-success-banner" style="display:none;margin:10px 16px 0;padding:9px 14px;background:#eaf6e8;border:1px solid #b7dfb8;border-radius:8px;font-size:13px;font-weight:600;color:#2d7a3a;transition:opacity 0.35s"></div>
      <div id="arc-mopt-confirm-banner" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,0.38);z-index:10;align-items:center;justify-content:center;border-radius:14px">
        <div style="background:#fff;border-radius:12px;width:320px;max-width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.22);padding:22px 22px 18px;text-align:center">
          <div style="font-size:26px;margin-bottom:10px">⚠️</div>
          <div style="font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:6px">Confirm Removal</div>
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
          <div style="font-size:11px;font-weight:700;color:#0a9396;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">＋ Add New Option</div>
          <div style="display:flex;gap:8px">
            <input type="text" id="arc-mopt-new-input" placeholder="${ph}" style="flex:1;padding:8px 11px;border:1px solid #ddd;border-radius:8px;font-size:13px;outline:none;transition:border-color 0.15s" onfocus="this.style.borderColor='#0a9396'" onblur="this.style.borderColor='#ddd'" onkeydown="if(event.key==='Enter')arcMoptAdd()">
            <button type="button" onclick="arcMoptAdd()" style="padding:8px 18px;background:#0a9396;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background 0.15s" onmouseover="this.style.background='#077a7d'" onmouseout="this.style.background='#0a9396'">Add</button>
          </div>
        </div>
      </div>
      <div style="padding:12px 16px;border-top:1px solid #f0f0f0;display:flex;justify-content:flex-end;background:#f9fafb;flex-shrink:0">
        <button onclick="document.getElementById('arc-manage-modal-root').remove()" style="padding:8px 22px;border-radius:8px;background:#1a2e4a;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer">Done</button>
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
    ${atts.map((f,i)=>`<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;background:#e8f0fe;border-radius:7px;font-size:12px;color:#1a56a0">
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
        <span class="wiz-step-lbl">Archived / old record${atts.length ? ` &nbsp;·&nbsp; <span style="color:#1a56a0;font-weight:600">${atts.length} file${atts.length>1?'s':''} attached</span>` : ''}</span>
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
  const raw=state.schedWizard?schedWizGetData():schedModalGetData();
  return {
    caseNo:raw.caseNo||'', dateFiled:raw.dateFiled||'', timeFiled:raw.timeFiled||'',
    complainant:raw.complainantName||raw.complainant||'', complainantAddress:raw.complainantAddress||'',
    respondent:raw.respondentName||raw.respondent||'', respondentAddress:raw.respondentAddress||'',
    caseTitle:raw.caseTitle||'', schedDate:raw.schedDate||'', schedTime:raw.schedTime||'',
    chairman:raw.chairman||'HON. ABUNDIO A. LEONES',
    lupons:raw.lupons||[]
  };
}
function _buildConcFormPdf(which){
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const d=_getConcFormData();
  const W=210,ml=25,mr=25,cw=W-ml-mr;
  const KP_FONT='helvetica'; const KP_LH=6.5;
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
  const sTime=d.schedTime||'___';

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
    doc.text(`Respondent: ${d.respondent||'______________________'}`,ml+5,y);y+=10;
    doc.text('The hearing is scheduled on:',ml,y);y+=8;
    doc.text(`Date: ${sDay} day of ${sMon}, ${sYr}`,ml+10,y);y+=7;
    doc.text(`Time: ${sTime}`,ml+10,y);y+=7;
    doc.text(`Venue: ${d.caseTitle?' Barangay Hall':'Barangay Hall, Session Room'}`,ml+10,y);y+=12;
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
  // Preview form8 or form9 from schedModal context (not schedWizard)
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const d=schedModalGetData();
  const data={
    caseNo:d.caseNo, dateFiled:d.dateFiled, timeFiled:d.timeFiled,
    complainant:d.complainantName||d.complainant, complainantAddress:d.complainantAddress||'',
    respondent:d.respondentName||d.respondent, respondentAddress:d.respondentAddress||'',
    caseTitle:d.caseTitle, schedDate:d.schedDate, schedTime:d.schedTime,
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
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const d=schedModalGetData();
  const data={
    caseNo:d.caseNo, dateFiled:d.dateFiled, timeFiled:d.timeFiled,
    complainant:d.complainantName||d.complainant, complainantAddress:d.complainantAddress||'',
    respondent:d.respondentName||d.respondent, respondentAddress:d.respondentAddress||'',
    caseTitle:d.caseTitle, schedDate:d.schedDate, schedTime:d.schedTime,
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
  const KP_FONT='helvetica';
  const MONTHS_UC=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const schedDt=d.schedDate?new Date(d.schedDate+'T00:00:00'):null;
  const sDay=schedDt?String(schedDt.getDate()):'___';
  const sMon=schedDt?MONTHS_UC[schedDt.getMonth()]:'___';
  const sYr=schedDt?String(schedDt.getFullYear()):'___';
  const sTime=d.schedTime||'___';
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
    doc.text(`Respondent: ${d.respondent||'______________________'}`,ml+5,y);y+=10;
    doc.text('The hearing is scheduled on:',ml,y);y+=8;
    doc.text(`Date: ${sDay} day of ${sMon}, ${sYr}`,ml+10,y);y+=7;
    doc.text(`Time: ${sTime}`,ml+10,y);y+=7;
    doc.text(`Venue: Barangay Hall, Session Room`,ml+10,y);y+=12;
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
              <div class="wiz-group"><label class="wiz-lbl">Full Name</label><input class="wiz-input" id="sw_cName" value="${escHtml(data.complainantName||'')}" placeholder="e.g Juan Dela Cruz"></div>
              <div class="wiz-group"><label class="wiz-lbl">Contact No.</label><input class="wiz-input" id="sw_cContact" value="${escHtml(data.complainantContact||'')}" placeholder="e.g 09XXXXXXXXX"></div>
            </div>
            <div class="wiz-group" style="margin-top:8px"><label class="wiz-lbl">Address</label><input class="wiz-input" id="sw_cAddress" value="${escHtml(data.complainantAddress||'')}" placeholder="Block, Lot, Street, Barangay"></div>
          </div>
          <div class="wiz-party">
            <div class="party-badge"><div class="party-avatar r">R</div><span class="party-tag r">Respondent</span></div>
            <div class="wiz-row">
              <div class="wiz-group"><label class="wiz-lbl">Full Name</label><input class="wiz-input" id="sw_rName" value="${escHtml(data.respondentName||'')}" placeholder="e.g Juan Dela Cruz"></div>
              <div class="wiz-group"><label class="wiz-lbl">Contact No.</label><input class="wiz-input" id="sw_rContact" value="${escHtml(data.respondentContact||'')}" placeholder="e.g 09XXXXXXXXX"></div>
            </div>
            <div class="wiz-group" style="margin-top:8px"><label class="wiz-lbl">Address</label><input class="wiz-input" id="sw_rAddress" value="${escHtml(data.respondentAddress||'')}" placeholder="Block, Lot, Street, Barangay"></div>
          </div>
        </div>`
      :`<div style="padding:8px 14px;background:#eef4ff;border:1px solid #c3d8fa;border-radius:8px;font-size:12px;color:#1a56a0;margin-bottom:14px">
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
            <button type="button" onclick="addCustomCaseTitleSched()" title="Add new case title" style="padding:0 10px;border:1px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;font-size:16px;color:#0a9396;flex-shrink:0">＋</button>
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
        <button onclick="wizAddLupon()" style="display:flex;align-items:center;gap:5px;padding:5px 11px;border-radius:7px;background:#e0f4f4;color:#0a9396;border:1px solid #b2e0e0;font-size:12px;font-weight:600;cursor:pointer">＋ Add Member</button>
      </div>
      <div class="lupon-box">
        ${selectedLupons.length===0
          ?`<div style="text-align:center;padding:18px;color:#9ba3ae;font-size:12px">No lupon members added yet. Click &ldquo;＋ Add Member&rdquo; to add.</div>`
          :`<div style="display:flex;flex-direction:column;gap:6px">
          ${selectedLupons.map((m,idx)=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f0fafa;border:1px solid #d0eeee;border-radius:8px;font-size:13px">
            <span style="display:flex;align-items:center;gap:8px"><span style="color:#0a9396;font-weight:700">✓</span>${escHtml(m)}</span>
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
        const phaseColor=isConc?'#7c3aed':'#0a9396';
        const phaseIcon=isConc?'⚖️':'🤝';
        if(isConc){
          return `<div style="margin-bottom:10px;padding:8px 14px;background:${phaseBg};border:1px solid ${phaseBorder};border-radius:8px;font-size:12px;color:${phaseColor};font-weight:600;display:flex;align-items:center;gap:7px">
            ${phaseIcon} <strong>Conciliation Phase</strong> — Forms to print: Form 10, Form 11, Form 12 &amp; Form 9 (Summons)
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-top:4px">
            <button onclick="schedWizPreviewFormConc('form10')" style="padding:9px 6px;border-radius:8px;border:1px solid #c4b5fd;background:#f3e8ff;color:#7c3aed;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px">📋 Form 10</button>
            <button onclick="schedWizPreviewFormConc('form11')" style="padding:9px 6px;border-radius:8px;border:1px solid #c4b5fd;background:#f3e8ff;color:#7c3aed;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px">📋 Form 11</button>
            <button onclick="schedWizPreviewFormConc('form12')" style="padding:9px 6px;border-radius:8px;border:1px solid #c4b5fd;background:#f3e8ff;color:#7c3aed;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px">📋 Form 12</button>
            <button onclick="schedWizPreviewForm('form9')" style="padding:9px 6px;border-radius:8px;border:1px solid #c3d8fa;background:#eef4ff;color:#1a56a0;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px">👁 Form 9</button>
          </div>
          <div style="margin-top:8px">
            <button onclick="schedWizDownloadConcForms()" style="width:100%;padding:9px 10px;border-radius:8px;border:none;background:var(--navy);color:#fff;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">⬇ Download All Conciliation Forms</button>
          </div>`;
        } else {
          return `<div style="margin-bottom:10px;padding:8px 14px;background:${phaseBg};border:1px solid ${phaseBorder};border-radius:8px;font-size:12px;color:${phaseColor};font-weight:600;display:flex;align-items:center;gap:7px">
            ${phaseIcon} <strong>Mediation Phase</strong> — Forms to print: Form 8 (Notice of Hearing) &amp; Form 9 (Summons)
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:4px">
            <button onclick="schedWizPreviewForm('form8')" style="padding:9px 10px;border-radius:8px;border:1px solid #c3d8fa;background:#eef4ff;color:#1a56a0;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">👁 Preview Form 8</button>
            <button onclick="schedWizPreviewForm('form9')" style="padding:9px 10px;border-radius:8px;border:1px solid #c3d8fa;background:#eef4ff;color:#1a56a0;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">👁 Preview Form 9</button>
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
      <button class="btn btn-excel" onclick="exportReportExcel()">📊 Export Report</button>
    </div>
  </div>
  <div class="report-stat-grid" style="grid-template-columns:repeat(4,1fr)">
    <div class="report-stat"><div class="report-stat-label">Total Cases (${yrLabel})</div><div class="report-stat-val">${yrCases.length}</div><div class="report-stat-sub">${allCases.length} all-time</div></div>
    <div class="report-stat"><div class="report-stat-label">Settled (${yrLabel})</div><div class="report-stat-val" style="color:#2d7a3a">${settled.length}</div><div class="report-stat-sub">${rate}% settlement rate</div></div>
    <div class="report-stat"><div class="report-stat-label">Ongoing</div><div class="report-stat-val" style="color:#9a6200">${ongoing.length}</div><div class="report-stat-sub">Active complaints</div></div>
    <div class="report-stat"><div class="report-stat-label">CFA Issued</div><div class="report-stat-val" style="color:#7c3aed">${cfa.length}</div><div class="report-stat-sub">Certificate to File Action</div></div>
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
              <span style="font-size:12px;color:#1a1a1a;font-weight:500;white-space:nowrap;flex-shrink:0">${escHtml(t)}</span>
              <span style="flex:1;border-bottom:2px dotted #d1d5db;margin:0 8px;min-width:12px;position:relative;top:-1px"></span>
              <div style="width:100px;height:10px;background:#e5e7eb;border-radius:20px;overflow:hidden;flex-shrink:0">
                <div style="height:100%;width:${barW}%;background:var(--teal);border-radius:20px;transition:width 0.4s"></div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
              <span style="font-size:12px;font-weight:600;color:#0a9396;min-width:34px;text-align:right">${pct}%</span>
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
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="card-title">Schedules (${yrLabel})</div>
        <span style="font-size:22px;font-weight:700;color:var(--navy)">${schYr.length}</span>
      </div>
      ${schYr.length?`<div style="display:flex;flex-direction:column;gap:4px">
        ${schYr.map(s=>`
        <div onclick="showSchedDetail('${s.id}')" title="Click to view hearing details" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:background 0.15s;background:#fff" onmouseover="this.style.background='#f0f7ff';this.style.borderColor='#93c5fd'" onmouseout="this.style.background='#fff';this.style.borderColor='var(--border)'">
          <div style="display:flex;align-items:center;gap:8px;min-width:0">
            <span style="font-size:16px;flex-shrink:0">📅</span>
            <div style="min-width:0">
              <div style="font-size:12px;font-weight:600;color:#1a1a1a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(s.caseNo||'—')}</div>
              <div style="font-size:11px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(s.caseTitle||'—')}</div>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0;margin-left:10px">
            <div style="font-size:12px;font-weight:600;color:#0a9396">${escHtml(s.schedDate||'—')}</div>
            <div style="font-size:11px;color:#6b7280">${escHtml(s.schedTime||'')}</div>
          </div>
        </div>`).join('')}
      </div>`:`<div style="color:var(--text3);font-size:13px;text-align:center;padding:24px 0">No schedules in ${yrLabel}</div>`}
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
  'Case No.','Date Filed','Time Filed',
  'Complainant Name','Complainant Address',
  'Respondent Name','Respondent Address',
  'Case Title','Nature of Case','Action Taken',
  'Date of Initial Confrontation','Date of Settlement',
  'Case Status','Remarks'
];
// Map XLS column → internal field
const XLS_TO_FIELD = {
  'Case No.':                     'caseNo',
  'Date Filed':                   'dateFiled',
  'Time Filed':                   'timeFiled',
  'Complainant Name':             'complainant',
  'Complainant Address':          'complainantAddress',
  'Respondent Name':              'respondent',
  'Respondent Address':           'respondentAddress',
  'Case Title':                   'caseTitle',
  'Nature of Case':               'nature',
  'Action Taken':                 'actionTaken',
  'Date of Initial Confrontation':'dateConfrontation',
  'Date of Settlement':           'dateResolved',
  'Case Status':                  'status',
  'Remarks':                      'remarks'
};
// Map internal field → XLS column
const FIELD_TO_XLS = Object.fromEntries(Object.entries(XLS_TO_FIELD).map(([k,v])=>[v,k]));

function caseToXlsRow(c){
  const row={};
  XLS_COLS.forEach(col=>{
    const f=XLS_TO_FIELD[col];
    row[col]=f?String(c[f]||''):'';
  });
  return row;
}

function exportExcel(){
  const rows=state.cases.map(caseToXlsRow);
  const ws=XLSX.utils.json_to_sheet(rows,{header:XLS_COLS});
  // Style header row bold (basic)
  const range=XLSX.utils.decode_range(ws['!ref']||'A1');
  for(let c=range.s.c;c<=range.e.c;c++){
    const cell=XLSX.utils.encode_cell({r:0,c});
    if(ws[cell]) ws[cell].s={font:{bold:true}};
  }
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'KP_CASE_DATABASE');
  XLSX.writeFile(wb,'PKP_Case_Database_Brgy_Pangabugan.xlsx');
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
  const sample=[caseToXlsRow({
    caseNo:'1-2025-001',dateFiled:'January 8, 2025',timeFiled:'1:00PM',
    complainant:'Juan Dela Cruz',complainantAddress:'P-Lawaan-A Pangabugan',
    respondent:'Pedro Santos',respondentAddress:'P-Narra Pangabugan',
    caseTitle:'Unjust Vexation',nature:'Criminal',actionTaken:'Mediation',
    dateConfrontation:'January 9, 2025',dateResolved:'January 9, 2025',
    status:'Settled',remarks:''
  })];
  const ws=XLSX.utils.json_to_sheet(sample,{header:XLS_COLS});
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'KP_CASE_DATABASE');
  XLSX.writeFile(wb,'PKP_Template.xlsx');
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
    // Map XLS columns to internal fields
    XLS_COLS.forEach(col=>{
      const f=XLS_TO_FIELD[col];
      if(f){
        const v=row[col]!==undefined?String(row[col]).trim():'';
        obj[f]=v;
      }
    });
    if(!validStatuses.has(obj.status))obj.status='Ongoing';
    // Also store complainantContact/respondentContact as empty if not present
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
        <div style="display:flex;gap:2px;align-items:flex-end">
          <button id="kpf-tab-form7" onclick="kpfSwitchTab('form7')" style="padding:6px 14px;border-radius:7px 7px 0 0;border:none;background:rgba(255,255,255,0.18);color:#fff;font-size:12px;font-weight:700;cursor:pointer;border-bottom:3px solid var(--teal)">Form 7: Complaint</button>
          <button id="kpf-tab-form8" onclick="kpfSwitchTab('form8')" style="padding:6px 14px;border-radius:7px 7px 0 0;border:none;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);font-size:12px;font-weight:600;cursor:pointer;border-bottom:3px solid transparent">Form 8: Notice</button>
          <button id="kpf-tab-form9" onclick="kpfSwitchTab('form9')" style="padding:6px 14px;border-radius:7px 7px 0 0;border:none;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);font-size:12px;font-weight:600;cursor:pointer;border-bottom:3px solid transparent">Form 9: Summons</button>
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
          <div>
            <div style="font-size:11px;color:#888;margin-bottom:3px">Punong Barangay / Lupon Chairman</div>
            <input class="wiz-input" id="kpf_chairman" value="${escHtml(d.chairman||'HON. ABUNDIO A. LEONES')}" oninput="kpfUpdate()" style="font-size:12px;padding:6px 9px">
          </div>
          <div>
            <div style="font-size:11px;color:#888;margin-bottom:3px">Serving Officer (Form 9 Page 2)</div>
            <input class="wiz-input" id="kpf_officer" value="${escHtml(d.officer||'RAMIL  ROSALES')}" oninput="kpfUpdate()" style="font-size:12px;padding:6px 9px">
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

        <!-- ── DOWNLOAD BUTTONS ── -->
        <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:7px;padding-bottom:4px;border-bottom:1px solid #e5e7eb">Download PDF</div>
        <div style="display:flex;flex-direction:column;gap:7px">
          <button onclick="downloadKpForm7()" style="padding:9px 12px;border-radius:7px;background:var(--navy);color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px">⬇ Download Form 7 — Complaint</button>
          <button onclick="downloadKpForm8()" style="padding:9px 12px;border-radius:7px;background:var(--navy);color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px">⬇ Download Form 8 — Notice</button>
          <button onclick="downloadKpForm9()" style="padding:9px 12px;border-radius:7px;background:var(--navy);color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px">⬇ Download Form 9 — Summons</button>
          <button onclick="downloadKpAll()" style="padding:9px 12px;border-radius:7px;background:#2d7a3a;color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px">⬇ Download All Forms (1 PDF)</button>
        </div>
      </div>
    </div>

    <!-- DRAG HANDLE -->
    <div id="kpf-drag-handle" style="width:6px;background:#3c3f41;cursor:col-resize;flex-shrink:0;position:relative;z-index:3;transition:background 0.15s" title="Drag to resize"
      onmousedown="kpfStartDrag(event)"
      onmouseover="this.style.background='#0a9396'"
      onmouseout="if(!window._kpfDragging)this.style.background='#3c3f41'">
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#888;font-size:10px;writing-mode:vertical-rl;user-select:none;pointer-events:none">⠿</div>
    </div>

    <!-- RIGHT PANEL: PDF Preview -->
    <div style="flex:1;min-width:0;background:#525659;display:flex;flex-direction:column;overflow:hidden">
      <div style="background:#3c3f41;padding:10px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0">
        <span id="kpf-preview-label" style="color:#ccc;font-size:12px;font-weight:600">← Click a form on the left to preview</span>
        <div style="margin-left:auto;display:flex;gap:6px;align-items:center">
          <button onclick="kpfSwitchTab('form7')" style="padding:5px 12px;border-radius:6px;background:#555;color:#fff;border:none;font-size:12px;cursor:pointer">Form 7</button>
          <button onclick="kpfSwitchTab('form8')" style="padding:5px 12px;border-radius:6px;background:#555;color:#fff;border:none;font-size:12px;cursor:pointer">Form 8</button>
          <button onclick="kpfSwitchTab('form9')" style="padding:5px 12px;border-radius:6px;background:#555;color:#fff;border:none;font-size:12px;cursor:pointer">Form 9</button>
        </div>
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative">
        <iframe id="kpf-pdf-frame" style="width:100%;height:100%;border:none;display:none" src=""></iframe>
        <iframe id="kpf-html-frame" style="width:100%;height:100%;border:none;display:none" srcdoc=""></iframe>
        <div id="kpf-empty-state" style="text-align:center;color:#888">
          <div style="font-size:56px;margin-bottom:12px">📄</div>
          <div style="font-size:14px;font-weight:600;color:#aaa">Select a form to preview</div>
          <div style="font-size:12px;color:#777;margin-top:6px">Click KP Form No. 7, 8, or 9 on the left</div>
        </div>
      </div>
    </div>
  </div>`;
}

function kpfGetData(){
  // Read live values from the editable fields in the modal, fallback to state
  const gv=id=>{const el=document.getElementById(id);return el?el.value.trim():null;};
  const d=state.kpFormsData||{};
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
  };
}
function kpfUpdate(){
  // Live-refresh the visible preview whenever a field changes
  const label=document.getElementById('kpf-preview-label');
  if(label&&label.dataset.current){
    kpShowPreview(label.dataset.current);
  }
}

function kpfSwitchTab(which){
  // Switch the header tab highlight
  ['form7','form8','form9'].forEach(f=>{
    const tab=document.getElementById('kpf-tab-'+f);
    if(!tab)return;
    const active=f===which;
    tab.style.background=active?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.08)';
    tab.style.color=active?'#fff':'rgba(255,255,255,0.6)';
    tab.style.borderBottom=active?'3px solid var(--teal)':'3px solid transparent';
    tab.style.fontWeight=active?'700':'600';
  });
  // Show/hide Form 7 details section
  const f7details=document.getElementById('kpf-form7-details');
  if(f7details) f7details.style.display=which==='form7'?'block':'none';
  // Trigger preview
  kpShowPreview(which);
}

function kpShowPreview(which){
  const frame=document.getElementById('kpf-pdf-frame');
  const htmlFrame=document.getElementById('kpf-html-frame');
  const empty=document.getElementById('kpf-empty-state');
  const label=document.getElementById('kpf-preview-label');
  const data=kpfGetData();

  // PDF preview for Form 7, 8 & 9
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  if(which==='form7') _fillKpForm7(doc,data);
  else if(which==='form8') _fillKpForm8(doc,data);
  else if(which==='form9'){
    _fillKpForm9(doc,data);
    doc.addPage();
    _fillKpForm9Page2(doc,data);
  }
  const dataUri=doc.output('datauristring');
  if(htmlFrame){htmlFrame.style.display='none';htmlFrame.srcdoc='';}
  if(frame){frame.src=dataUri;frame.style.display='block';}
  if(empty)empty.style.display='none';
  if(label){
    label.textContent=which==='form7'?'KP Form No. 7 — Complaint':which==='form8'?'KP Form No. 8 — Notice of Hearing':'KP Form No. 9 — Summons + Officer\'s Return';
    label.dataset.current=which;
  }
  ['form7','form8','form9'].forEach(f=>{
    const btn=document.getElementById('kpbtn-'+f);
    if(btn){btn.style.borderColor=f===which?'var(--navy)':'#e5e7eb';btn.style.background=f===which?'#eef4ff':'#fff';}
  });
}

function _fmt12hrTime(t){
  if(!t)return'';
  // t may be "13:00" or "1:00 PM"
  if(/AM|PM/i.test(t))return t;
  const [h,m]=t.split(':').map(Number);
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
    font-family:'Calibri','Verdana',sans-serif;
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
      <div>TF: <span class="inp-plain">${tfDisplay}</span> Complainant</div>
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
    at ${inp(time9,'60px')} o'clock in the
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
  if(handle) handle.style.background='#0a9396';
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
// jsPDF built-in fonts: helvetica is closest sans-serif to Calibri/Verdana
const KP_FONT = 'helvetica';

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
  const filed7str=filedDt?`${filedDt.getMonth()+1}-${String(filedDt.getDate()).padStart(2,'0')}-${filedDt.getFullYear()}`:'';
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
  if(compAddr){doc.text(compAddr,ml,y);}
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
  doc.text(d.timeFiled||d.schedTime||'',px,y);

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
  if(respAddr){doc.text(respAddr,ml,y);}
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
  const time8=d.schedTime||'1:00';
  const isAM8=!/pm/i.test(time8);

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
  doc.text('     You are hereby required to appear before me on the ', px, y);
  px += _tw(doc, '     You are hereby required to appear before me on the ');
  px = _utext(doc, day8, px, y, [0,0,0]);
  doc.setTextColor(0,0,0); doc.text(' day of ', px, y); px += _tw(doc,' day of ');
  px = _utext(doc, mon8, px, y, [0,0,0]);
  doc.setTextColor(0,0,0); doc.text(', ', px, y); px += _tw(doc, ', ');
  px = _utext(doc, yr8, px, y, [0,0,0]);
  doc.setTextColor(0,0,0);
  const L2mid = " at ";
  doc.text(L2mid, px, y); px += _tw(doc, L2mid);
  px = _utext(doc, time8, px, y, [0,0,0]);
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

  // ── "This __14th__ day of __APRIL__ __2026__." — aligned with body text ──
  y+=KP_LH+10;
  const filed8day=filedDt?ordinalDay(filedDt):'____';
  const filed8mon=filedDt?MONTHS[filedDt.getMonth()].toUpperCase():'____';
  const filed8yr2=filedDt?String(filedDt.getFullYear()).slice(-2):'__';
  doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  px=ml;
  doc.text('This ',px,y);px+=_tw(doc,'This ');
  px=_utext(doc,filed8day,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text('  day of  ',px,y);px+=_tw(doc,'  day of  ');
  px=_utext(doc,filed8mon,px,y,[0,0,0]);
  doc.setTextColor(0,0,0);doc.text('  ',px,y);px+=_tw(doc,'  ');
  px=_utext(doc,yr8,px,y,[0,0,0]);
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
  px=_utext(doc,filed8mon,px,y,[0,0,0]);
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

  // RIGHT: DF
  const filedMon=filedDt?MONTHS[filedDt.getMonth()]:'';
  const filedDay=filedDt?filedDt.getDate():'';
  const filedYr=filedDt?filedDt.getFullYear():'';
  const filed9str=filedDt?`${filedMon}-${filedDay}-${filedYr}`:'';
  doc.setFont(KP_FONT,'normal');
  doc.text('DF: '+filed9str,rightCol,y);

  y+=KP_LH;
  // LEFT: complainant address
  doc.setFont(KP_FONT,'normal');doc.setTextColor(0,0,0);
  const compAddr=d.complainantAddress||'';
  if(compAddr) doc.text(compAddr,ml,y);
  // RIGHT: Barangay Case No.
  doc.text('Barangay Case No. '+(d.caseNo||''),rightCol,y);

  y+=KP_LH;
  doc.text('Butuan City',ml,y);
  doc.text('For: '+(d.caseTitle||''),rightCol,y);

  y+=KP_LH;
  doc.text('Complainant',ml,y);
  const tfText=d.timeFiled||d.schedTime||'';
  doc.text('TF: '+tfText+'    Complainant',rightCol,y);

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
  const time9=d.schedTime||'1:00 PM';
  const isAM9=!/pm/i.test(time9);

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
  px=_utext(doc,time9,px,y,[0,0,0]);
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

  // ── Chairman — right-aligned, bold, underlined ──
  y+=KP_LH+14;
  const ch9=(d.chairman||'HON. ABUNDIO A. LEONES').toUpperCase();
  doc.setFont(KP_FONT,'bold');doc.setTextColor(0,0,0);
  const ch9w=_tw(doc,ch9);
  doc.line(W-mr-ch9w-4,y+1.2,W-mr+4,y+1.2);
  doc.text(ch9,W-mr,y,{align:'right'});
  y+=KP_LH;
  doc.setFont(KP_FONT,'normal');
  doc.text('Punong Barangay/Lupon Chairman',W-mr,y,{align:'right'});
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
      <span style="font-size:12px;font-weight:600;color:#1a1a1a;text-align:right;flex:1;word-break:break-word">${val||'—'}</span>
    </div>`;
  }

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
  const concDeadline = c._concStartDate ? new Date(new Date(c._concStartDate+'T00:00:00').getTime()+15*24*60*60*1000).toISOString().slice(0,10) : '';
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
  <div style="width:280px;flex-shrink:0;overflow-y:auto;max-height:calc(100vh - 120px);padding-right:4px">

    <!-- CASE INFORMATION -->
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f0f2f5;background:#f9fafb">
        <span style="font-size:14px">🗂️</span>
        <span style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">Case Information</span>
      </div>
      <div style="padding:10px 14px;display:flex;flex-direction:column;gap:0">
        ${infoRow('Case Number', `<strong style="color:#1a2e4a">${esc(c.caseNo||'')}</strong>`)}
        ${infoRow('Date Filed', esc(c.dateFiled||''))}
        ${infoRow('Time Filed', esc(formatTime12(c.timeFiled||'')))}
        ${infoRow('Status', statusBadge(c.status))}
        ${infoRow('Case Title', esc(c.caseTitle||c.nature||''))}
        ${infoRow('Nature of Case', esc(c.nature||c.type||''))}
      </div>
    </div>

    <!-- PARTIES -->
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f0f2f5;background:#f9fafb">
        <span style="font-size:14px">👥</span>
        <span style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">Parties</span>
      </div>
      <div style="padding:10px 14px">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:8px">
          <div style="width:26px;height:26px;border-radius:50%;background:#0a9396;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">C</div>
          <div>
            <div style="font-size:10px;color:#0a9396;font-weight:700;text-transform:uppercase;letter-spacing:0.4px">Complainant</div>
            <div style="font-size:13px;font-weight:700;color:#1a2e4a">${esc(c.complainant||'—')}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:7px">
          <div style="width:26px;height:26px;border-radius:50%;background:#e76f51;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">R</div>
          <div>
            <div style="font-size:10px;color:#e76f51;font-weight:700;text-transform:uppercase;letter-spacing:0.4px">Respondent</div>
            <div style="font-size:13px;font-weight:700;color:#1a2e4a">${esc(c.respondent||'—')}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ATTACHMENTS -->
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f0f2f5;background:#f9fafb">
        <span style="font-size:14px">📎</span>
        <span style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">Attachments</span>
      </div>
      <div style="padding:10px 14px">
        ${(()=>{
          const generatedForms = attachments.filter(a=>a._generated);
          const uploadedFiles  = attachments.filter(a=>!a._generated);
          let html = '';

          // Helper: derive a short display label for each generated KP form
          function kpFormLabel(name){
            if(/Form 7/i.test(name))  return {tag:'Form 7',  desc:'Complaint',         bg:'#fef3c7',color:'#92400e'};
            if(/Form 8/i.test(name))  return {tag:'Form 8',  desc:'Notice of Hearing',  bg:'#dbeafe',color:'#1e40af'};
            if(/Form 9/i.test(name))  return {tag:'Form 9',  desc:'Summons',             bg:'#ede9fe',color:'#5b21b6'};
            if(/Form 10/i.test(name)) return {tag:'Form 10', desc:'Pangkat Report',      bg:'#dcfce7',color:'#166534'};
            if(/Form 11/i.test(name)) return {tag:'Form 11', desc:'Conciliation',        bg:'#fce7f3',color:'#9d174d'};
            if(/Form 12/i.test(name)) return {tag:'Form 12', desc:'CFA',                 bg:'#fee2e2',color:'#b91c1c'};
            return {tag:'Form',       desc:name,              bg:'#f3f4f6',color:'#374151'};
          }

          // Show each generated KP form as its own row with specific label
          // ALL generated forms open the KP Forms split-panel with the correct tab
          generatedForms.forEach(a=>{
            const realIdx = attachments.indexOf(a);
            const lbl = kpFormLabel(a.name);
            // Determine which tab to auto-open in the KP Forms split-panel
            let kpTab = 'form7';
            if(/Form 8/i.test(a.name))  kpTab = 'form8';
            if(/Form 9/i.test(a.name))  kpTab = 'form9';
            if(/Form 10/i.test(a.name)) kpTab = 'form10';
            if(/Form 11/i.test(a.name)) kpTab = 'form11';
            if(/Form 12/i.test(a.name)) kpTab = 'form12';
            const clickHandler = `openKpFormsFromViewTab('${c.id}','${kpTab}')`;
            html += `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fffbeb;border:1px solid #fde68a;border-radius:7px;font-size:12px;color:#92400e;margin-bottom:6px">
              <span style="font-size:14px;cursor:pointer" onclick="${clickHandler}">📋</span>
              <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:${lbl.bg};color:${lbl.color};flex-shrink:0;cursor:pointer" onclick="${clickHandler}">${lbl.tag}</span>
              <span style="font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" onclick="${clickHandler}">${lbl.desc}</span>
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
                <div style="font-size:12px;font-weight:600;color:#1a2e4a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.name)}</div>
                <div style="font-size:10px;color:#9ba3ae">${a.size?Math.round(a.size/1024)+' KB':''}</div>
              </div>
              <button onclick="event.stopPropagation();removeAttachment('${c.id}',${realIdx})" title="Delete this file" style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:#fee2e2;border:1px solid #fca5a5;color:#dc2626;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;padding:0" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">✕</button>
            </div>`;
          });

          // If no generated Form 7 exists yet, always show a Form 7 placeholder row
          const hasForm7 = generatedForms.some(a=>/Form 7/i.test(a.name));
          if(!hasForm7){
            const form7Placeholder = `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fffbeb;border:1px solid #fde68a;border-radius:7px;font-size:12px;color:#92400e;cursor:pointer;margin-bottom:6px" onclick="generateMissingForm7('${c.id}')" title="Click to generate Form 7">
              <span style="font-size:14px">📋</span>
              <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:#fef3c7;color:#92400e;flex-shrink:0">Form 7</span>
              <span style="font-weight:600;flex:1">Complaint</span>
              <span style="font-size:10px;color:#b45309;background:#fef3c7;padding:1px 6px;border-radius:4px;border:1px dashed #d97706;flex-shrink:0">Generate</span>
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

  function buildSessionCards(phase, sessions, maxSessions, phaseActive, phaseComplete, phaseSettled){
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
      const schedInfo = dateStr ? `<div style="font-size:11px;color:#6b7280;margin-top:2px">📅 ${dateFmt}${s&&s.time?' &nbsp;•&nbsp; '+s.time:''}</div>` : '';

      // Show Settled / Not Settled buttons ONLY for scheduled sessions with no outcome yet
      // When the overall case is already settled, all buttons become non-interactive
      const isOverallSettled = caseSettled;
      let outcomeButtons = '';
      if(isScheduled && outcome !== 'settled' && outcome !== 'not_settled'){
        if(isOverallSettled){
          // Case already settled — show greyed-out, pointer-events:none buttons
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
      // If settled → buttons dissolve completely (no toggle shown)
      // If not_settled → allow changing back to settled only when case is NOT yet settled
      if(isScheduled && outcome==='not_settled' && !isOverallSettled){
        outcomeButtons += `<div style="margin-top:6px">
          <button onclick="kpConfirmSessionOutcome('${c.id}','${phase}',${i},'settled')" style="font-size:10px;padding:3px 9px;border-radius:5px;border:1px solid #e5e7eb;background:#f9fafb;color:#6b7280;cursor:pointer">↩ Change to Settled</button>
        </div>`;
      }

        // Schedule button: only for session 1 (sessions 2 & 3 are auto-scheduled)
        // Edit button: shown for any scheduled session
        let schedButton = '', genFormButton = '', editButton = '';
        if(!isLocked){
          if(!isScheduled && i===0){
            schedButton = `<button onclick="kpScheduleSessionOne('${c.id}','${phase}')" style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:6px;border:1px solid #93c5fd;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:600;cursor:pointer">📅 Schedule Session 1</button>`;
          } else if(!isScheduled && i>0){
            // Auto-scheduled based on session 1
            schedButton = `<span style="font-size:10px;color:#9ba3ae;padding:5px 0">⏳ Auto-scheduled after Session 1</span>`;
          }
          // Edit button for any already-scheduled session
          if(isScheduled){
            editButton = `<button onclick="kpEditSession('${c.id}','${phase}',${i})" style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:6px;border:1px solid #fde68a;background:#fefce8;color:#92400e;font-size:11px;font-weight:600;cursor:pointer">✏️ Edit</button>`;
          }
          // Only show Generate Form button when the session is actually scheduled
          if(isScheduled){
            const genFormFn = isMed
              ? `kpGenerateForms('${c.id}','${dateStr.replace(/'/g,"\\'")}','${(s&&s.time?s.time:'').replace(/'/g,"\\'")}')`
              : `kpGenerateConcForms('${c.id}','${dateStr.replace(/'/g,"\\'")}','${(s&&s.time?s.time:'').replace(/'/g,"\\'")}')`;
            const genFormLabel = isMed ? '📄 Generate Form (8 &amp; 9)' : '📄 Generate Forms (11, 12 &amp; 9)';
            // If case is overall settled, disable the Generate Form button too
            if(isOverallSettled){
              genFormButton = `<button style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:6px;border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;font-size:11px;font-weight:600;cursor:not-allowed;opacity:0.5" disabled>${genFormLabel}</button>`;
            } else {
              genFormButton = `<button onclick="${genFormFn}" style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:6px;border:1px solid ${isMed?'#c3d8fa':'#c4b5fd'};background:${isMed?'#eef4ff':'#f3e8ff'};color:${isMed?'#1a56a0':'#7c3aed'};font-size:11px;font-weight:600;cursor:pointer">${genFormLabel}</button>`;
            }
          }
        }

      const lockIcon = isLocked ? `<span style="font-size:14px;margin-right:4px">🔒</span>` : '';

      cards.push(`
      <div style="border:1px solid ${isLocked?'#e5e7eb':borderColor};border-radius:9px;background:${isLocked?'#f9fafb':bg};padding:10px 12px;${isLocked?'opacity:0.7':''}margin-bottom:6px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <div style="display:flex;align-items:center;gap:6px">
            ${lockIcon}
            <span style="font-size:12px;font-weight:700;color:${isLocked?'#9ca3af':'#1a1a1a'}">${sessionLabel}</span>
            ${outcome==='settled'?`<span style="font-size:10px;font-weight:700;padding:2px 7px;background:#d1fae5;color:#065f46;border-radius:10px">✓ Settled</span>`:''}
            ${outcome==='not_settled'?`<span style="font-size:10px;font-weight:700;padding:2px 7px;background:#fee2e2;color:#b91c1c;border-radius:10px">✗ Not Settled</span>`:''}
          </div>
          <span style="font-size:11px;color:${isScheduled?'#0a9396':'#9ba3ae'}">${isLocked?'Locked':isScheduled?'Scheduled':'Not yet scheduled'}</span>
        </div>
        ${schedInfo}
        ${outcomeButtons}
        ${!isLocked?`<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;align-items:center">${schedButton}${editButton}${genFormButton}</div>`:''}
      </div>`);
    }
    return cards.join('');
  }

  const medSessionCards = buildSessionCards('med', medSessions, 3, !medPhaseComplete, medPhaseComplete, medSettled);
  const concSessionCards = buildSessionCards('conc', concSessions, 3, concPhaseActive, !concPhaseActive||concSessions.length>=3, concSettled);

  // Phase badge
  const phase1StatusBadge = medSettled
    ? `<div style="display:flex;align-items:center;gap:4px;padding:3px 10px;background:#d1fae5;border:1px solid #6ee7b7;border-radius:12px;font-size:10px;font-weight:700;color:#065f46">✓ CASE SETTLED</div>`
    : medPhaseComplete ? `<span style="font-size:10px;color:#9ca3af;font-weight:600">Not settled → Lupon</span>` : '';
  const phase2StatusBadge = concSettled
    ? `<div style="display:flex;align-items:center;gap:4px;padding:3px 10px;background:#d1fae5;border:1px solid #6ee7b7;border-radius:12px;font-size:10px;font-weight:700;color:#065f46">✓ CASE SETTLED</div>`
    : '';

  const rightPanel = `
  <div style="flex:1;display:flex;flex-direction:column;gap:14px;overflow-y:auto;max-height:calc(100vh - 120px);min-width:0">

    <!-- NEXT HEARING / SCHEDULED SESSIONS (moved to top) -->
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:visible">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f0f2f5;background:#f9fafb;border-radius:10px 10px 0 0">
        <span style="font-size:14px">📅</span>
        <span style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">Next Hearing</span>
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
          if(caseSettled){
            return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 0;text-align:center">
              <div style="width:36px;height:36px;border-radius:50%;background:#d1fae5;display:flex;align-items:center;justify-content:center;font-size:18px">✅</div>
              <div style="font-size:13px;font-weight:700;color:#065f46">Case Settled</div>
              <div style="font-size:11px;color:#9ba3ae">No more hearings needed.</div>
            </div>`;
          }
          const upcoming=allSessionRows.filter(s=>s.date>=today&&s.outcome!=='settled'&&s.outcome!=='not_settled').sort((a,b)=>a.date.localeCompare(b.date));
          const next=upcoming[0]||null;
          if(!next) return `<div style="font-size:12px;color:#9ba3ae;text-align:center;padding:8px 0">No upcoming hearing scheduled yet</div>`;
          function sessionBlock(row){
            const dtFmt=new Date(row.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric',year:'numeric'});
            const daysAway=Math.round((new Date(row.date+'T00:00:00')-new Date(today+'T00:00:00'))/86400000);
            const daysLabel=daysAway===0?'Today':daysAway===1?'Tomorrow':`In ${daysAway} day${daysAway!==1?'s':''}`;
            const daysColor=daysAway===0?'#dc2626':daysAway<=3?'#92400e':'#059669';
            const phaseColor=row.phase==='med'?'#1d4ed8':'#7c3aed';
            const phaseBg=row.phase==='med'?'#eff6ff':'#f3e8ff';
            return `<div style="background:${phaseBg};border-radius:8px;padding:10px 12px;margin-bottom:6px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:10px;font-weight:700;color:${phaseColor};text-transform:uppercase;letter-spacing:0.5px">${row.label}</span>
                <span style="font-size:11px;font-weight:700;color:${daysColor}">${daysLabel}</span>
              </div>
              <div style="font-size:14px;font-weight:700;color:#1a2e4a">${dtFmt}</div>
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
              style="font-size:11px;color:#1a56a0;background:none;border:none;cursor:pointer;padding:4px 0 2px;font-weight:600;display:block;width:100%;text-align:left">
              ＋ ${rest.length} more upcoming session${rest.length>1?'s':''}
            </button>`:'';
          return sessionBlock(next)+restHtml;
        })()}
      </div>
    </div>

    <!-- KP PROCESS TRACKER HEADER -->
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #e5e7eb;background:#f9fafb">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:16px">📋</span>
          <span style="font-size:14px;font-weight:700;color:#1a2e4a">KP PROCESS TRACKER</span>
        </div>
      </div>

      <!-- Phase progress bar -->
      <div style="display:flex;align-items:center;gap:0;padding:14px 18px;border-bottom:1px solid #f0f2f5">
        <!-- Phase 1 -->
        <div style="display:flex;align-items:center;gap:10px;flex:1;padding:10px 14px;background:${medPhaseComplete?'#f0fdf4':'#eff6ff'};border-radius:8px 0 0 8px;border:1px solid ${medPhaseComplete?'#6ee7b7':'#93c5fd'};border-right:none">
          <div style="width:36px;height:36px;border-radius:50%;background:${medPhaseComplete?'#059669':'#1a2e4a'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <span style="color:#fff;font-size:14px">👥</span>
          </div>
          <div>
            <div style="font-size:9px;color:${medPhaseComplete?'#065f46':'#6b7280'};font-weight:700;text-transform:uppercase;letter-spacing:0.5px">PHASE 1</div>
            <div style="font-size:12px;font-weight:700;color:${medPhaseComplete?'#065f46':'#1a2e4a'}">MEDIATION (1–15 DAYS)</div>
            <div style="font-size:10px;color:#9ba3ae">Max 3 Sessions</div>
          </div>
          ${phase1StatusBadge}
        </div>
        <!-- Arrow -->
        <div style="width:32px;height:40px;display:flex;align-items:center;justify-content:center;background:${concPhaseActive?'#eff6ff':medPhaseComplete&&!medSettled?'#fef3c7':'#f0f2f5'};border-top:1px solid ${medPhaseComplete&&!medSettled?'#fde68a':'#e5e7eb'};border-bottom:1px solid ${medPhaseComplete&&!medSettled?'#fde68a':'#e5e7eb'};flex-shrink:0">
          <span style="font-size:16px;color:${medPhaseComplete&&!medSettled?'#f59e0b':'#9ca3af'}">›</span>
        </div>
        <!-- Phase 2 -->
        <div style="display:flex;align-items:center;gap:10px;flex:1;padding:10px 14px;background:${concSettled?'#f0fdf4':concPhaseActive?'#f3e8ff':'#f9fafb'};border-radius:0 8px 8px 0;border:1px solid ${concSettled?'#6ee7b7':concPhaseActive?'#c4b5fd':'#e5e7eb'};border-left:none">
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
              <span style="font-size:11px;font-weight:700;color:#1a2e4a">MEDIATION PHASE</span>
            </div>
            ${daysLeftMed!==null&&!medPhaseComplete?`<span style="font-size:10px;font-weight:700;color:${daysLeftMed<0?'#b91c1c':daysLeftMed<=3?'#92400e':'#059669'}">${daysLeftMed<0?'Overdue':daysLeftMed+' days left'}</span>`:''}
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

          ${medPhaseComplete&&!medSettled?`<div style="margin-top:8px;padding:8px 10px;background:#fef3c7;border-radius:7px;font-size:10px;color:#92400e;font-weight:700;display:flex;align-items:center;gap:5px">🔒 If not settled after 3 sessions, Conciliation Phase will be unlocked automatically.</div>`:''}
        </div>

        <!-- LUPON CONCILIATION PHASE column -->
        <div style="padding:14px 16px;background:${concPhaseActive?'#fff':'#fafafa'}">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:6px">
              <div style="width:8px;height:8px;border-radius:50%;background:${concPhaseActive?'#7c3aed':'#d1d5db'}"></div>
              <span style="font-size:11px;font-weight:700;color:${concPhaseActive?'#1a2e4a':'#9ca3af'}">LUPON CONCILIATION PHASE</span>
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

      <!-- Bottom status bar -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;border-top:1px solid #e5e7eb;background:#f9fafb">
        <div style="padding:10px 16px;border-right:1px solid #e5e7eb">
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
            <div style="width:8px;height:8px;border-radius:50%;background:#3b82f6"></div>
            <span style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.4px">Current Status</span>
          </div>
          <div style="font-size:12px;font-weight:700;color:#1a2e4a">${caseSettled?'Case Settled':concPhaseActive&&concSessions.length>0?'Under Lupon Conciliation':medSessions.length>0?`Under Mediation – Session ${medSessions.length} Scheduled`:'Under Mediation – Pending Schedule'}</div>
          <div style="font-size:10px;color:#9ba3ae">${caseSettled?'Resolved':concPhaseActive&&concSessions.length>0?'Conciliation Phase: '+concSessions.length+' of 3 used':'Mediation Phase: '+medSessions.length+' of 3 used'}</div>
        </div>
        <div style="padding:10px 16px;border-right:1px solid #e5e7eb">
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
            <span style="font-size:11px">📅</span>
            <span style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.4px">Total Process Duration</span>
          </div>
          <div style="font-size:12px;font-weight:700;color:#1a2e4a">30 days (15 days per phase)</div>
          <div style="font-size:10px;color:#9ba3ae">${dateFiled||'—'} – ${filedMs?new Date(filedMs+30*24*60*60*1000).toISOString().slice(0,10):'—'}</div>
        </div>
        <div style="padding:10px 16px">
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
            <span style="font-size:11px">⚖️</span>
            <span style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.4px">Final Result</span>
          </div>
          <div style="font-size:12px;font-weight:700;color:${caseSettled?'#059669':c.status==='CFA'?'#7c3aed':'#9a6200'}">${caseSettled?'Settled':c.status==='CFA'?'CFA Issued':'Pending'}</div>
          <div style="font-size:10px;color:#9ba3ae">${caseSettled?'Case has been resolved':c.status==='CFA'?'Certificate to File Action issued':'Waiting for the case to be settled'}</div>
        </div>
      </div>
    </div>



  </div>`;

  return `
  <!-- Top nav bar -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px">
    <div style="display:flex;align-items:center;gap:12px">
      <button onclick="state.viewCasePage=null;render()" style="display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:#fff;border:1px solid #e5e7eb;color:#374151;font-size:12px;font-weight:600;cursor:pointer">← Back to Cases</button>
      <div>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:18px;font-weight:700;color:#1a2e4a">${esc(c.caseNo||'—')}</span>
          ${statusBadge(c.status)}
        </div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">${esc(c.complainant||'')}${c.respondent?' vs '+esc(c.respondent):''}</div>
      </div>
    </div>
    <div style="display:flex;gap:8px">
      <button onclick="openUploadAttachmentModal('${c.id}')" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:#1a2e4a;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer" onmouseover="this.style.background='#243d5e'" onmouseout="this.style.background='#1a2e4a'">📎 Upload Attachment</button>
      <button onclick="openEditCaseForm7Modal('${c.id}')" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:#3b82f6;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer">✏️ Edit Case</button>
    </div>
  </div>

  <!-- Two-column layout -->
  <div style="display:flex;gap:16px;align-items:flex-start">
    ${leftPanel}
    ${rightPanel}
  </div>`;
}

function viewAllHearings_cdp(caseId){
  // Show all hearings for this case in the schedules modal
  openSchedulesModal(caseId);
}

// ─── MAIN RENDER ─────────────────────────────────────────────────────────────
function render(){
  renderNav();
  let html='';
  if(state.viewCasePage)        html=renderCaseDetailPage(state.viewCasePage);
  else if(state.searchQuery&&state.searchQuery.trim()) html=renderSearch();
  else if(state.page==='cases') html=renderCases();
  else if(state.page==='report')html=renderReport();
  else                          html=renderDashboard();
  document.getElementById('content').innerHTML=html;
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
}

loadData();

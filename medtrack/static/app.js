// MedTrack frontend
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const api = async (url, opts={}) => {
  if (opts.json) { opts.body = JSON.stringify(opts.json); opts.headers={'Content-Type':'application/json'}; delete opts.json; }
  const r = await fetch('/api'+url, opts);
  const d = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(d.error || ('HTTP '+r.status));
  return d;
};
const esc = s => String(s??'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const todayISO = () => new Date().toISOString().slice(0,10);
const TYPE_ICON = {таблетки:'💊', капсулы:'💊', капли:'💧', сироп:'🥤', укол:'💉', мазь:'🧴', ингаляция:'🌬️', свечи:'🕯️', порошок:'🥄', другое:'❔'};

let META = null;

// ---------------- tabs
$$('.tab').forEach(b => b.onclick = () => {
  $$('.tab').forEach(x=>x.classList.toggle('active', x===b));
  $$('.panel').forEach(p=>p.classList.add('hidden'));
  $('#tab-'+b.dataset.tab).classList.remove('hidden');
  ({day:loadDay, meds:loadMeds, sched:loadSched, history:loadHistory})[b.dataset.tab]();
});

// ---------------- day view
function setDay(d){ $('#dayPicker').value = d; loadDay(); }
$('#prevDay').onclick = () => shiftDay(-1);
$('#nextDay').onclick = () => shiftDay(+1);
$('#todayBtn').onclick = () => setDay(todayISO());
$('#dayPicker').onchange = loadDay;
function shiftDay(n){
  const d = new Date($('#dayPicker').value + 'T00:00');
  d.setDate(d.getDate()+n);
  setDay(d.toISOString().slice(0,10));
}

async function loadDay(){
  const day = $('#dayPicker').value || todayISO();
  $('#dayPicker').value = day;
  let data;
  try { data = await api('/day/'+day); } catch(e){ alert(e.message); return; }
  const warn = $('#warnings');
  warn.innerHTML = data.warnings.map(w=>`<div class="warn">⚠️ ${esc(w)}</div>`).join('');
  const done = data.plan.filter(p=>p.status==='done').length;
  $('#daySummary').textContent = `Выполнено ${done} из ${data.plan.length}`;
  $('#dayCards').innerHTML = data.plan.map(cardHtml).join('') || '<p class="muted">На этот день план пуст. Создайте план во вкладке «Расписание».</p>';
  // buttons
  $$('#dayCards [data-take]').forEach(b => b.onclick = () => openTake(+b.dataset.take, b.dataset.planned));
  $$('#dayCards [data-undo]').forEach(b => b.onclick = async () => {
    await api('/doses/'+b.dataset.undo+'/undo',{method:'POST'}); loadDay();
  });
  const extraNames = new Map((await api('/meds?active=1')).map(m=>[m.id,m.name]));
  $('#extraDoses').innerHTML = data.extra.map(x=>
    `➕ Без плана: <b>${esc(extraNames.get(x.med_id)||('№'+x.med_id))}</b> — ${x.times.join(', ')}`).join('<br>');
}

function cardHtml(p){
  const icon = TYPE_ICON[p.med_type] || '💊';
  const gaps = p.gaps.length ? `<div class="gaps">Промежутки: ${p.gaps.map(g=>g+' ч').join(' → ')}</div>` : '';
  const planned = p.planned_times.join(', ') || '—';
  const statusCls = p.status==='done' ? 'st-done' : p.status==='partial' ? 'st-part' : 'st-pend';
  const statusTxt = p.status==='done' ? '✅ принято' : p.status==='partial' ? '🟡 частично' : '⏳ не принято';
  const doseBtns = (p.dose_ids||[]); // ids приходят отдельно ниже
  return `<div class="card ${statusCls}" style="--mc:${esc(p.color)}">
    <div class="cardHead"><span class="icon">${icon}</span><b>${esc(p.name)}</b>
      <span class="badge">${esc(p.med_type)}</span>${p.dosage?`<span class="badge gray">${esc(p.dosage)}</span>`:''}</div>
    ${p.description?`<div class="desc">${esc(p.description)}</div>`:''}
    <div class="row"><span class="muted">План: ${esc(p.frequency)}, в ${esc(planned)}</span></div>
    <div class="row"><span>Отмечено: <b>${p.taken_count}</b> · Последний: ${p.last_taken||'—'}</span>
      <span class="status">${statusTxt}</span></div>
    ${gaps}
    <div class="row btns">
      <button class="primary small" data-take="${p.id}" data-planned="">✔ Принято сейчас</button>
      ${p.dose_ids_html||''}
    </div>
    <div data-undobox></div>
  </div>`;
}

// добавляем кнопки отмены — получаем список доз дня
async function loadDayExtras(){
  const day = $('#dayPicker').value;
  const doses = await api('/doses?date='+day);
  const byMed = {};
  doses.forEach(d=> (byMed[d.med_id] ||= []).push(d));
  $$('#dayCards .card').forEach(card=>{
    const btn = card.querySelector('[data-take]');
    const id = +btn.dataset.take;
    const box = card.querySelector('[data-undobox]');
    box.innerHTML = (byMed[id]||[]).map(d=>
      `<button class="linkbtn" data-undo="${d.id}" title="Отменить запись">✖ ${d.taken_at.slice(11)}${d.note?' ('+esc(d.note)+')':''}</button>`).join(' ');
    box.querySelectorAll('[data-undo]').forEach(b=>b.onclick=async()=>{
      await api('/doses/'+b.dataset.undo+'/undo',{method:'POST'}); loadDay();
    });
  });
}
const _origLoadDay = loadDay;
loadDay = async function(){ await _origLoadDay(); await loadDayExtras(); };

// ---------------- take dialog
function openTake(medId){
  const now = new Date(); now.setSeconds(0,0);
  $('#takeForm med_id');
  $('#takeForm').reset();
  $('#takeForm [name=med_id]').value = medId;
  $('#takeForm [name=taken_at]').value = now.toISOString().slice(0,16);
  $('#takeDlg').showModal();
}
$('#takeForm').addEventListener('submit', async e=>{
  if (e.submitter && e.submitter.value==='save'){
    const fd = Object.fromEntries(new FormData(e.target).entries());
    try { await api('/doses',{json:{med_id:+fd.med_id, taken_at:fd.taken_at, note:fd.note}}); }
    catch(err){ alert(err.message); e.preventDefault(); }
  }
});

// ---------------- meds
async function loadMeds(){
  const activeOnly = !$('#showArchived').checked;
  const meds = await api('/meds'+(activeOnly?'?active=1':''));
  $('#medTable tbody').innerHTML = meds.map(m=>`<tr data-id="${m.id}">
    <td><span class="dot" style="background:${esc(m.color)}"></span><b>${esc(m.name)}</b></td>
    <td>${TYPE_ICON[m.med_type]||''} ${esc(m.med_type)}</td><td>${esc(m.dosage)}</td>
    <td class="muted">${esc(m.description)}</td>
    <td><button class="linkbtn editMed">изм.</button>${m.archived?'<span class="badge gray">архив</span>':''}</td></tr>`).join('');
  $$('#medTable .editMed').forEach(b=> b.onclick = ()=>{
    const id = +b.closest('tr').dataset.id;
    openMedDlg(meds.find(m=>m.id===id));
  });
}
$('#showArchived').onchange = loadMeds;
$('#addMedBtn').onclick = ()=>openMedDlg(null);

function openMedDlg(m){
  $('#medForm').reset();
  $('#medDlgTitle').textContent = m ? 'Редактировать лекарство' : 'Новое лекарство';
  $('#medForm [name=id]').value = m?m.id:'';
  if (m){ for (const k of ['name','dosage','description','color']) $(`#medForm [name=${k}]`).value=m[k]||'';
    $('#medForm [name=med_type]').value=m.med_type;
    $('#medForm [name=archived]').checked=!!m.archived; }
  $('#medDlg').showModal();
}
$('#medForm').addEventListener('submit', async e=>{
  if (e.submitter && e.submitter.value==='save'){
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    const body = {name:fd.name, med_type:fd.med_type, dosage:fd.dosage,
                  description:fd.description, color:fd.color, archived:!!fd.archived};
    try {
      if (fd.id) await api('/meds/'+fd.id,{method:'PUT', json:body});
      else await api('/meds',{json:body});
      $('#medDlg').close(); loadMeds();
    } catch(err){ alert(err.message); }
  }
});

// excel import
$('#importForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const f = $('#excelFile').files[0];
  if(!f){ $('#importMsg').textContent='Выберите файл .xlsx'; return; }
  const fd = new FormData(); fd.append('file', f);
  try{
    const r = await fetch('/api/import_excel',{method:'POST',body:fd});
    const d = await r.json();
    if(!r.ok) throw new Error(d.error||'ошибка');
    $('#importMsg').textContent = `Импортировано: лекарств ${d.meds.length}, приёмов ${d.doses}. Обновите вкладку «День».`;
  }catch(err){ $('#importMsg').textContent='Ошибка импорта: '+err.message; }
});

// ---------------- schedules
async function loadSched(){
  const list = await api('/schedules');
  $('#schedTable tbody').innerHTML = list.map(s=>`<tr data-id="${s.id}" data-med="${s.med_id}">
    <td><span class="dot" style="background:${esc(s.color)}"></span>${esc(s.name)}</td>
    <td>${esc(s.frequency)}</td>
    <td>${s.planned_times.map(esc).join(', ')||'<span class="muted">свободно</span>'}</td>
    <td>${esc(s.valid_from)} → ${esc(s.valid_to)||'∞'}</td>
    <td><button class="linkbtn ed">изм.</button> <button class="linkbtn del">удал.</button></td></tr>`).join('');
  $$('#schedTable .ed').forEach(b=> b.onclick=()=>openSchedDlg(list.find(x=>x.id==+b.closest('tr').dataset.id)));
  $$('#schedTable .del').forEach(b=> b.onclick=async()=>{
    if(confirm('Удалить план?')){ await api('/schedules/'+b.closest('tr').dataset.id,{method:'DELETE'}); loadSched(); }
  });
}
$('#addSchedBtn').onclick = ()=>openSchedDlg(null);

function timeInput(v=''){ const i=document.createElement('input'); i.type='time'; i.value=v; i.className='timeIn'; return i; }
function renderTimes(times){ const box=$('#timeInputs'); box.innerHTML=''; times.forEach(t=>box.appendChild(timeInput(t))); }
$('#addTime').onclick = ()=> $('#timeInputs').appendChild(timeInput(''));
$('#freqSel').onchange = ()=>{
  const n = {'1×':1,'2×':2,'3×':3,'4×':4}[$('#freqSel').value];
  if(n) renderTimes(Array.from({length:n},(_,i)=>['08:00','14:00','20:00','22:00'][i]||''));
};

async function openSchedDlg(s){
  // fill med select
  const meds = await api('/meds?active=1');
  $('#schedMedSel').innerHTML = meds.map(m=>`<option value="${m.id}">${esc(m.name)} (${esc(m.med_type)})</option>`).join('');
  $('#schedForm').reset();
  $('#schedDlgTitle').textContent = s?'Редактировать план':'Новый план';
  $('#schedForm [name=id]').value = s?s.id:'';
  if (s){
    $('#schedForm [name=med_id]').value=s.med_id;
    $('#schedForm [name=frequency]').value=s.frequency;
    $('#schedForm [name=valid_from]').value=s.valid_from;
    $('#schedForm [name=valid_to]').value=s.valid_to||'';
    renderTimes(s.planned_times);
  } else {
    $('#schedForm [name=valid_from]').value = $('#dayPicker').value || todayISO();
    renderTimes(['08:00']);
  }
  $('#schedDlg').showModal();
}
$('#schedForm').addEventListener('submit', async e=>{
  if (e.submitter && e.submitter.value==='save'){
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    const times = $$('#timeInputs .timeIn').map(i=>i.value).filter(Boolean);
    const body = {med_id:+fd.med_id, frequency:fd.frequency, valid_from:fd.valid_from,
                  valid_to:fd.valid_to||null, planned_times:times};
    try{
      if(fd.id) await api('/schedules/'+fd.id,{method:'PUT',json:body});
      else await api('/schedules',{json:body});
      $('#schedDlg').close(); loadSched();
    }catch(err){ alert(err.message); }
  }
});

// ---------------- history
async function loadHistory(){
  const days = $('#histDays').value || 7;
  const rows = await api('/history?days='+days);
  const dates = [...new Set(rows.map(r=>r.d))].sort();
  const names = [...new Set(rows.map(r=>r.name))];
  const map = {}; rows.forEach(r=> map[r.d+'|'+r.name]=r.n);
  $('#histGrid').innerHTML = `<table class="list heat"><thead><tr><th>Дата</th>${names.map(n=>`<th>${esc(n)}</th>`).join('')}</tr></thead>
   <tbody>${dates.map(d=>`<tr><td>${d}</td>${names.map(n=>{
     const v=map[d+'|'+n]; return `<td class="${v?'hit':''}">${v||''}</td>`;}).join('')}</tr>`).join('')}</tbody></table>`;
}
$('#histRefresh').onclick = loadHistory;

// ---------------- init
(async ()=>{
  META = await api('/meta');
  $('#medTypeSel').innerHTML = META.types.map(t=>`<option>${t}</option>`).join('');
  $('#dayPicker').value = todayISO();
  loadDay();
})();

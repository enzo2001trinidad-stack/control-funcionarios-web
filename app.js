(() => {
  'use strict';
  const key = 'control-funcionarios-v1';
  const days = [['lunes','Lunes'],['martes','Martes'],['miercoles','Miércoles'],['jueves','Jueves'],['viernes','Viernes'],['sabado','Sábado']];
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  const $ = id => document.getElementById(id);
  const freshSchedule = () => Object.fromEntries(days.map(([day]) => [day, null]));
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const intervals = value => Array.isArray(value) ? value : value && Array.isArray(value.shifts) ? value.shifts : value && typeof value === 'object' && value.start && value.end ? [value] : [];
  const clock = value => { const [h,m] = value.split(':').map(Number); return h*60+m; };
  const duration = (start,end) => !timePattern.test(start) || !timePattern.test(end) || start===end ? null : (clock(end)-clock(start)+1440)%1440;
  const total = value => intervals(value).reduce((sum,part) => sum + (duration(part.start,part.end)||0),0);
  const format = minutes => `${Math.floor(Math.abs(minutes)/60)} h ${String(Math.abs(minutes)%60).padStart(2,'0')} min`;
  const signed = minutes => `${minutes>0?'+':minutes<0?'−':''}${format(minutes)}`;
  const signedClass = minutes => minutes>0?'positive':minutes<0?'negative':'';
  const dayKey = date => { if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return null; const d=new Date(`${date}T12:00:00`).getDay(); return d>=1 && d<=6 ? days[d-1][0] : null; };
  const planned = (item,date) => intervals(item.schedule?.[dayKey(date)]);
  const matches = (item,query) => !query || `${item.name} ${item.number||''}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es').trim());
  const sorted = () => [...data.employees].sort((a,b)=>a.name.localeCompare(b.name,'es'));
  function load() { try { const value=JSON.parse(localStorage.getItem(key)); return value && Array.isArray(value.employees) && value.records && typeof value.records==='object' ? value : {employees:[],records:{}}; } catch { return {employees:[],records:{}}; } }
  let data=load(), editId=null;
  const notice = message => { $('notice').textContent=message; $('notice').hidden=!message; };
  const save = () => { try { localStorage.setItem(key,JSON.stringify(data)); return true; } catch { notice('No se pudieron guardar los datos en este navegador.'); return false; } };
  function validate(parts) {
    if (!parts.length) return 'Agregá un tramo horario.';
    const spans=[];
    for (const part of parts) {
      const length=duration(part.start,part.end);
      if(length===null) return 'Completá una entrada y salida distintas en formato de 24 horas.';
      spans.push([clock(part.start),clock(part.start)+length]);
    }
    if(spans.reduce((sum,[start,end])=>sum+end-start,0)>1440) return 'Los tramos de un día no pueden sumar más de 24 horas.';
    for(let i=0;i<spans.length;i++)for(let j=i+1;j<spans.length;j++)for(const offset of [-1440,0,1440]) {
      if(spans[i][0]<spans[j][1]+offset && spans[j][0]+offset<spans[i][1]) return 'Hay tramos horarios que se superponen.';
    }
    return '';
  }
  const pair = (part={},kind='planned') => `<div class="clock-pair"><label>Ingreso<input type="time" class="${kind}-start" value="${escape(part.start||'')}" required></label><span>—</span><label>Salida<input type="time" class="${kind}-end" value="${escape(part.end||'')}" required></label><button type="button" class="remove-interval" data-action="remove" aria-label="Quitar tramo">×</button></div>`;
  const readPairs = (container,kind) => [...container.querySelectorAll('.clock-pair')].map(row=>({start:row.querySelector(`.${kind}-start`).value,end:row.querySelector(`.${kind}-end`).value}));
  function drawSchedule(schedule=freshSchedule()) {
    $('scheduleFields').innerHTML=days.map(([day,label])=>{
      const parts=intervals(schedule[day]);
      return `<div class="day-row" data-day="${day}"><label class="day-switch"><input type="checkbox" class="day-check" ${parts.length?'checked':''}><span>${label}</span></label><div class="shift-fields">${parts.length ? parts.map(part=>pair(part)).join('')+'<button type="button" class="add-interval" data-action="add">+ Otro horario</button>' : '<span class="free">Libre</span>'}</div></div>`;
    }).join('');
  }
  $('scheduleFields').addEventListener('change',event=>{
    if(!event.target.matches('.day-check'))return;
    event.target.closest('.day-row').querySelector('.shift-fields').innerHTML=event.target.checked ? pair({start:'08:00',end:'16:00'})+'<button type="button" class="add-interval" data-action="add">+ Otro horario</button>' : '<span class="free">Libre</span>';
  });
  $('scheduleFields').addEventListener('click',event=>{
    const action=event.target.dataset.action, row=event.target.closest('.day-row'); if(!action || !row)return;
    if(action==='add')event.target.insertAdjacentHTML('beforebegin',pair({start:'',end:''}));
    if(action==='remove') { event.target.closest('.clock-pair').remove(); if(!row.querySelector('.clock-pair')) {row.querySelector('.day-check').checked=false;row.querySelector('.shift-fields').innerHTML='<span class="free">Libre</span>';} }
  });
  function readSchedule() {
    const schedule=freshSchedule();
    for(const row of $('scheduleFields').querySelectorAll('.day-row')) {
      if(!row.querySelector('.day-check').checked)continue;
      const parts=readPairs(row,'planned'), error=validate(parts);
      if(error){notice(`${days.find(([day])=>day===row.dataset.day)[1]}: ${error}`);return null;}
      schedule[row.dataset.day]=parts;
    }
    return schedule;
  }
  function clearEdit(){editId=null;$('employeeName').value='';$('employeeNumber').value='';$('formTitle').textContent='Nuevo funcionario';$('saveEmployee').textContent='Agregar funcionario';$('cancelEdit').hidden=true;drawSchedule();}
  $('employeeForm').addEventListener('submit',event=>{
    event.preventDefault();const name=$('employeeName').value.trim(),number=$('employeeNumber').value.trim(),schedule=readSchedule();
    if(!name||!number||!schedule)return;
    if(data.employees.some(item=>item.id!==editId && item.number===number)){notice('Ese número de identificación ya pertenece a otro funcionario.');return;}
    const previous=JSON.stringify(data);
    if(editId){const item=data.employees.find(item=>item.id===editId);if(item)Object.assign(item,{name,number,schedule});}
    else data.employees.push({id:crypto.randomUUID(),name,number,schedule});
    if(!save()){data=JSON.parse(previous);return;}
    notice('');clearEdit();render();
  });
  $('cancelEdit').addEventListener('click',clearEdit);
  function renderRoster(){
    const count=data.employees.length;$('staffCount').textContent=`${count} ${count===1?'funcionario':'funcionarios'}`;$('rosterCount').textContent=count;
    const items=sorted().filter(item=>matches(item,$('rosterSearch').value));
    $('rosterList').innerHTML=items.length ? items.map(item=>`<article class="staff-card" data-id="${escape(item.id)}"><div class="person"><span class="avatar">${escape(item.name.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join(''))}</span><div><h3>${escape(item.name)}</h3><small>${item.number?`N.º ${escape(item.number)} · `:''}${days.filter(([day])=>intervals(item.schedule?.[day]).length).length} días asignados</small></div></div><div class="mini-grid">${days.map(([day,label])=>`<div><small>${label.slice(0,3)}</small><strong>${intervals(item.schedule?.[day]).length?intervals(item.schedule[day]).map(part=>`${escape(part.start)}–${escape(part.end)}`).join('<br>'):'Libre'}</strong></div>`).join('')}</div><div class="card-actions"><button type="button" data-action="edit">Editar</button><button type="button" data-action="delete" class="delete">Eliminar</button></div></article>`).join('') : `<p class="empty"><strong>${count?'Sin coincidencias':'Aún no hay funcionarios'}</strong>${count?'Probá con otro nombre o número.':'Completá la ficha para empezar.'}</p>`;
  }
  $('rosterList').addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');if(!button)return;
    const id=button.closest('.staff-card').dataset.id,item=data.employees.find(e=>e.id===id);if(!item)return;
    if(button.dataset.action==='edit'){editId=id;$('employeeName').value=item.name;$('employeeNumber').value=item.number||'';$('formTitle').textContent='Editar funcionario';$('saveEmployee').textContent='Guardar cambios';$('cancelEdit').hidden=false;drawSchedule(item.schedule);window.scrollTo({top:0,behavior:'smooth'});}
    else if(confirm(`¿Eliminar a ${item.name} y sus registros de horas?`)){data.employees=data.employees.filter(e=>e.id!==id);for(const entries of Object.values(data.records))delete entries[id];save();if(editId===id)clearEdit();render();}
  });
  $('rosterSearch').addEventListener('input',renderRoster);
  const shiftsText = parts => parts.length ? parts.map(part=>`${escape(part.start)}–${escape(part.end)}`).join('<br>') : 'Libre';
  function renderHours(){
    const date=$('workDate').value,entries=data.records[date]||{},items=sorted().filter(item=>matches(item,$('hoursSearch').value));
    let plannedTotal=0,workedTotal=0,balanceTotal=0;
    $('timesheet').innerHTML=items.length ? items.map(item=>{
      const shifts=planned(item,date),expected=total(shifts),record=intervals(entries[item.id]),actual=record.length?total(record):null,delta=actual===null?null:actual-expected;
      plannedTotal+=expected;if(actual!==null){workedTotal+=actual;balanceTotal+=delta;}
      return `<article class="shift-entry" data-id="${escape(item.id)}"><div><h3>${escape(item.name)}</h3><span class="hint">${item.number?`N.º ${escape(item.number)} · `:''}${shifts.length?'Turno pautado':'Sin turno pautado'}</span></div><div class="planned">${shiftsText(shifts)}<small>${format(expected)} pautadas</small></div><div class="actual-fields">${record.map(part=>pair(part,'actual')).join('')}<button type="button" class="add-interval" data-action="add">+ Otro horario</button></div><div class="entry-actions"><button type="button" class="secondary" data-action="save">Guardar</button><span class="balance ${delta===null?'':signedClass(delta)}">${delta===null?'Sin registrar':signed(delta)}</span></div><label class="note-field">Notas<textarea class="attendance-note" rows="2" maxlength="1000" placeholder="Observaciones de este funcionario en esta fecha">${escape(entries[item.id]?.note||'')}</textarea></label></article>`;
    }).join('') : `<p class="empty"><strong>${data.employees.length?'Sin coincidencias':'Sin funcionarios'}</strong>${data.employees.length?'Probá con otro nombre o número.':'Agregá funcionarios en la primera pestaña.'}</p>`;
    $('scheduledTotal').textContent=format(plannedTotal);$('workedTotal').textContent=format(workedTotal);$('balanceTotal').textContent=signed(balanceTotal);$('balanceTotal').className=signedClass(balanceTotal);
  }
  $('timesheet').addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');if(!button)return;
    const row=button.closest('.shift-entry'),action=button.dataset.action;
    if(action==='add'){button.insertAdjacentHTML('beforebegin',pair({},'actual'));return;}
    if(action==='remove'){button.closest('.clock-pair').remove();return;}
    if(action==='save'){
      const parts=readPairs(row,'actual'),note=row.querySelector('.attendance-note').value.trim();if(parts.length){const error=validate(parts);if(error){notice(error);return;}}
      const date=$('workDate').value,previous=JSON.stringify(data);data.records[date]||={};
      if(parts.length||note)data.records[date][row.dataset.id]={shifts:parts,note};else delete data.records[date][row.dataset.id];
      if(!Object.keys(data.records[date]).length)delete data.records[date];
      if(!save()){data=JSON.parse(previous);return;}
      notice('');renderHours();renderBalances();
    }
  });
  $('workDate').addEventListener('change',renderHours);$('hoursSearch').addEventListener('input',renderHours);
  function renderBalances(){
    const date=$('balanceDate').value,month=date.slice(0,7),year=date.slice(0,4),items=sorted().filter(item=>matches(item,$('balanceSearch').value));
    $('balanceList').innerHTML=items.length?items.map(item=>{
      const rows=Object.entries(data.records).filter(([key,entries])=>/^\d{4}-\d{2}-\d{2}$/.test(key)&&intervals(entries?.[item.id]).length&&key.slice(0,4)===year).sort(([a],[b])=>a.localeCompare(b)).map(([key,entries])=>{
        const expected=total(planned(item,key)),actual=total(entries[item.id]);return {date:key,expected,actual,delta:actual-expected};
      });
      const daily=rows.find(row=>row.date===date),monthly=rows.filter(row=>row.date.startsWith(month));
      const sum=list=>list.reduce((value,row)=>value+row.delta,0);
      const value=(list,label)=>list.length?`<strong class="${signedClass(sum(list))}">${signed(sum(list))}</strong><small>${list.length} ${list.length===1?'día registrado':'días registrados'}</small>`:`<strong>Sin registros</strong><small>${label}</small>`;
      const months=[...new Set(rows.map(row=>row.date.slice(0,7)))];
      return `<article class="panel balance-card"><div class="balance-heading"><div><h3>${escape(item.name)}</h3><small>${item.number?`N.º ${escape(item.number)}`:'Sin número de ID'}</small></div></div><div class="balance-grid"><div><span>Día · ${escape(date)}</span>${value(daily?[daily]:[],'Sin registro ese día')}</div><div><span>Mes · ${escape(month)}</span>${value(monthly,'Sin registros ese mes')}</div><div><span>Año · ${escape(year)}</span>${value(rows,'Sin registros ese año')}</div></div><details><summary>Ver desglose de días y meses</summary>${months.length?months.map(m=>{const detail=rows.filter(row=>row.date.startsWith(m));return `<div class="month-group"><h4>${escape(m)} <span class="${signedClass(sum(detail))}">${signed(sum(detail))}</span></h4><div class="detail-head"><span>Fecha</span><span>Pautadas</span><span>Trabajadas</span><span>Saldo</span></div>${detail.map(row=>`<div class="detail-row"><span>${escape(row.date)}</span><span>${format(row.expected)}</span><span>${format(row.actual)}</span><strong class="${signedClass(row.delta)}">${signed(row.delta)}</strong></div>`).join('')}</div>`;}).join(''):'<p class="empty">Todavía no hay días registrados en este año.</p>'}</details></article>`;
    }).join(''):`<p class="panel empty"><strong>${data.employees.length?'Sin coincidencias':'Sin funcionarios'}</strong>${data.employees.length?'Probá con otro nombre o número.':'Agregá funcionarios para ver saldos.'}</p>`;
  }
  $('balanceDate').addEventListener('change',renderBalances);$('balanceSearch').addEventListener('input',renderBalances);
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-tab]').forEach(tab=>tab.classList.toggle('selected',tab===button));
    for(const section of ['funcionarios','horas','saldos'])$(section).hidden=button.dataset.tab!==section;
    if(button.dataset.tab==='horas')renderHours();if(button.dataset.tab==='saldos')renderBalances();
  }));
  $('exportData').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`funcionarios-respaldo-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  $('importData').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    try{const parsed=JSON.parse(await file.text());if(!Array.isArray(parsed.employees)||!parsed.records||typeof parsed.records!=='object'||parsed.employees.some(e=>!e.id||typeof e.name!=='string'||!e.schedule))throw Error('Archivo inválido');if(!confirm('Esto reemplazará los datos guardados en este navegador. ¿Continuar?'))return;data=parsed;save();clearEdit();render();notice('Respaldo importado.');}
    catch{notice('No se pudo importar ese respaldo.');}finally{event.target.value='';}
  });
  function render(){renderRoster();renderHours();renderBalances();}
  $('workDate').value=today();$('balanceDate').value=today();drawSchedule();render();
})();

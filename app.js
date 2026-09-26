(() => {
  'use strict';
  const key = 'control-funcionarios-v1';
  const days = [['lunes','Lunes'],['martes','Martes'],['miercoles','Miércoles'],['jueves','Jueves'],['viernes','Viernes'],['sabado','Sábado']];
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  const $ = (id) => document.getElementById(id);
  const freshSchedule = () => Object.fromEntries(days.map(([day]) => [day, null]));
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function load() { try { const value = JSON.parse(localStorage.getItem(key)); return value && Array.isArray(value.employees) && value.records && typeof value.records === 'object' ? value : {employees:[],records:{}}; } catch { return {employees:[],records:{}}; } }
  let data = load();
  let editId = null;
  const save = () => { try { localStorage.setItem(key, JSON.stringify(data)); return true; } catch { notice('No se pudieron guardar los datos en este navegador.'); return false; } };
  const notice = (message) => { $('notice').textContent = message; $('notice').hidden = !message; };
  const duration = (start, end) => { if (!timePattern.test(start) || !timePattern.test(end) || start === end) return null; const [sh,sm] = start.split(':').map(Number); const [eh,em] = end.split(':').map(Number); const a = sh*60+sm, b = eh*60+em; return b > a ? b-a : b+1440-a; };
  const format = (minutes) => `${Math.floor(Math.abs(minutes)/60)} h ${String(Math.abs(minutes)%60).padStart(2,'0')} min`;
  const balanceText = (minutes) => `${minutes > 0 ? '+' : minutes < 0 ? '−' : ''}${format(minutes)}`;
  const selectedDay = () => { const d = new Date(`${$('workDate').value}T12:00:00`).getDay(); return d >= 1 && d <= 6 ? days[d-1][0] : null; };
  const shiftFor = (employee) => employee.schedule?.[selectedDay()] || null;
  function drawSchedule(schedule = freshSchedule()) {
    $('scheduleFields').innerHTML = days.map(([day,label]) => {
      const shift = schedule[day];
      return `<div class="day-row" data-day="${day}"><label class="day-switch"><input type="checkbox" class="day-check" ${shift?'checked':''}><span>${label}</span></label><div class="shift-fields">${shift ? `<div class="clock-pair"><label>Ingreso<input type="time" class="planned-start" value="${escape(shift.start)}" required></label><span>—</span><label>Salida<input type="time" class="planned-end" value="${escape(shift.end)}" required></label></div>` : '<span class="free">Libre</span>'}</div></div>`;
    }).join('');
  }
  $('scheduleFields').addEventListener('change', (event) => {
    if (!event.target.matches('.day-check')) return;
    event.target.closest('.day-row').querySelector('.shift-fields').innerHTML = event.target.checked ? '<div class="clock-pair"><label>Ingreso<input type="time" class="planned-start" value="08:00" required></label><span>—</span><label>Salida<input type="time" class="planned-end" value="16:00" required></label></div>' : '<span class="free">Libre</span>';
  });
  function readSchedule() {
    const schedule = freshSchedule();
    for (const row of $('scheduleFields').querySelectorAll('.day-row')) {
      if (!row.querySelector('.day-check').checked) continue;
      const start = row.querySelector('.planned-start').value, end = row.querySelector('.planned-end').value;
      if (duration(start,end) === null) { notice(`Revisá el horario de ${days.find(([day])=>day===row.dataset.day)[1]}.`); return null; }
      schedule[row.dataset.day] = {start,end};
    }
    return schedule;
  }
  function clearEdit() { editId=null; $('employeeName').value=''; $('employeeNumber').value=''; $('formTitle').textContent='Nuevo funcionario'; $('saveEmployee').textContent='Agregar funcionario'; $('cancelEdit').hidden=true; drawSchedule(); }
  $('employeeForm').addEventListener('submit', (event) => {
    event.preventDefault(); const name=$('employeeName').value.trim(), number=$('employeeNumber').value.trim(), schedule=readSchedule();
    if (!name || !number || !schedule) return;
    if (data.employees.some((employee)=>employee.id!==editId && employee.number===number)) { notice('Ese número de identificación ya pertenece a otro funcionario.'); return; }
    const previous=JSON.stringify(data);
    if (editId) { const item=data.employees.find((employee)=>employee.id===editId); if(item) Object.assign(item,{name,number,schedule}); }
    else data.employees.push({id:crypto.randomUUID(),name,number,schedule});
    if (!save()) { data=JSON.parse(previous); return; }
    notice(''); clearEdit(); render();
  });
  $('cancelEdit').addEventListener('click', clearEdit);
  function renderRoster() {
    const count=data.employees.length; $('staffCount').textContent=`${count} ${count===1?'funcionario':'funcionarios'}`; $('rosterCount').textContent=count;
    const items=[...data.employees].sort((a,b)=>a.name.localeCompare(b.name,'es'));
    $('rosterList').innerHTML = items.length ? items.map((item)=>`<article class="staff-card" data-id="${escape(item.id)}"><div class="person"><span class="avatar">${escape(item.name.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join(''))}</span><div><h3>${escape(item.name)}</h3><small>${item.number ? `N.º ${escape(item.number)} · ` : ''}${days.filter(([day])=>item.schedule?.[day]).length} días asignados</small></div></div><div class="mini-grid">${days.map(([day,label])=>`<div><small>${label.slice(0,3)}</small><strong>${item.schedule?.[day] ? `${escape(item.schedule[day].start)}–${escape(item.schedule[day].end)}` : 'Libre'}</strong></div>`).join('')}</div><div class="card-actions"><button type="button" data-action="edit">Editar</button><button type="button" data-action="delete" class="delete">Eliminar</button></div></article>`).join('') : '<p class="empty"><strong>Aún no hay funcionarios</strong>Completá la ficha para empezar.</p>';
  }
  $('rosterList').addEventListener('click', (event) => {
    const button=event.target.closest('button[data-action]'); if (!button) return;
    const id=button.closest('.staff-card').dataset.id, item=data.employees.find(e=>e.id===id); if (!item) return;
    if (button.dataset.action==='edit') { editId=id; $('employeeName').value=item.name; $('employeeNumber').value=item.number||''; $('formTitle').textContent='Editar funcionario'; $('saveEmployee').textContent='Guardar cambios'; $('cancelEdit').hidden=false; drawSchedule(item.schedule); window.scrollTo({top:0,behavior:'smooth'}); }
    else if (confirm(`¿Eliminar a ${item.name} y sus registros de horas?`)) {
      data.employees=data.employees.filter(e=>e.id!==id);
      for (const entries of Object.values(data.records)) delete entries[id];
      save(); if(editId===id)clearEdit(); render();
    }
  });
  function renderHours() {
    const date=$('workDate').value, entries=data.records[date] || {};
    const items=[...data.employees].sort((a,b)=>a.name.localeCompare(b.name,'es'));
    let plannedTotal=0, workedTotal=0, balanceTotal=0;
    $('timesheet').innerHTML = items.length ? items.map((item)=>{
      const shift=shiftFor(item), expected=shift ? duration(shift.start,shift.end) : 0;
      plannedTotal += expected || 0;
      const record=entries[item.id], actual=record ? duration(record.start,record.end) : null;
      const delta=actual === null ? null : actual-(expected||0);
      if(actual!==null){workedTotal+=actual;balanceTotal+=delta;}
      const className=delta===null?'':delta>0?'positive':delta<0?'negative':'';
      return `<div class="shift-entry" data-id="${escape(item.id)}"><div><h3>${escape(item.name)}</h3><span class="hint">${item.number ? `N.º ${escape(item.number)} · ` : ''}${shift?'Turno pautado':'Sin turno pautado'}</span></div><span class="planned">${shift?`${escape(shift.start)} a ${escape(shift.end)}`:'Libre'}</span><div class="actual-pair"><label>Entrada real<input type="time" class="actual-time actual-start" value="${escape(record?.start||'')}"></label><label>Salida real<input type="time" class="actual-time actual-end" value="${escape(record?.end||'')}"></label></div><span class="balance ${className}">${delta===null?'Sin registrar':balanceText(delta)}</span></div>`;
    }).join('') : '<p class="empty"><strong>Sin funcionarios</strong>Agregá funcionarios en la primera pestaña.</p>';
    $('scheduledTotal').textContent=format(plannedTotal);$('workedTotal').textContent=format(workedTotal);$('balanceTotal').textContent=balanceText(balanceTotal);
    $('balanceTotal').className=balanceTotal>0?'positive':balanceTotal<0?'negative':'';
  }
  $('timesheet').addEventListener('change', (event)=>{
    if(!event.target.matches('.actual-time'))return;
    const row=event.target.closest('.shift-entry'), start=row.querySelector('.actual-start').value, end=row.querySelector('.actual-end').value, date=$('workDate').value;
    if ((start && !end) || (!start && end)) { notice('Completá entrada y salida para guardar el registro.'); return; }
    if (start && duration(start,end)===null) { notice('La entrada y salida no pueden ser iguales.'); return; }
    data.records[date] ||= {};
    if(start) data.records[date][row.dataset.id]={start,end}; else delete data.records[date][row.dataset.id];
    if(Object.keys(data.records[date]).length===0) delete data.records[date];
    if(save()){notice('');renderHours();}
  });
  $('workDate').addEventListener('change',renderHours);
  document.querySelectorAll('[data-tab]').forEach((button)=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-tab]').forEach((tab)=>tab.classList.toggle('selected',tab===button));
    $('funcionarios').hidden=button.dataset.tab!=='funcionarios';$('horas').hidden=button.dataset.tab!=='horas';
    if(button.dataset.tab==='horas')renderHours();
  }));
  $('exportData').addEventListener('click',()=>{ const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}), url=URL.createObjectURL(blob), a=document.createElement('a');a.href=url;a.download=`funcionarios-respaldo-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); });
  $('importData').addEventListener('change',async(event)=>{
    const file=event.target.files[0]; if(!file)return;
    try { const parsed=JSON.parse(await file.text()); if(!Array.isArray(parsed.employees)||!parsed.records||typeof parsed.records!=='object'||parsed.employees.some(e=>!e.id||typeof e.name!=='string'||!e.schedule))throw Error('Archivo inválido'); if(!confirm('Esto reemplazará los datos guardados en este navegador. ¿Continuar?'))return;data=parsed;save();clearEdit();render();notice('Respaldo importado.'); }
    catch { notice('No se pudo importar ese respaldo.'); }
    finally { event.target.value=''; }
  });
  function render(){renderRoster();renderHours();}
  $('workDate').value=today();drawSchedule();render();
})();

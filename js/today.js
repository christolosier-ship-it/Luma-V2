const TodayScreen = {
  async render() {
    const dateStr = todayStr();
    const screen = document.getElementById('screen-today');
    try {
      const [medications, phases, allActions, protocols, protocolEvents, notes, symptomsEntries, dosageOverrides] = await Promise.all([
        DB.getMedications(), DB.getPhases(), DB.getAllIntakeActions(), DB.getProtocols(), DB.getProtocolEvents(), DB.getDailyNotes(), DB.getDailySymptoms(), DB.getDosageOverrides()
      ]);
      const activeProtocolIds = new Set(protocols.filter(p => p.status === 'active').map(p => p.id));
      const filteredMeds = medications.filter(m => !m.protocolId || activeProtocolIds.has(m.protocolId));
      const filteredPhases = phases.filter(p => !p.protocolId || activeProtocolIds.has(p.protocolId));
      const actionsMap = Intakes.buildActionsMap(allActions);
      const events = Intakes.generateForDate(filteredMeds, filteredPhases, dateStr, dosageOverrides);
      const intakes = Intakes.mergeWithActions(events, actionsMap);
      const dayProtocolEvents = protocolEvents.filter(e => e.date === dateStr && activeProtocolIds.has(e.protocolId));
      const flowGroups = TodayScreen._dayFlowGroups(intakes, dayProtocolEvents, dateStr);
      const timelineItems = [...flowGroups.active, ...flowGroups.done];
      const dayNote = notes.find(n=>n.date===dateStr) || {id:dateStr,date:dateStr,freeNote:''};
      const daySymptoms = symptomsEntries.find(n=>n.date===dateStr) || {id:dateStr,date:dateStr,symptoms:getDefaultSymptoms(),otherSymptomLabel:''};

      const symptomFields = [
        { key:'nausea', label:'Nausée' },
        { key:'fatigue', label:'Fatigue' },
        { key:'pain', label:'Douleur' },
        { key:'headache', label:'Maux de tête' },
        { key:'dizziness', label:'Vertiges' },
        { key:'mood', label:'Humeur' },
        { key:'sleep', label:'Sommeil' },
        { key:'bleeding', label:'Saignement' },
        { key:'other', label: daySymptoms.otherSymptomLabel || 'Autre symptôme' }
      ];
      const symptomOptions = [
        { value:0, label:'0 - aucun' },
        { value:1, label:'1 - léger' },
        { value:2, label:'2 - modéré' },
        { value:3, label:'3 - fort' }
      ];
      const symptomSelects = symptomFields.map(field=>`<label class='symptom-field'><span>${escHtml(field.label)}</span><select id='n-${escHtml(field.key)}' class='form-input'>${symptomOptions.map(opt=>`<option value='${opt.value}' ${Number(daySymptoms.symptoms?.[field.key]??0)===opt.value?'selected':''}>${opt.label}</option>`).join('')}</select></label>`).join('');

      const isToday = dateStr === todayStr();
      const dateLabel = isToday ? 'Aujourd\'hui' : capitalize(formatDateFR(dateStr));
      const takenCount = intakes.filter(i => i.status === 'taken').length;
      const plannedCount = intakes.length;
      const lateCount = intakes.filter(i => Intakes.getVisualStatus(i,dateStr)==='late').length;
      const eventCount = dayProtocolEvents.length;
      const nowMinutes = new Date().getHours()*60 + new Date().getMinutes();
      const nextAction = TodayScreen._getNextAction(intakes, dayProtocolEvents, nowMinutes, dateStr);
      const nextActionText = nextAction ? `${nextAction.prefix} : ${nextAction.timeLabel} - ${nextAction.title}` : 'Aucune action prévue aujourd’hui.';
      const hasNoteData = hasFreeNote(dayNote);
      const hasSymptomsData = hasPositiveSymptoms(daySymptoms);
      const symptomsSummary = symptomsToText(daySymptoms, true);
      const missingVariableMeds = filteredMeds.filter(m => m.dosageMode === 'variable' && filteredPhases.some(ph => ph.medicationId === m.id && dateInRange(dateStr, ph.startDate, ph.endDate)) && !dosageOverrides.some(o => o.medicationId === m.id && o.date === dateStr && o.enabled !== false && String(o.dosage || '').trim()));
      const missingVariableNotice = missingVariableMeds.length ? `<div class='card card-sm today-info-notice'><p><strong>Traitements à dosage variable sans dosage aujourd’hui :</strong></p>${missingVariableMeds.map(m=>`<div class='missing-dosage-row'><span>${escHtml(m.name)}</span><button class='btn-settings js-open-missing-dosage' data-med-id='${escHtml(m.id)}'>Ouvrir calendrier</button></div>`).join('')}</div>` : '';

      screen.innerHTML = `<div class="today-header"><div class="today-date-label">${dateLabel}</div></div>
      <div class='card today-summary'><div class='today-summary-title'>Résumé aujourd’hui</div><div class='today-count'>${plannedCount} prévue${plannedCount!==1?'s':''} · ${takenCount} réalisée${takenCount!==1?'s':''} · ${lateCount} en retard · ${eventCount} événement${eventCount!==1?'s':''}</div><div class='today-count today-next-action'>${escHtml(nextActionText)}</div></div>
      ${missingVariableNotice}
      <div class="section-title day-flow-title">Déroulé du jour</div>
      ${timelineItems.length===0?TodayScreen._emptyState(filteredMeds.length):`${flowGroups.active.map(item=>item.kind==='intake'?TodayScreen._intakeCard(item.data,dateStr):TodayScreen._eventCard(item.data)).join('')}${flowGroups.done.length?`<div class="day-flow-separator">Terminés aujourd’hui</div>${flowGroups.done.map(item=>item.kind==='intake'?TodayScreen._intakeCard(item.data,dateStr):TodayScreen._eventCard(item.data)).join('')}`:''}`}
      <details class='card card-sm' ${hasNoteData?'open':''}><summary><strong>Note du jour</strong>${hasNoteData?`<span class='today-count' style='display:block;'>Note renseignée</span>`:''}</summary><textarea id='n-free' class='form-input' style='margin-top:8px;' placeholder='Note libre'>${escHtml(dayNote.freeNote||'')}</textarea><button id='save-note' class='btn btn-primary btn-compact' style='margin-top:8px;'>Enregistrer la note</button></details>
      <details class='card card-sm' ${hasSymptomsData?'open':''}><summary><strong>Symptômes du jour</strong>${hasSymptomsData?`<span class='today-count' style='display:block;'>${escHtml(symptomsSummary)}</span>`:''}</summary><div class='symptom-grid' style='margin-top:8px;'>${symptomSelects}</div><label style='display:block;margin-top:8px;'>Libellé autre symptôme<input id='n-other-label' class='form-input' value='${escHtml(daySymptoms.otherSymptomLabel||'')}' placeholder='Ex. fourmillements'></label><button id='save-symptoms' class='btn btn-primary btn-compact' style='margin-top:8px;'>Enregistrer les symptômes</button></details>`;

      screen.querySelectorAll('.intake-card .btn-action').forEach(btn=>btn.addEventListener('click', async (e)=>{const card=e.target.closest('.intake-card'); await TodayScreen._handleAction(e.target.dataset.action, card.dataset.key, e.target.dataset.time, dateStr);}));
      screen.querySelectorAll('.btn-toggle-event').forEach(btn=>btn.addEventListener('click', async ()=>{await DB.toggleProtocolEventCompleted(btn.dataset.id); await TodayScreen.render(); await TimelineScreen.render();}));
      screen.querySelectorAll('.btn-edit-event').forEach(btn=>btn.addEventListener('click', ()=>TimelineScreen.openEventForm(protocolEvents.find(e=>e.id===btn.dataset.id), protocols)));
      screen.querySelector('#save-note').addEventListener('click', async()=>{await DB.saveDailyNote({id:dateStr,date:dateStr,freeNote:screen.querySelector('#n-free').value.trim(),updatedAt:new Date().toISOString()});showToast('Note enregistrée'); await TodayScreen.render();});
      screen.querySelector('#save-symptoms').addEventListener('click', async()=>{const symptoms={}; for(const f of symptomFields){symptoms[f.key]=Number(screen.querySelector(`#n-${f.key}`).value||0);} await DB.saveDailySymptoms({id:dateStr,date:dateStr,symptoms,otherSymptomLabel:screen.querySelector('#n-other-label').value.trim(),updatedAt:new Date().toISOString()}); showToast('Symptômes enregistrés'); await TodayScreen.render();});
      screen.querySelectorAll('.js-open-missing-dosage').forEach(btn=>btn.addEventListener('click', async()=>{ const med=await DB.getMedication(btn.dataset.medId); if(med) await MedicationsScreen.openDosageCalendar(med); }));
      screen.querySelector('.js-empty-add-protocol')?.addEventListener('click', ()=>MedicationsScreen.openProtocolForm());
      screen.querySelector('.js-empty-add-med')?.addEventListener('click', ()=>MedicationsScreen.openFixedWithDefaultProtocol());
      screen.querySelector('.js-empty-add-variable')?.addEventListener('click', ()=>MedicationsScreen.openVariableWithDefaultProtocol());
      screen.querySelector('.js-empty-import')?.addEventListener('click', ()=>{ App.navigateTo('settings'); setTimeout(()=>document.getElementById('btn-import')?.click(), 50); });
    } catch (err) { console.error(err); screen.innerHTML='<div class="card">Erreur chargement aujourd’hui</div>'; }
  },
  _timeMinutes(value){ return isValidTimeHHMM(value) ? Number(value.slice(0,2))*60 + Number(value.slice(3,5)) : null; },
  _dayFlowGroups(intakes, protocolEvents, dateStr){
    const normalizeItem = (kind, data, index) => {
      const time = kind === 'intake' ? (data.displayTime || data.time || '') : (data.time || '');
      const minutes = TodayScreen._timeMinutes(time);
      const status = kind === 'intake' ? Intakes.getVisualStatus(data, dateStr) : getEventVisualStatus(data, dateStr).key;
      const done = kind === 'intake' ? ['taken','skipped'].includes(data.status) : !!data.completed;
      return { kind, data, time, minutes, hasTime: minutes !== null, status, done, index };
    };
    const sortWithinGroup = (a,b) => {
      if (a.hasTime && b.hasTime && a.minutes !== b.minutes) return a.minutes - b.minutes;
      if (a.hasTime !== b.hasTime) return a.hasTime ? -1 : 1;
      if (a.kind !== b.kind) return a.kind === 'intake' ? -1 : 1;
      return a.index - b.index;
    };
    const items = [
      ...intakes.map((data, index)=>normalizeItem('intake', data, index)),
      ...protocolEvents.map((data, index)=>normalizeItem('event', data, index))
    ];
    return {
      active: items.filter(item=>!item.done).sort(sortWithinGroup),
      done: items.filter(item=>item.done).sort(sortWithinGroup)
    };
  },
  _chronologicalItems(intakes, protocolEvents){
    return TodayScreen._dayFlowGroups(intakes, protocolEvents, todayStr()).active.concat(TodayScreen._dayFlowGroups(intakes, protocolEvents, todayStr()).done);
  },
  _getNextAction(intakes, protocolEvents, nowMinutes, dateStr=todayStr()){
    const activeIntakes = intakes
      .filter(i=>!['taken','skipped'].includes(i.status))
      .map(i=>({prefix:'Prochaine action', timeLabel:i.displayTime || i.time || 'Sans horaire', title:i.medName, minutes:TodayScreen._timeMinutes(i.displayTime || i.time), kind:'intake'}));
    const activeEvents = protocolEvents
      .filter(e=>!e.completed)
      .map(e=>({prefix:'Prochaine action', timeLabel:e.time || 'Sans horaire', title:e.title, minutes:TodayScreen._timeMinutes(e.time), kind:'event'}));
    const timedActions = [...activeIntakes, ...activeEvents].filter(a=>a.minutes !== null);
    const sortByTime = (a,b) => a.minutes - b.minutes || a.kind.localeCompare(b.kind);
    const lateActions = timedActions.filter(a=>a.minutes < nowMinutes).sort(sortByTime);
    if (lateActions.length) return {...lateActions[0], prefix:'Action en retard'};
    const futureActions = timedActions.filter(a=>a.minutes >= nowMinutes).sort(sortByTime);
    if (futureActions.length) return futureActions[0];
    return activeEvents.find(a=>a.minutes === null) || null;
  },
  _emptyState(medCount){return medCount===0?`<div class="empty-state empty-state-welcome"><div class="empty-icon">👋</div><h3>Bienvenue dans Luma</h3><p>Créez un protocole, ajoutez un médicament ou importez une sauvegarde pour commencer.</p><div class="empty-actions"><button class="btn-settings js-empty-add-protocol">Ajouter un protocole</button><button class="btn-settings js-empty-add-med">Ajouter traitement simple</button><button class="btn-settings js-empty-add-variable">Ajouter traitement à dosage variable</button><button class="btn-settings js-empty-import">Importer JSON</button></div></div>`:`<div class="empty-state"><div class="empty-icon">✨</div><p>Aucune prise ni événement prévu ce jour.</p></div>`;},
  _intakeCard(intake,dateStr){
    const v=Intakes.getVisualStatus(intake,dateStr);
    const done = ['taken','skipped'].includes(intake.status);
    const variableLabel = intake.dosageMode === 'variable' ? ' · Dosage variable' : '';
    const intakeLine = `${escHtml(intake.displayTime || intake.time || 'Sans horaire')} · ${escHtml(intake.medName)}${intake.dosage ? ` - ${escHtml(intake.dosage)}` : ''}${escHtml(variableLabel)}`;
    if (done) return `<div class="intake-card day-flow-card is-intake is-done is-${escHtml(v)} status-${escHtml(v)}" data-key="${escHtml(intake.key)}"><div class="day-flow-done-line">✓ ${intakeLine} · ${TodayScreen._statusText(v)}</div>${TodayScreen._actions(intake)}</div>`;
    return `<div class="intake-card day-flow-card is-intake is-active is-${escHtml(v)} status-${escHtml(v)}" data-key="${escHtml(intake.key)}"><div class="day-flow-compact-line">${intakeLine} · ${TodayScreen._badge(v)}</div>${TodayScreen._actions(intake)}</div>`;
  },
  _eventCard(ev){
    const statusInfo = getEventVisualStatus(ev, ev.date || todayStr());
    const status = statusInfo.key;
    const eventLine = `${escHtml(ev.time||'Sans horaire')} · ${escHtml(ev.title)} - ${escHtml(eventTypeLabelFR(ev.type))}`;
    if (ev.completed) return `<div class="day-flow-card is-event is-done is-${escHtml(status)} status-event ${escHtml(statusInfo.className)}"><div class="day-flow-done-line">✓ ${eventLine} · ${escHtml(statusInfo.label)}</div><div class="day-flow-actions"><button class="btn btn-secondary btn-compact btn-toggle-event" data-id="${escHtml(ev.id)}">Réouvrir</button><button class="btn btn-ghost btn-compact btn-edit-event" data-id="${escHtml(ev.id)}">Modifier</button></div></div>`;
    return `<div class="day-flow-card is-event is-active is-${escHtml(status)} status-event ${escHtml(statusInfo.className)}"><div class="day-flow-compact-line">${eventLine} · ${TodayScreen._badge(status)}</div><div class="day-flow-actions"><button class="btn btn-primary btn-compact btn-toggle-event" data-id="${escHtml(ev.id)}">Terminer</button><button class="btn btn-ghost btn-compact btn-edit-event" data-id="${escHtml(ev.id)}">Modifier</button></div></div>`;
  },
  _statusText(v){ return statusLabelFR(v); },
  _badge(v){ const info=getVisualStatusDef(v); return `<span class="status-badge ${escHtml(info.badgeClass)}">${escHtml(info.label)}</span>`;},
  _actions(i){ const time=escHtml(i.displayTime || i.time || ''); if(i.status==='taken'||i.status==='skipped') return `<div class="intake-actions day-flow-actions"><button class="btn btn-secondary btn-compact btn-action" data-action="cancel" data-time="${time}">Annuler</button></div>`; return `<div class="intake-actions day-flow-actions"><button class="btn btn-primary btn-compact btn-action" data-action="taken" data-time="${time}">Pris</button><button class="btn btn-secondary btn-compact btn-action" data-action="skipped" data-time="${time}">Passer</button><button class="btn btn-ghost btn-compact btn-action" data-action="snoozed" data-time="${time}">+15mn</button></div>`;},
  async _handleAction(action,key,currentTime,dateStr){ try{ const current = await DB.getIntakeAction(key); const [medId]=key.split('|'); const [meds, phases, protocols, dosageOverrides]=await Promise.all([DB.getMedications(), DB.getPhases(), DB.getProtocols(), DB.getDosageOverrides()]); const med=meds.find(m=>m.id===medId); const protocol=protocols.find(p=>p.id===med?.protocolId); const intake=Intakes.generateForDate(meds, phases, dateStr, dosageOverrides).find(i=>i.key===key) || null; const dosageSnapshot=intake?.dosage || ''; const dosageModeSnapshot=intake?.dosageMode || (med?.dosageMode === 'variable' ? 'variable' : 'fixed'); if(action==='cancel'){await DB.deleteIntakeAction(key); await DB.saveIntakeEvent({id:uid(),intakeKey:key,medicationId:medId||null,protocolId:med?.protocolId||null,type:'undo',createdAt:new Date().toISOString(),payload:{scheduledDate:dateStr,scheduledTime:currentTime,undoneStatus:current?.status||null,medNameSnapshot:med?.name||'médicament supprimé',dosageSnapshot,plannedDosage:dosageSnapshot,dosageModeSnapshot,protocolNameSnapshot:protocol?.name||''}}); showToast('↺ Action annulée'); return TodayScreen.render();} if(action==='taken'&&current?.status==='taken'){ showToast('Cette prise est déjà marquée comme prise.'); return; } const data={key,status:action,updatedAt:new Date().toISOString(),takenAt:action==='taken'?new Date().toISOString():null}; if(action==='snoozed'){const [h,m]=currentTime.split(':').map(Number); if(h*60+m+15>1439){showToast('Impossible de reporter après 23:59');return;} data.snoozedTime=addMinutesToTime(currentTime,15);} await DB.saveIntakeAction(data); await DB.saveIntakeEvent({id:uid(),intakeKey:key,medicationId:medId||null,protocolId:med?.protocolId||null,type:action,createdAt:new Date().toISOString(),payload:{scheduledDate:dateStr,scheduledTime:currentTime,actualDate:todayStr(),actualTime:action==='taken'?new Date().toTimeString().slice(0,5):(data.snoozedTime||currentTime),fromTime:currentTime,toTime:data.snoozedTime||null,delayMinutes:action==='taken'?Math.max(0,(()=>{const [h,m]=currentTime.split(':').map(Number); const now=new Date(); return now.getHours()*60+now.getMinutes()-(h*60+m);})()):0,medNameSnapshot:med?.name||'médicament supprimé',dosageSnapshot,plannedDosage:dosageSnapshot,dosageModeSnapshot,protocolNameSnapshot:protocol?.name||''}}); showToast('Action enregistrée'); await TodayScreen.render();}catch(err){console.error(err);showToast('Action impossible');}}
};

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
      const timelineItems = TodayScreen._chronologicalItems(intakes, dayProtocolEvents);
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
      const symptomSelects = symptomFields.map(field=>`<label>${escHtml(field.label)}<select id='n-${escHtml(field.key)}' class='form-input'>${symptomOptions.map(opt=>`<option value='${opt.value}' ${Number(daySymptoms.symptoms?.[field.key]??0)===opt.value?'selected':''}>${opt.label}</option>`).join('')}</select></label>`).join('');

      const isToday = dateStr === todayStr();
      const dateLabel = isToday ? 'Aujourd\'hui' : capitalize(formatDateFR(dateStr));
      const takenCount = intakes.filter(i => i.status === 'taken').length;
      const plannedCount = intakes.length;
      const lateCount = intakes.filter(i => Intakes.getVisualStatus(i,dateStr)==='late').length;
      const eventCount = dayProtocolEvents.length;
      const nowMinutes = new Date().getHours()*60 + new Date().getMinutes();
      const nextAction = TodayScreen._getNextAction(intakes, dayProtocolEvents, nowMinutes, dateStr);
      const nextActionText = nextAction ? `${nextAction.prefix} : ${nextAction.timeLabel} — ${nextAction.title}` : 'Aucune action prévue aujourd’hui.';
      const hasNoteData = hasFreeNote(dayNote);
      const hasSymptomsData = hasPositiveSymptoms(daySymptoms);
      const symptomsSummary = symptomsToText(daySymptoms, true);
      const missingVariableMeds = filteredMeds.filter(m => m.dosageMode === 'variable' && filteredPhases.some(ph => ph.medicationId === m.id && dateInRange(dateStr, ph.startDate, ph.endDate)) && !dosageOverrides.some(o => o.medicationId === m.id && o.date === dateStr && o.enabled !== false && String(o.dosage || '').trim()));
      const missingVariableNotice = missingVariableMeds.length ? `<div class='card card-sm today-info-notice'><p><strong>Traitements à dosage variable sans dosage aujourd’hui :</strong></p>${missingVariableMeds.map(m=>`<div class='missing-dosage-row'><span>${escHtml(m.name)}</span><button class='btn-settings js-open-missing-dosage' data-med-id='${escHtml(m.id)}'>Ouvrir calendrier</button></div>`).join('')}</div>` : '';

      screen.innerHTML = `<div class="today-header"><div class="today-date-label">${dateLabel}</div></div>
      <div class='card today-summary'><div class='today-summary-title'>Résumé aujourd’hui</div><div class='today-count'>${plannedCount} prises prévues · ${takenCount} réalisées · ${lateCount} en retard · ${eventCount} événement${eventCount!==1?'s':''}</div><div class='today-count'>${escHtml(nextActionText)}</div></div>
      ${missingVariableNotice}
      <div class="section-title" style="margin-top:6px;font-size:1.1rem;">Déroulé du jour</div>
      ${timelineItems.length===0?TodayScreen._emptyState(filteredMeds.length):timelineItems.map(item=>item.kind==='intake'?TodayScreen._intakeCard(item.data,dateStr):TodayScreen._eventCard(item.data)).join('')}
      <details class='card card-sm' ${hasNoteData?'open':''}><summary><strong>Note du jour</strong>${hasNoteData?`<span class='today-count' style='display:block;'>Note renseignée</span>`:''}</summary><textarea id='n-free' class='form-input' style='margin-top:8px;' placeholder='Note libre'>${escHtml(dayNote.freeNote||'')}</textarea><button id='save-note' class='btn-settings' style='margin-top:8px;'>Enregistrer la note</button></details>
      <details class='card card-sm' ${hasSymptomsData?'open':''}><summary><strong>Symptômes du jour</strong>${hasSymptomsData?`<span class='today-count' style='display:block;'>${escHtml(symptomsSummary)}</span>`:''}</summary><div class='symptom-grid' style='margin-top:8px;'>${symptomSelects}</div><label style='display:block;margin-top:8px;'>Libellé autre symptôme<input id='n-other-label' class='form-input' value='${escHtml(daySymptoms.otherSymptomLabel||'')}' placeholder='Ex. fourmillements'></label><button id='save-symptoms' class='btn-settings' style='margin-top:8px;'>Enregistrer les symptômes</button></details>`;

      screen.querySelectorAll('.intake-card .btn-action').forEach(btn=>btn.addEventListener('click', async (e)=>{const card=e.target.closest('.intake-card'); await TodayScreen._handleAction(e.target.dataset.action, card.dataset.key, e.target.dataset.time, dateStr);}));
      screen.querySelectorAll('.btn-toggle-event').forEach(btn=>btn.addEventListener('click', async ()=>{await DB.toggleProtocolEventCompleted(btn.dataset.id); await TodayScreen.render(); await TimelineScreen.render();}));
      screen.querySelector('#save-note').addEventListener('click', async()=>{await DB.saveDailyNote({id:dateStr,date:dateStr,freeNote:screen.querySelector('#n-free').value.trim(),updatedAt:new Date().toISOString()});showToast('Note enregistrée'); await TodayScreen.render();});
      screen.querySelector('#save-symptoms').addEventListener('click', async()=>{const symptoms={}; for(const f of symptomFields){symptoms[f.key]=Number(screen.querySelector(`#n-${f.key}`).value||0);} await DB.saveDailySymptoms({id:dateStr,date:dateStr,symptoms,otherSymptomLabel:screen.querySelector('#n-other-label').value.trim(),updatedAt:new Date().toISOString()}); showToast('Symptômes enregistrés'); await TodayScreen.render();});
      screen.querySelectorAll('.js-open-missing-dosage').forEach(btn=>btn.addEventListener('click', async()=>{ const med=await DB.getMedication(btn.dataset.medId); if(med) await MedicationsScreen.showDosageCalendar(med); }));
      screen.querySelector('.js-empty-add-protocol')?.addEventListener('click', ()=>MedicationsScreen.showProtocolForm());
      screen.querySelector('.js-empty-add-med')?.addEventListener('click', ()=>MedicationsScreen.showForm(null, { dosageMode: 'fixed' }));
      screen.querySelector('.js-empty-add-variable')?.addEventListener('click', ()=>MedicationsScreen.showForm(null, { dosageMode: 'variable' }));
      screen.querySelector('.js-empty-import')?.addEventListener('click', ()=>{ App.navigateTo('settings'); setTimeout(()=>document.getElementById('btn-import')?.click(), 50); });
    } catch (err) { console.error(err); screen.innerHTML='<div class="card">Erreur chargement aujourd’hui</div>'; }
  },
  _timeMinutes(value){ return isValidTimeHHMM(value) ? Number(value.slice(0,2))*60 + Number(value.slice(3,5)) : null; },
  _chronologicalItems(intakes, protocolEvents){
    return [
      ...intakes.map((data, index)=>({kind:'intake', data, time:data.displayTime || data.time || '', index})),
      ...protocolEvents.map((data, index)=>({kind:'event', data, time:data.time || '', index}))
    ].sort((a,b)=>{
      const am=TodayScreen._timeMinutes(a.time); const bm=TodayScreen._timeMinutes(b.time);
      if (am !== null && bm !== null && am !== bm) return am - bm;
      if (am !== null && bm === null) return -1;
      if (am === null && bm !== null) return 1;
      if (a.kind !== b.kind) return a.kind === 'intake' ? -1 : 1;
      return a.index - b.index;
    });
  },
  _getNextAction(intakes, protocolEvents, nowMinutes, dateStr=todayStr()){
    const lateIntakes = intakes.filter(i=>Intakes.getVisualStatus(i,dateStr)==='late' && !['taken','skipped'].includes(i.status));
    if(lateIntakes.length){ const i=lateIntakes.sort((a,b)=>TodayScreen._timeMinutes(a.displayTime || a.time)-TodayScreen._timeMinutes(b.displayTime || b.time))[0]; return {prefix:'En retard', timeLabel:i.displayTime || i.time, title:i.medName}; }
    const actions = [
      ...intakes.filter(i=>!['taken','skipped'].includes(i.status)).map(i=>({prefix:'Prochaine prise', timeLabel:i.displayTime || i.time || 'Sans horaire', title:i.medName, minutes:TodayScreen._timeMinutes(i.displayTime || i.time)})),
      ...protocolEvents.filter(e=>!e.completed).map(e=>({prefix:'Prochain événement', timeLabel:e.time || 'Sans horaire', title:e.title, minutes:TodayScreen._timeMinutes(e.time)}))
    ].filter(a=>a.minutes === null || a.minutes >= nowMinutes)
      .sort((a,b)=>{
        if (a.minutes !== null && b.minutes !== null) return a.minutes-b.minutes;
        if (a.minutes !== null) return -1;
        if (b.minutes !== null) return 1;
        return 0;
      });
    return actions[0] || null;
  },
  _emptyState(medCount){return medCount===0?`<div class="empty-state empty-state-welcome"><div class="empty-icon">👋</div><h3>Bienvenue dans Luma</h3><p>Créez un protocole, ajoutez un médicament ou importez une sauvegarde pour commencer.</p><div class="empty-actions"><button class="btn-settings js-empty-add-protocol">Ajouter un protocole</button><button class="btn-settings js-empty-add-med">Ajouter traitement simple</button><button class="btn-settings js-empty-add-variable">Ajouter traitement à dosage variable</button><button class="btn-settings js-empty-import">Importer JSON</button></div></div>`:`<div class="empty-state"><div class="empty-icon">✨</div><p>Aucune prise ni événement prévu ce jour.</p></div>`;},
  _intakeCard(intake,dateStr){ const v=Intakes.getVisualStatus(intake,dateStr); return `<div class="intake-card status-${v}" data-key="${escHtml(intake.key)}"><div class="intake-top"><div class="intake-time">${escHtml(intake.displayTime || intake.time || 'Sans horaire')}</div>${TodayScreen._badge(v)}</div><div class="intake-name">${escHtml(intake.medName)}</div><div class="intake-detail">${escHtml(intake.dosage)}${intake.dosageMode === 'variable' ? ' · <span class="timeline-badge">Dosage variable</span>' : ''}</div>${TodayScreen._actions(intake)}</div>`; },
  _eventCard(ev){ return `<div class="card card-sm"><div style="display:flex;justify-content:space-between;align-items:center;"><strong>${escHtml(ev.time||'Sans horaire')} — ${escHtml(ev.title)}</strong><span>${ev.completed?'✓ Terminé':'À faire'}</span></div><div style="font-size:.82rem;color:var(--text-soft);">${escHtml(eventTypeLabelFR(ev.type))}</div><button class="btn-settings btn-toggle-event" data-id="${escHtml(ev.id)}" style="margin-top:8px;">${ev.completed?'Réouvrir':'Terminer'}</button></div>`; },
  _badge(v){ const l={taken:'Pris',skipped:'Passé',snoozed:'Reporté',late:'En retard',pending:'À venir'}; return `<span class="status-badge">${l[v]||v}</span>`;},
  _actions(i){ const time=escHtml(i.displayTime || i.time || ''); if(i.status==='taken'||i.status==='skipped') return `<div class="intake-actions"><button class="btn-action btn-secondary" data-action="cancel" data-time="${time}">Annuler</button></div>`; return `<div class="intake-actions"><button class="btn-action" data-action="taken" data-time="${time}">Pris</button><button class="btn-action btn-secondary" data-action="skipped" data-time="${time}">Passer</button><button class="btn-action btn-secondary" data-action="snoozed" data-time="${time}">Snooze 15 min</button></div>`;},
  async _handleAction(action,key,currentTime,dateStr){ try{ const current = await DB.getIntakeAction(key); const [medId]=key.split('|'); const [meds, phases, protocols, dosageOverrides]=await Promise.all([DB.getMedications(), DB.getPhases(), DB.getProtocols(), DB.getDosageOverrides()]); const med=meds.find(m=>m.id===medId); const protocol=protocols.find(p=>p.id===med?.protocolId); const intake=Intakes.generateForDate(meds, phases, dateStr, dosageOverrides).find(i=>i.key===key) || null; const dosageSnapshot=intake?.dosage || ''; const dosageModeSnapshot=intake?.dosageMode || (med?.dosageMode === 'variable' ? 'variable' : 'fixed'); if(action==='cancel'){await DB.deleteIntakeAction(key); await DB.saveIntakeEvent({id:uid(),intakeKey:key,medicationId:medId||null,protocolId:med?.protocolId||null,type:'undo',createdAt:new Date().toISOString(),payload:{scheduledDate:dateStr,scheduledTime:currentTime,undoneStatus:current?.status||null,medNameSnapshot:med?.name||'médicament supprimé',dosageSnapshot,plannedDosage:dosageSnapshot,dosageModeSnapshot,protocolNameSnapshot:protocol?.name||''}}); showToast('↺ Action annulée'); return TodayScreen.render();} if(action==='taken'&&current?.status==='taken'){ showToast('Cette prise est déjà marquée comme prise.'); return; } const data={key,status:action,updatedAt:new Date().toISOString(),takenAt:action==='taken'?new Date().toISOString():null}; if(action==='snoozed'){const [h,m]=currentTime.split(':').map(Number); if(h*60+m+15>1439){showToast('Impossible de reporter après 23:59');return;} data.snoozedTime=addMinutesToTime(currentTime,15);} await DB.saveIntakeAction(data); await DB.saveIntakeEvent({id:uid(),intakeKey:key,medicationId:medId||null,protocolId:med?.protocolId||null,type:action,createdAt:new Date().toISOString(),payload:{scheduledDate:dateStr,scheduledTime:currentTime,actualDate:todayStr(),actualTime:action==='taken'?new Date().toTimeString().slice(0,5):(data.snoozedTime||currentTime),fromTime:currentTime,toTime:data.snoozedTime||null,delayMinutes:action==='taken'?Math.max(0,(()=>{const [h,m]=currentTime.split(':').map(Number); const now=new Date(); return now.getHours()*60+now.getMinutes()-(h*60+m);})()):0,medNameSnapshot:med?.name||'médicament supprimé',dosageSnapshot,plannedDosage:dosageSnapshot,dosageModeSnapshot,protocolNameSnapshot:protocol?.name||''}}); showToast('Action enregistrée'); await TodayScreen.render();}catch(err){console.error(err);showToast('Action impossible');}}
};

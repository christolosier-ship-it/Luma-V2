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
      const intakes = Intakes.sortForToday(Intakes.mergeWithActions(events, actionsMap), dateStr);
      const dayProtocolEvents = protocolEvents.filter(e => e.date === dateStr && activeProtocolIds.has(e.protocolId)).sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
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
      const nextAction = TodayScreen._getNextAction(intakes, dayProtocolEvents, nowMinutes);
      const nextActionText = nextAction ? `${nextAction.timeLabel} — ${nextAction.title}` : 'Aucune action prévue aujourd’hui.';
      const hasNoteData = hasFreeNote(dayNote);
      const hasSymptomsData = hasPositiveSymptoms(daySymptoms);
      const symptomsSummary = symptomsToText(daySymptoms, true);

      screen.innerHTML = `<div class="today-header"><div class="today-date-label">${dateLabel}</div><div class="today-count">${intakes.length} prise${intakes.length!==1?'s':''}${intakes.length>0?` · ${takenCount} prise${takenCount!==1?'s':''} effectuée${takenCount!==1?'s':''}`:''}</div></div>
      <div class='card today-summary'><div class='today-summary-title'>Résumé aujourd’hui</div><div class='today-count'>${plannedCount} prises prévues · ${takenCount} réalisées · ${lateCount} en retard · ${eventCount} événement${eventCount!==1?'s':''}</div><div class='today-count'>Prochaine action : ${escHtml(nextActionText)}</div></div>
      <div class="section-title" style="margin-top:6px;font-size:1.1rem;">Prises du jour</div>
      ${intakes.length===0?TodayScreen._emptyState(filteredMeds.length):intakes.map(i=>TodayScreen._intakeCard(i,dateStr)).join('')}
      <div class="section-title" style="margin-top:12px;font-size:1.1rem;">Événements du jour</div>
      ${dayProtocolEvents.length?dayProtocolEvents.map(ev=>`<div class="card card-sm"><div style="display:flex;justify-content:space-between;align-items:center;"><strong>${escHtml(ev.time||'—:—')} — ${escHtml(ev.title)}</strong><span>${ev.completed?'✓ Terminé':'À faire'}</span></div><div style="font-size:.82rem;color:var(--text-soft);">${escHtml(eventTypeLabelFR(ev.type))}</div><button class="btn-settings btn-toggle-event" data-id="${escHtml(ev.id)}" style="margin-top:8px;">${ev.completed?'Réouvrir':'Terminer'}</button></div>`).join(''):'<div class="card card-sm">Aucun événement protocole ce jour.</div>'}<details class='card card-sm' ${hasNoteData?'open':''}><summary><strong>Note du jour</strong>${hasNoteData?`<span class='today-count' style='display:block;'>Note renseignée</span>`:''}</summary><textarea id='n-free' class='form-input' style='margin-top:8px;' placeholder='Note libre'>${escHtml(dayNote.freeNote||'')}</textarea><button class='btn-settings' id='btn-save-note' style='margin-top:8px;'>Enregistrer la note</button></details><details class='card card-sm' ${hasSymptomsData?'open':''}><summary><strong>Symptômes du jour</strong>${symptomsSummary?`<span class='today-count' style='display:block;'>${escHtml(symptomsSummary)}</span>`:''}</summary><div style='display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px;'>${symptomSelects}</div><input id='n-other-label' class='form-input' style='margin-top:8px;' placeholder='Libellé autre symptôme' value='${escHtml(daySymptoms.otherSymptomLabel||'')}'/><button class='btn-settings' id='btn-save-symptoms' style='margin-top:8px;'>Enregistrer les symptômes</button><div style='font-size:.8rem;color:var(--text-soft);margin-top:8px;'>Ce journal ne remplace pas un avis médical. En cas de doute ou de symptôme important, contactez un professionnel de santé.</div></details>`;

      screen.querySelectorAll('.btn-action').forEach(btn => btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const { action, key, time } = btn.dataset;
        await TodayScreen._handleAction(action, key, time, dateStr);
      }));
      screen.querySelectorAll('.btn-toggle-event').forEach(btn=>btn.addEventListener('click',async()=>{ await DB.toggleProtocolEventCompleted(btn.dataset.id); await TodayScreen.render(); await TimelineScreen.render(); showToast('Événement mis à jour'); }));
      screen.querySelector('.js-empty-add-protocol')?.addEventListener('click',()=>MedicationsScreen.openProtocolForm());
      screen.querySelector('.js-empty-add-med')?.addEventListener('click', async()=>{ const protocols = await DB.getProtocols(); if(!protocols.length){ const p={id:uid(),name:'Traitement principal',status:'active',startDate:todayStr(),endDate:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}; await DB.saveProtocol(p);} const refreshedProtocols = await DB.getProtocols(); MedicationsScreen.openForm(null, null, refreshedProtocols); });
      screen.querySelector('.js-empty-add-variable')?.addEventListener('click', async()=>{ const protocols = await DB.getProtocols(); if(!protocols.length){ const p={id:uid(),name:'Traitement principal',status:'active',startDate:todayStr(),endDate:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}; await DB.saveProtocol(p);} const refreshedProtocols = await DB.getProtocols(); MedicationsScreen.openVariableForm(null, null, refreshedProtocols); });
      screen.querySelector('.js-empty-import')?.addEventListener('click', ()=>{ App.navigateTo('settings'); setTimeout(()=>document.getElementById('btn-import')?.click(), 50); });
      screen.querySelector('#btn-save-note')?.addEventListener('click', async()=>{ const freeNote = document.getElementById('n-free').value.trim(); const note={id:dateStr,date:dateStr,freeNote,updatedAt:new Date().toISOString(),createdAt:dayNote.createdAt||new Date().toISOString()}; await DB.saveDailyNote(note); showToast('Note enregistrée'); await TodayScreen.render(); await TimelineScreen.render(); await JournalScreen.render(); });
      screen.querySelector('#btn-save-symptoms')?.addEventListener('click', async()=>{ const clamp=v=>Math.max(0,Math.min(3,Number(v)||0)); const symptoms = symptomFields.reduce((acc, field)=>{ acc[field.key]=clamp(document.getElementById(`n-${field.key}`).value); return acc; }, getDefaultSymptoms()); const otherSymptomLabel=document.getElementById('n-other-label').value.trim(); if(!Object.values(symptoms).some(v=>v>0) && !otherSymptomLabel){ await DB.deleteDailySymptoms(dateStr); } else { await DB.saveDailySymptoms({id:dateStr,date:dateStr,symptoms,otherSymptomLabel,updatedAt:new Date().toISOString(),createdAt:daySymptoms.createdAt||new Date().toISOString()}); } showToast('Symptômes enregistrés'); await TodayScreen.render(); await TimelineScreen.render(); await JournalScreen.render(); });
    } catch (err) {
      console.error('Today render failed', err); showToast('Impossible d\'afficher les prises du jour');
    }
  },

  _getNextAction(intakes, dayProtocolEvents, nowMinutes){
    const candidates = [];
    intakes.forEach(i=>{
      if(i.status==='taken' || i.status==='skipped') return;
      const sourceTime = i.displayTime || i.snoozedTime || i.time || '';
      const hasTime = /^\d{2}:\d{2}$/.test(sourceTime);
      const minutes = hasTime ? sourceTime.split(':').map(Number).reduce((a,v,idx)=>a+(idx===0?v*60:v),0) : Number.POSITIVE_INFINITY;
      candidates.push({type:'intake', title:i.medName, timeLabel:sourceTime||'—:—', status:i.status, minutes, hasTime});
    });
    dayProtocolEvents.forEach(e=>{
      if(e.completed) return;
      const hasTime = /^\d{2}:\d{2}$/.test(e.time||'');
      const minutes = hasTime ? e.time.split(':').map(Number).reduce((a,v,idx)=>a+(idx===0?v*60:v),0) : Number.POSITIVE_INFINITY;
      candidates.push({type:'event', title:e.title, timeLabel:e.time||'—:—', status:e.completed?'completed':'pending', minutes, hasTime});
    });
    if(!candidates.length) return null;
    candidates.sort((a,b)=>(a.minutes-b.minutes)||a.title.localeCompare(b.title));
    const upcoming = candidates.find(c=>c.hasTime && c.minutes>=nowMinutes) || candidates.find(c=>!c.hasTime);
    if(upcoming) return upcoming;
    return candidates[0] || null;
  },

  _emptyState(medCount){return medCount===0?`<div class="empty-state empty-state-welcome"><div class="empty-icon">👋</div><h3>Bienvenue dans Luma</h3><p>Créez un protocole, ajoutez un médicament ou importez une sauvegarde pour commencer.</p><div class="empty-actions"><button class="btn-settings js-empty-add-protocol">Créer un protocole</button><button class="btn-settings js-empty-add-med">Ajouter traitement simple</button><button class="btn-settings js-empty-add-variable">Ajouter traitement à dosage variable</button><button class="btn-settings js-empty-import">Importer JSON</button></div></div>`:`<div class="empty-state"><div class="empty-icon">✨</div><p>Aucune prise prévue ce jour.</p></div>`;},
  _intakeCard(intake,dateStr){ const v=Intakes.getVisualStatus(intake,dateStr); return `<div class="intake-card status-${v}" data-key="${escHtml(intake.key)}"><div class="intake-top"><div class="intake-time">${escHtml(intake.displayTime)}</div>${TodayScreen._badge(v)}</div><div class="intake-name">${escHtml(intake.medName)}</div><div class="intake-detail">${escHtml(intake.dosage)}${intake.dosageMode === 'variable' ? ' · <span class="timeline-badge">Dosage variable</span>' : ''}</div>${TodayScreen._actions(intake)}</div>`; },
  _badge(s){ const labels={taken:'✓ Pris',skipped:'⊘ Passé',snoozed:'⏱ Reporté',pending:'En attente',late:'⚠ En retard'}; return `<span class="intake-status-badge">${labels[s]}</span>`;},
  _actions(intake){ const t=intake.displayTime; const disabledTaken = intake.status==='taken' ? 'disabled aria-disabled="true"' : ''; return `<div class="intake-actions"><button class="btn-action btn-taken" ${disabledTaken} data-action="taken" data-key="${escHtml(intake.key)}" data-time="${escHtml(t)}">✓ Pris</button>${intake.status==='taken'||intake.status==='skipped'?'' : `<button class="btn-action btn-skip" data-action="skipped" data-key="${escHtml(intake.key)}" data-time="${escHtml(t)}">⊘ Passer</button><button class="btn-action btn-snooze" data-action="snoozed" data-key="${escHtml(intake.key)}" data-time="${escHtml(t)}">+15 min</button>`}${intake.status!=='pending'?`<button class="btn-action" data-action="cancel" data-key="${escHtml(intake.key)}" data-time="${escHtml(t)}">Annuler</button>`:''}</div>`; },
  async _handleAction(action,key,currentTime,dateStr){ try{ const current = await DB.getIntakeAction(key); const [medId]=key.split('|'); const [meds, phases, protocols, dosageOverrides]=await Promise.all([DB.getMedications(), DB.getPhases(), DB.getProtocols(), DB.getDosageOverrides()]); const med=meds.find(m=>m.id===medId); const protocol=protocols.find(p=>p.id===med?.protocolId); const intake=Intakes.generateForDate(meds, phases, dateStr, dosageOverrides).find(i=>i.key===key) || null; const dosageSnapshot=intake?.dosage || ''; const dosageModeSnapshot=intake?.dosageMode || (med?.dosageMode === 'variable' ? 'variable' : 'fixed'); if(action==='cancel'){await DB.deleteIntakeAction(key); await DB.saveIntakeEvent({id:uid(),intakeKey:key,medicationId:medId||null,protocolId:med?.protocolId||null,type:'undo',createdAt:new Date().toISOString(),payload:{scheduledDate:dateStr,scheduledTime:currentTime,undoneStatus:current?.status||null,medNameSnapshot:med?.name||'médicament supprimé',dosageSnapshot,plannedDosage:dosageSnapshot,dosageModeSnapshot,protocolNameSnapshot:protocol?.name||''}}); showToast('↺ Action annulée'); return TodayScreen.render();} if(action==='taken'&&current?.status==='taken'){ showToast('Cette prise est déjà marquée comme prise.'); return; } const data={key,status:action,updatedAt:new Date().toISOString(),takenAt:action==='taken'?new Date().toISOString():null}; if(action==='snoozed'){const [h,m]=currentTime.split(':').map(Number); if(h*60+m+15>1439){showToast('Impossible de reporter après 23:59');return;} data.snoozedTime=addMinutesToTime(currentTime,15);} await DB.saveIntakeAction(data); await DB.saveIntakeEvent({id:uid(),intakeKey:key,medicationId:medId||null,protocolId:med?.protocolId||null,type:action,createdAt:new Date().toISOString(),payload:{scheduledDate:dateStr,scheduledTime:currentTime,actualDate:todayStr(),actualTime:action==='taken'?new Date().toTimeString().slice(0,5):(data.snoozedTime||currentTime),fromTime:currentTime,toTime:data.snoozedTime||null,delayMinutes:action==='taken'?Math.max(0,(()=>{const [h,m]=currentTime.split(':').map(Number); const now=new Date(); return now.getHours()*60+now.getMinutes()-(h*60+m);})()):0,medNameSnapshot:med?.name||'médicament supprimé',dosageSnapshot,plannedDosage:dosageSnapshot,dosageModeSnapshot,protocolNameSnapshot:protocol?.name||''}}); showToast('Action enregistrée'); await TodayScreen.render();}catch(err){console.error(err);showToast('Action impossible');}}
};

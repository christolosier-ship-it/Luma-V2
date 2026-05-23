const TodayScreen = {
  async render(dateStr) {
    const screen = document.getElementById('screen-today');
    try {
      const [medications, phases, allActions, protocols, protocolEvents] = await Promise.all([
        DB.getMedications(), DB.getPhases(), DB.getAllIntakeActions(), DB.getProtocols(), DB.getProtocolEvents()
      ]);
      const activeProtocolIds = new Set(protocols.filter(p => p.status !== 'archived').map(p => p.id));
      const filteredMeds = medications.filter(m => !m.protocolId || activeProtocolIds.has(m.protocolId));
      const filteredPhases = phases.filter(p => !p.protocolId || activeProtocolIds.has(p.protocolId));
      const actionsMap = Intakes.buildActionsMap(allActions);
      const events = Intakes.generateForDate(filteredMeds, filteredPhases, dateStr);
      const intakes = Intakes.sortForToday(Intakes.mergeWithActions(events, actionsMap), dateStr);
      const dayProtocolEvents = protocolEvents.filter(e => e.date === dateStr).sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
      const isToday = dateStr === todayStr();
      const dateLabel = isToday ? 'Aujourd\'hui' : capitalize(formatDateFR(dateStr));
      const takenCount = intakes.filter(i => i.status === 'taken').length;

      screen.innerHTML = `<div class="today-header"><div class="today-date-label">${dateLabel}</div><div class="today-count">${intakes.length} prise${intakes.length!==1?'s':''}${intakes.length>0?` · ${takenCount} prise${takenCount!==1?'s':''} effectuée${takenCount!==1?'s':''}`:''}</div></div>
      ${intakes.length===0?TodayScreen._emptyState(filteredMeds.length):intakes.map(i=>TodayScreen._intakeCard(i,dateStr)).join('')}
      <div class="section-title" style="margin-top:12px;font-size:1.1rem;">Événements du jour</div>
      ${dayProtocolEvents.length?dayProtocolEvents.map(ev=>`<div class="card card-sm"><div style="display:flex;justify-content:space-between;align-items:center;"><strong>${escHtml(ev.time||'—:—')} — ${escHtml(ev.title)}</strong><span>${ev.completed?'✓ Terminé':'À faire'}</span></div><div style="font-size:.82rem;color:var(--text-soft);">${escHtml(ev.type||'autre')}</div><button class="btn-settings btn-toggle-event" data-id="${escHtml(ev.id)}" style="margin-top:8px;">${ev.completed?'Réouvrir':'Terminer'}</button></div>`).join(''):'<div class="card card-sm">Aucun événement protocole ce jour.</div>'}`;

      screen.querySelectorAll('.btn-action').forEach(btn => btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const { action, key, time } = btn.dataset;
        await TodayScreen._handleAction(action, key, time, dateStr);
      }));
      screen.querySelectorAll('.btn-toggle-event').forEach(btn=>btn.addEventListener('click',async()=>{ await DB.toggleProtocolEventCompleted(btn.dataset.id); await TodayScreen.render(dateStr); await TimelineScreen.render(App.selectedDate); showToast('Événement mis à jour'); }));
    } catch (err) {
      console.error('Today render failed', err); showToast('Impossible d\'afficher les prises du jour');
    }
  },
  _emptyState(medCount){return medCount===0?`<div class="empty-state"><div class="empty-icon">💊</div><p>Aucun traitement configuré.</p></div>`:`<div class="empty-state"><div class="empty-icon">✨</div><p>Aucune prise prévue ce jour.</p></div>`;},
  _intakeCard(intake,dateStr){ const v=Intakes.getVisualStatus(intake,dateStr); return `<div class="intake-card status-${v}" data-key="${escHtml(intake.key)}"><div class="intake-top"><div class="intake-time">${escHtml(intake.displayTime)}</div>${TodayScreen._badge(v)}</div><div class="intake-name">${escHtml(intake.medName)}</div><div class="intake-detail">${escHtml(intake.dosage)}</div>${TodayScreen._actions(intake)}</div>`; },
  _badge(s){ const labels={taken:'✓ Pris',skipped:'⊘ Passé',snoozed:'⏱ Reporté',pending:'En attente',late:'⚠ En retard'}; return `<span class="intake-status-badge">${labels[s]}</span>`;},
  _actions(intake){ const t=intake.displayTime; const disabledTaken = intake.status==='taken' ? 'disabled aria-disabled="true"' : ''; return `<div class="intake-actions"><button class="btn-action btn-taken" ${disabledTaken} data-action="taken" data-key="${escHtml(intake.key)}" data-time="${escHtml(t)}">✓ Pris</button>${intake.status==='taken'||intake.status==='skipped'?'' : `<button class="btn-action btn-skip" data-action="skipped" data-key="${escHtml(intake.key)}" data-time="${escHtml(t)}">⊘ Passer</button><button class="btn-action btn-snooze" data-action="snoozed" data-key="${escHtml(intake.key)}" data-time="${escHtml(t)}">+15 min</button>`}${intake.status!=='pending'?`<button class="btn-action" data-action="cancel" data-key="${escHtml(intake.key)}" data-time="${escHtml(t)}">Annuler</button>`:''}</div>`; },
  async _handleAction(action,key,currentTime,dateStr){ try{ const current = await DB.getIntakeAction(key); if(action==='cancel'){await DB.deleteIntakeAction(key); await DB.saveIntakeEvent({id:uid(),intakeKey:key,type:'undo',createdAt:new Date().toISOString(),payload:{scheduledDate:dateStr}}); showToast('↺ Action annulée'); return TodayScreen.render(dateStr);} if(action==='taken'&&current?.status==='taken'){ showToast('Cette prise est déjà marquée comme prise.'); return; } const data={key,status:action,updatedAt:new Date().toISOString(),takenAt:action==='taken'?new Date().toISOString():null}; if(action==='snoozed'){const [h,m]=currentTime.split(':').map(Number); if(h*60+m+15>1439){showToast('Impossible de reporter après 23:59');return;} data.snoozedTime=addMinutesToTime(currentTime,15);} await DB.saveIntakeAction(data); await DB.saveIntakeEvent({id:uid(),intakeKey:key,type:action,createdAt:new Date().toISOString(),payload:{scheduledDate:dateStr,scheduledTime:currentTime,actualTime:data.snoozedTime||currentTime}}); showToast('Action enregistrée'); await TodayScreen.render(dateStr);}catch(err){console.error(err);showToast('Action impossible');}}
};

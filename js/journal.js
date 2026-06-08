const JournalScreen = {
  period: '7', protocolId: 'all', customStart: '', customEnd: '',
  async render() {
    const screen = document.getElementById('screen-journal');
    try {
      const [notes, symptomsEntries, meds, phases, dosageOverrides, actions, protocolEvents, protocols, intakeEvents] = await Promise.all([DB.getDailyNotes(), DB.getDailySymptoms(), DB.getMedications(), DB.getPhases(), DB.getDosageOverrides(), DB.getAllIntakeActions(), DB.getProtocolEvents(), DB.getProtocols(), DB.getIntakeEvents()]);
      const days = this._buildDays(notes, symptomsEntries, meds, phases, dosageOverrides, actions, protocolEvents, protocols, intakeEvents);
      const stats = this._stats(days);
      const statCards = [['Prises prévues',stats.planned],['Réalisées',stats.taken],['Oubliées',stats.missed],['Observance',`${stats.adherence}%`],['Retard moyen',`${stats.avgDelay} min`],['Événements terminés',`${stats.eventsDone}/${stats.eventsPlanned}`]].map(([l,v])=>`<div class="journal-stat-card"><div class="journal-stat-label">${l}</div><div class="journal-stat-value">${v}</div></div>`).join('');
      screen.innerHTML = `<div class='section-title'>Journal</div><div class='card'><select id='j-period' class='form-input'><option value='7' ${this.period==='7'?'selected':''}>7 jours</option><option value='30' ${this.period==='30'?'selected':''}>30 jours</option><option value='90' ${this.period==='90'?'selected':''}>90 jours</option><option value='180' ${this.period==='180'?'selected':''}>180 jours</option><option value='custom' ${this.period==='custom'?'selected':''}>Période personnalisée</option></select><div id='j-custom' style='display:${this.period==='custom'?'block':'none'};margin-top:8px;'><input type='date' id='j-start' class='form-input' value='${escHtml(this.customStart||'')}'><input type='date' id='j-end' class='form-input' value='${escHtml(this.customEnd||'')}' style='margin-top:6px;'></div><select id='j-protocol' class='form-input' style='margin-top:8px;'><option value='all'>Protocole : Tous</option>${protocols.map(p=>`<option value='${escHtml(p.id)}' ${this.protocolId===p.id?'selected':''}>${escHtml(p.name)}</option>`).join('')}</select></div><div class='card'><div class='journal-stats-grid'>${statCards}</div><div style='margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;'><button class='btn btn-primary btn-compact' id='btn-csv'>Exporter CSV</button><button class='btn btn-secondary btn-compact' id='btn-report'>Rapport imprimable</button></div></div>${days.map((d,idx)=>this._dayDetail(d,idx===0)).join('')}`;
      screen.querySelector('#j-period').onchange=async e=>{this.period=e.target.value; await this.render();};
      screen.querySelector('#j-protocol').onchange=async e=>{this.protocolId=e.target.value; await this.render();};
      screen.querySelector('#j-start')?.addEventListener('change', async e=>{this.customStart=e.target.value; await this.render();});
      screen.querySelector('#j-end')?.addEventListener('change', async e=>{this.customEnd=e.target.value; await this.render();});
      screen.querySelector('#btn-csv').onclick=()=>this._exportCsv(days, protocols);
      screen.querySelector('#btn-report').onclick=()=>this._printReport(days,stats,protocols);
    } catch (err) { console.error(err); showToast('Erreur affichage journal'); }
  },
  _dayDetail(d,open){
    const completed=d.intakes.filter(i=>i.status==='taken').length;
    const late=d.intakes.filter(i=>this._delayText(i).startsWith('+')).length;
    const symptoms=hasPositiveSymptoms(d.symptoms) ? symptomsToText(d.symptoms,true) : '';
    return `<details class='card journal-day' ${open?'open':''}><summary><strong>${capitalize(formatDateFR(d.date))}</strong><span>${d.intakes.length} prises · ${completed} réalisées${late?` · ${late} en retard`:''}</span></summary>${d.items.map(item=>item.kind==='intake'?this._journalIntakeLine(item.data,d.date):this._journalEventLine(item.data)).join('')}${d.note?.freeNote?`<div class='journal-note-block'>Note du jour : ${escHtml(d.note.freeNote)}</div>`:''}${symptoms?`<div class='journal-symptoms-block'>Ressentis : ${escHtml(symptoms)}</div>`:''}</details>`;
  },
  _journalIntakeLine(i,date){
    const actualTime = timeFromIso(i.takenAt);
    const plannedTime = i.displayTime || i.time || 'Sans horaire';
    const correction = i.manualTimeEdit ? ' · corrigé manuellement' : '';
    const actual = actualTime && actualTime !== (i.time || '') ? ` · pris à ${escHtml(actualTime)}` : '';
    return `<div class='journal-line'><div>${escHtml(plannedTime)} · ${escHtml(i.medName)}<div class='timeline-item-detail'>${escHtml(i.dosage || '')}${i.dosageMode === 'variable' ? ' · Dosage variable' : ''}${i.historical ? ' · Traitement modifié depuis' : ''}${actual}${correction}</div></div><div><span class='timeline-badge'>${escHtml(i.historical ? 'Historique' : this._statusBadge(i,date))}</span> · ${escHtml(this._delayText(i))}</div></div>`;
  },
  _journalEventLine(e){ return `<div class='journal-line'><div>${escHtml(e.time||'Sans horaire')} · ${escHtml(e.title)}</div><div><span class='timeline-badge'>${escHtml(e.completed?'Événement terminé':'À venir')}</span></div></div>`; },
  _statusBadge(intake,date){ return Intakes.getVisualStatusInfo(intake, date).label; },
  _delayText(i){ const delay = delayMinutesBetween(i.dateStr || '', i.time || '00:00', i.takenAt); if(i.status!=='taken' || delay === null) return 'non renseigné'; if(delay===0) return "à l'heure"; return delay>0?`+${delay} min`:`${delay} min`; },
  _historicalIntakeFromEvent(ev){
    const payload = ev.payload || {};
    const parts = (ev.intakeKey || '').split('|');
    const scheduledDate = payload.scheduledDate || parts[2];
    const scheduledTime = payload.scheduledTime || parts[3] || '';
    return { key: ev.intakeKey || `${ev.medicationId || 'historique'}|historique|${scheduledDate}|${scheduledTime}`, medId: ev.medicationId || '', protocolId: ev.protocolId || '', dateStr: scheduledDate, time: scheduledTime, displayTime: payload.toTime || scheduledTime, medName: payload.medNameSnapshot || 'médicament supprimé', dosage: payload.dosageSnapshot || payload.plannedDosage || '', dosageMode: payload.dosageModeSnapshot || 'fixed', status: ev.type === 'edited' ? 'taken' : ev.type, takenAt: payload.actualDate && payload.actualTime ? dateTimeFromDateAndTime(payload.actualDate, payload.actualTime) : null, manualTimeEdit: !!payload.manualTimeEdit, manualTimeEditNote: payload.manualTimeEditNote || '', historical: true };
  },
  _applySnapshotIfNeeded(intake, ev){
    if (!ev || !['taken','skipped','snoozed','edited'].includes(ev.type)) return intake;
    const payload = ev.payload || {};
    const snapshotDosage = payload.dosageSnapshot || payload.plannedDosage || '';
    const snapshotName = payload.medNameSnapshot || '';
    const changed = (snapshotDosage && snapshotDosage !== (intake.dosage || '')) || (snapshotName && snapshotName !== (intake.medName || ''));
    if (!changed) return intake;
    return { ...intake, medName: snapshotName || intake.medName, dosage: snapshotDosage || intake.dosage, dosageMode: payload.dosageModeSnapshot || intake.dosageMode, historical: true };
  },
  _timeMinutes(value){ return isValidTimeHHMM(value) ? Number(value.slice(0,2))*60 + Number(value.slice(3,5)) : null; },
  _chronologicalItems(intakes, events){
    return [
      ...intakes.map((data,index)=>({kind:'intake',data,time:data.displayTime || data.time || '',index})),
      ...events.map((data,index)=>({kind:'event',data,time:data.time || '',index}))
    ].sort((a,b)=>{
      const am=this._timeMinutes(a.time); const bm=this._timeMinutes(b.time);
      if (am !== null && bm !== null && am !== bm) return am-bm;
      if (am !== null && bm === null) return -1;
      if (am === null && bm !== null) return 1;
      if (a.kind !== b.kind) return a.kind === 'intake' ? -1 : 1;
      return a.index-b.index;
    });
  },
  _buildDays(notes, symptomsEntries, meds, phases, dosageOverrides, actions, protocolEvents, protocols, intakeEvents){
    const map = Intakes.buildActionsMap(actions);
    const days=[]; let dates=[];
    if(this.period==='custom'&&this.customStart&&this.customEnd&&this.customEnd>=this.customStart){let d=fromDateStr(this.customEnd);const s=this.customStart;while(toDateStr(d)>=s){dates.push(toDateStr(d));d.setDate(d.getDate()-1);}}
    else {const total=Number(this.period||7);for(let i=0;i<total;i++){const d=new Date();d.setDate(d.getDate()-i);dates.push(toDateStr(d));}}
    for(const ds of dates){
      const dayEvents = (intakeEvents||[]).filter(e=>e.payload?.scheduledDate===ds || (e.intakeKey || '').split('|')[2] === ds);
      const latestEventByKey = new Map();
      dayEvents.filter(e=>e.intakeKey).sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||''))).forEach(e=>latestEventByKey.set(e.intakeKey,e));
      const generated = Intakes.mergeWithActions(Intakes.generateForDate(meds,phases,ds,dosageOverrides),map)
        .filter(x=>this.protocolId==='all'||meds.find(m=>m.id===x.medId)?.protocolId===this.protocolId||x.protocolId===this.protocolId)
        .map(i=>this._applySnapshotIfNeeded(i, latestEventByKey.get(i.key)));
      const keys = new Set(generated.map(i=>i.key));
      const historyByKey = new Map();
      dayEvents.filter(e=>e.intakeKey && !keys.has(e.intakeKey) && (this.protocolId==='all'||e.protocolId===this.protocolId))
        .sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')))
        .forEach(e=>historyByKey.set(e.intakeKey,e));
      const historical = [...historyByKey.values()].filter(e=>['taken','skipped','snoozed','edited'].includes(e.type)).map(e=>this._historicalIntakeFromEvent(e));
      const intakes=[...generated,...historical].sort((a,b)=>String(a.displayTime || a.time || '').localeCompare(String(b.displayTime || b.time || '')));
      const events=protocolEvents.filter(e=>e.date===ds&&(this.protocolId==='all'||e.protocolId===this.protocolId));
      days.push({date:ds,intakes,events,items:this._chronologicalItems(intakes,events),note:notes.find(n=>n.date===ds),symptoms:symptomsEntries.find(n=>n.date===ds),intakeEvents:dayEvents});
    }
    return days;
  },
  _stats(days){
    const now=new Date(); const today=todayStr(); const flat=[];
    for(const d of days){ for(const i of d.intakes){ if(d.date>today) continue; if(d.date===today){const minutes=this._timeMinutes(i.displayTime || i.time || '99:99'); if(minutes !== null && minutes>(now.getHours()*60+now.getMinutes())&&i.status==='pending') continue;} flat.push({...i,date:d.date}); } }
    const planned=flat.length; const taken=flat.filter(i=>i.status==='taken').length; const skipped=flat.filter(i=>i.status==='skipped').length; const snoozed=flat.filter(i=>i.status==='snoozed').length; const missed=flat.filter(i=>i.status==='pending').length;
    const delays=flat.filter(i=>i.status==='taken'&&i.takenAt).map(i=>Math.max(0, delayMinutesBetween(i.dateStr || '', i.time || '00:00', i.takenAt) || 0));
    return {planned,taken,skipped,snoozed,missed,adherence:planned?Math.round((taken/planned)*100):0,avgDelay:Math.round(delays.reduce((a,b)=>a+b,0)/Math.max(1,delays.length)),eventsPlanned:days.flatMap(d=>d.events).length,eventsDone:days.flatMap(d=>d.events).filter(e=>e.completed).length};
  },
  _csvLineForItem(d, item, protocols){
    if(item.kind==='intake'){
      const i=item.data; const p=protocols.find(pr=>pr.id===i.protocolId)||{}; const delay=delayMinutesBetween(i.dateStr || d.date, i.time || '', i.takenAt);
      const details=[i.historical ? 'Historique - traitement modifié depuis' : (i.dosageMode === 'variable' ? 'Dosage variable' : 'Traitement simple'), i.manualTimeEdit ? 'Correction manuelle' : ''].filter(Boolean).join(' · ');
      return [d.date,p.name||'', 'prise',i.time || i.displayTime || '',timeFromIso(i.takenAt),i.medName,i.dosage,this._statusBadge(i,d.date),delay === null ? '' : delay,'','',details];
    }
    const e=item.data; const p=protocols.find(pr=>pr.id===e.protocolId)||{}; return [d.date,p.name||'', 'événement',e.time||'Sans horaire', '',e.title,'',e.completed?'terminé':'à faire','','','',eventTypeLabelFR(e.type)];
  },
  _exportCsv(days, protocols){ const rows=[["Date","Protocole","Type ligne","Heure prévue","Heure réelle","Nom","Dosage","Statut","Retard minutes","Ressentis","Note","Détails"]]; for(const d of days){ const symptomsText = hasPositiveSymptoms(d.symptoms) ? symptomsToText(d.symptoms,true) : ''; for(const item of d.items){ rows.push(this._csvLineForItem(d,item,protocols)); } if(d.note?.freeNote){ rows.push([d.date,'','note','','','','','','','',d.note.freeNote||'','']); } if(symptomsText){ rows.push([d.date,'','ressentis','','','Ressentis du jour','','','',symptomsText,'','']); } } const csv='\uFEFF'+rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\n'); const b=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=`luma-journal-v3.6.1-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(u);},
  _reportLine(item){
    if(item.kind==='intake'){
      const i=item.data; const actualTime=timeFromIso(i.takenAt); const actual=actualTime && actualTime !== (i.time || '') ? ` · pris à ${escHtml(actualTime)}` : ''; const correction=i.manualTimeEdit ? ' · corrigé manuellement' : '';
      return `${escHtml(i.time || i.displayTime || 'Sans horaire')} — ${escHtml(i.medName)} ${escHtml(i.dosage || '')}${i.dosageMode === 'variable' ? ' · Dosage variable' : ''}${i.historical ? ' · Historique' : ''} · ${escHtml(this._statusBadge(i,i.dateStr || todayStr()))}${actual}${correction}`;
    }
    const e=item.data; return `${escHtml(e.time||'Sans horaire')} — ${escHtml(e.title)} · ${escHtml(e.completed?'terminé':'à faire')}`;
  },
  _printReport(days,stats,protocols){ const w=window.open('','_blank'); const protName=this.protocolId==='all'?'Tous protocoles':(protocols.find(p=>p.id===this.protocolId)?.name||'—'); const period=this.period==='custom'?`${this.customStart||'—'} → ${this.customEnd||'—'}`:`${this.period} jours`; const logoUrl = new URL('./icons/icone_192x192.png', location.href).href; w.document.write(`<html><head><title>Rapport Luma V3.6.1</title><style>body{font-family:-apple-system,sans-serif;padding:16px;color:#102033}.report-header{display:flex;align-items:center;gap:12px;margin-bottom:12px}.report-logo{width:56px;height:56px;border-radius:12px;object-fit:cover}.report-header h1{color:#1266C3;margin:0}.report-header p{margin:2px 0 0;color:#6B7A90;font-size:.9rem}.day{margin:12px 0;padding:8px;border:1px solid #ddd;border-radius:8px}.flow-title{font-weight:700;margin-top:8px}</style></head><body><header class='report-header'><img src='${escHtml(logoUrl)}' class='report-logo' alt='Logo Luma'><div><h1>Rapport Luma</h1><p>Journal personnel de suivi</p></div></header><p>Généré le ${escHtml(new Date().toLocaleString('fr-FR'))}</p><p>Période: ${escHtml(period)} · Protocole: ${escHtml(protName)}</p><p>Résumé: ${stats.taken}/${stats.planned} prises</p>${days.map(d=>{ const noteText=(d.note?.freeNote||'').trim(); const symptomsText = hasPositiveSymptoms(d.symptoms) ? symptomsToText(d.symptoms,true) : ''; const lines=d.items.map(item=>this._reportLine(item)).join('<br>') || 'Aucune prise ni événement.'; return `<div class='day'><strong>${escHtml(d.date)}</strong><div class='flow-title'>Déroulé :</div>${lines}${noteText?`<p><strong>Note :</strong> ${escHtml(noteText)}</p>`:''}${symptomsText?`<p><strong>Ressentis déclarés :</strong> ${escHtml(symptomsText)}</p>`:''}</div>`; }).join('')}<footer style='margin-top:20px;padding-top:10px;border-top:1px solid #d9e1ec;color:#7c8ca3;font-size:.78rem;'>Généré avec Luma · Journal personnel de suivi · Ne remplace pas un avis médical. · Luma V3.6.1</footer></body></html>`); w.document.close(); w.print(); }
};

const TimelineScreen = {
  // Date sélectionnée dans la timeline.
  selectedDate: todayStr(),
  // Filtre courant de protocole.
  selectedProtocolId: 'all',

  // Rend la timeline avec prises, événements et notes libres.
  async render() {
    const screen = document.getElementById('screen-timeline');
    try {
      const [medications, phases, allActions, protocolEvents, protocols, notes] = await Promise.all([
        DB.getMedications(), DB.getPhases(), DB.getAllIntakeActions(), DB.getProtocolEvents(), DB.getProtocols(), DB.getDailyNotes()
      ]);
      const actionsMap = Intakes.buildActionsMap(allActions);
      const protocolOpts = ['<option value="all">Tous protocoles</option>'].concat(protocols.map(p=>`<option value="${escHtml(p.id)}" ${TimelineScreen.selectedProtocolId===p.id?'selected':''}>${escHtml(p.name)} (${escHtml(p.status)})</option>`)).join('');
      const days = []; for (let i=-3;i<=14;i++){ const d=fromDateStr(todayStr()); d.setDate(d.getDate()+i); days.push(toDateStr(d)); }
      const htmlDays = days.map(ds=>TimelineScreen._dayHtml(ds, medications, phases, actionsMap, protocolEvents, protocols, notes)).join('');
      screen.innerHTML = `<div class="timeline-toolbar"><select id="timeline-protocol-filter" class="form-input">${protocolOpts}</select><button id="timeline-jump-today" class="btn-settings">Aujourd’hui</button><button id="timeline-add-event" class="btn-settings">+ Événement</button><button id="timeline-add-note" class="btn-settings">+ Note libre</button></div><div class="vertical-timeline">${htmlDays}</div>`;
      screen.querySelector('#timeline-protocol-filter').addEventListener('change', async (e)=>{TimelineScreen.selectedProtocolId=e.target.value; await TimelineScreen.render(); App.updateHeaderDate();});
      screen.querySelector('#timeline-jump-today').addEventListener('click', async ()=>{TimelineScreen.selectedDate=todayStr(); await TimelineScreen.render(); App.updateHeaderDate();});
      screen.querySelectorAll('.timeline-day-header').forEach(el=>el.addEventListener('click',()=>{TimelineScreen.selectedDate=el.dataset.date; App.updateHeaderDate();}));
      screen.querySelector('#timeline-add-event').addEventListener('click',()=>TimelineScreen.openEventForm(null, protocols));
      screen.querySelector('#timeline-add-note').addEventListener('click',()=>TimelineScreen.openFreeNoteForm(TimelineScreen.selectedDate));
      screen.querySelectorAll('[data-note-edit]').forEach(b=>b.onclick=()=>TimelineScreen.openFreeNoteForm(b.dataset.noteEdit));
      screen.querySelectorAll('[data-ev-edit]').forEach(b=>b.onclick=()=>TimelineScreen.openEventForm(protocolEvents.find(e=>e.id===b.dataset.evEdit), protocols));
      screen.querySelectorAll('[data-ev-toggle]').forEach(b=>b.onclick=async()=>{await DB.toggleProtocolEventCompleted(b.dataset.evToggle); await TimelineScreen.render(); await TodayScreen.render();});
      screen.querySelectorAll('[data-ev-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Supprimer cet événement ?')) return; await DB.deleteProtocolEvent(b.dataset.evDel); await TimelineScreen.render(); await TodayScreen.render(); showToast('Événement supprimé');});
    } catch (err) { console.error(err); showToast('Erreur timeline'); }
  },
  // Ouvre le formulaire d'ajout/édition d'une note libre du jour.
  async openFreeNoteForm(dateStr){
    const notes = await DB.getDailyNotes();
    const current = notes.find(n => n.date === dateStr && (TimelineScreen.selectedProtocolId==='all' || n.protocolId===TimelineScreen.selectedProtocolId || !n.protocolId));
    const c=`<div class="modal-header"><span class="modal-title">Note libre</span><button class="modal-close" id="modal-close-btn">✕</button></div><div class="modal-body"><div class="form-group"><label class="form-label">Date</label><input id="note-date" type="date" class="form-input" value="${escHtml(dateStr)}"/></div><div class="form-group"><label class="form-label">Contenu</label><textarea id="note-text" class="form-input" rows="4" placeholder="Symptômes, effets secondaires, ressenti...">${escHtml(current?.freeNote||'')}</textarea></div></div><div class="modal-footer"><button class="btn-secondary" id="note-cancel">Annuler</button><button class="btn-primary" id="note-save">Enregistrer</button></div>`;
    Modal.show(c);
    document.getElementById('modal-close-btn').onclick=()=>Modal.hide();
    document.getElementById('note-cancel').onclick=()=>Modal.hide();
    document.getElementById('note-save').onclick=async()=>{const chosenDate=document.getElementById('note-date').value; const content=document.getElementById('note-text').value.trim(); if(!chosenDate) return showToast('Date obligatoire'); if(!content) return showToast('Note vide'); const protocolId = current?.protocolId ?? (TimelineScreen.selectedProtocolId==='all' ? '' : TimelineScreen.selectedProtocolId); await DB.saveDailyNote({id:current?.id||uid(),date:chosenDate,protocolId,freeNote:content,updatedAt:new Date().toISOString(),createdAt:current?.createdAt||new Date().toISOString()}); Modal.hide(); showToast('Note enregistrée au journal'); await TimelineScreen.render(); await JournalScreen.render();};
  },
  // Ouvre le formulaire de création/modification d'événement protocolaire.
  openEventForm(ev, protocols){
    const c=`<div class="modal-header"><span class="modal-title">${ev?'Modifier':'Créer'} événement</span><button class="modal-close" id="modal-close-btn">✕</button></div><div class="modal-body"><div class="form-group"><label class="form-label">Protocole</label><select id="ev-protocol" class="form-input">${protocols.map(p=>`<option value="${escHtml(p.id)}" ${(ev?.protocolId||TimelineScreen.selectedProtocolId)===p.id?'selected':''}>${escHtml(p.name)}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Titre *</label><input id="ev-title" class="form-input" value="${escHtml(ev?.title||'')}"/></div><div class="form-row"><div class="form-group"><label class="form-label">Date *</label><input id="ev-date" type="date" class="form-input" value="${escHtml(ev?.date||TimelineScreen.selectedDate)}"/></div><div class="form-group"><label class="form-label">Heure</label><input id="ev-time" type="time" class="form-input" value="${escHtml(ev?.time||'')}"/></div></div><div class="form-group"><label class="form-label">Type</label><select id="ev-type" class="form-input"><option>rendez-vous</option><option>prise de sang</option><option>examen</option><option>pharmacie</option><option>injection spéciale</option><option>étape personnalisée</option><option selected>autre</option></select></div><div class="form-group"><label class="form-label">Notes</label><input id="ev-notes" class="form-input" value="${escHtml(ev?.notes||'')}"/></div></div><div class="modal-footer"><button class="btn-secondary" id="ev-cancel">Annuler</button><button class="btn-primary" id="ev-save">Enregistrer</button></div>`;
    Modal.show(c); const type=document.getElementById('ev-type'); if(ev?.type) type.value=ev.type;
    document.getElementById('modal-close-btn').onclick=()=>Modal.hide(); document.getElementById('ev-cancel').onclick=()=>Modal.hide();
    document.getElementById('ev-save').onclick=async()=>{try{const title=document.getElementById('ev-title').value.trim(); const date=document.getElementById('ev-date').value; if(!title||!date) return showToast('Titre et date obligatoires'); const data={id:ev?.id||uid(),protocolId:document.getElementById('ev-protocol').value,title,date,time:document.getElementById('ev-time').value||'',type:document.getElementById('ev-type').value,notes:document.getElementById('ev-notes').value.trim(),completed:ev?.completed||false,createdAt:ev?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()}; await DB.saveProtocolEvent(data); Modal.hide(); showToast('Événement enregistré'); await TimelineScreen.render(); await TodayScreen.render();}catch(e){console.error(e);showToast('Erreur événement');}};
  },
  _dayHtml(dateStr, medications, phases, actionsMap, protocolEvents, protocols, notes){
    const dayIntakes = Intakes.mergeWithActions(Intakes.generateForDate(medications, phases, dateStr), actionsMap).filter(i=>TimelineScreen._allowProtocol(i.medId,medications,protocols));
    const dayEvents = protocolEvents.filter(e=>e.date===dateStr && TimelineScreen._allowProtocolEvent(e,protocols));
    const note = notes.find(n=>n.date===dateStr && (TimelineScreen.selectedProtocolId==='all' || !n.protocolId || n.protocolId===TimelineScreen.selectedProtocolId));
    const items = [];
    for (const i of dayIntakes){ const v=Intakes.getVisualStatus(i,dateStr); items.push(`<div class="timeline-item"><div class="timeline-item-card status-${escHtml(v)}"><div class="timeline-item-time">${escHtml(i.displayTime)}</div><div class="timeline-item-title">${escHtml(i.medName)}</div><div class="timeline-item-detail">${escHtml(i.dosage)} · ${escHtml(statusLabelFR(v))}</div></div></div>`); }
    for (const e of dayEvents){ items.push(`<div class="timeline-item"><div class="timeline-item-card status-${e.completed?'completed':'event'}"><div class="timeline-item-time">${escHtml(e.time||'—:—')}</div><div class="timeline-item-title">${escHtml(e.title)}</div><div class="timeline-item-detail">${escHtml(e.type||'autre')} · ${e.completed?'terminé':'à faire'}</div><div style="margin-top:6px;display:flex;gap:6px;"><button class="btn-settings" data-ev-edit="${escHtml(e.id)}">Modifier</button><button class="btn-settings" data-ev-toggle="${escHtml(e.id)}">${e.completed?'Réouvrir':'Terminer'}</button><button class="btn-settings" data-ev-del="${escHtml(e.id)}">Supprimer</button></div></div></div>`); }
    if (note?.freeNote) items.push(`<div class="timeline-item"><div class="timeline-item-card status-event"><div class="timeline-item-time">Note libre</div><div class="timeline-item-detail">${escHtml(note.freeNote)}</div><div style="margin-top:6px;"><button class="btn-settings" data-note-edit="${escHtml(dateStr)}">Modifier</button></div></div></div>`);
    const d=fromDateStr(dateStr); const label=d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
    const activeP = protocols.find(p=>p.id===TimelineScreen.selectedProtocolId); let j=''; if(activeP?.startDate){ const diff=Math.floor((d-fromDateStr(activeP.startDate))/86400000)+1; if(diff>0) j=` · J${diff}`; }
    return `<section class="timeline-day ${TimelineScreen.selectedDate===dateStr?'selected':''}"><div class="timeline-rail"></div><div class="timeline-dot"></div><div class="timeline-day-content"><div class="timeline-day-header" data-date="${dateStr}">${capitalize(label)}${dateStr===todayStr()?' · Aujourd’hui':''}${j}</div>${items.length?items.join(''):'<div class="timeline-item"><div class="timeline-item-card">Aucune action</div></div>'}</div></section>`;
  },
  // Vérifie si une prise appartient au protocole sélectionné.
  _allowProtocol(medId, medications, protocols){ const med=medications.find(m=>m.id===medId); if(!med) return false; if(TimelineScreen.selectedProtocolId!=='all' && med.protocolId!==TimelineScreen.selectedProtocolId) return false; const p=protocols.find(x=>x.id===med.protocolId); return !p || p.status!=='archived'; },
  // Vérifie si un événement appartient au protocole sélectionné.
  _allowProtocolEvent(e, protocols){ if(TimelineScreen.selectedProtocolId!=='all'&&e.protocolId!==TimelineScreen.selectedProtocolId) return false; const p=protocols.find(x=>x.id===e.protocolId); return !p || p.status!=='archived'; }
};

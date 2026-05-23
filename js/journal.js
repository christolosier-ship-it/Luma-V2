const JournalScreen = {
  async render() {
    const screen = document.getElementById('screen-journal');
    try {
      const [events, notes, meds, phases, actions, protocolEvents] = await Promise.all([DB.getIntakeEvents(), DB.getDailyNotes(), DB.getMedications(), DB.getPhases(), DB.getAllIntakeActions(), DB.getProtocolEvents()]);
      const range = 30;
      const days = [];
      for (let i=0;i<range;i++){ const d=new Date(); d.setDate(d.getDate()-i); const ds=toDateStr(d); const intakes = Intakes.mergeWithActions(Intakes.generateForDate(meds, phases, ds), Intakes.buildActionsMap(actions)); days.push({date:ds,intakes,note:notes.find(n=>n.date===ds),protocolEvents:protocolEvents.filter(e=>e.date===ds)}); }
      screen.innerHTML = `<div class="section-title">Journal consultable</div><div class="section-subtitle">30 derniers jours</div><div class="card"><button class="btn-settings" id="btn-csv">Export CSV</button> <button class="btn-settings" id="btn-print">Imprimer / PDF</button></div>${days.map(d=>JournalScreen._dayCard(d)).join('')}`;
      screen.querySelector('#btn-csv').addEventListener('click',()=>JournalScreen._exportCsv(days));
      screen.querySelector('#btn-print').addEventListener('click',()=>window.print());
    } catch (err) { console.error(err); showToast('Erreur affichage journal'); }
  },
  _dayCard(d){ const taken=d.intakes.filter(i=>i.status==='taken').length; const skipped=d.intakes.filter(i=>i.status==='skipped').length; return `<div class="card"><div><strong>${capitalize(formatDateFR(d.date))}</strong></div><div style="font-size:.85rem;color:var(--text-soft);">${d.intakes.length} prévues · ${taken} prises · ${skipped} passées</div>${d.intakes.map(i=>`<div style="font-size:.85rem;margin-top:4px;">${escHtml(i.time)} — ${escHtml(i.medName)} — ${escHtml(i.status)}</div>`).join('')}${d.protocolEvents.map(e=>`<div style="font-size:.85rem;margin-top:4px;">${escHtml(e.time||'—')} — ${escHtml(e.title)} — ${e.completed?'terminé':'à faire'}</div>`).join('')}${d.note?`<div style="margin-top:6px;"><em>${escHtml(d.note.freeNote||'')}</em></div>`:''}</div>`; },
  _exportCsv(days){
    const rows=[["Date","Protocole","Type ligne","Heure prévue","Heure réelle","Médicament / Événement","Dosage","Statut","Retard minutes","Note prise","Symptômes","Note du jour"]];
    for (const d of days){ for(const i of d.intakes){ rows.push([d.date,'','prise',i.time,i.takenAt?new Date(i.takenAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'',i.medName,i.dosage,i.status,'','','',d.note?.freeNote||'']); } for(const e of d.protocolEvents){ rows.push([d.date,'','événement',e.time||'', '', e.title,'', e.completed?'terminé':'à faire','','','',d.note?.freeNote||'']); }}
    const csv = '\uFEFF'+rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`luma-journal-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(url); showToast('✓ Export CSV');
  }
};

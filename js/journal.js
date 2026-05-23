const JournalScreen = {
  async render() {
    const screen = document.getElementById('screen-journal');
    const [events, notes] = await Promise.all([DB.getIntakeEvents(), DB.getDailyNotes()]);
    const last7 = events.filter(e => e.createdAt >= new Date(Date.now() - 7 * 86400000).toISOString());
    const taken = last7.filter(e => e.type === 'taken').length;
    const skipped = last7.filter(e => e.type === 'skipped').length;
    const snoozed = last7.filter(e => e.type === 'snoozed').length;
    const note = notes.find(n => n.date === todayStr());
    screen.innerHTML = `<div class="section-title">Journal</div>
      <div class="card"><strong>7 derniers jours</strong><div>Prises enregistrées: ${taken}</div><div>Passées: ${skipped}</div><div>Reportées: ${snoozed}</div></div>
      <div class="card"><strong>Note du jour</strong><textarea id="daily-note" class="form-input" rows="4" placeholder="Symptômes / note libre">${escHtml(note?.freeNote || '')}</textarea>
      <div style="font-size:.8rem;color:var(--text-soft);margin-top:8px;">En cas de doute ou de symptôme important, contactez un professionnel de santé.</div>
      <button class="btn-primary" id="save-note" style="margin-top:10px;">Enregistrer</button></div>`;
    screen.querySelector('#save-note').addEventListener('click', async () => {
      const now = new Date().toISOString();
      await DB.saveDailyNote({ id: note?.id || uid(), date: todayStr(), protocolId: note?.protocolId || null, symptoms: note?.symptoms || {}, freeNote: screen.querySelector('#daily-note').value.trim(), createdAt: note?.createdAt || now, updatedAt: now });
      showToast('✓ Note enregistrée');
    });
  }
};

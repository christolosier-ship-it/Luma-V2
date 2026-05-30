const DailyEntryModals = {
  async openFreeNoteForm(dateStr = todayStr()) {
    const notes = await DB.getDailyNotes();
    const current = notes.find((n) => n.date === dateStr);
    const content = `
      <div class="modal-header"><span class="modal-title">Note libre</span><button class="modal-close" id="modal-close-btn">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Date</label><input id="note-date" type="date" class="form-input" value="${escHtml(dateStr)}"/></div>
        <div class="form-group"><label class="form-label">Note</label><textarea id="note-text" class="form-input" rows="4" placeholder="Note libre">${escHtml(current?.freeNote || '')}</textarea></div>
      </div>
      <div class="modal-footer"><button class="btn-secondary" id="note-cancel">Annuler</button><button class="btn-primary" id="note-save">Enregistrer</button></div>`;
    Modal.show(content);
    document.getElementById('modal-close-btn').onclick = () => Modal.hide();
    document.getElementById('note-cancel').onclick = () => Modal.hide();
    document.getElementById('note-date').onchange = (e) => DailyEntryModals.openFreeNoteForm(e.target.value || todayStr());
    document.getElementById('note-save').onclick = async () => {
      const chosenDate = document.getElementById('note-date').value;
      const content = document.getElementById('note-text').value.trim();
      if (!chosenDate || !content) return showToast('Date et note obligatoires');
      const allNotes = await DB.getDailyNotes();
      const existing = allNotes.find((n) => n.date === chosenDate);
      await DB.saveDailyNote({ id: chosenDate, date: chosenDate, freeNote: content, updatedAt: new Date().toISOString(), createdAt: existing?.createdAt || new Date().toISOString() });
      Modal.hide();
      showToast('Note enregistrée');
      await DailyEntryModals._refresh(chosenDate);
    };
  },

  async openSymptomsForm(dateStr = todayStr()) {
    const all = await DB.getDailySymptoms();
    const current = all.find((s) => s.date === dateStr) || { id: dateStr, date: dateStr, symptoms: getDefaultSymptoms(), otherSymptomLabel: '' };
    const fields = [
      ['nausea', 'Nausée'], ['fatigue', 'Fatigue'], ['pain', 'Douleur'], ['headache', 'Maux de tête'],
      ['dizziness', 'Vertiges'], ['mood', 'Humeur'], ['sleep', 'Sommeil'], ['bleeding', 'Saignement'],
      ['other', current.otherSymptomLabel || 'Autre symptôme'],
    ];
    const options = [
      ['0', '0 - aucun'], ['1', '1 - léger'], ['2', '2 - modéré'], ['3', '3 - fort'],
    ];
    const rows = fields.map(([key, label]) => `
      <label>${escHtml(label)}<select id="sym-${escHtml(key)}" class="form-input">
        ${options.map(([value, labelText]) => `<option value="${value}" ${Number(current.symptoms?.[key] || 0) === Number(value) ? 'selected' : ''}>${labelText}</option>`).join('')}
      </select></label>`).join('');
    const content = `
      <div class="modal-header"><span class="modal-title">Symptômes</span><button class="modal-close" id="modal-close-btn">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Date</label><input id="sym-date" type="date" class="form-input" value="${escHtml(dateStr)}"/></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">${rows}</div>
        <input id="sym-other-label" class="form-input" style="margin-top:8px;" placeholder="Libellé autre symptôme" value="${escHtml(current.otherSymptomLabel || '')}"/>
      </div>
      <div class="modal-footer"><button class="btn-secondary" id="sym-cancel">Annuler</button><button class="btn-primary" id="sym-save">Enregistrer</button></div>`;
    Modal.show(content);
    document.getElementById('modal-close-btn').onclick = () => Modal.hide();
    document.getElementById('sym-cancel').onclick = () => Modal.hide();
    document.getElementById('sym-date').onchange = (e) => DailyEntryModals.openSymptomsForm(e.target.value || todayStr());
    document.getElementById('sym-save').onclick = async () => {
      const chosenDate = document.getElementById('sym-date').value;
      if (!chosenDate) return showToast('Date obligatoire');
      const clamp = (value) => Math.max(0, Math.min(3, Number(value) || 0));
      const symptoms = Object.keys(getDefaultSymptoms()).reduce((acc, key) => {
        acc[key] = clamp(document.getElementById(`sym-${key}`)?.value);
        return acc;
      }, getDefaultSymptoms());
      const otherSymptomLabel = document.getElementById('sym-other-label').value.trim();
      const hasValues = Object.values(symptoms).some((v) => Number(v) > 0);
      if (!hasValues && !otherSymptomLabel) {
        await DB.deleteDailySymptoms(chosenDate);
      } else {
        const existing = (await DB.getDailySymptoms()).find((s) => s.date === chosenDate);
        await DB.saveDailySymptoms({ id: chosenDate, date: chosenDate, symptoms, otherSymptomLabel, updatedAt: new Date().toISOString(), createdAt: existing?.createdAt || new Date().toISOString() });
      }
      Modal.hide();
      showToast('Symptômes enregistrés');
      await DailyEntryModals._refresh(chosenDate);
    };
  },

  async _refresh(dateStr) {
    if (dateStr === todayStr()) await TodayScreen.render();
    await TimelineScreen.render();
    await JournalScreen.render();
  },
};

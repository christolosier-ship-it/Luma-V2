const TimelineScreen = {
  selectedDate: todayStr(),
  selectedProtocolId: 'all',
  hideEmptyDays: false,
  _hideEmptyStorageKey: 'luma.timeline.hideEmptyDays',

  async render() {
    const screen = document.getElementById('screen-timeline');
    if (localStorage.getItem(this._hideEmptyStorageKey) != null) this.hideEmptyDays = localStorage.getItem(this._hideEmptyStorageKey) === 'true';
    const [medications, phases, allActions, protocolEvents, protocols, notes, symptomsEntries, dosageOverrides] = await Promise.all([
      DB.getMedications(), DB.getPhases(), DB.getAllIntakeActions(), DB.getProtocolEvents(), DB.getProtocols(), DB.getDailyNotes(), DB.getDailySymptoms(), DB.getDosageOverrides(),
    ]);
    const actionsMap = Intakes.buildActionsMap(allActions);
    const days = [];
    for (let i = -4; i <= 21; i += 1) { const d = fromDateStr(todayStr()); d.setDate(d.getDate() + i); days.push(toDateStr(d)); }
    const htmlDays = days.map((ds) => this._dayHtml(ds, medications, phases, actionsMap, protocolEvents, notes, symptomsEntries, dosageOverrides)).filter(Boolean).join('');
    const protocolOpts = ['<option value="all">Tous protocoles</option>'].concat(protocols.map((p) => `<option value="${escHtml(p.id)}" ${this.selectedProtocolId === p.id ? 'selected' : ''}>${escHtml(p.name)} (${escHtml(protocolStatusLabelFR(p.status))})</option>`)).join('');

    screen.innerHTML = `
      <div class="timeline-shell">
        <div class="timeline-toolbar">
          <select id="timeline-protocol-filter" class="form-input">${protocolOpts}</select>
          <button id="timeline-jump-today" class="btn btn-primary btn-compact btn-timeline-today">Aujourd’hui</button>
          <label class="timeline-toggle-empty"><input id="timeline-hide-empty" type="checkbox" ${this.hideEmptyDays ? 'checked' : ''}/> Masquer les jours vides</label>
        </div>
        <div class="vertical-timeline">${htmlDays || '<div class="timeline-empty-day">Aucun élément avec les filtres courants.</div>'}</div>
      </div>`;

    screen.querySelector('#timeline-protocol-filter').onchange = async (e) => { this.selectedProtocolId = e.target.value; await this.render(); App.updateHeaderDate(); };
    screen.querySelector('#timeline-jump-today').onclick = async () => {
      const el = screen.querySelector(`[data-timeline-date="${todayStr()}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.classList.add('timeline-highlight');
      setTimeout(() => el?.classList.remove('timeline-highlight'), 1400);
    };
    screen.querySelector('#timeline-hide-empty').onchange = async (e) => { this.hideEmptyDays = !!e.target.checked; localStorage.setItem(this._hideEmptyStorageKey, this.hideEmptyDays ? 'true' : 'false'); await this.render(); };
    screen.querySelectorAll('[data-note-edit]').forEach((b) => { b.onclick = () => this.openFreeNoteForm(b.dataset.noteEdit); });
    screen.querySelectorAll('[data-ev-edit]').forEach((b) => { b.onclick = () => this.openEventForm(protocolEvents.find((e) => e.id === b.dataset.evEdit), protocols); });
    screen.querySelectorAll('[data-ev-toggle]').forEach((b) => { b.onclick = async () => { await DB.toggleProtocolEventCompleted(b.dataset.evToggle); await this.render(); await TodayScreen.render(); await JournalScreen.render(); showToast('Événement mis à jour'); }; });
    screen.querySelectorAll('[data-ev-del]').forEach((b) => { b.onclick = async () => { if (!confirm('Supprimer cet événement ?')) return; await DB.deleteProtocolEvent(b.dataset.evDel); await this.render(); await TodayScreen.render(); await JournalScreen.render(); showToast('Événement supprimé'); }; });
  },

  async openFreeNoteForm(dateStr = todayStr()) { return DailyEntryModals.openFreeNoteForm(dateStr); },
  async openSymptomsForm(dateStr = todayStr()) { return DailyEntryModals.openSymptomsForm(dateStr); },

  openEventForm(ev, protocols) {
    const options = PROTOCOL_EVENT_TYPES.map((t) => `<option value="${escHtml(t.value)}" ${(ev?.type || 'appointment') === t.value ? 'selected' : ''}>${escHtml(t.label)}</option>`).join('');
    const defaultProtocolId = ev?.protocolId
      || (this.selectedProtocolId !== 'all' && protocols.some((p) => p.id === this.selectedProtocolId) ? this.selectedProtocolId : '')
      || protocols.find((p) => p.status === 'active')?.id
      || '';
    const protocolOptions = protocols.map((p) => `<option value="${escHtml(p.id)}" ${(defaultProtocolId === p.id) ? 'selected' : ''}>${escHtml(p.name)}</option>`).join('');
    const content = `
      <div class="modal-header"><span class="modal-title">${ev ? 'Modifier' : 'Créer'} événement</span><button class="modal-close" id="modal-close-btn">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Protocole</label><select id="ev-protocol" class="form-input"><option value="">Sélectionner</option>${protocolOptions}</select></div>
        <div class="form-group"><label class="form-label">Titre *</label><input id="ev-title" class="form-input" value="${escHtml(ev?.title || '')}"/></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Date *</label><input id="ev-date" type="date" class="form-input" value="${escHtml(ev?.date || this.selectedDate || todayStr())}"/></div><div class="form-group"><label class="form-label">Heure</label><input id="ev-time" type="time" class="form-input" value="${escHtml(ev?.time || '')}"/></div></div>
        <div class="form-group"><label class="form-label">Type</label><select id="ev-type" class="form-input">${options}</select></div>
        <div class="form-group"><label class="form-label">Notes</label><textarea id="ev-notes" class="form-input" rows="3">${escHtml(ev?.notes || '')}</textarea></div>
        <div class="form-group"><label><input id="ev-completed" type="checkbox" ${ev?.completed ? 'checked' : ''}/> Événement terminé</label></div>
      </div>
      <div class="modal-footer">${ev ? '<button class="btn-secondary" id="ev-delete">Supprimer</button>' : ''}<button class="btn-secondary" id="ev-cancel">Annuler</button><button class="btn-primary" id="ev-save">Enregistrer</button></div>`;
    Modal.show(content);
    document.getElementById('modal-close-btn').onclick = () => Modal.hide();
    document.getElementById('ev-cancel').onclick = () => Modal.hide();
    document.getElementById('ev-delete')?.addEventListener('click', async () => { if (!confirm('Supprimer cet événement ?')) return; await DB.deleteProtocolEvent(ev.id); Modal.hide(); showToast('Événement supprimé'); await this.render(); await TodayScreen.render(); await JournalScreen.render(); });
    document.getElementById('ev-save').onclick = async () => {
      const title = document.getElementById('ev-title').value.trim();
      const date = document.getElementById('ev-date').value;
      const protocolId = document.getElementById('ev-protocol').value;
      const time = document.getElementById('ev-time').value.trim();
      const type = document.getElementById('ev-type').value;
      if (!title) return showToast('Titre obligatoire');
      if (!date) return showToast('Date obligatoire');
      if (protocols.length && !protocolId) return showToast('Protocole obligatoire');
      if (time && !isValidTimeHHMM(time)) return showToast('Heure invalide (HH:MM)');
      if (!isValidProtocolEventType(type)) return showToast('Type invalide');
      const data = { id: ev?.id || uid(), protocolId: protocolId || null, title, date, time: time || '', type, notes: document.getElementById('ev-notes').value.trim(), completed: !!document.getElementById('ev-completed').checked, createdAt: ev?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
      await DB.saveProtocolEvent(data);
      Modal.hide();
      showToast(ev ? 'Événement modifié' : 'Événement créé');
      await this.render();
      await JournalScreen.render();
      if (date === todayStr() || ev?.date === todayStr()) await TodayScreen.render();
    };
  },

  _dayHtml(dateStr, medications, phases, actionsMap, protocolEvents, notes, symptomsEntries, dosageOverrides) {
    const filteredMeds = this.selectedProtocolId === 'all' ? medications : medications.filter((m) => m.protocolId === this.selectedProtocolId);
    const filteredPhases = this.selectedProtocolId === 'all' ? phases : phases.filter((p) => p.protocolId === this.selectedProtocolId);
    const dayIntakes = Intakes.mergeWithActions(Intakes.generateForDate(filteredMeds, filteredPhases, dateStr, dosageOverrides), actionsMap);
    const dayEvents = protocolEvents.filter((e) => e.date === dateStr && (this.selectedProtocolId === 'all' || e.protocolId === this.selectedProtocolId));
    const note = notes.find((n) => n.date === dateStr);
    const daySymptoms = symptomsEntries.find((n) => n.date === dateStr);
    const hasContent = dayIntakes.length || dayEvents.length || hasFreeNote(note) || hasPositiveSymptoms(daySymptoms);
    if (this.hideEmptyDays && !hasContent) return '';

    const timedItems = [
      ...dayIntakes.map((intake) => ({ type: 'intake', time: intake.displayTime || intake.time || '', sortTime: intake.displayTime || intake.time || '99:99', data: intake })),
      ...dayEvents.filter((event) => isValidTimeHHMM(event.time)).map((event) => ({ type: 'event', time: event.time, sortTime: event.time, data: event })),
    ].sort((a, b) => a.sortTime.localeCompare(b.sortTime) || (a.type === b.type ? 0 : a.type.localeCompare(b.type)));
    const untimedEvents = dayEvents.filter((event) => !isValidTimeHHMM(event.time));

    const items = [];
    for (const item of timedItems) items.push(item.type === 'intake' ? this._intakeItemHtml(item.data) : this._eventItemHtml(item.data));
    for (const event of untimedEvents) items.push(this._eventItemHtml(event));
    if (hasFreeNote(note)) items.push(this._noteItemHtml(dateStr, note));
    if (hasPositiveSymptoms(daySymptoms)) items.push(this._symptomsItemHtml(daySymptoms));

    const label = fromDateStr(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return `<section class="timeline-day ${dateStr === todayStr() ? 'is-today' : ''}" data-timeline-date="${escHtml(dateStr)}"><div class="timeline-rail"></div><div class="timeline-dot"></div><div class="timeline-day-content"><div class="timeline-day-header" data-date="${escHtml(dateStr)}">${capitalize(label)}</div>${items.length ? items.join('') : '<div class="timeline-empty-day">Aucune action</div>'}</div></section>`;
  },

  _intakeItemHtml(intake) {
    const status = Intakes.getVisualStatus(intake, intake.dateStr || todayStr());
    const dosageText = intake.dosage ? ` - ${escHtml(intake.dosage)}` : '';
    const variableText = intake.dosageMode === 'variable' ? ' · Dosage variable' : '';
    return `<div class="timeline-item"><div class="timeline-item-card status-${escHtml(status)}"><div class="timeline-item-icon">💊</div><div class="timeline-item-content"><div class="timeline-compact-line"><span>${escHtml(intake.displayTime || intake.time || 'Sans horaire')} · ${escHtml(intake.medName || '')}${dosageText}${variableText}</span>${this._statusBadge(status)}</div></div></div></div>`;
  },

  _eventItemHtml(event) {
    const statusClass = event.completed ? 'status-event status-completed' : 'status-event status-pending';
    const badge = event.completed ? this._statusBadge('completed') : this._statusBadge('pending');
    return `<div class="timeline-item"><div class="timeline-item-card ${statusClass}"><div class="timeline-item-icon">📅</div><div class="timeline-item-content"><div class="timeline-compact-line timeline-event-line"><span>${escHtml(event.time || 'Sans horaire')} · ${escHtml(event.title)} - ${escHtml(eventTypeLabelFR(event.type))}</span>${badge}<button class="btn icon-btn is-primary" data-ev-edit="${escHtml(event.id)}" title="Modifier l’événement" aria-label="Modifier l’événement">…</button></div></div></div></div>`;
  },

  _noteItemHtml(dateStr, note) {
    return `<div class="timeline-item"><div class="timeline-item-card status-note"><div class="timeline-item-icon">📝</div><div><div class="timeline-item-title">Note libre <button class="btn btn-linkish btn-compact" data-note-edit="${escHtml(dateStr)}">Modifier</button></div><div class="timeline-item-detail">${escHtml(note.freeNote)}</div></div></div></div>`;
  },

  _symptomsItemHtml(daySymptoms) {
    return `<div class="timeline-item"><div class="timeline-item-card status-note"><div class="timeline-item-icon">🌡️</div><div><div class="timeline-item-title">Symptômes</div><div class="timeline-item-detail">${escHtml(symptomsToText(daySymptoms, true))}</div></div></div></div>`;
  },

  _statusBadge(status) {
    const labels = { taken:'Pris', skipped:'Passé', snoozed:'Reporté', late:'En retard', pending:'À venir', completed:'Terminé', untimed:'Sans horaire' };
    const classes = { taken:'is-success', completed:'is-success', skipped:'is-muted', snoozed:'is-primary', late:'is-warning', pending:'is-primary', untimed:'is-muted' };
    return `<span class="status-badge ${classes[status] || 'is-muted'}">${labels[status] || status}</span>`;
  },
};

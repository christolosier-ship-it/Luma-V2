/**
 * today.js — Today screen rendering and intake actions
 */

const TodayScreen = {

  async render(dateStr) {
    const screen = document.getElementById('screen-today');

    try {
      const [medications, phases, allActions] = await Promise.all([
        DB.getMedications(),
        DB.getPhases(),
        DB.getAllIntakeActions(),
      ]);

      const actionsMap = Intakes.buildActionsMap(allActions);
      const events = Intakes.generateForDate(medications, phases, dateStr);
      const intakes = Intakes.sortForToday(Intakes.mergeWithActions(events, actionsMap), dateStr);

      const isToday = dateStr === todayStr();
      const dateLabel = isToday ? 'Aujourd\'hui' : capitalize(formatDateFR(dateStr));
      const takenCount = intakes.filter(i => i.status === 'taken').length;

      screen.innerHTML = `
        <div class="today-header">
          <div class="today-date-label">${dateLabel}</div>
          <div class="today-count">${intakes.length} prise${intakes.length !== 1 ? 's' : ''}${intakes.length > 0 ? ` · ${takenCount} prise${takenCount !== 1 ? 's' : ''} effectuée${takenCount !== 1 ? 's' : ''}` : ''}</div>
        </div>
        ${intakes.length === 0 ? TodayScreen._emptyState(medications.length) : intakes.map(i => TodayScreen._intakeCard(i, dateStr)).join('')}
      `;

      screen.querySelectorAll('.btn-action').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const { action, key, time } = btn.dataset;
          await TodayScreen._handleAction(action, key, time, dateStr);
        });
      });
    } catch (err) {
      console.error('Today render failed', err);
      showToast('Impossible d\'afficher les prises du jour');
    }
  },

  _emptyState(medCount) { return medCount === 0 ? `<div class="empty-state"><div class="empty-icon">💊</div><p>Aucun traitement configuré.<br>Ajoutez un médicament dans l'onglet Traitements.</p></div>` : `<div class="empty-state"><div class="empty-icon">✨</div><p>Aucune prise prévue ce jour.</p></div>`; },

  _intakeCard(intake, dateStr) {
    const visualStatus = Intakes.getVisualStatus(intake, dateStr);
    const statusClass = `status-${visualStatus}`;
    const timeClass = intake.status === 'snoozed' ? 'snoozed-time' : '';
    const badgeHtml = TodayScreen._badge(visualStatus);
    const actionsHtml = TodayScreen._actions(intake);

    return `
      <div class="intake-card ${statusClass}" data-key="${escHtml(intake.key)}">
        <div class="intake-top">
          <div class="intake-time ${timeClass}">
            ${escHtml(intake.displayTime)}
            ${intake.status === 'snoozed' ? '<span style="font-size:0.7rem;font-weight:400;">(reporté)</span>' : ''}
          </div>
          ${badgeHtml}
        </div>
        <div class="intake-name">${escHtml(intake.medName)}</div>
        <div class="intake-detail">${escHtml(intake.dosage)}${intake.medType ? ' · ' + escHtml(intake.medType) : ''}${intake.notes ? ' · ' + escHtml(intake.notes) : ''}</div>
        ${actionsHtml}
      </div>
    `;
  },

  _badge(status) {
    const labels = { taken: '✓ Pris', skipped: '⊘ Passé', snoozed: '⏱ Reporté', pending: 'En attente', late: '⚠ En retard' };
    const classes = { taken: 'badge-taken', skipped: 'badge-skipped', snoozed: 'badge-snoozed', pending: 'badge-pending', late: 'badge-pending' };
    return `<span class="intake-status-badge ${classes[status]}">${labels[status]}</span>`;
  },

  _actions(intake) {
    const baseTime = intake.displayTime;
    return `
      <div class="intake-actions">
        <button class="btn-action btn-taken" data-action="taken" data-key="${escHtml(intake.key)}" data-time="${escHtml(baseTime)}">✓ Pris</button>
        <button class="btn-action btn-skip" data-action="skipped" data-key="${escHtml(intake.key)}" data-time="${escHtml(baseTime)}">⊘ Passer</button>
        <button class="btn-action btn-snooze" data-action="snoozed" data-key="${escHtml(intake.key)}" data-time="${escHtml(baseTime)}">+15 min</button>
        ${intake.status !== 'pending' ? `<button class="btn-action" data-action="cancel" data-key="${escHtml(intake.key)}" data-time="${escHtml(baseTime)}">Annuler</button>` : ''}
      </div>
    `;
  },

  async _handleAction(action, key, currentTime, dateStr) {
    try {
      if (action === 'cancel') {
        await DB.deleteIntakeAction(key);
        showToast('↺ Action annulée');
        return TodayScreen.render(dateStr);
      }
      const actionData = { key, status: action, updatedAt: new Date().toISOString(), takenAt: action === 'taken' ? new Date().toISOString() : null };
      if (action === 'snoozed') {
        const [h, m] = currentTime.split(':').map(Number);
        const total = h * 60 + m + 15;
        if (total > (23 * 60 + 59)) { showToast('Impossible de reporter après 23:59'); return; }
        actionData.snoozedTime = addMinutesToTime(currentTime, 15);
      }
      await DB.saveIntakeAction(actionData);
      const parts = key.split('|');
      await DB.saveIntakeEvent({
        id: uid(),
        intakeKey: key,
        protocolId: null,
        medicationId: parts[0] || null,
        type: action,
        createdAt: new Date().toISOString(),
        payload: { scheduledDate: dateStr, scheduledTime: currentTime, actualTime: actionData.snoozedTime || currentTime }
      });
      showToast({ taken: '✓ Prise enregistrée', skipped: '⊘ Prise passée', snoozed: '⏱ Reportée de 15 min' }[action] || 'Mis à jour');
      await TodayScreen.render(dateStr);
    } catch (err) {
      console.error('Intake action failed', err);
      showToast('Action impossible, réessayez');
    }
  },
};

/**
 * today.js — Today screen rendering and intake actions
 */

const TodayScreen = {

  async render(dateStr) {
    const screen = document.getElementById('screen-today');

    // Load data
    const [medications, phases, allActions] = await Promise.all([
      DB.getMedications(),
      DB.getPhases(),
      DB.getAllIntakeActions(),
    ]);

    const actionsMap = Intakes.buildActionsMap(allActions);
    const events = Intakes.generateForDate(medications, phases, dateStr);
    const intakes = Intakes.mergeWithActions(events, actionsMap);

    // Header label
    const isToday = dateStr === todayStr();
    const dateLabel = isToday ? 'Aujourd\'hui' : capitalize(formatDateFR(dateStr));
    const takenCount = intakes.filter(i => i.status === 'taken').length;

    screen.innerHTML = `
      <div class="today-header">
        <div class="today-date-label">${dateLabel}</div>
        <div class="today-count">${intakes.length} prise${intakes.length !== 1 ? 's' : ''}${intakes.length > 0 ? ` · ${takenCount} prise${takenCount !== 1 ? 's' : ''} effectuée${takenCount !== 1 ? 's' : ''}` : ''}</div>
      </div>
      ${intakes.length === 0 ? TodayScreen._emptyState(medications.length) : intakes.map(i => TodayScreen._intakeCard(i)).join('')}
    `;

    // Bind action buttons
    screen.querySelectorAll('.btn-action').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const { action, key, time } = btn.dataset;
        await TodayScreen._handleAction(action, key, time, dateStr);
      });
    });
  },

  _emptyState(medCount) {
    if (medCount === 0) {
      return `<div class="empty-state">
        <div class="empty-icon">💊</div>
        <p>Aucun traitement configuré.<br>Ajoutez un médicament dans l'onglet Traitements.</p>
      </div>`;
    }
    return `<div class="empty-state">
      <div class="empty-icon">✨</div>
      <p>Aucune prise prévue ce jour.</p>
    </div>`;
  },

  _intakeCard(intake) {
    const statusClass = `status-${intake.status}`;
    const timeClass = intake.status === 'snoozed' ? 'snoozed-time' : '';
    const badgeHtml = TodayScreen._badge(intake.status);
    const actionsHtml = intake.status === 'taken' || intake.status === 'skipped'
      ? '' : TodayScreen._actions(intake);

    return `
      <div class="intake-card ${statusClass}" data-key="${intake.key}">
        <div class="intake-top">
          <div class="intake-time ${timeClass}">
            ${intake.displayTime}
            ${intake.status === 'snoozed' ? '<span style="font-size:0.7rem;font-weight:400;">(reporté)</span>' : ''}
          </div>
          ${badgeHtml}
        </div>
        <div class="intake-name">${intake.medName}</div>
        <div class="intake-detail">${intake.dosage}${intake.medType ? ' · ' + intake.medType : ''}${intake.notes ? ' · ' + intake.notes : ''}</div>
        ${actionsHtml}
      </div>
    `;
  },

  _badge(status) {
    const labels = { taken: '✓ Pris', skipped: '⊘ Passé', snoozed: '⏱ Reporté', pending: 'En attente' };
    const classes = { taken: 'badge-taken', skipped: 'badge-skipped', snoozed: 'badge-snoozed', pending: 'badge-pending' };
    return `<span class="intake-status-badge ${classes[status]}">${labels[status]}</span>`;
  },

  _actions(intake) {
    return `
      <div class="intake-actions">
        <button class="btn-action btn-taken"
          data-action="taken" data-key="${intake.key}" data-time="${intake.time}">
          ✓ Pris
        </button>
        <button class="btn-action btn-skip"
          data-action="skipped" data-key="${intake.key}" data-time="${intake.time}">
          ⊘ Passer
        </button>
        <button class="btn-action btn-snooze"
          data-action="snoozed" data-key="${intake.key}" data-time="${intake.time}">
          +15 min
        </button>
      </div>
    `;
  },

  async _handleAction(action, key, originalTime, dateStr) {
    let actionData = {
      key,
      status: action,
      updatedAt: new Date().toISOString(),
      takenAt: action === 'taken' ? new Date().toISOString() : null,
    };

    if (action === 'snoozed') {
      // Add 15 minutes to original time
      const newTime = addMinutesToTime(originalTime, 15);
      actionData.snoozedTime = newTime;
    }

    await DB.saveIntakeAction(actionData);

    const messages = {
      taken: '✓ Prise enregistrée',
      skipped: '⊘ Prise passée',
      snoozed: '⏱ Reportée de 15 min',
    };
    showToast(messages[action] || 'Mis à jour');

    // Re-render today screen
    await TodayScreen.render(dateStr);
  },
};

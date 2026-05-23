/**
 * calendar.js — Monthly calendar + selected day intakes
 */

const TimelineScreen = {

  _viewYear: null,
  _viewMonth: null,

  async render(selectedDateStr) {
    const screen = document.getElementById('screen-timeline');

    // Init view month from selected date
    const selDate = fromDateStr(selectedDateStr);
    if (this._viewYear === null) {
      this._viewYear = selDate.getFullYear();
      this._viewMonth = selDate.getMonth();
    }

    const [medications, phases, allActions, protocolEvents] = await Promise.all([DB.getMedications(),DB.getPhases(),DB.getAllIntakeActions(),DB.getProtocolEvents()]);

    const datesWithIntakes = Intakes.getDatesWithIntakesInMonth(
      medications, phases, this._viewYear, this._viewMonth
    );

    const actionsMap = Intakes.buildActionsMap(allActions);

    screen.innerHTML = `
      <div class="section-title">Timeline</div>
      <div class="section-subtitle">Sélectionnez un jour pour voir les prises</div>
      <div class="calendar-wrap card">
        ${this._navHtml()}
        ${this._gridHtml(selectedDateStr, datesWithIntakes)}
      </div>
      <div class="tl-selected-label">
        Prises du ${capitalize(formatDateFR(selectedDateStr))}
      </div>
      <div id="tl-intakes-list">
        ${await this._intakesListHtml(medications, phases, actionsMap, selectedDateStr, protocolEvents)}
      </div>
    `;

    // Nav buttons
    screen.querySelector('.tl-prev').addEventListener('click', async () => {
      this._viewMonth--;
      if (this._viewMonth < 0) { this._viewMonth = 11; this._viewYear--; }
      await TimelineScreen.render(App.selectedDate);
    });
    screen.querySelector('.tl-next').addEventListener('click', async () => {
      this._viewMonth++;
      if (this._viewMonth > 11) { this._viewMonth = 0; this._viewYear++; }
      await TimelineScreen.render(App.selectedDate);
    });

    // Day click
    screen.querySelectorAll('.tl-day[data-date]').forEach(el => {
      el.addEventListener('click', async () => {
        const date = el.dataset.date;
        App.selectedDate = date;
        App.updateHeaderDate();
        // Re-render calendar (to move selection) + today screen
        await TimelineScreen.render(date);
        await TodayScreen.render(date);
      });
    });
  },

  _navHtml() {
    const monthName = new Date(this._viewYear, this._viewMonth, 1)
      .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return `
      <div class="tl-nav">
        <button class="tl-nav-btn tl-prev">‹</button>
        <div class="tl-month">${capitalize(monthName)}</div>
        <button class="tl-nav-btn tl-next">›</button>
      </div>
    `;
  },

  _gridHtml(selectedDateStr, datesWithIntakes) {
    const today = todayStr();
    const year = this._viewYear;
    const month = this._viewMonth;

    // Day headers (Mon → Sun)
    const dayHeaders = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']
      .map(d => `<div class="tl-day-label">${d}</div>`).join('');

    // First day of month (adjust: Mon=0)
    const firstDay = new Date(year, month, 1);
    let startDow = firstDay.getDay(); // 0=Sun
    startDow = (startDow + 6) % 7;   // Mon=0

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    let cells = '';

    // Prev month filler
    for (let i = 0; i < startDow; i++) {
      const day = daysInPrevMonth - startDow + 1 + i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      cells += `<div class="tl-day other-month" data-date="${dateStr}">${day}</div>`;
    }

    // This month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday = dateStr === today;
      const isSelected = dateStr === selectedDateStr;
      const hasIntakes = datesWithIntakes.has(dateStr);
      const classes = [
        'tl-day',
        isToday ? 'today' : '',
        isSelected ? 'selected' : '',
        hasIntakes ? 'has-intakes' : '',
      ].filter(Boolean).join(' ');

      cells += `<div class="${classes}" data-date="${dateStr}">${d}</div>`;
    }

    // Next month filler
    const totalCells = startDow + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
      cells += `<div class="tl-day other-month" data-date="${dateStr}">${i}</div>`;
    }

    return `
      <div class="tl-grid">
        ${dayHeaders}
        ${cells}
      </div>
    `;
  },

  async _intakesListHtml(medications, phases, actionsMap, dateStr, protocolEvents) {
    const events = Intakes.generateForDate(medications, phases, dateStr);
    const intakes = Intakes.mergeWithActions(events, actionsMap);

    if (intakes.length === 0) {
      return `<div class="empty-state"><div class="empty-icon">✨</div><p>Aucune prise ce jour.</p></div>`;
    }

    const dayEvents = protocolEvents.filter(e=>e.date===dateStr);
    return intakes.map(i => {
      const statusLabel = { taken: '✓ Pris', skipped: '⊘ Passé', snoozed: '⏱ Reporté', pending: '—' }[i.status] || '—';
      const statusColor = { taken: 'var(--sage)', skipped: 'var(--text-light)', snoozed: 'var(--peach)', pending: 'var(--border)' }[i.status];
      return `
        <div class="card card-sm" style="border-left: 4px solid ${statusColor}; margin-bottom:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-weight:600;color:var(--sage-dark);">${i.displayTime}</span>
            <span style="font-size:0.78rem;color:var(--text-soft);">${statusLabel}</span>
          </div>
          <div style="font-weight:600;margin-top:4px;">${escHtml(i.medName)}</div>
          <div style="font-size:0.82rem;color:var(--text-soft);">${escHtml(i.dosage)}${i.medType ? ' · ' + escHtml(i.medType) : ''}</div>
        </div>
      `;
    }).join('') + dayEvents.map(e=>`<div class="card card-sm" style="border-left:4px solid var(--peach);"><div><strong>${escHtml(e.time||'—:—')} — ${escHtml(e.title)}</strong></div><div style="font-size:.82rem;color:var(--text-soft);">${escHtml(e.type||'autre')} · ${e.completed?'terminé':'à faire'}</div></div>`).join('');
  },
};

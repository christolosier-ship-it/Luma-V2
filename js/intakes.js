/**
 * intakes.js — Intake event generation engine
 *
 * IntakeEvents are NOT stored. They are generated on-the-fly
 * from Phases, then enriched with persisted IntakeActions.
 *
 * Key format: "medId|phaseId|YYYY-MM-DD|HH:MM"
 */

const Intakes = {

  /**
   * Build the unique key for an intake
   */
  makeKey(medId, phaseId, dateStr, time) {
    return `${medId}|${phaseId}|${dateStr}|${time}`;
  },

  /**
   * Generate intake events for a given date, across all phases/medications.
   * Returns array of event objects (not yet merged with actions).
   */
  generateForDate(medications, phases, dateStr) {
    const events = [];
    for (const med of medications) {
      const medPhases = phases.filter(p => p.medicationId === med.id);
      for (const phase of medPhases) {
        if (!dateInRange(dateStr, phase.startDate, phase.endDate)) continue;
        const times = Array.isArray(phase.times) ? phase.times : [];
        for (const time of times) {
          events.push({
            key: Intakes.makeKey(med.id, phase.id, dateStr, time),
            medId: med.id,
            phaseId: phase.id,
            dateStr,
            time,
            medName: med.name,
            medType: med.type || '',
            dosage: phase.dosage || '',
            notes: phase.notes || '',
          });
        }
      }
    }
    // Sort by time
    events.sort((a, b) => a.time.localeCompare(b.time));
    return events;
  },

  /**
   * Merge events with persisted actions.
   * status: 'pending' | 'taken' | 'skipped' | 'snoozed'
   */
  mergeWithActions(events, actionsMap) {
    return events.map(ev => {
      const action = actionsMap[ev.key] || null;
      return {
        ...ev,
        status: action ? action.status : 'pending',
        displayTime: action && action.status === 'snoozed' ? action.snoozedTime : ev.time,
        takenAt: action ? action.takenAt : null,
      };
    });
  },

  /**
   * Build a map of { key → action } from an array of actions
   */
  buildActionsMap(actions) {
    const map = {};
    for (const a of actions) map[a.key] = a;
    return map;
  },

  /**
   * For calendar dot display: which dates in a given month have intakes?
   */
  getDatesWithIntakesInMonth(medications, phases, year, month) {
    const dates = new Set();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      for (const med of medications) {
        const medPhases = phases.filter(p => p.medicationId === med.id);
        for (const phase of medPhases) {
          if (!dateInRange(dateStr, phase.startDate, phase.endDate)) continue;
          if (phase.times && phase.times.length > 0) {
            dates.add(dateStr);
            break;
          }
        }
      }
    }
    return dates;
  },
};


Intakes.getVisualStatus = function(intake, dateStr) {
  if (intake.status !== 'pending') return intake.status;
  if (dateStr !== todayStr()) return 'pending';
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const [h, m] = intake.displayTime.split(':').map(Number);
  return (h * 60 + m) < nowMinutes ? 'late' : 'pending';
};

Intakes.sortForToday = function(intakes, dateStr) {
  const rank = (intake) => {
    const v = Intakes.getVisualStatus(intake, dateStr);
    if (v === 'late') return 0;
    if (intake.status === 'snoozed') return 1;
    if (intake.status === 'pending') return 2;
    if (intake.status === 'taken') return 3;
    return 4;
  };
  return [...intakes].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    return a.displayTime.localeCompare(b.displayTime);
  });
};

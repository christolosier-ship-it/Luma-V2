/**
 * utils.js — Shared utilities for Luma
 */

// ── ID generation ────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Date helpers ─────────────────────────────────────────────

/** Returns 'YYYY-MM-DD' for a Date object (local time) */
function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse 'YYYY-MM-DD' to local midnight Date */
function fromDateStr(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 'YYYY-MM-DD' of today */
function todayStr() {
  return toDateStr(new Date());
}

/** Human-readable French date */
function formatDateFR(dateStr) {
  const d = fromDateStr(dateStr);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Short date label */
function formatDateShortFR(dateStr) {
  const d = fromDateStr(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** Compare two 'YYYY-MM-DD' strings */
function dateCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** 'YYYY-MM-DD' is between start and end inclusive (strings) */
function dateInRange(date, start, end) {
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

/** Add minutes to 'HH:MM', returns 'HH:MM' */
function addMinutesToTime(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

// ── Toast ──────────────────────────────────────────────────────
let _toastTimer = null;
function showToast(msg, duration = 2200) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden', 'fade-out');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => el.classList.add('hidden'), 320);
  }, duration);
}

// ── Capitalize ────────────────────────────────────────────────
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isValidTimeHHMM(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ''));
}

function normalizeTimes(times) {
  const clean = (Array.isArray(times) ? times : [])
    .map(t => String(t || '').trim())
    .filter(isValidTimeHHMM);
  return [...new Set(clean)].sort();
}

/** Traduit un statut technique en libellé lisible en français. */
function statusLabelFR(status) {
  const labels = {
    taken: 'Pris',
    skipped: 'Passé',
    snoozed: 'Reporté',
    pending: 'En attente',
    late: 'En retard',
    completed: 'Terminé',
  };
  return labels[status] || String(status || 'Inconnu');
}

function getDefaultSymptoms() {
  return {
    nausea: 0,
    fatigue: 0,
    pain: 0,
    headache: 0,
    dizziness: 0,
    mood: 0,
    sleep: 0,
    bleeding: 0,
    other: 0,
  };
}

function hasFreeNote(note) {
  return Boolean((note?.freeNote || '').trim());
}

function hasPositiveSymptoms(symptomEntry) {
  return Object.values(symptomEntry?.symptoms || {}).some((v) => Number(v) > 0);
}

function symptomsToText(symptomEntry, onlyPositive = true) {
  if (!symptomEntry?.symptoms) return '';
  const labels = {
    nausea: 'Nausée',
    fatigue: 'Fatigue',
    pain: 'Douleur',
    headache: 'Maux de tête',
    dizziness: 'Vertiges',
    mood: 'Humeur',
    sleep: 'Sommeil',
    bleeding: 'Saignement',
    other: symptomEntry.otherSymptomLabel || 'Autre',
  };
  return Object.entries(labels)
    .filter(([key]) => !onlyPositive || Number(symptomEntry.symptoms[key] ?? 0) > 0)
    .map(([key, label]) => `${label} ${Number(symptomEntry.symptoms[key] ?? 0)}`)
    .join(' · ');
}


const PROTOCOL_EVENT_TYPES = [
  { value: 'appointment', label: 'Rendez-vous' },
  { value: 'exam', label: 'Examen' },
  { value: 'lab', label: 'Analyse / laboratoire' },
  { value: 'pharmacy', label: 'Pharmacie' },
  { value: 'injectionSpecial', label: 'Injection spéciale' },
  { value: 'custom', label: 'Autre' },
];

function eventTypeLabelFR(type) {
  const item = PROTOCOL_EVENT_TYPES.find((t) => t.value === type);
  return item ? item.label : 'Autre';
}

function isValidProtocolEventType(type) {
  return PROTOCOL_EVENT_TYPES.some((t) => t.value === type);
}

function protocolStatusLabelFR(status) {
  const labels = { active: 'Actif', paused: 'En pause', completed: 'Terminé', archived: 'Archivé' };
  return labels[status] || 'Actif';
}


function startOfWeekMonday(dateStr) {
  const d = dateStr ? fromDateStr(dateStr) : new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

function addDays(dateStr, days) {
  const d = fromDateStr(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

function weekDatesMonday(dateStr) {
  const start = startOfWeekMonday(dateStr);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function dosageModeLabel(mode) {
  return mode === 'variable' ? 'Dosage variable' : 'Traitement simple';
}

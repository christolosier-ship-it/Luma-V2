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

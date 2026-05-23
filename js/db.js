/**
 * db.js — IndexedDB wrapper for Luma
 * Stores: medications, phases, intakeActions
 * intakeEvents are generated on-the-fly from phases
 */

const DB_NAME = 'luma_db';
const DB_VERSION = 1;

const STORES = {
  MEDICATIONS: 'medications',
  PHASES: 'phases',
  INTAKE_ACTIONS: 'intakeActions',
};

let _db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) { resolve(_db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORES.MEDICATIONS)) {
        const ms = db.createObjectStore(STORES.MEDICATIONS, { keyPath: 'id' });
        ms.createIndex('name', 'name', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.PHASES)) {
        const ps = db.createObjectStore(STORES.PHASES, { keyPath: 'id' });
        ps.createIndex('medicationId', 'medicationId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.INTAKE_ACTIONS)) {
        // key: "medicationId|phaseId|date|time"
        db.createObjectStore(STORES.INTAKE_ACTIONS, { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(storeName, mode = 'readonly') {
  return _db.transaction(storeName, mode).objectStore(storeName);
}

function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getByIndex(storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName).index(indexName).getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function putItem(storeName, item) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName, 'readwrite').put(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteItem(storeName, key) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName, 'readwrite').delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function clearStore(storeName) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName, 'readwrite').clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Public API ──────────────────────────────────────────────

const DB = {

  async init() {
    await openDB();
  },

  // MEDICATIONS
  async getMedications() { return getAll(STORES.MEDICATIONS); },
  async saveMedication(med) { return putItem(STORES.MEDICATIONS, med); },
  async deleteMedication(id) { return deleteItem(STORES.MEDICATIONS, id); },

  // PHASES
  async getPhases() { return getAll(STORES.PHASES); },
  async getPhasesByMedication(medId) { return getByIndex(STORES.PHASES, 'medicationId', medId); },
  async savePhase(phase) { return putItem(STORES.PHASES, phase); },
  async deletePhase(id) { return deleteItem(STORES.PHASES, id); },
  async deletePhasesByMedication(medId) {
    const phases = await DB.getPhasesByMedication(medId);
    for (const p of phases) await deleteItem(STORES.PHASES, p.id);
  },

  // INTAKE ACTIONS
  // key format: "medId|phaseId|YYYY-MM-DD|HH:MM"
  async getIntakeAction(key) {
    return new Promise((resolve, reject) => {
      const req = tx(STORES.INTAKE_ACTIONS).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },
  async getAllIntakeActions() { return getAll(STORES.INTAKE_ACTIONS); },
  async saveIntakeAction(action) { return putItem(STORES.INTAKE_ACTIONS, action); },
  async deleteIntakeAction(key) { return deleteItem(STORES.INTAKE_ACTIONS, key); },

  // EXPORT / IMPORT / RESET
  async exportAll() {
    const [medications, phases, intakeActions] = await Promise.all([
      DB.getMedications(),
      DB.getPhases(),
      DB.getAllIntakeActions(),
    ]);
    return { app: 'Luma', version: '2.1', exportedAt: new Date().toISOString(), medications, phases, intakeActions };
  },

  validateImportData(data) {
    if (!data || typeof data !== 'object') return { ok: false, error: 'Fichier JSON invalide' };
    const medications = data.medications || [];
    const phases = data.phases || [];
    const intakeActions = data.intakeActions || [];
    if (!Array.isArray(medications) || !Array.isArray(phases) || !Array.isArray(intakeActions)) return { ok: false, error: 'Structure JSON invalide' };
    const medIds = new Set();
    for (const m of medications) { if (!m || !m.id || !m.name) return { ok: false, error: 'Médicament incomplet' }; medIds.add(m.id); }
    for (const p of phases) {
      if (!p || !p.id || !p.medicationId || !p.startDate) return { ok: false, error: 'Phase incomplète' };
      if (!medIds.has(p.medicationId)) return { ok: false, error: 'Phase liée à un médicament inexistant' };
      if (p.endDate && p.endDate < p.startDate) return { ok: false, error: 'Date de phase invalide' };
      if (!Array.isArray(p.times) || p.times.some(t => !isValidTimeHHMM(t))) return { ok: false, error: 'Heures de phase invalides' };
    }
    return { ok: true };
  },

  async importAll(data) {
    const backup = await DB.exportAll();
    const validation = DB.validateImportData(data);
    if (!validation.ok) throw new Error(validation.error);
    try {
      await clearStore(STORES.MEDICATIONS); await clearStore(STORES.PHASES); await clearStore(STORES.INTAKE_ACTIONS);
      for (const m of (data.medications || [])) await putItem(STORES.MEDICATIONS, m);
      for (const p of (data.phases || [])) await putItem(STORES.PHASES, p);
      for (const a of (data.intakeActions || [])) await putItem(STORES.INTAKE_ACTIONS, a);
    } catch (err) {
      console.error('Import transaction failed, restoring backup', err);
      await clearStore(STORES.MEDICATIONS); await clearStore(STORES.PHASES); await clearStore(STORES.INTAKE_ACTIONS);
      for (const m of backup.medications || []) await putItem(STORES.MEDICATIONS, m);
      for (const p of backup.phases || []) await putItem(STORES.PHASES, p);
      for (const a of backup.intakeActions || []) await putItem(STORES.INTAKE_ACTIONS, a);
      throw err;
    }
  },

  async resetAll() {
    await clearStore(STORES.MEDICATIONS);
    await clearStore(STORES.PHASES);
    await clearStore(STORES.INTAKE_ACTIONS);
  },
};

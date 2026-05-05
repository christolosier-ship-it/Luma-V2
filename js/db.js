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
    return { medications, phases, intakeActions, exportedAt: new Date().toISOString(), version: 1 };
  },

  async importAll(data) {
    await clearStore(STORES.MEDICATIONS);
    await clearStore(STORES.PHASES);
    await clearStore(STORES.INTAKE_ACTIONS);
    for (const m of (data.medications || [])) await putItem(STORES.MEDICATIONS, m);
    for (const p of (data.phases || [])) await putItem(STORES.PHASES, p);
    for (const a of (data.intakeActions || [])) await putItem(STORES.INTAKE_ACTIONS, a);
  },

  async resetAll() {
    await clearStore(STORES.MEDICATIONS);
    await clearStore(STORES.PHASES);
    await clearStore(STORES.INTAKE_ACTIONS);
  },
};

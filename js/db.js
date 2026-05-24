const DB_NAME = 'luma_db';
const DB_VERSION = 6;

const STORES = {
  PROTOCOLS: 'protocols',
  MEDICATIONS: 'medications',
  PHASES: 'phases',
  INTAKE_ACTIONS: 'intakeActions',
  INTAKE_EVENTS: 'intakeEvents',
  DAILY_NOTES: 'dailyNotes',
  PROTOCOL_EVENTS: 'protocolEvents',
};

let _db = null;
const DEFAULT_PROTOCOL_NAME = 'Traitement principal';

const VALID_PROTOCOL_STATUS = new Set(['active','paused','completed','archived']);
const VALID_ACTION_STATUS = new Set(['taken','skipped','snoozed']);
const VALID_INTAKE_EVENT_TYPE = new Set(['taken','skipped','snoozed','undo','missed','edited','noteAdded']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const IMPORT_LIMITS = { protocols:100, medications:500, phases:2000, intakeActions:50000, intakeEvents:100000, dailyNotes:5000, protocolEvents:5000 };


function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);
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
        db.createObjectStore(STORES.INTAKE_ACTIONS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.PROTOCOLS)) {
        const s = db.createObjectStore(STORES.PROTOCOLS, { keyPath: 'id' });
        s.createIndex('status', 'status', { unique: false });
        s.createIndex('startDate', 'startDate', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.INTAKE_EVENTS)) {
        const s = db.createObjectStore(STORES.INTAKE_EVENTS, { keyPath: 'id' });
        s.createIndex('intakeKey', 'intakeKey', { unique: false });
        s.createIndex('medicationId', 'medicationId', { unique: false });
        s.createIndex('protocolId', 'protocolId', { unique: false });
        s.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.DAILY_NOTES)) {
        const s = db.createObjectStore(STORES.DAILY_NOTES, { keyPath: 'id' });
        s.createIndex('date', 'date', { unique: false });
        s.createIndex('protocolId', 'protocolId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.PROTOCOL_EVENTS)) {
        const s = db.createObjectStore(STORES.PROTOCOL_EVENTS, { keyPath: 'id' });
        s.createIndex('protocolId', 'protocolId', { unique: false });
        s.createIndex('date', 'date', { unique: false });
        s.createIndex('completed', 'completed', { unique: false });
      }
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}
function tx(storeName, mode = 'readonly') { return _db.transaction(storeName, mode).objectStore(storeName); }
function getAll(storeName) { return new Promise((resolve,reject)=>{ const r=tx(storeName).getAll(); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);}); }
function putItem(storeName, item) { return new Promise((resolve,reject)=>{ const r=tx(storeName,'readwrite').put(item); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);}); }
function deleteItem(storeName,key){ return new Promise((resolve,reject)=>{ const r=tx(storeName,'readwrite').delete(key); r.onsuccess=()=>resolve(); r.onerror=()=>reject(r.error);}); }
function clearStore(storeName){ return new Promise((resolve,reject)=>{ const r=tx(storeName,'readwrite').clear(); r.onsuccess=()=>resolve(); r.onerror=()=>reject(r.error);}); }

async function ensureDefaultProtocolAndLinks() {
  const [protocols, meds, phases] = await Promise.all([getAll(STORES.PROTOCOLS), getAll(STORES.MEDICATIONS), getAll(STORES.PHASES)]);
  const nowIso = new Date().toISOString();
  let defaultProtocol = protocols.find((p) => p.isDefault) || protocols[0] || null;
  const medsNeed = meds.some((m) => !m.protocolId);
  const phasesNeed = phases.some((p) => !p.protocolId);
  if (!defaultProtocol) {
    defaultProtocol = { id: uid(), name: DEFAULT_PROTOCOL_NAME, type: 'free', startDate: todayStr(), status: 'active', notes: '', isDefault: true, createdAt: nowIso, updatedAt: nowIso };
    await putItem(STORES.PROTOCOLS, defaultProtocol);
  }
  if (medsNeed || phasesNeed) {
    if (!defaultProtocol) {
      const startDate = phases.map((p) => p.startDate).filter(Boolean).sort()[0] || todayStr();
      defaultProtocol = { id: uid(), name: DEFAULT_PROTOCOL_NAME, type: 'free', startDate, status: 'active', notes: '', isDefault: true, createdAt: nowIso, updatedAt: nowIso };
      await putItem(STORES.PROTOCOLS, defaultProtocol);
    }
    for (const med of meds) if (!med.protocolId) await putItem(STORES.MEDICATIONS, { ...med, protocolId: defaultProtocol.id });
    for (const phase of phases) if (!phase.protocolId) await putItem(STORES.PHASES, { ...phase, protocolId: defaultProtocol.id });
  }
}

const DB = {
  async init() { await openDB(); await ensureDefaultProtocolAndLinks(); },
  async getProtocols() { return getAll(STORES.PROTOCOLS); },
  async saveProtocol(p) { return putItem(STORES.PROTOCOLS, p); },
  async deleteProtocol(id){ return deleteItem(STORES.PROTOCOLS,id); },
  async getMedications() { return getAll(STORES.MEDICATIONS); },
  async saveMedication(med) { return putItem(STORES.MEDICATIONS, med); },
  async deleteMedication(id) { return deleteItem(STORES.MEDICATIONS, id); },
  async getPhases() { return getAll(STORES.PHASES); },
  async savePhase(phase) { return putItem(STORES.PHASES, phase); },
  async deletePhasesByMedication(medId) { for (const p of await getAll(STORES.PHASES)) if (p.medicationId === medId) await deleteItem(STORES.PHASES,p.id); },
  async getAllIntakeActions() { return getAll(STORES.INTAKE_ACTIONS); },
  async getIntakeAction(key){return new Promise((resolve,reject)=>{const r=tx(STORES.INTAKE_ACTIONS).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});},
  async saveIntakeAction(a){ return putItem(STORES.INTAKE_ACTIONS,a); },
  async deleteIntakeAction(key){ return deleteItem(STORES.INTAKE_ACTIONS,key); },
  async saveIntakeEvent(e){ return putItem(STORES.INTAKE_EVENTS,e); },
  async getIntakeEvents(){ return getAll(STORES.INTAKE_EVENTS); },
  async getDailyNotes(){ return getAll(STORES.DAILY_NOTES); },
  async saveDailyNote(n){ return putItem(STORES.DAILY_NOTES,n); },
  async getProtocolEvents(){ return getAll(STORES.PROTOCOL_EVENTS); },
  async saveProtocolEvent(ev){ return putItem(STORES.PROTOCOL_EVENTS,ev); },
  async deleteProtocolEvent(id){ return deleteItem(STORES.PROTOCOL_EVENTS,id); },
  async toggleProtocolEventCompleted(id){ const all=await getAll(STORES.PROTOCOL_EVENTS); const ev=all.find(e=>e.id===id); if(!ev) return; ev.completed=!ev.completed; ev.updatedAt=new Date().toISOString(); await putItem(STORES.PROTOCOL_EVENTS,ev); },

  async exportAll() {
    const [protocols, medications, phases, intakeActions, intakeEvents, dailyNotes, protocolEvents] = await Promise.all([
      getAll(STORES.PROTOCOLS),getAll(STORES.MEDICATIONS),getAll(STORES.PHASES),getAll(STORES.INTAKE_ACTIONS),getAll(STORES.INTAKE_EVENTS),getAll(STORES.DAILY_NOTES),getAll(STORES.PROTOCOL_EVENTS)
    ]);
    return { app:'Luma', version:'3.4', exportedAt:new Date().toISOString(), protocols, medications, phases, intakeActions, intakeEvents, dailyNotes, protocolEvents, settings:{} };
  },
  validateImportData(data){
    if (!data || typeof data !== 'object') return {ok:false,error:'Fichier JSON invalide'};
    const version = String(data.version || '2.0');
    const meds = data.medications || []; const phases = data.phases || []; const actions = data.intakeActions || [];
    if (![meds,phases,actions].every(Array.isArray)) return {ok:false,error:'Structure JSON invalide'};
    const protocols = Array.isArray(data.protocols) ? data.protocols : [];
    const isLegacy = !Array.isArray(data.protocols) || data.protocols.length === 0;
    for (const [k,max] of Object.entries(IMPORT_LIMITS)) {
      if (data[k] != null && !Array.isArray(data[k])) return {ok:false,error:`${k} doit être un tableau`};
      if (Array.isArray(data[k]) && data[k].length > max) return {ok:false,error:`Volume ${k} trop élevé`};
    }
    const protocolIds = new Set(protocols.map(p=>p.id));
    const medIds = new Set(meds.map(m=>m.id));
    for (const m of meds) { if (!m.id || !m.name) return {ok:false,error:'Médicament incomplet'}; if (m.protocolId && !protocolIds.has(m.protocolId) && protocols.length) return {ok:false,error:'Médicament lié à un protocole inexistant'}; }
    for (const p of phases) {
      if (!p.id || !p.medicationId || !p.startDate) return {ok:false,error:'Phase incomplète'};
      if (!medIds.has(p.medicationId)) return {ok:false,error:'Phase liée à un médicament inexistant'};
      if (!Array.isArray(p.times) || p.times.some(t=>!isValidTimeHHMM(t))) return {ok:false,error:'Heures de phase invalides'};
    }
    for (const pr of protocols){ if(!VALID_PROTOCOL_STATUS.has(pr.status||'active')) return {ok:false,error:'Statut protocole invalide'}; if(pr.startDate && !DATE_RE.test(pr.startDate)) return {ok:false,error:'Date protocole invalide'}; }
    for (const a of actions){ if(!VALID_ACTION_STATUS.has(a.status)) return {ok:false,error:'Statut action invalide'}; if(a.date && !DATE_RE.test(a.date)) return {ok:false,error:'Date action invalide'}; if(a.time && !isValidTimeHHMM(a.time)) return {ok:false,error:'Heure action invalide'}; }
    if (!isLegacy) {
      for (const m of meds) { if (!m.protocolId || !protocolIds.has(m.protocolId)) return {ok:false,error:'medication.protocolId invalide'}; }
      for (const p of phases) { if (!p.protocolId || !protocolIds.has(p.protocolId)) return {ok:false,error:'phase.protocolId invalide'}; }
    }
    for (const n of (data.dailyNotes||[])) { if(!n.date||!DATE_RE.test(n.date)) return {ok:false,error:'dailyNotes.date invalide'}; const s=n.symptoms||{}; for(const k of ['nausea','fatigue','pain','headache','dizziness','mood','sleep','bleeding','other']){const v=Number(s[k]??0); if(v<0||v>3) return {ok:false,error:'Symptôme hors plage 0-3'};} }
    for (const e of (data.intakeEvents||[])) { if(!e.type || !VALID_INTAKE_EVENT_TYPE.has(e.type)) return {ok:false,error:'Type intakeEvent invalide'}; }
    if (version.startsWith('3')) {
      for (const ev of (data.protocolEvents || [])) if (!ev.protocolId || !protocolIds.has(ev.protocolId)) return {ok:false,error:'Événement protocole invalide'};
    }
    return {ok:true, version};
  },
  async importAll(data){
    const backup = await DB.exportAll();
    const v = DB.validateImportData(data); if (!v.ok) throw new Error(v.error);
    const incoming = structuredClone(data);
    if (!Array.isArray(incoming.protocols) || incoming.protocols.length === 0) {
      const defaultProtocol = { id: uid(), name: DEFAULT_PROTOCOL_NAME, type:'free', startDate: incoming.phases?.map(p=>p.startDate).filter(Boolean).sort()[0] || todayStr(), status:'active', notes:'', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), isDefault:true };
      incoming.protocols = [defaultProtocol];
      incoming.medications = (incoming.medications||[]).map(m=>({...m, protocolId:m.protocolId || defaultProtocol.id}));
      incoming.phases = (incoming.phases||[]).map(p=>({...p, protocolId:p.protocolId || defaultProtocol.id}));
    }
    const notesByDate = new Map();
    for (const note of (incoming.dailyNotes || [])) {
      const date = note.date || note.id;
      if (!date) continue;
      const curr = notesByDate.get(date);
      const symptoms = note.symptoms || {};
      if (!curr) notesByDate.set(date, { id: date, date, symptoms: { nausea:0,fatigue:0,pain:0,headache:0,dizziness:0,mood:0,sleep:0,bleeding:0,other:0, ...symptoms }, otherSymptomLabel: note.otherSymptomLabel || '', freeNote: note.freeNote || '', createdAt: note.createdAt || new Date().toISOString(), updatedAt: note.updatedAt || new Date().toISOString() });
      else {
        for (const k of ['nausea','fatigue','pain','headache','dizziness','mood','sleep','bleeding','other']) curr.symptoms[k] = Math.max(Number(curr.symptoms[k]||0), Number(symptoms[k]||0));
        if (note.freeNote) curr.freeNote = curr.freeNote ? `${curr.freeNote}\n---\n${note.freeNote}` : note.freeNote;
        curr.createdAt = [curr.createdAt, note.createdAt].filter(Boolean).sort()[0] || curr.createdAt;
        curr.updatedAt = [curr.updatedAt, note.updatedAt].filter(Boolean).sort().slice(-1)[0] || curr.updatedAt;
      }
    }
    incoming.dailyNotes = [...notesByDate.values()];
    try {
      for (const s of Object.values(STORES)) await clearStore(s);
      for (const p of incoming.protocols || []) await putItem(STORES.PROTOCOLS,p);
      for (const m of incoming.medications || []) await putItem(STORES.MEDICATIONS,m);
      for (const p of incoming.phases || []) await putItem(STORES.PHASES,p);
      for (const a of incoming.intakeActions || []) await putItem(STORES.INTAKE_ACTIONS,a);
      for (const e of incoming.intakeEvents || []) await putItem(STORES.INTAKE_EVENTS,e);
      for (const n of incoming.dailyNotes || []) await putItem(STORES.DAILY_NOTES,n);
      for (const e of incoming.protocolEvents || []) await putItem(STORES.PROTOCOL_EVENTS,e);
    } catch (err) {
      console.error('Import failed, restore backup', err);
      for (const s of Object.values(STORES)) await clearStore(s);
      for (const p of backup.protocols || []) await putItem(STORES.PROTOCOLS,p);
      for (const m of backup.medications || []) await putItem(STORES.MEDICATIONS,m);
      for (const p of backup.phases || []) await putItem(STORES.PHASES,p);
      for (const a of backup.intakeActions || []) await putItem(STORES.INTAKE_ACTIONS,a);
      for (const e of backup.intakeEvents || []) await putItem(STORES.INTAKE_EVENTS,e);
      for (const n of backup.dailyNotes || []) await putItem(STORES.DAILY_NOTES,n);
      for (const e of backup.protocolEvents || []) await putItem(STORES.PROTOCOL_EVENTS,e);
      throw err;
    }
  },
  async resetAll(){ for (const s of Object.values(STORES)) await clearStore(s); },
};

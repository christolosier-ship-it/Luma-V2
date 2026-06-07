const LumaNotifications = {
  storageKeys: {
    enabled: 'luma.notifications.enabled',
    delivered: 'luma.notifications.delivered.v1'
  },
  timers: new Map(),
  tickTimer: null,
  inFlight: new Set(),
  toleranceMs: 60000,
  tickMs: 30000,

  async init() {
    this.pruneDelivered();
    if (!this.isEnabled()) {
      this.clearTimers();
      return;
    }
    if (!this.isSupported() || Notification.permission !== 'granted') {
      this.clearTimers();
      return;
    }
    await this.scheduleAll();
  },

  isSupported() {
    return typeof window !== 'undefined'
      && 'Notification' in window
      && (('serviceWorker' in navigator) || typeof window.Notification === 'function');
  },

  isEnabled() {
    return localStorage.getItem(this.storageKeys.enabled) === 'true';
  },

  async setEnabled(enabled) {
    if (!enabled) {
      localStorage.setItem(this.storageKeys.enabled, 'false');
      this.clearTimers();
      return false;
    }
    if (!this.isSupported()) return false;
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      localStorage.setItem(this.storageKeys.enabled, 'false');
      this.clearTimers();
      return false;
    }
    localStorage.setItem(this.storageKeys.enabled, 'true');
    await this.scheduleAll();
    return true;
  },

  async requestPermission() {
    if (!this.isSupported()) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return Notification.requestPermission();
  },

  async scheduleAll() {
    this.clearTimers();
    this.pruneDelivered();
    if (!this.isEnabled() || !this.isSupported() || Notification.permission !== 'granted') return [];
    const jobs = await this.buildNotificationJobs();
    jobs.forEach((job) => this.scheduleJob(job));
    this.tickTimer = window.setInterval(() => this._scanDueJobs(), this.tickMs);
    return jobs;
  },

  clearTimers() {
    for (const entry of this.timers.values()) {
      window.clearTimeout(entry.timeoutId);
    }
    this.timers.clear();
    if (this.tickTimer) window.clearInterval(this.tickTimer);
    this.tickTimer = null;
  },

  async buildNotificationJobs() {
    const dateStr = todayStr();
    const now = Date.now();
    const [protocols, medications, phases, dosageOverrides, intakeActions, protocolEvents] = await Promise.all([
      DB.getProtocols(),
      DB.getMedications(),
      DB.getPhases(),
      DB.getDosageOverrides(),
      DB.getAllIntakeActions(),
      DB.getProtocolEvents(),
    ]);
    const activeProtocolIds = new Set(protocols.filter((p) => p.status === 'active').map((p) => p.id));
    const filteredMeds = medications.filter((m) => activeProtocolIds.has(m.protocolId));
    const filteredPhases = phases.filter((p) => activeProtocolIds.has(p.protocolId));
    const actionsMap = Intakes.buildActionsMap(intakeActions);
    const intakes = Intakes.mergeWithActions(Intakes.generateForDate(filteredMeds, filteredPhases, dateStr, dosageOverrides), actionsMap);
    const jobs = [];

    for (const intake of intakes) {
      if (intake.dateStr !== dateStr) continue;
      if (!isValidTimeHHMM(intake.time)) continue;
      if (intake.status !== 'pending') continue;
      const triggerAt = plannedDateTime(dateStr, intake.time);
      if (!triggerAt || triggerAt.getTime() <= now) continue;
      const id = `intake|${intake.key}|${dateStr}|${intake.time}`;
      if (this.hasDelivered(id)) continue;
      jobs.push({
        id,
        kind: 'intake',
        intakeKey: intake.key,
        triggerAt,
        dateStr,
        time: intake.time,
        title: 'Luma',
        body: 'Une prise est prévue maintenant.'
      });
    }

    for (const event of protocolEvents) {
      if (event.date !== dateStr) continue;
      if (!activeProtocolIds.has(event.protocolId)) continue;
      if (!isValidTimeHHMM(event.time)) continue;
      if (event.completed === true) continue;
      const eventAt = plannedDateTime(event.date, event.time);
      if (!eventAt) continue;
      const triggerAt = new Date(eventAt.getTime() - 15 * 60000);
      if (toDateStr(triggerAt) !== dateStr) continue;
      if (triggerAt.getTime() <= now) continue;
      const id = `event|${event.id}|${event.date}|${event.time}|minus15`;
      if (this.hasDelivered(id)) continue;
      jobs.push({
        id,
        kind: 'event',
        eventId: event.id,
        triggerAt,
        dateStr: event.date,
        time: event.time,
        title: 'Luma',
        body: 'Un événement est prévu dans 15 minutes.'
      });
    }

    return jobs.sort((a, b) => a.triggerAt.getTime() - b.triggerAt.getTime());
  },

  scheduleJob(job) {
    if (!job || this.hasDelivered(job.id) || this.timers.has(job.id)) return;
    const delay = job.triggerAt.getTime() - Date.now();
    if (delay <= 0) return;
    const timeoutId = window.setTimeout(() => this.fireJob(job), delay);
    this.timers.set(job.id, { timeoutId, job });
  },

  async fireJob(job) {
    const entry = this.timers.get(job.id);
    if (entry) {
      window.clearTimeout(entry.timeoutId);
      this.timers.delete(job.id);
    }
    if (!this.isEnabled() || !this.isSupported() || Notification.permission !== 'granted') return;
    if (this.hasDelivered(job.id) || this.inFlight.has(job.id)) return;
    const age = Date.now() - job.triggerAt.getTime();
    if (age < 0 || age > this.toleranceMs) return;
    this.inFlight.add(job.id);
    try {
      const stillValid = await this._isJobStillValid(job);
      if (!stillValid || this.hasDelivered(job.id)) return;
      await this._showNotification(job);
      this.markDelivered(job.id);
    } catch (err) {
      console.error('Notification locale impossible', err);
    } finally {
      this.inFlight.delete(job.id);
    }
  },

  hasDelivered(jobId) {
    const delivered = this._readDelivered();
    return Object.prototype.hasOwnProperty.call(delivered, jobId);
  },

  markDelivered(jobId) {
    const delivered = this._readDelivered();
    delivered[jobId] = new Date().toISOString();
    localStorage.setItem(this.storageKeys.delivered, JSON.stringify(delivered));
  },

  pruneDelivered() {
    const delivered = this._readDelivered();
    const cutoff = Date.now() - 14 * 24 * 60 * 60000;
    let changed = false;
    for (const [id, iso] of Object.entries(delivered)) {
      const t = new Date(iso).getTime();
      if (!Number.isFinite(t) || t < cutoff) {
        delete delivered[id];
        changed = true;
      }
    }
    if (changed) localStorage.setItem(this.storageKeys.delivered, JSON.stringify(delivered));
  },

  async sendTestNotification() {
    if (!this.isSupported()) throw new Error('Notifications non compatibles');
    if (Notification.permission !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') throw new Error('Permission refusée dans le navigateur');
    }
    const id = `test|${Date.now()}`;
    await this._showNotification({
      id,
      kind: 'test',
      dateStr: todayStr(),
      title: 'Luma',
      body: 'Notification locale de test.'
    });
  },

  async refreshAfterDataChange() {
    if (!this.isEnabled()) return;
    await this.scheduleAll();
  },

  async _scanDueJobs() {
    if (!this.isEnabled()) return;
    const now = Date.now();
    const due = [];
    for (const { job } of this.timers.values()) {
      const diff = now - job.triggerAt.getTime();
      if (diff >= 0 && diff <= this.toleranceMs) due.push(job);
    }
    for (const job of due) await this.fireJob(job);
  },

  async _isJobStillValid(job) {
    if (job.kind === 'intake') {
      const action = await DB.getIntakeAction(job.intakeKey);
      return !action || action.status === 'pending';
    }
    if (job.kind === 'event') {
      const events = await DB.getProtocolEvents();
      const event = events.find((ev) => ev.id === job.eventId);
      return !!event && event.completed !== true && event.date === job.dateStr && event.time === job.time;
    }
    return true;
  },

  async _showNotification(job) {
    const options = {
      body: job.body,
      icon: './icons/icone_192x192.png',
      badge: './icons/icone_192x192.png',
      tag: job.id,
      renotify: false,
      requireInteraction: false,
      data: {
        url: './index.html',
        jobId: job.id,
        kind: job.kind,
        dateStr: job.dateStr
      }
    };
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration?.showNotification) {
        await registration.showNotification(job.title, options);
        return;
      }
    }
    new Notification(job.title, options);
  },

  _readDelivered() {
    try {
      const value = JSON.parse(localStorage.getItem(this.storageKeys.delivered) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (_) {
      return {};
    }
  }
};

window.LumaNotifications = LumaNotifications;

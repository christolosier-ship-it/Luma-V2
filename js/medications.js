/**
 * medications.js — Medications list + add/edit/delete
 */

const MedicationsScreen = {

  async render() {
    const screen = document.getElementById('screen-medications');
    const [medications, phases, protocols] = await Promise.all([DB.getMedications(),DB.getPhases(),DB.getProtocols()]);

    const listHtml = medications.length === 0
      ? `<div class="empty-state"><div class="empty-icon">💊</div><p>Aucun traitement.<br>Ajoutez votre premier médicament.</p></div>`
      : medications.map(med => {
          const medPhases = phases.filter(p => p.medicationId === med.id)
            .sort((a, b) => a.startDate.localeCompare(b.startDate));
          return MedicationsScreen._medCard(med, medPhases);
        }).join('');

    screen.innerHTML = `
      <div class="section-title">Traitements</div>
      ${MedicationsScreen._protocolsSection(protocols, medications)}
      <div class="section-subtitle">${medications.length} médicament${medications.length !== 1 ? 's' : ''} configuré${medications.length !== 1 ? 's' : ''}</div>
      <div class="med-list">${listHtml}</div>
      <button class="fab" id="btn-add-med">＋</button>
    `;

    // Bind FAB
    screen.querySelector('#btn-add-med').addEventListener('click', () => {
      MedicationsScreen.openForm(null, null, protocols);
    });

    // Bind edit / delete buttons
    screen.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const medId = btn.dataset.medId;
        const med = medications.find(m => m.id === medId);
        const medPhases = phases.filter(p => p.medicationId === medId);
        MedicationsScreen.openForm(med, medPhases, protocols);
      });
    });

    screen.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const medId = btn.dataset.medId;
        const med = medications.find(m => m.id === medId);
        MedicationsScreen.confirmDelete(med);
      });
    });

    screen.querySelector('#btn-add-protocol')?.addEventListener('click',()=>MedicationsScreen.openProtocolForm());
    screen.querySelectorAll('.btn-protocol-action').forEach(btn=>btn.addEventListener('click',async()=>{
      const p=protocols.find(x=>x.id===btn.dataset.protocolId); if(!p) return;
      await MedicationsScreen.handleProtocolAction(p, btn.dataset.action);
    }));
  },

  _medCard(med, phases) {
    const phasesHtml = phases.length === 0
      ? '<div class="med-phase" style="color:var(--text-light);">Aucune phase définie</div>'
      : phases.map(p => {
          const startFR = formatDateShortFR(p.startDate);
          const endFR = p.endDate ? formatDateShortFR(p.endDate) : '∞';
          const times = (p.times || []).join(', ') || '—';
          return `
            <div class="med-phase">
              <div class="med-phase-dates">${startFR} → ${endFR}</div>
              <div class="med-phase-detail">${escHtml(p.dosage || "—")} · ${escHtml(times)}</div>
              ${p.notes ? `<div class="med-phase-detail" style="font-style:italic;">${escHtml(p.notes)}</div>` : ''}
            </div>
          `;
        }).join('');

    return `
      <div class="med-card">
        <div class="med-card-header">
          <div class="med-info">
            <div class="med-name">${escHtml(med.name)}</div>
            <div class="med-type">${escHtml(med.type || "")} · ${phases.length} phase${phases.length !== 1 ? 's' : ''}</div>
          </div>
          <div class="med-actions-row">
            <button class="btn-icon btn-edit" data-med-id="${med.id}" title="Modifier">✎</button>
            <button class="btn-icon btn-delete" data-med-id="${med.id}" title="Supprimer">🗑</button>
          </div>
        </div>
        <div class="med-phases">${phasesHtml}</div>
      </div>
    `;
  },

  // ── FORM (add / edit) ────────────────────────────────────────

  openForm(med, existingPhases, protocols = []) {
    const isEdit = !!med;
    const phases = existingPhases ? existingPhases.map(p => ({ ...p })) : [];

    // Working copy
    const formData = {
      id: med ? med.id : uid(),
      name: med ? med.name : '',
      type: med ? (med.type || '') : '',
      protocolId: med?.protocolId || protocols[0]?.id || null,
      phases: phases.length > 0 ? phases : [MedicationsScreen._newPhase()],
    };

    const render = () => {
      const content = `
        <div class="modal-header">
          <span class="modal-title">${isEdit ? 'Modifier' : 'Nouveau médicament'}</span>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Nom du médicament *</label>
            <input class="form-input" id="f-med-name" type="text" placeholder="Ex: Progestérone" value="${escHtml(formData.name)}" />
          </div>
          <div class="form-group">
            <label class="form-label">Type / forme</label>
            <input class="form-input" id="f-med-type" type="text" placeholder="Ex: comprimé, injection, gel…" value="${escHtml(formData.type)}" />
          </div>
          <div class="form-group">
            <label class="form-label">Protocole</label>
            <select class="form-input" id="f-med-protocol">${protocols.map(p=>`<option value="${escHtml(p.id)}" ${formData.protocolId===p.id?'selected':''}>${escHtml(p.name)}</option>`).join('')}</select>
          </div>

          <div style="margin-bottom:10px;font-size:0.85rem;font-weight:500;color:var(--text-soft);">Phases de traitement</div>
          <div id="phases-container">
            ${formData.phases.map((p, i) => MedicationsScreen._phaseBlockHtml(p, i)).join('')}
          </div>
          <button class="btn-add-phase" id="btn-add-phase">＋ Ajouter une phase</button>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="modal-cancel-btn">Annuler</button>
          <button class="btn-primary" id="modal-save-btn">${isEdit ? 'Enregistrer' : 'Créer'}</button>
        </div>
      `;
      Modal.show(content);
      MedicationsScreen._bindFormEvents(formData, render, isEdit);
    };

    render();
  },

  _phaseBlockHtml(phase, index) {
    const times = phase.times || [];
    const timesHtml = times.map(t => `
      <div class="time-chip" data-time="${t}">
        ${t}
        <button class="time-chip-remove" data-remove-time="${t}">✕</button>
      </div>
    `).join('');

    return `
      <div class="phase-block" data-phase-id="${phase.id}">
        <div class="phase-block-header">
          <span class="phase-block-title">Phase ${index + 1}</span>
          <button class="btn-remove-phase" data-remove-phase="${phase.id}" title="Supprimer phase">✕</button>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Début *</label>
            <input class="form-input phase-start" type="date" value="${phase.startDate || ''}" data-phase-id="${phase.id}" />
          </div>
          <div class="form-group">
            <label class="form-label">Fin</label>
            <input class="form-input phase-end" type="date" value="${phase.endDate || ''}" data-phase-id="${phase.id}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Dosage</label>
          <input class="form-input phase-dosage" type="text" placeholder="Ex: 200mg" value="${escHtml(phase.dosage || '')}" data-phase-id="${phase.id}" />
        </div>
        <div class="form-group">
          <label class="form-label">Heures de prise</label>
          <div class="times-row" id="times-row-${phase.id}">
            ${timesHtml}
            <div style="display:flex;gap:6px;align-items:center;">
              <input type="time" class="form-input" id="time-input-${phase.id}" style="width:110px;padding:6px 10px;" />
              <button class="btn-add-time" data-add-time-for="${phase.id}">＋</button>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <input class="form-input phase-notes" type="text" placeholder="Optionnel" value="${escHtml(phase.notes || '')}" data-phase-id="${phase.id}" />
        </div>
      </div>
    `;
  },

  _bindFormEvents(formData, rerender, isEdit) {
    // Close / cancel
    document.getElementById('modal-close-btn').addEventListener('click', () => Modal.hide());
    document.getElementById('modal-cancel-btn').addEventListener('click', () => Modal.hide());

    // Add phase
    document.getElementById('btn-add-phase').addEventListener('click', () => {
      MedicationsScreen._syncFormToData(formData);
      formData.phases.push(MedicationsScreen._newPhase());
      rerender();
    });

    // Remove phase
    document.querySelectorAll('.btn-remove-phase').forEach(btn => {
      btn.addEventListener('click', () => {
        const phaseId = btn.dataset.removePhase;
        MedicationsScreen._syncFormToData(formData);
        formData.phases = formData.phases.filter(p => p.id !== phaseId);
        if (formData.phases.length === 0) formData.phases.push(MedicationsScreen._newPhase());
        rerender();
      });
    });

    // Add time
    document.querySelectorAll('[data-add-time-for]').forEach(btn => {
      btn.addEventListener('click', () => {
        const phaseId = btn.dataset.addTimeFor;
        const timeInput = document.getElementById(`time-input-${phaseId}`);
        const timeVal = timeInput.value;
        if (!timeVal) { showToast('Entrez une heure valide'); return; }
        MedicationsScreen._syncFormToData(formData);
        const phase = formData.phases.find(p => p.id === phaseId);
        if (phase && !phase.times.includes(timeVal)) {
          phase.times.push(timeVal);
          phase.times.sort();
        }
        rerender();
      });
    });

    // Remove time
    document.querySelectorAll('.time-chip-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const time = btn.dataset.removeTime;
        const phaseBlock = btn.closest('.phase-block');
        const phaseId = phaseBlock.dataset.phaseId;
        MedicationsScreen._syncFormToData(formData);
        const phase = formData.phases.find(p => p.id === phaseId);
        if (phase) phase.times = phase.times.filter(t => t !== time);
        rerender();
      });
    });

    // Save
    document.getElementById('modal-save-btn').addEventListener('click', async () => {
      MedicationsScreen._syncFormToData(formData);

      const validationError = MedicationsScreen._validateForm(formData);
      if (validationError) { showToast(validationError); return; }

      const med = { id: formData.id, name: formData.name.trim(), type: formData.type.trim(), protocolId: formData.protocolId || null };
      try {
        await DB.saveMedication(med);
        if (isEdit) await DB.deletePhasesByMedication(med.id);
        for (const p of formData.phases) await DB.savePhase({ ...p, medicationId: med.id, protocolId: med.protocolId });
      } catch (err) {
        console.error('Medication save failed', err);
        showToast('Erreur de sauvegarde du traitement');
        return;
      }

      Modal.hide();
      showToast(isEdit ? '✓ Traitement mis à jour' : '✓ Traitement créé');
      await MedicationsScreen.render();
      // Also refresh today and calendar
      await TodayScreen.render();
      TimelineScreen._viewYear = null; // reset calendar view
      if (document.querySelector('#screen-timeline.active')) {
        await TimelineScreen.render();
      }
    });
  },



  _validateForm(formData) {
    if (!formData.name.trim()) return 'Le nom est obligatoire';
    if (!formData.phases.length) return 'Au moins une phase est obligatoire';
    const ranges = [];
    for (const p of formData.phases) {
      if (!p.startDate) return 'Chaque phase doit avoir une date de début';
      if (p.endDate && p.endDate < p.startDate) return 'La date de fin doit être après le début';
      p.times = normalizeTimes(p.times);
      if (!p.times.length) return 'Chaque phase doit avoir au moins une heure';
      if ((p.times || []).some(t => !isValidTimeHHMM(t))) return "Format d'heure invalide (HH:MM)";
      ranges.push([p.startDate, p.endDate || '9999-12-31']);
    }
    ranges.sort((a,b)=>a[0].localeCompare(b[0]));
    for (let i=1;i<ranges.length;i++) {
      if (ranges[i][0] <= ranges[i-1][1]) return 'Phases incompatibles: chevauchement détecté';
    }
    return null;
  },
  _syncFormToData(formData) {
    // Read top-level fields
    const nameEl = document.getElementById('f-med-name');
    const typeEl = document.getElementById('f-med-type');
    if (nameEl) formData.name = nameEl.value;
    if (typeEl) formData.type = typeEl.value;
    const protEl = document.getElementById('f-med-protocol'); if (protEl) formData.protocolId = protEl.value || null;

    // Read each phase
    document.querySelectorAll('.phase-block').forEach(block => {
      const phaseId = block.dataset.phaseId;
      const phase = formData.phases.find(p => p.id === phaseId);
      if (!phase) return;
      const startEl = block.querySelector('.phase-start');
      const endEl = block.querySelector('.phase-end');
      const dosageEl = block.querySelector('.phase-dosage');
      const notesEl = block.querySelector('.phase-notes');
      if (startEl) phase.startDate = startEl.value;
      if (endEl) phase.endDate = endEl.value || null;
      if (dosageEl) phase.dosage = dosageEl.value;
      if (notesEl) phase.notes = notesEl.value;
      // times are managed separately via chip add/remove
    });
  },

  _newPhase() {
    return {
      id: uid(),
      startDate: todayStr(),
      endDate: null,
      dosage: '',
      times: [],
      notes: '',
    };
  },


  _protocolsSection(protocols, medications){
    const cards = protocols.map(p=>{
      const count=medications.filter(m=>m.protocolId===p.id).length;
      return `<div class="card card-sm"><div style="display:flex;justify-content:space-between;align-items:center;"><div><strong>${escHtml(p.name)}</strong><div style="font-size:.8rem;color:var(--text-soft);">${escHtml(p.status||'active')} · ${escHtml(p.startDate||'—')} ${p.endDate?`→ ${escHtml(p.endDate)}`:''} · ${count} médicaments</div></div><div style="display:flex;gap:6px;flex-wrap:wrap;"><button class="btn-settings btn-protocol-action" data-action="edit" data-protocol-id="${escHtml(p.id)}">Modifier</button><button class="btn-settings btn-protocol-action" data-action="pause" data-protocol-id="${escHtml(p.id)}">Pause</button><button class="btn-settings btn-protocol-action" data-action="resume" data-protocol-id="${escHtml(p.id)}">Reprendre</button><button class="btn-settings btn-protocol-action" data-action="complete" data-protocol-id="${escHtml(p.id)}">Terminer</button><button class="btn-settings btn-protocol-action" data-action="archive" data-protocol-id="${escHtml(p.id)}">Archiver</button><button class="btn-settings btn-protocol-action" data-action="delete" data-protocol-id="${escHtml(p.id)}">Supprimer</button></div></div></div>`;
    }).join('');
    return `<div class="section-subtitle">Protocoles</div><div>${cards || '<div class="card card-sm">Aucun protocole</div>'}</div><button class="btn-settings" id="btn-add-protocol" style="margin-bottom:10px;">+ Protocole</button>`;
  },
  openProtocolForm(protocol=null){
    const now=todayStr();
    const c=`<div class="modal-header"><span class="modal-title">${protocol?'Modifier':'Nouveau protocole'}</span><button class="modal-close" id="modal-close-btn">✕</button></div><div class="modal-body"><div class="form-group"><label class="form-label">Nom</label><input id="p-name" class="form-input" value="${escHtml(protocol?.name||'')}"/></div><div class="form-group"><label class="form-label">Début</label><input id="p-start" type="date" class="form-input" value="${escHtml(protocol?.startDate||now)}"/></div><div class="form-group"><label class="form-label">Fin</label><input id="p-end" type="date" class="form-input" value="${escHtml(protocol?.endDate||'')}"/></div></div><div class="modal-footer"><button class="btn-secondary" id="p-cancel">Annuler</button><button class="btn-primary" id="p-save">Enregistrer</button></div>`;
    Modal.show(c);
    document.getElementById('modal-close-btn').onclick=()=>Modal.hide();
    document.getElementById('p-cancel').onclick=()=>Modal.hide();
    document.getElementById('p-save').onclick=async()=>{try{const name=document.getElementById('p-name').value.trim(); if(!name) return showToast('Nom obligatoire'); const startDate=document.getElementById('p-start').value; const endDate=document.getElementById('p-end').value||null; const data={...(protocol||{}),id:protocol?.id||uid(),name,startDate,endDate,status:protocol?.status||'active',updatedAt:new Date().toISOString(),createdAt:protocol?.createdAt||new Date().toISOString()}; await DB.saveProtocol(data); Modal.hide(); await MedicationsScreen.render(); showToast('Protocole enregistré');}catch(e){console.error(e);showToast('Erreur protocole');}};
  },
  async handleProtocolAction(protocol, action){
    try{
      if(action==='edit') return MedicationsScreen.openProtocolForm(protocol);
      if(action==='delete'){ if(!confirm('Supprimer ce protocole ?')) return; const meds=await DB.getMedications(); if(meds.some(m=>m.protocolId===protocol.id)) return showToast('Protocole utilisé par des médicaments'); await DB.deleteProtocol(protocol.id); showToast('Protocole supprimé'); return MedicationsScreen.render(); }
      const next = {...protocol, updatedAt:new Date().toISOString()};
      if(action==='pause') next.status='paused';
      if(action==='resume') next.status='active';
      if(action==='complete') next.status='completed';
      if(action==='archive') { if(!confirm('Archiver ce protocole ?')) return; next.status='archived'; }
      await DB.saveProtocol(next); showToast('Protocole mis à jour'); await MedicationsScreen.render(); await TodayScreen.render(); await TimelineScreen.render();
    }catch(err){console.error(err);showToast('Action protocole impossible');}
  },
  // ── DELETE ────────────────────────────────────────────────────

  confirmDelete(med) {
    const content = `
      <div class="modal-header">
        <span class="modal-title">Supprimer</span>
        <button class="modal-close" id="modal-close-btn">✕</button>
      </div>
      <div class="modal-body">
        <div class="confirm-box">
          <div class="confirm-icon">🗑️</div>
          <div class="confirm-title">Supprimer ${escHtml(med.name)} ?</div>
          <div class="confirm-text">Ce médicament sera supprimé des traitements actifs. L’historique déjà enregistré sera conservé dans le Journal.</div>
          <div class="confirm-actions">
            <button class="btn-confirm-cancel" id="del-cancel">Annuler</button>
            <button class="btn-confirm-danger" id="del-confirm">Supprimer</button>
          </div>
        </div>
      </div>
    `;
    Modal.show(content);

    document.getElementById('modal-close-btn').addEventListener('click', () => Modal.hide());
    document.getElementById('del-cancel').addEventListener('click', () => Modal.hide());
    document.getElementById('del-confirm').addEventListener('click', async () => {
      const protocols = await DB.getProtocols();
      const protocol = protocols.find(p => p.id === med.protocolId);
      const intakeEvents = await DB.getIntakeEvents();
      for (const ev of intakeEvents) {
        if (ev.medicationId !== med.id) continue;
        const payload = { ...(ev.payload || {}) };
        if (!payload.medNameSnapshot) payload.medNameSnapshot = med.name || 'médicament supprimé';
        if (!payload.dosageSnapshot) payload.dosageSnapshot = '';
        if (!payload.medTypeSnapshot) payload.medTypeSnapshot = med.type || '';
        if (!payload.protocolNameSnapshot) payload.protocolNameSnapshot = protocol?.name || '';
        await DB.saveIntakeEvent({ ...ev, payload });
      }
      await DB.deleteMedication(med.id);
      await DB.deletePhasesByMedication(med.id);
      // Also remove related intake actions
      const allActions = await DB.getAllIntakeActions();
      for (const a of allActions) {
        if (a.key.startsWith(med.id + '|')) {
          await DB.deleteIntakeAction(a.key);
        }
      }
      Modal.hide();
      showToast('Traitement supprimé');
      await MedicationsScreen.render();
      await TodayScreen.render();
    });
  },
};

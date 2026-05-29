/**
 * medications.js — Medications list + add/edit/delete
 */

const MedicationsScreen = {
  protocolFilter: "active",
  searchQuery: "",

  async render() {
    const screen = document.getElementById('screen-medications');
    const [medications, phases, protocols] = await Promise.all([DB.getMedications(),DB.getPhases(),DB.getProtocols()]);

    const listHtml = medications.length === 0
      ? `<div class="empty-state empty-state-welcome"><div class="empty-icon">👋</div><h3>Bienvenue dans Luma</h3><p>Créez un protocole, ajoutez un médicament ou importez une sauvegarde pour commencer.</p><div class="empty-actions"><button class="btn-settings js-empty-add-protocol">Créer un protocole</button><button class="btn-settings js-empty-add-med">Ajouter traitement simple</button><button class="btn-settings js-empty-add-variable">Ajouter traitement à dosage variable</button><button class="btn-settings js-empty-import">Importer JSON</button></div></div>`
      : medications.map(med => {
          const medPhases = phases.filter(p => p.medicationId === med.id)
            .sort((a, b) => a.startDate.localeCompare(b.startDate));
          return MedicationsScreen._medCard(med, medPhases);
        }).join('');

    screen.innerHTML = `
      <div class="section-title">Traitements</div>
      ${MedicationsScreen._protocolsSection(protocols, medications, phases)}
      <div class="section-subtitle">${medications.length} médicament${medications.length !== 1 ? 's' : ''} configuré${medications.length !== 1 ? 's' : ''}</div>
      <div class="med-list">${listHtml}</div>
      <button class="fab" id="btn-add-med">＋</button>
    `;

    // Bind FAB
    screen.querySelector('#btn-add-med').addEventListener('click', () => {
      MedicationsScreen.openAddMenu(protocols);
    });

    // Bind edit / delete buttons
    screen.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const medId = btn.dataset.medId;
        const med = medications.find(m => m.id === medId);
        const medPhases = phases.filter(p => p.medicationId === medId);
        (med?.dosageMode === 'variable' ? MedicationsScreen.openVariableForm(med, medPhases, protocols) : MedicationsScreen.openForm(med, medPhases, protocols));
      });
    });

    screen.querySelectorAll('.btn-dosage-calendar').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const medId = btn.dataset.medId;
        const med = medications.find(m => m.id === medId);
        if (med) await MedicationsScreen.openDosageCalendar(med);
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
    screen.querySelector('.js-empty-add-protocol')?.addEventListener('click',()=>MedicationsScreen.openProtocolForm());
    screen.querySelector('.js-empty-add-med')?.addEventListener('click',()=>MedicationsScreen.openForm(null, null, protocols));
    screen.querySelector('.js-empty-add-variable')?.addEventListener('click',()=>MedicationsScreen.openVariableForm(null, null, protocols));
    screen.querySelector('.js-empty-import')?.addEventListener('click', ()=>{ App.navigateTo('settings'); setTimeout(()=>document.getElementById('btn-import')?.click(), 50); });
    screen.querySelectorAll('.protocol-filter-pill').forEach(btn=>btn.addEventListener('click', async ()=>{ MedicationsScreen.protocolFilter = btn.dataset.filter; await MedicationsScreen.render(); }));
    screen.querySelector('#protocol-search')?.addEventListener('input', async (e)=>{ MedicationsScreen.searchQuery = e.target.value || ''; await MedicationsScreen.render(); });
    screen.querySelectorAll('.btn-protocol-action').forEach(btn=>btn.addEventListener('click',async()=>{
      const p=protocols.find(x=>x.id===btn.dataset.protocolId); if(!p) return;
      await MedicationsScreen.handleProtocolAction(p, btn.dataset.action);
    }));
  },

  _medCard(med, phases) {
    const mode = med.dosageMode === 'variable' ? 'variable' : 'fixed';
    const phasesHtml = phases.length === 0
      ? '<div class="med-phase" style="color:var(--text-light);">Aucune phase définie</div>'
      : phases.map(p => {
          const startFR = formatDateShortFR(p.startDate);
          const endFR = p.endDate ? formatDateShortFR(p.endDate) : '∞';
          const times = (p.times || []).join(', ') || '—';
          return `
            <div class="med-phase">
              <div class="med-phase-dates">${startFR} → ${endFR}</div>
              <div class="med-phase-detail">${mode === 'variable' ? 'Calendrier de dosage' : escHtml(p.dosage || "—")} · ${escHtml(times)}</div>
              ${p.notes ? `<div class="med-phase-detail" style="font-style:italic;">${escHtml(p.notes)}</div>` : ''}
            </div>
          `;
        }).join('');

    return `
      <div class="med-card">
        <div class="med-card-header">
          <div class="med-info">
            <div class="med-name">${escHtml(med.name)}</div>
            <div class="med-type">${escHtml(med.type || "")} · ${phases.length} phase${phases.length !== 1 ? 's' : ''} · ${escHtml(dosageModeLabel(mode))}</div>
          </div>
          <div class="med-actions-row">
            <button class="btn-icon btn-edit" data-med-id="${med.id}" title="Modifier">✎</button>
            <button class="btn-icon btn-delete" data-med-id="${med.id}" title="Supprimer">🗑</button>
          </div>
        </div>
        ${mode === 'variable' ? '<div style="margin:8px 0;"><span class="timeline-badge">Dosage variable</span></div>' : '<div style="margin:8px 0;"><span class="timeline-badge">Traitement simple</span></div>'}<div class="med-phases">${phasesHtml}</div>${mode === 'variable' ? `<button class="btn-settings btn-dosage-calendar" data-med-id="${escHtml(med.id)}" style="margin-top:8px;">Calendrier dosage</button>` : ''}
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
      <div class="time-chip" data-time="${escHtml(t)}">
        ${escHtml(t)}
        <button class="time-chip-remove" data-remove-time="${escHtml(t)}">✕</button>
      </div>
    `).join('');

    return `
      <div class="phase-block" data-phase-id="${escHtml(phase.id)}">
        <div class="phase-block-header">
          <span class="phase-block-title">Phase ${index + 1}</span>
          <button class="btn-remove-phase" data-remove-phase="${escHtml(phase.id)}" title="Supprimer phase">✕</button>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Début *</label>
            <input class="form-input phase-start" type="date" value="${phase.startDate || ''}" data-phase-id="${escHtml(phase.id)}" />
          </div>
          <div class="form-group">
            <label class="form-label">Fin</label>
            <input class="form-input phase-end" type="date" value="${phase.endDate || ''}" data-phase-id="${escHtml(phase.id)}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Dosage</label>
          <input class="form-input phase-dosage" type="text" placeholder="Ex: 200mg" value="${escHtml(phase.dosage || '')}" data-phase-id="${escHtml(phase.id)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Heures de prise</label>
          <div class="times-row" id="times-row-${escHtml(phase.id)}">
            ${timesHtml}
            <div style="display:flex;gap:6px;align-items:center;">
              <input type="time" class="form-input" id="time-input-${escHtml(phase.id)}" style="width:110px;padding:6px 10px;" />
              <button class="btn-add-time" data-add-time-for="${escHtml(phase.id)}">＋</button>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <input class="form-input phase-notes" type="text" placeholder="Optionnel" value="${escHtml(phase.notes || '')}" data-phase-id="${escHtml(phase.id)}" />
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

      const med = { id: formData.id, name: formData.name.trim(), type: formData.type.trim(), protocolId: formData.protocolId || null, dosageMode: 'fixed' };
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


  _protocolsSection(protocols, medications, phases){
    const labels={active:'Actifs',paused:'En pause',completed:'Terminés',archived:'Archivés',all:'Tous'};
    const q = MedicationsScreen.searchQuery.trim().toLowerCase();
    const statusMatch = p => (MedicationsScreen.protocolFilter==='all'?true:p.status===MedicationsScreen.protocolFilter);
    const protocolById = new Map(protocols.map(p=>[p.id,p]));
    const phaseByMed = new Map();
    phases.forEach(ph=>{ if(!phaseByMed.has(ph.medicationId)) phaseByMed.set(ph.medicationId, []); phaseByMed.get(ph.medicationId).push(ph); });

    const visibleProtocols = protocols.filter(p=>{
      if(!statusMatch(p)) return false;
      if(!q) return true;
      const pm = medications.filter(m=>m.protocolId===p.id);
      const hay = [p.name,p.type,p.status,p.notes,...pm.flatMap(m=>[m.name,m.type,m.notes,...(phaseByMed.get(m.id)||[]).flatMap(ph=>[ph.dosage,ph.notes])])].join(' ').toLowerCase();
      return hay.includes(q);
    });

    const visibleMeds = medications.filter(m=>{
      const protocol = protocolById.get(m.protocolId);
      if(protocol && !statusMatch(protocol)) return false;
      if(!q) return true;
      const medHay = [m.name,m.type,m.dosage,m.notes,protocol?.name,...(phaseByMed.get(m.id)||[]).flatMap(ph=>[ph.dosage,ph.notes,ph.type])].join(' ').toLowerCase();
      return medHay.includes(q);
    });

    const protocolCards = visibleProtocols.map(p=>{
      const count=medications.filter(m=>m.protocolId===p.id).length;
      const actions = MedicationsScreen._protocolActionsByStatus(p.status||'active');
      return `<div class="card card-sm"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;"><div><strong>${escHtml(p.name)}</strong><div style="font-size:.8rem;color:var(--text-soft);">${escHtml(protocolStatusLabelFR(p.status||'active'))} · ${escHtml(p.startDate||'—')} ${p.endDate?`→ ${escHtml(p.endDate)}`:''} · ${count} médicaments</div></div><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">${actions.map(a=>`<button class="btn-settings btn-protocol-action ${a.danger?'btn-protocol-danger':''}" data-action="${a.action}" data-protocol-id="${escHtml(p.id)}">${a.label}</button>`).join('')}</div></div></div>`;
    }).join('');

    const medHits = visibleMeds.length ? `<div class="section-subtitle" style="margin:8px 0;">Médicaments</div>${visibleMeds.map(m=>`<div class="card card-sm"><strong>${escHtml(m.name)}</strong><div style="font-size:.82rem;color:var(--text-soft);">${escHtml(m.type||'Type non renseigné')} · Protocole : ${escHtml(protocolById.get(m.protocolId)?.name||'Sans protocole')}</div></div>`).join('')}` : '';
    const pills = ['active','paused','completed','archived','all'].map(k=>`<button class="btn-settings protocol-filter-pill ${MedicationsScreen.protocolFilter===k?'active':''}" data-filter="${k}">${labels[k]}</button>`).join('');
    const noResults = (!protocolCards && !medHits) ? '<div class="card card-sm">Aucun résultat.</div>' : '';
    return `<div class="section-subtitle">Protocoles</div><input id="protocol-search" class="form-input" placeholder="Rechercher un traitement ou protocole" value="${escHtml(MedicationsScreen.searchQuery)}"/><div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 10px;">${pills}</div><div>${protocolCards}</div>${medHits}${noResults}<button class="btn-settings" id="btn-add-protocol" style="margin:10px 0;">+ Protocole</button>`;
  },
  _protocolActionsByStatus(status){
    if(status==='paused') return [{action:'edit',label:'Modifier'},{action:'resume',label:'Reprendre'},{action:'archive',label:'Archiver'}];
    if(status==='completed') return [{action:'edit',label:'Consulter'},{action:'resume',label:'Réactiver'},{action:'archive',label:'Archiver'}];
    if(status==='archived') return [{action:'edit',label:'Consulter'},{action:'resume',label:'Restaurer'},{action:'delete',label:'Supprimer',danger:true}];
    return [{action:'edit',label:'Modifier'},{action:'pause',label:'Pause'},{action:'complete',label:'Terminer'},{action:'archive',label:'Archiver'}];
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
  openAddMenu(protocols = []) {
    const content = `
      <div class="modal-header"><span class="modal-title">Ajouter un traitement</span><button class="modal-close" id="modal-close-btn">✕</button></div>
      <div class="modal-body"><div style="display:grid;gap:10px;">
        <button class="btn-primary" id="add-fixed">Traitement simple</button>
        <button class="btn-primary" id="add-variable">Traitement à dosage variable</button>
      </div></div>`;
    Modal.show(content);
    document.getElementById('modal-close-btn').onclick = () => Modal.hide();
    document.getElementById('add-fixed').onclick = () => MedicationsScreen.openForm(null, null, protocols);
    document.getElementById('add-variable').onclick = () => MedicationsScreen.openVariableForm(null, null, protocols);
  },

  openVariableForm(med, existingPhases, protocols = []) {
    const isEdit = !!med;
    const phase = (existingPhases && existingPhases[0]) ? { ...existingPhases[0] } : MedicationsScreen._newPhase();
    phase.dosage = '';
    const formData = { id: med?.id || uid(), name: med?.name || '', type: med?.type || '', protocolId: med?.protocolId || protocols[0]?.id || null, phase };
    const content = `
      <div class="modal-header"><span class="modal-title">${isEdit ? 'Modifier traitement variable' : 'Traitement à dosage variable'}</span><button class="modal-close" id="modal-close-btn">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Nom du médicament *</label><input id="v-name" class="form-input" value="${escHtml(formData.name)}"></div>
        <div class="form-group"><label class="form-label">Type / forme</label><input id="v-type" class="form-input" value="${escHtml(formData.type)}"></div>
        <div class="form-group"><label class="form-label">Protocole</label><select id="v-protocol" class="form-input">${protocols.map(p=>`<option value="${escHtml(p.id)}" ${formData.protocolId===p.id?'selected':''}>${escHtml(p.name)}</option>`).join('')}</select></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Date de début *</label><input id="v-start" type="date" class="form-input" value="${escHtml(formData.phase.startDate || todayStr())}"></div><div class="form-group"><label class="form-label">Date de fin</label><input id="v-end" type="date" class="form-input" value="${escHtml(formData.phase.endDate || '')}"></div></div>
        <div class="form-group"><label class="form-label">Heure(s) de prise *</label><input id="v-times" class="form-input" placeholder="08:00, 20:00" value="${escHtml((formData.phase.times || []).join(', '))}"></div>
        <div class="form-group"><label class="form-label">Notes optionnelles</label><input id="v-notes" class="form-input" value="${escHtml(formData.phase.notes || '')}"></div>
        <div class="card card-sm"><strong>Calendrier de dosage</strong><p style="margin:.4rem 0 0;color:var(--text-soft);">Après création, saisissez les dosages semaine par semaine. Aucune dose n’est proposée automatiquement.</p></div>
      </div>
      <div class="modal-footer"><button class="btn-secondary" id="modal-cancel-btn">Annuler</button><button class="btn-primary" id="modal-save-btn">${isEdit?'Enregistrer':'Créer et saisir la semaine'}</button></div>`;
    Modal.show(content);
    document.getElementById('modal-close-btn').onclick = () => Modal.hide();
    document.getElementById('modal-cancel-btn').onclick = () => Modal.hide();
    document.getElementById('modal-save-btn').onclick = async () => {
      const name = document.getElementById('v-name').value.trim();
      const startDate = document.getElementById('v-start').value;
      const endDate = document.getElementById('v-end').value || null;
      const times = normalizeTimes(document.getElementById('v-times').value.split(/[;,\s]+/));
      if (!name) return showToast('Le nom est obligatoire');
      if (!startDate) return showToast('La date de début est obligatoire');
      if (endDate && endDate < startDate) return showToast('La date de fin doit être après le début');
      if (!times.length) return showToast('Au moins une heure est obligatoire');
      const protocolId = document.getElementById('v-protocol').value || null;
      const now = new Date().toISOString();
      const savedMed = { id: formData.id, name, type: document.getElementById('v-type').value.trim(), protocolId, dosageMode: 'variable', createdAt: med?.createdAt || now, updatedAt: now };
      await DB.saveMedication(savedMed);
      if (isEdit) await DB.deletePhasesByMedication(savedMed.id);
      await DB.savePhase({ ...formData.phase, medicationId: savedMed.id, protocolId, startDate, endDate, dosage: '', times, notes: document.getElementById('v-notes').value.trim() });
      Modal.hide();
      showToast(isEdit ? '✓ Traitement mis à jour' : '✓ Traitement créé');
      await MedicationsScreen.render(); await TodayScreen.render(); await TimelineScreen.render(); await JournalScreen.render();
      await MedicationsScreen.openDosageCalendar(savedMed, startDate);
    };
  },

  async openDosageCalendar(med, dateStr = todayStr()) {
    let weekStart = startOfWeekMonday(dateStr);
    const render = async () => {
      const overrides = await DB.getDosageOverridesByMedication(med.id);
      const days = weekDatesMonday(weekStart);
      const byDate = new Map(overrides.map(o => [o.date, o]));
      const rows = days.map(ds => {
        const d = fromDateStr(ds);
        const label = capitalize(d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit' }));
        const o = byDate.get(ds);
        return `<div class="dosage-week-row"><label><span>${escHtml(label)}</span><input class="form-input dosage-day-input" data-date="${escHtml(ds)}" placeholder="Dosage" value="${escHtml(o?.dosage || '')}"></label></div>`;
      }).join('');
      Modal.show(`<div class="modal-header"><span class="modal-title">Calendrier de dosage</span><button class="modal-close" id="modal-close-btn">✕</button></div><div class="modal-body"><div class="card card-sm"><strong>${escHtml(med.name)}</strong><div style="color:var(--text-soft);font-size:.86rem;">Semaine du ${escHtml(formatDateShortFR(days[0]))} au ${escHtml(formatDateShortFR(days[6]))}</div></div><div class="dosage-week-nav"><button class="btn-settings" id="week-prev">Semaine précédente</button><button class="btn-settings" id="week-current">Semaine actuelle</button><button class="btn-settings" id="week-next">Semaine suivante</button></div><div class="dosage-week-grid">${rows}</div></div><div class="modal-footer"><button class="btn-secondary" id="week-clear">Effacer la semaine</button><button class="btn-secondary" id="week-duplicate">Dupliquer cette semaine</button><button class="btn-primary" id="week-save">Enregistrer la semaine</button></div>`);
      document.getElementById('modal-close-btn').onclick = () => Modal.hide();
      document.getElementById('week-prev').onclick = async () => { weekStart = addDays(weekStart, -7); await render(); };
      document.getElementById('week-current').onclick = async () => { weekStart = startOfWeekMonday(todayStr()); await render(); };
      document.getElementById('week-next').onclick = async () => { weekStart = addDays(weekStart, 7); await render(); };
      document.getElementById('week-save').onclick = async () => { await MedicationsScreen._saveDosageWeek(med); showToast('Semaine enregistrée'); await TodayScreen.render(); await TimelineScreen.render(); await JournalScreen.render(); await render(); };
      document.getElementById('week-clear').onclick = async () => { for (const ds of days) await DB.deleteDosageOverride(`${med.id}|${ds}`); showToast('Semaine effacée'); await TodayScreen.render(); await TimelineScreen.render(); await JournalScreen.render(); await render(); };
      document.getElementById('week-duplicate').onclick = async () => { await MedicationsScreen._saveDosageWeek(med); const fresh = await DB.getDosageOverridesByMedication(med.id); const map = new Map(fresh.map(o => [o.date, o])); const now = new Date().toISOString(); for (const ds of days) { const o = map.get(ds); const nextDate = addDays(ds, 7); if (!o || !String(o.dosage || '').trim() || o.enabled === false) await DB.deleteDosageOverride(`${med.id}|${nextDate}`); else await DB.saveDosageOverride({ id: `${med.id}|${nextDate}`, medicationId: med.id, protocolId: med.protocolId, date: nextDate, dosage: String(o.dosage).trim(), enabled: true, note: o.note || '', createdAt: now, updatedAt: now }); } weekStart = addDays(weekStart, 7); showToast('Semaine dupliquée'); await TodayScreen.render(); await TimelineScreen.render(); await JournalScreen.render(); await render(); };
    };
    await render();
  },

  async _saveDosageWeek(med) {
    const now = new Date().toISOString();
    const inputs = document.querySelectorAll('.dosage-day-input');
    for (const input of inputs) {
      const date = input.dataset.date;
      const dosage = input.value.trim();
      const id = `${med.id}|${date}`;
      if (!dosage) { await DB.deleteDosageOverride(id); continue; }
      await DB.saveDosageOverride({ id, medicationId: med.id, protocolId: med.protocolId, date, dosage, enabled: true, note: '', createdAt: now, updatedAt: now });
    }
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
      const [protocols, phases, dosageOverrides] = await Promise.all([DB.getProtocols(), DB.getPhases(), DB.getDosageOverrides()]);
      const protocol = protocols.find(p => p.id === med.protocolId);
      const intakeEvents = await DB.getIntakeEvents();
      for (const ev of intakeEvents) {
        if (ev.medicationId !== med.id) continue;
        const payload = { ...(ev.payload || {}) };
        if (!payload.medNameSnapshot) payload.medNameSnapshot = med.name || 'médicament supprimé';
        if (!payload.dosageSnapshot) { const scheduledDate = payload.scheduledDate || (ev.intakeKey || '').split('|')[2]; const intake = scheduledDate ? Intakes.generateForDate([med], phases.filter(p => p.medicationId === med.id), scheduledDate, dosageOverrides).find(i => i.key === ev.intakeKey) : null; payload.dosageSnapshot = intake?.dosage || ''; payload.plannedDosage = payload.dosageSnapshot; }
        if (!payload.medTypeSnapshot) payload.medTypeSnapshot = med.type || '';
        if (!payload.protocolNameSnapshot) payload.protocolNameSnapshot = protocol?.name || '';
        if (!payload.dosageModeSnapshot) payload.dosageModeSnapshot = med.dosageMode === 'variable' ? 'variable' : 'fixed';
        await DB.saveIntakeEvent({ ...ev, payload });
      }
      await DB.deleteMedication(med.id);
      await DB.deletePhasesByMedication(med.id);
      await DB.deleteDosageOverridesByMedication(med.id);
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

const SettingsScreen = {
  render() {
    const screen = document.getElementById('screen-settings');
    screen.innerHTML = `<div class="section-title">Réglages</div><div class="settings-section card">
      <div class="settings-row"><div><div class="settings-row-label">Exporter JSON V3</div><div class="settings-row-sub">Sauvegarde technique complète locale</div></div><button class="btn-settings" id="btn-export">Exporter</button></div>
      <div class="settings-row"><div><div class="settings-row-label">Importer JSON (V2/V2.1/V3)</div><div class="settings-row-sub">Validation complète avant import</div></div><button class="btn-settings" id="btn-import">Importer</button></div>
      <input type="file" id="import-file-input" accept=".json" class="hidden" />
      <div style="margin-top:12px;font-size:.82rem;color:var(--text-soft);">Les données sont stockées localement sur cet appareil.</div></div>`;
    screen.querySelector('#btn-export').addEventListener('click', async () => {
      const data = await DB.exportAll();
      const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
      const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`luma-v3-backup-${todayStr()}.json`; a.click(); URL.revokeObjectURL(url); showToast('✓ Export JSON réalisé');
    });
    const importInput = screen.querySelector('#import-file-input');
    screen.querySelector('#btn-import').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', async (e) => {
      const file=e.target.files[0]; if(!file) return;
      if (!confirm('Importer une sauvegarde va remplacer les données actuelles. Continuer ?')) return;
      try { const data=JSON.parse(await file.text()); await DB.importAll(data); showToast('✓ Import terminé'); await TodayScreen.render(App.selectedDate); await TimelineScreen.render(App.selectedDate); await MedicationsScreen.render(); await JournalScreen.render(); }
      catch(err){ console.error(err); showToast(err.message || 'Import refusé'); }
      importInput.value='';
    });
  },
};

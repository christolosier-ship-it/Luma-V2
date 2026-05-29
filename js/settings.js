const SettingsScreen = {
  render() {
    const screen = document.getElementById('screen-settings');
    screen.innerHTML = `<div class="section-title">Réglages</div><div class="settings-section card">
      <div class="settings-row"><div><div class="settings-row-label">Exporter JSON</div></div><button class="btn-settings" id="btn-export">Exporter</button></div>
      <div class="settings-row"><div><div class="settings-row-label">Importer JSON</div></div><button class="btn-settings" id="btn-import">Importer</button></div>
      <div class="settings-row-help">Format de sauvegarde local Luma.</div><input type="file" id="import-file-input" accept=".json" class="hidden" /></div><div class='card card-sm settings-info-card'><strong>Confidentialité locale</strong><p>Vos données sont stockées localement sur cet appareil. Luma ne nécessite aucun compte, aucun cloud et aucune synchronisation externe.</p><p>Pensez à exporter régulièrement un fichier JSON de sauvegarde.</p></div><div class='card card-sm settings-info-card'><strong>À propos</strong><p>Luma V3.5.1</p><p>Créé par Christopher Losier</p><p>Application personnelle de suivi local, offline-first.</p></div>`;
    screen.querySelector('#btn-export').addEventListener('click', async () => {
      try { const data = await DB.exportAll(); SettingsScreen._downloadJson(data, `luma-v3.5.1-backup-${todayStr()}.json`); showToast('✓ Export JSON réalisé'); }
      catch (err) { console.error(err); showToast('Erreur export JSON'); }
    });
    const importInput = screen.querySelector('#import-file-input');
    screen.querySelector('#btn-import').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        if (file.size > (5 * 1024 * 1024)) throw new Error('Fichier trop volumineux. Import annulé.');
        const data = JSON.parse(await file.text());
        const check = DB.validateImportData(data); if (!check.ok) throw new Error(check.error);
        const backup = await DB.exportAll();
        const stamp = new Date().toISOString().slice(0,16).replace('T','-').replace(':','');
        SettingsScreen._downloadJson(backup, `luma-pre-import-backup-${stamp}.json`);
        if (!confirm('Une sauvegarde actuelle vient d’être téléchargée. Continuer l’import ?')) return;
        await DB.importAll(data);
        showToast('✓ Import terminé');
        await TodayScreen.render(); await TimelineScreen.render(); await MedicationsScreen.render(); await JournalScreen.render();
      } catch (err) { console.error(err); showToast(err.message || 'Import refusé'); }
      importInput.value='';
    });
  },
  _downloadJson(data, name){ const blob=new Blob([JSON.stringify(data,null,2)], {type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url); }
};

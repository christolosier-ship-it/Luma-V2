/**
 * settings.js — Settings screen: export, import, reset
 */

const SettingsScreen = {
  render() {
    const screen = document.getElementById('screen-settings');
    screen.innerHTML = `
      <div class="section-title">Réglages</div>
      <div class="section-subtitle">Données et application</div>
      <div class="settings-section"><div class="settings-section-title">Données</div>
        <div class="settings-row"><div><div class="settings-row-label">Exporter mes données</div><div class="settings-row-sub">Télécharger un fichier JSON de sauvegarde</div></div><button class="btn-settings" id="btn-export">Exporter</button></div>
        <div class="settings-row"><div><div class="settings-row-label">Importer des données</div><div class="settings-row-sub">Restaurer depuis un fichier JSON</div></div><button class="btn-settings" id="btn-import">Importer</button></div>
        <input type="file" id="import-file-input" accept=".json" class="hidden" />
      </div>
      <div class="settings-section"><div class="settings-section-title">À propos</div><div class="settings-row"><div><div class="settings-row-label">Luma</div><div class="settings-row-sub">Suivi de traitements · v2.1 · Application hors ligne</div></div><span style="font-size:1.2rem;">🌿</span></div></div>
    `;

    screen.querySelector('#btn-export').addEventListener('click', async () => {
      try {
        const data = await DB.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `luma-backup-${todayStr()}.json`; a.click(); URL.revokeObjectURL(url);
        showToast('✓ Données exportées');
      } catch (err) { console.error('Export failed', err); showToast('Erreur lors de l\'export'); }
    });

    const importInput = screen.querySelector('#import-file-input');
    screen.querySelector('#btn-import').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const validation = DB.validateImportData(data);
        if (!validation.ok) throw new Error(validation.error);
        await DB.importAll(data);
        showToast('✓ Données importées');
        await TodayScreen.render(App.selectedDate); await MedicationsScreen.render(); SettingsScreen.render();
      } catch (err) { console.error('Import failed', err); showToast(err.message || 'Erreur lors de l\'import'); }
      importInput.value = '';
    });
  },
};

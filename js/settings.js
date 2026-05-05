/**
 * settings.js — Settings screen: export, import, reset
 */

const SettingsScreen = {

  render() {
    const screen = document.getElementById('screen-settings');
    screen.innerHTML = `
      <div class="section-title">Réglages</div>
      <div class="section-subtitle">Données et application</div>

      <div class="settings-section">
        <div class="settings-section-title">Données</div>

        <div class="settings-row">
          <div>
            <div class="settings-row-label">Exporter mes données</div>
            <div class="settings-row-sub">Télécharger un fichier JSON de sauvegarde</div>
          </div>
          <button class="btn-settings" id="btn-export">Exporter</button>
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-row-label">Importer des données</div>
            <div class="settings-row-sub">Restaurer depuis un fichier JSON</div>
          </div>
          <button class="btn-settings" id="btn-import">Importer</button>
        </div>

        <input type="file" id="import-file-input" accept=".json" class="hidden" />
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Danger</div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Réinitialiser l'application</div>
            <div class="settings-row-sub">Supprimer toutes les données définitivement</div>
          </div>
          <button class="btn-settings btn-danger" id="btn-reset">Réinitialiser</button>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">À propos</div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Luma</div>
            <div class="settings-row-sub">Suivi de traitements · v1.0 · Application hors ligne</div>
          </div>
          <span style="font-size:1.2rem;">🌿</span>
        </div>
      </div>
    `;

    // Export
    screen.querySelector('#btn-export').addEventListener('click', async () => {
      const data = await DB.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `luma-backup-${todayStr()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('✓ Données exportées');
    });

    // Import
    const importInput = screen.querySelector('#import-file-input');
    screen.querySelector('#btn-import').addEventListener('click', () => {
      importInput.click();
    });
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.medications || !data.phases) {
          showToast('Fichier invalide'); return;
        }
        await DB.importAll(data);
        showToast('✓ Données importées');
        // Refresh all screens
        await TodayScreen.render(App.selectedDate);
        await MedicationsScreen.render();
        SettingsScreen.render();
      } catch {
        showToast('Erreur lors de l\'import');
      }
      importInput.value = '';
    });

    // Reset
    screen.querySelector('#btn-reset').addEventListener('click', () => {
      const content = `
        <div class="modal-header">
          <span class="modal-title">Réinitialiser</span>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="confirm-box">
            <div class="confirm-icon">⚠️</div>
            <div class="confirm-title">Tout supprimer ?</div>
            <div class="confirm-text">Cette action est irréversible. Tous vos médicaments, phases et historique de prises seront effacés.</div>
            <div class="confirm-actions">
              <button class="btn-confirm-cancel" id="reset-cancel">Annuler</button>
              <button class="btn-confirm-danger" id="reset-confirm">Réinitialiser</button>
            </div>
          </div>
        </div>
      `;
      Modal.show(content);
      document.getElementById('modal-close-btn').addEventListener('click', () => Modal.hide());
      document.getElementById('reset-cancel').addEventListener('click', () => Modal.hide());
      document.getElementById('reset-confirm').addEventListener('click', async () => {
        await DB.resetAll();
        Modal.hide();
        showToast('Application réinitialisée');
        await TodayScreen.render(App.selectedDate);
        await MedicationsScreen.render();
        SettingsScreen.render();
      });
    });
  },
};

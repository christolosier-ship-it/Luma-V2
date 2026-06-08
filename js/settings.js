const SettingsScreen = {
  render() {
    const screen = document.getElementById('screen-settings');
    const notificationStatus = SettingsScreen._notificationStatus();
    const notificationChecked = window.LumaNotifications?.isEnabled?.() && notificationStatus.key !== 'denied' && notificationStatus.key !== 'unsupported';
    screen.innerHTML = `<div class="section-title">Réglages</div>
      <div class="settings-section card">
        <div class="settings-row"><div><div class="settings-row-label">Exporter JSON</div></div><button class="btn-settings" id="btn-export">Exporter</button></div>
        <div class="settings-row"><div><div class="settings-row-label">Importer JSON</div></div><button class="btn-settings" id="btn-import">Importer</button></div>
        <div class="settings-row-help">Format de sauvegarde local Luma.</div><input type="file" id="import-file-input" accept=".json" class="hidden" />
      </div>
      <div class="settings-section card">
        <div class="settings-section-title">Notifications locales</div>
        <div class="settings-row-help">Les notifications locales fonctionnent lorsque Luma est ouverte ou récemment active. Elles restent 100 % locales et ne nécessitent aucun cloud.</div>
        <div class="settings-row settings-notification-row">
          <div>
            <div class="settings-row-label">Activer les notifications</div>
            <div class="settings-row-sub">Prises à l’heure exacte, événements 15 minutes avant.</div>
          </div>
          <label class="settings-switch" aria-label="Activer les notifications locales">
            <input id="notifications-toggle" type="checkbox" ${notificationChecked ? 'checked' : ''} ${notificationStatus.key === 'unsupported' ? 'disabled' : ''} />
            <span class="settings-switch-slider"></span>
          </label>
        </div>
        <div class="settings-row settings-notification-actions">
          <span class="notification-status-pill ${escHtml(notificationStatus.key)}" id="notification-status">${escHtml(notificationStatus.label)}</span>
          <div class="settings-button-row">
            <button class="btn-settings" id="btn-notification-test" ${notificationStatus.key === 'unsupported' ? 'disabled' : ''}>Tester</button>
            <button class="btn-settings" id="btn-notification-reschedule" ${notificationStatus.key === 'unsupported' ? 'disabled' : ''}>Reprogrammer aujourd’hui</button>
          </div>
        </div>
      </div>
      <div class='card card-sm settings-info-card'><strong>Confidentialité locale</strong><p>Vos données sont stockées localement sur cet appareil. Luma ne nécessite aucun compte, aucun cloud et aucune synchronisation externe.</p><p>Pensez à exporter régulièrement un fichier JSON de sauvegarde.</p></div>
      <div class='card card-sm settings-info-card'><strong>À propos</strong><p>Luma V3.6.1</p><p>Créé par Christopher Losier</p><p>Application personnelle de suivi local, offline-first.</p></div>`;
    screen.querySelector('#btn-export').addEventListener('click', async () => {
      try { const data = await DB.exportAll(); SettingsScreen._downloadJson(data, `luma-v3.6.1-backup-${todayStr()}.json`); showToast('✓ Export JSON réalisé'); }
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
        await window.LumaNotifications?.refreshAfterDataChange?.();
        showToast('✓ Import terminé');
        await TodayScreen.render(); await TimelineScreen.render(); await MedicationsScreen.render(); await JournalScreen.render();
      } catch (err) { console.error(err); showToast(err.message || 'Import refusé'); }
      importInput.value='';
    });
    SettingsScreen._bindNotificationControls(screen);
  },

  _bindNotificationControls(screen) {
    const toggle = screen.querySelector('#notifications-toggle');
    toggle?.addEventListener('change', async () => {
      if (!window.LumaNotifications?.isSupported?.()) {
        toggle.checked = false;
        showToast('Notifications non compatibles');
        SettingsScreen.render();
        return;
      }
      if (toggle.checked) {
        const enabled = await window.LumaNotifications.setEnabled(true);
        if (enabled) showToast('Notifications locales activées');
        else showToast(Notification.permission === 'denied' ? 'Permission refusée dans le navigateur' : 'Notifications non activées');
      } else {
        await window.LumaNotifications.setEnabled(false);
        showToast('Notifications locales désactivées');
      }
      SettingsScreen.render();
    });
    screen.querySelector('#btn-notification-test')?.addEventListener('click', async () => {
      try {
        await window.LumaNotifications.sendTestNotification();
        showToast('Notification de test envoyée');
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Notification impossible');
      }
      SettingsScreen.render();
    });
    screen.querySelector('#btn-notification-reschedule')?.addEventListener('click', async () => {
      try {
        await window.LumaNotifications.scheduleAll();
        showToast('Notifications du jour reprogrammées');
      } catch (err) {
        console.error(err);
        showToast('Reprogrammation impossible');
      }
      SettingsScreen.render();
    });
  },

  _notificationStatus() {
    if (!window.LumaNotifications?.isSupported?.()) return { key: 'unsupported', label: 'Non compatibles' };
    if (Notification.permission === 'denied') return { key: 'denied', label: 'Permission refusée' };
    if (window.LumaNotifications.isEnabled() && Notification.permission === 'granted') return { key: 'active', label: 'Actives' };
    return { key: 'inactive', label: 'Désactivées' };
  },

  _downloadJson(data, name){ const blob=new Blob([JSON.stringify(data,null,2)], {type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url); }
};

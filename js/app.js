const App = {
  // Écran actuellement affiché.
  currentScreen: 'today',
  // Initialise la base et les écrans.
  async init() {
    try { await DB.init(); } catch (err) { console.error(err); showToast("Erreur base locale"); return; }
    setTimeout(() => {
      document.getElementById('splash').classList.add('fade-out');
      setTimeout(() => { document.getElementById('splash').remove(); document.getElementById('app').classList.remove('hidden'); }, 500);
    }, 600);
    App._bindNav();
    await TodayScreen.render();
    await TimelineScreen.render();
    await MedicationsScreen.render();
    await JournalScreen.render();
    SettingsScreen.render();
    App.updateHeaderDate();
  },
  // Lie les boutons de navigation du bas.
  _bindNav() { document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', async () => App.navigateTo(btn.dataset.screen))); },
  // Change d'écran et déclenche son rendu.
  async navigateTo(screenName) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.screen === screenName));
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${screenName}`).classList.add('active');
    App.currentScreen = screenName;
    if (screenName === 'today') await TodayScreen.render();
    else if (screenName === 'timeline') await TimelineScreen.render();
    else if (screenName === 'journal') await JournalScreen.render();
    else if (screenName === 'medications') await MedicationsScreen.render();
    else if (screenName === 'settings') SettingsScreen.render();
    App.updateHeaderDate();
  },
  // Met à jour la date visible dans l'entête.
  updateHeaderDate() {
    const el = document.getElementById('header-date'); if (!el) return;
    if (App.currentScreen === 'timeline') el.textContent = capitalize(formatDateShortFR(TimelineScreen.selectedDate));
    else el.textContent = capitalize(formatDateShortFR(todayStr()));
  },
};
document.addEventListener('DOMContentLoaded', () => App.init());
let swRefreshing = false;
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (swRefreshing) return;
        swRefreshing = true;
        window.location.reload();
      });
      if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
      await registration.update();
    } catch (error) {
      console.error('Service worker registration/update failed', error);
    }
  });
}

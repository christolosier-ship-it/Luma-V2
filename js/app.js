const App = {
  selectedDate: todayStr(),
  currentScreen: 'today',
  async init() {
    try { await DB.init(); } catch (err) { console.error(err); showToast("Erreur base locale"); return; }
    setTimeout(() => {
      document.getElementById('splash').classList.add('fade-out');
      setTimeout(() => { document.getElementById('splash').remove(); document.getElementById('app').classList.remove('hidden'); }, 500);
    }, 600);
    App.updateHeaderDate();
    App._bindNav();
    await TodayScreen.render(App.selectedDate);
    await TimelineScreen.render(App.selectedDate);
    await MedicationsScreen.render();
    await JournalScreen.render();
    SettingsScreen.render();
  },
  _bindNav() { document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', async () => App.navigateTo(btn.dataset.screen))); },
  async navigateTo(screenName) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.screen === screenName));
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${screenName}`).classList.add('active');
    App.currentScreen = screenName;
    if (screenName === 'today') await TodayScreen.render(App.selectedDate);
    else if (screenName === 'timeline') await TimelineScreen.render(App.selectedDate);
    else if (screenName === 'journal') await JournalScreen.render();
    else if (screenName === 'medications') await MedicationsScreen.render();
    else if (screenName === 'settings') SettingsScreen.render();
  },
  updateHeaderDate() { const el = document.getElementById('header-date'); if (el) el.textContent = capitalize(formatDateShortFR(App.selectedDate)); },
};
document.addEventListener('DOMContentLoaded', () => App.init());
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.error));

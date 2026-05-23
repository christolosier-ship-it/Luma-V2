const App = {
  currentScreen: 'today',
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
  _bindNav() { document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', async () => App.navigateTo(btn.dataset.screen))); },
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
  updateHeaderDate() {
    const el = document.getElementById('header-date'); if (!el) return;
    if (App.currentScreen === 'timeline') el.textContent = capitalize(formatDateShortFR(TimelineScreen.selectedDate));
    else el.textContent = capitalize(formatDateShortFR(todayStr()));
  },
};
document.addEventListener('DOMContentLoaded', () => App.init());
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.error));

/**
 * app.js — Main application controller
 * Handles navigation, initialization, state
 */

const App = {

  selectedDate: todayStr(),
  currentScreen: 'today',

  async init() {
    await DB.init();

    // Hide splash after short delay
    setTimeout(() => {
      document.getElementById('splash').classList.add('fade-out');
      setTimeout(() => {
        document.getElementById('splash').remove();
        document.getElementById('app').classList.remove('hidden');
      }, 500);
    }, 800);

    App.updateHeaderDate();
    App._bindNav();

    // Initial renders (today screen is active)
    await TodayScreen.render(App.selectedDate);
    // Pre-render medications (fast)
    await MedicationsScreen.render();
    SettingsScreen.render();
  },

  _bindNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const screen = btn.dataset.screen;
        await App.navigateTo(screen);
      });
    });
  },

  async navigateTo(screenName) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.screen === screenName);
    });

    // Update screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${screenName}`).classList.add('active');

    App.currentScreen = screenName;

    // Render on demand (always fresh)
    if (screenName === 'today') {
      await TodayScreen.render(App.selectedDate);
    } else if (screenName === 'calendar') {
      await CalendarScreen.render(App.selectedDate);
    } else if (screenName === 'medications') {
      await MedicationsScreen.render();
    } else if (screenName === 'settings') {
      SettingsScreen.render();
    }
  },

  updateHeaderDate() {
    const el = document.getElementById('header-date');
    if (el) el.textContent = capitalize(formatDateShortFR(App.selectedDate));
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // SW registration failed silently — offline still works via cache
    });
  });
}

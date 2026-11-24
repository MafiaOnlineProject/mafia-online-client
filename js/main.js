import { qs } from './domHelpers.js';
import { state, loadSession, saveSession, clearSession } from './state.js';
import { api } from './api.js';
import {
  showScreen,
  renderHeader,
  renderRoomsList,
  renderWaitingRoom,
  renderGameRoom,
  updateTimerDisplay
} from './ui.js';

let syncInterval = null;
let timerInterval = null;

function handleSelectTarget(targetId) {
  state.selectedTargetId = targetId;
  renderGameRoom(state.currentRoom, handleSelectTarget);
}

async function safe(fn) {
  try {
    await fn();
  } catch (err) {
    if (err.status === 401) {
      clearSession(); renderHeader(); showScreen('screen-auth');
    } else {
      alert(err.message || 'Что-то пошло не так');
    }
  }
}

function syncCurrentView() {
  const room = state.currentRoom;
  if (!room) return;

  if (room.status === 'WAITING') {
    showScreen('screen-waiting');
    renderWaitingRoom(room);
  } else {
    showScreen('screen-game');
    renderGameRoom(room, handleSelectTarget);
  }
}

async function refreshLobby() {
  const { rooms } = await api.getRooms();
  renderRoomsList(rooms, (roomId) => safe(async () => {
    const { room } = await api.joinRoom(roomId);
    state.currentRoom = room;
    syncCurrentView();
  }));
}

function startPolling() {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(async () => {
    if (!state.token) return;
    try {
      if (state.currentRoom) {
        const prevPhase = state.currentRoom.phase;
        const { room } = await api.getRoom(state.currentRoom.id);
        if (room.phase !== prevPhase) {
          state.selectedTargetId = null;
          state.actionSubmitted = false;
        }
        state.currentRoom = room;
        syncCurrentView();
      } else {
        await refreshLobby();
      }
    } catch (err) {
      if (err.status === 404 || err.status === 401) {
        state.currentRoom = null;
        showScreen('screen-lobby');
      }
    }
  }, 1500);

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (state.currentRoom?.phaseEndsAt) {
      updateTimerDisplay(state.currentRoom.phaseEndsAt);
    }
  }, 500);
}

async function initApp() {
  loadSession();

  if (state.token) {
    try {
      const { user, activeRoom } = await api.getMe();
      saveSession(state.token, user);
      renderHeader();
      if (activeRoom) {
        state.currentRoom = activeRoom;
        syncCurrentView();
      } else {
        showScreen('screen-lobby');
        await refreshLobby();
      }
      startPolling();
    } catch (err) {
      console.error('Ошибка восстановления сессии:', err);
      if (err.status === 401) {
        clearSession();
        renderHeader();
        showScreen('screen-auth');
      }
    }
  }

  qs('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = e.submitter?.dataset.mode || 'login';
    const username = qs('#auth-username').value.trim();
    const password = qs('#auth-password').value;
    const errorEl = qs('#auth-error');
    errorEl.textContent = '';

    try {
      const { token, user } = await api.auth(mode, username, password);
      saveSession(token, user);
      renderHeader();
      showScreen('screen-lobby');
      await refreshLobby();
      startPolling();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  const maxPlayersSelect = qs('#setting-max-players');
  const mistressWrap = qs('#mistress-setting-wrap');
  const maniacWrap = qs('#maniac-setting-wrap');

  const updateRoleSettingsVisibility = () => {
    const max = Number(maxPlayersSelect.value);
    mistressWrap.classList.toggle('hidden', max < 8);
    maniacWrap.classList.toggle('hidden', max < 12);
  };

  maxPlayersSelect.addEventListener('change', updateRoleSettingsVisibility);

  const createModal = qs('#create-room-modal');
  const openModal = () => {
    createModal.classList.remove('hidden');
    qs('#room-name-input').focus();
    updateRoleSettingsVisibility();
  };
  const closeModal = () => createModal.classList.add('hidden');

  qs('#open-create-modal-btn').addEventListener('click', openModal);
  qs('#close-create-modal-btn').addEventListener('click', closeModal);
  qs('#cancel-create-modal-btn').addEventListener('click', closeModal);

  createModal.addEventListener('click', (e) => {
    if (e.target === createModal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !createModal.classList.contains('hidden')) {
      closeModal();
    }
  });

  qs('#create-room-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = qs('#room-name-input');
    const name = input.value.trim();
    if (!name) return;

    const settings = {
      maxPlayers: Number(qs('#setting-max-players').value),
      dayDurationSec: Number(qs('#setting-day-duration').value),
      nightDurationSec: Number(qs('#setting-night-duration').value),
      enableMistress: qs('#setting-enable-mistress').checked,
      enableManiac: qs('#setting-enable-maniac').checked
    };

    try {
      const { room } = await api.createRoom(name, settings);
      input.value = '';
      closeModal();
      state.currentRoom = room;
      syncCurrentView();
    } catch (err) {
      alert(err.message);
    }
  });

  qs('#leave-room-btn').addEventListener('click', () => safe(async () => {
    if (!state.currentRoom) return;
    await api.leaveRoom(state.currentRoom.id);
    state.currentRoom = null;
    showScreen('screen-lobby');
    await refreshLobby();
  }));

  qs('#exit-game-btn').addEventListener('click', () => safe(async () => {
    if (!state.currentRoom) return;
    await api.leaveRoom(state.currentRoom.id);
    state.currentRoom = null;
    state.selectedTargetId = null;
    state.actionSubmitted = false;
    showScreen('screen-lobby');
    await refreshLobby();
  }));

  qs('#add-bot-btn').addEventListener('click', () => safe(async () => {
    if (!state.currentRoom) return;
    const { room } = await api.addBot(state.currentRoom.id);
    state.currentRoom = room;
    syncCurrentView();
  }));

  qs('#start-game-btn').addEventListener('click', () => safe(async () => {
    if (!state.currentRoom) return;
    const { room } = await api.startGame(state.currentRoom.id);
    state.currentRoom = room;
    syncCurrentView();
  }));

  qs('#restart-game-btn').addEventListener('click', () => safe(async () => {
    if (!state.currentRoom) return;
    const { room } = await api.restartGame(state.currentRoom.id);
    state.currentRoom = room;
    state.selectedTargetId = null;
    state.actionSubmitted = false;
    syncCurrentView();
  }));

  qs('#confirm-action-btn').addEventListener('click', async () => {
    if (!state.currentRoom || !state.selectedTargetId) return;
    const btn = qs('#confirm-action-btn');
    btn.disabled = true;

    try {
      const { room } = await api.sendAction(state.currentRoom.id, state.selectedTargetId);
      state.actionSubmitted = true;
      state.currentRoom = room;
      syncCurrentView();
    } catch (err) {
      btn.disabled = false;
      alert(err.message);
      if (state.currentRoom) {
        try {
          const { room } = await api.getRoom(state.currentRoom.id);
          state.currentRoom = room;
          syncCurrentView();
        } catch {}
      }
    }
  });

  qs('#logout-btn').addEventListener('click', async () => {
    if (state.currentRoom) {
      try {
        await api.leaveRoom(state.currentRoom.id);
      } catch {}
    }
    clearInterval(syncInterval);
    clearInterval(timerInterval);
    clearSession();
    renderHeader();
    showScreen('screen-auth');
  });
}

document.addEventListener('DOMContentLoaded', initApp);
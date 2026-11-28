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
import { initChat, refreshChat } from './chat.js';

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

async function handleKickPlayer(targetId) {
  if (!state.currentRoom) return;
  return safe(async () => {
    const { room } = await api.kickPlayer(state.currentRoom.id, targetId);
    state.currentRoom = room;
    syncCurrentView();
  });
}

function handleJoinRoom(roomId) {
  return safe(async () => {
    const { room } = await api.joinRoom(roomId);
    state.currentRoom = room;
    syncCurrentView();
  });
}

function syncCurrentView() {
  const room = state.currentRoom;
  if (!room) return;

  if (room.status === 'WAITING') {
    showScreen('screen-waiting');
    renderWaitingRoom(room, handleKickPlayer);
  } else {
    showScreen('screen-game');
    renderGameRoom(room, handleSelectTarget);
  }
}

let lastRoomsJson = '';

async function refreshLobby() {
  try {
    const { rooms } = await api.getRooms();
    const nextRoomsJson = JSON.stringify(rooms);
    if (nextRoomsJson === lastRoomsJson) return;

    lastRoomsJson = nextRoomsJson;
    renderRoomsList(rooms, handleJoinRoom);
  } catch (err) {
    console.error('Ошибка обновления лобби:', err);
  }
}

function startPolling() {
  if (syncInterval) clearInterval(syncInterval);

  let pollBusy = false;

  syncInterval = setInterval(async () => {
    if (!state.token || pollBusy) return;
    pollBusy = true;
    try {
      if (state.currentRoom) {
        const roomId = state.currentRoom.id;
        const prevPhase = state.currentRoom.phase;
        const { room } = await api.getRoom(roomId);

        if (room.phase !== prevPhase) {
          state.selectedTargetId = null;
          state.actionSubmitted = false;
        }
        
        if (state.currentRoom?.id !== roomId) return;

        const stillInRoom = room.players.some((p) => p.id === state.user?.id && !p.isLeft);
        if (!stillInRoom) {
          state.currentRoom = null;
          alert('Вы были исключены из комнаты')
          showScreen('screen-lobby');
          await refreshLobby();
          return;
        }

        if (room.status !== 'WAITING') {
          try {
            await refreshChat(room);
          } catch (e) {
            if (e.status === 401 || e.status === 404) throw e;
          }
        }

        if (JSON.stringify(room) === JSON.stringify(state.currentRoom)) {
          return;
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
    } finally {
      pollBusy = false;
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
  initChat();

  qs('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = qs('#auth-username').value.trim();
    const errorEl = qs('#auth-error');
    errorEl.textContent = '';

    try {
      const { token, user } = await api.register(username);
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

  let modalMode = 'create';
  const createModal = qs('#create-room-modal');
  const modalTitle = qs('#room-modal-title');
  const modalSubmitBtn = qs('#room-modal-submit-btn');

  const openCreateModal = () => {
    modalMode = 'create';
    modalTitle.textContent = 'Создание комнаты';
    modalSubmitBtn.textContent = 'Создать комнату';

    qs('#room-name-input').value = '';
    maxPlayersSelect.value = '12';
    qs('#setting-day-duration').value = '90';
    qs('#setting-night-duration').value = '45';
    qs('#setting-enable-mistress').checked = true;
    qs('#setting-enable-maniac').checked = true;

    updateRoleSettingsVisibility();
    createModal.classList.remove('hidden');
    qs('#room-name-input').focus();
  };

  const openEditModal = () => {
    if (!state.currentRoom) return;
    modalMode = 'edit';
    modalTitle.textContent = 'Настройки комнаты';
    modalSubmitBtn.textContent = 'Сохранить';

    const s = state.currentRoom.settings || {};
    qs('#room-name-input').value = state.currentRoom.name || '';
    maxPlayersSelect.value = String(s.maxPlayers || 12);
    qs('#setting-day-duration').value = String(s.dayDurationSec || 90);
    qs('#setting-night-duration').value = String(s.nightDurationSec || 45);
    qs('#setting-enable-mistress').checked = s.enableMistress !== false;
    qs('#setting-enable-maniac').checked = s.enableManiac !== false;
    updateRoleSettingsVisibility();
    createModal.classList.remove('hidden');
  };

  const closeModal = () => createModal.classList.add('hidden');

  qs('#open-create-modal-btn').addEventListener('click', openCreateModal);
  qs('#edit-room-settings-btn').addEventListener('click', openEditModal);
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

    if (
      modalMode === 'edit' &&
      state.currentRoom &&
      state.currentRoom.players.length > settings.maxPlayers
    ) {
      alert(`В комнате уже ${state.currentRoom.players.length} игроков, выберите больший размер`);
      return;
    }

    try {
      let res;
      if (modalMode === 'edit') {
        if (!state.currentRoom) {closeModal(); return;}
        res = await api.updateRoomSettings(state.currentRoom.id, name, settings);
      } else {
        res = await api.createRoom(name, settings);
      }

      input.value = '';
      closeModal();
      state.currentRoom = res.room;
      syncCurrentView();
    } catch (err) {
      alert(err.message);
      if (modalMode === 'edit') closeModal();
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
      state.selectedTargetId = null;
      state.actionSubmitted = false;
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

    try { 
      await api.logout(); 
    } catch {}

    lastRoomsJson = '';
    
    clearInterval(syncInterval);
    clearInterval(timerInterval);
    clearSession();
    renderHeader();
    showScreen('screen-auth');
  });

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
      if (err.status === 401) clearSession();
      renderHeader();
      showScreen('screen-auth');
      if (err.status !== 401) 
          qs('#auth-error').textContent = 'Сервер недоступен, попробуйте позже';
    }
  } else {
    renderHeader();
    showScreen('screen-auth');
  }
}

document.addEventListener('DOMContentLoaded', initApp);
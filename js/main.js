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
  renderRoomsList(rooms, async (roomId) => {
    const { room } = await api.joinRoom(roomId);
    state.currentRoom = room;
    syncCurrentView();
  });
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
    } catch {
      clearSession();
      showScreen('screen-auth');
    }
  } else {
    showScreen('screen-auth');
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

  qs('#create-room-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = qs('#room-name-input');
    const name = input.value.trim();
    if (!name) return;

    const { room } = await api.createRoom(name);
    input.value = '';
    state.currentRoom = room;
    syncCurrentView();
  });

  qs('#leave-room-btn').addEventListener('click', async () => {
    if (!state.currentRoom) return;
    await api.leaveRoom(state.currentRoom.id);
    state.currentRoom = null;
    showScreen('screen-lobby');
    await refreshLobby();
  });

  qs('#exit-game-btn').addEventListener('click', async () => {
    if (!state.currentRoom) return;
    await api.leaveRoom(state.currentRoom.id);
    state.currentRoom = null;
    state.selectedTargetId = null;
    state.actionSubmitted = false;
    showScreen('screen-lobby');
    await refreshLobby();
  });

  qs('#add-bot-btn').addEventListener('click', async () => {
    if (!state.currentRoom) return;
    const { room } = await api.addBot(state.currentRoom.id);
    state.currentRoom = room;
    syncCurrentView();
  });

  qs('#start-game-btn').addEventListener('click', async () => {
    if (!state.currentRoom) return;
    const { room } = await api.startGame(state.currentRoom.id);
    state.currentRoom = room;
    syncCurrentView();
  });

  qs('#restart-game-btn').addEventListener('click', async () => {
    if (!state.currentRoom) return;
    const { room } = await api.restartGame(state.currentRoom.id);
    state.currentRoom = room;
    state.selectedTargetId = null;
    state.actionSubmitted = false;
    syncCurrentView();
  });

  qs('#confirm-action-btn').addEventListener('click', async () => {
    if (!state.currentRoom || !state.selectedTargetId) return;
    await api.sendAction(state.currentRoom.id, state.selectedTargetId);
    state.actionSubmitted = true;
    renderGameRoom(state.currentRoom, handleSelectTarget);
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
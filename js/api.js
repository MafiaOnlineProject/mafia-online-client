import { API_BASE_URL } from './config.js';
import { state } from './state.js';

async function request(endpoint, option = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...option,
    headers: { ...headers, ...(option.headers || {}) }
  });

  const data = await res.json().catch(() => ({}));
  if(!res.ok) {
    const err = new Error(data.error || 'Ошибка запроса');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  if (data.serverTime) {
    state.clockOffset = data.serverTime - Date.now();
  }
  
  return data;
}

export const api = {
  auth: (mode, username, password) =>
    request(`/auth/${mode}`, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  getMe: () => request('/me'),
  getRooms: () => request('/rooms'),
  createRoom: (name, settings) =>
    request('/rooms', {
      method: 'POST',
      body: JSON.stringify({ name, settings })
    }),
  joinRoom: (roomId) => request(`/rooms/${roomId}/join`, { method: 'POST' }),
  leaveRoom: (roomId) => request(`/rooms/${roomId}/leave`, { method: 'POST' }),
  getRoom: (roomId) => request(`/rooms/${roomId}`),
  addBot: (roomId) => request(`/rooms/${roomId}/add-bot`, { method: 'POST' }),
  kickPlayer: (roomId, targetId) =>
    request(`/rooms/${roomId}/kick`, {
      method: 'POST',
      body: JSON.stringify({ targetId })
    }),
  updateRoomSettings: (roomId, name, settings) =>
    request(`/rooms/${roomId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify({ name, settings })
    }),
  startGame: (roomId) => request(`/rooms/${roomId}/start`, { method: 'POST' }),
  restartGame: (roomId) => request(`/rooms/${roomId}/restart`, { method: 'POST' }),
  sendAction: (roomId, targetId) =>
    request(`/rooms/${roomId}/action`, {
      method: 'POST',
      body: JSON.stringify({ targetId })
    })
};
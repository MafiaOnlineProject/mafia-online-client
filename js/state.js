const STORAGE_KEY = 'mafia_session';

export const state = {
  token: null,
  user: null, // { id, username }
  currentRoom: null, // полный объект комнаты с сервера
  selectedTargetId: null, // кого игрок выбрал кликом по карточке
  actionSubmitted: false, // флаг, что ход в текущей фазе уже отправлен
  clockOffset: 0
};

export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.token = parsed.token || null;
    state.user = parsed.user || null;
  } catch {
    clearSession();
  }
}

export function saveSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
}

export function clearSession() {
  state.token = null;
  state.user = null;
  state.currentRoom = null;
  state.selectedTargetId = null;
  state.actionSubmitted = false;
  localStorage.removeItem(STORAGE_KEY);
}
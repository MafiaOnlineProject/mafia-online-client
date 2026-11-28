import { qs } from './domHelpers.js';
import { state } from './state.js';
import { api } from './api.js';
import { renderChronicle } from './ui.js';

const MAX_CLIENT_MESSAGES = 300;

function ensureChat(roomId) {
  if (!state.chat || state.chat.roomId !== roomId) {
    state.chat = { roomId, lastId: 0, scope: '', messages: [] };
  }
  return state.chat;
}

export async function refreshChat(room) {
  const chat = ensureChat(room.id);
  const data = await api.getMessages(room.id, chat.lastId, chat.scope);
  if (state.chat !== chat) return;

  let changed = false;

  if (data.scope !== chat.scope) {
    chat.scope = data.scope;
    chat.messages = data.messages;
    chat.lastId = data.messages.length ? data.messages[data.messages.length - 1].id : 0;
    changed = true;
  } else {
    const fresh = data.messages.filter((m) => m.id > chat.lastId);
    if (fresh.length) {
      chat.messages = chat.messages.concat(fresh).slice(-MAX_CLIENT_MESSAGES);
      chat.lastId = fresh[fresh.length - 1].id;
      changed = true;
    }
  }

  if (changed && state.currentRoom?.id === room.id) {
    renderChronicle(state.currentRoom);
  }
}

export function initChat() {
  const form = qs('#chat-form');
  const input = qs('#chat-input');
  const btn = qs('#chat-send-btn');
  const errorEl = qs('#chat-error');
  let errorTimer = null;

  const showError = (msg) => {
    errorEl.textContent = msg;
    clearTimeout(errorTimer);
    errorTimer = setTimeout(() => { errorEl.textContent = ''; }, 3000);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const room = state.currentRoom;
    const text = input.value.trim();
    if (!room || !text || !room.chatChannel) return;

    btn.disabled = true;
    try {
      await api.sendMessage(room.id, text);
      input.value = '';
      await refreshChat(room);
    } catch (err) {
      showError(err.message || 'Не удалось отправить');
    } finally {
      btn.disabled = !state.currentRoom?.chatChannel;
      input.focus();
    }
  });
}
import { qs, qsa, createEl, clearEl } from './domHelpers.js';
import { ROLES, PHASES } from './config.js';
import { state } from './state.js';

export function showScreen(screenId) {
  qsa('.screen').forEach((sec) => sec.classList.add('hidden'));
  const target = qs(`#${screenId}`);
  if (target) target.classList.remove('hidden');
}

export function renderHeader() {
  const badge = qs('#user-badge');
  const usernameEl = qs('#header-username');

  if (state.user) {
    usernameEl.textContent = state.user.username;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

export function renderRoomsList(rooms, onJoinRoom) {
  const container = qs('#rooms-list');
  clearEl(container);

  if (!rooms.length) {
    container.appendChild(
      createEl('p', {className: 'subtitle', text: 'Активных комнат пока нет. Создайте первую!'})
    );
    return;
  }

  rooms.forEach((room) => {
    const joinBtn = createEl('button', {
      className: 'btn btn-primary btn-small',
      text: room.status === 'WAITING' ? 'Войти' : 'Идёт игра'
    });
    if (room.status !== 'WAITING') joinBtn.disabled = true;
    joinBtn.addEventListener('click', () => onJoinRoom(room.id));

    const card = createEl('div', {
      className: 'card',
      children: [
        createEl('h3', {text: room.name}),
        createEl('p', {
          className: 'subtitle',
          text: `Код: ${room.code} ::|:: Игроков: ${room.playerCount}/12`
        }),
        joinBtn
      ]
    });

    container.appendChild(card);
  });
}

export function renderWaitingRoom(room) {
  qs('#waiting-room-title').textContent = room.name;
  qs('#waiting-room-code').textContent = room.code;
  qs('#waiting-count').textContent = String(room.players.length);

  const list = qs('#waiting-players-list');
  clearEl(list);

  room.players.forEach((player) => {
    const isHost = player.id === room.hostId;
    const li = createEl('li', {
      children: [
        createEl('span', {text: player.username}),
        createEl('span', {
          className: 'badge',
          text: isHost ? 'Создатель' : 'Готов'
        })
      ]
    });
    list.appendChild(li);
  });

  const hostControls = qs('#host-controls');
  const startBtn = qs('#start-game-btn');
  if (state.user && room.hostId === state.user.id) {
    hostControls.classList.remove('hidden');
    startBtn.disabled = room.players.length < 4;
  } else {
    hostControls.classList.add('hidden');
  }
}

export function updateTimerDisplay(phaseEndsAt) {
  const timerEl = qs('#game-timer');
  if (!timerEl) return;
  if (!phaseEndsAt) {
    timerEl.textContent = '--:--';
    return;
  }
  const remainingSec = Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000));
  const mins = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const secs = String(remainingSec % 60).padStart(2, '0');
  timerEl.textContent = `${mins}:${secs}`;
}

export function renderGameRoom(room, onSelectTarget) {
  const phaseCfg = PHASES[room.phase] || PHASES.WAITING;
  const me = room.players.find((p) => p.id === state.user?.id);

  qs('#game-day-counter').textContent = `День ${room.dayNumber || 1}`;
  qs('#game-phase-title').textContent = phaseCfg.title;

  updateTimerDisplay(room.phaseEndsAt);
  let bannerText = room.lastAnnouncement || phaseCfg.banner;
  if (
    room.detectiveReport &&
    me &&
    room.detectiveReport.detectiveId === me.id &&
    room.phase === 'DAY_VOTING'
  ) {
    bannerText += `\n[Лично для Детектива]: ${room.detectiveReport.message}`;
  }
  qs('#narrator-banner').textContent = bannerText;

  const myRoleObj = me?.role ? ROLES[me.role] : null;
  qs('#my-role-name').textContent = myRoleObj ? myRoleObj.name : 'Неизвестно';

  const canAct = Boolean(
    me &&
    me.isAlive &&
    !state.actionSubmitted &&
    (phaseCfg.activeRole === 'ALL' || phaseCfg.activeRole === me.role)
  );

  const table = qs('#game-table');
  clearEl(table);

  room.players.forEach((player) => {
    const isSelected = state.selectedTargetId === player.id;
    const seatClasses = ['player-seat'];
    if (!player.isAlive) seatClasses.push('dead');
    if (isSelected) seatClasses.push('selected');

    const statusText = !player.isAlive
      ? `Выбыл (${ROLES[player.role]?.name || 'Роль скрыта'})`
      : player.id === me?.id
        ? 'Это вы'
        : 'В игре';

    const seat = createEl('div', {
      className: seatClasses.join(' '),
      dataset: {playerId: String(player.id)},
      children: [
        createEl('div', {
          className: 'avatar',
          text: player.username.slice(0, 2).toUpperCase()
        }),
        createEl('strong', {text: player.username}),
        createEl('span', {className: 'status-label', text: statusText})
      ]
    });

    if (canAct && player.isAlive) {
      seat.addEventListener('click', () => onSelectTarget(player.id));
    }

    table.appendChild(seat);
  });

  const actionPanel = qs('#action-panel');
  const confirmBtn = qs('#confirm-action-btn');
  if (canAct) {
    actionPanel.classList.remove('hidden');
    qs('#action-prompt').textContent = phaseCfg.prompt;
    confirmBtn.disabled = !state.selectedTargetId;
  } else {
    actionPanel.classList.add('hidden');
  }
}

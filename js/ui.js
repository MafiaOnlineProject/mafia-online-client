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
          text: `Код: ${room.code} :|: Игроков: ${room.playerCount}/${room.maxPlayers || 12}`
        }),
        joinBtn
      ]
    });

    container.appendChild(card);
  });
}

export function renderWaitingRoom(room) {
  const settings = room.settings || {
    maxPlayers: 12,
    dayDurationSec: 90,
    nightDurationSec: 45,
    enableMistress: true,
    enableManiac: true
  };
  const maxPlayers = settings.maxPlayers;

  qs('#waiting-room-title').textContent = room.name;
  qs('#waiting-room-code').textContent = room.code;
  qs('#waiting-count').textContent = room.players.length;
  qs('#waiting-max-count').textContent = maxPlayers;

  const settingsInfo = qs('#waiting-room-settings');
  if (settingsInfo) {
    const rolesInfo = [
      settings.enableMistress ? 'Любовница: вкл' : 'Любовница: выкл',
      settings.enableManiac ? 'Маньяк: вкл' : 'Маньяк: выкл (3-я Мафия)'
    ].join(' :|: ');
    settingsInfo.textContent = `День: ${settings.dayDurationSec}с :|: Ночь: ${settings.nightDurationSec}с :|: ${rolesInfo}`;
  }

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

  const isHost = room.hostId === state.user?.id;
  const hostControls = qs('#host-controls');
  const addBotBtn = qs('#add-bot-btn');
  const startBtn = qs('#start-game-btn');

  if (isHost) {
    hostControls.classList.remove('hidden');
    startBtn.disabled = room.players.length < 4;
    if (addBotBtn) addBotBtn.disabled = room.players.length >= maxPlayers;
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
  const nowOnServer = Date.now() + (state.clockOffset || 0);
  const remainingSec = Math.max(0, Math.ceil((phaseEndsAt - nowOnServer) / 1000));
  const mins = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const secs = String(remainingSec % 60).padStart(2, '0');
  timerEl.textContent = `${mins}:${secs}`;
}

export function renderGameRoom(room, onSelectTarget) {
  const phaseCfg = PHASES[room.phase] || PHASES.WAITING;
  const me = room.players.find((p) => p.id === state.user?.id);
  const savedTargetId = room.phase === 'DAY_VOTING' ? room.dayVotes?.[me?.id] : null;
  const isGameOver = room.phase === 'GAME_OVER';

  qs('#game-day-counter').textContent = `День ${room.dayNumber || 1}`;
  qs('#game-phase-title').textContent = phaseCfg.title;

  updateTimerDisplay(room.phaseEndsAt);

  let bannerText = room.lastAnnouncement || phaseCfg.banner;

  if (!room.lastAnnouncement && room.phase === 'NIGHT_DOCTOR') {
    const hasAliveMistress = room.players.some((p) => p.isAlive && p.role === 'MISTRESS');
    if (!hasAliveMistress) {
      bannerText = 'Город засыпает. Просыпается Доктор и решает, кого спасти...';
    }
  }

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

  const activeBoss = room.players.find((p) => p.isAlive && p.role === 'MAFIA_BOSS');
  const activeShooter = activeBoss || room.players.find((p) => p.isAlive && p.role === 'MAFIA');

  let alreadyActedOnServer = false;
  if (me) {
    if (room.phase === 'DAY_VOTING') {
      alreadyActedOnServer = Boolean(room.dayVotes && room.dayVotes[me.id]);
    } else if (room.phase === 'NIGHT_MISTRESS') {
      alreadyActedOnServer = Boolean(room.nightActions?.MISTRESS);
    } else if (room.phase === 'NIGHT_DOCTOR') {
      alreadyActedOnServer = Boolean(room.nightActions?.DOCTOR);
    } else if (room.phase === 'NIGHT_MAFIA') {
      alreadyActedOnServer = Boolean(room.nightActions?.MAFIA);
    } else if (room.phase === 'NIGHT_MANIAC') {
      alreadyActedOnServer = Boolean(room.nightActions?.MANIAC);
    } else if (room.phase === 'NIGHT_DETECTIVE') {
      alreadyActedOnServer = Boolean(room.nightActions?.DETECTIVE);
    }
  }

  const hasSubmitted = state.actionSubmitted || alreadyActedOnServer;

  let isMyTurn = false;
  if (me && me.isAlive && !isGameOver && !hasSubmitted) {
    if (phaseCfg.activeRole === 'ALL') {
      isMyTurn = true;
    } else if (room.phase === 'NIGHT_MAFIA') {
      isMyTurn = activeShooter?.id === me.id;
    } else {
      isMyTurn = phaseCfg.activeRole === me.role;
    }
  }

  const table = qs('#game-table');
  clearEl(table);

  room.players.forEach((player) => {
    const isMe = player.id === me?.id;
    const isMafiaAlly =
      (me?.role === 'MAFIA_BOSS' || me?.role === 'MAFIA') &&
      (player.role === 'MAFIA_BOSS' || player.role === 'MAFIA');
    const isSelected = (state.selectedTargetId || savedTargetId) === player.id;
    
    const seatClasses = ['player-seat'];
    if (!player.isAlive) seatClasses.push('dead');
    if (isSelected) seatClasses.push('selected');

    const hasAlibi = room.phase === 'DAY_VOTING' && room.dayAlibiId === player.id;
    const isRepeatedTarget =
      (room.phase === 'NIGHT_MISTRESS' && room.lastTargets?.MISTRESS === player.id) ||
      (room.phase === 'NIGHT_DOCTOR' && room.lastTargets?.DOCTOR === player.id);

    let statusText = 'В игре';
    if (isGameOver || !player.isAlive) {
      statusText = `${player.isAlive ? 'Выжил' : 'Выбыл'} (${ROLES[player.role]?.name || 'Роль скрыта'})`;
    } else if (hasAlibi) {
      statusText = 'Алиби (нельзя голосовать)';
    } else if (isRepeatedTarget && isMyTurn) {
      statusText = 'Выбран прошлой ночью';
    } else if (isMe) {
      statusText = 'Это вы';
    } else if (isMafiaAlly) {
      statusText = 'Союзник (Мафия)';
    }

    const seat = createEl('div', {
      className: seatClasses.join(' '),
      dataset: { playerId: String(player.id) },
      children: [
        createEl('div', {
          className: 'avatar',
          text: player.username.slice(0, 2).toUpperCase()
        }),
        createEl('strong', { text: player.username }),
        createEl('span', { className: 'status-label', text: statusText })
      ]
    });

    const canSelectSelf = room.phase === 'NIGHT_DOCTOR';
    const isValidTarget =
      player.isAlive &&
      (canSelectSelf || !isMe) &&
      !(room.phase === 'NIGHT_MAFIA' && isMafiaAlly) &&
      !hasAlibi &&
      !isRepeatedTarget;

    if (isMyTurn && isValidTarget) {
      seat.addEventListener('click', () => onSelectTarget(player.id));
    }

    table.appendChild(seat);
  });

  const actionPanel = qs('#action-panel');
  const confirmBtn = qs('#confirm-action-btn');
  if (isMyTurn) {
    actionPanel.classList.remove('hidden');
    qs('#action-prompt').textContent = phaseCfg.prompt;
    confirmBtn.disabled = !state.selectedTargetId;
  } else {
    actionPanel.classList.add('hidden');
  }

  const gameOverPanel = qs('#game-over-panel');
  const restartBtn = qs('#restart-game-btn');
  if (isGameOver) {
    gameOverPanel.classList.remove('hidden');
    restartBtn.classList.toggle('hidden', room.hostId !== state.user?.id);
  } else {
    gameOverPanel.classList.add('hidden');
  }
}

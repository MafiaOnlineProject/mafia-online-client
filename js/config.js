export const API_BASE_URL = 'https://mafiaonline-limtfx.msk1.amvera.tech/api';

export const ROLES = {
  CIVILIAN: { id: 'CIVILIAN', name: 'Мирный житель', team: 'town' },
  MAFIA_BOSS: { id: 'MAFIA_BOSS', name: 'Босс Мафии', team: 'mafia' },
  MAFIA: { id: 'MAFIA', name: 'Мафия', team: 'mafia' },
  MANIAC: { id: 'MANIAC', name: 'Маньяк', team: 'solo' },
  MISTRESS: { id: 'MISTRESS', name: 'Любовница', team: 'town' },
  DOCTOR: { id: 'DOCTOR', name: 'Доктор', team: 'town' },
  DETECTIVE: { id: 'DETECTIVE', name: 'Детектив', team: 'town' }
};

export const DEFAULT_ROOM_SETTINGS = {
  maxPlayers: 12,
  dayDurationSec: 90,
  nightDurationSec: 45,
  enableMistress: true,
  enableManiac: true
};

export const PLAYER_COLORS = [
  '#fc2b5f', '#9f4aff', '#3964ff', '#ffe600',
  '#019915', '#f86605', '#50005f', '#684721',
  '#178f89', '#00d0ff', '#b1b1b1', '#96ff59',
  '#ff5fcf', '#570000', '#013b01', '#000050'
];

export const PHASES = {
  WAITING: {
    id: 'WAITING',
    title: 'Ожидание игроков',
    banner: 'Ожидаем, пока все игроки подключатся к комнате...'
  },
  NIGHT_MISTRESS: {
    id: 'NIGHT_MISTRESS',
    title: 'Ночь: Ход Любовницы',
    banner: 'Просыпается Любовница и выбирает, к кому пойти в гости...',
    activeRole: 'MISTRESS',
    actionKey: 'MISTRESS',
    prompt: 'Выберите игрока, чтобы заблокировать его способность на эту ночь:'
  },
  NIGHT_DOCTOR: {
    id: 'NIGHT_DOCTOR',
    title: 'Ночь: Ход Доктора',
    banner: 'Просыпается Доктор и решает, кого спасти...',
    activeRole: 'DOCTOR',
    actionKey: 'DOCTOR',
    prompt: 'Выберите игрока, которого хотите вылечить:'
  },
  NIGHT_MAFIA: {
    id: 'NIGHT_MAFIA',
    title: 'Ночь: Ход Мафии',
    banner: 'Просыпается Мафия и выходит на охоту...',
    activeRole: ['MAFIA_BOSS', 'MAFIA'],
    actionKey: 'MAFIA',
    prompt: 'Выберите жертву на эту ночь:'
  },
  NIGHT_MANIAC: {
    id: 'NIGHT_MANIAC',
    title: 'Ночь: Ход Маньяка',
    banner: 'На охоту выходит Маньяк...',
    activeRole: 'MANIAC',
    actionKey: 'MANIAC',
    prompt: 'Выберите жертву на эту ночь:'
  },
  NIGHT_DETECTIVE: {
    id: 'NIGHT_DETECTIVE',
    title: 'Ночь: Ход Детектива',
    banner: 'Просыпается Детектив и ищет преступников...',
    activeRole: 'DETECTIVE',
    actionKey: 'DETECTIVE',
    prompt: 'Выберите игрока для проверки его роли:'
  },
  DAY_VOTING: {
    id: 'DAY_VOTING',
    title: 'День: Обсуждение и голосование',
    banner: 'Город просыпается! Обсудите события ночи и проголосуйте против подозреваемого.',
    activeRole: 'ALL',
    prompt: 'Проголосуйте за исключение игрока из города:'
  },
  DAY_RESULTS: {
    id: 'DAY_RESULTS',
    title: 'День: Итоги голосования',
    banner: 'Город подводит итоги голосования...'
  },
  GAME_OVER: {
    id: 'GAME_OVER',
    title: 'Игра окончена',
    banner: 'Партия завершена! Ознакомьтесь с итогами ниже.'
  }
};
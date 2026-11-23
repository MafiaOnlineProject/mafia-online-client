# 🎭 Mafia Online — Frontend

Клиентская часть веб-приложения Mafia Online. Написана на чистом стеке без использования сторонних фреймворков и библиотек для работы с DOM.

## Ссылка на рабочую версию
* **Live Demo:** https://mafiaonlineproject.github.io/mafia-online-client/
* **Backend репозиторий:** https://github.com/LimTFX/mafia-online-server

## Технологии и особенности реализации
* **HTML5 / CSS3:** Адаптивная верстка, CSS Custom Properties (темная тема), CSS Grid / Flexbox.
* **Vanilla JavaScript (ES Modules):** Работа с DOM исключительно нативными методами (`querySelector`, `createElement`, `appendChild`, `classList`, `dataset`, `textContent`, `addEventListener`).
* **Архитектура:** Модульное разделение (`api.js`, `ui.js`, `state.js`, `domHelpers.js`, `config.js`, `main.js`).

## Структура проекта
```text
├── index.html          # Единая точка входа (экраны авторизации, лобби, ожидания и стола)
├── css/                # Модульные стили (reset, variables, layout, components)
└── js/                 # ES-модули логики интерфейса и запросов к API
```

## Запуск локально
1. Склонируйте репозиторий.
2. В файле `js/config.js` убедитесь, что `API_BASE_URL` указывает на локальный (`http://localhost:3000/api`) или удаленный сервер.
3. Запустите папку через любой статический сервер (например, расширение **Live Server** в VS Code или `npx serve .`).

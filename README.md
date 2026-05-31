# HypeSportClub — Web

Веб-кабинет спортивного клуба **HypeSportClub**. Приложение реализует личные кабинеты
четырёх ролей (клиент, тренер, администратор, руководитель), записи на тренировки,
учёт абонементов, мессенджер, дневник питания/БЖУ и финансовый блок руководителя.

Фронтенд написан на **Next.js 14 (Pages Router) + React 18 + TypeScript**, хранилище
данных — **Firebase Firestore**, авторизация — **Firebase Auth**. Серверные операции (сессия,
привилегированная смена пароля, создание сотрудников и т.п.) выполняются через Next.js API-роуты
с использованием Firebase Admin SDK.

Firebase-проект по умолчанию: `hypesportclub-4eb53` (см. `.firebaserc`).

---

## Содержание

- [Возможности](#возможности)
- [Стек технологий](#стек-технологий)
- [Middleware и безопасность](#middleware-и-безопасность)
- [UI и навигация](#ui-и-навигация)
- [Архитектура и структура](#архитектура-и-структура)
- [Модель данных Firestore](#модель-данных-firestore)
- [Изображения и медиа](#изображения-и-медиа)
- [Cloud Functions](#cloud-functions)
- [API-роуты](#api-роуты)
- [Запуск](#запуск)
- [Деплой](#деплой)
- [Полезные сценарии](#полезные-сценарии)

---

## Возможности

### Общее

- Авторизация по email/паролю, разделение по ролям (`CLIENT`, `TRAINER`, `ADMIN`, `MANAGER`).
- Регистрация клиента с анкетой (ФИО, дата рождения, пол, рост, вес, цель) и опциональным выбором тарифа с лендинга (`?plan=basic` и др.).
- Серверная защита SSR-страниц (`requireAuth`, роль читается из Firestore).
- Публичный лендинг (`/`) с секциями hero, features, тарифами и CTA (компоненты в `src/components/landing/`).
- Адаптивный UI (mobile-first) на Tailwind CSS, CSS-переменные бренда, **светлая/тёмная тема** (`ThemeContext`, переключатель в правом нижнем углу).
- Локализация интерфейса (RU/EN) через `LanguageContext` и словарь в `src/lib/i18n/translations.ts`.
- Маски ввода телефона (+7) и даты (ДД.ММ.ГГГГ) — `src/lib/input-masks.ts`.
- CSRF-защита изменяющих запросов к API (`hsc_csrf` cookie + заголовок `X-CSRF-Token`; исключение — `GET`/`HEAD`/`OPTIONS` и эндпоинт сессии).

### Клиент (`/client/...`)

- **Главная** — приветствие, быстрые действия, **сводка БЖУ за сегодня** (из `food_entries`),
  **кликабельные карточки активных абонементов**, **календарь посещений зала**, ближайшие тренировки.
- **Тренировки** — две вкладки:
  - «Мои» — все будущие индивидуальные и групповые тренировки, на которые клиент уже записан;
  - «Запись» с подвкладками «Групповые» и «Индивидуальные»: на групповые можно записаться или отменить запись прямо здесь
    (записанные тренировки не пропадают, рядом отображается бейдж «Вы записаны»),
    на индивидуальные — переход в мастер записи к тренеру.
- **Запись к тренеру (`/client/booking`)** — выбор тренера, просмотр доступных дат и часов,
  мгновенная запись в свободный слот и автоматическое открытие чата с тренером.
- **Абонементы (`/client/subscriptions`)** — мои активные абонементы и каталог доступных шаблонов.
- **Чат (`/client/messages`)** — общение с тренерами: текст, **вложения-фото** (data URL в Firestore),
  редактирование и удаление своих сообщений (редактирование — в течение 12 часов по правилам Firestore).
- **Профиль (`/client/profile`)** — двухуровневое меню:
  - «Профиль» → «Личные данные» / «Здоровье» (ИМТ, цель, аватар);
  - «Мои абонементы» (с кнопкой «Посмотреть все абонементы»);
  - «Тренеры»;
  - «Аккаунт» → «Email» / «Пароль» / «Язык» (RU/EN).
- **Питание и БЖУ (`/client/nutrition`)** — агрегация дневника питания за 7 или 30 дней
  (калории, белки, жиры, углеводы по дням; данные из `food_entries`, обычно заполняются через мобильное приложение).

### Тренер (`/trainer/...`)

- **Расписание (`/trainer/dashboard`)** — ближайшие тренировки на неделю, **редактирование даты, времени и длительности**.
- **Слоты доступности (`/trainer/schedule`)** — управление свободными часами по конкретным датам.
- **Мессенджер (`/trainer/messages`)** — чат с клиентами (те же возможности, что у клиента).
- **Клиенты (`/trainer/clients`)** и **профиль (`/trainer/profile`)** — список клиентов, карточка тренера, аватар.

### Администратор (`/admin/...`)

- **Дашборд (`/admin/dashboard`)** — сводка по клубу.
- **Клиенты (`/admin/clients`)** — фильтрация и поиск, редактирование клиента, **смена пароля клиента**,
  выдача абонементов (с автоматической записью в `revenues`).
- **Тренировки (`/admin/workouts`)** — создание групповых и индивидуальных,
  с возможностью **просмотреть расписание выбранного тренера прямо в форме создания**
  (доступные слоты + уже забронированные часы).
- **Абонементы (`/admin/subscriptions`)** — шаблоны и управление тарифами.
- **Тренеры (`/admin/trainers`)** — управление карточками тренеров.

### Руководитель (`/manager/...`)

- **Обзор (`/manager/dashboard`)**, **финансы** (`/manager/finance`) — расходы (`expenses`) и доходы (`revenues`).
- **Аналитика (`/manager/analytics`)**.
- **Персонал (`/manager/staff`)** — создание учётных записей сотрудников через API `create-user`.
- **Абонементы (`/manager/subscriptions`)** — обзор и контроль тарифов.

---

## Стек технологий

| Категория | Технологии |
|---|---|
| Frontend | Next.js 14 (Pages Router), React 18, TypeScript 5.4 |
| Стили | Tailwind CSS 3.4, CSS-переменные (`--hsc-*`), dark mode через класс `html.dark` |
| Firebase | Firestore, Authentication, Admin SDK, Cloud Functions (`functions/`) |
| Формы | react-hook-form, yup, @hookform/resolvers |
| UI | Headless UI, clsx, DOMPurify |
| Node.js | 20 (Cloud Functions), ≥18 рекомендуется для Next.js |

**Firebase Storage для файлов не используется** — см. [Изображения и медиа](#изображения-и-медиа).

---

## Middleware и безопасность

Корневой **`middleware.ts`** (Edge):

- Ограничение частоты запросов по IP (60 запросов / мин).
- Для небезопасных методов к `/api/*` (кроме исключений) проверка CSRF-согласованности cookie и заголовка.
- Защита зон `/client`, `/trainer`, `/admin`, `/manager`, `/api`: без валидной сессии — редирект на `/auth/login?from=...`.
- Проверка роли для разделов (см. `hasRequiredRole` в `src/lib/auth-server.ts`):
  - `/admin/*` — `admin` (менеджер тоже проходит как admin через расширенный доступ);
  - `/manager/*` — `manager`;
  - `/trainer/*` — `trainer` или `admin`;
  - `/client/*` — `user`, `trainer`, `admin`, `manager`.
- Заголовки **CSP**, **X-Frame-Options**, **X-Content-Type-Options** на ответах для защищённых маршрутов.
- Проброс `x-hsc-user-id`, `x-hsc-user-email`, `x-hsc-user-role` в заголовках запроса для SSR/API.

В веб-слое роль из Firestore маппится так: `CLIENT` → `user`, остальные — в нижнем регистре (`trainer`, `admin`, `manager`).

| Cookie | Назначение |
|---|---|
| `hsc_token` | Firebase ID Token (HttpOnly, до 3 суток) |
| `hsc_role` | Роль из Firestore (сверяется при SSR) |
| `hsc_csrf` | CSRF-токен (доступен JS для заголовка `X-CSRF-Token`) |

Авторизация на SSR: cookie `hsc_token` проверяется через `adminAuth().verifyIdToken`; при создании сессии (`POST /api/auth/session`) роль **всегда** берётся из Firestore, а не из клиента.

---

## UI и навигация

| Роль | Layout | Навигация |
|---|---|---|
| Клиент | `ClientLayout` | Горизонтальная панель сверху (5 разделов) |
| Тренер | `TrainerLayout` | `BottomTabNav` — фиксированная нижняя панель |
| Администратор | `AdminLayout` | `BottomTabNav` — фиксированная нижняя панель |
| Руководитель | `ManagerLayout` | Боковое меню (desktop) / вертикальный список (mobile) |
| Публичные страницы | `PublicLayout` | Без навигации ЛК |

Переключатель темы (`ThemeToggleButton`) отображается глобально; на страницах с нижней панелью смещается над ней.

---

## Архитектура и структура

```
src/
├─ pages/                         # Next.js Pages Router
│  ├─ index.tsx                  # лендинг
│  ├─ auth/login.tsx             # вход / регистрация
│  ├─ client/                    # ЛК клиента
│  ├─ trainer/                   # ЛК тренера
│  ├─ admin/                     # ЛК администратора
│  ├─ manager/                   # ЛК руководителя
│  └─ api/auth/                  # session, update-password, create-user
├─ components/
│  ├─ layout/                    # BaseLayout, *Layout, BottomTabNav, PublicLayout
│  ├─ landing/                   # HeroSection, LandingScrollSnap, Reveal
│  ├─ chat/                      # ChatComposer, ChatMessageBubble, chat-utils
│  ├─ pages/                     # SiteErrorPage
│  └─ ui/                        # Card, Button, Input, Avatar, ThemeToggleButton, …
├─ contexts/
│  ├─ AuthContext.tsx            # Firebase Auth + сессия
│  ├─ LanguageContext.tsx        # RU/EN
│  └─ ThemeContext.tsx           # light/dark
├─ hooks/                        # useAuth, usePermissions
└─ lib/
   ├─ firebase/                  # client/admin SDK, callable Functions
   ├─ i18n/translations.ts       # строки RU/EN
   ├─ validation/auth.ts         # yup-схемы login/register
   ├─ models.ts                   # типы Firestore
   ├─ db.ts                       # слой данных Firestore
   ├─ auth-client.ts              # сессия, CSRF, смена пароля
   ├─ auth-server.ts              # verifyRequestSession, normalizeRole
   ├─ ssr-auth.ts                 # requireAuth для getServerSideProps
   ├─ storage.ts                  # сжатие фото → data URL
   ├─ input-masks.ts              # маски телефона и даты
   └─ user-facing-error.ts        # человекочитаемые ошибки Firebase

middleware.ts                     # Edge: rate limit, CSRF, роли, CSP
functions/                        # Firebase Cloud Functions (Node 20)
firebase.firestore.rules          # правила безопасности Firestore
storage.rules                     # правила Storage (не используется веб-приложением)
```

---

## Модель данных Firestore

| Коллекция | Описание | Ключевые поля |
|---|---|---|
| `users` | Профили (все роли) | `role`, `email`, `phone`, ФИО, `birthDate`, `gender`, `weight`, `height`, `fitnessGoal`, `language`, `photoUrl` |
| `users/{uid}/nutritionHistory` | История BMR-расчётов | `input`, `result`, `createdAt` |
| `subscriptions` | Шаблоны абонементов | `name`, `price`, `durationDays`, `features`, `iconEmoji`, `active` |
| `user_subscriptions` | Выданные абонементы | `userId`, `subscriptionId`, `startDate`, `endDate`, `active`, денормализованные поля шаблона |
| `trainers` | Карточки тренеров | `userId`, `specialization(s)`, `experience`, `pricePerTraining`, `achievements`, `photoUrl` |
| `group_workouts` | Групповые и индивидуальные тренировки | `isIndividual`, `trainerId`, `clientId`, `dateTime`, `participantIds`, `status`, `availabilitySlotId` |
| `trainer_availability` | Слоты доступности по датам | `trainerId`, `date`, `startTime`, `endTime`, `isAvailable` |
| `workout_registrations` | Записи на тренировки (legacy/моб.) | `userId`, … |
| `chats` | Плоская коллекция сообщений | `chatId`, `senderId`, `text`, `imageUrl`, `timestamp`, `isRead`, `editedAt` |
| `food_entries` | Дневник питания | `userId`, `productName`, макросы, `date` |
| `custom_food_products` | Пользовательские продукты БЖУ | `userId`, … |
| `expenses` / `revenues` | Финансы | категория/источник, `amount`, `date` |
| `reviews`, `notifications`, `app_settings` | Отзывы, уведомления, настройки | используются правилами; в веб-UI частично или через Functions |

**Производные сущности** (рассчитываются на клиенте):

- `Chat` — агрегируется из `chats` по `chatId` (`uidA_uidB`, отсортировано);
- `GymVisit` — из `group_workouts`, где клиент в `participantIds` или `clientId`.

Полные типы — в `src/lib/models.ts`, доступ к данным — в `src/lib/db.ts`.

---

## Изображения и медиа

Файлы в **Firebase Storage не загружаются**. Изображения обрабатываются в браузере (`src/lib/storage.ts`):

| Тип | Ограничения | Поле в Firestore |
|---|---|---|
| Аватар | до 200 px, JPEG ~0.82 | `users.photoUrl`, `trainers.photoUrl` |
| Фото в чате | до 1200 px, ≤ ~900 KB | `chats.imageUrl` |

Строки хранятся как **data URL** (`data:image/jpeg;base64,...`). Компонент `Avatar` отображает их через `<img>`; cache-bust (`?t=...`) обрезается перед показом.

В конфиге Firebase может быть указан `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` как часть стандартной инициализации SDK; **`getStorage()` в приложении не используется**.

---

## Cloud Functions

Каталог `functions/` — callable-функции для мобильного клиента и серверной логики. Обёртки в `src/lib/firebase/functions.ts`.

| Функция | Назначение | Доступ |
|---|---|---|
| `calculateBMR` | Расчёт БЖУ (Миффлина-Сан Жеора), запись в `nutritionHistory` | Авторизованный пользователь |
| `bookTraining` | Запись на тренировку (коллекция `trainings` — legacy) | Авторизованный пользователь |
| `processPayment` | Платёж + обновление `balances` | admin, manager |
| `sendNotification` | Запись в `notifications` | staff / user |
| `generateReport` | Метаданные отчёта в `reports` | manager |
| `syncUserData` | Снимок профиля в `userSnapshots` | admin, manager |

> **Примечание:** веб-приложение работает с коллекцией `group_workouts` напрямую через Firestore SDK.
> Для BMR в `db.ts` есть локальный fallback `calculateAndSaveBmr` (тот же алгоритм), если Functions не задеплоены.

Сборка и деплой:

```bash
cd functions && npm install && npm run build
firebase deploy --only functions
```

---

## API-роуты

| Маршрут | Метод | Описание |
|---|---|---|
| `/api/auth/session` | POST | Создание сессии (cookies `hsc_token`, `hsc_role`, `hsc_csrf`) |
| `/api/auth/session` | DELETE | Выход (очистка cookies) |
| `/api/auth/update-password` | POST | Смена пароля клиента (admin/manager) или своего |
| `/api/auth/create-user` | POST | Создание учётной записи сотрудника (admin/manager) |

Все изменяющие запросы (кроме `POST /api/auth/session`) требуют заголовок `X-CSRF-Token`.

---

## Запуск

### Требования

- Node.js ≥ 18
- Аккаунт Firebase с включёнными Auth и Firestore

### Установка

```bash
npm install
```

### Переменные окружения

Создайте `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...   # поле конфигурации; загрузка в Bucket не выполняется
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Admin SDK (серверные эндпоинты и middleware)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Команды

```bash
npm run dev      # dev-сервер → http://localhost:3000
npm run build    # production-сборка
npm run start    # запуск production-сервера
npm run lint     # ESLint (eslint-config-next)
```

---

## Деплой

### Firestore Rules

```bash
firebase deploy --only firestore:rules
```

Правила — в `firebase.firestore.rules`.

### Cloud Functions

```bash
cd functions && npm install && npm run build
firebase deploy --only functions
```

### Storage Rules (опционально)

```bash
firebase deploy --only storage
```

Веб-приложение в Bucket ничего не пишет; `storage.rules` актуален только при отдельном использовании Storage.

### Хостинг Next.js

В `firebase.json` указан статический `hosting.public: "out"`, но приложение использует **SSR** (`getServerSideProps`, API-роуты, middleware). Для production рекомендуется:

- **Vercel**, **Node-сервер** (`npm run build && npm run start`) или аналог с поддержкой Next.js 14;
- Firebase Hosting — только при статическом экспорте (текущая конфигурация не покрывает SSR без доработки).

---

## Полезные сценарии

| Задача | Путь |
|---|---|
| Смена своего пароля | `Профиль → Аккаунт → Пароль` |
| Смена пароля клиента (admin) | `Клиенты → «Пароль»` |
| Запись на групповую | `Тренировки → Запись → Групповые` |
| Запись к тренеру | `Тренировки → Запись → Индивидуальные` или `/client/booking` |
| Расписание тренера (admin) | `Тренировки → создать → «Показать расписание тренера»` |
| Календарь посещений | `Главная` — прокрутка месяцев, зелёная точка = день с тренировками |
| Дневник питания | `/client/nutrition` — сводка за 7/30 дней |
| Регистрация с тарифом | Лендинг → тариф → `/auth/login?mode=register&plan=...` |
| Создание сотрудника | `Персонал` (manager) или через API `create-user` |
| Тёмная тема | Кнопка ☀/🌙 в правом нижнем углу |

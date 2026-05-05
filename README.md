# HypeSportClub — Web

Веб-кабинет спортивного клуба HypeSportClub. Приложение реализует личные кабинеты
четырёх ролей (клиент, тренер, администратор, руководитель), записи на тренировки,
учёт абонементов, мессенджер, дневник питания/БЖУ и финансовый блок руководителя.

Фронтенд написан на **Next.js 14 (Pages Router) + React 18 + TypeScript**, хранилище
данных — **Firebase Firestore**, авторизация — **Firebase Auth**, файлы аватаров —
**Firebase Storage**. Серверные операции (привилегированная смена пароля и т.п.)
выполняются через Next.js API-роуты с использованием Firebase Admin SDK.

---

## Содержание

- [Возможности](#возможности)
- [Стек технологий](#стек-технологий)
- [Архитектура и структура](#архитектура-и-структура)
- [Модель данных Firestore](#модель-данных-firestore)
- [Запуск](#запуск)
- [Деплой Firestore-правил](#деплой-firestore-правил)

---

## Возможности

### Общее
- Авторизация по email/паролю, разделение по ролям (`CLIENT`, `TRAINER`, `ADMIN`, `MANAGER`).
- Серверная защита SSR-страниц (`requireAuth`, роль читается из Firestore).
- Адаптивный UI (mobile-first) на Tailwind CSS, единый layout с верхней навигацией.
- CSRF-защита привилегированных API-роутов (`hsc_csrf` cookie + `X-CSRF-Token`).

### Клиент (`/client/...`)
- **Главная** — приветствие, быстрые действия, **сводка БЖУ** (дневник за сегодня + последний расчёт калорийности),
  **кликабельные карточки активных абонементов**, **календарь посещений зала**, ближайшие тренировки.
- **Тренировки** — две вкладки:
  - «Мои» — все будущие индивидуальные и групповые тренировки, на которые клиент уже записан;
  - «Запись» с подвкладками «Групповые» и «Индивидуальные»: на групповые можно записаться или отменить запись прямо здесь
    (записанные тренировки не пропадают, рядом отображается бейдж «Вы записаны»),
    на индивидуальные — переход в мастер записи к тренеру.
- **Запись к тренеру (`/client/booking`)** — выбор тренера, просмотр доступных дат и часов,
  отправка заявки. На шаге подтверждения — кликабельная кнопка «Назад к расписанию».
- **Абонементы (`/client/subscriptions`)** — мои активные абонементы и каталог доступных шаблонов.
- **Чат (`/client/messages`)** — общение с тренерами, список чатов растягивается на всю высоту панели.
- **Профиль (`/client/profile`)** — двухуровневое меню:
  - «Профиль» → «Личные данные» / «Здоровье»;
  - «Мои абонементы» (с кнопкой «Посмотреть все абонементы»);
  - «Тренеры»;
  - «Аккаунт» → «Email» / «Пароль» / «Язык» (RU/EN).
- **БЖУ-калькулятор** — только просмотр истории расчётов (расчёт выполняется в мобильном приложении через Cloud Function).

### Тренер (`/trainer/...`)
- Расписание собственных тренировок, заявки клиентов, доступность по конкретным датам.
- Отдельный мессенджер с клиентами (`/trainer/messages`), панель растягивается на всю высоту экрана.

### Администратор (`/admin/...`)
- **Пользователи (`/admin/clients`)** — фильтрация и поиск, редактирование клиента, **смена пароля клиента**,
  выдача абонементов (с автоматической записью в `revenues`).
- **Тренировки (`/admin/workouts`)** — создание групповых и индивидуальных,
  с возможностью **просмотреть расписание выбранного тренера прямо в форме создания**
  (доступные слоты + уже забронированные часы).
- Управление абонементами и шаблонами.

### Руководитель (`/manager/...`)
- Финансовый блок: расходы (`expenses`) и доходы (`revenues`).
- Просмотр абонементов и пользователей.

---

## Стек технологий

- **Next.js** 14 (Pages Router), **React** 18, **TypeScript** 5
- **Firebase**: Firestore, Authentication, Storage, Admin SDK (`firebase-admin`), Cloud Functions
- **Tailwind CSS** 3, **clsx**
- **react-hook-form** + **yup** для форм авторизации
- **DOMPurify** для безопасного отображения пользовательского ввода

---

## Архитектура и структура

```
src/
├─ pages/                    # Next.js Pages Router
│  ├─ index.tsx              # лендинг + редиректы по роли
│  ├─ auth/login.tsx         # вход/регистрация
│  ├─ client/                # ЛК клиента (dashboard, training, booking, subscriptions, profile, messages, nutrition)
│  ├─ trainer/               # ЛК тренера (dashboard, requests, messages, schedule)
│  ├─ admin/                 # ЛК администратора (clients, workouts, subscriptions, …)
│  ├─ manager/               # ЛК руководителя (subscriptions, finance, …)
│  └─ api/auth/              # серверные эндпоинты (update-password и т.п.)
├─ components/
│  ├─ layout/                # ClientLayout, TrainerLayout, AdminLayout, BaseLayout
│  └─ ui/                    # Card, Button, Input, Avatar
├─ contexts/AuthContext.tsx  # клиентский провайдер Firebase Auth
├─ hooks/                    # useAuth, usePermissions
└─ lib/
   ├─ firebase/              # инициализация client/admin SDK
   ├─ models.ts              # типы данных Firestore
   ├─ db.ts                  # обращение к Firestore (читает/пишет коллекции)
   ├─ auth-client.ts         # changeOwnPassword, adminChangeUserPassword (через API)
   ├─ auth-server.ts         # нормализация ролей
   ├─ ssr-auth.ts            # requireAuth для getServerSideProps
   └─ storage.ts             # загрузка аватаров
```

Авторизация на сервере: cookie `hsc_token` (Firebase ID Token) проверяется через
`adminAuth().verifyIdToken`, роль читается из документа `users/{uid}` (а не из cookie),
что защищает от подделки роли.

---

## Модель данных Firestore

| Коллекция | Описание | Ключевые поля |
|---|---|---|
| `users` | Профили (все роли) | `role`, `email`, `phone`, `lastName`, `firstName`, `weight`, `height`, `fitnessGoal`, `language` (`ru`/`en`), `photoUrl` |
| `users/{uid}/nutritionHistory` | История BMR-расчётов (заполняется Cloud Function) | `input`, `result`, `createdAt` |
| `subscriptions` | Шаблоны абонементов | `name`, `price`, `durationDays`, `features`, `iconEmoji`, `active` |
| `user_subscriptions` | Купленные абонементы | `userId`, `subscriptionId`, `startDate`, `endDate`, `active`, `orderId` |
| `trainers` | Тренеры (расширенный профиль) | `userId`, `specialization(s)`, `experience`, `pricePerTraining`, `achievements` |
| `group_workouts` | Тренировки (групповые и индивидуальные) | `isIndividual`, `trainerId`, `clientId`, `dateTime`, `participantIds`, `currentParticipants`, `maxParticipants` |
| `trainer_availability` | Слоты доступности **по конкретным датам** | `trainerId`, `date` (YYYY-MM-DD), `startTime`, `endTime`, `isAvailable`, `notes` |
| `training_requests` | Заявки клиентов на индивидуальные тренировки | `clientId`, `trainerId`, `requestedDateTime`, `status` (`pending`/`approved`/`rejected`) |
| `chats` | **Плоская** коллекция сообщений | `chatId` (= отсортированные uid через `_`), `senderId`, `senderName`, `text`, `timestamp`, `isRead` |
| `food_entries` | Дневник питания клиента | `userId`, `productName`, `weightGrams`, `calories`, `proteins`, `fats`, `carbs`, `date` |
| `expenses` | Расходы (руководитель/админ) | `category`, `amount`, `date`, `createdBy` |
| `revenues` | Доходы (руководитель/админ) | `source`, `amount`, `date`, `userId` |

Сущности `Chat` и `GymVisit` — **производные**, рассчитываются на клиенте:
- `Chat` агрегируется из `chats` по `chatId`;
- посещения зала — из `group_workouts`, где клиент в `participantIds` (или `clientId` для индивидуальных).

Полные типы — в `src/lib/models.ts`, доступ к данным — в `src/lib/db.ts`.

---

## Запуск

### Зависимости

```bash
npm install
```

### Переменные окружения

Создайте `.env.local` со значениями Firebase (web SDK + admin SDK):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Admin SDK (для серверных эндпоинтов)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Dev-сервер

```bash
npm run dev
```

Откроется на `http://localhost:3000`.

### Сборка и продакшн

```bash
npm run build
npm run start
```

---

## Деплой Firestore-правил

Правила лежат в `firebase.firestore.rules`. Деплой:

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```

Storage-правила (`storage.rules`) разрешают пользователю писать только в свой
аватар; чтение — публичное.

---

## Полезные сценарии

- **Смена своего пароля (клиент)** — `Профиль → Аккаунт → Пароль`.
- **Смена пароля клиента (админ)** — `Пользователи → кнопка "Пароль"` (ограничена ролью `ADMIN`/`MANAGER`).
- **Запись на групповую** — `Тренировки → Запись → Групповые`. Если уже записан, в этом же списке доступна отмена.
- **Запись к тренеру** — `Тренировки → Запись → Индивидуальные → Записаться к тренеру` или `/client/booking`.
- **Просмотр расписания тренера админом** — `Тренировки → + Групповая/Индивидуальная`,
  выбрать тренера → «Показать расписание тренера».
- **Календарь посещений** — `Главная`, прокрутка месяцев стрелками; зелёная точка отмечает день, в котором были тренировки.

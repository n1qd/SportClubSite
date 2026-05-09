# HypeSportClub — Web

Веб-кабинет спортивного клуба HypeSportClub. Приложение реализует личные кабинеты
четырёх ролей (клиент, тренер, администратор, руководитель), записи на тренировки,
учёт абонементов, мессенджер, дневник питания/БЖУ и финансовый блок руководителя.

Фронтенд написан на **Next.js 14 (Pages Router) + React 18 + TypeScript**, хранилище
данных — **Firebase Firestore**, авторизация — **Firebase Auth**. Серверные операции (сессия,
привилегированная смена пароля, создание пользователя и т.п.) выполняются через Next.js API-роуты
с использованием Firebase Admin SDK.

---

## Содержание

- [Возможности](#возможности)
- [Стек технологий](#стек-технологий)
- [Middleware и безопасность](#middleware-и-безопасность)
- [Архитектура и структура](#архитектура-и-структура)
- [Модель данных Firestore](#модель-данных-firestore)
- [Изображения и аватары](#изображения-и-аватары)
- [Запуск](#запуск)
- [Деплой Firestore-правил](#деплой-firestore-правил)

---

## Возможности

### Общее
- Авторизация по email/паролю, разделение по ролям (`CLIENT`, `TRAINER`, `ADMIN`, `MANAGER`).
- Серверная защита SSR-страниц (`requireAuth`, роль читается из Firestore).
- Публичный лендинг (`/`) с секциями hero/features (компоненты в `src/components/landing/`).
- Адаптивный UI (mobile-first) на Tailwind CSS, единый layout с навигацией по ролям.
- Локализация интерфейса (RU/EN) через `LanguageContext` и словарь в `src/lib/i18n/translations.ts`.
- CSRF-защита изменяющих запросов к API (`hsc_csrf` cookie + заголовок `X-CSRF-Token`; исключение — `GET`/`HEAD`/`OPTIONS` и эндпоинт сессии).

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
- **Питание и БЖУ (`/client/nutrition`)** — просмотр дневника питания и просмотр истории BMR-расчётов (расчёт через Cloud Function в связке с мобильным приложением).

### Тренер (`/trainer/...`)
- Расписание собственных тренировок (`/trainer/dashboard`), заявки клиентов (`/trainer/requests`), доступность по конкретным датам.
- Мессенджер с клиентами (`/trainer/messages`), панель на всю высоту экрана.
- Список клиентов (`/trainer/clients`) и профиль тренера (`/trainer/profile`).

### Администратор (`/admin/...`)
- **Дашборд (`/admin/dashboard`)** — сводка по клубу.
- **Клиенты (`/admin/clients`)** — фильтрация и поиск, редактирование клиента, **смена пароля клиента**,
  выдача абонементов (с автоматической записью в `revenues`).
- **Тренировки (`/admin/workouts`)** — создание групповых и индивидуальных,
  с возможностью **просмотреть расписание выбранного тренера прямо в форме создания**
  (доступные слоты + уже забронированные часы).
- **Абонементы (`/admin/subscriptions`)** и **шаблоны**.
- **Тренеры (`/admin/trainers`)** — управление карточками тренеров.

### Руководитель (`/manager/...`)
- **Обзор (`/manager/dashboard`)**, **финансы** (`/manager/finance`) — расходы (`expenses`) и доходы (`revenues`).
- **Аналитика (`/manager/analytics`)**.
- **Персонал (`/manager/staff`)** — управление сотрудниками (в т.ч. через привилегированные API).
- **Абонементы (`/manager/subscriptions`)** — обзор и контроль тарифов.

---

## Стек технологий

- **Next.js** 14 (Pages Router), **React** 18, **TypeScript** 5.4
- **Firebase**: Firestore, Authentication, Admin SDK (`firebase-admin`), Cloud Functions (в каталоге `functions/`). **Firebase Storage для файлов не используется** — см. [Изображения и аватары](#изображения-и-аватары).
- **Tailwind CSS** 3.4, **clsx**, **Headless UI** (`@headlessui/react`)
- **react-hook-form** + **yup** + **@hookform/resolvers** для форм и авторизации
- **DOMPurify** для безопасного отображения пользовательского ввода

---

## Middleware и безопасность

Корневой **`middleware.ts`** (Edge):

- Ограничение частоты запросов по IP для всех путей.
- Для небезопасных методов к `/api/*` (кроме исключений) проверка CSRF-согласованности cookie и заголовка.
- Защита зон `/client`, `/trainer`, `/admin`, `/manager`, `/api`: без валидной сессии — редирект на `/auth/login`.
- Проверка роли для разделов (например, `/admin/*` только для администратора; см. `hasRequiredRole` в `src/lib/auth-server.ts`).
- Заголовки **CSP**, **X-Frame-Options**, **X-Content-Type-Options** на ответах для защищённых маршрутов.

В веб-слое роль из Firestore маппится так: `CLIENT` → `user`, остальные роли — в нижнем регистре (`trainer`, `admin`, `manager`). Cookie **`hsc_token`** — Firebase ID Token; **`hsc_role`** используется совместно с проверкой токена на сервере.

Авторизация на SSR: cookie `hsc_token` проверяется через `adminAuth().verifyIdToken`, актуальная роль пользователя сверяется с данными в Firestore (`users/{uid}`), что защищает от подделки роли в клиенте.

---

## Архитектура и структура

```
src/
├─ pages/                         # Next.js Pages Router
│  ├─ index.tsx                  # лендинг + редиректы по роли для авторизованных
│  ├─ auth/login.tsx             # вход/регистрация
│  ├─ client/                    # ЛК клиента (dashboard, training, booking, subscriptions, profile, messages, nutrition)
│  ├─ trainer/                   # ЛК тренера (dashboard, requests, messages, clients, profile)
│  ├─ admin/                     # ЛК администратора (dashboard, clients, workouts, subscriptions, trainers)
│  ├─ manager/                   # ЛК руководителя (dashboard, finance, analytics, staff, subscriptions)
│  └─ api/auth/                  # session, update-password, create-user
├─ components/
│  ├─ layout/                    # BaseLayout, ClientLayout, TrainerLayout, AdminLayout, ManagerLayout, PublicLayout
│  ├─ landing/                   # лендинг (HeroSection, ScrollSnap, Reveal)
│  ├─ pages/                     # общие страницы ошибок
│  └─ ui/                        # Card, Button, Input, Avatar
├─ contexts/
│  ├─ AuthContext.tsx            # клиентский провайдер Firebase Auth
│  └─ LanguageContext.tsx        # язык интерфейса
├─ hooks/                        # useAuth, usePermissions
└─ lib/
   ├─ firebase/                   # инициализация client/admin SDK, вызовы Functions
   ├─ i18n/translations.ts      # строки RU/EN
   ├─ models.ts                   # типы данных Firestore
   ├─ db.ts                       # обращение к Firestore
   ├─ auth-client.ts              # сессия, CSRF, смена пароля, вызовы API
   ├─ auth-server.ts              # нормализация ролей, verifyRequestSession
   ├─ ssr-auth.ts                 # requireAuth для getServerSideProps
   └─ storage.ts                  # сжатие фото → JPEG data URL (без Firebase Storage)

middleware.ts                     # Edge: rate limit, CSRF, роли, CSP
functions/                        # Firebase Cloud Functions (в т.ч. BMR)
```

---

## Модель данных Firestore

| Коллекция | Описание | Ключевые поля |
|---|---|---|
| `users` | Профили (все роли) | `role`, `email`, `phone`, `lastName`, `firstName`, `middleName`, `birthDate`, `gender`, `weight`, `height`, `fitnessGoal`, `language` (`ru`/`en`), `photoUrl` (**JPEG data URL**, не ссылка на Storage) |
| `users/{uid}/nutritionHistory` | История BMR-расчётов (заполняется Cloud Function) | `input`, `result`, `createdAt` |
| `subscriptions` | Шаблоны абонементов | `name`, `description`, `price`, `durationDays`, `features`, `iconEmoji`, `active` |
| `user_subscriptions` | Купленные абонементы | `userId`, `subscriptionId`, `startDate`, `endDate`, `active`, `orderId`, денормализованные поля шаблона |
| `trainers` | Тренеры (расширенный профиль) | `userId`, `specialization` / `specializations`, `experience`, `pricePerTraining`, `achievements`, `photoUrl` (как у пользователя — data URL при загрузке из ЛК) |
| `group_workouts` | Тренировки (групповые и индивидуальные) | `isIndividual`, `trainerId`, `clientId`, `dateTime`, `participantIds`, `currentParticipants`, `maxParticipants`, `availabilitySlotId` |
| `trainer_availability` | Слоты доступности **по конкретным датам** | `trainerId`, `date` (YYYY-MM-DD), `startTime`, `endTime`, `isAvailable`, `notes` |
| `training_requests` | Заявки клиентов на индивидуальные тренировки | `clientId`, `trainerId`, `requestedDateTime`, `status` (`pending`/`approved`/`rejected`) |
| `chats` | **Плоская** коллекция сообщений | `chatId` (= отсортированные uid через `_`), `senderId`, `senderName`, `text`, `timestamp`, `isRead` |
| `food_entries` | Дневник питания клиента | `userId`, `productName`, `weightGrams`, `calories`, `proteins`, `fats`, `carbs`, `date` |
| `expenses` | Расходы | `category`, `amount`, `description`, `date`, `createdBy` |
| `revenues` | Доходы | `source`, `amount`, `description`, `date`, `userId` |

Сущности `Chat` и `GymVisit` — **производные**, рассчитываются на клиенте:
- `Chat` агрегируется из `chats` по `chatId`;
- посещения зала — из `group_workouts`, где клиент в `participantIds` (или `clientId` для индивидуальных).

Полные типы — в `src/lib/models.ts`, доступ к данным — в `src/lib/db.ts`.

---

## Изображения и аватары

Файлы в **Firebase Storage не загружаются**. Фото профиля обрабатываются в браузере (`src/lib/storage.ts`): изображение масштабируется (до 200 px по большей стороне), конвертируется в JPEG и кодируется в **data URL** (`data:image/jpeg;base64,...`). Строка сохраняется в Firestore в поле **`photoUrl`** документов **`users`** и **`trainers`** (см. `uploadAvatar` и `updateUserData` / `updateTrainer` в профилях клиента и тренера). Компонент `Avatar` отображает такие строки через `<img src={dataUrl}>`; при необходимости cache-bust (`?t=...`) обрезается перед показом.

В конфиге Firebase по-прежнему может быть указан `storageBucket` (`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`) как часть стандартного объекта инициализации SDK; экспорт **`getStorage()`** в `src/lib/firebase/client.ts` в приложении **не используется**.

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
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...   # поле конфигурации Firebase; загрузка файлов в Bucket приложением не выполняется
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

Приложение по умолчанию доступно по адресу `http://localhost:3000`.

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
```

При необходимости для других клиентов или наследия в репозитории можно деплоить правила Storage:

```bash
firebase deploy --only storage
```

Текущее веб-приложение аватары в Bucket не пишет; файл `storage.rules` и деплой Storage актуальны только если вы используете Firebase Storage отдельно.

---

## Полезные сценарии

- **Смена своего пароля (клиент)** — `Профиль → Аккаунт → Пароль`.
- **Смена пароля клиента (админ)** — `Клиенты → кнопка "Пароль"` (ограничена ролью `ADMIN`/`MANAGER`).
- **Запись на групповую** — `Тренировки → Запись → Групповые`. Если уже записан, в этом же списке доступна отмена.
- **Запись к тренеру** — `Тренировки → Запись → Индивидуальные → Записаться к тренеру` или `/client/booking`.
- **Просмотр расписания тренера админом** — `Тренировки → + Групповая/Индивидуальная`,
  выбрать тренера → «Показать расписание тренера».
- **Календарь посещений** — `Главная`, прокрутка месяцев стрелками; зелёная точка отмечает день, в котором были тренировки.

import type { Language } from "@/lib/models";

// =============================================================================
//  HypeSportClub — словари переводов (ru / en)
//  Используются через хук useTranslation() и компонент LanguageProvider.
// =============================================================================

export type TranslationKeys =
  // Общие
  | "common.loading"
  | "common.save"
  | "common.saving"
  | "common.cancel"
  | "common.back"
  | "common.delete"
  | "common.edit"
  | "common.today"
  | "common.error"
  | "common.success"
  | "common.search"
  | "common.profile"
  | "common.logout"
  | "common.minutes"
  | "common.days"
  | "common.day"
  | "common.from"
  | "common.until"
  | "common.kcal"
  | "common.proteins"
  | "common.fats"
  | "common.carbs"
  | "common.duration"
  | "common.trainer"
  // Навигация клиента
  | "client.nav.home"
  | "client.nav.training"
  | "client.nav.subscriptions"
  | "client.nav.chat"
  | "client.nav.profile"
  // Главная клиента
  | "client.dashboard.title"
  | "client.dashboard.welcome"
  | "client.dashboard.welcomeSubtitle"
  | "client.dashboard.headerSubtitle"
  | "client.dashboard.quickActions"
  | "client.dashboard.btnTraining"
  | "client.dashboard.btnSubscriptions"
  | "client.dashboard.btnProfile"
  | "client.dashboard.btnNutrition"
  | "client.dashboard.bjuSummary"
  | "client.dashboard.bjuMore"
  | "client.dashboard.todayDiary"
  | "client.dashboard.avgDaily"
  | "client.dashboard.basedOnDays"
  | "client.dashboard.noFoodToday"
  | "client.dashboard.noFoodHistory"
  | "client.dashboard.proteins"
  | "client.dashboard.fats"
  | "client.dashboard.carbs"
  | "client.dashboard.kcal"
  | "client.dashboard.mySubs"
  | "client.dashboard.allSubs"
  | "client.dashboard.noActiveSubs"
  | "client.dashboard.visitsCalendar"
  | "client.dashboard.upcomingWorkouts"
  | "client.dashboard.upcomingWorkoutsSubtitle"
  | "client.dashboard.noUpcoming"
  | "client.dashboard.allTrainings"
  | "client.dashboard.trainer"
  | "client.dashboard.individualWorkout"
  // Тренировки
  | "client.training.title"
  | "client.training.intro"
  | "client.training.tabMy"
  | "client.training.tabBook"
  | "client.training.subTabGroup"
  | "client.training.subTabIndividual"
  | "client.training.upcoming"
  | "client.training.noUpcoming"
  | "client.training.individualHeader"
  | "client.training.individualIntro"
  | "client.training.bookTrainer"
  | "client.training.myRequests"
  | "client.training.groupHeader"
  | "client.training.groupEmpty"
  | "client.training.signedUp"
  | "client.training.cancel"
  | "client.training.cancelling"
  | "client.training.signUp"
  | "client.training.signingUp"
  | "client.training.full"
  | "client.training.participants"
  | "client.training.individualWorkout"
  | "client.training.loadFailed"
  | "client.training.loading"
  // Запись
  | "client.booking.title"
  | "client.booking.individualHeader"
  | "client.booking.intro"
  | "client.booking.myRequests"
  | "client.booking.step1"
  | "client.booking.step2"
  | "client.booking.step3"
  | "client.booking.selectTrainer"
  | "client.booking.noTrainers"
  | "client.booking.perTraining"
  | "client.booking.experience"
  | "client.booking.years"
  | "client.booking.scheduleHeader"
  | "client.booking.noSlots"
  | "client.booking.scheduleHint"
  | "client.booking.free"
  | "client.booking.noFreeHours"
  | "client.booking.confirmHeader"
  | "client.booking.backToSchedule"
  | "client.booking.trainer"
  | "client.booking.specialization"
  | "client.booking.dateTime"
  | "client.booking.duration"
  | "client.booking.price"
  | "client.booking.commentLabel"
  | "client.booking.commentPlaceholder"
  | "client.booking.toSchedule"
  | "client.booking.submit"
  | "client.booking.submitting"
  | "client.booking.success"
  | "client.booking.requestsHeader"
  | "client.booking.noRequests"
  | "client.booking.newRequest"
  | "client.booking.statusPending"
  | "client.booking.statusApproved"
  | "client.booking.statusRejected"
  | "client.booking.loadFailed"
  | "client.booking.loading"
  | "client.booking.slotPast"
  // Абонементы
  | "client.subs.title"
  | "client.subs.myActive"
  | "client.subs.noneTitle"
  | "client.subs.choose"
  | "client.subs.available"
  | "client.subs.adminHint"
  | "client.subs.daysFew"
  | "client.subs.daysMany"
  | "client.subs.daysOne"
  | "client.subs.fromDate"
  | "client.subs.untilDate"
  | "client.subs.loadFailed"
  | "client.subs.loading"
  // Сообщения
  | "client.messages.title"
  | "client.messages.intro"
  | "client.messages.loading"
  | "client.messages.empty"
  | "client.messages.bookCta"
  | "client.messages.chats"
  | "client.messages.selectChat"
  | "client.messages.individual"
  | "client.messages.loadingMsgs"
  | "client.messages.startChat"
  | "client.messages.placeholder"
  | "client.messages.send"
  | "client.messages.sending"
  | "client.messages.peer"
  | "client.messages.loadFailed"
  // Дневник питания / БЖУ
  | "client.nutrition.title"
  | "client.nutrition.diaryTitle"
  | "client.nutrition.diaryHint"
  | "client.nutrition.avgTitle"
  | "client.nutrition.avgHint"
  | "client.nutrition.last7days"
  | "client.nutrition.last30days"
  | "client.nutrition.noDiaryEntries"
  | "client.nutrition.daysTracked"
  | "client.nutrition.todayTotal"
  | "client.nutrition.history"
  | "client.nutrition.historyEmpty"
  | "client.nutrition.bmr"
  | "client.nutrition.kcalPerDay"
  | "client.nutrition.recentDays"
  | "client.nutrition.entries"
  | "client.nutrition.loading"
  | "client.nutrition.toTraining"
  | "common.gramShort"
  // Профиль
  | "client.profile.title"
  | "client.profile.section.profile"
  | "client.profile.section.subs"
  | "client.profile.section.trainers"
  | "client.profile.section.account"
  | "client.profile.sub.info"
  | "client.profile.sub.health"
  | "client.profile.sub.email"
  | "client.profile.sub.password"
  | "client.profile.sub.language"
  | "client.profile.noName"
  | "client.profile.years"
  | "client.profile.phone"
  | "client.profile.contactsSaved"
  | "client.profile.healthSaved"
  | "client.profile.healthHeader"
  | "client.profile.bmi"
  | "client.profile.weightKg"
  | "client.profile.heightCm"
  | "client.profile.gender"
  | "client.profile.male"
  | "client.profile.female"
  | "client.profile.goal"
  | "client.profile.goalLoss"
  | "client.profile.goalGain"
  | "client.profile.goalKeep"
  | "client.profile.bmrHistoryLink"
  | "client.profile.mySubsCount"
  | "client.profile.viewAllSubs"
  | "client.profile.subsEmpty"
  | "client.profile.subsFromDate"
  | "client.profile.subsUntilDate"
  | "client.profile.trainersHeader"
  | "client.profile.trainersEmpty"
  | "client.profile.specFitness"
  | "client.profile.specBodybuilding"
  | "client.profile.specCrossfit"
  | "client.profile.specYoga"
  | "client.profile.specPilates"
  | "client.profile.specBoxing"
  | "client.profile.specSwimming"
  | "client.profile.specCardio"
  | "client.profile.userId"
  | "client.profile.email"
  | "client.profile.saveEmail"
  | "client.profile.passwordChange"
  | "client.profile.currentPassword"
  | "client.profile.newPassword"
  | "client.profile.confirmPassword"
  | "client.profile.passwordChanged"
  | "client.profile.changingPassword"
  | "client.profile.changePassword"
  | "client.profile.editPhotoTooltip"
  | "client.profile.uploadingPhoto"
  | "client.profile.photoUpdated"
  | "client.profile.photoFailed"
  | "client.profile.profileNotFound"
  | "client.profile.loading"
  | "client.profile.experience"
  | "profile.language.title"
  | "profile.language.description"
  | "profile.language.russian"
  | "profile.language.english"
  | "profile.language.saved";

type Dictionary = Record<TranslationKeys, string>;

const ru: Dictionary = {
  "common.loading": "Загрузка...",
  "common.save": "Сохранить",
  "common.saving": "Сохранение...",
  "common.cancel": "Отмена",
  "common.back": "Назад",
  "common.delete": "Удалить",
  "common.edit": "Изменить",
  "common.today": "Сегодня",
  "common.error": "Ошибка",
  "common.success": "Готово",
  "common.search": "Поиск",
  "common.profile": "Профиль",
  "common.logout": "Выйти",
  "common.minutes": "мин",
  "common.days": "дн.",
  "common.day": "день",
  "common.from": "с",
  "common.until": "до",
  "common.kcal": "ккал",
  "common.proteins": "белки",
  "common.fats": "жиры",
  "common.carbs": "углев.",
  "common.duration": "Длительность",
  "common.trainer": "Тренер",
  "common.gramShort": "г",

  "client.nav.home": "Главная",
  "client.nav.training": "Тренировки",
  "client.nav.subscriptions": "Абонементы",
  "client.nav.chat": "Чат",
  "client.nav.profile": "Профиль",

  "client.dashboard.title": "Кабинет клиента",
  "client.dashboard.welcome": "Добро пожаловать",
  "client.dashboard.welcomeSubtitle": "Управляйте тренировками, абонементами и следите за своим прогрессом.",
  "client.dashboard.headerSubtitle": "Управляйте тренировками, БЖУ и абонементами",
  "client.dashboard.quickActions": "Быстрые действия",
  "client.dashboard.btnTraining": "Тренировки",
  "client.dashboard.btnSubscriptions": "Абонементы",
  "client.dashboard.btnProfile": "Профиль",
  "client.dashboard.btnNutrition": "БЖУ",
  "client.dashboard.bjuSummary": "БЖУ — сводка",
  "client.dashboard.bjuMore": "Подробнее",
  "client.dashboard.todayDiary": "Сегодня (дневник)",
  "client.dashboard.avgDaily": "Среднее в день",
  "client.dashboard.basedOnDays": "по {n} дн. дневника",
  "client.dashboard.noFoodToday": "Записей за сегодня ещё нет. Дневник питания заполняется в мобильном приложении.",
  "client.dashboard.noFoodHistory": "Дневник пуст. Заполните его в мобильном приложении, чтобы видеть среднюю калорийность.",
  "client.dashboard.proteins": "белки",
  "client.dashboard.fats": "жиры",
  "client.dashboard.carbs": "углев.",
  "client.dashboard.kcal": "ккал",
  "client.dashboard.mySubs": "Мои абонементы",
  "client.dashboard.allSubs": "Все абонементы",
  "client.dashboard.noActiveSubs": "У вас пока нет активных абонементов. Перейдите в раздел «Абонементы» для оформления.",
  "client.dashboard.visitsCalendar": "Календарь посещений",
  "client.dashboard.upcomingWorkouts": "Ближайшие тренировки",
  "client.dashboard.upcomingWorkoutsSubtitle": "Групповые и индивидуальные",
  "client.dashboard.noUpcoming": "Запланированных тренировок пока нет. Запишитесь в разделе «Тренировки».",
  "client.dashboard.allTrainings": "Все тренировки",
  "client.dashboard.trainer": "Тренер",
  "client.dashboard.individualWorkout": "Индивидуальная",

  "client.training.title": "Тренировки",
  "client.training.intro": "На вкладке «Мои» — все ваши предстоящие тренировки. На вкладке «Запись» можно записаться на групповое или индивидуальное занятие.",
  "client.training.tabMy": "Мои",
  "client.training.tabBook": "Запись",
  "client.training.subTabGroup": "Групповые",
  "client.training.subTabIndividual": "Индивидуальные",
  "client.training.upcoming": "Ближайшие тренировки",
  "client.training.noUpcoming": "У вас пока нет запланированных тренировок. Запишитесь во вкладке «Запись».",
  "client.training.individualHeader": "Индивидуальная запись",
  "client.training.individualIntro": "Выберите тренера, удобное время и отправьте заявку. После одобрения тренировка появится в «Мои».",
  "client.training.bookTrainer": "Записаться к тренеру",
  "client.training.myRequests": "Мои заявки",
  "client.training.groupHeader": "Групповые тренировки (14 дней)",
  "client.training.groupEmpty": "Пока нет доступных групповых тренировок. Загляните позже.",
  "client.training.signedUp": "Вы записаны",
  "client.training.cancel": "Отменить запись",
  "client.training.cancelling": "Отмена...",
  "client.training.signUp": "Записаться",
  "client.training.signingUp": "Запись...",
  "client.training.full": "Мест нет",
  "client.training.participants": "Участники",
  "client.training.individualWorkout": "Индивидуальная тренировка",
  "client.training.loadFailed": "Не удалось загрузить тренировки",
  "client.training.loading": "Загрузка расписания...",

  "client.booking.title": "Запись на тренировку",
  "client.booking.individualHeader": "Индивидуальная тренировка",
  "client.booking.intro": "Выберите тренера, удобное время и отправьте заявку на индивидуальную тренировку.",
  "client.booking.myRequests": "Мои заявки",
  "client.booking.step1": "1. Тренер",
  "client.booking.step2": "2. Расписание",
  "client.booking.step3": "3. Запись",
  "client.booking.selectTrainer": "Выберите тренера",
  "client.booking.noTrainers": "Тренеры пока не добавлены. Обратитесь к администратору.",
  "client.booking.perTraining": "за тренировку",
  "client.booking.experience": "Опыт",
  "client.booking.years": "лет",
  "client.booking.scheduleHeader": "Расписание",
  "client.booking.noSlots": "У тренера пока нет открытых слотов. Попробуйте позже или выберите другого тренера.",
  "client.booking.scheduleHint": "Выберите день из доступных, затем свободный час.",
  "client.booking.free": "свободно",
  "client.booking.noFreeHours": "На этот день нет свободных слотов.",
  "client.booking.confirmHeader": "Подтверждение записи",
  "client.booking.backToSchedule": "← К расписанию",
  "client.booking.trainer": "Тренер",
  "client.booking.specialization": "Специализация",
  "client.booking.dateTime": "Дата и время",
  "client.booking.duration": "Длительность",
  "client.booking.price": "Стоимость",
  "client.booking.commentLabel": "Комментарий (необязательно):",
  "client.booking.commentPlaceholder": "Опишите ваши цели или пожелания...",
  "client.booking.toSchedule": "← К расписанию",
  "client.booking.submit": "Отправить заявку",
  "client.booking.submitting": "Отправка заявки...",
  "client.booking.success": "Заявка на тренировку успешно отправлена!",
  "client.booking.requestsHeader": "Мои заявки",
  "client.booking.noRequests": "У вас пока нет заявок. Выберите тренера и удобное время, чтобы записаться.",
  "client.booking.newRequest": "Новая заявка",
  "client.booking.statusPending": "Ожидает",
  "client.booking.statusApproved": "Одобрено",
  "client.booking.statusRejected": "Отклонено",
  "client.booking.loadFailed": "Не удалось загрузить данные",
  "client.booking.loading": "Загрузка данных...",
  "client.booking.slotPast": "Это время уже прошло. Выберите другой слот.",

  "client.subs.title": "Абонементы",
  "client.subs.myActive": "Мои абонементы",
  "client.subs.noneTitle": "У вас нет активных абонементов",
  "client.subs.choose": "Выберите подходящий абонемент ниже.",
  "client.subs.available": "Доступные абонементы",
  "client.subs.adminHint": "Добавить абонемент клиенту может только администратор. Обратитесь в клуб для оформления.",
  "client.subs.daysFew": "дня",
  "client.subs.daysMany": "дней",
  "client.subs.daysOne": "день",
  "client.subs.fromDate": "С",
  "client.subs.untilDate": "До",
  "client.subs.loadFailed": "Ошибка загрузки",
  "client.subs.loading": "Загрузка абонементов...",

  "client.messages.title": "Сообщения",
  "client.messages.intro": "Общайтесь с тренерами по вопросам индивидуальных тренировок.",
  "client.messages.loading": "Загрузка чатов...",
  "client.messages.empty": "У вас пока нет чатов. Чат создаётся автоматически при записи на индивидуальную тренировку.",
  "client.messages.bookCta": "Записаться на тренировку",
  "client.messages.chats": "Чаты",
  "client.messages.selectChat": "Выберите чат слева, чтобы начать общение",
  "client.messages.individual": "Индивидуальная тренировка",
  "client.messages.loadingMsgs": "Загрузка сообщений...",
  "client.messages.startChat": "Сообщений пока нет. Начните диалог!",
  "client.messages.placeholder": "Введите сообщение...",
  "client.messages.send": "Отправить",
  "client.messages.sending": "...",
  "client.messages.peer": "Собеседник",
  "client.messages.loadFailed": "Не удалось загрузить чаты",

  "client.nutrition.title": "Дневник питания",
  "client.nutrition.diaryTitle": "Дневник питания",
  "client.nutrition.diaryHint": "Записи в дневник добавляются в мобильном приложении.",
  "client.nutrition.avgTitle": "Среднее потребление в день",
  "client.nutrition.avgHint": "Считается по дням, в которых есть хотя бы одна запись в дневнике.",
  "client.nutrition.last7days": "Последние 7 дней",
  "client.nutrition.last30days": "Последние 30 дней",
  "client.nutrition.noDiaryEntries": "В дневнике пока нет записей. Заполните дневник в мобильном приложении.",
  "client.nutrition.daysTracked": "дн. с записями",
  "client.nutrition.todayTotal": "Сегодня",
  "client.nutrition.history": "История по дням",
  "client.nutrition.historyEmpty": "История пуста.",
  "client.nutrition.bmr": "BMR",
  "client.nutrition.kcalPerDay": "ккал / день",
  "client.nutrition.recentDays": "Последние дни",
  "client.nutrition.entries": "записей",
  "client.nutrition.loading": "Загрузка...",
  "client.nutrition.toTraining": "Перейти к тренировкам",

  "client.profile.title": "Профиль",
  "client.profile.section.profile": "Профиль",
  "client.profile.section.subs": "Мои абонементы",
  "client.profile.section.trainers": "Тренеры",
  "client.profile.section.account": "Аккаунт",
  "client.profile.sub.info": "Личные данные",
  "client.profile.sub.health": "Здоровье",
  "client.profile.sub.email": "Email",
  "client.profile.sub.password": "Пароль",
  "client.profile.sub.language": "Язык",
  "client.profile.noName": "Без имени",
  "client.profile.years": "лет",
  "client.profile.phone": "Телефон",
  "client.profile.contactsSaved": "Контакты сохранены",
  "client.profile.healthSaved": "Данные здоровья сохранены",
  "client.profile.healthHeader": "Данные о здоровье",
  "client.profile.bmi": "Индекс массы тела (ИМТ)",
  "client.profile.weightKg": "Вес (кг)",
  "client.profile.heightCm": "Рост (см)",
  "client.profile.gender": "Пол",
  "client.profile.male": "Мужской",
  "client.profile.female": "Женский",
  "client.profile.goal": "Цель",
  "client.profile.goalLoss": "Похудение",
  "client.profile.goalGain": "Набор массы",
  "client.profile.goalKeep": "Поддержание формы",
  "client.profile.bmrHistoryLink": "Дневник питания",
  "client.profile.mySubsCount": "Мои абонементы",
  "client.profile.viewAllSubs": "Посмотреть все абонементы",
  "client.profile.subsEmpty": "Нет активных абонементов.",
  "client.profile.subsFromDate": "С",
  "client.profile.subsUntilDate": "До",
  "client.profile.trainersHeader": "Тренеры клуба",
  "client.profile.trainersEmpty": "Список тренеров пуст.",
  "client.profile.specFitness": "Фитнес",
  "client.profile.specBodybuilding": "Бодибилдинг",
  "client.profile.specCrossfit": "Кроссфит",
  "client.profile.specYoga": "Йога",
  "client.profile.specPilates": "Пилатес",
  "client.profile.specBoxing": "Бокс",
  "client.profile.specSwimming": "Плавание",
  "client.profile.specCardio": "Кардио",
  "client.profile.userId": "ID пользователя",
  "client.profile.email": "Email",
  "client.profile.saveEmail": "Сохранить email",
  "client.profile.passwordChange": "Сменить пароль",
  "client.profile.currentPassword": "Текущий пароль",
  "client.profile.newPassword": "Новый пароль",
  "client.profile.confirmPassword": "Повторите новый пароль",
  "client.profile.passwordChanged": "Пароль успешно изменён.",
  "client.profile.changingPassword": "Сохранение...",
  "client.profile.changePassword": "Сменить пароль",
  "client.profile.editPhotoTooltip": "Изменить фото",
  "client.profile.uploadingPhoto": "Загрузка…",
  "client.profile.photoUpdated": "Фото обновлено",
  "client.profile.photoFailed": "Не удалось загрузить фото.",
  "client.profile.profileNotFound": "Профиль не найден. Попробуйте выйти и войти снова.",
  "client.profile.loading": "Загрузка профиля...",
  "client.profile.experience": "Опыт",

  "profile.language.title": "Язык интерфейса",
  "profile.language.description": "Язык сохраняется только в этом браузере и применяется ко всему сайту.",
  "profile.language.russian": "Русский",
  "profile.language.english": "English",
  "profile.language.saved": "Язык сохранён"
};

const en: Dictionary = {
  "common.loading": "Loading...",
  "common.save": "Save",
  "common.saving": "Saving...",
  "common.cancel": "Cancel",
  "common.back": "Back",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.today": "Today",
  "common.error": "Error",
  "common.success": "Done",
  "common.search": "Search",
  "common.profile": "Profile",
  "common.logout": "Log out",
  "common.minutes": "min",
  "common.days": "d.",
  "common.day": "day",
  "common.from": "from",
  "common.until": "until",
  "common.kcal": "kcal",
  "common.proteins": "protein",
  "common.fats": "fat",
  "common.carbs": "carbs",
  "common.duration": "Duration",
  "common.trainer": "Trainer",
  "common.gramShort": "g",

  "client.nav.home": "Home",
  "client.nav.training": "Training",
  "client.nav.subscriptions": "Memberships",
  "client.nav.chat": "Chat",
  "client.nav.profile": "Profile",

  "client.dashboard.title": "Client dashboard",
  "client.dashboard.welcome": "Welcome",
  "client.dashboard.welcomeSubtitle": "Manage your workouts, memberships, and track your progress.",
  "client.dashboard.headerSubtitle": "Manage your workouts, macros, and memberships",
  "client.dashboard.quickActions": "Quick actions",
  "client.dashboard.btnTraining": "Workouts",
  "client.dashboard.btnSubscriptions": "Memberships",
  "client.dashboard.btnProfile": "Profile",
  "client.dashboard.btnNutrition": "Nutrition",
  "client.dashboard.bjuSummary": "Macros — summary",
  "client.dashboard.bjuMore": "More",
  "client.dashboard.todayDiary": "Today (diary)",
  "client.dashboard.avgDaily": "Daily average",
  "client.dashboard.basedOnDays": "based on {n} days of diary",
  "client.dashboard.noFoodToday": "No food entries for today yet. The food diary is filled in the mobile app.",
  "client.dashboard.noFoodHistory": "Diary is empty. Fill it in the mobile app to see your average daily calories.",
  "client.dashboard.proteins": "protein",
  "client.dashboard.fats": "fat",
  "client.dashboard.carbs": "carbs",
  "client.dashboard.kcal": "kcal",
  "client.dashboard.mySubs": "My memberships",
  "client.dashboard.allSubs": "All memberships",
  "client.dashboard.noActiveSubs": "You don't have any active memberships yet. Go to the «Memberships» section to choose one.",
  "client.dashboard.visitsCalendar": "Visits calendar",
  "client.dashboard.upcomingWorkouts": "Upcoming workouts",
  "client.dashboard.upcomingWorkoutsSubtitle": "Group and individual",
  "client.dashboard.noUpcoming": "No upcoming workouts. Sign up in the «Workouts» section.",
  "client.dashboard.allTrainings": "All workouts",
  "client.dashboard.trainer": "Trainer",
  "client.dashboard.individualWorkout": "Individual",

  "client.training.title": "Workouts",
  "client.training.intro": "The «Mine» tab shows all your upcoming workouts. The «Sign up» tab lets you book a group or individual session.",
  "client.training.tabMy": "Mine",
  "client.training.tabBook": "Sign up",
  "client.training.subTabGroup": "Group",
  "client.training.subTabIndividual": "Individual",
  "client.training.upcoming": "Upcoming workouts",
  "client.training.noUpcoming": "You don't have any planned workouts yet. Sign up in the «Sign up» tab.",
  "client.training.individualHeader": "Individual booking",
  "client.training.individualIntro": "Choose a trainer, a convenient time and submit a request. Once approved the session shows up in «Mine».",
  "client.training.bookTrainer": "Book a trainer",
  "client.training.myRequests": "My requests",
  "client.training.groupHeader": "Group workouts (14 days)",
  "client.training.groupEmpty": "No group workouts available right now. Check back later.",
  "client.training.signedUp": "You are signed up",
  "client.training.cancel": "Cancel sign-up",
  "client.training.cancelling": "Cancelling...",
  "client.training.signUp": "Sign up",
  "client.training.signingUp": "Signing up...",
  "client.training.full": "Full",
  "client.training.participants": "Participants",
  "client.training.individualWorkout": "Individual workout",
  "client.training.loadFailed": "Failed to load workouts",
  "client.training.loading": "Loading schedule...",

  "client.booking.title": "Book a workout",
  "client.booking.individualHeader": "Individual workout",
  "client.booking.intro": "Choose a trainer, pick a time, and submit a request for an individual workout.",
  "client.booking.myRequests": "My requests",
  "client.booking.step1": "1. Trainer",
  "client.booking.step2": "2. Schedule",
  "client.booking.step3": "3. Booking",
  "client.booking.selectTrainer": "Select a trainer",
  "client.booking.noTrainers": "No trainers added yet. Please contact the administrator.",
  "client.booking.perTraining": "per session",
  "client.booking.experience": "Experience",
  "client.booking.years": "y.",
  "client.booking.scheduleHeader": "Schedule",
  "client.booking.noSlots": "The trainer has no open slots yet. Try later or pick another trainer.",
  "client.booking.scheduleHint": "Pick an available day, then a free hour.",
  "client.booking.free": "free",
  "client.booking.noFreeHours": "No free slots for this day.",
  "client.booking.confirmHeader": "Booking confirmation",
  "client.booking.backToSchedule": "← Back to schedule",
  "client.booking.trainer": "Trainer",
  "client.booking.specialization": "Specialization",
  "client.booking.dateTime": "Date and time",
  "client.booking.duration": "Duration",
  "client.booking.price": "Price",
  "client.booking.commentLabel": "Comment (optional):",
  "client.booking.commentPlaceholder": "Describe your goals or wishes...",
  "client.booking.toSchedule": "← Back to schedule",
  "client.booking.submit": "Submit request",
  "client.booking.submitting": "Submitting request...",
  "client.booking.success": "Request submitted successfully!",
  "client.booking.requestsHeader": "My requests",
  "client.booking.noRequests": "You don't have any requests yet. Pick a trainer and a time to book.",
  "client.booking.newRequest": "New request",
  "client.booking.statusPending": "Pending",
  "client.booking.statusApproved": "Approved",
  "client.booking.statusRejected": "Rejected",
  "client.booking.loadFailed": "Failed to load data",
  "client.booking.loading": "Loading data...",
  "client.booking.slotPast": "This time has already passed. Please pick another slot.",

  "client.subs.title": "Memberships",
  "client.subs.myActive": "My memberships",
  "client.subs.noneTitle": "You have no active memberships",
  "client.subs.choose": "Pick a membership below.",
  "client.subs.available": "Available memberships",
  "client.subs.adminHint": "Only an administrator can issue a membership to a client. Please contact the club.",
  "client.subs.daysFew": "days",
  "client.subs.daysMany": "days",
  "client.subs.daysOne": "day",
  "client.subs.fromDate": "From",
  "client.subs.untilDate": "Until",
  "client.subs.loadFailed": "Failed to load",
  "client.subs.loading": "Loading memberships...",

  "client.messages.title": "Messages",
  "client.messages.intro": "Talk to your trainers about individual sessions.",
  "client.messages.loading": "Loading chats...",
  "client.messages.empty": "You don't have any chats yet. A chat is created automatically when you book an individual workout.",
  "client.messages.bookCta": "Book a workout",
  "client.messages.chats": "Chats",
  "client.messages.selectChat": "Select a chat on the left to start talking",
  "client.messages.individual": "Individual workout",
  "client.messages.loadingMsgs": "Loading messages...",
  "client.messages.startChat": "No messages yet. Start the conversation!",
  "client.messages.placeholder": "Type a message...",
  "client.messages.send": "Send",
  "client.messages.sending": "...",
  "client.messages.peer": "Peer",
  "client.messages.loadFailed": "Failed to load chats",

  "client.nutrition.title": "Food diary",
  "client.nutrition.diaryTitle": "Food diary",
  "client.nutrition.diaryHint": "Diary entries are added in the mobile app.",
  "client.nutrition.avgTitle": "Average daily intake",
  "client.nutrition.avgHint": "Calculated across days that have at least one diary entry.",
  "client.nutrition.last7days": "Last 7 days",
  "client.nutrition.last30days": "Last 30 days",
  "client.nutrition.noDiaryEntries": "No diary entries yet. Fill the diary in the mobile app.",
  "client.nutrition.daysTracked": "days tracked",
  "client.nutrition.todayTotal": "Today",
  "client.nutrition.history": "Daily history",
  "client.nutrition.historyEmpty": "History is empty.",
  "client.nutrition.bmr": "BMR",
  "client.nutrition.kcalPerDay": "kcal / day",
  "client.nutrition.recentDays": "Recent days",
  "client.nutrition.entries": "entries",
  "client.nutrition.loading": "Loading...",
  "client.nutrition.toTraining": "Go to workouts",

  "client.profile.title": "Profile",
  "client.profile.section.profile": "Profile",
  "client.profile.section.subs": "My memberships",
  "client.profile.section.trainers": "Trainers",
  "client.profile.section.account": "Account",
  "client.profile.sub.info": "Personal info",
  "client.profile.sub.health": "Health",
  "client.profile.sub.email": "Email",
  "client.profile.sub.password": "Password",
  "client.profile.sub.language": "Language",
  "client.profile.noName": "No name",
  "client.profile.years": "y.o.",
  "client.profile.phone": "Phone",
  "client.profile.contactsSaved": "Contacts saved",
  "client.profile.healthSaved": "Health data saved",
  "client.profile.healthHeader": "Health data",
  "client.profile.bmi": "Body Mass Index (BMI)",
  "client.profile.weightKg": "Weight (kg)",
  "client.profile.heightCm": "Height (cm)",
  "client.profile.gender": "Gender",
  "client.profile.male": "Male",
  "client.profile.female": "Female",
  "client.profile.goal": "Goal",
  "client.profile.goalLoss": "Weight loss",
  "client.profile.goalGain": "Muscle gain",
  "client.profile.goalKeep": "Maintenance",
  "client.profile.bmrHistoryLink": "Food diary",
  "client.profile.mySubsCount": "My memberships",
  "client.profile.viewAllSubs": "View all memberships",
  "client.profile.subsEmpty": "No active memberships.",
  "client.profile.subsFromDate": "From",
  "client.profile.subsUntilDate": "Until",
  "client.profile.trainersHeader": "Club trainers",
  "client.profile.trainersEmpty": "No trainers yet.",
  "client.profile.specFitness": "Fitness",
  "client.profile.specBodybuilding": "Bodybuilding",
  "client.profile.specCrossfit": "Crossfit",
  "client.profile.specYoga": "Yoga",
  "client.profile.specPilates": "Pilates",
  "client.profile.specBoxing": "Boxing",
  "client.profile.specSwimming": "Swimming",
  "client.profile.specCardio": "Cardio",
  "client.profile.userId": "User ID",
  "client.profile.email": "Email",
  "client.profile.saveEmail": "Save email",
  "client.profile.passwordChange": "Change password",
  "client.profile.currentPassword": "Current password",
  "client.profile.newPassword": "New password",
  "client.profile.confirmPassword": "Repeat new password",
  "client.profile.passwordChanged": "Password changed successfully.",
  "client.profile.changingPassword": "Saving...",
  "client.profile.changePassword": "Change password",
  "client.profile.editPhotoTooltip": "Change photo",
  "client.profile.uploadingPhoto": "Uploading…",
  "client.profile.photoUpdated": "Photo updated",
  "client.profile.photoFailed": "Failed to upload photo.",
  "client.profile.profileNotFound": "Profile not found. Try signing out and back in.",
  "client.profile.loading": "Loading profile...",
  "client.profile.experience": "Experience",

  "profile.language.title": "Interface language",
  "profile.language.description": "The language is stored only in this browser and applies to the whole site.",
  "profile.language.russian": "Russian",
  "profile.language.english": "English",
  "profile.language.saved": "Language saved"
};

export const dictionaries: Record<Language, Dictionary> = { ru, en };

export function translate(language: Language, key: TranslationKeys): string {
  return dictionaries[language]?.[key] ?? dictionaries.ru[key] ?? key;
}

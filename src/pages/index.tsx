import Head from "next/head";
import Link from "next/link";

const features = [
  {
    icon: "🏋️",
    title: "Персональные тренировки",
    desc: "Индивидуальные и групповые занятия с профессиональными тренерами"
  },
  {
    icon: "📊",
    title: "Контроль питания",
    desc: "Калькулятор БЖУ и история расчётов для отслеживания прогресса"
  },
  {
    icon: "🎫",
    title: "Гибкие абонементы",
    desc: "Выберите подходящий тариф: от базового до VIP с персональным тренером"
  },
  {
    icon: "📅",
    title: "Онлайн-расписание",
    desc: "Записывайтесь на тренировки в один клик и управляйте расписанием"
  },
  {
    icon: "👤",
    title: "Личный кабинет",
    desc: "Отслеживайте абонементы, тренировки и параметры тела"
  },
  {
    icon: "🔒",
    title: "Безопасность данных",
    desc: "Защита на всех уровнях: шифрование, аутентификация, ролевой доступ"
  }
];

const plans = [
  { name: "Базовый", price: "2 000", period: "30 дней", emoji: "🏃", color: "from-emerald-600 to-emerald-800" },
  { name: "Стандарт", price: "4 500", period: "30 дней", emoji: "💪", color: "from-emerald-700 to-teal-900" },
  { name: "Премиум", price: "7 000", period: "30 дней", emoji: "⭐", color: "from-amber-600 to-amber-800" },
  { name: "VIP Годовой", price: "60 000", period: "365 дней", emoji: "👑", color: "from-violet-700 to-violet-900" }
];

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>HypeSportClub — Ваш цифровой фитнес-клуб</title>
        <meta name="description" content="Фитнес-клуб нового поколения. Тренировки, питание, абонементы — всё в одном месте." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-[color:var(--hsc-back)] text-slate-900">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-emerald-900/10 bg-[color:var(--hsc-back)]/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--hsc-panel)] text-white">
                <span className="text-sm font-black">⚡</span>
              </div>
              <span className="text-lg font-black tracking-wider text-hsc-panel">HSC</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-hsc-panel no-underline transition-colors hover:bg-emerald-100"
              >
                Войти
              </Link>
              <Link
                href="/auth/login?mode=register"
                className="rounded-xl bg-[color:var(--hsc-panel)] px-4 py-2 text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90"
              >
                Регистрация
              </Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[color:var(--hsc-panel)] shadow-xl shadow-emerald-900/20">
                <span className="text-3xl">⚡</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-hsc-panel sm:text-5xl lg:text-6xl">
                Hype<span className="text-emerald-600">Sport</span>Club
              </h1>
              <p className="mt-4 text-lg text-slate-600 sm:text-xl">
                Фитнес-клуб нового поколения. Тренировки, питание, прогресс —
                всё в одном месте.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/auth/login?mode=register"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-[color:var(--hsc-panel)] px-8 py-3.5 text-base font-bold text-white no-underline shadow-lg shadow-emerald-900/20 transition-all hover:opacity-90 sm:w-auto"
                >
                  Начать бесплатно
                </Link>
                <Link
                  href="#features"
                  className="inline-flex w-full items-center justify-center rounded-2xl border-2 border-emerald-900/20 bg-white px-8 py-3.5 text-base font-bold text-hsc-panel no-underline transition-colors hover:bg-emerald-50 sm:w-auto"
                >
                  Узнать больше
                </Link>
              </div>
            </div>
          </div>
          {/* Декоративные элементы */}
          <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="absolute -bottom-12 left-0 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />
        </section>

        {/* Features */}
        <section id="features" className="border-t border-emerald-900/10 bg-white/50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
                Возможности
              </p>
              <h2 className="mt-2 text-3xl font-black text-hsc-panel sm:text-4xl">
                Всё для вашего прогресса
              </h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm transition-all hover:border-emerald-600/30 hover:shadow-md"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl transition-colors group-hover:bg-emerald-100">
                    {f.icon}
                  </div>
                  <h3 className="text-base font-bold text-hsc-panel">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Plans */}
        <section id="plans" className="border-t border-emerald-900/10">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
                Абонементы
              </p>
              <h2 className="mt-2 text-3xl font-black text-hsc-panel sm:text-4xl">
                Выберите свой тариф
              </h2>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((p) => (
                <div
                  key={p.name}
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${p.color} p-6 text-white shadow-lg`}
                >
                  <div className="text-3xl">{p.emoji}</div>
                  <h3 className="mt-3 text-lg font-bold">{p.name}</h3>
                  <div className="mt-2">
                    <span className="text-2xl font-black">{p.price} ₽</span>
                    <span className="ml-1 text-sm opacity-80">/ {p.period}</span>
                  </div>
                  <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/auth/login?mode=register"
                className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--hsc-panel)] px-8 py-3 text-base font-bold text-white no-underline shadow-lg shadow-emerald-900/20 transition-all hover:opacity-90"
              >
                Оформить абонемент
              </Link>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="border-t border-emerald-900/10 bg-white/50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
                  О клубе
                </p>
                <h2 className="mt-2 text-3xl font-black text-hsc-panel sm:text-4xl">
                  HypeSportClub
                </h2>
                <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-600">
                  <p>
                    HypeSportClub — это современный фитнес-клуб, объединяющий лучших
                    тренеров, передовое оборудование и цифровые технологии для вашего
                    здоровья и результатов.
                  </p>
                  <p>
                    Мы предлагаем индивидуальные и групповые тренировки, персональные
                    программы питания, контроль прогресса и удобное управление абонементами
                    через веб-платформу и мобильное приложение.
                  </p>
                  <p>
                    Наша миссия — сделать фитнес доступным, удобным и результативным
                    для каждого.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-[color:var(--hsc-surface)] p-5 text-center">
                  <div className="text-3xl font-black text-hsc-panel">500+</div>
                  <div className="mt-1 text-xs font-medium text-slate-600">Клиентов</div>
                </div>
                <div className="rounded-2xl bg-[color:var(--hsc-surface)] p-5 text-center">
                  <div className="text-3xl font-black text-hsc-panel">15+</div>
                  <div className="mt-1 text-xs font-medium text-slate-600">Тренеров</div>
                </div>
                <div className="rounded-2xl bg-[color:var(--hsc-surface)] p-5 text-center">
                  <div className="text-3xl font-black text-hsc-panel">50+</div>
                  <div className="mt-1 text-xs font-medium text-slate-600">Тренировок в неделю</div>
                </div>
                <div className="rounded-2xl bg-[color:var(--hsc-surface)] p-5 text-center">
                  <div className="text-3xl font-black text-hsc-panel">24/7</div>
                  <div className="mt-1 text-xs font-medium text-slate-600">Доступ к платформе</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-emerald-900/10">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="rounded-3xl bg-[color:var(--hsc-panel)] px-8 py-12 text-center text-white shadow-2xl sm:px-16">
              <h2 className="text-2xl font-black sm:text-3xl">
                Готовы начать?
              </h2>
              <p className="mt-3 text-sm text-emerald-100 sm:text-base">
                Зарегистрируйтесь бесплатно и получите доступ ко всем функциям клуба
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/auth/login?mode=register"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-8 py-3.5 text-base font-bold text-hsc-panel no-underline transition-all hover:bg-emerald-50 sm:w-auto"
                >
                  Зарегистрироваться
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex w-full items-center justify-center rounded-2xl border-2 border-white/30 px-8 py-3.5 text-base font-bold text-white no-underline transition-colors hover:bg-white/10 sm:w-auto"
                >
                  Войти в аккаунт
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-emerald-900/10 bg-white/50">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color:var(--hsc-panel)] text-white">
                  <span className="text-xs font-black">⚡</span>
                </div>
                <span className="text-sm font-bold text-hsc-panel">HypeSportClub</span>
              </div>
              <p className="text-xs text-slate-500">
                &copy; {new Date().getFullYear()} HypeSportClub. Все права защищены.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

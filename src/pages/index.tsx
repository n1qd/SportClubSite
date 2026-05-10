import Head from "next/head";
import Link from "next/link";
import { Reveal, RevealStagger } from "@/components/landing/Reveal";
import { LandingScrollSnap } from "@/components/landing/LandingScrollSnap";
import { HeroSection } from "@/components/landing/HeroSection";

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
  {
    name: "Базовый",
    slug: "basic",
    price: "2 000",
    period: "30 дней",
    emoji: "🏃",
    color: "from-emerald-600 to-emerald-800",
    tag: "Старт"
  },
  {
    name: "Стандарт",
    slug: "standard",
    price: "4 500",
    period: "30 дней",
    emoji: "💪",
    color: "from-emerald-700 to-teal-900",
    tag: "Хит"
  },
  {
    name: "Премиум",
    slug: "premium",
    price: "7 000",
    period: "30 дней",
    emoji: "⭐",
    color: "from-amber-600 to-amber-800",
    tag: "Максимум"
  },
  {
    name: "VIP Годовой",
    slug: "vip-year",
    price: "60 000",
    period: "365 дней",
    emoji: "👑",
    color: "from-violet-700 to-violet-900",
    tag: "−20%"
  }
] as const;

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>HypeSportClub — Ваш цифровой фитнес-клуб</title>
        <meta name="description" content="Фитнес-клуб нового поколения. Тренировки, питание, абонементы — всё в одном месте." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <LandingScrollSnap>
      <div className="min-h-screen bg-[color:var(--hsc-back)] text-slate-900 dark:text-slate-100">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-emerald-900/10 bg-[color:var(--hsc-back)]/90 backdrop-blur-md transition-shadow duration-300 hover:shadow-sm dark:border-white/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="group flex items-center gap-2 no-underline">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--hsc-panel)] text-white shadow-md transition-transform duration-300 group-hover:scale-105 group-hover:shadow-lg">
                <span className="text-sm font-black">⚡</span>
              </div>
              <span className="text-lg font-black tracking-wider text-hsc-panel">HSC</span>
            </Link>
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
        <HeroSection className="landing-snap-section relative min-h-[88vh] overflow-hidden sm:min-h-0">
          {({ x, y }) => (
            <>
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div
                  className="landing-hero-parallax-layer absolute inset-0 will-change-transform"
                  style={{
                    transform: `translate3d(${x * 1.1}px, ${y * 1.1}px, 0)`,
                  }}
                >
                  <div className="landing-hero-blob absolute -right-20 top-10 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-300/40 to-teal-400/30 blur-3xl" />
                  <div className="landing-hero-blob-slow absolute -left-16 bottom-8 h-64 w-64 rounded-full bg-emerald-400/25 blur-3xl [animation-delay:-4s]" />
                  <div className="absolute left-[12%] top-[18%] h-24 w-24 rounded-full bg-teal-300/20 blur-2xl" />
                  <div className="absolute right-[20%] bottom-[22%] h-32 w-32 rounded-full bg-emerald-500/15 blur-2xl" />
                  <div className="absolute left-1/2 top-1/4 h-px w-[120%] -translate-x-1/2 rotate-[-8deg] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                </div>
              </div>
              <div className="relative mx-auto flex min-h-[inherit] max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
                <div className="mx-auto max-w-2xl text-center">
                  <div className="landing-anim-fade-up mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[color:var(--hsc-panel)] shadow-xl shadow-emerald-900/20 landing-icon-pulse ring-4 ring-emerald-900/10">
                    <span className="text-3xl">⚡</span>
                  </div>
                  <h1 className="landing-anim-fade-up landing-delay-1 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                    <span className="landing-shine-text">HypeSport</span>
                    <span className="text-hsc-panel">Club</span>
                  </h1>
                  <p className="landing-anim-fade-up landing-delay-2 mt-4 text-lg text-slate-600 sm:text-xl">
                    Фитнес-клуб нового поколения. Тренировки, питание, прогресс —
                    всё в одном месте.
                  </p>
                  <div className="landing-anim-fade-up landing-delay-3 mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                    <Link
                      href="/auth/login?mode=register"
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-[color:var(--hsc-panel)] px-8 py-3.5 text-base font-bold text-white no-underline shadow-lg shadow-emerald-900/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-900/30 sm:w-auto"
                    >
                      Начать бесплатно
                    </Link>
                    <Link
                      href="#features"
                      className="inline-flex w-full items-center justify-center rounded-2xl border-2 border-emerald-900/20 bg-white px-8 py-3.5 text-base font-bold text-hsc-panel no-underline transition-all hover:-translate-y-0.5 hover:border-emerald-600/40 hover:bg-emerald-50 sm:w-auto"
                    >
                      Узнать больше
                    </Link>
                  </div>
                  <p
                    className="landing-anim-fade-up landing-delay-4 mt-10 text-xs font-medium uppercase tracking-[0.35em] text-emerald-800/50 dark:text-emerald-200/60"
                    aria-hidden
                  >
                    Листайте вниз
                  </p>
                  <div
                    className="landing-anim-fade-up landing-delay-5 mx-auto mt-3 h-8 w-5 rounded-full border-2 border-emerald-900/25 p-1 dark:border-white/25"
                    aria-hidden
                  >
                    <div className="landing-scroll-mouse-dot mx-auto h-1.5 w-1.5 rounded-full bg-emerald-700/70 dark:bg-emerald-300/70" />
                  </div>
                </div>
              </div>
            </>
          )}
        </HeroSection>

        {/* Features */}
        <section
          id="features"
          className="landing-snap-section landing-section-bleed border-t border-emerald-900/10 bg-white/50 dark:bg-emerald-950/40"
        >
          <Reveal staggerRoot className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="sr-block mx-auto max-w-xl text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
                Возможности
              </p>
              <h2 className="mt-2 text-3xl font-black text-hsc-panel sm:text-4xl">
                Всё для вашего прогресса
              </h2>
              <div
                className="sr-head-line mx-auto mt-5 h-1 w-24 rounded-full bg-gradient-to-r from-transparent via-emerald-600/90 to-transparent"
                aria-hidden
              />
            </div>
            <RevealStagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className={`landing-card-lift group relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-emerald-600/35 ${
                    i % 3 === 1
                      ? "border-emerald-700/15 ring-1 ring-emerald-900/5"
                      : "border-emerald-900/10"
                  }`}
                >
                  <div
                    className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400/15 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    aria-hidden
                  />
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-4deg] group-hover:bg-emerald-100">
                    {f.icon}
                  </div>
                  <h3 className="text-base font-bold text-hsc-panel">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600">{f.desc}</p>
                </div>
              ))}
            </RevealStagger>
          </Reveal>
        </section>

        {/* Plans */}
        <section
          id="plans"
          className="landing-snap-section landing-section-bleed border-t border-emerald-900/10"
        >
          <Reveal staggerRoot className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="sr-block mx-auto max-w-xl text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
                Абонементы
              </p>
              <h2 className="mt-2 text-3xl font-black text-hsc-panel sm:text-4xl">
                Выберите свой тариф
              </h2>
              <div
                className="sr-head-line mx-auto mt-5 h-1 w-24 rounded-full bg-gradient-to-r from-transparent via-emerald-600/90 to-transparent"
                aria-hidden
              />
            </div>
            <RevealStagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((p) => (
                <Link
                  key={p.name}
                  href={`/auth/login?mode=register&plan=${p.slug}`}
                  className={`landing-plan-link landing-card-lift group relative overflow-hidden rounded-2xl bg-gradient-to-br ${p.color} p-6 text-left text-white shadow-lg no-underline`}
                  aria-label={`${p.name}: перейти к регистрации`}
                >
                  <span className="landing-plan-shine" aria-hidden />
                  <span className="absolute right-3 top-3 rounded-full bg-black/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/95 backdrop-blur-[2px]">
                    {p.tag}
                  </span>
                  <div className="text-3xl transition-transform duration-300 group-hover:scale-110">
                    {p.emoji}
                  </div>
                  <h3 className="mt-3 text-lg font-bold">{p.name}</h3>
                  <div className="mt-2">
                    <span className="text-2xl font-black">{p.price} ₽</span>
                    <span className="ml-1 text-sm opacity-80">/ {p.period}</span>
                  </div>
                  <span className="landing-plan-cta mt-4 inline-flex items-center gap-1 text-sm font-bold">
                    Оформить
                    <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                  <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-110" />
                </Link>
              ))}
            </RevealStagger>
            <Reveal variant="fade-up" className="mt-10 text-center">
              <Link
                href="/auth/login?mode=register"
                className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--hsc-panel)] px-8 py-3 text-base font-bold text-white no-underline shadow-lg shadow-emerald-900/25 transition-all hover:-translate-y-0.5 hover:opacity-95 hover:shadow-xl"
              >
                Оформить абонемент
              </Link>
            </Reveal>
          </Reveal>
        </section>

        {/* About */}
        <section className="landing-snap-section landing-section-bleed border-t border-emerald-900/10 bg-white/50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <Reveal variant="tilt-up">
                <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
                  О клубе
                </p>
                <h2 className="mt-2 text-3xl font-black text-hsc-panel sm:text-4xl">
                  HypeSportClub
                </h2>
                <div className="sr-head-line mt-5 h-1 max-w-[14rem] rounded-full bg-gradient-to-r from-emerald-600/90 via-emerald-500/70 to-transparent lg:mx-0" aria-hidden />
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
              </Reveal>
              <Reveal staggerRoot>
                <RevealStagger className="grid grid-cols-2 gap-4">
                  <div className="landing-stat-pop rounded-2xl bg-[color:var(--hsc-surface)] p-5 text-center shadow-sm ring-1 ring-emerald-900/5">
                    <div className="text-3xl font-black text-hsc-panel">500+</div>
                    <div className="mt-1 text-xs font-medium text-slate-600">Клиентов</div>
                  </div>
                  <div className="landing-stat-pop rounded-2xl bg-[color:var(--hsc-surface)] p-5 text-center shadow-sm ring-1 ring-emerald-900/5">
                    <div className="text-3xl font-black text-hsc-panel">15+</div>
                    <div className="mt-1 text-xs font-medium text-slate-600">Тренеров</div>
                  </div>
                  <div className="landing-stat-pop rounded-2xl bg-[color:var(--hsc-surface)] p-5 text-center shadow-sm ring-1 ring-emerald-900/5">
                    <div className="text-3xl font-black text-hsc-panel">50+</div>
                    <div className="mt-1 text-xs font-medium text-slate-600">Тренировок в неделю</div>
                  </div>
                  <div className="landing-stat-pop rounded-2xl bg-[color:var(--hsc-surface)] p-5 text-center shadow-sm ring-1 ring-emerald-900/5">
                    <div className="text-3xl font-black text-hsc-panel">24/7</div>
                    <div className="mt-1 text-xs font-medium text-slate-600">Доступ к платформе</div>
                  </div>
                </RevealStagger>
              </Reveal>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="landing-snap-section border-t border-emerald-900/10">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <Reveal variant="pop">
              <div className="landing-cta-box relative overflow-hidden rounded-3xl bg-[color:var(--hsc-panel)] px-8 py-12 text-center text-white shadow-2xl ring-1 ring-white/10 sm:px-16">
                <div
                  className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-white/5 blur-2xl"
                  aria-hidden
                />
                <h2 className="relative text-2xl font-black sm:text-3xl">
                  Готовы начать?
                </h2>
                <p className="relative mt-3 text-sm text-emerald-100 sm:text-base">
                  Зарегистрируйтесь бесплатно и получите доступ ко всем функциям клуба
                </p>
                <div className="relative mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="/auth/login?mode=register"
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-8 py-3.5 text-base font-bold text-hsc-panel no-underline transition-all hover:-translate-y-0.5 hover:bg-emerald-50 sm:w-auto"
                  >
                    Зарегистрироваться
                  </Link>
                  <Link
                    href="/auth/login"
                    className="inline-flex w-full items-center justify-center rounded-2xl border-2 border-white/30 px-8 py-3.5 text-base font-bold text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-white/10 sm:w-auto"
                  >
                    Войти в аккаунт
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-emerald-900/10 bg-white/50">
          <Reveal variant="fade-up" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
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
          </Reveal>
        </footer>
      </div>
      </LandingScrollSnap>
    </>
  );
}

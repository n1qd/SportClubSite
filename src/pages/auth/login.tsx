import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  loginSchema,
  type LoginFormValues,
  registerSchema,
  type RegisterFormValues
} from "@/lib/validation/auth";
import { formatRuDateInput } from "@/lib/input-masks";
import { useAuth } from "@/hooks/useAuth";
import { roleToRedirect } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { toUserFacingMessage } from "@/lib/user-facing-error";

type Mode = "login" | "register";

const PLAN_LABELS: Record<string, string> = {
  basic: "Базовый",
  standard: "Стандарт",
  premium: "Премиум",
  "vip-year": "VIP Годовой"
};

function planFromQuery(raw: string | string[] | undefined): string | undefined {
  if (!raw) return undefined;
  const key = Array.isArray(raw) ? raw[0] : raw;
  return PLAN_LABELS[key] ? key : undefined;
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, register: registerUser } = useAuth();
  const { language } = useTranslation();
  const planKey = planFromQuery(router.query.plan);
  const selectedPlanName = planKey ? PLAN_LABELS[planKey] : undefined;

  // Если в URL ?mode=register — показать регистрацию
  useEffect(() => {
    if (router.query.mode === "register") setMode("register");
  }, [router.query.mode]);

  const loginForm = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      lastName: "",
      firstName: "",
      middleName: "",
      birthDate: "",
      gender: "MALE",
      height: undefined as unknown as number,
      weight: undefined as unknown as number,
      fitnessGoal: "MAINTENANCE",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  const birthDateField = registerForm.register("birthDate");

  const handleLoginSubmit = loginForm.handleSubmit(async (values) => {
    setError(null);
    setLoading(true);
    try {
      const role = await login(values.email, values.password);
      // Редирект по роли
      const from = router.query.from as string | undefined;
      window.location.href = from || roleToRedirect(role);
    } catch (e: any) {
      setError(toUserFacingMessage(e, language));
    } finally {
      setLoading(false);
    }
  });

  const handleRegisterSubmit = registerForm.handleSubmit(async (values) => {
    setError(null);
    setLoading(true);
    try {
      await registerUser(values.email, values.password, {
        lastName: values.lastName,
        firstName: values.firstName,
        middleName: values.middleName,
        birthDate: values.birthDate,
        gender: values.gender as "MALE" | "FEMALE",
        height: values.height,
        weight: values.weight,
        fitnessGoal: values.fitnessGoal as any
      });
      window.location.href = "/client/dashboard";
    } catch (e: any) {
      setError(toUserFacingMessage(e, language));
    } finally {
      setLoading(false);
    }
  });

  return (
    <PublicLayout title={mode === "login" ? "Вход" : "Регистрация"}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[color:var(--hsc-surface)] p-1">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(null); }}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              mode === "login"
                ? "bg-[color:var(--hsc-panel)] text-white shadow"
                : "text-slate-700"
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError(null); }}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              mode === "register"
                ? "bg-[color:var(--hsc-panel)] text-white shadow"
                : "text-slate-700"
            }`}
          >
            Регистрация
          </button>
        </div>

        {mode === "register" && selectedPlanName && (
          <div
            className="rounded-xl border border-emerald-800/15 bg-emerald-50/90 px-3 py-2.5 text-xs leading-relaxed text-emerald-950"
            role="status"
          >
            Выбран тариф: <span className="font-bold">{selectedPlanName}</span>.
            Завершите регистрацию — дальнейшее оформление абонемента будет в личном
            кабинете.
          </div>
        )}

        <form
          onSubmit={mode === "login" ? handleLoginSubmit : handleRegisterSubmit}
          className="space-y-3"
        >
          {mode === "register" && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Фамилия</label>
                  <Input
                    {...registerForm.register("lastName")}
                    placeholder="Иванов"
                    error={registerForm.formState.errors.lastName?.message}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Имя</label>
                  <Input
                    {...registerForm.register("firstName")}
                    placeholder="Иван"
                    error={registerForm.formState.errors.firstName?.message}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Отчество</label>
                <Input
                  {...registerForm.register("middleName")}
                  placeholder="Иванович"
                  error={registerForm.formState.errors.middleName?.message}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Дата рождения</label>
                <Input
                  ref={birthDateField.ref}
                  name={birthDateField.name}
                  onBlur={birthDateField.onBlur}
                  value={registerForm.watch("birthDate")}
                  onChange={(e) =>
                    registerForm.setValue("birthDate", formatRuDateInput(e.target.value), {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  placeholder="ДД.ММ.ГГГГ"
                  maxLength={10}
                  inputMode="numeric"
                  error={registerForm.formState.errors.birthDate?.message}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Пол</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["MALE", "FEMALE"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => registerForm.setValue("gender", g)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                        registerForm.watch("gender") === g
                          ? "border-hsc-panel bg-hsc-panel text-white"
                          : "border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      {g === "MALE" ? "Мужской" : "Женский"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Рост (см)</label>
                  <Input
                    type="number"
                    step="1"
                    {...registerForm.register("height")}
                    placeholder="170"
                    error={registerForm.formState.errors.height?.message}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Вес (кг)</label>
                  <Input
                    type="number"
                    step="0.1"
                    {...registerForm.register("weight")}
                    placeholder="70"
                    error={registerForm.formState.errors.weight?.message}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Цель</label>
                <select
                  {...registerForm.register("fitnessGoal")}
                  className="block w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm"
                >
                  <option value="MAINTENANCE">Поддержание формы</option>
                  <option value="WEIGHT_LOSS">Похудение</option>
                  <option value="MUSCLE_GAIN">Набор массы</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
            <Input
              {...(mode === "login" ? loginForm.register("email") : registerForm.register("email"))}
              type="email"
              placeholder="example@mail.com"
              error={
                mode === "login"
                  ? loginForm.formState.errors.email?.message
                  : registerForm.formState.errors.email?.message
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Пароль</label>
            <Input
              {...(mode === "login" ? loginForm.register("password") : registerForm.register("password"))}
              type="password"
              placeholder="Минимум 6 символов"
              error={
                mode === "login"
                  ? loginForm.formState.errors.password?.message
                  : registerForm.formState.errors.password?.message
              }
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Подтверждение пароля</label>
              <Input
                {...registerForm.register("confirmPassword")}
                type="password"
                error={registerForm.formState.errors.confirmPassword?.message}
              />
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
          )}

          <Button type="submit" fullWidth disabled={loading} className="mt-1">
            {loading
              ? "Загрузка..."
              : mode === "login"
              ? "Войти"
              : "Зарегистрироваться"}
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const hasToken = Boolean(req.cookies["hsc_token"]);
  if (hasToken) {
    // Перенаправляем по роли из cookie
    const roleCookie = req.cookies["hsc_role"] ?? "CLIENT";
    const roleMap: Record<string, string> = {
      ADMIN: "/admin/dashboard",
      MANAGER: "/manager/dashboard",
      TRAINER: "/trainer/dashboard",
      CLIENT: "/client/dashboard"
    };
    const destination = roleMap[roleCookie] || "/client/dashboard";
    return {
      redirect: { destination, permanent: false }
    };
  }
  return { props: {} };
};

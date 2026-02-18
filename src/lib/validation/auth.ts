import * as yup from "yup";

export const loginSchema = yup.object({
  email: yup.string().email("Введите корректный email").required("Email обязателен"),
  password: yup.string().min(6, "Минимум 6 символов").required("Пароль обязателен")
});

export type LoginFormValues = yup.InferType<typeof loginSchema>;

export const registerSchema = yup
  .object({
    lastName: yup.string().trim().required("Фамилия обязательна"),
    firstName: yup.string().trim().required("Имя обязательно"),
    middleName: yup.string().trim().optional(),
    birthDate: yup
      .string()
      .matches(/^\d{2}\.\d{2}\.\d{4}$/, "Формат: ДД.ММ.ГГГГ")
      .required("Дата рождения обязательна"),
    gender: yup.mixed<"MALE" | "FEMALE">().oneOf(["MALE", "FEMALE"]).required(),
    height: yup
      .number()
      .typeError("Введите рост в сантиметрах")
      .min(120, "Минимальный рост 120 см")
      .max(250, "Максимальный рост 250 см"),
    weight: yup
      .number()
      .typeError("Введите вес в килограммах")
      .min(30, "Минимальный вес 30 кг")
      .max(300, "Максимальный вес 300 кг"),
    fitnessGoal: yup
      .mixed<"WEIGHT_LOSS" | "MUSCLE_GAIN" | "MAINTENANCE">()
      .oneOf(["WEIGHT_LOSS", "MUSCLE_GAIN", "MAINTENANCE"])
      .required(),
    email: yup.string().email("Введите корректный email").required("Email обязателен"),
    password: yup.string().min(6, "Минимум 6 символов").required("Пароль обязателен"),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref("password")], "Пароли не совпадают")
      .required("Подтверждение пароля обязательно")
  })
  .required();

export type RegisterFormValues = yup.InferType<typeof registerSchema>;


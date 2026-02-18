import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import { getAllUsers, getAllTrainers } from "@/lib/db";
import type { User } from "@/lib/models";
import type { Trainer } from "@/lib/models";

type Props = AuthedPageProps;

const SPECIALIZATION_LABELS: Record<string, string> = {
  FITNESS: "Фитнес",
  BODYBUILDING: "Бодибилдинг",
  CROSSFIT: "Кроссфит",
  YOGA: "Йога",
  PILATES: "Пилатес",
  BOXING: "Бокс",
  SWIMMING: "Плавание",
  CARDIO: "Кардио"
};

export default function AdminTrainers(_props: Props) {
  const [trainerUsers, setTrainerUsers] = useState<User[]>([]);
  const [trainerProfiles, setTrainerProfiles] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [users, profiles] = await Promise.all([
          getAllUsers(),
          getAllTrainers()
        ]);
        setTrainerUsers(users.filter((u) => u.role === "TRAINER"));
        setTrainerProfiles(profiles);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const byUserId = new Map(trainerProfiles.map((t) => [t.userId, t]));

  return (
    <AdminLayout title="Тренеры">
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-hsc-panel">
          Тренеры ({trainerUsers.length})
        </h2>

        {loading ? (
          <Card className="text-xs text-slate-700">Загрузка...</Card>
        ) : trainerUsers.length === 0 ? (
          <Card className="text-xs text-slate-700">
            Нет пользователей с ролью «Тренер». Назначьте роль в разделе «Клиенты» или создайте учётную запись тренера.
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {trainerUsers.map((u) => {
              const profile = byUserId.get(u.id);
              const fullName = [u.lastName, u.firstName, u.middleName]
                .filter(Boolean)
                .join(" ") || "Без имени";
              const spec = profile?.specialization
                ? (SPECIALIZATION_LABELS[profile.specialization] ?? profile.specialization)
                : "—";
              const price = profile?.pricePerTraining != null
                ? `${profile.pricePerTraining.toLocaleString("ru-RU")} ₽/тр.`
                : "—";
              const exp = profile?.experience != null
                ? `${profile.experience} лет`
                : "—";

              return (
                <Card
                  key={u.id}
                  className="rounded-xl border border-emerald-900/10 bg-white px-4 py-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      photoUrl={profile?.photoUrl ?? (profile as { photoURL?: string })?.photoURL ?? u.photoUrl}
                      name={fullName}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-hsc-panel">{fullName}</div>
                      <div className="mt-0.5 text-[11px] text-slate-600">
                        {u.email}
                        {u.phone ? ` • ${u.phone}` : ""}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800">
                          {spec}
                        </span>
                        <span className="text-[10px] text-slate-500">{price}</span>
                        {exp !== "—" && (
                          <span className="text-[10px] text-slate-500">Опыт: {exp}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["admin"]);

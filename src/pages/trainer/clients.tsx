import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { TrainerLayout } from "@/components/layout/TrainerLayout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import { getAllUsers } from "@/lib/db";
import type { User } from "@/lib/models";

type Props = AuthedPageProps;

function computeAge(birthDate: string): string {
  if (!birthDate) return "";
  const parts = birthDate.split(".");
  if (parts.length !== 3) return "";
  const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) {
    age--;
  }
  return age > 0 && age < 120 ? `${age} лет` : "";
}

function computeBMI(weight?: number, height?: number): string {
  if (!weight || !height || height < 1) return "";
  const h = height / 100;
  return (weight / (h * h)).toFixed(1);
}

export default function TrainerClients(_props: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const all = await getAllUsers();
        setUsers(all.filter((u) => u.role === "CLIENT"));
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = [u.lastName, u.firstName, u.middleName].join(" ").toLowerCase();
    return name.includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <TrainerLayout title="Клиенты">
      <div className="space-y-4">
        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-hsc-panel">Клиенты клуба ({users.length})</h2>
          <Input
            placeholder="Поиск по ФИО или email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Card>

        {loading ? (
          <Card className="text-xs text-slate-700">Загрузка...</Card>
        ) : (
          <Card className="max-h-[520px] space-y-2 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-xs text-slate-700">Клиентов не найдено.</p>
            )}
            {filtered.map((u) => {
              const name = [u.lastName, u.firstName, u.middleName].filter(Boolean).join(" ") || "Без имени";
              const age = computeAge(u.birthDate);
              const bmi = computeBMI(u.weight, u.height);
              return (
                <div key={u.id} className="rounded-xl border border-emerald-900/10 bg-white px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar photoUrl={u.photoUrl} name={name} size="sm" className="shrink-0" />
                      <span className="font-semibold text-hsc-panel truncate">{name}</span>
                    </div>
                    {age && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">{age}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-600">
                    <span>{u.email}</span>
                    {u.phone && <span>{u.phone}</span>}
                    {u.gender && <span>{u.gender === "MALE" ? "М" : "Ж"}</span>}
                    {u.weight && <span>{u.weight} кг</span>}
                    {u.height && <span>{u.height} см</span>}
                    {bmi && <span>ИМТ: {bmi}</span>}
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>
    </TrainerLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["trainer", "admin"]);

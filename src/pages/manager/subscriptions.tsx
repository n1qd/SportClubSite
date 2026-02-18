import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { ManagerLayout } from "@/components/layout/ManagerLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import { getAllSubscriptions, updateSubscription, addSubscription } from "@/lib/db";
import type { Subscription } from "@/lib/models";

type Props = AuthedPageProps;

const emptySub: Omit<Subscription, "id"> = {
  name: "",
  description: "",
  price: 0,
  durationDays: 30,
  features: [],
  iconEmoji: "🏋️",
  active: true,
};

export default function ManagerSubscriptions(_props: Props) {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Subscription | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [newForm, setNewForm] = useState<Omit<Subscription, "id">>(emptySub);
  const [newFeaturesStr, setNewFeaturesStr] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featuresStr, setFeaturesStr] = useState("");

  async function load() {
    setLoading(true);
    try {
      setSubs(await getAllSubscriptions());
    } catch {
      setSubs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openEdit(s: Subscription) {
    setForm({ ...s });
    setFeaturesStr(s.features?.join("\n") ?? "");
    setIsNew(false);
    setShowForm(true);
    setError(null);
  }

  function openNew() {
    setNewForm(emptySub);
    setNewFeaturesStr("");
    setIsNew(true);
    setShowForm(true);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const data = {
          ...newForm,
          features: newFeaturesStr.split("\n").map((f) => f.trim()).filter(Boolean),
        };
        await addSubscription(data);
      } else if (form) {
        const data = {
          name: form.name,
          description: form.description,
          price: form.price,
          durationDays: form.durationDays,
          features: featuresStr.split("\n").map((f) => f.trim()).filter(Boolean),
          iconEmoji: form.iconEmoji,
          active: form.active,
        };
        await updateSubscription(form.id, data);
      }
      await load();
      setShowForm(false);
      setForm(null);
      setIsNew(false);
    } catch (e: any) {
      setError(e?.message ?? "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ManagerLayout title="Абонементы">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-hsc-panel">
              Шаблоны абонементов (услуг)
            </h2>
            <p className="text-[11px] text-slate-600">
              Добавление нового вида абонемента и редактирование существующих. Выдачу абонементов клиентам выполняет администратор в разделе «Клиенты».
            </p>
          </div>
          <Button size="sm" onClick={openNew} className="text-xs whitespace-nowrap shrink-0">
            + Новый вид абонемента
          </Button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <Card className="text-xs text-slate-700">Загрузка...</Card>
        ) : (
          <Card className="space-y-2">
            {subs.length === 0 && (
              <p className="text-xs text-slate-700">Нет абонементов.</p>
            )}
            {subs.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-emerald-900/10 bg-white px-3 py-2 text-xs"
              >
                <div>
                  <span className="mr-1 text-lg">{s.iconEmoji}</span>
                  <span className="font-semibold text-hsc-panel">{s.name}</span>
                  <span className="ml-2 text-slate-500">
                    {s.price.toLocaleString("ru-RU")} ₽ / {s.durationDays} дн.
                  </span>
                  {!s.active && (
                    <span className="ml-2 rounded bg-red-100 px-1 py-0.5 text-[10px] text-red-700">
                      Неактивен
                    </span>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                  Изменить
                </Button>
              </div>
            ))}
          </Card>
        )}

        {showForm && (isNew || form) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card className="max-h-[85vh] w-full max-w-md space-y-3 overflow-y-auto">
              <h3 className="text-sm font-bold text-hsc-panel">
                {isNew ? "Новый вид абонемента" : "Редактирование абонемента"}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-600">Название</label>
                  <Input
                    value={isNew ? newForm.name : (form?.name ?? "")}
                    onChange={(e) =>
                      isNew
                        ? setNewForm({ ...newForm, name: e.target.value })
                        : form && setForm({ ...form, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600">Иконка</label>
                  <Input
                    value={isNew ? newForm.iconEmoji : (form?.iconEmoji ?? "")}
                    onChange={(e) =>
                      isNew
                        ? setNewForm({ ...newForm, iconEmoji: e.target.value })
                        : form && setForm({ ...form, iconEmoji: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-600">Описание</label>
                <Input
                  value={isNew ? newForm.description : (form?.description ?? "")}
                  onChange={(e) =>
                    isNew
                      ? setNewForm({ ...newForm, description: e.target.value })
                      : form && setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-600">Цена (₽)</label>
                  <Input
                    type="number"
                    value={isNew ? newForm.price : (form?.price ?? 0)}
                    onChange={(e) =>
                      isNew
                        ? setNewForm({ ...newForm, price: Number(e.target.value) })
                        : form && setForm({ ...form, price: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600">Дней</label>
                  <Input
                    type="number"
                    value={isNew ? newForm.durationDays : (form?.durationDays ?? 30)}
                    onChange={(e) =>
                      isNew
                        ? setNewForm({ ...newForm, durationDays: Number(e.target.value) })
                        : form && setForm({ ...form, durationDays: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-600">
                  Преимущества (по одному на строку)
                </label>
                <textarea
                  value={isNew ? newFeaturesStr : featuresStr}
                  onChange={(e) =>
                    isNew ? setNewFeaturesStr(e.target.value) : setFeaturesStr(e.target.value)
                  }
                  className="block w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm"
                  rows={4}
                />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={isNew ? newForm.active : (form?.active ?? true)}
                  onChange={(e) =>
                    isNew
                      ? setNewForm({ ...newForm, active: e.target.checked })
                      : form && setForm({ ...form, active: e.target.checked })
                  }
                />
                Активен
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setForm(null);
                    setIsNew(false);
                  }}
                >
                  Отмена
                </Button>
                <Button size="sm" disabled={saving} onClick={handleSave}>
                  {saving ? "Сохранение..." : isNew ? "Создать" : "Сохранить"}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </ManagerLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const result = await requireAuth(ctx, ["manager", "admin"]);
  if ("redirect" in result) return result;
  // Шаблоны абонементов управляет только руководитель; администратор только выдаёт абонементы клиентам
  if (result.props?.user?.role === "admin") {
    return { redirect: { destination: "/admin/dashboard", permanent: false } };
  }
  return result;
};

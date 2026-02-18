import { ReactNode } from "react";
import { BaseLayout } from "./BaseLayout";
import { Card } from "../ui/Card";

interface PublicLayoutProps {
  title?: string;
  children: ReactNode;
}

export function PublicLayout({ title, children }: PublicLayoutProps) {
  return (
    <BaseLayout title={title}>
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center space-y-3">
            <div className="panel-main flex h-28 w-28 items-center justify-center rounded-2xl">
              <div className="text-center">
                <div className="text-4xl">⚡</div>
                <div className="text-sm font-black tracking-[0.3em] uppercase">
                  HSC
                </div>
              </div>
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-black tracking-[0.25em] uppercase text-hsc-panel">
                HypeSportClub
              </h1>
              <p className="text-xs text-slate-600">
                Ваш цифровой фитнес-клуб
              </p>
            </div>
          </div>
          <Card>{children}</Card>
        </div>
      </div>
    </BaseLayout>
  );
}


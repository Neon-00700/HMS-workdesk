"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared/page-header";
import { UPLOAD_POLICIES } from "@/config/constants";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [orgName, setOrgName] = useState("همیاران");
  const [allowComments, setAllowComments] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);
  const [chatBg, setChatBg] = useState(true);
  const [sessionHours, setSessionHours] = useState("12");
  const [maxLogin, setMaxLogin] = useState("5");

  const save = () => toast.success("تنظیمات سامانه ذخیره شد.");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader title="تنظیمات سامانه" description="پیکربندی عمومی فضای کاری." />

      <Card>
        <CardHeader>
          <CardTitle>عمومی</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium">نام سازمان</label>
            <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="max-w-72" />
          </div>
          <ToggleRow label="نظرات روی تسک‌ها" desc="امکان ثبت نظر برای اعضای پروژه." value={allowComments} onChange={setAllowComments} />
          <ToggleRow label="ری‌اکشن پیام‌ها" desc="امکان واکنش اموجی در گفتگوها." value={allowReactions} onChange={setAllowReactions} />
          <ToggleRow label="پس‌زمینه سفارشی چت" desc="کاربران بتوانند پس‌زمینه گفتگو را تغییر دهند." value={chatBg} onChange={setChatBg} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>امنیت</CardTitle>
          <CardDescription>سیاست‌های نشست و ورود.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium">طول عمر نشست (ساعت)</label>
            <Input type="number" min={1} value={sessionHours} onChange={(e) => setSessionHours(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium">حداکثر تلاش ورود ناموفق</label>
            <Input type="number" min={3} value={maxLogin} onChange={(e) => setMaxLogin(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>سیاست فایل‌ها</CardTitle>
          <CardDescription>سقف‌ها و فرمت‌های مجاز آپلود (اعمال سمت سرور).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {Object.entries(UPLOAD_POLICIES).map(([k, p]) => (
            <div key={k} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-[13px]">
              <span className="font-medium">{p.label}</span>
              <span className="text-xs text-muted-foreground">
                حداکثر {formatBytes(p.maxSizeBytes)} · {p.maxFiles} فایل · {p.extensions.slice(0, 6).join("، ")}
                {p.extensions.length > 6 && "…"}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div>
        <Button onClick={save}>ذخیره تنظیمات</Button>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      <Switch checked={value} onCheckedChange={onChange} />
    </label>
  );
}

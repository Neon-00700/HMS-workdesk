"use client";
import { useState } from "react";
import { useTheme } from "next-themes";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sun, Moon, Monitor, Bell, ShieldCheck, Palette, SlidersHorizontal, MonitorSmartphone, RotateCcw, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { authApi, ApiError } from "@/services/api";
import { db } from "@/services/mock-db";
import { useAuthStore } from "@/stores/auth-store";
import { timeAgoFa } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function useLocalSetting<T>(key: string, initial: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`hw_setting_${key}`);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = (v: T) => {
    setVal(v);
    try { localStorage.setItem(`hw_setting_${key}`, JSON.stringify(v)); } catch { /* ignore */ }
  };
  return [val, set];
}

const passSchema = z.object({
  current: z.string().min(4, "رمز فعلی را وارد کنید."),
  next: z.string().min(8, "رمز جدید حداقل ۸ کاراکتر."),
  confirm: z.string(),
}).refine((d) => d.next === d.confirm, { message: "تکرار رمز مطابقت ندارد.", path: ["confirm"] });

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [notif, setNotif] = useLocalSetting("notifications", { task: true, mention: true, deadline: true, message: true, sound: true });
  const [landing, setLanding] = useLocalSetting("landing", "/dashboard");
  const [dateFmt, setDateFmt] = useLocalSetting("datefmt", "fa-long");
  const [enterSend, setEnterSend] = useLocalSetting("enterSend", true);
  const [name, setName] = useState(user?.name ?? "");
  const [about, setAbout] = useState("");

  const pass = useForm<z.infer<typeof passSchema>>({ resolver: zodResolver(passSchema) });

  const changePassword = async (v: z.infer<typeof passSchema>) => {
    try {
      await authApi.changePassword(v.current, v.next);
      toast.success("رمز عبور تغییر کرد.");
      pass.reset();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "خطا در تغییر رمز.");
    }
  };

  const sessions = authApi.sessions();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <PageHeader title="تنظیمات" description="حساب کاربری، امنیت، ظاهر و رفتار سامانه." />

      <Tabs defaultValue="account">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="account"><ShieldCheck className="h-4 w-4" /> حساب و امنیت</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="h-4 w-4" /> ظاهر</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4" /> اعلان‌ها</TabsTrigger>
          <TabsTrigger value="app"><SlidersHorizontal className="h-4 w-4" /> سامانه</TabsTrigger>
        </TabsList>

        {/* Account */}
        <TabsContent value="account" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>اطلاعات حساب</CardTitle>
              <CardDescription>نام نمایشی و مشخصات پایه حساب شما.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium">نام و نام خانوادگی</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium">ایمیل</label>
                  <Input value={user?.email ?? ""} disabled dir="ltr" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium">نام کاربری</label>
                <Input value={user?.username ?? ""} disabled dir="ltr" />
              </div>
              <div>
                <Button onClick={() => {
                  if (user && name.trim()) {
                    const updated = { ...user, name: name.trim() };
                    db.update((d) => { const u = d.users.find((x) => x.id === user.id); if (u) u.name = name.trim(); });
                    setUser(updated);
                    toast.success("نام به‌روز شد.");
                  }
                }}>ذخیره</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>تغییر رمز عبور</CardTitle>
              <CardDescription>رمز قوی با حداقل ۸ کاراکتر انتخاب کنید.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={pass.handleSubmit(changePassword)} className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Input type="password" placeholder="رمز فعلی" {...pass.register("current")} />
                  {pass.formState.errors.current && <p className="mt-1 text-xs text-destructive">{pass.formState.errors.current.message}</p>}
                </div>
                <div>
                  <Input type="password" placeholder="رمز جدید" {...pass.register("next")} />
                  {pass.formState.errors.next && <p className="mt-1 text-xs text-destructive">{pass.formState.errors.next.message}</p>}
                </div>
                <div>
                  <Input type="password" placeholder="تکرار رمز جدید" {...pass.register("confirm")} />
                  {pass.formState.errors.confirm && <p className="mt-1 text-xs text-destructive">{pass.formState.errors.confirm.message}</p>}
                </div>
                <div className="sm:col-span-3">
                  <Button type="submit" loading={pass.formState.isSubmitting}>تغییر رمز</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>نشست‌های فعال</CardTitle>
              <CardDescription>دستگاه‌هایی که هم‌اکنون وارد حساب شما هستند.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <MonitorSmartphone className="h-5 w-5 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{s.device} {s.current && <span className="text-emerald-600">(جاری)</span>}</p>
                    <p className="text-[11px] text-muted-foreground"><span dir="ltr">{s.ip}</span> · {timeAgoFa(s.lastActive)}</p>
                  </div>
                  {!s.current && (
                    <Button variant="outline" size="sm" onClick={() => toast.success("نشست بسته شد.")}>بستن نشست</Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>تم ظاهری</CardTitle>
              <CardDescription>حالت روشن، تیره یا پیروی از سیستم.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {([
                  { k: "light", label: "روشن", icon: <Sun className="h-5 w-5" /> },
                  { k: "dark", label: "تیره", icon: <Moon className="h-5 w-5" /> },
                  { k: "system", label: "سیستم", icon: <Monitor className="h-5 w-5" /> },
                ] as const).map((t) => (
                  <button
                    key={t.k}
                    onClick={() => { setTheme(t.k); toast.success(`تم «${t.label}» فعال شد.`); }}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-5 transition-all hover:border-primary/50",
                      theme === t.k && "border-primary bg-primary/5 ring-1 ring-primary",
                    )}
                  >
                    {t.icon}
                    <span className="text-sm font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-muted/50 p-3 text-[13px] text-muted-foreground">
                زبان رابط: <strong className="text-foreground">فارسی (راست‌به‌چپ)</strong> — زیرساخت چندزبانه برای انگلیسی آماده است.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>ترجیحات اعلان</CardTitle>
              <CardDescription>انتخاب کنید چه رویدادهایی به شما اطلاع‌رسانی شود.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {([
                ["task", "تخصیص تسک جدید", "وقتی تسکی به شما سپرده می‌شود."],
                ["mention", "منشن شدن", "وقتی در پیام یا نظری منشن می‌شوید."],
                ["deadline", "یادآوری ددلاین", "نزدیک شدن یا گذشتن موعد تحویل."],
                ["message", "پیام جدید", "پیام مستقیم یا گروهی جدید."],
                ["sound", "صدای اعلان", "پخش صدا هنگام دریافت اعلان."],
              ] as const).map(([k, label, desc]) => (
                <label key={k} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl p-3 hover:bg-muted/50">
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">{desc}</span>
                  </span>
                  <Switch checked={notif[k]} onCheckedChange={(v) => setNotif({ ...notif, [k]: v })} />
                </label>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* App */}
        <TabsContent value="app" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>رفتار سامانه</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium">صفحه پیش‌فرض ورود</label>
                  <Select value={landing} onValueChange={(v) => { setLanding(v); toast.success("ذخیره شد."); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="/dashboard">داشبورد</SelectItem>
                      <SelectItem value="/my-tasks">وظایف من</SelectItem>
                      <SelectItem value="/calendar">تقویم</SelectItem>
                      <SelectItem value="/messages">پیام‌ها</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium">قالب تاریخ</label>
                  <Select value={dateFmt} onValueChange={(v) => { setDateFmt(v); toast.success("ذخیره شد."); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fa-long">فارسی کامل (۱۲ مهر ۱۴۰۵)</SelectItem>
                      <SelectItem value="fa-short">فارسی کوتاه (۱۲ مهر)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3">
                <span>
                  <span className="block text-sm font-medium">ارسال پیام با Enter</span>
                  <span className="block text-xs text-muted-foreground">در غیر این صورت از دکمه ارسال استفاده کنید.</span>
                </span>
                <Switch checked={enterSend} onCheckedChange={(v) => setEnterSend(v)} />
              </label>
            </CardContent>
          </Card>

          <Card className="border-warning/30">
            <CardHeader>
              <CardTitle>فضای کاری</CardTitle>
              <CardDescription>پاک‌سازی کامل داده‌ها و شروع مجدد فقط با حساب مدیر.</CardDescription>
            </CardHeader>
            <CardContent>
              <ConfirmDialog
                trigger={<Button variant="outline"><RotateCcw className="h-4 w-4" /> بازنشانی فضای کاری</Button>}
                title="بازنشانی فضای کاری"
                description="همه کاربران (به‌جز مدیر)، پروژه‌ها، تسک‌ها، پیام‌ها، فایل‌ها و رویدادها حذف می‌شود. این عمل قابل بازگشت نیست."
                confirmLabel="بازنشانی"
                onConfirm={() => { db.reset(); toast.success("فضای کاری بازنشانی شد."); setTimeout(() => location.reload(), 600); }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}



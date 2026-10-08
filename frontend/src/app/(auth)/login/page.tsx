"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, User as UserIcon, Box } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WORKSPACE_NAME } from "@/config/constants";
import { authApi, ApiError } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";

const schema = z.object({
  username: z.string().min(1, "نام کاربری یا ایمیل را وارد کنید."),
  password: z.string().min(4, "رمز عبور حداقل ۴ کاراکتر است."),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

function LoginInner() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/dashboard";
  const setUser = useAuthStore((s) => s.setUser);
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState("");
  const [pending, setPending] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "admin", password: "admin123", remember: true },
  });

  const submit = async (v: FormValues) => {
    setPending(true);
    setServerError("");
    try {
      const { user } = await authApi.login(v.username, v.password);
      setUser(user);
      router.replace(next);
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "خطا در ورود. دوباره تلاش کنید.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <img
        src="/images/login-mountains.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/10" />

      {/* Card is centered in the viewport; the brand block sits bottom-left. */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 lg:p-10">
        {/* Login card */}
        <div className="w-full max-w-[26rem] rounded-3xl bg-white p-8 shadow-pop sm:p-10">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0c2318] text-white">
              <Box className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-2xl font-extrabold text-slate-900">ورود به حساب کاربری</h1>
            <p className="mt-1.5 text-[13px] text-slate-500">برای ورود به حساب خود، اطلاعات خود را وارد کنید.</p>
          </div>

          <form onSubmit={handleSubmit(submit)} className="mt-7 flex flex-col gap-4">
            <div>
              <div className="relative">
                <UserIcon className="absolute start-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="username"
                  placeholder="نام کاربری"
                  className="h-12 rounded-xl border-slate-200 bg-white ps-11 text-[15px]"
                  autoComplete="username"
                  {...register("username")}
                />
              </div>
              {errors.username && <p className="mt-1 text-xs text-destructive">{errors.username.message}</p>}
            </div>
            <div>
              <div className="relative">
                <Lock className="absolute start-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="رمز عبور"
                  className="h-12 rounded-xl border-slate-200 bg-white pe-11 ps-11 text-[15px]"
                  autoComplete="current-password"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "پنهان کردن رمز" : "نمایش رمز"}
                  className="absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <label className="flex cursor-pointer items-center justify-end gap-2 text-sm text-slate-600">
              مرا به خاطر بسپار
              <input type="checkbox" {...register("remember")} className="h-4 w-4 rounded accent-emerald-700" />
            </label>

            {serverError && (
              <p className="rounded-xl bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive" role="alert">{serverError}</p>
            )}

            <Button type="submit" loading={pending} className="h-12 w-full rounded-xl bg-emerald-800 text-base font-bold hover:bg-emerald-900">
              ورود
            </Button>

            <div className="rounded-xl bg-slate-100 p-3 text-center text-xs leading-6 text-slate-500">
              <span className="font-semibold text-slate-700">حساب مدیر پیش‌فرض: </span>
              نام کاربری <code className="rounded bg-white px-1.5 py-0.5 font-mono" dir="ltr">admin</code>
              {" "}رمز <code className="rounded bg-white px-1.5 py-0.5 font-mono" dir="ltr">admin123</code>
            </div>

            <div className="flex items-center gap-3 text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-sm">یا</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <p className="flex items-center justify-center gap-2 text-center text-[13px] text-slate-500">
              <Lock className="h-4 w-4" />
              این سیستم مخصوص استفاده داخلی شرکت می‌باشد.
            </p>
          </form>
        </div>
      </div>

      {/* Brand (bottom-left on the image) */}
      <div className="absolute bottom-10 left-10 z-10 hidden text-white lg:block">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
          <Box className="h-6 w-6" />
        </span>
        <p className="mt-3 text-xl font-extrabold">{WORKSPACE_NAME}</p>
        <p className="mt-0.5 text-[13px] text-white/80">سیستم مدیریت پروژه و تیم</p>
        <div className="my-3 h-px w-24 bg-white/30" />
        <p className="text-[13px] leading-6 text-white/85">همکاری بهتر<br />دستاوردهای بزرگتر<br />نتایج ماندگار</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (error) {
          setMessage(error.message);
        } else if (data.user) {
          router.replace("/");
        }
      })
      .catch((error: unknown) => {
        setMessage(
          error instanceof Error ? error.message : "Unable to check your session.",
        );
      });
  }, [router, supabase]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Supabase is not configured for this deployment.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
        return;
      }

      const nextPath = new URLSearchParams(window.location.search).get("next");
      const nextUrl = new URL(nextPath ?? "/", window.location.origin);
      const destination =
        nextUrl.origin === window.location.origin
          ? `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
          : "/";
      router.replace(destination);
      router.refresh();
    } catch (error: unknown) {
      setMessage(
        error instanceof Error ? error.message : "Unable to sign in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8">
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Mail aria-hidden="true" className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Sign in to Outreach
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Access your private acquisition workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setPassword(event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LockKeyhole aria-hidden="true" className="h-4 w-4" />
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {message && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {message}
          </p>
        )}
        <p className="mt-6 text-center text-xs text-slate-500">
          Accounts are provisioned by your workspace administrator.
        </p>
      </div>
    </main>
  );
}

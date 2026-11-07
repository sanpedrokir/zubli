"use client";

import { useAuth, useSignIn, useSignUp } from "@clerk/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { env } from "@/lib/env";

type Step = "email" | "code";
type Flow = "signIn" | "signUp";

const inputClass =
  "min-h-11 w-full rounded-card border border-border bg-background px-4 text-base";
const buttonClass =
  "min-h-11 w-full rounded-full bg-violet-600 px-4 font-bold text-white shadow-soft hover:bg-violet-500 disabled:opacity-60";

export function EmailOtpForm() {
  if (!env.clerkPublishableKey) {
    return (
      <p className="rounded-card bg-surface p-4 text-sm">
        Sign-in is not configured yet. Set <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> in{" "}
        <code>.env.local</code>.
      </p>
    );
  }
  return <OtpFlow />;
}

/** Passwordless email + one-time code. Existing emails sign in; new emails sign up. */
function OtpFlow() {
  const { signIn, fetchStatus: signInStatus } = useSignIn();
  const { signUp, fetchStatus: signUpStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [flow, setFlow] = useState<Flow>("signIn");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const busy = signInStatus === "fetching" || signUpStatus === "fetching";

  if (isSignedIn) {
    return (
      <p>
        You are signed in.{" "}
        <Link className="font-bold text-violet-600" href="/">
          Go home
        </Link>
      </p>
    );
  }

  const goHome = ({ decorateUrl }: { decorateUrl: (u: string) => string }) => {
    const url = decorateUrl("/");
    if (url.startsWith("http")) window.location.href = url;
    else router.push(url);
  };

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const emailAddress = email.trim();
    const existing = await signIn.emailCode.sendCode({ emailAddress });
    if (!existing.error) {
      setFlow("signIn");
      return setStep("code");
    }
    // Unknown email -> create the account instead.
    if (existing.error.code !== "form_identifier_not_found") {
      return setMessage(existing.error.longMessage ?? existing.error.message);
    }
    const created = await signUp.create({ emailAddress });
    if (created.error) return setMessage(created.error.longMessage ?? created.error.message);
    const sent = await signUp.verifications.sendEmailCode();
    if (sent.error) return setMessage(sent.error.longMessage ?? sent.error.message);
    setFlow("signUp");
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const trimmed = code.trim();
    if (flow === "signIn") {
      const res = await signIn.emailCode.verifyCode({ code: trimmed });
      if (res.error) return setMessage(res.error.longMessage ?? res.error.message);
      if (signIn.status === "complete") await signIn.finalize({ navigate: goHome });
      else setMessage("Additional verification is required for this account.");
    } else {
      const res = await signUp.verifications.verifyEmailCode({ code: trimmed });
      if (res.error) return setMessage(res.error.longMessage ?? res.error.message);
      if (signUp.status === "complete") await signUp.finalize({ navigate: goHome });
      else setMessage("Sign-up needs more information (check required fields in Clerk).");
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      {step === "email" ? (
        <form onSubmit={sendCode} className="flex flex-col gap-3">
          <label htmlFor="email" className="font-bold">
            Your email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <button type="submit" disabled={busy} className={buttonClass}>
            Send me a code
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-3">
          <label htmlFor="code" className="font-bold">
            Enter the code sent to {email}
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClass}
          />
          <button type="submit" disabled={busy} className={buttonClass}>
            Verify
          </button>
          <button
            type="button"
            className="min-h-11 text-sm text-foreground/70"
            onClick={() => {
              setStep("email");
              setCode("");
              setMessage(null);
            }}
          >
            Use a different email
          </button>
        </form>
      )}
      {message && (
        <p role="alert" className="mt-3 text-sm text-coral-500">
          {message}
        </p>
      )}
      {/* Clerk bot protection mount point, required for custom sign-up flows */}
      <div id="clerk-captcha" />
    </div>
  );
}

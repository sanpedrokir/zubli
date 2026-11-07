import type { Metadata } from "next";
import { EmailOtpForm } from "@/features/auth/email-otp-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <section>
      <div className="mb-4 h-1.5 w-16 rounded-full bg-violet-500" />
      <h1 className="font-display text-3xl font-extrabold">Sign in to Zubli</h1>
      <p className="mt-2 mb-6 text-foreground/70">
        Enter your email and we will send you a one-time code. No password needed.
      </p>
      <EmailOtpForm />
    </section>
  );
}

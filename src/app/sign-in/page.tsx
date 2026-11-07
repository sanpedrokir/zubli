import type { Metadata } from "next";
import { EmailOtpForm } from "@/features/auth/email-otp-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <section>
      <div className="mb-4 h-1.5 w-16 rounded-full bg-pink-500" />
      <h1 className="font-display text-3xl font-extrabold">Welcome to Zubli</h1>
      <p className="mt-2 mb-6 text-foreground/70">
        Share ideas, join small gatherings and chat with people who want to do the same. Enter your email and we will send you a one-time code — no password needed.
      </p>
      <EmailOtpForm />
    </section>
  );
}

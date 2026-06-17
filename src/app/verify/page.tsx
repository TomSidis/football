"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HEBREW } from "@/lib/utils";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const supabase = createClient();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const token = otp.join("");

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) { setError("קוד שגוי. נסה שוב."); setLoading(false); return; }
    router.push("/onboarding");
  }

  async function handleResend() {
    await supabase.auth.resend({ type: "signup", email });
    setResent(true);
    setTimeout(() => setResent(false), 30000);
  }

  return (
    <div className="stadium-bg min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full glass mb-4">
            <span className="text-4xl">📲</span>
          </div>
          <h1 className="text-2xl font-black">{HEBREW.enterOtp}</h1>
          <p className="text-white/50 text-sm mt-2">{HEBREW.otpSent}</p>
          {email && <p className="text-cyan-400 text-sm mt-1">{email}</p>}
        </div>

        <div className="glass rounded-3xl p-8">
          {error && (
            <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 mb-4 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify}>
            {/* OTP inputs — LTR for digit input */}
            <div className="flex gap-3 justify-center mb-6" dir="ltr">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-400 transition-colors"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || otp.join("").length < 6}
              className="w-full bg-gradient-to-l from-cyan-500 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {loading ? "..." : HEBREW.verify}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-4">
            לא קיבלת?{" "}
            <button
              onClick={handleResend}
              disabled={resent}
              className="text-cyan-400 hover:underline disabled:opacity-40"
            >
              {resent ? "נשלח! ✓" : HEBREW.resendOtp}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="stadium-bg min-h-screen flex items-center justify-center">
        <div className="text-white/40 text-sm">טוען...</div>
      </div>
    }>
      <VerifyForm />
    </Suspense>
  );
}

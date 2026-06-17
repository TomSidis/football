"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HEBREW } from "@/lib/utils";
import SelfEvaluation from "@/components/onboarding/SelfEvaluation";
import AchievementList from "@/components/onboarding/AchievementList";
import GoalBoard from "@/components/onboarding/GoalBoard";

const STEPS = [
  { id: 1, title: HEBREW.selfEvalTitle, icon: "🎯" },
  { id: 2, title: HEBREW.achievementsTitle, icon: "🏆" },
  { id: 3, title: HEBREW.goalsTitle, icon: "🚀" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        supabase.from("profiles").select("onboarding_step").eq("id", user.id).single()
          .then(({ data }) => {
            if (data && data.onboarding_step >= 3) router.push("/dashboard");
            else if (data) setCurrentStep(Math.max(1, (data.onboarding_step ?? 0) + 1));
          });
      }
    });
  }, []);

  async function advanceStep(step: number) {
    await supabase.from("profiles").update({ onboarding_step: step }).eq("id", userId);
    if (step >= 3) { router.push("/dashboard"); return; }
    setCurrentStep(step + 1);
  }

  const progress = (currentStep / 3) * 100;

  return (
    <div className="stadium-bg min-h-screen">
      {/* Header */}
      <div className="glass border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚽</span>
              <div>
                <h1 className="font-bold text-sm">{HEBREW.onboardingTitle}</h1>
                <p className="text-white/40 text-xs">{HEBREW.onboardingSubtitle}</p>
              </div>
            </div>
            <span className="text-white/50 text-sm">
              {HEBREW.step} {currentStep} {HEBREW.of} 3
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-cyan-400 to-purple-600 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step indicators */}
          <div className="flex justify-between mt-3">
            {STEPS.map((step) => (
              <div key={step.id} className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  currentStep > step.id
                    ? "bg-gradient-to-br from-cyan-500 to-purple-600 text-white"
                    : currentStep === step.id
                    ? "border-2 border-cyan-400 text-cyan-400"
                    : "border border-white/20 text-white/30"
                }`}>
                  {currentStep > step.id ? "✓" : step.icon}
                </div>
                <span className={`text-xs hidden sm:block transition-colors ${
                  currentStep >= step.id ? "text-white/80" : "text-white/30"
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {currentStep === 1 && (
          <SelfEvaluation userId={userId} onComplete={() => advanceStep(1)} />
        )}
        {currentStep === 2 && (
          <AchievementList userId={userId} onComplete={() => advanceStep(2)} />
        )}
        {currentStep === 3 && (
          <GoalBoard userId={userId} onComplete={() => advanceStep(3)} />
        )}
      </div>
    </div>
  );
}

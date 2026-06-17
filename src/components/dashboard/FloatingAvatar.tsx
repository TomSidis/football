"use client";

import { useState, useRef, useEffect } from "react";
import { HEBREW } from "@/lib/utils";

interface Profile {
  full_name: string;
  role_model_name: string;
  position: string;
  date_of_birth: string;
}

interface Props {
  profile: Profile;
  isStreaking: boolean;
  hasMissedDeadline: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

function getAvatarState(isStreaking: boolean, hasMissedDeadline: boolean) {
  if (isStreaking) return { emoji: "🔥", animation: "animate-bounce", text: HEBREW.avatarStreak, color: "border-yellow-400" };
  if (hasMissedDeadline) return { emoji: "😤", animation: "animate-pulse", text: HEBREW.avatarOverdue, color: "border-red-500" };
  return { emoji: "⭐", animation: "animate-float", text: HEBREW.avatarGreeting, color: "border-cyan-400" };
}

export default function FloatingAvatar({ profile, isStreaking, hasMissedDeadline }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const state = getAvatarState(isStreaking, hasMissedDeadline);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, profile }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "שגיאה בחיבור. נסה שוב." }]);
    }
    setLoading(false);
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 left-6 z-50 w-16 h-16 rounded-full glass border-2 ${state.color} flex items-center justify-center text-3xl ${state.animation} glow-accent shadow-2xl`}
        title="פתח צ'אט עם המנטור שלך"
      >
        {state.emoji}
      </button>

      {/* Chat drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-6">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative w-full sm:w-96 h-[80vh] sm:h-[600px] glass border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-white/10 shrink-0">
              <div className={`w-12 h-12 rounded-full glass border-2 ${state.color} flex items-center justify-center text-2xl ${state.animation}`}>
                {state.emoji}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">{profile.role_model_name ?? "המנטור שלך"}</p>
                <p className="text-white/40 text-xs">המנטור הדיגיטלי שלך</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white text-xl w-8 h-8 flex items-center justify-center">
                ×
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className={`text-5xl mb-3 ${state.animation}`}>{state.emoji}</div>
                  <p className="text-white/70 text-sm leading-relaxed">{state.text}</p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {["מה עלי לשפר?", "תן לי מוטיבציה", "מה המטרה שלי השבוע?"].map((q) => (
                      <button
                        key={q}
                        onClick={() => { setInput(q); }}
                        className="glass border border-white/10 rounded-xl px-3 py-1.5 text-xs hover:border-cyan-400/50 hover:text-cyan-400 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-white/10 text-white"
                      : "bg-gradient-to-br from-cyan-600/30 to-purple-600/30 border border-cyan-500/20 text-white"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-end">
                  <div className="glass border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/60">
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce" style={{ animationDelay: "0ms" }}>•</span>
                      <span className="animate-bounce" style={{ animationDelay: "150ms" }}>•</span>
                      <span className="animate-bounce" style={{ animationDelay: "300ms" }}>•</span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-white/10 flex gap-2 shrink-0">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={HEBREW.chatPlaceholder}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 text-sm"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-gradient-to-l from-cyan-500 to-purple-600 text-white font-bold px-4 rounded-xl disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                {HEBREW.send}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Profile {
  full_name: string;
  role_model_name: string;
  position: string;
}

export default function DashboardNav({ profile }: { profile: Profile }) {
  const supabase = createClient();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav className="glass border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚽</span>
          <div>
            <span className="font-black text-sm text-gradient">Football Stars</span>
            {profile?.role_model_name && (
              <p className="text-white/30 text-xs">דוגמנית: {profile.role_model_name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-white/60 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/5 transition-colors hidden sm:block">
            ראשי
          </Link>
          <Link href="/dashboard/scheduler" className="text-white/60 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/5 transition-colors hidden sm:block">
            לוח
          </Link>
          <Link href="/dashboard/matches" className="text-white/60 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/5 transition-colors hidden sm:block">
            משחקים
          </Link>
          <button
            onClick={handleLogout}
            className="text-white/40 hover:text-red-400 text-xs transition-colors"
          >
            יציאה
          </button>
        </div>
      </div>
    </nav>
  );
}

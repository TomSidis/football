"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { HEBREW } from "@/lib/utils";
import DashboardNav from "@/components/dashboard/DashboardNav";

const CATEGORIES = [
  { value: "ball_control", label: HEBREW.categories.ball_control, icon: "⚽" },
  { value: "dribbling", label: HEBREW.categories.dribbling, icon: "💫" },
  { value: "weak_foot", label: HEBREW.categories.weak_foot, icon: "🦶" },
  { value: "free_kicks", label: HEBREW.categories.free_kicks, icon: "🎯" },
  { value: "highlights", label: HEBREW.categories.highlights, icon: "⭐" },
];

const VIDEO_LIBRARY = [
  { category: "ball_control", title: "טכניקת שליטה בסיסית", videoId: "D1hR0yIHG2E" },
  { category: "dribbling", title: "7 תרגילי דריבל", videoId: "Y8DyIUCt9Y4" },
  { category: "weak_foot", title: "אימון רגל חלשה", videoId: "bFqPFo9sLDc" },
  { category: "free_kicks", title: "בעיטות עונשין כמו רונאלדו", videoId: "FeaqBXDuCgw" },
  { category: "highlights", title: "מקצועי — תנועת גוף ואפקטיביות", videoId: "OHBkO8OQvBw" },
];

interface MediaItem {
  id: string;
  storage_path: string;
  file_type: string;
  category: string;
  title: string;
  created_at: string;
}

export default function VaultPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<{ full_name: string; role_model_name: string; position: string } | null>(null);
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("highlights");
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(p);
      const { data } = await supabase.from("media_items").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setItems(data ?? []);
    });
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, fileType: "video" | "image") {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("media").upload(path, file);

    if (!uploadError) {
      const { data } = await supabase.from("media_items").insert({
        user_id: userId,
        storage_path: path,
        file_type: fileType,
        category: activeCategory,
        title: uploadTitle || file.name,
      }).select().single();
      if (data) setItems((prev) => [data, ...prev]);
    }
    setUploading(false);
    setUploadTitle("");
    e.target.value = "";
  }

  const videosForCategory = VIDEO_LIBRARY.filter((v) => v.category === activeCategory);
  const myItemsForCategory = items.filter((i) => i.category === activeCategory);

  return (
    <div className="stadium-bg min-h-screen pb-24">
      {profile && <DashboardNav profile={profile} />}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-black">{HEBREW.mediaTitle}</h1>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeCategory === cat.value
                  ? "bg-gradient-to-l from-cyan-500 to-purple-600 text-white"
                  : "glass border border-white/10 text-white/60 hover:border-white/20"
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Upload section */}
        <div className="glass rounded-3xl p-5 space-y-3">
          <h3 className="font-bold text-sm text-white/70">העלה תוכן משלך</h3>
          <input
            type="text"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="כותרת (אופציונלי)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 text-sm"
          />
          <div className="flex gap-2">
            <label className={`flex-1 glass border border-white/10 rounded-xl py-2.5 text-center text-sm cursor-pointer hover:border-white/20 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(e, "video")} />
              🎬 {uploading ? "מעלה..." : HEBREW.uploadVideo}
            </label>
            <label className={`flex-1 glass border border-white/10 rounded-xl py-2.5 text-center text-sm cursor-pointer hover:border-white/20 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "image")} />
              📸 {uploading ? "מעלה..." : HEBREW.uploadPhoto}
            </label>
          </div>
        </div>

        {/* My uploads */}
        {myItemsForCategory.length > 0 && (
          <div>
            <h3 className="font-bold text-sm text-white/60 mb-3">הקבצים שלי</h3>
            <div className="grid grid-cols-2 gap-3">
              {myItemsForCategory.map((item) => (
                <div key={item.id} className="glass rounded-2xl p-3">
                  <div className="aspect-video bg-white/5 rounded-xl flex items-center justify-center mb-2">
                    <span className="text-3xl">{item.file_type === "video" ? "🎬" : "📸"}</span>
                  </div>
                  <p className="text-xs font-bold truncate">{item.title}</p>
                  <p className="text-white/30 text-[10px] mt-0.5">
                    {new Date(item.created_at).toLocaleDateString("he-IL")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Training video library */}
        {videosForCategory.length > 0 && (
          <div>
            <h3 className="font-bold text-sm text-white/60 mb-3">ספריית אימונים — {CATEGORIES.find((c) => c.value === activeCategory)?.label}</h3>
            <div className="space-y-4">
              {videosForCategory.map((video) => (
                <div key={video.videoId} className="glass rounded-2xl overflow-hidden">
                  <div className="aspect-video">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${video.videoId}`}
                      title={video.title}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-sm">{video.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

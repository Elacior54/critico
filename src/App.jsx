import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

const CAT_COLORS = { Design: "#A855F7", Code: "#10B981", Business: "#F59E0B", Foto: "#3B82F6", Text: "#EC4899", Sonstiges: "#6B7280" };
const CATEGORIES = ["Alle", "Design", "Code", "Business", "Foto", "Text", "Sonstiges"];
const FB = {
  good: { label: "Was gut ist", short: "Gut", color: "#4ADE80", bg: "rgba(74,222,128,0.07)", border: "rgba(74,222,128,0.18)" },
  bad:  { label: "Was besser sein könnte", short: "Verbesserung", color: "#F87171", bg: "rgba(248,113,113,0.07)", border: "rgba(248,113,113,0.18)" },
  tip:  { label: "Konkrete Tipps", short: "Tipp", color: "#60A5FA", bg: "rgba(96,165,250,0.07)", border: "rgba(96,165,250,0.18)" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60) return "gerade eben";
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
  return `vor ${Math.floor(diff / 86400)} Tag(en)`;
}

function initials(name = "") {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "??";
}

function hashColor(str = "") {
  const colors = ["#A855F7","#10B981","#3B82F6","#EC4899","#F59E0B","#EF4444","#06B6D4"];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

// ─── UI Components ───────────────────────────────────────────────────────────

function Avatar({ name, size = 32 }) {
  const color = hashColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color + "1A", border: `1px solid ${color}33`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 600, color, flexShrink: 0,
    }}>{initials(name)}</div>
  );
}

function CatBadge({ cat }) {
  const c = CAT_COLORS[cat] || "#6B7280";
  return (
    <span style={{ background: c + "18", color: c, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, border: `1px solid ${c}30`, letterSpacing: "0.02em" }}>
      {cat}
    </span>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
      <div style={{ width: 22, height: 22, border: "2px solid #1A1A1A", borderTopColor: "#F0C040", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────

function AuthModal({ onClose }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess("Bestätigungs-E-Mail gesendet! Bitte dein Postfach checken.");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}>
      <div style={{ background: "#0E0E0E", border: "1px solid #222220", borderRadius: 20, padding: "28px 26px", width: "100%", maxWidth: 400 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 6 }}>
          {mode === "login" ? "Einloggen" : "Registrieren"}
        </div>
        <div style={{ fontSize: 13, color: "#555550", marginBottom: 22 }}>
          {mode === "login" ? "Noch kein Account?" : "Schon registriert?"}
          {" "}
          <span onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} style={{ color: "#F0C040", cursor: "pointer" }}>
            {mode === "login" ? "Jetzt registrieren" : "Einloggen"}
          </span>
        </div>

        <label style={labelStyle}>E-Mail</label>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="deine@email.de" style={inputStyle} onKeyDown={e => e.key === "Enter" && submit()} />

        <label style={{ ...labelStyle, marginTop: 12 }}>Passwort</label>
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Mindestens 6 Zeichen" style={inputStyle} onKeyDown={e => e.key === "Enter" && submit()} />

        {error && <div style={{ fontSize: 13, color: "#F87171", marginTop: 12, padding: "8px 12px", background: "rgba(248,113,113,0.08)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.15)" }}>{error}</div>}
        {success && <div style={{ fontSize: 13, color: "#4ADE80", marginTop: 12, padding: "8px 12px", background: "rgba(74,222,128,0.08)", borderRadius: 8, border: "1px solid rgba(74,222,128,0.15)" }}>{success}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#444440", fontFamily: "inherit", fontSize: 13, cursor: "pointer", padding: "10px 16px" }}>Abbrechen</button>
          <button onClick={submit} disabled={loading} style={{ background: "#F0C040", color: "#080808", border: "none", borderRadius: 9, padding: "11px 24px", fontFamily: "inherit", fontWeight: 600, fontSize: 13, cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1, marginLeft: "auto" }}>
            {loading ? "..." : mode === "login" ? "Einloggen" : "Registrieren"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const inputStyle = {
  width: "100%", background: "#080808", border: "1px solid #222220", borderRadius: 10,
  padding: "11px 13px", fontFamily: "inherit", fontSize: 14, color: "#F0F0EB",
  outline: "none", boxSizing: "border-box",
};
const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: "#444440", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" };

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser]           = useState(null);
  const [profile, setProfile]     = useState(null);
  const [posts, setPosts]         = useState([]);
  const [feedback, setFeedback]   = useState({});
  const [view, setView]           = useState("feed");
  const [activePost, setActive]   = useState(null);
  const [cat, setCat]             = useState("Alle");
  const [showCreate, setCreate]   = useState(false);
  const [showAuth, setShowAuth]   = useState(false);
  const [showFb, setShowFb]       = useState(false);
  const [fbType, setFbType]       = useState("good");
  const [fbText, setFbText]       = useState("");
  const [newPost, setNewPost]     = useState({ title: "", content: "", category: "Design", tags: "" });
  const [voted, setVoted]         = useState({});
  const [loading, setLoading]     = useState(true);
  const [loadingFb, setLoadingFb] = useState(false);
  const [hover, setHover]         = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Google Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@500;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
      if (event === "SIGNED_IN" && window.location.hash.includes("access_token")) {
        window.history.replaceState({}, document.title, window.location.pathname);
        setShowAuth(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data);
  };

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select("*, profiles(username)")
      .order("created_at", { ascending: false });
    if (!error) setPosts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Fetch feedback for active post
  const fetchFeedback = useCallback(async (postId) => {
    setLoadingFb(true);
    const { data, error } = await supabase
      .from("feedback")
      .select("*, profiles(username)")
      .eq("post_id", postId)
      .order("vote_count", { ascending: false });
    if (!error) setFeedback(prev => ({ ...prev, [postId]: data || [] }));

    // Fetch user's existing votes
    if (user) {
      const { data: voteData } = await supabase.from("votes").select("feedback_id").eq("user_id", user.id);
      if (voteData) {
        const map = {};
        voteData.forEach(v => { map[v.feedback_id] = true; });
        setVoted(map);
      }
    }
    setLoadingFb(false);
  }, [user]);

  const openPost = (p) => {
    setActive(p);
    setView("detail");
    setShowFb(false);
    fetchFeedback(p.id);
  };

  const goBack = () => { setView("feed"); setActive(null); };

  // Submit feedback
  const submitFb = async () => {
    if (!fbText.trim() || !user) return;
    const { data, error } = await supabase.from("feedback").insert({
      post_id: activePost.id,
      author_id: user.id,
      type: fbType,
      content: fbText.trim(),
    }).select("*, profiles(username)").single();
    if (!error && data) {
      setFeedback(prev => ({ ...prev, [activePost.id]: [data, ...(prev[activePost.id] || [])] }));
      setPosts(prev => prev.map(p => p.id === activePost.id ? { ...p, feedback_count: p.feedback_count + 1 } : p));
      setFbText(""); setShowFb(false);
    }
  };

  // Vote
  const doVote = async (fbId) => {
    if (!user || voted[fbId]) return;
    setVoted(prev => ({ ...prev, [fbId]: true }));
    setFeedback(prev => {
      const updated = {};
      for (const k in prev) updated[k] = prev[k].map(f => f.id === fbId ? { ...f, vote_count: f.vote_count + 1 } : f);
      return updated;
    });
    await supabase.from("votes").insert({ feedback_id: fbId, user_id: user.id });
  };

  // Upload images
  const uploadImages = async (files) => {
    const urls = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("post-images").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("post-images").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  // Submit new post
  const submitPost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim() || !user) return;
    setUploading(true);
    let imageUrls = [];
    if (imageFiles.length > 0) imageUrls = await uploadImages(imageFiles);

    const { data, error } = await supabase.from("posts").insert({
      author_id: user.id,
      title: newPost.title.trim(),
      content: newPost.content.trim(),
      category: newPost.category,
      tags: newPost.tags.split(",").map(t => t.trim()).filter(Boolean),
      image_urls: imageUrls,
    }).select("*, profiles(username)").single();

    setUploading(false);
    if (!error && data) {
      setPosts(prev => [data, ...prev]);
      setNewPost({ title: "", content: "", category: "Design", tags: "" });
      setImageFiles([]);
      setCreate(false);
    }
  };

  const logout = async () => { await supabase.auth.signOut(); };

  const filtered = cat === "Alle" ? posts : posts.filter(p => p.category === cat);
  const postFb = activePost ? (feedback[activePost.id] || []) : [];
  const grouped = { good: postFb.filter(f => f.type === "good"), bad: postFb.filter(f => f.type === "bad"), tip: postFb.filter(f => f.type === "tip") };

  return (
    <div style={{ minHeight: "100vh", background: "#080808", fontFamily: "'DM Sans', -apple-system, sans-serif", color: "#F0F0EB" }}>

      {/* ── Header ── */}
      <header style={{ background: "rgba(8,8,8,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid #1A1A1A", padding: "0 28px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div onClick={() => { setView("feed"); setActive(null); }} style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-0.5px", cursor: "pointer", userSelect: "none" }}>
          critico<span style={{ color: "#F0C040" }}>.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user ? (
            <>
              <span style={{ fontSize: 13, color: "#555550" }}>{profile?.username || user.email}</span>
              <button onClick={logout} style={{ background: "none", border: "1px solid #222220", borderRadius: 8, padding: "6px 14px", fontFamily: "inherit", fontSize: 12, color: "#555550", cursor: "pointer" }}>Logout</button>
              <button onClick={() => setCreate(true)} style={{ background: "#F0C040", color: "#080808", border: "none", borderRadius: 9, padding: "8px 18px", fontFamily: "inherit", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 17, lineHeight: 1 }}>+</span> Post erstellen
              </button>
            </>
          ) : (
            <button onClick={() => setShowAuth(true)} style={{ background: "#F0C040", color: "#080808", border: "none", borderRadius: 9, padding: "8px 18px", fontFamily: "inherit", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              Einloggen
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 700, margin: "0 auto", padding: "28px 20px 60px" }}>

        {/* ── FEED ── */}
        {view === "feed" && (
          <>
            <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4, marginBottom: 24, scrollbarWidth: "none" }}>
              {CATEGORIES.map(c => {
                const active = cat === c;
                const color = c === "Alle" ? "#F0C040" : (CAT_COLORS[c] || "#F0C040");
                return (
                  <button key={c} onClick={() => setCat(c)} style={{ background: active ? color : "#161616", color: active ? "#080808" : "#777770", border: `1px solid ${active ? color : "#222220"}`, borderRadius: 20, padding: "6px 15px", fontFamily: "inherit", fontWeight: 500, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.12s" }}>{c}</button>
                );
              })}
            </div>

            {loading ? <Spinner /> : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#333330", fontSize: 14 }}>Noch keine Posts — sei der Erste!</div>
            ) : filtered.map(post => (
              <div key={post.id} onClick={() => openPost(post)} onMouseEnter={() => setHover(post.id)} onMouseLeave={() => setHover(null)}
                style={{ background: hover === post.id ? "#111111" : "#0E0E0E", border: `1px solid ${hover === post.id ? "#282828" : "#1A1A1A"}`, borderRadius: 16, padding: "20px 22px", marginBottom: 10, cursor: "pointer", transition: "all 0.13s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}>
                  <Avatar name={post.profiles?.username || "?"} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{post.profiles?.username || "Anonym"}</span>
                  <CatBadge cat={post.category} />
                  <span style={{ fontSize: 12, color: "#3A3A38", marginLeft: "auto" }}>{timeAgo(post.created_at)}</span>
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, lineHeight: 1.38, marginBottom: 8 }}>{post.title}</div>
                <div style={{ fontSize: 14, lineHeight: 1.65, color: "#666660", marginBottom: 16, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{post.content}</div>
                {post.image_urls?.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                    {post.image_urls.slice(0, 3).map((url, i) => (
                      <img key={i} src={url} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 8, border: "1px solid #1A1A1A" }} />
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  {(post.tags || []).slice(0, 3).map(t => (
                    <span key={t} style={{ background: "#161616", color: "#444440", borderRadius: 6, padding: "3px 9px", fontSize: 11, border: "1px solid #222220" }}>{t}</span>
                  ))}
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#3A3A38" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    {post.feedback_count} Feedbacks
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── DETAIL ── */}
        {view === "detail" && activePost && (
          <>
            <button onClick={goBack} style={{ background: "none", border: "none", color: "#555550", cursor: "pointer", fontFamily: "inherit", fontSize: 13, display: "flex", alignItems: "center", gap: 5, padding: 0, marginBottom: 22 }}>← Zurück</button>

            <div style={{ background: "#0E0E0E", border: "1px solid #1A1A1A", borderRadius: 18, padding: "24px 26px", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                <Avatar name={activePost.profiles?.username || "?"} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{activePost.profiles?.username || "Anonym"}</span>
                <CatBadge cat={activePost.category} />
                <span style={{ fontSize: 12, color: "#3A3A38", marginLeft: "auto" }}>{timeAgo(activePost.created_at)}</span>
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, lineHeight: 1.32, marginBottom: 12 }}>{activePost.title}</div>
              <div style={{ fontSize: 15, lineHeight: 1.72, color: "#888880", marginBottom: 16 }}>{activePost.content}</div>
              {activePost.image_urls?.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {activePost.image_urls.map((url, i) => (
                    <img key={i} src={url} alt="" style={{ maxWidth: "100%", maxHeight: 340, objectFit: "cover", borderRadius: 10, border: "1px solid #1A1A1A" }} />
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(activePost.tags || []).map(t => (
                  <span key={t} style={{ background: "#161616", color: "#444440", borderRadius: 6, padding: "3px 9px", fontSize: 11, border: "1px solid #222220" }}>{t}</span>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 8, marginBottom: 26 }}>
              {Object.entries(FB).map(([type, cfg]) => (
                <div key={type} style={{ flex: 1, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: cfg.color }}>{grouped[type].length}</div>
                  <div style={{ fontSize: 11, color: cfg.color, opacity: 0.65, marginTop: 2 }}>{cfg.short}</div>
                </div>
              ))}
            </div>

            {loadingFb ? <Spinner /> : (
              <>
                {postFb.length === 0 && (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "#333330", fontSize: 14, marginBottom: 20 }}>Noch kein Feedback — sei der Erste!</div>
                )}
                {Object.entries(FB).map(([type, cfg]) =>
                  grouped[type].length > 0 && (
                    <div key={type} style={{ marginBottom: 22 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color }} />
                        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 11, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.1em" }}>{cfg.label}</span>
                      </div>
                      {grouped[type].map(fb => (
                        <div key={fb.id} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 13, padding: "14px 16px", marginBottom: 8, display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                              <Avatar name={fb.profiles?.username || "?"} size={26} />
                              <span style={{ fontSize: 12, fontWeight: 500, color: "#555550" }}>{fb.profiles?.username || "Anonym"}</span>
                            </div>
                            <div style={{ fontSize: 14, lineHeight: 1.62, color: "#C8C8C4" }}>{fb.content}</div>
                          </div>
                          <button onClick={() => doVote(fb.id)} style={{ background: "none", border: "none", cursor: user ? (voted[fb.id] ? "default" : "pointer") : "default", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "2px 4px", borderRadius: 7, minWidth: 30 }}>
                            <span style={{ fontSize: 13, color: voted[fb.id] ? cfg.color : "#333330", transition: "color 0.13s" }}>▲</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: voted[fb.id] ? cfg.color : "#3A3A38" }}>{fb.vote_count}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </>
            )}

            {/* Add Feedback */}
            {user ? showFb ? (
              <div style={{ background: "#0E0E0E", border: "1px solid #1A1A1A", borderRadius: 16, padding: "20px 22px", marginTop: 4 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Feedback hinterlassen</div>
                <div style={{ display: "flex", gap: 7, marginBottom: 16 }}>
                  {Object.entries(FB).map(([type, cfg]) => (
                    <button key={type} onClick={() => setFbType(type)} style={{ flex: 1, background: fbType === type ? cfg.bg : "transparent", border: `1px solid ${fbType === type ? cfg.border : "#222220"}`, borderRadius: 8, padding: "8px 6px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500, color: fbType === type ? cfg.color : "#444440", transition: "all 0.12s" }}>{cfg.short}</button>
                  ))}
                </div>
                <textarea rows={4} placeholder={fbType === "good" ? "Was gefällt dir besonders gut?" : fbType === "bad" ? "Was könnte besser sein?" : "Welchen konkreten Tipp hast du?"} value={fbText} onChange={e => setFbText(e.target.value)}
                  style={{ ...inputStyle, resize: "none", lineHeight: 1.62, marginBottom: 12 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={submitFb} style={{ background: "#F0C040", color: "#080808", border: "none", borderRadius: 8, padding: "10px 22px", fontFamily: "inherit", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Absenden</button>
                  <button onClick={() => setShowFb(false)} style={{ background: "none", border: "none", color: "#444440", fontFamily: "inherit", fontSize: 13, cursor: "pointer", padding: "10px 14px" }}>Abbrechen</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowFb(true)}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#F0C040"; e.currentTarget.style.color = "#F0C040"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#222220"; e.currentTarget.style.color = "#3A3A38"; }}
                style={{ background: "#0E0E0E", border: "1px dashed #222220", borderRadius: 16, padding: "16px 22px", width: "100%", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 14, color: "#3A3A38", transition: "all 0.15s", marginTop: 4 }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>+</span> Feedback hinterlassen
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)}
                style={{ background: "#0E0E0E", border: "1px dashed #222220", borderRadius: 16, padding: "16px 22px", width: "100%", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 14, color: "#3A3A38", marginTop: 4 }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>+</span> Einloggen um Feedback zu geben
              </button>
            )}
          </>
        )}
      </main>

      {/* ── CREATE MODAL ── */}
      {showCreate && (
        <div onClick={e => { if (e.target === e.currentTarget) setCreate(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20, overflowY: "auto" }}>
          <div style={{ background: "#0E0E0E", border: "1px solid #222220", borderRadius: 20, padding: "28px 26px", width: "100%", maxWidth: 500, margin: "auto" }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 22 }}>Neuen Post erstellen</div>

            <label style={labelStyle}>Kategorie</label>
            <select value={newPost.category} onChange={e => setNewPost(p => ({ ...p, category: e.target.value }))}
              style={{ ...inputStyle, cursor: "pointer", marginBottom: 14 }}>
              {["Design","Code","Business","Foto","Text","Sonstiges"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <label style={labelStyle}>Titel</label>
            <input value={newPost.title} onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))} placeholder="Was möchtest du Feedback zu?" style={{ ...inputStyle, marginBottom: 14 }} />

            <label style={labelStyle}>Beschreibung</label>
            <textarea rows={4} value={newPost.content} onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))} placeholder="Beschreibe was du gemacht hast und worauf du Feedback möchtest..."
              style={{ ...inputStyle, resize: "none", lineHeight: 1.62, marginBottom: 14 }} />

            <label style={labelStyle}>Bilder hochladen (optional)</label>
            <input type="file" accept="image/*" multiple onChange={e => setImageFiles(Array.from(e.target.files).slice(0, 5))}
              style={{ ...inputStyle, marginBottom: imageFiles.length > 0 ? 8 : 14, cursor: "pointer" }} />
            {imageFiles.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                {imageFiles.map((f, i) => (
                  <span key={i} style={{ fontSize: 11, background: "#161616", color: "#666660", borderRadius: 6, padding: "3px 8px", border: "1px solid #222220" }}>{f.name}</span>
                ))}
              </div>
            )}

            <label style={labelStyle}>Tags (kommagetrennt)</label>
            <input value={newPost.tags} onChange={e => setNewPost(p => ({ ...p, tags: e.target.value }))} placeholder="z.B. Logo, Branding, React"
              style={{ ...inputStyle, marginBottom: 22 }} />

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setCreate(false)} style={{ background: "none", border: "none", color: "#444440", fontFamily: "inherit", fontSize: 13, cursor: "pointer", padding: "10px 16px" }}>Abbrechen</button>
              <button onClick={submitPost} disabled={uploading} style={{ background: "#F0C040", color: "#080808", border: "none", borderRadius: 9, padding: "11px 24px", fontFamily: "inherit", fontWeight: 600, fontSize: 13, cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.6 : 1 }}>
                {uploading ? "Wird hochgeladen..." : "Veröffentlichen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
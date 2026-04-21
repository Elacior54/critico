import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

// ── Tokens ────────────────────────────────────────────────────────────────────
const T = {
  bgPage:'#080808', bgCard:'#0D0D0D', bgHover:'#111111',
  bgInput:'#0A0A0A', bgSubtle:'#161616',
  borderFaint:'#1C1C1C', borderDefault:'#222220', borderHover:'#2E2E2C',
  fgPrimary:'#F0F0EB', fgSecondary:'#C8C8C4', fgMuted:'#888880',
  fgDim:'#666660', fgDimmer:'#555550', fgLabel:'#444440',
  fgGhost:'#3A3A38',
  accent:'#F0C040', accentFg:'#080808',
  catDesign:'#A855F7', catCode:'#10B981', catBusiness:'#F59E0B',
  catFoto:'#3B82F6', catText:'#EC4899', catSonstiges:'#6B7280',
  fbGood:'#4ADE80', fbBad:'#F87171', fbTip:'#60A5FA',
};
const CAT_COLORS = { Design:T.catDesign, Code:T.catCode, Business:T.catBusiness, Foto:T.catFoto, Text:T.catText, Sonstiges:T.catSonstiges };
const CATEGORIES = ['Alle','Design','Code','Business','Foto','Text','Sonstiges'];
const FB = {
  good:{ label:'Was gut ist',           short:'Gut',          color:T.fbGood, bg:'rgba(74,222,128,0.07)',  border:'rgba(74,222,128,0.2)'  },
  bad: { label:'Was besser sein könnte', short:'Verbesserung', color:T.fbBad,  bg:'rgba(248,113,113,0.07)', border:'rgba(248,113,113,0.2)' },
  tip: { label:'Konkrete Tipps',         short:'Tipp',         color:T.fbTip,  bg:'rgba(96,165,250,0.07)',  border:'rgba(96,165,250,0.2)'  },
};

// ── Utils ─────────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (d < 60)    return 'gerade eben';
  if (d < 3600)  return `vor ${Math.floor(d/60)} Min.`;
  if (d < 86400) return `vor ${Math.floor(d/3600)} Std.`;
  return `vor ${Math.floor(d/86400)} Tag(en)`;
}
function initials(n='') { return n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'??'; }
function hashColor(s='') {
  const c=[T.catDesign,T.catCode,T.catFoto,T.catText,T.catBusiness,T.fbBad,T.fbTip];
  let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0;
  return c[h%c.length];
}

// ── Styles ────────────────────────────────────────────────────────────────────
const inputStyle = { width:'100%', background:T.bgInput, border:`1px solid ${T.borderDefault}`, borderRadius:10, padding:'11px 13px', fontFamily:'inherit', fontSize:14, color:T.fgPrimary, outline:'none', boxSizing:'border-box' };
const labelStyle = { display:'block', fontSize:11, fontWeight:600, color:T.fgLabel, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.08em' };
const ANIM = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes pulseGlow { 0%,100% { opacity:0.4; } 50% { opacity:0.7; } }
  .card-enter { animation: slideUp 0.22s cubic-bezier(0.16,1,0.3,1) both; }
  .modal-enter { animation: fadeIn 0.15s ease both; }
  .modal-panel { animation: slideUp 0.22s cubic-bezier(0.16,1,0.3,1) both; }
`;

// ── Atoms ─────────────────────────────────────────────────────────────────────
function Avatar({ name, size=32, onClick }) {
  const color = hashColor(name);
  return (
    <div onClick={onClick} style={{ width:size, height:size, borderRadius:'50%', background:color+'18', border:`1.5px solid ${color}35`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.34, fontWeight:700, color, flexShrink:0, cursor:onClick?'pointer':'default', letterSpacing:'-0.5px' }}>
      {initials(name)}
    </div>
  );
}
function CatBadge({ cat }) {
  const c = CAT_COLORS[cat]||T.catSonstiges;
  return <span style={{ background:c+'15', color:c, borderRadius:6, padding:'2px 9px', fontSize:11, fontWeight:600, border:`1px solid ${c}28`, letterSpacing:'0.02em' }}>{cat}</span>;
}
function Tag({ children }) {
  return <span style={{ background:'#141414', color:T.fgLabel, borderRadius:6, padding:'3px 9px', fontSize:11, border:`1px solid ${T.borderDefault}` }}>{children}</span>;
}
function FeedbackIcon({ type, size=13 }) {
  if (type==='good') return <span style={{fontSize:size,color:T.fbGood}}>✦</span>;
  if (type==='bad')  return <span style={{fontSize:size,color:T.fbBad}}>◆</span>;
  return <span style={{fontSize:size,color:T.fbTip}}>◈</span>;
}
function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}>
      <div style={{ width:22, height:22, border:`2px solid ${T.borderDefault}`, borderTopColor:T.accent, borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
function Header({ user, profile, onLogin, onCreatePost, onProfile }) {
  return (
    <header style={{ background:'rgba(8,8,8,0.94)', backdropFilter:'blur(20px) saturate(180%)', WebkitBackdropFilter:'blur(20px) saturate(180%)', borderBottom:`1px solid ${T.borderFaint}`, padding:'0 32px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:23, letterSpacing:'-0.6px', cursor:'pointer', userSelect:'none', display:'flex', alignItems:'center', gap:1 }} onClick={onProfile}>
        <span style={{ color:T.fgPrimary }}>critico</span>
        <span style={{ color:T.accent, textShadow:`0 0 20px ${T.accent}60` }}>.</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {user ? <>
          <button onClick={onCreatePost} style={{ background:T.accent, color:T.accentFg, border:'none', borderRadius:9, padding:'8px 20px', fontFamily:'inherit', fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:7, boxShadow:`0 0 24px ${T.accent}30`, transition:'box-shadow 0.2s' }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 0 32px ${T.accent}55`}
            onMouseLeave={e=>e.currentTarget.style.boxShadow=`0 0 24px ${T.accent}30`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="#080808" strokeWidth="2" strokeLinecap="round"/></svg>
            Post erstellen
          </button>
          <div onClick={onProfile} style={{ display:'flex', alignItems:'center', padding:'5px 8px', borderRadius:9, cursor:'pointer', transition:'background 0.12s' }}
            onMouseEnter={e=>e.currentTarget.style.background=T.bgSubtle}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <Avatar name={profile?.username||user.email} size={32} />
          </div>
        </> : (
          <button onClick={onLogin} style={{ background:T.accent, color:T.accentFg, border:'none', borderRadius:9, padding:'8px 20px', fontFamily:'inherit', fontWeight:600, fontSize:13, cursor:'pointer', boxShadow:`0 0 24px ${T.accent}30` }}>Einloggen</button>
        )}
      </div>
    </header>
  );
}

// ── Hero Banner ───────────────────────────────────────────────────────────────
function HeroBanner({ postCount }) {
  return (
    <div style={{ position:'relative', overflow:'hidden', borderRadius:20, marginBottom:28, padding:'32px 30px', background:T.bgCard, border:`1px solid ${T.borderFaint}` }}>
      <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:`radial-gradient(circle, ${T.accent}18 0%, transparent 70%)`, pointerEvents:'none', animation:'pulseGlow 4s ease-in-out infinite' }} />
      <div style={{ position:'absolute', bottom:-60, left:-20, width:180, height:180, borderRadius:'50%', background:`radial-gradient(circle, ${T.catDesign}12 0%, transparent 70%)`, pointerEvents:'none', animation:'pulseGlow 5s ease-in-out infinite 1s' }} />
      <div style={{ position:'relative', zIndex:1 }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:`${T.accent}12`, border:`1px solid ${T.accent}25`, borderRadius:20, padding:'4px 12px', marginBottom:16 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:T.accent, boxShadow:`0 0 8px ${T.accent}` }} />
          <span style={{ fontSize:11, fontWeight:600, color:T.accent, letterSpacing:'0.08em', textTransform:'uppercase' }}>Community Feedback</span>
        </div>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:28, lineHeight:1.2, marginBottom:10, letterSpacing:'-0.5px' }}>
          Zeig deine Arbeit.<br/>
          <span style={{ color:T.accent }}>Bekomm echtes Feedback.</span>
        </div>
        <div style={{ fontSize:14, color:T.fgMuted, lineHeight:1.65, marginBottom:20 }}>
          Teile deine Projekte, Designs und Ideen — und erhalte strukturiertes, konstruktives Feedback von der Community.
        </div>
        <div style={{ display:'flex', gap:24 }}>
          {[{n:postCount,l:'Posts'},{n:'∞',l:'Feedback'},{n:'100%',l:'Kostenlos'}].map(({n,l})=>(
            <div key={l}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:T.accent }}>{n}</div>
              <div style={{ fontSize:12, color:T.fgDim }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Auth Modal ────────────────────────────────────────────────────────────────
function AuthModal({ onClose }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async () => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode==='login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess('Bestätigungs-E-Mail gesendet!');
      }
    } catch(e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="modal-enter" onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:20 }}>
      <div className="modal-panel" style={{ background:'#0C0C0C', border:`1px solid ${T.borderDefault}`, borderRadius:22, padding:'30px 28px', width:'100%', maxWidth:400 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, marginBottom:6 }}>{mode==='login'?'Einloggen':'Registrieren'}</div>
        <div style={{ fontSize:13, color:T.fgDimmer, marginBottom:24 }}>
          {mode==='login'?'Noch kein Account?':'Schon registriert?'}{' '}
          <span onClick={()=>{setMode(mode==='login'?'register':'login');setError('');}} style={{ color:T.accent, cursor:'pointer', fontWeight:500 }}>{mode==='login'?'Jetzt registrieren':'Einloggen'}</span>
        </div>
        <label style={labelStyle}>E-Mail</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="deine@email.de" style={{...inputStyle,marginBottom:14}} onKeyDown={e=>e.key==='Enter'&&submit()} />
        <label style={labelStyle}>Passwort</label>
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Mindestens 6 Zeichen" style={inputStyle} onKeyDown={e=>e.key==='Enter'&&submit()} />
        {error && <div style={{ fontSize:13, color:T.fbBad, marginTop:12, padding:'8px 12px', background:'rgba(248,113,113,0.08)', borderRadius:8, border:'1px solid rgba(248,113,113,0.15)' }}>{error}</div>}
        {success && <div style={{ fontSize:13, color:T.fbGood, marginTop:12, padding:'8px 12px', background:'rgba(74,222,128,0.08)', borderRadius:8 }}>{success}</div>}
        <div style={{ display:'flex', gap:8, marginTop:22 }}>
          <button onClick={onClose} style={{ background:'none', border:'none', color:T.fgLabel, fontFamily:'inherit', fontSize:13, cursor:'pointer', padding:'10px 16px' }}>Abbrechen</button>
          <button onClick={submit} disabled={loading} style={{ background:T.accent, color:T.accentFg, border:'none', borderRadius:9, padding:'11px 26px', fontFamily:'inherit', fontWeight:600, fontSize:13, cursor:loading?'default':'pointer', marginLeft:'auto', opacity:loading?0.6:1, boxShadow:`0 0 24px ${T.accent}30` }}>
            {loading?'...':(mode==='login'?'Einloggen':'Registrieren')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Profile Modal ────────────────────────────────────────────────────────
function EditProfileModal({ profile, onClose, onSave }) {
  const [form, setForm] = useState({ username:profile?.username||'', bio:profile?.bio||'', age:profile?.age||'', location:profile?.location||'', gender:profile?.gender||'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true); setError('');
    const updates = { username:form.username.trim(), bio:form.bio.trim()||null, age:form.age?parseInt(form.age):null, location:form.location.trim()||null, gender:form.gender||null };
    const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    onSave(updates); onClose();
  };

  return (
    <div className="modal-enter" onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:20, overflowY:'auto' }}>
      <div className="modal-panel" style={{ background:'#0C0C0C', border:`1px solid ${T.borderDefault}`, borderRadius:22, padding:'30px 28px', width:'100%', maxWidth:460, margin:'auto' }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, marginBottom:24 }}>Profil bearbeiten</div>
        <label style={labelStyle}>Name</label>
        <input value={form.username} onChange={e=>setForm(p=>({...p,username:e.target.value}))} placeholder="Dein Name" style={{...inputStyle,marginBottom:14}} />
        <label style={labelStyle}>Bio</label>
        <textarea rows={3} value={form.bio} onChange={e=>setForm(p=>({...p,bio:e.target.value}))} placeholder="Erzähl was über dich..." style={{...inputStyle,resize:'none',lineHeight:1.62,marginBottom:14}} />
        <div style={{ display:'flex', gap:10, marginBottom:14 }}>
          <div style={{ flex:1 }}>
            <label style={labelStyle}>Alter</label>
            <input type="number" min="13" max="120" value={form.age} onChange={e=>setForm(p=>({...p,age:e.target.value}))} placeholder="25" style={inputStyle} />
          </div>
          <div style={{ flex:2 }}>
            <label style={labelStyle}>Wohnort</label>
            <input value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} placeholder="z.B. Duisburg" style={inputStyle} />
          </div>
        </div>
        <label style={labelStyle}>Geschlecht</label>
        <select value={form.gender} onChange={e=>setForm(p=>({...p,gender:e.target.value}))} style={{...inputStyle,cursor:'pointer',marginBottom:22}}>
          <option value="">Keine Angabe</option>
          <option value="Männlich">Männlich</option>
          <option value="Weiblich">Weiblich</option>
          <option value="Divers">Divers</option>
        </select>
        {error && <div style={{ fontSize:13, color:T.fbBad, marginBottom:14, padding:'8px 12px', background:'rgba(248,113,113,0.08)', borderRadius:8 }}>{error}</div>}
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ background:'none', border:'none', color:T.fgLabel, fontFamily:'inherit', fontSize:13, cursor:'pointer', padding:'10px 16px' }}>Abbrechen</button>
          <button onClick={save} disabled={saving} style={{ background:T.accent, color:T.accentFg, border:'none', borderRadius:9, padding:'11px 26px', fontFamily:'inherit', fontWeight:600, fontSize:13, cursor:saving?'default':'pointer', opacity:saving?0.6:1, boxShadow:`0 0 24px ${T.accent}30` }}>
            {saving?'...':'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Post Modal ───────────────────────────────────────────────────────────
function EditPostModal({ post, onClose, onSave }) {
  const [form, setForm] = useState({ title:post.title||'', content:post.content||'', category:post.category||'Design', tags:(post.tags||[]).join(', ') });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.title.trim()||!form.content.trim()) return;
    setSaving(true);
    const updates = { title:form.title.trim(), content:form.content.trim(), category:form.category, tags:form.tags.split(',').map(t=>t.trim()).filter(Boolean) };
    const { error } = await supabase.from('posts').update(updates).eq('id', post.id);
    setSaving(false);
    if (!error) { onSave(updates); onClose(); }
  };

  return (
    <div className="modal-enter" onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:20, overflowY:'auto' }}>
      <div className="modal-panel" style={{ background:'#0C0C0C', border:`1px solid ${T.borderDefault}`, borderRadius:22, padding:'30px 28px', width:'100%', maxWidth:500, margin:'auto' }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, marginBottom:24 }}>Post bearbeiten</div>
        <label style={labelStyle}>Kategorie</label>
        <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={{...inputStyle,cursor:'pointer',marginBottom:16}}>
          {['Design','Code','Business','Foto','Text','Sonstiges'].map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <label style={labelStyle}>Titel</label>
        <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} style={{...inputStyle,marginBottom:16}} />
        <label style={labelStyle}>Beschreibung</label>
        <textarea rows={4} value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))} style={{...inputStyle,resize:'none',lineHeight:1.65,marginBottom:16}} />
        <label style={labelStyle}>Tags (kommagetrennt)</label>
        <input value={form.tags} onChange={e=>setForm(p=>({...p,tags:e.target.value}))} style={{...inputStyle,marginBottom:24}} />
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ background:'none', border:'none', color:T.fgLabel, fontFamily:'inherit', fontSize:13, cursor:'pointer', padding:'10px 16px' }}>Abbrechen</button>
          <button onClick={save} disabled={saving} style={{ background:T.accent, color:T.accentFg, border:'none', borderRadius:9, padding:'11px 26px', fontFamily:'inherit', fontWeight:600, fontSize:13, cursor:saving?'default':'pointer', opacity:saving?0.6:1, boxShadow:`0 0 24px ${T.accent}30` }}>
            {saving?'...':'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Post Modal ─────────────────────────────────────────────────────────
function CreatePostModal({ user, onClose, onSubmit }) {
  const [form, setForm] = useState({ title:'', content:'', category:'Design', tags:'' });
  const [imageFiles, setImageFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const uploadImages = async (files) => {
    const urls = [];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('post-images').upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from('post-images').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const submit = async () => {
    if (!form.title.trim()||!form.content.trim()) return;
    setUploading(true);
    let imageUrls = [];
    if (imageFiles.length>0) imageUrls = await uploadImages(imageFiles);
    const tags = form.tags.split(',').map(t=>t.trim()).filter(Boolean);
    const { data, error } = await supabase.from('posts').insert({ author_id:user.id, title:form.title.trim(), content:form.content.trim(), category:form.category, tags, image_urls:imageUrls }).select('*, profiles(username)').single();
    setUploading(false);
    if (!error && data) { onSubmit(data); onClose(); }
  };

  return (
    <div className="modal-enter" onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:20, overflowY:'auto' }}>
      <div className="modal-panel" style={{ background:'#0C0C0C', border:`1px solid ${T.borderDefault}`, borderRadius:22, padding:'30px 28px', width:'100%', maxWidth:500, margin:'auto' }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, marginBottom:24 }}>Neuen Post erstellen</div>
        <label style={labelStyle}>Kategorie</label>
        <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={{...inputStyle,cursor:'pointer',marginBottom:16}}>
          {['Design','Code','Business','Foto','Text','Sonstiges'].map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <label style={labelStyle}>Titel</label>
        <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Was möchtest du Feedback zu?" style={{...inputStyle,marginBottom:16}} />
        <label style={labelStyle}>Beschreibung</label>
        <textarea rows={4} value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))} placeholder="Beschreibe was du gemacht hast..." style={{...inputStyle,resize:'none',lineHeight:1.65,marginBottom:16}} />
        <label style={labelStyle}>Bilder (optional)</label>
        <input type="file" accept="image/*" multiple onChange={e=>setImageFiles(Array.from(e.target.files).slice(0,5))} style={{...inputStyle,marginBottom:imageFiles.length>0?8:16,cursor:'pointer'}} />
        {imageFiles.length>0 && <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>{imageFiles.map((f,i)=><Tag key={i}>{f.name}</Tag>)}</div>}
        <label style={labelStyle}>Tags (kommagetrennt)</label>
        <input value={form.tags} onChange={e=>setForm(p=>({...p,tags:e.target.value}))} placeholder="z.B. Logo, Branding, React" style={{...inputStyle,marginBottom:24}} />
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ background:'none', border:'none', color:T.fgLabel, fontFamily:'inherit', fontSize:13, cursor:'pointer', padding:'10px 16px' }}>Abbrechen</button>
          <button onClick={submit} disabled={uploading} style={{ background:T.accent, color:T.accentFg, border:'none', borderRadius:9, padding:'11px 26px', fontFamily:'inherit', fontWeight:600, fontSize:13, cursor:uploading?'default':'pointer', opacity:uploading?0.6:1, boxShadow:`0 0 24px ${T.accent}30` }}>
            {uploading?'Lädt hoch...':'Veröffentlichen'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]                   = useState(null);
  const [profile, setProfile]             = useState(null);
  const [posts, setPosts]                 = useState([]);
  const [feedback, setFeedback]           = useState({});
  const [view, setView]                   = useState('feed');
  const [activePost, setActivePost]       = useState(null);
  const [activeProfile, setActiveProfile] = useState(null);
  const [profilePosts, setProfilePosts]   = useState([]);
  const [cat, setCat]                     = useState('Alle');
  const [showCreate, setCreate]           = useState(false);
  const [showAuth, setShowAuth]           = useState(false);
  const [showEditProfile, setEditProfile] = useState(false);
  const [showEditPost, setEditPost]       = useState(false);
  const [showFbForm, setShowFbForm]       = useState(false);
  const [fbType, setFbType]               = useState('good');
  const [fbText, setFbText]               = useState('');
  const [voted, setVoted]                 = useState({});
  const [loading, setLoading]             = useState(true);
  const [loadingFb, setLoadingFb]         = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isFirst, setIsFirst]             = useState(true);

  // Fonts + animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = ANIM;
    document.head.appendChild(style);
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@500;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
      if (event==='SIGNED_IN' && window.location.hash.includes('access_token')) {
        window.history.replaceState({}, document.title, window.location.pathname);
        setShowAuth(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
  };

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('posts').select('*, profiles(username)').order('created_at', { ascending:false });
    if (!error) setPosts(data||[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const fetchFeedback = useCallback(async (postId) => {
    setLoadingFb(true);
    const { data, error } = await supabase.from('feedback').select('*, profiles(username)').eq('post_id', postId).order('vote_count', { ascending:false });
    if (!error) setFeedback(prev=>({ ...prev, [postId]:data||[] }));
    if (user) {
      const { data: voteData } = await supabase.from('votes').select('feedback_id').eq('user_id', user.id);
      if (voteData) { const map={}; voteData.forEach(v=>{map[v.feedback_id]=true;}); setVoted(map); }
    }
    setLoadingFb(false);
  }, [user]);

  const openPost = (p) => { setActivePost(p); setView('detail'); setShowFbForm(false); fetchFeedback(p.id); setIsFirst(false); };

  const openProfile = async (userId) => {
    setLoadingProfile(true);
    setView('profile');
    setActivePost(null);
    setIsFirst(false);
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setActiveProfile(profileData);
    const { data: postsData } = await supabase.from('posts').select('*, profiles(username)').eq('author_id', userId).order('created_at', { ascending:false });
    setProfilePosts(postsData||[]);
    setLoadingProfile(false);
  };

  const goFeed = () => { setView('feed'); setActivePost(null); setActiveProfile(null); };

  const submitFb = async () => {
    if (!fbText.trim()||!user) return;
    const { data, error } = await supabase.from('feedback').insert({ post_id:activePost.id, author_id:user.id, type:fbType, content:fbText.trim() }).select('*, profiles(username)').single();
    if (!error&&data) {
      setFeedback(prev=>({ ...prev, [activePost.id]:[data, ...(prev[activePost.id]||[])] }));
      setPosts(prev=>prev.map(p=>p.id===activePost.id?{...p,feedback_count:p.feedback_count+1}:p));
      setFbText(''); setShowFbForm(false);
    }
  };

  const doVote = async (fbId) => {
    if (!user||voted[fbId]) return;
    setVoted(prev=>({...prev,[fbId]:true}));
    setFeedback(prev=>{ const u={}; for(const k in prev) u[k]=prev[k].map(f=>f.id===fbId?{...f,vote_count:f.vote_count+1}:f); return u; });
    await supabase.from('votes').insert({ feedback_id:fbId, user_id:user.id });
  };

  const deletePost = async (postId) => {
    if (!window.confirm('Post wirklich löschen?')) return;
    await supabase.from('posts').delete().eq('id', postId);
    setPosts(prev=>prev.filter(p=>p.id!==postId));
    goFeed();
  };

  const deleteFeedback = async (fbId, postId) => {
    await supabase.from('feedback').delete().eq('id', fbId);
    setFeedback(prev=>({ ...prev, [postId]:(prev[postId]||[]).filter(f=>f.id!==fbId) }));
    setPosts(prev=>prev.map(p=>p.id===postId?{...p,feedback_count:Math.max(0,p.feedback_count-1)}:p));
  };

  const logout = async () => { await supabase.auth.signOut(); goFeed(); };

  const filtered = cat==='Alle' ? posts : posts.filter(p=>p.category===cat);
  const postFb = activePost ? (feedback[activePost.id]||[]) : [];
  const grouped = { good:postFb.filter(f=>f.type==='good'), bad:postFb.filter(f=>f.type==='bad'), tip:postFb.filter(f=>f.type==='tip') };
  const isMyPost = activePost && user && activePost.author_id===user.id;

  return (
    <div style={{ minHeight:'100vh', background:T.bgPage, fontFamily:"'DM Sans',-apple-system,sans-serif", color:T.fgPrimary }}>
      <Header user={user} profile={profile} onLogin={()=>setShowAuth(true)} onCreatePost={()=>user?setCreate(true):setShowAuth(true)} onProfile={()=>user&&openProfile(user.id)} />

      <main style={{ maxWidth:700, margin:'0 auto', padding:'32px 20px 80px' }}>

        {/* ── FEED ── */}
        {view==='feed' && (
          <>
            {isFirst && <HeroBanner postCount={posts.length} />}
            <div style={{ display:'flex', gap:7, overflowX:'auto', paddingBottom:4, marginBottom:24, scrollbarWidth:'none' }}>
              {CATEGORIES.map(c=>{
                const active=cat===c;
                const color=c==='Alle'?T.accent:(CAT_COLORS[c]||T.accent);
                return <button key={c} onClick={()=>setCat(c)} style={{ background:active?color:T.bgSubtle, color:active?T.accentFg:T.fgMuted, border:`1px solid ${active?color:T.borderFaint}`, borderRadius:20, padding:'6px 16px', fontFamily:'inherit', fontWeight:500, fontSize:13, cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.12s' }}>{c}</button>;
              })}
            </div>
            {loading ? <Spinner /> : filtered.length===0 ? (
              <div style={{ textAlign:'center', padding:'60px 0', color:T.fgGhost, fontSize:14 }}>Noch keine Posts — sei der Erste!</div>
            ) : filtered.map((post,i) => (
              <div key={post.id} className="card-enter" onClick={()=>openPost(post)}
                style={{ background:T.bgCard, border:`1px solid ${T.borderFaint}`, borderRadius:18, padding:'20px 22px', marginBottom:10, cursor:'pointer', transition:'all 0.13s', animationDelay:`${i*0.05}s` }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=T.borderHover;e.currentTarget.style.background=T.bgHover;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=T.borderFaint;e.currentTarget.style.background=T.bgCard;}}>
                <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:12 }}>
                  <Avatar name={post.profiles?.username||'?'} onClick={e=>{e.stopPropagation();openProfile(post.author_id);}} />
                  <span onClick={e=>{e.stopPropagation();openProfile(post.author_id);}} style={{ fontSize:13, fontWeight:500, color:T.fgSecondary, cursor:'pointer' }}>{post.profiles?.username||'Anonym'}</span>
                  <CatBadge cat={post.category} />
                  <span style={{ fontSize:11, color:T.fgGhost, marginLeft:'auto' }}>{timeAgo(post.created_at)}</span>
                </div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:17, lineHeight:1.38, marginBottom:8 }}>{post.title}</div>
                <div style={{ fontSize:14, lineHeight:1.65, color:T.fgDim, marginBottom:14, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{post.content}</div>
                {post.image_urls?.length>0 && (
                  <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                    {post.image_urls.slice(0,3).map((url,i)=><img key={i} src={url} alt="" style={{ width:80, height:60, objectFit:'cover', borderRadius:8, border:`1px solid ${T.borderFaint}` }} />)}
                  </div>
                )}
                <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                  {(post.tags||[]).slice(0,3).map(t=><Tag key={t}>{t}</Tag>)}
                  <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4, fontSize:12, color:T.fgGhost }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    {post.feedback_count}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── PROFILE ── */}
        {view==='profile' && (
          <>
            <button onClick={goFeed} style={{ background:'none', border:'none', color:T.fgDimmer, cursor:'pointer', fontFamily:'inherit', fontSize:13, display:'flex', alignItems:'center', gap:6, padding:0, marginBottom:24 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Zurück
            </button>
            {loadingProfile||!activeProfile ? <Spinner /> : (
              <>
                <div style={{ background:T.bgCard, border:`1px solid ${T.borderFaint}`, borderRadius:20, overflow:'hidden', marginBottom:20 }}>
                  <div style={{ height:3, background:`linear-gradient(90deg, ${hashColor(activeProfile.username||'')}, transparent)` }} />
                  <div style={{ padding:'28px 26px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:18, marginBottom:activeProfile.bio?18:0 }}>
                      <Avatar name={activeProfile.username||'?'} size={64} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:23, lineHeight:1.2, marginBottom:4 }}>{activeProfile.username}</div>
                        <div style={{ fontSize:13, color:T.fgDimmer }}>{profilePosts.length} Post{profilePosts.length===1?'':'s'}</div>
                      </div>
                      {user?.id===activeProfile.id && (
                        <button onClick={()=>setEditProfile(true)} style={{ background:'none', border:`1px solid ${T.borderDefault}`, borderRadius:9, padding:'7px 14px', fontFamily:'inherit', fontSize:12, color:T.fgMuted, cursor:'pointer' }}>Bearbeiten</button>
                      )}
                    </div>
                    {activeProfile.bio && <div style={{ fontSize:14, lineHeight:1.65, color:'#999990', paddingTop:18, borderTop:`1px solid ${T.borderFaint}` }}>{activeProfile.bio}</div>}
                    <div style={{ display:'flex', gap:24, flexWrap:'wrap', fontSize:13, marginTop:18 }}>
                      {activeProfile.age && <div><div style={{ fontSize:10, color:T.fgLabel, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:3 }}>Alter</div><div style={{ color:T.fgSecondary, fontWeight:500 }}>{activeProfile.age}</div></div>}
                      {activeProfile.location && <div><div style={{ fontSize:10, color:T.fgLabel, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:3 }}>Wohnort</div><div style={{ color:T.fgSecondary, fontWeight:500 }}>{activeProfile.location}</div></div>}
                      {activeProfile.gender && <div><div style={{ fontSize:10, color:T.fgLabel, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:3 }}>Geschlecht</div><div style={{ color:T.fgSecondary, fontWeight:500 }}>{activeProfile.gender}</div></div>}
                    </div>
                    {user?.id===activeProfile.id && (
                      <button onClick={logout} style={{ background:'none', border:`1px solid ${T.borderDefault}`, borderRadius:8, padding:'7px 14px', fontFamily:'inherit', fontSize:12, color:T.fgDim, cursor:'pointer', marginTop:18 }}>Logout</button>
                    )}
                  </div>
                </div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12, color:T.fgDim, textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:14 }}>Posts</div>
                {profilePosts.length===0 ? (
                  <div style={{ textAlign:'center', padding:'40px 0', color:T.fgGhost, fontSize:13 }}>Noch keine Posts.</div>
                ) : profilePosts.map(post=>(
                  <div key={post.id} onClick={()=>openPost(post)}
                    style={{ background:T.bgCard, border:`1px solid ${T.borderFaint}`, borderRadius:14, padding:'16px 18px', marginBottom:8, cursor:'pointer', transition:'all 0.13s' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=T.borderHover;e.currentTarget.style.background=T.bgHover;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.borderFaint;e.currentTarget.style.background=T.bgCard;}}>
                    <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:8 }}>
                      <CatBadge cat={post.category} />
                      <span style={{ fontSize:11, color:T.fgGhost, marginLeft:'auto' }}>{timeAgo(post.created_at)}</span>
                    </div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, lineHeight:1.38, marginBottom:6 }}>{post.title}</div>
                    <div style={{ fontSize:12, color:T.fgGhost, display:'flex', alignItems:'center', gap:4 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      {post.feedback_count} Feedbacks
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* ── DETAIL ── */}
        {view==='detail' && activePost && (
          <>
            <button onClick={goFeed} style={{ background:'none', border:'none', color:T.fgDimmer, cursor:'pointer', fontFamily:'inherit', fontSize:13, display:'flex', alignItems:'center', gap:6, padding:0, marginBottom:24 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Zurück
            </button>

            <div style={{ background:T.bgCard, border:`1px solid ${T.borderFaint}`, borderRadius:20, padding:'26px 28px', marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:16 }}>
                <Avatar name={activePost.profiles?.username||'?'} onClick={()=>openProfile(activePost.author_id)} />
                <span onClick={()=>openProfile(activePost.author_id)} style={{ fontSize:13, fontWeight:500, color:T.fgSecondary, cursor:'pointer' }}>{activePost.profiles?.username||'Anonym'}</span>
                <CatBadge cat={activePost.category} />
                <span style={{ fontSize:11, color:T.fgGhost, marginLeft:'auto' }}>{timeAgo(activePost.created_at)}</span>
              </div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, lineHeight:1.28, marginBottom:14, letterSpacing:'-0.3px' }}>{activePost.title}</div>
              <div style={{ fontSize:15, lineHeight:1.74, color:T.fgMuted, marginBottom:18 }}>{activePost.content}</div>
              {activePost.image_urls?.length>0 && (
                <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                  {activePost.image_urls.map((url,i)=><img key={i} src={url} alt="" style={{ maxWidth:'100%', maxHeight:340, objectFit:'cover', borderRadius:10, border:`1px solid ${T.borderFaint}` }} />)}
                </div>
              )}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom: isMyPost?16:0 }}>
                {(activePost.tags||[]).map(t=><Tag key={t}>{t}</Tag>)}
              </div>
              {isMyPost && (
                <div style={{ display:'flex', gap:8, paddingTop:16, borderTop:`1px solid ${T.borderFaint}` }}>
                  <button onClick={()=>setEditPost(true)} style={{ background:'none', border:`1px solid ${T.borderDefault}`, borderRadius:8, padding:'7px 14px', fontFamily:'inherit', fontSize:12, color:T.fgMuted, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Bearbeiten
                  </button>
                  <button onClick={()=>deletePost(activePost.id)} style={{ background:'none', border:'1px solid rgba(248,113,113,0.25)', borderRadius:8, padding:'7px 14px', fontFamily:'inherit', fontSize:12, color:T.fbBad, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    Löschen
                  </button>
                </div>
              )}
            </div>

            {/* Stats */}
            <div style={{ display:'flex', gap:8, marginBottom:28 }}>
              {Object.entries(FB).map(([type,cfg])=>(
                <div key={type} style={{ flex:1, background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:14, padding:'14px 10px', textAlign:'center' }}>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:28, color:cfg.color, lineHeight:1 }}>{grouped[type].length}</div>
                  <div style={{ fontSize:10.5, color:cfg.color, opacity:0.6, marginTop:4, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{cfg.short}</div>
                </div>
              ))}
            </div>

            {/* Feedback list */}
            {loadingFb ? <Spinner /> : (
              <>
                {postFb.length===0 && (
                  <div style={{ textAlign:'center', padding:'40px 0', color:T.fgGhost, fontSize:14, marginBottom:20 }}>Noch kein Feedback — sei der Erste!</div>
                )}
                {Object.entries(FB).map(([type,cfg])=>grouped[type].length>0&&(
                  <div key={type} style={{ marginBottom:24 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                      <FeedbackIcon type={type} size={11} />
                      <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:11, color:cfg.color, textTransform:'uppercase', letterSpacing:'0.12em' }}>{cfg.label}</span>
                    </div>
                    {grouped[type].map(fb=>(
                      <div key={fb.id} style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:14, padding:'14px 16px', marginBottom:8, display:'flex', gap:12 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                            <Avatar name={fb.profiles?.username||'?'} size={26} onClick={()=>openProfile(fb.author_id)} />
                            <span onClick={()=>openProfile(fb.author_id)} style={{ fontSize:12, fontWeight:500, color:T.fgDimmer, cursor:'pointer' }}>{fb.profiles?.username||'Anonym'}</span>
                            {user&&fb.author_id===user.id && (
                              <button onClick={()=>deleteFeedback(fb.id, activePost.id)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:T.fgGhost, padding:'2px 4px', borderRadius:4, fontSize:11, display:'flex', alignItems:'center', gap:3 }}
                                onMouseEnter={e=>e.currentTarget.style.color=T.fbBad}
                                onMouseLeave={e=>e.currentTarget.style.color=T.fgGhost}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize:14, lineHeight:1.64, color:T.fgSecondary }}>{fb.content}</div>
                        </div>
                        <button onClick={()=>doVote(fb.id)} style={{ background:'none', border:'none', cursor:user&&!voted[fb.id]?'pointer':'default', display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:'2px 4px', minWidth:28 }}>
                          <svg width="11" height="9" viewBox="0 0 11 9" fill={voted[fb.id]?cfg.color:T.fgGhost}><path d="M5.5 0L11 9H0L5.5 0Z"/></svg>
                          <span style={{ fontSize:11, fontWeight:700, color:voted[fb.id]?cfg.color:T.fgGhost }}>{fb.vote_count}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}

            {/* Feedback CTA */}
            {user ? showFbForm ? (
              <div style={{ background:T.bgCard, border:`1px solid ${T.borderFaint}`, borderRadius:18, padding:'22px 24px', marginTop:4 }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, marginBottom:16 }}>Feedback hinterlassen</div>
                <div style={{ display:'flex', gap:7, marginBottom:16 }}>
                  {Object.entries(FB).map(([type,cfg])=>(
                    <button key={type} onClick={()=>setFbType(type)} style={{ flex:1, background:fbType===type?cfg.bg:'transparent', border:`1px solid ${fbType===type?cfg.border:T.borderDefault}`, borderRadius:9, padding:'9px 6px', cursor:'pointer', fontFamily:'inherit', fontSize:12.5, fontWeight:fbType===type?600:400, color:fbType===type?cfg.color:T.fgLabel, transition:'all 0.12s' }}>{cfg.short}</button>
                  ))}
                </div>
                <textarea rows={4} placeholder={fbType==='good'?'Was gefällt dir besonders gut?':fbType==='bad'?'Was könnte besser sein?':'Welchen konkreten Tipp hast du?'} value={fbText} onChange={e=>setFbText(e.target.value)} style={{...inputStyle,resize:'none',lineHeight:1.65,marginBottom:14}} />
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={submitFb} style={{ background:T.accent, color:T.accentFg, border:'none', borderRadius:9, padding:'10px 24px', fontFamily:'inherit', fontWeight:600, fontSize:13, cursor:'pointer', boxShadow:`0 0 20px ${T.accent}30` }}>Absenden</button>
                  <button onClick={()=>setShowFbForm(false)} style={{ background:'none', border:'none', color:T.fgLabel, fontFamily:'inherit', fontSize:13, cursor:'pointer', padding:'10px 14px' }}>Abbrechen</button>
                </div>
              </div>
            ) : (
              <button onClick={()=>setShowFbForm(true)}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=T.borderDefault;e.currentTarget.style.color=T.fgGhost;}}
                style={{ background:T.bgCard, border:`1.5px dashed ${T.borderDefault}`, borderRadius:18, padding:'18px 24px', width:'100%', display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontFamily:'inherit', fontSize:14, color:T.fgGhost, transition:'all 0.15s', marginTop:4 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Feedback hinterlassen
              </button>
            ) : (
              <button onClick={()=>setShowAuth(true)}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=T.borderDefault;e.currentTarget.style.color=T.fgGhost;}}
                style={{ background:T.bgCard, border:`1.5px dashed ${T.borderDefault}`, borderRadius:18, padding:'18px 24px', width:'100%', display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontFamily:'inherit', fontSize:14, color:T.fgGhost, transition:'all 0.15s', marginTop:4 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Einloggen um Feedback zu geben
              </button>
            )}
          </>
        )}
      </main>

      {showCreate && user && <CreatePostModal user={user} onClose={()=>setCreate(false)} onSubmit={post=>{ setPosts(prev=>[post,...prev]); }} />}
      {showAuth && <AuthModal onClose={()=>setShowAuth(false)} />}
      {showEditProfile && profile && (
        <EditProfileModal profile={profile} onClose={()=>setEditProfile(false)} onSave={updates=>{ setProfile(p=>({...p,...updates})); setActiveProfile(p=>({...p,...updates})); }} />
      )}
      {showEditPost && activePost && (
        <EditPostModal post={activePost} onClose={()=>setEditPost(false)} onSave={updates=>{ setActivePost(p=>({...p,...updates})); setPosts(prev=>prev.map(p=>p.id===activePost.id?{...p,...updates}:p)); }} />
      )}
    </div>
  );
}
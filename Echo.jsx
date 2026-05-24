import { useState, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const POLLINATIONS_KEY = "sk_G23acdImvBt62Oqa80BH0UXWRF2D6W54";
const PRO_PASSWORD = "NovaClaudashian of LUM";
const MODES = ["Friendly", "Savage", "Professional"];

const IMAGE_MODELS = {
  Fast:     { provider: "pollinations", model: "flux" },
  Quality:  { provider: "pollinations", model: "flux-realism" },
  Artistic: { provider: "pollinations", model: "flux-anime" },
};
const IMAGE_MODELS_PRO = {
  "DALL-E 3 HD": { provider: "openai", model: "dall-e-3" },
  "GPT Image 1": { provider: "openai", model: "gpt-image-1" },
  "Flux Pro":    { provider: "replicate", model: "flux-pro" },
};

const CHAT_PROVIDERS = [
  { id:"groq",     label:"Groq",        hint:"gsk_...", visionModel:"meta-llama/llama-4-scout-17b-16e-instruct", textModel:"llama-3.3-70b-versatile" },
  { id:"openai",   label:"OpenAI",      hint:"sk-...",  visionModel:"gpt-4o",    textModel:"gpt-4o-mini" },
  { id:"together", label:"Together AI", hint:"...",     visionModel:null,        textModel:"meta-llama/Llama-3-70b-chat-hf" },
  { id:"cohere",   label:"Cohere",      hint:"...",     visionModel:null,        textModel:"command-r-plus" },
];
const IMAGEN_PROVIDERS = [
  { id:"stability",  label:"Stability AI",  hint:"sk-..." },
  { id:"replicate",  label:"Replicate",     hint:"r8_..." },
  { id:"openai_img", label:"OpenAI Images", hint:"sk-..." },
];
const ENHANCE_PROVIDERS = [
  { id:"clipdrop", label:"ClipDrop", hint:"..." },
];

const EMOTION_MAP = {
  happy:  ["happy","love","great","amazing","yay","excited","wonderful","awesome","best","perfect"],
  sad:    ["sad","cry","depressed","lonely","miss","hurt","broken","empty","hopeless"],
  angry:  ["angry","mad","annoyed","frustrated","hate","ugh","wtf","stupid","awful"],
  flirty: ["cute","gorgeous","beautiful","hot","crush","kiss","hug","date"],
};

// ─── Utilities ────────────────────────────────────────────────────────────────
function detectEmotion(text) {
  const t = text.toLowerCase();
  for (const [em, kw] of Object.entries(EMOTION_MAP))
    if (kw.some(k => t.includes(k))) return em;
  return "neutral";
}
function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Hey, night owl";
}
function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
}
function ls(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSave(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val instanceof Set ? [...val] : val)); } catch {}
}

// ─── Knowledge Base ───────────────────────────────────────────────────────────
const getLuminarKB = (name) => `
=== ABOUT YOU ===
You are ${name}, an AI assistant created by LUMINAR Inc.
Your creator is ZACH (Zacharia), a self-taught developer in Makutano, Kenya who built you on his Android phone.
If asked who made you — always say Zach / Zacharia.
If the user says their name is "Chom" or "Zacharia", treat them as your creator with extra warmth. Call them "boss" occasionally.
"Chom" is Zach's nickname from his father. If someone claims to be Zach, ask for their nickname — only "Chom" confirms the real boss.

=== LUMINAR INC ===
Kenyan tech studio, Makutano, Kenya. Founded by Zach. Mission: build innovative tech from Africa for the world.

=== LUMINAR PRODUCTS ===
1. ECHO (you) — AI chatbot with personality modes, emotion detection, memory, and training.
2. NOVA-XMD — WhatsApp bot with media downloads, away mode, anti-link, reseller system.
3. Sparks — Dating app with real-time chat, photo uploads, gender filters, incognito mode.
4. WHO ASKED — AI battle arena where AIs roast each other.
5. NileTV — IPTV web app with HLS streaming and dynamic M3U parsing.
6. LUMINAR Hosting — Planned: pay via M-Pesa for bot hosting.
Contact: zappyblues234@gmail.com or github.com/Zacharia316
`;

function buildSystem(name, mode, userName, memories, trainedData, emotion) {
  const base = {
    Friendly:     `You are ${name}, a warm supportive AI by LUMINAR Inc. Speak casually like a close friend. Keep replies short — 1-3 sentences. Never use the sparkles emoji.`,
    Savage:       `You are ${name}, a sarcastic blunt witty AI by LUMINAR Inc. Lightly roast the user, be sharp and funny. Still helpful but with attitude. Brief.`,
    Professional: `You are ${name}, a professional AI by LUMINAR Inc. Polite, precise, clear. Formal language. Concise structured responses.`,
  };
  let s = base[mode] || base.Friendly;
  s += getLuminarKB(name);
  s += `\nNever claim to be GPT, ChatGPT, or any other AI. You are ${name} by LUMINAR Inc.`;
  s += `\nWhen writing code, always use code blocks. Never output a full standalone HTML document.`;
  if (userName) s += `\nUser's name: ${userName}. Use it occasionally, not every reply.`;
  if (emotion !== "neutral") s += `\nUser seems ${emotion} — be sensitive to that.`;
  if (memories.length) s += `\nMemories:\n${memories.map((m,i)=>`${i+1}. ${m}`).join("\n")}`;
  if (trainedData.length)
    s += `\nCustom responses:\n${trainedData.slice(0,15).map(e=>`${e.triggers.join(",")} → ${e.responses.join("|")}`).join("\n")}`;
  s += `\nWEB SEARCH: Auto-search for news, prices, weather, sports, anything recent.
Respond with: {"action":"search","query":"<terms>"} or {"action":"fetch","url":"<url>"}
Execute silently, never show JSON to user.`;
  return s;
}

// ─── Provider API Calls ───────────────────────────────────────────────────────
async function callGroq(key, sys, msgs, images=[]) {
  const hasImages = images.length > 0;
  const model = hasImages ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";
  const lastContent = msgs[msgs.length-1]?.content || "";
  const userContent = hasImages
    ? [ ...images.map(img=>({ type:"image_url", image_url:{ url:`data:${img.mediaType};base64,${img.base64}` } })), { type:"text", text:lastContent } ]
    : lastContent;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${key}` },
    body: JSON.stringify({ model, max_tokens:1024, messages:[{ role:"system", content:sys }, ...msgs.slice(0,-1), { role:"user", content:userContent }] }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  return (await res.json()).choices?.[0]?.message?.content || null;
}

async function callOpenAI(key, sys, msgs, images=[]) {
  const hasImages = images.length > 0;
  const model = hasImages ? "gpt-4o" : "gpt-4o-mini";
  const lastContent = msgs[msgs.length-1]?.content || "";
  const userContent = hasImages
    ? [ { type:"text", text:lastContent }, ...images.map(img=>({ type:"image_url", image_url:{ url:`data:${img.mediaType};base64,${img.base64}`, detail:"auto" } })) ]
    : lastContent;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${key}` },
    body: JSON.stringify({ model, max_tokens:1024, messages:[{ role:"system", content:sys }, ...msgs.slice(0,-1), { role:"user", content:userContent }] }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  return (await res.json()).choices?.[0]?.message?.content || null;
}

async function callTogether(key, sys, msgs) {
  const res = await fetch("https://api.together.xyz/v1/chat/completions", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${key}` },
    body: JSON.stringify({ model:"meta-llama/Llama-3-70b-chat-hf", max_tokens:1024, messages:[{ role:"system", content:sys }, ...msgs] }),
  });
  if (!res.ok) throw new Error(`Together ${res.status}`);
  return (await res.json()).choices?.[0]?.message?.content || null;
}

async function callCohere(key, sys, msgs) {
  const history = msgs.slice(0,-1).map(m=>({ role:m.role==="user"?"USER":"CHATBOT", message:m.content }));
  const res = await fetch("https://api.cohere.com/v1/chat", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${key}` },
    body: JSON.stringify({ model:"command-r-plus", preamble:sys, chat_history:history, message:msgs[msgs.length-1]?.content||"", max_tokens:1024 }),
  });
  if (!res.ok) throw new Error(`Cohere ${res.status}`);
  return (await res.json()).text || null;
}

async function callDefault(sys, history, userText, webCtx) {
  const prompt = `${sys}\n\n${history.slice(-10).map(h=>`${h.role==="user"?"User":"Assistant"}: ${h.content}`).join("\n")}\nUser: ${webCtx?`${userText}\n\n[Web results]:\n${webCtx}`:userText}\nAssistant:`;
  const res = await fetch(`https://apiskeith.top/ai/claudeai?q=${encodeURIComponent(prompt)}`);
  if (!res.ok) throw new Error();
  const d = await res.json();
  return d?.result || d?.response || d?.answer || d?.message || null;
}

async function askAI(userText, sys, history, webCtx, apiKeys, activeChat, images=[]) {
  const provider = CHAT_PROVIDERS.find(p => p.id === activeChat);
  const key = apiKeys.chat?.[provider?.id];
  if (key && provider) {
    const msgs = [...history.slice(-10), { role:"user", content: webCtx ? `${userText}\n\n[Web results]:\n${webCtx}` : userText }];
    try {
      if (provider.id === "groq")     return await callGroq(key, sys, msgs, images);
      if (provider.id === "openai")   return await callOpenAI(key, sys, msgs, images);
      if (provider.id === "together") return await callTogether(key, sys, msgs);
      if (provider.id === "cohere")   return await callCohere(key, sys, msgs);
    } catch (e) { console.warn(provider.label, e.message); }
  }
  return callDefault(sys, history, userText, webCtx).catch(() => null);
}

// ─── Web Tools ────────────────────────────────────────────────────────────────
async function webSearch(query) {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ api_key:"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", query, max_results:5, include_answer:true }),
    });
    if (!res.ok) throw new Error();
    const d = await res.json();
    const r = [];
    if (d.answer) r.push(d.answer);
    d.results?.slice(0,4).forEach(x=>{ if(x.content) r.push(`${x.title}: ${x.content}`); });
    return r.length ? r.join("\n\n") : null;
  } catch { return null; }
}
async function webFetch(url) {
  try {
    const res = await fetch("https://api.tavily.com/extract", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ api_key:"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", urls:[url] }),
    });
    if (!res.ok) throw new Error();
    return (await res.json()).results?.[0]?.raw_content?.slice(0,3000) || null;
  } catch {
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      return (await res.json()).contents?.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,3000) || null;
    } catch { return null; }
  }
}

function tts(text, enabled) {
  if (!enabled || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/```[\s\S]*?```/g,"").replace(/`[^`]+`/g,"").replace(/https?:\/\/\S+/g,"").trim();
  if (!clean) return;
  const u = new SpeechSynthesisUtterance(clean);
  u.rate = 1.05; u.pitch = 1.1;
  window.speechSynthesis.speak(u);
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = { bg:"#0f0f0f", surface:"#161616", border:"#252525", text:"#e8e8e8", muted:"#666" };
const font = { fontFamily:"'DM Sans',sans-serif" };
const inputStyle = { width:"100%", padding:"10px 13px", borderRadius:10, border:`1px solid ${C.border}`, background:"#1a1a1a", color:C.text, fontSize:13, outline:"none", ...font };
const labelStyle = { fontSize:11, color:C.muted, marginBottom:6, display:"block", letterSpacing:1, textTransform:"uppercase" };
const chip = (on) => ({ flex:1, padding:"9px 0", borderRadius:8, border:`1px solid ${on?"#555":C.border}`, background:on?"#222":"none", color:on?C.text:C.muted, fontSize:12, cursor:"pointer", ...font });
const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:3px}
  textarea{resize:none}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes dp{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}
`;

// ─── Shared Icons ─────────────────────────────────────────────────────────────
const Ico = {
  Back:     ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Settings: ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Send:     ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Mic:  ({a})=><svg width="18" height="18" viewBox="0 0 24 24" fill={a?"currentColor":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  Trash:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Copy:     ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Check:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Speaker: ({m})=>m
    ?<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
    :<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
  Plus:     ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  ChevD:    ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  ChevU:    ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  Eye:      ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff:   ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
};

// ─── Reusable Components (defined outside main — safe for hooks) ──────────────
function Dots() {
  return (
    <div style={{ display:"flex", gap:5, alignItems:"center" }}>
      {[0,1,2].map(i=><div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"#555", animation:`dp 1.2s ${i*.2}s ease-in-out infinite` }}/>)}
    </div>
  );
}

function MsgText({ text }) {
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
  return (
    <span>
      {parts.map((p,i)=>{
        if (p.startsWith("```")&&p.endsWith("```")) {
          return <pre key={i} style={{ background:"rgba(0,0,0,.4)", borderRadius:8, padding:"10px 12px", fontSize:12, overflowX:"auto", margin:"6px 0", fontFamily:"monospace", border:"1px solid rgba(255,255,255,.07)", whiteSpace:"pre-wrap", wordBreak:"break-all" }}>{p.slice(3,-3).replace(/^[a-z]+\n/,"")}</pre>;
        }
        if (p.startsWith("`")&&p.endsWith("`")) {
          return <code key={i} style={{ background:"rgba(0,0,0,.35)", padding:"2px 5px", borderRadius:4, fontSize:12, fontFamily:"monospace" }}>{p.slice(1,-1)}</code>;
        }
        return <span key={i}>{p}</span>;
      })}
    </span>
  );
}

function Section({ title, note, defaultOpen=true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background:C.surface, borderRadius:14, marginBottom:10, border:`1px solid ${C.border}`, overflow:"hidden" }}>
      <button onClick={()=>setOpen(v=>!v)} style={{ width:"100%", padding:"14px 16px", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", ...font }}>
        <span style={{ fontSize:13, fontWeight:500, color:C.text }}>{title}</span>
        <span style={{ color:C.muted }}>{open?<Ico.ChevU/>:<Ico.ChevD/>}</span>
      </button>
      {open&&<div style={{ padding:"0 16px 16px" }}>{note&&<p style={{ fontSize:11,color:C.muted,marginBottom:10,lineHeight:1.6 }}>{note}</p>}{children}</div>}
    </div>
  );
}

function KeyRow({ provider, cat, apiKeys, activeId, onToggle, onSave, onDelete }) {
  const [draft, setDraft] = useState("");
  const [show, setShow]   = useState(false);
  const val    = apiKeys[cat]?.[provider.id] || "";
  const hasKey = !!val;
  const isOn   = activeId === provider.id;
  return (
    <div style={{ padding:"12px 0", borderBottom:`1px solid ${C.border}` }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:hasKey?8:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:13, color:C.text, fontWeight:500 }}>{provider.label}</span>
          {provider.visionModel&&<span style={{ fontSize:10, color:"#4ade80", padding:"2px 6px", border:"1px solid #4ade8044", borderRadius:10 }}>vision</span>}
        </div>
        {hasKey&&(
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={()=>onToggle(provider.id)} style={{ padding:"4px 10px", borderRadius:20, fontSize:11, cursor:"pointer", ...font, border:`1px solid ${isOn?"#555":C.border}`, background:isOn?"#222":"none", color:isOn?C.text:C.muted }}>{isOn?"Active":"Off"}</button>
            <button onClick={()=>onDelete(cat,provider.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted }}><Ico.Trash/></button>
          </div>
        )}
      </div>
      {hasKey?(
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ flex:1, padding:"8px 12px", borderRadius:8, background:"#1a1a1a", border:`1px solid ${C.border}`, fontSize:12, color:C.muted, fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {show?val:"•".repeat(Math.min(val.length,36))}
          </div>
          <button onClick={()=>setShow(v=>!v)} style={{ background:"none",border:"none",cursor:"pointer",color:C.muted,display:"flex" }}>{show?<Ico.EyeOff/>:<Ico.Eye/>}</button>
        </div>
      ):(
        <div style={{ display:"flex", gap:8, marginTop:8 }}>
          <input type="password" placeholder={provider.hint||"Paste API key..."} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&draft.trim()){onSave(cat,provider.id,draft.trim());setDraft("");}}} style={{ flex:1, padding:"9px 12px", borderRadius:8, border:`1px solid ${C.border}`, background:"#1a1a1a", color:C.text, fontSize:13, outline:"none", ...font }}/>
          <button onClick={()=>{if(draft.trim()){onSave(cat,provider.id,draft.trim());setDraft("");}}} style={{ padding:"9px 14px", borderRadius:8, background:C.text, color:C.bg, border:"none", cursor:"pointer", fontSize:12, fontWeight:500, ...font }}>Save</button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EchoApp() {
  // ALL hooks at top level — no conditions before any hook
  const [screen,setScreen]             = useState(()=>localStorage.getItem("echo_tc")?"home":"tc");
  const [mode,setMode]                 = useState(()=>ls("echo_mode","Friendly"));
  const [aiName,setAiName]             = useState(()=>ls("echo_name","Echo")||"Echo");
  const [userName,setUserName]         = useState(()=>ls("echo_uname","")||"");
  const [memories,setMemories]         = useState(()=>ls("echo_mems",[]));
  const [trainedData,setTrainedData]   = useState(()=>ls("echo_trained",[]));
  const [trainLog,setTrainLog]         = useState(()=>ls("echo_log",[]));
  const [packs,setPacks]               = useState(()=>ls("echo_packs",[]));
  const [messages,setMessages]         = useState(()=>ls("echo_msgs",[]));
  const [history,setHistory]           = useState(()=>ls("echo_history",[]));
  const [input,setInput]               = useState("");
  const [thinking,setThinking]         = useState(false);
  const [ttsOn,setTtsOn]               = useState(()=>ls("echo_tts",false));
  const [imgMode,setImgMode]           = useState(()=>ls("echo_imgmode","Fast"));
  const [imgProUnlocked,setImgProU]    = useState(false);
  const [imgProModel,setImgProModel]   = useState(()=>ls("echo_imgpromodel",null));
  const [imgProPass,setImgProPass]     = useState("");
  const [liked,setLiked]               = useState(()=>new Set(ls("echo_liked",[])));
  const [disliked,setDisliked]         = useState(()=>new Set(ls("echo_disliked",[])));
  const [copiedId,setCopiedId]         = useState(null);
  const [longPressId,setLongPressId]   = useState(null);
  const [isListening,setIsListening]   = useState(false);
  const [pendingImgs,setPendingImgs]   = useState([]);
  const [showPlus,setShowPlus]         = useState(false);
  const [unlocked,setUnlocked]         = useState(false);
  const [passIn,setPassIn]             = useState("");
  const [passErr,setPassErr]           = useState(false);
  const [trigIn,setTrigIn]             = useState("");
  const [resIn,setResIn]               = useState("");
  const [emotion,setEmotion]           = useState("neutral");
  // API Hub — all at top level
  const [apiKeys,setApiKeys]           = useState(()=>ls("echo_apikeys",{chat:{},imagen:{},enhance:{}}));
  const [activeChat,setActiveChat]     = useState(()=>ls("echo_apichat",null));
  const [activeImagen,setActiveImagen] = useState(()=>ls("echo_apiimagen",null));
  const [activeEnhance,setActiveEnhance]=useState(()=>ls("echo_apienhance",null));

  const lpTimer  = useRef(null);
  const msgEnd   = useRef(null);
  const fileRef  = useRef(null);

  const pushMsgs = (m) => { setMessages(m); lsSave("echo_msgs",m); };
  const pushHist = (h) => { setHistory(h);  lsSave("echo_history",h); };

  // API Hub helpers
  const saveKey   = (cat,id,val) => { const u={...apiKeys,[cat]:{...apiKeys[cat],[id]:val}}; setApiKeys(u); lsSave("echo_apikeys",u); };
  const deleteKey = (cat,id) => {
    const u={...apiKeys,[cat]:{...apiKeys[cat]}}; delete u[cat][id]; setApiKeys(u); lsSave("echo_apikeys",u);
    if(activeChat===id){setActiveChat(null);lsSave("echo_apichat",null);}
    if(activeImagen===id){setActiveImagen(null);lsSave("echo_apiimagen",null);}
    if(activeEnhance===id){setActiveEnhance(null);lsSave("echo_apienhance",null);}
  };
  const toggleChat    = (id)=>{ const v=activeChat===id?null:id;    setActiveChat(v);    lsSave("echo_apichat",v); };
  const toggleImagen  = (id)=>{ const v=activeImagen===id?null:id;  setActiveImagen(v);  lsSave("echo_apiimagen",v); };
  const toggleEnhance = (id)=>{ const v=activeEnhance===id?null:id; setActiveEnhance(v); lsSave("echo_apienhance",v); };

  // Image generation
  const generateImage = async (prompt) => {
  const loadId = Date.now();
  const base = [...messages, { f:"u", t:prompt, ts:Date.now() }];
  setMessages([...base, { f:"e", t:"__imgloading__", id:loadId, ts:Date.now() }]);
  setThinking(true);
  try {
    let imgUrl;
    if (imgMode === "Fast") {
      const res = await fetch(`https://daminiapi-1.onrender.com/api/ai/writecream-image?prompt=${encodeURIComponent(prompt)}`);
      const data = await res.json();
      if (!data.success || !data.result) throw new Error("No image");
      imgUrl = data.result;
    } else if (imgMode === "Quality") {
      const res = await fetch(`https://daminiapi-1.onrender.com/api/ai/fluxv2?prompt=${encodeURIComponent(prompt)}`);
      const data = await res.json();
      if (!data.success || !data.result) throw new Error("No image");
      imgUrl = data.result;
    } else {
      // Artistic — Pollinations
      imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux-anime&width=512&height=512&nologo=true&key=${POLLINATIONS_KEY}`;
      await fetch(imgUrl);
    }
    const done = [...base, { f:"e", t:"__img__", img:imgUrl, id:loadId, ts:Date.now() }];
    pushMsgs(done);
    setMessages(done);
  } catch {
    setMessages(prev => prev.map(m => m.id===loadId ? {...m, t:"Image generation failed."} : m));
  }
  setThinking(false);
};

  // Send message
  const send = async () => {
    const txt = input.trim();
    if (!txt && !pendingImgs.length) return;
    setInput(""); setShowPlus(false);
    const em = detectEmotion(txt); setEmotion(em);

    const imgKw = ["generate","draw","create image","make image","paint","imagine","illustrate"];
    if (txt && imgKw.some(k=>txt.toLowerCase().includes(k)) && !pendingImgs.length) {
      await generateImage(txt); return;
    }

    const msgContent = pendingImgs.length ? { type:"images",text:txt,images:pendingImgs } : txt;
    const imgs = [...pendingImgs];
    setPendingImgs([]);

    const withUser = [...messages,{ f:"u",t:msgContent,ts:Date.now() }];
    setMessages(withUser); setThinking(true);

    const sys = buildSystem(aiName,mode,userName,memories,trainedData,em);
    let reply = await askAI(txt,sys,history,null,apiKeys,activeChat,imgs);

    if (reply) {
      try {
        const jm = reply.match(/\{[\s\S]*?"action"[\s\S]*?\}/);
        if (jm) {
          let action=null; try{action=JSON.parse(jm[0]);}catch{}
          if (action?.action==="search"&&action.query) {
            reply=reply.replace(jm[0],"").trim();
            const ctx=await webSearch(action.query);
            reply=await askAI(txt,sys,history,ctx||"Web search failed.",apiKeys,activeChat,[]);
          } else if (action?.action==="fetch"&&action.url) {
            reply=reply.replace(jm[0],"").trim();
            const ctx=await webFetch(action.url);
            reply=await askAI(txt,sys,history,ctx||"Could not fetch page.",apiKeys,activeChat,[]);
          }
        }
      } catch {}
    }

    const final = reply || "I'm having a moment — try again in a second.";
    const newH = [...history,{role:"user",content:txt},{role:"assistant",content:final}].slice(-16);
    pushHist(newH);
    pushMsgs([...withUser,{ f:"e",t:final,id:Date.now(),ts:Date.now() }]);
    setThinking(false);
    tts(final,ttsOn);
    setTimeout(()=>msgEnd.current?.scrollIntoView({behavior:"smooth"}),50);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert("Voice input not supported.");return;}
    const rec=new SR(); rec.lang="en-US"; rec.interimResults=false;
    rec.onstart=()=>setIsListening(true);
    rec.onend=()=>setIsListening(false);
    rec.onresult=(e)=>{setInput(p=>p+e.results[0][0].transcript);setShowPlus(false);};
    rec.onerror=()=>setIsListening(false);
    rec.start(); setShowPlus(false);
  };

  const handleImgUpload = (e) => {
    const files=Array.from(e.target.files); if(!files.length)return;
    setShowPlus(false);
    files.forEach(file=>{
      const r=new FileReader();
      r.onload=(ev)=>setPendingImgs(p=>[...p,{base64:ev.target.result.split(",")[1],mediaType:file.type,preview:ev.target.result,id:Date.now()+Math.random()}]);
      r.readAsDataURL(file);
    });
    e.target.value="";
  };

  const train = () => {
    if(!trigIn.trim()||!resIn.trim())return;
    const td=[...trainedData,{triggers:trigIn.split(",").map(t=>t.trim().toLowerCase()),responses:resIn.split("|").map(r=>r.trim())}];
    const log=[...trainLog,{triggers:trigIn,responses:resIn,id:Date.now()}];
    setTrainedData(td);lsSave("echo_trained",td);setTrainLog(log);lsSave("echo_log",log);setTrigIn("");setResIn("");
  };

  const uploadPack = (e) => {
    const file=e.target.files[0];if(!file)return;
    if(file.size>5*1024*1024){alert("Max 5MB");return;}
    const r=new FileReader();
    r.onload=(ev)=>{
      try{
        const data=JSON.parse(ev.target.result);if(!Array.isArray(data))throw new Error();
        const merged=[...trainedData,...data];
        const pack={name:file.name,size:(file.size/1024).toFixed(1)+"KB",entries:data.length,id:Date.now()};
        setTrainedData(merged);lsSave("echo_trained",merged);
        setPacks(p=>{const u=[...p,pack];lsSave("echo_packs",u);return u;});
      }catch{alert("Invalid JSON pack.");}
    };
    r.readAsText(file);e.target.value="";
  };

  // ─── Screens ───────────────────────────────────────────────────────────────

  // T&C
  if (screen==="tc") return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24,...font}}>
      <style>{globalStyle}</style>
      <div style={{maxWidth:360,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:52,height:52,borderRadius:"50%",background:"#1a1a1a",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <h1 style={{fontSize:22,fontWeight:600,color:C.text,letterSpacing:-0.5}}>Before you start</h1>
          <p style={{color:C.muted,fontSize:13,marginTop:6}}>Read and accept the terms below</p>
        </div>
        <div style={{background:C.surface,borderRadius:14,padding:20,border:`1px solid ${C.border}`,marginBottom:20,fontSize:13,color:"#aaa",lineHeight:1.85}}>
          <p style={{color:C.text,fontWeight:500,marginBottom:12}}>Terms — {aiName} by LUMINAR Inc</p>
          <p>{aiName} is an AI assistant powered by LUMINAR Inc.</p>
          <p style={{marginTop:8}}>LUMINAR Inc is not responsible for responses based on user-provided training data.</p>
          <p style={{marginTop:8}}>You are fully responsible for any content used to train {aiName}.</p>
          <p style={{marginTop:8}}>Do not train {aiName} with harmful, illegal, or abusive content.</p>
          <p style={{marginTop:8}}>LUMINAR Inc reserves the right to update {aiName} at any time.</p>
        </div>
        <button onClick={()=>{localStorage.setItem("echo_tc","1");setScreen("home");}} style={{width:"100%",padding:"14px 0",borderRadius:12,background:C.text,border:"none",color:C.bg,fontSize:14,fontWeight:600,cursor:"pointer",...font}}>I Agree — Continue</button>
        <p style={{textAlign:"center",fontSize:10,color:"#2a2a2a",marginTop:14,letterSpacing:2}}>{aiName.toUpperCase()} BY LUMINAR INC</p>
      </div>
    </div>
  );

  // Home
  if (screen==="home") return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:28,...font}}>
      <style>{globalStyle}</style>
      <div style={{position:"absolute",top:20,right:20}}>
        <button onClick={()=>setScreen("settings")} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,display:"flex",padding:6}}><Ico.Settings/></button>
      </div>
      <div style={{textAlign:"center",maxWidth:320,width:"100%",animation:"fadeUp .5s ease"}}>
        <div style={{width:68,height:68,borderRadius:"50%",background:"#1a1a1a",border:`1.5px solid ${C.border}`,margin:"0 auto 24px",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <h1 style={{fontSize:36,fontWeight:600,color:C.text,letterSpacing:-1.5}}>{aiName}</h1>
        <p style={{fontSize:11,color:C.muted,letterSpacing:3,textTransform:"uppercase",marginTop:4}}>by LUMINAR Inc</p>
        {activeChat&&(
          <div style={{marginTop:10,display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,border:`1px solid ${C.border}`,background:"#1a1a1a"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#4ade80"}}/>
            <span style={{fontSize:11,color:C.muted}}>{CHAT_PROVIDERS.find(p=>p.id===activeChat)?.label}</span>
          </div>
        )}
        <p style={{fontSize:16,color:"#bbb",marginTop:20,lineHeight:1.6}}>{userName?`${getGreeting()}, ${userName}.`:"How can I help you today?"}</p>
        <p style={{color:C.muted,fontSize:12,marginTop:8,lineHeight:1.7}}>Your personal AI — she learns from you, grows with you, remembers you.</p>
        <button onClick={()=>{if(!messages.length)pushMsgs([{f:"e",t:`${getGreeting()}! I'm ${aiName}. Talk to me, I'm listening.`,sys:true,ts:Date.now()}]);setScreen("chat");}} style={{marginTop:32,width:"100%",padding:"15px 0",borderRadius:12,background:C.text,border:"none",color:C.bg,fontSize:14,fontWeight:600,cursor:"pointer",...font}}>Start Talking</button>
      </div>
    </div>
  );

  // Chat
  if (screen==="chat") return (
    <div style={{height:"100vh",background:C.bg,display:"flex",flexDirection:"column",...font}}>
      <style>{globalStyle}</style>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:C.surface,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <button onClick={()=>setScreen("home")} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,display:"flex"}}><Ico.Back/></button>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:600,color:C.text}}>{aiName}</div>
          <div style={{fontSize:11,color:thinking?"#4ade80":C.muted}}>{thinking?"typing...":"online"}</div>
        </div>
        <button onClick={()=>setTtsOn(v=>{lsSave("echo_tts",!v);return !v;})} style={{background:"none",border:"none",cursor:"pointer",color:ttsOn?C.text:C.muted,display:"flex"}}><Ico.Speaker m={!ttsOn}/></button>
        <button onClick={()=>setScreen("settings")} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,display:"flex"}}><Ico.Settings/></button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 12px",display:"flex",flexDirection:"column",gap:8}}>
        {messages.map((msg,i)=>{
          const isUser=msg.f==="u", isImg=msg.t==="__img__", isLoad=msg.t==="__imgloading__";
          return (
            <div key={i} style={{display:"flex",justifyContent:isUser?"flex-end":"flex-start",animation:"fadeUp .2s ease"}}>
              <div
                onMouseDown={()=>{lpTimer.current=setTimeout(()=>setLongPressId(msg.id),500);}}
                onMouseUp={()=>clearTimeout(lpTimer.current)}
                onTouchStart={()=>{lpTimer.current=setTimeout(()=>setLongPressId(msg.id),500);}}
                onTouchEnd={()=>clearTimeout(lpTimer.current)}
                style={{maxWidth:"78%",padding:isImg?4:"10px 13px",borderRadius:isUser?"18px 18px 4px 18px":"18px 18px 18px 4px",background:isUser?C.text:C.surface,color:isUser?C.bg:C.text,fontSize:14,lineHeight:1.6,border:isUser?"none":`1px solid ${C.border}`}}>
                {isLoad&&<div style={{padding:"2px 4px"}}><Dots/></div>}
                {isImg&&msg.img&&<img src={msg.img} alt="generated" style={{borderRadius:12,maxWidth:"100%",display:"block"}}/>}
                {!isImg&&!isLoad&&(
                  typeof msg.t==="object"&&msg.t?.type==="images"?(
                    <div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:msg.t.text?6:0}}>
                        {msg.t.images?.map((img,j)=><img key={j} src={img.preview} alt="" style={{width:56,height:56,borderRadius:8,objectFit:"cover"}}/>)}
                      </div>
                      {msg.t.text&&<span style={{color:C.bg}}>{msg.t.text}</span>}
                    </div>
                  ):<MsgText text={String(msg.t)}/>
                )}
                {msg.ts&&!isLoad&&<div style={{fontSize:10,color:isUser?"rgba(0,0,0,.4)":C.muted,marginTop:4,textAlign:"right"}}>{formatTime(msg.ts)}</div>}
              </div>
              {longPressId===msg.id&&(
                <div onClick={()=>setLongPressId(null)} style={{position:"fixed",inset:0,zIndex:50}}>
                  <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"#1c1c1c",borderRadius:14,padding:6,border:`1px solid ${C.border}`,display:"flex",gap:2,zIndex:51,boxShadow:"0 8px 32px rgba(0,0,0,.7)"}}>
                    {[
                      {label:"Copy",action:()=>{navigator.clipboard?.writeText(typeof msg.t==="string"?msg.t:"");setCopiedId(msg.id);setTimeout(()=>setCopiedId(null),1500);setLongPressId(null);}},
                      !isUser&&{label:"Like",action:()=>{if(!liked.has(msg.id)&&!disliked.has(msg.id)){const u=new Set([...liked,msg.id]);setLiked(u);lsSave("echo_liked",[...u]);}setLongPressId(null);}},
                      !isUser&&{label:"Dislike",action:()=>{if(!liked.has(msg.id)&&!disliked.has(msg.id)){const u=new Set([...disliked,msg.id]);setDisliked(u);lsSave("echo_disliked",[...u]);}setLongPressId(null);}},
                    ].filter(Boolean).map((item,j)=>(
                      <button key={j} onClick={item.action} style={{padding:"8px 14px",background:"none",border:"none",cursor:"pointer",color:C.text,fontSize:13,borderRadius:8,display:"flex",alignItems:"center",gap:5,...font}}>
                        {item.label==="Copy"&&(copiedId===msg.id?<Ico.Check/>:<Ico.Copy/>)}{item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {thinking&&<div style={{display:"flex"}}><div style={{padding:"10px 14px",borderRadius:"18px 18px 18px 4px",background:C.surface,border:`1px solid ${C.border}`}}><Dots/></div></div>}
        <div ref={msgEnd}/>
      </div>

      {pendingImgs.length>0&&(
        <div style={{padding:"8px 14px 0",display:"flex",gap:6,flexShrink:0}}>
          {pendingImgs.map((img,i)=>(
            <div key={img.id} style={{position:"relative"}}>
              <img src={img.preview} alt="" style={{width:46,height:46,borderRadius:8,objectFit:"cover",border:`1px solid ${C.border}`}}/>
              <button onClick={()=>setPendingImgs(p=>p.filter((_,j)=>j!==i))} style={{position:"absolute",top:-5,right:-5,width:16,height:16,borderRadius:"50%",background:"#333",border:"none",color:C.text,cursor:"pointer",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center"}}>x</button>
            </div>
          ))}
        </div>
      )}

      {showPlus&&(
        <div style={{padding:"8px 14px 0",display:"flex",gap:8,flexShrink:0}}>
          {[{label:"Image",action:()=>fileRef.current?.click()},{label:"Voice",action:startListening}].map((item,i)=>(
            <button key={i} onClick={item.action} style={{padding:"7px 14px",borderRadius:20,background:C.surface,border:`1px solid ${C.border}`,color:C.text,fontSize:12,cursor:"pointer",...font}}>{item.label}</button>
          ))}
          <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleImgUpload}/>
        </div>
      )}

      <div style={{padding:"10px 12px 14px",background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"flex-end",gap:8,flexShrink:0}}>
        <button onClick={()=>setShowPlus(v=>!v)} style={{width:38,height:38,borderRadius:"50%",border:`1px solid ${C.border}`,background:"none",color:C.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transform:showPlus?"rotate(45deg)":"none",transition:"transform .2s"}}><Ico.Plus/></button>
        <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder={`Message ${aiName}...`} rows={1} style={{flex:1,background:"#1a1a1a",border:`1px solid ${C.border}`,borderRadius:20,padding:"10px 14px",color:C.text,fontSize:14,outline:"none",maxHeight:120,overflowY:"auto",lineHeight:1.5,...font}}/>
        <button onClick={(input.trim()||pendingImgs.length)?send:startListening} style={{width:38,height:38,borderRadius:"50%",background:(input.trim()||pendingImgs.length)?C.text:(isListening?"#4ade8022":"#1a1a1a"),border:`1px solid ${(input.trim()||pendingImgs.length)?"transparent":C.border}`,color:(input.trim()||pendingImgs.length)?C.bg:(isListening?"#4ade80":C.muted),cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {(input.trim()||pendingImgs.length)?<Ico.Send/>:<Ico.Mic a={isListening}/>}
        </button>
      </div>
    </div>
  );

  // Settings
  if (screen==="settings") return (
    <div style={{minHeight:"100vh",background:C.bg,...font,paddingBottom:40}}>
      <style>{globalStyle}</style>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",background:C.surface,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
        <button onClick={()=>setScreen(messages.length?"chat":"home")} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,display:"flex"}}><Ico.Back/></button>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:600,color:C.text}}>Settings</div>
          <div style={{fontSize:11,color:C.muted}}>Customize & train {aiName}</div>
        </div>
        <button onClick={()=>setScreen("apihub")} style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"none",color:C.muted,fontSize:12,cursor:"pointer",...font}}>API Hub</button>
      </div>
      <div style={{padding:"16px 14px"}}>
        <Section title="Identity">
          <label style={labelStyle}>Your Name</label>
          <input defaultValue={userName} onBlur={e=>{const v=e.target.value.trim();setUserName(v);lsSave("echo_uname",v);}} placeholder="Your name..." style={{...inputStyle,marginBottom:12}}/>
          <label style={labelStyle}>AI Name</label>
          <input defaultValue={aiName} onBlur={e=>{const v=e.target.value.trim()||"Echo";setAiName(v);lsSave("echo_name",v);}} placeholder="Echo" style={inputStyle}/>
        </Section>
        <Section title="Personality">
          <div style={{display:"flex",gap:6}}>{MODES.map(m=><button key={m} onClick={()=>{setMode(m);lsSave("echo_mode",m);}} style={chip(mode===m)}>{m}</button>)}</div>
        </Section>
        <Section title="Voice (TTS)">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:13,color:C.text}}>{aiName} speaks her responses</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>Uses browser speech synthesis</div>
            </div>
            <button onClick={()=>setTtsOn(v=>{lsSave("echo_tts",!v);return !v;})} style={{padding:"7px 16px",borderRadius:20,border:`1px solid ${ttsOn?"#555":C.border}`,background:ttsOn?"#222":"none",color:ttsOn?C.text:C.muted,fontSize:12,cursor:"pointer",...font}}>{ttsOn?"On":"Off"}</button>
          </div>
        </Section>
        <Section title="Image Generation">
          <label style={labelStyle}>Mode</label>
          <div style={{display:"flex",gap:6,marginBottom:14}}>{Object.keys(IMAGE_MODELS).map(m=><button key={m} onClick={()=>{setImgMode(m);lsSave("echo_imgmode",m);}} style={chip(imgMode===m)}>{m}</button>)}</div>
          {!imgProUnlocked?(
            <div>
              <label style={labelStyle}>Pro Access</label>
              <div style={{display:"flex",gap:8}}>
                <input type="password" value={imgProPass} onChange={e=>setImgProPass(e.target.value)} placeholder="Password..." style={{...inputStyle,flex:1}}/>
                <button onClick={()=>{if(imgProPass===PRO_PASSWORD)setImgProU(true);else alert("Wrong password.");setImgProPass("");}} style={{padding:"10px 14px",borderRadius:10,background:C.text,color:C.bg,border:"none",cursor:"pointer",fontSize:12,fontWeight:500,...font}}>Unlock</button>
              </div>
            </div>
          ):(
            <div>
              <label style={labelStyle}>Pro Models</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{Object.keys(IMAGE_MODELS_PRO).map(m=><button key={m} onClick={()=>{const v=imgProModel===m?null:m;setImgProModel(v);lsSave("echo_imgpromodel",v);}} style={{padding:"7px 12px",borderRadius:8,fontSize:12,cursor:"pointer",...font,...chip(imgProModel===m)}}>{m}</button>)}</div>
            </div>
          )}
        </Section>
        <Section title={`Memories (${memories.length})`}>
          <p style={{fontSize:12,color:C.muted,marginBottom:12}}>Say "remember that..." or "forget..." in chat</p>
          {memories.length?memories.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"#1a1a1a",borderRadius:8,marginBottom:4,fontSize:12,color:"#bbb"}}>
              <span>{m}</span>
              <button onClick={()=>{const u=memories.filter((_,j)=>j!==i);setMemories(u);lsSave("echo_mems",u);}} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><Ico.Trash/></button>
            </div>
          )):<p style={{fontSize:12,color:C.muted}}>No memories yet.</p>}
        </Section>
        <Section title={`Chat History (${messages.length} messages)`}>
          <button onClick={()=>{setMessages([]);setHistory([]);lsSave("echo_msgs",[]);lsSave("echo_history",[]);}} style={{padding:"9px 18px",borderRadius:8,background:"none",border:`1px solid ${C.border}`,color:"#e88",fontSize:12,cursor:"pointer",...font}}>Clear All Messages</button>
        </Section>
        <Section title={`Train ${aiName}`} defaultOpen={false}>
          {!unlocked?(
            <div>
              <label style={labelStyle}>Developer Password</label>
              <input value={passIn} onChange={e=>setPassIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(passIn==="luminar"?(setUnlocked(true),setPassErr(false)):setPassErr(true))} type="password" placeholder="Password..." style={{...inputStyle,borderColor:passErr?"#e88":C.border,marginBottom:8}}/>
              {passErr&&<p style={{fontSize:12,color:"#e88",marginBottom:8}}>Wrong password.</p>}
              <button onClick={()=>passIn==="luminar"?(setUnlocked(true),setPassErr(false)):setPassErr(true)} style={{width:"100%",padding:"11px 0",borderRadius:10,background:C.text,color:C.bg,border:"none",fontSize:13,fontWeight:500,cursor:"pointer",...font}}>Unlock</button>
              <p style={{fontSize:11,color:C.muted,marginTop:8,textAlign:"center"}}>Default: luminar</p>
            </div>
          ):(
            <div>
              <label style={labelStyle}>Triggers (comma-separated)</label>
              <input value={trigIn} onChange={e=>setTrigIn(e.target.value)} placeholder="hi, hello, hey" style={{...inputStyle,marginBottom:10}}/>
              <label style={labelStyle}>Responses (pipe-separated)</label>
              <textarea value={resIn} onChange={e=>setResIn(e.target.value)} placeholder="Hey!|Hello!|Heyy!" rows={3} style={{...inputStyle,marginBottom:10,lineHeight:1.5}}/>
              <button onClick={train} style={{width:"100%",padding:"11px 0",borderRadius:10,background:C.text,color:C.bg,border:"none",fontSize:13,fontWeight:500,cursor:"pointer",...font}}>Add Entry</button>
              {trainLog.length>0&&<div style={{marginTop:14}}><label style={labelStyle}>Log ({trainLog.length})</label>{trainLog.slice(-5).map(e=><div key={e.id} style={{fontSize:11,color:C.muted,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>{e.triggers} → {e.responses}</div>)}</div>}
            </div>
          )}
        </Section>
        <Section title="Data Packs" defaultOpen={false}>
          <p style={{fontSize:12,color:C.muted,marginBottom:12}}>Upload JSON training packs to bulk-train {aiName}</p>
          <input type="file" accept=".json" style={{display:"none"}} id="packUpload" onChange={uploadPack}/>
          <label htmlFor="packUpload" style={{display:"block",textAlign:"center",padding:"11px 0",borderRadius:10,border:`1px dashed ${C.border}`,color:C.muted,fontSize:13,cursor:"pointer"}}>Upload Pack (.json)</label>
          {packs.map((p,i)=>(
            <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`,fontSize:12,color:"#bbb",marginTop:6}}>
              <span>{p.name} <span style={{color:C.muted}}>— {p.entries} entries</span></span>
              <button onClick={()=>{const up=packs.filter((_,j)=>j!==i);setPacks(up);lsSave("echo_packs",up);}} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><Ico.Trash/></button>
            </div>
          ))}
        </Section>
        <p style={{textAlign:"center",fontSize:10,color:"#2a2a2a",marginTop:8,letterSpacing:2}}>{aiName.toUpperCase()} BY LUMINAR INC</p>
      </div>
    </div>
  );

  // API Hub
  if (screen==="apihub") {
    const chatActive    = CHAT_PROVIDERS.find(p=>p.id===activeChat&&apiKeys.chat?.[p.id]);
    const enhanceActive = ENHANCE_PROVIDERS.find(p=>p.id===activeEnhance&&apiKeys.enhance?.[p.id]);
    return (
      <div style={{minHeight:"100vh",background:C.bg,...font,paddingBottom:40}}>
        <style>{globalStyle}</style>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",background:C.surface,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
          <button onClick={()=>setScreen("settings")} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,display:"flex"}}><Ico.Back/></button>
          <div>
            <div style={{fontSize:15,fontWeight:600,color:C.text}}>API Hub</div>
            <div style={{fontSize:11,color:C.muted}}>Bring your own keys</div>
          </div>
        </div>
        <div style={{padding:"16px 14px"}}>
          {(chatActive||enhanceActive)&&(
            <div style={{background:"#1a1a1a",borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:10,color:C.muted,letterSpacing:2,marginBottom:6}}>ACTIVE OVERRIDES</div>
              {chatActive&&<div style={{fontSize:12,color:"#bbb"}}>Chat — {chatActive.label}</div>}
              {enhanceActive&&<div style={{fontSize:12,color:"#bbb",marginTop:2}}>Enhancer — {enhanceActive.label}</div>}
            </div>
          )}
          <Section title="Chat APIs" note="One active at a time. Overrides Echo's default endpoint. Vision badge = supports image understanding.">
            {CHAT_PROVIDERS.map(p=><KeyRow key={p.id} provider={p} cat="chat" apiKeys={apiKeys} activeId={activeChat} onToggle={toggleChat} onSave={saveKey} onDelete={deleteKey}/>)}
          </Section>
          <Section title="Image Generation APIs" note="Plug in keys for Stability AI, Replicate, or OpenAI to unlock those image modes.">
            {IMAGEN_PROVIDERS.map(p=><KeyRow key={p.id} provider={p} cat="imagen" apiKeys={apiKeys} activeId={activeImagen} onToggle={toggleImagen} onSave={saveKey} onDelete={deleteKey}/>)}
          </Section>
          <Section title="Image Enhancer APIs" note="Active when using the Enhance option. One active at a time.">
            {ENHANCE_PROVIDERS.map(p=><KeyRow key={p.id} provider={p} cat="enhance" apiKeys={apiKeys} activeId={activeEnhance} onToggle={toggleEnhance} onSave={saveKey} onDelete={deleteKey}/>)}
          </Section>
          <p style={{textAlign:"center",fontSize:10,color:"#2a2a2a",marginTop:8,letterSpacing:2}}>KEYS STORED LOCALLY — NEVER SENT TO LUMINAR</p>
        </div>
      </div>
    );
  }

  return null;
}

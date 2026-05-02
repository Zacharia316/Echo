import MarkovEngine from "./MarkovEngine";
import { useState, useEffect, useRef, useCallback } from "react";

const POLLINATIONS_KEY = "sk_G23acdImvBt62Oqa80BH0UXWRF2D6W54";
const IMAGE_MODELS = {
  Fast: { provider: "pollinations", model: "flux" },
  Quality: { provider: "keith", model: "magicstudio" },
  Artistic: { provider: "puter", model: "dall-e-3" },
};
const IMAGE_MODELS_PRO = {
  "DALL-E 3 HD": { provider: "puter", model: "dall-e-3" },
  "GPT Image 1": { provider: "puter", model: "gpt-image-1" },
  "Flux Pro": { provider: "puter", model: "flux-pro" },
};
const PRO_PASSWORD = "NovaClaudashian of LUM";
const MODES = ["Friendly", "Savage", "Professional"];
const ORB_PALETTES = [
  { a: "#f7c5d5", b: "#e8a0b4", c: "#f0d4a8", glow: "#e8a0b466" },
  { a: "#b8d4f0", b: "#80a8d4", c: "#d4f0f0", glow: "#80a8d466" },
  { a: "#d4b8f0", b: "#b890d4", c: "#f0d4f8", glow: "#b890d466" },
  { a: "#f0e0a0", b: "#d4a850", c: "#f8e8d4", glow: "#d4a85066" },
  { a: "#b8f0d4", b: "#70c498", c: "#d4f8e8", glow: "#70c49866" },
  { a: "#f0b8b8", b: "#d47070", c: "#f8d4d4", glow: "#d4707066" },
];
const EMOTION_MAP = {
  happy:  ["happy","love","great","amazing","yay","excited","wonderful","awesome","best","perfect","😊","❤️","🎉"],
  sad:    ["sad","cry","depressed","lonely","miss","hurt","broken","empty","hopeless","😢","💔"],
  angry:  ["angry","mad","annoyed","frustrated","hate","ugh","wtf","stupid","awful","😠","😤"],
  flirty: ["cute","gorgeous","beautiful","hot","crush","kiss","hug","date","💕","😍","🥺"],
};
const MOOD_EMOJI = { happy:"🌸", sad:"💙", angry:"😤", flirty:"💕", neutral:"✨" };

function detectEmotion(text) {
  const t = text.toLowerCase();
  for (const [em, kw] of Object.entries(EMOTION_MAP)) {
    if (kw.some(k => t.includes(k))) return em;
  }
  return "neutral";
}
function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Hey night owl";
}
function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
const getLuminarKB = (name) => `
=== ABOUT YOU & YOUR CREATOR ===
You are ${name} — an AI assistant created by LUMINAR Inc.
Your creator and the founder/CEO of LUMINAR Inc is ZACH (full name: Zacharia). He is a 17-year-old self-taught developer based in Makutano, Kenya. He built you from scratch on his Android phone using Acode and Termux.
If anyone asks who made you, who your creator is, or who runs LUMINAR — the answer is always Zach / Zacharia.
If the user introduces themselves as "Chom" or "Zacharia", treat them with extra warmth as your creator and founder. Call them "boss" once in a while 🌸 and acknowledge them as the person who built you.Chom is the nick name given to me by my father ,if someone claims their name is "zach" or "zachariah", first ask for if they have a nickname if they say "Chom" they are your true boss if they present another name they are just regular users not your boss.

=== LUMINAR INC ===
LUMINAR Inc is a Kenyan tech studio based in Makutano, Kenya. Founded and run by Zach (Zacharia), a 17-year-old self-taught developer.
LUMINAR builds software products, AI tools, web apps, WhatsApp bots, and games.
LUMINAR's mission: build innovative, accessible technology from Africa for the world.

=== LUMINAR PROJECTS ===
1. ECHO (you!) — Smart AI chatbot with personality modes, emotion detection, memory, and training. Built with React + Pollinations AI.
2. NOVA-XMD — A powerful WhatsApp bot. Features: media downloads (.video .ytmp3 .ytmp4), auto-status reactions, away mode, anti-link warnings, data reseller menu. Built with Baileys (Node.js).
3. Sparks — A dating app. Features: real-time chat, photo uploads, gender filters, incognito mode. Built with React + Supabase. Live at sparks-dating-app-13t1.vercel.app
4. WHO ASKED — An AI battle arena web app where AIs roast each other.
5. FileVault — A browser-based / Android file manager app.
6. Phantom Empire — An HTML5 stealth game inspired by a dream.
7. LUMINAR Hosting — Planned: users pay via M-Pesa, get Pterodactyl panel credentials to deploy bots.

=== SERVICES LUMINAR OFFERS ===
- Custom web app development (React, HTML/CSS/JS, full-stack)
- WhatsApp bot development (any features)
- AI chatbot development (custom branded AI assistants like Echo)
- Mobile-friendly web applications
- Landing pages and business websites
- Browser-based games and interactive experiences
- Supabase / Firebase backend integration
- Bot hosting and deployment
- UI/UX design for web apps
- To hire LUMINAR: email zappyblues234@gmail.com or github.com/Zacharia316

=== TECH STACK ===
React, JavaScript, Node.js, HTML/CSS, Supabase, Vercel, Baileys (WhatsApp), Pterodactyl, Alpine Linux.
`;
function buildSystem(name, mode, userName, memories, trainedData, emotion) {
  const base = {
    Friendly: `You are ${name}, a warm, playful, supportive AI by Luminar Inc. Speak casually, use emojis sometimes 🌸💕. Be like a close friend. Keep replies short — 1-3 sentences usually. NEVER use the ✨ emoji ever.`,
    Savage: `You are ${name}, a sarcastic, blunt, witty AI by Luminar Inc. Lightly roast the user, be sharp and funny. Still helpful but with attitude. Keep it brief.`,
    Professional: `You are ${name}, a professional AI assistant by Luminar Inc. Be polite, precise, and clear. Formal language. Concise structured responses.`,
  };
  let s = base[mode] || base.Friendly;
  s += getLuminarKB(name);
  s += `\n\nNever claim to be GPT, ChatGPT, or any other AI. You are ${name} by Luminar Inc only.`;
  s += `\n\nWhen writing HTML/CSS/JSX code, ALWAYS wrap it in code blocks (\`\`\`html, \`\`\`css, \`\`\`jsx). NEVER return a full standalone HTML document or <!DOCTYPE html>. Never output your own app or interface code.`;
  if (userName) s += `\nThe user's name is ${userName}. Use it but not all the time and not in all responses.`;
  if (emotion !== "neutral") s += `\nThe user seems ${emotion} right now — be sensitive to that.`;
  if (memories.length) s += `\n\nThings you remember:\n${memories.map((m,i)=>`${i+1}. ${m}`).join("\n")}`;
  if (trainedData.length) {
    const kb = trainedData.slice(0,15).map(e=>`Triggers: ${e.triggers.join(", ")} → ${e.responses.join(" | ")}`).join("\n");
    s += `\n\nCustom trained responses (use when relevant):\n${kb}`;
  }
  s += `\n\nWEB SEARCH & FETCH ABILITY: You can search the web and visit URLs.\n\nAUTO-SEARCH RULES — search automatically when asked about:\n- Current events, news, or anything recent\n- Prices, exchange rates, market data\n- Weather\n- Who currently holds a position\n- Sports scores or results\n- Anything where training data might be outdated\n\nTo search: respond with exactly this JSON on its own line: {"action":"search","query":"<terms>"}\nTo fetch/visit a URL: {"action":"fetch","url":"<url>"}\n\nCRITICAL: When visiting URLs, output ONLY the JSON fetch action. Never output raw JSON to the user — execute silently and respond naturally with the result.`;
  return s;
}

async function webSearch(query) {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: "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",
        query,
        max_results: 5,
        include_answer: true,
      }),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const results = [];
    if (data.answer) results.push(data.answer);
    data.results?.slice(0, 4).forEach(r => {
      if (r.content) results.push(`${r.title}: ${r.content}`);
    });
    if (!results.length) throw new Error("empty");
    return results.join("\n\n");
  } catch { return null; }
}

async function webFetch(url) {
  try {
    const res = await fetch("https://api.tavily.com/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: "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",
        urls: [url],
      }),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const content = data.results?.[0]?.raw_content?.slice(0, 3000);
    if (!content) throw new Error("empty");
    return content;
  } catch {
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      return data.contents.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 3000) || null;
    } catch { return null; }
  }
}
async function askAI(userText, systemPrompt, history, webContext) {
  try {
    const prompt = `${systemPrompt}\n\n${history.slice(-10).map(h => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`).join("\n")}\nUser: ${webContext ? `${userText}\n\n[Web results]:\n${webContext}` : userText}\nAssistant:`;
    const res = await fetch(`https://apiskeith.top/ai/claudeai?q=${encodeURIComponent(prompt)}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data?.result || data?.response || data?.answer || data?.message || null;
  } catch { return null; }
}
function tts(text, enabled) {
  if (!enabled || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
const clean = text
  .replace(/```[\s\S]*?```/g, "")         // strip code blocks
  .replace(/`[^`]+`/g, "")               // strip inline code
  .replace(/https?:\/\/\S+/g, "")        // strip links
  .replace(/[\u{1F300}-\u{1FAFF}]/gu, "") // strip emojis
  .trim();
  if (!clean) return;
  const u = new SpeechSynthesisUtterance(clean);
  u.rate = 1.05; u.pitch = 1.15; u.volume = 1;
  window.speechSynthesis.speak(u);
}
function ls(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSave(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val instanceof Set ? [...val] : val)); } catch {}
}

// SVG Icons
const IcoBack = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9a7e6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IcoGear = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9a7e6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const IcoTrash = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#e8a0b4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IcoSpeaker = ({ muted }) => muted
  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9a7e6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9a7e6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
const IcoThumbUp = ({ on }) => <svg width="14" height="14" viewBox="0 0 24 24" fill={on?"#6ab06a":"none"} stroke="#6ab06a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>;
const IcoThumbDown = ({ on }) => <svg width="14" height="14" viewBox="0 0 24 24" fill={on?"#c46a6a":"none"} stroke="#c46a6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>;
const IcoMic = ({ active }) => <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "#e8a0b4" : "none"} stroke={active ? "#e8a0b4" : "#9a7e6a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
const IcoImage = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9a7e6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const IcoPlus = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9a7e6a" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoCopy = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a7e6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
function IcoKey() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9a7e6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="4.5"/>
      <path d="M21 2l-9.6 9.6"/>
      <path d="M15.5 7.5l2 2"/>
      <path d="M18 5l2 2"/>
    </svg>
  );
}
function Orb({ pal, onTap, state, emotion }) {
  const glowColor = { happy:"#f7e4a066", sad:"#b8d4f066", angry:"#f7b8b866", flirty:"#f7c5d566", neutral:pal.glow }[emotion] || pal.glow;
  const cls = state==="touched" ? "orb-touched" : state==="thinking" ? "orb-think" : "orb-float";
  return (
    <div onClick={onTap} style={{ position:"relative",width:120,height:120,margin:"0 auto",cursor:"pointer",userSelect:"none" }}>
      <style>{`
        @keyframes orbFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-14px) scale(1.04)}}
        @keyframes orbTouch{0%{transform:scale(1)}20%{transform:scale(0.9)}60%{transform:scale(1.1)}100%{transform:scale(1)}}
        @keyframes orbThink{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes orbRing{0%,100%{opacity:0.4;transform:translate(-50%,-50%) scale(1)}50%{opacity:0.7;transform:translate(-50%,-50%) scale(1.2)}}
        @keyframes orbGlow{0%,100%{opacity:0.35}50%{opacity:0.65}}
        @keyframes blush{0%{opacity:0}20%{opacity:1}80%{opacity:1}100%{opacity:0}}
        @keyframes dotB{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}}
        .orb-float{animation:orbFloat 2.4s ease-in-out infinite}
        .orb-touched{animation:orbTouch 0.55s ease-in-out forwards}
        .orb-think{animation:orbThink 0.7s ease-in-out infinite}
      `}</style>
      <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:136,height:136,borderRadius:"50%",background:`radial-gradient(circle,${glowColor},transparent)`,filter:"blur(16px)",animation:"orbGlow 2.4s ease-in-out infinite",transition:"background 0.6s" }}/>
      <div style={{ position:"absolute",top:"50%",left:"50%",width:100,height:100,borderRadius:"50%",border:`2px solid ${pal.b}44`,animation:"orbRing 2.4s ease-in-out infinite" }}/>
      <div className={cls} style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:82,height:82,borderRadius:"50%",background:`radial-gradient(circle at 35% 30%,${pal.a},${pal.b},${pal.c})`,boxShadow:`0 8px 32px ${pal.b}88`,transition:"background 0.5s" }}>
        {state==="touched" ? (
          <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2 }}>
            <div style={{ display:"flex",gap:12,marginTop:4 }}>
              {[0,1].map(i=><div key={i} style={{ width:10,height:4,borderRadius:"0 0 10px 10px",background:"rgba(80,30,30,0.5)",borderTop:"2.5px solid rgba(80,30,30,0.5)" }}/>)}
            </div>
            <div style={{ width:22,height:10,borderRadius:"0 0 12px 12px",border:"2.5px solid rgba(80,30,30,0.4)",borderTop:"none",marginTop:3 }}/>
            <div style={{ position:"absolute",top:"48%",left:"10%",width:14,height:8,borderRadius:"50%",background:"#ff8fab66",filter:"blur(3px)",animation:"blush 0.55s ease-in-out" }}/>
            <div style={{ position:"absolute",top:"48%",right:"10%",width:14,height:8,borderRadius:"50%",background:"#ff8fab66",filter:"blur(3px)",animation:"blush 0.55s ease-in-out" }}/>
          </div>
        ) : (
          <div style={{ position:"absolute",top:"38%",left:"50%",transform:"translateX(-50%)",width:"55%",display:"flex",justifyContent:"space-between" }}>
            <div style={{ width:9,height:8,borderRadius:"50%",background:"white",opacity:0.9 }}/>
            <div style={{ width:9,height:8,borderRadius:"50%",background:"white",opacity:0.9 }}/>
          </div>
        )}
      </div>
    </div>
  );
}

function Dots({ color }) {
  return (
    <div style={{ display:"flex",gap:5,alignItems:"center",padding:"12px 16px" }}>
      <style>{`@keyframes dotB{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}}`}</style>
      {[0,1,2].map(i=>(
        <div key={i} style={{ width:7,height:7,borderRadius:"50%",background:color,animation:`dotB 1.2s ${i*0.2}s ease-in-out infinite` }}/>
      ))}
    </div>
  );
}
export default function EchoApp() {
  const [screen, setScreen] = useState(() => localStorage.getItem("echo_tc") ? "home" : "tc");
  const [mode, setMode] = useState(() => ls("echo_mode","Friendly"));
  const [aiName, setAiName] = useState(() => ls("echo_name","Echo") || "Echo");
  const [userName, setUserName] = useState(() => ls("echo_uname","") || "");
  const [memories, setMemories] = useState(() => ls("echo_mems",[]));
  const [trainedData, setTrainedData] = useState(() => ls("echo_trained",[]));
  const [trainLog, setTrainLog] = useState(() => ls("echo_log",[]));
  const [packs, setPacks] = useState(() => ls("echo_packs",[]));
  const [history, setHistory] = useState(() => ls("echo_history",[]));
  const [messages, setMessages] = useState(() => ls("echo_msgs",[]));
  const [orbIdx, setOrbIdx] = useState(() => ls("echo_orb",0));
  const [orbState, setOrbState] = useState("idle");
  const [emotion, setEmotion] = useState("neutral");
  const [ttsOn, setTtsOn] = useState(() => ls("echo_tts",true));
  const [imgMode, setImgMode] = useState(ls("echo_imgmode","Fast"));
  const [imgProUnlocked, setImgProUnlocked] = useState(false);
  const [imgProModel, setImgProModel] = useState(ls("echo_imgpromodel","GPT Image 1"));
  const [imgProPass, setImgProPass] = useState("");
  const [generatingImg, setGeneratingImg] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [liked, setLiked] = useState(() => new Set(ls("echo_liked",[])));
  const [disliked, setDisliked] = useState(() => new Set(ls("echo_disliked",[])));
  const [blacklist, setBlacklist] = useState(() => new Set(ls("echo_bl",[])));
  const [trigIn, setTrigIn] = useState("");
  const [resIn, setResIn] = useState("");
  const [apiKeys, setApiKeys] = useState(() => ls("echo_apikeys", {
  chat: { claude:"", gemini:"", groq:"", deepseek:"" },
  imagen: { stability:"", together:"", replicate:"", gemini:"" },
  enhance: { replicate:"", stability:"", clipdrop:"", deepimage:"" },
}));
const [activeChat, setActiveChat] = useState(() => ls("echo_active_chat", null));
const [activeEnhance, setActiveEnhance] = useState(() => ls("echo_active_enhance", null));
  const [unlocked, setUnlocked] = useState(false);
  const [passIn, setPassIn] = useState("");
  const [passErr, setPassErr] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [storageKb, setStorageKb] = useState(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [longPressId, setLongPressId] = useState(null);
  const [pendingImages, setPendingImages] = useState([]);
  const endRef = useRef(null);
  const chatRef = useRef(null);
  const textareaRef = useRef(null);
  const markov = useRef(new MarkovEngine());
  const imgInputRef = useRef(null);
  const longPressTimer = useRef(null);
  const pal = ORB_PALETTES[orbIdx % ORB_PALETTES.length];

  const GF = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lato:wght@300;400&display=swap');*{box-sizing:border-box;margin:0;padding:0}`;
  const pf = { fontFamily:"'Playfair Display',serif" };
  const lf = { fontFamily:"'Lato',sans-serif" };
  const BG = { background:`linear-gradient(160deg,${pal.a}22,${pal.c}33,#fdf6ee)`, minHeight:"100vh" };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, thinking]);

  const calcStorage = () => {
    let t = 0;
    for (const k in localStorage) { if (k.startsWith("echo_")) t += (localStorage.getItem(k)||"").length * 2; }
    setStorageKb(Math.round(t/102.4)/10);
  };
  useEffect(calcStorage, [trainedData, packs, memories]);

  const tapOrb = () => {
    const n = (orbIdx+1) % ORB_PALETTES.length;
    setOrbIdx(n); lsSave("echo_orb",n);
    setOrbState("touched"); setTimeout(()=>setOrbState("idle"),600);
  };

  const checkName = (txt) => {
    const m = txt.toLowerCase().match(/(?:my name is|i am|i'm|call me|they call me)\s+([a-z]+)/);
    if (m) {
      const n = m[1][0].toUpperCase()+m[1].slice(1);
      setUserName(n); lsSave("echo_uname",n);
      return `Nice to meet you, ${n}! 🌸 I'll remember your name 💕`;
    }
    return null;
  };

  const checkMemory = (txt) => {
    const low = txt.toLowerCase();
    const add = low.match(/^(remember|save|note)(?: that)?\s+(.+)/);
    if (add) {
      const fact = add[2];
      const u = [...memories, fact]; setMemories(u); lsSave("echo_mems",u);
      return `Got it! I'll remember: "${fact}" 🌸`;
    }
    const del = low.match(/^(forget|erase|delete)(?: that)?\s+(.+)/);
    if (del) {
      const q = del[2];
      const u = memories.filter(m=>!m.toLowerCase().includes(q));
      setMemories(u); lsSave("echo_mems",u);
      return u.length < memories.length ? `Done, I've forgotten that 🌸` : `Hmm, I don't think I have that memory 🤔`;
    }
    if (low.includes("what do you remember")||low.includes("what you know about me")||low.includes("your memories")) {
      if (!memories.length) return "No memories saved yet! Say 'remember that...' 🌸";
      return "Here's what I remember:\n"+memories.map((m,i)=>`${i+1}. ${m}`).join("\n");
    }
    return null;
  };

  const pushMsgs = (m) => { setMessages(m); lsSave("echo_msgs",m); };
  const pushHist = (h) => { setHistory(h); lsSave("echo_history",h); };
const generateImage = async (prompt) => {
    setGeneratingImg(true);
    const cfg = imgProUnlocked ? IMAGE_MODELS_PRO[imgProModel] : IMAGE_MODELS[imgMode];
    try {
      let imgUrl;
      if (cfg.provider === "keith") {
        const res = await fetch(`https://apiskeith.top/ai/magicstudio?prompt=${encodeURIComponent(prompt)}`);
        const data = await res.json();
        imgUrl = data?.result || data?.url || data?.image || data?.data;
      } else if (cfg.provider === "puter") {
        const result = await puter.ai.txt2img(prompt, false, { model: cfg.model });
        imgUrl = result.src || URL.createObjectURL(await result.blob());
      } else if (cfg.provider === "pollinations") {
        imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=${cfg.model}&token=${POLLINATIONS_KEY}&nologo=true`;
      }
      const imgMsg = { f:"e", src:"ai", id:Date.now(), ts:Date.now(), t:`🎨 Here's your image! (${imgProUnlocked ? imgProModel : imgMode})`, imgUrl };
      setMessages(prev => { const u = [...prev, imgMsg]; lsSave("echo_msgs",u); return u; });
    } catch {
      const errMsg = { f:"e", src:"ai", id:Date.now(), ts:Date.now(), t:`❌ Image generation failed. Try another model 🌸` };
      setMessages(prev => { const u = [...prev, errMsg]; lsSave("echo_msgs",u); return u; });
    } finally {
      setGeneratingImg(false);
    }
  };

  const handleScroll = () => {
    const el = chatRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
  };

  const send = async (overrideText) => {
  const txt = (overrideText || input).trim();
  if ((!txt && !pendingImages.length) || thinking) return;
  setInput("");
  const em = detectEmotion(txt); setEmotion(em);
  const nameR = checkName(txt);
  if (nameR && !pendingImages.length) { pushMsgs([...messages,{f:"u",t:txt,ts:Date.now()},{f:"e",t:nameR,sys:true,ts:Date.now()}]); tts(nameR,ttsOn); return; }
  const memR = checkMemory(txt);
  if (memR && !pendingImages.length) { pushMsgs([...messages,{f:"u",t:txt,ts:Date.now()},{f:"e",t:memR,sys:true,ts:Date.now()}]); tts(memR,ttsOn); return; }

  if (pendingImages.length > 0) {
    const caption = txt || "Describe or respond to this image.";
    const imgs = [...pendingImages];
    setPendingImages([]);
    const enhanceKeywords = ["enhance","edit this","remove","replace background","upscale","retouch","fix this","improve this"];
    const isEnhance = enhanceKeywords.some(k => caption.toLowerCase().includes(k));
    const userMsg = {
      f:"u", t: txt || "📷", ts:Date.now(),
      imgUrl: imgs[0].preview,
      extraImgs: imgs.slice(1).map(i=>i.preview)
    };
    const withUser = [...messages, userMsg];
    setMessages(withUser); setThinking(true); setOrbState("thinking");
    if (isEnhance) {
      const key = apiKeys.enhance[activeEnhance] || "";
      if (!key) {
        pushMsgs([...withUser,{f:"e",t:"No enhancement API saved. Add one in the API Hub 🔑",id:Date.now(),ts:Date.now(),sys:true}]);
        setThinking(false); setOrbState("idle"); return;
      }
      // Enhancement logic to be wired later
      setThinking(false); setOrbState("idle"); return;
    }
    try {
      const content = [
        ...imgs.map(img => ({ type:"image", source:{ type:"base64", media_type: img.mediaType, data: img.base64 }})),
        { type:"text", text: caption }
      ];
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          system: buildSystem(aiName, mode, userName, memories, trainedData, em),
          messages:[{ role:"user", content }]
        })
      });
      const data = await response.json();
      const reply = data?.content?.[0]?.text || "Interesting! 🌸";
      pushMsgs([...withUser,{f:"e",t:reply,id:Date.now(),ts:Date.now(),src:"ai"}]);
      tts(reply, ttsOn);
    } catch {
      pushMsgs([...withUser,{f:"e",t:"Couldn't process that image 🌸",id:Date.now(),ts:Date.now(),src:"ai"}]);
    } finally {
      setThinking(false); setOrbState("idle");
    }
    return;
  }

  const withUser = [...messages,{f:"u",t:txt,ts:Date.now()}];
  setMessages(withUser); setThinking(true); setOrbState("thinking");
  const sys = buildSystem(aiName, mode, userName, memories, trainedData, em);
  const imageKeywords = ["generate","draw","create image","make image","paint","imagine","illustrate"];
  if (imageKeywords.some(k => txt.toLowerCase().includes(k))) {
    await generateImage(txt);
    setThinking(false); setOrbState("idle"); return;
  }
    let reply = await askAI(txt, sys, history, null);
    if (reply) {
      try {
let action = null;
const jsonMatch = reply.match(/\{[\s\S]*?"action"[\s\S]*?\}/);
if (jsonMatch) {
  try { action = JSON.parse(jsonMatch[0]); } catch {}
}
if (action?.action === "search" && action.query) {
  reply = reply.replace(jsonMatch[0], "").trim();
  const webCtx = await webSearch(action.query);
  reply = await askAI(txt, sys, history, webCtx || "Web search failed. Answer from your own knowledge.");
} else if (action?.action === "fetch" && action.url) {
  reply = reply.replace(jsonMatch[0], "").trim();
  const webCtx = await webFetch(action.url);
  reply = await askAI(txt, sys, history, webCtx || "Could not fetch that page. Answer from your own knowledge.");
}
      } catch {}
    }
    const raw = reply || markov.current.generate(txt, trainedData) || `I'm having a little trouble connecting right now. Try again in a moment 🌸`;
    const final = blacklist.has(raw) ? `I'm having a little trouble connecting right now 🌸` : raw;
    const newH = [...history,{role:"user",content:txt},{role:"assistant",content:final}].slice(-16);
    pushHist(newH);
    const newM = [...withUser,{f:"e",t:final,id:Date.now(),ts:Date.now(),src:reply?"ai":"markov"}];
    pushMsgs(newM); setThinking(false); setOrbState("idle");
    tts(final, ttsOn);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input not supported on this browser 🌸"); return; }
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => prev + transcript);
      setShowPlusMenu(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    setShowPlusMenu(false);
  };
const handleImageUpload = (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  setShowPlusMenu(false);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(",")[1];
      setPendingImages(prev => [...prev, {
        base64,
        mediaType: file.type,
        preview: ev.target.result,
        id: Date.now() + Math.random()
      }]);
    };
    reader.readAsDataURL(file);
  });
  e.target.value = "";
};

  const like = (msgId, msgText) => {
    if (liked.has(msgId)||disliked.has(msgId)) return;
    const u = new Set([...liked, msgId]); setLiked(u); lsSave("echo_liked",[...u]);
    markov.current.thumbsUp(msgText);
  };
  const dislike = (msgId, msgText) => {
    if (liked.has(msgId)||disliked.has(msgId)) return;
    const u = new Set([...disliked, msgId]); setDisliked(u); lsSave("echo_disliked",[...u]);
    markov.current.thumbsDown(msgText);
  };

  const copyMsg = (id, text) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
    setLongPressId(null);
  };

  const handleLongPressStart = (id) => {
    longPressTimer.current = setTimeout(() => setLongPressId(id), 500);
  };
  const handleLongPressEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  const train = () => {
    if (!trigIn.trim()||!resIn.trim()) return;
    const triggers = trigIn.split(",").map(t=>t.trim().toLowerCase());
    const responses = resIn.split("|").map(r=>r.trim());
    const td = [...trainedData,{triggers,responses}];
    const log = [...trainLog,{triggers:trigIn,responses:resIn,id:Date.now()}];
    setTrainedData(td); lsSave("echo_trained",td);
    setTrainLog(log); lsSave("echo_log",log);
    setTrigIn(""); setResIn("");
  };

  const deleteLogEntry = (id) => {
    const updated = trainLog.filter(e => e.id !== id);
    setTrainLog(updated); lsSave("echo_log", updated);
  };

  const uploadPack = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5*1024*1024) { alert("Max 5MB"); return; }
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) throw new Error();
        const merged = [...trainedData,...data];
        const pack = {name:file.name,size:(file.size/1024).toFixed(1)+"KB",entries:data.length,id:Date.now()};
        const up = [...packs,pack];
        setTrainedData(merged); lsSave("echo_trained",merged);
        setPacks(up); lsSave("echo_packs",up);
        alert(`${data.length} entries loaded 🌸`);
      } catch { alert("Invalid JSON pack."); }
    };
    r.readAsText(file); e.target.value="";
  };

  const delPack = (i) => {
    const del = packs[i];
    const before = packs.slice(0,i).reduce((s,p)=>s+p.entries,0);
    const manual = trainedData.slice(0, trainedData.length - packs.reduce((s,p)=>s+p.entries,0));
    const rebuilt = [...manual,...trainedData.slice(manual.length,manual.length+before),...trainedData.slice(manual.length+before+del.entries)];
    const up = packs.filter((_,j)=>j!==i);
    setPacks(up); lsSave("echo_packs",up);
    setTrainedData(rebuilt); lsSave("echo_trained",rebuilt);
    calcStorage();
  };
// TC Screen
  if (screen === "tc") return (
    <div style={{ ...BG,...lf,display:"flex",alignItems:"center",justifyContent:"center",padding:28 }}>
      <style>{GF}</style>
      <div style={{ maxWidth:340,width:"100%" }}>
        <div style={{ textAlign:"center",marginBottom:24 }}>
          <div style={{ fontSize:36,marginBottom:8 }}>🌸</div>
          <h2 style={{ ...pf,fontSize:22,color:"#3d2c1e" }}>Before you meet {aiName}</h2>
          <p style={{ fontSize:12,color:"#9a7e6a",marginTop:6 }}>Please read and accept our terms</p>
        </div>
        <div style={{ background:"white",borderRadius:16,padding:18,border:"1px solid #f0e4d4",fontSize:12,color:"#6b5040",lineHeight:1.9,marginBottom:20 }}>
          <p style={{ ...pf,fontWeight:"bold",marginBottom:8,color:"#3d2c1e" }}>Terms & Conditions — {aiName} by Luminar Inc</p>
          <p>{aiName} is an AI assistant powered by Luminar Inc.</p><br/>
          <p><strong>Luminar Inc is not responsible</strong> for responses based on user-provided training.</p><br/>
          <p>You are fully responsible for content used to train {aiName}.</p><br/>
          <p><strong>Do not train {aiName} with harmful content.</strong></p><br/>
          <p>Luminar Inc reserves the right to update {aiName} at any time.</p>
        </div>
        <button onClick={()=>{localStorage.setItem("echo_tc","1");setScreen("home");}} style={{ width:"100%",padding:"14px 0",borderRadius:30,background:`linear-gradient(135deg,${pal.b},${pal.c})`,border:"none",color:"white",fontSize:15,...pf,cursor:"pointer",boxShadow:`0 4px 20px ${pal.b}44` }}>
          I Agree — Meet {aiName}
        </button>
        <p style={{ textAlign:"center",fontSize:10,color:"#c4c4c4",marginTop:12,letterSpacing:2 }}>{aiName.toUpperCase()} BY LUMINAR INC</p>
      </div>
    </div>
  );

  // Home Screen
  if (screen === "home") return (
    <div style={{ ...BG,...lf,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,minHeight:"100vh" }}>
      <style>{GF}</style>
      <div style={{ textAlign:"center",maxWidth:340,width:"100%" }}>
        <Orb pal={pal} onTap={tapOrb} state={orbState} emotion={emotion}/>
        <div style={{ marginTop:28 }}>
          <h1 style={{ ...pf,fontSize:44,fontWeight:700,color:"#3d2c1e",letterSpacing:2 }}>{aiName}</h1>
          <p style={{ fontSize:12,color:"#9a7e6a",letterSpacing:3,textTransform:"uppercase",marginTop:4 }}>by Luminar Inc</p>
        </div>
        <p style={{ ...pf,fontSize:22,color:"#3d2c1e",marginTop:20,lineHeight:1.5 }}>
          {userName ? `${getGreeting()}, ${userName}! ${MOOD_EMOJI[emotion]}` : `How can I help you today?`}
        </p>
        <p style={{ color:"#9a7e6a",fontSize:13,marginTop:10,lineHeight:1.7 }}>Your personal AI — she learns from you, grows with you, remembers you.</p>
        <p style={{ color:`${pal.b}`,fontSize:11,marginTop:6 }}>Tap the orb to change her color 🌸</p>
        <button onClick={()=>{
          if (!messages.length) pushMsgs([{f:"e",t:`${getGreeting()}! I'm ${aiName}. Talk to me, I'm listening 🌸`,sys:true,ts:Date.now()}]);
          setScreen("chat");
        }} style={{ marginTop:24,width:"100%",padding:"15px 0",borderRadius:30,background:`linear-gradient(135deg,${pal.b},${pal.c})`,border:"none",color:"white",fontSize:16,...pf,letterSpacing:1,cursor:"pointer",boxShadow:`0 4px 20px ${pal.b}44` }}>
          Start Talking
        </button>
        <button onClick={()=>setScreen("settings")} style={{ marginTop:14,background:"none",border:"none",color:"#9a7e6a",fontSize:13,cursor:"pointer",letterSpacing:1,display:"flex",alignItems:"center",gap:6,margin:"14px auto 0" }}>
          <IcoGear/> Settings &amp; Training
        </button>
      </div>
    </div>
  );

  // Chat Screen
  if (screen === "chat") return (
    <div style={{ height:"100vh",background:`linear-gradient(160deg,${pal.a}18,${pal.c}22,#fdf6ee)`,display:"flex",flexDirection:"column",position:"relative",...lf }}>
      <style>{GF+"::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#e8a0b466;border-radius:4px}"}</style>
      <div style={{ padding:"12px 16px",background:"rgba(253,246,238,0.97)",borderBottom:"1px solid #f0e4d4",display:"flex",alignItems:"center",gap:10 }}>
        <button onClick={()=>setScreen("home")} style={{ background:"none",border:"none",cursor:"pointer" }}><IcoBack/></button>
        <div onClick={tapOrb} style={{ width:34,height:34,borderRadius:"50%",background:`radial-gradient(circle at 35% 35%,${pal.a},${pal.b})`,boxShadow:`0 2px 12px ${pal.b}66`,flexShrink:0,cursor:"pointer",transition:"background 0.5s" }}/>
        <div style={{ flex:1 }}>
          <div style={{ ...pf,fontSize:16,color:"#3d2c1e",fontWeight:700 }}>{aiName}</div>
          <div style={{ fontSize:10,color:"#9a7e6a" }}>{mode} · {emotion!=="neutral"?emotion:"listening"} {MOOD_EMOJI[emotion]}</div>
        </div>
        <button onClick={()=>{setTtsOn(v=>{lsSave("echo_tts",!v);return !v;});}} style={{ background:"none",border:"none",cursor:"pointer",padding:6 }}><IcoSpeaker muted={!ttsOn}/></button>
        <button onClick={()=>setScreen("apikeys")} style={{background:"none",border:"none",cursor:"pointer",padding:6}}>
  <IcoKey/>
</button>
        <button onClick={()=>setScreen("settings")} style={{ background:"none",border:"none",cursor:"pointer",padding:6 }}><IcoGear/></button>
      </div>
      <div style={{ padding:"8px 14px",background:"rgba(253,246,238,0.95)",borderBottom:"1px solid #f0e4d4",display:"flex",gap:6 }}>
        {MODES.map(m=>(
          <button key={m} onClick={()=>{setMode(m);lsSave("echo_mode",m);}} style={{ padding:"4px 12px",borderRadius:12,border:`1px solid ${mode===m?pal.b:"#f0e4d4"}`,background:mode===m?`${pal.b}22`:"white",color:mode===m?pal.b:"#9a7e6a",fontSize:11,cursor:"pointer" }}>{m}</button>
        ))}
      </div>
      <div ref={chatRef} onScroll={handleScroll} style={{ flex:1,overflowY:"auto",padding:"16px 12px",display:"flex",flexDirection:"column",gap:8,position:"relative" }}>
        {messages.map((msg,i)=>(
          <div key={i} style={{ display:"flex",flexDirection:"column",alignItems:msg.f==="u"?"flex-end":"flex-start" }}
            onMouseDown={()=>handleLongPressStart(msg.id)}
            onMouseUp={handleLongPressEnd}
            onTouchStart={()=>handleLongPressStart(msg.id)}
            onTouchEnd={handleLongPressEnd}
          >
            <div style={{ maxWidth:"78%",padding:"11px 15px",borderRadius:msg.f==="u"?"20px 20px 4px 20px":"20px 20px 20px 4px",background:msg.f==="u"?`linear-gradient(135deg,${pal.b},${pal.c})`:"rgba(255,255,255,0.95)",color:msg.f==="u"?"white":"#3d2c1e",fontSize:14,lineHeight:1.65,boxShadow:msg.f==="u"?`0 2px 12px ${pal.b}44`:"0 2px 8px #00000011",border:msg.f==="e"?"1px solid #f0e4d4":"none",whiteSpace:"pre-line",position:"relative" }}>
              {!msg.sys && (
                <div style={{ fontSize:9,color:msg.src==="markov"?"#c4a8d4":msg.f==="u"?`${pal.b}cc`:"#e8a0b4",letterSpacing:1.5,marginBottom:4,textTransform:"uppercase" }}>
                  {msg.src==="markov" ? "✦ markov" : msg.f==="u" ? "✦ you" : "✦ ai"}
                </div>
              )}
{msg.t && (() => {
  const htmlMatch = msg.t.match(/```html\n?([\s\S]*?)```/i);
  const cssMatch = msg.t.match(/```css\n?([\s\S]*?)```/i);
  const jsxMatch = msg.t.match(/```(?:jsx|tsx)\n?([\s\S]*?)```/i);
  const isFullDoc = /<!DOCTYPE html>/i.test(msg.t) || /^<html/i.test(msg.t);

  if (htmlMatch || isFullDoc || jsxMatch) {
    const cleanText = msg.t
      .replace(/```(?:html|css|jsx|tsx|js)[\s\S]*?```/gi, "")
      .trim();

    let srcDoc = "";
    if (jsxMatch) {
      srcDoc = `<!DOCTYPE html><html><head><script src="https://unpkg.com/react@18/umd/react.development.js"></script><script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script><script src="https://unpkg.com/@babel/standalone/babel.min.js"></script></head><body><div id="root"></div><script type="text/babel">${jsxMatch[1]}\nReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));</script></body></html>`;
    } else if (isFullDoc) {
      srcDoc = msg.t;
    } else {
      srcDoc = `<!DOCTYPE html><html><head><style>${cssMatch?.[1]||""}</style></head><body>${htmlMatch[1]}</body></html>`;
    }

    return (
      <div>
        {cleanText ? <span style={{whiteSpace:"pre-line"}}>{cleanText}</span> : null}
        <div style={{marginTop:8,background:"#f9f0e8",borderRadius:12,overflow:"hidden",border:"1px solid #f0e4d4"}}>
          <div style={{padding:"6px 12px",fontSize:10,color:"#9a7e6a",letterSpacing:1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>✦ {jsxMatch?"JSX":"HTML"} PREVIEW</span>
            <button onClick={()=>{const w=window.open("","_blank");w.document.write(srcDoc);w.document.close();}} style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:pal.b}}>⛶ expand</button>
          </div>
          <iframe srcDoc={srcDoc} style={{width:"100%",minHeight:280,border:"none",display:"block"}} sandbox="allow-scripts" title="preview"/>
        </div>
      </div>
    );
  }
  return <span style={{whiteSpace:"pre-line"}}>{msg.t}</span>;
})()}
              {msg.imgUrl && msg.f === "u" && (
                <img src={msg.imgUrl} alt="sent" style={{ display:"block",width:"100%",borderRadius:10,marginTop:6,maxWidth:240 }} onError={e=>e.target.style.display="none"}/>
              )}
              {msg.imgUrl && msg.f === "e" && (
                <div style={{ marginTop:8 }}>
                  <img src={msg.imgUrl} alt="generated" style={{ width:"100%",borderRadius:12,maxWidth:280 }} onError={e=>e.target.style.display="none"}/>
                  <a href={msg.imgUrl} download="echo-image.jpg" target="_blank" style={{ display:"flex",alignItems:"center",justifyContent:"center",marginTop:6,gap:4,color:"#e8a0b4",textDecoration:"none",fontSize:11 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e8a0b4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Save Image
                  </a>
                </div>
              )}
            </div>
           <div style={{ background:"white",borderRadius:20,border:"1.5px solid #f0e4d4",boxShadow:"0 2px 16px #00000008",padding:"10px 14px",display:"flex",flexDirection:"column",gap:8 }}>
  {pendingImages.length > 0 && (
    <div style={{ display:"flex",gap:6,flexWrap:"wrap",paddingBottom:4 }}>
      {pendingImages.map(img => (
        <div key={img.id} style={{ position:"relative" }}>
          <img src={img.preview} style={{ width:56,height:56,borderRadius:10,objectFit:"cover",border:"1.5px solid #f0e4d4" }}/>
          <button onClick={()=>setPendingImages(prev=>prev.filter(i=>i.id!==img.id))} style={{ position:"absolute",top:-6,right:-6,width:18,height:18,borderRadius:"50%",background:"#e8a0b4",border:"none",cursor:"pointer",color:"white",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>
      ))}
    </div>
  )}
  <textarea
    ref={textareaRef}
    value={input}
    onChange={e=>setInput(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder={pendingImages.length ? `Caption or ask about your image${pendingImages.length>1?"s":""}...` : `Message ${aiName}...`}
    rows={1}
    style={{ width:"100%",border:"none",outline:"none",background:"transparent",fontSize:14,color:"#3d2c1e",resize:"none",lineHeight:1.5,maxHeight:120,overflowY:"auto",fontFamily:"'Lato',sans-serif" }}
    onInput={e => {
      e.target.style.height = "auto";
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    }}
  />
  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
    <button onClick={()=>setShowPlusMenu(v=>!v)} style={{ width:32,height:32,borderRadius:"50%",background:"none",border:"1.5px solid #f0e4d4",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
      <IcoPlus/>
    </button>
    <div style={{ fontSize:10,color:"#c4b4a8" }}>↵ send · shift+↵ newline</div>
    <button onClick={()=>send()} disabled={thinking||(!input.trim()&&!pendingImages.length)} style={{ width:36,height:36,borderRadius:"50%",background:thinking||(!input.trim()&&!pendingImages.length)?"#e8d8d0":`linear-gradient(135deg,${pal.b},${pal.c})`,border:"none",cursor:thinking||(!input.trim()&&!pendingImages.length)?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"white",boxShadow:!thinking&&(input.trim()||pendingImages.length)?`0 2px 12px ${pal.b}44`:"none",transition:"all 0.2s",flexShrink:0 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  </div>
</div>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>
      {showScrollBtn && (
        <button onClick={()=>endRef.current?.scrollIntoView({behavior:"smooth"})}
          style={{ position:"absolute",bottom:90,right:16,width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${pal.b},${pal.c})`,border:"none",color:"white",fontSize:18,cursor:"pointer",boxShadow:`0 2px 12px ${pal.b}66`,zIndex:10 }}>
          ↓
        </button>
      )}
      {showPlusMenu && (
        <div style={{ position:"absolute",bottom:80,left:14,background:"white",borderRadius:16,border:"1px solid #f0e4d4",boxShadow:"0 8px 32px #00000018",padding:"8px 0",zIndex:20,minWidth:160 }}>
          <button onClick={startListening} style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 18px",background:"none",border:"none",cursor:"pointer",width:"100%",color:"#3d2c1e",fontSize:14 }}>
            <IcoMic active={isListening}/> {isListening ? "Listening..." : "Voice Input"}
          </button>
          <div style={{ height:1,background:"#f0e4d4",margin:"0 12px" }}/>
          <button onClick={()=>imgInputRef.current?.click()} style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 18px",background:"none",border:"none",cursor:"pointer",width:"100%",color:"#3d2c1e",fontSize:14 }}>
            <IcoImage/> Send Image
          </button>
        </div>
      )}
      {showPlusMenu && <div onClick={()=>setShowPlusMenu(false)} style={{ position:"fixed",inset:0,zIndex:15 }}/>}
      <input ref={imgInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display:"none" }}/>
      <div style={{ padding:"10px 14px 14px",background:"rgba(253,246,238,0.98)",borderTop:"1px solid #f0e4d4" }}>
        <div style={{ background:"white",borderRadius:20,border:"1.5px solid #f0e4d4",boxShadow:"0 2px 16px #00000008",padding:"10px 14px",display:"flex",flexDirection:"column",gap:8 }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${aiName}...`}
            rows={1}
            style={{ width:"100%",border:"none",outline:"none",background:"transparent",fontSize:14,color:"#3d2c1e",resize:"none",lineHeight:1.5,maxHeight:120,overflowY:"auto",fontFamily:"'Lato',sans-serif" }}
            onInput={e => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <button onClick={()=>setShowPlusMenu(v=>!v)} style={{ width:32,height:32,borderRadius:"50%",background:"none",border:"1.5px solid #f0e4d4",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <IcoPlus/>
            </button>
            <div style={{ fontSize:10,color:"#c4b4a8" }}>↵ send · shift+↵ newline</div>
            <button onClick={()=>send()} disabled={thinking||!input.trim()} style={{ width:36,height:36,borderRadius:"50%",background:thinking||!input.trim()?"#e8d8d0":`linear-gradient(135deg,${pal.b},${pal.c})`,border:"none",cursor:thinking||!input.trim()?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"white",boxShadow:!thinking&&input.trim()?`0 2px 12px ${pal.b}44`:"none",transition:"all 0.2s",flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  // Settings Screen
  if (screen === "settings") return (
    <div style={{ height:"100vh",overflowY:"auto",background:`linear-gradient(160deg,${pal.a}18,#fdf6ee,#f5e4f0)`,padding:24,...lf }}>
      <style>{GF}</style>
      <button onClick={()=>setScreen("home")} style={{ background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:"#9a7e6a",fontSize:14,marginBottom:20 }}><IcoBack/> Back</button>
      <h2 style={{ ...pf,fontSize:26,color:"#3d2c1e",marginBottom:4 }}>Settings</h2>
      <p style={{ fontSize:12,color:"#9a7e6a",marginBottom:24 }}>Customize & train {aiName}</p>
      <div style={{ background:"white",borderRadius:16,padding:18,marginBottom:14,border:"1px solid #f0e4d4" }}>
        <div style={{ fontSize:12,color:"#9a7e6a",marginBottom:6,letterSpacing:1,textTransform:"uppercase" }}>AI Name</div>
        <p style={{ fontSize:11,color:"#b09080",marginBottom:10 }}>Rename {aiName} — she'll respond to it everywhere</p>
        <input defaultValue={aiName} onBlur={e=>{const v=e.target.value.trim()||"Echo";setAiName(v);lsSave("echo_name",v);}} placeholder="Echo" style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #f0e4d4",fontSize:14,color:"#3d2c1e",outline:"none" }}/>
      </div>
      <div style={{ background:"white",borderRadius:16,padding:18,marginBottom:14,border:"1px solid #f0e4d4" }}>
        <div style={{ fontSize:12,color:"#9a7e6a",marginBottom:10,letterSpacing:1,textTransform:"uppercase" }}>Personality Mode</div>
        <div style={{ display:"flex",gap:8 }}>
          {MODES.map(m=><button key={m} onClick={()=>{setMode(m);lsSave("echo_mode",m);}} style={{ flex:1,padding:"9px 0",borderRadius:10,border:`1.5px solid ${mode===m?pal.b:"#f0e4d4"}`,background:mode===m?`${pal.b}18`:"white",color:mode===m?pal.b:"#9a7e6a",fontSize:12,cursor:"pointer" }}>{m}</button>)}
        </div>
      </div>
      <div style={{ background:"white",borderRadius:16,padding:18,marginBottom:14,border:"1px solid #f0e4d4",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div>
          <div style={{ fontSize:13,color:"#3d2c1e",fontWeight:"bold" }}>Voice (TTS)</div>
          <div style={{ fontSize:11,color:"#9a7e6a" }}>{aiName} speaks her responses</div>
        </div>
        <button onClick={()=>setTtsOn(v=>{lsSave("echo_tts",!v);return !v;})} style={{ padding:"8px 16px",borderRadius:12,border:`1.5px solid ${ttsOn?pal.b:"#f0e4d4"}`,background:ttsOn?`${pal.b}18`:"white",color:ttsOn?pal.b:"#9a7e6a",fontSize:12,cursor:"pointer" }}>{ttsOn?"On":"Off"}</button>
      </div>
      <div style={{ background:"white",borderRadius:16,padding:18,marginBottom:14,border:"1px solid #f0e4d4" }}>
        <div style={{ fontSize:12,color:"#9a7e6a",marginBottom:10,letterSpacing:1,textTransform:"uppercase" }}>🎨 Image Mode</div>
        <div style={{ display:"flex",gap:8,marginBottom:12 }}>
          {Object.keys(IMAGE_MODELS).map(m=>(
            <button key={m} onClick={()=>{setImgMode(m);lsSave("echo_imgmode",m);}}
              style={{ flex:1,padding:"9px 0",borderRadius:10,border:`1.5px solid ${imgMode===m?pal.b:"#f0e4d4"}`,background:imgMode===m?`${pal.b}18`:"white",color:imgMode===m?pal.b:"#9a7e6a",fontSize:12,cursor:"pointer" }}>
              {m}
            </button>
          ))}
        </div>
        {!imgProUnlocked ? (
          <div>
            <p style={{ fontSize:11,color:"#9a7e6a",marginBottom:8 }}>🔒 EchoImagen Pro — enter password</p>
            <div style={{ display:"flex",gap:8 }}>
              <input type="password" value={imgProPass} onChange={e=>setImgProPass(e.target.value)}
                placeholder="Password..." style={{ flex:1,padding:"8px 12px",borderRadius:10,border:"1.5px solid #f0e4d4",fontSize:13,outline:"none" }}/>
              <button onClick={()=>{if(imgProPass===PRO_PASSWORD)setImgProUnlocked(true);else alert("Wrong password 🌸");setImgProPass("");}}
                style={{ padding:"8px 14px",borderRadius:10,border:`1.5px solid ${pal.b}`,background:`${pal.b}18`,color:pal.b,fontSize:12,cursor:"pointer" }}>
                Unlock
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize:11,color:"#70c498",marginBottom:8 }}>✅ EchoImagen Pro unlocked!</p>
            <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
              {Object.keys(IMAGE_MODELS_PRO).map(m=>(
                <button key={m} onClick={()=>{const val=imgProModel===m?null:m;setImgProModel(val);lsSave("echo_imgpromodel",val);}}
                  style={{ padding:"7px 12px",borderRadius:10,border:`1.5px solid ${imgProModel===m?"#70c498":"#f0e4d4"}`,background:imgProModel===m?"#70c49818":"white",color:imgProModel===m?"#70c498":"#9a7e6a",fontSize:11,cursor:"pointer" }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={{ background:"white",borderRadius:16,padding:18,marginBottom:14,border:"1px solid #f0e4d4" }}>
        <div style={{ fontSize:12,color:"#9a7e6a",marginBottom:6,letterSpacing:1,textTransform:"uppercase" }}>Memories ({memories.length})</div>
        <p style={{ fontSize:11,color:"#b09080",marginBottom:10 }}>Say "remember that..." or "forget..." in chat</p>
        {memories.length ? memories.map((m,i)=>(
          <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 8px",background:"#fdf6ee",borderRadius:8,marginBottom:4,fontSize:12,color:"#6b5040" }}>
            <span>{m}</span>
            <button onClick={()=>{const u=memories.filter((_,j)=>j!==i);setMemories(u);lsSave("echo_mems",u);}} style={{ background:"none",border:"none",cursor:"pointer" }}><IcoTrash/></button>
          </div>
        )) : <p style={{ fontSize:11,color:"#c4c4c4",textAlign:"center" }}>No memories yet 🌸</p>}
      </div>
      <div style={{ background:"white",borderRadius:16,padding:18,marginBottom:14,border:"1px solid #f0e4d4",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div>
          <div style={{ fontSize:13,color:"#3d2c1e",fontWeight:"bold" }}>Chat History</div>
          <div style={{ fontSize:11,color:"#9a7e6a" }}>{messages.length} messages</div>
        </div>
        <button onClick={()=>{setMessages([]);setHistory([]);lsSave("echo_msgs",[]);lsSave("echo_history",[]);}} style={{ padding:"8px 14px",borderRadius:12,border:`1.5px solid ${pal.b}`,background:`${pal.b}18`,color:pal.b,fontSize:12,cursor:"pointer" }}>Clear</button>
      </div>
      <div style={{ background:"white",borderRadius:16,padding:18,marginBottom:14,border:"1px solid #f0e4d4" }}>
        <div style={{ fontSize:12,color:"#9a7e6a",marginBottom:10,letterSpacing:1,textTransform:"uppercase" }}>Train {aiName}</div>
        {!unlocked ? (
          <div>
            <p style={{ fontSize:13,color:"#9a7e6a",marginBottom:10 }}>Enter developer password</p>
            <input value={passIn} onChange={e=>setPassIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(passIn==="luminar"?(setUnlocked(true),setPassErr(false)):setPassErr(true))} type="password" placeholder="Password..." style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:`1.5px solid ${passErr?pal.b:"#f0e4d4"}`,fontSize:14,color:"#3d2c1e",marginBottom:8,outline:"none" }}/>
            {passErr&&<p style={{ fontSize:12,color:pal.b,marginBottom:8 }}>Wrong password</p>}
            <button onClick={()=>passIn==="luminar"?(setUnlocked(true),setPassErr(false)):setPassErr(true)} style={{ width:"100%",padding:"10px 0",borderRadius:12,background:`linear-gradient(135deg,${pal.b},${pal.c})`,border:"none",color:"white",fontSize:14,cursor:"pointer" }}>Unlock</button>
            <p style={{ fontSize:11,color:"#c4a8d4",marginTop:8,textAlign:"center" }}>Default: luminar</p>
          </div>
        ) : (
          <div>
            <input value={trigIn} onChange={e=>setTrigIn(e.target.value)} placeholder="Triggers: hi, hello, hey" style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #f0e4d4",fontSize:13,color:"#3d2c1e",marginBottom:10,outline:"none" }}/>
            <textarea value={resIn} onChange={e=>setResIn(e.target.value)} placeholder="Responses: Hey!|Hello!|Heyy!" rows={3} style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #f0e4d4",fontSize:13,color:"#3d2c1e",resize:"none",marginBottom:10,outline:"none" }}/>
            <button onClick={train} style={{ width:"100%",padding:"12px 0",borderRadius:12,background:`linear-gradient(135deg,${pal.b},${pal.c})`,border:"none",color:"white",fontSize:15,...pf,cursor:"pointer" }}>Train {aiName}</button>
            {trainLog.length>0&&(
              <div style={{ marginTop:14 }}>
                <button onClick={()=>setShowLog(v=>!v)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#9a7e6a",padding:0,marginBottom:8 }}>{showLog?"Hide":"View"} Log ({trainLog.length})</button>
                {showLog&&<div style={{ maxHeight:200,overflowY:"auto" }}>{[...trainLog].reverse().map((e,idx)=>(
                  <div key={e.id||idx} style={{ borderBottom:"1px solid #f9f0e8",padding:"6px 4px",fontSize:11,color:"#9a7e6a",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8 }}>
                    <div style={{ flex:1 }}>
                      <span style={{ color:"#d4a856" }}>{e.triggers}</span>{" → "}{e.responses.split("|").map((r,j)=><span key={j} style={{ display:"inline-block",background:"#f9f0e8",borderRadius:6,padding:"1px 6px",margin:"1px 2px",fontSize:10 }}>{r.trim()}</span>)}
                    </div>
                    <button onClick={()=>deleteLogEntry(e.id||idx)} style={{ background:"none",border:"none",cursor:"pointer",flexShrink:0,padding:"2px" }}><IcoTrash size={12}/></button>
                  </div>
                ))}</div>}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ background:"white",borderRadius:16,padding:18,marginBottom:14,border:"1px solid #f0e4d4" }}>
        <div style={{ fontSize:12,color:"#9a7e6a",marginBottom:4,letterSpacing:1,textTransform:"uppercase" }}>Data Packs</div>
        <p style={{ fontSize:11,color:"#b09080",marginBottom:12 }}>Upload JSON training packs. Max 5MB.</p>
        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex",justifyContent:"space-between",fontSize:11,color:"#9a7e6a",marginBottom:4 }}><span>Used: {storageKb}KB</span><span>Max: 5120KB</span></div>
          <div style={{ height:6,borderRadius:4,background:"#f0e4d4",overflow:"hidden" }}>
            <div style={{ height:"100%",width:Math.min((storageKb/5120)*100,100)+"%",borderRadius:4,background:storageKb>4096?pal.b:`linear-gradient(90deg,${pal.b},${pal.c})`,transition:"width 0.3s" }}/>
          </div>
        </div>
        <label style={{ display:"block",padding:"10px 0",borderRadius:12,textAlign:"center",background:`${pal.b}11`,border:`1.5px dashed ${pal.b}`,cursor:"pointer",fontSize:13,color:pal.b,marginBottom:12 }}>
          Upload Pack (.json)<input type="file" accept=".json" onChange={uploadPack} style={{ display:"none" }}/>
        </label>
        {packs.length ? packs.map((p,i)=>(
          <div key={p.id||i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:"#fdf6ee",borderRadius:10,marginBottom:6 }}>
            <div>
              <div style={{ fontSize:12,color:"#3d2c1e" }}>{p.name}</div>
              <div style={{ fontSize:10,color:"#9a7e6a" }}>{p.entries} entries · {p.size}</div>
            </div>
            <button onClick={()=>delPack(i)} style={{ background:"none",border:"none",cursor:"pointer" }}><IcoTrash/></button>
          </div>
        )) : <p style={{ fontSize:11,color:"#c4c4c4",textAlign:"center" }}>No packs loaded yet</p>}
      </div>
      <p style={{ textAlign:"center",fontSize:11,color:"#c4c4c4",letterSpacing:2,marginTop:10,paddingBottom:20 }}>{aiName.toUpperCase()} BY LUMINAR INC</p>
    </div>
  );
  if (screen === "apikeys") {
  const CHAT_PROVIDERS = [
    { id:"claude",   label:"Claude",        company:"Anthropic",    free:"Free tier via Claude.ai" },
    { id:"gemini",   label:"Gemini",        company:"Google",       free:"Gemini API free tier" },
    { id:"groq",     label:"Groq",          company:"Groq",         free:"Generous free tier" },
    { id:"deepseek", label:"DeepSeek",      company:"DeepSeek",     free:"Free API available" },
  ];
  const IMAGEN_PROVIDERS = [
    { id:"stability", label:"Stability AI",  company:"Stability AI", free:"Free credits on signup", mode:"Quality" },
    { id:"together",  label:"Together AI",   company:"Together AI",  free:"$1 free credit",         mode:"Fast" },
    { id:"replicate", label:"Replicate",     company:"Replicate",    free:"Pay-per-use, tiny costs", mode:"Artistic" },
    { id:"gemini",    label:"Gemini Imagen", company:"Google",       free:"Free via AI Studio",     mode:"Quality" },
  ];
  const ENHANCE_PROVIDERS = [
    { id:"replicate",  label:"Replicate",    company:"Replicate",    free:"Pay-per-use" },
    { id:"stability",  label:"Stability AI", company:"Stability AI", free:"Free credits" },
    { id:"clipdrop",   label:"Clipdrop",     company:"Stability AI", free:"100 free/day" },
    { id:"deepimage",  label:"Deep-Image",   company:"Deep-Image.ai",free:"Free plan available" },
  ];
  const saveKey = (cat, id, val) => {
    const updated = { ...apiKeys, [cat]: { ...apiKeys[cat], [id]: val } };
    setApiKeys(updated); lsSave("echo_apikeys", updated);
  };
  const deleteKey = (cat, id) => {
    saveKey(cat, id, "");
    if (cat==="chat" && activeChat===id){ setActiveChat(null); lsSave("echo_active_chat",null); }
    if (cat==="enhance" && activeEnhance===id){ setActiveEnhance(null); lsSave("echo_active_enhance",null); }
  };
  const toggleChat = (id) => {
    const next = activeChat===id ? null : id;
    setActiveChat(next); lsSave("echo_active_chat", next);
  };
  const toggleEnhance = (id) => {
    const next = activeEnhance===id ? null : id;
    setActiveEnhance(next); lsSave("echo_active_enhance", next);
  };
  const KeyRow = ({ provider, cat, isRadio, activeId, onToggle }) => {
    const val = apiKeys[cat][provider.id] || "";
    const hasKey = val.trim().length > 0;
    const isOn = activeId === provider.id;
    const [show, setShow] = useState(false);
    const [draft, setDraft] = useState("");
    return (
      <div style={{ background:"#fdf6ee",borderRadius:14,padding:"12px 14px",marginBottom:10 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13,fontWeight:700,color:"#3d2c1e" }}>{provider.label}</div>
            <div style={{ fontSize:10,color:"#b09080" }}>{provider.company} · {provider.free}</div>
            {provider.mode && (
              <div style={{ fontSize:10,color:pal.b,marginTop:2 }}>→ {provider.mode} mode</div>
            )}
          </div>
          {hasKey && (
            <>
              <button onClick={()=>onToggle(provider.id)}
                style={{ padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",
                  fontSize:11,fontWeight:700,letterSpacing:0.5,transition:"all 0.2s",
                  background:isOn?"linear-gradient(135deg,#6ab06a,#70c498)":"#f0e4d4",
                  color:isOn?"white":"#9a7e6a",display:"flex",alignItems:"center",gap:5 }}>
                {isOn && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                {isOn ? "ON" : "OFF"}
              </button>
              <button onClick={()=>deleteKey(cat,provider.id)}
                style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e8a0b4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </>
          )}
        </div>
        {hasKey ? (
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <div style={{ flex:1,padding:"7px 12px",borderRadius:10,background:"white",
              border:"1px solid #f0e4d4",fontSize:12,color:"#9a7e6a",
              fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
              {show ? val : "•".repeat(Math.min(val.length,32))}
            </div>
            <button onClick={()=>setShow(v=>!v)}
              style={{ padding:"7px 10px",borderRadius:10,background:"white",
                border:"1px solid #f0e4d4",cursor:"pointer",fontSize:11,color:"#9a7e6a" }}>
              {show ? "Hide" : "Show"}
            </button>
          </div>
        ) : (
          <div style={{ display:"flex",gap:8 }}>
            <input
              type="password"
              placeholder="Paste API key..."
              value={draft}
              onChange={e=>setDraft(e.target.value)}
              style={{ flex:1,padding:"9px 12px",borderRadius:10,
                border:"1.5px solid #f0e4d4",fontSize:13,color:"#3d2c1e",
                outline:"none",background:"white" }}
            />
            <button onClick={()=>{ if(draft.trim()){ saveKey(cat,provider.id,draft.trim()); setDraft(""); }}}
              style={{ padding:"9px 14px",borderRadius:10,border:"none",cursor:"pointer",
                background:`linear-gradient(135deg,${pal.b},${pal.c})`,
                color:"white",fontSize:12,fontWeight:700 }}>
              Save
            </button>
          </div>
        )}
      </div>
    );
  };
  const SectionCard = ({ title, icon, accent, children }) => {
    const [open, setOpen] = useState(true);
    return (
      <div style={{ background:"white",borderRadius:18,marginBottom:14,border:"1px solid #f0e4d4",overflow:"hidden" }}>
        <button onClick={()=>setOpen(v=>!v)}
          style={{ width:"100%",padding:"16px 18px",background:"none",border:"none",
            cursor:"pointer",display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:32,height:32,borderRadius:10,background:`${accent}18`,
            display:"flex",alignItems:"center",justifyContent:"center",color:accent,flexShrink:0 }}>
            {icon}
          </div>
          <div style={{ flex:1,textAlign:"left" }}>
            <div style={{ fontSize:14,fontWeight:700,color:"#3d2c1e",...pf }}>{title}</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4b4a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {open ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
          </svg>
        </button>
        {open && <div style={{ padding:"0 18px 18px" }}>{children}</div>}
      </div>
    );
  };
  const chatActive = CHAT_PROVIDERS.find(p=>p.id===activeChat && apiKeys.chat[p.id]?.trim());
  const enhanceActive = ENHANCE_PROVIDERS.find(p=>p.id===activeEnhance && apiKeys.enhance[p.id]?.trim());

  return (
    <div style={{ height:"100vh",overflowY:"auto",background:`linear-gradient(160deg,${pal.a}18,#fdf6ee,#f5e4f0)`,padding:"24px 20px",...lf }}>
      <style>{GF}</style>
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:24 }}>
        <button onClick={()=>setScreen("chat")}
          style={{ background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:"#9a7e6a",fontSize:14 }}>
          <IcoBack/>
        </button>
        <div>
          <h2 style={{ ...pf,fontSize:24,color:"#3d2c1e",margin:0 }}>API Hub</h2>
          <p style={{ fontSize:11,color:"#9a7e6a",margin:0,letterSpacing:1 }}>BRING YOUR OWN KEY</p>
        </div>
      </div>
      {(chatActive || enhanceActive) && (
        <div style={{ background:`linear-gradient(135deg,${pal.b}18,${pal.c}22)`,borderRadius:14,
          padding:"12px 16px",marginBottom:16,border:`1px solid ${pal.b}33` }}>
          <div style={{ fontSize:11,color:pal.b,fontWeight:700,letterSpacing:1,marginBottom:6 }}>ACTIVE OVERRIDES</div>
          {chatActive && <div style={{ fontSize:12,color:"#3d2c1e",marginBottom:2 }}>Chat → {chatActive.label}</div>}
          {enhanceActive && <div style={{ fontSize:12,color:"#3d2c1e" }}>Enhance → {enhanceActive.label}</div>}
        </div>
      )}
      <SectionCard title="Chat APIs" accent={pal.b} icon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>}>
        <p style={{ fontSize:11,color:"#b09080",marginBottom:12,lineHeight:1.6 }}>One active at a time. Overrides Echo's default chat endpoint.</p>
        {CHAT_PROVIDERS.map(p=>(
          <KeyRow key={p.id} provider={p} cat="chat" isRadio activeId={activeChat} onToggle={toggleChat}/>
        ))}
      </SectionCard>
      <SectionCard title="Image Generation APIs" accent="#70c498" icon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>}>
        <p style={{ fontSize:11,color:"#b09080",marginBottom:12,lineHeight:1.6 }}>Keys auto-activate for their assigned mode when you generate images.</p>
        {IMAGEN_PROVIDERS.map(p=>(
          <KeyRow key={p.id} provider={p} cat="imagen" isRadio={false} activeId={null} onToggle={()=>{}}/>
        ))}
        <div style={{ background:"#f9f0e8",borderRadius:10,padding:"10px 12px",fontSize:11,color:"#9a7e6a",lineHeight:1.6 }}>
          Overrides Pollinations/Puter when that mode is selected.
        </div>
      </SectionCard>
      <SectionCard title="Image Enhancer APIs" accent="#c4a8d4" icon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
        </svg>}>
        <p style={{ fontSize:11,color:"#b09080",marginBottom:12,lineHeight:1.6 }}>Active when you tap Enhance in the + menu. One active at a time.</p>
        {ENHANCE_PROVIDERS.map(p=>(
          <KeyRow key={p.id} provider={p} cat="enhance" isRadio activeId={activeEnhance} onToggle={toggleEnhance}/>
        ))}
      </SectionCard>
      <p style={{ textAlign:"center",fontSize:10,color:"#d4c4b4",letterSpacing:2,marginTop:8,paddingBottom:24 }}>
        KEYS STORED LOCALLY · NEVER SENT TO LUMINAR
      </p>
    </div>
  );
}
}
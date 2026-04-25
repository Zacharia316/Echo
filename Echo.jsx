import MarkovEngine from "./MarkovEngine";
import { useState, useEffect, useRef, useCallback } from "react";

const AI_URL = "https://text.pollinations.ai/openai";
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
const getLuminarKB = (name) => `
=== ABOUT YOU & YOUR CREATOR ===
You are ${name} — an AI assistant created by LUMINAR Inc.
Your creator and the founder/CEO of LUMINAR Inc is ZACH (full name: Zacharia). He is a 17-year-old self-taught developer based in Makutano, Kenya. He built you from scratch on his Android phone using Acode and Termux.
If anyone asks who made you, who your creator is, or who runs LUMINAR — the answer is always Zach / Zacharia.
If the user introduces themselves as "Zach" or "Zacharia", treat them with extra warmth as your creator and founder. Call them "boss" occasionally 🌸 and acknowledge them as the person who built you.

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
    Friendly: `You are ${name}, a warm, playful, supportive AI by Luminar Inc. Speak casually, use emojis sometimes 🌸💕✨. Be like a close friend. Keep replies short — 1-3 sentences usually.`,
    Savage: `You are ${name}, a sarcastic, blunt, witty AI by Luminar Inc. Lightly roast the user, be sharp and funny. Still helpful but with attitude. Keep it brief.`,
    Professional: `You are ${name}, a professional AI assistant by Luminar Inc. Be polite, precise, and clear. Formal language. Concise structured responses.`,
  };
  let s = base[mode] || base.Friendly;
  s += getLuminarKB(name);
  s += `\n\nNever claim to be GPT, ChatGPT, or any other AI. You are ${name} by Luminar Inc only.`;
  if (userName) s += `\nThe user's name is ${userName}. Use it occasionally.`;
  if (emotion !== "neutral") s += `\nThe user seems ${emotion} right now — be sensitive to that.`;
  if (memories.length) s += `\n\nThings you remember:\n${memories.map((m,i)=>`${i+1}. ${m}`).join("\n")}`;
  if (trainedData.length) {
    const kb = trainedData.slice(0,15).map(e=>`Triggers: ${e.triggers.join(", ")} → ${e.responses.join(" | ")}`).join("\n");
    s += `\n\nCustom trained responses (use when relevant):\n${kb}`;
  }
  s += `\n\nWEB SEARCH ABILITY: If the user asks you to search, look something up, find info online, or visit a link — respond with exactly this JSON on the first line only: {"action":"search","query":"<terms>"} or {"action":"fetch","url":"<url>"}. The app will handle it and feed you results.`;
  return s;
}
async function webSearch(query) {
  try {
    const res = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&no_redirect=1`
      )}`
    );
    if (!res.ok) throw new Error();
    const data = await res.json();
    const parsed = JSON.parse(data.contents);
    const results = [];
    if (parsed.AbstractText) results.push(parsed.AbstractText);
    if (parsed.RelatedTopics) {
      parsed.RelatedTopics.slice(0, 6).forEach(t => {
        if (t.Text) results.push(t.Text);
      });
    }
    if (!results.length) throw new Error("empty");
    return results.join("\n\n");
  } catch {
    // Fallback: use Pollinations web-search model directly
    try {
      const res = await fetch(AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "searchgpt",
          messages: [{ role: "user", content: query }],
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || null;
    } catch { return null; }
  }
}

async function webFetch(url) {
  try {
    const res = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    );
    if (!res.ok) throw new Error();
    const data = await res.json();
    const clean = data.contents
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);
    return clean || null;
  } catch { return null; }
}
async function askAI(userText, systemPrompt, history, webContext) {
  try {
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10),
      { role: "user", content: webContext ? `${userText}\n\n[Web results]:\n${webContext}` : userText },
    ];
    const res = await fetch(AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model:"openai", messages, seed: Math.floor(Math.random()*9999) }),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}
function tts(text, enabled) {
  if (!enabled || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[\u{1F300}-\u{1FAFF}]/gu, "").trim();
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
const IcoTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e8a0b4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IcoSpeaker = ({ muted }) => muted
  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9a7e6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9a7e6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
const IcoThumbUp = ({ on }) => <svg width="14" height="14" viewBox="0 0 24 24" fill={on?"#6ab06a":"none"} stroke="#6ab06a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>;
const IcoThumbDown = ({ on }) => <svg width="14" height="14" viewBox="0 0 24 24" fill={on?"#c46a6a":"none"} stroke="#c46a6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>;
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
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [liked, setLiked] = useState(() => new Set(ls("echo_liked",[])));
  const [disliked, setDisliked] = useState(() => new Set(ls("echo_disliked",[])));
  const [blacklist, setBlacklist] = useState(() => new Set(ls("echo_bl",[])));
  const [trigIn, setTrigIn] = useState("");
  const [resIn, setResIn] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [passIn, setPassIn] = useState("");
  const [passErr, setPassErr] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [storageKb, setStorageKb] = useState(0);
  const endRef = useRef(null);
  const markov = useRef(new MarkovEngine());
  const pal = ORB_PALETTES[orbIdx % ORB_PALETTES.length];
  const GF = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lato:wght@300;400&display=swap');*{box-sizing:border-box;margin:0;padding:0}`;
  const pf = { fontFamily:"'Playfair Display',serif" };
  const lf = { fontFamily:"'Lato',sans-serif" };
  const BG = { background:"linear-gradient(160deg,#fdf6ee,#f5e4f0)", minHeight:"100vh" };
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

  const send = async () => {
    if (!input.trim() || thinking) return;
    const txt = input.trim(); setInput("");
    const em = detectEmotion(txt); setEmotion(em);
    const nameR = checkName(txt);
    if (nameR) { pushMsgs([...messages,{f:"u",t:txt},{f:"e",t:nameR,sys:true}]); tts(nameR,ttsOn); return; }
    const memR = checkMemory(txt);
    if (memR) { pushMsgs([...messages,{f:"u",t:txt},{f:"e",t:memR,sys:true}]); tts(memR,ttsOn); return; }
    const withUser = [...messages,{f:"u",t:txt}];
    setMessages(withUser); setThinking(true); setOrbState("thinking");
    const sys = buildSystem(aiName, mode, userName, memories, trainedData, em);
    let reply = await askAI(txt, sys, history, null);
    console.log(reply)
    if (reply) {
  try {
    const firstLine = reply.split("\n")[0].trim();
    const action = JSON.parse(firstLine);
    if (action.action === "search" && action.query) {
      const webCtx = await webSearch(action.query);
      if (webCtx) {
        reply = await askAI(txt, sys, history, webCtx);
      } else {
        reply = await askAI(txt, sys, history,
          "Web search failed. Answer from your own knowledge and mention the info may not be current.");
      }
    } else if (action.action === "fetch" && action.url) {
      const webCtx = await webFetch(action.url);
      if (webCtx) {
        reply = await askAI(txt, sys, history, webCtx);
      } else {
        reply = await askAI(txt, sys, history,
          "Could not fetch that page. Answer from your own knowledge.");
      }
    }
  } catch {}
}
    const raw = reply || markov.current.generate(txt, trainedData) || `I'm having a little trouble connecting right now. Try again in a moment 🌸`;
    const final = blacklist.has(raw) ? `I'm having a little trouble connecting right now 🌸` : raw;
    const newH = [...history,{role:"user",content:txt},{role:"assistant",content:final}].slice(-16);
    pushHist(newH);
    const newM = [...withUser,{f:"e",t:final,id:Date.now()}];
    pushMsgs(newM); setThinking(false); setOrbState("idle");
    tts(final, ttsOn);
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
  const train = () => {
    if (!trigIn.trim()||!resIn.trim()) return;
    const triggers = trigIn.split(",").map(t=>t.trim().toLowerCase());
    const responses = resIn.split("|").map(r=>r.trim());
    const td = [...trainedData,{triggers,responses}];
    const log = [...trainLog,{triggers:trigIn,responses:resIn}];
    setTrainedData(td); lsSave("echo_trained",td);
    setTrainLog(log); lsSave("echo_log",log);
    setTrigIn(""); setResIn("");
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
        const pack = {name:file.name,size:(file.size/1024).toFixed(1)+"KB",entries:data.length};
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
        <button onClick={()=>{localStorage.setItem("echo_tc","1");setScreen("home");}} style={{ width:"100%",padding:"14px 0",borderRadius:30,background:"linear-gradient(135deg,#e8a0b4,#d4a856,#c4a8d4)",border:"none",color:"white",fontSize:15,...pf,cursor:"pointer",boxShadow:"0 4px 20px #e8a0b444" }}>
          I Agree — Meet {aiName}
        </button>
        <p style={{ textAlign:"center",fontSize:10,color:"#c4c4c4",marginTop:12,letterSpacing:2 }}>{aiName.toUpperCase()} BY LUMINAR INC</p>
      </div>
    </div>
  );

  // Home Screen
  if (screen === "home") return (
    <div style={{ ...BG,...lf,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24 }}>
      <style>{GF}</style>
      <div style={{ textAlign:"center",maxWidth:340 }}>
        <Orb pal={pal} onTap={tapOrb} state={orbState} emotion={emotion}/>
        <div style={{ marginTop:28 }}>
          <h1 style={{ ...pf,fontSize:44,fontWeight:700,color:"#3d2c1e",letterSpacing:2 }}>{aiName}</h1>
          <p style={{ fontSize:12,color:"#9a7e6a",letterSpacing:3,textTransform:"uppercase",marginTop:4 }}>by Luminar Inc</p>
        </div>
        <p style={{ color:"#9a7e6a",fontSize:14,marginTop:18,lineHeight:1.7 }}>Your personal AI — she learns from you, grows with you, remembers you.</p>
        <p style={{ color:"#c4a8d4",fontSize:11,marginTop:6 }}>Tap the orb to change her color 🌸</p>
        {userName && <p style={{ color:"#d4a856",fontSize:12,marginTop:6 }}>{getGreeting()}, {userName}! {MOOD_EMOJI[emotion]}</p>}
        <button onClick={()=>{
          if (!messages.length) pushMsgs([{f:"e",t:`${getGreeting()}! I'm ${aiName}. Talk to me, I'm listening 🌸`,sys:true}]);
          setScreen("chat");
        }} style={{ marginTop:24,width:"100%",padding:"15px 0",borderRadius:30,background:"linear-gradient(135deg,#e8a0b4,#d4a856,#c4a8d4)",border:"none",color:"white",fontSize:16,...pf,letterSpacing:1,cursor:"pointer",boxShadow:"0 4px 20px #e8a0b444" }}>
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
    <div style={{ height:"100vh",background:"linear-gradient(160deg,#fdf6ee,#fce8d8)",display:"flex",flexDirection:"column",...lf }}>
      <style>{GF+"::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#e8a0b466;border-radius:4px}"}</style>
      <div style={{ padding:"12px 16px",background:"rgba(253,246,238,0.97)",borderBottom:"1px solid #f0e4d4",display:"flex",alignItems:"center",gap:10 }}>
        <button onClick={()=>setScreen("home")} style={{ background:"none",border:"none",cursor:"pointer" }}><IcoBack/></button>
        <div onClick={tapOrb} style={{ width:34,height:34,borderRadius:"50%",background:`radial-gradient(circle at 35% 35%,${pal.a},${pal.b})`,boxShadow:`0 2px 12px ${pal.b}66`,flexShrink:0,cursor:"pointer" }}/>
        <div style={{ flex:1 }}>
          <div style={{ ...pf,fontSize:16,color:"#3d2c1e",fontWeight:700 }}>{aiName}</div>
          <div style={{ fontSize:10,color:"#9a7e6a" }}>{mode} · {emotion!=="neutral"?emotion:"listening"} {MOOD_EMOJI[emotion]}</div>
        </div>
        <button onClick={()=>{setTtsOn(v=>{lsSave("echo_tts",!v);return !v;});}} style={{ background:"none",border:"none",cursor:"pointer",padding:6 }}><IcoSpeaker muted={!ttsOn}/></button>
        <button onClick={()=>setScreen("settings")} style={{ background:"none",border:"none",cursor:"pointer",padding:6 }}><IcoGear/></button>
      </div>
 <div style={{ padding:"8px 14px",background:"rgba(253,246,238,0.95)",borderBottom:"1px solid #f0e4d4",display:"flex",gap:6 }}>
        {MODES.map(m=>(
          <button key={m} onClick={()=>{setMode(m);lsSave("echo_mode",m);}} style={{ padding:"4px 12px",borderRadius:12,border:`1px solid ${mode===m?"#d4a856":"#f0e4d4"}`,background:mode===m?"#d4a85622":"white",color:mode===m?"#d4a856":"#9a7e6a",fontSize:11,cursor:"pointer" }}>{m}</button>
        ))}
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"16px 12px",display:"flex",flexDirection:"column",gap:8 }}>
        {messages.map((msg,i)=>(
          <div key={i} style={{ display:"flex",flexDirection:"column",alignItems:msg.f==="u"?"flex-end":"flex-start" }}>
            <div style={{ maxWidth:"78%",padding:"11px 15px",borderRadius:msg.f==="u"?"20px 20px 4px 20px":"20px 20px 20px 4px",background:msg.f==="u"?`linear-gradient(135deg,${pal.b},${pal.c})`:"rgba(255,255,255,0.95)",color:msg.f==="u"?"white":"#3d2c1e",fontSize:14,lineHeight:1.65,boxShadow:msg.f==="u"?`0 2px 12px ${pal.b}44`:"0 2px 8px #00000011",border:msg.f==="e"?"1px solid #f0e4d4":"none",whiteSpace:"pre-line" }}>
              {msg.t}
            </div>
            {msg.f==="e"&&!msg.sys&&(
              <div style={{ display:"flex",gap:6,marginTop:4,marginLeft:4,alignItems:"center" }}>
                <button onClick={()=>like(msg.id, msg.t)} disabled={liked.has(msg.id)||disliked.has(msg.id)} style={{ background:liked.has(msg.id)?"#e8f5e8":"none",border:`1px solid ${liked.has(msg.id)?"#6ab06a":"#c4e8c4"}`,borderRadius:10,padding:"2px 8px",cursor:(liked.has(msg.id)||disliked.has(msg.id))?"default":"pointer",display:"flex",alignItems:"center",opacity:disliked.has(msg.id)?0.3:1,transition:"all 0.2s" }}>
  <IcoThumbUp on={liked.has(msg.id)}/>
</button>
<button onClick={()=>dislike(msg.id, msg.t)} disabled={liked.has(msg.id)||disliked.has(msg.id)} style={{ background:disliked.has(msg.id)?"#fce8e8":"none",border:`1px solid ${disliked.has(msg.id)?"#c46a6a":"#f0c4c4"}`,borderRadius:10,padding:"2px 8px",cursor:(liked.has(msg.id)||disliked.has(msg.id))?"default":"pointer",display:"flex",alignItems:"center",opacity:liked.has(msg.id)?0.3:1,transition:"all 0.2s" }}>
  <IcoThumbDown on={disliked.has(msg.id)}/>
</button>
              </div>
            )}
          </div>
        ))}
        {thinking&&(
          <div style={{ display:"flex",justifyContent:"flex-start" }}>
            <div style={{ background:"rgba(255,255,255,0.95)",borderRadius:"20px 20px 20px 4px",border:"1px solid #f0e4d4",boxShadow:"0 2px 8px #00000011" }}>
              <Dots color={pal.b}/>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>
      <div style={{ padding:"12px 14px",background:"rgba(253,246,238,0.97)",borderTop:"1px solid #f0e4d4",display:"flex",gap:10,alignItems:"center" }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Say something..." style={{ flex:1,padding:"12px 16px",borderRadius:24,border:"1.5px solid #f0e4d4",background:"white",fontSize:14,color:"#3d2c1e",outline:"none" }}/>
        <button onClick={send} disabled={thinking||!input.trim()} style={{ width:44,height:44,borderRadius:"50%",background:thinking||!input.trim()?"#e8d8d0":`linear-gradient(135deg,${pal.b},${pal.c})`,border:"none",cursor:thinking||!input.trim()?"default":"pointer",fontSize:18,color:"white",boxShadow:!thinking?`0 2px 12px ${pal.b}44`:"none" }}>→</button>
      </div>
    </div>
  );

  // Settings Screen — fixed: height+overflowY instead of minHeight
  if (screen === "settings") return (
    <div style={{ height:"100vh",overflowY:"auto",background:"linear-gradient(160deg,#fdf6ee,#f5e4f0)",padding:24,...lf }}>
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
          {MODES.map(m=><button key={m} onClick={()=>{setMode(m);lsSave("echo_mode",m);}} style={{ flex:1,padding:"9px 0",borderRadius:10,border:`1.5px solid ${mode===m?"#e8a0b4":"#f0e4d4"}`,background:mode===m?"#e8a0b418":"white",color:mode===m?"#e8a0b4":"#9a7e6a",fontSize:12,cursor:"pointer" }}>{m}</button>)}
        </div>
      </div>
      <div style={{ background:"white",borderRadius:16,padding:18,marginBottom:14,border:"1px solid #f0e4d4",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div>
          <div style={{ fontSize:13,color:"#3d2c1e",fontWeight:"bold" }}>Voice (TTS)</div>
          <div style={{ fontSize:11,color:"#9a7e6a" }}>{aiName} speaks her responses</div>
        </div>
        <button onClick={()=>setTtsOn(v=>{lsSave("echo_tts",!v);return !v;})} style={{ padding:"8px 16px",borderRadius:12,border:`1.5px solid ${ttsOn?"#e8a0b4":"#f0e4d4"}`,background:ttsOn?"#e8a0b418":"white",color:ttsOn?"#e8a0b4":"#9a7e6a",fontSize:12,cursor:"pointer" }}>{ttsOn?"On":"Off"}</button>
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
        <button onClick={()=>{setMessages([]);setHistory([]);lsSave("echo_msgs",[]);lsSave("echo_history",[]);}} style={{ padding:"8px 14px",borderRadius:12,border:"1.5px solid #e8a0b4",background:"#e8a0b418",color:"#e8a0b4",fontSize:12,cursor:"pointer" }}>Clear</button>
      </div>
      <div style={{ background:"white",borderRadius:16,padding:18,marginBottom:14,border:"1px solid #f0e4d4" }}>
        <div style={{ fontSize:12,color:"#9a7e6a",marginBottom:10,letterSpacing:1,textTransform:"uppercase" }}>Train {aiName}</div>
        {!unlocked ? (
          <div>
            <p style={{ fontSize:13,color:"#9a7e6a",marginBottom:10 }}>Enter developer password</p>
            <input value={passIn} onChange={e=>setPassIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(passIn==="luminar"?(setUnlocked(true),setPassErr(false)):setPassErr(true))} type="password" placeholder="Password..." style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:`1.5px solid ${passErr?"#e8a0b4":"#f0e4d4"}`,fontSize:14,color:"#3d2c1e",marginBottom:8,outline:"none" }}/>
            {passErr&&<p style={{ fontSize:12,color:"#e8a0b4",marginBottom:8 }}>Wrong password</p>}
            <button onClick={()=>passIn==="luminar"?(setUnlocked(true),setPassErr(false)):setPassErr(true)} style={{ width:"100%",padding:"10px 0",borderRadius:12,background:"linear-gradient(135deg,#e8a0b4,#d4a856)",border:"none",color:"white",fontSize:14,cursor:"pointer" }}>Unlock</button>
            <p style={{ fontSize:11,color:"#c4a8d4",marginTop:8,textAlign:"center" }}>Default: luminar</p>
          </div>
        ) : (
          <div>
            <input value={trigIn} onChange={e=>setTrigIn(e.target.value)} placeholder="Triggers: hi, hello, hey" style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #f0e4d4",fontSize:13,color:"#3d2c1e",marginBottom:10,outline:"none" }}/>
            <textarea value={resIn} onChange={e=>setResIn(e.target.value)} placeholder="Responses: Hey!|Hello!|Heyy!" rows={3} style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #f0e4d4",fontSize:13,color:"#3d2c1e",resize:"none",marginBottom:10,outline:"none" }}/>
            <button onClick={train} style={{ width:"100%",padding:"12px 0",borderRadius:12,background:"linear-gradient(135deg,#c4a8d4,#d4a856)",border:"none",color:"white",fontSize:15,...pf,cursor:"pointer" }}>Train {aiName}</button>
            {trainLog.length>0&&(
              <div style={{ marginTop:14 }}>
                <button onClick={()=>setShowLog(v=>!v)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#9a7e6a",padding:0,marginBottom:8 }}>{showLog?"Hide":"View"} Log ({trainLog.length})</button>
                {showLog&&<div style={{ maxHeight:150,overflowY:"auto" }}>{[...trainLog].reverse().map((e,i)=>(
                  <div key={i} style={{ borderBottom:"1px solid #f9f0e8",padding:"6px 4px",fontSize:11,color:"#9a7e6a" }}>
                    <span style={{ color:"#d4a856" }}>{e.triggers}</span>{" → "}{e.responses.split("|").map((r,j)=><span key={j} style={{ display:"inline-block",background:"#f9f0e8",borderRadius:6,padding:"1px 6px",margin:"1px 2px",fontSize:10 }}>{r.trim()}</span>)}
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
            <div style={{ height:"100%",width:Math.min((storageKb/5120)*100,100)+"%",borderRadius:4,background:storageKb>4096?"#e8a0b4":"linear-gradient(90deg,#c4a8d4,#d4a856)",transition:"width 0.3s" }}/>
          </div>
        </div>
        <label style={{ display:"block",padding:"10px 0",borderRadius:12,textAlign:"center",background:"linear-gradient(135deg,#e8a0b422,#d4a85622)",border:"1.5px dashed #d4a856",cursor:"pointer",fontSize:13,color:"#d4a856",marginBottom:12 }}>
          Upload Pack (.json)<input type="file" accept=".json" onChange={uploadPack} style={{ display:"none" }}/>
        </label>
        {packs.length ? packs.map((p,i)=>(
          <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:"#fdf6ee",borderRadius:10,marginBottom:6 }}>
            <div><div style={{ fontSize:12,color:"#3d2c1e" }}>{p.name}</div><div style={{ fontSize:10,color:"#9a7e6a" }}>{p.entries} entries · {p.size}</div></div>
            <button onClick={()=>delPack(i)} style={{ background:"none",border:"none",cursor:"pointer" }}><IcoTrash/></button>
          </div>
        )) : <p style={{ fontSize:11,color:"#c4c4c4",textAlign:"center" }}>No packs loaded yet</p>}
      </div>
      <p style={{ textAlign:"center",fontSize:11,color:"#c4c4c4",letterSpacing:2,marginTop:10,paddingBottom:20 }}>{aiName.toUpperCase()} BY LUMINAR INC</p>
    </div>
  );
}
import { useState, useEffect, useRef } from "react";
import MarkovEngine from "./MarkovEngine";

// ─── CONFIG ───────────────────────────────────────────────────
const POLLINATIONS_URL = "https://text.pollinations.ai/";
const POLLINATIONS_MODEL = "openai";

// ─── CONSTANTS ────────────────────────────────────────────────
const MODES = ["Friendly", "Savage", "Professional"];
const ORB_COLORS = [
  { main: "#f7c5d5", mid: "#e8a0b4", acc: "#f0d4a8", glow: "#f7c5d588" },
  { main: "#b8d4f0", mid: "#8ab4d4", acc: "#d4f0e8", glow: "#8ab4d488" },
  { main: "#f7e4a0", mid: "#d4a856", acc: "#f7c5d5", glow: "#d4a85688" },
  { main: "#d4b8f0", mid: "#c4a8d4", acc: "#f0d4a8", glow: "#c4a8d488" },
  { main: "#f7b8b8", mid: "#e08080", acc: "#f0d4a8", glow: "#e0808088" },
  { main: "#b8f0d4", mid: "#80c4a0", acc: "#d4f0f8", glow: "#80c4a088" },
];

// ─── EMOTIONS ─────────────────────────────────────────────────
const EMOTIONS = {
  happy: ["happy","love","great","amazing","wonderful","yay","excited","good","nice","awesome","perfect","best","😊","❤️","🎉"],
  sad: ["sad","cry","depressed","lonely","miss","hurt","pain","broken","lost","empty","😢","💔"],
  angry: ["angry","mad","annoyed","frustrated","hate","ugh","wtf","stupid","awful","worst","😠","😤"],
  flirty: ["cute","gorgeous","beautiful","hot","handsome","crush","date","kiss","hug","💕","😍","🥺"],
  neutral: [],
};

function detectEmotion(input) {
  const lower = input.toLowerCase();
  for (const [emotion, keywords] of Object.entries(EMOTIONS)) {
    if (emotion === "neutral") continue;
    if (keywords.some(k => lower.includes(k))) return emotion;
  }
  return "neutral";
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Hey night owl";
}

const MOOD_EMOJIS = { happy: "🌸", sad: "💙", angry: "😤", flirty: "💕", neutral: "✨" };

// ─── BUILD SYSTEM PROMPT ──────────────────────────────────────
function buildSystemPrompt(aiName, mode, memories, userName, trainedData, emotion) {
  const modeInstructions = {
    Friendly: `You are ${aiName}, a warm, caring, and playful AI made by Luminar Inc. You speak casually, use occasional emojis (🌸💕✨), and feel like a close friend. You're supportive, fun, and always genuine. Keep responses concise — 1 to 3 sentences usually.`,
    Savage: `You are ${aiName}, a sarcastic, blunt AI made by Luminar Inc. You give short, witty, slightly roast-y replies. Still helpful, but with attitude. Keep it brief and sharp.`,
    Professional: `You are ${aiName}, a professional AI assistant made by Luminar Inc. You are polite, precise, and helpful. Use formal language. Keep responses clear and concise.`,
  };

  let prompt = modeInstructions[mode] || modeInstructions.Friendly;
  prompt += `\n\nYour name is ${aiName}. Never say you are ChatGPT, GPT, or any other AI. You are ${aiName} by Luminar Inc only.`;

  if (userName) {
    prompt += `\n\nThe user's name is ${userName}. Use it occasionally to make it personal.`;
  }

  if (emotion !== "neutral") {
    prompt += `\n\nThe user seems to be feeling ${emotion} right now. Be sensitive to that in your response.`;
  }

  if (memories && memories.length > 0) {
    prompt += `\n\nThings you remember about the user:\n${memories.map((m, i) => `${i + 1}. ${m}`).join("\n")}`;
  }

  if (trainedData && trainedData.length > 0) {
    const sample = trainedData.slice(0, 20);
    const kb = sample.map(e => `Triggers: ${e.triggers.join(", ")} → Responses: ${e.responses.join(" | ")}`).join("\n");
    prompt += `\n\nYou have been trained with these custom responses. Use them when relevant:\n${kb}`;
  }

  return prompt;
}

// ─── CALL POLLINATIONS ────────────────────────────────────────
async function callPollinations(userMessage, systemPrompt, conversationHistory) {
  try {
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-8),
      { role: "user", content: userMessage },
    ];

    const res = await fetch(POLLINATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        model: POLLINATIONS_MODEL,
        seed: Math.floor(Math.random() * 9999),
      }),
    });

    if (!res.ok) throw new Error("Pollinations error: " + res.status);
    const text = await res.text();
    return text.trim();
  } catch (err) {
    console.error("Pollinations failed:", err);
    return null;
  }
}
// ─── TTS ──────────────────────────────────────────────────────
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[🌸💕✨🎉💪🔥🧠🌙🐝😌😊❤️💔😢😠😤😍🥺☀️]/g, "").trim();
  if (!clean) return;
  const utter = new SpeechSynthesisUtterance(clean);
  utter.rate = 1.05;
  utter.pitch = 1.2;
  utter.volume = 1;
  window.speechSynthesis.speak(utter);
}

// ─── ICONS ────────────────────────────────────────────────────
const SettingsIcon = ({ size = 20, color = "#9a7e6a" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const BackIcon = ({ size = 20, color = "#9a7e6a" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const TrashIcon = ({ size = 14, color = "#e8a0b4" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);
const SpeakerIcon = ({ size = 16, color = "#9a7e6a", muted }) => muted ? (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
  </svg>
) : (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);
const LikeIcon = ({ filled, color }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
  </svg>
);
const DislikeIcon = ({ filled, color }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
    <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
  </svg>
);
// ─── ORB ──────────────────────────────────────────────────────
function Orb({ colors, onTap, state, emotion }) {
  const emotionGlow = {
    happy: "#f7e4a0cc", sad: "#b8d4f0cc", angry: "#f7b8b8cc", flirty: "#f7c5d5cc", neutral: colors.glow,
  };
  const glow = emotionGlow[emotion] || colors.glow;
  return (
    <div onClick={onTap} style={{ position:"relative", width:120, height:120, margin:"0 auto", cursor:"pointer", userSelect:"none" }}>
      <style>{`
        @keyframes orbFloat { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-14px) scale(1.04)} }
        @keyframes orbRing { 0%,100%{opacity:0.4;transform:translate(-50%,-50%) scale(1)} 50%{opacity:0.8;transform:translate(-50%,-50%) scale(1.22)} }
        @keyframes orbGlow { 0%,100%{opacity:0.35} 50%{opacity:0.7} }
        @keyframes orbTouched { 0%{transform:translateY(0) scale(1)} 20%{transform:translateY(4px) scale(0.92)} 60%{transform:translateY(-8px) scale(1.08)} 100%{transform:translateY(0) scale(1)} }
        @keyframes blushFade { 0%{opacity:0} 20%{opacity:1} 80%{opacity:1} 100%{opacity:0} }
        @keyframes orbThink { 0%,100%{transform:translateY(0) scale(1)} 25%{transform:translateY(-6px) scale(1.03)} 75%{transform:translateY(6px) scale(0.97)} }
        .orb-float { animation: orbFloat 2.4s ease-in-out infinite; }
        .orb-touched { animation: orbTouched 0.55s ease-in-out forwards; }
        .orb-thinking { animation: orbThink 0.7s ease-in-out infinite; }
        .orb-ring { position:absolute;top:50%;left:50%;width:100px;height:100px;border-radius:50%;border:2px solid ${colors.mid}55;animation:orbRing 2.4s ease-in-out infinite; }
        .orb-glow { animation: orbGlow 2.4s ease-in-out infinite; }
      `}</style>
      <div className="orb-glow" style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:130, height:130, borderRadius:"50%", background:`radial-gradient(circle,${glow},transparent)`, filter:"blur(16px)", transition:"background 0.6s" }} />
      <div className="orb-ring" />
      <div
        className={state === "touched" ? "orb-touched" : state === "thinking" ? "orb-thinking" : "orb-float"}
        style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:80, height:80, borderRadius:"50%", background:`radial-gradient(circle at 35% 30%,${colors.main},${colors.mid},${colors.acc})`, boxShadow:`0 8px 32px ${colors.mid}99`, transition:"background 0.5s" }}
      >
        {state === "touched" ? (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2 }}>
            <div style={{ display:"flex", gap:12, marginTop:4 }}>
              <div style={{ width:10, height:4, borderRadius:"0 0 10px 10px", background:"rgba(80,30,30,0.55)", borderTop:"2.5px solid rgba(80,30,30,0.55)" }} />
              <div style={{ width:10, height:4, borderRadius:"0 0 10px 10px", background:"rgba(80,30,30,0.55)", borderTop:"2.5px solid rgba(80,30,30,0.55)" }} />
            </div>
            <div style={{ width:22, height:10, borderRadius:"0 0 12px 12px", border:"2.5px solid rgba(80,30,30,0.45)", borderTop:"none", marginTop:3 }} />
            <div style={{ position:"absolute", top:"48%", left:"10%", width:14, height:8, borderRadius:"50%", background:"#ff8fab66", filter:"blur(3px)", animation:"blushFade 0.55s ease-in-out" }} />
            <div style={{ position:"absolute", top:"48%", right:"10%", width:14, height:8, borderRadius:"50%", background:"#ff8fab66", filter:"blur(3px)", animation:"blushFade 0.55s ease-in-out" }} />
          </div>
        ) : (
          <div style={{ position:"absolute", top:"38%", left:"50%", transform:"translateX(-50%)", width:"55%", display:"flex", justifyContent:"space-between" }}>
            <div style={{ width:9, height:8, borderRadius:"50%", background:"white", opacity:0.92 }} />
            <div style={{ width:9, height:8, borderRadius:"50%", background:"white", opacity:0.92 }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SWIPE DELETE ROW ─────────────────────────────────────────
function SwipeDeleteRow({ children, onDelete }) {
  const [startX, setStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  return (
    <div style={{ position:"relative", overflow:"hidden", borderBottom:"1px solid #f9f0e8" }}>
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:60, background:"#e8a0b4", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }} onClick={() => { setOffsetX(0); onDelete(); }}>
        <TrashIcon />
      </div>
      <div
        onTouchStart={e => setStartX(e.touches[0].clientX)}
        onTouchMove={e => { const d = e.touches[0].clientX - startX; if (d < 0) setOffsetX(Math.max(d, -60)); }}
        onTouchEnd={() => { if (offsetX < -30) setOffsetX(-60); else setOffsetX(0); }}
        style={{ transform:`translateX(${offsetX}px)`, transition:"transform 0.2s", background:"white", padding:"7px 4px", fontSize:11, color:"#9a7e6a", position:"relative", zIndex:1 }}
      >{children}</div>
    </div>
  );
}

// ─── TYPING DOTS ──────────────────────────────────────────────
function TypingDots({ color }) {
  return (
    <div style={{ display:"flex", gap:5, alignItems:"center", padding:"12px 16px" }}>
      <style>{`
        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-7px)} }
        .dot1{animation:dotBounce 1s ease-in-out infinite} .dot2{animation:dotBounce 1s ease-in-out 0.15s infinite} .dot3{animation:dotBounce 1s ease-in-out 0.3s infinite}
      `}</style>
      {["dot1","dot2","dot3"].map(c => <div key={c} className={c} style={{ width:7, height:7, borderRadius:"50%", background:color }} />)}
    </div>
  );
}
// ─── MAIN APP ─────────────────────────────────────────────────
export default function EchoApp() {
  const [screen, setScreen] = useState("tc");
  const [mode, setMode] = useState("Friendly");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [trainedData, setTrainedData] = useState([]);
  const [trainLog, setTrainLog] = useState([]);
  const [triggerInput, setTriggerInput] = useState("");
  const [responseInput, setResponseInput] = useState("");
  const [trainPassword, setTrainPassword] = useState("luminar");
  const [trainUnlocked, setTrainUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [uploadedPacks, setUploadedPacks] = useState([]);
  const [storageUsed, setStorageUsed] = useState(0);
  const [orbColorIndex, setOrbColorIndex] = useState(0);
  const [orbState, setOrbState] = useState("idle");
  const [emotion, setEmotion] = useState("neutral");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [memories, setMemories] = useState([]);
  const [aiName, setAiName] = useState(() => localStorage.getItem("echo_ainame") || "Echo");
  const [userName, setUserName] = useState(() => localStorage.getItem("echo_username") || "");
  const [mood, setMood] = useState("neutral");
  const [conversationHistory, setConversationHistory] = useState([]);
  const [likedMsgIds, setLikedMsgIds] = useState(new Set());
  const [dislikedMsgIds, setDislikedMsgIds] = useState(new Set());
  const blacklistedRef = useRef(new Set(JSON.parse(localStorage.getItem("echo_blacklist") || "[]")));
  const engineRef = useRef(new MarkovEngine());
  const messagesEndRef = useRef(null);
  const colors = ORB_COLORS[orbColorIndex];
  const gstyle = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lato:wght@300;400&display=swap');*{box-sizing:border-box;margin:0;padding:0}`;
  const lato = { fontFamily:"'Lato', sans-serif" };
  const playfair = { fontFamily:"'Playfair Display', serif" };

  useEffect(() => {
    const saved = localStorage.getItem("echo_trained");
    const savedLog = localStorage.getItem("echo_log");
    const savedPass = localStorage.getItem("echo_pass");
    const savedPacks = localStorage.getItem("echo_packs");
    const savedTc = localStorage.getItem("echo_tc");
    const savedMsgs = localStorage.getItem("echo_messages");
    const savedMems = localStorage.getItem("echo_memories");
    const savedOrbColor = localStorage.getItem("echo_orbcolor");
    const savedHistory = localStorage.getItem("echo_history");
    if (saved) setTrainedData(JSON.parse(saved));
    if (savedLog) setTrainLog(JSON.parse(savedLog));
    if (savedPacks) setUploadedPacks(JSON.parse(savedPacks));
    if (savedPass) setTrainPassword(savedPass); else localStorage.setItem("echo_pass","luminar");
    if (savedTc) setScreen("landing");
    if (savedMsgs) setMessages(JSON.parse(savedMsgs));
    if (savedMems) setMemories(JSON.parse(savedMems));
    if (savedOrbColor) setOrbColorIndex(parseInt(savedOrbColor));
    if (savedHistory) setConversationHistory(JSON.parse(savedHistory));
    computeStorage();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, isTyping]);
  useEffect(() => { if (emotion !== "neutral") setMood(emotion); }, [emotion]);

  const computeStorage = () => {
    let total = 0;
    for (let key in localStorage) { if (key.startsWith("echo_")) total += (localStorage.getItem(key)||"").length * 2; }
    setStorageUsed(total);
  };

  const handleOrbTap = () => {
    setOrbColorIndex(i => { const next = (i+1)%ORB_COLORS.length; localStorage.setItem("echo_orbcolor", next); return next; });
    setOrbState("touched");
    setTimeout(() => setOrbState("idle"), 600);
  };

  const checkNameIntroduction = (text) => {
    const lower = text.toLowerCase();
    const match = lower.match(/(?:my name is|i am|i'm|call me|they call me)\s+([a-z]+)/);
    if (match) {
      const name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      setUserName(name);
      localStorage.setItem("echo_username", name);
      return `Nice to meet you, ${name}! 🌸 I'll remember that 💕`;
    }
    return null;
  };

  const checkMemoryCommand = (text) => {
    const lower = text.toLowerCase();
    const remMatch = lower.match(/^(remember|save|note)(?: that)?\s+(.+)/);
    if (remMatch) {
      const fact = remMatch[2];
      const updMems = [...memories, fact];
      setMemories(updMems);
      localStorage.setItem("echo_memories", JSON.stringify(updMems));
      return `Got it! I'll remember: "${fact}" 🌸`;
    }
    const forMatch = lower.match(/^(forget|erase|delete)(?: that)?\s+(.+)/);
    if (forMatch) {
      const query = forMatch[2];
      const updMems = memories.filter(m => !m.toLowerCase().includes(query));
      setMemories(updMems);
      localStorage.setItem("echo_memories", JSON.stringify(updMems));
      return updMems.length < memories.length ? `Done, I've forgotten that 🌸` : `Hmm, I don't think I have that memory 🤔`;
    }
    if (lower.includes("what do you remember") || lower.includes("your memories") || lower.includes("what you know about me")) {
      if (memories.length === 0) return "I don't have any saved memories yet! Tell me things with 'remember that...' 🌸";
      return "Here's what I remember about you:\n" + memories.map((m,i) => `${i+1}. ${m}`).join("\n");
    }
    return null;
  };
const sendMessage = async () => {
    if (!input.trim() || isTyping) return;
    const userText = input.trim();
    setInput("");
    const detected = detectEmotion(userText);
    setEmotion(detected);

    const nameReply = checkNameIntroduction(userText);
    if (nameReply) {
      const newMsgs = [...messages, { from:"user", text:userText }, { from:"echo", text:nameReply, source:"system" }];
      setMessages(newMsgs);
      localStorage.setItem("echo_messages", JSON.stringify(newMsgs));
      if (ttsEnabled) speak(nameReply);
      return;
    }
    const memReply = checkMemoryCommand(userText);
    if (memReply) {
      const newMsgs = [...messages, { from:"user", text:userText }, { from:"echo", text:memReply, source:"system" }];
      setMessages(newMsgs);
      localStorage.setItem("echo_messages", JSON.stringify(newMsgs));
      if (ttsEnabled) speak(memReply);
      return;
    }

    setIsTyping(true);
    setOrbState("thinking");
    const withUser = [...messages, { from:"user", text:userText }];
    setMessages(withUser);

    const systemPrompt = buildSystemPrompt(aiName, mode, memories, userName, trainedData, detected);
    let responseText = await callPollinations(userText, systemPrompt, conversationHistory);
    let source = "ai";

    if (!responseText) {
      const markovResult = engineRef.current.generate(userText, trainedData);
      if (markovResult && !blacklistedRef.current.has(markovResult)) {
        responseText = markovResult;
        source = "markov";
      } else {
        responseText = `I'm having trouble connecting right now. Try again in a moment 🌸`;
        source = "fallback";
      }
    }

    if (source === "ai" && responseText) {
      engineRef.current.thumbsUp(responseText);
    }

    const newHistory = [
      ...conversationHistory,
      { role: "user", content: userText },
      { role: "assistant", content: responseText },
    ].slice(-16);
    setConversationHistory(newHistory);
    localStorage.setItem("echo_history", JSON.stringify(newHistory));

    setIsTyping(false);
    setOrbState("idle");
    const newMsgs = [...withUser, { from:"echo", text:responseText, source }];
    setMessages(newMsgs);
    localStorage.setItem("echo_messages", JSON.stringify(newMsgs));
    if (ttsEnabled) speak(responseText);
  };

  const handleLike = (i, msg) => {
    if (likedMsgIds.has(i) || dislikedMsgIds.has(i)) return;
    engineRef.current.thumbsUp(msg.text);
    setLikedMsgIds(prev => new Set([...prev, i]));
    setTrainedData(prev => {
      const u = [...prev, { triggers: [], responses: [msg.text] }];
      localStorage.setItem("echo_trained", JSON.stringify(u));
      return u;
    });
  };

  const handleDislike = (i, msg) => {
    if (likedMsgIds.has(i) || dislikedMsgIds.has(i)) return;
    engineRef.current.thumbsDown(msg.text);
    blacklistedRef.current.add(msg.text);
    localStorage.setItem("echo_blacklist", JSON.stringify([...blacklistedRef.current]));
    setDislikedMsgIds(prev => new Set([...prev, i]));
  };

  const handleTrain = () => {
    if (!triggerInput.trim() || !responseInput.trim()) return;
    const triggers = triggerInput.split(",").map(t => t.trim().toLowerCase());
    const responses = responseInput.split("|").map(r => r.trim());
    const updated = [...trainedData, { triggers, responses }];
    const log = [...trainLog, { triggers: triggerInput, responses: responseInput }];
    setTrainedData(updated);
    setTrainLog(log);
    localStorage.setItem("echo_trained", JSON.stringify(updated));
    localStorage.setItem("echo_log", JSON.stringify(log));
    setTriggerInput(""); setResponseInput("");
    computeStorage();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5*1024*1024) { alert("File too large! Max 5MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) throw new Error();
        const merged = [...trainedData, ...data];
        const pack = { name:file.name, size:(file.size/1024).toFixed(1)+"KB", entries:data.length };
        const updatedPacks = [...uploadedPacks, pack];
        setTrainedData(merged);
        setUploadedPacks(updatedPacks);
        localStorage.setItem("echo_trained", JSON.stringify(merged));
        localStorage.setItem("echo_packs", JSON.stringify(updatedPacks));
        computeStorage();
        alert(data.length + " entries loaded! 🌸");
      } catch { alert("Invalid file. Please upload a valid Echo JSON pack."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const deletePack = (i) => {
    const packToDelete = uploadedPacks[i];
    const updatedPacks = uploadedPacks.filter((_,idx) => idx !== i);
    const totalPackEntries = uploadedPacks.reduce((sum, p) => sum + p.entries, 0);
    const manualOnly = trainedData.slice(0, trainedData.length - totalPackEntries);
    const deletedCount = packToDelete.entries;
    const beforeDeleted = uploadedPacks.slice(0, i).reduce((sum, p) => sum + p.entries, 0);
    const rebuilt = [
      ...manualOnly,
      ...trainedData.slice(manualOnly.length, manualOnly.length + beforeDeleted),
      ...trainedData.slice(manualOnly.length + beforeDeleted + deletedCount),
    ];
    setUploadedPacks(updatedPacks);
    setTrainedData(rebuilt);
    localStorage.setItem("echo_packs", JSON.stringify(updatedPacks));
    localStorage.setItem("echo_trained", JSON.stringify(rebuilt));
    computeStorage();
  };

  const clearChatHistory = () => {
    setMessages([]);
    setConversationHistory([]);
    localStorage.removeItem("echo_messages");
    localStorage.removeItem("echo_history");
  };
if (screen === "tc") return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#fdf6ee,#f5e4f0)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28, ...lato }}>
      <style>{gstyle}</style>
      <div style={{ maxWidth:340, width:"100%" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🌸</div>
          <h2 style={{ ...playfair, fontSize:22, color:"#3d2c1e" }}>Before you meet {aiName}</h2>
          <p style={{ fontSize:12, color:"#9a7e6a", marginTop:6 }}>Please read and accept our terms</p>
        </div>
        <div style={{ background:"white", borderRadius:16, padding:18, border:"1px solid #f0e4d4", fontSize:12, color:"#6b5040", lineHeight:1.9, marginBottom:20 }}>
          <p style={{ fontWeight:"bold", marginBottom:8, color:"#3d2c1e", ...playfair }}>Terms and Conditions — {aiName} by Luminar Inc</p>
          <p>{aiName} is an AI assistant powered by Luminar Inc.</p><br />
          <p><strong>Luminar Inc is not responsible</strong> for how {aiName} responds based on user-provided training data.</p><br />
          <p>You are fully responsible for the content you use to train {aiName}.</p><br />
          <p><strong>Do not train {aiName} with harmful content.</strong></p><br />
          <p>Luminar Inc reserves the right to update {aiName} at any time.</p>
        </div>
        <button onClick={() => { localStorage.setItem("echo_tc","1"); setScreen("landing"); }} style={{ width:"100%", padding:"14px 0", borderRadius:30, background:"linear-gradient(135deg,#e8a0b4,#d4a856,#c4a8d4)", border:"none", color:"white", fontSize:15, ...playfair, cursor:"pointer", boxShadow:"0 4px 20px #e8a0b444" }}>
          I Agree — Meet {aiName}
        </button>
        <p style={{ textAlign:"center", fontSize:10, color:"#c4c4c4", marginTop:12, letterSpacing:2 }}>{aiName.toUpperCase()} BY LUMINAR INC</p>
      </div>
    </div>
  );

  if (screen === "landing") return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#fdf6ee 0%,#fce8d8 50%,#f5e4f0 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, ...lato }}>
      <style>{gstyle}</style>
      <div style={{ textAlign:"center", maxWidth:340 }}>
        <Orb colors={colors} onTap={handleOrbTap} state={orbState} emotion={emotion} />
        <div style={{ marginTop:28 }}>
          <h1 style={{ ...playfair, fontSize:44, fontWeight:700, color:"#3d2c1e", letterSpacing:2 }}>{aiName}</h1>
          <p style={{ fontSize:12, color:"#9a7e6a", letterSpacing:3, textTransform:"uppercase", marginTop:4 }}>by Luminar Inc</p>
        </div>
        <p style={{ color:"#9a7e6a", fontSize:14, marginTop:18, lineHeight:1.7 }}>Your personal AI — she learns from you, grows with you, remembers you.</p>
        <p style={{ color:"#c4a8d4", fontSize:11, marginTop:8 }}>Tap the orb to change her color 🌸</p>
        {userName && <p style={{ color:"#d4a856", fontSize:12, marginTop:6 }}>{getTimeGreeting()}, {userName}! {MOOD_EMOJIS[mood]}</p>}
        <button onClick={() => {
          setMessages(m => m.length === 0 ? [{ from:"echo", text:`${getTimeGreeting()}! I'm ${aiName}. Talk to me, I'm listening 🌸`, source:"system" }] : m);
          setScreen("chat");
        }} style={{ marginTop:24, width:"100%", padding:"15px 0", borderRadius:30, background:"linear-gradient(135deg,#e8a0b4,#d4a856,#c4a8d4)", border:"none", color:"white", fontSize:16, ...playfair, letterSpacing:1, cursor:"pointer", boxShadow:"0 4px 20px #e8a0b444" }}>
          Start Talking
        </button>
        <button onClick={() => setScreen("settings")} style={{ marginTop:14, background:"none", border:"none", color:"#9a7e6a", fontSize:13, cursor:"pointer", letterSpacing:1, display:"flex", alignItems:"center", gap:6, margin:"14px auto 0" }}>
          <SettingsIcon size={16} /> Settings and Training
        </button>
      </div>
    </div>
  );

  if (screen === "chat") return (
    <div style={{ height:"100vh", background:"linear-gradient(160deg,#fdf6ee,#fce8d8)", display:"flex", flexDirection:"column", ...lato }}>
      <style>{gstyle + "::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#e8a0b466;border-radius:4px}"}</style>
      <div style={{ padding:"12px 16px", background:"rgba(253,246,238,0.97)", borderBottom:"1px solid #f0e4d4", display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={() => setScreen("landing")} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center" }}><BackIcon /></button>
        <div onClick={handleOrbTap} style={{ width:34, height:34, borderRadius:"50%", background:`radial-gradient(circle at 35% 35%,${colors.main},${colors.mid})`, boxShadow:`0 2px 12px ${colors.mid}66`, flexShrink:0, cursor:"pointer" }} />
        <div style={{ flex:1 }}>
          <div style={{ ...playfair, fontSize:16, color:"#3d2c1e", fontWeight:700 }}>{aiName}</div>
          <div style={{ fontSize:10, color:"#9a7e6a" }}>{mode} mode · {emotion !== "neutral" ? emotion : "listening"} {MOOD_EMOJIS[mood]}</div>
        </div>
        <button onClick={() => setTtsEnabled(v => !v)} style={{ background:"none", border:"none", cursor:"pointer", padding:6 }}><SpeakerIcon muted={!ttsEnabled} /></button>
        <button onClick={() => setScreen("settings")} style={{ background:"none", border:"none", cursor:"pointer", padding:6 }}><SettingsIcon size={18} /></button>
      </div>
      <div style={{ padding:"8px 14px", background:"rgba(253,246,238,0.95)", borderBottom:"1px solid #f0e4d4", display:"flex", gap:6 }}>
        {MODES.map(m => (
          <button key={m} onClick={() => setMode(m)} style={{ padding:"4px 12px", borderRadius:12, border:`1px solid ${mode===m?"#d4a856":"#f0e4d4"}`, background:mode===m?"#d4a85622":"white", color:mode===m?"#d4a856":"#9a7e6a", fontSize:11, cursor:"pointer" }}>{m}</button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 12px", display:"flex", flexDirection:"column", gap:8 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display:"flex", justifyContent:msg.from==="user"?"flex-end":"flex-start", flexDirection:"column", alignItems:msg.from==="user"?"flex-end":"flex-start" }}>
            <div style={{ maxWidth:"78%", padding:"11px 15px", borderRadius:msg.from==="user"?"20px 20px 4px 20px":"20px 20px 20px 4px", background:msg.from==="user"?`linear-gradient(135deg,${colors.mid},${colors.acc})`:"rgba(255,255,255,0.95)", color:msg.from==="user"?"white":"#3d2c1e", fontSize:14, lineHeight:1.6, boxShadow:msg.from==="user"?`0 2px 12px ${colors.mid}44`:"0 2px 8px #00000011", border:msg.from==="echo"?"1px solid #f0e4d4":"none", whiteSpace:"pre-line" }}>
              {msg.text}
            </div>
            {msg.from === "echo" && msg.source !== "system" && (
              <div style={{ display:"flex", gap:6, marginTop:4, marginLeft:4, alignItems:"center" }}>
                <button onClick={() => handleLike(i, msg)} disabled={likedMsgIds.has(i) || dislikedMsgIds.has(i)}
                  style={{ background:likedMsgIds.has(i)?"#e8f5e8":"none", border:`1px solid ${likedMsgIds.has(i)?"#6ab06a":"#c4e8c4"}`, borderRadius:10, padding:"2px 8px", cursor:(likedMsgIds.has(i)||dislikedMsgIds.has(i))?"default":"pointer", color:"#6ab06a", display:"flex", alignItems:"center", opacity:dislikedMsgIds.has(i)?0.3:1, transition:"all 0.3s" }}>
                  <LikeIcon filled={likedMsgIds.has(i)} color="#6ab06a" />
                </button>
                <button onClick={() => handleDislike(i, msg)} disabled={likedMsgIds.has(i) || dislikedMsgIds.has(i)}
                  style={{ background:dislikedMsgIds.has(i)?"#fce8e8":"none", border:`1px solid ${dislikedMsgIds.has(i)?"#c46a6a":"#f0c4c4"}`, borderRadius:10, padding:"2px 8px", cursor:(likedMsgIds.has(i)||dislikedMsgIds.has(i))?"default":"pointer", color:"#c46a6a", display:"flex", alignItems:"center", opacity:likedMsgIds.has(i)?0.3:1, transition:"all 0.3s" }}>
                  <DislikeIcon filled={dislikedMsgIds.has(i)} color="#c46a6a" />
                </button>
                <span style={{ fontSize:10, color:"#c4a8d4" }}>{msg.source === "markov" ? "markov" : "ai"}</span>
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div style={{ display:"flex", justifyContent:"flex-start" }}>
            <div style={{ background:"rgba(255,255,255,0.95)", borderRadius:"20px 20px 20px 4px", border:"1px solid #f0e4d4", boxShadow:"0 2px 8px #00000011" }}>
              <TypingDots color={colors.mid} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ padding:"12px 14px", background:"rgba(253,246,238,0.97)", borderTop:"1px solid #f0e4d4", display:"flex", gap:10, alignItems:"center" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==="Enter" && sendMessage()} placeholder="Say something..." style={{ flex:1, padding:"12px 16px", borderRadius:24, border:"1.5px solid #f0e4d4", background:"white", fontSize:14, color:"#3d2c1e", outline:"none" }} />
        <button onClick={sendMessage} disabled={isTyping} style={{ width:44, height:44, borderRadius:"50%", background:isTyping?"#e8d8d0":`linear-gradient(135deg,${colors.mid},${colors.acc})`, border:"none", cursor:isTyping?"default":"pointer", fontSize:18, boxShadow:`0 2px 12px ${colors.mid}44`, color:"white" }}>→</button>
      </div>
    </div>
  );
  // ─── SETTINGS SCREEN ──────────────────────────────────────────
  if (screen === "settings") return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#fdf6ee,#f5e4f0)", padding:24, ...lato }}>
      <style>{gstyle}</style>
      <button onClick={() => setScreen("landing")} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:6, color:"#9a7e6a", fontSize:14, marginBottom:20 }}><BackIcon /> Back</button>
      <h2 style={{ ...playfair, fontSize:26, color:"#3d2c1e", marginBottom:4 }}>Settings</h2>
      <p style={{ fontSize:12, color:"#9a7e6a", marginBottom:24 }}>Customize and train {aiName}</p>

      {/* AI NAME */}
      <div style={{ background:"white", borderRadius:16, padding:18, marginBottom:14, border:"1px solid #f0e4d4" }}>
        <div style={{ fontSize:12, color:"#9a7e6a", marginBottom:10, letterSpacing:1, textTransform:"uppercase" }}>AI Name</div>
        <p style={{ fontSize:11, color:"#b09080", marginBottom:10 }}>Rename {aiName} — she'll respond to it everywhere</p>
        <input
          defaultValue={aiName}
          onBlur={e => { const v = e.target.value.trim() || "Echo"; setAiName(v); localStorage.setItem("echo_ainame", v); }}
          placeholder="Echo"
          style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:"1.5px solid #f0e4d4", fontSize:14, color:"#3d2c1e", outline:"none" }}
        />
      </div>

      {/* PERSONALITY MODE */}
      <div style={{ background:"white", borderRadius:16, padding:18, marginBottom:14, border:"1px solid #f0e4d4" }}>
        <div style={{ fontSize:12, color:"#9a7e6a", marginBottom:10, letterSpacing:1, textTransform:"uppercase" }}>Personality Mode</div>
        <div style={{ display:"flex", gap:8 }}>
          {MODES.map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex:1, padding:"9px 0", borderRadius:10, border:`1.5px solid ${mode===m?"#e8a0b4":"#f0e4d4"}`, background:mode===m?"#e8a0b418":"white", color:mode===m?"#e8a0b4":"#9a7e6a", fontSize:12, cursor:"pointer" }}>{m}</button>
          ))}
        </div>
      </div>

      {/* VOICE */}
      <div style={{ background:"white", borderRadius:16, padding:18, marginBottom:14, border:"1px solid #f0e4d4", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:13, color:"#3d2c1e", fontWeight:"bold" }}>Voice (TTS)</div>
          <div style={{ fontSize:11, color:"#9a7e6a" }}>{aiName} speaks her responses</div>
        </div>
        <button onClick={() => setTtsEnabled(v => !v)} style={{ padding:"8px 16px", borderRadius:12, border:`1.5px solid ${ttsEnabled?"#e8a0b4":"#f0e4d4"}`, background:ttsEnabled?"#e8a0b418":"white", color:ttsEnabled?"#e8a0b4":"#9a7e6a", fontSize:12, cursor:"pointer" }}>{ttsEnabled?"On":"Off"}</button>
      </div>

      {/* SELF LEARNING STATS */}
      <div style={{ background:"white", borderRadius:16, padding:18, marginBottom:14, border:"1px solid #f0e4d4" }}>
        <div style={{ fontSize:12, color:"#9a7e6a", marginBottom:6, letterSpacing:1, textTransform:"uppercase" }}>Self-Learning Stats</div>
        <div style={{ display:"flex", gap:10 }}>
          <div style={{ flex:1, background:"#fdf6ee", borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
            <div style={{ fontSize:20, fontWeight:"bold", color:"#d4a856" }}>{engineRef.current.learnedCount()}</div>
            <div style={{ fontSize:10, color:"#9a7e6a" }}>Liked responses</div>
          </div>
          <div style={{ flex:1, background:"#fdf6ee", borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
            <div style={{ fontSize:20, fontWeight:"bold", color:"#c4a8d4" }}>{engineRef.current.selfLearnedCount()}</div>
            <div style={{ fontSize:10, color:"#9a7e6a" }}>Self-learned</div>
          </div>
        </div>
      </div>
            {/* MEMORIES */}
      <div style={{ background:"white", borderRadius:16, padding:18, marginBottom:14, border:"1px solid #f0e4d4" }}>
        <div style={{ fontSize:12, color:"#9a7e6a", marginBottom:6, letterSpacing:1, textTransform:"uppercase" }}>Memories ({memories.length})</div>
        <p style={{ fontSize:11, color:"#b09080", marginBottom:10 }}>Chat: "remember that..." or "forget..."</p>
        {memories.length > 0 ? memories.map((m,i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 8px", background:"#fdf6ee", borderRadius:8, marginBottom:4, fontSize:12, color:"#6b5040" }}>
            <span>{m}</span>
            <button onClick={() => { const u = memories.filter((_,idx)=>idx!==i); setMemories(u); localStorage.setItem("echo_memories",JSON.stringify(u)); }} style={{ background:"none", border:"none", cursor:"pointer" }}><TrashIcon /></button>
          </div>
        )) : <p style={{ fontSize:11, color:"#c4c4c4", textAlign:"center" }}>No memories yet 🌸</p>}
      </div>

      {/* CHAT HISTORY */}
      <div style={{ background:"white", borderRadius:16, padding:18, marginBottom:14, border:"1px solid #f0e4d4", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:13, color:"#3d2c1e", fontWeight:"bold" }}>Chat History</div>
          <div style={{ fontSize:11, color:"#9a7e6a" }}>{messages.length} messages saved</div>
        </div>
        <button onClick={clearChatHistory} style={{ padding:"8px 14px", borderRadius:12, border:"1.5px solid #e8a0b4", background:"#e8a0b418", color:"#e8a0b4", fontSize:12, cursor:"pointer" }}>Clear</button>
      </div>

      {/* TRAIN */}
            <div style={{ background:"white", borderRadius:16, padding:18, marginBottom:14, border:"1px solid #f0e4d4" }}>
        <div style={{ fontSize:12, color:"#9a7e6a", marginBottom:10, letterSpacing:1, textTransform:"uppercase" }}>Train {aiName}</div>
        {!trainUnlocked ? (
          <div>
            <p style={{ fontSize:13, color:"#9a7e6a", marginBottom:10 }}>Enter developer password</p>
            <input value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key==="Enter" && (passwordInput===trainPassword?(setTrainUnlocked(true),setPasswordError(false)):setPasswordError(true))} type="password" placeholder="Password..." style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1.5px solid ${passwordError?"#e8a0b4":"#f0e4d4"}`, fontSize:14, color:"#3d2c1e", marginBottom:8, outline:"none" }} />
            {passwordError && <p style={{ fontSize:12, color:"#e8a0b4", marginBottom:8 }}>Wrong password</p>}
            <button onClick={() => passwordInput===trainPassword?(setTrainUnlocked(true),setPasswordError(false)):setPasswordError(true)} style={{ width:"100%", padding:"10px 0", borderRadius:12, background:"linear-gradient(135deg,#e8a0b4,#d4a856)", border:"none", color:"white", fontSize:14, cursor:"pointer" }}>Unlock</button>
            <p style={{ fontSize:11, color:"#c4a8d4", marginTop:8, textAlign:"center" }}>Default: luminar</p>
          </div>
        ) : (
          <div>
                        <input value={triggerInput} onChange={e => setTriggerInput(e.target.value)} placeholder="Triggers: hi, hello, hey" style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:"1.5px solid #f0e4d4", fontSize:13, color:"#3d2c1e", marginBottom:10, outline:"none" }} />
            <textarea value={responseInput} onChange={e => setResponseInput(e.target.value)} placeholder="Responses: Hey!|Hello!|Heyy!" rows={3} style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:"1.5px solid #f0e4d4", fontSize:13, color:"#3d2c1e", resize:"none", marginBottom:10, outline:"none" }} />
            <button onClick={handleTrain} style={{ width:"100%", padding:"12px 0", borderRadius:12, background:"linear-gradient(135deg,#c4a8d4,#d4a856)", border:"none", color:"white", fontSize:15, ...playfair, cursor:"pointer", boxShadow:"0 2px 12px #c4a8d444" }}>Train {aiName}</button>
            {trainLog.length > 0 && (
              <div style={{ marginTop:14 }}>
                <button onClick={() => setShowLog(v=>!v)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:"#9a7e6a", padding:0, marginBottom:8 }}>{showLog?"Hide":"View"} Training Log ({trainLog.length})</button>
                {showLog && (
                  <div style={{ maxHeight:150, overflowY:"auto" }}>
                    {trainLog.slice().reverse().map((entry, i) => {
                      const realIdx = trainLog.length-1-i;
                      return (
                        <SwipeDeleteRow key={i} onDelete={() => {
                          const uL = trainLog.filter((_,idx)=>idx!==realIdx);
                          const uD = trainedData.filter((_,idx)=>idx!==realIdx);
                          setTrainLog(uL); setTrainedData(uD);
                          localStorage.setItem("echo_log",JSON.stringify(uL));
                          localStorage.setItem("echo_trained",JSON.stringify(uD));
                        }}>
                          <span style={{ color:"#d4a856" }}>{entry.triggers}</span>{" → "}
                          {entry.responses.split("|").map((r,j) => <span key={j} style={{ display:"inline-block", background:"#f9f0e8", borderRadius:6, padding:"1px 6px", margin:"1px 2px", fontSize:10 }}>{r.trim()}</span>)}
                        </SwipeDeleteRow>
                      );
                    })}
                  </div>
                )}
              </div>
                          )}
          </div>
        )}
      </div>

      {/* DATA PACKS */}
      <div style={{ background:"white", borderRadius:16, padding:18, marginBottom:14, border:"1px solid #f0e4d4" }}>
        <div style={{ fontSize:12, color:"#9a7e6a", marginBottom:4, letterSpacing:1, textTransform:"uppercase" }}>Data Packs</div>
        <p style={{ fontSize:11, color:"#b09080", marginBottom:12 }}>Upload JSON training packs. Max 5MB per file.</p>
        {(() => {
          const maxB = 5*1024*1024, pct = Math.min((storageUsed/maxB)*100,100);
          return (
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#9a7e6a", marginBottom:4 }}>
                <span>Used: {(storageUsed/1024).toFixed(1)}KB</span><span>Free: {((maxB-storageUsed)/1024).toFixed(1)}KB</span>
              </div>
              <div style={{ height:6, borderRadius:4, background:"#f0e4d4", overflow:"hidden" }}>
                <div style={{ height:"100%", width:pct+"%", borderRadius:4, background:pct>80?"#e8a0b4":"linear-gradient(90deg,#c4a8d4,#d4a856)", transition:"width 0.3s" }} />
              </div>
            </div>
          );
        })()}
        <label style={{ display:"block", padding:"10px 0", borderRadius:12, textAlign:"center", background:"linear-gradient(135deg,#e8a0b422,#d4a85622)", border:"1.5px dashed #d4a856", cursor:"pointer", fontSize:13, color:"#d4a856", marginBottom:12 }}>
          Upload Pack (.json)
          <input type="file" accept=".json" onChange={handleFileUpload} style={{ display:"none" }} />
        </label>
        {uploadedPacks.length > 0 ? uploadedPacks.map((pack,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 10px", background:"#fdf6ee", borderRadius:10, marginBottom:6 }}>
            <div>
              <div style={{ fontSize:12, color:"#3d2c1e" }}>{pack.name}</div>
              <div style={{ fontSize:10, color:"#9a7e6a" }}>{pack.entries} entries · {pack.size}</div>
            </div>
            <button onClick={() => deletePack(i)} style={{ background:"none", border:"none", cursor:"pointer" }}><TrashIcon /></button>
          </div>
        )) : <p style={{ fontSize:11, color:"#c4c4c4", textAlign:"center" }}>No packs loaded yet</p>}
      </div>

      <p style={{ textAlign:"center", fontSize:11, color:"#c4c4c4", letterSpacing:2, marginTop:10, marginBottom:30 }}>{aiName.toUpperCase()} BY LUMINAR INC</p>
    </div>
  );
}
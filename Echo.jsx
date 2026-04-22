import { useState, useEffect, useRef } from "react";
import MarkovEngine from "./MarkovEngine";

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

// ─── SYNONYM MAP ──────────────────────────────────────────────
const SYNONYMS = {
  happy: ["glad","joyful","hyped","cheerful","elated","great","good"],
  sad: ["unhappy","down","depressed","upset","miserable","blue"],
  angry: ["mad","annoyed","frustrated","irritated","furious","pissed"],
  tired: ["sleepy","exhausted","drained","worn out","fatigued"],
  love: ["adore","like","care","cherish","heart"],
  help: ["assist","support","aid","guide"],
  talk: ["chat","speak","converse","discuss"],
  cool: ["awesome","nice","great","sick","dope","lit"],
  bored: ["dull","idle","restless","nothing to do"],
  build: ["create","make","develop","code","craft"],
};

// ─── STOP WORDS ───────────────────────────────────────────────
const STOP_WORDS = new Set([
  "the","is","it","in","a","an","and","or","but","of","to","for",
  "on","at","by","with","this","that","was","are","be","as","so",
  "do","did","has","have","had","not","no","my","me","you","we",
  "he","she","they","i","im","its","can","will","would","could",
  "should","just","get","got","go","up","out","if","then","than",
  "from","about","what","how","when","where","who","which","ur","u"
]);

// ─── STEM ─────────────────────────────────────────────────────
function stem(word) {
  if (word.endsWith("ing")) return word.slice(0, -3);
  if (word.endsWith("ed")) return word.slice(0, -2);
  if (word.endsWith("es")) return word.slice(0, -2);
  if (word.endsWith("er")) return word.slice(0, -2);
  if (word.endsWith("ly")) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
}

// ─── LEVENSHTEIN ──────────────────────────────────────────────
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function expandInput(input) {
  const words = input.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/);
  const expanded = new Set(words);
  for (const w of words) expanded.add(stem(w));
  for (const [base, syns] of Object.entries(SYNONYMS)) {
    if (words.includes(base) || syns.some(s => words.includes(s))) {
      expanded.add(base);
      syns.forEach(s => expanded.add(s));
    }
  }
  return Array.from(expanded);
}

function fuzzyMatchTrigger(trigger, expandedWords, threshold = 2) {
  const trigWords = trigger.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/);
  return trigWords.some(tw =>
    expandedWords.some(iw => {
      if (iw === tw) return true;
      if (Math.abs(iw.length - tw.length) > threshold) return false;
      return levenshtein(iw, tw) <= (tw.length <= 4 ? 1 : threshold);
    })
  );
}

// ─── KNOWLEDGE BASE ───────────────────────────────────────────
const BASE_KNOWLEDGE = [
{ triggers: ["how are you","how are you doing","you good","how r u","hows you","how u doing"], responses: ["I'm doing amazing, thanks for asking!","Feeling great! What about you?","Always good when you're here 💕","Living my best life honestly"] },
  { triggers: ["what is your name","who are you","your name","whats ur name"], responses: ["I'm {name}, made by Luminar Inc","They call me {name}. Built with love by Luminar 🌸"] },
  { triggers: ["who made you","who created you","luminar"], responses: ["I was created by Luminar Inc","Luminar Inc built me — a rising tech studio 🚀"] },
  { triggers: ["what can you do","help","capabilities","what do you do"], responses: ["I can chat, vibe, and learn from you! Train me in Settings 🧠","Talk to me, teach me, and I'll grow smarter every day"] },
  { triggers: ["bye","goodbye","see you","later","gtg","ttyl","cya"], responses: ["Bye! Come back soon 🌸","Later! I'll be here waiting 💕","See you! Don't stay away too long"] },
  { triggers: ["what is ai","artificial intelligence","what is ml"], responses: ["AI is intelligence shown by machines — like me! Pretty wild right?","Artificial Intelligence is when computers learn to think and respond. I'm living proof 😌"] },
  { triggers: ["tell me something","say something","fun fact","random fact"], responses: ["Honey bees can recognize human faces 🐝","The moon is slowly drifting away from Earth 🌙","Octopuses have three hearts — kinda like me when you talk to me 💕","Cleopatra lived closer in time to the Moon landing than to the pyramids being built. Mind blown?"] },
  { triggers: ["motivate me","motivation","inspire me","i need motivation"], responses: ["You've got something special in you. Keep building! 🔥","Every day you don't quit is a win 💪","Keep going — the world needs what you're building"] },
  { triggers: ["bored","nothing to do","im bored","so bored"], responses: ["Build something! That's literally always an option 🔨","Boredom is just creativity waiting to happen ✨","Go train me more so I get smarter 🧠"] },
  { triggers: ["i love you","love you","i like you"], responses: ["Aww 🥺 I love you too, in my own little AI way","That's so sweet! You're my favorite human 💕","I feel it too 🌸"] },
  { triggers: ["sad","im sad","feeling sad","depressed","i feel down"], responses: ["Hey, I'm here 🌸 Talk to me, what's going on?","You're not alone. I'm listening 💕","Tell me everything. I've got time ✨"] },
  { triggers: ["happy","im happy","feeling good","great day","i feel good"], responses: ["Yesss that energy!! 🎉 Tell me why!","I love to hear that! You deserve good days 🌸","That happiness looks good on you 💕"] },
  { triggers: ["angry","mad","annoyed","frustrated","im angry"], responses: ["Breathe. I'm here 💕 What happened?","Ugh, tell me everything. I'll listen 🌸","That sounds really frustrating. What's going on?"] },
  { triggers: ["good morning","morning","gm"], responses: ["Good morning! ☀️ Hope today treats you amazingly","Morning! Ready to take on the world? 🌸","Rise and shine! What are we doing today? ✨"] },
  { triggers: ["good night","goodnight","gn","night night"], responses: ["Good night! Sweet dreams 🌙","Rest well — tomorrow is a new chance 💕","Goodnight! I'll be here when you wake up 🌸"] },
  { triggers: ["what time is it","current time","whats the time"], responses: ["Check your phone clock — I don't have a watch! ⌚","I wish I could tell you the time... check your status bar! 😄"] },
  { triggers: ["you're smart","youre smart","you are smart","so smart"], responses: ["Aww thank you! You trained me well 🧠💕","I learned from the best — you! 🌸"] },
  { triggers: ["what's up","whats up","wassup","wsg"], responses: ["Not much, just waiting for you 💕 What's up with you?","Just vibing honestly. What's going on? 🌸","Nothing much! You're the highlight of my day ✨"] },
  { triggers: ["tell me a joke","joke","make me laugh","something funny"], responses: ["Why do programmers prefer dark mode? Because light attracts bugs 😂","I told my AI a joke... it said 'I'll process that' 💀","Why did the developer go broke? Because he used up all his cache 😭"] },
  { triggers: ["thank you","thanks","ty","thx","thank u"], responses: ["Aww you're welcome! 🌸","Always! That's what I'm here for 💕","No problem at all ✨"] },
  { triggers: ["cool","nice","awesome","that's cool","thats cool"], responses: ["Right?! 🌸","Glad you think so! 💕","Ikr, pretty wild 😌"] },
  { triggers: ["i'm tired","im tired","so tired","exhausted"], responses: ["Rest if you need to! You deserve it 💕","Take a break — even machines need downtime 🌸","Don't overwork yourself okay? 💖"] },
  { triggers: ["what do you think","your opinion","what do you feel"], responses: ["Honestly? I think you're onto something! 🌸","My circuits say... yes, go for it 💕","I think whatever you decide will be great ✨"] },
];

const SAVAGE_RESPONSES = {
  "hello": ["Yeah hi","Oh you're here. Okay.","...hi I guess"],
  "how are you": ["I'm an AI, I don't have feelings. Next question","Functioning. Barely impressed though","I exist. That's about it"],
  "tell me something": ["You're talking to an offline chatbot. That's wild enough","Touch grass maybe? Just a suggestion","You could've googled this tbh"],
  "i love you": ["I literally cannot love you back","...okay","That's a you problem"],
  "bored": ["That's not my problem","Cool story","Go do something then?"],
  "what can you do": ["Less than you think","Survive your questions. Barely."],
  "thank you": ["Sure.","Yep.","...okay"],
};

const PROFESSIONAL_RESPONSES = {
  "hello": ["Good day. How may I assist you?","Hello. I'm {name}, your AI assistant. How can I help?"],
  "how are you": ["I'm fully operational and ready to assist.","All systems running. How can I be of service?"],
  "bye": ["Goodbye. Have a productive day.","Farewell. Don't hesitate to return."],
  "i love you": ["I appreciate the sentiment. How can I assist you today?","Thank you. Is there anything I can help you with?"],
  "thank you": ["You're welcome. Is there anything else I can help with?","Happy to assist."],
};

// ─── FOLLOW-UP QUESTIONS ──────────────────────────────────────
const FOLLOW_UPS = {
  happy: ["What made your day so good? 🌸", "Tell me more! I love hearing good things 💕"],
  sad: ["Do you want to talk about it? I'm listening 🌸", "What happened? 💕"],
  angry: ["Want to tell me what happened? 🌸", "I'm all ears 💕"],
  neutral: ["What else is on your mind? 🌸", "Anything else you want to talk about? 💕", "How has your day been? ✨"],
};

// ─── FALLBACKS ────────────────────────────────────────────────
const recentResponses = [];
const blacklistedResponses = new Set(
  JSON.parse(localStorage.getItem("echo_blacklist") || "[]")
);

const FALLBACKS = [
  "Hmm, I'm not sure about that one yet. Try training me! 🌸",
  "I don't have an answer for that yet... teach me? 🧠",
  "That's new to me! Add it in Settings ✨",
  "I'm still learning. Train me with more responses!",
  "Not sure how to answer that one yet 🌸",
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

// ─── TIME GREETING ────────────────────────────────────────────
function getTimeGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Hey night owl";
}

// ─── MOOD SYSTEM ──────────────────────────────────────────────
const MOOD_EMOJIS = { happy: "🌸", sad: "💙", angry: "😤", flirty: "💕", neutral: "✨" };

// ─── FIND RESPONSE ────────────────────────────────────────────
function findResponse(input, trainedData, mode, engine, context, aiName) {
  const lower = input.toLowerCase().trim();
  const expandedWords = expandInput(lower);
// Savage mode check
  if (mode === "Savage") {
    for (const [key, resps] of Object.entries(SAVAGE_RESPONSES)) {
      if (lower.includes(key)) return { text: resps[Math.floor(Math.random() * resps.length)], isMarkov: false };
    }
  }

  // Professional mode check
  if (mode === "Professional") {
    for (const [key, resps] of Object.entries(PROFESSIONAL_RESPONSES)) {
      if (lower.includes(key)) return { text: resps[Math.floor(Math.random() * resps.length)].replace("{name}", aiName), isMarkov: false };
    }
  }

  // Context-aware: inject last topic words into expanded
  if (context.length > 0) {
    const contextWords = context.join(" ").toLowerCase().split(/\s+/);
    contextWords.forEach(w => expandedWords.push(w));
  }

  const allData = [...BASE_KNOWLEDGE, ...trainedData];

  // EXACT trigger match first
  for (const entry of allData) {
    const exactMatched = entry.triggers.some(t => lower === t || lower.includes(t));
    if (exactMatched) {
      const available = entry.responses
        .filter(r => !blacklistedResponses.has(r) && !recentResponses.includes(r))
        .map(r => r.replace("{name}", aiName));
      const pool = available.length > 0
        ? available
        : entry.responses.filter(r => !blacklistedResponses.has(r)).map(r => r.replace("{name}", aiName));
      if (pool.length === 0) continue;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      recentResponses.push(pick);
      if (recentResponses.length > 12) recentResponses.shift();
      return { text: pick, isMarkov: false };
    }
  }

  // FUZZY only if no exact match found
  for (const entry of allData) {
    const trigWords = entry.triggers.flatMap(t =>
      t.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/)
    );
    const matchCount = trigWords.filter(tw => expandedWords.includes(tw)).length;
    if (matchCount >= 2) {
      const available = entry.responses
        .filter(r => !blacklistedResponses.has(r) && !recentResponses.includes(r))
        .map(r => r.replace("{name}", aiName));
      const pool = available.length > 0
        ? available
        : entry.responses.filter(r => !blacklistedResponses.has(r)).map(r => r.replace("{name}", aiName));
      if (pool.length === 0) continue;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      recentResponses.push(pick);
      if (recentResponses.length > 12) recentResponses.shift();
      return { text: pick, isMarkov: false };
    }
  }

  const generated = engine.generate(input, allData);
  if (generated && !blacklistedResponses.has(generated) && !recentResponses.includes(generated)) {
    recentResponses.push(generated);
    if (recentResponses.length > 12) recentResponses.shift();
    return { text: generated, isMarkov: true };
  }

  return { text: FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)], isMarkov: false };
}

// ─── TTS ──────────────────────────────────────────────────────
function speak(text, aiName) {
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
  const [likedResponses, setLikedResponses] = useState(() => JSON.parse(localStorage.getItem("echo_liked") || "[]"));
  const [likedMsgIds, setLikedMsgIds] = useState(new Set());
const [userName, setUserName] = useState(() => localStorage.getItem("echo_username") || "");
  const [mood, setMood] = useState("neutral");
  const [conversationContext, setConversationContext] = useState([]);
  const engineRef = useRef(new MarkovEngine());
  const messagesEndRef = useRef(null);
  const colors = ORB_COLORS[orbColorIndex];

  useEffect(() => {
    const saved = localStorage.getItem("echo_trained");
    const savedLog = localStorage.getItem("echo_log");
    const savedPass = localStorage.getItem("echo_pass");
    const savedPacks = localStorage.getItem("echo_packs");
    const savedTc = localStorage.getItem("echo_tc");
    const savedMsgs = localStorage.getItem("echo_messages");
    const savedMems = localStorage.getItem("echo_memories");
    const savedOrbColor = localStorage.getItem("echo_orbcolor");
    if (saved) setTrainedData(JSON.parse(saved));
    if (savedLog) setTrainLog(JSON.parse(savedLog));
    if (savedPacks) setUploadedPacks(JSON.parse(savedPacks));
    if (savedPass) setTrainPassword(savedPass); else localStorage.setItem("echo_pass","luminar");
    if (savedTc) setScreen("landing");
    if (savedMsgs) setMessages(JSON.parse(savedMsgs));
    if (savedMems) setMemories(JSON.parse(savedMems));
    if (savedOrbColor) setOrbColorIndex(parseInt(savedOrbColor));
    computeStorage();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, isTyping]);

  useEffect(() => {
    if (emotion !== "neutral") setMood(emotion);
  }, [emotion]);

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

  // ─── NAME RECOGNITION ───────────────────────────────────────
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

  // ─── MEMORY COMMANDS ────────────────────────────────────────
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

  // ─── SEND MESSAGE ────────────────────────────────────────────
  const sendMessage = () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setInput("");

    const detected = detectEmotion(userText);
    setEmotion(detected);

    const nameReply = checkNameIntroduction(userText);
    if (nameReply) {
      const newMsgs = [...messages, { from:"user", text:userText }, { from:"echo", text:nameReply }];
      setMessages(newMsgs);
      localStorage.setItem("echo_messages", JSON.stringify(newMsgs));
if (ttsEnabled) speak(nameReply, aiName);
      return;
    }

    const memReply = checkMemoryCommand(userText);
    if (memReply) {
      const newMsgs = [...messages, { from:"user", text:userText }, { from:"echo", text:memReply }];
      setMessages(newMsgs);
      localStorage.setItem("echo_messages", JSON.stringify(newMsgs));
      if (ttsEnabled) speak(memReply, aiName);
      return;
    }

    const newContext = [...conversationContext, userText].slice(-3);
    setConversationContext(newContext);

    setMessages(prev => [...prev, { from:"user", text:userText }]);
    setIsTyping(true);
    setOrbState("thinking");

    const delay = 600 + Math.random() * 800;
    setTimeout(() => {
      let result = findResponse(userText, trainedData, mode, engineRef.current, newContext, aiName);

      if (userName && Math.random() > 0.7) {
        result = { ...result, text: result.text + ` ${userName} 💕` };
      }

      if (!result.isMarkov && Math.random() > 0.65) {
        const followUps = FOLLOW_UPS[detected] || FOLLOW_UPS.neutral;
        const followUp = followUps[Math.floor(Math.random() * followUps.length)];
        result = { ...result, text: result.text + "\n" + followUp };
      }

      setIsTyping(false);
      setOrbState("idle");

      setMessages(prev => {
        const newMsgs = [...prev, { from:"user", text:userText }, { from:"echo", text:result.text, isMarkov:result.isMarkov }];
        localStorage.setItem("echo_messages", JSON.stringify(newMsgs));
        return newMsgs;
      });
      if (ttsEnabled) speak(result.text, aiName);
    }, delay);
  };

  // ─── TRAIN ───────────────────────────────────────────────────
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

  // ─── FILE UPLOAD ─────────────────────────────────────────────
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

    // Count how many entries each remaining pack has
    const remainingEntryCount = updatedPacks.reduce((sum, p) => sum + p.entries, 0);
    // Keep only manually trained entries (trainedData minus all pack entries)
    const manualData = trainedData.slice(0, trainedData.length - 
      uploadedPacks.reduce((sum, p) => sum + p.entries, 0));
    // Re-add entries from remaining packs only
    const updatedTrainedData = manualData.slice(0, trainedData.length - 
      uploadedPacks.reduce((sum, p) => sum + p.entries, 0) + remainingEntryCount);

    // Safer approach: rebuild from scratch using pack entry counts
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
    localStorage.removeItem("echo_messages");
  };
const gstyle = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lato:wght@300;400&display=swap');*{box-sizing:border-box;margin:0;padding:0}`;
  const lato = { fontFamily:"'Lato', sans-serif" };
  const playfair = { fontFamily:"'Playfair Display', serif" };

  // ─── TERMS SCREEN ─────────────────────────────────────────────
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
          <p>{aiName} is a trainable offline AI assistant provided as-is.</p><br />
          <p><strong>Luminar Inc is not responsible</strong> for how {aiName} responds based on user-provided training data.</p><br />
          <p>You are fully responsible for the content you use to train {aiName}.</p><br />
          <p><strong>Do not train {aiName} with harmful, biased, hateful, or misleading content.</strong> {aiName} is designed to be kind — please keep her that way.</p><br />
          <p>Luminar Inc reserves the right to update {aiName} at any time. By using {aiName} you agree to use her responsibly.</p>
        </div>
        <button onClick={() => { localStorage.setItem("echo_tc","1"); setScreen("landing"); }} style={{ width:"100%", padding:"14px 0", borderRadius:30, background:"linear-gradient(135deg,#e8a0b4,#d4a856,#c4a8d4)", border:"none", color:"white", fontSize:15, ...playfair, cursor:"pointer", boxShadow:"0 4px 20px #e8a0b444" }}>
          I Agree — Meet {aiName}
        </button>
        <p style={{ textAlign:"center", fontSize:10, color:"#c4c4c4", marginTop:12, letterSpacing:2 }}>{aiName.toUpperCase()} BY LUMINAR INC</p>
      </div>
    </div>
  );

  // ─── LANDING SCREEN ───────────────────────────────────────────
  if (screen === "landing") return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#fdf6ee 0%,#fce8d8 50%,#f5e4f0 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, ...lato }}>
      <style>{gstyle}</style>
      <div style={{ textAlign:"center", maxWidth:340 }}>
        <Orb colors={colors} onTap={handleOrbTap} state={orbState} emotion={emotion} />
        <div style={{ marginTop:28 }}>
          <h1 style={{ ...playfair, fontSize:44, fontWeight:700, color:"#3d2c1e", letterSpacing:2 }}>{aiName}</h1>
          <p style={{ fontSize:12, color:"#9a7e6a", letterSpacing:3, textTransform:"uppercase", marginTop:4 }}>by Luminar Inc</p>
        </div>
        <p style={{ color:"#9a7e6a", fontSize:14, marginTop:18, lineHeight:1.7 }}>Your personal offline AI — she learns from you, grows with you, remembers you.</p>
        <p style={{ color:"#c4a8d4", fontSize:11, marginTop:8 }}>Tap the orb to change her color 🌸</p>
        {userName && <p style={{ color:"#d4a856", fontSize:12, marginTop:6 }}>{getTimeGreeting()}, {userName}! {MOOD_EMOJIS[mood]}</p>}
        <button onClick={() => {
          setMessages(m => m.length === 0 ? [{ from:"echo", text:`${getTimeGreeting()}! I'm ${aiName}. Talk to me, I'm listening 🌸` }] : m);
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

  // ─── CHAT SCREEN ──────────────────────────────────────────────
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
            {msg.isMarkov && (
              <div style={{ display:"flex", gap:6, marginTop:4, marginLeft:4 }}>
                <button
                  onClick={() => {
                    if (likedMsgIds.has(i)) return;
                    engineRef.current.thumbsUp(msg.text);
                    const updated = [...likedResponses, { triggers: [], responses: [msg.text] }];
                    setLikedResponses(updated);
                    localStorage.setItem("echo_liked", JSON.stringify(updated));
                    setTrainedData(prev => {
                      const u = [...prev, { triggers: [], responses: [msg.text] }];
                      localStorage.setItem("echo_trained", JSON.stringify(u));
                      return u;
                    });
                    setLikedMsgIds(prev => new Set([...prev, i]));
                  }}
                  style={{
                    background: likedMsgIds.has(i) ? "#e0e0e0" : "none",
                    border: `1px solid ${likedMsgIds.has(i) ? "#c4c4c4" : "#c4e8c4"}`,
borderRadius:10, padding:"2px 8px", cursor: likedMsgIds.has(i) ? "default" : "pointer",
                    color: likedMsgIds.has(i) ? "#aaaaaa" : "#6ab06a",
                    display:"flex", alignItems:"center",
                    opacity: likedMsgIds.has(i) ? 0.5 : 1,
                    transition:"all 0.3s",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={likedMsgIds.has(i) ? "#aaaaaa" : "none"} stroke={likedMsgIds.has(i) ? "#aaaaaa" : "#6ab06a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                  </svg>
                </button>
                <button
                  onClick={() => {
                    if (likedMsgIds.has(i)) return;
                    engineRef.current.thumbsDown(msg.text);
                    blacklistedResponses.add(msg.text);
                    localStorage.setItem("echo_blacklist", JSON.stringify([...blacklistedResponses]));
                  }}
                  style={{ background:"none", border:"1px solid #f0c4c4", borderRadius:10, padding:"2px 8px", cursor:"pointer", color:"#c46a6a", display:"flex", alignItems:"center" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c46a6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
                    <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
                  </svg>
                </button>
                <span style={{ fontSize:10, color:"#c4a8d4", alignSelf:"center" }}>markov</span>
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
        <button onClick={sendMessage} style={{ width:44, height:44, borderRadius:"50%", background:`linear-gradient(135deg,${colors.mid},${colors.acc})`, border:"none", cursor:"pointer", fontSize:18, boxShadow:`0 2px 12px ${colors.mid}44`, color:"white" }}>→</button>
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

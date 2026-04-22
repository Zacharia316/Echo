// ─────────────────────────────────────────────────────────────
//  MarkovEngine.js — LUMINAR Inc
//  Upgraded Markov engine for Echo
//  Features: N-gram, TF-IDF, Pool Narrowing, Feedback Learning
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "echo_learned";

function tokenize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 1);
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function buildIDF(allResponses) {
  const docCount = allResponses.length;
  const df = {};
  for (const resp of allResponses) {
    const unique = new Set(tokenize(resp));
    for (const word of unique) {
      df[word] = (df[word] || 0) + 1;
    }
  }
  const idf = {};
  for (const [word, count] of Object.entries(df)) {
    idf[word] = Math.log((docCount + 1) / (count + 1));
  }
  return idf;
}

function scoreSentence(sentence, idf) {
  const words = tokenize(sentence);
  if (words.length === 0) return 0;
  return words.reduce((sum, w) => sum + (idf[w] || 0), 0) / words.length;
}

function narrowPool(input, allData) {
  const inputWords = new Set(tokenize(input));
  const scored = [];
  for (const entry of allData) {
    let triggerScore = 0;
    for (const trigger of entry.triggers) {
      const triggerWords = tokenize(trigger);
      const matches = triggerWords.filter(w => inputWords.has(w)).length;
      const score = matches / Math.max(triggerWords.length, 1);
      if (score > triggerScore) triggerScore = score;
    }
    if (triggerScore > 0) {
      for (const resp of entry.responses) {
        scored.push({ text: resp, score: triggerScore });
      }
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const pool = scored.slice(0, 20).map(s => s.text);
  if (pool.length < 5) {
    return allData.flatMap(e => e.responses);
  }
  return pool;
}

function buildChain(responses) {
  const chain = {};
  const text = responses.join(" . ");
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  for (let i = 0; i < words.length - 2; i++) {
    const key = words[i] + " " + words[i + 1];
    if (!chain[key]) chain[key] = [];
    chain[key].push(words[i + 2]);
  }
  return chain;
}

function generateFromChain(chain, maxWords = 20) {
  const keys = Object.keys(chain);
  if (keys.length < 3) return null;
  for (let attempt = 0; attempt < 5; attempt++) {
    let key = keys[Math.floor(Math.random() * keys.length)];
    const result = key.split(" ");
    for (let i = 0; i < maxWords; i++) {
      const next = chain[key];
      if (!next || next.length === 0) break;
      const word = next[Math.floor(Math.random() * next.length)];
      if (word === ".") break;
      result.push(word);
      key = result[result.length - 2] + " " + result[result.length - 1];
    }
    const sentence = capitalize(result.join(" "));
    if (sentence.split(" ").length >= 4) return sentence;
  }
  return null;
}

function loadLearned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { good: [], bad: [] };
  } catch {
    return { good: [], bad: [] };
  }
}

function saveLearned(learned) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(learned));
  } catch {}
}

class MarkovEngine {
  constructor() {
    this.learned = loadLearned();
  }

  thumbsUp(sentence) {
    const clean = sentence.replace(/✨$/, "").trim();
    if (!this.learned.good.includes(clean)) {
      this.learned.good.push(clean);
      this.learned.bad = this.learned.bad.filter(s => s !== clean);
      saveLearned(this.learned);
    }
  }

  thumbsDown(sentence) {
    const clean = sentence.replace(/✨$/, "").trim();
    if (!this.learned.bad.includes(clean)) {
      this.learned.bad.push(clean);
      this.learned.good = this.learned.good.filter(s => s !== clean);
      saveLearned(this.learned);
    }
  }

  generate(input, trainedData) {
    const allData = [...trainedData];
    if (this.learned.good.length > 0) {
      allData.push({ triggers: [], responses: this.learned.good });
    }
    const pool = narrowPool(input, allData);
    const filtered = pool.filter(r => !this.learned.bad.includes(r.replace(/✨$/, "").trim()));
    const corpus = filtered.length >= 3 ? filtered : pool;
    const idf = buildIDF(corpus);
    const chain = buildChain(corpus);
    const candidates = [];
    for (let i = 0; i < 6; i++) {
      const sentence = generateFromChain(chain);
      if (sentence) candidates.push(sentence);
    }
    if (candidates.length === 0) return null;
    const best = candidates.reduce((top, s) =>
      scoreSentence(s, idf) > scoreSentence(top, idf) ? s : top
    );
    return best + " ✨";
  }

  learnedCount() {
    return this.learned.good.length;
  }

  reset() {
    this.learned = { good: [], bad: [] };
    saveLearned(this.learned);
  }
}

export default MarkovEngine;
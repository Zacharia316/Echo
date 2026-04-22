// ─────────────────────────────────────────────────────────────
//  MarkovEngine.js — LUMINAR Inc
//  Upgraded Markov Engine for Echo
//  Features: Trigram, TF-IDF, Pool Narrowing, Feedback Learning,
//            Weighted Responses, Decay, Stop Words, BoW Scoring,
//            Keyword Seeding, Self-Learning from Liked Responses
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "echo_learned";
const WEIGHTS_KEY = "echo_weights";
const SELF_LEARN_KEY = "echo_self_learned";

const STOP_WORDS = new Set([
  "the","is","it","in","a","an","and","or","but","of","to","for",
  "on","at","by","with","this","that","was","are","be","as","so",
  "do","did","has","have","had","not","no","my","me","you","we",
  "he","she","they","i","im","its","can","will","would","could",
  "should","just","like","get","got","go","up","out","if","then",
  "than","from","about","what","how","when","where","who","which"
]);

// ─── UTILS ────────────────────────────────────────────────────

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function tokenizeAll(text) {
  return text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── TF-IDF ───────────────────────────────────────────────────

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

// ─── BAG OF WORDS SCORING ─────────────────────────────────────

function bowScore(input, response) {
  const inputWords = new Set(tokenize(input));
  const respWords = tokenize(response);
  if (respWords.length === 0) return 0;
  const matches = respWords.filter(w => inputWords.has(w)).length;
  return matches / respWords.length;
}

// ─── POOL NARROWING ───────────────────────────────────────────

function narrowPool(input, allData) {
  const inputWords = new Set(tokenize(input));
  const scored = [];

  for (const entry of allData) {
    let triggerScore = 0;
    for (const trigger of entry.triggers) {
      const triggerWords = tokenize(trigger);
      if (triggerWords.length === 0) continue;
      const matches = triggerWords.filter(w => inputWords.has(w)).length;
      const score = matches / triggerWords.length;
      if (score > triggerScore) triggerScore = score;
    }
    if (triggerScore > 0) {
      for (const resp of entry.responses) {
        const combined = triggerScore + bowScore(input, resp) * 0.5;
        scored.push({ text: resp, score: combined });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const pool = scored.slice(0, 30).map(s => s.text);
if (pool.length < 5) {
    return allData.flatMap(e => e.responses);
  }
  return pool;
}

// ─── TRIGRAM CHAIN ────────────────────────────────────────────

function buildChain(responses) {
  const chain = {};
  const text = responses.join(" . ");
  const words = tokenizeAll(text);

  for (let i = 0; i < words.length - 3; i++) {
    const key = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    if (!chain[key]) chain[key] = [];
    chain[key].push(words[i + 3]);
  }

  // Fallback bigram for coverage
  for (let i = 0; i < words.length - 2; i++) {
    const key = `__bi__ ${words[i]} ${words[i + 1]}`;
    if (!chain[key]) chain[key] = [];
    chain[key].push(words[i + 2]);
  }

  return chain;
}

// ─── KEYWORD SEEDING ──────────────────────────────────────────

function findSeedKey(input, chain) {
  const keywords = tokenize(input);
  const keys = Object.keys(chain);

  for (const keyword of keywords) {
    const matches = keys.filter(k => !k.startsWith("__bi__") && k.includes(keyword));
    if (matches.length > 0) {
      return matches[Math.floor(Math.random() * matches.length)];
    }
  }

  for (const keyword of keywords) {
    const matches = keys.filter(k => k.startsWith("__bi__") && k.includes(keyword));
    if (matches.length > 0) {
      return matches[Math.floor(Math.random() * matches.length)];
    }
  }

  const trigramKeys = keys.filter(k => !k.startsWith("__bi__"));
  if (trigramKeys.length > 0) {
    return trigramKeys[Math.floor(Math.random() * trigramKeys.length)];
  }

  return keys[Math.floor(Math.random() * keys.length)];
}

// ─── GENERATION ───────────────────────────────────────────────

function generateFromChain(chain, input, maxWords = 22) {
  const keys = Object.keys(chain);
  if (keys.length < 3) return null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const seedKey = findSeedKey(input, chain);
    const isBigram = seedKey.startsWith("__bi__");
    const seedWords = isBigram
      ? seedKey.replace("__bi__ ", "").split(" ")
      : seedKey.split(" ");

    const result = [...seedWords];
    let key = seedKey;

    for (let i = 0; i < maxWords; i++) {
      const next = chain[key];
      if (!next || next.length === 0) break;
      const word = next[Math.floor(Math.random() * next.length)];
      if (word === ".") break;
      result.push(word);

      const triKey = `${result[result.length - 3]} ${result[result.length - 2]} ${result[result.length - 1]}`;
      const biKey = `__bi__ ${result[result.length - 2]} ${result[result.length - 1]}`;
      key = chain[triKey] ? triKey : biKey;
    }

    const sentence = capitalize(result.join(" "));
    if (sentence.split(" ").length >= 4) return sentence;
  }

  return null;
}

// ─── STORAGE ──────────────────────────────────────────────────

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

function loadWeights() {
  try {
    const raw = localStorage.getItem(WEIGHTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveWeights(weights) {
  try {
    localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weights));
  } catch {}
}

function loadSelfLearned() {
  try {
    const raw = localStorage.getItem(SELF_LEARN_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSelfLearned(data) {
  try {
    localStorage.setItem(SELF_LEARN_KEY, JSON.stringify(data));
  } catch {}
}

// ─── DECAY ────────────────────────────────────────────────────

function applyDecay(weights, usedResponse) {
  const updated = { ...weights };
  if (updated[usedResponse] === undefined) updated[usedResponse] = 1.0;
  updated[usedResponse] = Math.max(0.1, updated[usedResponse] - 0.1);
  for (const key of Object.keys(updated)) {
    if (key !== usedResponse) {
      updated[key] = Math.min(2.0, (updated[key] || 1.0) + 0.02);
    }
  }
  return updated;
}

// ─── WEIGHTED PICK ────────────────────────────────────────────

function weightedPick(candidates, weights) {
  const weighted = candidates.map(s => ({
    text: s,
    weight: weights[s] !== undefined ? weights[s] : 1.0,
  }));
  const total = weighted.reduce((sum, c) => sum + c.weight, 0);
  let rand = Math.random() * total;
  for (const c of weighted) {
    rand -= c.weight;
    if (rand <= 0) return c.text;
  }
  return candidates[candidates.length - 1];
}

// ─── ENGINE CLASS ─────────────────────────────────────────────

class MarkovEngine {
  constructor() {
    this.learned = loadLearned();
    this.weights = loadWeights();
    this.selfLearned = loadSelfLearned();
  }

  thumbsUp(sentence) {
    const clean = sentence.replace(/✨$/, "").trim();

    if (!this.learned.good.includes(clean)) {
      this.learned.good.push(clean);
      this.learned.bad = this.learned.bad.filter(s => s !== clean);
      saveLearned(this.learned);
    }

    this.weights[clean] = Math.min(3.0, (this.weights[clean] || 1.0) + 0.5);
    saveWeights(this.weights);
this.selfLearned.push({
      triggers: [],
      responses: [clean],
      source: "self",
      timestamp: Date.now(),
    });
    saveSelfLearned(this.selfLearned);
  }

  thumbsDown(sentence) {
    const clean = sentence.replace(/✨$/, "").trim();
    if (!this.learned.bad.includes(clean)) {
      this.learned.bad.push(clean);
      this.learned.good = this.learned.good.filter(s => s !== clean);
      saveLearned(this.learned);
    }
    this.weights[clean] = 0;
    saveWeights(this.weights);
  }

  generate(input, trainedData) {
    const allData = [...trainedData];

    if (this.selfLearned.length > 0) {
      allData.push({ triggers: [], responses: this.selfLearned.map(e => e.responses[0]) });
    }
    if (this.learned.good.length > 0) {
      allData.push({ triggers: [], responses: this.learned.good });
    }

    const pool = narrowPool(input, allData);
    const filtered = pool.filter(r => !this.learned.bad.includes(r.replace(/✨$/, "").trim()));
    const corpus = filtered.length >= 3 ? filtered : pool;

    const idf = buildIDF(corpus);
    const chain = buildChain(corpus);

    const candidates = [];
    for (let i = 0; i < 10; i++) {
      const sentence = generateFromChain(chain, input);
      if (sentence) candidates.push(sentence);
    }

    if (candidates.length === 0) return null;

    const scored = candidates.map(s => ({
      text: s,
      score: scoreSentence(s, idf) + bowScore(input, s),
    }));
    scored.sort((a, b) => b.score - a.score);

    const top = scored.slice(0, 3).map(s => s.text);
    const best = weightedPick(top, this.weights);

    this.weights = applyDecay(this.weights, best);
    saveWeights(this.weights);

    return best + " ✨";
  }

  selfLearnedCount() {
    return this.selfLearned.length;
  }

  learnedCount() {
    return this.learned.good.length;
  }

  reset() {
    this.learned = { good: [], bad: [] };
    this.weights = {};
    this.selfLearned = [];
    saveLearned(this.learned);
    saveWeights(this.weights);
    saveSelfLearned(this.selfLearned);
  }
}

export default MarkovEngine;
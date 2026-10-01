// Lightweight NLP: tokenization, TF-IDF vectors, cosine similarity, sentence splitting.
// Kept dependency-free; the Vec interface makes it easy to swap in embeddings later.

export type Vec = Map<string, number>;

const STOP = new Set(
  ("a an the and or but if of to in on at by for with from as is are was were be been being this that these those it its " +
    "you your we our they their he she his her i me my us them will would can could should may might has have had do does did " +
    "not no so than then there here what which who whom when where why how all any each more most other some such only own same " +
    "too very just also into over after before about up down out off again further once new says said according today " +
    "per via get got one two three").split(/\s+/),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9€$₹%\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

export class TfIdf {
  private df = new Map<string, number>();
  private n = 0;

  constructor(docs: string[][]) {
    this.n = docs.length;
    for (const d of docs) for (const w of new Set(d)) this.df.set(w, (this.df.get(w) ?? 0) + 1);
  }

  vector(tokens: string[]): Vec {
    const tf = new Map<string, number>();
    for (const w of tokens) tf.set(w, (tf.get(w) ?? 0) + 1);
    const v: Vec = new Map();
    let norm = 0;
    for (const [w, c] of tf) {
      const idf = Math.log((1 + this.n) / (1 + (this.df.get(w) ?? 0))) + 1;
      const x = (1 + Math.log(c)) * idf;
      v.set(w, x);
      norm += x * x;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [w, x] of v) v.set(w, x / norm);
    return v;
  }
}

export function cosine(a: Vec, b: Vec): number {
  const [s, l] = a.size < b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [w, x] of s) {
    const y = l.get(w);
    if (y) dot += x * y;
  }
  return dot;
}

/** Mean of vectors, re-normalized. */
export function centroid(vs: Vec[]): Vec {
  const c: Vec = new Map();
  for (const v of vs) for (const [w, x] of v) c.set(w, (c.get(w) ?? 0) + x);
  let norm = 0;
  for (const x of c.values()) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  for (const [w, x] of c) c.set(w, x / norm);
  return c;
}

export function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z"'₹$€0-9])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
}

/** Case-insensitive whole-phrase match. */
export function hasPhrase(textLower: string, phrase: string): boolean {
  const p = phrase.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${p}([^a-z0-9]|$)`).test(textLower);
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

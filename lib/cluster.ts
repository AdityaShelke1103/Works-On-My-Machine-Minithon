// Deduplicate near-identical items, then group related items into stories.
import type { Information } from "./types";
import { TfIdf, cosine, centroid, tokenize, type Vec } from "./text";
import { ms } from "./time";

export const DUP_THRESHOLD = 0.88;
export const CLUSTER_THRESHOLD = 0.3;
export const GROUP_JOIN_THRESHOLD = 0.35; // chat messages need a stronger match to join a news story

export const CRED_RANK: Record<Information["credibility"], number> = {
  official: 4,
  high: 3,
  medium: 2,
  low: 1,
  unverified: 0,
};

export interface Canonical {
  item: Information;
  vec: Vec;
  duplicates: Information[];
}

export interface RawStory {
  id: string;
  kind: "story" | "personal" | "bucket";
  bucketLabel?: string;
  members: Canonical[];
  centroid: Vec;
}

function text(i: Information) {
  return `${i.title}. ${i.title}. ${i.content}`; // title counted twice: headlines carry the entities
}

export function clusterItems(items: Information[]): { stories: RawStory[]; tfidf: TfIdf; duplicatesMerged: number } {
  const sorted = [...items].sort((a, b) => ms(a.timestamp) - ms(b.timestamp));
  const toks = sorted.map((i) => tokenize(text(i)));
  const tfidf = new TfIdf(toks);
  const vecs = toks.map((t) => tfidf.vector(t));

  // 1) Near-duplicate collapse: syndicated copies become extra sources of the canonical item.
  const canon: Canonical[] = [];
  let duplicatesMerged = 0;
  sorted.forEach((item, idx) => {
    const v = vecs[idx];
    if (!item.metadata.isDirect) {
      const dup = canon.find((c) => !c.item.metadata.isDirect && cosine(c.vec, v) >= DUP_THRESHOLD);
      if (dup) {
        // keep the more credible one as the canonical copy
        if (CRED_RANK[item.credibility] > CRED_RANK[dup.item.credibility]) {
          dup.duplicates.push(dup.item);
          dup.item = item;
        } else dup.duplicates.push(item);
        duplicatesMerged++;
        return;
      }
    }
    canon.push({ item, vec: v, duplicates: [] });
  });

  // 2) Greedy centroid clustering in time order.
  const stories: RawStory[] = [];
  const buckets = new Map<string, RawStory>();
  const semantic: RawStory[] = [];
  const addToBucket = (key: string, label: string, c: Canonical) => {
    let b = buckets.get(key);
    if (!b) {
      b = { id: c.item.id, kind: "bucket", bucketLabel: label, members: [], centroid: c.vec };
      buckets.set(key, b);
      stories.push(b);
    }
    b.members.push(c);
  };

  for (const c of canon) {
    const m = c.item.metadata;
    // Direct personal messages always stand alone: they're addressed to *you*.
    if (m.isDirect) {
      stories.push({ id: c.item.id, kind: "personal", members: [c], centroid: c.vec });
      continue;
    }
    if (m.isPromo) {
      addToBucket(`bucket:${c.item.source}`, c.item.source, c);
      continue;
    }
    let best: RawStory | null = null;
    let bestSim = 0;
    for (const s of semantic) {
      const sim = cosine(s.centroid, c.vec);
      if (sim > bestSim) {
        bestSim = sim;
        best = s;
      }
    }
    if (best && bestSim >= (m.group ? GROUP_JOIN_THRESHOLD : CLUSTER_THRESHOLD)) {
      best.members.push(c);
      best.centroid = centroid(best.members.map((x) => x.vec));
      continue;
    }
    // Chat chatter and app notifications that don't belong to a story get batched per group/app.
    if (m.group) {
      addToBucket(`group:${m.group}`, m.group, c);
      continue;
    }
    if (c.item.sourceType === "notification") {
      addToBucket(`bucket:${c.item.source}`, c.item.source, c);
      continue;
    }
    const s: RawStory = { id: c.item.id, kind: "story", members: [c], centroid: c.vec };
    semantic.push(s);
    stories.push(s);
  }
  // 3) Merge pass: early items can seed a story before its vocabulary is established.
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let a = 0; a < semantic.length; a++)
      for (let b = a + 1; b < semantic.length; b++) {
        if (cosine(semantic[a].centroid, semantic[b].centroid) >= CLUSTER_THRESHOLD) {
          const [keep, drop] = [semantic[a], semantic[b]];
          keep.members.push(...drop.members);
          keep.members.sort((x, y) => ms(x.item.timestamp) - ms(y.item.timestamp));
          keep.centroid = centroid(keep.members.map((x) => x.vec));
          semantic.splice(b, 1);
          stories.splice(stories.indexOf(drop), 1);
          merged = true;
          break outer;
        }
      }
  }
  return { stories, tfidf, duplicatesMerged };
}

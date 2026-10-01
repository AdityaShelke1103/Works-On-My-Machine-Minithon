// Prints the briefing at a simulated time: `npm run check -- 14:30`
import { readFileSync } from "node:fs";
import { buildBriefing } from "../lib/pipeline";
import { DEFAULT_PREFERENCES } from "../lib/defaults";

const seed = JSON.parse(readFileSync("data/seed.json", "utf8"));
const hm = process.argv[2] ?? "08:30";
const verbose = process.argv.includes("-v");
const b = buildBriefing({
  items: seed.items, calendar: seed.calendar, prefs: DEFAULT_PREFERENCES,
  interactions: [], reading: [], now: `2026-10-01T${hm}:00+05:30`,
});
console.log(`@${hm} mode=${b.mode} quiet=${b.inQuietHours} next=${b.nextDigest}`, b.stats);
for (const s of b.stories) {
  console.log(
    `${s.tier.padEnd(6)} ${String(s.relevance).padStart(3)} u${String(s.urgency).padStart(3)} ${s.delivery.state.padEnd(9)} [${s.itemCount}] ${s.isEmerging ? "🔺" : ""}${s.conflict ? "⚠" : ""} ${s.headline.slice(0, 70)}`,
  );
  if (verbose) console.log("        ", s.reasons.map((r) => `${r.label} ${r.delta > 0 ? "+" : ""}${r.delta}`).join(" | "));
}

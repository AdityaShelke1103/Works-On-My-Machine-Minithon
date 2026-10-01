/**
 * Generates data/seed.json: a realistic, deterministic day of information overload
 * for a final-year CS student (demo persona). All outlets, companies and people are fictional.
 *
 * Contains: multi-source stories (with syndicated near-duplicates), conflicting-source stories,
 * urgent personal messages, VIP senders, a muted topic with viral engagement, promos that use
 * urgency words, chat noise, and an "emerging" event that spikes in the afternoon.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import type { Information, SourceType, Credibility, CalendarEvent } from "../lib/types";

const OUTLETS: Record<string, { domain: string; type: SourceType; cred: Credibility }> = {
  "Global Wire": { domain: "globalwire.example", type: "news", cred: "high" },
  "Metro Times": { domain: "metrotimes.example", type: "news", cred: "high" },
  "The Ledger": { domain: "theledger.example", type: "news", cred: "high" },
  "TechPulse": { domain: "techpulse.example", type: "article", cred: "medium" },
  "ByteDaily": { domain: "bytedaily.example", type: "article", cred: "medium" },
  "Pune Mirror Online": { domain: "punemirror.example", type: "news", cred: "medium" },
  "Sports Desk 24": { domain: "sportsdesk24.example", type: "news", cred: "medium" },
  "GoalLine": { domain: "goalline.example", type: "article", cred: "medium" },
  "ViralHub": { domain: "viralhub.example", type: "article", cred: "low" },
  "TrendTalk": { domain: "trendtalk.example", type: "article", cred: "low" },
  "Campus Courier": { domain: "courier.university.example", type: "news", cred: "official" },
  "Orion Labs Blog": { domain: "orionlabs.example", type: "article", cred: "official" },
  "Nimbus Labs Newsroom": { domain: "nimbuslabs.example", type: "article", cred: "official" },
  "CloudNest Status": { domain: "status.cloudnest.example", type: "article", cred: "official" },
  "District Collector Office": { domain: "pune.gov.example", type: "news", cred: "official" },
  "Weather Bureau": { domain: "weather.gov.example", type: "news", cred: "official" },
  "arXiv": { domain: "arxiv.example", type: "article", cred: "high" },
  "Reddit": { domain: "reddit.com", type: "reddit", cred: "unverified" },
  "X": { domain: "x.com", type: "social", cred: "unverified" },
  "Instagram": { domain: "instagram.com", type: "social", cred: "unverified" },
  "YouTube": { domain: "youtube.com", type: "youtube", cred: "unverified" },
  "Gmail": { domain: "mail.google.com", type: "email", cred: "high" },
  "WhatsApp": { domain: "whatsapp.com", type: "message", cred: "high" },
  "GitHub": { domain: "github.com", type: "notification", cred: "high" },
  "LinkedIn": { domain: "linkedin.com", type: "notification", cred: "medium" },
  "App": { domain: "device", type: "notification", cred: "medium" },
};

let seq = 0;
const items: Information[] = [];

/** "09-30 19:20" -> ISO in IST (+05:30), year 2026 */
function t(stamp: string): string {
  const [md, hm] = stamp.split(" ");
  return `2026-${md}T${hm}:00+05:30`;
}

function add(
  source: string,
  when: string,
  author: string,
  title: string,
  content: string,
  meta: Information["metadata"] = {},
  overrides: Partial<Pick<Information, "sourceType" | "credibility" | "source">> = {},
) {
  const o = OUTLETS[source] ?? { domain: "unknown.example", type: "news" as SourceType, cred: "unverified" as Credibility };
  seq++;
  const id = `i${String(seq).padStart(3, "0")}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
  items.push({
    id,
    sourceType: overrides.sourceType ?? o.type,
    source: overrides.source ?? source,
    sourceDomain: o.domain,
    credibility: overrides.credibility ?? o.cred,
    author,
    title,
    content,
    url: `https://${o.domain}/${slug}-${id}`,
    timestamp: t(when),
    metadata: meta,
  });
}

// ───────────────────────── STORY 1: Orion-4 model release (AI, 8 items, 1 syndicated dup) ─────────────────────────
add("Orion Labs Blog", "09-30 21:00", "Orion Labs", "Introducing Orion-4: our most capable reasoning model",
  "Today we are releasing Orion-4, a new AI model with major gains in reasoning, coding and multimodal understanding. Orion-4 scores 89% on the GradeBench reasoning benchmark, up from 71% for Orion-3. The model is available via API starting today, with a free tier for students and researchers. Orion-4 supports a 1 million token context window.");
add("Global Wire", "09-30 21:40", "Priya Nair", "Orion Labs launches Orion-4 AI model, claims big jump in reasoning",
  "Orion Labs on Wednesday launched Orion-4, an AI model the company says sharply improves reasoning and coding. The startup said Orion-4 scored 89% on the GradeBench benchmark. Analysts said the launch intensifies competition among large language model developers. A free tier will be offered to students.");
add("Metro Times", "09-30 22:15", "Global Wire", "Orion Labs launches Orion-4 AI model, claims big jump in reasoning",
  "Orion Labs on Wednesday launched Orion-4, an AI model the company says sharply improves reasoning and coding. The startup said Orion-4 scored 89% on the GradeBench benchmark. Analysts said the launch intensifies competition among large language model developers. A free tier will be offered to students.");
add("TechPulse", "09-30 23:05", "Kabir Sethi", "Hands-on with Orion-4: the reasoning model is fast, but not flawless",
  "We spent three hours testing Orion-4, the new AI model from Orion Labs. Coding answers were noticeably better than Orion-3 and the 1 million token context window handled our full codebase. It still hallucinated two citations. The free student tier makes Orion-4 an easy recommendation for developers.");
add("ByteDaily", "10-01 06:20", "Staff", "Orion-4 vs the rest: what the new AI model means for developers",
  "Orion Labs' Orion-4 model claims 89% on GradeBench reasoning. For developers the key changes are cheaper API pricing, a 1 million token context window and better tool use. Students get a free tier of the Orion-4 API.");
add("Reddit", "10-01 00:40", "u/gradient_descent_42", "[D] Orion-4 is out — first impressions from r/MachineLearning",
  "Orion-4 just dropped. Tried it on my ML assignment proofs and the reasoning is clearly better than Orion-3. GradeBench 89% seems legit from my tests. Anyone benchmarked the 1M context?", { likes: 2300, comments: 410 });
add("YouTube", "10-01 07:10", "AI Unboxed", "Orion-4 FULL REVIEW: Is this the best AI model yet?",
  "In this video we test Orion Labs' new Orion-4 AI model on coding, math and reasoning tasks and compare it with Orion-3. Free tier for students explained.", { views: 184000, likes: 9100 });
add("X", "09-30 21:12", "@orionlabs", "Orion-4 is live",
  "Orion-4 is live. Better reasoning, better coding, 1M context. Free for students. Try the Orion-4 API today.", { likes: 41000, shares: 8800 });

// ───────────────────────── STORY 2: AI Accountability Bill (policy, CONFLICT on fine %) ─────────────────────────
add("Global Wire", "09-30 18:30", "Ananya Rao", "Parliamentary panel approves draft AI Accountability Bill",
  "A parliamentary standing committee approved the draft AI Accountability Bill, which would require companies deploying high-risk AI systems to register them and publish risk assessments. Under the committee draft, violations carry fines of up to 2% of annual turnover. The AI Accountability Bill now goes to Parliament in the winter session.");
add("The Ledger", "09-30 19:45", "Vikram Joshi", "AI Accountability Bill: what companies must do under the new AI regulation",
  "The draft AI Accountability Bill approved by a parliamentary panel creates registration rules for high-risk AI systems. Companies face fines of up to 2% of annual turnover. Startups under a revenue threshold would be exempt from the AI regulation for two years.");
add("TrendTalk", "10-01 07:30", "Staff", "SHOCKING: AI Accountability Bill will fine companies 10% of revenue",
  "The new AI Accountability Bill approved by the parliamentary panel will fine companies up to 10% of revenue and could ban AI chatbots entirely, sources claim. The AI regulation for high-risk AI systems is the strictest in the world.", { likes: 15000, shares: 6100 });
add("TechPulse", "10-01 08:05", "Meera Iyer", "AI Accountability Bill explained for developers and students",
  "What does the AI Accountability Bill mean for developers? The AI regulation focuses on high-risk AI systems such as hiring, lending and healthcare. Fines are capped at 2% of annual turnover according to the committee draft. Student and research projects are not covered.");
add("X", "10-01 08:20", "@policywatch_in", "AI Bill thread",
  "Thread on the AI Accountability Bill: registration for high-risk AI systems, 2% turnover fines, startup exemption for two years. Not a chatbot ban despite viral claims.", { likes: 1200, shares: 300 });

// ───────────────────────── STORY 3: Arsenal transfer (football, CONFLICT on fee) ─────────────────────────
add("Sports Desk 24", "09-30 20:10", "Rahul Menon", "Arsenal agree deal to sign striker Lucas Moreau",
  "Arsenal have agreed a deal to sign French striker Lucas Moreau from Lyon for a fee of €80m. Moreau, 23, scored 27 goals last season. The Arsenal transfer is expected to be completed after a medical this week.");
add("GoalLine", "09-30 21:30", "Tom Fields", "Lucas Moreau to Arsenal: fee, contract and how he fits",
  "Lucas Moreau will join Arsenal for €65m plus add-ons, with a five-year contract. The striker gives Arsenal a focal point up front. Lyon accepted the Arsenal offer on Wednesday evening.");
add("Global Wire", "10-01 06:45", "Sports Staff", "Arsenal sign Lucas Moreau from Lyon",
  "Arsenal have completed the signing of striker Lucas Moreau from Lyon. The club did not disclose the fee; reports range from €65m to €80m. Moreau signed a five-year contract with Arsenal.");
add("X", "09-30 19:55", "@TransferGuru", "HERE WE GO",
  "HERE WE GO! Lucas Moreau to Arsenal, €80m, medical booked. Arsenal transfer done deal.", { likes: 88000, shares: 21000 });
add("Reddit", "09-30 22:30", "u/gooner_since_04", "Lucas Moreau signs for Arsenal — discussion thread",
  "Moreau to Arsenal is official-ish. 27 goals last season for Lyon. Fee reports are all over the place, €65m or €80m?", { likes: 5400, comments: 1900 });
add("YouTube", "10-01 07:40", "GoalLine TV", "Why Lucas Moreau is PERFECT for Arsenal",
  "Tactical breakdown of Arsenal's new striker Lucas Moreau and how he fits Arsenal's system.", { views: 92000 });

// ───────────────────────── STORY 4: Arsenal vs Inter match (football) ─────────────────────────
add("Sports Desk 24", "09-30 23:55", "Rahul Menon", "Arsenal beat Inter 3-1 in Champions League",
  "Arsenal beat Inter 3-1 at the Emirates in the Champions League group stage. Saka scored twice and Arsenal top the group with six points.");
add("GoalLine", "10-01 00:20", "Tom Fields", "Arsenal 3-1 Inter: player ratings and talking points",
  "Bukayo Saka starred with two goals as Arsenal beat Inter 3-1 in the Champions League. Arsenal are top of the group after two games.");
add("Global Wire", "10-01 00:05", "Sports Staff", "Saka double sends Arsenal top of Champions League group",
  "Bukayo Saka scored twice as Arsenal beat Inter 3-1 in the Champions League on Wednesday night.");

// ───────────────────────── STORY 5: Kitebird funding (startups) ─────────────────────────
add("The Ledger", "09-30 17:30", "Neha Kulkarni", "Pune startup Kitebird raises $40 million Series B",
  "Kitebird, a Pune-based logistics AI startup, raised $40 million in a Series B round led by Horizon Ventures. Kitebird will use the funding to hire 200 engineers and expand to Southeast Asia.");
add("ByteDaily", "09-30 18:40", "Staff", "Kitebird bags $40M to scale AI-powered logistics",
  "Kitebird has raised $40 million in Series B funding. The Pune startup plans to hire 200 engineers, including fresh graduates, over the next year.");
add("LinkedIn", "10-01 08:10", "Kitebird", "We're hiring! 200 engineering roles",
  "Kitebird is hiring 200 engineers after our $40M Series B. Graduate and internship roles open in Pune.", { likes: 3200 }, { source: "LinkedIn" });
add("Pune Mirror Online", "10-01 09:30", "City Desk", "Kitebird funding a boost for Pune's startup scene",
  "Kitebird's $40 million Series B is the largest Pune startup funding round this quarter. Kitebird plans to hire 200 engineers in the city.");

// ───────────────────────── STORY 6: Rain alert (CONFLICT: closure rumour vs official denial) ─────────────────────────
add("Weather Bureau", "10-01 05:30", "Weather Bureau", "Orange alert for heavy rain in Pune on October 2",
  "The Weather Bureau has issued an orange alert for heavy rain in Pune district on October 2. Rainfall of 70 to 110 mm is expected. Citizens are advised to avoid low-lying areas.");
add("ViralHub", "10-01 07:50", "Staff", "Pune colleges CLOSED tomorrow due to heavy rain alert",
  "All Pune colleges and schools will remain closed tomorrow due to the heavy rain alert, according to a message circulating on WhatsApp. Exams are postponed.", { likes: 22000, shares: 14000 });
add("District Collector Office", "10-01 09:10", "Collector, Pune", "No closure of colleges announced for October 2 — Collector",
  "The District Collector clarified that no closure of colleges or schools has been announced for October 2 despite the heavy rain alert. Messages claiming colleges are closed are false. Exams will proceed as scheduled unless institutions announce otherwise.");
add("Metro Times", "10-01 09:40", "City Desk", "Pune rain alert: Collector denies viral college closure message",
  "Pune's District Collector denied a viral message claiming colleges are closed on October 2. The Weather Bureau's orange alert for heavy rain remains in force, with up to 110 mm expected.");
add("WhatsApp", "10-01 08:05", "Class of 2027 (group)", "Forwarded: colleges closed tomorrow??",
  "Forwarded many times: All Pune colleges closed tomorrow due to rain, exams postponed. Is this true?? Anyone confirm", { group: "Class of 2027" });

// ───────────────────────── STORY 7: Nimbus Labs hiring (CONFLICT: freeze rumour vs official) ─────────────────────────
add("Reddit", "09-30 23:15", "u/throwaway_swe_in", "Nimbus Labs hiring freeze? Heard internships are cancelled",
  "A friend at Nimbus Labs says there's a hiring freeze and internship offers are being cancelled. Anyone with a Nimbus Labs interview this week heard anything?", { likes: 860, comments: 240 });
add("TrendTalk", "10-01 07:15", "Staff", "Nimbus Labs freezes hiring, cancels internships: report",
  "Nimbus Labs has frozen all hiring and cancelled internship programs, according to posts on Reddit.", { likes: 4100 });
add("Nimbus Labs Newsroom", "10-01 09:05", "Nimbus Labs", "Update on Nimbus Labs campus hiring and internships",
  "Nimbus Labs is not freezing hiring. Our 2027 internship program and all scheduled campus interviews continue as planned. We have paused only senior hiring in one business unit.");
add("Global Wire", "10-01 09:50", "Tech Desk", "Nimbus Labs denies internship cancellation rumours",
  "Nimbus Labs denied reports of a hiring freeze, saying campus internship interviews will continue as planned. The company paused senior hiring in one unit.");

// ───────────────────────── STORY 8: Small models paper (ML research) ─────────────────────────
add("arXiv", "09-30 20:00", "Lee, Okafor, Banerjee", "Distilled reasoning: small language models match large models on GradeBench",
  "We show that a 3B parameter model distilled with chain-of-thought supervision matches 70B models on GradeBench reasoning. Distillation with gradient matching closes most of the reasoning gap. Code and weights are released.");
add("Reddit", "10-01 01:10", "u/ml_phd_life", "[R] Distilled 3B model matches 70B on GradeBench reasoning",
  "New paper: distilled 3B small language model matches 70B on GradeBench reasoning using gradient matching distillation. Weights released. Huge for students with one GPU.", { likes: 1800, comments: 220 });
add("YouTube", "10-01 08:30", "Paper Explained", "Small models beat big ones? Distilled reasoning paper explained",
  "We explain the distilled reasoning paper showing a 3B small language model matching 70B models on GradeBench using gradient matching.", { views: 31000 });

// ───────────────────────── STORY 9: Crypto record (MUTED topic, viral) ─────────────────────────
add("The Ledger", "10-01 06:00", "Markets Desk", "Bitcoin hits record high above $150,000",
  "Bitcoin crossed $150,000 for the first time, extending a crypto rally driven by ETF inflows. Other crypto tokens also rose.");
add("X", "10-01 06:30", "@cryptomoonboy", "BTC 150K!!!",
  "BITCOIN 150K!!! Crypto to the moon. If you're not in crypto now you'll regret it forever.", { likes: 120000, shares: 45000 });
add("YouTube", "10-01 07:00", "Crypto Daily", "Bitcoin $150K — what's NEXT for crypto?",
  "Bitcoin just hit a record $150,000. Here's my crypto price prediction for the rest of the year.", { views: 640000, likes: 31000 });
add("ViralHub", "10-01 07:20", "Staff", "Students are getting rich from crypto — here's how",
  "With Bitcoin at $150,000, students are turning to crypto trading apps. Here's how to start with crypto.", { likes: 9000 });

// ───────────────────────── STORY 10: Celebrity wedding (noise, very viral) ─────────────────────────
add("Instagram", "10-01 07:05", "@bollywoodbuzz", "Inside Kiara & Arman's wedding",
  "First pictures from Kiara and Arman's dreamy wedding in Udaipur! Celebrity wedding of the year.", { likes: 2400000, shares: 310000 });
add("ViralHub", "10-01 07:45", "Entertainment", "Kiara and Arman wedding: every celebrity guest",
  "Every celebrity at Kiara and Arman's Udaipur wedding, from the sangeet to the reception.", { likes: 65000 });
add("TrendTalk", "10-01 08:15", "Entertainment", "Kiara–Arman wedding outfits break the internet",
  "Kiara's wedding lehenga and Arman's sherwani are trending. Celebrity wedding fashion breakdown.", { likes: 40000 });

// ───────────────────────── STORY 11: Phone launch (general tech) ─────────────────────────
add("TechPulse", "09-30 19:00", "Kabir Sethi", "Pixelon 9 launched with satellite messaging",
  "Pixelon launched the Pixelon 9 smartphone with satellite messaging, a 6,000 mAh battery and a new camera. The Pixelon 9 starts at ₹54,999.");
add("ByteDaily", "09-30 19:40", "Staff", "Pixelon 9 price, specs and availability",
  "The Pixelon 9 smartphone costs ₹54,999 and goes on sale October 5. Pixelon 9 has satellite messaging and a 6,000 mAh battery.");
add("YouTube", "10-01 06:50", "Tech Tushar", "Pixelon 9 Unboxing & First Look",
  "Unboxing the Pixelon 9 smartphone with satellite messaging. Camera samples and battery test.", { views: 410000 });

// ───────────────────────── STORY 12: Cricket (not a user topic) ─────────────────────────
add("Sports Desk 24", "09-30 22:40", "Cricket Desk", "India beat Australia by 6 wickets in second ODI",
  "India beat Australia by six wickets in the second ODI to level the series 1-1. Shubman Gill scored a century.");
add("Global Wire", "09-30 23:00", "Sports Staff", "Gill century powers India past Australia in ODI",
  "Shubman Gill's century helped India beat Australia by six wickets to level the ODI series.");
add("X", "09-30 23:10", "@cricketfan99", "GILL 💯",
  "What a knock by Gill! India level the ODI series against Australia. 💯🔥", { likes: 54000 });

// ───────────────────────── STORY 13: Markets (not a user topic) ─────────────────────────
add("The Ledger", "10-01 09:20", "Markets Desk", "Sensex rises 400 points on IT stocks",
  "The Sensex rose 400 points in early trade led by IT stocks. The Nifty also gained 0.6%.");
add("Metro Times", "10-01 09:45", "Business Desk", "Markets open higher as IT stocks rally",
  "Indian stock markets opened higher with the Sensex up 400 points as IT stocks rallied.");

// ───────────────────────── STORY 14: Campus Wi-Fi upgrade ─────────────────────────
add("Campus Courier", "09-30 18:00", "Campus Courier", "Hostel Wi-Fi upgrade to finish by October 10",
  "The university's IT office says the hostel Wi-Fi upgrade will be completed by October 10. Speeds will increase to 1 Gbps per block. Brief outages are expected in Hostel B this week.");
add("Gmail", "10-01 07:00", "IT Services <it@university.example>", "Hostel B Wi-Fi maintenance today 2–4 PM",
  "Dear students, Wi-Fi in Hostel B will be unavailable today from 2 PM to 4 PM for the hostel Wi-Fi upgrade. Regards, IT Services.", { isDirect: true });

// ───────────────────────── STORY 15: EMERGING — CloudNest outage (afternoon spike) ─────────────────────────
add("CloudNest Status", "10-01 13:42", "CloudNest", "Investigating: elevated errors in ap-south region",
  "We are investigating elevated error rates affecting CloudNest services in the ap-south region. Websites and apps hosted on CloudNest may be unavailable. Next update in 30 minutes.");
add("X", "10-01 13:50", "@downwatch", "CloudNest outage",
  "Massive CloudNest outage right now — payment apps, food delivery and university portals down across India. #CloudNestDown", { likes: 31000, shares: 12000 });
add("Global Wire", "10-01 14:05", "Tech Desk", "CloudNest outage knocks apps offline across India",
  "A major CloudNest outage in the ap-south region knocked payment apps, delivery services and several university portals offline on Thursday afternoon. CloudNest said it was investigating elevated errors.");
add("Reddit", "10-01 14:10", "u/sysadmin_pune", "CloudNest ap-south is down — our university exam portal too",
  "CloudNest ap-south outage has taken down our university's exam portal and hall-ticket downloads. Anyone have an ETA from CloudNest?", { likes: 2100, comments: 600 });
add("Campus Courier", "10-01 14:20", "Exam Cell", "Exam portal unavailable due to CloudNest outage — hall tickets deadline extended",
  "The university exam portal is down due to the CloudNest outage. The deadline to download ML End-Sem hall tickets has been extended to 10 PM tonight. Students do not need to contact the exam cell.");
add("Metro Times", "10-01 14:35", "Tech Desk", "CloudNest outage: banks, campuses hit as engineers race to fix",
  "Engineers at CloudNest are working to restore services after an outage in the ap-south region hit banks, campuses and apps. CloudNest says partial recovery is underway.");
add("CloudNest Status", "10-01 15:30", "CloudNest", "Resolved: ap-south services recovered",
  "Services in the ap-south region have recovered. The CloudNest outage was caused by a faulty network configuration change.");

// ───────────────────────── STORY 16: Evening — Arsenal vs Chelsea preview ─────────────────────────
add("Sports Desk 24", "10-01 18:30", "Rahul Menon", "Arsenal vs Chelsea preview: Moreau set for debut",
  "Lucas Moreau is set to make his Arsenal debut against Chelsea on Sunday. Arsenal coach confirmed Moreau trained fully.");
add("GoalLine", "10-01 19:10", "Tom Fields", "Moreau debut? Arsenal vs Chelsea team news",
  "Arsenal's new striker Lucas Moreau could debut against Chelsea. Arsenal vs Chelsea kicks off Sunday 10 PM IST.");

// ───────────────────────── PERSONAL: emails, messages, notifications ─────────────────────────
add("Gmail", "10-01 06:40", "Prof. Anjali Mehta <a.mehta@university.example>", "ML End-Sem: syllabus clarification and what to bring",
  "Dear students, for tomorrow's Machine Learning End-Sem exam, only Units 1 to 4 are included (regression, gradient descent, SVMs, neural networks). Bring a scientific calculator. Exam starts at 10:00 AM in Hall A. — Prof. Mehta", { isDirect: true });
add("Gmail", "10-01 08:15", "Training & Placement Cell <tnp@university.example>", "Action required: confirm Nimbus Labs interview slot by 6 PM today",
  "Your Nimbus Labs internship interview is scheduled for Saturday 3:00 PM. Please confirm your slot by 6 PM today, otherwise it will be released. Deadline today. — T&P Cell", { isDirect: true });
add("WhatsApp", "10-01 08:50", "Riya Sharma", "Riya: push the API code before 10?",
  "Hey! Can you push the API code before 10? Judges start the demo round at 11 for the TechNext Minithon. Urgent, I need to integrate the frontend.", { isDirect: true });
add("WhatsApp", "10-01 07:30", "Mom", "Mom: call when free",
  "Call me when you're free beta. Nothing urgent. Did you eat breakfast?", { isDirect: true });
add("WhatsApp", "10-01 09:15", "Arjun", "Arjun: Moreau to Arsenal 😂",
  "bro did you see Arsenal signed Moreau 😂 we're winning the league", { isDirect: true });
add("GitHub", "10-01 09:05", "riya-sharma", "Review requested: feat(api): add briefing endpoint #42",
  "riya-sharma requested your review on pull request #42 in technext-minithon/guardian: feat(api): add briefing endpoint.", { isDirect: true });
add("Gmail", "10-01 12:30", "Prof. Anjali Mehta <a.mehta@university.example>", "Extra doubt-clearing session for ML exam at 5 PM",
  "I will hold an optional doubt-clearing session for the Machine Learning exam at 5 PM today in Room 204. Bring questions on gradient descent and SVMs. — Prof. Mehta", { isDirect: true });
add("WhatsApp", "10-01 12:50", "Riya Sharma", "Riya: we're in the top 10!!",
  "We made it to the top 10 of the TechNext Minithon! Final demo at 4 PM, can you prepare the demo script?", { isDirect: true });
add("Gmail", "10-01 16:10", "Training & Placement Cell <tnp@university.example>", "Kitebird pre-placement talk on Monday",
  "Kitebird will hold a pre-placement talk on Monday at 11 AM for 2027 graduates. Registration optional.", { isDirect: true });
add("WhatsApp", "10-01 20:30", "Mom", "Mom: all the best for exam tomorrow",
  "All the best for your exam tomorrow! Sleep early. ❤️", { isDirect: true });
add("Gmail", "10-01 21:10", "Library <library@university.example>", "Reminder: 'Pattern Recognition' due tomorrow",
  "The book 'Pattern Recognition and Machine Learning' is due tomorrow. Renew online to avoid a fine.", { isDirect: true });
add("Gmail", "09-30 23:40", "Riya Sharma <riya@university.example>", "Minithon slides draft",
  "Sharing the draft slides for tomorrow's TechNext Minithon. Have a look when you can, no rush.", { isDirect: true });

// ───────────────────────── Promos that SHOUT urgency (should NOT break through) ─────────────────────────
const promos: [string, string, string, string][] = [
  ["10-01 00:30", "FoodDash", "⏰ LAST CHANCE: 60% off tonight only!", "Hurry! 60% off on all orders tonight only. Offer ends at midnight. Order now!"],
  ["10-01 08:00", "FoodDash", "Breakfast deal ends in 1 hour!", "Urgent: your breakfast deal expires in 1 hour. Order now and save ₹120."],
  ["10-01 12:00", "FoodDash", "Lunch rush: free delivery for 30 minutes!", "Free delivery for the next 30 minutes only. Don't miss out!"],
  ["10-01 19:30", "FoodDash", "Dinner flash sale: 50% off right now", "Flash sale! 50% off dinner right now. Limited time only."],
  ["10-01 07:20", "ShopKart", "Big Billion Sale starts NOW — act fast!", "The Big Billion Sale is live. Act fast, deals end soon! Up to 80% off electronics."],
  ["10-01 11:00", "ShopKart", "Price drop alert on items in your cart", "Prices dropped on 3 items in your cart. Hurry, limited stock!"],
  ["10-01 15:00", "ShopKart", "Final hours: Big Billion Sale", "Final hours of the Big Billion Sale. Buy now before it's too late!"],
  ["10-01 10:30", "StreamFlix", "New episode now streaming", "The new episode of 'City of Shadows' is now streaming. Watch now!"],
  ["10-01 06:00", "FitStreak", "Don't break your 40-day streak!", "Urgent! You're about to lose your 40-day workout streak. Open the app now."],
  ["10-01 21:00", "FitStreak", "Your streak ends in 3 hours", "Your workout streak ends in 3 hours. Don't lose it!"],
];
for (const [w, app, title, body] of promos) add("App", w, app, title, body, { isPromo: true }, { source: app });

// ───────────────────────── Low-value notifications ─────────────────────────
const notifs: [string, string, string, string, string][] = [
  ["LinkedIn", "10-01 07:10", "LinkedIn", "5 people viewed your profile", "See who viewed your profile this week."],
  ["LinkedIn", "10-01 11:30", "LinkedIn", "Congratulate Rohan on his work anniversary", "Rohan Gupta is celebrating 1 year at Infotech."],
  ["LinkedIn", "10-01 17:00", "LinkedIn", "Jobs you may be interested in", "12 new jobs matching 'software engineer intern' near Pune."],
  ["App", "10-01 08:40", "UPI Pay", "You received ₹250 cashback", "Cashback of ₹250 credited to your wallet."],
  ["App", "10-01 09:00", "Weather", "Light rain expected this evening", "Light rain expected after 6 PM in Pune."],
  ["App", "10-01 10:00", "Calendar", "TechNext Minithon starts now", "Event reminder: TechNext Minithon, 10:00 AM – 2:00 PM."],
  ["GitHub", "10-01 10:20", "GitHub", "dependabot opened 3 pull requests", "dependabot bumped next, react and typescript in your-portfolio."],
  ["GitHub", "10-01 11:45", "GitHub", "Your workflow run failed: deploy-portfolio", "The workflow deploy-portfolio failed on main in your-portfolio."],
  ["App", "10-01 13:00", "Phone", "Storage almost full", "You have used 92% of your phone storage."],
  ["App", "10-01 16:30", "Cab Go", "Rate your last ride", "How was your ride with Suresh? Rate now."],
];
for (const [src, w, author, title, body] of notifs) add(src, w, author, title, body, {}, { source: author === "LinkedIn" ? "LinkedIn" : author });

// ───────────────────────── Class group chat noise ─────────────────────────
const chat: [string, string, string][] = [
  ["09-30 22:05", "Sahil", "anyone has unit 3 notes?"],
  ["09-30 22:07", "Pooja", "check drive folder, unit 3 notes uploaded"],
  ["09-30 23:30", "Aman", "who is awake lol"],
  ["10-01 00:15", "Sahil", "is SVM in syllabus for ml exam??"],
  ["10-01 07:55", "Neha", "good morning everyone ☀️"],
  ["10-01 08:30", "Aman", "canteen open today?"],
  ["10-01 11:10", "Pooja", "someone share last year's ML paper pls"],
  ["10-01 13:20", "Sahil", "meme: me before the exam vs after the exam 💀"],
  ["10-01 15:45", "Neha", "library closing at 8 today"],
  ["10-01 18:00", "Aman", "anyone up for football tonight?"],
  ["10-01 22:30", "Pooja", "all the best guys for tomorrow 🙏"],
  ["10-01 23:15", "Sahil", "can't sleep, revising gradient descent"],
];
for (const [w, who, msg] of chat) add("WhatsApp", w, `${who} (Class of 2027)`, `Class of 2027: ${msg.slice(0, 40)}`, msg, { group: "Class of 2027" });

// ───────────────────────── Social / Reddit / YouTube noise ─────────────────────────
const social: [string, string, string, string, string, Information["metadata"]][] = [
  ["X", "10-01 06:10", "@devhumor", "Code meme", "When the code works on the first try and you don't know why 😂", { likes: 54000 }],
  ["X", "10-01 07:35", "@productivityguru", "10 morning habits", "10 morning habits of highly successful people. Thread 🧵", { likes: 23000 }],
  ["X", "10-01 09:25", "@startupgyaan", "Startup advice", "Your startup doesn't need funding. It needs customers. Change my mind.", { likes: 8700 }],
  ["X", "10-01 11:20", "@foodie_pune", "Best misal in Pune", "Ranking the best misal pav spots in Pune. Number 1 will surprise you.", { likes: 4100 }],
  ["X", "10-01 12:40", "@aiethicsnow", "AI ethics", "Every AI lab says safety first. Few publish their evaluations. We need transparency.", { likes: 3900 }],
  ["X", "10-01 16:00", "@memesdaily", "Monday meme", "Me pretending to work while my code compiles", { likes: 120000 }],
  ["X", "10-01 19:45", "@travelbug", "Goa trip", "Goa in monsoon hits different 🌧️🌴", { likes: 15000 }],
  ["Instagram", "10-01 08:45", "@gymlife", "Leg day", "Never skip leg day 💪", { likes: 33000 }],
  ["Instagram", "10-01 14:50", "@foodporn", "Biryani", "This biryani is unreal 🤤", { likes: 51000 }],
  ["Instagram", "10-01 20:15", "@sunsetchaser", "Sunset", "Pune sunset after the rain", { likes: 12000 }],
  ["Reddit", "10-01 05:45", "u/pune_local", "Traffic on FC Road is insane today", "Why is FC Road jammed at 6 AM?", { likes: 300 }],
  ["Reddit", "10-01 10:40", "u/cs_student_22", "How do you guys stay focused while studying?", "I keep getting distracted by my phone. Tips?", { likes: 1500 }],
  ["Reddit", "10-01 12:15", "u/gamer_boi", "New open world game is 120GB", "Is 120GB for a game reasonable anymore?", { likes: 4200 }],
  ["Reddit", "10-01 17:20", "u/indianinvestor", "Should I invest in mutual funds as a student?", "I have ₹5,000 a month. Where should I invest?", { likes: 900 }],
  ["Reddit", "10-01 21:40", "u/nightowl", "Rate my setup", "Finally finished my desk setup, rate it.", { likes: 6700 }],
  ["YouTube", "10-01 06:35", "Lofi Beats", "lofi hip hop radio – beats to study to", "24/7 lofi beats to study and relax to.", { views: 3200000 }],
  ["YouTube", "10-01 09:50", "Funny Fails", "TRY NOT TO LAUGH challenge #47", "The funniest fails of the week.", { views: 2100000 }],
  ["YouTube", "10-01 13:10", "Travel Vlogs", "I spent 24 hours in Tokyo", "A full day in Tokyo on a budget.", { views: 870000 }],
  ["YouTube", "10-01 17:45", "Gaming Zone", "This game is BROKEN", "Speedrunning the new open world game.", { views: 450000 }],
  ["YouTube", "10-01 20:40", "StudyWithMe", "Machine Learning in one shot — full revision", "Complete machine learning revision: regression, gradient descent, SVM and neural networks for exams.", { views: 210000 }],
  ["YouTube", "10-01 11:30", "Code Mentor", "System design interview: complete guide", "How to crack system design rounds in internship interviews.", { views: 380000 }],
];
for (const [src, w, author, title, body, meta] of social) add(src, w, author, title, body, meta);

// ───────────────────────── Generic news singletons (filler) ─────────────────────────
const filler: [string, string, string, string][] = [
  ["Metro Times", "09-30 18:20", "Metro bridge repair to close Bund Garden road for a week", "Bund Garden road will be closed for a week from Monday for metro bridge repairs. Traffic diverted via Koregaon Park."],
  ["Global Wire", "09-30 20:30", "Oil prices fall on weak demand outlook", "Oil prices fell 2% on Wednesday on concerns about weaker global demand."],
  ["Global Wire", "10-01 05:00", "Earthquake of magnitude 5.1 strikes off Japan coast", "A magnitude 5.1 earthquake struck off the coast of Japan. No tsunami warning was issued."],
  ["Metro Times", "10-01 06:30", "Pune Marathon registrations open", "Registrations for the Pune Marathon in December are now open."],
  ["Global Wire", "10-01 07:00", "Central bank holds interest rates steady", "The central bank kept its key interest rate unchanged at 6.25%."],
  ["The Ledger", "10-01 08:00", "Auto sales rise 8% in September", "Passenger vehicle sales rose 8% in September on festive demand."],
  ["Metro Times", "10-01 10:15", "New film festival announced for November", "The city will host an international film festival in November."],
  ["Global Wire", "10-01 11:05", "Space agency tests reusable rocket engine", "The national space agency successfully tested a reusable rocket engine."],
  ["Pune Mirror Online", "10-01 11:40", "PMC begins pothole repair drive", "The municipal corporation started a pothole repair drive on 40 roads."],
  ["Metro Times", "10-01 12:20", "Tennis: top seed knocked out in Tokyo", "The top seed was knocked out in the second round of the Tokyo Open."],
  ["Global Wire", "10-01 15:20", "Climate summit to open in Lisbon next week", "World leaders will meet in Lisbon next week for a climate summit."],
  ["The Ledger", "10-01 16:40", "Gold prices edge higher", "Gold prices rose 0.4% as the dollar weakened."],
  ["Pune Mirror Online", "10-01 17:30", "Ganesh idol makers prepare for next year", "Artisans have already begun work on idols for next year."],
  ["Metro Times", "10-01 18:50", "Restaurant week returns to Koregaon Park", "Over 50 restaurants will offer special menus during restaurant week."],
  ["Global Wire", "10-01 20:00", "Electric bus fleet to double by 2027", "The city plans to double its electric bus fleet by 2027."],
  ["TechPulse", "10-01 10:50", "5 VS Code extensions every developer needs", "Our favourite VS Code extensions for productivity in 2026."],
  ["ByteDaily", "10-01 13:35", "Why every developer should learn Rust in 2026", "Rust adoption keeps growing. Here's why developers should learn Rust."],
  ["TechPulse", "10-01 15:50", "Opinion: are AI coding assistants making us worse programmers?", "AI coding assistants are everywhere. Are they eroding fundamentals or freeing developers to think bigger?"],
  ["ByteDaily", "10-01 18:10", "Weekly AI newsletter: Orion-4, small models and the AI Bill", "This week in AI: Orion-4 launches, distilled small models match big ones, and the AI Accountability Bill clears a panel."],
];
for (const [src, w, title, body] of filler) add(src, w, "Staff", title, body);

// ───────────────────────── Extra syndicated / near-duplicate copies ─────────────────────────
add("Pune Mirror Online", "10-01 07:10", "Global Wire", "Saka double sends Arsenal top of Champions League group",
  "Bukayo Saka scored twice as Arsenal beat Inter 3-1 in the Champions League on Wednesday night.");
add("Pune Mirror Online", "09-30 19:10", "The Ledger", "Pune startup Kitebird raises $40 million Series B",
  "Kitebird, a Pune-based logistics AI startup, raised $40 million in a Series B round led by Horizon Ventures. Kitebird will use the funding to hire 200 engineers and expand to Southeast Asia.");
add("Metro Times", "10-01 06:00", "Weather Bureau", "Orange alert for heavy rain in Pune on October 2",
  "The Weather Bureau has issued an orange alert for heavy rain in Pune district on October 2. Rainfall of 70 to 110 mm is expected. Citizens are advised to avoid low-lying areas.");
add("ViralHub", "10-01 08:40", "Staff", "Pune colleges CLOSED tomorrow due to heavy rain alert!!",
  "All Pune colleges and schools will remain closed tomorrow due to the heavy rain alert, according to a message circulating on WhatsApp. Exams are postponed!!", { likes: 8000 });

const calendar: CalendarEvent[] = [
  { id: "c1", title: "TechNext Minithon 4.0", start: t("10-01 10:00"), end: t("10-01 16:30"), keywords: ["minithon", "technext", "hackathon", "demo", "api code"] },
  { id: "c2", title: "ML doubt-clearing session", start: t("10-01 17:00"), end: t("10-01 18:00"), keywords: ["doubt-clearing", "machine learning", "gradient descent"] },
  { id: "c3", title: "Machine Learning End-Sem Exam", start: t("10-02 10:00"), end: t("10-02 13:00"), keywords: ["machine learning", "ml end-sem", "ml exam", "exam", "hall ticket", "gradient descent", "svm", "regression", "colleges closed"] },
  { id: "c4", title: "Nimbus Labs internship interview", start: t("10-03 15:00"), end: t("10-03 16:00"), keywords: ["nimbus labs", "nimbus", "interview"] },
  { id: "c5", title: "Arsenal vs Chelsea (watch party)", start: t("10-04 22:00"), end: t("10-05 00:00"), keywords: ["arsenal", "chelsea", "moreau"] },
];

mkdirSync("data", { recursive: true });
writeFileSync("data/seed.json", JSON.stringify({ items, calendar }, null, 2));
const byType: Record<string, number> = {};
for (const i of items) byType[i.sourceType] = (byType[i.sourceType] ?? 0) + 1;
console.log(`Wrote ${items.length} items`, byType);

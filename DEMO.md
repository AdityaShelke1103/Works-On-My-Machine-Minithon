# 3-minute demo script

**Before you start:** run `npm run demo` (or `npm run dev` and open the page once to warm it up). Go to Preferences → **Reset demo**, then switch back to **Today**. Use a laptop-width browser window (≥ 1280px) so the sidebar is visible. The clock starts at **08:30, Thu 1 Oct (simulated)**.

The persona is Shivom, a final-year CS student. They have an ML exam tomorrow, a hackathon today, and an internship interview on Saturday.

---

### 0:00–0:20 · The problem and the promise
> "Shivom got **76 items** this morning from news, X, Reddit, YouTube, Gmail, WhatsApp and app notifications. We don't show a feed. We show a briefing: **76 items → 34 stories → 3 need you**."

Point at the stat chips: duplicates merged, held for the 13:00 digest, buried quietly, minutes of reading saved. **(Req 1: aggregation, normalized.)**

### 0:20–0:55 · Why something matters to *you* (Req 2)
On the first card, *Action required: confirm Nimbus Labs interview slot*, read the **Why** chips aloud:
> "Matches your topic Internships +28.8, from the Placement Cell +25, urgency 'action required, deadline today' +22. Every point is visible."

Scroll to **Later** and expand it. Point at *Kiara & Arman wedding* and *Bitcoin $150K*:
> "2.4 million likes, and the chip says **popularity ignored by design**. Engagement ranking would put this first. We bury it because you muted it. It's never deleted, just one click away."

### 0:55–1:25 · Stories, not articles, with sources you can check (Req 3 + 5)
Open **Important for you → Orion-4** (8 reports merged into one story). Click **View original sources**:
> "One summary from 8 reports. Every source is listed with a credibility label and a link. The Metro Times copy was syndicated, so it's merged as a duplicate."

Drag the clock to **10:00**. Show the rain story's yellow **Sources disagree** box:
> "A viral post says colleges are closed tomorrow. The District Collector, an official source, says that's false. We flag the conflict and summarize from the credible sources only."

(The Arsenal transfer story also shows a conflict: €80m vs €65m.)

### 1:25–2:10 · Attention management (Req 4)
Drag the clock to **06:30**. The **Quiet hours** badge lights up and 0 items need you.
Click **Breaking-update simulator → Professor moves tomorrow's exam**:
> "A VIP, urgent, about tomorrow's exam on my calendar. It **breaks through quiet hours** immediately."
(Toast appears. Open it to show the reader.)

Click **'URGENT' 70% off promo**:
> "It shouts 'URGENT' too, but promotional urgency is discounted 80%. It gets buried, not pushed."

Click **AI news: Orion-4 free tier paused**:
> "Relevant, not urgent. It joins the existing Orion-4 story and is **batched for the 08:00 digest**."

Open any story with **Read**. Point at the **attention budget** bar and press ⏩ a few times:
> "Each story gets an attention budget: 2 minutes normal, 5 important, 10 starred. When it runs out we don't hide anything. We show the key points and you choose to continue."

### 2:10–2:40 · It learns from very little (Req 2, learning)
Drag back to **10:00**. On Orion-4 click ⭐. On the Arsenal story click 👎.
> "Watch 'What I've learned' in the sidebar. AI & LLMs goes up, football goes down. Arsenal drops to Later, and the related ML paper now shows 'you engage with AI & LLMs'. Two clicks, and every change is explained."

### 2:40–3:00 · Intelligent organization (Req 6)
Drag the clock to **14:30**:
> "A CloudNest outage spikes with 5 reports in 90 minutes. It's flagged **Emerging**, and it interrupts because it took down the university exam portal the day before your exam."

Click **Deep Focus**: non-urgent items sink. Click **Evening**: football comes back up.

Open the **Trending** tab:
> "Trending tells you what's happening. Relevance tells you what matters to you. They're separate on purpose."

---

## Backup plan
- **No internet needed.** Everything runs on seed data and local SQLite. Keep live sources and LLM toggles off for the demo.
- If anything looks off: Preferences → **Reset demo**, then reload.
- If the server dies: `npm run demo` again. The DB is persistent and reset is instant.
- Record a backup video of the script above beforehand (Win+Alt+R with Xbox Game Bar, or OBS) and keep it open in a tab.
- Terminal fallback: `npm run check -- 14:30 -v` prints every story's tier, score and reasons.

## Lines for judges
- "Everything intelligent is explainable. Every score is a sum of labelled parts."
- "We never delete or hide. Low priority means *batched* or *buried quietly*, always one click away."
- "Popularity is visible but deliberately not a ranking signal."
- "The engine is a pure function of your data and the clock. That's why we can replay a whole day in 30 seconds."

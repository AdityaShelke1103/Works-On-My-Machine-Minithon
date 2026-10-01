import type { Preferences } from "./types";

export const DEFAULT_PREFERENCES: Preferences = {
  userName: "Shivom",
  topics: [
    { id: "ml", label: "Machine Learning studies", keywords: ["machine learning", "ml", "gradient descent", "regression", "svm", "neural network", "distilled", "exam", "syllabus"], weight: 1 },
    { id: "ai", label: "AI & LLMs", keywords: ["ai model", "language model", "llm", "orion-4", "orion", "reasoning", "chatbot", "ai"], weight: 0.85 },
    { id: "career", label: "Internships & careers", keywords: ["internship", "interview", "hiring", "placement", "campus hiring", "engineers", "jobs"], weight: 0.9 },
    { id: "campus", label: "Campus life", keywords: ["university", "campus", "hostel", "exam portal", "hall ticket", "library", "colleges"], weight: 0.6 },
    { id: "football", label: "Arsenal & football", keywords: ["arsenal", "football", "champions league", "transfer", "moreau", "saka", "chelsea"], weight: 0.7 },
    { id: "policy", label: "AI regulation", keywords: ["ai accountability bill", "ai regulation", "regulation", "policy", "compliance"], weight: 0.6 },
    { id: "startups", label: "Pune startups", keywords: ["startup", "funding", "series b", "kitebird", "venture"], weight: 0.4 },
  ],
  people: [
    { name: "Prof. Anjali Mehta", match: ["mehta"], relation: "ML professor", weight: 1 },
    { name: "Training & Placement Cell", match: ["placement cell", "tnp@"], relation: "placements", weight: 0.9 },
    { name: "Riya Sharma", match: ["riya"], relation: "hackathon teammate", weight: 0.8 },
    { name: "Mom", match: ["mom"], relation: "family", weight: 0.9 },
    { name: "Arjun", match: ["arjun"], relation: "friend", weight: 0.4 },
  ],
  muted: ["crypto", "bitcoin", "celebrity"],
  quietHours: { enabled: true, start: "23:00", end: "07:00" },
  digestTimes: ["08:00", "13:00", "19:00"],
  contextMode: "auto",
  useLLM: true,
  liveSources: false,
};

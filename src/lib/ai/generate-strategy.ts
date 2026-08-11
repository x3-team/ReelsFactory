import OpenAI from "openai";

import { isMockMode } from "@/lib/config";
import { mockStrategy } from "@/lib/mocks/demo-data";
import type { ScrapedProfile, StrategyPayload } from "@/lib/types";

const STRATEGY_SYSTEM_PROMPT = `You are a short-form content strategist for Instagram Reels, TikTok, and YouTube Shorts.
Return ONLY valid JSON matching this schema:
{
  "niche": string,
  "target_audience": string,
  "content_pillars": [{"title": string, "description": string}],
  "profile_audit_tips": string[],
  "scripts": [{
    "title": string,
    "format": string,
    "hook_options": string[],
    "teleprompter_script": string,
    "caption": string,
    "cta": string
  }]
}
Generate 3 scripts with timed teleprompter_script blocks. No markdown.`;

export async function generateStrategy(input: {
  profile: ScrapedProfile;
  transcriptions: string[];
  goal: string;
  tone: string;
  offerSummary?: string | null;
  websiteUrl?: string | null;
}): Promise<{ strategy: StrategyPayload; mocked: boolean }> {
  if (isMockMode() || (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY)) {
    return {
      strategy: mockStrategy({
        handle: input.profile.handle,
        goal: input.goal,
        tone: input.tone,
        offerSummary: input.offerSummary,
      }),
      mocked: true,
    };
  }

  const userPrompt = JSON.stringify(
    {
      profile: {
        handle: input.profile.handle,
        platform: input.profile.platform,
        bio: input.profile.bio,
        followers: input.profile.followers,
        topVideos: input.profile.topVideos.map((v) => ({
          caption: v.caption,
          views: v.views,
        })),
      },
      transcriptions: input.transcriptions,
      goal: input.goal,
      tone: input.tone,
      offerSummary: input.offerSummary,
      websiteUrl: input.websiteUrl,
    },
    null,
    2,
  );

  if (process.env.ANTHROPIC_API_KEY) {
    const strategy = await generateWithAnthropic(userPrompt);
    return { strategy, mocked: false };
  }

  const strategy = await generateWithOpenAI(userPrompt);
  return { strategy, mocked: false };
}

async function generateWithOpenAI(userPrompt: string): Promise<StrategyPayload> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: STRATEGY_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Empty LLM response");
  return parseStrategyJson(content);
}

async function generateWithAnthropic(userPrompt: string): Promise<StrategyPayload> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
      max_tokens: 4096,
      system: STRATEGY_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API failed (${res.status})`);
  }

  const json = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = json.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("Empty Anthropic response");
  return parseStrategyJson(text);
}

function parseStrategyJson(raw: string): StrategyPayload {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned) as StrategyPayload;
  if (
    !parsed.niche ||
    !parsed.target_audience ||
    !Array.isArray(parsed.content_pillars) ||
    !Array.isArray(parsed.profile_audit_tips) ||
    !Array.isArray(parsed.scripts)
  ) {
    throw new Error("LLM JSON missing required fields");
  }
  return parsed;
}

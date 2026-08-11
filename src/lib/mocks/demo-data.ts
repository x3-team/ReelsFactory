import type { ScrapedProfile, StrategyPayload } from "@/lib/types";

export function mockScrapedProfile(
  handle: string,
  platform: ScrapedProfile["platform"],
): ScrapedProfile {
  const clean = handle.replace(/^@/, "");
  return {
    handle: clean,
    platform,
    displayName: clean
      .split(/[._-]/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" "),
    bio: `Helping creators grow with practical ${platform} tips. Free guide in bio 🔗`,
    followers: 48200,
    following: 312,
    postsCount: 186,
    topVideos: [
      {
        id: "v1",
        url: `https://${platform}.com/${clean}/video/1`,
        caption: "The one mistake killing your retention",
        views: 920_000,
        likes: 61_000,
        audioUrl: "https://example.com/audio/1.mp3",
        durationSec: 18,
      },
      {
        id: "v2",
        url: `https://${platform}.com/${clean}/video/2`,
        caption: "3 hooks that always stop the scroll",
        views: 710_000,
        likes: 44_000,
        audioUrl: "https://example.com/audio/2.mp3",
        durationSec: 22,
      },
      {
        id: "v3",
        url: `https://${platform}.com/${clean}/video/3`,
        caption: "My weekly content system",
        views: 530_000,
        likes: 29_000,
        audioUrl: "https://example.com/audio/3.mp3",
        durationSec: 27,
      },
      {
        id: "v4",
        url: `https://${platform}.com/${clean}/video/4`,
        caption: "Behind the scenes of a viral reel",
        views: 410_000,
        likes: 21_000,
        audioUrl: "https://example.com/audio/4.mp3",
        durationSec: 15,
      },
      {
        id: "v5",
        url: `https://${platform}.com/${clean}/video/5`,
        caption: "CTA formulas that get comments",
        views: 365_000,
        likes: 18_500,
        audioUrl: "https://example.com/audio/5.mp3",
        durationSec: 19,
      },
    ],
  };
}

export function mockTranscription(videoCaption?: string) {
  return [
    "Hook: stop scrolling if your reels die after three seconds.",
    videoCaption ? `Topic: ${videoCaption}.` : "Topic: content growth.",
    "Then I show the exact pattern I use: pattern interrupt, proof, and a clear CTA.",
    "People comment the keyword for the free checklist.",
  ].join(" ");
}

export function mockStrategy(input: {
  handle: string;
  goal: string;
  tone: string;
  offerSummary?: string | null;
}): StrategyPayload {
  const offer = input.offerSummary?.trim() || "a free content checklist";
  return {
    niche: "Short-form content growth & education",
    target_audience:
      "Creators, SMM managers, and experts who want predictable Reels performance",
    content_pillars: [
      {
        title: "Scroll-stopping Hooks",
        description: "Openers that create curiosity in the first 1–3 seconds",
      },
      {
        title: "Proof & Systems",
        description: "Frameworks, routines, and behind-the-scenes process content",
      },
      {
        title: "Offer CTAs",
        description: `Soft-sell clips that drive comments and DMs for ${offer}`,
      },
    ],
    profile_audit_tips: [
      `Make the bio promise explicit for @${input.handle}: what subscribers get this week.`,
      "Pin your highest-retention video and remake it with a stronger first frame.",
      `Align the grid with your goal (${input.goal.replaceAll("_", " ").toLowerCase()}) and ${input.tone.toLowerCase()} tone.`,
      "Add a keyword CTA in the caption of every educational reel.",
    ],
    scripts: [
      {
        title: "Why your hooks flop in 3 seconds",
        format: "Reels / Shorts (15 sec)",
        hook_options: [
          "Stop blaming the algorithm — your first line is the problem.",
          "If people swipe away instantly, check this one habit.",
        ],
        teleprompter_script:
          "0-3s: Hook — look at camera, say the strong opener.\n3-10s: Show 2 bad vs 1 good hook examples on screen.\n10-15s: CTA — comment HOOK for the free checklist.",
        caption:
          "Most creators lose viewers before the tip starts. Steal this hook formula. Comment HOOK for the checklist.",
        cta: "Comment 'HOOK'",
      },
      {
        title: "The 3-block viral script",
        format: "Reels / Shorts (30 sec)",
        hook_options: [
          "I batch 12 reels with one template — here it is.",
          "This 3-block script prints saves every week.",
        ],
        teleprompter_script:
          "0-3s: Hook with the template promise.\n3-20s: Walk through Hook → Proof → CTA blocks with on-screen labels.\n20-30s: Show your offer and ask for a keyword comment.",
        caption:
          "Save this template before you film tomorrow. Keyword in the comments unlocks the full checklist.",
        cta: "Comment 'SCRIPT'",
      },
      {
        title: "Soft-sell without looking salesy",
        format: "Reels / Shorts (20 sec)",
        hook_options: [
          "Hard CTAs kill reach. Try this soft close instead.",
          "I stopped saying 'link in bio' and comments doubled.",
        ],
        teleprompter_script:
          `0-3s: Hook about soft CTAs.\n3-14s: Demonstrate a value tip tied to ${offer}.\n14-20s: Ask viewers to comment the keyword for ${offer}.`,
        caption: `Teach first, sell second. Comment to get ${offer}.`,
        cta: "Comment 'GUIDE'",
      },
    ],
  };
}

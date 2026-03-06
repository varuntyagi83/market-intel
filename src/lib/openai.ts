// ═══════════════════════════════════════════════════════════
// OpenAI — GPT-4o (analysis) + GPT-4o-mini (sentiment/classification)
// ═══════════════════════════════════════════════════════════

import OpenAI from "openai";
import { SentimentScore, NewsSentimentResponse } from "./types";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Sentiment scoring via GPT-4o-mini (fast, cheap) ──────────

export async function scoreSentiment(
  headlines: string[],
  tickers: string[]
): Promise<NewsSentimentResponse> {
  if (!headlines.length) {
    return { scores: [], overallScore: 0, overallLabel: "neutral" };
  }

  const headlineList = headlines
    .slice(0, 30)
    .map((h, i) => `${i + 1}. ${h}`)
    .join("\n");

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          'You are a financial sentiment analyst. Given news headlines, score overall market sentiment and per-ticker sentiment. Respond ONLY with valid JSON in this exact format: {"overall":{"score":0.0,"label":"neutral"},"tickers":[{"ticker":"AAPL","score":0.0,"label":"neutral"}]}. Score range: -1.0 (very bearish) to 1.0 (very bullish). Labels: bullish (>0.15), neutral (-0.15 to 0.15), bearish (<-0.15).',
      },
      {
        role: "user",
        content: `Tickers to score: ${tickers.join(", ")}\n\nHeadlines:\n${headlineList}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 500,
  });

  const raw = response.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(raw);

  const scores: SentimentScore[] = (parsed.tickers ?? tickers.map((t) => ({
    ticker: t,
    score: parsed.overall?.score ?? 0,
    label: parsed.overall?.label ?? "neutral",
  }))).map((item: { ticker: string; score: number; label: string }) => ({
    ticker: item.ticker,
    score: item.score,
    label: item.label as SentimentScore["label"],
    source: "gpt-4o-mini" as const,
  }));

  const overallScore = parsed.overall?.score ?? 0;

  return {
    scores,
    overallScore,
    overallLabel: parsed.overall?.label ?? "neutral",
  };
}

// ── Quick structured analysis via GPT-4o (streaming) ─────────

export async function createOpenAIStream(
  prompt: string,
  system: string
): Promise<ReadableStream> {
  const stream = await client.chat.completions.create({
    model: "gpt-4o",
    stream: true,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    max_tokens: 3000,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)
        );
        controller.close();
      }
    },
  });
}

// ── Full non-streaming GPT-4o response (for consensus) ───────

export async function getOpenAIAnalysis(
  prompt: string,
  system: string
): Promise<string> {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    max_tokens: 3000,
  });
  return response.choices[0].message.content ?? "";
}

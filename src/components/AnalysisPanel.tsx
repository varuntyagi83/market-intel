"use client";

import { useEffect, useState } from "react";
import { ANALYSIS_MODES } from "@/lib/markets";
import { AnalysisMode, LLMProvider, MarketKey, StockQuote, CryptoPrice, NewsItem } from "@/lib/types";
import MarkdownRenderer from "./MarkdownRenderer";
import LoadingDots from "./LoadingDots";

interface Props {
  market: MarketKey;
  quotes: (StockQuote | CryptoPrice)[];
  news: NewsItem[];
}

const LLM_OPTIONS: { key: LLMProvider; label: string; desc: string }[] = [
  { key: "claude", label: "Claude", desc: "Deep reasoning + web search" },
  { key: "openai", label: "GPT-4o", desc: "Fast structured analysis" },
  { key: "consensus", label: "🔮 Consensus", desc: "Both LLMs synthesized" },
];

async function streamAnalysis(
  payload: object,
  onChunk: (text: string) => void,
  signal: AbortSignal
) {
  const res = await fetch("/api/analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok || !res.body) throw new Error("Stream failed");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ") && !line.includes("[DONE]")) {
        try {
          const { text } = JSON.parse(line.slice(6));
          if (text) onChunk(text);
        } catch {}
      }
    }
  }
}

export default function AnalysisPanel({ market, quotes, news }: Props) {
  const [activeMode, setActiveMode] = useState<AnalysisMode | null>(null);
  const [activeLLM, setActiveLLM] = useState<LLMProvider>("claude");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [abortCtrl, setAbortCtrl] = useState<AbortController | null>(null);

  // Reset analysis when market changes
  useEffect(() => {
    if (abortCtrl) abortCtrl.abort();
    setOutput("");
    setActiveMode(null);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market]);

  async function runAnalysis(mode: AnalysisMode) {
    if (abortCtrl) abortCtrl.abort();
    const ctrl = new AbortController();
    setAbortCtrl(ctrl);
    setActiveMode(mode);
    setOutput("");
    setLoading(true);

    const priceData = quotes.length
      ? JSON.stringify(quotes.slice(0, 10), null, 2)
      : undefined;
    const newsData = news.length
      ? news
          .slice(0, 5)
          .map((n) => `${n.headline} (${n.source})`)
          .join("\n")
      : undefined;

    try {
      await streamAnalysis(
        { market, mode, priceData, newsData, llm: activeLLM },
        (text) => setOutput((prev) => prev + text),
        ctrl.signal
      );
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setOutput((prev) => prev + "\n\n[Error: stream interrupted]");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-muted text-xs tracking-widest uppercase">AI Analysis</span>
        {loading && (
          <LoadingDots
            label={activeLLM === "consensus" ? "Running consensus" : `Analyzing via ${activeLLM}`}
          />
        )}
      </div>

      {/* LLM Selector */}
      <div className="flex gap-1.5 mb-3 pb-3 border-b border-border">
        {LLM_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setActiveLLM(opt.key)}
            disabled={loading}
            title={opt.desc}
            className={`px-2.5 py-1 text-[10px] rounded border transition-all ${
              activeLLM === opt.key
                ? "bg-accent/20 border-accent text-accent font-bold"
                : "border-border text-muted hover:border-accent/40 hover:text-[#e0e0f0]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {opt.label}
          </button>
        ))}
        {activeLLM === "consensus" && (
          <span className="text-muted text-[10px] self-center ml-1">
            runs Claude + GPT-4o in parallel
          </span>
        )}
      </div>

      {/* Mode buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {ANALYSIS_MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => runAnalysis(m.key)}
            disabled={loading}
            className={`px-3 py-1.5 text-xs rounded border transition-all ${
              activeMode === m.key
                ? "bg-accent/20 border-accent text-accent"
                : "border-border text-muted hover:border-accent/50 hover:text-[#e0e0f0]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="mr-1">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {output ? (
        <div className="bg-surface border border-border rounded p-4 max-h-96 overflow-y-auto">
          {/* LLM label */}
          <div className="text-[10px] text-muted mb-2 pb-2 border-b border-border">
            {activeLLM === "consensus"
              ? "🔮 Consensus — Claude + GPT-4o synthesized"
              : activeLLM === "openai"
              ? "⚡ GPT-4o analysis"
              : "🤖 Claude Sonnet analysis"}
          </div>
          <MarkdownRenderer content={output} />
          {loading && (
            <span className="inline-block w-1.5 h-4 bg-accent animate-pulse ml-0.5 align-middle" />
          )}
        </div>
      ) : !loading ? (
        <div className="border border-dashed border-border rounded p-6 text-center text-muted text-xs">
          Select an analysis mode above · Using{" "}
          <span className="text-accent">{activeLLM}</span>
        </div>
      ) : null}
    </div>
  );
}

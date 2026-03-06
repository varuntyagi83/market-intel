"use client";

import { useEffect, useRef, useState } from "react";
import { MarketKey } from "@/lib/types";
import MarkdownRenderer from "./MarkdownRenderer";
import LoadingDots from "./LoadingDots";

interface Props {
  market: MarketKey;
}

const SUGGESTIONS: Record<MarketKey, string[]> = {
  US: [
    "What are the key risks for US tech stocks this quarter?",
    "Compare FAANG valuations vs 2021 peak",
    "Fed rate impact on growth stocks",
  ],
  EU: [
    "How is the ECB policy affecting European equities?",
    "Best EU defensive plays for 2025",
    "EUR/USD impact on ASML earnings",
  ],
  INDIA: [
    "India IT sector outlook vs US slowdown",
    "Best Indian ADRs for US investors",
    "RBI policy impact on banking stocks",
  ],
  CRYPTO: [
    "Bitcoin halving cycle — where are we now?",
    "DeFi vs CeFi risk comparison",
    "Ethereum staking yield vs bonds",
  ],
};

export default function CustomQuery({ market }: Props) {
  const [query, setQuery] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Reset when market changes
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    setOutput("");
    setLoading(false);
  }, [market]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Cmd+K / Ctrl+K to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  async function run(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setOutput("");
    setLoading(true);

    const prompt = `Market: ${market}\n\nUser question: ${trimmed}`;

    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market, mode: "full", priceData: prompt }),
        signal: ctrl.signal,
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
              if (text) setOutput((prev) => prev + text);
            } catch {}
          }
        }
      }
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
        <span className="text-muted text-xs tracking-widest uppercase">Custom Research</span>
        <span className="text-muted text-[10px] border border-border rounded px-1.5 py-0.5">⌘K</span>
      </div>

      <div className="mb-3">
        <textarea
          ref={inputRef}
          rows={2}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              run(query);
            }
          }}
          placeholder="Ask anything about the markets… (Enter to submit, Shift+Enter for newline)"
          className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-[#e0e0f0] placeholder-muted resize-none focus:outline-none focus:border-accent/60 transition-colors"
        />
        <div className="flex justify-between items-center mt-1.5">
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS[market].map((s) => (
              <button
                key={s}
                onClick={() => { setQuery(s); run(s); }}
                disabled={loading}
                className="text-[10px] text-muted border border-border rounded px-2 py-0.5 hover:border-accent/40 hover:text-accent disabled:opacity-40 transition-colors"
              >
                {s.length > 40 ? s.slice(0, 40) + "…" : s}
              </button>
            ))}
          </div>
          <button
            onClick={() => run(query)}
            disabled={loading || !query.trim()}
            className="ml-2 px-4 py-1.5 bg-accent/20 border border-accent/50 text-accent text-xs rounded hover:bg-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {loading ? <LoadingDots /> : "Research →"}
          </button>
        </div>
      </div>

      {output ? (
        <div className="bg-surface border border-border rounded p-4 max-h-96 overflow-y-auto mt-3">
          <MarkdownRenderer content={output} />
          {loading && (
            <span className="inline-block w-1.5 h-4 bg-accent animate-pulse ml-0.5 align-middle" />
          )}
        </div>
      ) : null}
    </div>
  );
}

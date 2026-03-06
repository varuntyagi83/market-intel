"use client";

import { NewsItem } from "@/lib/types";
import LoadingDots from "./LoadingDots";

interface Props {
  items: NewsItem[];
  loading: boolean;
}

function timeAgo(unix: number) {
  const diff = Date.now() / 1000 - unix;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NewsFeed({ items, loading }: Props) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-muted text-xs tracking-widest uppercase">News Feed</span>
        {loading && <LoadingDots />}
      </div>

      {!loading && items.length === 0 && (
        <p className="text-muted text-xs">No news loaded. Click Fetch All.</p>
      )}

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-surface border border-border rounded p-3 hover:border-accent/40 transition-colors group"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-[#e0e0f0] text-xs leading-snug group-hover:text-accent transition-colors line-clamp-2">
                {item.headline}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted">
              <span className="text-accent/70">{item.source}</span>
              <span>·</span>
              <span>{timeAgo(item.datetime)}</span>
              {item.related && (
                <>
                  <span>·</span>
                  <span className="text-accent/50">{item.related}</span>
                </>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

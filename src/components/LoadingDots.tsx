export default function LoadingDots({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label && <span className="text-muted text-xs mr-1">{label}</span>}
      <span className="loading-dot" />
      <span className="loading-dot" />
      <span className="loading-dot" />
    </span>
  );
}

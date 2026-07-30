export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg ${className}`}
      style={{
        background: 'rgba(169, 153, 138, 0.2)',
        animation: 'pulse-soft 1.5s ease-in-out infinite',
      }}
    />
  );
}

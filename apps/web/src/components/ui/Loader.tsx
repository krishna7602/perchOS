export function Loader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8">
      <div
        className="h-6 w-6 rounded-full border-2 border-t-transparent"
        style={{
          borderColor: 'var(--color-primary)',
          borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {label && (
        <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {label}
        </span>
      )}
    </div>
  );
}

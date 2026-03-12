import "./LoadingSpinner.css";

export default function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <InlineSpinner />
    </div>
  );
}

export function InlineSpinner({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="win10-spinner">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="dot" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      {text && <p className="text-sm text-muted-foreground mt-4">{text}</p>}
    </div>
  );
}

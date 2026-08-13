export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">{label}</div>
  );
}

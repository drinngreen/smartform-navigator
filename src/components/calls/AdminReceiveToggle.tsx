export function AdminReceiveToggle({ showLabel = true }: { showLabel?: boolean }) {
  return (
    <button className="relative inline-flex h-5 w-9 items-center rounded-full bg-neon-green/20 border border-neon-green/30">
      <span className="inline-block h-3 w-3 transform rounded-full bg-neon-green translate-x-5 transition" />
    </button>
  );
}

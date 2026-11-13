// Hermes doesn't implement Intl.RelativeTimeFormat, so relative times are formatted by hand.
const absolute = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

export function formatRelativeDate(timestamp: number): string {
  if (!timestamp) return '';
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return absolute.format(timestamp);
}

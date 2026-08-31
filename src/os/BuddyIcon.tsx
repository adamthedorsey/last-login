/**
 * The buddy status glyph — our own pixel art in the AIM-era spirit: a
 * tiny person, colored by presence. Online is solid, away wears a note,
 * idle is grayed, offline is a faint outline.
 */
type Status = 'online' | 'away' | 'idle' | 'offline';

const BODY: Record<Status, string> = {
  online: '#000080',
  away: '#000080',
  idle: '#9a9a9a',
  offline: '#b8b8b8',
};

export function BuddyIcon({ status, size = 16 }: { status: Status; size?: number }) {
  const c = BODY[status];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden
    >
      {/* head */}
      <rect x={6} y={2} width={4} height={4} fill={c} />
      {/* shoulders */}
      <rect x={4} y={7} width={8} height={6} fill={c} />
      <rect x={3} y={9} width={1} height={4} fill={c} />
      <rect x={12} y={9} width={1} height={4} fill={c} />
      {status === 'away' && (
        <>
          {/* a small yellow note clipped to the shoulder */}
          <rect x={9} y={6} width={6} height={5} fill="#ffd23f" />
          <rect x={10} y={8} width={4} height={1} fill="#8a6d00" />
          <rect x={10} y={10} width={3} height={1} fill="#8a6d00" />
        </>
      )}
      {status === 'idle' && (
        /* the AIM idle "z" hint */
        <rect x={12} y={2} width={3} height={1} fill="#6a6a6a" />
      )}
    </svg>
  );
}

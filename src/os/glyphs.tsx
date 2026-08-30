/**
 * Title-bar button glyphs, drawn as crisp pixel rects — our own art in the
 * classic generic shapes (underscore, window outline, overlapped windows,
 * bold X). Text glyphs (_ □ ×) never sat right in the button; these do.
 */

function G({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width={12}
      height={10}
      viewBox="0 0 12 10"
      shapeRendering="crispEdges"
      aria-hidden
      style={{ display: 'block' }}
    >
      {children}
    </svg>
  );
}

/** The short thick bar, hugging the bottom-left. */
export function MinimizeGlyph() {
  return (
    <G>
      <rect x={1} y={7} width={6} height={2} fill="#000" />
    </G>
  );
}

/** A window outline with its thicker title edge. */
export function MaximizeGlyph() {
  return (
    <G>
      <rect x={1} y={0} width={9} height={2} fill="#000" />
      <rect x={1} y={2} width={1} height={7} fill="#000" />
      <rect x={9} y={2} width={1} height={7} fill="#000" />
      <rect x={1} y={8} width={9} height={1} fill="#000" />
    </G>
  );
}

/** Two overlapped windows — shown on the maximize button while maximized. */
export function RestoreGlyph() {
  return (
    <G>
      {/* back window (top-right), clipped by the front one */}
      <rect x={3} y={0} width={8} height={2} fill="#000" />
      <rect x={10} y={2} width={1} height={5} fill="#000" />
      <rect x={9} y={6} width={2} height={1} fill="#000" />
      <rect x={3} y={2} width={1} height={1} fill="#000" />
      {/* front window (bottom-left) */}
      <rect x={0} y={3} width={8} height={2} fill="#000" />
      <rect x={0} y={5} width={1} height={5} fill="#000" />
      <rect x={7} y={5} width={1} height={5} fill="#000" />
      <rect x={0} y={9} width={8} height={1} fill="#000" />
    </G>
  );
}

/** The bold X: two-pixel-wide diagonals. */
export function CloseGlyph() {
  return (
    <G>
      <rect x={1} y={1} width={2} height={1} fill="#000" />
      <rect x={8} y={1} width={2} height={1} fill="#000" />
      <rect x={2} y={2} width={2} height={1} fill="#000" />
      <rect x={7} y={2} width={2} height={1} fill="#000" />
      <rect x={3} y={3} width={2} height={1} fill="#000" />
      <rect x={6} y={3} width={2} height={1} fill="#000" />
      <rect x={4} y={4} width={3} height={1} fill="#000" />
      <rect x={3} y={5} width={2} height={1} fill="#000" />
      <rect x={6} y={5} width={2} height={1} fill="#000" />
      <rect x={2} y={6} width={2} height={1} fill="#000" />
      <rect x={7} y={6} width={2} height={1} fill="#000" />
      <rect x={1} y={7} width={2} height={1} fill="#000" />
      <rect x={8} y={7} width={2} height={1} fill="#000" />
    </G>
  );
}

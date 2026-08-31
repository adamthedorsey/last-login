/**
 * The ribbed size grip, drawn where Win95 drew it: the lower-right corner
 * of a resizable window's status bar. Purely visual — the actual resize
 * handle is WindowFrame's corner hotspot underneath it. The host status
 * bar needs position: relative.
 */
import styled from 'styled-components';

export const StatusGrip = styled.div`
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 13px;
  height: 13px;
  background: repeating-linear-gradient(
    135deg,
    transparent 0 2px,
    #808080 2px 3px,
    #ffffff 3px 4px
  );
  pointer-events: none;
`;

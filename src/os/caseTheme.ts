/**
 * The Case Files family look: the sheriff's software is the one program on
 * this machine that ISN'T stock Horizons chrome — it's county-issue, and it
 * wears a manila-folder tint instead of system gray. Registered per-app via
 * the registry `theme` param; WindowFrame wraps the whole window (frame,
 * buttons, wells, scrollbars) in this react95 theme so every bevel tints
 * consistently. Reading surfaces stay white (canvas) like everywhere else.
 */
import original from 'react95/dist/themes/original';

/** The manila material — used by custom-styled bits (tabs) too. */
export const CASE_TINT = '#ded8c2';

export const caseTheme = {
  ...original,
  material: CASE_TINT,
  // The bevel ramp, warmed to match the paper.
  borderLight: '#efe9d6',
  borderLightest: '#fbf8ee',
  flatLight: '#e8e2cc',
};

# Story bible — SPOILERS FOR EVERYTHING

These documents are the writers' room. They contain the full truth of Season 1
and must never ship to players in any form. They are not imported by any code;
the bundle audit and the server-side content boundary keep game data safe, and
these files exist only for authoring.

Sources and authority:
- **[CANON]** — straight from the Notion export ("Cold Files / Season 1:
  Without a Trace", Nov 2024).
- **[RECONCILED]** — the export contradicts itself; the chosen resolution is
  noted with the alternative.
- **[PROPOSED]** — filled gaps and connective tissue. Overrule freely; these
  exist so every character has a function in the clue graph.

Canon decisions log (from Adam, in-session):
- The victim is **Casey Taylor** (bible's "Jessica Taylor" + the slice's
  "Casey"; surname Taylor confirmed).
- The current shipped slice (Maple Glen / Casey Brennan) is placeholder and
  will be rewritten onto this canon in the content pass.

Files:
- `truth-timeline.md` — what actually happened, and the residue each event
  left on the PC. Layer 0 and Layer 1.
- `who-knows-what.md` — secrets × characters, reveal moves, and the act
  skeleton for the clue graph. Layer 2.

Workflow: edit these first, then transcribe into `season1.ts` items/gates,
then `npm run gen:seed` (validates the graph and regenerates
`docs/clue-graph.md`).

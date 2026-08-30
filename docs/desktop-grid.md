# Desktop icon grid — canonical slots

The desktop is a fixed grid. Every authored icon position in season content
(`meta.desktop`) MUST sit on it, so items can appear and disappear later in
the game at controlled, predictable spots with no overlap.

```
x = 24 + col * 96        y = 24 + row * 96
```

(ORIGIN = 24, GRID = 96 — the same constants as `src/os/desktopLayout.ts`.
"Line Up Icons" and drag-snapping use this exact grid, so authored slots and
player-moved icons always agree.)

## Season 1 opening layout (col, row)

| Slot | col,row |    x,y    | Icon              | Item id             |
| ---- | ------- | --------- | ----------------- | ------------------- |
| A1   | 0,0     |  24,24    | My Computer       | `folder.computer`   |
| A2   | 0,1     |  24,120   | My Documents      | `folder.my-documents` |
| A3   | 0,2     |  24,216   | Pictures          | `folder.pictures`   |
| A4   | 0,3     |  24,312   | Case Files        | `shortcut.casefile` |
| A5   | 0,4     |  24,408   | Recycle Bin       | `shortcut.recycle`  |
| B1   | 1,0     | 120,24    | NetVoyager        | `shortcut.browser`  |
| B2   | 1,1     | 120,120   | Mail              | `shortcut.mail`     |
| B3   | 1,2     | 120,216   | Chat              | `shortcut.buddyline` |
| C1   | 2,0     | 216,24    | Notepad           | `shortcut.notepad`  |
| C2   | 2,1     | 216,120   | Solitaire         | `shortcut.solitaire` |
| C3   | 2,2     | 216,216   | WestWind Online   | `shortcut.dialup`   |
| D1   | 3,0     | 312,24    | from j.txt        | `file.readme-first` |
| E3   | 4,2     | 408,216   | README.TXT        | `file.start-here`   |

## Free slots (reserved for things that appear mid-game)

Everything else is open — notably **D2–D5, E1–E2, E4–E5, and columns F+**.
Player-saved documents auto-place from the top-left free cell, so prefer
slots from the RIGHT side (E/F columns) for authored appearances to avoid
racing the player's own files.

## Rules

- New or timed desktop items are authored with `meta.desktop` on a FREE
  grid slot from this table — never off-grid, never on an occupied slot.
- When an item is added or moved in season content, update this table in
  the same change.
- Player drags are per-device cosmetics (localStorage layout overrides);
  the authored grid is what every new player sees and what gating-driven
  appearances rely on.

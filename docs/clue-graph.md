# Clue graph — Last Login — Season 1: The Overlook

> GENERATED — do not edit. Source of truth: `season1.ts`. Regenerate: `npm run graph`
>
> In-world date: 1997-10-18 · 90 items
> (3 gated · 3 granting · ~84 mundane camouflage) ·
> 3 discoveries

```mermaid
flowchart TD
  classDef discovery fill:#fffa9d,stroke:#887722,color:#111
  classDef finale fill:#ffb3d9,stroke:#8a1055,color:#111,stroke-width:3px
  classDef item fill:#e8e8e8,stroke:#555,color:#111
  classDef locked fill:#cfe0f5,stroke:#1a3a8a,color:#111
  classDef note fill:none,stroke:none,color:#888
  login[/"COMPUTER LOGIN<br/><i>password: login.casey</i>"/]:::locked
  login ~~~ loginNote["everything below requires the login"]:::note
  d_overlook_plan(["The overlook plan"]):::discovery
  d_ghostbridge_logs(["GhostBridge"]):::discovery
  d_third_screen_name(["The third screen name<br/><b>END OF SEASON</b>"]):::finale
  i_file_oct_pages["oct_pages.txt<br/><i>file</i>"]:::item
  i_file_oct_pages ==>|grants| d_third_screen_name
  d_ghostbridge_logs -->|requires| i_file_oct_pages
  i_email_dana_please_write_back["please write back<br/><i>email</i>"]:::item
  i_email_dana_please_write_back ==>|grants| d_overlook_plan
  i_im_ghostbridge["GhostBridge<br/><i>IM log</i>"]:::item
  i_im_ghostbridge ==>|grants| d_ghostbridge_logs
  d_overlook_plan -->|requires| i_im_ghostbridge
  i_web_mapfinder_overlook["MapFinder: Miller Point Overlook<br/><i>web</i>"]:::item
  d_overlook_plan -->|requires| i_web_mapfinder_overlook
  b_GhostBridge["GhostBridge<br/><i>buddy appears</i>"]:::item
  d_overlook_plan -->|requires| b_GhostBridge
```

Legend: rectangles are evidence items · stadiums are discoveries · slashed boxes
are password gates · `grants` = opening the item earns the discovery ·
`requires` = the item is invisible until the discovery is earned (AND/OR shown
on multi-requirement edges) · dotted = requires *opening* an item.

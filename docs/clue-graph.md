# Clue graph — Last Login — Season 1: Without a Trace

> GENERATED — do not edit. Source of truth: `season1.ts`. Regenerate: `npm run graph`
>
> In-world date: 1997-10-18 · 113 items
> (11 gated · 11 granting · ~91 mundane camouflage) ·
> 7 discoveries

```mermaid
flowchart TD
  classDef discovery fill:#fffa9d,stroke:#887722,color:#111
  classDef finale fill:#ffb3d9,stroke:#8a1055,color:#111,stroke-width:3px
  classDef item fill:#e8e8e8,stroke:#555,color:#111
  classDef locked fill:#cfe0f5,stroke:#1a3a8a,color:#111
  classDef note fill:none,stroke:none,color:#888
  login[/"COMPUTER LOGIN<br/><i>password: login.casey</i>"/]:::locked
  login ~~~ loginNote["everything below requires the login"]:::note
  d_the_meeting(["The meeting"]):::discovery
  d_stolen_intimacy(["Stolen intimacy"]):::discovery
  d_chads_window(["Chad’s window"]):::discovery
  d_the_clean_truck(["The clean dark truck"]):::discovery
  d_the_pipeline(["The pipeline"]):::discovery
  d_who_shaped(["A familiar shape"]):::discovery
  d_the_house(["The house<br/><b>END OF SEASON</b>"]):::finale
  i_file_ledger_copy["wv history extra notes.txt<br/><i>file</i>"]:::item
  i_file_ledger_copy ==>|grants| d_the_pipeline
  d_the_clean_truck -->|requires| i_file_ledger_copy
  i_file_gb_log_oct8["poem drafts 2.txt<br/><i>file</i>"]:::item
  i_file_gb_log_oct8 ==>|grants| d_stolen_intimacy
  d_the_meeting -->|requires| i_file_gb_log_oct8
  i_file_modem_log["modem.log<br/><i>file</i>"]:::item
  i_file_modem_log ==>|grants| d_the_house
  d_who_shaped -->|requires| i_file_modem_log
  i_email_sadie_please["please write back<br/><i>email</i>"]:::item
  i_email_sadie_please ==>|grants| d_the_meeting
  i_email_sadie_notchad["it’s not chad<br/><i>email</i>"]:::item
  i_email_sadie_notchad ==>|grants| d_chads_window
  d_stolen_intimacy -->|requires| i_email_sadie_notchad
  i_email_ruth_yourdad["about your daddy<br/><i>email</i>"]:::item
  i_email_ruth_yourdad ==>|grants| d_the_clean_truck
  d_chads_window -->|requires| i_email_ruth_yourdad
  i_email_sam_plain["what i should have said<br/><i>email</i>"]:::item
  i_email_sam_plain ==>|grants| d_the_pipeline
  d_the_clean_truck -->|requires| i_email_sam_plain
  i_email_rebecca["to whoever is going through her things<br/><i>email</i>"]:::item
  i_email_rebecca ==>|grants| d_who_shaped
  d_the_pipeline -->|requires| i_email_rebecca
  i_trash_bl_log["bl_log_ghstbrdg.txt<br/><i>recycle bin</i>"]:::item
  i_trash_bl_log ==>|grants| d_stolen_intimacy
  d_the_meeting -->|requires| i_trash_bl_log
  i_trash_diary["diary.doc<br/><i>recycle bin</i>"]:::item
  i_trash_diary ==>|grants| d_the_house
  d_who_shaped -->|requires| i_trash_diary
  i_web_register_timeline["The Humble Register: Timeline of Oct. 10<br/><i>web</i>"]:::item
  i_web_register_timeline ==>|grants| d_chads_window
  d_stolen_intimacy -->|requires| i_web_register_timeline
  i_web_mapfinder_bend["MapFinder: Route 9 river bend<br/><i>web</i>"]:::item
  d_the_meeting -->|requires| i_web_mapfinder_bend
  b_GhostBridge["GhostBridge<br/><i>buddy appears</i>"]:::item
  d_stolen_intimacy -->|requires| b_GhostBridge
  c_sadiedraws77_intro["ask sadiedraws77:<br/>“this isn’t casey. i’m at her computer, tryin…”<br/><i>live chat</i>"]:::item
  c_sadiedraws77_intro ==>|grants| d_the_meeting
  c_sadiedraws77_frank["ask sadiedraws77:<br/>“could it have been her dad she was meeting?”<br/><i>live chat</i>"]:::item
  c_sadiedraws77_frank ==>|grants| d_the_clean_truck
  d_chads_window -->|AND| c_sadiedraws77_frank
  c_sadiedraws77_vigil["ask sadiedraws77:<br/>“has anyone strange been around since she dis…”<br/><i>live chat</i>"]:::item
  c_sadiedraws77_vigil ==>|grants| d_who_shaped
  d_the_pipeline -->|AND| c_sadiedraws77_vigil
```

Legend: rectangles are evidence items · stadiums are discoveries · slashed boxes
are password gates · `grants` = opening the item earns the discovery ·
`requires` = the item is invisible until the discovery is earned (AND/OR shown
on multi-requirement edges) · dotted = requires *opening* an item.

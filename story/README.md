# Story bible — SPOILERS FOR EVERYTHING

The writers' room for Season 1. **These documents are the source of truth.**
The game implements them; when they disagree, the game is what changes.

No code imports these files. The bundle audit and the server-side content
boundary keep story data out of the client; this folder exists purely for
authoring.

## The folder

| | |
|---|---|
| **`canon.md`** | The world. Setting, Casey, the household, Humble and Oxytera, Prescott, the IRC arc, the Solitaire front. Start here if you are new. |
| **`characters/`** | One page per person: who they are, **how they sound**, what they know, and every place they touch the game. Start here if you are writing anyone's words. |
| **`truth-timeline.md`** | Layer 0 (what actually happened) and Layer 1 (the residue it left on the PC). The hour-by-hour of Oct 10–11. Start here if you are authoring an item. |
| **`who-knows-what.md`** | Layer 2. Secrets by character, the double reading, the reveal moves, the evidence ledger, the locks and flags. Start here if you are gating something. |
| **`INDEX.md`** | **Generated.** The coverage map: every story-bearing thing in the game and which page documents it. Never hand-edit. |

## Changing the story

The whole point of this folder is that you can change your mind. The loop:

1. **Edit the bible.** Change the character page, and whichever layer doc the
   change touches. State the new version as fact; don't record the old one.
2. **Cite content in backticks.** Every id you name — `email.rebecca`,
   `the-pipeline`, `evt.sadie-idle` — is tracked. This is what makes step 4
   able to help you.
3. **Change `season1.ts` to match.** The bible is the spec; the content module
   is the implementation.
4. **Run `npm run story`.** It reads both sides and tells you where they have
   drifted:
   - **ERROR** — the bible names content the game doesn't have. Either you
     haven't written that item yet, or you typo'd an id.
   - **warn** — the game ships something story-bearing that no page mentions.
     Usually means the bible is behind.
   - It rewrites `INDEX.md`, so you can always see what implements what.
5. **Run `npm run gen:seed`**, which validates the clue graph, runs the story
   sync, regenerates the seed and `docs/clue-graph.md`. Then `npm run verify`
   before you commit.

Mundane camouflage — the ~180 ungated flavor items — is exempt from coverage
on purpose. It exists to be unremarkable. Only gated, granting, locked, timed,
or arriving content has to be documented.

## The one convention

State everything as fact. Present tense, no provenance, no history of what it
used to be. If you change your mind, overwrite the sentence.

The single exception is **Open**, which marks something deliberately
undecided:

> **Open.** Whether Dr. Sparks was June's prescriber. If he was, the season
> becomes a revenge story instead of a discovery story.

Those are the only markers worth keeping, because they tell you where you
still have freedom, and they stop a later pass from accidentally answering a
question that is load-bearing precisely because it is unanswered. Each
character page ends with one.

## Names

Two names for one person is how a mystery leaks. The victim is **Casey
Taylor**. The company is **Prescott Pharmaceuticals**. The ally's handle is
**nightshift**, and every id that belongs to him uses that word. The OS is
**Horizons 95** and the story year is **1997** — that gap is deliberate.

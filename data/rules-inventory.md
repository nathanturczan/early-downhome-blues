# Melodic Motion Rules Inventory

Every bullet from `melodic-motion.md` mapped to an implementable rule ID.

## Rule Types

| Type | Description |
|------|-------------|
| weight | Multiplier on edge probability |
| penalty | Negative weight (discourage) |
| constraint | Hard limit (disallow if violated) |
| phrase-end | Applies at phrase boundaries |
| pitch-prior | Base probability for a pitch |
| within-complex | Microtonal behavior inside a complex |
| doc | Documentation only, not code |

## Phases

- **Phase 1:** Position-agnostic edge weighting (Issue #30)
- **Phase 2:** Phrase/line position awareness (Issue #33)
- **Phase 3:** Within-complex microtonal rules (Issue #34)

---

## General Principles (5 rules)

| ID | Bullet | Rule type | Phase |
|----|--------|-----------|-------|
| MM-GP-01 | Downward motion more frequent/gradual; leap up, descend stepwise; pause at complexes | weight | 1 |
| MM-GP-02 | Stepwise motion in one direction > pendular motion | penalty | 1 |
| MM-GP-03 | Repetition common, especially on 5th degree | weight | 1 |
| MM-GP-04 | Skips upward larger than downward | weight | 1 |
| MM-GP-05 | Descent rarely > thirds, except slurs to keynote C | constraint-ish | 1 |

## Pitch Usage: C and C' (4 rules)

| ID | Bullet | Rule type | Phase |
|----|--------|-----------|-------|
| MM-C-01 | C/C' are rest points at close of phrases b,d,f | phrase-end | 2 |
| MM-C-02 | C used with E complex above; usually approached from E complex | weight | 1–2 |
| MM-C-03 | C' used with E' above; differs: functions w/ G,A,Bb below | weight | 2 |
| MM-C-04 | Upward motion G→C' (sometimes through A) common at beginnings of a,c | weight | 2 |

## Pitch Usage: E and E' Complexes (6 rules)

| ID | Bullet | Rule type | Phase |
|----|--------|-----------|-------|
| MM-E-01 | E/E' complexes alternate with C/C' (but differ) | doc/priors | 1 |
| MM-E-02 | From C'→E' complex: rarely E' first; usually Eb' or E quarter-flat' first | within-complex weight | 2–3 |
| MM-E-03 | From C→E complex: often reach E directly; typical upward arpeggio to G or pendular back to C | weight | 2 |
| MM-E-04 | From C→Eb: little movement; Eb acts as pendulum; return to C | weight/constraint | 2 |
| MM-E-05 | E' complex almost never reached from above; E complex often reached from above (from G, sometimes via Gb/F) | weight | 2 |
| MM-E-06 | Uses summarized in Fig 52 | doc hook | — |

## Pitch Usage: G (6 rules)

| ID | Bullet | Rule type | Phase |
|----|--------|-----------|-------|
| MM-G-01 | G reached from C' above (often through B complex or A) | weight | 2 |
| MM-G-02 | G reached from below (from F, sometimes through F#/E), less from C, almost never from Eb | weight/constraint | 2 |
| MM-G-03 | G important: temp rest in some phrases; highest emphatic in others | pitch-prior + phrase role | 2 |
| MM-G-04 | Phrase e: as dominant root, pendular contrast w/ B or Bb (sometimes through A) | phrase-specific weight | 2 |
| MM-G-05 | G complex: G, Gb used for emphasis/contrast | within-complex weight | 3 |
| MM-G-06 | "Lean on" lowered variants for emphasis | within-complex weight | 3 |

## Scale Degrees E, G, F (5 rules)

| ID | Bullet | Rule type | Phase |
|----|--------|-----------|-------|
| MM-S-01 | E and G easy; tonic triad closes each line; weights song heavily | phrase/line-end bias | 2 |
| MM-S-02 | F near start of phrase c; root of subdominant triad typical for phrase c | phrase-specific weight | 2 |
| MM-S-03 | Singers prefer repeating phrase a melody against subdominant support (so F not common tone) | structure rule (repeat A at C) | 2 |
| MM-S-04 | F passing tone between E complex and G; F' almost never used with E' complex | weight/constraint | 2–3 |
| MM-S-05 | Uses summarized Fig 60 | doc hook | — |

## A and D (3 rules)

| ID | Bullet | Rule type | Phase |
|----|--------|-----------|-------|
| MM-AD-01 | A passing tone between G and Bb complex, or G and C' | weight | 2 |
| MM-AD-02 | D rare; pendulum w/ C | weight | 2 |
| MM-AD-03 | D' pendulum w/ E' complex; also passing E'→C' | weight | 2 |

## Bb Complex (6 rules)

| ID | Bullet | Rule type | Phase |
|----|--------|-----------|-------|
| MM-BB-01 | Bb complex like combo of G and E complexes | doc/priors | 2 |
| MM-BB-02 | Approached from C' above in a,c; less in b,d | phrase-specific weight | 2 |
| MM-BB-03 | In phrase e: highest + frequent; approached from G/A below | phrase-specific weight | 2 |
| MM-BB-04 | Leaning on B produces Bb slightly sharp or Bb | within-complex weight | 3 |
| MM-BB-05 | Sometimes lean on C' → C' slightly flat | within-complex weight | 3 |
| MM-BB-06 | (implicit) contrast behavior | within-complex weight | 3 |

## Motion Within E/E' Complexes (11 rules)

| ID | Bullet | Rule type | Phase |
|----|--------|-----------|-------|
| MM-EE-01 | 44 songs: counts of complex membership variants | stats/doc | — |
| MM-EE-02 | Motion within complexes varies but tendencies clear | doc | — |
| MM-EE-03 | Within E complex: slower, mostly upward | within-complex weight | 3 |
| MM-EE-04 | If reach E: signal for exit downward, usually directly to C | within-complex + exit | 3 |
| MM-EE-05 | From G above into E complex: typical G→Eb→(up through E)→down to C | path template weight | 3 |
| MM-EE-06 | Less movement within E than E' because E more important | priors | 3 |
| MM-EE-07 | E' 47 vs E 201 occurrences | pitch priors | 1–2 |
| MM-EE-08 | Eb' sung much more often than E' | pitch priors | 3 |
| MM-EE-09 | E basic in E complex; Eb' basic in E' complex | priors | 3 |
| MM-EE-10 | E' not a signal for direct exit to C'; release may be from any pitch in complex | within-complex exit | 3 |
| MM-EE-11 | Summarized Fig 63 | doc hook | — |

---

## Phase 1 Priority (Issue #30)

Implement these first to solve "random is unacceptable":

1. **MM-GP-01** - down bias + leap up/step down + pause at complexes
2. **MM-GP-02** - anti-pendular / anti-backtrack
3. **MM-GP-03** - repetition esp G
4. **MM-GP-04** - bigger skips up than down
5. **MM-GP-05** - limit big downward leaps except to C

Then add pitch priors from `figure45-stem-counts.csv` + `complexes.json`.

---

## Coverage Check

```js
const expectedMelodicMotionRuleIds = [
  'MM-GP-01', 'MM-GP-02', 'MM-GP-03', 'MM-GP-04', 'MM-GP-05',
  'MM-C-01', 'MM-C-02', 'MM-C-03', 'MM-C-04',
  'MM-E-01', 'MM-E-02', 'MM-E-03', 'MM-E-04', 'MM-E-05', 'MM-E-06',
  'MM-G-01', 'MM-G-02', 'MM-G-03', 'MM-G-04', 'MM-G-05', 'MM-G-06',
  'MM-S-01', 'MM-S-02', 'MM-S-03', 'MM-S-04', 'MM-S-05',
  'MM-AD-01', 'MM-AD-02', 'MM-AD-03',
  'MM-BB-01', 'MM-BB-02', 'MM-BB-03', 'MM-BB-04', 'MM-BB-05', 'MM-BB-06',
  'MM-EE-01', 'MM-EE-02', 'MM-EE-03', 'MM-EE-04', 'MM-EE-05', 'MM-EE-06',
  'MM-EE-07', 'MM-EE-08', 'MM-EE-09', 'MM-EE-10', 'MM-EE-11'
];
```

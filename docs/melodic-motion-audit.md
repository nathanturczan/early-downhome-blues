# Melodic Motion Rules Traceability Audit

**Generated:** 2026-02-26
**Purpose:** Map doctrine (Titon) to code implementation
**Source Documents:** `data/melodic-motion.md`, `data/rules-inventory.md`

## Legend

### Implementation Status
| Symbol | Meaning |
|--------|---------|
| ✅ | Active - rule encoded and affecting output |
| ⚙️ | Skeleton - rule ID exists, `applies()` returns false |
| ❌ | Not implemented - no code reference |
| 📚 | Doc-only - descriptive observation, not prescriptive |

### Classification
| Type | Description |
|------|-------------|
| **Hard** | Constraint: must not violate |
| **Soft** | Statistical tendency: weight adjustment |
| **Structural** | Position-dependent: phrase/line/stanza aware |
| **Descriptive** | Observation: not a rule to encode |
| **Microtonal** | Within-complex behavior: Phase 3 scope |

### Test Coverage
| Symbol | Meaning |
|--------|---------|
| ✅ | browserTest metric or sabotage toggle |
| ⚠️ | Indirect coverage (via contour/cadence stats) |
| ❌ | No specific test |

---

## General Principles (MM-GP-*)

| Code | Quote | Classification | Status | File:Function | Tested |
|------|-------|----------------|--------|---------------|--------|
| **MM-GP-01** | Downward motion more frequent/gradual; leap up, descend stepwise | Soft | ✅ Active | `weightedSelection.js:phase1Rules['MM-GP-01']` | ⚠️ contour |
| **MM-GP-02** | Stepwise motion > pendular motion | Soft | ✅ Active | `weightedSelection.js:phase1Rules['MM-GP-02']` | ❌ |
| **MM-GP-03** | Repetition common, especially on G | Soft | ✅ Active | `weightedSelection.js:phase1Rules['MM-GP-03']` | ⚠️ indirect |
| **MM-GP-04** | Skips upward larger than downward | Soft | ✅ Active | `weightedSelection.js:phase1Rules['MM-GP-04']` | ❌ |
| **MM-GP-05** | Descent rarely > thirds, except to C | Soft (was Hard) | ✅ Active | `weightedSelection.js:phase1Rules['MM-GP-05']` | ❌ |

**Notes:**
- MM-GP-01 through MM-GP-05 are the foundation rules, always active
- Weights tuned conservatively (1.1/1.0) to avoid "stuck low" behavior
- MM-GP-04 is position-aware: stronger leap allowance early in phrase

---

## Pitch Usage: C and C' (MM-C-*)

| Code | Quote | Classification | Status | File:Function | Tested |
|------|-------|----------------|--------|---------------|--------|
| **MM-C-01** | C/C' rest points at close of b,d,f | Structural | ✅ Active | `positionRules.js:phase2Rules['MM-C-01']` + `closure.js:getPitchWeight()` | ✅ cadence% |
| **MM-C-02** | C used with E complex above; approached from E complex | Soft | ⚙️ Skeleton | `melodicMotionRules.js` (applies=true, weight=1.0) | ❌ |
| **MM-C-03** | C' with E' above; functions w/ G,A,Bb below | Structural | ⚙️ Skeleton | `melodicMotionRules.js` (applies=false) | ❌ |
| **MM-C-04** | G→C' motion common at start of a,c | Structural | ✅ Active | `positionRules.js:phase2Rules['MM-C-04']` | ⚠️ indirect |

**Notes:**
- MM-C-01 is the core cadence rule - implemented in BOTH positionRules (weight) AND closure (probability)
- MM-C-01 has sabotage toggle: `window.sabotage.cad(true)`
- Closure layer adds probabilistic ending based on pitch weight (C=8 in cadential phrases)

---

## Pitch Usage: E and E' Complexes (MM-E-*)

| Code | Quote | Classification | Status | File:Function | Tested |
|------|-------|----------------|--------|---------------|--------|
| **MM-E-01** | E/E' complexes alternate with C/C' | Descriptive | ⚙️ Skeleton | `melodicMotionRules.js` (weight=1.0) | ❌ |
| **MM-E-02** | From C'→E': rarely E' first; usually Eb' | Microtonal | ⚙️ Skeleton | `melodicMotionRules.js` (constraint, applies=false) | ❌ |
| **MM-E-03** | From C→E: often E directly; arpeggio to G | Soft | ⚙️ Skeleton | `melodicMotionRules.js` (applies=false) | ❌ |
| **MM-E-04** | From C→Eb: little movement; pendulum | Soft | ⚙️ Skeleton | `melodicMotionRules.js` (applies=false) | ❌ |
| **MM-E-05** | E' rarely from above; E often from above | Soft | ✅ Active | `positionRules.js:phase2Rules['MM-E-05']` | ❌ |
| **MM-E-06** | Uses summarized in Fig 52 | Descriptive | 📚 Doc-only | `melodicMotionRules.js:docOnly` | N/A |

**Notes:**
- MM-E-05 is the only E-complex rule actively weighted
- Microtonal within-complex rules (MM-E-02, etc.) are Phase 3 scope
- Network topology already encodes E→C connectivity

---

## Pitch Usage: G (MM-G-*)

| Code | Quote | Classification | Status | File:Function | Tested |
|------|-------|----------------|--------|---------------|--------|
| **MM-G-01** | G reached from C' above (through B or A) | Soft | ⚙️ Skeleton | `melodicMotionRules.js` (applies=false) | ❌ |
| **MM-G-02** | G reached from below (F), less from C, never Eb | Soft | ⚙️ Skeleton | `melodicMotionRules.js` (applies=false) | ❌ |
| **MM-G-03** | G: temp rest in some phrases; emphatic in others | Structural | ⚙️ Skeleton | `melodicMotionRules.js` (applies=false) | ❌ |
| **MM-G-04** | Phrase e: G pendular with B/Bb | Structural | ✅ Active | `positionRules.js:phase2Rules['MM-G-04']` | ❌ |
| **MM-G-05** | G complex: lowered variants for emphasis | Microtonal | ⚙️ Skeleton | `melodicMotionRules.js` (constraint, applies=false) | ❌ |
| **MM-G-06** | Lean on lowered variants | Microtonal | ⚙️ Skeleton | `melodicMotionRules.js` (constraint, applies=false) | ❌ |

**Notes:**
- MM-G-04 actively encourages G↔Bb oscillation in phrase e
- G as hub note is implicit in network topology (most connections)
- Closure layer gives G moderate weight (3-6 depending on phrase)

---

## Scale Degrees E, G, F (MM-S-*)

| Code | Quote | Classification | Status | File:Function | Tested |
|------|-------|----------------|--------|---------------|--------|
| **MM-S-01** | Tonic triad (C,E,G) closes each line | Structural | ✅ Active | `positionRules.js:phase2Rules['MM-S-01']` | ⚠️ cadence |
| **MM-S-02** | F near start of phrase c | Structural | ✅ Active | `positionRules.js:phase2Rules['MM-S-02']` | ❌ |
| **MM-S-03** | Repeat phrase a melody against subdominant | Structural | ✅ Active | `phraseMemory.js` (repetition c→a) | ✅ rep% |
| **MM-S-04** | F passing tone E↔G; F' never with E' | Soft | ⚙️ Skeleton | `melodicMotionRules.js` (applies=false) | ❌ |
| **MM-S-05** | Uses summarized Fig 60 | Descriptive | 📚 Doc-only | `melodicMotionRules.js:docOnly` | N/A |

**Notes:**
- MM-S-03 is implemented via phrase memory freezing/replay
- Repetition has sabotage toggle: `window.sabotage.rep(true)`

---

## A and D (MM-AD-*)

| Code | Quote | Classification | Status | File:Function | Tested |
|------|-------|----------------|--------|---------------|--------|
| **MM-AD-01** | A passing tone G↔Bb, G↔C' | Soft | ✅ Active | `positionRules.js:phase2Rules['MM-AD-01']` | ❌ |
| **MM-AD-02** | D rare; pendulum with C | Soft | ⚙️ Skeleton | `melodicMotionRules.js` (applies=false) | ❌ |
| **MM-AD-03** | D' pendulum with E'; passing E'→C' | Soft | ⚙️ Skeleton | `melodicMotionRules.js` (applies=false) | ❌ |

**Notes:**
- A is already rare in network (low connectivity)
- D rules may be implicitly handled by network topology

---

## Bb Complex (MM-BB-*)

| Code | Quote | Classification | Status | File:Function | Tested |
|------|-------|----------------|--------|---------------|--------|
| **MM-BB-01** | Bb complex like G + E combined | Descriptive | ⚙️ Skeleton | `melodicMotionRules.js` (applies=false) | ❌ |
| **MM-BB-02** | Bb from C' above in a,c; less in b,d | Structural | ✅ Active | `positionRules.js:phase2Rules['MM-BB-02']` | ❌ |
| **MM-BB-03** | Phrase e: Bb highest/frequent; from G/A | Structural | ✅ Active | `positionRules.js:phase2Rules['MM-BB-03']` | ❌ |
| **MM-BB-04** | Leaning on B → Bb slightly sharp | Microtonal | ⚙️ Skeleton | `melodicMotionRules.js` (constraint, applies=false) | ❌ |
| **MM-BB-05** | Lean on C' → C' slightly flat | Microtonal | ⚙️ Skeleton | `melodicMotionRules.js` (constraint, applies=false) | ❌ |
| **MM-BB-06** | Contrast behavior | Microtonal | ⚙️ Skeleton | `melodicMotionRules.js` (constraint, applies=false) | ❌ |

**Notes:**
- MM-BB-02 and MM-BB-03 handle phrase-specific Bb behavior
- Microtonal rules (BB-04, 05, 06) are Phase 3 scope

---

## Motion Within E/E' Complexes (MM-EE-*)

| Code | Quote | Classification | Status | File:Function | Tested |
|------|-------|----------------|--------|---------------|--------|
| **MM-EE-01** | 44 songs: complex membership variants | Descriptive | 📚 Doc-only | `melodicMotionRules.js:docOnly` | N/A |
| **MM-EE-02** | Motion within complexes varies | Descriptive | 📚 Doc-only | `melodicMotionRules.js:docOnly` | N/A |
| **MM-EE-03** | Within E: slower, mostly upward | Microtonal | ⚙️ Skeleton | `melodicMotionRules.js` (constraint, applies=false) | ❌ |
| **MM-EE-04** | E signals exit to C | Structural | ⚙️ Skeleton | `melodicMotionRules.js` (constraint, applies=false) | ❌ |
| **MM-EE-05** | From G→E complex: G→Eb→E→C | Soft | ⚙️ Skeleton | `melodicMotionRules.js` (applies=false) | ❌ |
| **MM-EE-06** | Less movement in E than E' | Descriptive | ⚙️ Skeleton | `melodicMotionRules.js:pitchPrior` (applies=false) | ❌ |
| **MM-EE-07** | E' 47 vs E 201 occurrences | Soft (prior) | ⚙️ Skeleton | `melodicMotionRules.js:pitchPrior` (applies=false) | ❌ |
| **MM-EE-08** | Eb' more common than E' | Soft (prior) | ⚙️ Skeleton | `melodicMotionRules.js:pitchPrior` (applies=false) | ❌ |
| **MM-EE-09** | E basic in E complex; Eb' basic in E' | Soft (prior) | ⚙️ Skeleton | `melodicMotionRules.js:pitchPrior` (applies=false) | ❌ |
| **MM-EE-10** | E' not a signal for exit to C' | Microtonal | ⚙️ Skeleton | `melodicMotionRules.js` (constraint, applies=false) | ❌ |
| **MM-EE-11** | Summarized Fig 63 | Descriptive | 📚 Doc-only | `melodicMotionRules.js:docOnly` | N/A |

**Notes:**
- All MM-EE rules are either Phase 3 (microtonal) or descriptive
- Pitch priors could be encoded from `figure45-stem-counts.csv` data

---

## Non-MM Rules (Implemented but not in Titon mapping)

| Rule | Description | File | Status | Tested |
|------|-------------|------|--------|--------|
| **CONTOUR** | IB/IA/IIB macro contour shaping | `positionRules.js:phase2Rules['CONTOUR']` | ✅ Active | ✅ contour stats |
| **PHRASE-START-LIFT** | Upward bias at phrase starts | `positionRules.js:phase2Rules['PHRASE-START-LIFT']` | ✅ Active | ⚠️ indirect |
| **Closure weights** | Pitch/direction/contour/harmony multipliers | `closure.js:evaluateClosure()` | ✅ Active | ✅ closure% |
| **Phrase repetition** | c→a, d→b, f→b melody replay | `phraseMemory.js` | ✅ Active | ✅ rep% |
| **Harmony splits** | Phrase e: V→IV, Phrase f: sometimes V | `stanza.js:getChordForPosition()` | ✅ Active | ❌ |

---

## Summary Statistics

### By Status
| Status | Count |
|--------|-------|
| ✅ Active | 15 |
| ⚙️ Skeleton | 22 |
| 📚 Doc-only | 5 |
| **Total** | 42 |

### By Classification
| Classification | Count | Active |
|----------------|-------|--------|
| Soft (weight) | 18 | 7 |
| Structural (position-aware) | 11 | 8 |
| Microtonal (Phase 3) | 9 | 0 |
| Descriptive (doc-only) | 4 | 0 |

### Test Coverage
| Coverage | Count |
|----------|-------|
| ✅ Direct test | 4 |
| ⚠️ Indirect coverage | 5 |
| ❌ No test | 28 |
| N/A (doc-only) | 5 |

---

## Action Items

### Well-Covered (no action needed)
- ✅ MM-GP-01 through MM-GP-05 (foundation rules)
- ✅ MM-C-01 (cadence to C)
- ✅ MM-C-04 (G→C' at phrase start)
- ✅ CONTOUR (macro shaping)
- ✅ Phrase repetition (c/d/f replay)

### Partially Covered (could enhance)
- ⚠️ MM-E-05 (E complex from above) - implemented but not tested
- ⚠️ MM-G-04 (G↔Bb in phrase e) - implemented but not tested
- ⚠️ MM-S-02 (F in phrase c) - implemented but not tested

### Out of Scope (Phase 3)
- MM-E-02, MM-G-05, MM-G-06, MM-BB-04, MM-BB-05, MM-BB-06
- MM-EE-03, MM-EE-04, MM-EE-10
- All microtonal/within-complex rules

### Not Implemented (candidates for Phase 2 completion)
- MM-C-02, MM-C-03 (C/E complex relationships)
- MM-E-03, MM-E-04 (C→E complex behavior)
- MM-G-01, MM-G-02, MM-G-03 (G approach patterns)
- MM-AD-02, MM-AD-03 (D behavior)
- MM-EE-07, MM-EE-08, MM-EE-09 (pitch priors from data)

---

## Verification Notes

Last audit: 2026-02-26

To verify rule coverage programmatically:
```javascript
import { validateMelodicMotionRuleCoverage } from './js/rules/melodicMotionRules.js';
const report = validateMelodicMotionRuleCoverage({ throwOnError: false });
console.log(report);
```

To run browser test:
```javascript
runBrowserTest(100);
```

Expected test ranges:
- Repetition: ~80-90%
- Cadence on C: ~55-70% for b/d/f
- Avg phrase length: 6-9 notes

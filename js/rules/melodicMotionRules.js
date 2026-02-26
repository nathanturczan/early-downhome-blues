// js/rules/melodicMotionRules.js
//
// Skeleton rulebook for melodic-motion.md
// - Every bullet gets a stable ID for auditable coverage.
// - Rules are separated by "kind" so you can run them in distinct pipelines.
// - Fill in `applies()` and `weight()`/`allow()`/`endProbability()` incrementally.
//
// NOTE: Keep IDs stable once referenced in logs/issues/tests.

export const expectedMelodicMotionRuleIds = [
  // General Principles
  "MM-GP-01",
  "MM-GP-02",
  "MM-GP-03",
  "MM-GP-04",
  "MM-GP-05",

  // Pitch Usage: C and C'
  "MM-C-01",
  "MM-C-02",
  "MM-C-03",
  "MM-C-04",

  // Pitch Usage: E and E' complexes
  "MM-E-01",
  "MM-E-02",
  "MM-E-03",
  "MM-E-04",
  "MM-E-05",
  "MM-E-06",

  // Pitch Usage: G
  "MM-G-01",
  "MM-G-02",
  "MM-G-03",
  "MM-G-04",
  "MM-G-05",
  "MM-G-06",

  // Scale degrees E, G, F
  "MM-S-01",
  "MM-S-02",
  "MM-S-03",
  "MM-S-04",
  "MM-S-05",

  // A and D
  "MM-AD-01",
  "MM-AD-02",
  "MM-AD-03",

  // Bb complex
  "MM-BB-01",
  "MM-BB-02",
  "MM-BB-03",
  "MM-BB-04",
  "MM-BB-05",
  "MM-BB-06",

  // Motion within E/E' complexes
  "MM-EE-01",
  "MM-EE-02",
  "MM-EE-03",
  "MM-EE-04",
  "MM-EE-05",
  "MM-EE-06",
  "MM-EE-07",
  "MM-EE-08",
  "MM-EE-09",
  "MM-EE-10",
  "MM-EE-11",
];

/**
 * Shared types
 *
 * ctx: generator context (you define)
 * edge: candidate transition (you define)
 *
 * Suggested edge shape:
 *   {
 *     from: "E",
 *     to: "G",
 *     intervalSemitones: 3,      // toMidi - fromMidi (or approximate)
 *     direction: -1|0|1,         // -1 down, 0 same, 1 up
 *     fromComplex: "E"|"G"|"B"|"E'"|"Bb"|null,
 *     toComplex:   "E"|"G"|"B"|"E'"|"Bb"|null,
 *   }
 *
 * Suggested ctx shape:
 *   {
 *     currentNote: "E",
 *     previousNote: "G",
 *     recentNotes: ["..."],       // for loop detection
 *     phrase: { index: "a"|"b"|"c"|"d"|"e"|"f", noteCount: 0, ... },
 *     line: { index: 1|2|3 },
 *     stanza: { ... },
 *     isPhraseStart: boolean,
 *     isPhraseEndWindow: boolean,
 *     // etc
 *   }
 */

/**
 * Edge-weight rules:
 * - Return a multiplier >= 0.0
 * - Use 1.0 for neutral, >1 boosts, <1 penalizes
 * - Avoid returning 0 unless it’s truly disallowed (that’s a constraint rule)
 */
export const melodicMotionEdgeWeightRules = [
  // =========================
  // General Principles
  // =========================
  {
    id: "MM-GP-01",
    text:
      "Downward motion more frequent and gradual; leap up, descend stepwise; pause at complexes.",
    phase: 1,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => true,
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-GP-02",
    text: "Stepwise motion in one direction > pendular motion.",
    phase: 1,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => true,
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-GP-03",
    text: "Repetition common, especially on the 5th degree (G).",
    phase: 1,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => true,
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-GP-04",
    text: "Skips upward are larger than skips downward.",
    phase: 1,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => true,
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-GP-05",
    text: "Descent rarely > thirds, except slurs to keynote C.",
    phase: 1,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => true,
    weight: (_edge, _ctx) => 1.0,
  },

  // =========================
  // Pitch Usage: C and C'
  // =========================
  {
    id: "MM-C-02",
    text: "C used with E complex above; usually approached from E complex.",
    phase: 1,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => true,
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-C-03",
    text: "C' used with E' above; also functions with G, A, Bb below.",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false, // likely needs position awareness
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-C-04",
    text:
      "Upward motion G→C' (sometimes through A) common at beginnings of phrases a and c.",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false, // needs phrase start
    weight: (_edge, _ctx) => 1.0,
  },

  // =========================
  // Pitch Usage: E and E' complexes
  // =========================
  {
    id: "MM-E-01",
    text: "E/E' complexes alternate with C/C' (but differ).",
    phase: 1,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => true,
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-E-03",
    text:
      "From C→E complex: often reach E directly; typical upward arpeggio to G or pendular back to C.",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false, // likely needs knowing you’re leaving C
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-E-04",
    text: "From C→Eb: little movement; Eb acts as pendulum; return to C.",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false,
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-E-05",
    text:
      "E' complex almost never reached from above; E complex often reached from above (from G, sometimes via Gb/F).",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false, // needs complex awareness
    weight: (_edge, _ctx) => 1.0,
  },

  // =========================
  // Pitch Usage: G
  // =========================
  {
    id: "MM-G-01",
    text: "G reached from C' above (often through B complex or A).",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false,
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-G-02",
    text:
      "G reached from below (from F, sometimes through F#/E), less from C, almost never from Eb.",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false,
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-G-03",
    text:
      "G important: temporary rest in some phrases; highest emphatic in others.",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false, // phrase role
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-G-04",
    text:
      "Phrase e: as dominant root, pendular contrast with B or Bb (sometimes through A).",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false, // phrase == e
    weight: (_edge, _ctx) => 1.0,
  },

  // =========================
  // Scale degrees E, G, F
  // =========================
  {
    id: "MM-S-01",
    text:
      "E and G easy; tonic triad closes each line; weights song heavily.",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false, // line ending knowledge
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-S-02",
    text:
      "F near start of phrase c; root of subdominant triad typical for phrase c.",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false, // phrase == c start
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-S-03",
    text:
      "Singers prefer repeating phrase a melody against subdominant support (so F not common tone).",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false, // depends on implementing repetition A→C
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-S-04",
    text:
      "F passing tone between E complex and G; F' almost never used with E' complex.",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false, // needs complex awareness + octave
    weight: (_edge, _ctx) => 1.0,
  },

  // =========================
  // A and D
  // =========================
  {
    id: "MM-AD-01",
    text: "A passing tone between G and Bb complex, or G and C'.",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false,
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-AD-02",
    text: "D rare; pendulum with C.",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false,
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-AD-03",
    text: "D' pendulum with E' complex; also passing E'→C'.",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false,
    weight: (_edge, _ctx) => 1.0,
  },

  // =========================
  // Bb complex
  // =========================
  {
    id: "MM-BB-01",
    text: "Bb complex like a combination of G and E complexes.",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false, // mostly doc + priors
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-BB-02",
    text:
      "Approached from C' above in phrases a,c; less in b,d.",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false, // phrase awareness
    weight: (_edge, _ctx) => 1.0,
  },
  {
    id: "MM-BB-03",
    text:
      "In phrase e: Bb is highest + frequent; approached from G/A below.",
    phase: 2,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false, // phrase == e
    weight: (_edge, _ctx) => 1.0,
  },

  // =========================
  // Motion within E/E' complexes (macro tendencies; see microtonal pipeline for finer rules)
  // =========================
  {
    id: "MM-EE-05",
    text:
      "From G above into E complex: typical G→Eb→(up through E)→down to C.",
    phase: 3,
    kind: "edgeWeight",
    applies: (_edge, _ctx) => false, // pattern-level, optional
    weight: (_edge, _ctx) => 1.0,
  },
];

/**
 * Hard/soft constraints:
 * - Use allow(edge, ctx) => true/false
 * - Keep constraints minimal; prefer weights unless truly illegal.
 */
export const melodicMotionConstraintRules = [
  {
    id: "MM-E-02",
    text:
      "From C'→E' complex: rarely E' first; usually Eb' or E quarter-flat' first.",
    phase: 3,
    kind: "constraint",
    applies: (_edge, _ctx) => false, // needs complex + microtonal variant detection
    allow: (_edge, _ctx) => true,
  },
  {
    id: "MM-G-05",
    text:
      "G complex includes lowered variants used for emphasis/contrast (microtonal behavior).",
    phase: 3,
    kind: "constraint",
    applies: (_edge, _ctx) => false,
    allow: (_edge, _ctx) => true,
  },
  {
    id: "MM-G-06",
    text: "Lean on lowered variants for emphasis.",
    phase: 3,
    kind: "constraint",
    applies: (_edge, _ctx) => false,
    allow: (_edge, _ctx) => true,
  },
  {
    id: "MM-BB-04",
    text: "Leaning on B produces Bb slightly sharp or Bb (microtonal nuance).",
    phase: 3,
    kind: "constraint",
    applies: (_edge, _ctx) => false,
    allow: (_edge, _ctx) => true,
  },
  {
    id: "MM-BB-05",
    text: "Sometimes lean on C' → C' slightly flat (microtonal nuance).",
    phase: 3,
    kind: "constraint",
    applies: (_edge, _ctx) => false,
    allow: (_edge, _ctx) => true,
  },
  {
    id: "MM-BB-06",
    text: "Bb complex contrast behavior (microtonal/expressive nuances).",
    phase: 3,
    kind: "constraint",
    applies: (_edge, _ctx) => false,
    allow: (_edge, _ctx) => true,
  },

  // Motion within complexes: microtonal exit/entry constraints (placeholders)
  {
    id: "MM-EE-03",
    text: "Within E complex: slower, mostly upward (microtonal internal motion).",
    phase: 3,
    kind: "constraint",
    applies: (_edge, _ctx) => false,
    allow: (_edge, _ctx) => true,
  },
  {
    id: "MM-EE-04",
    text:
      "If reach E: signal for exit downward, usually directly to C.",
    phase: 3,
    kind: "constraint",
    applies: (_edge, _ctx) => false,
    allow: (_edge, _ctx) => true,
  },
  {
    id: "MM-EE-10",
    text:
      "E' is not a signal for direct exit to C'; release may be from any pitch in complex.",
    phase: 3,
    kind: "constraint",
    applies: (_edge, _ctx) => false,
    allow: (_edge, _ctx) => true,
  },
];

/**
 * Phrase-ending rules:
 * - Return an additive probability in [0..1] or a multiplier, your choice.
 * - Keep separate from edge scoring to avoid tangling concerns.
 */
export const melodicMotionPhraseEndRules = [
  {
    id: "MM-C-01",
    text: "C and C' are rest points at the close of phrases b, d, f.",
    phase: 2,
    kind: "phraseEnd",
    applies: (_ctx) => false, // needs phrase index awareness
    endProbability: (_ctx) => 0.0,
  },
];

/**
 * Pitch priors / static weights (optional pipeline):
 * - Used as base weights for selecting target notes independent of edge features.
 * - You can combine these with complexes.json and figure45-stem-counts.csv later.
 */
export const melodicMotionPitchPriorRules = [
  {
    id: "MM-EE-07",
    text: "E' occurs far less often than E (frequency prior).",
    phase: 1,
    kind: "pitchPrior",
    applies: (_note, _ctx) => false, // wire in when note frequency data is loaded
    prior: (_note, _ctx) => 1.0,
  },
  {
    id: "MM-EE-08",
    text: "Eb' sung much more often than E' (frequency prior).",
    phase: 3,
    kind: "pitchPrior",
    applies: (_note, _ctx) => false,
    prior: (_note, _ctx) => 1.0,
  },
  {
    id: "MM-EE-09",
    text: "E basic in E complex; Eb' basic in E' complex (frequency prior).",
    phase: 3,
    kind: "pitchPrior",
    applies: (_note, _ctx) => false,
    prior: (_note, _ctx) => 1.0,
  },
  {
    id: "MM-EE-06",
    text: "Less movement within E than E' because E more important (prior).",
    phase: 3,
    kind: "pitchPrior",
    applies: (_note, _ctx) => false,
    prior: (_note, _ctx) => 1.0,
  },
];

/**
 * Doc-only / bookkeeping rules:
 * - These exist so coverage can include "Figure summarized" bullets without forcing code.
 * - You can choose to omit these from runtime pipelines, but keep them for audit.
 */
export const melodicMotionDocOnlyRules = [
  { id: "MM-E-06", text: "Uses summarized in Fig 52.", phase: 0, kind: "docOnly" },
  { id: "MM-S-05", text: "Uses summarized Fig 60.", phase: 0, kind: "docOnly" },
  { id: "MM-EE-01", text: "44 songs: counts of complex membership variants.", phase: 0, kind: "docOnly" },
  { id: "MM-EE-02", text: "Motion within complexes varies but tendencies clear.", phase: 0, kind: "docOnly" },
  { id: "MM-EE-11", text: "Summarized Fig 63.", phase: 0, kind: "docOnly" },
];

/**
 * Coverage helpers
 */
export function getAllMelodicMotionRulesFlat() {
  return [
    ...melodicMotionEdgeWeightRules,
    ...melodicMotionConstraintRules,
    ...melodicMotionPhraseEndRules,
    ...melodicMotionPitchPriorRules,
    ...melodicMotionDocOnlyRules,
  ];
}

export function validateMelodicMotionRuleCoverage({ throwOnError = false } = {}) {
  const all = getAllMelodicMotionRulesFlat();
  const seen = new Map();

  for (const r of all) {
    if (!r?.id) continue;
    seen.set(r.id, (seen.get(r.id) || 0) + 1);
  }

  const missing = expectedMelodicMotionRuleIds.filter((id) => !seen.has(id));
  const duplicates = Array.from(seen.entries())
    .filter(([, count]) => count > 1)
    .map(([id, count]) => ({ id, count }));

  const report = { missing, duplicates, totalRules: all.length };

  if (throwOnError && (missing.length || duplicates.length)) {
    const parts = [];
    if (missing.length) parts.push(`Missing: ${missing.join(", ")}`);
    if (duplicates.length)
      parts.push(
        `Duplicates: ${duplicates.map((d) => `${d.id}×${d.count}`).join(", ")}`
      );
    throw new Error(`Melodic motion rule coverage failed. ${parts.join(" | ")}`);
  }

  return report;
}
// js/rules/positionRules.js
//
// Phase 2: Position-aware melodic motion rules
// These rules apply weights based on current position in the stanza

import { frequencies, adjacency } from '../network.js';

/**
 * Convert frequency to pitch class (0-11)
 */
function getPitchClass(note) {
  const freq = frequencies[note];
  if (!freq) return null;
  const midi = 69 + 12 * Math.log2(freq / 440);
  return Math.round(midi) % 12;
}

// Pitch class constants
const PC_C = 0;
const PC_D = 2;
const PC_E = 4;
const PC_F = 5;
const PC_G = 7;
const PC_A = 9;
const PC_Bb = 10;
const PC_B = 11;

/**
 * Check if note is C (any octave)
 */
function isC(note) {
  return note === "c'" || note === "c''";
}

/**
 * Check if a note can reach C in one step
 */
function canNoteReachC(note) {
  const neighbors = adjacency[note] || [];
  return neighbors.some(n => isC(n));
}

/**
 * Check if note is G (any octave)
 */
function isG(note) {
  return note === "g'" || note === "g''";
}

/**
 * Check if note is F
 */
function isF(note) {
  return note === "f'" || note === "f''";
}

/**
 * Check if note is in Bb complex (Bb or B)
 */
function isBbComplex(note) {
  const pc = getPitchClass(note);
  return pc === PC_Bb || pc === PC_B;
}

/**
 * Check if note is in E complex (Eb, Eqf, E)
 */
function isEComplex(note) {
  // LilyPond: ees = Eb, eeh = E quarter-flat, e = E
  return note.startsWith('ee') || note.startsWith("e'") || note === "e''";
}

// === Contour Configuration ===
// Based on Titon's Figure 69 contour classifications

// Contour multiplier strengths (shared)
const CONTOUR_BOOST = 1.15;
const CONTOUR_PENALTY = 0.95;

// IB: Rise-then-fall (inverted bowl) - most common (46%)
// F=L, H>S: Start, rise to highest, fall to lowest/final
const IB_CROSSOVER = 0.45;

// IA: Pure descent (8%)
// S=H, F=L: Start at highest, fall throughout to lowest/final
// No crossover - always falling

// IIB: Rising overall (5%)
// S=L, H>F: Start at lowest, rise to peak (~60%), fall but end above start
const IIB_PEAK = 0.60;

/**
 * Calculate overall progress through stanza (0 to 1)
 */
function getStanzaProgress(position) {
  const phraseIndex = position.phraseIndex || 0;
  const step = position.stepInPhrase || 0;
  const stepsPerPhrase = position.stepsPerPhrase || 8;
  const totalSteps = 6 * stepsPerPhrase; // 6 phrases per stanza
  const currentStep = phraseIndex * stepsPerPhrase + step;
  return currentStep / totalSteps;
}

/**
 * Check if we're in the cadence window (last 2 notes of b/d/f)
 */
function isInCadenceWindow(position) {
  const phrase = position.phrase;
  if (phrase !== 'b' && phrase !== 'd' && phrase !== 'f') return false;
  const stepsRemaining = position.stepsPerPhrase - position.stepInPhrase;
  return stepsRemaining <= 2;
}

/**
 * Check if we're in phrase-start lift window (first 2 notes of a/b/e)
 */
function isInPhraseStartLiftWindow(position) {
  const phrase = position.phrase;
  if (phrase === 'c' || phrase === 'd' || phrase === 'f') return false; // repeated phrases
  return position.stepInPhrase <= 1;
}

/**
 * Phase 2 position-aware rules
 * Each rule takes (edge, ctx, position) and returns a weight multiplier
 */
export const phase2Rules = {
  /**
   * CONTOUR: Macro contour bias across the stanza
   * Polymorphic based on position.contourType (IB, IA, IIB)
   *
   * IB (inverted bowl): rise first half, fall second half
   * IA (pure descent): fall throughout
   * IIB (rising): rise to peak, fall but stay high
   *
   * Gated: only when phrasing ON, not during repetition/cadence/phrase-start-lift
   */
  'CONTOUR': (edge, ctx, position) => {
    // Skip if phrasing is disabled
    if (!position.phrasingEnabled) return 1.0;

    // Skip during repetition playback (c/d/f bypass generator anyway, but be explicit)
    if (position.isRepeating) return 1.0;

    // Skip in cadence window (let cadence rules dominate)
    if (isInCadenceWindow(position)) return 1.0;

    // Skip in phrase-start lift window (let lift rule dominate)
    if (isInPhraseStartLiftWindow(position)) return 1.0;

    const progress = getStanzaProgress(position);
    const contourType = position.contourType || 'IB';

    // Determine direction preference based on contour type and progress
    let preferUp = false;
    let preferDown = false;

    switch (contourType) {
      case 'IB':
        // Inverted bowl: rise in first half, fall in second half
        if (progress < IB_CROSSOVER) {
          preferUp = true;
        } else {
          preferDown = true;
        }
        break;

      case 'IA':
        // Pure descent: always prefer downward motion
        preferDown = true;
        break;

      case 'IIB':
        // Rising overall: rise to peak, then gentle fall (but still high)
        if (progress < IIB_PEAK) {
          preferUp = true;
        } else {
          // After peak: slight fall preference but weaker than IB
          preferDown = true;
        }
        break;

      default:
        // Fallback to IB behavior
        if (progress < IB_CROSSOVER) {
          preferUp = true;
        } else {
          preferDown = true;
        }
    }

    // Apply boost/penalty based on preference and edge direction
    if (edge.direction > 0) {
      // Upward motion
      return preferUp ? CONTOUR_BOOST : CONTOUR_PENALTY;
    } else if (edge.direction < 0) {
      // Downward motion
      return preferDown ? CONTOUR_BOOST : CONTOUR_PENALTY;
    }

    // Same note - no change
    return 1.0;
  },

  /**
   * PHRASE-START-LIFT: Strong upward bias for first 2 notes of phrase
   * Creates the "rise" in IB/IIB contours before falling to cadence
   * Only applies to a/b/e (not repeated phrases c/d/f)
   * Skipped for IA contour (pure descent - no rising)
   * Gated by phrasingEnabled (passed via position.phrasingEnabled)
   */
  'PHRASE-START-LIFT': (edge, ctx, position) => {
    // Skip if phrasing is disabled
    if (!position.phrasingEnabled) return 1.0;

    // Skip for IA contour (pure descent - should not rise at phrase starts)
    if (position.contourType === 'IA') return 1.0;

    // Only apply to non-repeated phrases (a, b, e)
    const phrase = position.phrase;
    if (phrase === 'c' || phrase === 'd' || phrase === 'f') return 1.0;

    const step = position.stepInPhrase;
    if (step > 1) return 1.0;  // Only apply to first 2 notes

    // Upward motion gets strong boost early in phrase
    if (edge.direction > 0) {
      if (step === 0) return 1.80;  // First note: very strong lift
      if (step === 1) return 1.35;  // Second note: moderate lift
    }
    return 1.0;
  },

  /**
   * MM-C-01: C/C' are rest points at close of phrases b, d, f
   * VERY strong bias - applied last, not undone by other rules
   * Only applies to cadential phrases (b, d, f), last 2 notes
   * Gated by phrasingEnabled (passed via position.phrasingEnabled)
   */
  'MM-C-01': (edge, ctx, position) => {
    // Skip if phrasing is disabled
    if (!position.phrasingEnabled) return 1.0;

    // Only apply to cadential phrases (b, d, f)
    const phrase = position.phrase;
    if (phrase !== 'b' && phrase !== 'd' && phrase !== 'f') return 1.0;

    const stepsRemaining = position.stepsPerPhrase - position.stepInPhrase;

    // Only apply to last 2 notes
    if (stepsRemaining > 2) return 1.0;

    let weight = 1.0;

    // Direct C/C' bias
    if (isC(edge.to)) {
      if (stepsRemaining <= 1) weight *= 50.0;       // Final note
      else if (stepsRemaining <= 2) weight *= 12.0;  // Penultimate
    }

    // Boost notes that can reach C (approach tones) - critical for reachability
    if (!isC(edge.to) && canNoteReachC(edge.to)) {
      weight *= 6.0;  // Strong boost to ensure C becomes reachable
    }

    return weight;
  },

  /**
   * MM-C-04: Upward motion G→C' common at beginnings of a, c
   */
  'MM-C-04': (edge, ctx, position) => {
    const phrase = position.phrase;
    if (phrase !== 'a' && phrase !== 'c') return 1.0;
    if (!position.isNearPhraseStart) return 1.0;

    // At start of a or c: boost G→C' motion
    if (isG(ctx.currentNote) && edge.to === "c''") {
      return 1.8;
    }
    // Also boost upward motion generally
    if (edge.direction > 0) {
      return 1.2;
    }
    return 1.0;
  },

  /**
   * MM-S-02: F near start of phrase c (subdominant context)
   */
  'MM-S-02': (edge, ctx, position) => {
    if (position.phrase !== 'c') return 1.0;
    if (position.stepInPhrase > 3) return 1.0;

    // Early in phrase c: boost F
    if (isF(edge.to)) {
      return 1.5;
    }
    return 1.0;
  },

  /**
   * MM-G-04: Phrase e: G pendular contrast with B or Bb
   */
  'MM-G-04': (edge, ctx, position) => {
    if (position.phrase !== 'e') return 1.0;

    // In phrase e: encourage G ↔ Bb complex oscillation
    if (isG(ctx.currentNote) && isBbComplex(edge.to)) {
      return 1.6;
    }
    if (isBbComplex(ctx.currentNote) && isG(edge.to)) {
      return 1.6;
    }
    // Also boost Bb complex generally in phrase e
    if (isBbComplex(edge.to)) {
      return 1.3;
    }
    return 1.0;
  },

  /**
   * MM-BB-02: Bb complex approached from C' above in phrases a, c; less in b, d
   */
  'MM-BB-02': (edge, ctx, position) => {
    const phrase = position.phrase;

    if (!isBbComplex(edge.to)) return 1.0;

    // From C' to Bb complex
    if (ctx.currentNote === "c''") {
      if (phrase === 'a' || phrase === 'c') {
        return 1.5; // Boost in a, c
      }
      if (phrase === 'b' || phrase === 'd') {
        return 0.8; // Slight penalty in b, d
      }
    }
    return 1.0;
  },

  /**
   * MM-BB-03: In phrase e: Bb highest + frequent; approached from G/A below
   */
  'MM-BB-03': (edge, ctx, position) => {
    if (position.phrase !== 'e') return 1.0;

    if (!isBbComplex(edge.to)) return 1.0;

    // Boost Bb when coming from G or A
    const fromPC = getPitchClass(ctx.currentNote);
    if (fromPC === PC_G || fromPC === PC_A) {
      return 1.7;
    }
    return 1.2; // General boost in phrase e
  },

  /**
   * MM-S-01: Tonic triad (C, E, G) closes each line
   * Applies at phrases b, d, f
   */
  'MM-S-01': (edge, ctx, position) => {
    if (!position.traits?.isLineEnd) return 1.0;
    if (!position.isNearPhraseEnd) return 1.0;

    // At end of line: boost tonic triad notes
    const toPC = getPitchClass(edge.to);
    if (toPC === PC_C || toPC === PC_E || toPC === PC_G) {
      return 1.4;
    }
    return 1.0;
  },

  /**
   * MM-AD-01: A is passing tone between G and Bb complex, or G and C'
   */
  'MM-AD-01': (edge, ctx, position) => {
    const toPC = getPitchClass(edge.to);
    if (toPC !== PC_A) return 1.0;

    // A is good when coming from or going to G, Bb, or C'
    const fromPC = getPitchClass(ctx.currentNote);
    if (fromPC === PC_G || fromPC === PC_Bb || fromPC === PC_B) {
      return 1.3;
    }
    if (ctx.currentNote === "c''") {
      return 1.3;
    }
    return 1.0;
  },

  /**
   * MM-E-05: E' complex almost never reached from above; E complex often from above
   */
  'MM-E-05': (edge, ctx, position) => {
    if (!isEComplex(edge.to)) return 1.0;

    // Check if moving down into E complex
    if (edge.direction < 0) {
      // E complex (lower octave) - good to reach from above
      if (edge.to.includes("'") && !edge.to.includes("''")) {
        return 1.3;
      }
      // E' complex (upper octave) - rarely from above
      if (edge.to.includes("''")) {
        return 0.5;
      }
    }
    return 1.0;
  }
};

/**
 * Apply all Phase 2 rules to a candidate note
 * @returns {Object} Rule contributions
 */
export function applyPhase2Rules(edge, ctx, position) {
  const contributions = {};
  let totalWeight = 1.0;

  for (const [ruleId, ruleFn] of Object.entries(phase2Rules)) {
    const contribution = ruleFn(edge, ctx, position);
    contributions[ruleId] = contribution;
    totalWeight *= contribution;
  }

  return { contributions, totalWeight };
}

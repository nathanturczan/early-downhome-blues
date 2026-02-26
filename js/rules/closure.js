// js/rules/closure.js
//
// Graded closure system: weighted probability of ending phrases
// Based on pitch weight, melodic direction, contour progress, and harmony

import { frequencies } from '../network.js';
import { random } from '../random.js';

// === Constants ===
export const MIN_LENGTH = 5;
export const MAX_LENGTH = 12;
export const CONTINUATION_K = 5;

/**
 * Convert note to MIDI for pitch calculations
 */
function noteToMidi(note) {
  const freq = frequencies[note];
  if (!freq) return 60;
  return 69 + 12 * Math.log2(freq / 440);
}

/**
 * Get pitch class (0-11) from note
 */
function getPitchClass(note) {
  const midi = noteToMidi(note);
  return Math.round(midi) % 12;
}

/**
 * Check if a note is C (any octave)
 */
function isC(note) {
  return note === "c'" || note === "c''";
}

/**
 * Check if a note is G (any octave)
 */
function isG(note) {
  return note === "g'" || note === "g''";
}

/**
 * Check if a note is E (any octave)
 */
function isE(note) {
  const pc = getPitchClass(note);
  return pc === 4; // E = pitch class 4
}

/**
 * Check if a note is F (any octave)
 */
function isF(note) {
  const pc = getPitchClass(note);
  return pc === 5; // F = pitch class 5
}

// === Weight Tables ===

/**
 * Pitch weights by phrase role
 * Rows: b/d/f (cadential), a/c (rising), e (dominant)
 * Cols: note pitch class
 *
 * Scaled for K=5 such that strong closure yields ~70% probability
 */
const PITCH_WEIGHTS = {
  // Cadential phrases (b, d, f) - strongest pull to C
  // C must dominate clearly over G (Titon: "most frequent tonal rest point")
  // Extreme differential: C very high, G very low
  cadential: {
    C: 18,    // Very strong closure - dominant (tuned up from 15)
    G: 0.7,   // Very weak - suppress to let C dominate (tuned down from 1)
    E: 1,     // Weak closure
    F: 0.5,   // Very weak
    other: 0.3
  },
  // Rising phrases (a, c) - moderate pull
  rising: {
    C: 6,
    G: 4,
    E: 3,
    F: 2,
    other: 1
  },
  // Dominant phrase (e) - G acceptable ending
  dominant: {
    C: 4,
    G: 6,     // G strong here (dominant character)
    E: 3,
    F: 1.5,
    other: 1
  }
};

/**
 * Get pitch weight based on note and phrase role
 */
function getPitchWeight(note, phrase) {
  // Determine phrase role
  let role;
  if (phrase === 'b' || phrase === 'd' || phrase === 'f') {
    role = 'cadential';
  } else if (phrase === 'a' || phrase === 'c') {
    role = 'rising';
  } else if (phrase === 'e') {
    role = 'dominant';
  } else {
    role = 'cadential'; // fallback
  }

  const weights = PITCH_WEIGHTS[role];

  if (isC(note)) return weights.C;
  if (isG(note)) return weights.G;
  if (isE(note)) return weights.E;
  if (isF(note)) return weights.F;
  return weights.other;
}

/**
 * Direction multiplier: descent increases closure probability
 * Subtle effect - pitch weight dominates
 */
function getDirectionMult(prevNote, currNote) {
  if (!prevNote) return 1.0;

  const prevMidi = noteToMidi(prevNote);
  const currMidi = noteToMidi(currNote);
  const diff = currMidi - prevMidi;

  if (diff < -0.5) return 1.25;    // Descent: slight boost
  if (diff > 0.5) return 0.6;      // Ascent: notable reduction
  return 1.0;                       // Level: neutral
}

/**
 * Contour multiplier based on phrase progress and contour type
 * Very subtle (0.85-1.15 range) - modulates but doesn't dominate
 */
function getContourMult(progress, contourType) {
  switch (contourType) {
    case 'IB':
      // Rise-then-fall: crossover around 40%
      // Before crossover: suppress closure (still rising)
      // After crossover: boost closure (falling to end)
      if (progress < 0.4) return 0.85;
      return 1.15;

    case 'IA':
      // Pure descent: gradually increase closure tendency
      // Lerp from 0.9 (start) to 1.1 (end)
      return 0.9 + (progress * 0.2);

    case 'IIB':
      // Rising overall: suppress closure early, allow after peak (~60%)
      if (progress < 0.6) return 0.85;
      return 1.1;

    default:
      return 1.0;
  }
}

/**
 * Harmony multiplier: chord tones slightly more likely to end phrase
 * Subtle effect (1.0-1.25 range)
 */
function getHarmonyMult(note, chord) {
  if (!chord) return 1.0;

  const pc = getPitchClass(note);

  // Chord root pitch classes
  const chordRoots = {
    'I': 0,   // C
    'IV': 5,  // F
    'V': 7    // G
  };

  // Chord tones (root, 3rd, 5th)
  const chordTones = {
    'I': [0, 4, 7],     // C, E, G
    'IV': [5, 9, 0],    // F, A, C
    'V': [7, 11, 2]     // G, B, D
  };

  // Clash notes (avoid ending on these)
  const clashNotes = {
    'I': [1, 6],        // Db, Gb
    'IV': [4, 11],      // E, B (tritone from F)
    'V': [0, 6]         // C (tendency tone), Gb
  };

  const root = chordRoots[chord];
  const tones = chordTones[chord] || [];
  const clashes = clashNotes[chord] || [];

  if (pc === root) return 1.25;           // Chord root: boost
  if (tones.includes(pc)) return 1.1;     // Chord tone: slight boost
  if (clashes.includes(pc)) return 0.85;  // Clash: slight reduction
  return 1.0;                              // Neutral
}

/**
 * Evaluate closure probability for a note in context
 *
 * @param {string} note - Current note (LilyPond notation)
 * @param {Object} context - Context from stanza position
 * @param {number} context.stepInPhrase - Current step (0-indexed)
 * @param {string} context.phrase - Current phrase (a-f)
 * @param {string} context.contourType - IB, IA, or IIB
 * @param {string} context.chord - Current chord (I, IV, V)
 * @param {string} context.previousNote - Previous note for direction calc
 *
 * @returns {{ shouldEnd: boolean, probability: number, weight: number }}
 */
export function evaluateClosure(note, context) {
  const { stepInPhrase, phrase, contourType, chord, previousNote } = context;

  // noteCount is 1-indexed (step 0 = note 1, step 4 = note 5, etc.)
  const noteCount = stepInPhrase + 1;

  // Hard limit: always end at MAX_LENGTH (12 notes max)
  if (noteCount >= MAX_LENGTH) {
    return { shouldEnd: true, probability: 1.0, weight: Infinity };
  }

  // Too early: never end before MIN_LENGTH (5 notes min)
  if (noteCount < MIN_LENGTH) {
    return { shouldEnd: false, probability: 0, weight: 0 };
  }

  // Calculate composite weight
  const pitchWeight = getPitchWeight(note, phrase);
  const directionMult = getDirectionMult(previousNote, note);
  const progress = noteCount / MAX_LENGTH;
  const contourMult = getContourMult(progress, contourType);
  const harmonyMult = getHarmonyMult(note, chord);

  // Length pressure: slight boost as we approach MAX_LENGTH
  // Encourages ending rather than meandering
  const lengthPressure = 1.0 + ((noteCount - MIN_LENGTH) / (MAX_LENGTH - MIN_LENGTH)) * 0.2;

  const weight = pitchWeight * directionMult * contourMult * harmonyMult * lengthPressure;

  // Calculate probability: weight / (weight + K)
  const probability = weight / (weight + CONTINUATION_K);

  // Stochastic decision
  const shouldEnd = random() < probability;

  return { shouldEnd, probability, weight };
}

/**
 * Get closure context from stanza position
 * Helper to build context object for evaluateClosure
 */
export function buildClosureContext(position, previousNote, chord) {
  return {
    stepInPhrase: position.stepInPhrase,
    phrase: position.phrase,
    contourType: position.contourType || 'IB',
    chord: chord || 'I',
    previousNote
  };
}

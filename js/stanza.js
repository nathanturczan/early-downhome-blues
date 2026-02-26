// js/stanza.js
//
// Phase 2: Stanza state machine
// Tracks position within the 12-bar blues form

import { random } from './random.js';

/**
 * Stanza structure:
 * - Line 1 (measures 1-4): Phrases a, b - Harmony: I
 * - Line 2 (measures 5-8): Phrases c, d - Harmony: IV → I
 * - Line 3 (measures 9-12): Phrases e, f - Harmony: V → I
 */

// Phrase sequence in order
const PHRASE_SEQUENCE = ['a', 'b', 'c', 'd', 'e', 'f'];

// Map phrase to line
const PHRASE_TO_LINE = {
  'a': 1, 'b': 1,
  'c': 2, 'd': 2,
  'e': 3, 'f': 3
};

// Map phrase to harmony (basic model - without splits)
const PHRASE_TO_HARMONY = {
  'a': 'I', 'b': 'I',
  'c': 'IV', 'd': 'I',
  'e': 'V', 'f': 'I'
};

// === Auto-Harmony Configuration ===

// Phrase e: always V → IV (switch at 50% through phrase)
const PHRASE_E_SPLIT_POINT = 0.50;

// Phrase f: always I first half, sometimes V second half (35% probability)
const PHRASE_F_SPLIT_PROBABILITY = 0.35;
const PHRASE_F_SPLIT_POINT = 0.50;

// Cadence harmony lock: last N notes of b/d/f force harmony to I
const CADENCE_HARMONY_LOCK_NOTES = 2;

// === Contour Types (from Figure 69) ===
// Probabilities based on Titon's observed frequencies
export const CONTOUR_TYPES = {
  IB: 'IB',   // Rise-then-fall (inverted bowl) - most common
  IA: 'IA',   // Pure descent (start high, fall throughout)
  IIB: 'IIB'  // Rising overall (start low, rise to peak)
};

// Weights from Figure 69: IB=17, IA=3, IIB=2 (total ~22 of main types)
const CONTOUR_WEIGHTS = {
  IB: 17,
  IA: 3,
  IIB: 2
};

// Current contour type for this stanza
let currentContourType = CONTOUR_TYPES.IB;

// Split state (decided at start of phrase f only)
let phraseFHasSplit = false;

// Phrase characteristics for rule application
const PHRASE_TRAITS = {
  'a': { isLineStart: true, isPhraseStart: true, isRising: true },
  'b': { isLineEnd: true, isPhraseEnd: true, isFalling: true },
  'c': { isLineStart: true, isPhraseStart: true, isRising: true, repeatsA: true },
  'd': { isLineEnd: true, isPhraseEnd: true, isFalling: true },
  'e': { isLineStart: true, isPhraseStart: true, isDominant: true },
  'f': { isLineEnd: true, isPhraseEnd: true, isFalling: true, isStanzaEnd: true }
};

// State
let currentStanza = 1;
let currentPhraseIndex = 0;
let stepInPhrase = 0;
let stepsPerPhrase = 8; // Approximate, can vary

/**
 * Choose contour type for a new stanza based on weighted probability
 */
export function chooseContourType() {
  const total = Object.values(CONTOUR_WEIGHTS).reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (const [type, weight] of Object.entries(CONTOUR_WEIGHTS)) {
    r -= weight;
    if (r <= 0) {
      currentContourType = type;
      return type;
    }
  }
  currentContourType = CONTOUR_TYPES.IB; // fallback
  return currentContourType;
}

/**
 * Get current contour type
 */
export function getContourType() {
  return currentContourType;
}

/**
 * Get current position in the stanza
 */
export function getPosition() {
  const phrase = PHRASE_SEQUENCE[currentPhraseIndex];
  return {
    stanza: currentStanza,
    line: PHRASE_TO_LINE[phrase],
    phrase: phrase,
    phraseIndex: currentPhraseIndex,
    harmony: PHRASE_TO_HARMONY[phrase],
    stepInPhrase: stepInPhrase,
    stepsPerPhrase: stepsPerPhrase,
    traits: PHRASE_TRAITS[phrase],
    contourType: currentContourType,
    // Computed properties
    isNearPhraseStart: stepInPhrase < 2,
    isNearPhraseEnd: stepInPhrase >= stepsPerPhrase - 2,
    progressInPhrase: stepInPhrase / stepsPerPhrase // 0 to 1
  };
}

/**
 * Advance one step within current phrase
 * Returns true if phrase ended
 */
export function advanceStep() {
  stepInPhrase++;

  if (stepInPhrase >= stepsPerPhrase) {
    return true; // Phrase complete
  }
  return false;
}

/**
 * Move to next phrase
 * Returns true if stanza ended
 */
export function advancePhrase() {
  stepInPhrase = 0;
  currentPhraseIndex++;

  if (currentPhraseIndex >= PHRASE_SEQUENCE.length) {
    // Stanza complete - choose new contour for next stanza
    currentPhraseIndex = 0;
    currentStanza++;
    chooseContourType();
    return true;
  }
  return false;
}

/**
 * Reset to beginning of a new stanza
 */
export function resetStanza() {
  currentPhraseIndex = 0;
  stepInPhrase = 0;
  chooseContourType();
  // Don't reset stanza counter - it tracks overall progress
}

/**
 * Reset everything (new song)
 */
export function resetSong() {
  currentStanza = 1;
  currentPhraseIndex = 0;
  stepInPhrase = 0;
  chooseContourType();
}

/**
 * Set steps per phrase (for testing/tuning)
 */
export function setStepsPerPhrase(n) {
  stepsPerPhrase = n;
}

/**
 * Force position (for testing)
 */
export function setPosition(phraseIndex, step = 0) {
  currentPhraseIndex = phraseIndex % PHRASE_SEQUENCE.length;
  stepInPhrase = step;
}

/**
 * Decide splits for a new phrase (call when entering phrase f)
 * Phrase e always has V → IV split, no decision needed
 */
export function decideSplits(phrase) {
  if (phrase === 'f') {
    phraseFHasSplit = random() < PHRASE_F_SPLIT_PROBABILITY;
  }
}

/**
 * Get the chord for current position (auto-harmony logic)
 * Implements splits for phrases e and f, plus cadence lock
 *
 * @param {Object} position - Current position from getPosition()
 * @returns {string} Chord name: 'I', 'IV', or 'V'
 */
export function getChordForPosition(position) {
  const { phrase, stepInPhrase, stepsPerPhrase, traits } = position;
  const progress = stepInPhrase / stepsPerPhrase;
  const stepsRemaining = stepsPerPhrase - stepInPhrase;

  // Cadence lock: last 2 notes of b/d/f force I
  if (traits?.isPhraseEnd && stepsRemaining < CADENCE_HARMONY_LOCK_NOTES) {
    return 'I';
  }

  // Phrase e: always V → IV (switch at 50%)
  if (phrase === 'e') {
    if (progress >= PHRASE_E_SPLIT_POINT) {
      return 'IV';
    }
    return 'V';
  }

  // Phrase f: always I first half, sometimes V second half (before cadence lock)
  if (phrase === 'f') {
    if (phraseFHasSplit && progress >= PHRASE_F_SPLIT_POINT) {
      return 'V';
    }
    return 'I';
  }

  // Default: use basic phrase-to-harmony map
  return PHRASE_TO_HARMONY[phrase] || 'I';
}

// Export constants for external use
export { PHRASE_SEQUENCE, PHRASE_TO_LINE, PHRASE_TO_HARMONY, PHRASE_TRAITS };

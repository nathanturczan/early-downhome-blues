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
// Harmony tied to measure position, not phrase progress (12-bar structure)

// Phrase e (measures 9-10): V for first ~4 notes, then IV
// Using fixed step count to approximate measure boundary
const PHRASE_E_SPLIT_STEP = 4;  // Switch to IV after 4 notes

// Phrase f (measures 11-12): I, sometimes V mid-phrase
const PHRASE_F_SPLIT_PROBABILITY = 0.35;
const PHRASE_F_SPLIT_STEP = 4;  // If split, switch to V after 4 notes

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

// Closure constants (imported for consistency)
const MIN_PHRASE_LENGTH = 5;
const MAX_PHRASE_LENGTH = 12;

// State
let currentStanza = 1;
let currentPhraseIndex = 0;
let stepInPhrase = 0;
let stepsPerPhrase = MAX_PHRASE_LENGTH; // Max phrase length for progress calculation

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
    isNearPhraseEnd: stepInPhrase >= MIN_PHRASE_LENGTH, // Closure eligible
    progressInPhrase: stepInPhrase / MAX_PHRASE_LENGTH // 0 to 1, based on max
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
 * Harmony tied to measure position (step counts), not phrase progress
 *
 * @param {Object} position - Current position from getPosition()
 * @returns {string} Chord name: 'I', 'IV', or 'V'
 */
export function getChordForPosition(position) {
  const { phrase, stepInPhrase, stepsPerPhrase, traits } = position;
  const stepsRemaining = stepsPerPhrase - stepInPhrase;

  // Cadence lock: last 2 notes of b/d/f force I
  if (traits?.isPhraseEnd && stepsRemaining < CADENCE_HARMONY_LOCK_NOTES) {
    return 'I';
  }

  // Phrase e (measures 9-10): V first, then IV
  // Fixed step count approximates measure boundary
  if (phrase === 'e') {
    if (stepInPhrase >= PHRASE_E_SPLIT_STEP) {
      return 'IV';
    }
    return 'V';
  }

  // Phrase f (measures 11-12): I, sometimes V mid-phrase
  if (phrase === 'f') {
    if (phraseFHasSplit && stepInPhrase >= PHRASE_F_SPLIT_STEP) {
      return 'V';
    }
    return 'I';
  }

  // Default: use basic phrase-to-harmony map
  return PHRASE_TO_HARMONY[phrase] || 'I';
}

// Export constants for external use
export { PHRASE_SEQUENCE, PHRASE_TO_LINE, PHRASE_TO_HARMONY, PHRASE_TRAITS };

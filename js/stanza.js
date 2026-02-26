// js/stanza.js
//
// Phase 2: Stanza state machine
// Tracks position within the 12-bar blues form

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

// Map phrase to harmony
const PHRASE_TO_HARMONY = {
  'a': 'I', 'b': 'I',
  'c': 'IV', 'd': 'I',
  'e': 'V', 'f': 'I'
};

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
    // Stanza complete
    currentPhraseIndex = 0;
    currentStanza++;
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
  // Don't reset stanza counter - it tracks overall progress
}

/**
 * Reset everything (new song)
 */
export function resetSong() {
  currentStanza = 1;
  currentPhraseIndex = 0;
  stepInPhrase = 0;
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

// Export constants for external use
export { PHRASE_SEQUENCE, PHRASE_TO_LINE, PHRASE_TO_HARMONY, PHRASE_TRAITS };

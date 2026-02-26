// js/phraseMemory.js
//
// Phase 2: Melodic memory for phrase repetition
// Stores Line 1 melody for replay in Line 2

/**
 * In downhome blues, Line 2 (phrases c+d) more or less repeats Line 1 (phrases a+b)
 * even as harmony moves to IV underneath.
 *
 * MM-S-03: "Singers prefer repeating phrase a melody against subdominant support"
 */

// Storage for phrase melodies (frozen snapshots)
let phraseNotes = {
  'a': [],
  'b': [],
  'c': [],
  'd': [],
  'e': [],
  'f': []
};

// Frozen copies for repetition (deep copy when phrase ends)
let frozenPhrases = {
  'a': null,
  'b': null
};

// Variation probability when recalling (small ornament chance)
const VARIATION_PROBABILITY = 0.1;

/**
 * Record a note played in a phrase
 */
export function recordNote(phrase, note) {
  if (phraseNotes[phrase]) {
    phraseNotes[phrase].push(note);
  }
}

/**
 * Freeze a phrase for later repetition (deep copy)
 * Call this when phrase a or b ends
 */
export function freezePhrase(phrase) {
  if (phrase === 'a' || phrase === 'b') {
    frozenPhrases[phrase] = [...phraseNotes[phrase]]; // Deep copy
    console.log(`🧊 Froze phrase ${phrase}: ${frozenPhrases[phrase].join(' → ')}`);
  }
}

/**
 * Get the stored melody for a phrase
 */
export function getPhraseMelody(phrase) {
  return [...phraseNotes[phrase]];
}

/**
 * Get the corresponding phrase to repeat from
 * c repeats a, d repeats b, f repeats b/d
 * (per Titon: "phrases b, d, and f are usually identical or nearly so")
 */
function getSourcePhrase(targetPhrase) {
  const mapping = {
    'c': 'a',
    'd': 'b',
    'f': 'b'  // f copies b (or d, but b is the original)
  };
  return mapping[targetPhrase] || null;
}

/**
 * Check if this phrase should repeat a previous melody
 * c repeats a, d repeats b, f repeats b
 */
export function shouldRepeat(phrase) {
  return phrase === 'c' || phrase === 'd' || phrase === 'f';
}

/**
 * Get the note to play based on repetition logic
 * @param {string} phrase - Current phrase (c or d)
 * @param {number} stepInPhrase - Current step
 * @param {string[]} candidates - Available next notes from network
 * @returns {string|null} Suggested note, or null if no repetition applies
 */
export function getRepetitionNote(phrase, stepInPhrase, candidates) {
  const sourcePhrase = getSourcePhrase(phrase);
  if (!sourcePhrase) return null;

  // Use frozen copy (deep copied when source phrase ended)
  const sourceMelody = frozenPhrases[sourcePhrase];

  if (!sourceMelody || stepInPhrase >= sourceMelody.length) {
    return null;
  }

  const targetNote = sourceMelody[stepInPhrase];

  // Check if target note is reachable
  if (candidates.includes(targetNote)) {
    // Apply variation probability
    if (Math.random() < VARIATION_PROBABILITY) {
      return null; // Allow natural selection this time
    }
    return targetNote;
  }

  // Target not reachable - try to find closest match
  // For now, return null and let weighted selection handle it
  return null;
}

/**
 * Clear all stored phrases (new stanza)
 */
export function clearPhrases() {
  for (const phrase of Object.keys(phraseNotes)) {
    phraseNotes[phrase] = [];
  }
  frozenPhrases = { 'a': null, 'b': null };
}

/**
 * Clear a specific phrase
 */
export function clearPhrase(phrase) {
  if (phraseNotes[phrase]) {
    phraseNotes[phrase] = [];
  }
}

/**
 * Get debug info
 */
export function getDebugInfo() {
  return {
    a: phraseNotes['a'].length,
    b: phraseNotes['b'].length,
    c: phraseNotes['c'].length,
    d: phraseNotes['d'].length,
    e: phraseNotes['e'].length,
    f: phraseNotes['f'].length
  };
}

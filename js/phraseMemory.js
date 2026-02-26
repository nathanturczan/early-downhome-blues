// js/phraseMemory.js
//
// Phase 2: Melodic memory for phrase repetition
// Stores Line 1 melody for replay in Line 2

// Debug mode - set to true for verbose repetition logging
const DEBUG = false;

// Module instance check - log URL to detect duplicate imports (debug only)
if (DEBUG) console.log('📦 phraseMemory.js loaded from:', import.meta.url);

/**
 * In downhome blues, Line 2 (phrases c+d) more or less repeats Line 1 (phrases a+b)
 * even as harmony moves to IV underneath.
 *
 * MM-S-03: "Singers prefer repeating phrase a melody against subdominant support"
 */

// Freeze timestamps for debugging
let freezeTimestamps = { 'a': null, 'b': null };

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
    // Uncomment for detailed logging:
    // console.log(`📝 Record ${phrase}[${phraseNotes[phrase].length - 1}]: ${note}`);
  }
}

/**
 * Freeze a phrase for later repetition (deep copy)
 * Call this when phrase a or b ends
 */
export function freezePhrase(phrase) {
  if (phrase === 'a' || phrase === 'b') {
    const notes = phraseNotes[phrase];
    if (DEBUG) console.log(`🧊 FREEZE ${phrase}: ${notes.length} notes recorded: [${notes.join(', ')}]`);
    frozenPhrases[phrase] = [...notes]; // Deep copy
    freezeTimestamps[phrase] = Date.now();
  }
}

/**
 * Get the stored melody for a phrase
 */
export function getPhraseMelody(phrase) {
  return [...phraseNotes[phrase]];
}

/**
 * Get the frozen copy of a phrase (for repetition start note)
 */
export function getFrozenPhrase(phrase) {
  if (phrase === 'a' || phrase === 'b') {
    return frozenPhrases[phrase] ? [...frozenPhrases[phrase]] : null;
  }
  return null;
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

  // stepInPhrase is the current position, but we're ALREADY at that note (from restart).
  // We need to look up the NEXT note in the source melody.
  const lookupIndex = stepInPhrase + 1;

  if (!sourceMelody || lookupIndex >= sourceMelody.length) {
    if (DEBUG) console.log(`🔁 ${phrase}[${stepInPhrase}]: no source at index ${lookupIndex} (frozen${sourcePhrase.toUpperCase()} has ${sourceMelody?.length || 0} notes)`);
    return null;
  }

  const targetNote = sourceMelody[lookupIndex];

  // Check if target note is reachable
  if (candidates.includes(targetNote)) {
    // Apply variation probability
    if (Math.random() < VARIATION_PROBABILITY) {
      if (DEBUG) console.log(`🔁 ${phrase}[${stepInPhrase}→${lookupIndex}]: variation skip, wanted ${targetNote}`);
      return null; // Allow natural selection this time
    }
    if (DEBUG) console.log(`🔁 ${phrase}[${stepInPhrase}→${lookupIndex}]: SUCCESS playing ${targetNote} from frozen${sourcePhrase.toUpperCase()}`);
    return targetNote;
  }

  // Target not reachable - try to find closest match
  if (DEBUG) console.log(`🔁 ${phrase}[${stepInPhrase}→${lookupIndex}]: FAIL - ${targetNote} not reachable from candidates [${candidates.join(', ')}]`);
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
 * Get debug info (counts per phrase)
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

/**
 * Get full debug stats for testing
 */
export function getDebugStats() {
  return {
    phraseCounts: getDebugInfo(),
    frozenA: frozenPhrases['a'] ? [...frozenPhrases['a']] : null,
    frozenB: frozenPhrases['b'] ? [...frozenPhrases['b']] : null,
    freezeTimestamps: { ...freezeTimestamps }
  };
}

/**
 * Get deep copy snapshot of all phrase notes
 */
export function getPhraseNotesSnapshot() {
  return {
    a: [...phraseNotes['a']],
    b: [...phraseNotes['b']],
    c: [...phraseNotes['c']],
    d: [...phraseNotes['d']],
    e: [...phraseNotes['e']],
    f: [...phraseNotes['f']],
    frozenA: frozenPhrases['a'] ? [...frozenPhrases['a']] : null,
    frozenB: frozenPhrases['b'] ? [...frozenPhrases['b']] : null
  };
}

/**
 * Reset all phrase memory (alias for clearPhrases, for test API consistency)
 */
export function resetPhraseMemory() {
  clearPhrases();
  freezeTimestamps = { 'a': null, 'b': null };
}

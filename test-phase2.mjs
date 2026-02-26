// Node.js test for Phase 2 logic
// Run: node test-phase2.mjs

// Mock the modules inline since we can't easily import browser ES modules

// === network.js data ===
const frequencies = {
  "c'": 261.63, "d'": 293.66, "ees'": 311.13, "eeh'": 320.24, "e'": 329.63,
  "f'": 349.23, "fis'": 369.99, "g'": 392.00, "a'": 440.00, "bes'": 466.16,
  "b'": 493.88, "c''": 523.25, "d''": 587.33, "ees''": 622.25, "eeh''": 640.49,
  "e''": 659.26
};

const adjacency = {
  "g'": ["g'", "a'", "bes'", "b'", "c''", "f'"],
  "a'": ["g'", "a'", "bes'", "b'", "c''"],
  "bes'": ["g'", "a'", "bes'", "b'"],
  "b'": ["g'", "a'", "bes'", "b'", "c''"],
  "c''": ["g'", "a'", "bes'", "b'", "c''", "d''", "ees''", "eeh''", "e''"],
  "f'": ["g'", "e'", "f'", "fis'"],
  "fis'": ["g'", "f'", "fis'"],
  "e'": ["c'", "d'", "ees'", "eeh'", "e'", "f'", "g'"],
  "eeh'": ["c'", "d'", "ees'", "eeh'", "e'"],
  "ees'": ["c'", "d'", "ees'", "eeh'", "e'"],
  "d'": ["c'", "d'", "ees'", "eeh'", "e'"],
  "c'": [],  // sink
  "d''": ["c''", "d''", "ees''", "eeh''", "e''"],
  "ees''": ["c''", "d''", "ees''", "eeh''", "e''"],
  "eeh''": ["c''", "d''", "ees''", "eeh''", "e''"],
  "e''": ["c''", "d''", "ees''", "eeh''", "e''", "g'"]
};

// === stanza.js logic ===
const PHRASE_SEQUENCE = ['a', 'b', 'c', 'd', 'e', 'f'];
const PHRASE_TO_LINE = { 'a': 1, 'b': 1, 'c': 2, 'd': 2, 'e': 3, 'f': 3 };
const PHRASE_TRAITS = {
  'a': { isLineStart: true, isPhraseStart: true },
  'b': { isLineEnd: true, isPhraseEnd: true },
  'c': { isLineStart: true, isPhraseStart: true, repeatsA: true },
  'd': { isLineEnd: true, isPhraseEnd: true },
  'e': { isLineStart: true, isPhraseStart: true },
  'f': { isLineEnd: true, isPhraseEnd: true, isStanzaEnd: true }
};

let currentPhraseIndex = 0;
let stepInPhrase = 0;
const stepsPerPhrase = 8;

function getPosition() {
  const phrase = PHRASE_SEQUENCE[currentPhraseIndex];
  return {
    phrase,
    line: PHRASE_TO_LINE[phrase],
    stepInPhrase,
    stepsPerPhrase,
    traits: PHRASE_TRAITS[phrase],
    isNearPhraseEnd: stepInPhrase >= stepsPerPhrase - 2
  };
}

function advanceStep() {
  stepInPhrase++;
  if (stepInPhrase >= stepsPerPhrase) {
    return true;
  }
  return false;
}

function advancePhrase() {
  stepInPhrase = 0;
  currentPhraseIndex++;
  if (currentPhraseIndex >= PHRASE_SEQUENCE.length) {
    currentPhraseIndex = 0;
    return true; // stanza ended
  }
  return false;
}

function resetStanza() {
  currentPhraseIndex = 0;
  stepInPhrase = 0;
}

// === phraseMemory.js logic (with frozen phrases fix) ===
const phraseNotes = { 'a': [], 'b': [], 'c': [], 'd': [], 'e': [], 'f': [] };
let frozenPhrases = { 'a': null, 'b': null };
const VARIATION_PROBABILITY = 0.1;

function recordNote(phrase, note) {
  if (phraseNotes[phrase]) {
    phraseNotes[phrase].push(note);
  }
}

function freezePhrase(phrase) {
  if (phrase === 'a' || phrase === 'b') {
    frozenPhrases[phrase] = [...phraseNotes[phrase]];
  }
}

function getSourcePhrase(targetPhrase) {
  const mapping = { 'c': 'a', 'd': 'b', 'f': 'b' };
  return mapping[targetPhrase] || null;
}

function shouldRepeat(phrase) {
  return phrase === 'c' || phrase === 'd' || phrase === 'f';
}

function getRepetitionNote(phrase, stepInPhrase, candidates) {
  const sourcePhrase = getSourcePhrase(phrase);
  if (!sourcePhrase) return null;

  const sourceMelody = frozenPhrases[sourcePhrase];
  if (!sourceMelody || stepInPhrase >= sourceMelody.length) {
    return null;
  }

  const targetNote = sourceMelody[stepInPhrase];
  if (candidates.includes(targetNote)) {
    if (Math.random() < VARIATION_PROBABILITY) {
      return null;
    }
    return targetNote;
  }
  return null;
}

function clearPhrases() {
  for (const phrase of Object.keys(phraseNotes)) {
    phraseNotes[phrase] = [];
  }
  frozenPhrases = { 'a': null, 'b': null };
}

// === Weighted selection with updated constants ===
function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

function isC(note) {
  return note === "c'" || note === "c''";
}

function selectNote(currentNote, candidates, position) {
  if (candidates.length === 0) return null;

  // Check repetition first (bypass generator for c/d/f)
  if (position && shouldRepeat(position.phrase)) {
    const repNote = getRepetitionNote(position.phrase, position.stepInPhrase, candidates);
    if (repNote) {
      return { note: repNote, fromRepetition: true };
    }
  }

  if (candidates.length === 1) {
    return { note: candidates[0], fromRepetition: false };
  }

  const fromMidi = freqToMidi(frequencies[currentNote] || 392);
  const step = position?.stepInPhrase || 0;
  const stepsRemaining = (position?.stepsPerPhrase || 8) - step;
  const isPhraseEnd = position?.traits?.isPhraseEnd;

  const scored = candidates.map(note => {
    const toMidi = freqToMidi(frequencies[note] || 392);
    const interval = toMidi - fromMidi;
    const direction = interval > 0.5 ? 1 : interval < -0.5 ? -1 : 0;
    let weight = 1.0;

    // MM-GP-01: Reduced down bias (1.1/1.0)
    if (direction < 0) weight *= 1.10;
    // ascending is now neutral (1.0)

    // MM-GP-04: Position-aware leap allowance
    if (Math.abs(interval) > 3) {
      if (direction < 0) weight *= 0.4;
      if (direction > 0) {
        if (step <= 2) weight *= 1.35;  // Strong early
        else weight *= 1.10;
      }
    }

    // PHRASE-START-LIFT: Strong upward bias for first 2 notes
    if (step <= 1 && direction > 0) {
      if (step === 0) weight *= 1.80;
      else weight *= 1.35;
    }

    // MM-C-01: Strong cadence bias (applied last)
    if (isPhraseEnd) {
      if (isC(note)) {
        if (stepsRemaining <= 1) weight *= 20.0;  // Final note: even stronger
        else if (stepsRemaining <= 2) weight *= 6.0;  // Penultimate
        else if (stepsRemaining <= 3) weight *= 2.0;  // Antepenultimate
      }
      // Boost notes that can reach C (approach tones)
      const canReachC = adjacency[note]?.some(n => isC(n));
      if (canReachC && stepsRemaining <= 2) {
        weight *= 2.0;
      }
    }

    return { note, weight };
  });

  const total = scored.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const s of scored) {
    r -= s.weight;
    if (r <= 0) return { note: s.note, fromRepetition: false };
  }
  return { note: scored[scored.length - 1].note, fromRepetition: false };
}

function getRestartNote() {
  return Math.random() < 0.7 ? "g'" : "c''";
}

// === TEST ===
function runTest(numStanzas = 10) {
  console.log(`\n🧪 Testing ${numStanzas} stanzas...\n`);

  const results = {
    repetitionAttempts: { c: 0, d: 0, f: 0 },
    repetitionHits: { c: 0, d: 0, f: 0 },
    cadenceAttempts: { b: 0, d: 0, f: 0 },
    cadenceHits: { b: 0, d: 0, f: 0 },
    phraseNoteCounts: { a: [], b: [], c: [], d: [], e: [], f: [] }
  };

  for (let stanza = 0; stanza < numStanzas; stanza++) {
    resetStanza();
    clearPhrases();

    let currentNote = getRestartNote();
    let stanzaComplete = false;

    while (!stanzaComplete) {
      const position = getPosition();
      const candidates = adjacency[currentNote] || [];

      if (candidates.length === 0) {
        // Sink - freeze phrase and advance
        const lastPhrase = position.phrase;
        if (lastPhrase === 'a' || lastPhrase === 'b') {
          freezePhrase(lastPhrase);
        }
        results.phraseNoteCounts[lastPhrase].push(phraseNotes[lastPhrase].length);

        // Check cadence
        if (['b', 'd', 'f'].includes(lastPhrase)) {
          results.cadenceAttempts[lastPhrase]++;
          if (isC(currentNote)) results.cadenceHits[lastPhrase]++;
        }

        stanzaComplete = advancePhrase();
        if (!stanzaComplete) {
          currentNote = getRestartNote();
          recordNote(getPosition().phrase, currentNote);
        }
      } else {
        const result = selectNote(currentNote, candidates, position);
        currentNote = result.note;
        recordNote(position.phrase, currentNote);

        // Track repetition
        if (shouldRepeat(position.phrase)) {
          results.repetitionAttempts[position.phrase]++;
          if (result.fromRepetition) {
            results.repetitionHits[position.phrase]++;
          }
        }

        const phraseEnded = advanceStep();
        if (phraseEnded) {
          const lastPhrase = position.phrase;
          // Freeze phrase for repetition
          if (lastPhrase === 'a' || lastPhrase === 'b') {
            freezePhrase(lastPhrase);
          }
          results.phraseNoteCounts[lastPhrase].push(phraseNotes[lastPhrase].length);

          // Check cadence
          if (['b', 'd', 'f'].includes(lastPhrase)) {
            results.cadenceAttempts[lastPhrase]++;
            if (isC(currentNote)) results.cadenceHits[lastPhrase]++;
          }

          stanzaComplete = advancePhrase();
          if (!stanzaComplete) {
            currentNote = getRestartNote();
            recordNote(getPosition().phrase, currentNote);
          }
        }
      }
    }
  }

  // Report
  console.log('📊 RESULTS\n');

  console.log('REPETITION (notes matched from source phrase):');
  for (const p of ['c', 'd', 'f']) {
    const attempts = results.repetitionAttempts[p];
    const hits = results.repetitionHits[p];
    const pct = attempts > 0 ? (100 * hits / attempts).toFixed(0) : 'N/A';
    console.log(`  ${p}: ${hits}/${attempts} (${pct}%)`);
  }

  console.log('\nCADENCES (phrase ending on C):');
  let totalCadenceAttempts = 0, totalCadenceHits = 0;
  for (const p of ['b', 'd', 'f']) {
    const attempts = results.cadenceAttempts[p];
    const hits = results.cadenceHits[p];
    totalCadenceAttempts += attempts;
    totalCadenceHits += hits;
    const pct = attempts > 0 ? (100 * hits / attempts).toFixed(0) : 'N/A';
    console.log(`  ${p}: ${hits}/${attempts} (${pct}%)`);
  }
  console.log(`  Total: ${totalCadenceHits}/${totalCadenceAttempts} (${(100*totalCadenceHits/totalCadenceAttempts).toFixed(0)}%)`);

  console.log('\nPHRASE LENGTHS (avg notes per phrase):');
  for (const p of ['a', 'b', 'c', 'd', 'e', 'f']) {
    const counts = results.phraseNoteCounts[p];
    const avg = counts.length > 0 ? (counts.reduce((a,b)=>a+b,0) / counts.length).toFixed(1) : 'N/A';
    console.log(`  ${p}: ${avg} notes avg (${counts.length} samples)`);
  }

  console.log('\n✅ Test complete');
}

runTest(10);

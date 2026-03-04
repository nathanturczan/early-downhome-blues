// test-runner.js - Node.js test runner for closure system
// Run with: node test-runner.js [numStanzas] [seed]
// Tests all 15 active melodic motion rules from Titon

import { adjacency } from '../js/network.js';
import { selectWeightedNote, getRestartNote, setPhrasing } from '../js/rules/weightedSelection.js';
import { evaluateClosure, buildClosureContext, MIN_LENGTH } from '../js/rules/closure.js';
import { recordNote, freezePhrase, resetPhraseMemory } from '../js/phraseMemory.js';
import { getPosition, advanceStep, advancePhrase, setPosition, decideSplits, chooseContourType, getChordForPosition, PHRASE_SEQUENCE } from '../js/stanza.js';
import { frequencies } from '../js/network.js';
import { setSeed, clearSeed, generateSeed } from '../js/random.js';

function noteToMidi(note) {
  const freq = frequencies[note];
  if (!freq) return 60;
  return 69 + 12 * Math.log2(freq / 440);
}

function getPitchClass(note) {
  const midi = noteToMidi(note);
  return Math.round(midi) % 12;
}

function isC(note) {
  return note === "c'" || note === "c''";
}

function isG(note) {
  return note === "g'" || note === "g''";
}

function isBbComplex(note) {
  const pc = getPitchClass(note);
  return pc === 10 || pc === 11; // Bb or B
}

function isEComplex(note) {
  return note.startsWith('ee') || note.startsWith("e'") || note === "e''";
}

function isEUpper(note) {
  // E'' complex (upper octave)
  return note.includes("''") && isEComplex(note);
}

function isELower(note) {
  // E' complex (lower octave)
  return note.includes("'") && !note.includes("''") && isEComplex(note);
}

function isF(note) {
  return note === "f'" || note === "f''";
}

function isA(note) {
  return note === "a'" || note === "a''";
}

function runTest(numStanzas = 200, seed = null) {
  const usedSeed = seed !== null ? seed : generateSeed();
  setSeed(usedSeed);
  setPhrasing(true);

  console.log(`\n🧪 Node Test: ${numStanzas} stanzas, seed: ${usedSeed}\n`);

  const results = {
    repetitionAttempts: { c: 0, d: 0, f: 0 },
    repetitionHits: { c: 0, d: 0, f: 0 },
    cadenceAttempts: { b: 0, d: 0, f: 0 },
    cadenceHits: { b: 0, d: 0, f: 0 },
    phraseNoteCounts: { a: [], b: [], c: [], d: [], e: [], f: [] },
    closureStats: {
      closureEndings: { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 },
      sinkEndings: { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 },
      forcedShortEndings: 0,
      endingNotes: { a: {}, b: {}, c: {}, d: {}, e: {}, f: {} }
    },
    // MM-GP-01: Downward tendency
    intervalDirection: { up: 0, down: 0, same: 0 },
    // MM-GP-02: Pendular motion (direction reversals)
    pendularMoves: 0,
    totalMoves: 0,
    // MM-GP-03: Same-note repetitions by note
    sameNoteRepsByNote: {},
    // MM-GP-04: Interval sizes by direction
    upwardIntervals: [],
    downwardIntervals: [],
    // MM-GP-05: Large descents (>3 semitones) landing location
    largeDescentsToC: 0,
    largeDescentsTotal: 0,
    // MM-C-04: G→C' at phrase starts of a,c
    gToCPrimeAtStart: { attempts: 0, hits: 0 },
    // MM-E-05: E approach direction (E from above, E' from below)
    eApproach: { lowerFromAbove: 0, lowerFromBelow: 0, upperFromAbove: 0, upperFromBelow: 0 },
    // MM-G-04: G↔Bb oscillations in phrase e
    gBbOscillations: { phraseE: 0, otherPhrases: 0, phraseEMoves: 0, otherMoves: 0 },
    // MM-S-02: F in first 3 notes of phrase c vs other phrases
    fEarlyInPhrase: { c: 0, other: 0, cTotal: 0, otherTotal: 0 },
    // MM-AD-01: A as passing tone between G/Bb/C'
    aPassing: { valid: 0, total: 0 },
    // MM-BB-02: C'→Bb transitions by phrase
    cPrimeToBb: { ac: 0, bd: 0, acTotal: 0, bdTotal: 0 },
    // MM-BB-03: Bb frequency and approach in phrase e
    bbInPhraseE: { fromGA: 0, other: 0, totalBb: 0 }
  };

  for (let stanza = 0; stanza < numStanzas; stanza++) {
    setPosition(0, 0);
    resetPhraseMemory();
    chooseContourType();

    const startPos = getPosition();
    let currentNote = getRestartNote(startPos);
    let history = [{ note: currentNote, position: null }];
    recordNote(startPos.phrase, currentNote);

    let stanzaComplete = false;
    let lastDirection = 0; // For pendular tracking
    let phraseNotes = [currentNote]; // Track notes in current phrase

    while (!stanzaComplete) {
      const position = getPosition();
      const candidates = adjacency[currentNote] || [];

      if (candidates.length === 0) {
        // SINK PATH
        if (position.phrase === 'a' || position.phrase === 'b') {
          freezePhrase(position.phrase);
        }

        const phraseLength = position.stepInPhrase + 1;
        results.phraseNoteCounts[position.phrase].push(phraseLength);
        results.closureStats.sinkEndings[position.phrase]++;

        if (phraseLength < MIN_LENGTH) {
          results.closureStats.forcedShortEndings++;
        }

        const noteKey = currentNote.replace(/'/g, '');
        results.closureStats.endingNotes[position.phrase][noteKey] =
          (results.closureStats.endingNotes[position.phrase][noteKey] || 0) + 1;

        if (['b', 'd', 'f'].includes(position.phrase)) {
          results.cadenceAttempts[position.phrase]++;
          if (isC(currentNote)) {
            results.cadenceHits[position.phrase]++;
          }
        }

        stanzaComplete = advancePhrase();

        if (!stanzaComplete) {
          const newPosition = getPosition();
          if (newPosition.phrase === 'e' || newPosition.phrase === 'f') {
            decideSplits(newPosition.phrase);
          }
          currentNote = getRestartNote(newPosition);
          history = [{ note: currentNote, position: null }];
          recordNote(newPosition.phrase, currentNote);
          lastDirection = 0; // Reset direction tracking for new phrase
          phraseNotes = [currentNote]; // Reset phrase notes
        }
      } else {
        // NORMAL PATH
        const historyNotes = history.map(h => h.note);
        const result = selectWeightedNote(currentNote, historyNotes, candidates, 0, position);
        const previousNote = currentNote;
        currentNote = result.note;

        // === RULE TRACKING ===
        const prevMidi = noteToMidi(previousNote);
        const currMidi = noteToMidi(currentNote);
        const interval = currMidi - prevMidi;
        const direction = interval > 0.5 ? 1 : (interval < -0.5 ? -1 : 0);
        const stepInPhrase = position.stepInPhrase;
        const phrase = position.phrase;

        // MM-GP-01: Interval direction
        if (direction > 0) results.intervalDirection.up++;
        else if (direction < 0) results.intervalDirection.down++;
        else results.intervalDirection.same++;

        // MM-GP-02: Pendular motion (direction reversal)
        results.totalMoves++;
        if (lastDirection !== 0 && direction !== 0 && lastDirection !== direction) {
          results.pendularMoves++;
        }
        if (direction !== 0) lastDirection = direction;

        // MM-GP-03: Same-note repetitions
        if (direction === 0) {
          const noteKey = currentNote.replace(/'/g, '');
          results.sameNoteRepsByNote[noteKey] = (results.sameNoteRepsByNote[noteKey] || 0) + 1;
        }

        // MM-GP-04: Interval sizes by direction
        const absInterval = Math.abs(interval);
        if (direction > 0) results.upwardIntervals.push(absInterval);
        else if (direction < 0) results.downwardIntervals.push(absInterval);

        // MM-GP-05: Large descents landing on C
        if (direction < 0 && absInterval > 3) {
          results.largeDescentsTotal++;
          if (isC(currentNote)) results.largeDescentsToC++;
        }

        // MM-C-04: G→C' at start of phrase a,c
        if ((phrase === 'a' || phrase === 'c') && stepInPhrase <= 1) {
          if (isG(previousNote)) {
            results.gToCPrimeAtStart.attempts++;
            if (currentNote === "c''") results.gToCPrimeAtStart.hits++;
          }
        }

        // MM-E-05: E approach direction
        if (isELower(currentNote)) {
          if (direction < 0) results.eApproach.lowerFromAbove++;
          else if (direction > 0) results.eApproach.lowerFromBelow++;
        }
        if (isEUpper(currentNote)) {
          if (direction < 0) results.eApproach.upperFromAbove++;
          else if (direction > 0) results.eApproach.upperFromBelow++;
        }

        // MM-G-04: G↔Bb oscillations
        const isGBbOscillation = (isG(previousNote) && isBbComplex(currentNote)) ||
                                  (isBbComplex(previousNote) && isG(currentNote));
        if (phrase === 'e') {
          results.gBbOscillations.phraseEMoves++;
          if (isGBbOscillation) results.gBbOscillations.phraseE++;
        } else {
          results.gBbOscillations.otherMoves++;
          if (isGBbOscillation) results.gBbOscillations.otherPhrases++;
        }

        // MM-S-02: F in first 3 notes
        if (stepInPhrase <= 2) {
          if (phrase === 'c') {
            results.fEarlyInPhrase.cTotal++;
            if (isF(currentNote)) results.fEarlyInPhrase.c++;
          } else {
            results.fEarlyInPhrase.otherTotal++;
            if (isF(currentNote)) results.fEarlyInPhrase.other++;
          }
        }

        // MM-AD-01: A as passing tone
        if (isA(currentNote)) {
          results.aPassing.total++;
          // Check if previous note was G, Bb complex, or C''
          if (isG(previousNote) || isBbComplex(previousNote) || previousNote === "c''") {
            results.aPassing.valid++;
          }
        }

        // MM-BB-02: C'→Bb transitions by phrase
        if (previousNote === "c''" && isBbComplex(currentNote)) {
          if (phrase === 'a' || phrase === 'c') {
            results.cPrimeToBb.ac++;
          } else if (phrase === 'b' || phrase === 'd') {
            results.cPrimeToBb.bd++;
          }
        }
        if (previousNote === "c''") {
          if (phrase === 'a' || phrase === 'c') results.cPrimeToBb.acTotal++;
          else if (phrase === 'b' || phrase === 'd') results.cPrimeToBb.bdTotal++;
        }

        // MM-BB-03: Bb approach in phrase e
        if (phrase === 'e' && isBbComplex(currentNote)) {
          results.bbInPhraseE.totalBb++;
          if (isG(previousNote) || isA(previousNote)) {
            results.bbInPhraseE.fromGA++;
          } else {
            results.bbInPhraseE.other++;
          }
        }

        // Track repetition using the flag from selectWeightedNote
        if (['c', 'd', 'f'].includes(position.phrase)) {
          results.repetitionAttempts[position.phrase]++;
          if (result.fromRepetition) {
            results.repetitionHits[position.phrase]++;
          }
        }

        phraseNotes.push(currentNote);
        history.push({ note: currentNote, position: { phraseIndex: position.phraseIndex, stepInPhrase: position.stepInPhrase } });
        recordNote(position.phrase, currentNote);

        const chord = getChordForPosition(position);
        const closureContext = buildClosureContext(position, previousNote, chord);
        const closureResult = evaluateClosure(currentNote, closureContext);

        advanceStep();

        if (closureResult.shouldEnd) {
          if (position.phrase === 'a' || position.phrase === 'b') {
            freezePhrase(position.phrase);
          }

          const phraseLength = position.stepInPhrase + 1;
          results.phraseNoteCounts[position.phrase].push(phraseLength);
          results.closureStats.closureEndings[position.phrase]++;

          const noteKey = currentNote.replace(/'/g, '');
          results.closureStats.endingNotes[position.phrase][noteKey] =
            (results.closureStats.endingNotes[position.phrase][noteKey] || 0) + 1;

          if (['b', 'd', 'f'].includes(position.phrase)) {
            results.cadenceAttempts[position.phrase]++;
            if (isC(currentNote)) {
              results.cadenceHits[position.phrase]++;
            }
          }

          stanzaComplete = advancePhrase();

          if (!stanzaComplete) {
            const newPosition = getPosition();
            if (newPosition.phrase === 'e' || newPosition.phrase === 'f') {
              decideSplits(newPosition.phrase);
            }
            currentNote = getRestartNote(newPosition);
            history = [{ note: currentNote, position: null }];
            recordNote(newPosition.phrase, currentNote);
            lastDirection = 0; // Reset direction tracking for new phrase
            phraseNotes = [currentNote]; // Reset phrase notes
          }
        }

        if (history.length > 10) history = history.slice(-10);
      }
    }
  }

  // Report
  console.log('REPETITION (notes from source phrase):');
  let totalRepAttempts = 0, totalRepHits = 0;
  for (const p of ['c', 'd', 'f']) {
    const attempts = results.repetitionAttempts[p];
    const hits = results.repetitionHits[p];
    totalRepAttempts += attempts;
    totalRepHits += hits;
    const pct = attempts > 0 ? Math.round(100 * hits / attempts) : 0;
    console.log(`  ${p}: ${hits}/${attempts} (${pct}%)`);
  }
  console.log(`  total: ${totalRepHits}/${totalRepAttempts} (${Math.round(100 * totalRepHits / totalRepAttempts)}%)`);

  console.log('\nCADENCES (phrase ending on C):');
  let totalAttempts = 0, totalHits = 0;
  for (const p of ['b', 'd', 'f']) {
    const attempts = results.cadenceAttempts[p];
    const hits = results.cadenceHits[p];
    totalAttempts += attempts;
    totalHits += hits;
    const pct = attempts > 0 ? Math.round(100 * hits / attempts) : 0;
    console.log(`  ${p}: ${hits}/${attempts} (${pct}%)`);
  }
  console.log(`  total: ${totalHits}/${totalAttempts} (${Math.round(100 * totalHits / totalAttempts)}%)`);

  console.log('\nPHRASE LENGTHS:');
  for (const p of PHRASE_SEQUENCE) {
    const counts = results.phraseNoteCounts[p];
    const avg = counts.length > 0 ? (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1) : 'N/A';
    const min = counts.length > 0 ? Math.min(...counts) : 'N/A';
    const max = counts.length > 0 ? Math.max(...counts) : 'N/A';
    console.log(`  ${p}: avg=${avg}, min=${min}, max=${max}`);
  }

  const totalPhrases = numStanzas * 6;
  const forcedShortPct = (results.closureStats.forcedShortEndings / totalPhrases * 100).toFixed(1);
  console.log(`\nFORCED SHORT ENDINGS: ${results.closureStats.forcedShortEndings}/${totalPhrases} (${forcedShortPct}%)`);

  console.log('\nENDING NOTES BY PHRASE (a/c/e - rising/dominant):');
  for (const p of ['a', 'c', 'e']) {
    const notes = results.closureStats.endingNotes[p];
    const total = Object.values(notes).reduce((a, b) => a + b, 0);
    const breakdown = Object.entries(notes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([note, count]) => `${note}:${Math.round(100 * count / total)}%`)
      .join(', ');
    console.log(`  ${p}: ${breakdown}`);
  }

  console.log('\nENDING NOTES BY PHRASE (b/d/f - cadential):');
  for (const p of ['b', 'd', 'f']) {
    const notes = results.closureStats.endingNotes[p];
    const total = Object.values(notes).reduce((a, b) => a + b, 0);
    const breakdown = Object.entries(notes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([note, count]) => `${note}:${Math.round(100 * count / total)}%`)
      .join(', ');
    console.log(`  ${p}: ${breakdown}`);
  }

  // === RULE METRICS ===
  console.log('\n' + '='.repeat(50));
  console.log('MELODIC MOTION RULE METRICS');
  console.log('='.repeat(50));

  // MM-GP-01: Downward tendency
  const totalIntervals = results.intervalDirection.up + results.intervalDirection.down + results.intervalDirection.same;
  const downPct = Math.round(100 * results.intervalDirection.down / totalIntervals);
  const upPct = Math.round(100 * results.intervalDirection.up / totalIntervals);
  const samePct = Math.round(100 * results.intervalDirection.same / totalIntervals);
  console.log(`\nMM-GP-01 (downward tendency): down=${downPct}% up=${upPct}% same=${samePct}%`);
  console.log(`  Expected: down > up (descending preference)`);

  // MM-GP-02: Pendular motion
  const pendularPct = Math.round(100 * results.pendularMoves / results.totalMoves);
  console.log(`\nMM-GP-02 (avoid pendular): reversals=${pendularPct}% of moves`);
  console.log(`  Expected: low (<25% typical)`);

  // MM-GP-03: Same-note repetitions
  console.log(`\nMM-GP-03 (same-note reps by note):`);
  const sortedReps = Object.entries(results.sameNoteRepsByNote)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const totalReps = Object.values(results.sameNoteRepsByNote).reduce((a, b) => a + b, 0);
  for (const [note, count] of sortedReps) {
    console.log(`  ${note}: ${count} (${Math.round(100 * count / totalReps)}%)`);
  }
  console.log(`  Expected: G highest (pendular point)`);

  // MM-GP-04: Interval sizes
  const avgUp = results.upwardIntervals.length > 0
    ? (results.upwardIntervals.reduce((a, b) => a + b, 0) / results.upwardIntervals.length).toFixed(2)
    : 'N/A';
  const avgDown = results.downwardIntervals.length > 0
    ? (results.downwardIntervals.reduce((a, b) => a + b, 0) / results.downwardIntervals.length).toFixed(2)
    : 'N/A';
  console.log(`\nMM-GP-04 (interval sizes): up_avg=${avgUp} semitones, down_avg=${avgDown} semitones`);
  console.log(`  Expected: up > down (larger leaps up, smaller steps down)`);

  // MM-GP-05: Large descents to C
  const largeDescentCPct = results.largeDescentsTotal > 0
    ? Math.round(100 * results.largeDescentsToC / results.largeDescentsTotal)
    : 0;
  console.log(`\nMM-GP-05 (large descents to C): ${results.largeDescentsToC}/${results.largeDescentsTotal} (${largeDescentCPct}%)`);
  console.log(`  Expected: most large descents land on C`);

  // MM-C-04: G→C' at phrase starts
  const gToCPct = results.gToCPrimeAtStart.attempts > 0
    ? Math.round(100 * results.gToCPrimeAtStart.hits / results.gToCPrimeAtStart.attempts)
    : 0;
  console.log(`\nMM-C-04 (G→C' at start of a,c): ${results.gToCPrimeAtStart.hits}/${results.gToCPrimeAtStart.attempts} (${gToCPct}%)`);
  console.log(`  Expected: elevated rate vs random`);

  // MM-E-05: E approach direction
  const eLowerTotal = results.eApproach.lowerFromAbove + results.eApproach.lowerFromBelow;
  const eUpperTotal = results.eApproach.upperFromAbove + results.eApproach.upperFromBelow;
  const eLowerFromAbovePct = eLowerTotal > 0 ? Math.round(100 * results.eApproach.lowerFromAbove / eLowerTotal) : 0;
  const eUpperFromBelowPct = eUpperTotal > 0 ? Math.round(100 * results.eApproach.upperFromBelow / eUpperTotal) : 0;
  console.log(`\nMM-E-05 (E approach direction):`);
  console.log(`  E (lower): from above=${eLowerFromAbovePct}% (${results.eApproach.lowerFromAbove}/${eLowerTotal})`);
  console.log(`  E' (upper): from below=${eUpperFromBelowPct}% (${results.eApproach.upperFromBelow}/${eUpperTotal})`);
  console.log(`  Expected: E from above, E' from below`);

  // MM-G-04: G↔Bb oscillations
  const gBbPhraseEPct = results.gBbOscillations.phraseEMoves > 0
    ? (100 * results.gBbOscillations.phraseE / results.gBbOscillations.phraseEMoves).toFixed(1)
    : 0;
  const gBbOtherPct = results.gBbOscillations.otherMoves > 0
    ? (100 * results.gBbOscillations.otherPhrases / results.gBbOscillations.otherMoves).toFixed(1)
    : 0;
  console.log(`\nMM-G-04 (G↔Bb in phrase e): e=${gBbPhraseEPct}% other=${gBbOtherPct}%`);
  console.log(`  Expected: higher in phrase e`);

  // MM-S-02: F early in phrase c
  const fEarlyCPct = results.fEarlyInPhrase.cTotal > 0
    ? (100 * results.fEarlyInPhrase.c / results.fEarlyInPhrase.cTotal).toFixed(1)
    : 0;
  const fEarlyOtherPct = results.fEarlyInPhrase.otherTotal > 0
    ? (100 * results.fEarlyInPhrase.other / results.fEarlyInPhrase.otherTotal).toFixed(1)
    : 0;
  console.log(`\nMM-S-02 (F early in phrase c): c=${fEarlyCPct}% other=${fEarlyOtherPct}%`);
  console.log(`  Expected: higher in phrase c (subdominant context)`);

  // MM-AD-01: A as passing tone
  const aPassingPct = results.aPassing.total > 0
    ? Math.round(100 * results.aPassing.valid / results.aPassing.total)
    : 0;
  console.log(`\nMM-AD-01 (A as passing tone): ${results.aPassing.valid}/${results.aPassing.total} (${aPassingPct}%)`);
  console.log(`  Expected: most A's preceded by G/Bb/C'`);

  // MM-BB-02: C'→Bb by phrase
  const cPrimeToBbACPct = results.cPrimeToBb.acTotal > 0
    ? Math.round(100 * results.cPrimeToBb.ac / results.cPrimeToBb.acTotal)
    : 0;
  const cPrimeToBbBDPct = results.cPrimeToBb.bdTotal > 0
    ? Math.round(100 * results.cPrimeToBb.bd / results.cPrimeToBb.bdTotal)
    : 0;
  console.log(`\nMM-BB-02 (C'→Bb by phrase): a,c=${cPrimeToBbACPct}% b,d=${cPrimeToBbBDPct}%`);
  console.log(`  Expected: higher in a,c than b,d`);

  // MM-BB-03: Bb approach in phrase e
  const bbFromGAPct = results.bbInPhraseE.totalBb > 0
    ? Math.round(100 * results.bbInPhraseE.fromGA / results.bbInPhraseE.totalBb)
    : 0;
  console.log(`\nMM-BB-03 (Bb approach in phrase e): from G/A=${bbFromGAPct}% (${results.bbInPhraseE.fromGA}/${results.bbInPhraseE.totalBb})`);
  console.log(`  Expected: Bb often approached from G or A below`);

  console.log('\n' + '='.repeat(50));
  console.log(`\n🎲 Seed: ${usedSeed}`);
  console.log(`   Reproduce: node test-runner.js ${numStanzas} ${usedSeed}`);

  clearSeed();
}

// Parse command line args
const args = process.argv.slice(2);
const numStanzas = parseInt(args[0]) || 200;
const seed = args[1] ? parseInt(args[1]) : null;

runTest(numStanzas, seed);

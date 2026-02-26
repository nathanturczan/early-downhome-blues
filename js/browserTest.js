// js/browserTest.js
//
// Browser parity test - runs the same logic as test-phase2.mjs
// Call window.runBrowserTest() from console to execute

import { adjacency } from './network.js';
import { selectWeightedNote, getRestartNote, getPhrasingEnabled } from './rules/weightedSelection.js';
import {
  recordNote, freezePhrase, clearPhrases, shouldRepeat,
  getRepetitionNote, getDebugStats, resetPhraseMemory
} from './phraseMemory.js';
import {
  getPosition, advanceStep, advancePhrase, resetStanza,
  setPosition, PHRASE_SEQUENCE
} from './stanza.js';

function isC(note) {
  return note === "c'" || note === "c''";
}

/**
 * Run test harness - same logic as Node test
 */
export function runBrowserTest(numStanzas = 10) {
  console.log(`\n🧪 Browser Test: ${numStanzas} stanzas...\n`);
  console.log(`📊 Phrasing enabled: ${getPhrasingEnabled()}`);

  const results = {
    repetitionAttempts: { c: 0, d: 0, f: 0 },
    repetitionHits: { c: 0, d: 0, f: 0 },
    cadenceAttempts: { b: 0, d: 0, f: 0 },
    cadenceHits: { b: 0, d: 0, f: 0 },
    phraseNoteCounts: { a: [], b: [], c: [], d: [], e: [], f: [] }
  };

  for (let stanza = 0; stanza < numStanzas; stanza++) {
    // Reset state for new stanza
    setPosition(0, 0);
    resetPhraseMemory();

    let currentNote = getRestartNote();
    let history = [{ note: currentNote, position: null }];
    let stanzaComplete = false;

    // Record first note
    const firstPos = getPosition();
    recordNote(firstPos.phrase, currentNote);

    while (!stanzaComplete) {
      const position = getPosition();
      const candidates = adjacency[currentNote] || [];

      if (candidates.length === 0) {
        // Sink - freeze phrase and advance
        const lastPhrase = position.phrase;
        if (lastPhrase === 'a' || lastPhrase === 'b') {
          freezePhrase(lastPhrase);
        }
        results.phraseNoteCounts[lastPhrase].push(position.stepInPhrase + 1);

        // Check cadence
        if (['b', 'd', 'f'].includes(lastPhrase)) {
          results.cadenceAttempts[lastPhrase]++;
          if (isC(currentNote)) results.cadenceHits[lastPhrase]++;
        }

        stanzaComplete = advancePhrase();
        if (!stanzaComplete) {
          const newPos = getPosition();
          currentNote = getRestartNote(newPos);
          history = [{ note: currentNote, position: null }];
          recordNote(newPos.phrase, currentNote);
        }
      } else {
        // Check for repetition
        let fromRepetition = false;
        if (shouldRepeat(position.phrase)) {
          results.repetitionAttempts[position.phrase]++;
          const repNote = getRepetitionNote(position.phrase, position.stepInPhrase, candidates);
          if (repNote) {
            currentNote = repNote;
            fromRepetition = true;
            results.repetitionHits[position.phrase]++;
          }
        }

        if (!fromRepetition) {
          const historyNotes = history.map(h => h.note);
          const result = selectWeightedNote(currentNote, historyNotes, candidates, 0, position);
          currentNote = result.note;
        }

        history.push({ note: currentNote, position: { phraseIndex: position.phraseIndex, stepInPhrase: position.stepInPhrase } });
        recordNote(position.phrase, currentNote);

        const phraseEnded = advanceStep();
        if (phraseEnded) {
          const lastPhrase = position.phrase;
          if (lastPhrase === 'a' || lastPhrase === 'b') {
            freezePhrase(lastPhrase);
          }
          results.phraseNoteCounts[lastPhrase].push(position.stepInPhrase + 1);

          // Check cadence
          if (['b', 'd', 'f'].includes(lastPhrase)) {
            results.cadenceAttempts[lastPhrase]++;
            if (isC(currentNote)) results.cadenceHits[lastPhrase]++;
          }

          stanzaComplete = advancePhrase();
          if (!stanzaComplete) {
            const newPos = getPosition();
            currentNote = getRestartNote(newPos);
            history = [{ note: currentNote, position: null }];
            recordNote(newPos.phrase, currentNote);
          }
        }

        if (history.length > 10) history = history.slice(-10);
      }
    }
  }

  // Calculate and report results
  const report = {
    repetition: {},
    cadence: {},
    phraseLengths: {}
  };

  for (const p of ['c', 'd', 'f']) {
    const attempts = results.repetitionAttempts[p];
    const hits = results.repetitionHits[p];
    const pct = attempts > 0 ? Math.round(100 * hits / attempts) : 0;
    report.repetition[p] = { hits, attempts, pct: `${pct}%` };
  }

  let totalCadenceAttempts = 0, totalCadenceHits = 0;
  for (const p of ['b', 'd', 'f']) {
    const attempts = results.cadenceAttempts[p];
    const hits = results.cadenceHits[p];
    totalCadenceAttempts += attempts;
    totalCadenceHits += hits;
    const pct = attempts > 0 ? Math.round(100 * hits / attempts) : 0;
    report.cadence[p] = { hits, attempts, pct: `${pct}%` };
  }
  report.cadence.total = {
    hits: totalCadenceHits,
    attempts: totalCadenceAttempts,
    pct: `${Math.round(100 * totalCadenceHits / totalCadenceAttempts)}%`
  };

  for (const p of PHRASE_SEQUENCE) {
    const counts = results.phraseNoteCounts[p];
    const avg = counts.length > 0 ? (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1) : 'N/A';
    report.phraseLengths[p] = { avg, samples: counts.length };
  }

  console.log('\n📊 BROWSER TEST RESULTS\n');
  console.log('REPETITION (notes matched from source phrase):');
  console.table(report.repetition);
  console.log('\nCADENCES (phrase ending on C):');
  console.table(report.cadence);
  console.log('\nPHRASE LENGTHS:');
  console.table(report.phraseLengths);
  console.log('\n✅ Browser test complete');

  return report;
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  window.runBrowserTest = runBrowserTest;
  window.getDebugStats = getDebugStats;
  console.log('🧪 Browser test ready: call window.runBrowserTest(10) in console');
}

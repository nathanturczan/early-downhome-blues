// js/browserTest.js
//
// Browser parity test - mirrors the exact code path of app.js nextNote()
// Call window.runBrowserTest() from console to execute

import { adjacency } from './network.js';
import { selectWeightedNote, getRestartNote, getPhrasingEnabled, setPhrasing } from './rules/weightedSelection.js';
import { recordNote, freezePhrase, resetPhraseMemory, getDebugStats } from './phraseMemory.js';
import { getPosition, advanceStep, advancePhrase, setPosition, decideSplits, PHRASE_SEQUENCE } from './stanza.js';

function isC(note) {
  return note === "c'" || note === "c''";
}

/**
 * Run test harness - mirrors app.js nextNote() exactly
 */
export function runBrowserTest(numStanzas = 10) {
  console.log(`\n🧪 Browser Test: ${numStanzas} stanzas...\n`);

  // Log current config
  console.log('📊 Config:');
  console.log('  phrasingEnabled:', getPhrasingEnabled());

  // Ensure phrasing is ON for test
  if (!getPhrasingEnabled()) {
    console.log('  ⚠️ Phrasing was OFF, enabling for test');
    setPhrasing(true);
  }

  const results = {
    repetitionAttempts: { c: 0, d: 0, f: 0 },
    repetitionHits: { c: 0, d: 0, f: 0 },
    cadenceAttempts: { b: 0, d: 0, f: 0 },
    cadenceHits: { b: 0, d: 0, f: 0 },
    phraseNoteCounts: { a: [], b: [], c: [], d: [], e: [], f: [] }
  };

  for (let stanza = 0; stanza < numStanzas; stanza++) {
    // Reset state for new stanza (mirrors app.js stanza reset)
    setPosition(0, 0);
    resetPhraseMemory();

    // Start with restart note (mirrors app.js)
    const startPos = getPosition();
    let currentNote = getRestartNote(startPos);
    let history = [{ note: currentNote, position: null }];

    // Record first note
    recordNote(startPos.phrase, currentNote);

    let stanzaComplete = false;

    while (!stanzaComplete) {
      const position = getPosition();
      const candidates = adjacency[currentNote] || [];

      if (candidates.length === 0) {
        // SINK PATH - mirrors app.js exactly
        // Freeze phrase for repetition before advancing
        if (position.phrase === 'a' || position.phrase === 'b') {
          freezePhrase(position.phrase);
        }

        // Record phrase length
        results.phraseNoteCounts[position.phrase].push(position.stepInPhrase + 1);

        // Check cadence (did we end on C?)
        if (['b', 'd', 'f'].includes(position.phrase)) {
          results.cadenceAttempts[position.phrase]++;
          if (isC(currentNote)) {
            results.cadenceHits[position.phrase]++;
          }
        }

        // Advance to next phrase
        stanzaComplete = advancePhrase();

        if (!stanzaComplete) {
          const newPosition = getPosition();

          // Decide splits for phrases e and f
          if (newPosition.phrase === 'e' || newPosition.phrase === 'f') {
            decideSplits(newPosition.phrase);
          }

          currentNote = getRestartNote(newPosition);
          history = [{ note: currentNote, position: null }];
          recordNote(newPosition.phrase, currentNote);
        }
      } else {
        // NORMAL PATH - mirrors app.js exactly
        // Extract just notes for the selection algorithm
        const historyNotes = history.map(h => h.note);

        // Call selectWeightedNote - this handles repetition internally!
        const result = selectWeightedNote(currentNote, historyNotes, candidates, 0, position);
        currentNote = result.note;

        // Track repetition using the flag from selectWeightedNote
        if (['c', 'd', 'f'].includes(position.phrase)) {
          results.repetitionAttempts[position.phrase]++;
          if (result.fromRepetition) {
            results.repetitionHits[position.phrase]++;
          }
        }

        // Store with position for history
        history.push({
          note: currentNote,
          position: { phraseIndex: position.phraseIndex, stepInPhrase: position.stepInPhrase }
        });
        recordNote(position.phrase, currentNote);

        // Advance step
        const phraseEnded = advanceStep();

        if (phraseEnded || result.shouldRestart) {
          // Freeze phrase for repetition before advancing
          if (position.phrase === 'a' || position.phrase === 'b') {
            freezePhrase(position.phrase);
          }

          // Record phrase length
          results.phraseNoteCounts[position.phrase].push(position.stepInPhrase + 1);

          // Check cadence
          if (['b', 'd', 'f'].includes(position.phrase)) {
            results.cadenceAttempts[position.phrase]++;
            if (isC(currentNote)) {
              results.cadenceHits[position.phrase]++;
            }
          }

          stanzaComplete = advancePhrase();

          if (!stanzaComplete) {
            const newPosition = getPosition();

            // Decide splits for phrases e and f
            if (newPosition.phrase === 'e' || newPosition.phrase === 'f') {
              decideSplits(newPosition.phrase);
            }

            currentNote = getRestartNote(newPosition);
            history = [{ note: currentNote, position: null }];
            recordNote(newPosition.phrase, currentNote);
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

  console.log('\n📊 BROWSER TEST RESULTS\n');

  console.log('REPETITION (notes matched from source phrase):');
  for (const p of ['c', 'd', 'f']) {
    const attempts = results.repetitionAttempts[p];
    const hits = results.repetitionHits[p];
    const pct = attempts > 0 ? Math.round(100 * hits / attempts) : 0;
    report.repetition[p] = { hits, attempts, pct: `${pct}%` };
  }
  console.table(report.repetition);

  console.log('\nCADENCES (phrase ending on C):');
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
  console.table(report.cadence);

  console.log('\nPHRASE LENGTHS:');
  for (const p of PHRASE_SEQUENCE) {
    const counts = results.phraseNoteCounts[p];
    const avg = counts.length > 0 ? (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1) : 'N/A';
    report.phraseLengths[p] = { avg, samples: counts.length };
  }
  console.table(report.phraseLengths);

  console.log('\n✅ Browser test complete');
  console.log('\nExpected ranges:');
  console.log('  Repetition: ~80-90% (minus 10% variation chance)');
  console.log('  Cadence: ~55-65%');

  return report;
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  window.runBrowserTest = runBrowserTest;
  window.getDebugStats = getDebugStats;
  console.log('🧪 Browser test ready: call window.runBrowserTest(20) in console');
}

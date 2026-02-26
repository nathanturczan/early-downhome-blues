// js/browserTest.js
//
// Browser parity test - mirrors the exact code path of app.js nextNote()
// Call window.runBrowserTest() from console to execute

import { adjacency } from './network.js';
import { selectWeightedNote, getRestartNote, getPhrasingEnabled, setPhrasing } from './rules/weightedSelection.js';
import { recordNote, freezePhrase, resetPhraseMemory, getDebugStats } from './phraseMemory.js';
import { getPosition, advanceStep, advancePhrase, setPosition, decideSplits, chooseContourType, PHRASE_SEQUENCE } from './stanza.js';
import { frequencies } from './network.js';

/**
 * Convert note to MIDI for pitch height tracking
 */
function noteToMidi(note) {
  const freq = frequencies[note];
  if (!freq) return 60;
  return 69 + 12 * Math.log2(freq / 440);
}
import { setSeed, clearSeed, getSeed, generateSeed } from './random.js';

function isC(note) {
  return note === "c'" || note === "c''";
}

/**
 * Run test harness - mirrors app.js nextNote() exactly
 * @param {number} numStanzas - Number of stanzas to simulate
 * @param {number|null} seed - Optional seed for reproducibility (null = random)
 */
export function runBrowserTest(numStanzas = 10, seed = null) {
  // Set up seed for reproducibility
  const usedSeed = seed !== null ? seed : generateSeed();
  setSeed(usedSeed);

  console.log(`\n🧪 Browser Test: ${numStanzas} stanzas...\n`);
  console.log(`🎲 Seed: ${usedSeed}`);

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
    phraseNoteCounts: { a: [], b: [], c: [], d: [], e: [], f: [] },
    contourStats: {
      IB: { count: 0, lineAvgs: { 1: [], 2: [], 3: [] } },
      IA: { count: 0, lineAvgs: { 1: [], 2: [], 3: [] } },
      IIB: { count: 0, lineAvgs: { 1: [], 2: [], 3: [] } }
    }
  };

  for (let stanza = 0; stanza < numStanzas; stanza++) {
    // Reset state for new stanza (mirrors app.js stanza reset)
    setPosition(0, 0);
    resetPhraseMemory();
    chooseContourType();

    // Get the chosen contour type
    const startPos = getPosition();
    const contourType = startPos.contourType || 'IB';

    // Track heights per line for this stanza
    const stanzaLineHeights = { 1: [], 2: [], 3: [] };

    // Start with restart note (mirrors app.js)
    let currentNote = getRestartNote(startPos);
    stanzaLineHeights[startPos.line].push(noteToMidi(currentNote));
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

        // Track pitch height for contour analysis
        stanzaLineHeights[position.line].push(noteToMidi(currentNote));

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

    // Record contour stats for this stanza
    if (results.contourStats[contourType]) {
      results.contourStats[contourType].count++;
      for (const line of [1, 2, 3]) {
        const heights = stanzaLineHeights[line];
        if (heights.length > 0) {
          const avg = heights.reduce((a, b) => a + b, 0) / heights.length;
          results.contourStats[contourType].lineAvgs[line].push(avg);
        }
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

  // Contour stats
  console.log('\nCONTOUR ANALYSIS (avg pitch by line):');
  report.contour = {};
  for (const [type, stats] of Object.entries(results.contourStats)) {
    if (stats.count === 0) continue;
    const line1Avg = stats.lineAvgs[1].length > 0
      ? (stats.lineAvgs[1].reduce((a, b) => a + b, 0) / stats.lineAvgs[1].length).toFixed(1)
      : 'N/A';
    const line2Avg = stats.lineAvgs[2].length > 0
      ? (stats.lineAvgs[2].reduce((a, b) => a + b, 0) / stats.lineAvgs[2].length).toFixed(1)
      : 'N/A';
    const line3Avg = stats.lineAvgs[3].length > 0
      ? (stats.lineAvgs[3].reduce((a, b) => a + b, 0) / stats.lineAvgs[3].length).toFixed(1)
      : 'N/A';
    report.contour[type] = {
      count: stats.count,
      line1: line1Avg,
      line2: line2Avg,
      line3: line3Avg,
      trend: `${line1Avg} → ${line2Avg} → ${line3Avg}`
    };
  }
  console.table(report.contour);

  console.log('\n✅ Browser test complete');
  console.log(`\n🎲 Seed used: ${usedSeed}`);
  console.log('   To reproduce: runBrowserTest(' + numStanzas + ', ' + usedSeed + ')');
  console.log('\nExpected ranges:');
  console.log('  Repetition: ~80-90% (minus 10% variation chance)');
  console.log('  Cadence: ~55-65%');
  console.log('\nContour expectations:');
  console.log('  IB: Rise then fall (Line1 < Line2 > Line3)');
  console.log('  IA: Pure descent (Line1 > Line2 > Line3)');
  console.log('  IIB: Rising overall (Line1 < Line2, Line3 elevated)');

  // Clear seed so normal usage is random again
  clearSeed();

  // Include seed in report
  report.seed = usedSeed;
  report.numStanzas = numStanzas;

  return report;
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  window.runBrowserTest = runBrowserTest;
  window.getDebugStats = getDebugStats;
  console.log('🧪 Browser test ready: call window.runBrowserTest(20) or runBrowserTest(20, seed) in console');
}

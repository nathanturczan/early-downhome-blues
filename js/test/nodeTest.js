#!/usr/bin/env node
// js/test/nodeTest.js
//
// Node.js test harness - mirrors browserTest.js exactly
// Usage: node js/test/nodeTest.js [numStanzas] [seed]

// Mock browser globals for module compatibility
globalThis.window = undefined;

import { adjacency, frequencies } from '../network.js';
import { selectWeightedNote, getRestartNote, getPhrasingEnabled, setPhrasing } from '../rules/weightedSelection.js';
import { recordNote, freezePhrase, resetPhraseMemory, getDebugStats } from '../phraseMemory.js';
import { getPosition, advanceStep, advancePhrase, setPosition, decideSplits, chooseContourType, PHRASE_SEQUENCE, CONTOUR_TYPES } from '../stanza.js';
import { setSeed, clearSeed, generateSeed } from '../random.js';

/**
 * Convert note to MIDI for pitch height tracking
 */
function noteToMidi(note) {
  const freq = frequencies[note];
  if (!freq) return 60; // fallback to middle C
  return 69 + 12 * Math.log2(freq / 440);
}

function isC(note) {
  return note === "c'" || note === "c''";
}

/**
 * Run test harness - mirrors app.js nextNote() exactly
 * @param {number} numStanzas - Number of stanzas to simulate
 * @param {number|null} seed - Optional seed for reproducibility (null = random)
 */
export function runNodeTest(numStanzas = 10, seed = null) {
  // Set up seed for reproducibility
  const usedSeed = seed !== null ? seed : generateSeed();
  setSeed(usedSeed);

  console.log(`\n🧪 Node Test: ${numStanzas} stanzas...\n`);
  console.log(`🎲 Seed: ${usedSeed}`);

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
    // Track pitch heights per line for each contour type
    contourStats: {
      IB: { count: 0, lineAvgs: { 1: [], 2: [], 3: [] } },
      IA: { count: 0, lineAvgs: { 1: [], 2: [], 3: [] } },
      IIB: { count: 0, lineAvgs: { 1: [], 2: [], 3: [] } }
    }
  };

  for (let stanza = 0; stanza < numStanzas; stanza++) {
    // Reset state for new stanza (this also chooses contour)
    setPosition(0, 0);
    resetPhraseMemory();
    chooseContourType(); // Choose contour for this stanza

    // Get the chosen contour type
    const startPos = getPosition();
    const contourType = startPos.contourType || 'IB';

    // Track heights per line for this stanza
    const stanzaLineHeights = { 1: [], 2: [], 3: [] };

    // Start with restart note
    let currentNote = getRestartNote(startPos);
    let history = [{ note: currentNote, position: null }];
    recordNote(startPos.phrase, currentNote);

    // Track pitch for first note
    stanzaLineHeights[startPos.line].push(noteToMidi(currentNote));

    let stanzaComplete = false;

    while (!stanzaComplete) {
      const position = getPosition();
      const candidates = adjacency[currentNote] || [];

      if (candidates.length === 0) {
        // SINK PATH
        if (position.phrase === 'a' || position.phrase === 'b') {
          freezePhrase(position.phrase);
        }
        results.phraseNoteCounts[position.phrase].push(position.stepInPhrase + 1);

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
        }
      } else {
        // NORMAL PATH
        const historyNotes = history.map(h => h.note);
        const result = selectWeightedNote(currentNote, historyNotes, candidates, 0, position);
        currentNote = result.note;

        if (['c', 'd', 'f'].includes(position.phrase)) {
          results.repetitionAttempts[position.phrase]++;
          if (result.fromRepetition) {
            results.repetitionHits[position.phrase]++;
          }
        }

        history.push({
          note: currentNote,
          position: { phraseIndex: position.phraseIndex, stepInPhrase: position.stepInPhrase }
        });
        recordNote(position.phrase, currentNote);

        // Track pitch height for contour analysis
        stanzaLineHeights[position.line].push(noteToMidi(currentNote));

        const phraseEnded = advanceStep();

        if (phraseEnded || result.shouldRestart) {
          if (position.phrase === 'a' || position.phrase === 'b') {
            freezePhrase(position.phrase);
          }
          results.phraseNoteCounts[position.phrase].push(position.stepInPhrase + 1);

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
    seed: usedSeed,
    numStanzas,
    repetition: {},
    cadence: {},
    phraseLengths: {}
  };

  console.log('\n📊 NODE TEST RESULTS\n');

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

  console.log('\n✅ Node test complete');
  console.log(`\n🎲 Seed used: ${usedSeed}`);
  console.log(`   To reproduce: node js/test/nodeTest.js ${numStanzas} ${usedSeed}`);
  console.log('\nExpected ranges:');
  console.log('  Repetition: ~80-90% (minus 10% variation chance)');
  console.log('  Cadence: ~55-65%');
  console.log('\nContour expectations:');
  console.log('  IB: Rise then fall (Line1 < Line2 > Line3)');
  console.log('  IA: Pure descent (Line1 > Line2 > Line3)');
  console.log('  IIB: Rising overall (Line1 < Line2, Line3 elevated)');

  clearSeed();

  return report;
}

// CLI entrypoint
const args = process.argv.slice(2);
const numStanzas = args[0] ? parseInt(args[0], 10) : 50;
const seed = args[1] ? parseInt(args[1], 10) : null;

runNodeTest(numStanzas, seed);

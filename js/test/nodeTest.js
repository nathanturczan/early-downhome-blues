#!/usr/bin/env node
// js/test/nodeTest.js
//
// Node.js test harness - mirrors browserTest.js exactly
// Usage: node js/test/nodeTest.js [numStanzas] [seed]

// Mock browser globals for module compatibility
globalThis.window = undefined;

import { adjacency } from '../network.js';
import { selectWeightedNote, getRestartNote, getPhrasingEnabled, setPhrasing } from '../rules/weightedSelection.js';
import { recordNote, freezePhrase, resetPhraseMemory, getDebugStats } from '../phraseMemory.js';
import { getPosition, advanceStep, advancePhrase, setPosition, decideSplits, PHRASE_SEQUENCE } from '../stanza.js';
import { setSeed, clearSeed, generateSeed } from '../random.js';

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
    // Track pitch heights per line for contour analysis
    lineHeights: { 1: [], 2: [], 3: [] }
  };

  for (let stanza = 0; stanza < numStanzas; stanza++) {
    // Reset state for new stanza
    setPosition(0, 0);
    resetPhraseMemory();

    // Track heights per line for this stanza
    const stanzaLineHeights = { 1: [], 2: [], 3: [] };

    // Start with restart note
    const startPos = getPosition();
    let currentNote = getRestartNote(startPos);
    let history = [{ note: currentNote, position: null }];
    recordNote(startPos.phrase, currentNote);

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

  console.log('\n✅ Node test complete');
  console.log(`\n🎲 Seed used: ${usedSeed}`);
  console.log(`   To reproduce: node js/test/nodeTest.js ${numStanzas} ${usedSeed}`);
  console.log('\nExpected ranges:');
  console.log('  Repetition: ~80-90% (minus 10% variation chance)');
  console.log('  Cadence: ~55-65%');

  clearSeed();

  return report;
}

// CLI entrypoint
const args = process.argv.slice(2);
const numStanzas = args[0] ? parseInt(args[0], 10) : 50;
const seed = args[1] ? parseInt(args[1], 10) : null;

runNodeTest(numStanzas, seed);

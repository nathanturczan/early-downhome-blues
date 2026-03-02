// test-runner.js - Node.js test runner for closure system
// Run with: node test-runner.js [numStanzas] [seed]

import { adjacency } from './js/network.js';
import { selectWeightedNote, getRestartNote, setPhrasing } from './js/rules/weightedSelection.js';
import { evaluateClosure, buildClosureContext, MIN_LENGTH } from './js/rules/closure.js';
import { recordNote, freezePhrase, resetPhraseMemory } from './js/phraseMemory.js';
import { getPosition, advanceStep, advancePhrase, setPosition, decideSplits, chooseContourType, getChordForPosition, PHRASE_SEQUENCE } from './js/stanza.js';
import { frequencies } from './js/network.js';
import { setSeed, clearSeed, generateSeed } from './js/random.js';

function noteToMidi(note) {
  const freq = frequencies[note];
  if (!freq) return 60;
  return 69 + 12 * Math.log2(freq / 440);
}

function isC(note) {
  return note === "c'" || note === "c''";
}

function runTest(numStanzas = 200, seed = null) {
  const usedSeed = seed !== null ? seed : generateSeed();
  setSeed(usedSeed);
  setPhrasing(true);

  console.log(`\n🧪 Node Test: ${numStanzas} stanzas, seed: ${usedSeed}\n`);

  const results = {
    cadenceAttempts: { b: 0, d: 0, f: 0 },
    cadenceHits: { b: 0, d: 0, f: 0 },
    phraseNoteCounts: { a: [], b: [], c: [], d: [], e: [], f: [] },
    closureStats: {
      closureEndings: { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 },
      sinkEndings: { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 },
      forcedShortEndings: 0,
      endingNotes: { a: {}, b: {}, c: {}, d: {}, e: {}, f: {} }
    }
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
        }
      } else {
        // NORMAL PATH
        const historyNotes = history.map(h => h.note);
        const result = selectWeightedNote(currentNote, historyNotes, candidates, 0, position);
        const previousNote = currentNote;
        currentNote = result.note;

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
          }
        }

        if (history.length > 10) history = history.slice(-10);
      }
    }
  }

  // Report
  console.log('CADENCES (phrase ending on C):');
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

  console.log('\nENDING NOTES BY PHRASE (b/d/f):');
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

  console.log(`\n🎲 Seed: ${usedSeed}`);
  console.log(`   Reproduce: node test-runner.js ${numStanzas} ${usedSeed}`);

  clearSeed();
}

// Parse command line args
const args = process.argv.slice(2);
const numStanzas = parseInt(args[0]) || 200;
const seed = args[1] ? parseInt(args[1]) : null;

runTest(numStanzas, seed);

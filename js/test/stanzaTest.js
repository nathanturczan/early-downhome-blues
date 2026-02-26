// Stanza Test Script
// Paste this in browser console at localhost:8000 to run automated testing

(async function runStanzaTest() {
  const STANZAS_TO_TEST = 10;
  const STEPS_PER_STANZA = 48; // 6 phrases × 8 steps

  const results = {
    stanzas: 0,
    repetitionHits: { c: 0, d: 0, f: 0 },
    repetitionMisses: { c: 0, d: 0, f: 0 },
    cadenceLandings: { b: 0, d: 0, f: 0 },
    cadenceMisses: { b: 0, d: 0, f: 0 },
    phraseEVariety: [],
    stuckLowCount: 0,
    registerAtPhraseStart: { a: [], c: [], e: [] },
    registerAtPhraseEnd: { b: [], d: [], f: [] }
  };

  // Helper to get MIDI from note
  const frequencies = window.frequencies || {};
  function noteToMidi(note) {
    const freq = frequencies[note];
    if (!freq) return 60;
    return Math.round(69 + 12 * Math.log2(freq / 440));
  }

  // Find the Next button
  const nextBtn = document.getElementById('nextBtn');
  if (!nextBtn) {
    console.error('Next button not found');
    return;
  }

  console.log('🧪 Starting stanza test...');
  console.log(`Running ${STANZAS_TO_TEST} stanzas (${STEPS_PER_STANZA} steps each)`);

  let lastPhrase = null;
  let phraseNotes = {};
  let consecutiveLowNotes = 0;
  const LOW_THRESHOLD = 55; // Below G3

  for (let stanza = 0; stanza < STANZAS_TO_TEST; stanza++) {
    phraseNotes = { a: [], b: [], c: [], d: [], e: [], f: [] };

    for (let step = 0; step < STEPS_PER_STANZA; step++) {
      // Get current state before click
      const positionEl = document.querySelector('.phrase-box.active');
      const currentPhrase = positionEl?.dataset?.phrase || '?';
      const currentNoteEl = document.getElementById('currentNote');
      const noteBefore = currentNoteEl?.textContent || '';

      // Click next
      nextBtn.click();

      // Small delay to let state update
      await new Promise(r => setTimeout(r, 10));

      // Get state after click
      const noteAfter = currentNoteEl?.textContent || '';
      const newPosEl = document.querySelector('.phrase-box.active');
      const newPhrase = newPosEl?.dataset?.phrase || '?';

      // Track notes per phrase
      if (phraseNotes[newPhrase]) {
        phraseNotes[newPhrase].push(noteAfter);
      }

      // Check for phrase transition
      if (lastPhrase && newPhrase !== lastPhrase) {
        // Phrase ended - check cadence
        const lastNotes = phraseNotes[lastPhrase] || [];
        const finalNote = lastNotes[lastNotes.length - 1];

        if (['b', 'd', 'f'].includes(lastPhrase)) {
          // Check if cadential phrases landed on C
          const isC = finalNote?.includes('C') || finalNote?.includes('c');
          if (isC) {
            results.cadenceLandings[lastPhrase]++;
          } else {
            results.cadenceMisses[lastPhrase]++;
          }
        }

        // Check register at phrase boundaries
        if (['a', 'c', 'e'].includes(newPhrase) && phraseNotes[newPhrase]?.length === 1) {
          const startNote = phraseNotes[newPhrase][0];
          const midi = noteToMidi(startNote);
          results.registerAtPhraseStart[newPhrase].push(midi);
        }
      }

      // Track stuck-low
      const midi = noteToMidi(noteAfter);
      if (midi < LOW_THRESHOLD) {
        consecutiveLowNotes++;
        if (consecutiveLowNotes > 8) {
          results.stuckLowCount++;
          consecutiveLowNotes = 0;
        }
      } else {
        consecutiveLowNotes = 0;
      }

      lastPhrase = newPhrase;
    }

    // Check repetition accuracy for this stanza
    function similarity(arr1, arr2) {
      if (!arr1.length || !arr2.length) return 0;
      const minLen = Math.min(arr1.length, arr2.length);
      let matches = 0;
      for (let i = 0; i < minLen; i++) {
        if (arr1[i] === arr2[i]) matches++;
      }
      return matches / minLen;
    }

    // c should match a
    const cSim = similarity(phraseNotes.a, phraseNotes.c);
    if (cSim > 0.5) results.repetitionHits.c++;
    else results.repetitionMisses.c++;

    // d should match b
    const dSim = similarity(phraseNotes.b, phraseNotes.d);
    if (dSim > 0.5) results.repetitionHits.d++;
    else results.repetitionMisses.d++;

    // f should match b
    const fSim = similarity(phraseNotes.b, phraseNotes.f);
    if (fSim > 0.5) results.repetitionHits.f++;
    else results.repetitionMisses.f++;

    // Track phrase e variety
    results.phraseEVariety.push(phraseNotes.e.join('→'));

    results.stanzas++;
    console.log(`Stanza ${stanza + 1} complete`);
  }

  // Report
  console.log('\n📊 TEST RESULTS\n');

  console.log('REPETITION ACCURACY (>50% note match):');
  console.log(`  c repeats a: ${results.repetitionHits.c}/${results.stanzas} stanzas (${(100*results.repetitionHits.c/results.stanzas).toFixed(0)}%)`);
  console.log(`  d repeats b: ${results.repetitionHits.d}/${results.stanzas} stanzas (${(100*results.repetitionHits.d/results.stanzas).toFixed(0)}%)`);
  console.log(`  f repeats b: ${results.repetitionHits.f}/${results.stanzas} stanzas (${(100*results.repetitionHits.f/results.stanzas).toFixed(0)}%)`);

  console.log('\nCADENCE LANDINGS (b/d/f ending on C):');
  const totalCadences = results.cadenceLandings.b + results.cadenceLandings.d + results.cadenceLandings.f;
  const totalCadenceMisses = results.cadenceMisses.b + results.cadenceMisses.d + results.cadenceMisses.f;
  console.log(`  b: ${results.cadenceLandings.b} hits, ${results.cadenceMisses.b} misses`);
  console.log(`  d: ${results.cadenceLandings.d} hits, ${results.cadenceMisses.d} misses`);
  console.log(`  f: ${results.cadenceLandings.f} hits, ${results.cadenceMisses.f} misses`);
  console.log(`  Total: ${totalCadences}/${totalCadences + totalCadenceMisses} (${(100*totalCadences/(totalCadences+totalCadenceMisses)).toFixed(0)}%)`);

  console.log('\nSTUCK-LOW EVENTS (8+ consecutive notes below G3):');
  console.log(`  ${results.stuckLowCount} occurrences`);

  console.log('\nREGISTER AT PHRASE STARTS (MIDI note number):');
  for (const phrase of ['a', 'c', 'e']) {
    const notes = results.registerAtPhraseStart[phrase];
    if (notes.length) {
      const avg = notes.reduce((a,b) => a+b, 0) / notes.length;
      console.log(`  ${phrase}: avg=${avg.toFixed(1)}, range=${Math.min(...notes)}-${Math.max(...notes)}`);
    }
  }

  console.log('\nPHRASE E VARIETY (should be diverse):');
  const uniqueE = new Set(results.phraseEVariety).size;
  console.log(`  ${uniqueE}/${results.stanzas} unique patterns`);

  console.log('\n✅ Test complete');

  return results;
})();

// js/test/browserTest.js
// Assumes your real app exports/creates a stanza engine that the UI uses.

import { resetPhraseMemory, getPhraseNotesSnapshot } from "../phraseMemory.js";
import { createStanza } from "../stanza.js"; // adjust if your factory/name differs

function deepEqPitch(a, b) {
  return a === b;
}

function pitchOf(note) {
  // support either plain string, object, or note with .pitch / .name
  if (note == null) return null;
  if (typeof note === "string") return note;
  if (typeof note.pitch === "string") return note.pitch;
  if (typeof note.name === "string") return note.name;
  if (typeof note.note === "string") return note.note;
  return String(note);
}

function isCadenceC(note) {
  const p = pitchOf(note);
  // match your project's C / C' representation
  // examples: "c", "c'", "c4", "C4"
  if (!p) return false;
  const s = p.toLowerCase();
  return s === "c" || s === "c'" || s.startsWith("c");
}

function getPhraseLengths(phraseNotesSnap) {
  const out = {};
  for (const k of ["a", "b", "c", "d", "e", "f"]) {
    out[k] = phraseNotesSnap[k]?.length ?? 0;
  }
  return out;
}

function computeRepeatStats(phraseNotesSnap) {
  // repetition sources: c<-a, d<-b, f<-b
  const pairs = [
    ["c", "a"],
    ["d", "b"],
    ["f", "b"],
  ];

  const rep = { c: { hits: 0, attempts: 0 }, d: { hits: 0, attempts: 0 }, f: { hits: 0, attempts: 0 } };

  for (const [dst, src] of pairs) {
    const dstArr = phraseNotesSnap[dst] || [];
    const srcArr = phraseNotesSnap[src] || [];
    const n = Math.min(dstArr.length, srcArr.length);
    for (let i = 0; i < n; i++) {
      rep[dst].attempts += 1;
      if (deepEqPitch(pitchOf(dstArr[i]), pitchOf(srcArr[i]))) rep[dst].hits += 1;
    }
  }

  const pct = (h, a) => (a === 0 ? "0%" : `${Math.round((h / a) * 100)}%`);
  return {
    c: { hits: rep.c.hits, attempts: rep.c.attempts, pct: pct(rep.c.hits, rep.c.attempts) },
    d: { hits: rep.d.hits, attempts: rep.d.attempts, pct: pct(rep.d.hits, rep.d.attempts) },
    f: { hits: rep.f.hits, attempts: rep.f.attempts, pct: pct(rep.f.hits, rep.f.attempts) },
  };
}

function computeCadenceStats(stanzaLastNotes) {
  // cadence phrases b/d/f
  const out = {
    b: { hits: 0, attempts: 0 },
    d: { hits: 0, attempts: 0 },
    f: { hits: 0, attempts: 0 },
    total: { hits: 0, attempts: 0 },
  };

  for (const k of ["b", "d", "f"]) {
    out[k].attempts += stanzaLastNotes[k]?.length ?? 0;
    for (const n of stanzaLastNotes[k] || []) {
      if (isCadenceC(n)) out[k].hits += 1;
    }
  }

  out.total.hits = out.b.hits + out.d.hits + out.f.hits;
  out.total.attempts = out.b.attempts + out.d.attempts + out.f.attempts;

  const pct = (h, a) => (a === 0 ? "0%" : `${Math.round((h / a) * 100)}%`);
  return {
    b: { hits: out.b.hits, attempts: out.b.attempts, pct: pct(out.b.hits, out.b.attempts) },
    d: { hits: out.d.hits, attempts: out.d.attempts, pct: pct(out.d.hits, out.d.attempts) },
    f: { hits: out.f.hits, attempts: out.f.attempts, pct: pct(out.f.hits, out.f.attempts) },
    total: { hits: out.total.hits, attempts: out.total.attempts, pct: pct(out.total.hits, out.total.attempts) },
  };
}

window.runBrowserTest = async function runBrowserTest(stanzas = 10) {
  // IMPORTANT: this must exercise the SAME stanza engine path as clicking "Next".
  // So we create a stanza and repeatedly call its "advance one note" function.

  console.log("🧪 Browser test starting...", { stanzas });

  // If your app has global toggles, ensure phrasing is ON here:
  // window.setPhrasing?.(true); // adjust if you have a setter
  // window.setAutoHarmony?.(false);

  const repAgg = { c: { hits: 0, attempts: 0 }, d: { hits: 0, attempts: 0 }, f: { hits: 0, attempts: 0 } };
  const cadLastNotes = { b: [], d: [], f: [] };

  const phraseLenAgg = {
    a: { sum: 0, samples: 0 },
    b: { sum: 0, samples: 0 },
    c: { sum: 0, samples: 0 },
    d: { sum: 0, samples: 0 },
    e: { sum: 0, samples: 0 },
    f: { sum: 0, samples: 0 },
  };

  for (let s = 0; s < stanzas; s++) {
    resetPhraseMemory();

    const stanza = createStanza(); // adjust to your constructor/factory

    // --- PICK THE RIGHT STEP FUNCTION (must match UI "Next") ---
    // Option A:
    const stepFn = stanza.nextNote?.bind(stanza);
    // Option B:
    // const stepFn = stanza.advance?.bind(stanza);
    // Option C:
    // const stepFn = stanza.step?.bind(stanza);

    if (!stepFn) {
      throw new Error("No stanza step function found. Expected stanza.nextNote() or stanza.advance() or stanza.step().");
    }

    // Generate one full stanza.
    // If you already have stanza.totalSteps or a completion flag, use that instead.
    // Otherwise, assume 12 bars * (your internal notes per bar) is handled by the engine and expose `stanza.isComplete`.
    let safety = 2000;
    while (!stanza.isComplete?.() && safety-- > 0) {
      stepFn();
    }
    if (safety <= 0) {
      console.warn("⚠️ Safety break: stanza did not complete.");
    }

    // Snapshot phrase memory AFTER stanza generation
    const snap = getPhraseNotesSnapshot();

    // Aggregate repetition stats from snapshot
    const rep = computeRepeatStats(snap);
    for (const k of ["c", "d", "f"]) {
      repAgg[k].hits += rep[k].hits;
      repAgg[k].attempts += rep[k].attempts;
    }

    // Aggregate cadence last-note stats (use phraseMemory for last note of b/d/f)
    for (const k of ["b", "d", "f"]) {
      const arr = snap[k] || [];
      if (arr.length) cadLastNotes[k].push(arr[arr.length - 1]);
    }

    // Aggregate phrase lengths
    for (const k of ["a", "b", "c", "d", "e", "f"]) {
      phraseLenAgg[k].sum += (snap[k]?.length ?? 0);
      phraseLenAgg[k].samples += 1;
    }
  }

  const pct = (h, a) => (a === 0 ? "0%" : `${Math.round((h / a) * 100)}%`);
  const repOut = {
    c: { hits: repAgg.c.hits, attempts: repAgg.c.attempts, pct: pct(repAgg.c.hits, repAgg.c.attempts) },
    d: { hits: repAgg.d.hits, attempts: repAgg.d.attempts, pct: pct(repAgg.d.hits, repAgg.d.attempts) },
    f: { hits: repAgg.f.hits, attempts: repAgg.f.attempts, pct: pct(repAgg.f.hits, repAgg.f.attempts) },
  };

  const cadOut = computeCadenceStats(cadLastNotes);

  const lenOut = {};
  for (const k of ["a", "b", "c", "d", "e", "f"]) {
    lenOut[k] = {
      avg: (phraseLenAgg[k].sum / phraseLenAgg[k].samples).toFixed(1),
      samples: phraseLenAgg[k].samples,
    };
  }

  console.log("📊 BROWSER TEST RESULTS");
  console.log("REPETITION (notes matched from source phrase):");
  console.table(repOut);
  console.log("CADENCES (phrase ending on C):");
  console.table(cadOut);
  console.log("PHRASE LENGTHS:");
  console.table(lenOut);
  console.log("✅ Browser test complete");

  return { repetition: repOut, cadences: cadOut, phraseLengths: lenOut };
};
// Transpose module - matches blues mode to incoming chord/scale data

import { setAudioTransposition } from './audio.js';

// Blues mode pitch classes (relative to C = 0)
// Ignoring quarter-tone (3.5) for matching purposes, but it transposes with the rest
const BLUES_MODE_PCS = [0, 2, 3, 4, 5, 6, 7, 9, 10, 11];

// Current transposition offset (0-11 semitones)
let currentTransposition = 0;

// Chord lookup data (loaded from JSON)
let chordLookup = null;

// Load chord lookup data
export async function loadChordData() {
    if (chordLookup) return chordLookup;

    try {
        const response = await fetch('data/chords_no_supersets.json');
        chordLookup = await response.json();
        console.log('[Transpose] Loaded chord lookup data');
        return chordLookup;
    } catch (err) {
        console.error('[Transpose] Failed to load chord data:', err);
        return null;
    }
}

// Transpose a pitch class by n semitones
function transposePc(pc, semitones) {
    return ((pc + semitones) % 12 + 12) % 12;
}

// Transpose the blues mode by n semitones
function transposedBluesMode(semitones) {
    return BLUES_MODE_PCS.map(pc => transposePc(pc, semitones));
}

// Calculate overlap between two pitch class sets
function calculateOverlap(pcs1, pcs2) {
    const set2 = new Set(pcs2);
    return pcs1.filter(pc => set2.has(pc)).length;
}

// Find best transposition to match target pitch classes
// Returns { transposition: 0-11, overlap: number, interpretation: string, targetPcs: [...] }
export function findBestTransposition(targetPcs, targetRoot = null) {
    let bestTransposition = 0;
    let bestScore = -1;
    let bestOverlap = 0;
    let bestInterpretation = 'none';

    // Include root in target if provided
    const targetSet = targetRoot !== null
        ? [...new Set([...targetPcs, targetRoot])]
        : targetPcs;

    // Chord function relationships (blues mode root relative to chord root)
    // If transposition T makes the chord root land on these scale degrees:
    const chordFunctions = {
        0: { name: 'I', bonus: 2.0 },    // Chord is the I (tonic)
        5: { name: 'IV', bonus: 1.5 },   // Chord is the IV (subdominant)
        7: { name: 'V', bonus: 1.5 },    // Chord is the V (dominant)
        2: { name: 'ii', bonus: 0.5 },
        3: { name: 'bIII', bonus: 0.5 },
        8: { name: 'bVI', bonus: 0.5 },
        9: { name: 'vi', bonus: 0.5 },
        10: { name: 'bVII', bonus: 0.5 }
    };

    // Test all 12 transpositions
    for (let t = 0; t < 12; t++) {
        const transposed = transposedBluesMode(t);
        const overlap = calculateOverlap(transposed, targetSet);

        // Calculate chord function bonus
        // The chord root relative to the transposed blues root
        let functionBonus = 0;
        let interpretation = 'none';

        if (targetRoot !== null) {
            // What scale degree does the chord root fall on?
            const chordDegree = ((targetRoot - t) % 12 + 12) % 12;
            const func = chordFunctions[chordDegree];
            if (func) {
                functionBonus = func.bonus;
                interpretation = func.name;
            }
        }

        const score = overlap + functionBonus;

        if (score > bestScore) {
            bestScore = score;
            bestOverlap = overlap;
            bestTransposition = t;
            bestInterpretation = interpretation;
        }
    }

    const noteNames = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
    console.log(`[Transpose] Best: +${bestTransposition} (${noteNames[bestTransposition]}) ` +
        `overlap=${bestOverlap}, interpretation=${bestInterpretation}`);

    return {
        transposition: bestTransposition,
        overlap: bestOverlap,
        interpretation: bestInterpretation,
        targetPcs: targetSet
    };
}

// Look up chord by name and get its pitch classes
export function lookupChord(chordName) {
    if (!chordLookup) {
        console.warn('[Transpose] Chord lookup not loaded');
        return null;
    }

    const chord = chordLookup[chordName.toLowerCase()];
    if (!chord) {
        console.warn('[Transpose] Chord not found:', chordName);
        return null;
    }

    return {
        pitchClasses: chord.prime_form_kinda,
        root: chord.root,
        name: chordName
    };
}

// Get current transposition
export function getCurrentTransposition() {
    return currentTransposition;
}

// Set transposition directly
export function setTransposition(semitones) {
    currentTransposition = ((semitones % 12) + 12) % 12;
    setAudioTransposition(currentTransposition);
    console.log(`[Transpose] Set transposition to +${currentTransposition}`);
    return currentTransposition;
}

// Auto-transpose to match chord data from Firebase
// chordData: { root: number, name: string } or { root: number, pitchClasses: number[] }
export function autoTransposeToChord(chordData) {
    console.log('[Transpose] autoTransposeToChord called with:', chordData);

    if (!chordData) {
        console.warn('[Transpose] chordData is null/undefined');
        return currentTransposition;
    }

    let targetPcs, targetRoot;

    if (chordData.pitchClasses) {
        // Direct pitch classes provided
        console.log('[Transpose] Using provided pitchClasses');
        targetPcs = chordData.pitchClasses;
        targetRoot = chordData.root;
    } else if (chordData.name && chordLookup) {
        // Look up by name
        console.log('[Transpose] Looking up chord by name:', chordData.name);
        const lookup = lookupChord(chordData.name);
        if (lookup) {
            console.log('[Transpose] Chord found in lookup:', lookup);
            targetPcs = lookup.pitchClasses;
            targetRoot = lookup.root;
        } else {
            // Fall back to just using root
            console.log('[Transpose] Chord not in lookup, using root only:', chordData.root);
            targetPcs = [];
            targetRoot = chordData.root;
        }
    } else {
        // Just use root
        console.log('[Transpose] No name or lookup, using root only:', chordData.root);
        targetPcs = [];
        targetRoot = chordData.root;
    }

    console.log('[Transpose] targetPcs:', targetPcs, 'targetRoot:', targetRoot);

    if (targetRoot === undefined && (!targetPcs || targetPcs.length === 0)) {
        console.warn('[Transpose] No valid chord data to transpose to');
        return currentTransposition;
    }

    const result = findBestTransposition(targetPcs, targetRoot);
    currentTransposition = result.transposition;
    setAudioTransposition(currentTransposition);

    return currentTransposition;
}

// Auto-transpose to match scale data from Firebase
// scaleData: { root: number, pitchClasses: number[] }
export function autoTransposeToScale(scaleData) {
    if (!scaleData || !scaleData.pitchClasses) {
        console.warn('[Transpose] No valid scale data to transpose to');
        return currentTransposition;
    }

    const result = findBestTransposition(scaleData.pitchClasses, scaleData.root);
    currentTransposition = result.transposition;
    setAudioTransposition(currentTransposition);

    return currentTransposition;
}

// Transpose a LilyPond note name by current transposition
// e.g., "g'" with transposition 2 -> "a'"
export function transposeLilyNote(lilyNote) {
    if (currentTransposition === 0) return lilyNote;

    // Parse lily note: base + accidentals + octave marks
    const match = lilyNote.match(/^([a-g])(es|eh|is)?('*)$/);
    if (!match) return lilyNote;

    const [, base, accidental, octaveMarks] = match;

    // Base note to semitone
    const baseToSemi = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
    let semi = baseToSemi[base];

    // Add accidental
    if (accidental === 'es') semi -= 1;
    else if (accidental === 'is') semi += 1;
    else if (accidental === 'eh') semi -= 0.5; // quarter-flat

    // Transpose
    const newSemi = semi + currentTransposition;

    // Convert back to lily note
    return semiToLily(newSemi, octaveMarks);
}

// Convert semitone (possibly with 0.5 for quarter-tone) back to LilyPond
function semiToLily(semi, octaveMarks) {
    // Handle quarter-tones
    const isQuarterFlat = semi % 1 === 0.5;
    const baseSemi = Math.floor(semi) % 12;

    // Semitone to note name (prefer flats for blues context)
    const semiToNote = {
        0: 'c', 1: 'des', 2: 'd', 3: 'ees', 4: 'e', 5: 'f',
        6: 'ges', 7: 'g', 8: 'aes', 9: 'a', 10: 'bes', 11: 'b'
    };

    let noteName = semiToNote[baseSemi];

    // Handle quarter-flat (only on E in blues context)
    if (isQuarterFlat && baseSemi === 3) {
        noteName = 'eeh'; // E quarter-flat
    }

    // Adjust octave marks if transposition crossed octave boundary
    const octaveShift = Math.floor((semi) / 12);
    let newOctaveMarks = octaveMarks;
    for (let i = 0; i < octaveShift; i++) {
        newOctaveMarks += "'";
    }

    return noteName + newOctaveMarks;
}

// Get display name for current transposition
export function getTranspositionDisplay() {
    const noteNames = ['C', 'C♯/D♭', 'D', 'E♭', 'E', 'F', 'F♯/G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
    return noteNames[currentTransposition];
}

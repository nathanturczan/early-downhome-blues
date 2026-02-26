/**
 * LEGACY DRONE SYSTEM - Preserved for future reintegration
 *
 * This file contains the original per-degree drone system that was removed
 * in favor of a simplified chord-based harmony system. The old system provided:
 *
 * - Per-note drone buttons (Root, 3rd, 5th, 7th) at multiple octaves
 * - Complex octave routing per chord (getEffectiveOctave)
 * - Closest-octave voice leading (findClosestOctaveFreq)
 * - Granular MIDI output per degree (root, third, fifth, seventh types)
 *
 * To reintegrate: merge this with harmony.js, restore per-degree UI in index.html,
 * and restore per-degree MIDI types in midi.js.
 *
 * Removed: 2026-02-25
 * Reason: UX confusion - Jeff Titon feedback that harmony wasn't discoverable
 */

// ============ DRONE DEGREES ============

export const droneDegrees = {
    'C2': { degree: 'root', octave: 2 }, 'C3': { degree: 'root', octave: 3 },
    'C4': { degree: 'root', octave: 4 }, 'C5': { degree: 'root', octave: 5 },
    'Eb2': { degree: 'third', octave: 2 }, 'Eb3': { degree: 'third', octave: 3 },
    'Eb4': { degree: 'third', octave: 4 },
    'G2': { degree: 'fifth', octave: 2 }, 'G3': { degree: 'fifth', octave: 3 },
    'G4': { degree: 'fifth', octave: 4 },
    'Bb2': { degree: 'seventh', octave: 2 }, 'Bb3': { degree: 'seventh', octave: 3 },
    'Bb4': { degree: 'seventh', octave: 4 }
};

// Octave adjustments per chord to maintain voice leading continuity
export function getEffectiveOctave(degree, octave, currentChord) {
    if (currentChord === 'IV' || currentChord === 'V') {
        if (degree === 'fifth' || degree === 'seventh') {
            return octave + 1;
        }
    }
    if (currentChord === 'bIII' && degree === 'fifth') {
        return octave + 1;
    }
    if (currentChord === 'bVII' && degree === 'third') {
        return octave + 1;
    }
    return octave;
}

// Get pitch class from frequency (approximate)
function freqToPitchClass(freq) {
    const pitchClassToSemitone = {
        'C': 0, 'D': 2, 'Eb': 3, 'Eqf': 3.5, 'E': 4, 'F': 5, 'Gb': 6,
        'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11
    };

    // A4 = 440Hz, A is semitone 9 (where C=0)
    const semitonesFromA4 = 12 * Math.log2(freq / 440);
    // Add 9 (A's position) to get semitone relative to C, handle negative modulo
    const semitoneInOctave = ((Math.round(semitonesFromA4) + 9) % 12 + 12) % 12;

    // Find closest pitch class
    let closest = 'C';
    let minDiff = 12;
    for (const [pc, semi] of Object.entries(pitchClassToSemitone)) {
        const diff = Math.abs(semi - semitoneInOctave);
        if (diff < minDiff) {
            minDiff = diff;
            closest = pc;
        }
    }
    return closest;
}

// Find the closest frequency for a pitch class change - pick the shorter interval
export function findClosestOctaveFreq(currentFreq, targetPitchClass, baseOctave) {
    const pitchClassToSemitone = {
        'C': 0, 'D': 2, 'Eb': 3, 'Eqf': 3.5, 'E': 4, 'F': 5, 'Gb': 6,
        'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11
    };

    function mtof(midiNote) {
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }

    function getFreq(pitchClass, octave) {
        const semitone = pitchClassToSemitone[pitchClass];
        if (semitone === undefined) return 261.63; // fallback to C4
        const midiNote = (octave + 1) * 12 + semitone;
        return mtof(midiNote);
    }

    const currentPC = freqToPitchClass(currentFreq);
    const currentSemi = pitchClassToSemitone[currentPC];
    const targetSemi = pitchClassToSemitone[targetPitchClass];

    if (currentSemi === undefined || targetSemi === undefined) {
        return getFreq(targetPitchClass, baseOctave);
    }

    // Calculate interval going up vs down (within octave, 0-12 semitones)
    let intervalUp = (targetSemi - currentSemi + 12) % 12;
    let intervalDown = (currentSemi - targetSemi + 12) % 12;

    // Handle quarter-tones
    if (targetPitchClass === 'Eqf') {
        intervalUp = (3.5 - currentSemi + 12) % 12;
        intervalDown = (currentSemi - 3.5 + 12) % 12;
    }

    // Pick shorter interval, apply to current frequency
    let semitoneChange;
    if (intervalUp <= intervalDown) {
        semitoneChange = intervalUp;
    } else {
        semitoneChange = -intervalDown;
    }

    // Calculate new frequency: freq * 2^(semitones/12)
    const newFreq = currentFreq * Math.pow(2, semitoneChange / 12);

    return newFreq;
}

// ============ LEGACY DRONE VOICE MANAGEMENT ============

// This was the per-note drone toggle system
// Each button (C2, C3, Eb3, G4, etc.) could be independently toggled
// droneVoices = { 'C2': { osc, env, degree, octave }, ... }

/*
export function toggleDroneNote(note) {
    initDrone();

    if (droneVoices[note]) {
        droneVoices[note].osc.stop();
        droneVoices[note].osc.dispose();
        droneVoices[note].env.dispose();
        delete droneVoices[note];
        return false; // now off
    } else {
        const env = new Tone.Gain(0).connect(droneGain);
        const osc = new Tone.Oscillator(getDroneFreq(note), 'sine').connect(env);
        osc.start();
        env.gain.rampTo(0.5, 0.5);
        droneVoices[note] = {
            osc,
            env,
            degree: droneDegrees[note].degree,
            octave: droneDegrees[note].octave
        };
        return true; // now on
    }
}
*/

// ============ LEGACY MIDI OUTPUT ============

// The old MIDI system had per-degree output types:
// - 'root' -> sends MIDI for root degree only
// - 'third' -> sends MIDI for third degree only
// - 'fifth' -> sends MIDI for fifth degree only
// - 'seventh' -> sends MIDI for seventh degree only

/*
// In midi.js:
const droneTypeOrder = ['root', 'third', 'fifth', 'seventh'];

// addMidiRow would auto-select next unused drone type

export function sendDroneMidi(degree, pitchClass, octave, isOn) {
    midiRows.forEach((row, index) => {
        if (row.type !== degree) return;
        // ... send note for that specific degree
    });
}

export function updateDroneMidi(degree, pitchClass, octave) {
    // Update active drone on pitch change (for inflection)
}
*/

// ============ LEGACY APP.JS FUNCTIONS ============

/*
// In app.js:

function updateDroneLabels() {
    const inflection = getCurrentInflection();
    document.querySelectorAll('.drone-btn').forEach(btn => {
        const note = btn.dataset.note;
        const info = droneDegrees[note];
        if (!info) return;

        const pitchClass = inflection[info.degree];
        const displayOctave = getEffectiveOctave(info.degree, info.octave);
        btn.innerHTML = pitchDisplayNames[pitchClass] + displayOctave;
    });
}

function updateAllDroneMidi() {
    const inflection = getCurrentInflection();
    document.querySelectorAll('.drone-btn.active').forEach(btn => {
        const note = btn.dataset.note;
        const info = droneDegrees[note];
        if (!info) return;

        const pitchClass = inflection[info.degree];
        const effectiveOctave = getEffectiveOctave(info.degree, info.octave);
        updateDroneMidi(info.degree, pitchClass, effectiveOctave);
    });
}

// Drone button click handlers
document.querySelectorAll('.drone-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const note = btn.dataset.note;
        const isNowOn = toggleDroneNote(note);
        btn.classList.toggle('active', isNowOn);

        const info = droneDegrees[note];
        if (info) {
            const inflection = getCurrentInflection();
            const pitchClass = inflection[info.degree];
            const effectiveOctave = getEffectiveOctave(info.degree, info.octave);
            sendDroneMidi(info.degree, pitchClass, effectiveOctave, isNowOn);
        }
    });
});
*/

// ============ LEGACY HTML STRUCTURE ============

/*
<!-- Per-note drone buttons in index.html -->
<div class="drone-rows">
    <div class="drone-row">
        <div class="drone-label">7th</div>
        <div class="drone-buttons">
            <button class="drone-btn" data-note="Bb2">Bb2</button>
            <button class="drone-btn" data-note="Bb3">Bb3</button>
            <button class="drone-btn" data-note="Bb4">Bb4</button>
        </div>
    </div>
    <div class="drone-row">
        <div class="drone-label">5th</div>
        <div class="drone-buttons">
            <button class="drone-btn" data-note="G2">G2</button>
            <button class="drone-btn" data-note="G3">G3</button>
            <button class="drone-btn" data-note="G4">G4</button>
        </div>
    </div>
    <div class="drone-row">
        <div class="drone-label">3rd</div>
        <div class="drone-buttons">
            <button class="drone-btn" data-note="Eb2">Eb2</button>
            <button class="drone-btn" data-note="Eb3">Eb3</button>
            <button class="drone-btn" data-note="Eb4">Eb4</button>
        </div>
    </div>
    <div class="drone-row">
        <div class="drone-label">Root</div>
        <div class="drone-buttons">
            <button class="drone-btn" data-note="C2">C2</button>
            <button class="drone-btn" data-note="C3">C3</button>
            <button class="drone-btn" data-note="C4">C4</button>
            <button class="drone-btn" data-note="C5">C5</button>
        </div>
    </div>
    <div class="drone-row chord-row">
        <div class="drone-label">Chord</div>
        <div class="drone-buttons chord-buttons">
            <button class="chord-btn active" data-chord="I">I</button>
            <button class="chord-btn" data-chord="IV">IV</button>
            <button class="chord-btn" data-chord="V">V</button>
        </div>
    </div>
</div>
*/

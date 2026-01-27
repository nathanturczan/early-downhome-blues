// Audio module - Pluck synth and Drone using Tone.js

// Map LilyPond notes to standard note names and cents offset for quarter-tones
export const lilyToNote = {
    "c'": { note: "C4", detune: 0 },
    "d'": { note: "D4", detune: 0 },
    "ees'": { note: "Eb4", detune: 0 },
    "eeh'": { note: "Eb4", detune: 50 },
    "e'": { note: "E4", detune: 0 },
    "f'": { note: "F4", detune: 0 },
    "ges'": { note: "Gb4", detune: 0 },
    "g'": { note: "G4", detune: 0 },
    "a'": { note: "A4", detune: 0 },
    "bes'": { note: "Bb4", detune: 0 },
    "b'": { note: "B4", detune: 0 },
    "c''": { note: "C5", detune: 0 },
    "d''": { note: "D5", detune: 0 },
    "ees''": { note: "Eb5", detune: 0 },
    "eeh''": { note: "Eb5", detune: 50 },
    "e''": { note: "E5", detune: 0 }
};

// State
let isAudioInitialized = false;
let isAudioMuted = true;
let pluckSynth = null;
let reverb = null;

export function getAudioState() {
    return { isInitialized: isAudioInitialized, isMuted: isAudioMuted };
}

export async function initAudio() {
    if (isAudioInitialized) return;

    await Tone.start();
    const ctx = Tone.getContext();
    if (ctx && ctx.state !== 'running') await ctx.resume();

    reverb = new Tone.Reverb({ decay: 2, wet: 0.25 }).toDestination();
    await reverb.generate();

    pluckSynth = new Tone.PluckSynth({
        attackNoise: 1.5,
        dampening: 3000,
        resonance: 0.98,
        release: 1.5
    }).connect(reverb);

    isAudioInitialized = true;
    isAudioMuted = false;
    console.log('[Audio] Pluck synth ready');
}

export function toggleMute() {
    if (!isAudioInitialized) return false;

    isAudioMuted = !isAudioMuted;
    Tone.Destination.mute = isAudioMuted;
    return !isAudioMuted; // return true if audio is now ON
}

export function playNote(lilyNote, duration = 1.2) {
    if (!isAudioInitialized || !pluckSynth) return;

    const noteInfo = lilyToNote[lilyNote];
    if (!noteInfo) return;

    pluckSynth.set({ detune: noteInfo.detune });
    pluckSynth.triggerAttack(noteInfo.note);
}

// ============ DRONE ============

// All frequencies by pitch class and octave
// Eqf = E quarter-flat (halfway between Eb and E)
const droneBaseFreqs = {
    1: { C: 32.70, D: 36.71, Eb: 38.89, Eqf: 40.03, E: 41.20, F: 43.65, Gb: 46.25, G: 49.00, A: 55.00, Bb: 58.27, B: 61.74 },
    2: { C: 65.41, D: 73.42, Eb: 77.78, Eqf: 80.06, E: 82.41, F: 87.31, Gb: 92.50, G: 98.00, A: 110.00, Bb: 116.54, B: 123.47 },
    3: { C: 130.81, D: 146.83, Eb: 155.56, Eqf: 160.12, E: 164.81, F: 174.61, Gb: 185.00, G: 196.00, A: 220.00, Bb: 233.08, B: 246.94 },
    4: { C: 261.63, D: 293.66, Eb: 311.13, Eqf: 320.24, E: 329.63, F: 349.23, Gb: 369.99, G: 392.00, A: 440.00, Bb: 466.16, B: 493.88 },
    5: { C: 523.25, D: 587.33, Eb: 622.25, Eqf: 640.49, E: 659.26, F: 698.46, Gb: 739.99, G: 783.99, A: 880.00, Bb: 932.33, B: 987.77 },
    6: { C: 1046.50, D: 1174.66, Eb: 1244.51, Eqf: 1280.97, E: 1318.51, F: 1396.91, Gb: 1479.98, G: 1567.98, A: 1760.00, Bb: 1864.66, B: 1975.53 }
};

// Chord-aware inflection rules
// Maps melody note patterns to drone degree changes for each chord
const inflectionRules = {
    'I': {
        'e': { third: 'E' },
        'ees': { third: 'Eb' },
        'eeh': { third: 'Eqf' },
        'f': { third: 'F' },
        'g': { fifth: 'G' },
        'ges': { fifth: 'Gb' },
        'bes': { seventh: 'Bb' },
        'b': { seventh: 'B' }
    },
    'bIII': {
        'ees': { root: 'Eb' },
        'eeh': { root: 'Eqf' },
        'e': { root: 'E' },
        'g': { third: 'G' },
        'ges': { third: 'Gb' },
        'bes': { fifth: 'Bb' },
        'b': { fifth: 'B' }
    },
    'IV': {
        'a': { third: 'A' },
        'bes': { third: 'Bb' },
        'c': { fifth: 'C' },
        'b': { fifth: 'B' },
        'e': { seventh: 'E' },
        'ees': { seventh: 'Eb' },
        'eeh': { seventh: 'Eqf' }
    },
    'V': {
        'b': { third: 'B' },
        'bes': { third: 'Bb' },
        'c': { third: 'C' },
        'f': { seventh: 'F' },
        'ges': { seventh: 'Gb' }
    },
    'bVII': {
        'bes': { root: 'Bb', seventh: 'Bb' },
        'b': { root: 'B' },
        'd': { third: 'D' },
        'ees': { third: 'Eb' },
        'eeh': { third: 'Eqf' },
        'f': { third: 'F' },
        'a': { seventh: 'A' }
    }
};

// Chord definitions: root, 3rd, 5th, 7th
const chordDefinitions = {
    'I':    { root: 'C', third: 'E', fifth: 'G', seventh: 'Bb' },
    'IV':   { root: 'F', third: 'A', fifth: 'C', seventh: 'Eb' },
    'V':    { root: 'G', third: 'B', fifth: 'D', seventh: 'F' },
    'bIII': { root: 'Eb', third: 'G', fifth: 'Bb', seventh: 'D' },
    'bVII': { root: 'Bb', third: 'Eb', fifth: 'F', seventh: 'A' }
};

let currentChord = 'I';

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

// Current inflection (can be modified by melody)
let currentInflection = { root: 'C', third: 'E', fifth: 'G', seventh: 'Bb' };
const droneVoices = {};
let droneGain = null;

export const pitchDisplayNames = {
    'C': 'C', 'D': 'D', 'Eb': 'E\u266D', 'Eqf': 'E<span class="quarter-flat">\u266D</span>', 'E': 'E', 'F': 'F', 'Gb': 'G\u266D',
    'G': 'G', 'A': 'A', 'Bb': 'B\u266D', 'B': 'B'
};

export function getCurrentInflection() {
    return currentInflection;
}

export function getCurrentChord() {
    return currentChord;
}

export function getChordNotes() {
    return chordDefinitions[currentChord];
}

export function setChord(chord, currentMelodyNote = null, shouldInflect = false, isLatch = true) {
    if (!chordDefinitions[chord]) return;
    currentChord = chord;
    const chordDef = chordDefinitions[chord];

    // Reset inflection to chord defaults
    currentInflection = {
        root: chordDef.root,
        third: chordDef.third,
        fifth: chordDef.fifth,
        seventh: chordDef.seventh
    };

    // If inflect is enabled and we have a current melody note, apply its inflection to the new chord
    if (shouldInflect && currentMelodyNote) {
        const rules = inflectionRules[chord];
        const pattern = getNotePattern(currentMelodyNote);
        if (rules && pattern && rules[pattern]) {
            const changes = rules[pattern];
            Object.keys(changes).forEach(degree => {
                currentInflection[degree] = changes[degree];
            });
        }
    }

    // Update all active drone voices to new chord frequencies
    // Use closest octave to minimize pitch jumps
    Object.keys(droneVoices).forEach(key => {
        const voice = droneVoices[key];
        const pitchClass = currentInflection[voice.degree];
        const currentFreq = voice.osc.frequency.value;
        const effectiveOctave = getEffectiveOctave(voice.degree, voice.octave);
        const newFreq = findClosestOctaveFreq(currentFreq, pitchClass, effectiveOctave);
        if (newFreq) {
            voice.osc.frequency.rampTo(newFreq, 0.1);
        }
    });
}

export function resetInflection() {
    const chordDef = chordDefinitions[currentChord];
    currentInflection = {
        root: chordDef.root,
        root: chordDef.root,
        third: chordDef.third,
        fifth: chordDef.fifth,
        seventh: chordDef.seventh
    };
    Object.keys(droneVoices).forEach(key => {
        const voice = droneVoices[key];
        const currentFreq = voice.osc.frequency.value;
        const effectiveOctave = getEffectiveOctave(voice.degree, voice.octave);
        const newFreq = findClosestOctaveFreq(currentFreq, currentInflection[voice.degree], effectiveOctave);
        if (newFreq) voice.osc.frequency.rampTo(newFreq, 0.1);
    });
}

function initDrone() {
    if (droneGain) return;
    droneGain = new Tone.Gain(0.15).toDestination();
}

// Octave adjustments per chord to maintain voice leading continuity
export function getEffectiveOctave(degree, octave) {
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

// Pitch class to semitone offset from C
const pitchClassSemitones = {
    'C': 0, 'D': 2, 'Eb': 3, 'Eqf': 3.5, 'E': 4, 'F': 5, 'Gb': 6,
    'G': 7, 'A': 9, 'Bb': 10, 'B': 11
};

// Get pitch class from frequency (approximate)
function freqToPitchClass(freq) {
    // A4 = 440Hz, A is semitone 9 (where C=0)
    const semitonesFromA4 = 12 * Math.log2(freq / 440);
    // Add 9 (A's position) to get semitone relative to C, handle negative modulo
    const semitoneInOctave = ((Math.round(semitonesFromA4) + 9) % 12 + 12) % 12;

    // Find closest pitch class
    let closest = 'C';
    let minDiff = 12;
    for (const [pc, semi] of Object.entries(pitchClassSemitones)) {
        const diff = Math.abs(semi - semitoneInOctave);
        if (diff < minDiff) {
            minDiff = diff;
            closest = pc;
        }
    }
    return closest;
}

// Find the closest frequency for a pitch class change - pick the shorter interval
function findClosestOctaveFreq(currentFreq, targetPitchClass, baseOctave) {
    const currentPC = freqToPitchClass(currentFreq);
    const currentSemi = pitchClassSemitones[currentPC];
    const targetSemi = pitchClassSemitones[targetPitchClass];

    if (currentSemi === undefined || targetSemi === undefined) {
        return droneBaseFreqs[baseOctave]?.[targetPitchClass] || null;
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

function getDroneFreq(note) {
    const info = droneDegrees[note];
    if (!info) return 261.63;
    const effectiveOctave = getEffectiveOctave(info.degree, info.octave);
    const pitchClass = currentInflection[info.degree];
    return droneBaseFreqs[effectiveOctave][pitchClass];
}

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


// Extract the base note pattern from a LilyPond note (strip octave marks)
function getNotePattern(melodyNote) {
    // Order matters: check longer patterns first
    const patterns = ['ees', 'eeh', 'ges', 'bes'];
    for (const p of patterns) {
        if (melodyNote.includes(p)) return p;
    }
    // Single letter patterns
    if (melodyNote.startsWith('e')) return 'e';
    if (melodyNote.startsWith('f')) return 'f';
    if (melodyNote.startsWith('g')) return 'g';
    if (melodyNote.startsWith('a')) return 'a';
    if (melodyNote.startsWith('b')) return 'b';
    if (melodyNote.startsWith('c')) return 'c';
    if (melodyNote.startsWith('d')) return 'd';
    return null;
}

export function inflectDrones(melodyNote, shouldInflect, isLatch = true) {
    if (!shouldInflect) return false;

    const rules = inflectionRules[currentChord];
    if (!rules) return false;

    const pattern = getNotePattern(melodyNote);
    const changes = (pattern && rules[pattern]) ? rules[pattern] : {};

    // In momentary mode, reset to defaults first, then apply new inflections
    // This means inflection only lasts while the inflecting note is current
    let changed = false;

    if (!isLatch) {
        // Momentary mode: reset any degrees NOT being inflected by current note
        const chordDef = chordDefinitions[currentChord];
        const defaultInflection = {
            root: chordDef.root,
            third: chordDef.third,
            fifth: chordDef.fifth,
            seventh: chordDef.seventh
        };

        ['root', 'third', 'fifth', 'seventh'].forEach(degree => {
            // Only reset if this degree is NOT being inflected by current note
            if (!changes[degree] && currentInflection[degree] !== defaultInflection[degree]) {
                currentInflection[degree] = defaultInflection[degree];
                changed = true;
                Object.keys(droneVoices).forEach(key => {
                    if (droneVoices[key].degree === degree) {
                        const currentFreq = droneVoices[key].osc.frequency.value;
                        const effectiveOctave = getEffectiveOctave(degree, droneVoices[key].octave);
                        const newFreq = findClosestOctaveFreq(currentFreq, defaultInflection[degree], effectiveOctave);
                        if (newFreq) {
                            droneVoices[key].osc.frequency.rampTo(newFreq, 0.05);
                        }
                    }
                });
            }
        });
    }

    // Apply any inflections from the current note
    Object.keys(changes).forEach(degree => {
        const newPitch = changes[degree];
        if (newPitch !== currentInflection[degree]) {
            currentInflection[degree] = newPitch;
            changed = true;
            Object.keys(droneVoices).forEach(key => {
                if (droneVoices[key].degree === degree) {
                    const currentFreq = droneVoices[key].osc.frequency.value;
                    const effectiveOctave = getEffectiveOctave(degree, droneVoices[key].octave);
                    const newFreq = findClosestOctaveFreq(currentFreq, newPitch, effectiveOctave);
                    if (newFreq) {
                        droneVoices[key].osc.frequency.rampTo(newFreq, 0.05);
                    }
                }
            });
        }
    });

    return changed;
}

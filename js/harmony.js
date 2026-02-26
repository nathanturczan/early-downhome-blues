/**
 * Harmony module - Simplified chord-based drone system
 *
 * Chord selection → always resets to default voicings
 * Inflection → minimal pitch deviation (closest octave)
 */

// Default voicings: pitch class + octave for each degree
const defaultVoicings = {
    I:  { root: { pc: 'C', oct: 2 }, fifth: { pc: 'G', oct: 3 }, third: { pc: 'E', oct: 4 }, seventh: { pc: 'Bb', oct: 4 } },
    IV: { root: { pc: 'F', oct: 2 }, fifth: { pc: 'C', oct: 3 }, third: { pc: 'A', oct: 4 }, seventh: { pc: 'Eb', oct: 4 } },
    V:  { root: { pc: 'G', oct: 2 }, fifth: { pc: 'D', oct: 3 }, third: { pc: 'B', oct: 4 }, seventh: { pc: 'F', oct: 4 } }
};

// Inflection rules: melody pattern → which degree gets which pitch class
// Octave is determined by "closest to current" logic
const inflectionRules = {
    'I': {
        'e':   { third: 'E' },
        'ees': { third: 'Eb' },
        'eeh': { third: 'Eqf' },
        'f':   { third: 'F' },
        'bes': { seventh: 'Bb' },
        'b':   { seventh: 'B' }
    },
    'IV': {
        'a':   { third: 'A' },
        'bes': { third: 'Bb' },
        'e':   { seventh: 'E' },
        'ees': { seventh: 'Eb' },
        'eeh': { seventh: 'Eqf' }
    },
    'V': {
        'b':   { third: 'B' },
        'bes': { third: 'Bb' },
        'f':   { seventh: 'F' },
        'ges': { seventh: 'Gb' }
    }
};

// Pitch class to semitone (C = 0)
const pcToSemitone = {
    'C': 0, 'D': 2, 'Eb': 3, 'Eqf': 3.5, 'E': 4, 'F': 5,
    'Gb': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11
};

// Get frequency for pitch class + octave
function getFreq(pitchClass, octave) {
    const semitone = pcToSemitone[pitchClass];
    if (semitone === undefined) return 261.63;
    const midiNote = (octave + 1) * 12 + semitone;
    return 440 * Math.pow(2, (midiNote - 69) / 12);
}

// Find closest octave for target pitch class given current frequency
function findClosestOctave(currentFreq, targetPitchClass) {
    const targetSemitone = pcToSemitone[targetPitchClass];
    if (targetSemitone === undefined) return 4;

    // Get current pitch as semitones from C0
    const currentSemitones = 12 * Math.log2(currentFreq / 16.35); // C0 ≈ 16.35 Hz

    // Try octaves 1-6, find which puts us closest
    let closestOctave = 4;
    let minDistance = Infinity;

    for (let oct = 1; oct <= 6; oct++) {
        const candidateSemitones = oct * 12 + targetSemitone;
        const distance = Math.abs(candidateSemitones - currentSemitones);
        if (distance < minDistance) {
            minDistance = distance;
            closestOctave = oct;
        }
    }

    return closestOctave;
}

// State
const voices = {}; // { root: { osc, pc, oct }, third: {...}, ... }
let currentChord = 'I';
let harmonyGain = null;
let isHarmonyActive = false;

// Callbacks for external systems (MIDI)
let onHarmonyChange = null;

export function setHarmonyChangeCallback(callback) {
    onHarmonyChange = callback;
}

export function initHarmony() {
    if (harmonyGain) return;
    harmonyGain = new Tone.Gain(0.12).toDestination();
}

export function getCurrentChord() {
    return currentChord;
}

export function isHarmonyPlaying() {
    return isHarmonyActive;
}

// Get current voicing as array of note strings for MIDI
function getCurrentVoicingArray() {
    const degrees = ['root', 'fifth', 'third', 'seventh'];
    return degrees.map(deg => {
        if (voices[deg]) {
            return voices[deg].pc + voices[deg].oct;
        }
        const def = defaultVoicings[currentChord][deg];
        return def.pc + def.oct;
    });
}

/**
 * Set the harmony chord - ALWAYS resets to default voicings
 */
export function setHarmonyChord(chord, startPlaying = true) {
    if (!defaultVoicings[chord]) return;

    initHarmony();
    currentChord = chord;

    if (startPlaying) {
        isHarmonyActive = true;

        const voicing = defaultVoicings[chord];
        const degrees = ['root', 'fifth', 'third', 'seventh'];

        degrees.forEach(deg => {
            const { pc, oct } = voicing[deg];
            const freq = getFreq(pc, oct);

            if (!voices[deg]) {
                // Create new oscillator
                const osc = new Tone.Oscillator(freq, 'sine').connect(harmonyGain);
                osc.volume.value = -12;
                osc.start();
                osc.volume.rampTo(0, 0.1);
                voices[deg] = { osc, pc, oct };
            } else {
                // Reset to default voicing
                voices[deg].osc.frequency.rampTo(freq, 0.1);
                voices[deg].pc = pc;
                voices[deg].oct = oct;
            }
        });

        if (onHarmonyChange) {
            onHarmonyChange(getCurrentVoicingArray(), true);
        }
    }
}

/**
 * Stop all harmony
 */
export function stopHarmony() {
    isHarmonyActive = false;

    Object.keys(voices).forEach(deg => {
        const voice = voices[deg];
        if (voice && voice.osc) {
            voice.osc.volume.rampTo(-Infinity, 0.3);
            setTimeout(() => {
                voice.osc.stop();
                voice.osc.dispose();
            }, 350);
        }
    });

    // Clear voices
    Object.keys(voices).forEach(deg => delete voices[deg]);

    if (onHarmonyChange) {
        onHarmonyChange(getCurrentVoicingArray(), false);
    }
}

/**
 * Toggle harmony on/off for current chord
 */
export function toggleHarmony() {
    if (isHarmonyActive) {
        stopHarmony();
        return false;
    } else {
        setHarmonyChord(currentChord, true);
        return true;
    }
}

/**
 * Apply inflection - minimal pitch deviation from current
 */
export function inflectHarmony(melodyNote, shouldInflect, isLatch = true) {
    if (!shouldInflect || !isHarmonyActive) return false;

    const rules = inflectionRules[currentChord];
    if (!rules) return false;

    const pattern = getNotePattern(melodyNote);

    // In momentary mode (!isLatch), reset non-inflected degrees to default
    if (!isLatch) {
        const changes = (pattern && rules[pattern]) ? rules[pattern] : {};
        const voicing = defaultVoicings[currentChord];

        ['root', 'fifth', 'third', 'seventh'].forEach(deg => {
            if (!changes[deg] && voices[deg]) {
                const def = voicing[deg];
                const freq = getFreq(def.pc, def.oct);
                voices[deg].osc.frequency.rampTo(freq, 0.05);
                voices[deg].pc = def.pc;
                voices[deg].oct = def.oct;
            }
        });
    }

    if (!pattern || !rules[pattern]) {
        if (onHarmonyChange) {
            onHarmonyChange(getCurrentVoicingArray(), true);
        }
        return false;
    }

    const changes = rules[pattern];
    let changed = false;

    Object.keys(changes).forEach(degree => {
        const targetPC = changes[degree];
        const voice = voices[degree];

        if (voice) {
            // Find closest octave to current pitch
            const currentFreq = voice.osc.frequency.value;
            const closestOct = findClosestOctave(currentFreq, targetPC);
            const newFreq = getFreq(targetPC, closestOct);

            voice.osc.frequency.rampTo(newFreq, 0.05);
            voice.pc = targetPC;
            voice.oct = closestOct;
            changed = true;
        }
    });

    if (changed && onHarmonyChange) {
        onHarmonyChange(getCurrentVoicingArray(), true);
    }

    return changed;
}

/**
 * Reset inflection to default chord voicing
 */
export function resetInflection() {
    if (!isHarmonyActive) return;

    const voicing = defaultVoicings[currentChord];

    ['root', 'fifth', 'third', 'seventh'].forEach(deg => {
        if (voices[deg]) {
            const def = voicing[deg];
            const freq = getFreq(def.pc, def.oct);
            voices[deg].osc.frequency.rampTo(freq, 0.1);
            voices[deg].pc = def.pc;
            voices[deg].oct = def.oct;
        }
    });

    if (onHarmonyChange) {
        onHarmonyChange(getCurrentVoicingArray(), true);
    }
}

// Extract the base note pattern from a LilyPond note (strip octave marks)
function getNotePattern(melodyNote) {
    const patterns = ['ees', 'eeh', 'ges', 'bes'];
    for (const p of patterns) {
        if (melodyNote.includes(p)) return p;
    }
    if (melodyNote.startsWith('e')) return 'e';
    if (melodyNote.startsWith('f')) return 'f';
    if (melodyNote.startsWith('g')) return 'g';
    if (melodyNote.startsWith('a')) return 'a';
    if (melodyNote.startsWith('b')) return 'b';
    if (melodyNote.startsWith('c')) return 'c';
    if (melodyNote.startsWith('d')) return 'd';
    return null;
}

/**
 * Harmony module - Simplified chord-based drone system
 *
 * Chord selection → always resets to default voicings
 * Inflection → minimal pitch deviation (closest octave)
 */
console.log('[Harmony] Module loaded v5 - quarter-tone support');

// Default voicings: pitch class + octave for each degree
const defaultVoicings = {
    // Primary blues chords
    I:    { root: { pc: 'C', oct: 3 }, fifth: { pc: 'G', oct: 3 }, third: { pc: 'E', oct: 4 }, seventh: { pc: 'Bb', oct: 4 } },
    IV:   { root: { pc: 'F', oct: 3 }, fifth: { pc: 'C', oct: 4 }, third: { pc: 'A', oct: 4 }, seventh: { pc: 'Eb', oct: 4 } },
    V:    { root: { pc: 'G', oct: 2 }, seventh: { pc: 'F', oct: 3 }, fifth: { pc: 'D', oct: 4 }, third: { pc: 'B', oct: 4 } },
    // Extended chords (shown when "More" is checked)
    // Minor chords use lowercase numerals
    ii:   { root: { pc: 'D', oct: 3 }, seventh: { pc: 'C', oct: 4 }, third: { pc: 'F', oct: 4 }, fifth: { pc: 'A', oct: 4 } },
    bIII: { root: { pc: 'Eb', oct: 3 }, fifth: { pc: 'Bb', oct: 3 }, third: { pc: 'G', oct: 4 }, seventh: { pc: 'D', oct: 4 } },
    iii:  { root: { pc: 'E', oct: 3 }, fifth: { pc: 'B', oct: 3 }, third: { pc: 'G', oct: 4 }, seventh: { pc: 'D', oct: 4 } },
    vi:   { root: { pc: 'A', oct: 2 }, fifth: { pc: 'E', oct: 3 }, third: { pc: 'C', oct: 4 }, seventh: { pc: 'G', oct: 4 } },
    bVII: { root: { pc: 'Bb', oct: 2 }, fifth: { pc: 'F', oct: 3 }, third: { pc: 'D', oct: 4 }, seventh: { pc: 'A', oct: 4 } }
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
    },
    // Extended chords - inflections that create audible chromatic bends
    'ii': {
        // ii = D-F-A-C (D minor 7)
        'ees': { third: 'Eb' },      // F→Eb (flatten third)
        'eeh': { third: 'Eqf' },     // F→Eqf
        'e':   { third: 'E' },       // F→E (flatten third further)
        'ges': { third: 'Gb' },      // F→Gb (sharpen third)
        'bes': { fifth: 'Bb' },      // A→Bb (sharpen fifth)
        'b':   { seventh: 'B' }      // C→B (sharpen seventh)
    },
    'iii': {
        // iii = E-G-B-D (E minor 7)
        'ees': { root: 'Eb' },       // E→Eb (flatten root)
        'eeh': { root: 'Eqf' },      // E→Eqf
        'f':   { root: 'F' },        // E→F (sharpen root)
        'ges': { third: 'Gb' },      // G→Gb (flatten third)
        'a':   { third: 'A' },       // G→A (sharpen third)
        'bes': { fifth: 'Bb' },      // B→Bb (flatten fifth)
        'c':   { fifth: 'C' },       // B→C (sharpen fifth)
        'ees': { seventh: 'Eb' }     // D→Eb (sharpen seventh)
    },
    'vi': {
        // vi = A-C-E-G (A minor 7)
        'bes': { root: 'Bb' },       // A→Bb (sharpen root)
        'b':   { third: 'B' },       // C→B (flatten third)
        'ees': { fifth: 'Eb' },      // E→Eb (flatten fifth)
        'eeh': { fifth: 'Eqf' },     // E→Eqf
        'f':   { fifth: 'F' },       // E→F (sharpen fifth)
        'ges': { seventh: 'Gb' },    // G→Gb (flatten seventh)
        'a':   { seventh: 'A' }      // G→A (sharpen seventh)
    },
    'bIII': {
        // bIII = Eb-G-Bb-D (Eb major 7)
        'eeh': { root: 'Eqf' },      // Eb→Eqf (quarter tone up)
        'e':   { root: 'E' },        // Eb→E (sharpen root)
        'f':   { root: 'F' },        // Eb→F (sharpen root more)
        'ges': { third: 'Gb' },      // G→Gb (flatten third)
        'a':   { third: 'A' },       // G→A (sharpen third)
        'b':   { fifth: 'B' },       // Bb→B (sharpen fifth)
        'c':   { fifth: 'C' },       // Bb→C (sharpen fifth more)
        'ees': { seventh: 'Eb' }     // D→Eb (sharpen seventh)
    },
    'bVII': {
        // bVII = Bb-D-F-A (Bb major 7)
        'b':   { root: 'B' },        // Bb→B (sharpen root)
        'ees': { third: 'Eb' },      // D→Eb (flatten third)
        'e':   { fifth: 'E' },       // F→E (flatten fifth)
        'ges': { fifth: 'Gb' },      // F→Gb (flatten fifth)
        'g':   { fifth: 'G' }        // F→G (sharpen fifth)
    }
};

// Pitch class to semitone (C = 0)
const pcToSemitone = {
    'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'Eqf': 3.5, 'E': 4, 'F': 5,
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

// === Harmony Modes ===
// Based on Titon's three historical approaches
export const HARMONY_MODES = {
  FUNCTIONAL: 'functional',  // Full I-IV-V with all chord tones
  ROOT_ONLY: 'root-only',    // Same timing, just root notes
  STATIC_I: 'static-i'       // Stay on I chord throughout
};

// Cello samples from nbrosowsky/tonejs-instruments
const CELLO_BASE_URL = 'https://nbrosowsky.github.io/tonejs-instruments/samples/cello/';

// Reference pitches for samples (used for pitch calculation)
const SAMPLE_NOTES = {
    'C2': 'C2', 'C3': 'C3', 'C4': 'C4', 'C5': 'C5',
    'E2': 'E2', 'E3': 'E3', 'E4': 'E4',
    'G2': 'G2', 'G3': 'G3', 'G4': 'G4',
    'A2': 'A2', 'A3': 'A3', 'A4': 'A4'
};

// State
const voices = {}; // { root: { player, pc, oct }, third: {...}, ... }
const loadedBuffers = {}; // Tone.Buffer for each sample
let currentChord = 'I';
let harmonyGain = null;
let harmonyReverb = null;
let isHarmonyActive = false;
let harmonyMode = HARMONY_MODES.FUNCTIONAL;
let samplesLoaded = false;
let loadingPromise = null;
let loadingProgress = 0;
let totalSamples = 0;

// Loading status callback
let onLoadingStatusChange = null;

export function setLoadingStatusCallback(callback) {
    onLoadingStatusChange = callback;
}

export function getLoadingStatus() {
    if (samplesLoaded) return { loaded: true, progress: 100 };
    if (totalSamples === 0) return { loaded: false, progress: 0 };
    return { loaded: false, progress: Math.round((loadingProgress / totalSamples) * 100) };
}

// Varied loop parameters per register for organic phasing
// Loop points are in the MIDDLE of sustain (avoiding attack ~0-0.8s and decay ~2.5s+)
// Each register has slightly different loop lengths for natural phasing
const LOOP_PARAMS = {
    low:  { loopStart: 1.1, loopEnd: 2.2, grainSize: 0.3, overlap: 0.15 },   // bass: 1.1s loop, longer grains
    mid:  { loopStart: 1.0, loopEnd: 1.95, grainSize: 0.25, overlap: 0.12 }, // mid: 0.95s loop
    high: { loopStart: 0.95, loopEnd: 1.75, grainSize: 0.2, overlap: 0.1 }   // high: 0.8s loop, tighter
};

function getLoopParamsForNote(note) {
    const midi = Tone.Frequency(note).toMidi();
    if (midi < 48) return LOOP_PARAMS.low;      // Below C3
    if (midi < 60) return LOOP_PARAMS.mid;      // C3 to B3
    return LOOP_PARAMS.high;                     // C4 and above
}

// Callbacks for external systems (MIDI)
let onHarmonyChange = null;

export function setHarmonyMode(mode) {
  if (Object.values(HARMONY_MODES).includes(mode)) {
    harmonyMode = mode;
    console.log(`🎹 Harmony mode: ${mode}`);
    // If harmony is playing, update the voicing
    if (isHarmonyActive) {
      setHarmonyChord(currentChord, true);
    }
  }
}

export function getHarmonyMode() {
  return harmonyMode;
}

export function setHarmonyChangeCallback(callback) {
    onHarmonyChange = callback;
}

// Convert our pitch class names to Tone.js format
// Returns { note, quarterToneCents } where quarterToneCents is 50 for quarter-sharps
function toToneNote(pc, oct) {
    // Eqf = E quarter-flat = Eb + 50 cents
    if (pc === 'Eqf') {
        return { note: 'Eb' + oct, quarterToneCents: 50 };
    }
    // Standard pitch classes
    const tonePC = pc === 'Db' ? 'Db' :
                   pc === 'Eb' ? 'Eb' :
                   pc === 'Gb' ? 'Gb' :
                   pc === 'Ab' ? 'Ab' :
                   pc === 'Bb' ? 'Bb' :
                   pc;
    return { note: tonePC + oct, quarterToneCents: 0 };
}

/**
 * Find the closest sample note for a given target note
 */
function findClosestSample(targetNote) {
    const targetMidi = Tone.Frequency(targetNote).toMidi();
    let closest = 'C3';
    let minDist = Infinity;

    for (const sampleNote of Object.keys(SAMPLE_NOTES)) {
        const sampleMidi = Tone.Frequency(sampleNote).toMidi();
        const dist = Math.abs(sampleMidi - targetMidi);
        if (dist < minDist) {
            minDist = dist;
            closest = sampleNote;
        }
    }
    const semitoneShift = targetMidi - Tone.Frequency(closest).toMidi();
    console.log(`[Sample] ${targetNote} (MIDI ${targetMidi}) -> ${closest}, shift: ${semitoneShift}`);
    return { sampleNote: closest, semitoneShift };
}

/**
 * Create a looping GrainPlayer for sustained cello sound
 * Uses varied loop parameters based on register for organic phasing
 */
function createCelloVoice(buffer, semitoneShift = 0, targetNote = 'C3') {
    const params = getLoopParamsForNote(targetNote);

    // Use detune in cents for pitch shifting (100 cents = 1 semitone)
    const detuneCents = semitoneShift * 100;

    const player = new Tone.GrainPlayer({
        url: buffer,
        loop: true,
        loopStart: params.loopStart,
        loopEnd: params.loopEnd,
        grainSize: params.grainSize,
        overlap: params.overlap,
        detune: detuneCents
    }).connect(harmonyGain);

    player.volume.value = -6;
    return player;
}

export function initHarmony() {
    if (loadingPromise) return loadingPromise;

    // Create reverb for warmth (only once)
    if (!harmonyReverb) {
        harmonyReverb = new Tone.Reverb({
            decay: 3,
            wet: 0.25
        }).toDestination();
        harmonyReverb.generate();
    }

    if (!harmonyGain) {
        harmonyGain = new Tone.Gain(0.35).connect(harmonyReverb);
    }

    // Load all cello sample buffers with progress tracking
    const sampleNotes = Object.keys(SAMPLE_NOTES);
    totalSamples = sampleNotes.length;
    loadingProgress = 0;

    if (onLoadingStatusChange) {
        onLoadingStatusChange(getLoadingStatus());
    }

    const bufferPromises = sampleNotes.map(note => {
        return new Promise((resolve, reject) => {
            const buffer = new Tone.Buffer(
                CELLO_BASE_URL + note + '.mp3',
                () => {
                    loadedBuffers[note] = buffer;
                    loadingProgress++;
                    if (onLoadingStatusChange) {
                        onLoadingStatusChange(getLoadingStatus());
                    }
                    resolve();
                },
                reject
            );
        });
    });

    loadingPromise = Promise.all(bufferPromises).then(() => {
        samplesLoaded = true;
        console.log('[Harmony] Cello samples loaded. Available:', Object.keys(loadedBuffers).join(', '));

        // Verify Tone.Frequency parsing
        const testNotes = ['C3', 'E4', 'G3', 'Bb4', 'A4'];
        testNotes.forEach(n => {
            console.log(`[Harmony] ${n} = MIDI ${Tone.Frequency(n).toMidi()}`);
        });

        if (onLoadingStatusChange) {
            onLoadingStatusChange(getLoadingStatus());
        }
    }).catch(err => {
        console.error('[Harmony] Failed to load samples:', err);
    });

    return loadingPromise;
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
 * Set the harmony chord - respects harmonyMode setting
 */
export function setHarmonyChord(chord, startPlaying = true) {
    if (!defaultVoicings[chord]) return;

    initHarmony();

    // Static I mode: always use I chord
    const effectiveChord = harmonyMode === HARMONY_MODES.STATIC_I ? 'I' : chord;
    currentChord = effectiveChord;

    if (startPlaying) {
        isHarmonyActive = true;

        const voicing = defaultVoicings[effectiveChord];

        // Determine which degrees to play based on mode
        let degreesToPlay;
        if (harmonyMode === HARMONY_MODES.ROOT_ONLY) {
            degreesToPlay = ['root'];
        } else {
            degreesToPlay = ['root', 'fifth', 'third', 'seventh'];
        }

        const allDegrees = ['root', 'fifth', 'third', 'seventh'];

        // Stop voices not in the new chord (with natural decay)
        allDegrees.forEach(deg => {
            if (voices[deg] && !degreesToPlay.includes(deg)) {
                // Immediate stop when switching chords (no bleed)
                voices[deg].player.stop();
                voices[deg].player.dispose();
                delete voices[deg];
            }
        });

        // Play or update notes for degrees we want
        degreesToPlay.forEach(deg => {
            const { pc, oct } = voicing[deg];
            const targetNote = pc + oct;

            // If voice exists with different pitch, stop immediately and start new
            if (voices[deg] && (voices[deg].pc !== pc || voices[deg].oct !== oct)) {
                // Immediate stop when switching chords (no bleed)
                voices[deg].player.stop();
                voices[deg].player.dispose();
                delete voices[deg];
            }

            // Create new voice if needed
            if (!voices[deg] && samplesLoaded) {
                const { note: toneTargetNote, quarterToneCents } = toToneNote(pc, oct);
                const { sampleNote, semitoneShift } = findClosestSample(toneTargetNote);
                // Add quarter-tone offset to detune (in cents)
                const totalDetuneCents = (semitoneShift * 100) + quarterToneCents;
                const buffer = loadedBuffers[sampleNote];
                if (buffer) {
                    const player = createCelloVoice(buffer, totalDetuneCents / 100, toneTargetNote);
                    player.start();
                    console.log(`[Voice] ${deg}: ${pc}${oct} -> sample ${sampleNote}, detune ${totalDetuneCents} cents`);
                    // Store sample info for inflection calculations
                    voices[deg] = { player, pc, oct, sampleNote };
                }
            }
        });

        if (onHarmonyChange) {
            onHarmonyChange(getCurrentVoicingArray(), true);
        }
    }
}

/**
 * Stop all harmony with natural decay
 * Disables looping and lets samples ring out naturally
 */
export function stopHarmony() {
    isHarmonyActive = false;

    // Disable looping and let samples decay naturally
    Object.keys(voices).forEach(deg => {
        const voice = voices[deg];
        if (voice && voice.player) {
            // Disable loop to let sample decay
            voice.player.loop = false;
            // Schedule disposal after decay time
            setTimeout(() => {
                if (voice.player) {
                    voice.player.stop();
                    voice.player.dispose();
                }
            }, 3000); // 3 second decay
        }
        delete voices[deg];
    });

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
 * Apply inflection - pitch bend via detune on GrainPlayer
 */
export function inflectHarmony(melodyNote, shouldInflect, isLatch = true) {
    if (!shouldInflect || !isHarmonyActive) return false;
    if (!samplesLoaded) return false;

    try {

    const rules = inflectionRules[currentChord];
    if (!rules) return false;

    const pattern = getNotePattern(melodyNote);

    // In momentary mode (!isLatch), reset non-inflected degrees to default
    if (!isLatch) {
        const changes = (pattern && rules[pattern]) ? rules[pattern] : {};
        const voicing = defaultVoicings[currentChord];

        ['root', 'fifth', 'third', 'seventh'].forEach(deg => {
            if (!changes[deg] && voices[deg] && voices[deg].sampleNote) {
                const def = voicing[deg];
                const { note: toneTargetNote, quarterToneCents } = toToneNote(def.pc, def.oct);

                // Calculate pitch shift relative to the ACTUAL sample playing
                const sampleMidi = Tone.Frequency(voices[deg].sampleNote).toMidi();
                const targetMidi = Tone.Frequency(toneTargetNote).toMidi();
                const semitones = (targetMidi - sampleMidi);
                const detuneCents = (semitones * 100) + quarterToneCents;

                voices[deg].player.detune = detuneCents;
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

        if (voice && voice.player && voice.sampleNote) {
            // Find closest octave to current pitch
            const currentFreq = getFreq(voice.pc, voice.oct);
            const closestOct = findClosestOctave(currentFreq, targetPC);
            const { note: toneTargetNote, quarterToneCents } = toToneNote(targetPC, closestOct);

            // Calculate pitch shift relative to the ACTUAL sample playing
            const sampleMidi = Tone.Frequency(voice.sampleNote).toMidi();
            const targetMidi = Tone.Frequency(toneTargetNote).toMidi();
            const semitones = targetMidi - sampleMidi;

            // Use detune in cents (100 cents = 1 semitone) + quarter-tone offset
            const detuneCents = (semitones * 100) + quarterToneCents;
            console.log(`[Inflect] ${degree}: sample ${voice.sampleNote} -> ${targetPC}${closestOct}, detune: ${detuneCents} cents`);

            voice.player.detune = detuneCents;

            voice.pc = targetPC;
            voice.oct = closestOct;
            changed = true;
        }
    });

    if (changed && onHarmonyChange) {
        onHarmonyChange(getCurrentVoicingArray(), true);
    }

    return changed;

    } catch (err) {
        console.error('[Harmony] Inflection error:', err);
        return false;
    }
}

/**
 * Reset inflection to default chord voicing
 */
export function resetInflection() {
    if (!isHarmonyActive) return;
    if (!samplesLoaded) return;

    try {
        const voicing = defaultVoicings[currentChord];

        ['root', 'fifth', 'third', 'seventh'].forEach(deg => {
            if (voices[deg] && voices[deg].player && voices[deg].sampleNote) {
                const def = voicing[deg];
                const { note: toneTargetNote, quarterToneCents } = toToneNote(def.pc, def.oct);

                // Calculate pitch shift relative to the ACTUAL sample playing
                const sampleMidi = Tone.Frequency(voices[deg].sampleNote).toMidi();
                const targetMidi = Tone.Frequency(toneTargetNote).toMidi();
                const semitones = (targetMidi - sampleMidi);
                const detuneCents = (semitones * 100) + quarterToneCents;

                voices[deg].player.detune = detuneCents;
                voices[deg].pc = def.pc;
                voices[deg].oct = def.oct;
            }
        });

        if (onHarmonyChange) {
            onHarmonyChange(getCurrentVoicingArray(), true);
        }
    } catch (err) {
        console.error('[Harmony] Reset inflection error:', err);
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

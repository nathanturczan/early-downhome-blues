// Audio module - Salamander Piano (melody)
// Drone/harmony functionality moved to harmony.js

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

// Salamander Piano sample URLs (hosted on Tone.js GitHub)
const SALAMANDER_BASE = 'https://tonejs.github.io/audio/salamander/';

// State
let isAudioInitialized = false;
let isAudioMuted = true;
let piano = null;
let reverb = null;
let currentPlayingNote = null; // Track current note to release before new one

export function getAudioState() {
    return { isInitialized: isAudioInitialized, isMuted: isAudioMuted };
}

export async function initAudio() {
    if (isAudioInitialized) return;

    await Tone.start();
    const ctx = Tone.getContext();
    if (ctx && ctx.state !== 'running') await ctx.resume();

    reverb = new Tone.Reverb({ decay: 2.5, wet: 0.2 }).toDestination();
    await reverb.generate();

    // Salamander Grand Piano sampler
    // Using a subset of samples for faster loading, Tone.js will interpolate
    piano = new Tone.Sampler({
        urls: {
            'A0': 'A0.mp3',
            'C1': 'C1.mp3',
            'D#1': 'Ds1.mp3',
            'F#1': 'Fs1.mp3',
            'A1': 'A1.mp3',
            'C2': 'C2.mp3',
            'D#2': 'Ds2.mp3',
            'F#2': 'Fs2.mp3',
            'A2': 'A2.mp3',
            'C3': 'C3.mp3',
            'D#3': 'Ds3.mp3',
            'F#3': 'Fs3.mp3',
            'A3': 'A3.mp3',
            'C4': 'C4.mp3',
            'D#4': 'Ds4.mp3',
            'F#4': 'Fs4.mp3',
            'A4': 'A4.mp3',
            'C5': 'C5.mp3',
            'D#5': 'Ds5.mp3',
            'F#5': 'Fs5.mp3',
            'A5': 'A5.mp3',
            'C6': 'C6.mp3',
            'D#6': 'Ds6.mp3',
            'F#6': 'Fs6.mp3',
            'A6': 'A6.mp3',
            'C7': 'C7.mp3',
            'D#7': 'Ds7.mp3',
            'F#7': 'Fs7.mp3',
            'A7': 'A7.mp3',
            'C8': 'C8.mp3'
        },
        baseUrl: SALAMANDER_BASE,
        release: 4, // Long release for sustained sound
        onload: () => {
            console.log('[Audio] Salamander Piano loaded');
        }
    }).connect(reverb);

    // Boost piano volume
    piano.volume.value = 6;

    // Wait for samples to load
    await Tone.loaded();

    isAudioInitialized = true;
    isAudioMuted = false;
    console.log('[Audio] Piano ready');
}

export function toggleMute() {
    if (!isAudioInitialized) return false;

    isAudioMuted = !isAudioMuted;
    Tone.Destination.mute = isAudioMuted;
    return !isAudioMuted; // return true if audio is now ON
}

export function playNote(lilyNote, duration = 10) {
    if (!isAudioInitialized || !piano) return;

    const noteInfo = lilyToNote[lilyNote];
    if (!noteInfo) return;

    // Release previous note to avoid overlapping tails
    if (currentPlayingNote !== null) {
        piano.triggerRelease(currentPlayingNote);
    }

    // For quarter-tones, we need to detune
    let noteToPlay;
    if (noteInfo.detune !== 0) {
        // Calculate detuned frequency
        const baseFreq = Tone.Frequency(noteInfo.note).toFrequency();
        noteToPlay = baseFreq * Math.pow(2, noteInfo.detune / 1200);
    } else {
        noteToPlay = noteInfo.note;
    }

    // Random velocity between 100-127 (MIDI), converted to 0-1 range
    const midiVelocity = 100 + Math.random() * 27;
    const velocity = midiVelocity / 127;

    // Trigger attack - note will ring until released or new note played
    piano.triggerAttack(noteToPlay, Tone.now(), velocity);
    currentPlayingNote = noteToPlay;

    // Auto-release after duration (long sustain)
    setTimeout(() => {
        if (currentPlayingNote === noteToPlay) {
            piano.triggerRelease(noteToPlay);
            currentPlayingNote = null;
        }
    }, duration * 1000);
}

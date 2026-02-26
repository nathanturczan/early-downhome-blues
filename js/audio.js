// Audio module - Pluck synth (melody only)
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

    // PluckSynth doesn't support detune parameter, so calculate actual frequency
    // Convert note name to frequency, then apply detune offset (cents)
    const baseFreq = Tone.Frequency(noteInfo.note).toFrequency();
    const frequency = baseFreq * Math.pow(2, noteInfo.detune / 1200);

    pluckSynth.triggerAttack(frequency);
}

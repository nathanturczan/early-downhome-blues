// Main application logic
import { adjacency, frequencies, displayNames } from './network.js';
import { initMidi, sendMidiNote, sendDroneMidi, updateDroneMidi } from './midi.js';
import {
    initAudio, getAudioState, toggleMute, playNote,
    toggleDroneNote, inflectDrones, resetInflection,
    getCurrentInflection, droneDegrees, pitchDisplayNames,
    setChord, getChordNotes, getCurrentChord, getEffectiveOctave
} from './audio.js';
import { renderNotation } from './notation.js';

// State
let currentNote = "g'";
let history = ["g'"];

// DOM elements
const currentNoteEl = document.getElementById('currentNote');
const noteInfoEl = document.getElementById('noteInfo');
const historyEl = document.getElementById('history');
const pathsNotesEl = document.getElementById('pathsNotes');
const nextBtn = document.getElementById('nextBtn');
const audioToggleBtn = document.getElementById('audio-toggle');
const inflectToggle = document.getElementById('inflectToggle');
const latchToggle = document.getElementById('latchToggle');
const latchLabel = document.querySelector('label[for="latchToggle"]');
const notationContainer = document.getElementById('notation');

// Update drone button labels based on current chord and inflection
function updateDroneLabels() {
    const inflection = getCurrentInflection();
    const chordNotes = getChordNotes();
    document.querySelectorAll('.drone-btn').forEach(btn => {
        const note = btn.dataset.note;
        const info = droneDegrees[note];
        if (!info) return;

        let pitchClass;
        if (info.degree === 'root') {
            pitchClass = chordNotes.root;
        } else {
            pitchClass = inflection[info.degree];
        }

        const displayOctave = getEffectiveOctave(info.degree, info.octave);
        btn.innerHTML = pitchDisplayNames[pitchClass] + displayOctave;
    });
}

// Update MIDI for all active drones (when chord or inflection changes)
function updateAllDroneMidi() {
    const inflection = getCurrentInflection();
    const chordNotes = getChordNotes();
    document.querySelectorAll('.drone-btn.active').forEach(btn => {
        const note = btn.dataset.note;
        const info = droneDegrees[note];
        if (!info) return;

        let pitchClass;
        if (info.degree === 'root') {
            pitchClass = chordNotes.root;
        } else {
            pitchClass = inflection[info.degree];
        }

        const effectiveOctave = getEffectiveOctave(info.degree, info.octave);
        updateDroneMidi(info.degree, pitchClass, effectiveOctave);
    });
}

// Update audio toggle button visual state
function updateAudioToggleUI() {
    const { isInitialized, isMuted } = getAudioState();
    if (isInitialized && !isMuted) {
        audioToggleBtn.classList.remove('is-off');
        audioToggleBtn.classList.add('is-on');
    } else {
        audioToggleBtn.classList.remove('is-on');
        audioToggleBtn.classList.add('is-off');
    }
}

// Handle note selection
async function handleNoteClick(lily) {
    const { isInitialized } = getAudioState();
    if (!isInitialized) {
        await initAudio();
        updateAudioToggleUI();
    }

    currentNote = lily;
    history.push(currentNote);
    if (history.length > 10) history = history.slice(-10);

    playNote(currentNote);
    sendMidiNote(currentNote);

    const changed = inflectDrones(currentNote, inflectToggle.checked, latchToggle.checked);
    if (changed) {
        updateDroneLabels();
        updateAllDroneMidi();
    }

    updateAudioToggleUI(); // Always sync toggle state
    updateDisplay();
}

// Update UI
function updateDisplay() {
    currentNoteEl.innerHTML = displayNames[currentNote];
    noteInfoEl.textContent = `${frequencies[currentNote].toFixed(2)} Hz`;

    historyEl.innerHTML = history
        .map((n, i) => `<span class="history-note${i === history.length - 1 ? ' current' : ''}">${displayNames[n]}</span>`)
        .join(' \u2192 ');

    const possible = adjacency[currentNote] || [];

    if (possible.length === 0) {
        pathsNotesEl.innerHTML = '<span class="sink-message">End of phrase</span>';
        nextBtn.textContent = 'New Phrase';
    } else {
        pathsNotesEl.innerHTML = possible.map(note =>
            `<span class="path-note" data-note="${note}">${displayNames[note]}</span>`
        ).join('');
        nextBtn.textContent = 'Random';

        pathsNotesEl.querySelectorAll('.path-note').forEach(el => {
            el.addEventListener('click', () => handleNoteClick(el.dataset.note));
        });
    }

    renderNotation(notationContainer, currentNote, handleNoteClick);
}

// Random next note
async function nextNote() {
    const { isInitialized } = getAudioState();
    if (!isInitialized) {
        await initAudio();
        updateAudioToggleUI();
    }

    const possible = adjacency[currentNote] || [];

    if (possible.length === 0) {
        currentNote = "g'";
        history.push("g'");
    } else {
        currentNote = possible[Math.floor(Math.random() * possible.length)];
        history.push(currentNote);
        if (history.length > 10) history = history.slice(-10);
    }

    playNote(currentNote);
    sendMidiNote(currentNote);

    const changed = inflectDrones(currentNote, inflectToggle.checked, latchToggle.checked);
    if (changed) {
        updateDroneLabels();
        updateAllDroneMidi();
    }

    updateAudioToggleUI(); // Always sync toggle state
    updateDisplay();
}

// Initialize
function init() {
    // Info modal
    const infoBtn = document.getElementById('info-btn');
    const infoModal = document.getElementById('info-modal');
    const modalClose = infoModal.querySelector('.modal-close');
    const modalBackdrop = infoModal.querySelector('.modal-backdrop');

    infoBtn.addEventListener('click', () => {
        infoModal.classList.remove('hidden');
    });
    modalClose.addEventListener('click', () => {
        infoModal.classList.add('hidden');
    });
    modalBackdrop.addEventListener('click', () => {
        infoModal.classList.add('hidden');
    });

    // MIDI
    initMidi();

    // Audio toggle
    audioToggleBtn.addEventListener('click', async () => {
        const { isInitialized } = getAudioState();

        if (!isInitialized) {
            await initAudio();
        } else {
            toggleMute();
        }
        updateAudioToggleUI();
    });

    // Inflect toggle
    inflectToggle.addEventListener('change', (e) => {
        // Enable/disable latch toggle based on inflect state
        latchToggle.disabled = !e.target.checked;
        latchLabel.classList.toggle('disabled', !e.target.checked);

        if (e.target.checked) {
            // Immediately apply inflection based on current note
            const changed = inflectDrones(currentNote, true, latchToggle.checked);
            if (changed) {
                updateDroneLabels();
                updateAllDroneMidi();
            }
        } else {
            resetInflection();
            updateDroneLabels();
            updateAllDroneMidi();
        }
    });

    // Drone buttons
    document.querySelectorAll('.drone-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const { isInitialized } = getAudioState();
            if (!isInitialized) {
                await initAudio();
                updateAudioToggleUI();
            }

            const note = btn.dataset.note;
            const isNowOn = toggleDroneNote(note);
            btn.classList.toggle('active', isNowOn);

            // Send MIDI for drone
            const info = droneDegrees[note];
            if (info) {
                const chordNotes = getChordNotes();
                const inflection = getCurrentInflection();
                let pitchClass;
                if (info.degree === 'root') {
                    pitchClass = chordNotes.root;
                } else {
                    pitchClass = inflection[info.degree];
                }
                const effectiveOctave = getEffectiveOctave(info.degree, info.octave);
                sendDroneMidi(info.degree, pitchClass, effectiveOctave, isNowOn);
            }
        });
    });

    // Chord buttons
    document.querySelectorAll('.chord-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chord-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Pass current melody note and inflect settings so chord change respects melodic context
            setChord(btn.dataset.chord, currentNote, inflectToggle.checked, latchToggle.checked);
            updateDroneLabels();
            updateAllDroneMidi();
        });
    });

    // Random button
    nextBtn.addEventListener('click', nextNote);

    // MIDI toggle (minimize/expand)
    const midiToggle = document.getElementById('midiToggle');
    const midiFooter = document.querySelector('.midi-footer');
    if (midiToggle && midiFooter) {
        midiToggle.addEventListener('click', () => {
            midiFooter.classList.toggle('minimized');
            document.body.classList.toggle('midi-minimized');
        });
    }

    // Resize handler
    window.addEventListener('resize', () => renderNotation(notationContainer, currentNote, handleNoteClick));

    // Initial render
    updateDroneLabels();
    updateDisplay();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

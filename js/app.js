// Main application logic
import { adjacency, frequencies, displayNames } from './network.js';
import { initMidi, sendMidiNote, sendHarmonyMidi } from './midi.js';
import { initAudio, getAudioState, toggleMute, playNote } from './audio.js';
import {
    initHarmony, setHarmonyChord, toggleHarmony, inflectHarmony,
    resetInflection, setHarmonyChangeCallback, isHarmonyPlaying, getCurrentChord
} from './harmony.js';
import { renderNotation } from './notation.js';
import { initEnsemble, updateRoomState, getEnsembleState } from './ensemble.js';
import { selectWeightedNote, getRestartNote } from './rules/weightedSelection.js';

// State
let currentNote = "g'";
let history = ["g'"];
let stepsInPhrase = 0; // Phase 1.5: Track steps in current phrase

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

// Update chord button active states
function updateChordButtonUI() {
    const currentChord = getCurrentChord();
    const isPlaying = isHarmonyPlaying();

    document.querySelectorAll('.chord-btn').forEach(btn => {
        const isThisChord = btn.dataset.chord === currentChord;
        btn.classList.toggle('active', isThisChord && isPlaying);
    });
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
    stepsInPhrase++;
    if (history.length > 10) history = history.slice(-10);

    playNote(currentNote);
    sendMidiNote(currentNote);

    // Apply inflection if enabled and harmony is playing
    if (isHarmonyPlaying()) {
        inflectHarmony(currentNote, inflectToggle.checked, latchToggle.checked);
    }

    updateAudioToggleUI();
    updateDisplay();
}

// Update UI
function updateDisplay() {
    currentNoteEl.innerHTML = displayNames[currentNote];
    noteInfoEl.textContent = `${frequencies[currentNote].toFixed(2)} Hz`;

    const historyContent = history
        .map((n, i) => {
            let opacity = 1;
            if (history.length === 10 && i === 0) opacity = 0.1;
            else if (history.length >= 9 && i === history.length - 9) opacity = 0.5;
            else if (history.length >= 8 && i === history.length - 8) opacity = 0.7;
            const isCurrent = i === history.length - 1;
            return `<span class="history-note${isCurrent ? ' current' : ''}" style="opacity: ${opacity}">${displayNames[n]}</span>`;
        })
        .join(' \u2192 ');
    historyEl.innerHTML = `<span class="history-inner">${historyContent}</span>`;

    const possible = adjacency[currentNote] || [];

    if (possible.length === 0) {
        pathsNotesEl.innerHTML = '<span class="sink-message">End of phrase</span>';
        nextBtn.textContent = 'New Phrase';
    } else {
        pathsNotesEl.innerHTML = possible.map(note =>
            `<span class="path-note" data-note="${note}">${displayNames[note]}</span>`
        ).join('');
        nextBtn.textContent = 'Next';

        pathsNotesEl.querySelectorAll('.path-note').forEach(el => {
            el.addEventListener('click', () => handleNoteClick(el.dataset.note));
        });
    }

    renderNotation(notationContainer, currentNote, handleNoteClick);
}

// Handle ensemble room updates (for member mode)
function handleEnsembleRoomUpdate(room, isHost) {
    if (!room) {
        console.log('[App] Left ensemble room');
        return;
    }

    console.log('[App] Room update:', room, 'isHost:', isHost);

    if (!isHost && room.scaleData) {
        console.log('[App] Member received scale data:', room.scaleData);
    }

    if (!isHost && room.chordData) {
        console.log('[App] Member received chord data:', room.chordData);
    }
}

// Send pitch classes to ensemble room when note is played (host mode)
async function sendPitchToEnsemble(pitchClasses) {
    const { room, isHost } = getEnsembleState();
    if (!room || !isHost) return;

    await updateRoomState({
        pitchClasses: pitchClasses,
        lastPitchUpdate: Date.now()
    });
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
        // Sink note (C) - restart phrase
        currentNote = getRestartNote();
        history.push(currentNote);
        stepsInPhrase = 0;
        console.log('📍 New phrase started (sink reached)');
    } else {
        // Phase 1.5: Weighted selection with phrase awareness
        const result = selectWeightedNote(currentNote, history, possible, stepsInPhrase);
        currentNote = result.note;
        history.push(currentNote);
        stepsInPhrase++;

        if (result.shouldRestart) {
            // Landed on C after sufficient phrase length - restart
            console.log(`📍 Phrase ended after ${stepsInPhrase} steps`);
            stepsInPhrase = 0;
        }

        if (history.length > 10) history = history.slice(-10);
    }

    playNote(currentNote);
    sendMidiNote(currentNote);

    // Apply inflection if enabled and harmony is playing
    if (isHarmonyPlaying()) {
        inflectHarmony(currentNote, inflectToggle.checked, latchToggle.checked);
    }

    updateAudioToggleUI();
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

    // Set up harmony -> MIDI callback
    setHarmonyChangeCallback((notes, isOn) => {
        sendHarmonyMidi(notes, isOn);
    });

    // Ensemble
    initEnsemble(handleEnsembleRoomUpdate);

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

        if (!e.target.checked && isHarmonyPlaying()) {
            resetInflection();
        } else if (e.target.checked && isHarmonyPlaying()) {
            inflectHarmony(currentNote, true, latchToggle.checked);
        }
    });

    // Chord buttons - simplified: click = play that chord
    document.querySelectorAll('.chord-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const { isInitialized } = getAudioState();
            if (!isInitialized) {
                await initAudio();
                updateAudioToggleUI();
            }

            const chord = btn.dataset.chord;
            const currentChord = getCurrentChord();
            const isPlaying = isHarmonyPlaying();

            if (chord === currentChord && isPlaying) {
                // Clicking active chord toggles it off
                toggleHarmony();
            } else {
                // Set and play the new chord
                setHarmonyChord(chord, true);

                // Apply inflection if enabled
                if (inflectToggle.checked) {
                    inflectHarmony(currentNote, true, latchToggle.checked);
                }
            }

            updateChordButtonUI();
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
    updateDisplay();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

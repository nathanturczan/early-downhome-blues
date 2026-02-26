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
import { selectWeightedNote, getRestartNote, recordNote, freezePhrase, setPhrasing } from './rules/weightedSelection.js';
import { getPosition, advanceStep, advancePhrase, resetStanza, setStepsPerPhrase, getChordForPosition, decideSplits, setPosition } from './stanza.js';
import { clearPhrases } from './phraseMemory.js';
import './browserTest.js'; // Load browser test harness

// Phase 2 feature flag - set to true to enable stanza tracking
const PHASE_2_ENABLED = true;

// State
let currentNote = "g'";
// History now stores objects with note and position for rewinding
let history = [{ note: "g'", position: null }];
let stepsInPhrase = 0; // Phase 1.5: Track steps in current phrase (fallback when Phase 2 disabled)

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
const stanzaIndicator = document.getElementById('stanzaIndicator');
const phrasingToggle = document.getElementById('phrasingToggle');
const autoHarmonyToggle = document.getElementById('autoHarmonyToggle');

// Auto-harmony state
let autoHarmonyEnabled = false;

// Update harmony based on current position (auto-harmony mode)
function updateAutoHarmony() {
    if (!autoHarmonyEnabled) return;
    if (!PHASE_2_ENABLED) return;

    const position = getPosition();
    const chord = getChordForPosition(position);
    const currentChord = getCurrentChord();

    // Only change if different
    if (chord !== currentChord) {
        setHarmonyChord(chord, true); // Play the chord
        console.log(`🎹 Auto-harmony: ${chord}`);
        updateChordButtonUI();
    }
}

// Update stanza position indicator
function updateStanzaIndicator() {
    if (!PHASE_2_ENABLED || !stanzaIndicator) return;

    const position = getPosition();

    // Update stanza number
    const stanzaNum = document.getElementById('stanzaNumber');
    if (stanzaNum) stanzaNum.textContent = position.stanza;

    // Update step counter
    const stepEl = document.getElementById('phraseStep');
    const stepsEl = document.getElementById('phraseSteps');
    if (stepEl) stepEl.textContent = position.stepInPhrase;
    if (stepsEl) stepsEl.textContent = position.stepsPerPhrase;

    // Update line highlighting
    stanzaIndicator.querySelectorAll('.stanza-line').forEach(line => {
        const lineNum = parseInt(line.dataset.line);
        line.classList.toggle('active', lineNum === position.line);
    });

    // Update phrase boxes
    const phraseOrder = ['a', 'b', 'c', 'd', 'e', 'f'];
    const currentIndex = phraseOrder.indexOf(position.phrase);

    stanzaIndicator.querySelectorAll('.phrase-box').forEach(box => {
        const phrase = box.dataset.phrase;
        const phraseIndex = phraseOrder.indexOf(phrase);

        box.classList.remove('active', 'completed');
        if (phrase === position.phrase) {
            box.classList.add('active');
        } else if (phraseIndex < currentIndex) {
            box.classList.add('completed');
        }
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

// Update chord button active states
function updateChordButtonUI() {
    const currentChord = getCurrentChord();
    const isPlaying = isHarmonyPlaying();

    document.querySelectorAll('.chord-btn').forEach(btn => {
        const isThisChord = btn.dataset.chord === currentChord;
        btn.classList.toggle('active', isThisChord && isPlaying);
    });
}

// Handle note selection (from paths or notation)
async function handleNoteClick(lily) {
    const { isInitialized } = getAudioState();
    if (!isInitialized) {
        await initAudio();
        updateAudioToggleUI();
    }

    currentNote = lily;

    // Phase 2: Record note and advance position
    if (PHASE_2_ENABLED) {
        const position = getPosition();
        // Store note with position snapshot for history rewind
        history.push({ note: currentNote, position: { phraseIndex: position.phraseIndex, stepInPhrase: position.stepInPhrase } });
        recordNote(position.phrase, currentNote);
        advanceStep();
    } else {
        history.push({ note: currentNote, position: null });
        stepsInPhrase++;
    }

    if (history.length > 10) history = history.slice(-10);

    playNote(currentNote);
    sendMidiNote(currentNote);

    // Apply inflection if enabled and harmony is playing
    if (isHarmonyPlaying()) {
        inflectHarmony(currentNote, inflectToggle.checked, latchToggle.checked);
    }

    // Update auto-harmony if enabled
    updateAutoHarmony();

    updateAudioToggleUI();
    updateDisplay();
}

// Handle clicking a history note - rewind to that point
async function handleHistoryClick(index) {
    const entry = history[index];
    if (!entry) return;

    const { isInitialized } = getAudioState();
    if (!isInitialized) {
        await initAudio();
        updateAudioToggleUI();
    }

    // Truncate history to this point
    history = history.slice(0, index + 1);
    currentNote = entry.note;

    // Restore position if available
    if (PHASE_2_ENABLED && entry.position) {
        setPosition(entry.position.phraseIndex, entry.position.stepInPhrase);
        console.log(`⏪ Rewound to phrase ${getPosition().phrase}, step ${entry.position.stepInPhrase}`);
    }

    playNote(currentNote);
    sendMidiNote(currentNote);

    // Apply inflection if enabled and harmony is playing
    if (isHarmonyPlaying()) {
        inflectHarmony(currentNote, inflectToggle.checked, latchToggle.checked);
    }

    // Update auto-harmony if enabled
    updateAutoHarmony();

    updateAudioToggleUI();
    updateDisplay();
}

// Update UI
function updateDisplay() {
    currentNoteEl.innerHTML = displayNames[currentNote];
    noteInfoEl.textContent = `${frequencies[currentNote].toFixed(2)} Hz`;

    const historyContent = history
        .map((entry, i) => {
            const note = entry.note;
            let opacity = 1;
            if (history.length === 10 && i === 0) opacity = 0.1;
            else if (history.length >= 9 && i === history.length - 9) opacity = 0.5;
            else if (history.length >= 8 && i === history.length - 8) opacity = 0.7;
            const isCurrent = i === history.length - 1;
            return `<span class="history-note${isCurrent ? ' current' : ''}" data-index="${i}" data-note="${note}" style="opacity: ${opacity}; cursor: pointer;">${displayNames[note]}</span>`;
        })
        .join(' \u2192 ');
    historyEl.innerHTML = `<span class="history-inner">${historyContent}</span>`;

    // Make history notes clickable - rewind to that point
    historyEl.querySelectorAll('.history-note').forEach(el => {
        el.addEventListener('click', () => handleHistoryClick(parseInt(el.dataset.index)));
    });

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
    updateStanzaIndicator();
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

    if (PHASE_2_ENABLED) {
        // Phase 2: Full stanza tracking
        const position = getPosition();

        if (possible.length === 0) {
            // Sink note (C) - freeze phrase for repetition before advancing
            if (position.phrase === 'a' || position.phrase === 'b') {
                freezePhrase(position.phrase);
            }
            // Advance to next phrase
            const stanzaEnded = advancePhrase();
            const newPosition = getPosition();

            // Decide splits for phrases e and f
            if (newPosition.phrase === 'e' || newPosition.phrase === 'f') {
                decideSplits(newPosition.phrase);
            }

            currentNote = getRestartNote(newPosition);
            // Store with new position for history rewind
            history.push({ note: currentNote, position: { phraseIndex: newPosition.phraseIndex, stepInPhrase: newPosition.stepInPhrase } });
            recordNote(newPosition.phrase, currentNote);
            console.log(`📍 Phrase ${position.phrase} ended (sink) → starting phrase ${newPosition.phrase}`);

            if (stanzaEnded) {
                clearPhrases(); // Clear melodic memory for new stanza
                console.log('🎼 New stanza started');
            }
        } else {
            // Weighted selection with position awareness
            // Extract just notes for the selection algorithm
            const historyNotes = history.map(h => h.note);
            const result = selectWeightedNote(currentNote, historyNotes, possible, 0, position);
            currentNote = result.note;
            // Store with position for history rewind
            history.push({ note: currentNote, position: { phraseIndex: position.phraseIndex, stepInPhrase: position.stepInPhrase } });
            recordNote(position.phrase, currentNote);

            const phraseEnded = advanceStep();
            if (phraseEnded || result.shouldRestart) {
                // Freeze phrase for repetition before advancing
                if (position.phrase === 'a' || position.phrase === 'b') {
                    freezePhrase(position.phrase);
                }
                const stanzaEnded = advancePhrase();
                const newPosition = getPosition();

                // Decide splits for phrases e and f
                if (newPosition.phrase === 'e' || newPosition.phrase === 'f') {
                    decideSplits(newPosition.phrase);
                }

                console.log(`📍 Phrase ${position.phrase} ended → starting phrase ${newPosition.phrase}`);

                if (stanzaEnded) {
                    clearPhrases();
                    console.log('🎼 New stanza started');
                }
            }

            if (history.length > 10) history = history.slice(-10);
        }
    } else {
        // Phase 1.5 fallback: Simple step tracking
        if (possible.length === 0) {
            currentNote = getRestartNote();
            history.push({ note: currentNote, position: null });
            stepsInPhrase = 0;
            console.log('📍 New phrase started (sink reached)');
        } else {
            const historyNotes = history.map(h => h.note);
            const result = selectWeightedNote(currentNote, historyNotes, possible, stepsInPhrase);
            currentNote = result.note;
            history.push({ note: currentNote, position: null });
            stepsInPhrase++;

            if (result.shouldRestart) {
                console.log(`📍 Phrase ended after ${stepsInPhrase} steps`);
                stepsInPhrase = 0;
            }

            if (history.length > 10) history = history.slice(-10);
        }
    }

    playNote(currentNote);
    sendMidiNote(currentNote);

    // Apply inflection if enabled and harmony is playing
    if (isHarmonyPlaying()) {
        inflectHarmony(currentNote, inflectToggle.checked, latchToggle.checked);
    }

    // Update auto-harmony if enabled
    updateAutoHarmony();

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

    // Phrasing toggle
    const autoHarmonyLabel = document.querySelector('label[for="autoHarmonyToggle"]');
    if (phrasingToggle) {
        phrasingToggle.addEventListener('change', (e) => {
            setPhrasing(e.target.checked);
            // Hide/show stanza structure UI (but keep toggles visible)
            stanzaIndicator.querySelectorAll('.stanza-line, .stanza-progress').forEach(el => {
                el.style.display = e.target.checked ? '' : 'none';
            });
            // Enable/disable auto-harmony (requires phrasing)
            if (autoHarmonyToggle) {
                autoHarmonyToggle.disabled = !e.target.checked;
                autoHarmonyLabel?.classList.toggle('disabled', !e.target.checked);
                // Turn off auto-harmony if phrasing is turned off
                if (!e.target.checked && autoHarmonyEnabled) {
                    autoHarmonyToggle.checked = false;
                    autoHarmonyEnabled = false;
                    console.log('🎹 Auto-harmony OFF (phrasing disabled)');
                }
            }
        });
    }

    // Auto-harmony toggle
    if (autoHarmonyToggle) {
        autoHarmonyToggle.addEventListener('change', async (e) => {
            autoHarmonyEnabled = e.target.checked;
            console.log(`🎹 Auto-harmony ${autoHarmonyEnabled ? 'ON' : 'OFF'}`);

            if (autoHarmonyEnabled) {
                // Initialize audio if needed
                const { isInitialized } = getAudioState();
                if (!isInitialized) {
                    await initAudio();
                    updateAudioToggleUI();
                }
                // Start playing the current position's chord
                updateAutoHarmony();
            }
        });
    }

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

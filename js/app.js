// Main application logic
import { adjacency, frequencies, displayNames } from './network.js';
import { initMidi, sendMidiNote, sendDroneMidi, updateDroneMidi } from './midi.js';
import {
    initAudio, getAudioState, toggleMute, playNote,
    toggleDroneNote, inflectDrones, resetInflection,
    getCurrentInflection, droneDegrees, pitchDisplayNames,
    setChord, getChordNotes, getCurrentChord, getEffectiveOctave,
    getAudioTransposition
} from './audio.js';
import { renderNotation } from './notation.js';
import { initEnsemble, updateRoomState, getEnsembleState } from './ensemble.js';
import {
    loadChordData, autoTransposeToChord, autoTransposeToScale,
    getCurrentTransposition, getTranspositionDisplay
} from './transpose.js';
import { initNetworkGraph, highlightNote } from './network-graph.js';
import { analyzeNetwork } from './analysis.js';

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
    document.querySelectorAll('.drone-btn').forEach(btn => {
        const note = btn.dataset.note;
        const info = droneDegrees[note];
        if (!info) return;

        const pitchClass = inflection[info.degree];
        const displayOctave = getEffectiveOctave(info.degree, info.octave);
        btn.innerHTML = pitchDisplayNames[pitchClass] + displayOctave;
    });
}

// Update MIDI for all active drones (when chord or inflection changes)
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
    highlightNote(currentNote);

    const changed = inflectDrones(currentNote, inflectToggle.checked, latchToggle.checked);
    if (changed) {
        updateDroneLabels();
        updateAllDroneMidi();
    }

    // Send to ensemble
    sendPitchToEnsemble(currentNote);

    updateAudioToggleUI(); // Always sync toggle state
    updateDisplay();
}

// Update UI
function updateDisplay() {
    currentNoteEl.innerHTML = getTransposedDisplayName(currentNote);

    // Calculate transposed frequency
    const transposition = getAudioTransposition();
    const baseFreq = frequencies[currentNote];
    const transposedFreq = baseFreq * Math.pow(2, transposition / 12);
    noteInfoEl.textContent = `${transposedFreq.toFixed(2)} Hz`;

    historyEl.innerHTML = history
        .map((n, i) => `<span class="history-note${i === history.length - 1 ? ' current' : ''}" data-index="${i}" data-note="${n}">${getTransposedDisplayName(n)}</span>`)
        .join('<span class="history-arrow">\u2192</span>') +
        `<button class="history-back-btn" ${history.length <= 1 ? 'disabled' : ''}>Back</button>`;

    // Add click handlers to history notes
    historyEl.querySelectorAll('.history-note').forEach(el => {
        el.addEventListener('click', () => {
            const note = el.dataset.note;
            const index = parseInt(el.dataset.index);
            // Truncate history to this point and go to this note
            history = history.slice(0, index + 1);
            currentNote = note;
            playNote(currentNote);
            sendMidiNote(currentNote);
            highlightNote(currentNote);
            sendPitchToEnsemble(currentNote);
            updateDisplay();
        });
    });

    // Back button handler
    const backBtn = historyEl.querySelector('.history-back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (history.length > 1) {
                history.pop();
                currentNote = history[history.length - 1];
                playNote(currentNote);
                sendMidiNote(currentNote);
                highlightNote(currentNote);
                sendPitchToEnsemble(currentNote);
                updateDisplay();
            }
        });
    }

    // Auto-scroll to show current note on mobile
    setTimeout(() => {
        const currentEl = historyEl.querySelector('.history-note.current');
        if (currentEl) {
            currentEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, 0);

    const possible = adjacency[currentNote] || [];

    if (possible.length === 0) {
        pathsNotesEl.innerHTML = '<span class="sink-message">End of phrase</span>';
        nextBtn.textContent = 'New Phrase';
    } else {
        pathsNotesEl.innerHTML = possible.map(note =>
            `<span class="path-note" data-note="${note}">${getTransposedDisplayName(note)}</span>`
        ).join('');
        nextBtn.textContent = 'Random';

        pathsNotesEl.querySelectorAll('.path-note').forEach(el => {
            el.addEventListener('click', () => handleNoteClick(el.dataset.note));
        });
    }

    renderNotation(notationContainer, currentNote, handleNoteClick);
}

// Handle ensemble room updates (for member mode)
function handleEnsembleRoomUpdate(room, isHost) {
    if (!room) {
        // Left room - could reset state here if needed
        console.log('[App] Left ensemble room');
        updateTranspositionDisplay();
        return;
    }

    console.log('[App] Room update received. isHost:', isHost);
    console.log('[App] Room data keys:', Object.keys(room));
    console.log('[App] Full room data:', JSON.stringify(room, null, 2));

    // If member (not host), react to room state changes
    if (!isHost) {
        let transposed = false;

        // Priority: chord data first, then scale data
        // Data can be a string (chord/scale name) or object with root/pitchClasses
        if (room.chordData) {
            console.log('[App] Member received chordData:', room.chordData);
            const chordInfo = parseChordOrScaleData(room.chordData);
            console.log('[App] Parsed chord info:', chordInfo);
            if (chordInfo) {
                autoTransposeToChord(chordInfo);
                transposed = true;
            }
        } else if (room.scaleData) {
            console.log('[App] Member received scaleData:', room.scaleData);
            const scaleInfo = parseChordOrScaleData(room.scaleData);
            console.log('[App] Parsed scale info:', scaleInfo);
            if (scaleInfo) {
                autoTransposeToScale(scaleInfo);
                transposed = true;
            }
        } else {
            console.log('[App] No chordData or scaleData found in room');
        }

        if (transposed) {
            updateTranspositionDisplay();
            // Re-render with new transposition
            updateDisplay();
        }
    } else {
        console.log('[App] Ignoring update because we are host');
    }
}

// Parse chord/scale data which can be a string like "g_M7-39" or an object
function parseChordOrScaleData(data) {
    if (!data) return null;

    // If already an object with root, return as-is
    if (typeof data === 'object' && data.root !== undefined) {
        return data;
    }

    // If it's a string, parse it: "g_M7-39" -> { root: 7, name: "g_M7-39" }
    if (typeof data === 'string') {
        // Extract root from first character(s)
        const noteToRoot = {
            'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11
        };

        // Handle flats/sharps: "eb_..." "f#_..."
        let root = null;
        let notePart = data.split('_')[0].toLowerCase();

        if (notePart.length >= 2 && notePart[1] === 'b') {
            // Flat: eb -> 3, ab -> 8, etc.
            root = (noteToRoot[notePart[0]] - 1 + 12) % 12;
        } else if (notePart.length >= 2 && notePart[1] === '#') {
            // Sharp: f# -> 6, c# -> 1, etc.
            root = (noteToRoot[notePart[0]] + 1) % 12;
        } else if (noteToRoot[notePart[0]] !== undefined) {
            root = noteToRoot[notePart[0]];
        }

        if (root !== null) {
            return { root, name: data };
        }
    }

    return null;
}

// Update UI to show current transposition
function updateTranspositionDisplay() {
    const transposition = getCurrentTransposition();
    const display = getTranspositionDisplay();

    // Update or create transposition indicator
    let indicator = document.getElementById('transposition-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'transposition-indicator';
        indicator.className = 'transposition-indicator';
        document.querySelector('.header').appendChild(indicator);
    }

    if (transposition === 0) {
        indicator.classList.add('hidden');
    } else {
        indicator.textContent = `Key: ${display}`;
        indicator.classList.remove('hidden');
    }
}

// Pitch class name to numeric value (0-11, with 0.5 for quarter-tones)
const pitchClassToNumber = {
    'C': 0, 'D': 2, 'Eb': 3, 'Eqf': 3.5, 'E': 4, 'F': 5,
    'Gb': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11
};

// LilyPond note to pitch class number
const lilyToPitchClass = {
    "c'": 0, "c''": 0,
    "d'": 2, "d''": 2,
    "ees'": 3, "ees''": 3,
    "eeh'": 3.5, "eeh''": 3.5,
    "e'": 4, "e''": 4,
    "f'": 5,
    "ges'": 6,
    "g'": 7,
    "a'": 9,
    "bes'": 10,
    "b'": 11
};

// Semitone to display name (prefer flats for blues context)
const FLAT = '\u266D';
const QUARTER_FLAT = '<span class="quarter-flat">\u266D</span>';
const semiToDisplayName = {
    0: 'c', 1: `d${FLAT}`, 2: 'd', 3: `e${FLAT}`, 4: 'e', 5: 'f',
    6: `g${FLAT}`, 7: 'g', 8: `a${FLAT}`, 9: 'a', 10: `b${FLAT}`, 11: 'b'
};

// Get transposed display name for a LilyPond note
function getTransposedDisplayName(lilyNote) {
    const transposition = getAudioTransposition();

    // Get base pitch class and octave indicator
    const pc = lilyToPitchClass[lilyNote];
    if (pc === undefined) return displayNames[lilyNote];

    // Check if it's an upper octave note (has '' or ends with '')
    const isUpperOctave = lilyNote.includes("''");

    // Transpose
    let newPc = pc + transposition;

    // Handle quarter-tones
    const isQuarterFlat = newPc % 1 === 0.5;
    let basePc = Math.floor(newPc) % 12;
    if (basePc < 0) basePc += 12;

    let name = semiToDisplayName[basePc];

    // Quarter-flat handling (only on E position in blues)
    if (isQuarterFlat) {
        name = `e${QUARTER_FLAT}`;
    }

    // Add octave indicator if upper octave
    if (isUpperOctave) {
        name += "'";
    }

    return name;
}

// Build activePCs array from current melody and active drones
function buildActivePCs(melodyNote) {
    const pcs = new Set();

    // Add melody pitch class
    const melodyPC = lilyToPitchClass[melodyNote];
    if (melodyPC !== undefined) {
        pcs.add(melodyPC);
    }

    // Add active drone pitch classes (inflected)
    const inflection = getCurrentInflection();
    document.querySelectorAll('.drone-btn.active').forEach(btn => {
        const note = btn.dataset.note;
        const info = droneDegrees[note];
        if (info) {
            const pitchClass = inflection[info.degree];
            const pcNum = pitchClassToNumber[pitchClass];
            if (pcNum !== undefined) {
                pcs.add(pcNum);
            }
        }
    });

    // Return sorted array
    return Array.from(pcs).sort((a, b) => a - b);
}

// Send pitch classes to ensemble room when note is played (host mode)
async function sendPitchToEnsemble(melodyNote) {
    const { room, isHost } = getEnsembleState();
    if (!room || !isHost) return;

    const activePCs = buildActivePCs(melodyNote);

    await updateRoomState({
        activePCs: activePCs,
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
        currentNote = "g'";
        history.push("g'");
    } else {
        currentNote = possible[Math.floor(Math.random() * possible.length)];
        history.push(currentNote);
        if (history.length > 10) history = history.slice(-10);
    }

    playNote(currentNote);
    sendMidiNote(currentNote);
    highlightNote(currentNote);

    const changed = inflectDrones(currentNote, inflectToggle.checked, latchToggle.checked);
    if (changed) {
        updateDroneLabels();
        updateAllDroneMidi();
    }

    // Send to ensemble
    sendPitchToEnsemble(currentNote);

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

    // Load chord lookup data for transposition
    loadChordData();

    // Ensemble
    initEnsemble(handleEnsembleRoomUpdate);

    // Network Graph
    initNetworkGraph(handleNoteClick);

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
        // Send updated activePCs to ensemble
        sendPitchToEnsemble(currentNote);
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
                const inflection = getCurrentInflection();
                const pitchClass = inflection[info.degree];
                const effectiveOctave = getEffectiveOctave(info.degree, info.octave);
                sendDroneMidi(info.degree, pitchClass, effectiveOctave, isNowOn);
            }

            // Send updated activePCs to ensemble
            sendPitchToEnsemble(currentNote);
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
            // Send updated activePCs to ensemble
            sendPitchToEnsemble(currentNote);
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

    // Run network analysis (logs to console)
    analyzeNetwork();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

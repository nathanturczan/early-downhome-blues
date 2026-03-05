// MIDI module - Melody and Harmony outputs
// Supports MPE mode for independent pitch bend per note

// MIDI note mappings with pitch bend for quarter-tones
// Bend value 1024 = 50 cents with ±4 semitone range
export const midiNotes = {
    "c'": { note: 60, bend: 0 }, "d'": { note: 62, bend: 0 },
    "ees'": { note: 63, bend: 0 }, "eeh'": { note: 63, bend: 1024 },
    "e'": { note: 64, bend: 0 }, "f'": { note: 65, bend: 0 },
    "ges'": { note: 66, bend: 0 }, "g'": { note: 67, bend: 0 },
    "a'": { note: 69, bend: 0 }, "bes'": { note: 70, bend: 0 },
    "b'": { note: 71, bend: 0 }, "c''": { note: 72, bend: 0 },
    "d''": { note: 74, bend: 0 }, "ees''": { note: 75, bend: 0 },
    "eeh''": { note: 75, bend: 1024 }, "e''": { note: 76, bend: 0 }
};

// Note name to MIDI conversion (handles harmony note format like 'Eqf3', 'Bb4')
const noteRegex = /^([A-G])([b#qf]*)(\d)$/;

function noteStringToMidiNumber(noteStr) {
    const match = noteStr.match(noteRegex);
    if (!match) return 60; // fallback C4

    const [, letter, accidental, octaveStr] = match;
    const octave = parseInt(octaveStr);

    const letterSemitones = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    let semitone = letterSemitones[letter];

    // Apply accidentals (quarter-tones need pitch bend, use flat as base)
    if (accidental === 'b') semitone -= 1;
    else if (accidental === '#') semitone += 1;
    else if (accidental === 'qf') semitone -= 1; // Use flat as base for quarter-flat

    return (octave + 1) * 12 + semitone;
}

function hasQuarterTone(noteStr) {
    return noteStr.includes('qf');
}

// Get pitch bend value for a note (0 for normal, 1024 for quarter-flat)
function getPitchBend(noteStr) {
    return hasQuarterTone(noteStr) ? 1024 : 0;
}

let midiAccess = null;
let midiOutputDevices = [];
let midiRows = []; // Array of { type, portId, channel, mpe, lastNote/lastNotes, mpeChannelMap }
let rowIdCounter = 1;

export async function initMidi() {
    if (!navigator.requestMIDIAccess) return;
    try {
        midiAccess = await navigator.requestMIDIAccess();
        midiOutputDevices = [];
        for (const output of midiAccess.outputs.values()) {
            midiOutputDevices.push(output);
        }
        updateAllPortSelects();
        midiAccess.onstatechange = () => {
            midiOutputDevices = [];
            for (const output of midiAccess.outputs.values()) {
                midiOutputDevices.push(output);
            }
            updateAllPortSelects();
        };

        // Initialize first row
        const firstRow = document.querySelector('.midi-row');
        if (firstRow) {
            const mpeCheckbox = firstRow.querySelector('.midi-mpe');
            midiRows.push({
                rowId: 0,
                type: 'melody',
                portId: '',
                channel: 0,
                mpe: mpeCheckbox?.checked || false,
                lastNote: null,
                lastNotes: null,
                mpeVoices: {} // For MPE: tracks { channel: { noteNum, bend } }
            });
            setupRowListeners(firstRow, 0);
        }

        // Add button listener
        const addBtn = document.getElementById('addMidiOutput');
        if (addBtn) {
            addBtn.addEventListener('click', addMidiRow);
        }
    } catch (err) {
        console.log('[MIDI] Access denied:', err);
    }
}

// Abbreviate long MIDI port names to fit in dropdown
function abbreviatePortName(name, maxLen = 18) {
    if (!name || name.length <= maxLen) return name;
    // Common abbreviations
    const abbrevs = [
        [/Virtual\s*/gi, 'V'],
        [/Network\s*/gi, 'Net '],
        [/Session\s*/gi, 'Sess '],
        [/Bluetooth\s*/gi, 'BT '],
        [/MIDI\s*/gi, ''],
        [/Port\s*/gi, 'P'],
        [/Output\s*/gi, 'Out '],
        [/Input\s*/gi, 'In '],
    ];
    let short = name;
    for (const [pattern, replacement] of abbrevs) {
        short = short.replace(pattern, replacement);
        if (short.length <= maxLen) return short;
    }
    // Still too long - truncate with ellipsis
    return short.slice(0, maxLen - 1) + '…';
}

function updateAllPortSelects() {
    document.querySelectorAll('.midi-port').forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">None</option>';
        midiOutputDevices.forEach(output => {
            const option = document.createElement('option');
            option.value = output.id;
            option.textContent = abbreviatePortName(output.name);
            option.title = output.name; // Full name on hover
            select.appendChild(option);
        });
        if (currentValue && [...select.options].some(o => o.value === currentValue)) {
            select.value = currentValue;
        }
    });
}

function setupRowListeners(rowEl, rowIndex) {
    const typeSelect = rowEl.querySelector('.midi-type');
    const portSelect = rowEl.querySelector('.midi-port');
    const channelSelect = rowEl.querySelector('.midi-channel');
    const channelContainer = channelSelect?.closest('.midi-select');
    const mpeCheckbox = rowEl.querySelector('.midi-mpe');
    const removeBtn = rowEl.querySelector('.midi-remove-btn');

    // Helper to update channel selector visibility based on MPE state
    const updateChannelVisibility = (mpeEnabled) => {
        if (channelContainer) {
            channelContainer.style.display = mpeEnabled ? 'none' : '';
        }
    };

    typeSelect.addEventListener('change', (e) => {
        midiRows[rowIndex].type = e.target.value;
    });
    portSelect.addEventListener('change', (e) => {
        midiRows[rowIndex].portId = e.target.value;
    });
    channelSelect.addEventListener('change', (e) => {
        midiRows[rowIndex].channel = parseInt(e.target.value);
    });
    if (mpeCheckbox) {
        // Set initial visibility
        updateChannelVisibility(mpeCheckbox.checked);

        mpeCheckbox.addEventListener('change', (e) => {
            midiRows[rowIndex].mpe = e.target.checked;
            updateChannelVisibility(e.target.checked);
            console.log(`[MIDI] Row ${rowIndex} MPE: ${e.target.checked}`);
        });
    }
    removeBtn.addEventListener('click', () => {
        removeMidiRow(rowEl, rowIndex);
    });
}

function addMidiRow() {
    const container = document.getElementById('midiOutputs');
    const lastRow = midiRows[midiRows.length - 1];

    // Determine next type - cycle through melody, drone, root
    let nextType = 'drone';
    if (lastRow?.type === 'melody') nextType = 'drone';
    else if (lastRow?.type === 'drone') nextType = 'root';
    else if (lastRow?.type === 'root') nextType = 'melody';

    // Determine next channel (increment from last)
    const nextChannel = Math.min((lastRow?.channel ?? -1) + 1, 15);

    const rowId = rowIdCounter++;
    const rowIndex = midiRows.length;

    const rowEl = document.createElement('div');
    rowEl.className = 'midi-row';
    rowEl.dataset.rowId = rowId;

    rowEl.innerHTML = `
        <div class="midi-select">
            <label>Type</label>
            <select class="midi-type">
                <option value="melody"${nextType === 'melody' ? ' selected' : ''}>Melody</option>
                <option value="drone"${nextType === 'drone' ? ' selected' : ''}>Drone</option>
                <option value="root"${nextType === 'root' ? ' selected' : ''}>Chord Root</option>
            </select>
        </div>
        <div class="midi-select">
            <label>Port</label>
            <select class="midi-port">
                <option value="">None</option>
            </select>
        </div>
        <div class="midi-select">
            <label>Ch</label>
            <select class="midi-channel">
                ${Array.from({length: 16}, (_, i) =>
                    `<option value="${i}"${i === nextChannel ? ' selected' : ''}>${i + 1}</option>`
                ).join('')}
            </select>
        </div>
        <label class="midi-mpe-label">
            <input type="checkbox" class="midi-mpe">
            MPE
        </label>
        <button class="midi-remove-btn" title="Remove">&times;</button>
    `;

    container.appendChild(rowEl);

    // Populate port select
    const portSelect = rowEl.querySelector('.midi-port');
    midiOutputDevices.forEach(output => {
        const option = document.createElement('option');
        option.value = output.id;
        option.textContent = abbreviatePortName(output.name);
        option.title = output.name; // Full name on hover
        portSelect.appendChild(option);
    });
    // Copy port from last row
    if (lastRow?.portId) {
        portSelect.value = lastRow.portId;
    }

    midiRows.push({
        rowId,
        type: nextType,
        portId: lastRow?.portId || '',
        channel: nextChannel,
        mpe: false,
        lastNote: null,
        lastNotes: null,
        mpeVoices: {}
    });

    setupRowListeners(rowEl, rowIndex);

    // Show remove buttons if more than one row
    updateRemoveButtons();
}

function removeMidiRow(rowEl, rowIndex) {
    rowEl.remove();
    midiRows.splice(rowIndex, 1);

    // Re-setup listeners with correct indices
    document.querySelectorAll('.midi-row').forEach((el, i) => {
        setupRowListeners(el, i);
    });

    updateRemoveButtons();
}

function updateRemoveButtons() {
    const rows = document.querySelectorAll('.midi-row');
    rows.forEach((row, i) => {
        const btn = row.querySelector('.midi-remove-btn');
        btn.classList.toggle('hidden', rows.length <= 1);
    });
}

function getOutputDevice(portId) {
    return midiOutputDevices.find(o => o.id === portId) || null;
}

export function sendMidiNote(lilyNote) {
    const midiInfo = midiNotes[lilyNote];
    if (!midiInfo) return;

    // Send to all melody outputs
    midiRows.forEach((row, index) => {
        if (row.type !== 'melody') return;

        const output = getOutputDevice(row.portId);
        if (!output) return;

        const channel = row.channel;
        const noteNum = midiInfo.note;
        const bendValue = 8192 + midiInfo.bend;

        // In MPE mode, we still use the base channel for melody (single note at a time)
        // MPE is more useful for drone where we need independent bends per chord note

        // Note off for previous note
        if (row.lastNote !== null) {
            output.send([0x80 | channel, row.lastNote, 0]);
        }

        // Pitch bend then note on
        output.send([0xE0 | channel, bendValue & 0x7F, (bendValue >> 7) & 0x7F]);
        output.send([0x90 | channel, noteNum, 100]);
        midiRows[index].lastNote = noteNum;

        // Note stays on (latched) until next note or killMelodyNote() is called
    });
}

/**
 * Kill the current melody note on all melody outputs
 */
export function killMelodyNote() {
    midiRows.forEach((row, index) => {
        if (row.type !== 'melody') return;

        const output = getOutputDevice(row.portId);
        if (!output) return;

        const channel = row.channel;

        if (row.lastNote !== null) {
            output.send([0x80 | channel, row.lastNote, 0]);
            midiRows[index].lastNote = null;
        }
    });
}

/**
 * Send harmony MIDI - full chord to drone outputs
 * @param {string[]} notes - Array of note strings like ['C2', 'G3', 'Eqf4', 'Bb4']
 * @param {boolean} isOn - true to start chord, false to stop
 */
export function sendHarmonyMidi(notes, isOn) {
    console.log(`[MIDI] sendHarmonyMidi: ${notes.join(', ')} isOn=${isOn}`);

    midiRows.forEach((row, index) => {
        // Handle drone (full chord) and root (just root note) types
        if (row.type !== 'drone' && row.type !== 'root') return;

        const output = getOutputDevice(row.portId);
        if (!output) {
            console.log(`[MIDI] No output device for ${row.type} row ${index}`);
            return;
        }

        const baseChannel = row.channel;

        // For root type, only send the first note (chord root)
        const notesToSend = row.type === 'root' ? [notes[0]] : notes;

        if (row.mpe) {
            // MPE mode: each note on its own channel with independent pitch bend
            sendHarmonyMPE(output, row, index, notesToSend, isOn, baseChannel);
        } else {
            // Standard mode: all notes on same channel, no quarter-tone support
            sendHarmonyStandard(output, row, index, notesToSend, isOn, baseChannel);
        }
    });
}

/**
 * Standard (non-MPE) harmony output - all notes on one channel
 */
function sendHarmonyStandard(output, row, index, notes, isOn, channel) {
    // Turn off previous notes
    if (row.lastNotes && row.lastNotes.length > 0) {
        row.lastNotes.forEach(n => {
            output.send([0x80 | channel, n, 0]);
        });
    }

    if (isOn) {
        // Convert note strings to MIDI numbers
        const midiNoteNumbers = notes.map(noteStr => noteStringToMidiNumber(noteStr));

        // Reset pitch bend (quarter-tones not supported in standard mode)
        output.send([0xE0 | channel, 0x00, 0x40]); // Center pitch bend

        // Send all notes
        midiNoteNumbers.forEach(n => {
            output.send([0x90 | channel, n, 80]);
        });

        midiRows[index].lastNotes = midiNoteNumbers;
        console.log(`[MIDI] Sent chord: ${midiNoteNumbers.join(', ')} on ch${channel + 1}`);
    } else {
        midiRows[index].lastNotes = null;
    }
}

/**
 * MPE harmony output - proper MPE spec with tied notes
 * Channel 1 = Master (not used for notes)
 * Channels 2-16 = Member channels (one note per channel, independent pitch bend)
 * One MPE-enabled synth receives all notes and handles per-note pitch bend internally
 *
 * Tied notes: only re-attack if the note changes. If same note, just update pitch bend.
 */
function sendHarmonyMPE(output, row, index, notes, isOn, baseChannel) {
    // mpeVoices tracks: { channel: { noteNum, bend } }
    const prevVoices = row.mpeVoices || {};

    if (isOn) {
        const newVoices = {};

        notes.forEach((noteStr, noteIndex) => {
            // MPE member channels start at 2 (channel 1 is master)
            const channel = 1 + noteIndex; // channels 1,2,3,4 = MIDI ch 2,3,4,5
            const noteNum = noteStringToMidiNumber(noteStr);
            const bend = getPitchBend(noteStr);
            const bendValue = 8192 + bend;

            const prev = prevVoices[channel];

            if (prev && prev.noteNum === noteNum) {
                // Same note - just update pitch bend if changed
                if (prev.bend !== bend) {
                    output.send([0xE0 | channel, bendValue & 0x7F, (bendValue >> 7) & 0x7F]);
                    if (bend > 0) {
                        console.log(`[MIDI MPE] Bend update: ch${channel + 1} -> ${bend}`);
                    }
                }
                // Note stays on (tied)
            } else {
                // Different note - note off old, note on new
                if (prev) {
                    output.send([0x80 | channel, prev.noteNum, 0]);
                }
                // Send pitch bend then note on
                output.send([0xE0 | channel, bendValue & 0x7F, (bendValue >> 7) & 0x7F]);
                output.send([0x90 | channel, noteNum, 80]);

                if (bend > 0) {
                    console.log(`[MIDI MPE] ${noteStr} -> MIDI ${noteNum} on ch${channel + 1} with bend ${bend}`);
                }
            }

            newVoices[channel] = { noteNum, bend };
        });

        midiRows[index].mpeVoices = newVoices;
    } else {
        // Turn off all notes
        Object.entries(prevVoices).forEach(([channel, voice]) => {
            output.send([0x80 | parseInt(channel), voice.noteNum, 0]);
        });
        midiRows[index].mpeVoices = {};
    }
}

// For backwards compatibility
export function setMidiOutput(outputId) {
    if (midiRows.length > 0) {
        midiRows[0].portId = outputId;
    }
}

export function updateMidiPorts() {
    updateAllPortSelects();
}

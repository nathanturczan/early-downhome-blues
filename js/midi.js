// MIDI module - Melody and Harmony outputs
// Simplified from per-degree drone to single chord output

// MIDI note mappings with pitch bend for quarter-tones
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

// Note name to MIDI conversion
const noteRegex = /^([A-G])([b#qf]*)(\d)$/;

function noteStringToMidiNumber(noteStr) {
    const match = noteStr.match(noteRegex);
    if (!match) return 60; // fallback C4

    const [, letter, accidental, octaveStr] = match;
    const octave = parseInt(octaveStr);

    const letterSemitones = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    let semitone = letterSemitones[letter];

    // Apply accidentals (quarter-tones handled via pitch bend separately)
    if (accidental === 'b') semitone -= 1;
    else if (accidental === '#') semitone += 1;
    // qf not adjusted here - needs pitch bend

    return (octave + 1) * 12 + semitone;
}

function hasQuarterTone(noteStr) {
    return noteStr.includes('qf');
}

let midiAccess = null;
let midiOutputDevices = [];
let midiRows = []; // Array of { type, portId, channel, lastNote/lastNotes }
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
            midiRows.push({
                rowId: 0,
                type: 'melody',
                portId: '',
                channel: 0,
                lastNote: null,
                lastNotes: null // For drone chords
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

function updateAllPortSelects() {
    document.querySelectorAll('.midi-port').forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">None</option>';
        midiOutputDevices.forEach(output => {
            const option = document.createElement('option');
            option.value = output.id;
            option.textContent = output.name;
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
    const removeBtn = rowEl.querySelector('.midi-remove-btn');

    typeSelect.addEventListener('change', (e) => {
        midiRows[rowIndex].type = e.target.value;
    });
    portSelect.addEventListener('change', (e) => {
        midiRows[rowIndex].portId = e.target.value;
    });
    channelSelect.addEventListener('change', (e) => {
        midiRows[rowIndex].channel = parseInt(e.target.value);
    });
    removeBtn.addEventListener('click', () => {
        removeMidiRow(rowEl, rowIndex);
    });
}

function addMidiRow() {
    const container = document.getElementById('midiOutputs');
    const lastRow = midiRows[midiRows.length - 1];

    // Determine next type - alternate between melody and drone
    let nextType = 'drone';
    if (lastRow?.type === 'drone') nextType = 'melody';

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
        <button class="midi-remove-btn" title="Remove">&times;</button>
    `;

    container.appendChild(rowEl);

    // Populate port select
    const portSelect = rowEl.querySelector('.midi-port');
    midiOutputDevices.forEach(output => {
        const option = document.createElement('option');
        option.value = output.id;
        option.textContent = output.name;
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
        lastNote: null,
        lastNotes: null
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

export function sendMidiNote(lilyNote, duration = 0.5) {
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

        // Note off for previous note
        if (row.lastNote !== null) {
            output.send([0x80 | channel, row.lastNote, 0]);
        }

        // Pitch bend then note on
        output.send([0xE0 | channel, bendValue & 0x7F, (bendValue >> 7) & 0x7F]);
        output.send([0x90 | channel, noteNum, 100]);
        midiRows[index].lastNote = noteNum;

        // Schedule note off
        setTimeout(() => {
            if (midiRows[index]?.lastNote === noteNum) {
                output.send([0x80 | channel, noteNum, 0]);
                midiRows[index].lastNote = null;
            }
        }, duration * 1000);
    });
}

/**
 * Send harmony MIDI - full chord to drone outputs
 * @param {string[]} notes - Array of note strings like ['C2', 'G3', 'E4', 'Bb4']
 * @param {boolean} isOn - true to start chord, false to stop
 */
export function sendHarmonyMidi(notes, isOn) {
    console.log(`[MIDI] sendHarmonyMidi: ${notes.join(', ')} isOn=${isOn}`);

    midiRows.forEach((row, index) => {
        if (row.type !== 'drone') return;

        const output = getOutputDevice(row.portId);
        if (!output) {
            console.log(`[MIDI] No output device for drone row ${index}`);
            return;
        }

        const channel = row.channel;

        // Turn off previous notes
        if (row.lastNotes && row.lastNotes.length > 0) {
            row.lastNotes.forEach(n => {
                output.send([0x80 | channel, n, 0]);
            });
        }

        if (isOn) {
            // Convert note strings to MIDI numbers
            const midiNoteNumbers = notes.map(noteStr => noteStringToMidiNumber(noteStr));

            // Reset pitch bend (no quarter-tones in chord voicings currently)
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
    });
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

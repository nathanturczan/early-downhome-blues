// MIDI module - Multiple outputs for melody and drone voices

import { getAudioTransposition } from './audio.js';

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

// Pitch class to MIDI note number (octave 0)
const pitchClassToMidi = {
    'C': 0, 'D': 2, 'Eb': 3, 'Eqf': 3, 'E': 4, 'F': 5, 'Gb': 6,
    'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11
};

// Pitch bend for quarter-tones
const pitchClassBend = {
    'C': 0, 'D': 0, 'Eb': 0, 'Eqf': 1024, 'E': 0, 'F': 0, 'Gb': 0,
    'G': 0, 'Ab': 0, 'A': 0, 'Bb': 0, 'B': 0
};

let midiAccess = null;
let midiOutputDevices = [];
let midiRows = []; // Array of { type, portId, channel, lastNote }
let rowIdCounter = 1;

// Auto-select types for new rows
const droneTypeOrder = ['root', 'third', 'fifth', 'seventh'];

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
                lastNote: null
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

    // Determine next type
    let nextType = 'root';
    const usedDroneTypes = midiRows.filter(r => r.type !== 'melody').map(r => r.type);
    for (const t of droneTypeOrder) {
        if (!usedDroneTypes.includes(t)) {
            nextType = t;
            break;
        }
    }

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
                <option value="melody">Melody</option>
                <option value="root"${nextType === 'root' ? ' selected' : ''}>Drone Root</option>
                <option value="third"${nextType === 'third' ? ' selected' : ''}>Drone 3rd</option>
                <option value="fifth"${nextType === 'fifth' ? ' selected' : ''}>Drone 5th</option>
                <option value="seventh"${nextType === 'seventh' ? ' selected' : ''}>Drone 7th</option>
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
        lastNote: null
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

    // Apply transposition
    const transposition = getAudioTransposition();

    // Send to all melody outputs
    midiRows.forEach((row, index) => {
        if (row.type !== 'melody') return;

        const output = getOutputDevice(row.portId);
        if (!output) return;

        const channel = row.channel;
        const noteNum = midiInfo.note + transposition;
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

// Send drone note to appropriate MIDI outputs
// degree: 'root', 'third', 'fifth', 'seventh'
// pitchClass: 'C', 'E', 'Eb', 'Eqf', etc.
// octave: 2, 3, 4, 5
// isOn: true to start, false to stop
export function sendDroneMidi(degree, pitchClass, octave, isOn) {
    console.log(`[MIDI] sendDroneMidi: ${degree} ${pitchClass}${octave} isOn=${isOn}`);

    midiRows.forEach((row, index) => {
        if (row.type !== degree) return;

        const output = getOutputDevice(row.portId);
        if (!output) {
            console.log(`[MIDI] No output device for row ${index}`);
            return;
        }

        const channel = row.channel;
        const baseMidi = pitchClassToMidi[pitchClass];
        if (baseMidi === undefined) {
            console.log(`[MIDI] Unknown pitch class: ${pitchClass}`);
            return;
        }

        const noteNum = baseMidi + (octave + 1) * 12; // MIDI octave offset
        const bend = pitchClassBend[pitchClass] || 0;
        const bendValue = 8192 + bend;

        console.log(`[MIDI] Sending to ch${channel + 1}: note ${noteNum}, bend ${bend}, isOn=${isOn}`);

        if (isOn) {
            // Note off for previous note if any
            if (row.lastNote !== null && row.lastNote !== noteNum) {
                output.send([0x80 | channel, row.lastNote, 0]);
            }
            // Pitch bend then note on
            output.send([0xE0 | channel, bendValue & 0x7F, (bendValue >> 7) & 0x7F]);
            output.send([0x90 | channel, noteNum, 80]);
            midiRows[index].lastNote = noteNum;
        } else {
            // Note off
            if (row.lastNote !== null) {
                output.send([0x80 | channel, row.lastNote, 0]);
                midiRows[index].lastNote = null;
            }
        }
    });
}

// Update drone MIDI when pitch changes (for inflection)
// Always sends the note - use this when drone is known to be active
export function updateDroneMidi(degree, pitchClass, octave) {
    midiRows.forEach((row, index) => {
        if (row.type !== degree) return;

        const output = getOutputDevice(row.portId);
        if (!output) return;

        const channel = row.channel;
        const baseMidi = pitchClassToMidi[pitchClass];
        if (baseMidi === undefined) {
            console.log(`[MIDI] Unknown pitch class: ${pitchClass}`);
            return;
        }

        const newNoteNum = baseMidi + (octave + 1) * 12;
        const bend = pitchClassBend[pitchClass] || 0;
        const bendValue = 8192 + bend;

        console.log(`[MIDI] updateDroneMidi: ${degree} -> ${pitchClass}${octave} (note ${newNoteNum}, bend ${bend})`);

        // Note off old if playing
        if (row.lastNote !== null && row.lastNote !== newNoteNum) {
            output.send([0x80 | channel, row.lastNote, 0]);
        }

        // Only send note-on if pitch actually changed or wasn't playing
        if (row.lastNote !== newNoteNum) {
            output.send([0xE0 | channel, bendValue & 0x7F, (bendValue >> 7) & 0x7F]);
            output.send([0x90 | channel, newNoteNum, 80]);
            midiRows[index].lastNote = newNoteNum;
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

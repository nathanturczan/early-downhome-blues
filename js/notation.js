// Notation rendering using VexFlow
import { staff1Notes, staff2Notes, staff3Notes, staff1Edges, staff2Edges, staff3Edges } from './network.js';
import { getAudioTransposition } from './audio.js';

const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = Vex.Flow;

// VexFlow note to semitone (within octave)
const vexNoteToSemi = {
    'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11
};

// Semitone to VexFlow note (prefer flats for blues)
const semiToVexNote = {
    0: { note: 'c', acc: null },
    1: { note: 'd', acc: 'b' },  // Db
    2: { note: 'd', acc: null },
    3: { note: 'e', acc: 'b' },  // Eb
    4: { note: 'e', acc: null },
    5: { note: 'f', acc: null },
    6: { note: 'g', acc: 'b' },  // Gb
    7: { note: 'g', acc: null },
    8: { note: 'a', acc: 'b' },  // Ab
    9: { note: 'a', acc: null },
    10: { note: 'b', acc: 'b' }, // Bb
    11: { note: 'b', acc: null }
};

// Transpose a VexFlow note definition
function transposeVexNote(noteDef, semitones) {
    if (semitones === 0) return noteDef;

    // Parse vex note: "c/4", "e/5", etc.
    const [noteName, octaveStr] = noteDef.vex.split('/');
    let octave = parseInt(octaveStr);

    // Get base semitone
    let semi = vexNoteToSemi[noteName.toLowerCase()];

    // Apply original accidental
    if (noteDef.acc === 'b') semi -= 1;
    else if (noteDef.acc === '#') semi += 1;
    else if (noteDef.acc === 'd') semi -= 0.5; // quarter-flat

    // Transpose
    semi += semitones;

    // Handle octave wrapping
    while (semi >= 12) { semi -= 12; octave++; }
    while (semi < 0) { semi += 12; octave--; }

    // Handle quarter-tones (only Eqf in our scale)
    const isQuarterFlat = semi % 1 === 0.5;
    const baseSemi = Math.floor(semi);

    const result = semiToVexNote[baseSemi];
    let newAcc = result.acc;

    // Quarter-flat handling
    if (isQuarterFlat) {
        newAcc = 'd'; // VexFlow quarter-flat
    }

    return {
        lily: noteDef.lily,
        vex: `${result.note}/${octave}`,
        acc: newAcc
    };
}

export function renderNotation(container, highlightNote, onNoteClick) {
    container.innerHTML = '';
    const width = container.clientWidth || 560;
    const isMobile = window.innerWidth <= 600;
    const isTablet = window.innerWidth > 600 && window.innerWidth <= 1024;

    // Responsive stave sizing
    let staveSpacing, notationHeight;
    if (isMobile) {
        staveSpacing = 115;
        notationHeight = 380;
    } else if (isTablet) {
        staveSpacing = 130;
        notationHeight = 420;
    } else {
        // Desktop - compact but with space for arrows
        staveSpacing = 130;
        notationHeight = 420;
    }

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(width, notationHeight);
    const context = renderer.getContext();
    const staveWidth = width - 20;
    const staveX = 10;

    const stave1 = new Stave(staveX, 15, staveWidth);
    stave1.addClef('treble').setContext(context).draw();

    const stave2 = new Stave(staveX, 15 + staveSpacing, staveWidth);
    stave2.addClef('treble').setContext(context).draw();

    const stave3 = new Stave(staveX, 15 + staveSpacing * 2, staveWidth);
    stave3.addClef('treble').setContext(context).draw();

    function createStaveNotes(noteDefs) {
        const transposition = getAudioTransposition();

        return noteDefs.map(n => {
            const transposed = transposeVexNote(n, transposition);
            const isHighlighted = n.lily === highlightNote;
            const note = new StaveNote({ keys: [transposed.vex], duration: 'w' });
            if (transposed.acc) {
                const accidental = new Accidental(transposed.acc);
                note.addModifier(accidental);
            }
            if (isHighlighted) {
                note.setStyle({ fillStyle: 'rgb(234, 51, 35)', strokeStyle: 'rgb(234, 51, 35)' });
            }
            return { note, lily: n.lily, isHighlighted };
        });
    }

    function drawNotes(stave, noteObjs) {
        const notes = noteObjs.map(n => n.note);
        const voice = new Voice({ num_beats: notes.length * 4, beat_value: 4 }).addTickables(notes);
        new Formatter().joinVoices([voice]).format([voice], stave.getWidth() - 20);
        voice.draw(context, stave);

        return noteObjs.map((n, i) => {
            const box = notes[i].getBoundingBox();
            const svg = container.querySelector('svg');
            const clickArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            clickArea.setAttribute('x', box.x);
            clickArea.setAttribute('y', box.y);
            clickArea.setAttribute('width', box.w);
            clickArea.setAttribute('height', box.h);
            clickArea.setAttribute('fill', 'transparent');
            clickArea.setAttribute('stroke', 'none');
            clickArea.setAttribute('cursor', 'pointer');
            clickArea.addEventListener('click', () => onNoteClick(n.lily));
            svg.appendChild(clickArea);
            return { lily: n.lily, x: box.x + box.w / 2, y: box.y + box.h / 2 };
        });
    }

    // Draw highest notes at top, lowest at bottom
    const pos3 = drawNotes(stave1, createStaveNotes(staff3Notes));
    const pos2 = drawNotes(stave2, createStaveNotes(staff2Notes));
    const pos1 = drawNotes(stave3, createStaveNotes(staff1Notes));

    // Add arrow markers
    const svg = container.querySelector('svg');
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="#333"/>
        </marker>
        <marker id="arrowhead-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="rgb(234, 51, 35)"/>
        </marker>
    `;
    svg.insertBefore(defs, svg.firstChild);

    drawArrows(svg, pos3, staff3Edges, highlightNote);
    drawArrows(svg, pos2, staff2Edges, highlightNote);
    drawArrows(svg, pos1, staff1Edges, highlightNote);
}

function drawArrows(svg, positions, edgeList, currentNote) {
    const originCounts = {}, destCounts = {}, originIndex = {}, destIndex = {};

    edgeList.forEach(edge => {
        const key = edge.from + (edge.below ? '_below' : '_above');
        originCounts[key] = (originCounts[key] || 0) + 1;
        const destKey = edge.to + (edge.below ? '_below' : '_above');
        destCounts[destKey] = (destCounts[destKey] || 0) + 1;
    });

    edgeList.forEach(edge => {
        const fromPos = positions.find(p => p.lily === edge.from);
        const toPos = positions.find(p => p.lily === edge.to);

        if (fromPos && toPos) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const originKey = edge.from + (edge.below ? '_below' : '_above');
            const destKey = edge.to + (edge.below ? '_below' : '_above');

            originIndex[originKey] = (originIndex[originKey] || 0) + 1;
            destIndex[destKey] = (destIndex[destKey] || 0) + 1;

            const originOff = (originIndex[originKey] - (originCounts[originKey] + 1) / 2) * 6;
            const destOff = (destIndex[destKey] - (destCounts[destKey] + 1) / 2) * 6;

            const startX = fromPos.x + originOff;
            const endX = toPos.x + destOff;
            const midX = (startX + endX) / 2;
            const curveHeight = Math.max(14, Math.abs(endX - startX) * 0.15);
            const below = edge.below || false;
            const yOffset = below ? 20 : -20;
            const curveDir = below ? 1 : -1;
            const startY = fromPos.y + yOffset;
            const endY = toPos.y + yOffset;
            const curveY = (startY + endY) / 2 + (curveHeight * curveDir);

            path.setAttribute('d', `M ${startX} ${startY} Q ${midX} ${curveY} ${endX} ${endY}`);
            path.setAttribute('fill', 'none');

            const isFromCurrent = edge.from === currentNote;
            path.setAttribute('stroke', isFromCurrent ? 'rgb(234, 51, 35)' : '#333');
            path.setAttribute('stroke-width', isFromCurrent ? '2' : '1.5');
            path.setAttribute('marker-end', isFromCurrent ? 'url(#arrowhead-red)' : 'url(#arrowhead)');

            svg.appendChild(path);
        }
    });
}

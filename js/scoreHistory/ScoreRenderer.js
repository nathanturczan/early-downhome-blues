// VexFlow Score Renderer
// Renders melody history as stemless quarter notes with phrase span indicators

const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = Vex.Flow;

// Constants
const NOTE_CELL_WIDTH = 50;
const STAVE_HEIGHT = 80;
const LEFT_MARGIN = 60;
const RIGHT_MARGIN = 20;
const TOP_MARGIN = 50;
const PHRASE_SPAN_HEIGHT = 28;
const PHRASE_SPAN_Y_OFFSET = 8;  // Distance from top

// Map lily notation to VexFlow format
const lilyToVex = {
    "c'": { key: "c/4", acc: null },
    "d'": { key: "d/4", acc: null },
    "ees'": { key: "e/4", acc: "b" },
    "eeh'": { key: "e/4", acc: "db" },  // quarter-flat (half-flat)
    "e'": { key: "e/4", acc: null },
    "f'": { key: "f/4", acc: null },
    "ges'": { key: "g/4", acc: "b" },
    "g'": { key: "g/4", acc: null },
    "a'": { key: "a/4", acc: null },
    "bes'": { key: "b/4", acc: "b" },
    "b'": { key: "b/4", acc: null },
    "c''": { key: "c/5", acc: null },
    "d''": { key: "d/5", acc: null },
    "ees''": { key: "e/5", acc: "b" },
    "eeh''": { key: "e/5", acc: "db" },  // quarter-flat
    "e''": { key: "e/5", acc: null }
};

// Phrase labels
const phraseLabels = ['a', 'b', 'c', 'd', 'e', 'f'];

// Colors for phrase spans (matching the app's color scheme)
const PHRASE_SPAN_BG = 'rgba(67, 116, 96, 0.15)';
const PHRASE_SPAN_BORDER = 'rgba(67, 116, 96, 0.6)';
const PHRASE_LABEL_COLOR = 'rgba(67, 116, 96, 0.9)';

/**
 * Render score to a container element
 * @param {HTMLElement} container - Container element for the score
 * @param {Array} historyData - Array of {note, position: {phraseIndex, stepInPhrase}, stanza} objects
 */
export function renderScore(container, historyData) {
    // Clear existing content
    container.innerHTML = '';

    if (!historyData || historyData.length === 0) {
        container.innerHTML = '<p class="score-empty">No notes recorded yet.</p>';
        return;
    }

    // Calculate dimensions
    const containerWidth = container.clientWidth || 800;
    const availableWidth = containerWidth - LEFT_MARGIN - RIGHT_MARGIN;
    const notesPerLine = Math.max(1, Math.floor(availableWidth / NOTE_CELL_WIDTH));
    const numLines = Math.ceil(historyData.length / notesPerLine);
    const lineHeight = STAVE_HEIGHT + PHRASE_SPAN_HEIGHT + 20;
    const totalHeight = numLines * lineHeight + TOP_MARGIN + 20;

    // Create renderer
    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(containerWidth, totalHeight);
    const context = renderer.getContext();

    // Process each line
    let noteIndex = 0;
    for (let lineNum = 0; lineNum < numLines; lineNum++) {
        const lineStartIndex = noteIndex;
        const notesOnLine = historyData.slice(noteIndex, noteIndex + notesPerLine);
        if (notesOnLine.length === 0) break;

        const yPos = TOP_MARGIN + lineNum * lineHeight;
        const staveY = yPos + PHRASE_SPAN_HEIGHT;
        const staveWidth = notesOnLine.length * NOTE_CELL_WIDTH;

        // Track phrase spans for this line
        const phraseSpans = [];
        let currentSpan = null;

        // First pass: calculate phrase spans
        notesOnLine.forEach((entry, localIndex) => {
            const xPos = LEFT_MARGIN + localIndex * NOTE_CELL_WIDTH;
            const phraseIndex = entry.position?.phraseIndex ?? null;
            const stanza = entry.stanza ?? null;

            // Create unique key for phrase (stanza + phraseIndex)
            const phraseKey = phraseIndex !== null ? `${stanza}-${phraseIndex}` : null;
            const currentKey = currentSpan ? `${currentSpan.stanza}-${currentSpan.phraseIndex}` : null;

            if (!currentSpan || phraseKey !== currentKey) {
                // End current span
                if (currentSpan) {
                    currentSpan.endX = xPos;
                    phraseSpans.push(currentSpan);
                }
                // Start new span
                currentSpan = {
                    phraseIndex,
                    stanza,
                    label: phraseIndex !== null ? phraseLabels[phraseIndex] : null,
                    startX: xPos,
                    endX: xPos + NOTE_CELL_WIDTH
                };
            } else {
                // Extend current span
                currentSpan.endX = xPos + NOTE_CELL_WIDTH;
            }
        });

        // Push final span
        if (currentSpan) {
            phraseSpans.push(currentSpan);
        }

        // Create stave
        const stave = new Stave(LEFT_MARGIN, staveY, staveWidth);
        if (lineNum === 0) {
            stave.addClef('treble');
        }
        stave.setContext(context).draw();

        // Create notes
        const staveNotes = notesOnLine.map(entry => {
            const mapping = lilyToVex[entry.note];
            if (!mapping) {
                console.warn(`Unknown note: ${entry.note}`);
                return new StaveNote({ keys: ['c/4'], duration: 'q' });
            }

            const note = new StaveNote({
                keys: [mapping.key],
                duration: 'q'
            });

            // Add accidental if needed
            if (mapping.acc) {
                note.addModifier(new Accidental(mapping.acc), 0);
            }

            // Hide stem
            note.setStemStyle({ strokeStyle: 'transparent' });

            return note;
        });

        // Create voice and format
        const voice = new Voice({
            num_beats: notesOnLine.length,
            beat_value: 4
        });
        voice.addTickables(staveNotes);
        new Formatter().joinVoices([voice]).format([voice], staveWidth - 60);
        voice.draw(context, stave);

        // Draw phrase spans above the staff (directly on SVG)
        const svg = container.querySelector('svg');
        if (svg) {
            const NS = 'http://www.w3.org/2000/svg';

            phraseSpans.forEach(span => {
                if (span.label === null) return;  // Skip ungrouped notes

                const spanWidth = span.endX - span.startX;
                const spanY = yPos + PHRASE_SPAN_Y_OFFSET;

                // Create group for span elements
                const group = document.createElementNS(NS, 'g');
                group.setAttribute('class', 'phrase-span');

                // Background rectangle
                const rect = document.createElementNS(NS, 'rect');
                rect.setAttribute('x', span.startX);
                rect.setAttribute('y', spanY);
                rect.setAttribute('width', spanWidth);
                rect.setAttribute('height', PHRASE_SPAN_HEIGHT - 4);
                rect.setAttribute('rx', 4);
                rect.setAttribute('fill', PHRASE_SPAN_BG);
                rect.setAttribute('stroke', PHRASE_SPAN_BORDER);
                rect.setAttribute('stroke-width', '1');
                group.appendChild(rect);

                // Label text (centered in span)
                const text = document.createElementNS(NS, 'text');
                text.setAttribute('x', span.startX + spanWidth / 2);
                text.setAttribute('y', spanY + PHRASE_SPAN_HEIGHT / 2 + 2);
                text.setAttribute('fill', PHRASE_LABEL_COLOR);
                text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
                text.setAttribute('font-size', '13');
                text.setAttribute('font-weight', '600');
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'middle');
                text.textContent = span.label;
                group.appendChild(text);

                svg.appendChild(group);
            });
        }

        noteIndex += notesOnLine.length;
    }
}

/**
 * Get the SVG element from the rendered score
 * @param {HTMLElement} container - Container with rendered score
 * @returns {SVGElement|null}
 */
export function getSvgElement(container) {
    return container.querySelector('svg');
}

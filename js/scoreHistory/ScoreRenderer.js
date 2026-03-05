// VexFlow Score Renderer
// Renders melody history as stemless quarter notes with phrase span indicators

const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, BarNote } = Vex.Flow;

// Constants
const MIN_NOTE_CELL_WIDTH = 30;  // Minimum width per note
const MAX_NOTE_CELL_WIDTH = 50;  // Maximum/preferred width per note
const STAVE_HEIGHT = 80;
const LEFT_MARGIN = 60;
const RIGHT_MARGIN = 20;
const CONTAINER_PADDING = 20;    // Account for CSS padding (10px each side)
const TOP_MARGIN = 50;
const PHRASE_SPAN_HEIGHT = 28;
const PHRASE_SPAN_Y_OFFSET = 8;  // Distance from top
const MAX_NOTES_PER_LINE = 20;   // Maximum notes before forcing a line break

// Map lily notation to VexFlow format
// E, G, and B natural notes get explicit natural accidentals
// Quarter-flat uses "d" (half-flat) to match main notation
const lilyToVex = {
    "c'": { key: "c/4", acc: null },
    "d'": { key: "d/4", acc: null },
    "ees'": { key: "e/4", acc: "b" },
    "eeh'": { key: "e/4", acc: "d" },   // quarter-flat (half-flat) - matches network.js
    "e'": { key: "e/4", acc: "n" },     // E natural - explicit
    "f'": { key: "f/4", acc: null },
    "ges'": { key: "g/4", acc: "b" },
    "g'": { key: "g/4", acc: "n" },     // G natural - explicit
    "a'": { key: "a/4", acc: null },
    "bes'": { key: "b/4", acc: "b" },
    "b'": { key: "b/4", acc: "n" },     // B natural - explicit
    "c''": { key: "c/5", acc: null },
    "d''": { key: "d/5", acc: null },
    "ees''": { key: "e/5", acc: "b" },
    "eeh''": { key: "e/5", acc: "d" },  // quarter-flat (half-flat) - matches network.js
    "e''": { key: "e/5", acc: "n" }     // E natural - explicit
};

// Phrase labels
const phraseLabels = ['a', 'b', 'c', 'd', 'e', 'f'];

// Colors for phrase spans (matching the app's color scheme)
const PHRASE_SPAN_BG = 'rgba(67, 116, 96, 0.15)';
const PHRASE_SPAN_BORDER = 'rgba(67, 116, 96, 0.6)';
const PHRASE_LABEL_COLOR = 'rgba(67, 116, 96, 0.9)';

// Colors for chord spans (warmer tone to differentiate from phrase spans)
const CHORD_SPAN_BG = 'rgba(145, 100, 60, 0.15)';
const CHORD_SPAN_BORDER = 'rgba(145, 100, 60, 0.6)';
const CHORD_LABEL_COLOR = 'rgba(145, 100, 60, 0.9)';

/**
 * Render score to a container element
 * @param {HTMLElement} container - Container element for the score
 * @param {Array} historyData - Array of {note, position: {phraseIndex, stepInPhrase}, stanza, chord} objects
 * @param {Object} options - Render options
 * @param {boolean} options.showPhrases - If true, show phrase spans; if false, show chord spans
 */
export function renderScore(container, historyData, options = {}) {
    const { showPhrases = true } = options;
    // Clear existing content
    container.innerHTML = '';

    if (!historyData || historyData.length === 0) {
        container.innerHTML = '<p class="score-empty">No notes recorded yet.</p>';
        return;
    }

    // Split notes into lines
    // When showing phrases: break after phrases b(1), d(3), f(5)
    // When showing chords (phrasing off): break at MAX_NOTES_PER_LINE
    const lines = [];
    let currentLine = [];

    historyData.forEach((entry, i) => {
        currentLine.push(entry);

        const nextEntry = historyData[i + 1];
        let shouldBreak = false;

        if (showPhrases) {
            // Phrase mode: break after phrases b(1), d(3), f(5)
            const currentPhrase = entry.position?.phraseIndex ?? null;
            const nextPhrase = nextEntry?.position?.phraseIndex ?? null;

            if (currentPhrase !== null && nextPhrase !== null &&
                (currentPhrase === 1 || currentPhrase === 3 || currentPhrase === 5) &&
                currentPhrase !== nextPhrase) {
                shouldBreak = true;
            }
        } else {
            // Chord mode (phrasing off): break at max notes per line
            if (currentLine.length >= MAX_NOTES_PER_LINE) {
                shouldBreak = true;
            }
        }

        if (shouldBreak && nextEntry) {
            lines.push(currentLine);
            currentLine = [];
        }
    });

    // Push remaining notes
    if (currentLine.length > 0) {
        lines.push(currentLine);
    }

    // Calculate dimensions - use available width minus padding
    const containerWidth = container.clientWidth || 800;
    const drawingWidth = containerWidth - CONTAINER_PADDING;  // Leave room for CSS padding
    const lineHeight = STAVE_HEIGHT + PHRASE_SPAN_HEIGHT + 20;
    const totalHeight = lines.length * lineHeight + TOP_MARGIN + 20;

    // Create renderer
    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(drawingWidth, totalHeight);
    const context = renderer.getContext();

    // Process each line
    lines.forEach((notesOnLine, lineNum) => {
        if (notesOnLine.length === 0) return;

        const yPos = TOP_MARGIN + lineNum * lineHeight;
        const staveY = yPos + PHRASE_SPAN_HEIGHT;

        // Calculate note width to fit within container (account for margins and padding)
        const availableWidth = containerWidth - LEFT_MARGIN - RIGHT_MARGIN - CONTAINER_PADDING;
        const noteCellWidth = Math.max(
            MIN_NOTE_CELL_WIDTH,
            Math.min(MAX_NOTE_CELL_WIDTH, availableWidth / notesOnLine.length)
        );
        const staveWidth = Math.min(notesOnLine.length * noteCellWidth, availableWidth);

        // Track spans for this line (phrase or chord based on showPhrases option)
        const spans = [];
        let currentSpan = null;

        // First pass: calculate spans
        notesOnLine.forEach((entry, localIndex) => {
            const xPos = LEFT_MARGIN + localIndex * noteCellWidth;

            let spanKey, spanLabel;
            if (showPhrases) {
                // Phrase mode: group by stanza + phraseIndex
                const phraseIndex = entry.position?.phraseIndex ?? null;
                const stanza = entry.stanza ?? null;
                spanKey = phraseIndex !== null ? `${stanza}-${phraseIndex}` : null;
                spanLabel = phraseIndex !== null ? phraseLabels[phraseIndex] : null;
            } else {
                // Chord mode: group by chord
                const chord = entry.chord ?? null;
                spanKey = chord;
                spanLabel = chord;  // e.g., 'I', 'IV', 'V'
            }

            const currentKey = currentSpan?.key ?? null;

            if (!currentSpan || spanKey !== currentKey) {
                // End current span
                if (currentSpan) {
                    currentSpan.endX = xPos;
                    spans.push(currentSpan);
                }
                // Start new span
                currentSpan = {
                    key: spanKey,
                    label: spanLabel,
                    startX: xPos,
                    endX: xPos + noteCellWidth
                };
            } else {
                // Extend current span
                currentSpan.endX = xPos + noteCellWidth;
            }
        });

        // Push final span
        if (currentSpan) {
            spans.push(currentSpan);
        }

        // Create stave with treble clef on every line
        const stave = new Stave(LEFT_MARGIN, staveY, staveWidth);
        stave.addClef('treble');
        stave.setContext(context).draw();

        // Create notes with bar lines at phrase boundaries
        const tickables = [];
        let totalBeats = 0;

        notesOnLine.forEach((entry, localIndex) => {
            const mapping = lilyToVex[entry.note];
            if (!mapping) {
                console.warn(`Unknown note: ${entry.note}`);
                tickables.push(new StaveNote({ keys: ['c/4'], duration: 'q' }));
                totalBeats += 1;
                return;
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

            tickables.push(note);
            totalBeats += 1;

            // Check if this is the end of a span (phrase or chord boundary)
            const nextEntry = notesOnLine[localIndex + 1];
            if (nextEntry) {
                let shouldInsertBarLine = false;

                if (showPhrases) {
                    // Bar line at phrase boundaries
                    const currentPhrase = entry.position?.phraseIndex ?? null;
                    const currentStanza = entry.stanza ?? null;
                    const nextPhrase = nextEntry.position?.phraseIndex ?? null;
                    const nextStanza = nextEntry.stanza ?? null;
                    shouldInsertBarLine = currentPhrase !== null && (currentPhrase !== nextPhrase || currentStanza !== nextStanza);
                } else {
                    // Bar line at chord boundaries
                    const currentChord = entry.chord ?? null;
                    const nextChord = nextEntry.chord ?? null;
                    shouldInsertBarLine = currentChord !== null && currentChord !== nextChord;
                }

                if (shouldInsertBarLine) {
                    tickables.push(new BarNote());
                }
            }
        });

        // Create voice and format
        const voice = new Voice({
            num_beats: totalBeats,
            beat_value: 4
        });
        voice.setStrict(false);  // Allow bar notes without affecting beat count
        voice.addTickables(tickables);
        new Formatter().joinVoices([voice]).format([voice], staveWidth - 60);
        voice.draw(context, stave);

        // Draw spans above the staff (phrase or chord based on mode)
        const svg = container.querySelector('svg');
        if (svg) {
            const NS = 'http://www.w3.org/2000/svg';

            // Select colors based on mode
            const spanBg = showPhrases ? PHRASE_SPAN_BG : CHORD_SPAN_BG;
            const spanBorder = showPhrases ? PHRASE_SPAN_BORDER : CHORD_SPAN_BORDER;
            const labelColor = showPhrases ? PHRASE_LABEL_COLOR : CHORD_LABEL_COLOR;

            spans.forEach((span, spanIndex) => {
                if (span.label === null) return;  // Skip ungrouped notes

                const spanWidth = span.endX - span.startX;
                const spanY = yPos + PHRASE_SPAN_Y_OFFSET;

                // Create group for span elements
                const group = document.createElementNS(NS, 'g');
                group.setAttribute('class', showPhrases ? 'phrase-span' : 'chord-span');

                // Background rectangle
                const rect = document.createElementNS(NS, 'rect');
                rect.setAttribute('x', span.startX);
                rect.setAttribute('y', spanY);
                rect.setAttribute('width', spanWidth);
                rect.setAttribute('height', PHRASE_SPAN_HEIGHT - 4);
                rect.setAttribute('rx', 4);
                rect.setAttribute('fill', spanBg);
                rect.setAttribute('stroke', spanBorder);
                rect.setAttribute('stroke-width', '1');
                group.appendChild(rect);

                // Label text (centered in span)
                const text = document.createElementNS(NS, 'text');
                text.setAttribute('x', span.startX + spanWidth / 2);
                text.setAttribute('y', spanY + PHRASE_SPAN_HEIGHT / 2 + 2);
                text.setAttribute('fill', labelColor);
                text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
                text.setAttribute('font-size', '13');
                text.setAttribute('font-weight', '600');
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'middle');
                // Format label based on mode and width
                let fullLabel;
                if (showPhrases) {
                    fullLabel = spanWidth >= 120 ? `Phrase ${span.label}` : span.label;
                } else {
                    // Chord mode: show chord numeral (I, IV, V, etc.)
                    fullLabel = span.label;
                }
                text.textContent = fullLabel;
                group.appendChild(text);

                svg.appendChild(group);
            });
        }
    });

    // Auto-scroll to show latest notes (scroll to bottom)
    container.scrollTop = container.scrollHeight;
}

/**
 * Get the SVG element from the rendered score
 * @param {HTMLElement} container - Container with rendered score
 * @returns {SVGElement|null}
 */
export function getSvgElement(container) {
    return container.querySelector('svg');
}

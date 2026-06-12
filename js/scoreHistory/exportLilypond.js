// LilyPond Export
// Exports melody history to LilyPond notation format

const phraseLabels = ['a', 'b', 'c', 'd', 'e', 'f'];

/**
 * Group history notes by phrase for export
 * Each phrase group includes notes, label, stanza, and chord info
 * @param {Array} historyData - Array of {note, position, stanza, chord}
 * @returns {Array} Array of phrase groups with chord information
 */
function groupByPhrase(historyData) {
    const phrases = [];
    let currentPhrase = null;

    historyData.forEach(entry => {
        const phraseIndex = entry.position?.phraseIndex ?? null;
        const stanza = entry.stanza ?? 1;
        const chord = entry.chord ?? null;

        if (phraseIndex !== null) {
            if (currentPhrase === null ||
                currentPhrase.phraseIndex !== phraseIndex ||
                currentPhrase.stanza !== stanza) {
                // Start a new phrase
                if (currentPhrase) phrases.push(currentPhrase);
                currentPhrase = {
                    phraseIndex,
                    stanza,
                    label: phraseLabels[phraseIndex] || `${phraseIndex}`,
                    chord,
                    notes: [entry.note]
                };
            } else {
                currentPhrase.notes.push(entry.note);
            }
        } else {
            // Notes without phrase info go into their own ungrouped section
            // Don't dump them into the previous phrase
            if (currentPhrase) {
                phrases.push(currentPhrase);
                currentPhrase = null;
            }
            phrases.push({ phraseIndex: null, stanza: null, label: null, chord, notes: [entry.note] });
        }
    });

    if (currentPhrase) phrases.push(currentPhrase);
    return phrases;
}

/**
 * Export history data to LilyPond format
 * @param {Array} historyData - Array of {note, position, stanza, chord}
 * @returns {string} LilyPond source code
 */
export function exportToLilypond(historyData) {
    if (!historyData || historyData.length === 0) {
        return '';
    }

    const phrases = groupByPhrase(historyData);

    const header = `\\version "2.24.0"
\\language "english"

\\header {
  title = "Early Downhome Blues"
  subtitle = "Melody History"
}

\\score {
  \\new Staff {
    \\clef treble
    \\override Stem.transparent = ##t
    \\override Flag.transparent = ##t
`;

    // Build notes with phrase markers, chord names, and barlines
    let notesContent = '';
    let currentStanza = null;

    phrases.forEach((phrase, i) => {
        // Add stanza marker if changed
        if (phrase.stanza !== null && phrase.stanza !== currentStanza) {
            notesContent += `\n    % Stanza ${phrase.stanza}\n`;
            currentStanza = phrase.stanza;
        }

        // Add phrase label and chord as markup above staff
        if (phrase.label || phrase.chord) {
            const labelPart = phrase.label ? `phrase ${phrase.label}` : '';
            const chordPart = phrase.chord ? `(${phrase.chord})` : '';
            const markText = [labelPart, chordPart].filter(Boolean).join(' ');
            notesContent += `    \\mark \\markup { \\small "${markText}" }\n`;
        }

        // Add notes (they're already in LilyPond format)
        // Add duration (quarter note = 4)
        notesContent += '    ';
        const notes = phrase.notes.map(note => note + '4').join(' ');
        notesContent += notes;

        // Add barline at end of phrase (except for last phrase)
        if (i < phrases.length - 1) {
            notesContent += ' \\bar "|"';
        }
        notesContent += '\n';
    });

    // Add final barline
    notesContent += '    \\bar "|."\n';

    const footer = `  }
  \\layout { }
}
`;

    return header + notesContent + footer;
}

/**
 * Download LilyPond file
 * @param {Array} historyData - Array of {note, position, stanza}
 * @param {string} filename - Output filename
 */
export function downloadLilypond(historyData, filename = 'blues-melody.ly') {
    const content = exportToLilypond(historyData);
    if (!content) return;

    const blob = new Blob([content], { type: 'text/x-lilypond' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

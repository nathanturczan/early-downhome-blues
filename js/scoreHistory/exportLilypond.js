// LilyPond Export
// Exports melody history to LilyPond notation format

const phraseLabels = ['a', 'b', 'c', 'd', 'e', 'f'];

/**
 * Group history notes by phrase for export
 * @param {Array} historyData - Array of {note, position, stanza}
 * @returns {Array} Array of phrase groups
 */
function groupByPhrase(historyData) {
    const phrases = [];
    let currentPhrase = null;

    historyData.forEach(entry => {
        const phraseIndex = entry.position?.phraseIndex ?? null;
        const stanza = entry.stanza ?? 1;

        if (phraseIndex !== null) {
            if (currentPhrase === null ||
                currentPhrase.phraseIndex !== phraseIndex ||
                currentPhrase.stanza !== stanza) {
                if (currentPhrase) phrases.push(currentPhrase);
                currentPhrase = {
                    phraseIndex,
                    stanza,
                    label: phraseLabels[phraseIndex] || `${phraseIndex}`,
                    notes: [entry.note]
                };
            } else {
                currentPhrase.notes.push(entry.note);
            }
        } else {
            if (currentPhrase) {
                currentPhrase.notes.push(entry.note);
            } else {
                phrases.push({ phraseIndex: null, stanza: null, label: null, notes: [entry.note] });
            }
        }
    });

    if (currentPhrase) phrases.push(currentPhrase);
    return phrases;
}

/**
 * Export history data to LilyPond format
 * @param {Array} historyData - Array of {note, position, stanza}
 * @returns {string} LilyPond source code
 */
export function exportToLilypond(historyData) {
    if (!historyData || historyData.length === 0) {
        return '';
    }

    const phrases = groupByPhrase(historyData);

    const header = `\\version "2.24.0"

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

    // Build notes with phrase markers as comments
    let notesContent = '';
    let currentStanza = null;

    phrases.forEach((phrase, i) => {
        // Add stanza marker if changed
        if (phrase.stanza !== null && phrase.stanza !== currentStanza) {
            notesContent += `\n    % Stanza ${phrase.stanza}\n`;
            currentStanza = phrase.stanza;
        }

        // Add phrase label as comment
        if (phrase.label) {
            notesContent += `    % phrase ${phrase.label}\n    `;
        } else {
            notesContent += '    ';
        }

        // Convert notes to LilyPond (they're already in LilyPond format!)
        // Just add duration (quarter note = 4)
        const notes = phrase.notes.map(note => note + '4').join(' ');
        notesContent += notes + '\n';
    });

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

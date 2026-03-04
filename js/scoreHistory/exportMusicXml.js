// MusicXML Export
// Exports melody history to MusicXML format

const phraseLabels = ['a', 'b', 'c', 'd', 'e', 'f'];

// Map lily notation to MusicXML pitch data
const lilyToMusicXml = {
    "c'": { step: 'C', octave: 4, alter: 0 },
    "d'": { step: 'D', octave: 4, alter: 0 },
    "ees'": { step: 'E', octave: 4, alter: -1 },
    "eeh'": { step: 'E', octave: 4, alter: -0.5 },  // quarter-flat
    "e'": { step: 'E', octave: 4, alter: 0 },
    "f'": { step: 'F', octave: 4, alter: 0 },
    "ges'": { step: 'G', octave: 4, alter: -1 },
    "g'": { step: 'G', octave: 4, alter: 0 },
    "a'": { step: 'A', octave: 4, alter: 0 },
    "bes'": { step: 'B', octave: 4, alter: -1 },
    "b'": { step: 'B', octave: 4, alter: 0 },
    "c''": { step: 'C', octave: 5, alter: 0 },
    "d''": { step: 'D', octave: 5, alter: 0 },
    "ees''": { step: 'E', octave: 5, alter: -1 },
    "eeh''": { step: 'E', octave: 5, alter: -0.5 },  // quarter-flat
    "e''": { step: 'E', octave: 5, alter: 0 }
};

// Map alter values to accidental names
function alterToAccidental(alter) {
    if (alter === -1) return 'flat';
    if (alter === -0.5) return 'quarter-flat';
    if (alter === 1) return 'sharp';
    if (alter === 0.5) return 'quarter-sharp';
    return null;
}

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
 * Create a MusicXML note element
 * @param {string} lilyNote - Note in lily notation
 * @param {number} measurePosition - Position within measure (for voice/staff)
 * @returns {string} MusicXML note element
 */
function createNoteElement(lilyNote, measurePosition) {
    const mapping = lilyToMusicXml[lilyNote];
    if (!mapping) {
        console.warn(`Unknown note for MusicXML: ${lilyNote}`);
        return '';
    }

    let noteXml = '        <note>\n';
    noteXml += '          <pitch>\n';
    noteXml += `            <step>${mapping.step}</step>\n`;

    if (mapping.alter !== 0) {
        noteXml += `            <alter>${mapping.alter}</alter>\n`;
    }

    noteXml += `            <octave>${mapping.octave}</octave>\n`;
    noteXml += '          </pitch>\n';
    noteXml += '          <duration>1</duration>\n';
    noteXml += '          <type>quarter</type>\n';

    // Add stem direction (down) and make it invisible via notations
    noteXml += '          <stem>none</stem>\n';

    // Add accidental if present
    const accidental = alterToAccidental(mapping.alter);
    if (accidental) {
        noteXml += `          <accidental>${accidental}</accidental>\n`;
    }

    noteXml += '        </note>\n';
    return noteXml;
}

/**
 * Export history data to MusicXML format
 * Each phrase becomes its own measure with appropriate time signature
 * @param {Array} historyData - Array of {note, position, stanza}
 * @returns {string} MusicXML source code
 */
export function exportToMusicXml(historyData) {
    if (!historyData || historyData.length === 0) {
        return '';
    }

    const phrases = groupByPhrase(historyData);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>Early Downhome Blues - Melody</work-title>
  </work>
  <identification>
    <creator type="composer">Generated from Titon Network</creator>
    <encoding>
      <software>Early Downhome Blues App</software>
      <encoding-date>${new Date().toISOString().split('T')[0]}</encoding-date>
    </encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Melody</part-name>
    </score-part>
  </part-list>
  <part id="P1">
`;

    // Generate one measure per phrase
    let measureNum = 0;
    let lastBeats = null;

    phrases.forEach((phrase, phraseIdx) => {
        if (phrase.notes.length === 0) return;

        measureNum++;
        const beats = phrase.notes.length;

        xml += `    <measure number="${measureNum}">\n`;

        // Add attributes when time signature changes or on first measure
        if (measureNum === 1 || beats !== lastBeats) {
            xml += `      <attributes>\n`;
            if (measureNum === 1) {
                xml += `        <divisions>1</divisions>\n`;
                xml += `        <key>\n`;
                xml += `          <fifths>0</fifths>\n`;
                xml += `        </key>\n`;
                xml += `        <clef>\n`;
                xml += `          <sign>G</sign>\n`;
                xml += `          <line>2</line>\n`;
                xml += `        </clef>\n`;
            }
            xml += `        <time>\n`;
            xml += `          <beats>${beats}</beats>\n`;
            xml += `          <beat-type>4</beat-type>\n`;
            xml += `        </time>\n`;
            xml += `      </attributes>\n`;
            lastBeats = beats;
        }

        // Add phrase label as rehearsal mark
        if (phrase.label) {
            xml += `      <direction placement="above">\n`;
            xml += `        <direction-type>\n`;
            xml += `          <rehearsal>${phrase.label}</rehearsal>\n`;
            xml += `        </direction-type>\n`;
            xml += `      </direction>\n`;
        }

        // Add notes for this phrase
        phrase.notes.forEach((note, i) => {
            xml += createNoteElement(note, i);
        });

        xml += `    </measure>\n`;
    });

    xml += `  </part>
</score-partwise>
`;

    return xml;
}

/**
 * Download MusicXML file
 * @param {Array} historyData - Array of {note, position, stanza}
 * @param {string} filename - Output filename
 */
export function downloadMusicXml(historyData, filename = 'blues-melody.xml') {
    const content = exportToMusicXml(historyData);
    if (!content) return;

    const blob = new Blob([content], { type: 'application/vnd.recordare.musicxml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

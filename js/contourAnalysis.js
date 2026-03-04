// js/contourAnalysis.js
//
// Multi-level melodic contour analysis based on Titon's Figure 69
// Implements 15 contour types from Kagan's scheme:
//   - Falling (I): IA, IB, IC, IDa, IDb
//   - Rising (II): IIA, IIB, IIC, IIDa, IIDb
//   - Level (III): IIIA, IIIB, IIIC, IIIDa, IIIDb

import { frequencies } from './network.js';

/**
 * Convert LilyPond note name to MIDI-like pitch value
 * Uses the frequencies map to determine relative pitch ordering
 * @param {string} note - LilyPond note name (e.g., "g'", "c''")
 * @returns {number} Pitch value (higher = higher pitch)
 */
export function noteToMidi(note) {
    const freq = frequencies[note];
    if (!freq) return 0;
    // Convert frequency to MIDI-like value (12 * log2(freq/440) + 69)
    return 12 * Math.log2(freq / 440) + 69;
}

/**
 * Extract S/H/L/F (Start/Highest/Lowest/Final) pitches and their indices
 * from a sequence of notes
 * @param {string[]} notes - Array of LilyPond note names
 * @returns {Object} { S, H, L, F, sIdx, hIdx, lIdx, fIdx, pitches }
 */
export function extractSHLF(notes) {
    if (!notes || notes.length === 0) {
        return null;
    }

    const pitches = notes.map(noteToMidi);

    let hIdx = 0;
    let lIdx = 0;
    let maxPitch = pitches[0];
    let minPitch = pitches[0];

    for (let i = 1; i < pitches.length; i++) {
        if (pitches[i] > maxPitch) {
            maxPitch = pitches[i];
            hIdx = i;
        }
        if (pitches[i] < minPitch) {
            minPitch = pitches[i];
            lIdx = i;
        }
    }

    return {
        S: pitches[0],                      // Starting pitch
        H: maxPitch,                        // Highest pitch
        L: minPitch,                        // Lowest pitch
        F: pitches[pitches.length - 1],    // Final pitch
        sIdx: 0,                            // Start index (always 0)
        hIdx: hIdx,                         // Index of highest pitch
        lIdx: lIdx,                         // Index of lowest pitch
        fIdx: pitches.length - 1,          // Final index
        pitches: pitches                    // All pitch values
    };
}

/**
 * Classify a contour into one of 15 types based on S/H/L/F relationships
 * Based on Titon's scheme (Figures 65-67)
 * @param {Object} shlf - S/H/L/F data from extractSHLF
 * @returns {Object} { type, generalCase, description }
 */
export function classifyContour(shlf) {
    if (!shlf) {
        return { type: null, generalCase: null, description: 'No data' };
    }

    const { S, H, L, F, hIdx, lIdx } = shlf;

    // Use a small epsilon for floating point comparison
    const eps = 0.01;
    const eq = (a, b) => Math.abs(a - b) < eps;
    const gt = (a, b) => a - b > eps;
    const lt = (a, b) => b - a > eps;

    // Determine general case based on S vs F relationship
    if (gt(S, F)) {
        // General Case I: Falling (S > F)
        if (eq(S, H) && eq(F, L)) {
            return { type: 'IA', generalCase: 'I', description: 'Pure descent: S=H, falls to F=L' };
        }
        if (eq(F, L) && gt(H, S)) {
            return { type: 'IB', generalCase: 'I', description: 'Rise then fall: rises to H, falls to F=L' };
        }
        if (eq(S, H) && gt(F, L)) {
            return { type: 'IC', generalCase: 'I', description: 'Fall with dip: S=H, dips below F' };
        }
        if (gt(H, S) && gt(F, L)) {
            // IDa vs IDb: depends on whether H is achieved before or after L
            if (hIdx < lIdx) {
                return { type: 'IDa', generalCase: 'I', description: 'Rise-dip-rise: H before L' };
            } else {
                return { type: 'IDb', generalCase: 'I', description: 'Dip-rise-fall: L before H' };
            }
        }
        // Fallback for falling
        return { type: 'I', generalCase: 'I', description: 'Falling contour' };
    }

    if (lt(S, F)) {
        // General Case II: Rising (S < F)
        if (eq(S, L) && eq(F, H)) {
            return { type: 'IIA', generalCase: 'II', description: 'Pure ascent: S=L, rises to F=H' };
        }
        if (eq(S, L) && gt(H, F)) {
            return { type: 'IIB', generalCase: 'II', description: 'Rise-fall: S=L, peaks at H, falls to F' };
        }
        if (gt(S, L) && eq(F, H)) {
            return { type: 'IIC', generalCase: 'II', description: 'Dip then rise: dips below S, rises to F=H' };
        }
        if (gt(S, L) && gt(H, F)) {
            // IIDa vs IIDb: depends on whether H is achieved before or after L
            if (hIdx < lIdx) {
                return { type: 'IIDa', generalCase: 'II', description: 'Peak-dip-rise: H before L' };
            } else {
                return { type: 'IIDb', generalCase: 'II', description: 'Dip-peak-settle: L before H' };
            }
        }
        // Fallback for rising
        return { type: 'II', generalCase: 'II', description: 'Rising contour' };
    }

    // General Case III: Level (S = F)
    if (eq(S, H) && eq(S, L)) {
        return { type: 'IIIA', generalCase: 'III', description: 'Flat: S=H=L=F (monotone)' };
    }
    if (lt(S, H) && eq(S, L)) {
        return { type: 'IIIB', generalCase: 'III', description: 'Arch: rises to H, returns to S=L=F' };
    }
    if (eq(S, H) && gt(S, L)) {
        return { type: 'IIIC', generalCase: 'III', description: 'Trough: dips to L, returns to S=H=F' };
    }
    if (lt(S, H) && gt(S, L)) {
        // IIIDa vs IIIDb: depends on whether H is achieved before or after L
        if (hIdx < lIdx) {
            return { type: 'IIIDa', generalCase: 'III', description: 'Peak-trough: H before L' };
        } else {
            return { type: 'IIIDb', generalCase: 'III', description: 'Trough-peak: L before H' };
        }
    }

    // Fallback for level
    return { type: 'III', generalCase: 'III', description: 'Level contour' };
}

/**
 * Analyze a phrase and return complete contour data
 * @param {string[]} notes - Array of LilyPond note names in the phrase
 * @returns {Object|null} Contour analysis result or null if insufficient data
 */
export function analyzePhrase(notes) {
    if (!notes || notes.length < 2) {
        return null;
    }

    const shlf = extractSHLF(notes);
    const classification = classifyContour(shlf);

    return {
        notes: [...notes],
        shlf: shlf,
        type: classification.type,
        generalCase: classification.generalCase,
        description: classification.description,
        noteCount: notes.length
    };
}

/**
 * Analyze a line (two phrases combined)
 * @param {string[]} phrase1Notes - First phrase notes
 * @param {string[]} phrase2Notes - Second phrase notes
 * @returns {Object|null} Contour analysis for the combined line
 */
export function analyzeLine(phrase1Notes, phrase2Notes) {
    const combinedNotes = [...(phrase1Notes || []), ...(phrase2Notes || [])];
    return analyzePhrase(combinedNotes);
}

/**
 * Analyze a complete stanza (all phrases combined)
 * Can accept either an object { 0: [], 1: [], ... } or three line arrays
 * @param {Object|Array} arg1 - phraseBuffers object OR line1 notes
 * @param {Array} [arg2] - line2 notes (if using 3-arg form)
 * @param {Array} [arg3] - line3 notes (if using 3-arg form)
 * @returns {Object|null} Contour analysis for the stanza
 */
export function analyzeStanza(arg1, arg2, arg3) {
    const allNotes = [];

    if (arg2 !== undefined) {
        // Three-argument form: analyzeStanza(line1, line2, line3)
        allNotes.push(...(arg1 || []), ...(arg2 || []), ...(arg3 || []));
    } else if (typeof arg1 === 'object' && arg1 !== null) {
        // Object form: analyzeStanza({ 0: [], 1: [], ... })
        for (let i = 0; i < 6; i++) {
            if (arg1[i]) {
                allNotes.push(...arg1[i]);
            }
        }
    }

    return analyzePhrase(allNotes);
}

/**
 * Get a short display name for a contour type
 * @param {string} type - Contour type (e.g., 'IB', 'IIDa')
 * @returns {string} Short description
 */
export function getContourShortName(type) {
    const names = {
        'IA': 'Descent',
        'IB': 'Rise-Fall',
        'IC': 'Fall-Dip',
        'IDa': 'Rise-Dip (H→L)',
        'IDb': 'Dip-Rise (L→H)',
        'IIA': 'Ascent',
        'IIB': 'Rise-Peak',
        'IIC': 'Dip-Rise',
        'IIDa': 'Peak-Dip (H→L)',
        'IIDb': 'Dip-Peak (L→H)',
        'IIIA': 'Level',
        'IIIB': 'Arch',
        'IIIC': 'Trough',
        'IIIDa': 'Peak-Trough',
        'IIIDb': 'Trough-Peak'
    };
    return names[type] || type || '—';
}

/**
 * Get the general case name for display
 * @param {string} generalCase - 'I', 'II', or 'III'
 * @returns {string} Human-readable name
 */
export function getGeneralCaseName(generalCase) {
    const names = {
        'I': 'Falling',
        'II': 'Rising',
        'III': 'Level'
    };
    return names[generalCase] || generalCase || '';
}

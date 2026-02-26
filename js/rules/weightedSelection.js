// js/rules/weightedSelection.js
//
// Phase 1: Weighted note selection based on melodic motion rules
// Replaces uniform random selection in app.js

import { frequencies } from '../network.js';
import { melodicMotionEdgeWeightRules } from './melodicMotionRules.js';

// Debug mode - set to true to see weight calculations in console
const DEBUG = true;

/**
 * Convert frequency to approximate MIDI note number
 * Used for calculating semitone intervals
 */
function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

/**
 * Pre-compute MIDI values for all notes
 */
const midiNotes = {};
for (const [lily, freq] of Object.entries(frequencies)) {
  midiNotes[lily] = freqToMidi(freq);
}

/**
 * Check if a note is C (any octave)
 */
function isC(note) {
  return note === "c'" || note === "c''";
}

/**
 * Check if a note is G (any octave)
 */
function isG(note) {
  return note === "g'" || note === "g''";
}

/**
 * Build edge context for rule evaluation
 */
function buildEdge(from, to) {
  const fromMidi = midiNotes[from] || 0;
  const toMidi = midiNotes[to] || 0;
  const intervalSemitones = toMidi - fromMidi;

  return {
    from,
    to,
    intervalSemitones,
    direction: intervalSemitones > 0.5 ? 1 : intervalSemitones < -0.5 ? -1 : 0,
  };
}

/**
 * Build context for rule evaluation
 */
function buildContext(currentNote, history) {
  const previousNote = history.length >= 2 ? history[history.length - 2] : null;

  return {
    currentNote,
    previousNote,
    recentNotes: history.slice(-5),
  };
}

/**
 * Phase 1 rule implementations
 * These are the actual weight functions for MM-GP-01 through MM-GP-05
 */
const phase1Rules = {
  // MM-GP-01: Downward motion more frequent/gradual
  // down *1.5, up *0.85, same *1.0
  'MM-GP-01': (edge, _ctx) => {
    if (edge.direction < 0) return 1.5;   // descending
    if (edge.direction > 0) return 0.85;  // ascending
    return 1.0;                            // same note
  },

  // MM-GP-02: Anti-pendular (penalize returning to previous note)
  // if to === previousNote then *0.15
  'MM-GP-02': (edge, ctx) => {
    if (ctx.previousNote && edge.to === ctx.previousNote) {
      return 0.15;
    }
    return 1.0;
  },

  // MM-GP-03: Repetition common, especially on G
  // if to === currentNote *1.15; if to === G *1.25
  'MM-GP-03': (edge, ctx) => {
    let weight = 1.0;
    if (edge.to === ctx.currentNote) {
      weight *= 1.15;
    }
    if (isG(edge.to)) {
      weight *= 1.25;
    }
    return weight;
  },

  // MM-GP-04: Skip asymmetry
  // if downward interval magnitude > 3 semitones *0.4
  // if upward > 3 semitones *1.1
  'MM-GP-04': (edge, _ctx) => {
    const absInterval = Math.abs(edge.intervalSemitones);
    if (absInterval > 3) {
      if (edge.direction < 0) return 0.4;  // large downward skip penalized
      if (edge.direction > 0) return 1.1;  // large upward skip OK
    }
    return 1.0;
  },

  // MM-GP-05: Descent rarely > thirds except to C
  // if down interval > 3 semitones and to !== C then *0.1
  'MM-GP-05': (edge, _ctx) => {
    if (edge.direction < 0 && Math.abs(edge.intervalSemitones) > 3) {
      if (!isC(edge.to)) {
        return 0.1;
      }
    }
    return 1.0;
  },
};

/**
 * Score a single candidate note
 * Returns { note, weight, ruleContributions }
 */
function scoreCandidate(currentNote, candidateNote, ctx) {
  const edge = buildEdge(currentNote, candidateNote);
  const ruleContributions = {};
  let totalWeight = 1.0;

  // Apply each Phase 1 rule
  for (const [ruleId, ruleFn] of Object.entries(phase1Rules)) {
    const contribution = ruleFn(edge, ctx);
    ruleContributions[ruleId] = contribution;
    totalWeight *= contribution;
  }

  return {
    note: candidateNote,
    weight: totalWeight,
    edge,
    ruleContributions,
  };
}

/**
 * Select next note using weighted random selection
 * @param {string} currentNote - Current note in LilyPond notation
 * @param {string[]} history - Recent note history
 * @param {string[]} candidates - Array of possible next notes
 * @returns {string} Selected next note
 */
export function selectWeightedNote(currentNote, history, candidates) {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const ctx = buildContext(currentNote, history);

  // Score all candidates
  const scored = candidates.map(note => scoreCandidate(currentNote, note, ctx));

  // Normalize weights
  const totalWeight = scored.reduce((sum, s) => sum + s.weight, 0);
  const normalized = scored.map(s => ({
    ...s,
    normalizedWeight: s.weight / totalWeight,
    percentage: ((s.weight / totalWeight) * 100).toFixed(1) + '%',
  }));

  // Debug logging
  if (DEBUG) {
    console.group(`🎵 Weighted Selection from ${currentNote}`);
    console.table(normalized.map(s => ({
      note: s.note,
      weight: s.weight.toFixed(3),
      probability: s.percentage,
      interval: s.edge.intervalSemitones.toFixed(1),
      direction: s.edge.direction > 0 ? '↑' : s.edge.direction < 0 ? '↓' : '→',
      ...Object.fromEntries(
        Object.entries(s.ruleContributions).map(([k, v]) => [k, v.toFixed(2)])
      ),
    })));
    console.groupEnd();
  }

  // Weighted random selection
  let random = Math.random() * totalWeight;
  for (const s of scored) {
    random -= s.weight;
    if (random <= 0) {
      if (DEBUG) {
        console.log(`🎯 Selected: ${s.note} (${s.percentage})`);
      }
      return s.note;
    }
  }

  // Fallback (shouldn't happen)
  return scored[scored.length - 1].note;
}

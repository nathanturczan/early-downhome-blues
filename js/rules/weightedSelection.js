// js/rules/weightedSelection.js
//
// Weighted note selection based on melodic motion rules
// Phase 1: Position-agnostic edge weighting
// Phase 2: Phrase/line position awareness

import { frequencies } from '../network.js';
import { melodicMotionEdgeWeightRules } from './melodicMotionRules.js';
import { applyPhase2Rules } from './positionRules.js';
import { shouldRepeat, getRepetitionNote, recordNote } from '../phraseMemory.js';

// Debug mode - set to true to see weight calculations in console
const DEBUG = true;

// Phase 1.5: Phrase length parameters
const MIN_PHRASE_STEPS = 8;
const MAX_PHRASE_STEPS = 12;

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
function buildContext(currentNote, history, position = null) {
  const previousNote = history.length >= 2 ? history[history.length - 2] : null;

  return {
    currentNote,
    previousNote,
    recentNotes: history.slice(-5),
    stepInPhrase: position?.stepInPhrase || 0,
  };
}

/**
 * Phase 1 rule implementations
 * These are the actual weight functions for MM-GP-01 through MM-GP-05
 */
const phase1Rules = {
  // MM-GP-01: Downward motion more frequent/gradual
  // Further reduced to prevent "stuck low" - now 1.1/1.0
  'MM-GP-01': (edge, _ctx) => {
    if (edge.direction < 0) return 1.10;  // descending (was 1.4)
    if (edge.direction > 0) return 1.00;  // ascending (was 0.9) - neutral now
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

  // MM-GP-04: Skip asymmetry (position-aware via ctx.stepInPhrase)
  // Stronger upward leap allowance early in phrase to create rise
  'MM-GP-04': (edge, ctx) => {
    const absInterval = Math.abs(edge.intervalSemitones);
    if (absInterval > 3) {
      if (edge.direction < 0) return 0.4;  // large downward skip penalized
      // Position-aware upward leap: stronger early, weaker late
      if (edge.direction > 0) {
        const step = ctx.stepInPhrase || 0;
        if (step <= 2) return 1.35;  // First 3 notes: strong leap allowance
        return 1.10;                  // Later: modest allowance
      }
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
 * Phase 1.5: Cadence bias rule
 * When phrase is getting long, bias toward cadential notes (C, C')
 * Returns multiplier based on steps into phrase
 */
function getCadenceBias(candidateNote, stepsInPhrase) {
  if (stepsInPhrase < MIN_PHRASE_STEPS) {
    return 1.0; // No bias early in phrase
  }

  // Progressive bias toward C/C' as phrase exceeds min steps
  const overage = stepsInPhrase - MIN_PHRASE_STEPS;
  const maxOverage = MAX_PHRASE_STEPS - MIN_PHRASE_STEPS;
  const strength = Math.min(overage / maxOverage, 1.0); // 0 to 1

  if (isC(candidateNote)) {
    // Strong bias toward C when phrase is long
    return 1.0 + (strength * 2.0); // up to 3x weight
  }

  return 1.0;
}

/**
 * Score a single candidate note
 * Returns { note, weight, ruleContributions }
 * @param {Object} position - Optional stanza position from getPosition()
 */
function scoreCandidate(currentNote, candidateNote, ctx, stepsInPhrase = 0, position = null) {
  const edge = buildEdge(currentNote, candidateNote);
  const ruleContributions = {};
  let totalWeight = 1.0;

  // Apply each Phase 1 rule
  for (const [ruleId, ruleFn] of Object.entries(phase1Rules)) {
    const contribution = ruleFn(edge, ctx);
    ruleContributions[ruleId] = contribution;
    totalWeight *= contribution;
  }

  // Phase 1.5: Apply cadence bias (only if no position tracking)
  if (!position) {
    const cadenceBias = getCadenceBias(candidateNote, stepsInPhrase);
    ruleContributions['CADENCE'] = cadenceBias;
    totalWeight *= cadenceBias;
  }

  // Phase 2: Apply position-aware rules
  if (position) {
    const phase2Result = applyPhase2Rules(edge, ctx, position);
    for (const [ruleId, contribution] of Object.entries(phase2Result.contributions)) {
      ruleContributions[ruleId] = contribution;
    }
    totalWeight *= phase2Result.totalWeight;
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
 * @param {number} stepsInPhrase - Current step count in phrase (Phase 1.5, ignored if position provided)
 * @param {Object} position - Optional stanza position from getPosition() (Phase 2)
 * @returns {{ note: string, shouldRestart: boolean }} Selected note and restart flag
 */
export function selectWeightedNote(currentNote, history, candidates, stepsInPhrase = 0, position = null) {
  if (candidates.length === 0) return { note: null, shouldRestart: false };

  // Phase 2: Check for melodic repetition (phrases c, d repeat a, b)
  if (position && shouldRepeat(position.phrase)) {
    const repetitionNote = getRepetitionNote(position.phrase, position.stepInPhrase, candidates);
    if (repetitionNote) {
      if (DEBUG) {
        console.log(`🔁 Repetition: playing ${repetitionNote} from phrase ${position.phrase === 'c' ? 'a' : 'b'}`);
      }
      return { note: repetitionNote, shouldRestart: false };
    }
  }

  if (candidates.length === 1) {
    const note = candidates[0];
    const shouldRestart = isC(note) && (position ? position.isNearPhraseEnd : stepsInPhrase >= MIN_PHRASE_STEPS);
    return { note, shouldRestart };
  }

  const ctx = buildContext(currentNote, history, position);
  const effectiveSteps = position ? position.stepInPhrase : stepsInPhrase;

  // Score all candidates
  const scored = candidates.map(note => scoreCandidate(currentNote, note, ctx, effectiveSteps, position));

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
      const shouldRestart = isC(s.note) && (position ? position.isNearPhraseEnd : effectiveSteps >= MIN_PHRASE_STEPS);
      if (DEBUG) {
        const posInfo = position ? ` [${position.phrase}:${position.stepInPhrase}]` : '';
        console.log(`🎯 Selected: ${s.note} (${s.percentage})${posInfo}${shouldRestart ? ' [PHRASE END]' : ''}`);
      }
      return { note: s.note, shouldRestart };
    }
  }

  // Fallback (shouldn't happen)
  const fallback = scored[scored.length - 1];
  const shouldRestart = isC(fallback.note) && (position ? position.isNearPhraseEnd : effectiveSteps >= MIN_PHRASE_STEPS);
  return { note: fallback.note, shouldRestart };
}

/**
 * Get a restart note for beginning a new phrase
 * Uses soft restart: returns G' (hub note) with slight upward momentum
 * @param {Object} position - Optional stanza position for context-aware restart
 */
export function getRestartNote(position = null) {
  // Phase 2: Context-aware restart based on phrase
  if (position) {
    const phrase = position.phrase;
    // MM-C-04: Phrases a and c often start with motion toward C'
    if (phrase === 'a' || phrase === 'c') {
      // Start from G to enable G→C' upward motion
      return "g'";
    }
    // Phrase e (dominant): often starts from G or around Bb complex
    if (phrase === 'e') {
      return Math.random() < 0.6 ? "g'" : "a'";
    }
  }

  // Default: G' is the hub note with most connections
  // Occasionally start from C' for variety
  return Math.random() < 0.7 ? "g'" : "c''";
}

// Re-export phrase memory functions for app.js convenience
export { recordNote, freezePhrase } from '../phraseMemory.js';

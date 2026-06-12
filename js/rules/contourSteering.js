// js/rules/contourSteering.js
//
// Phase 2A (issue #41): prescriptive multi-level contour steering.
//
// Titon's Figure 69 shows downhome blues lines are dominated by falling
// contours (IB rise-then-fall 46%, IA pure descent 8%) with occasional
// rising ones (IIB 5%). A plain weighted walk instead produces mostly
// IIDb lines (dip then end high) because lines start on G and cadence on
// the upper C''. This module:
//
//   1. Chooses a target contour per LINE (weighted by Fig. 69, biased
//      toward the stanza's contour type for coherence)
//   2. Reads the line's realized Start/High/Low so far from phraseMemory
//   3. Returns weight multipliers that protect the target's S/H/L/F
//      invariants (e.g. IB needs F=L, so falling lines are routed down
//      through the E' complex to the low C' sink)
//
// Levels: phrase shape comes from PHRASE-START-LIFT + cadence rules,
// line shape from this module, stanza coherence from target inheritance.

import { getPhraseMelody } from '../phraseMemory.js';
import { noteToMidi } from '../contourAnalysis.js';
import { random } from '../random.js';

// Fig. 69 weights among the steerable types: IB=17, IA=3, IIB=2
const LINE_CONTOUR_WEIGHTS = { IB: 17, IA: 3, IIB: 2 };

// How much the stanza-level contour type pulls line targets toward it
const STANZA_BIAS_FACTOR = 2;

// Pitch comparison tolerance (matches contourAnalysis eps)
const EPS = 0.01;

// Typical realized phrase length (closure stats: avg 8-9 notes);
// used to estimate progress through the 2-phrase line
const TYPICAL_PHRASE_LENGTH = 8;

const LINE_PHRASES = { 1: ['a', 'b'], 2: ['c', 'd'], 3: ['e', 'f'] };

// Per-stanza line targets, chosen lazily at first use
let lineTargets = { 1: null, 2: null, 3: null };
let targetStanza = null;

/**
 * Draw a contour type from the Fig. 69 distribution,
 * with the stanza's type weighted more heavily for coherence
 */
function drawLineContour(stanzaType) {
  const weights = { ...LINE_CONTOUR_WEIGHTS };
  if (weights[stanzaType]) {
    weights[stanzaType] *= STANZA_BIAS_FACTOR;
  }
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (const [type, weight] of Object.entries(weights)) {
    r -= weight;
    if (r <= 0) return type;
  }
  return 'IB';
}

/**
 * Get (choosing lazily if needed) the target contour for the current line.
 * Line 2 inherits line 1's target since phrases c/d repeat a/b.
 * @param {Object} position - From getPosition(): needs stanza, line, contourType
 * @returns {string} 'IB' | 'IA' | 'IIB'
 */
export function getLineTarget(position) {
  if (!position || !position.line) return 'IB';

  if (position.stanza !== targetStanza) {
    lineTargets = { 1: null, 2: null, 3: null };
    targetStanza = position.stanza;
  }

  const line = position.line;
  if (!lineTargets[line]) {
    if (line === 2 && lineTargets[1]) {
      lineTargets[2] = lineTargets[1]; // line 2 repeats line 1
    } else {
      lineTargets[line] = drawLineContour(position.contourType);
    }
  }
  return lineTargets[line];
}

/**
 * Reset line targets (new song)
 */
export function resetLineTargets() {
  lineTargets = { 1: null, 2: null, 3: null };
  targetStanza = null;
}

/**
 * Realized Start/High/Low of the current line so far,
 * read from phraseMemory's per-phrase note record
 */
function getLineState(position) {
  const phrases = LINE_PHRASES[position.line];
  if (!phrases) return null;
  const [p1, p2] = phrases;
  const notes = position.phrase === p1
    ? getPhraseMelody(p1)
    : [...getPhraseMelody(p1), ...getPhraseMelody(p2)];
  if (notes.length === 0) return null;

  const pitches = notes.map(noteToMidi);
  let high = pitches[0];
  let low = pitches[0];
  for (let i = 1; i < pitches.length; i++) {
    if (pitches[i] > high) high = pitches[i];
    if (pitches[i] < low) low = pitches[i];
  }
  return { S: pitches[0], H: high, L: low, count: pitches.length };
}

/**
 * Estimate progress (0-1) through the two-phrase line
 */
function getLineProgress(position) {
  const phrases = LINE_PHRASES[position.line];
  const phraseInLine = phrases && position.phrase === phrases[1] ? 1 : 0;
  const steps = phraseInLine * TYPICAL_PHRASE_LENGTH + (position.stepInPhrase || 0);
  return Math.min(1, steps / (2 * TYPICAL_PHRASE_LENGTH));
}

/**
 * Route falling lines into the low final: c' (the network's bottom note)
 * guarantees F=L, and is only reachable through the E' complex.
 * The high C'' is penalized - a line that started on G and cadences on C''
 * ends ABOVE its start, which classifies as rising (the IIDb glut JTT heard).
 */
function towardLowFinal(edge) {
  if (edge.to === "c'") return 3.0;
  if (edge.to === "e'" || edge.to === "ef'" || edge.to === "eqf'") return 2.0;
  if (edge.to === "c''") return 0.3;
  return 1.0;
}

/**
 * Contour steering weight for a candidate edge
 * @param {Object} edge - { from, to, intervalSemitones, direction }
 * @param {Object} ctx - Rule context (unused, kept for rule signature parity)
 * @param {Object} position - From getPosition()
 * @param {boolean} inLiftWindow - When true, skip directional preferences
 *   (PHRASE-START-LIFT owns direction there) but keep range guards
 * @returns {number} Weight multiplier
 */
export function steerContour(edge, ctx, position, inLiftWindow = false) {
  if (!position || !position.line) return 1.0;

  const state = getLineState(position);
  if (!state) return 1.0;

  const target = getLineTarget(position);
  const cand = noteToMidi(edge.to);
  const progress = getLineProgress(position);
  // The line's low final must happen in its SECOND (cadential) phrase -
  // bottoming out in the first phrase ruins F=L for the whole line
  const phrases = LINE_PHRASES[position.line];
  const inCadentialPhrase = phrases && position.phrase === phrases[1];
  let w = 1.0;

  switch (target) {
    case 'IA':
      // Pure descent: the opening pitch must stay the line's high (S=H)
      if (cand > state.S + EPS) w *= 0.1;
      if (!inLiftWindow) {
        if (edge.direction < 0) w *= 1.3;
        else if (edge.direction > 0) w *= 0.8;
      }
      if (inCadentialPhrase) w *= towardLowFinal(edge);
      else if (edge.to === "c'") w *= 0.3; // save the bottom for the cadence
      break;

    case 'IB':
      if (progress < 0.4) {
        // Rise phase: get above the opening pitch
        if (!inLiftWindow) {
          if (state.H <= state.S + EPS) {
            if (edge.direction > 0) w *= 1.6;
            else if (edge.direction < 0) w *= 0.75;
          } else if (edge.direction > 0) {
            w *= 1.15;
          }
        }
        // Don't dig below the start before the peak - the LOW must be
        // saved for the final (F=L)
        if (cand < state.S - EPS) w *= 0.6;
      } else if (!inLiftWindow) {
        // Fall phase
        if (edge.direction < 0) w *= 1.3;
        else if (edge.direction > 0) w *= 0.8;
      }
      if (inCadentialPhrase) w *= towardLowFinal(edge);
      else if (edge.to === "c'") w *= 0.3; // save the bottom for the cadence
      break;

    case 'IIB':
      // Rising overall: the opening pitch must stay the line's low (S=L)
      if (cand < state.S - EPS) w *= 0.2;
      if (!inLiftWindow) {
        if (progress < 0.6) {
          if (edge.direction > 0) w *= 1.35;
          else if (edge.direction < 0) w *= 0.85;
        } else if (edge.direction < 0 && cand > state.S + EPS) {
          w *= 1.15; // settle after the peak, but stay above the start
        }
      }
      break;
  }

  return w;
}

// js/random.js
//
// Seedable PRNG for reproducible tests
// Uses mulberry32 algorithm (fast, good distribution)

let currentSeed = null;
let state = 0;

/**
 * mulberry32 PRNG - fast 32-bit generator
 */
function mulberry32() {
  state += 0x6D2B79F5;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Set seed for reproducible random sequence
 * @param {number} seed - Integer seed value
 */
export function setSeed(seed) {
  currentSeed = seed;
  state = seed;
}

/**
 * Clear seed - revert to Math.random()
 */
export function clearSeed() {
  currentSeed = null;
}

/**
 * Get current seed (null if unseeded)
 */
export function getSeed() {
  return currentSeed;
}

/**
 * Generate random number [0, 1)
 * Uses seeded PRNG if seed is set, otherwise Math.random()
 */
export function random() {
  if (currentSeed !== null) {
    return mulberry32();
  }
  return Math.random();
}

/**
 * Generate a random seed from current time
 */
export function generateSeed() {
  return Date.now() % 2147483647;
}

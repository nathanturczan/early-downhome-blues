// Network edges from Titon's Figure 64
export const edges = [
    // Staff 1
    { from: "ef'", to: "c'" },
    { from: "ef'", to: "eqf'" },
    { from: "eqf'", to: "e'" },
    { from: "ef'", to: "e'" },
    { from: "e'", to: "f'" },
    { from: "f'", to: "e'" },
    { from: "e'", to: "c'" },
    { from: "f'", to: "g'" },
    { from: "g'", to: "f'" },
    { from: "g'", to: "gf'" },
    { from: "gf'", to: "g'" },
    { from: "e'", to: "g'" },
    { from: "g'", to: "e'" },
    { from: "g'", to: "ef'" },
    // Staff 2
    { from: "g'", to: "a'" },
    { from: "g'", to: "bf'" },
    { from: "bf'", to: "b'" },
    { from: "a'", to: "c''" },
    { from: "a'", to: "g'" },
    { from: "bf'", to: "g'" },
    { from: "b'", to: "bf'" },
    { from: "c''", to: "bf'" },
    { from: "b'", to: "g'" },
    { from: "a'", to: "b'" },
    { from: "c''", to: "g'" },
    // Staff 3
    { from: "c''", to: "eqf''" },
    { from: "eqf''", to: "e''" },
    { from: "e''", to: "eqf''" },
    { from: "eqf''", to: "ef''" },
    { from: "ef''", to: "eqf''" },
    { from: "eqf''", to: "c''" },
    { from: "d''", to: "c''" },
    { from: "ef''", to: "d''" },
    { from: "d''", to: "ef''" },
    { from: "c''", to: "ef''" },
    { from: "ef''", to: "c''" }
];

// Build adjacency list
export const adjacency = {};
edges.forEach(({ from, to }) => {
    if (!adjacency[from]) adjacency[from] = [];
    if (!adjacency[from].includes(to)) adjacency[from].push(to);
});

// Frequencies for each note (A4 = 440 Hz)
export const frequencies = {
    "c'": 261.63, "d'": 293.66, "ef'": 311.13, "eqf'": 320.24,
    "e'": 329.63, "f'": 349.23, "gf'": 369.99, "g'": 392.00,
    "a'": 440.00, "bf'": 466.16, "b'": 493.88, "c''": 523.25,
    "d''": 587.33, "ef''": 622.25, "eqf''": 640.49, "e''": 659.26
};

// Display names
const FLAT = '\u266D';
const QUARTER_FLAT = '<span class="quarter-flat">\u266D</span>';

export const displayNames = {
    "c'": "c", "d'": "d", "ef'": `e${FLAT}`, "eqf'": `e${QUARTER_FLAT}`,
    "e'": "e", "f'": "f", "gf'": `g${FLAT}`, "g'": "g",
    "a'": "a", "bf'": `b${FLAT}`, "b'": "b", "c''": "c'",
    "d''": "d'", "ef''": `e${FLAT}'`, "eqf''": `e${QUARTER_FLAT}'`, "e''": "e'"
};

// VexFlow note definitions
export const staff1Notes = [
    { lily: "c'", vex: "c/4", acc: null },
    { lily: "ef'", vex: "e/4", acc: "b" },
    { lily: "eqf'", vex: "e/4", acc: "d" },
    { lily: "e'", vex: "e/4", acc: null },
    { lily: "f'", vex: "f/4", acc: null },
    { lily: "gf'", vex: "g/4", acc: "b" },
    { lily: "g'", vex: "g/4", acc: null }
];

export const staff2Notes = [
    { lily: "g'", vex: "g/4", acc: null },
    { lily: "a'", vex: "a/4", acc: null },
    { lily: "bf'", vex: "b/4", acc: "b" },
    { lily: "b'", vex: "b/4", acc: null },
    { lily: "c''", vex: "c/5", acc: null }
];

export const staff3Notes = [
    { lily: "c''", vex: "c/5", acc: null },
    { lily: "d''", vex: "d/5", acc: null },
    { lily: "ef''", vex: "e/5", acc: "b" },
    { lily: "eqf''", vex: "e/5", acc: "d" },
    { lily: "e''", vex: "e/5", acc: null }
];

// Edge definitions with above/below for arrow rendering
export const staff1Edges = [
    { from: "ef'", to: "c'", below: false }, { from: "ef'", to: "eqf'", below: false },
    { from: "eqf'", to: "e'", below: false }, { from: "ef'", to: "e'", below: false },
    { from: "e'", to: "f'", below: false }, { from: "f'", to: "e'", below: true },
    { from: "e'", to: "c'", below: true }, { from: "f'", to: "g'", below: false },
    { from: "g'", to: "f'", below: true }, { from: "g'", to: "gf'", below: true },
    { from: "gf'", to: "g'", below: false }, { from: "e'", to: "g'", below: false },
    { from: "g'", to: "e'", below: true }, { from: "g'", to: "ef'", below: true }
];

export const staff2Edges = [
    { from: "g'", to: "a'", below: false }, { from: "g'", to: "bf'", below: false },
    { from: "bf'", to: "b'", below: false }, { from: "a'", to: "c''", below: false },
    { from: "a'", to: "g'", below: true }, { from: "bf'", to: "g'", below: true },
    { from: "b'", to: "bf'", below: true }, { from: "c''", to: "bf'", below: true },
    { from: "b'", to: "g'", below: true }, { from: "a'", to: "b'", below: false },
    { from: "c''", to: "g'", below: true }
];

export const staff3Edges = [
    { from: "c''", to: "eqf''", below: false }, { from: "eqf''", to: "e''", below: false },
    { from: "e''", to: "eqf''", below: true }, { from: "eqf''", to: "ef''", below: true },
    { from: "ef''", to: "eqf''", below: false }, { from: "eqf''", to: "c''", below: true },
    { from: "d''", to: "c''", below: true }, { from: "ef''", to: "d''", below: true },
    { from: "d''", to: "ef''", below: false }, { from: "c''", to: "ef''", below: false },
    { from: "ef''", to: "c''", below: true }
];

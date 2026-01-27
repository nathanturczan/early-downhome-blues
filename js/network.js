// Network edges from Titon's Figure 64
export const edges = [
    // Staff 1
    { from: "ees'", to: "c'" },
    { from: "ees'", to: "eeh'" },
    { from: "eeh'", to: "e'" },
    { from: "ees'", to: "e'" },
    { from: "e'", to: "f'" },
    { from: "f'", to: "e'" },
    { from: "e'", to: "c'" },
    { from: "f'", to: "g'" },
    { from: "g'", to: "f'" },
    { from: "g'", to: "ges'" },
    { from: "ges'", to: "g'" },
    { from: "e'", to: "g'" },
    { from: "g'", to: "e'" },
    { from: "g'", to: "ees'" },
    // Staff 2
    { from: "g'", to: "a'" },
    { from: "g'", to: "bes'" },
    { from: "bes'", to: "b'" },
    { from: "a'", to: "c''" },
    { from: "a'", to: "g'" },
    { from: "bes'", to: "g'" },
    { from: "b'", to: "bes'" },
    { from: "c''", to: "bes'" },
    { from: "b'", to: "g'" },
    { from: "a'", to: "b'" },
    { from: "c''", to: "g'" },
    // Staff 3
    { from: "c''", to: "eeh''" },
    { from: "eeh''", to: "e''" },
    { from: "e''", to: "eeh''" },
    { from: "eeh''", to: "ees''" },
    { from: "ees''", to: "eeh''" },
    { from: "eeh''", to: "c''" },
    { from: "d''", to: "c''" },
    { from: "ees''", to: "d''" },
    { from: "d''", to: "ees''" },
    { from: "c''", to: "ees''" },
    { from: "ees''", to: "c''" }
];

// Build adjacency list
export const adjacency = {};
edges.forEach(({ from, to }) => {
    if (!adjacency[from]) adjacency[from] = [];
    if (!adjacency[from].includes(to)) adjacency[from].push(to);
});

// Frequencies for each note (A4 = 440 Hz)
export const frequencies = {
    "c'": 261.63, "d'": 293.66, "ees'": 311.13, "eeh'": 320.24,
    "e'": 329.63, "f'": 349.23, "ges'": 369.99, "g'": 392.00,
    "a'": 440.00, "bes'": 466.16, "b'": 493.88, "c''": 523.25,
    "d''": 587.33, "ees''": 622.25, "eeh''": 640.49, "e''": 659.26
};

// Display names
const FLAT = '\u266D';
const QUARTER_FLAT = '<span class="quarter-flat">\u266D</span>';

export const displayNames = {
    "c'": "c", "d'": "d", "ees'": `e${FLAT}`, "eeh'": `e${QUARTER_FLAT}`,
    "e'": "e", "f'": "f", "ges'": `g${FLAT}`, "g'": "g",
    "a'": "a", "bes'": `b${FLAT}`, "b'": "b", "c''": "c'",
    "d''": "d'", "ees''": `e${FLAT}'`, "eeh''": `e${QUARTER_FLAT}'`, "e''": "e'"
};

// VexFlow note definitions
export const staff1Notes = [
    { lily: "c'", vex: "c/4", acc: null },
    { lily: "ees'", vex: "e/4", acc: "b" },
    { lily: "eeh'", vex: "e/4", acc: "d" },
    { lily: "e'", vex: "e/4", acc: null },
    { lily: "f'", vex: "f/4", acc: null },
    { lily: "ges'", vex: "g/4", acc: "b" },
    { lily: "g'", vex: "g/4", acc: null }
];

export const staff2Notes = [
    { lily: "g'", vex: "g/4", acc: null },
    { lily: "a'", vex: "a/4", acc: null },
    { lily: "bes'", vex: "b/4", acc: "b" },
    { lily: "b'", vex: "b/4", acc: null },
    { lily: "c''", vex: "c/5", acc: null }
];

export const staff3Notes = [
    { lily: "c''", vex: "c/5", acc: null },
    { lily: "d''", vex: "d/5", acc: null },
    { lily: "ees''", vex: "e/5", acc: "b" },
    { lily: "eeh''", vex: "e/5", acc: "d" },
    { lily: "e''", vex: "e/5", acc: null }
];

// Edge definitions with above/below for arrow rendering
export const staff1Edges = [
    { from: "ees'", to: "c'", below: false }, { from: "ees'", to: "eeh'", below: false },
    { from: "eeh'", to: "e'", below: false }, { from: "ees'", to: "e'", below: false },
    { from: "e'", to: "f'", below: false }, { from: "f'", to: "e'", below: true },
    { from: "e'", to: "c'", below: true }, { from: "f'", to: "g'", below: false },
    { from: "g'", to: "f'", below: true }, { from: "g'", to: "ges'", below: true },
    { from: "ges'", to: "g'", below: false }, { from: "e'", to: "g'", below: false },
    { from: "g'", to: "e'", below: true }, { from: "g'", to: "ees'", below: true }
];

export const staff2Edges = [
    { from: "g'", to: "a'", below: false }, { from: "g'", to: "bes'", below: false },
    { from: "bes'", to: "b'", below: false }, { from: "a'", to: "c''", below: false },
    { from: "a'", to: "g'", below: true }, { from: "bes'", to: "g'", below: true },
    { from: "b'", to: "bes'", below: true }, { from: "c''", to: "bes'", below: true },
    { from: "b'", to: "g'", below: true }, { from: "a'", to: "b'", below: false },
    { from: "c''", to: "g'", below: true }
];

export const staff3Edges = [
    { from: "c''", to: "eeh''", below: false }, { from: "eeh''", to: "e''", below: false },
    { from: "e''", to: "eeh''", below: true }, { from: "eeh''", to: "ees''", below: true },
    { from: "ees''", to: "eeh''", below: false }, { from: "eeh''", to: "c''", below: true },
    { from: "d''", to: "c''", below: true }, { from: "ees''", to: "d''", below: true },
    { from: "d''", to: "ees''", below: false }, { from: "c''", to: "ees''", below: false },
    { from: "ees''", to: "c''", below: true }
];

# 12-Bar Blues Stanza Model

Source: Jeff Titon, *Early Downhome Blues*

## Hierarchical Structure

```
S (Song)
├── Z1 (Stanza 1)
│   ├── 1 (Line 1, measures 1-4)
│   │   ├── A (Phrase)
│   │   └── B (Phrase)
│   ├── 2 (Line 2, measures 5-8)
│   │   ├── C (Phrase)
│   │   └── D (Phrase)
│   └── 3 (Line 3, measures 9-12)
│       ├── E (Phrase)
│       └── F (Phrase)
├── Z2 (Stanza 2)
│   ├── 1
│   │   ├── A
│   │   └── B
│   ├── 2
│   │   ├── C
│   │   └── D
│   └── 3
│       ├── E
│       └── F
├── Z3 (Stanza 3)
│   └── ...
└── ...
```

## Terminology

| Symbol | Meaning |
|--------|---------|
| S | Downhome blues song |
| Z1, Z2, Z3... | Stanzas |
| 1, 2, 3 | Lines (within a stanza) |
| A, B, C, D, E, F | Phrases (within a line) |

## Structure Overview

Each stanza is a 3-line, 12-measure form with 2 phrases per line:

```
Line 1 (measures 1-4)     Line 2 (measures 5-8)     Line 3 (measures 9-12)
──────────────────────    ──────────────────────    ──────────────────────
Harmony: I                Harmony: IV → I           Harmony: V → I
Phrases: A + B            Phrases: C + D            Phrases: E + F
                          (repeats Line 1)          (variation/resolution)
```

## Harmonic Structure

| Measure | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---------|---|---|---|---|---|---|---|---|---|----|----|-----|
| Chord   | I | I | I | I | IV| IV| I | I | V | V  | I  | I   |
| Line    | 1 | 1 | 1 | 1 | 2 | 2 | 2 | 2 | 3 | 3  | 3  | 3   |
| Phrase  | A | A | B | B | C | C | D | D | E | E  | F  | F   |

Note: This is the "standard" pattern. Early recordings (pre-1930s) show many variations.

## Key Principle

**Melody repeats while harmony changes underneath.**

The melody for Line 2 more or less repeats Line 1, even as the harmony moves to IV.

## Three Historical Harmonic Approaches

1. **Functional I-IV-V** - Clear chord changes following 12-bar (or 8-bar) pattern
2. **Root-only implication** - Just the roots of IV/V, suggesting harmony without full chords
3. **Static I drone** - Staying on I throughout (melody implies harmonic motion)

## Melodic Repetition Logic

```
Line 1: Generate Phrases A + B
Line 2: Repeat Phrases A + B with slight variation → C + D
Line 3: Generate contrasting Phrases E + F, resolve to tonic
```

# Blues Families

Source: Jeff Titon, *Early Downhome Blues*, pp. 162-163

## Overview

Several of the 44 downhome blues songs in the sample share similar melodies. From these melodies, blues families may be derived.

## Phrase Relationships

The transcriptions and contour diagrams show that in a given stanza in a particular song:

- **Phrases B, D, and F** are usually identical or nearly so
- **Phrases A and C** are very close

This enables further simplification of stanza models.

## Simplified Stanza Model

From the stanza model (Figure 72), we can:

1. **Combine lines 1 and 2** - ignoring their different harmonic support (since we are considering melodies only)
2. **Indicate that the second half of line 3** (phrase F) is derived from the same skeleton as the second half of lines 1 and 2 (phrases B and D)

This allows us to concentrate on the **skeletal structures and generative principles of phrases A, B, and E**. These structures should account for:
- Minor differences between phrases B, D, and F
- Minor differences between phrases A and C

## Phrase F Variations

When phrase F does differ from phrases B and D significantly, it is usually in line 3 with no break into E/F phrases. Even so, the latter part is at least similar to phrases B and D:
- Sometimes transposed a third lower
- Still resolves to the tonic as do B and D

## Phrase E Independence

Phrase E varies seemingly independently of the other phrases.

## Relationship Between Phrase A and B

There is an interesting relation between the halves of lines 1 and 2:

- When the contour of phrase A is taken from the first full measure, it is often a **falling** one
- Phrase B following is **virtually identical**, except:
  - Phrase B falls to the keynote
  - Phrase A does not regularly do so

See Figures 74 and 75 for examples where phrase B imitates phrase A, with pickup measures leading into directly falling melody.

## Implementation Notes

This suggests the core generative model can focus on three phrase types:

| Phrase | Role | Derives From |
|--------|------|--------------|
| A | Opening gesture | Independent |
| B | Cadential close | Independent (A-like but ends on tonic) |
| C | Repeat of A | A (with variation for IV harmony) |
| D | Repeat of B | B (nearly identical) |
| E | Dominant contrast | Independent |
| F | Final cadence | B/D (nearly identical, sometimes transposed) |

The key insight: **A and B are the primary generative sources**, with C/D/F being derived copies and E being independently varied.

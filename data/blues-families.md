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

---

## Blues Family 1

Characteristically:

- **Phrases A and C**: Begin in the E' complex, moving around within it for two or more beats, and end on C'
- **Phrases B and D**: Similar to A and C, involving the E' complex, but often come to rest on C'
- **Phrase E**: Variable
- **Phrase F**: Often follows the pattern of phrase D

The model for this and succeeding Blues Families is illustrated in Figure 76.

---

## Blues Family 2

Whereas in Blues Family 1 the first heavily accented pitch is in the E' complex, in Blues Family 2 it is **C'** and it is approached by an anacrusis beginning in the previous measure on G.

What follows takes place within a few variations:

**Variation 1: Rising to E' complex**
- The stressed C' rises to the E' complex
- Usually does so at the end of phrase A or the very beginning of phrase B
- Then phrase B descends to the note C

**Variation 2: C' stays highest**
- C' stays as the highest pitch in line 1
- Continues as the most important pitch in line 1
- Descends to note C in phrase B

**Other phrases:**
- **Phrases C and D**: Similar to A and B, respectively
- **Phrase E**: Takes on a characteristic form in this family, with the Bb complex as the stressed upper bound, sometimes alternating with G
- **Phrase F**: Usually follows phrase D

---

## Blues Family 3

Shares with Blues Family 2 a C' as the first stressed pitch. Unlike Blues Family 2, phrases A and C descend to close at note E or note C.

- **First stressed C'**: Sometimes but not always preceded by an anacrusis
- **Phrases A and C**: Descend to close at note E or note C
- **Phrases B and D**: Generally follow A and C but without the anacrusis
- **Phrase E**: Variable
- **Phrase F**: Descends variably to the keynote C from C', A, G, or in pendular motion with the E complex

---

## Blues Family 4

The first heavily stressed pitch in this family is **G**, often preceded by a brief rise. This is the family which includes the characteristic "leaning on G."

- **Phrase A**: May stay on note G or close with a descent to note C
- **Phrase B**: Begins with note G and descends to note C
- **Phrases C and D**: Similar to A and B respectively
- **Phrase E**: Similar to phrase E of Blues Family 2, but whereas in Family 2 the Bb complex is stressed, G is more important in Family 4
- **Phrase F**: Always starts on note G and descends to the keynote C

---

## Summary

Out of a sample of 44 downhome blues songs, **20 fall distinctly into these four blues families**.

### Uncategorized Forms

There are other blues families to consider, based on forms other than the three-line AAB stanza—for example, the two-line approximately 8-bar blues families.

---

## On Generative Models

> "A retrodictive model is not a song-producing system. It may be explanatory, but it is not a predictive one. One wants a model that produces new blues melodies."

This distinction frames the goal: move from *explanation* (what patterns exist) to *generation* (producing new acceptable melodies).

# Melodic Analysis Research

This document organizes research from Jeff Todd Titon's "Early Downhome Blues" and related ideas for extending the pitch network model.

## Table of Contents

### Titon's Analysis
1. [Melodic Contour Classification](#titons-melodic-contour-classification)
2. [Phrase Structure](#phrase-structure)
3. [Contour Frequency by Phrase](#contour-frequency-by-phrase)
4. [Blues Families](#blues-families)
5. [Pitch Complexes](#pitch-complexes)

### Contour Theory (Nathan Ho)
6. [Hidden Markov Models](#hidden-markov-models-hmm)
7. [Contour Comparison Matrix](#contour-comparison-matrix)
8. [Eigenvalues of Transition Matrix](#eigenvalues-of-transition-matrix)
9. [Papers to Read](#papers-to-read)

### Project
10. [References](#references)
11. [Implementation Ideas](#implementation-ideas)

---

## Titon's Melodic Contour Classification

Titon classifies melodic contours into three main types based on the general shape of pitch sequences:

### Contour I: Falling
The melody moves from higher to lower pitches.

| Case | Pattern | Description |
|------|---------|-------------|
| Ia | ↘ | Simple fall |
| Ib | ↗↘ | Rise then fall |
| Ic | →↘ | Level then fall |
| Id | ↘→ | Fall then level |
| Ie | ↗↘→ | Rise, fall, level |
| If | →↘→ | Level, fall, level |

### Contour II: Rising
The melody moves from lower to higher pitches.

| Case | Pattern | Description |
|------|---------|-------------|
| IIa | ↗ | Simple rise |
| IIb | ↘↗ | Fall then rise |
| IIc | →↗ | Level then rise |
| IId | ↗→ | Rise then level |
| IIe | ↘↗→ | Fall, rise, level |
| IIf | →↗→ | Level, rise, level |

### Contour III: Level
The melody stays relatively stable.

| Case | Pattern | Description |
|------|---------|-------------|
| IIIa | → | Simple level |
| IIIb | ↗↘ (returning) | Rise and fall back to starting pitch |
| IIIc | ↘↗ (returning) | Fall and rise back to starting pitch |

---

## Phrase Structure

Titon identifies a hierarchical structure in downhome blues:

```
Song
└── Stanzas (Z1, Z2, Z3, ...)
    └── Lines (1, 2, 3)
        └── Phrases (a, b, c, d, e, f)
```

### Line Structure
- **Line 1**: Statement (phrases a, b)
- **Line 2**: Repetition/variation of statement (phrases c, d)
- **Line 3**: Response/resolution (phrases e, f)

### Phrase Positions
Each line typically contains two phrases:
- **a, c, e**: First phrase of each line (odd positions)
- **b, d, f**: Second phrase of each line (even positions)

### Chord-Phrase Relationships
- Phrases **a, b**: Over I chord
- Phrases **c, d**: Often over IV chord (or I)
- Phrases **e, f**: V-IV-I resolution pattern

---

## Contour Frequency by Phrase

From Titon's Figure 69 - percentage of each contour type by phrase position:

| Phrase | Contour I (Falling) | Contour II (Rising) | Contour III (Level) |
|--------|---------------------|---------------------|---------------------|
| a | 56% | 20% | 24% |
| b | 76% | 8% | 16% |
| c | 56% | 24% | 20% |
| d | 68% | 12% | 20% |
| e | 48% | 24% | 28% |
| f | 88% | 4% | 8% |

### Key Observations
1. **Falling contours dominate** - Most common across all phrase positions
2. **Phrase f is overwhelmingly falling (88%)** - Final resolution almost always descends
3. **Phrase b strongly falling (76%)** - End of first statement descends
4. **Phrases a, c, e more balanced** - Beginning phrases have more variety
5. **Rising contours rare in phrase f (4%)** - Final phrases rarely ascend

### Implications for Generation
- Weight transitions toward falling contours, especially at phrase endings
- Allow more contour variety at phrase beginnings (a, c, e)
- Strongly prefer falling contours for phrase f (resolution)

---

## Blues Families

Titon identifies four "families" of blues based on melodic characteristics:

1. **Family 1**: [Details TBD]
2. **Family 2**: [Details TBD]
3. **Family 3**: [Details TBD]
4. **Family 4**: [Details TBD]

*Note: Need to extract specific family characteristics from Titon's analysis.*

---

## Pitch Complexes

Titon organizes pitches into "complexes" based on their functional relationships:

### E Complex
- E (neutral/blue third)
- E♭ (minor third)
- Eqf (quarter-flat E, between E♭ and E)

### E' Complex (Upper Register)
- Same pitches, higher octave

### G Complex
- G (fifth degree)
- Related approach tones

### B♭ Complex
- B♭ (dominant seventh / blue seventh)
- Approach and neighbor tones

### Functional Roles
- **E/E♭/Eqf**: The "blue third" - central to blues expression
- **B♭**: The "blue seventh" - creates tension with dominant
- **G**: Stable fifth, often a melodic anchor

---

## Contour Theory (Nathan Ho)

Research directions suggested by Nathan Ho for extending the melodic analysis.

### Hidden Markov Models (HMM)

Use contour as a **hidden state** with pitches as observations:
- **Hidden states**: {Falling, Rising, Level} or the 15 specific contour cases (Ia, Ib, IIa, etc.)
- **Observations**: Individual pitches from the network
- **Transitions**: Contour-to-contour probabilities (could be phrase-aware using Figure 69 data)
- **Emissions**: Pitch probabilities given current contour

This would allow:
- Generation that respects melodic shape at a higher level
- Phrase-aware melody generation
- Learning contour patterns from transcriptions

### Contour Comparison Matrix

For any 5-note sequence, create a 5×5 matrix comparing all pairs of notes:

```
     n1  n2  n3  n4  n5
n1   =   ?   ?   ?   ?
n2   ?   =   ?   ?   ?
n3   ?   ?   =   ?   ?
n4   ?   ?   ?   =   ?
n5   ?   ?   ?   ?   =
```

Where each cell contains:
- `+` if row note > column note (higher pitch)
- `-` if row note < column note (lower pitch)
- `=` if same pitch

This matrix captures:
- **Local contour**: Adjacent comparisons (the diagonal next to main diagonal)
- **Global contour**: Distant comparisons (corners of matrix)
- **Abstract intervals**: Pitch relationships without specific frequencies

### Eigenvalues of Transition Matrix

Analyze the eigenvalues of the current pitch transition matrix:
- **Largest eigenvalue (=1)**: Confirms valid stochastic matrix
- **Second largest eigenvalue**: Indicates convergence rate to stationary distribution
- **Stationary distribution**: Eigenvector for eigenvalue 1 shows long-run pitch frequencies
- **Other eigenvectors**: May reveal "attractor" notes or melodic clusters

### Papers to Read

1. **Polansky & Bassein** - Contour theory and melodic analysis
2. **Brown et al.** - [Specific paper TBD]

---

## References

- Titon, Jeff Todd. *Early Downhome Blues: A Musical and Cultural Analysis*. University of Illinois Press, 1977.
  - Figure 64: Pitch network diagram
  - Figure 65-68: Contour classification diagrams
  - Figure 69: Contour frequency by phrase
  - Figure 70-72: Phrase sequence and structure diagrams

---

## Implementation Ideas

### Short-term
- [ ] Add phrase position tracking to melody generation
- [ ] Weight transitions based on phrase-specific contour frequencies
- [ ] Display current phrase position in UI

### Medium-term
- [ ] Implement basic HMM with contour states
- [ ] Add contour matrix visualization
- [ ] Create phrase-aware "autopilot" mode

### Long-term
- [ ] Train HMM on transcribed blues melodies
- [ ] Implement blues family classification
- [ ] Add stanza-level structure awareness

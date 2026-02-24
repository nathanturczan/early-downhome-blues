# Early Downhome Blues

An interactive web app for exploring the pitch network from Jeff Todd Titon's *Early Downhome Blues: A Musical and Cultural Analysis* (Figure 64).

**[Try it live](https://early-downhome-blues.vercel.app/)**

![Note Network](https://github.com/nathanturczan/Blues_Markov/blob/master/note_network.jpeg?raw=true)

## About

This tool lets you walk through Titon's pitch transition network, which maps how melodies move between notes in early downhome blues. The network includes:

- **Quarter-tones**: The "blue third" (E quarter-flat) between E♭ and E
- **Sink note**: C4 is the only resolution point with no outgoing paths
- **Hub note**: G4 connects to the most destinations (6 notes)

## Features

- **Interactive notation**: Click notes directly on the staff to navigate
- **Paths display**: See all possible next notes from your current position
- **Pluck synth**: Guitar-like sound using Karplus-Strong synthesis
- **Inflecting drone**: Toggle drone notes (root, 3rd, 5th, 7th) that bend to match the melody's microtonal inflections
- **MIDI output**: Send notes to external instruments with pitch bend for quarter-tones (set pitch bend range to ±2 semitones)
- **History**: Track your path through the network

## Quarter-tone Support

The app uses LilyPond notation internally:
- `ees'` = E♭ (E flat)
- `eeh'` = E quarter-flat (halfway between E♭ and E)
- `e'` = E natural

For MIDI, quarter-tones are achieved via pitch bend (50 cents up from the flat).

## Tech Stack

- [Tone.js](https://tonejs.github.io/) - Web Audio synthesis
- [VexFlow](https://www.vexflow.com/) - Music notation rendering
- Vanilla JavaScript

## Reference

Titon, Jeff Todd. *Early Downhome Blues: A Musical and Cultural Analysis*. 2nd ed., University of North Carolina Press, 1994.

## License

MIT

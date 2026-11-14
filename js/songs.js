/*
 * Song data.
 *
 * Lyrics are intentionally NOT included (they are copyrighted). Each song is
 * described by its chord progression, which is what a beginner needs to play
 * along with the recording.
 *
 * Format of a section line:
 *   "C | G | Am | F"   -> four bars, one chord per bar
 *   "G C | D"          -> first bar split between G and C, second bar D
 *
 * key          : the key of the chord SHAPES written below
 * capo         : recommended capo fret so the shapes match the recording
 * originalKey  : the key you hear on the record
 * strum        : 8 eighth-note slots ("1 & 2 & 3 & 4 &"); D = down, U = up, - = miss
 * level        : 1 = first weeks, 2 = a few months, 3 = stretch goal
 */
const SONGS = [
  {
    id: "let-it-be",
    title: "Let It Be",
    album: "Let It Be",
    year: 1970,
    key: "C",
    capo: 0,
    originalKey: "C",
    bpm: 72,
    level: 1,
    strum: "D-DU-UDU",
    tips: [
      "The whole song is built on four chords: C, G, Am and F. Learn the switch G → Am → F first.",
      "If the full F is hard, use the 'mini F' shown in the diagram (only four strings).",
      "Play slowly: one strum pattern per bar, two bars per vocal line."
    ],
    sections: [
      { name: "Intro", lines: ["C | G | Am | F", "C | G | F | C"] },
      { name: "Verse", lines: ["C | G | Am | F", "C | G | F | C"], repeat: 2 },
      { name: "Chorus", lines: ["Am | G | F | C", "C | G | F | C"] },
      { name: "Turnaround", lines: ["F Em | Dm C | Bb F | G F | C"], note: "Played after the chorus. Bb is optional — skip it and hold F if you're not ready." },
      { name: "Solo", lines: ["C | G | Am | F", "C | G | F | C"], note: "Same chords as the verse." },
      { name: "Outro", lines: ["Am | G | F | C", "C | G | F | C"] }
    ]
  },
  {
    id: "hey-jude",
    title: "Hey Jude",
    album: "Single",
    year: 1968,
    key: "C",
    capo: 5,
    originalKey: "F",
    bpm: 74,
    level: 1,
    strum: "D-DU-UDU",
    tips: [
      "Written here with easy C-shapes. Put a capo on fret 5 to sound exactly like the record (in F).",
      "The G → G7 change only moves one finger: lift your ring finger and put your index on the 1st fret of the high E string.",
      "The long 'na na na' ending is just three chords on repeat: C, Bb, F. Great practice for the Bb barre!"
    ],
    sections: [
      { name: "Verse", lines: ["C | G | G7 | C", "F | C | G7 | C"], repeat: 2 },
      { name: "Bridge", lines: ["C7 | F | Am | Dm", "G7 | C", "C7 | F | Am | Dm", "G7 | C | G | G7"] },
      { name: "Verse", lines: ["C | G | G7 | C", "F | C | G7 | C"] },
      { name: "Coda", lines: ["C | Bb | F | C"], repeat: 8, note: "Repeat as long as you like." }
    ]
  },
  {
    id: "love-me-do",
    title: "Love Me Do",
    album: "Please Please Me",
    year: 1962,
    key: "G",
    capo: 0,
    originalKey: "G",
    bpm: 74,
    level: 1,
    strum: "D-DU-UDU",
    tips: [
      "Only three chords: G, C and D. A perfect first Beatles song.",
      "Most bars switch between G and C every two beats — keep your ring finger anchored on the 3rd fret of the B string if you use the 4-finger G.",
      "The bridge (D → C → G) is where the harmonica solo happens."
    ],
    sections: [
      { name: "Intro", lines: ["G C | G C", "G C | G C"] },
      { name: "Verse", lines: ["G C | G C", "G C | C", "G C | G C"], repeat: 2 },
      { name: "Bridge", lines: ["D | C | G | G", "D | C | G | G"] },
      { name: "Verse", lines: ["G C | G C", "G C | C", "G C | G C"] },
      { name: "Solo", lines: ["D | C | G | G", "D | C | G | G"], note: "Harmonica solo over the bridge chords." },
      { name: "Outro", lines: ["G C | G C"], repeat: 3 }
    ]
  },
  {
    id: "twist-and-shout",
    title: "Twist and Shout",
    album: "Please Please Me",
    year: 1963,
    key: "D",
    capo: 0,
    originalKey: "D",
    bpm: 124,
    level: 1,
    strum: "D-DUDUDU",
    tips: [
      "Three chords, one loop: D → G → A. Once you have it, you have the whole song.",
      "It's fast! Practise the loop at half speed first, then speed up.",
      "In the famous build-up, just strum A and get louder each bar, ending on A7."
    ],
    sections: [
      { name: "Intro", lines: ["D G | A | D G | A"] },
      { name: "Verse", lines: ["D G | A | D G | A"], repeat: 4 },
      { name: "Build-up", lines: ["A | A | A | A7"], note: "Strum harder each bar — this is the 'aaah' section." },
      { name: "Verse", lines: ["D G | A | D G | A"], repeat: 4 },
      { name: "Ending", lines: ["D G | A | D"] }
    ]
  },
  {
    id: "yellow-submarine",
    title: "Yellow Submarine",
    album: "Revolver",
    year: 1966,
    key: "G",
    capo: 0,
    originalKey: "G",
    bpm: 110,
    level: 1,
    strum: "D-D-DUDU",
    tips: [
      "Verse lines start on D, not G — listen to the record to feel where it lands.",
      "The chorus is only G and D. Sing along, it helps keep time!",
      "Am and C are neighbours: keep your index and middle fingers in place and move only the ring finger."
    ],
    sections: [
      { name: "Verse", lines: ["D C | G | Em Am | C D", "D C | G | Em Am | C D"], repeat: 2 },
      { name: "Chorus", lines: ["G | D | D | G", "G | D | D | G"] },
      { name: "Verse", lines: ["D C | G | Em Am | C D", "D C | G | Em Am | C D"] },
      { name: "Chorus", lines: ["G | D | D | G", "G | D | D | G"], repeat: 2 }
    ]
  },
  {
    id: "eleanor-rigby",
    title: "Eleanor Rigby",
    album: "Revolver",
    year: 1966,
    key: "Em",
    capo: 0,
    originalKey: "Em",
    bpm: 136,
    level: 1,
    strum: "D-D-D-D-",
    tips: [
      "Just two chords: Em and C. The record has strings instead of guitars, so short, punchy down-strums sound great.",
      "Em → C: keep your middle finger on the A string, 2nd fret, and slide it to the 3rd fret.",
      "This is in a MINOR key (Em) — notice how it sounds darker than Let It Be."
    ],
    sections: [
      { name: "Intro", lines: ["C | C | Em | Em", "C | C | Em | Em"] },
      { name: "Verse", lines: ["Em | Em | Em | C", "C | C | Em | Em"], repeat: 2 },
      { name: "Chorus", lines: ["Em | Em | C | Em", "Em | Em | C | Em"] },
      { name: "Verse", lines: ["Em | Em | Em | C", "C | C | Em | Em"], repeat: 2 },
      { name: "Outro", lines: ["C | C | Em | Em"] }
    ]
  },
  {
    id: "come-together",
    title: "Come Together",
    album: "Abbey Road",
    year: 1969,
    key: "Dm",
    capo: 0,
    originalKey: "Dm",
    bpm: 82,
    level: 2,
    strum: "D-D-D-DU",
    tips: [
      "Verses sit on Dm for a long time — keep the groove relaxed and steady.",
      "Bm is shown as an easy 4-string version. Use it until you're ready for the full barre.",
      "The chorus (Bm → A → G) moves DOWN step by step — a sound worth remembering."
    ],
    sections: [
      { name: "Intro", lines: ["Dm | Dm | Dm | Dm"] },
      { name: "Verse", lines: ["Dm | Dm | Dm | Dm", "A | A", "G | A"], repeat: 2 },
      { name: "Chorus", lines: ["Bm | A | G | G"] },
      { name: "Verse", lines: ["Dm | Dm | Dm | Dm", "A | A", "G | A"], repeat: 2 },
      { name: "Chorus", lines: ["Bm | A | G | G"] },
      { name: "Outro", lines: ["Bm | A | G | G"], repeat: 4 }
    ]
  },
  {
    id: "here-comes-the-sun",
    title: "Here Comes the Sun",
    album: "Abbey Road",
    year: 1969,
    key: "D",
    capo: 7,
    originalKey: "A",
    bpm: 129,
    level: 2,
    strum: "D-DU-UDU",
    tips: [
      "Capo on fret 7 and play D-shapes — this is how it was played on the record.",
      "No capo? It still sounds great, just lower (in D).",
      "The bridge has an unusual rhythm (bars of different lengths). Listen several times before trying it."
    ],
    sections: [
      { name: "Intro", lines: ["D | G | A7 | A7"], repeat: 2 },
      { name: "Chorus", lines: ["D | G | E7 | D"] },
      { name: "Verse", lines: ["D | G | A7 | A7", "D | G | A7 | A7"] },
      { name: "Chorus", lines: ["D | G | E7 | D"] },
      { name: "Bridge", lines: ["F | C | G | D | A7"], repeat: 3, note: "Count along to the record — the bar lengths change here." },
      { name: "Chorus", lines: ["D | G | E7 | D"], repeat: 2 }
    ]
  },
  {
    id: "ob-la-di-ob-la-da",
    title: "Ob-La-Di, Ob-La-Da",
    album: "The Beatles (White Album)",
    year: 1968,
    key: "G",
    capo: 3,
    originalKey: "B♭",
    bpm: 112,
    level: 2,
    strum: "D-DU-UDU",
    tips: [
      "Capo 3 + G-shapes = the record's key (B♭).",
      "Once comfortable, try a ska-style strum: only up-strums on the '&' of each beat (-U-U-U-U).",
      "G → G7 → C is a classic move: the 7th chord 'pulls' your ear towards C."
    ],
    sections: [
      { name: "Verse", lines: ["G | D | D7 | G", "G | G7 | C | C", "G | D | G"], repeat: 2 },
      { name: "Chorus", lines: ["G | D | Em | G", "G | D | G"] },
      { name: "Bridge", lines: ["C | C | G | G", "C | C | G | D"] },
      { name: "Verse", lines: ["G | D | D7 | G", "G | G7 | C | C", "G | D | G"] },
      { name: "Chorus", lines: ["G | D | Em | G", "G | D | G"], repeat: 2 }
    ]
  },
  {
    id: "yesterday",
    title: "Yesterday",
    album: "Help!",
    year: 1965,
    key: "G",
    capo: 0,
    originalKey: "F",
    tuning: "On the record the guitar is tuned down a whole step (D G C F A D), so G-shapes sound in F. In standard tuning it simply sounds a bit higher.",
    bpm: 96,
    level: 3,
    strum: "D-D-DUDU",
    tips: [
      "A stretch goal: F#m7 and B7 come fast after G. Practise G → F#m7 → B7 → Em on its own.",
      "F#m7 here is the easy 4-string version (index finger flat across fret 2).",
      "Try gentle fingerpicking instead of strumming: thumb on the bass note, then fingers on the top 3 strings."
    ],
    sections: [
      { name: "Verse", lines: ["G | F#m7 B7 | Em | Em", "C D7 | G | Em A | C G"], repeat: 2 },
      { name: "Bridge", lines: ["F#m7 B7 | Em D | C | Am D | G"], repeat: 2 },
      { name: "Verse", lines: ["G | F#m7 B7 | Em | Em", "C D7 | G | Em A | C G"] },
      { name: "Outro", lines: ["Em A | C G"] }
    ]
  }
];

const ARTIST = {
  name: "The Beatles",
  id: "the-beatles",
  blurb: "Liverpool, 1960–1970. Simple chords, unforgettable songs — the perfect place to start on acoustic guitar."
};

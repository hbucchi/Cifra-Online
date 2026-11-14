/*
 * Public-domain songs: full lyrics with inline chords (ChordPro style).
 *
 * Only texts that are out of copyright are included: traditional songs, or
 * songs whose authors died more than 70 years ago (Brazil: life + 70 years,
 * Lei 9.610/98, art. 41). Modern arrangements/translations are NOT used.
 *
 * Lyrics format: "[C]word" puts the chord C above "word"; lines starting
 * with "#" are section titles.
 * strum: 8 slots for 4/4, 6 slots for 3/4 ("1 & 2 & 3 &").
 */
const PD_SONGS = [
  {
    id: "amazing-grace",
    artist: "folk-classics",
    title: "Amazing Grace",
    author: "John Newton (lyrics, 1779) · traditional melody",
    key: "G", capo: 0, originalKey: "G", bpm: 80, level: 1,
    timeSig: "3/4", strum: "D-DUDU",
    tips: [
      "A waltz: count 1-2-3, 1-2-3. Strum a strong down-strum on '1'.",
      "G → G7 only changes one note — move your finger from the 3rd fret to the 1st fret of the high E string.",
      "Every verse uses exactly the same chords."
    ],
    lyrics: `# Verse 1
A[G]mazing grace, how [G7]sweet the [C]sound
That [G]saved a wretch like [D]me
I [G]once was lost, but [G7]now am [C]found
Was [G]blind, but [D]now I [G]see

# Verse 2
'Twas [G]grace that taught my [G7]heart to [C]fear
And [G]grace my fears re[D]lieved
How [G]precious did that [G7]grace ap[C]pear
The [G]hour I [D]first be[G]lieved

# Verse 3
Through [G]many dangers, [G7]toils and [C]snares
I [G]have already [D]come
'Tis [G]grace hath brought me [G7]safe thus [C]far
And [G]grace will [D]lead me [G]home

# Verse 4
When [G]we've been there ten [G7]thousand [C]years
Bright [G]shining as the [D]sun
We've [G]no less days to [G7]sing God's [C]praise
Than [G]when we'd [D]first be[G]gun`
  },
  {
    id: "oh-susanna",
    artist: "folk-classics",
    title: "Oh! Susanna",
    author: "Stephen Foster, 1848",
    key: "C", capo: 0, originalKey: "C", bpm: 110, level: 1,
    strum: "D-DUD-DU",
    tips: [
      "Only three chords: C, F and G7.",
      "Most of the song is C ↔ G7. Practise that switch until you don't need to look.",
      "Bouncy and cheerful — keep the strum light."
    ],
    lyrics: `# Verse 1
I [C]come from Alabama with my [G7]banjo on my knee
I'm [C]going to Louisiana, my [G7]true love for to [C]see
It [C]rained all night the day I left, the [G7]weather it was dry
The [C]sun so hot I froze to death, Su[G7]sanna, don't you [C]cry

# Chorus
[F]Oh! Susanna, oh [C]don't you cry for [G7]me
For I [C]come from Alabama with my [G7]banjo on my [C]knee

# Verse 2
I [C]had a dream the other night when [G7]everything was still
I [C]thought I saw Susanna a-[G7]coming down the [C]hill
The [C]buckwheat cake was in her mouth, the [G7]tear was in her eye
Says [C]I, I'm coming from the south, Su[G7]sanna, don't you [C]cry

# Chorus
[F]Oh! Susanna, oh [C]don't you cry for [G7]me
For I [C]come from Alabama with my [G7]banjo on my [C]knee`
  },
  {
    id: "when-the-saints",
    artist: "folk-classics",
    title: "When the Saints Go Marching In",
    author: "Traditional (spiritual)",
    key: "C", capo: 0, originalKey: "C", bpm: 120, level: 1,
    strum: "D-DUD-DU",
    tips: [
      "C, F, G7 — plus C7 as a 'bridge' into F. C7 adds your pinky to the C shape.",
      "Great for practising changes in time: sing slowly and change exactly on the word."
    ],
    lyrics: `# Verse 1
Oh when the [C]saints go marching in
Oh when the saints go marching [G7]in
Oh Lord, I [C]want to [C7]be in that [F]number
When the [C]saints go [G7]marching [C]in

# Verse 2
Oh when the [C]sun refuse to shine
Oh when the sun refuse to [G7]shine
Oh Lord, I [C]want to [C7]be in that [F]number
When the [C]sun re[G7]fuse to [C]shine

# Verse 3
Oh when the [C]trumpet sounds the call
Oh when the trumpet sounds the [G7]call
Oh Lord, I [C]want to [C7]be in that [F]number
When the [C]trumpet [G7]sounds the [C]call

# Verse 1 (again)
Oh when the [C]saints go marching in
Oh when the saints go marching [G7]in
Oh Lord, I [C]want to [C7]be in that [F]number
When the [C]saints go [G7]marching [C]in`
  },
  {
    id: "my-bonnie",
    artist: "folk-classics",
    title: "My Bonnie Lies Over the Ocean",
    author: "Traditional (Scottish)",
    key: "G", capo: 0, originalKey: "G", bpm: 100, level: 1,
    timeSig: "3/4", strum: "D-DUDU",
    tips: [
      "The Beatles recorded this song with Tony Sheridan in 1961 — these are the traditional words.",
      "Waltz time: 1-2-3. A7 → D is a nice new change to learn.",
      "D7 → G 'resolves' — your ear hears it as coming home."
    ],
    lyrics: `# Verse 1
My [G]Bonnie lies [C]over the [G]ocean
My [G]Bonnie lies [A7]over the [D]sea
My [G]Bonnie lies [C]over the [G]ocean
Oh [C]bring back my [D7]Bonnie to [G]me

# Chorus
[G]Bring back, [C]bring back
Oh [D7]bring back my Bonnie to [G]me, to me
[G]Bring back, [C]bring back
Oh [D7]bring back my Bonnie to [G]me

# Verse 2
Last [G]night as I [C]lay on my [G]pillow
Last [G]night as I [A7]lay on my [D]bed
Last [G]night as I [C]lay on my [G]pillow
I [C]dreamt that my [D7]Bonnie was [G]dead

# Verse 3
Oh [G]blow ye winds [C]over the [G]ocean
And [G]blow ye winds [A7]over the [D]sea
Oh [G]blow ye winds [C]over the [G]ocean
And [C]bring back my [D7]Bonnie to [G]me

# Verse 4
The [G]winds have blown [C]over the [G]ocean
The [G]winds have blown [A7]over the [D]sea
The [G]winds have blown [C]over the [G]ocean
And [C]brought back my [D7]Bonnie to [G]me`
  },
  {
    id: "scarborough-fair",
    artist: "folk-classics",
    title: "Scarborough Fair",
    author: "Traditional (English ballad)",
    key: "Am", capo: 0, originalKey: "Am", bpm: 92, level: 2,
    timeSig: "3/4", strum: "D-D-D-",
    tips: [
      "These are the old traditional verses (not a modern arrangement).",
      "Minor key, slow and gentle — try fingerpicking: thumb on the bass, then 3 fingers up.",
      "Am → D: lift your fingers together and keep your wrist relaxed."
    ],
    lyrics: `# Verse 1
[Am]Are you going to [G]Scarborough [Am]Fair?
[C]Parsley, [Am]sage, rose[D]mary and [Am]thyme
Re[Am]member me [C]to one who [G]lives there
For [Am]once she was a [G]true love of [Am]mine

# Verse 2
[Am]Tell her to make me a [G]cambric [Am]shirt
[C]Parsley, [Am]sage, rose[D]mary and [Am]thyme
With[Am]out any [C]seam or [G]needlework
And [Am]then she shall be a [G]true love of [Am]mine

# Verse 3
[Am]Tell her to wash it in [G]yonder dry [Am]well
[C]Parsley, [Am]sage, rose[D]mary and [Am]thyme
Where [Am]water ne'er [C]sprung, nor [G]drop of rain fell
And [Am]then she shall be a [G]true love of [Am]mine

# Verse 4
[Am]Tell her to dry it on [G]yonder [Am]thorn
[C]Parsley, [Am]sage, rose[D]mary and [Am]thyme
Which [Am]never bore [C]blossom since [G]Adam was born
And [Am]then she shall be a [G]true love of [Am]mine`
  },
  {
    id: "greensleeves",
    artist: "folk-classics",
    title: "Greensleeves",
    author: "Traditional (England, 16th century)",
    key: "Am", capo: 0, originalKey: "Am", bpm: 96, level: 2,
    timeSig: "3/4", strum: "D-DUDU",
    tips: [
      "Over 400 years old! Am, G, F, E and C.",
      "E (major) in a song in A minor gives that 'ancient' sound — it pulls strongly back to Am.",
      "F is the mini-F: just four strings."
    ],
    lyrics: `# Verse 1
A[Am]las, my [G]love, you [F]do me [E]wrong
To [Am]cast me [G]off dis[E]courteously
For [Am]I have [G]loved you [F]well and [E]long
De[Am]lighting [E]in your [Am]company

# Chorus
[C]Greensleeves was [G]all my joy
[Am]Greensleeves was [E]my delight
[C]Greensleeves was my [G]heart of gold
And [Am]who but my [E]lady [Am]Greensleeves

# Verse 2
I [Am]have been [G]ready [F]at your [E]hand
To [Am]grant what[G]ever [E]you would crave
I [Am]have both [G]wagered [F]life and [E]land
Your [Am]love and [E]good-will [Am]for to have

# Chorus
[C]Greensleeves was [G]all my joy
[Am]Greensleeves was [E]my delight
[C]Greensleeves was my [G]heart of gold
And [Am]who but my [E]lady [Am]Greensleeves`
  },
  {
    id: "danny-boy",
    artist: "folk-classics",
    title: "Danny Boy",
    author: "Frederic Weatherly (lyrics, 1913) · melody: Londonderry Air (traditional)",
    key: "C", capo: 0, originalKey: "C", bpm: 70, level: 3,
    strum: "D-D-DUDU",
    tips: [
      "A stretch goal: more chords (C7, D7, Am) and a wide melody.",
      "Play slowly and let each chord ring. Fingerpicking sounds beautiful here.",
      "D7 → G: a 'secondary dominant' — it makes G feel like a temporary home."
    ],
    lyrics: `# Verse 1
Oh [C]Danny boy, the [C7]pipes, the [F]pipes are [C]calling
From glen to [Am]glen, and [D7]down the mountain [G]side
The [C]summer's gone, and [C7]all the [F]roses [C]falling
'Tis [C]you, 'tis [Am]you must [G7]go and I must [C]bide
But come ye [F]back when [G]summer's in the [C]meadow
Or [Am]when the valley's [F]hushed and white with [G]snow
'Tis I'll be [C]here in [C7]sunshine or in [F]shadow
Oh Danny [C]boy, oh [Am]Danny [G7]boy, I love you [C]so

# Verse 2
But [C]when ye come, and [C7]all the [F]flowers are [C]dying
If I am [Am]dead, as [D7]dead I well may [G]be
Ye'll [C]come and find the [C7]place where [F]I am [C]lying
And [C]kneel and [Am]say an [G7]Ave there for [C]me
And I shall [F]hear, though [G]soft you tread a[C]bove me
And [Am]all my grave will [F]warmer, sweeter [G]be
For you will [C]bend and [C7]tell me that you [F]love me
And I shall [C]sleep in [Am]peace un[G7]til you come to [C]me`
  },

  /* ---------- Brasil: domínio público ---------- */
  {
    id: "ciranda-cirandinha",
    artist: "brasil-dominio-publico",
    title: "Ciranda, Cirandinha",
    author: "Tradicional (cantiga de roda)",
    key: "C", capo: 0, originalKey: "C", bpm: 104, level: 1,
    strum: "D-DUD-DU",
    tips: [
      "Only two chords: C and G7. A perfect very first song.",
      "C → G7: your fingers move in the same 'direction' — practise it slowly 10 times."
    ],
    lyrics: `# Refrão
[C]Ciranda, cirandinha, vamos todos ciran[G7]dar
Vamos dar a meia volta, volta e meia vamos [C]dar

# Estrofe 1
O a[C]nel que tu me deste era vidro e se que[G7]brou
O amor que tu me tinhas era pouco e se aca[C]bou

# Refrão
[C]Ciranda, cirandinha, vamos todos ciran[G7]dar
Vamos dar a meia volta, volta e meia vamos [C]dar

# Estrofe 2
Por [C]isso, dona Rosa, entre dentro desta [G7]roda
Diga um verso bem bonito, diga adeus e vá-se em[C]bora`
  },
  {
    id: "peixe-vivo",
    artist: "brasil-dominio-publico",
    title: "Peixe Vivo",
    author: "Tradicional (Minas Gerais)",
    key: "G", capo: 0, originalKey: "G", bpm: 92, level: 1,
    strum: "D-DU-UDU",
    tips: [
      "G, G7, C and D7 — the same 'family' of chords as many Beatles songs.",
      "The line 'sem a tua...' repeats D7 → G three times: great practice for that change."
    ],
    lyrics: `# Estrofe 1
Como [G]pode um peixe vivo
Viver [D7]fora da água [G]fria?
Como [G]pode um peixe vivo
Viver [D7]fora da água [G]fria?
Como pode[G7]rei vi[C]ver
Como pode[D7]rei vi[G]ver
Sem a [D7]tua, sem a [G]tua
Sem a [D7]tua compa[G]nhia?

# Estrofe 2
Os pas[G]tores desta aldeia
Já me [D7]fazem zomba[G]ria
Os pas[G]tores desta aldeia
Já me [D7]fazem zomba[G]ria
Por me [G7]verem as[C]sim cho[C]rando
Por me [D7]verem as[G]sim cho[G]rando
Sem a [D7]tua, sem a [G]tua
Sem a [D7]tua compa[G]nhia`
  },
  {
    id: "o-abre-alas",
    artist: "brasil-dominio-publico",
    title: "Ó Abre Alas",
    author: "Chiquinha Gonzaga, 1899",
    key: "C", capo: 0, originalKey: "C", bpm: 120, level: 1,
    strum: "D-DUD-DU",
    tips: [
      "The first carnival marchinha ever written! Chiquinha Gonzaga died in 1935, so it is public domain.",
      "Two chords (C and G7) and a strong, marching strum."
    ],
    lyrics: `# Marcha
Ó abre [C]alas, que eu quero pas[G7]sar
Ó abre [G7]alas, que eu quero pas[C]sar
Eu sou da [C]Lira, não posso ne[G7]gar
Eu sou da [G7]Lira, não posso ne[C]gar

# Marcha
Ó abre [C]alas, que eu quero pas[G7]sar
Ó abre [G7]alas, que eu quero pas[C]sar
Rosa de [C]Ouro é que vai ga[G7]nhar
Rosa de [G7]Ouro é que vai ga[C]nhar`
  }
];

PD_SONGS.forEach(s => { s.publicDomain = true; });
SONGS.push(...PD_SONGS);

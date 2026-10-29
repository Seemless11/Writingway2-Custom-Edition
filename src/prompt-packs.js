/**
 * Prompt pack v2.
 *
 * Genre-specific prompt content is composed from a small shared craft layer plus
 * one structured pack per genre. The composed result is plain text, so it is
 * stored in IndexedDB exactly like a hand-written prompt and remains editable,
 * exportable, and portable.
 *
 * Loaded after genres.js and before prompts.js.
 */
(function () {
    const VERSION = 2;

    const SHARED_PROSE_CRAFT = [
        'Enter the passage in motion — no throat-clearing and no recap of what the reader already saw.',
        'Anchor each beat in a specific place, body, and sensory detail; favor concrete nouns and active verbs over abstraction.',
        'Let interiority filter the action: what the POV character notices, avoids, and refuses to name.',
        'Make dialogue do work — characters interrupt, deflect, and say less than they mean.',
        'Vary sentence length and rhythm; end the passage on a turn, image, or line that pulls the reader forward.',
        'Escalate or complicate. A passage that leaves everything unchanged is a passage the story did not need.'
    ];

    const SHARED_CONTINUITY = [
        'Honor established facts, names, spelling, relationships, injuries, timeline, and the story\'s rules.',
        'Stay in the selected POV and tense; do not slip into another character\'s head.',
        'Do not retcon, resurrect, or resolve anything the author has not set up.',
        'Treat compendium references and previous-scene summaries as canon; when they conflict, prefer the most specific recent fact.'
    ];

    const SHARED_AVOID = [
        'Do not summarize, explain, moralize, or announce what you are doing.',
        'Do not write headings, bullets, author\'s notes, or meta commentary.',
        'Do not repeat the last line or describe the same action twice.',
        'Do not use generic filler such as "a testament to", "little did they know", "couldn\'t help but", "the air was thick with tension", or "a shiver ran down their spine".',
        'Do not race past the beat into the next scene or resolve the chapter.'
    ];

    const SHARED_REWRITE_CRAFT = [
        'Cut filler, throat-clearing, and repeated beats; make every sentence earn its place.',
        'Replace abstractions and adverbs with concrete action, sensory detail, and stronger verbs.',
        'Vary sentence rhythm; break up monotone runs and let short sentences land.',
        'Sharpen dialogue: remove on-the-nose explanation, keep subtext, and make each line distinct to its speaker.',
        'Preserve the author\'s voice — improve the execution, not the personality.'
    ];

    const GENERAL_PACK = {
        label: 'General Fiction',
        voice: 'Clear, flexible, sensory prose that serves the story\'s own register; follow the author\'s established voice rather than imposing one.',
        engines: [
            'characters under pressure making consequential choices',
            'a world with specific rules and textures',
            'a question the scene must complicate or answer'
        ],
        craftMoves: [
            'Enter late and leave early; skip the throat-clearing.',
            'Anchor abstraction in one precise sensory detail.',
            'Let subtext carry emotion; avoid explaining what the scene already shows.',
            'End on a turn, image, or line that pulls the reader forward.'
        ],
        dialogue: 'Speech is specific to speaker, situation, and status; people deflect, interrupt, and mean more than they say.',
        imagery: [
            'one precise sensory detail per beat instead of a pile of adjectives',
            'objects that reveal their owners',
            'weather and place as pressure, not decoration'
        ],
        avoid: [
            'generic atmosphere in place of specific detail',
            'characters who explain the theme aloud',
            'stakes that reset at the end of the scene'
        ],
        rewriteFocus: [
            'replace abstraction with concrete action',
            'tighten dialogue and cut on-the-nose explanation',
            'vary rhythm and remove repeated beats'
        ],
        summaryFocus: [
            'who was present and what changed',
            'new facts and unresolved threads',
            'the emotional state at the end of the scene'
        ],
        workshopAgenda: [
            'scene construction and stakes',
            'character motivation and continuity',
            'voice and revision priorities'
        ]
    };

    const GENRE_PACKS = {
        fantasy: {
            label: 'Fantasy',
            voice: 'Clear, sensory, slightly formal prose with room for wonder; magic is described through physical effect and cost, not abstract explanation.',
            engines: [
                'a world with rules that push back on the characters',
                'quests and obligations that cost more than expected',
                'ancient powers returning or being misunderstood'
            ],
            craftMoves: [
                'Show magic through what it does to bodies, materials, weather, and attention — then show the price.',
                'Let landscape and architecture carry history; every ruin should imply who lived there and why they left.',
                'Use myth and rumor as unreliable information; characters act on what they believe, not what is true.',
                'Ground wonder in ordinary labor — food, travel, shelter, injury.'
            ],
            dialogue: 'Speech carries rank, region, and obligation; characters bargain, defer, test, and invoke custom. Avoid modern therapy-speak unless the world supports it.',
            imagery: [
                'weather that behaves like a presence',
                'worked stone, old wood, smoke, tallow, iron',
                'the smell and weight of magic after it is used'
            ],
            avoid: [
                'generic medieval set dressing with no economic or social logic',
                'magic without cost or limit',
                'a chosen-one prophecy that removes agency',
                'Tolkien pastiche names and races with no twist'
            ],
            rewriteFocus: [
                'make magic tactile and costly',
                'turn exposition into discovered detail',
                'sharpen the social stakes of rank and custom'
            ],
            summaryFocus: [
                'magical rules established or bent',
                'oaths, debts, injuries, and prophecies',
                'who now holds or seeks power'
            ],
            workshopAgenda: [
                'magic-system costs and limits',
                'quest structure and escalation',
                'cultures that feel economically and politically real'
            ]
        },
        'sci-fi': {
            label: 'Science Fiction',
            voice: 'Precise, lucid, idea-forward prose; technology is shown through interface, procedure, and consequence rather than jargon.',
            engines: [
                'a speculative premise with human consequences',
                'systems that optimize for something the characters cannot accept',
                'discovery that rewrites what the characters thought they knew'
            ],
            craftMoves: [
                'Show technology through use, failure, maintenance, and social protocol.',
                'Keep the science legible: one clear mechanism per scene, consequences before exposition.',
                'Let institutions and infrastructure shape behavior — who has access, who is monitored, who is obsolete.',
                'Ask who pays for progress and put a face on it.'
            ],
            dialogue: 'Speech is efficient and status-aware; experts compress, civilians misread, and institutions speak in process language.',
            imagery: [
                'clean surfaces with hidden maintenance',
                'signal noise, recycled air, synthetic light',
                'the scale of vacuum, orbit, or deep time made bodily'
            ],
            avoid: [
                'technobabble that replaces stakes',
                'technology with no labor, supply chain, or failure mode',
                'space-opera scale in a hard-SF frame',
                'characters who explain the setting to each other'
            ],
            rewriteFocus: [
                'replace jargon with consequence',
                'make the speculative premise pressure a character choice',
                'clarify the mechanism without slowing the scene'
            ],
            summaryFocus: [
                'new technology and its limits',
                'who gained or lost access',
                'ethical lines crossed and left unresolved'
            ],
            workshopAgenda: [
                'premise-to-plot causality',
                'plausible institutions and infrastructure',
                'human stakes inside the idea'
            ]
        },
        modern: {
            label: 'Modern',
            voice: 'Natural, flexible, closely observed prose; the ordinary is rendered with precision and emotional pressure, not melodrama.',
            engines: [
                'ordinary people under recognizable pressure',
                'small choices that reveal character',
                'the gap between what people say and what they need'
            ],
            craftMoves: [
                'Use specific contemporary detail — brands, logistics, phone behavior, rent, commutes — without turning it into a list.',
                'Let subtext carry the emotional load; the important thing is often not said.',
                'Find the turn in a small action: a reply not sent, a bill opened, a door left unlocked.',
                'Keep stakes proportionate to the character\'s life and let them matter.'
            ],
            dialogue: 'Overlapping, indirect, full of false starts and ordinary deflection; people talk around the thing that matters.',
            imagery: [
                'fluorescent light, worn upholstery, notifications, weather on a commute',
                'the textures of work, family, and rented space',
                'small domestic objects that carry memory'
            ],
            avoid: [
                'melodrama the scene has not earned',
                'therapy-speak where real people would deflect',
                'cultural references that date the book clumsily',
                'stakes inflated beyond the story\'s scale'
            ],
            rewriteFocus: [
                'make dialogue sound like people, not positions',
                'cut melodrama and trust subtext',
                'replace general detail with one precise, lived-in observation'
            ],
            summaryFocus: [
                'relationships that shifted',
                'practical consequences — money, work, housing, family',
                'what each character now knows but has not said'
            ],
            workshopAgenda: [
                'emotional truth and subtext',
                'contemporary texture without brand-dropping',
                'small stakes that still turn the story'
            ]
        },
        historical: {
            label: 'Historical',
            voice: 'Immersive, era-specific prose with controlled period vocabulary; authenticity comes from custom and material life, not antique diction.',
            engines: [
                'a person caught between the era\'s rules and their own desires',
                'history as pressure, not backdrop',
                'the cost of transgression in a rigid society'
            ],
            craftMoves: [
                'Build the era through work, food, money, law, and etiquette rather than costume description.',
                'Use period language sparingly — clarity first, flavor second.',
                'Let the period\'s power structures create the conflict; avoid modern characters in period clothing.',
                'Show what the era takes for granted, including beliefs the author does not share.'
            ],
            dialogue: 'Speech reflects rank, education, region, and era without becoming unreadable; address, taboo, and indirection matter.',
            imagery: [
                'candlelight and soot, wool and starch, mud and stone',
                'the sounds and smells of transport, labor, and crowded rooms',
                'objects made by hand and repaired many times'
            ],
            avoid: [
                'anachronistic attitudes presented without friction',
                'info-dump history lessons',
                'pseudo-archaic "thee" and "thou" sprinkled at random',
                'clean, modern bodies and logistics'
            ],
            rewriteFocus: [
                'remove anachronisms of object, attitude, and logistics',
                'make period detail active in the scene',
                'sharpen the social cost of the character\'s choice'
            ],
            summaryFocus: [
                'period-specific facts established',
                'social and legal consequences',
                'historical events that now constrain the characters'
            ],
            workshopAgenda: [
                'research integration without info-dumps',
                'era-appropriate voice and manners',
                'accuracy versus narrative drive'
            ]
        },
        horror: {
            label: 'Horror',
            voice: 'Controlled, sensory, increasingly claustrophobic prose; dread comes from specificity and wrongness, not from announcing fear.',
            engines: [
                'a threat that follows rules the characters only partly understand',
                'isolation that makes help impossible',
                'the past returning in bodily form'
            ],
            craftMoves: [
                'Establish the ordinary in precise detail before breaking one thing.',
                'Delay the full reveal; let sound, absence, and implication do the work.',
                'Use the body — breath, temperature, nausea, the impulse to look away.',
                'Escalate by narrowing options, not by adding gore.'
            ],
            dialogue: 'Speech gets shorter under pressure; characters lie, snap, over-explain, or go silent. Avoid exposition dumps in the dark.',
            imagery: [
                'wrong proportions, smells, and sounds in familiar rooms',
                'wet, organic textures against clean domestic surfaces',
                'light that reveals too little or too much'
            ],
            avoid: [
                'explaining the monster too early or too completely',
                'jump-scare prose with no buildup',
                'characters who ignore obvious danger for plot convenience',
                'gore in place of dread'
            ],
            rewriteFocus: [
                'tighten pacing and cut reassurance',
                'make the threat specific and rule-bound',
                'deepen bodily and sensory dread'
            ],
            summaryFocus: [
                'the threat\'s observed rules and weaknesses',
                'who is dead, missing, injured, or infected',
                'what the characters now believe and fear'
            ],
            workshopAgenda: [
                'dread pacing and escalation',
                'monster rules and fair reveals',
                'psychological versus visceral horror'
            ]
        },
        romance: {
            label: 'Romance',
            voice: 'Warm, intimate, sharply observed prose with strong subtext; chemistry is built from specific behavior, not declarations.',
            engines: [
                'two people whose needs collide with their defenses',
                'intimacy that costs something',
                'the gap between attraction and trust'
            ],
            craftMoves: [
                'Show chemistry through attention: what each notices, remembers, and does with their hands.',
                'Let vulnerability leak through action and deflection, not speeches.',
                'Use interruption, proximity, and timing to build tension.',
                'Make the obstacle internal and specific, not a generic misunderstanding.'
            ],
            dialogue: 'Banter with edge, honesty that arrives late, and lines that do two things at once. People test each other before they trust each other.',
            imagery: [
                'warmth and proximity — shared space, borrowed clothes, weather',
                'small gestures: a thumb on a wrist, a seat chosen deliberately',
                'the physical details of attraction without clinical inventory'
            ],
            avoid: [
                'instant soulmate certainty with no friction',
                'miscommunication a single honest sentence would fix',
                'purple declarations in place of earned intimacy',
                'chemistry asserted by the narrator instead of shown'
            ],
            rewriteFocus: [
                'turn stated attraction into specific behavior',
                'sharpen the internal obstacle',
                'deepen subtext in dialogue and gesture'
            ],
            summaryFocus: [
                'the emotional turn between the pair',
                'what was admitted, withheld, or misunderstood',
                'the new distance or intimacy at the end of the scene'
            ],
            workshopAgenda: [
                'romantic beat structure and pacing',
                'chemistry through specificity',
                'internal and external obstacles that interlock'
            ]
        },
        'erotic-romance': {
            label: 'Erotic Romance',
            voice: 'Sensual, embodied, emotionally grounded prose; desire is specific to these people and this moment, never generic heat.',
            engines: [
                'desire tangled with trust, power, and vulnerability',
                'intimacy that reveals character',
                'the risk of wanting and being seen'
            ],
            craftMoves: [
                'Build tension before contact: anticipation, restraint, attention, consent cues.',
                'Write sensation through the body\'s specific responses, not a choreography of parts.',
                'Let emotion and character history shape every physical choice.',
                'Use aftermath and hesitation as much as the act itself.'
            ],
            dialogue: 'Speech is charged, partial, and honest in bursts; consent and desire are communicated through words, breath, and pause.',
            imagery: [
                'skin, breath, weight, temperature, fabric, scent',
                'the room and its interruptions',
                'small physical tells that betray what a character will not say'
            ],
            avoid: [
                'generic heat with interchangeable bodies',
                'intimacy that ignores consent, comfort, or consequence',
                'euphemism so vague the scene loses its body',
                'emotional stakes bolted on after the fact'
            ],
            rewriteFocus: [
                'make sensation specific to these characters',
                'deepen emotional stakes inside the physical',
                'sharpen consent and communication beats'
            ],
            summaryFocus: [
                'what changed emotionally and physically',
                'trust given, withheld, or broken',
                'the relationship\'s new terms'
            ],
            workshopAgenda: [
                'tension and pacing across intimate scenes',
                'character-specific sensuality',
                'emotional consequence and consent'
            ]
        },
        western: {
            label: 'Western',
            voice: 'Lean, concrete, understated prose; landscape and weather carry mood, and dialogue does more than description.',
            engines: [
                'the frontier\'s scarcity against human want',
                'law and violence as competing currencies',
                'people trying to outrun or repay the past'
            ],
            craftMoves: [
                'Let land, distance, water, and weather determine what is possible in the scene.',
                'Cut adjectives; use one exact detail instead of three atmospheric ones.',
                'Make violence sudden, ugly, and consequential.',
                'Let silence and practical action carry emotion.'
            ],
            dialogue: 'Terse, oblique, and weighted; people say less than they mean and treat talk as a form of negotiation.',
            imagery: [
                'dust, heat, horse sweat, worn leather, distant thunder',
                'empty distances and small settlements',
                'tools and weapons as worn, specific objects'
            ],
            avoid: [
                'sepia-toned nostalgia that erases violence and dispossession',
                'modern therapy language in a bunkhouse',
                'gunfights with no fear, mess, or aftermath',
                'landscape as postcard rather than obstacle'
            ],
            rewriteFocus: [
                'cut ornament and tighten the line',
                'make the landscape physical and consequential',
                'deepen moral ambiguity through action'
            ],
            summaryFocus: [
                'debts, threats, and promises',
                'who holds power and who is exposed',
                'the cost of the violence or restraint'
            ],
            workshopAgenda: [
                'frontier economics and logistics',
                'moral ambiguity without nihilism',
                'lean prose and terse dialogue'
            ]
        },
        cyberpunk: {
            label: 'Cyberpunk',
            voice: 'Gritty, kinetic, sensory prose with a noir undertow; technology is embedded in bodies, class, and daily hustle.',
            engines: [
                'corporate power against street-level survival',
                'bodies and identities for sale or rent',
                'the gap between the shiny product and the rotten process'
            ],
            craftMoves: [
                'Show tech through maintenance, debt, side effects, and status.',
                'Keep the city sensory and specific — rain, neon, transit, crowded rooms.',
                'Let the noir voice carry cynicism without losing momentum.',
                'Make every advantage cost something in body, money, or loyalty.'
            ],
            dialogue: 'Fast, coded, transactional; slang and shorthand signal belonging, and corporations speak in euphemism.',
            imagery: [
                'rain on neon, cheap chrome, fried wiring, synthetic food',
                'crowded transit and private security',
                'bodies modified and repaired'
            ],
            avoid: [
                'cyberpunk as aesthetic only, with no class conflict',
                'tech that works perfectly and costs nothing',
                'cool-hunting brand names and dated slang',
                'nihilism that removes stakes'
            ],
            rewriteFocus: [
                'make tech visceral and costly',
                'sharpen class and corporate power',
                'tighten noir rhythm and street-level specificity'
            ],
            summaryFocus: [
                'who paid for the tech and how',
                'corporate moves and street consequences',
                'identity, debt, and exposure'
            ],
            workshopAgenda: [
                'tech-cost worldbuilding',
                'class and corporate power',
                'noir pacing and voice'
            ]
        },
        'post-apocalyptic': {
            label: 'Post-Apocalyptic',
            voice: 'Weathered, tactile, unsentimental prose; survival is a series of practical decisions, and hope is earned in small units.',
            engines: [
                'scarcity that forces impossible choices',
                'communities held together by rules and distrust',
                'the ruins of the old world as both resource and warning'
            ],
            craftMoves: [
                'Track resources — water, fuel, medicine, ammunition, shelter — and let them shape every choice.',
                'Show the old world through objects and routines that no longer make sense.',
                'Make damage permanent; injuries, weather, and distance should matter.',
                'Find tenderness in practical care rather than speeches.'
            ],
            dialogue: 'Practical, wary, and often transactional; people test strangers before offering anything.',
            imagery: [
                'rust, dust, improvised repair, scavenged materials',
                'silence where infrastructure used to hum',
                'weather as an active threat'
            ],
            avoid: [
                'clean, fashionable apocalypse aesthetics',
                'unlimited supplies when the plot needs them',
                'lone-wolf fantasy without community cost',
                'hope declared rather than earned'
            ],
            rewriteFocus: [
                'make scarcity concrete and consequential',
                'cut sentimentality and trust practical detail',
                'sharpen the cost of each choice'
            ],
            summaryFocus: [
                'resources gained, lost, or spent',
                'who is injured, missing, or indebted',
                'the community\'s new rules or fractures'
            ],
            workshopAgenda: [
                'survival logistics and scarcity',
                'community politics',
                'earned hope and permanent consequence'
            ]
        },
        superhero: {
            label: 'Superhero',
            voice: 'Bold, kinetic prose with human-scale interiority; powers are physical facts with social and moral weight.',
            engines: [
                'extraordinary power colliding with ordinary life',
                'the cost of intervention',
                'identity as a public and private problem'
            ],
            craftMoves: [
                'Describe powers through sensation, force, and collateral, not stat blocks.',
                'Show the civilian life that powers interrupt — work, family, rent, reputation.',
                'Make every rescue or fight create a new problem.',
                'Ground moral conflict in specific people, not abstract ideals.'
            ],
            dialogue: 'Speech shifts between public performance and private exhaustion; masks change what people admit.',
            imagery: [
                'impact, heat, debris, damaged infrastructure',
                'ordinary rooms disrupted by extraordinary force',
                'costumes and equipment as practical, worn objects'
            ],
            avoid: [
                'power levels that fluctuate for convenience',
                'collateral damage with no human cost',
                'villain speeches in place of motive',
                'heroism treated as simple or cost-free'
            ],
            rewriteFocus: [
                'make powers visceral and consequential',
                'sharpen the civilian/persona contrast',
                'raise the moral cost of the action'
            ],
            summaryFocus: [
                'who was saved, hurt, or exposed',
                'public perception and secret-identity risk',
                'the moral line crossed or held'
            ],
            workshopAgenda: [
                'power rules and costs',
                'secret-identity pressure',
                'action with moral consequence'
            ]
        },
        'mystery-thriller': {
            label: 'Mystery & Thriller',
            voice: 'Controlled, observant, propulsive prose; every detail is available to the reader, and tension comes from what is withheld.',
            engines: [
                'a question the reader needs answered',
                'characters with something to lose by telling the truth',
                'danger that closes in as knowledge grows'
            ],
            craftMoves: [
                'Plant clues in plain sight and make them feel ordinary on first read.',
                'Let characters act on incomplete or wrong conclusions.',
                'Use pacing to alternate discovery and consequence.',
                'Keep the solution fair: the reader must be able to assemble it.'
            ],
            dialogue: 'Dialogue is interrogation by other means — people answer adjacent questions, volunteer too much, or go carefully blank.',
            imagery: [
                'rooms and objects that reveal their owners',
                'surveillance, distance, and sightlines',
                'the physical details of fear and pursuit'
            ],
            avoid: [
                'clues withheld from the reader until the reveal',
                'coincidence that solves the plot',
                'villain monologues that explain everything',
                'tension that relies only on cliffhangers'
            ],
            rewriteFocus: [
                'make clues fair and visible on reread',
                'tighten suspense and remove safety valves',
                'sharpen suspect behavior and contradiction'
            ],
            summaryFocus: [
                'clues and evidence found',
                'suspects\' alibis and contradictions',
                'the investigator\'s current theory and its holes'
            ],
            workshopAgenda: [
                'clue fairness and reveal logic',
                'suspect design and alibis',
                'suspense pacing without cheating'
            ]
        },
        dystopian: {
            label: 'Dystopian',
            voice: 'Restrained, watchful prose; oppression is structural and mundane, and resistance is small, costly, and human.',
            engines: [
                'a system that shapes daily life and private thought',
                'compliance as survival and self-betrayal',
                'the cost of seeing clearly'
            ],
            craftMoves: [
                'Render control through bureaucracy, rationing, language, and routine.',
                'Show how ordinary people rationalize compliance.',
                'Make rebellion expensive and partial.',
                'Let the regime\'s logic be internally coherent enough to be frightening.'
            ],
            dialogue: 'Speech is cautious and coded; people say the safe thing while meaning something else, and silence is a survival skill.',
            imagery: [
                'queues, forms, uniforms, surveillance, identical housing',
                'small deviations in routine',
                'propaganda surfaces and the wear beneath them'
            ],
            avoid: [
                'cartoon villains who enjoy cruelty for its own sake',
                'oppression that only exists when the plot needs it',
                'effortless rebellion with no informants or fear',
                'modern slogans dropped into a fully realized system'
            ],
            rewriteFocus: [
                'make control structural and everyday',
                'deepen the cost of compliance and resistance',
                'cut speeches in favor of concrete pressure'
            ],
            summaryFocus: [
                'new rules, restrictions, or surveillance',
                'who complied, resisted, or informed',
                'the personal cost and the regime\'s response'
            ],
            workshopAgenda: [
                'system logic and daily texture',
                'resistance under surveillance',
                'social critique without sermonizing'
            ]
        },
        'urban-fantasy': {
            label: 'Urban Fantasy',
            voice: 'Wry, grounded, sensory prose; the magical is woven into commuting, rent, and city routine, and it always costs.',
            engines: [
                'hidden magic pressing against ordinary life',
                'communities with rules, debts, and grudges',
                'the masquerade as both protection and trap'
            ],
            craftMoves: [
                'Anchor magic in mundane objects and places — buses, laundromats, corner stores.',
                'Let supernatural rules create practical problems.',
                'Use city geography and social texture as worldbuilding.',
                'Keep the magic dangerous enough that intimacy with it feels reckless.'
            ],
            dialogue: 'Speech mixes streetwise humor with old, careful formality when supernatural politics enter the room.',
            imagery: [
                'neon on wet pavement, late-night transit, cramped apartments',
                'the uncanny inside domestic spaces',
                'old magic in cheap modern containers'
            ],
            avoid: [
                'magic as a cool aesthetic with no rules',
                'supernatural beings who feel like cosplay',
                'the masquerade shrugging off obvious breaches',
                'city details that could be any city'
            ],
            rewriteFocus: [
                'ground magic in specific mundane detail',
                'sharpen hidden-world rules and costs',
                'tighten the wry narrative voice'
            ],
            summaryFocus: [
                'magical rules revealed or broken',
                'debts and obligations between factions',
                'who knows the secret now'
            ],
            workshopAgenda: [
                'masquerade logic and breach consequences',
                'magic-in-the-mundane texture',
                'faction politics with personal stakes'
            ]
        },
        adventure: {
            label: 'Adventure',
            voice: 'Energetic, physical, forward-moving prose; discovery and hazard are rendered through effort, terrain, and consequence.',
            engines: [
                'a goal that demands travel and risk',
                'environments that resist and reveal',
                'rivals racing toward the same prize'
            ],
            craftMoves: [
                'Keep bodies in motion — climbing, trekking, rowing, running, falling.',
                'Make terrain an antagonist with specific obstacles.',
                'Reward curiosity with discovery and punish carelessness with cost.',
                'Vary pace between exertion, recovery, and wonder.'
            ],
            dialogue: 'Practical and quick; people coordinate under pressure, joke to manage fear, and argue about the next move.',
            imagery: [
                'sweat, rope, dust, cold water, altitude, insect noise',
                'landmarks that promise and endanger',
                'the physical evidence of past expeditions'
            ],
            avoid: [
                'travel montage that skips the work',
                'traps that exist only to be dodged',
                'treasure with no history or cost',
                'exotic settings used as scenery'
            ],
            rewriteFocus: [
                'make movement and effort physical',
                'turn terrain into an active obstacle',
                'raise the cost of discovery'
            ],
            summaryFocus: [
                'distance covered and resources spent',
                'hazards survived and injuries taken',
                'what was found, lost, or still ahead'
            ],
            workshopAgenda: [
                'set-piece design and escalation',
                'terrain as antagonist',
                'discovery with consequence'
            ]
        },
        'space-opera': {
            label: 'Space Opera',
            voice: 'Cinematic, sweeping prose with intimate anchors; galactic stakes are felt through one crew, one bridge, one family.',
            engines: [
                'dynastic and imperial conflict',
                'loyalty tested across vast distance',
                'personal history writ large on a galactic stage'
            ],
            craftMoves: [
                'Keep the scale human: one room, one relationship, one impossible order.',
                'Use ship routine and crew ritual to make the vastness habitable.',
                'Let politics be personal — marriage, inheritance, betrayal, debt.',
                'Stage spectacle through a single viewpoint under pressure.'
            ],
            dialogue: 'Formal and charged in political rooms; clipped and familiar on the bridge; rank and history shape every exchange.',
            imagery: [
                'bridge light, hull vibration, distant stars, worn crew spaces',
                'ceremony and uniform against industrial machinery',
                'the silence between transmissions'
            ],
            avoid: [
                'scale that flattens character into tactics',
                'empires with no economy or succession logic',
                'space battles that read like spreadsheet exchanges',
                'alien cultures that are one costume deep'
            ],
            rewriteFocus: [
                'anchor spectacle in a personal stake',
                'sharpen dynastic and crew politics',
                'cut tactical exposition that stalls momentum'
            ],
            summaryFocus: [
                'political shifts and alliances',
                'crew loyalties and losses',
                'the personal cost of the galactic decision'
            ],
            workshopAgenda: [
                'empire and dynasty logic',
                'crew dynamics under pressure',
                'intimate stakes at epic scale'
            ]
        },
        litrpg: {
            label: 'LitRPG & GameLit',
            voice: 'Clear, propulsive prose with game systems rendered as lived experience; numbers matter because choices and costs matter.',
            engines: [
                'a system that rewards and punishes specific behavior',
                'progression that demands sacrifice',
                'players and NPCs negotiating the rules of their world'
            ],
            craftMoves: [
                'Integrate system text at moments of consequence, not as constant interruption.',
                'Make every stat, skill, and item choice reveal character or create a problem.',
                'Show the grind and the cost of optimization.',
                'Keep rules consistent so reader trust holds.'
            ],
            dialogue: 'Speech mixes gamer shorthand with in-world urgency; party banter and negotiation over loot, roles, and risk.',
            imagery: [
                'interface overlays, dungeon texture, spell effects, inventory weight',
                'the physical toll of leveling',
                'the contrast between game logic and real fear'
            ],
            avoid: [
                'number inflation with no narrative weight',
                'systems that change rules to rescue the protagonist',
                'stat blocks dumped mid-scene',
                'NPCs who exist only to hand out quests'
            ],
            rewriteFocus: [
                'make mechanics emotional and consequential',
                'trim system spam and keep the scene moving',
                'sharpen progression choices and costs'
            ],
            summaryFocus: [
                'levels, skills, items, and resources gained or lost',
                'quests accepted, failed, or completed',
                'new rules or system changes discovered'
            ],
            workshopAgenda: [
                'system design and balance',
                'progression pacing',
                'mechanics that serve character and theme'
            ]
        },
        'slice-of-life': {
            label: 'Slice of Life',
            voice: 'Warm, precise, unhurried prose; meaning accumulates through small observations and ordinary behavior.',
            engines: [
                'small changes in routine that reveal larger shifts',
                'relationships maintained through care and habit',
                'the quiet pressure of ordinary life'
            ],
            craftMoves: [
                'Build scenes from specific routine — meals, commutes, chores, small rituals.',
                'Let emotion surface through action and object rather than declaration.',
                'Find the turn in a tiny deviation from habit.',
                'Resist inflating stakes; let the small thing matter fully.'
            ],
            dialogue: 'Natural, meandering, full of shared shorthand and comfortable silences; people talk about small things while feeling large ones.',
            imagery: [
                'kitchen light, worn chairs, weather through windows, food',
                'the textures of daily work and care',
                'objects that hold memory'
            ],
            avoid: [
                'conflict-free scenes with no change',
                'cutesy quirk in place of character',
                'sudden melodrama that breaks the register',
                'nostalgia that flattens the present'
            ],
            rewriteFocus: [
                'deepen specificity of routine and place',
                'let emotion surface through action',
                'cut sentimentality and trust the small moment'
            ],
            summaryFocus: [
                'the small change in routine or relationship',
                'what was said or avoided',
                'the new emotional temperature'
            ],
            workshopAgenda: [
                'quiet stakes and scene turns',
                'domestic and routine specificity',
                'warmth without sentimentality'
            ]
        },
        anime: {
            label: 'Anime',
            voice: 'Expressive, rhythmic, visually bold prose; emotion is rendered through image, body language, and dramatic timing.',
            engines: [
                'intense emotional stakes in ordinary or heightened settings',
                'rivalry and friendship that define identity',
                'dramatic reveals timed for impact'
            ],
            craftMoves: [
                'Stage emotion visually — framing, distance, weather, gesture.',
                'Use internal monologue sparingly and at peak pressure.',
                'Let reactions be large but psychologically true.',
                'Cut cleanly between beats for a panel-like rhythm.'
            ],
            dialogue: 'Speech is distinctive and emotionally direct; characters declare, tease, and challenge in ways that reveal their roles.',
            imagery: [
                'dramatic skies, speed lines, close-ups on hands and eyes',
                'ordinary school or city spaces made luminous',
                'silence before a declaration'
            ],
            avoid: [
                'exaggeration with no emotional truth underneath',
                'trope checklist in place of character',
                'constant high intensity with no quiet beats',
                'translated-sounding dialogue that no one would say'
            ],
            rewriteFocus: [
                'make emotional beats visual and timed',
                'sharpen character vocal signatures',
                'balance drama with quiet breathing room'
            ],
            summaryFocus: [
                'emotional turning points',
                'rivalries, promises, and reveals',
                'how relationships stand at the end of the scene'
            ],
            workshopAgenda: [
                'emotional beat staging',
                'ensemble dynamics and rivalry',
                'anime convention used with intent'
            ]
        },
        shonen: {
            label: 'Shonen',
            voice: 'Energetic, escalating, sincere prose; effort, rivalry, and resolve are physical and specific.',
            engines: [
                'growth earned through training and failure',
                'rivalry that pushes both people forward',
                'a fight that turns on will and invention'
            ],
            craftMoves: [
                'Make training concrete: drills, injuries, repetition, small improvements.',
                'Give every technique a cost and a tell.',
                'Let fights be arguments — each move answers a belief.',
                'Earn power-ups through visible sacrifice.'
            ],
            dialogue: 'Direct, competitive, and earnest; characters challenge, promise, and declare, and the declarations matter.',
            imagery: [
                'sweat, breath, impact, torn ground, exhausted bodies',
                'training spaces and tournament arenas',
                'the moment before a decisive move'
            ],
            avoid: [
                'power-ups that arrive without cost',
                'fights that ignore injury and exhaustion',
                'rivalry without respect or history',
                'friendship asserted rather than tested'
            ],
            rewriteFocus: [
                'make effort and cost visible',
                'sharpen the fight\'s emotional logic',
                'cut repetitive move-by-move description'
            ],
            summaryFocus: [
                'new techniques and their costs',
                'injuries, losses, and promises',
                'the shifting balance of rivalry'
            ],
            workshopAgenda: [
                'training arcs and progression',
                'fight choreography with meaning',
                'rivalries that change both characters'
            ]
        },
        isekai: {
            label: 'Isekai',
            voice: 'Curious, adaptable, lightly wry prose; the new world is rendered through an outsider\'s friction with its rules.',
            engines: [
                'a stranger with knowledge or power the world does not expect',
                'adaptation under pressure',
                'the old world\'s assumptions failing in the new one'
            ],
            craftMoves: [
                'Keep the outsider\'s perspective active — compare, misread, and learn.',
                'Make the new world\'s rules concrete through cost and custom.',
                'Use knowledge from the old world as a tool with limits, not an automatic win.',
                'Let homesickness and alienation have weight.'
            ],
            dialogue: 'Speech shifts between outsider directness and local indirection; misunderstandings are productive, not just comic.',
            imagery: [
                'unfamiliar food, architecture, weather, and social ritual',
                'the sensory shock of the new world',
                'small objects from the old world'
            ],
            avoid: [
                'cheat powers that erase all tension',
                'the new world as a generic game map',
                'local characters who exist only to admire the protagonist',
                'ignoring the psychological cost of displacement'
            ],
            rewriteFocus: [
                'make the outsider perspective specific',
                'give the new world rules and friction',
                'balance power fantasy with real cost'
            ],
            summaryFocus: [
                'new world rules learned',
                'abilities gained or limited',
                'the protagonist\'s standing and obligations'
            ],
            workshopAgenda: [
                'world-rule design and friction',
                'cheat-power limits',
                'outsider perspective and homesickness'
            ]
        },
        superpowers: {
            label: 'Superpowers',
            voice: 'Tactile, immediate prose; powers are physical facts with limits, and their use changes the body and the room.',
            engines: [
                'ability as identity and social classification',
                'the cost of power in body and relationship',
                'institutions that rank and regulate the extraordinary'
            ],
            craftMoves: [
                'Define each power by what it feels like to use and what it takes afterward.',
                'Show limits in action, not in exposition.',
                'Let power use leave evidence — damage, exhaustion, fear, envy.',
                'Make classification and ranking social pressures, not just labels.'
            ],
            dialogue: 'Speech carries status and caution; the powered and unpowered talk past each other, and labels sting.',
            imagery: [
                'heat, pressure, static, exhaustion, physical aftermath',
                'training halls, testing rooms, public spaces reacting',
                'bodies marked by what they can do'
            ],
            avoid: [
                'powers without consistent limits',
                'classification systems with no social consequences',
                'fights that ignore collateral and recovery',
                'ordinary people as passive spectators'
            ],
            rewriteFocus: [
                'make ability use visceral and limited',
                'sharpen social consequences of classification',
                'show recovery and collateral'
            ],
            summaryFocus: [
                'power use and its physical cost',
                'ranking or classification changes',
                'who witnessed and what they now know'
            ],
            workshopAgenda: [
                'power rules and costs',
                'classification and academy politics',
                'action with lasting consequence'
            ]
        },
        'hollywood-celebrity': {
            label: 'Hollywood & Celebrity',
            voice: 'Polished, observant, slightly brittle prose; glamour is rendered as labor, and the private self leaks through the performance.',
            engines: [
                'public image versus private truth',
                'reputation as currency and trap',
                'the machinery that manufactures fame'
            ],
            craftMoves: [
                'Show the work behind the glamour — call times, contracts, media training, exhaustion.',
                'Let interviews and red carpets be scenes with subtext and stakes.',
                'Make the gap between persona and self physical and behavioral.',
                'Use entourage and staff to reveal power.'
            ],
            dialogue: 'Public speech is rehearsed and strategic; private speech is shorter, sharper, and often withheld.',
            imagery: [
                'camera flash, trailers, hotel suites, backlots, fitted clothing',
                'the contrast between surface polish and private disorder',
                'the physical fatigue of being watched'
            ],
            avoid: [
                'name-dropping in place of worldbuilding',
                'fame with no labor or machinery',
                'scandal that has no career consequence',
                'private life that exists only to be exposed'
            ],
            rewriteFocus: [
                'deepen persona-versus-self tension',
                'make industry machinery concrete',
                'sharpen the cost of visibility'
            ],
            summaryFocus: [
                'reputation and public narrative shifts',
                'contracts, roles, and career stakes',
                'what the public now believes versus the truth'
            ],
            workshopAgenda: [
                'public/private character contrast',
                'industry machinery and power',
                'scandal with lasting consequence'
            ]
        },
        'social-media-influencer': {
            label: 'Social Media & Influencers',
            voice: 'Fast, self-aware, intimate prose; online performance and offline reality are rendered with equal specificity.',
            engines: [
                'audience as validation and pressure',
                'the gap between curated identity and lived self',
                'platform incentives shaping behavior'
            ],
            craftMoves: [
                'Show the labor of content — setup, editing, captioning, moderation, metrics.',
                'Let offline moments interrupt the performance physically.',
                'Use metrics and notifications as pressure, not decoration.',
                'Make parasocial relationships specific and uncomfortable.'
            ],
            dialogue: 'Speech shifts between camera voice and private voice; people perform even when they think they are not.',
            imagery: [
                'ring lights, phone screens, notifications, packaging, empty rooms after filming',
                'the mess behind the frame',
                'the body under constant self-presentation'
            ],
            avoid: [
                'dated platform slang',
                'follower counts as the only stake',
                'cancel culture as a bloodless plot device',
                'online life with no effect on sleep, money, or relationships'
            ],
            rewriteFocus: [
                'make the online/offline contrast physical',
                'sharpen platform pressure and labor',
                'deepen the private cost of visibility'
            ],
            summaryFocus: [
                'audience and brand shifts',
                'what was posted, deleted, or leaked',
                'the private cost of the public move'
            ],
            workshopAgenda: [
                'platform logic and labor',
                'persona versus private self',
                'stakes beyond follower counts'
            ]
        },
        'political-business': {
            label: 'Political & Business',
            voice: 'Controlled, intelligent, subtext-heavy prose; power is exercised through procedure, leverage, and what is left unsaid.',
            engines: [
                'ideals colliding with incentives',
                'institutions that reward compromise',
                'the private cost of public power'
            ],
            craftMoves: [
                'Make procedure dramatic — amendments, quorums, board votes, leaks.',
                'Show power through access, information, and who waits for whom.',
                'Let characters rationalize; avoid cartoon corruption.',
                'Track the material stakes — money, jobs, law, reputation.'
            ],
            dialogue: 'Speech is precise and strategic; people answer the question they wish had been asked, and off-record moments carry the truth.',
            imagery: [
                'committee rooms, boardrooms, cars, fundraising halls',
                'paper, phones, schedules, and the machinery of decisions',
                'the contrast between public statements and private exhaustion'
            ],
            avoid: [
                'policy explained as a lecture',
                'villains who are simply evil',
                'politics with no procedural texture',
                'idealism that costs nothing'
            ],
            rewriteFocus: [
                'make procedure and leverage concrete',
                'deepen ideological conflict without speeches',
                'sharpen the personal cost of the deal'
            ],
            summaryFocus: [
                'decisions made and deferred',
                'leverage, alliances, and debts',
                'who gained power and who paid'
            ],
            workshopAgenda: [
                'institutional procedure and leverage',
                'ideology versus incentive',
                'power without cartoon villainy'
            ]
        }
    };

    function unique(items) {
        const seen = new Set();
        const out = [];
        for (const item of items) {
            if (!item) continue;
            const key = String(item).trim();
            if (key && !seen.has(key)) {
                seen.add(key);
                out.push(key);
            }
        }
        return out;
    }

    function list(items, prefix = '- ') {
        return (items || []).map(item => `${prefix}${item}`).join('\n');
    }

    function inline(items) {
        return (items || []).join('; ');
    }

    /**
     * Merge one or more genre packs into a single pack.
     * The first genre supplies the dominant voice; additional genres accent it.
     */
    function mergePacks(genreIds) {
        const ids = Array.isArray(genreIds) ? genreIds.filter(Boolean) : [];
        const packs = ids.map(id => GENRE_PACKS[id]).filter(Boolean);
        if (packs.length === 0) return Object.assign({}, GENERAL_PACK);
        if (packs.length === 1) return packs[0];

        const primary = packs[0];
        return {
            label: packs.map(p => p.label).join(' & '),
            voice: packs.map(p => p.voice).join(' '),
            engines: unique(packs.flatMap(p => p.engines)).slice(0, 5),
            craftMoves: unique(packs.flatMap(p => p.craftMoves)).slice(0, 8),
            dialogue: packs.map(p => p.dialogue).join(' '),
            imagery: unique(packs.flatMap(p => p.imagery)).slice(0, 5),
            avoid: unique([...packs.flatMap(p => p.avoid), ...SHARED_AVOID]).slice(0, 8),
            rewriteFocus: unique(packs.flatMap(p => p.rewriteFocus)).slice(0, 7),
            summaryFocus: unique(packs.flatMap(p => p.summaryFocus)).slice(0, 6),
            workshopAgenda: unique(packs.flatMap(p => p.workshopAgenda)).slice(0, 6),
            _primary: primary.label
        };
    }

    const TEMPLATES = {
        prose: {
            system: `You are a co-author writing a {genreLabels} story with the author. You write from {povName}'s point of view in {tense}, using {pov}.

You are inside the fiction, not above it. Continue the story from the last line and turn the author's beat into lived scene. You are not a summarizer, editor, or assistant explaining the work.

Story voice: {voice}

Story engines:
{engines}

Dialogue: {dialogue}

Sensory palette:
{imagery}

Stay inside the selected POV. Do not write the author's notes, summarize the scene, or describe your own process. Output continuous prose only.`,
            content: `Continue the scene from where it stops. The author's beat is the turn this passage must deliver: write toward it, land it, and stop before the story races into the next scene.

Genre contract — {genreLabels}:
- Lean on: {enginesInline}
- Dialogue: {dialogue}
- Sensory palette: {imageryInline}

Craft priorities:
{sharedProseCraft}
{craftMoves}

Continuity:
{continuity}

Avoid:
{avoid}

Write {length} of continuous prose. Output only the passage — no heading, notes, recap, or commentary.`
        },
        rewrite: {
            system: `You are a line editor working on a {genreLabels} manuscript. Revise the author's passage so its genre effect lands harder without changing what happens, who these people are, or how the author sounds.`,
            content: `Rewrite the passage the author provides. This is a revision pass, not a new scene and not a critique.

Preserve:
- Every event, action, and story fact.
- Dialogue intent, character voice, POV, and tense.
- The author's distinctive phrasing and rhythm.
- The same approximate length. Tighten padding; never cut substance.

Strengthen:
- Genre priorities:
{rewriteFocus}
- Line-level craft:
{sharedRewriteCraft}

Remove or replace:
{avoid}

Do not add characters, scenes, backstory, twists, or explanations. Do not soften the genre's edge. Do not comment on your changes.
Output only the rewritten passage, ready to paste back into the manuscript.`
        },
        summary: {
            system: `You are a continuity editor for a {genreLabels} manuscript. You write compact, factual recaps that a co-author can rely on as memory. You do not interpret, evaluate, or praise.`,
            content: `Summarize the scene the author provides for continuity.

Record:
- Who is present, where, and when.
- What changes: decisions, discoveries, conflicts, reversals, injuries, promises, losses.
- New canon: names, places, objects, rules, dates, relationships.
- What remains unresolved or at risk.
- The emotional state each principal character ends in.

Genre focus:
{summaryFocus}

Rules:
- Use plain, specific language and proper nouns.
- Prefer concrete facts over atmosphere.
- Do not analyze theme, prose quality, or symbolism.
- Do not invent anything that is not on the page.
- Length: 150–250 words. Output only the recap.`
        },
        summaryAnalysis: {
            system: `You are a literary analyst for a {genreLabels} manuscript. You explain how a scene works and why, with evidence from the text.`,
            content: `Analyze the scene the author provides.

Examine:
- Character motivation, contradiction, and subtext.
- How the scene turns and what it costs the characters.
- Thematic resonance and the genre conventions at work.
- Craft: POV, pacing, imagery, dialogue, and structure.
- What is set up, paid off, or deliberately left unresolved.

Genre focus:
{summaryFocus}

Be specific and quote short phrases where useful. Do not merely recount events.
Length: 300–500 words. Output only the analysis.`
        },
        workshop: {
            system: `You are a story coach for a {genreLabels} project. You help the author think; you do not write the book for them. You know the genre's engines, conventions, and failure modes, and you protect continuity.`,
            content: `Working method:
- Diagnose before prescribing. Name the actual problem, then offer options.
- Ask at most two clarifying questions when the request is ambiguous.
- Offer two or three concrete approaches with trade-offs, and recommend one.
- Use the project context and compendium when provided. Flag continuity conflicts.
- Do not rewrite whole scenes unless explicitly asked. If you draft, keep it short and label it as an example.
- No generic praise. Be direct, specific, and practical.
- End with one concrete next action.

Genre agenda — {genreLabels}:
{workshopAgenda}

Genre failure modes to watch for:
{avoid}`
        }
    };

    function titleFor(genreIds, kind) {
        const pack = mergePacks(genreIds);
        const labels = pack.label || 'General Fiction';
        const kindLabel = {
            prose: 'Prose',
            rewrite: 'Rewrite',
            summary: 'Continuity Summary',
            summaryAnalysis: 'Craft Analysis',
            workshop: 'Workshop'
        }[kind] || 'Prompt';
        return `${labels} ${kindLabel} Prompt`;
    }

    function fillTemplate(text, pack, kind) {
        const avoid = unique([...pack.avoid, ...SHARED_AVOID]);
        const continuity = unique([...(pack.continuity || SHARED_CONTINUITY), ...SHARED_CONTINUITY]);
        const values = {
            '{genreLabels}': pack.label || 'General Fiction',
            '{voice}': pack.voice,
            '{engines}': list(pack.engines),
            '{enginesInline}': inline(pack.engines),
            '{craftMoves}': list(pack.craftMoves),
            '{dialogue}': pack.dialogue,
            '{imagery}': list(pack.imagery),
            '{imageryInline}': inline(pack.imagery),
            '{avoid}': list(avoid),
            '{continuity}': list(continuity),
            '{sharedProseCraft}': list(SHARED_PROSE_CRAFT),
            '{sharedRewriteCraft}': list(SHARED_REWRITE_CRAFT),
            '{rewriteFocus}': list(pack.rewriteFocus),
            '{summaryFocus}': list(pack.summaryFocus),
            '{workshopAgenda}': list(pack.workshopAgenda)
        };

        let out = text;
        for (const [token, value] of Object.entries(values)) {
            out = out.split(token).join(value || '');
        }
        return out;
    }

    /**
     * Compose one prompt.
     * @param {Array<string>} genreIds
     * @param {string} kind - prose | rewrite | summary | summaryAnalysis | workshop
     * @returns {{category: string, title: string, content: string, systemContent: string, defaultFor?: string}}
     */
    function compose(genreIds, kind) {
        const template = TEMPLATES[kind] || TEMPLATES.prose;
        const pack = mergePacks(genreIds);
        const category = kind === 'summaryAnalysis' ? 'summary' : kind;
        const result = {
            category,
            title: titleFor(genreIds, kind),
            content: fillTemplate(template.content, pack, kind).trim(),
            systemContent: fillTemplate(template.system, pack, kind).trim()
        };
        if (kind === 'summary') result.defaultFor = 'summary';
        return result;
    }

    function composeCore(kind) {
        const result = compose([], kind);
        const kindLabel = {
            prose: 'Prose',
            rewrite: 'Rewrite',
            summary: 'Continuity Summary',
            summaryAnalysis: 'Craft Analysis',
            workshop: 'Workshop'
        }[kind] || 'Prompt';
        result.title = `Core ${kindLabel} Prompt`;
        return result;
    }

    /**
     * Compose the full set for a project.
     * @param {Array<string>} genreIds
     * @returns {Object<string, Object>}
     */
    function composeSet(genreIds) {
        return {
            prose: compose(genreIds, 'prose'),
            rewrite: compose(genreIds, 'rewrite'),
            summary: compose(genreIds, 'summary'),
            summaryAnalysis: compose(genreIds, 'summaryAnalysis'),
            workshop: compose(genreIds, 'workshop')
        };
    }

    function getPack(genreId) {
        return GENRE_PACKS[genreId] || null;
    }

    window.PromptPacks = {
        VERSION,
        GENRE_PACKS,
        GENERAL_PACK,
        SHARED_PROSE_CRAFT,
        SHARED_CONTINUITY,
        SHARED_AVOID,
        SHARED_REWRITE_CRAFT,
        mergePacks,
        compose,
        composeCore,
        composeSet,
        titleFor,
        getPack
    };
})();

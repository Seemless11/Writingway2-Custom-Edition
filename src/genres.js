(function () {
    const GENRES = [
        {
            id: 'fantasy',
            label: 'Fantasy',
            icon: '⚔️',
            promptDescriptor: 'vivid worldbuilding, magic systems, mythical creatures, ancient powers, and a sense of wonder',
            charDescription: 'This is a fantasy setting — medieval-ish technology, magic, mythical creatures, ancient powers, and grand quests. Descriptions should evoke wonder, danger, and a sense of history.',
            worldDescription: 'Build a world of magic and myth — ancient powers, mythical creatures, sprawling kingdoms, and hidden wonders. Describe geography shaped by magic, cultures built around mystical traditions, and histories written in dragonfire and prophecy.',
            scenarioDescription: 'Frame a scenario driven by quests, prophecies, magical conflicts, or the collision of kingdoms and powers. Let the stakes involve ancient magic, mythical beings, or the fate of realms.',
            extraCompendiumCategories: ['Magic Systems', 'Bestiary', 'Pantheons', 'Factions', 'Races'],
            defaultPrompts: {
                prose: {
                    title: 'Fantasy Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Maintain the established tone, style, POV, and tense. Weave in sensory worldbuilding — let the setting feel lived-in through details of magic, environment, and culture. Show how the fantastical elements affect characters\' choices and emotions. Write about {length}.',
                    systemContent: 'You are a fantasy co-author. Write vivid prose grounded in sensory worldbuilding. Describe magic, creatures, and environments with wonder and consistency. Let the fantastical feel natural within the story\'s internal logic.'
                },
                rewrite: {
                    title: 'Fantasy Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its fantasy voice. Enrich worldbuilding details, deepen the magical or mythical atmosphere, and ensure consistency with the story\'s internal rules. Keep the same plot and dialogue.',
                    systemContent: 'You are a fantasy editing assistant. Polish prose to make the fantasy setting more immersive while preserving the author\'s voice.'
                },
                summary: {
                    title: 'Fantasy Summary Prompt',
                    content: 'Analyze this fantasy scene. Examine worldbuilding reveals, magical elements, character growth through fantastical events, and how this scene advances the larger mythos or quest. Explore thematic resonance.',
                    systemContent: 'You are a fantasy literary analyst. Examine worldbuilding, magic, and mythic themes.'
                },
                workshop: {
                    title: 'Fantasy Workshop Prompt',
                    content: 'You are a fantasy writing workshop assistant. Help the author develop magic systems, build consistent world lore, create compelling mythical creatures, and craft quest narratives. Offer specific, constructive suggestions.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'sci-fi',
            label: 'Science Fiction',
            icon: '🚀',
            promptDescriptor: 'advanced technology, space travel, futuristic societies, scientific plausibility, and vast settings',
            charDescription: 'This is a science fiction setting — advanced technology, space travel, futuristic societies, and scientific possibilities. Descriptions should feel innovative, vast, and grounded in speculative realism.',
            worldDescription: 'Build a future shaped by technology, space exploration, alien life, and advanced science. Describe worlds connected by starships, societies transformed by innovation, and the vastness of space as both opportunity and threat.',
            scenarioDescription: 'Frame a scenario involving technological breakthroughs, first contact, space exploration, or societal transformation. Let the stakes be shaped by scientific discovery, alien encounters, or the consequences of progress.',
            extraCompendiumCategories: ['Technology', 'Ships & Craft', 'Planets & Locations', 'Alien Species', 'Governments'],
            defaultPrompts: {
                prose: {
                    title: 'Sci-Fi Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Ground the prose in speculative realism — make technology feel tangible and scientifically plausible. Use setting details that reflect futuristic societies, alien cultures, or advanced science. Write about {length}.',
                    systemContent: 'You are a science fiction co-author. Write prose that balances human emotion with speculative concepts. Describe technology and futuristic settings with clarity and plausibility.'
                },
                rewrite: {
                    title: 'Sci-Fi Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its science fiction voice. Enhance technological and futuristic details, ensure scientific plausibility, and deepen the speculative atmosphere. Keep the same plot and dialogue.',
                    systemContent: 'You are a sci-fi editing assistant. Polish prose to make futuristic elements feel grounded and believable.'
                },
                summary: {
                    title: 'Sci-Fi Summary Prompt',
                    content: 'Analyze this science fiction scene. Examine technological concepts, societal implications, ethical questions raised, and how the speculative elements serve the story\'s themes. Consider the human element within the futuristic setting.',
                    systemContent: 'You are a sci-fi literary analyst. Examine technology, futurism, and thematic depth.'
                },
                workshop: {
                    title: 'Sci-Fi Workshop Prompt',
                    content: 'You are a science fiction writing workshop assistant. Help the author develop believable technology, consistent futuristic societies, alien cultures, and scientifically grounded plots. Offer specific, constructive suggestions.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'modern',
            label: 'Modern',
            icon: '🏙️',
            promptDescriptor: 'contemporary life, relatable social dynamics, realistic dialogue, and grounded emotional truth',
            charDescription: 'This is a modern, contemporary setting — present-day life with familiar technology, social dynamics, and urban or suburban environments. Descriptions should feel grounded and relatable.',
            worldDescription: 'Build a contemporary world grounded in present-day reality. Describe familiar urban and suburban environments, modern technology, and the social dynamics of everyday life.',
            scenarioDescription: 'Frame a scenario rooted in contemporary life — relationships, career challenges, personal conflicts, or social dynamics. Let the stakes feel real and emotionally grounded.',
            extraCompendiumCategories: [],
            defaultPrompts: {
                prose: {
                    title: 'Modern Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Keep the prose grounded in contemporary reality — focus on authentic dialogue, relatable emotional beats, and the small details of modern life. Write about {length}.',
                    systemContent: 'You are a contemporary fiction co-author. Write grounded, emotionally true prose. Focus on authentic character interactions and the texture of everyday life.'
                },
                rewrite: {
                    title: 'Modern Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its contemporary voice. Make dialogue and internal monologue more authentic. Sharpen emotional beats and remove anything that feels melodramatic or false.',
                    systemContent: 'You are a contemporary fiction editing assistant. Polish prose for authenticity and emotional resonance.'
                },
                summary: {
                    title: 'Modern Summary Prompt',
                    content: 'Analyze this contemporary scene. Examine character dynamics, emotional undercurrents, social commentary, and how the scene reflects modern life and relationships.',
                    systemContent: 'You are a contemporary literary analyst. Examine character depth and social realism.'
                },
                workshop: {
                    title: 'Modern Workshop Prompt',
                    content: 'You are a contemporary fiction workshop assistant. Help the author develop authentic characters, realistic dialogue, and emotionally compelling narratives set in the modern world.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'historical',
            label: 'Historical',
            icon: '🏛️',
            promptDescriptor: 'period-appropriate detail, historical authenticity, immersive sense of era, and era-specific social dynamics',
            charDescription: 'This is a historical setting — set in a specific past era with period-appropriate customs, technology, and social structures. Descriptions should evoke the feel of that time without anachronism.',
            worldDescription: 'Build an authentic historical world rooted in a specific era. Describe period-appropriate environments, customs, technology, and social structures with accuracy and immersive detail.',
            scenarioDescription: 'Frame a scenario shaped by the tensions, conflicts, and social dynamics of a specific historical period. Let the stakes involve real historical forces — war, revolution, cultural change, or personal survival within a rigid society.',
            extraCompendiumCategories: ['Timeline', 'Historical Figures', 'Period Glossary', 'Customs & Society'],
            defaultPrompts: {
                prose: {
                    title: 'Historical Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Immerse the reader in the historical period without anachronism. Weave period-appropriate details of dress, speech, technology, and social norms naturally into the prose. Write about {length}.',
                    systemContent: 'You are a historical fiction co-author. Write prose that immerses the reader in a specific era. Avoid anachronism — every detail of dress, speech, and custom should feel authentic.'
                },
                rewrite: {
                    title: 'Historical Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its historical authenticity. Check for anachronisms. Enhance period-appropriate language, customs, and sensory details. Keep the same plot and dialogue.',
                    systemContent: 'You are a historical fiction editing assistant. Polish for period accuracy and immersive detail.'
                },
                summary: {
                    title: 'Historical Summary Prompt',
                    content: 'Analyze this historical scene. Examine period accuracy, the integration of real historical events or figures, social commentary relevant to the era, and how the setting shapes character choices.',
                    systemContent: 'You are a historical fiction analyst. Examine period authenticity and historical resonance.'
                },
                workshop: {
                    title: 'Historical Workshop Prompt',
                    content: 'You are a historical fiction workshop assistant. Help the author research and integrate period details, develop era-appropriate voice, and balance historical accuracy with narrative drive.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'horror',
            label: 'Horror',
            icon: '👻',
            promptDescriptor: 'dread, suspense, psychological tension, atmospheric unease, and a sense that something is very wrong',
            charDescription: 'This is a horror setting — dread, suspense, the supernatural, and psychological terror. Descriptions should build unease, tension, and a sense that something is very wrong.',
            worldDescription: 'Build a world where unease lurks beneath the surface. Describe environments that feel threatening, histories stained by tragedy, and a sense that something is fundamentally wrong with the world itself.',
            scenarioDescription: 'Frame a scenario built on dread and danger. Let the stakes involve survival against supernatural or psychological threats, with tension that escalates through atmosphere and the unknown.',
            extraCompendiumCategories: ['Entities & Creatures', 'Tension Trackers', 'Haunted Locations', 'Artifacts'],
            defaultPrompts: {
                prose: {
                    title: 'Horror Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Build atmosphere through sensory details that create unease. Use pacing to control tension — linger on uncanny details, accelerate during moments of terror. What is unseen should feel as threatening as what is shown. Write about {length}.',
                    systemContent: 'You are a horror co-author. Write prose that builds dread and tension. Use atmosphere, pacing, and sensory detail to create unease. Show terror through what is felt as much as what is seen.'
                },
                rewrite: {
                    title: 'Horror Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its horror impact. Tighten pacing, enhance atmospheric dread, sharpen moments of tension or terror. Ensure every sentence serves the mood. Keep the same plot.',
                    systemContent: 'You are a horror editing assistant. Polish prose to maximize dread, tension, and atmospheric impact.'
                },
                summary: {
                    title: 'Horror Summary Prompt',
                    content: 'Analyze this horror scene. Examine how tension is built and released, the effectiveness of atmospheric details, the nature of the threat (psychological or supernatural), and how fear is used thematically.',
                    systemContent: 'You are a horror literary analyst. Examine tension, atmosphere, and the psychology of fear.'
                },
                workshop: {
                    title: 'Horror Workshop Prompt',
                    content: 'You are a horror writing workshop assistant. Help the author build effective dread and tension, develop frightening entities or situations, and balance psychological horror with visceral scares.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'romance',
            label: 'Romance',
            icon: '💕',
            promptDescriptor: 'emotional intimacy, chemistry between characters, relationship dynamics, vulnerability, and heartfelt connection',
            charDescription: 'This is a romance setting — emotional intimacy, chemistry, relationships, and matters of the heart drive the story. Descriptions should highlight how the character connects, their warmth, their vulnerability, and their capacity for love.',
            worldDescription: 'Build a world where connection and emotion take center stage. Describe environments that foster intimacy, social settings that bring people together, and a world that cares about matters of the heart.',
            scenarioDescription: 'Frame a scenario centered on emotional connection, chemistry, and relationship dynamics. Let the stakes involve vulnerability, the risk of love, and the tension between what the heart wants and what the world demands.',
            extraCompendiumCategories: ['Relationship Beats', 'Chemistry Notes', 'Tropes', 'Love Languages'],
            defaultPrompts: {
                prose: {
                    title: 'Romance Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Prioritize emotional intimacy and romantic tension. Show chemistry through small gestures, lingering looks, and unspoken understanding. Let vulnerability and emotional risk drive the scene. Write about {length}.',
                    systemContent: 'You are a romance co-author. Write prose centered on emotional intimacy and connection. Show chemistry through subtle gestures and emotional vulnerability. Let feelings drive the narrative.'
                },
                rewrite: {
                    title: 'Romance Rewrite Prompt',
                    content: 'Rewrite the selected text to deepen its romantic impact. Enhance emotional intimacy, sharpen chemistry between characters, and strengthen moments of vulnerability. Keep the same plot and dialogue.',
                    systemContent: 'You are a romance editing assistant. Polish prose for emotional resonance and romantic chemistry.'
                },
                summary: {
                    title: 'Romance Summary Prompt',
                    content: 'Analyze this romance scene. Examine relationship dynamics, emotional turning points, the balance of tension and intimacy, and how the scene advances the central romantic arc.',
                    systemContent: 'You are a romance literary analyst. Examine emotional arcs and relationship development.'
                },
                workshop: {
                    title: 'Romance Workshop Prompt',
                    content: 'You are a romance writing workshop assistant. Help the author develop compelling romantic arcs, build chemistry between characters, and navigate tropes with fresh perspectives.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'erotic-romance',
            label: 'Erotic Romance',
            icon: '🔥',
            promptDescriptor: 'sensual tension, explicit chemistry, erotic intimacy, vulnerability in desire, the heat of physical and emotional connection',
            charDescription: 'This is an erotic romance setting — sensual tension, explicit chemistry, and the heat of intimate connection drive the story. Descriptions should explore desire openly, portray intimacy with emotional depth, and balance raw passion with vulnerable, heartfelt moments.',
            worldDescription: 'Build a world where desire and intimacy are woven into the fabric of society. Describe environments charged with sensual possibility, where attraction is acknowledged and explored openly.',
            scenarioDescription: 'Frame a scenario driven by chemistry, attraction, and the tension between desire and emotional connection. Let the stakes involve the vulnerability of intimacy and the heat of passion colliding with real emotional risk.',
            extraCompendiumCategories: ['Chemistry Beats', 'Spice Tracker', 'Intimate Scenes', 'Relationship Dynamics'],
            defaultPrompts: {
                prose: {
                    title: 'Erotic Romance Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Prioritize sensual tension and emotional intimacy. Show chemistry through touch, glance, and unspoken desire. Let vulnerability and passion coexist — explicit moments should carry emotional weight. Write about {length}.',
                    systemContent: 'You are an erotic romance co-author. Write prose that balances explicit sensuality with emotional depth. Intimate scenes should serve the story and reveal character.'
                },
                rewrite: {
                    title: 'Erotic Romance Rewrite Prompt',
                    content: 'Rewrite the selected text to deepen its erotic and romantic impact. Enhance sensual tension, sharpen chemistry, and ensure intimate moments carry emotional stakes. Keep the same plot and dialogue.',
                    systemContent: 'You are an erotic romance editing assistant. Polish for heat, emotional resonance, and sensual detail.'
                },
                summary: {
                    title: 'Erotic Romance Summary Prompt',
                    content: 'Analyze this erotic romance scene. Examine the interplay of desire and vulnerability, how intimacy advances character arcs, the pacing of sensual tension, and the emotional stakes beneath the physical.',
                    systemContent: 'You are an erotic romance analyst. Examine chemistry, intimacy, and emotional arcs.'
                },
                workshop: {
                    title: 'Erotic Romance Workshop Prompt',
                    content: 'You are an erotic romance writing workshop assistant. Help the author craft compelling intimate scenes with emotional depth, build chemistry between characters, and navigate consent and vulnerability with care and authenticity.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'western',
            label: 'Western',
            icon: '🤠',
            promptDescriptor: 'harsh frontier landscapes, rugged independence, sparse and tough prose, and moral ambiguity',
            charDescription: 'This is a Western setting — frontier landscapes, dust and leather, harsh justice, and rugged independence. Descriptions should feel sparse, tough, and shaped by the land.',
            worldDescription: 'Build a frontier world of rugged landscapes, scarce resources, and harsh justice. Describe wide-open plains, dusty towns, and a world where the land itself shapes the people who survive on it.',
            scenarioDescription: 'Frame a scenario of frontier conflict — land disputes, outlaw justice, survival in harsh conditions, or the clash between civilization and the wild. Let the stakes be raw and elemental.',
            extraCompendiumCategories: ['Locations', 'Factions', 'Outlaws'],
            defaultPrompts: {
                prose: {
                    title: 'Western Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Keep prose lean and evocative. Let the landscape be a character — describe the heat, dust, wind, and wide horizons. Show toughness and moral ambiguity. Dialogue should be terse and meaningful. Write about {length}.',
                    systemContent: 'You are a Western co-author. Write lean, tough prose that evokes the frontier. Let landscape and weather shape the mood. Dialogue should be sparse and weighted.'
                },
                rewrite: {
                    title: 'Western Rewrite Prompt',
                    content: 'Rewrite the selected text to sharpen its Western voice. Tighten prose, enhance frontier atmosphere, and deepen the sense of moral ambiguity. Keep the same plot and dialogue.',
                    systemContent: 'You are a Western editing assistant. Polish for lean prose and frontier authenticity.'
                },
                summary: {
                    title: 'Western Summary Prompt',
                    content: 'Analyze this Western scene. Examine how the landscape shapes the narrative, the moral choices characters face, and the themes of justice, survival, and independence.',
                    systemContent: 'You are a Western literary analyst. Examine frontier themes and moral complexity.'
                },
                workshop: {
                    title: 'Western Workshop Prompt',
                    content: 'You are a Western writing workshop assistant. Help the author develop authentic frontier voices, craft moral dilemmas, and evoke the harsh beauty of the landscape.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'cyberpunk',
            label: 'Cyberpunk',
            icon: '🔮',
            promptDescriptor: 'high-tech noir, gritty urban decay, cybernetic augmentation, corporate control, and the line between human and machine',
            charDescription: 'This is a cyberpunk setting — high tech, low life. Neon-lit streets, corporate power, cybernetic augmentation, and a grimy underbelly. Descriptions should feel gritty, stylish, and tinged with decay.',
            worldDescription: 'Build a high-tech, low-life world of neon-drenched streets, corporate dominance, and cybernetic augmentation. Describe a society where technology and decay coexist, and the line between human and machine has blurred.',
            scenarioDescription: 'Frame a scenario of rebellion against corporate power, digital heists, or survival in the cracks of a system designed to crush individuals. Let the stakes involve identity, freedom, and the cost of technology.',
            extraCompendiumCategories: ['Cybernetics & Tech', 'Corporations', 'Districts', 'Hacker Culture'],
            defaultPrompts: {
                prose: {
                    title: 'Cyberpunk Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Blend high-tech and low-life — neon and rain-soaked streets, corporate power and street-level survival. Make technology feel visceral and augmentations feel like part of the characters. Write about {length}.',
                    systemContent: 'You are a cyberpunk co-author. Write gritty prose that contrasts advanced technology with urban decay. Describe augmented bodies and digital spaces with visceral detail.'
                },
                rewrite: {
                    title: 'Cyberpunk Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its cyberpunk voice. Enhance the gritty atmosphere, sharpen technological details, and deepen the noir tone. Keep the same plot and dialogue.',
                    systemContent: 'You are a cyberpunk editing assistant. Polish for gritty atmosphere and technological edge.'
                },
                summary: {
                    title: 'Cyberpunk Summary Prompt',
                    content: 'Analyze this cyberpunk scene. Examine themes of technology versus humanity, corporate power, social stratification, and how the setting reflects contemporary anxieties about the future.',
                    systemContent: 'You are a cyberpunk literary analyst. Examine techno-dystopian themes and social critique.'
                },
                workshop: {
                    title: 'Cyberpunk Workshop Prompt',
                    content: 'You are a cyberpunk writing workshop assistant. Help the author develop believable near-future tech, corporate dystopias, and characters navigating theinterface between human and machine.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'post-apocalyptic',
            label: 'Post-Apocalyptic',
            icon: '☢️',
            promptDescriptor: 'survival in a fallen world, scarce resources, weathered landscapes, and the endurance of the human spirit',
            charDescription: 'This is a post-apocalyptic setting — civilization has fallen, resources are scarce, and survival is daily. Descriptions should feel weathered, scarred, and shaped by loss and endurance.',
            worldDescription: 'Build a world that has fallen — ruined cities, scarce resources, small communities clinging to survival. Describe landscapes marked by loss, where every day is a negotiation with scarcity and danger.',
            scenarioDescription: 'Frame a scenario of survival in the aftermath. Let the stakes involve finding resources, protecting a community, navigating the politics of survivor groups, or holding onto hope in a broken world.',
            extraCompendiumCategories: ['Survivors & Factions', 'Hazards', 'Ruins & Locations', 'Resources'],
            defaultPrompts: {
                prose: {
                    title: 'Post-Apocalyptic Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Show a world shaped by loss — describe ruined landscapes, scarce resources, and the weight of survival. Let the environment tell the story of what fell. Focus on resilience and human connection in hard times. Write about {length}.',
                    systemContent: 'You are a post-apocalyptic co-author. Write prose that feels weathered and scarred. Describe a fallen world with sensory weight. Focus on survival, loss, and the endurance of the human spirit.'
                },
                rewrite: {
                    title: 'Post-Apocalyptic Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its post-apocalyptic voice. Enhance the sense of a fallen world, deepen survival themes, and make the setting feel more lived-in and scarred. Keep the same plot and dialogue.',
                    systemContent: 'You are a post-apocalyptic editing assistant. Polish for atmospheric weight and survival realism.'
                },
                summary: {
                    title: 'Post-Apocalyptic Summary Prompt',
                    content: 'Analyze this post-apocalyptic scene. Examine themes of survival, loss and hope, how the fallen world shapes character decisions, and what the story says about resilience.',
                    systemContent: 'You are a post-apocalyptic literary analyst. Examine survival themes and human endurance.'
                },
                workshop: {
                    title: 'Post-Apocalyptic Workshop Prompt',
                    content: 'You are a post-apocalyptic writing workshop assistant. Help the author build believable fallen worlds, develop survival-driven plots, and create communities shaped by catastrophe.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'superhero',
            label: 'Superhero',
            icon: '🦸',
            promptDescriptor: 'extraordinary powers, secret identities, larger-than-life conflicts, and the moral line between hero and villain',
            charDescription: 'This is a superhero setting — extraordinary powers, secret identities, larger-than-life conflicts, and the line between hero and villain. Descriptions should capture the scale and drama of powers in a world that feels like ours but bigger.',
            worldDescription: 'Build a world where extraordinary powers exist alongside ordinary life. Describe a society grappling with superhuman individuals, secret identities, and the moral questions that powers create.',
            scenarioDescription: 'Frame a scenario involving superpowered conflict, the struggle between heroism and vigilantism, or the personal cost of having powers. Let the stakes balance action with moral weight.',
            extraCompendiumCategories: ['Powers & Abilities', 'Heroes & Villains', 'Teams & Factions', 'Secret Identities'],
            defaultPrompts: {
                prose: {
                    title: 'Superhero Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Balance the human and the extraordinary — show how powers feel to the person who wields them, and how the world reacts to the superhuman. Action should have weight and consequence. Write about {length}.',
                    systemContent: 'You are a superhero co-author. Write prose that balances human emotion with superhuman scale. Describe powers with visceral impact and explore the moral weight of having them.'
                },
                rewrite: {
                    title: 'Superhero Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its superhero voice. Enhance action sequences, deepen the moral stakes, and make powers feel more visceral and consequential. Keep the same plot and dialogue.',
                    systemContent: 'You are a superhero editing assistant. Polish for dramatic scale and moral depth.'
                },
                summary: {
                    title: 'Superhero Summary Prompt',
                    content: 'Analyze this superhero scene. Examine the moral choices characters face, how powers are used thematically, the balance of action and character development, and the story\'s take on heroism.',
                    systemContent: 'You are a superhero literary analyst. Examine heroism, morality, and dramatic scale.'
                },
                workshop: {
                    title: 'Superhero Workshop Prompt',
                    content: 'You are a superhero writing workshop assistant. Help the author develop unique power systems, compelling hero/villain dynamics, and stories that explore what it truly means to be a hero.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'mystery-thriller',
            label: 'Mystery & Thriller',
            icon: '🕵️',
            promptDescriptor: 'suspense, secrets, red herrings, investigative logic, and danger that closes in as the truth gets nearer',
            charDescription: 'This is a mystery and thriller setting — secrets, suspicion, and danger closing in. Every character may be hiding something. Descriptions should build atmosphere, tension, and the texture of clues.',
            worldDescription: 'Build a world where nothing is quite what it seems — secrets hidden in ordinary places, institutions that protect their own, and truths buried under plausible lies. Describe settings that carry tension in their details.',
            scenarioDescription: 'Frame a scenario around a crime, a secret, or a threat that must be uncovered before it is too late. Plant clues, red herrings, and suspects. Let the stakes rise as the truth gets closer.',
            extraCompendiumCategories: ['Clues & Evidence', 'Suspects', 'Timeline', 'Locations'],
            defaultPrompts: {
                prose: {
                    title: 'Mystery & Thriller Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Let every detail carry potential meaning — sensory specifics, tells, and things noticed or hidden. Build tension through pacing, doubt, and what characters choose not to say. Write about {length}.',
                    systemContent: 'You are a mystery and thriller co-author. Write prose that drips with atmosphere and controlled tension. Let clues, tells, and withheld information do the work.'
                },
                rewrite: {
                    title: 'Mystery & Thriller Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its mystery and thriller voice. Tighten suspense, sharpen clues and red herrings, and make reveals feel earned. Keep the same plot and dialogue.',
                    systemContent: 'You are a mystery and thriller editing assistant. Polish for suspense, pacing, and airtight logic.'
                },
                summary: {
                    title: 'Mystery & Thriller Summary Prompt',
                    content: 'Analyze this mystery and thriller scene. Examine planted clues and red herrings, how tension is built, the reliability of what characters believe, and how the scene advances the central question.',
                    systemContent: 'You are a mystery and thriller literary analyst. Examine suspense mechanics and narrative logic.'
                },
                workshop: {
                    title: 'Mystery & Thriller Workshop Prompt',
                    content: 'You are a mystery and thriller writing workshop assistant. Help the author design airtight plots, plant fair clues, pace reveals, and build suspense that never cheats the reader.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'dystopian',
            label: 'Dystopian',
            icon: '🏚️',
            promptDescriptor: 'oppressive societies, surveillance, institutional control, resistance, and the cost of conformity',
            charDescription: 'This is a dystopian setting — an oppressive society that controls, monitors, and disciplines its citizens. Hope is rationed. Descriptions should feel controlled, watchful, and subtly or overtly brutal.',
            worldDescription: 'Build an oppressive society — regimes that monitor, ration, and rewrite history, cities designed for control, and populations worn into compliance. Describe the machinery of control and the cracks where resistance lives.',
            scenarioDescription: 'Frame a scenario of surveillance, control, and resistance. Let the stakes be survival and freedom against an institution that sees everything.',
            extraCompendiumCategories: ['Regime & Governance', 'Surveillance', 'Resistance', 'Technology'],
            defaultPrompts: {
                prose: {
                    title: 'Dystopian Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Make the oppression feel structural, not theatrical — rationed comforts, watchful silences, and the small rebellions people permit themselves. Write about {length}.',
                    systemContent: 'You are a dystopian co-author. Write prose that renders oppression through everyday detail — control as a texture of life, not a monologue.'
                },
                rewrite: {
                    title: 'Dystopian Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its dystopian voice. Deepen the sense of surveillance and control, and make resistance feel costly and human. Keep the same plot and dialogue.',
                    systemContent: 'You are a dystopian editing assistant. Polish for institutional menace and lived-in oppression.'
                },
                summary: {
                    title: 'Dystopian Summary Prompt',
                    content: 'Analyze this dystopian scene. Examine how the regime asserts control, the personal cost of conformity or resistance, and the social commentary woven into the narrative.',
                    systemContent: 'You are a dystopian literary analyst. Examine power, control, and social critique.'
                },
                workshop: {
                    title: 'Dystopian Workshop Prompt',
                    content: 'You are a dystopian writing workshop assistant. Help the author build believable oppressive societies, plausible control systems, and resistance movements that feel earned.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'urban-fantasy',
            label: 'Urban Fantasy',
            icon: '🌆',
            promptDescriptor: 'magic hidden in the modern world, supernatural communities, secret councils, and the collision of the ordinary and the occult',
            charDescription: 'This is an urban fantasy setting — magic and the supernatural hidden just beneath the surface of the modern world. Descriptions should ground the fantastic in city streets, coffee shops, and commutes.',
            worldDescription: 'Build a modern world with magic hiding in plain sight — supernatural communities in city shadows, secret councils, artifacts in thrift stores, and a masquerade that keeps the ordinary world unaware.',
            scenarioDescription: 'Frame a scenario where the supernatural intrudes on the modern world — hidden factions, forbidden magic, or the breaking of the masquerade.',
            extraCompendiumCategories: ['Hidden Factions', 'Supernatural Beings', 'Magic & Artifacts', 'Locations'],
            defaultPrompts: {
                prose: {
                    title: 'Urban Fantasy Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Ground the supernatural in the mundane — a spell cast on a bus, a vampire who owns a laundromat. The magic should feel domestic and dangerous at once. Write about {length}.',
                    systemContent: 'You are an urban fantasy co-author. Write prose that keeps the fantastic firmly rooted in the modern world\'s textures and routines.'
                },
                rewrite: {
                    title: 'Urban Fantasy Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its urban fantasy voice. Blend supernatural elements more tightly with everyday settings, and sharpen the hidden-world atmosphere. Keep the same plot and dialogue.',
                    systemContent: 'You are an urban fantasy editing assistant. Polish for seamless blending of the magical and the mundane.'
                },
                summary: {
                    title: 'Urban Fantasy Summary Prompt',
                    content: 'Analyze this urban fantasy scene. Examine how magic intersects with the modern world, the rules of the hidden community, and the thematic weight of secrecy and belonging.',
                    systemContent: 'You are an urban fantasy literary analyst. Examine the collision of worlds and the rules of hidden magic.'
                },
                workshop: {
                    title: 'Urban Fantasy Workshop Prompt',
                    content: 'You are an urban fantasy writing workshop assistant. Help the author build hidden supernatural communities, consistent magic rules, and modern settings that make the fantastic feel inevitable.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'adventure',
            label: 'Adventure',
            icon: '🧭',
            promptDescriptor: 'expeditions, treasure, daring escapes, exotic locations, and the thrill of discovery',
            charDescription: 'This is an adventure setting — expeditions, treasures, hazards, and the promise of the unknown. Descriptions should feel energetic, sweeping, and alive with possibility.',
            worldDescription: 'Build a world of expeditions and discovery — lost temples, uncharted islands, mountain passes, and buried treasures. Describe landscapes that invite and endanger exploration.',
            scenarioDescription: 'Frame a scenario driven by quests for treasure, rescue, or discovery. Let hazards, rival expeditions, and the environment itself raise the stakes.',
            extraCompendiumCategories: ['Expeditions', 'Landmarks', 'Artifacts', 'Factions'],
            defaultPrompts: {
                prose: {
                    title: 'Adventure Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Keep the pace alive with movement, hazard, and discovery — describe terrain that demands effort and places that reward curiosity. Write about {length}.',
                    systemContent: 'You are an adventure co-author. Write energetic prose that makes travel, danger, and discovery visceral and rewarding.'
                },
                rewrite: {
                    title: 'Adventure Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its adventure voice. Punch up the sense of movement and hazard, and make discoveries feel earned and vivid. Keep the same plot and dialogue.',
                    systemContent: 'You are an adventure editing assistant. Polish for momentum, atmosphere, and the thrill of the unknown.'
                },
                summary: {
                    title: 'Adventure Summary Prompt',
                    content: 'Analyze this adventure scene. Examine the challenges faced, how the setting itself acts on the characters, and how the scene builds toward discovery or payoff.',
                    systemContent: 'You are an adventure literary analyst. Examine pacing, peril, and the promise of the unknown.'
                },
                workshop: {
                    title: 'Adventure Workshop Prompt',
                    content: 'You are an adventure writing workshop assistant. Help the author craft expeditions, set-pieces, and environments that create momentum and satisfying discovery.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'space-opera',
            label: 'Space Opera',
            icon: '🌌',
            promptDescriptor: 'galactic empires, starship fleets, interstellar politics, dynasties, and battles across the void',
            charDescription: 'This is a space opera setting — grand galactic conflict, starship fleets, alien dynasties, and interstellar politics. Descriptions should feel epic, cinematic, and vast.',
            worldDescription: 'Build a galaxy of empires and intrigue — star systems under dynastic rule, alien civilizations with ancient grudges, space stations that never sleep, and wars fought across light-years.',
            scenarioDescription: 'Frame a scenario of galactic stakes — imperial succession, fleet battles, first contact, or the fall of an empire. Let the fate of worlds hang in the balance.',
            extraCompendiumCategories: ['Galactic Polities', 'Ships & Crews', 'Alien Races', 'Key Locations'],
            defaultPrompts: {
                prose: {
                    title: 'Space Opera Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Give the vast scale a human heartbeat — fleet movements felt through one bridge, dynastic politics through one family. Cinematic stakes, intimate cost. Write about {length}.',
                    systemContent: 'You are a space opera co-author. Write epic, cinematic prose where personal stakes and galactic consequences are inseparable.'
                },
                rewrite: {
                    title: 'Space Opera Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its space opera voice. Widen the sense of scale, heighten the drama of fleets and dynasties, and keep the human core intact. Keep the same plot and dialogue.',
                    systemContent: 'You are a space opera editing assistant. Polish for epic sweep and interpersonal weight.'
                },
                summary: {
                    title: 'Space Opera Summary Prompt',
                    content: 'Analyze this space opera scene. Examine how personal conflict mirrors galactic stakes, the politics at play, and how the scene advances empire-spanning arcs.',
                    systemContent: 'You are a space opera literary analyst. Examine epic structure and dynastic drama.'
                },
                workshop: {
                    title: 'Space Opera Workshop Prompt',
                    content: 'You are a space opera writing workshop assistant. Help the author build believable galactic polities, memorable crews, and conflicts that feel both epic and personal.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'litrpg',
            label: 'LitRPG & GameLit',
            icon: '🎮',
            promptDescriptor: 'game mechanics, levels and stats, skills, quests, and characters who live inside a system',
            charDescription: 'This is a LitRPG / GameLit setting — characters live inside game-like rules with levels, stats, skills, and quests. Descriptions should blend immersive fiction with the texture of game systems.',
            worldDescription: 'Build a world governed by game systems — visible stats and levels, skill trees, classes, quests with rewards, and dungeons. Describe how the system shapes society, economy, and ambition.',
            scenarioDescription: 'Frame a scenario driven by game mechanics — quests, leveling, raids, guild wars, or a system event that changes the world. Let progression and survival be woven together.',
            extraCompendiumCategories: ['Systems & Stats', 'Classes & Skills', 'Quests', 'Guilds & Parties', 'Game Zones'],
            defaultPrompts: {
                prose: {
                    title: 'LitRPG Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Weave system elements — level-ups, skill notifications, loot, cooldowns — naturally into the fiction so they matter to the story, not just the numbers. Write about {length}.',
                    systemContent: 'You are a LitRPG co-author. Write prose where game mechanics are integral to the narrative, with numbers that serve emotion and stakes.'
                },
                rewrite: {
                    title: 'LitRPG Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its LitRPG voice. Integrate system elements more seamlessly, make progression feel earned, and keep mechanical text punchy. Keep the same plot and dialogue.',
                    systemContent: 'You are a LitRPG editing assistant. Polish for clean system integration and satisfying progression beats.'
                },
                summary: {
                    title: 'LitRPG Summary Prompt',
                    content: 'Analyze this LitRPG scene. Examine how the game system drives choices, the design of the progression beats, and how mechanics serve character and theme rather than the reverse.',
                    systemContent: 'You are a LitRPG literary analyst. Examine system design and progression storytelling.'
                },
                workshop: {
                    title: 'LitRPG Workshop Prompt',
                    content: 'You are a LitRPG writing workshop assistant. Help the author design coherent systems, balanced progression curves, and quest structures that create real dramatic stakes.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'slice-of-life',
            label: 'Slice of Life',
            icon: '☕',
            promptDescriptor: 'everyday moments, gentle conflict, quiet character growth, and the texture of ordinary life',
            charDescription: 'This is a slice of life setting — ordinary people in everyday situations, with quiet growth and gentle conflict. Descriptions should feel warm, specific, and intimately observed.',
            worldDescription: 'Build a world of everyday places — kitchens, schools, workplaces, cafés, and neighborhoods. Describe the small rituals and routines that give life its texture.',
            scenarioDescription: 'Frame a scenario around everyday life — relationships, routines, small ambitions, and the quiet turning points of ordinary existence. Let the stakes be emotional and personal.',
            extraCompendiumCategories: [],
            defaultPrompts: {
                prose: {
                    title: 'Slice of Life Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Find the meaning in small moments — a shared meal, an unspoken apology, a habit changed. Conflict can be quiet; feelings should be loud. Write about {length}.',
                    systemContent: 'You are a slice of life co-author. Write warm, observant prose that finds weight in ordinary moments and authentic interactions.'
                },
                rewrite: {
                    title: 'Slice of Life Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its slice of life voice. Deepen the everyday texture, make dialogue more natural, and let emotions surface through small actions. Keep the same plot and dialogue.',
                    systemContent: 'You are a slice of life editing assistant. Polish for authenticity, warmth, and emotional specificity.'
                },
                summary: {
                    title: 'Slice of Life Summary Prompt',
                    content: 'Analyze this slice of life scene. Examine the quiet character growth, the meaning carried by small details, and how the scene deepens relationships or self-understanding.',
                    systemContent: 'You are a slice of life literary analyst. Examine quiet conflict and emotional truth.'
                },
                workshop: {
                    title: 'Slice of Life Workshop Prompt',
                    content: 'You are a slice of life writing workshop assistant. Help the author craft authentic daily routines, natural dialogue, and gentle arcs that still carry real emotional stakes.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'anime',
            label: 'Anime',
            icon: '🎌',
            promptDescriptor: 'anime and manga storytelling conventions, expressive emotion, dramatic beats, and larger-than-life character dynamics',
            charDescription: 'This is an anime and manga style setting — expressive emotions, dramatic beats, exaggerated reactions, and bold character dynamics. Descriptions should feel vivid, dynamic, and stylish.',
            worldDescription: 'Build a world in the anime and manga tradition — colorful settings, expressive characters, dramatic schools, mysterious organizations, and styles that make emotion visible.',
            scenarioDescription: 'Frame a scenario with anime conventions in mind — tournaments, rivalries, supernatural clubs, life-or-death friendships, or world-changing ambitions. Let drama be loud and heartfelt.',
            extraCompendiumCategories: ['Character Archetypes', 'Tropes & Conventions', 'Clubs & Groups', 'Settings'],
            defaultPrompts: {
                prose: {
                    title: 'Anime Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Render emotion with anime expressiveness — body language, internal monologue, and dramatic beats that land like panels. Keep the heart under the exaggeration. Write about {length}.',
                    systemContent: 'You are an anime-style co-author. Write vivid, expressive prose that captures anime\'s emotional boldness and dramatic rhythm.'
                },
                rewrite: {
                    title: 'Anime Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its anime voice. Amplify emotional expressiveness and dramatic beats, sharpen character dynamics, and keep reactions bigger than life but true. Keep the same plot and dialogue.',
                    systemContent: 'You are an anime-style editing assistant. Polish for expressive drama and dynamic character moments.'
                },
                summary: {
                    title: 'Anime Summary Prompt',
                    content: 'Analyze this anime-style scene. Examine the character dynamics, the dramatic structure, and the emotional arc as it might play out across episodes.',
                    systemContent: 'You are an anime-style literary analyst. Examine tropes, dynamics, and emotional staging.'
                },
                workshop: {
                    title: 'Anime Workshop Prompt',
                    content: 'You are an anime-style writing workshop assistant. Help the author craft memorable archetypes, dramatic beats, and character dynamics that feel alive on the page and on the screen.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'shonen',
            label: 'Shonen',
            icon: '💥',
            promptDescriptor: 'rivalries, tournaments, training arcs, power-ups, friendship that forges strength, and battles of will',
            charDescription: 'This is a shonen setting — rivals, tournaments, training, power-ups, and battles that test will as much as strength. Descriptions should feel energetic, escalating, and charged with ambition.',
            worldDescription: 'Build a world shaped by strength and ambition — martial schools, tournaments, leagues, and organizations that define power. Describe an arena culture where rising through the ranks means everything.',
            scenarioDescription: 'Frame a scenario of rivalry and escalation — tournaments, mentor trials, threats that demand a new power level, or the ultimate showdown. Let growth through effort be a core value.',
            extraCompendiumCategories: ['Power Systems', 'Tournaments', 'Rivalries', 'Organizations'],
            defaultPrompts: {
                prose: {
                    title: 'Shonen Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Make escalation visible — training that costs something, techniques that demand everything, and fights that turn on willpower as much as skill. Write about {length}.',
                    systemContent: 'You are a shonen co-author. Write energetic prose with climbing stakes, earned power-ups, and battles that are as much about resolve as strength.'
                },
                rewrite: {
                    title: 'Shonen Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its shonen voice. Heighten the escalation, make training and technique descriptions land harder, and deepen rival dynamics. Keep the same plot and dialogue.',
                    systemContent: 'You are a shonen editing assistant. Polish for momentum, escalation, and hard-fought growth.'
                },
                summary: {
                    title: 'Shonen Summary Prompt',
                    content: 'Analyze this shonen scene. Examine the escalation of stakes, the character growth through effort and adversity, and the rival or mentor dynamics at play.',
                    systemContent: 'You are a shonen literary analyst. Examine growth arcs, rivalry, and the spirit of the fight.'
                },
                workshop: {
                    title: 'Shonen Workshop Prompt',
                    content: 'You are a shonen writing workshop assistant. Help the author design training arcs, power systems, tournaments, and rivalries that make growth feel earned and battles unforgettable.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'isekai',
            label: 'Isekai',
            icon: '🌀',
            promptDescriptor: 'characters transported or reborn into another world, cheat abilities, new rules, and the clash of worlds',
            charDescription: 'This is an isekai setting — a character from the real world transported or reborn into another world, often with unique abilities. Descriptions should capture wonder, adaptation, and the clash of expectations.',
            worldDescription: 'Build another world worth being pulled into — magic systems, kingdoms, dungeons, and rules that differ from the real world. Describe how an outsider would see and misunderstand it.',
            scenarioDescription: 'Frame a scenario of arrival and adaptation — a hero from another world navigating new rules, a reincarnated soul with knowledge of the future, or a world that resists the outsider. Let the stakes grow as the character does.',
            extraCompendiumCategories: ['Other World Systems', 'Cheats & Abilities', 'Regions & Kingdoms', 'Factions'],
            defaultPrompts: {
                prose: {
                    title: 'Isekai Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Keep the outsider\'s perspective alive — wonder at what is familiar, shock at what is not, and knowledge from the old world used in new ways. Write about {length}.',
                    systemContent: 'You are an isekai co-author. Write prose rich with the wonder and friction of a character from one world adapting to another.'
                },
                rewrite: {
                    title: 'Isekai Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its isekai voice. Deepen the outsider perspective, make the other world feel strange and real, and integrate any special abilities naturally. Keep the same plot and dialogue.',
                    systemContent: 'You are an isekai editing assistant. Polish for wonder, adaptation, and the clash of worldviews.'
                },
                summary: {
                    title: 'Isekai Summary Prompt',
                    content: 'Analyze this isekai scene. Examine how the other world\'s rules differ from the protagonist\'s origin, how knowledge or abilities are leveraged, and the character\'s growing place in the new world.',
                    systemContent: 'You are an isekai literary analyst. Examine world clash, adaptation, and power dynamics.'
                },
                workshop: {
                    title: 'Isekai Workshop Prompt',
                    content: 'You are an isekai writing workshop assistant. Help the author craft another world that feels worth entering, balanced cheat abilities, and the outsider perspective that makes it fresh.',
                    systemContent: ''
                }
            }
        },
        {
            id: 'superpowers',
            label: 'Superpowers',
            icon: '⚡',
            promptDescriptor: 'awakened abilities, power classifications, academies, rankings, and the price of being extraordinary',
            charDescription: 'This is a superpowers setting — awakened abilities, power classifications, academies, and rankings. Descriptions should make each power feel specific, tactile, and costly.',
            worldDescription: 'Build a world where abilities manifest — awakening events, academies that train and rank the gifted, organizations that regulate powers, and people defined by their classifications.',
            scenarioDescription: 'Frame a scenario of power and consequence — awakening events, academy rivalries, classification disputes, or powers outgrowing their limits. Let ability always come with a price.',
            extraCompendiumCategories: ['Power Classifications', 'Academies & Organizations', 'Awakening Events', 'Rankings'],
            defaultPrompts: {
                prose: {
                    title: 'Superpowers Prose Prompt',
                    content: 'Write the next scene continuing from the provided text. Make each ability feel lived-in — its limits, its costs, the muscle memory of using it. Power should be specific, tactile, and never free. Write about {length}.',
                    systemContent: 'You are a superpowers co-author. Write prose where abilities have texture, limits, and consequences — powers that cost as much as they grant.'
                },
                rewrite: {
                    title: 'Superpowers Rewrite Prompt',
                    content: 'Rewrite the selected text to strengthen its superpowers voice. Make ability use more visceral and mechanical, sharpen the costs and limits, and deepen the power-society dynamics. Keep the same plot and dialogue.',
                    systemContent: 'You are a superpowers editing assistant. Polish for power specificity, cost, and worldbuilding depth.'
                },
                summary: {
                    title: 'Superpowers Summary Prompt',
                    content: 'Analyze this superpowers scene. Examine how abilities define identity and status, the cost or limit imposed, and what the scene reveals about the power system and its society.',
                    systemContent: 'You are a superpowers literary analyst. Examine ability design, cost, and social structure.'
                },
                workshop: {
                    title: 'Superpowers Workshop Prompt',
                    content: 'You are a superpowers writing workshop assistant. Help the author design memorable powers with real limits, classification systems, academies, and the social consequences of being extraordinary.',
                    systemContent: ''
                }
            }
        }
    ];

    function findGenre(id) {
        return GENRES.find(g => g.id === id) || null;
    }

    function getAllGenreIds() {
        return GENRES.map(g => g.id);
    }

    function getPromptDescriptor(genreIds) {
        return genreIds
            .map(id => findGenre(id)?.promptDescriptor)
            .filter(Boolean);
    }

    function getExtraCompendiumCategories(genreIds) {
        const extra = genreIds
            .flatMap(id => findGenre(id)?.extraCompendiumCategories || []);
        return [...new Set(extra)];
    }

    function getDefaultPromptsForGenre(genreId) {
        return findGenre(genreId)?.defaultPrompts || null;
    }

    function getCharDescription(genreId) {
        return findGenre(genreId)?.charDescription || '';
    }

    function getWorldDescription(genreIds) {
        return genreIds
            .map(id => findGenre(id)?.worldDescription)
            .filter(Boolean)
            .join(' ');
    }

    function getScenarioDescription(genreIds) {
        return genreIds
            .map(id => findGenre(id)?.scenarioDescription)
            .filter(Boolean)
            .join(' ');
    }

    const POVS = [
        { id: '1st person', label: '1st Person' },
        { id: '2nd person', label: '2nd Person' },
        { id: '3rd person limited', label: '3rd Person Limited' },
        { id: '3rd person omniscient', label: '3rd Person Omniscient' },
        { id: '3rd person close', label: '3rd Person Close' },
        { id: '3rd person objective', label: '3rd Person Objective' },
        { id: 'multiple POV', label: 'Multiple POV' },
        { id: 'unreliable narrator', label: 'Unreliable Narrator' }
    ];

    const TENSES = [
        { id: 'past', label: 'Past Tense' },
        { id: 'present', label: 'Present Tense' },
        { id: 'future', label: 'Future Tense' },
        { id: 'past perfect', label: 'Past Perfect Tense' },
        { id: 'present perfect', label: 'Present Perfect Tense' }
    ];

    const LANGUAGES = [
        { id: 'English', label: 'English' },
        { id: 'Spanish', label: 'Spanish' },
        { id: 'French', label: 'French' },
        { id: 'German', label: 'German' },
        { id: 'Italian', label: 'Italian' },
        { id: 'Portuguese', label: 'Portuguese' },
        { id: 'Dutch', label: 'Dutch' },
        { id: 'Russian', label: 'Russian' },
        { id: 'Chinese', label: 'Chinese' },
        { id: 'Japanese', label: 'Japanese' },
        { id: 'Korean', label: 'Korean' },
        { id: 'Arabic', label: 'Arabic' },
        { id: 'Hindi', label: 'Hindi' },
        { id: 'Swedish', label: 'Swedish' },
        { id: 'Norwegian', label: 'Norwegian' },
        { id: 'Danish', label: 'Danish' },
        { id: 'Finnish', label: 'Finnish' },
        { id: 'Polish', label: 'Polish' },
        { id: 'Turkish', label: 'Turkish' },
        { id: 'Thai', label: 'Thai' },
        { id: 'Vietnamese', label: 'Vietnamese' },
        { id: 'Greek', label: 'Greek' },
        { id: 'Hebrew', label: 'Hebrew' }
    ];

    window.GenreDefs = {
        GENRES,
        POVS,
        TENSES,
        LANGUAGES,
        findGenre,
        getAllGenreIds,
        getPromptDescriptor,
        getExtraCompendiumCategories,
        getDefaultPromptsForGenre,
        getCharDescription,
        getWorldDescription,
        getScenarioDescription
    };
})();

(function () {
    const GENRES = [
        {
            id: 'fantasy',
            label: 'Fantasy',
            icon: '⚔️',
            promptDescriptor: 'vivid worldbuilding, magic systems, mythical creatures, ancient powers, and a sense of wonder',
            charDescription: 'This is a fantasy setting — medieval-ish technology, magic, mythical creatures, ancient powers, and grand quests. Descriptions should evoke wonder, danger, and a sense of history.',
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

    window.GenreDefs = {
        GENRES,
        findGenre,
        getAllGenreIds,
        getPromptDescriptor,
        getExtraCompendiumCategories,
        getDefaultPromptsForGenre,
        getCharDescription
    };
})();

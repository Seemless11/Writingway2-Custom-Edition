(function () {
    const GENRES = [
        {
            id: 'fantasy',
            label: 'Fantasy',
            icon: '⚔️',
            promptDescriptor: 'medieval technology, magic with cost, guilds and noble houses, quests and obligations',
            charDescription: 'Characters hold rank, office, or lineage that determines what they can do. Their trade — service, craft, scholarship, arms, or clergy — shapes daily work. Magic access is trained, licensed, illegal, inherited, or none, and carries a price. Kit and income decide what they carry, what they owe, and what they can afford.',
            extraCompendiumCategories: ['Magic Systems', 'Bestiary', 'Pantheons', 'Factions', 'Races']
        },
        {
            id: 'sci-fi',
            label: 'Science Fiction',
            icon: '🚀',
            promptDescriptor: 'advanced technology, starships and stations, scientific plausibility, alien or future societies',
            charDescription: 'Characters work within institutions — agencies, corps, colonies, or fleets — that set the rules of daily life. Their role and classification determine access to technology and movement. Kit, credits, and recovery time shape what jobs they can take. Public surface and private reality often diverge under corporate or state scrutiny.',
            extraCompendiumCategories: ['Technology', 'Ships & Craft', 'Planets & Locations', 'Alien Species', 'Governments']
        },
        {
            id: 'modern',
            label: 'Modern',
            icon: '🏙️',
            promptDescriptor: 'present-day technology, urban and suburban settings, contemporary institutions, everyday social dynamics',
            charDescription: 'Characters hold jobs, leases, and roles in familiar institutions — workplaces, schools, neighborhoods. Income, housing, and daily logistics shape what they can do. Public identity and private life usually align, but obligations and reputation carry weight.',
            extraCompendiumCategories: []
        },
        {
            id: 'historical',
            label: 'Historical',
            icon: '🏛️',
            promptDescriptor: 'period-appropriate technology, era-specific customs, class and rank structures, historical social dynamics',
            charDescription: 'Characters occupy a rank, station, or profession that governs what they may do and whom they answer to. Their trade and income determine clothing, housing, and movement. Custom, law, and obligation shape daily life more than personal preference.',
            extraCompendiumCategories: ['Timeline', 'Historical Figures', 'Period Glossary', 'Customs & Society']
        },
        {
            id: 'horror',
            label: 'Horror',
            icon: '👻',
            promptDescriptor: 'threatening environments, supernatural or psychological danger, institutions that fail or conceal, scarcity of safety',
            charDescription: 'Characters face danger with limited resources and uncertain allies. Their occupation, resources, and location determine what protection they have. Institutions may conceal the threat rather than help. Survival depends on specific facts, not courage alone.',
            extraCompendiumCategories: ['Entities & Creatures', 'Tension Trackers', 'Haunted Locations', 'Artifacts']
        },
        {
            id: 'romance',
            label: 'Romance',
            icon: '💕',
            promptDescriptor: 'intimacy and connection, relationship dynamics, emotional vulnerability, social settings that bring people together',
            charDescription: 'Characters experience attraction, attachment, and vulnerability within social constraints. Their role, income, and daily routines shape who they meet and how. Intimacy is negotiated through behavior, not declared through theme.',
            extraCompendiumCategories: ['Relationship Beats', 'Chemistry Notes', 'Tropes', 'Love Languages']
        },
        {
            id: 'erotic-romance',
            label: 'Erotic Romance',
            icon: '🔥',
            promptDescriptor: 'desire and intimacy, physical and emotional connection, vulnerability in attraction, privacy versus exposure',
            charDescription: 'Characters navigate desire within social, professional, or personal boundaries. Their role, reputation, and logistics determine where and how intimacy can happen. Physical connection carries emotional and practical consequences.',
            extraCompendiumCategories: ['Chemistry Beats', 'Spice Tracker', 'Intimate Scenes', 'Relationship Dynamics']
        },
        {
            id: 'western',
            label: 'Western',
            icon: '🤠',
            promptDescriptor: 'frontier landscapes, scarce resources, harsh justice, land and water rights, sparse institutions',
            charDescription: 'Characters survive on the frontier where resources are scarce and institutions are thin. Their occupation — rancher, lawman, outlaw, trader — determines standing and means. Land, water, and reputation are the currency of daily life.',
            extraCompendiumCategories: ['Locations', 'Factions', 'Outlaws']
        },
        {
            id: 'cyberpunk',
            label: 'Cyberpunk',
            icon: '🔮',
            promptDescriptor: 'neon urban decay, corporate control, cybernetic augmentation, high technology and low living conditions',
            charDescription: 'Characters live under corporate or institutional control that shapes work, movement, and access. Augmentation, credits, and employer standing determine what they can afford and where they can go. Public persona and private reality often conflict under constant surveillance.',
            extraCompendiumCategories: ['Cybernetics & Tech', 'Corporations', 'Districts', 'Hacker Culture']
        },
        {
            id: 'post-apocalyptic',
            label: 'Post-Apocalyptic',
            icon: '☢️',
            promptDescriptor: 'fallen civilization, scarce resources, survivor communities, weathered infrastructure, daily survival logistics',
            charDescription: 'Characters survive where resources are scarce and every day is a negotiation with danger. Their role in a community — scavenger, guard, trader, healer — determines what they carry and who they answer to. Kit, food, and medicine are the measure of wealth.',
            extraCompendiumCategories: ['Survivors & Factions', 'Hazards', 'Ruins & Locations', 'Resources']
        },
        {
            id: 'superhero',
            label: 'Superhero',
            icon: '🦸',
            promptDescriptor: 'extraordinary powers with physical limits, registration and oversight agencies, civilian life interrupted by heroics, collateral and liability',
            charDescription: 'Characters have powers with specific mechanisms, limits, and recovery costs. Their classification — registered, unregistered, ranked — determines institutional oversight. A civilian job, income, and housing coexist with the public identity. Kit, safehouses, and liability shape what they can do.',
            extraCompendiumCategories: ['Powers & Abilities', 'Heroes & Villains', 'Teams & Factions', 'Secret Identities']
        },
        {
            id: 'mystery-thriller',
            label: 'Mystery & Thriller',
            icon: '🕵️',
            promptDescriptor: 'secrets and concealed facts, investigative logic, institutions that protect their own, danger that escalates as truth nears',
            charDescription: 'Characters investigate within institutions that may conceal the truth. Their role, clearance, and access determine what they can learn and whom they can trust. Every clue and relationship carries risk. Nothing is quite what it seems.',
            extraCompendiumCategories: ['Clues & Evidence', 'Suspects', 'Timeline', 'Locations']
        },
        {
            id: 'dystopian',
            label: 'Dystopian',
            icon: '🏚️',
            promptDescriptor: 'oppressive regimes, surveillance and control, rationed resources, institutions that monitor and discipline',
            charDescription: 'Characters live under a regime that monitors movement, rations goods, and rewrites history. Their job classification, ration level, and institutional standing determine daily survival. Public compliance and private resistance exist side by side.',
            extraCompendiumCategories: ['Regime & Governance', 'Surveillance', 'Resistance', 'Technology']
        },
        {
            id: 'urban-fantasy',
            label: 'Urban Fantasy',
            icon: '🌆',
            promptDescriptor: 'magic hidden in plain sight, supernatural communities, secret councils, modern institutions alongside the occult',
            charDescription: 'Characters move between the ordinary modern world and hidden supernatural communities. Their trade, affiliations, and access to magic determine what they can do. The masquerade — keeping the ordinary world unaware — governs public behavior.',
            extraCompendiumCategories: ['Hidden Factions', 'Supernatural Beings', 'Magic & Artifacts', 'Locations']
        },
        {
            id: 'adventure',
            label: 'Adventure',
            icon: '🧭',
            promptDescriptor: 'expeditions and hazardous locations, lost sites and treasures, environment as obstacle, discovery as goal',
            charDescription: 'Characters undertake expeditions where the environment itself is an obstacle. Their role — guide, scholar, treasure-seeker, mercenary — determines equipment and standing. Hazards, rivals, and terrain shape what is possible.',
            extraCompendiumCategories: ['Expeditions', 'Landmarks', 'Artifacts', 'Factions']
        },
        {
            id: 'space-opera',
            label: 'Space Opera',
            icon: '🌌',
            promptDescriptor: 'galactic empires and dynasties, starship fleets, interstellar politics, alien civilizations with old grudges',
            charDescription: 'Characters serve empires, fleets, stations, or independent outposts across star systems. Their rank, affiliation, and ship access determine movement and authority. Interstellar politics and ancient grudges shape daily life as much as local conditions.',
            extraCompendiumCategories: ['Galactic Polities', 'Ships & Crews', 'Alien Races', 'Key Locations']
        },
        {
            id: 'litrpg',
            label: 'LitRPG',
            icon: '🎮',
            promptDescriptor: 'visible stats and levels, game systems that govern society, classes and skills, quests with concrete rewards',
            charDescription: 'Characters live under game-like rules — visible stats, levels, skills, and classes — that shape society and economy. Their class and progression determine what they can do and where they belong. Quests and rewards structure ambition and survival.',
            extraCompendiumCategories: ['Systems & Stats', 'Classes & Skills', 'Quests', 'Guilds & Parties', 'Game Zones']
        },
        {
            id: 'slice-of-life',
            label: 'Slice of Life',
            icon: '☕',
            promptDescriptor: 'everyday places and routines, gentle conflict, quiet growth, ordinary social obligations',
            charDescription: 'Characters live through ordinary days in kitchens, schools, workplaces, and neighborhoods. Their job, family role, and routines determine daily movement. Small ambitions and quiet turning points matter more than grand events.',
            extraCompendiumCategories: []
        },
        {
            id: 'anime',
            label: 'Anime',
            icon: '🎌',
            promptDescriptor: 'expressive emotion, dramatic beats, larger-than-life character dynamics, visible emotional states',
            charDescription: 'Characters experience emotion visibly and dramatically within structured social settings — schools, clubs, organizations. Their role and relationships determine how they move through the world. Expressive reaction and bold dynamics drive interaction.',
            extraCompendiumCategories: ['Character Archetypes', 'Tropes & Conventions', 'Clubs & Groups', 'Settings']
        },
        {
            id: 'shonen',
            label: 'Shonen',
            icon: '💥',
            promptDescriptor: 'rivalries and tournaments, training and progression, power levels, strength tested by battle',
            charDescription: 'Characters rise through ranks in martial schools, leagues, or organizations where strength defines standing. Their power level, training, and rivalry determine what they can achieve. Growth through effort and battle is the measure of progress.',
            extraCompendiumCategories: ['Power Systems', 'Tournaments', 'Rivalries', 'Organizations']
        },
        {
            id: 'isekai',
            label: 'Isekai',
            icon: '🌀',
            promptDescriptor: 'transported or reborn into another world, different rules and magic systems, outsider perspective, adaptation to new reality',
            charDescription: 'Characters arrive in another world with different rules, magic systems, and social structures. Their origin, abilities, and knowledge determine how they adapt and what they can do. They are outsiders who must learn local customs, institutions, and dangers.',
            extraCompendiumCategories: ['Other World Systems', 'Cheats & Abilities', 'Regions & Kingdoms', 'Factions']
        },
        {
            id: 'superpowers',
            label: 'Superpowers',
            icon: '⚡',
            promptDescriptor: 'awakened abilities with classifications, academies that train and rank, organizations that regulate powers, cost of being extraordinary',
            charDescription: 'Characters have awakened abilities with specific classifications and rankings. Academies, agencies, or organizations train, rank, and regulate them. Their power comes with costs — physical, social, or institutional — that shape daily life.',
            extraCompendiumCategories: ['Power Classifications', 'Academies & Organizations', 'Awakening Events', 'Rankings']
        },
        {
            id: 'sports',
            label: 'Sports',
            icon: '🏈',
            promptDescriptor: 'training and competition, team structure, the body under load, selection and standing',
            charDescription: 'Characters compete within a sport at a specific level — school, club, league, national — with a defined position and role. Their training schedule, coach, and team standing shape daily life. Injuries, regimen, and kit determine what they can do. The next fixture and selection pressure create ongoing stakes.',
            extraCompendiumCategories: ['Teams', 'Venues', 'Records', 'Rivalries', 'Equipment']
        },
        {
            id: 'hollywood-celebrity',
            label: 'Hollywood & Celebrity',
            icon: '🎬',
            promptDescriptor: 'public image and private truth, studio machinery and media training, red carpets and press, reputation as currency',
            charDescription: 'Characters navigate public persona and private self under constant media and public scrutiny. Their role — actor, musician, athlete, public figure — determines access, income, and exposure. Image management and reputation are daily work, not occasional concerns.',
            extraCompendiumCategories: ['Public Image & Persona', 'Scandals & Rumors', 'Projects & Roles', 'Entourage & Team', 'Paparazzi & Media']
        },
        {
            id: 'social-media-influencer',
            label: 'Social Media & Influencers',
            icon: '📱',
            promptDescriptor: 'content creation and follower counts, brand deals and sponsorships, online persona versus real life, algorithmic visibility',
            charDescription: 'Characters create content under platform logic where engagement is validation and follower counts are currency. Their niche, audience, and brand deals determine income and visibility. Online persona and offline life exist in constant tension.',
            extraCompendiumCategories: ['Content & Niches', 'Platforms & Algorithms', 'Brand Deals', 'Fan Communities', 'Collabs & Crews']
        },
        {
            id: 'political-business',
            label: 'Political & Business',
            icon: '💼',
            promptDescriptor: 'institutional procedure and leverage, ideology versus incentive, money and law as stakes, power exercised through access and information',
            charDescription: 'Characters operate within institutions — government, corporations, boards — where procedure and leverage decide outcomes. Their rank, access, and affiliations determine what they can achieve. Money, jobs, law, and reputation are the material stakes of every move.',
            extraCompendiumCategories: ['Elections', 'Lobbying', 'Corporations', 'Policy', 'Wealth & Inequality']
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

    function getCharDescription(genreId) {
        return findGenre(genreId)?.charDescription || '';
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
        getCharDescription
    };
})();

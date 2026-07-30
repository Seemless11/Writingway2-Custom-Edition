(function () {
    const GENRES = window.GenreDefs ? window.GenreDefs.GENRES : [
        { id: 'fantasy', label: 'Fantasy', icon: '⚔️' }
    ];

    function GENRE_DESCRIPTIONS(id) {
        return window.GenreDefs ? window.GenreDefs.getWorldDescription([id]) : '';
    }

    const WORLD_TRAIT_CATEGORIES = [
        {
            id: 'setting',
            label: 'Setting & Geography',
            groups: [
                {
                    label: 'Environment',
                    traits: [
                        { id: 'env_forests', label: 'Forests & Woodlands', hint: 'Dense ancient forests, open woodlands, or mystical groves. What creatures and secrets do they hide?' },
                        { id: 'env_mountains', label: 'Mountains & Highlands', hint: 'Towering peaks, treacherous passes, and hidden valleys. Resources and isolation define life here.' },
                        { id: 'env_desert', label: 'Deserts & Wastelands', hint: 'Endless sand, scorching days, and freezing nights. Survival demands resilience and knowledge of hidden oases.' },
                        { id: 'env_oceans', label: 'Oceans & Coastlines', hint: 'Vast seas, rugged shores, and the mysteries beneath the waves. Trade, travel, and danger from the deep.' },
                        { id: 'env_plains', label: 'Plains & Grasslands', hint: 'Open horizons, nomadic peoples, and fertile soil. The breadbasket of civilizations.' },
                        { id: 'env_urban', label: 'Urban / Cityscape', hint: 'Dense population centers, towering architecture, and the pulse of civilization. Opportunity and crime in equal measure.' },
                        { id: 'env_jungle', label: 'Jungles & Rainforests', hint: 'Lush, deadly, and teeming with life. Every step could reveal wonder or danger.' },
                        { id: 'env_tundra', label: 'Tundra & Frozen Wastes', hint: 'Relentless cold, scarce resources, and brutal conditions. Only the strong or stubborn endure.' },
                        { id: 'env_underground', label: 'Underground / Caverns', hint: 'A world beneath the world. Caves, tunnels, and subterranean civilizations hidden from the sun.' },
                        { id: 'env_artificial', label: 'Artificial / Constructed', hint: 'Arcologies, space stations, megacities — environments built by design, not nature.' }
                    ]
                },
                {
                    label: 'Climate',
                    traits: [
                        { id: 'climate_temperate', label: 'Temperate', hint: 'Four distinct seasons. Mild winters, warm summers. Predictable and forgiving.' },
                        { id: 'climate_tropical', label: 'Tropical', hint: 'Hot and humid year-round. Rainy seasons and lush growth.' },
                        { id: 'climate_arid', label: 'Arid / Dry', hint: 'Minimal rainfall. Water is precious, and life adapts to scarcity.' },
                        { id: 'climate_frigid', label: 'Frigid', hint: 'Bitter cold dominates. Short summers, long winters.' },
                        { id: 'climate_volatile', label: 'Volatile / Extreme', hint: 'Unpredictable weather patterns. Storms, quakes, or magical phenomena shape daily life.' },
                        { id: 'climate_artificial', label: 'Artificial / Controlled', hint: 'Climate is engineered — domes, terraforming, or weather control systems.' }
                    ]
                },
                {
                    label: 'Geography',
                    traits: [
                        { id: 'geo_continent', label: 'Single Continent', hint: 'One major landmass. The known world has clear boundaries.' },
                        { id: 'geo_archipelago', label: 'Archipelago / Islands', hint: 'Countless islands scattered across vast waters. Travel is by sea.' },
                        { id: 'geo_fractured', label: 'Fractured / Floating', hint: 'Broken geography — floating islands, shifting lands, or realms separated by impassable barriers.' },
                        { id: 'geo_planetary', label: 'Planetary / Multi-World', hint: 'Spans multiple planets, dimensions, or realms. Travel between them is possible.' },
                        { id: 'geo_bounded', label: 'Bounded / Contained', hint: 'The world has limits — a dome, a ring, a finite space with edges.' }
                    ]
                },
                {
                    label: 'Time Period',
                    traits: [
                        { id: 'time_ancient', label: 'Ancient / Prehistoric', hint: 'Early civilizations, primal forces, and the dawn of recorded history.' },
                        { id: 'time_medieval', label: 'Medieval / Feudal', hint: 'Kingdoms, castles, and chivalry. Faith and sword define power.' },
                        { id: 'time_renaissance', label: 'Renaissance / Age of Discovery', hint: 'Exploration, invention, and the questioning of old orders. The world is expanding.' },
                        { id: 'time_industrial', label: 'Industrial Revolution', hint: 'Steam, factories, and social upheaval. Progress and exploitation walk hand in hand.' },
                        { id: 'time_modern', label: 'Modern / Contemporary', hint: 'Present-day technology, culture, and global connection.' },
                        { id: 'time_future', label: 'Future / Advanced', hint: 'Advanced technology, spacefaring civilization, and new social orders.' },
                        { id: 'time_postapoc', label: 'Post-Apocalyptic', hint: 'After the fall. Rebuilding, surviving, or inheriting the ruins.' },
                        { id: 'time_timeless', label: 'Timeless / Mythic', hint: 'Era is undefined or irrelevant. The world exists outside historical progression.' }
                    ]
                }
            ]
        },
        {
            id: 'society',
            label: 'Society & Culture',
            groups: [
                {
                    label: 'Government',
                    traits: [
                        { id: 'gov_monarchy', label: 'Monarchy', hint: 'Rule by a single sovereign. Bloodline determines leadership.' },
                        { id: 'gov_democracy', label: 'Democracy / Republic', hint: 'Power through elected representation. The people have a voice.' },
                        { id: 'gov_theocracy', label: 'Theocracy', hint: 'Religious authority governs. Faith and law are inseparable.' },
                        { id: 'gov_oligarchy', label: 'Oligarchy / Plutocracy', hint: 'Rule by the few — wealth, military, or ancient families hold power.' },
                        { id: 'gov_dictatorship', label: 'Dictatorship / Empire', hint: 'Absolute rule by one. Dissent is not tolerated.' },
                        { id: 'gov_anarchy', label: 'Anarchy / No Central Rule', hint: 'No formal government. Communities self-govern or chaos reigns.' },
                        { id: 'gov_meritocracy', label: 'Meritocracy', hint: 'Power earned through ability. Status is not inherited.' },
                        { id: 'gov_corporate', label: 'Corporate State', hint: 'Mega-corporations hold the real power. Citizenship is tied to employment.' },
                        { id: 'gov_council', label: 'Council / Confederacy', hint: 'Multiple factions or regions share power through agreement.' }
                    ]
                },
                {
                    label: 'Economic System',
                    traits: [
                        { id: 'econ_market', label: 'Market Economy', hint: 'Trade, currency, and merchants. Supply and demand drive value.' },
                        { id: 'econ_barter', label: 'Barter / Resource-Based', hint: 'Goods and services exchanged directly. Trust and need define value.' },
                        { id: 'econ_feudal', label: 'Feudal / Agrarian', hint: 'Land ownership defines wealth. Serfs, lords, and obligations.' },
                        { id: 'econ_planned', label: 'Planned / Controlled', hint: 'Central authority directs production and distribution.' },
                        { id: 'econ_scarcity', label: 'Scarcity / Survival', hint: 'Resources are limited. Hoarding, rationing, and black markets dominate.' },
                        { id: 'econ_post', label: 'Post-Scarcity', hint: 'Automation and abundance have eliminated material want.' }
                    ]
                },
                {
                    label: 'Social Structure',
                    traits: [
                        { id: 'social_rigid', label: 'Rigid Hierarchy', hint: 'Castes, estates, or fixed classes. Mobility is rare and hard-won.' },
                        { id: 'social_fluid', label: 'Fluid / Mobile', hint: 'Class is flexible. Effort and luck can change your standing.' },
                        { id: 'social_egalitarian', label: 'Egalitarian', hint: 'Built on equality. Difference is celebrated or minimized.' },
                        { id: 'social_stratified', label: 'Stratified by Power', hint: 'Those with power (magic, tech, wealth) rule. The rest serve.' },
                        { id: 'social_segregated', label: 'Segregated / Divided', hint: 'Species, race, or affiliation divides society into separate spheres.' }
                    ]
                },
                {
                    label: 'Cultural Values',
                    traits: [
                        { id: 'values_honor', label: 'Honor & Tradition', hint: 'Reputation, ancestry, and custom guide behavior. Shame is a powerful force.' },
                        { id: 'values_progress', label: 'Progress & Innovation', hint: 'Forward-thinking. Change is embraced, tradition is questioned.' },
                        { id: 'values_faith', label: 'Faith & Devotion', hint: 'Spirituality permeates daily life. The divine is ever-present.' },
                        { id: 'values_freedom', label: 'Freedom & Independence', hint: 'Individual liberty is paramount. Authority is viewed with suspicion.' },
                        { id: 'values_community', label: 'Community & Cooperation', hint: 'The group matters more than the individual. Solidarity is survival.' },
                        { id: 'values_power', label: 'Power & Dominance', hint: 'Strength is respected. The strong lead, the weak follow or fall.' },
                        { id: 'values_pleasure', label: 'Pleasure & Aesthetics', hint: 'Art, beauty, and enjoyment are life\'s highest pursuits.' }
                    ]
                }
            ]
        },
        {
            id: 'power',
            label: 'Power & Resources',
            groups: [
                {
                    label: 'Magic System',
                    genres: ['fantasy', 'historical', 'horror', 'superhero'],
                    traits: [
                        { id: 'magic_none', label: 'No Magic', hint: 'The world operates by natural laws alone. No supernatural forces.' },
                        { id: 'magic_arcane', label: 'Arcane / Studied', hint: 'Magic is learned through study, formulas, and discipline.' },
                        { id: 'magic_innate', label: 'Innate / Bloodline', hint: 'Magic runs in bloodlines. Born with it or not at all.' },
                        { id: 'magic_divine', label: 'Divine / Blessed', hint: 'Power granted by gods, spirits, or higher powers.' },
                        { id: 'magic_natural', label: 'Natural / Druidic', hint: 'Magic flows from the natural world. Balance is essential.' },
                        { id: 'magic_forbidden', label: 'Forbidden / Dark', hint: 'Magic is taboo, dangerous, or corrupting. Used at great risk.' },
                        { id: 'magic_common', label: 'Common / Mundane', hint: 'Magic is everyday. Like technology, it is accessible and integrated.' },
                        { id: 'magic_rare', label: 'Rare / Dying', hint: 'Magic is fading. Those who wield it are remnants of a previous age.' },
                        { id: 'magic_ritual', label: 'Ritual / Sacrificial', hint: 'Magic requires components — blood, life, rare materials. Power has a price.' }
                    ]
                },
                {
                    label: 'Magic System',
                    genres: ['romance', 'erotic-romance'],
                    traits: [
                        { id: 'magic_none', label: 'No Magic', hint: 'The world operates by natural laws alone. No supernatural forces.' },
                        { id: 'magic_innate', label: 'Innate / Bloodline', hint: 'Magic runs in bloodlines. Born with it or not at all.' },
                        { id: 'magic_divine', label: 'Divine / Blessed', hint: 'Power granted by gods, spirits, or higher powers.' },
                        { id: 'magic_natural', label: 'Natural / Druidic', hint: 'Magic flows from the natural world. Balance is essential.' },
                        { id: 'magic_common', label: 'Common / Mundane', hint: 'Magic is everyday. Like technology, it is accessible and integrated.' },
                        { id: 'magic_rare', label: 'Rare / Dying', hint: 'Magic is fading. Those who wield it are remnants of a previous age.' }
                    ]
                },
                {
                    label: 'Technology Level',
                    traits: [
                        { id: 'tech_stone', label: 'Stone Age / Primitive', hint: 'Basic tools, fire, and simple shelters. Survival is direct and physical.' },
                        { id: 'tech_medieval', label: 'Medieval / Pre-Industrial', hint: 'Horses, windmills, and handcraft. Muscle and nature provide power.' },
                        { id: 'tech_steam', label: 'Steam / Industrial', hint: 'Factories, railways, and mass production. Industry transforms society.' },
                        { id: 'tech_electric', label: 'Electric / Modern', hint: 'Electricity, computing, and global communication. Information is instant.' },
                        { id: 'tech_advanced', label: 'Advanced / Futuristic', hint: 'AI, robotics, and advanced materials. Science has transformed daily life.' },
                        { id: 'tech_transhuman', label: 'Transhuman / Post-Human', hint: 'Humanity has augmented beyond biological limits. Mind, body, and machine merge.' },
                        { id: 'tech_mixed', label: 'Mixed / Anachronistic', hint: 'Different levels coexist. Horse-drawn carts next to hovercars.' },
                        { id: 'tech_ruins', label: 'Ruins of Advanced Tech', hint: 'Remnants of a higher technology remain, but the knowledge to create it is lost.' }
                    ]
                },
                {
                    label: 'Supernatural Elements',
                    genres: ['fantasy', 'horror', 'romance', 'erotic-romance', 'superhero'],
                    traits: [
                        { id: 'super_none', label: 'None / Minimal', hint: 'The world is grounded. Supernatural elements are absent or extremely rare.' },
                        { id: 'super_spirits', label: 'Spirits & Ghosts', hint: 'The dead linger. Spirits can be communicated with, appeased, or feared.' },
                        { id: 'super_monsters', label: 'Monsters & Beasts', hint: 'Creatures beyond natural biology exist. Some are threats, some are wonders.' },
                        { id: 'super_gods', label: 'Gods & Divine Forces', hint: 'Active deities intervene in mortal affairs. Prayers can be answered.' },
                        { id: 'super_demons', label: 'Demons & Dark Forces', hint: 'Malevolent entities from other realms threaten the world.' },
                        { id: 'super_psionics', label: 'Psionics / ESP', hint: 'Psychic powers — telepathy, telekinesis, precognition — exist and can be developed.' },
                        { id: 'super_undead', label: 'Undead / Necromancy', hint: 'Death is not the end. The dead can be raised, controlled, or return on their own.' },
                        { id: 'super_fae', label: 'Fae / Fair Folk', hint: 'Otherworldly beings with their own rules. Beautiful, dangerous, and bound by ancient laws.' }
                    ]
                },
                {
                    label: 'Key Resources',
                    traits: [
                        { id: 'resource_water', label: 'Water', hint: 'Clean water is scarce and precious. Control of it is power.' },
                        { id: 'resource_metal', label: 'Metals & Minerals', hint: 'Iron, gold, rare earths — the bones of civilization.' },
                        { id: 'resource_magic_fuel', label: 'Magical Fuel / Mana', hint: 'A specific substance powers magic. Without it, the world dims.' },
                        { id: 'resource_energy', label: 'Energy / Fuel', hint: 'Oil, fusion, antimatter — whatever keeps the lights on.' },
                        { id: 'resource_food', label: 'Food / Agriculture', hint: 'Fertile land is the foundation of society. Hunger drives conflict.' },
                        { id: 'resource_information', label: 'Information / Data', hint: 'Knowledge is the ultimate commodity. Control of information is control of society.' },
                        { id: 'resource_labor', label: 'Labor / Population', hint: 'People are the resource. Slavery, conscription, or workforce management.' }
                    ]
                }
            ]
        },
        {
            id: 'history',
            label: 'History & Lore',
            groups: [
                {
                    label: 'Ancient History',
                    traits: [
                        { id: 'ancient_golden_age', label: 'Lost Golden Age', hint: 'A prosperous era long past. Ruins and legends remain.' },
                        { id: 'ancient_cataclysm', label: 'Great Cataclysm', hint: 'A world-shattering event reshaped everything. The scars are still visible.' },
                        { id: 'ancient_war', label: 'Ancient War', hint: 'A conflict so vast it shaped borders, cultures, and grudges for millennia.' },
                        { id: 'ancient_rise', label: 'Rise from Nothing', hint: 'Civilization emerged from barbarism relatively recently. History is short.' },
                        { id: 'ancient_unknown', label: 'Unknown / Forgotten', hint: 'The distant past is a mystery. Records don\'t exist or are deliberately hidden.' },
                        { id: 'ancient_continuous', label: 'Continuous Civilization', hint: 'Unbroken lineage. The same culture has endured for thousands of years.' }
                    ]
                },
                {
                    label: 'Recent Events',
                    traits: [
                        { id: 'recent_war', label: 'Recent War', hint: 'A major conflict ended recently. The peace is fragile.' },
                        { id: 'recent_disaster', label: 'Natural Disaster', hint: 'Earthquake, plague, famine — a recent catastrophe reshaped society.' },
                        { id: 'recent_discovery', label: 'Great Discovery', hint: 'A breakthrough — magical, scientific, or geographic — changed everything.' },
                        { id: 'recent_regime', label: 'Regime Change', hint: 'A new ruler or government took power. Stability is uncertain.' },
                        { id: 'recent_peace', label: 'Long Peace', hint: 'Generations without major conflict. Complacency or genuine harmony?' },
                        { id: 'recent_tension', label: 'Rising Tension', hint: 'Things are building toward a breaking point. Everyone feels it.' }
                    ]
                }
            ]
        },
        {
            id: 'atmosphere',
            label: 'Atmosphere & Tone',
            groups: [
                {
                    label: 'Mood',
                    traits: [
                        { id: 'mood_hopeful', label: 'Hopeful / Optimistic', hint: 'The world believes in progress, kindness, and a better tomorrow.' },
                        { id: 'mood_gritty', label: 'Gritty / Bleak', hint: 'The world is hard. Survival is a struggle, and happy endings are rare.' },
                        { id: 'mood_mysterious', label: 'Mysterious / Uncanny', hint: 'Nothing is quite as it seems. Strange things happen just out of sight.' },
                        { id: 'mood_whimsical', label: 'Whimsical / Fantastical', hint: 'The world is strange, playful, and not bound by strict logic.' },
                        { id: 'mood_grimdark', label: 'Grimdark / Hopeless', hint: 'The world is fundamentally cruel. Good intentions lead to ruin.' },
                        { id: 'mood_nostalgic', label: 'Nostalgic / Melancholic', hint: 'A sense of longing for what was lost. Beauty in decay.' },
                        { id: 'mood_peaceful', label: 'Peaceful / Serene', hint: 'Calm and unhurried. Conflict exists but does not define the world.' }
                    ]
                },
                {
                    label: 'Aesthetic',
                    traits: [
                        { id: 'aesthetic_medieval', label: 'Medieval / Rustic', hint: 'Stone, wood, and shadow. Castles, taverns, and cobblestone streets.' },
                        { id: 'aesthetic_sleek', label: 'Sleek / Modern', hint: 'Clean lines, glass, and steel. Minimalist and efficient.' },
                        { id: 'aesthetic_deco', label: 'Art Deco / Retro', hint: 'Bold geometry, rich colors, and vintage futurism.' },
                        { id: 'aesthetic_gothic', label: 'Gothic / Dark', hint: 'Spires, vaulted ceilings, and dramatic shadows. Beauty in darkness.' },
                        { id: 'aesthetic_neon', label: 'Neon / Cyberpunk', hint: 'Bioluminescence, holograms, and rain-slicked streets. High contrast.' },
                        { id: 'aesthetic_natural', label: 'Natural / Organic', hint: 'Living materials, harmony with nature, and organic forms.' },
                        { id: 'aesthetic_ruins', label: 'Ruins / Decay', hint: 'Beautiful deterioration. Nature reclaiming what was built.' },
                        { id: 'aesthetic_crystal', label: 'Crystal / Ethereal', hint: 'Translucent, glowing, and otherworldly. Light plays across everything.' }
                    ]
                },
                {
                    label: 'Moral Ambiguity',
                    traits: [
                        { id: 'moral_clear', label: 'Clear Good vs Evil', hint: 'Right and wrong are distinct. Heroes and villains are recognizable.' },
                        { id: 'moral_grey', label: 'Morally Grey', hint: 'Everyone has reasons. Good people do bad things and vice versa.' },
                        { id: 'moral_bleak', label: 'Bleak / No Right Choice', hint: 'Every option has a cost. There is no clean path forward.' },
                        { id: 'moral_relativistic', label: 'Culturally Relative', hint: 'Morality depends on perspective. What is evil to one is virtue to another.' }
                    ]
                }
            ]
        }
    ];

    const DEFAULT_INSTRUCTION_TEMPLATES = [
        { id: 'overview', label: 'Describe World Overview', message: 'Describe this world at a high level — what makes it unique, its defining characteristics, and the feeling it evokes.', relevantCategories: ['setting', 'atmosphere'] },
        { id: 'geography', label: 'Detail Geography & Environment', message: 'Describe the physical world in detail — landscapes, climates, natural wonders, and how the environment shapes civilization.', relevantCategories: ['setting'] },
        { id: 'society', label: 'Explain Society & Culture', message: 'Describe how society is organized — government, social classes, cultural values, and daily life for ordinary people.', relevantCategories: ['society'] },
        { id: 'power', label: 'Describe Power Systems', message: 'Describe how magic, technology, or supernatural forces work in this world — who controls them, how they\'re accessed, and their impact on society.', relevantCategories: ['power'] },
        { id: 'history', label: 'Detail History & Lore', message: 'Describe the world\'s history — ancient events, recent conflicts, and how the past shapes the present.', relevantCategories: ['history'] },
        { id: 'factions', label: 'Define Factions & Groups', message: 'Describe the major factions, organizations, or groups in this world — their goals, territories, and relationships with each other.', relevantCategories: ['society', 'power'] },
        { id: 'conflicts', label: 'Describe Current Conflicts', message: 'Describe the tensions and conflicts currently shaping this world — wars, political struggles, resource disputes, or ideological divides.', relevantCategories: ['history', 'society'] },
        { id: 'culture', label: 'Describe Daily Life', message: 'Describe what everyday life looks like for an ordinary person in this world — food, shelter, work, entertainment, and community.', relevantCategories: ['society', 'setting'] },
        { id: 'custom', label: 'Custom Instruction', message: '' }
    ];

    const WORLD_SYSTEM_PROMPT = 'You are a worldbuilding assistant helping to develop detailed, immersive worlds for creative writing. Your role is to help flesh out a world based on selected traits, notes, and the user\'s directions.\n\nWhen asked to expand on a world:\n- Write in vivid, descriptive prose — show the world, don\'t just list facts\n- Connect traits together into a coherent, believable setting\n- Suggest how geography, society, and power systems interact\n- Build lore that feels lived-in and consistent\n- Keep descriptions evocative but concise (2-4 paragraphs per topic)\n- Do not add major new elements unless the user asks you to\n\nIf the user provides specific traits, weave them naturally into the description rather than just listing them.';

    const USER_TRAITS_KEY = 'ww_world_creator_user_traits';
    let userTraits = {};

    function getUserTraits() { return userTraits; }

    function loadUserTraits() {
        try {
            const saved = localStorage.getItem(USER_TRAITS_KEY);
            if (saved) userTraits = JSON.parse(saved);
        } catch (e) { userTraits = {}; }
    }

    function saveUserTraits() {
        try { localStorage.setItem(USER_TRAITS_KEY, JSON.stringify(userTraits)); } catch (e) {}
    }

    function addUserTrait(categoryId, groupLabel, label, hint) {
        const id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const trait = { id, label, hint: hint || '' };
        if (!userTraits[categoryId]) userTraits[categoryId] = {};
        if (!userTraits[categoryId][groupLabel]) userTraits[categoryId][groupLabel] = [];
        userTraits[categoryId][groupLabel].push(trait);
        saveUserTraits();
        return id;
    }

    function removeUserTrait(categoryId, groupLabel, traitId) {
        if (!userTraits[categoryId] || !userTraits[categoryId][groupLabel]) return;
        const idx = userTraits[categoryId][groupLabel].findIndex(t => t.id === traitId);
        if (idx === -1) return;
        userTraits[categoryId][groupLabel].splice(idx, 1);
        if (userTraits[categoryId][groupLabel].length === 0) delete userTraits[categoryId][groupLabel];
        if (Object.keys(userTraits[categoryId]).length === 0) delete userTraits[categoryId];
        saveUserTraits();
    }

    function findTrait(categoryId, traitId) {
        const cat = WORLD_TRAIT_CATEGORIES.find(c => c.id === categoryId);
        if (cat) {
            for (const group of cat.groups) {
                const t = group.traits.find(t => t.id === traitId);
                if (t) return t;
            }
        }
        const userGroups = userTraits[categoryId];
        if (userGroups) {
            for (const traits of Object.values(userGroups)) {
                const t = traits.find(t => t.id === traitId);
                if (t) return t;
            }
        }
        return null;
    }

    function getTraitLabel(categoryId, traitId) {
        const t = findTrait(categoryId, traitId);
        return t ? t.label : traitId;
    }

    function getTraitHint(categoryId, traitId) {
        const t = findTrait(categoryId, traitId);
        return t ? (t.hint || '') : '';
    }

    function getCategoryGroupsForGenre(category, genreIds) {
        if (!Array.isArray(genreIds)) genreIds = [genreIds];
        const filtered = category.groups.filter(g => {
            if (!g.genres || g.genres.length === 0) return true;
            return g.genres.some(id => genreIds.includes(id));
        });
        const merged = [];
        const byLabel = new Map();
        for (const g of filtered) {
            const existing = byLabel.get(g.label);
            if (existing) {
                const seen = new Set(existing.traits.map(t => t.id));
                existing.traits = existing.traits.concat(g.traits.filter(t => !seen.has(t.id)));
            } else {
                const copy = { ...g, traits: [...g.traits] };
                byLabel.set(g.label, copy);
                merged.push(copy);
            }
        }
        return merged;
    }

    function getFilteredCategories(genreIds) {
        if (!Array.isArray(genreIds)) genreIds = [genreIds];
        return WORLD_TRAIT_CATEGORIES.map(cat => {
            let groups = getCategoryGroupsForGenre(cat, genreIds);
            const userGroups = userTraits[cat.id];
            if (userGroups) {
                groups = groups.map(g => {
                    const ut = userGroups[g.label];
                    if (ut && ut.length > 0) {
                        return { ...g, traits: [...g.traits, ...ut.filter(t => !g.traits.find(ot => ot.id === t.id))] };
                    }
                    return g;
                });
                for (const [groupLabel, traits] of Object.entries(userGroups)) {
                    if (traits.length > 0 && !groups.find(g => g.label === groupLabel)) {
                        groups.push({ label: groupLabel, traits: [...traits] });
                    }
                }
            }
            return { ...cat, groups: groups || [] };
        }).filter(cat => cat && Array.isArray(cat.groups) && cat.groups.length > 0);
    }

    function buildCompendiumEntry(name, notes, genre, selectedTraits, chatHistory, imageDescription) {
        const lines = [];
        const worldName = name || 'Unnamed World';

        if (notes) {
            lines.push('## Notes');
            lines.push('');
            lines.push(notes);
        }

        if (imageDescription) {
            if (lines.length) lines.push('');
            lines.push('## Visual Reference');
            lines.push('');
            lines.push(imageDescription.trim());
        }

        const catMap = {};
        for (const cat of WORLD_TRAIT_CATEGORIES) {
            const ids = selectedTraits[cat.id] || [];
            if (ids.length === 0) continue;
            const labels = [];
            for (const g of cat.groups) {
                for (const t of g.traits) {
                    if (ids.includes(t.id)) {
                        labels.push(g.label + ': ' + t.label);
                    }
                }
            }
            if (labels.length > 0) {
                catMap[cat.label] = labels;
            }
        }

        if (Object.keys(catMap).length > 0) {
            lines.push('## World Traits');
            lines.push('');
            for (const [cat, labels] of Object.entries(catMap)) {
                lines.push('**' + cat + ':** ' + labels.join(', '));
            }
        }

        const pairs = [];
        let lastUserMsg = '';
        for (const m of chatHistory) {
            if (m.role === 'user' && m.content) {
                lastUserMsg = m.content;
            } else if (m.role === 'assistant' && m.content && !m.isError) {
                const tpl = DEFAULT_INSTRUCTION_TEMPLATES.find(t => t.message && t.message === lastUserMsg);
                const label = tpl ? tpl.label : 'Custom Input';
                pairs.push({ label, content: m.content.trim() });
                lastUserMsg = '';
            }
        }

        if (pairs.length > 0) {
            lines.push('');
            lines.push('## World Details');
            lines.push('');
            for (const p of pairs) {
                lines.push('### ' + p.label);
                lines.push('');
                lines.push(p.content);
                lines.push('');
            }
        }

        return {
            title: worldName,
            body: lines.join('\n').trim(),
            category: 'worlds',
            tags: ['created'],
            imageUrl: null,
            alwaysInContext: false,
            isPovCharacter: false,
            _worldData: JSON.stringify({ name: worldName, genre: genre || '', notes: notes || '', selectedTraits: selectedTraits || {}, chatHistory: chatHistory || [], imageDescription: imageDescription || '' })
        };
    }

    function randomTraitsForGenre(genreIds) {
        if (!Array.isArray(genreIds)) genreIds = [genreIds];
        const filtered = getFilteredCategories(genreIds);
        const result = {};
        for (const cat of filtered) {
            const ids = [];
            for (const group of cat.groups) {
                if (!group.traits.length) continue;
                const pick = group.traits[Math.floor(Math.random() * group.traits.length)];
                ids.push(pick.id);
            }
            if (ids.length > 0) {
                result[cat.id] = ids;
            }
        }
        return result;
    }

    loadUserTraits();

    window.WorldCreator = {
        GENRES,
        GENRE_DESCRIPTIONS,
        WORLD_TRAIT_CATEGORIES,
        DEFAULT_INSTRUCTION_TEMPLATES,
        WORLD_SYSTEM_PROMPT,
        buildCompendiumEntry,
        getTraitLabel,
        getTraitHint,
        findTrait,
        getFilteredCategories,
        randomTraitsForGenre,
        getUserTraits,
        addUserTrait,
        removeUserTrait
    };

    // ========== Instruction Template Persistence ==========
    const USER_TEMPLATES_KEY = 'ww_world_creator_instruction_templates';
    const USER_SYSTEM_PROMPT_KEY = 'ww_world_creator_system_prompt';

    function saveInstructionTemplates(templates) {
        try { localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(templates)); } catch (e) {}
    }

    function loadInstructionTemplates() {
        try {
            const saved = localStorage.getItem(USER_TEMPLATES_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return DEFAULT_INSTRUCTION_TEMPLATES.map(t => ({ ...t, relevantCategories: t.relevantCategories || [] }));
    }

    function getSystemPrompt() {
        try { return localStorage.getItem(USER_SYSTEM_PROMPT_KEY) || WORLD_SYSTEM_PROMPT; } catch (e) { return WORLD_SYSTEM_PROMPT; }
    }

    function setSystemPrompt(prompt) {
        try {
            if (prompt === WORLD_SYSTEM_PROMPT) {
                localStorage.removeItem(USER_SYSTEM_PROMPT_KEY);
            } else {
                localStorage.setItem(USER_SYSTEM_PROMPT_KEY, prompt);
            }
        } catch (e) {}
    }

    function resetInstructionTemplates() {
        try { localStorage.removeItem(USER_TEMPLATES_KEY); } catch (e) {}
    }

    function resetSystemPrompt() {
        try { localStorage.removeItem(USER_SYSTEM_PROMPT_KEY); } catch (e) {}
    }

    window.WorldCreator.saveInstructionTemplates = saveInstructionTemplates;
    window.WorldCreator.loadInstructionTemplates = loadInstructionTemplates;
    window.WorldCreator.getSystemPrompt = getSystemPrompt;
    window.WorldCreator.setSystemPrompt = setSystemPrompt;
    window.WorldCreator.resetInstructionTemplates = resetInstructionTemplates;
    window.WorldCreator.resetSystemPrompt = resetSystemPrompt;
})();

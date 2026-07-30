(function () {
    const GENRES = window.GenreDefs ? window.GenreDefs.GENRES : [
        { id: 'fantasy', label: 'Fantasy', icon: '⚔️' }
    ];

    function GENRE_DESCRIPTIONS(id) {
        return window.GenreDefs ? window.GenreDefs.getScenarioDescription([id]) : '';
    }

    const SCENARIO_TRAIT_CATEGORIES = [
        {
            id: 'conflict',
            label: 'Conflict & Stakes',
            groups: [
                {
                    label: 'Conflict Type',
                    traits: [
                        { id: 'conflict_war', label: 'War / Battle', hint: 'Armed conflict between factions, nations, or ideologies. The clash of armies.' },
                        { id: 'conflict_mystery', label: 'Mystery / Investigation', hint: 'A puzzle to solve — a crime, a disappearance, a secret that demands uncovering.' },
                        { id: 'conflict_survival', label: 'Survival', hint: 'Against nature, circumstance, or pursuit. Every decision is life or death.' },
                        { id: 'conflict_personal', label: 'Personal / Emotional', hint: 'Internal or relational turmoil. The battle is within or between individuals.' },
                        { id: 'conflict_political', label: 'Political / Intrigue', hint: 'Schemes, alliances, and betrayals. Power is the prize, trust is the currency.' },
                        { id: 'conflict_romantic', label: 'Romantic Tension', hint: 'The push and pull of desire, timing, and emotional walls. Love as the central obstacle.' },
                        { id: 'conflict_moral', label: 'Moral / Ethical Dilemma', hint: 'No clear right answer. Every choice costs something the protagonist values.' },
                        { id: 'conflict_discovery', label: 'Discovery / Exploration', hint: 'Venturing into the unknown. The conflict is with the unfamiliar itself.' }
                    ]
                },
                {
                    label: 'Scale',
                    traits: [
                        { id: 'scale_intimate', label: 'Intimate / Personal', hint: 'Affects only a few people. The stakes are emotional and individual.' },
                        { id: 'scale_community', label: 'Community / Local', hint: 'Affects a town, a ship, a small group. The stakes are communal.' },
                        { id: 'scale_regional', label: 'Regional / Kingdom', hint: 'Affects a region or nation. The stakes involve many lives and resources.' },
                        { id: 'scale_global', label: 'Global / World', hint: 'The entire world is affected. The fate of civilization hangs in the balance.' },
                        { id: 'scale_cosmic', label: 'Cosmic / Existential', hint: 'Reality itself is at stake. Dimensions, gods, or the nature of existence.' }
                    ]
                },
                {
                    label: 'Intensity',
                    traits: [
                        { id: 'intensity_low', label: 'Low / Slow Burn', hint: 'Tension builds gradually. Patience and subtlety define the pacing.' },
                        { id: 'intensity_moderate', label: 'Moderate / Steady', hint: 'Consistent tension with peaks and valleys. Predictable but engaging.' },
                        { id: 'intensity_high', label: 'High / Relentless', hint: 'Constant pressure. Few moments of respite. The stakes keep escalating.' },
                        { id: 'intensity_extreme', label: 'Extreme / Crisis', hint: 'Everything is happening now. No time to breathe, no room for error.' }
                    ]
                }
            ]
        },
        {
            id: 'setup',
            label: 'Setup & Situation',
            groups: [
                {
                    label: 'Inciting Incident',
                    traits: [
                        { id: 'inciting_arrival', label: 'Arrival / Encounter', hint: 'Someone or something arrives, disrupting the status quo.' },
                        { id: 'inciting_discovery', label: 'Discovery / Revelation', hint: 'A secret is uncovered, changing everything.' },
                        { id: 'inciting_loss', label: 'Loss / Disaster', hint: 'Something important is taken or destroyed. The world shifts.' },
                        { id: 'inciting_call', label: 'Call to Action', hint: 'A summons, a plea, or a duty that cannot be ignored.' },
                        { id: 'inciting_accident', label: 'Accident / Mistake', hint: 'An unintended action sets events in motion.' },
                        { id: 'inciting_ultimatum', label: 'Ultimatum / Deadline', hint: 'A time-sensitive demand forces a decision.' },
                        { id: 'inciting_meet_cute', label: 'Meet-Cute / Chance Encounter', hint: 'Two people meet in an unexpected way. The spark is instant.' },
                        { id: 'inciting_reunion', label: 'Reunion / Return', hint: 'Someone from the past reappears. Old feelings, old debts, old wounds.' }
                    ]
                },
                {
                    label: 'Stakes',
                    traits: [
                        { id: 'stakes_life', label: 'Life & Death', hint: 'Survival is the baseline. People will die if this fails.' },
                        { id: 'stakes_freedom', label: 'Freedom vs Captivity', hint: 'Liberty is on the line. Physical, emotional, or political imprisonment.' },
                        { id: 'stakes_love', label: 'Love & Connection', hint: 'The heart is at risk. A relationship, a bond, or the chance at love hangs in the balance.' },
                        { id: 'stakes_identity', label: 'Identity / Truth', hint: 'Who someone really is — or discovering it — is the core stake.' },
                        { id: 'stakes_future', label: 'Future / Destiny', hint: 'The long-term direction of lives, communities, or the world is at stake.' },
                        { id: 'stakes_justice', label: 'Justice / Vindication', hint: 'Righting a wrong, proving innocence, or ensuring accountability.' },
                        { id: 'stakes_home', label: 'Home / Belonging', hint: 'Losing or saving a place to call home. The stakes are rooted in place and community.' },
                        { id: 'stakes_soul', label: 'Soul / Morality', hint: 'Not just survival — retaining humanity, integrity, or self.' }
                    ]
                },
                {
                    label: 'Setting',
                    traits: [
                        { id: 'setting_remote', label: 'Remote / Isolated', hint: 'Cut off from help. Wilderness, distant planet, or sealed location.' },
                        { id: 'setting_urban', label: 'Urban / Populated', hint: 'In the heart of civilization. Crowds, resources, and witnesses abound.' },
                        { id: 'setting_ruins', label: 'Ruins / Abandoned', hint: 'Decaying structures, forgotten places. History lingers in the dust.' },
                        { id: 'setting_domestic', label: 'Domestic / Intimate', hint: 'Homes, bedrooms, quiet spaces. The personal is the setting.' },
                        { id: 'setting_institutional', label: 'Institutional', hint: 'A school, a prison, a hospital, a government building. Systems and rules.' },
                        { id: 'setting_public', label: 'Public / Social', hint: 'Restaurants, parties, events. Social dynamics and appearances matter.' },
                        { id: 'setting_transient', label: 'Transient / In Transit', hint: 'On a ship, train, caravan, or journey. Movement itself is the context.' },
                        { id: 'setting_ceremonial', label: 'Ceremonial / Ritual', hint: 'A wedding, a funeral, a coronation. Ritual and tradition frame the action.' }
                    ]
                },
                {
                    label: 'Timeline',
                    traits: [
                        { id: 'timeline_urgent', label: 'Urgent / Countdown', hint: 'Time is running out. Every moment matters.' },
                        { id: 'timeline_extended', label: 'Extended / Unfolding', hint: 'The scenario plays out over days, weeks, or months. Patience is required.' },
                        { id: 'timeline_moment', label: 'Single Moment', hint: 'A pivotal instant. Everything hinges on what happens right now.' },
                        { id: 'timeline_indefinite', label: 'Indefinite / Unknown', hint: 'No clear timeline. The scenario could last as long as it needs to.' },
                        { id: 'timeline_cyclical', label: 'Cyclical / Repeating', hint: 'The same situation recurs. Breaking the cycle is the real challenge.' }
                    ]
                }
            ]
        },
        {
            id: 'mood',
            label: 'Mood & Atmosphere',
            groups: [
                {
                    label: 'Atmosphere',
                    traits: [
                        { id: 'atm_tense', label: 'Tense / Suspenseful', hint: 'The air is thick. Something could snap at any moment.' },
                        { id: 'atm_melancholic', label: 'Melancholic / Bittersweet', hint: 'A soft sadness pervades. Beauty and loss intertwined.' },
                        { id: 'atm_joyful', label: 'Joyful / Lighthearted', hint: 'Warmth, laughter, and ease. This is a good moment in time.' },
                        { id: 'atm_dark', label: 'Dark / Ominous', hint: 'Threatening. The world feels dangerous and foreboding.' },
                        { id: 'atm_romantic', label: 'Romantic / Intimate', hint: 'Soft lighting, closeness, and charged silence. Connection is in the air.' },
                        { id: 'atm_chaotic', label: 'Chaotic / Frenetic', hint: 'Everything is happening at once. Controlled or uncontrolled disorder.' },
                        { id: 'atm_serene', label: 'Serene / Calm', hint: 'Stillness and peace. A moment of respite before — or after — the storm.' },
                        { id: 'atm_uncanny', label: 'Uncanny / Unsettling', hint: 'Something is wrong. Not obviously, but the feeling is unmistakable.' },
                        { id: 'atm_grand', label: 'Grand / Epic', hint: 'The scale of what is happening is awe-inspiring. History is being made.' }
                    ]
                },
                {
                    label: 'Pacing',
                    traits: [
                        { id: 'pacing_slow', label: 'Slow / Deliberate', hint: 'Every moment is savored. Details matter. The story breathes.' },
                        { id: 'pacing_medium', label: 'Medium / Balanced', hint: 'A steady rhythm. Action and reflection alternate naturally.' },
                        { id: 'pacing_fast', label: 'Fast / Urgent', hint: 'Things move quickly. Little time for reflection or description.' },
                        { id: 'pacing_varied', label: 'Varied / Dynamic', hint: 'Pacing shifts between slow and fast. Controlled contrast.' }
                    ]
                },
                {
                    label: 'Emotional Core',
                    traits: [
                        { id: 'emotion_fear', label: 'Fear / Dread', hint: 'The driving emotion is fear. Of what? Of whom? Of what might happen?' },
                        { id: 'emotion_hope', label: 'Hope / Yearning', hint: 'Characters are reaching for something better. The desire for change.' },
                        { id: 'emotion_grief', label: 'Grief / Loss', hint: 'Something has been lost. The scenario is about processing that absence.' },
                        { id: 'emotion_anger', label: 'Anger / Outrage', hint: 'Injustice fuels the fire. Righteous or destructive fury.' },
                        { id: 'emotion_love', label: 'Love / Devotion', hint: 'Love is the anchor. Characters act to protect, win, or hold onto it.' },
                        { id: 'emotion_guilt', label: 'Guilt / Regret', hint: 'The weight of past actions. Seeking forgiveness or atonement.' },
                        { id: 'emotion_wonder', label: 'Wonder / Awe', hint: 'Discovery and amazement. The world is bigger than they knew.' },
                        { id: 'emotion_longing', label: 'Longing / Desire', hint: 'Wanting what is out of reach. The ache of unfulfilled desire drives every choice.' }
                    ]
                }
            ]
        },
        {
            id: 'participants',
            label: 'Participants & Roles',
            groups: [
                {
                    label: 'Protagonist Role',
                    traits: [
                        { id: 'pro_hero', label: 'Hero / Champion', hint: 'The one who must act. The burden of responsibility falls on them.' },
                        { id: 'pro_victim', label: 'Victim / Survivor', hint: 'Caught in events beyond their control. Survival is the goal.' },
                        { id: 'pro_observer', label: 'Observer / Witness', hint: 'Watching events unfold. At what point do they become involved?' },
                        { id: 'pro_investigator', label: 'Investigator / Seeker', hint: 'Actively searching for answers. The truth is the objective.' },
                        { id: 'pro_leader', label: 'Leader / Guide', hint: 'Responsible for others. Their decisions affect many lives.' },
                        { id: 'pro_lover', label: 'Lover / Romantic Lead', hint: 'The heart of the romantic arc. Their desire and vulnerability drive the emotional stakes.' },
                        { id: 'pro_trickster', label: 'Trickster / Wildcard', hint: 'Unpredictable. Their actions create chaos or opportunity.' }
                    ]
                },
                {
                    label: 'Antagonist Type',
                    traits: [
                        { id: 'ant_villain', label: 'Villain / Adversary', hint: 'Actively opposed. Clear goals that conflict with the protagonist\'s.' },
                        { id: 'ant_force', label: 'Force of Nature', hint: 'No malice, just destruction. A storm, a plague, a natural disaster.' },
                        { id: 'ant_system', label: 'System / Institution', hint: 'The enemy is a government, corporation, or cultural norm.' },
                        { id: 'ant_internal', label: 'Internal / Self', hint: 'The antagonist is within — fear, doubt, trauma, or addiction.' },
                        { id: 'ant_circumstance', label: 'Circumstance / Fate', hint: 'No one to blame. The situation itself is the obstacle.' },
                        { id: 'ant_rival', label: 'Rival / Love Triangle', hint: 'Not evil, but in the way. Competition for the same goal or person.' },
                        { id: 'ant_past', label: 'The Past / History', hint: 'Old mistakes, secrets, or traumas return to demand attention.' }
                    ]
                },
                {
                    label: 'Key NPC Roles',
                    traits: [
                        { id: 'npc_mentor', label: 'Mentor / Guide', hint: 'Offers wisdom, training, or direction. May not survive.' },
                        { id: 'npc_ally', label: 'Ally / Companion', hint: 'Travels with or supports the protagonist. Loyal and capable.' },
                        { id: 'npc_love_interest', label: 'Love Interest', hint: 'The romantic counterpart. Their connection shapes the emotional arc.' },
                        { id: 'npc_foil', label: 'Foil / Mirror', hint: 'Reflects the protagonist. Similar but different, highlighting choices.' },
                        { id: 'npc_comic', label: 'Comic Relief', hint: 'Lightens the mood. Humor as a tool for connection or coping.' },
                        { id: 'npc_antagonist', label: 'Antagonist Figure', hint: 'Not the main villain, but an obstacle. A secondary adversary.' },
                        { id: 'npc_secret', label: 'Wildcard / Secret Keeper', hint: 'Holds information or has hidden motives. Their allegiance is unclear.' },
                        { id: 'npc_victim', label: 'Victim / Stakes', hint: 'The person who needs saving or protecting. Their fate motivates action.' }
                    ]
                }
            ]
        }
    ];

    const DEFAULT_INSTRUCTION_TEMPLATES = [
        { id: 'overview', label: 'Describe Scenario', message: 'Describe this scenario — what\'s happening, who is involved, and why it matters.', relevantCategories: ['conflict', 'setup', 'participants'] },
        { id: 'stakes', label: 'Define Stakes', message: 'Describe what\'s at stake — what will be gained or lost, and why the outcome matters to those involved.', relevantCategories: ['conflict'] },
        { id: 'setup', label: 'Explain the Situation', message: 'Describe how this scenario came to be — the events leading up to it, the current situation, and what is about to happen.', relevantCategories: ['setup'] },
        { id: 'mood', label: 'Set the Mood', message: 'Describe the atmosphere and emotional tone of this scenario — how it feels, what the tension level is, and the emotional landscape.', relevantCategories: ['mood'] },
        { id: 'characters', label: 'Describe Key Characters', message: 'Describe the key participants in this scenario — their roles, motivations, and how they relate to each other.', relevantCategories: ['participants'] },
        { id: 'conflict', label: 'Describe the Conflict', message: 'Describe the central conflict in detail — where it comes from, how it manifests, and what escalation might look like.', relevantCategories: ['conflict'] },
        { id: 'opening', label: 'Write Opening Scene', message: 'Write a compelling opening for this scenario — drop us into the moment where it all begins.', relevantCategories: ['setup', 'mood', 'conflict'] },
        { id: 'custom', label: 'Custom Instruction', message: '' }
    ];

    const SCENARIO_SYSTEM_PROMPT = 'You are a scenario-building assistant helping to develop compelling situations and conflicts for creative writing. Your role is to help flesh out a scenario based on selected traits, notes, and the user\'s directions.\n\nWhen asked to expand on a scenario:\n- Write in vivid, narrative prose — show the situation, don\'t just describe it\n- Connect traits together into a coherent, compelling situation\n- Suggest how conflicts, stakes, and character roles interact\n- Build tension and atmosphere that feels real and engaging\n- Keep descriptions evocative but concise (2-4 paragraphs per topic)\n- Do not add major new elements unless the user asks you to\n\nIf the user provides specific traits, weave them naturally into the description rather than just listing them.';

    const USER_TRAITS_KEY = 'ww_scenario_creator_user_traits';
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
        const cat = SCENARIO_TRAIT_CATEGORIES.find(c => c.id === categoryId);
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
        return SCENARIO_TRAIT_CATEGORIES.map(cat => {
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

    function buildCompendiumEntry(name, notes, genre, selectedTraits, chatHistory) {
        const lines = [];
        const scenarioName = name || 'Unnamed Scenario';

        if (notes) {
            lines.push('## Notes');
            lines.push('');
            lines.push(notes);
        }

        const catMap = {};
        for (const cat of SCENARIO_TRAIT_CATEGORIES) {
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
            lines.push('## Scenario Traits');
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
            lines.push('## Scenario Details');
            lines.push('');
            for (const p of pairs) {
                lines.push('### ' + p.label);
                lines.push('');
                lines.push(p.content);
                lines.push('');
            }
        }

        return {
            title: scenarioName,
            body: lines.join('\n').trim(),
            category: 'scenarios',
            tags: ['created'],
            imageUrl: null,
            alwaysInContext: false,
            isPovCharacter: false,
            _scenarioData: JSON.stringify({ name: scenarioName, genre: genre || '', notes: notes || '', selectedTraits: selectedTraits || {}, chatHistory: chatHistory || [] })
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

    window.ScenarioCreator = {
        GENRES,
        GENRE_DESCRIPTIONS,
        SCENARIO_TRAIT_CATEGORIES,
        DEFAULT_INSTRUCTION_TEMPLATES,
        SCENARIO_SYSTEM_PROMPT,
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
    const USER_TEMPLATES_KEY = 'ww_scenario_creator_instruction_templates';
    const USER_SYSTEM_PROMPT_KEY = 'ww_scenario_creator_system_prompt';

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
        try { return localStorage.getItem(USER_SYSTEM_PROMPT_KEY) || SCENARIO_SYSTEM_PROMPT; } catch (e) { return SCENARIO_SYSTEM_PROMPT; }
    }

    function setSystemPrompt(prompt) {
        try {
            if (prompt === SCENARIO_SYSTEM_PROMPT) {
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

    window.ScenarioCreator.saveInstructionTemplates = saveInstructionTemplates;
    window.ScenarioCreator.loadInstructionTemplates = loadInstructionTemplates;
    window.ScenarioCreator.getSystemPrompt = getSystemPrompt;
    window.ScenarioCreator.setSystemPrompt = setSystemPrompt;
    window.ScenarioCreator.resetInstructionTemplates = resetInstructionTemplates;
    window.ScenarioCreator.resetSystemPrompt = resetSystemPrompt;
})();

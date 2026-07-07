(function () {
    const GENRES = window.GenreDefs ? window.GenreDefs.GENRES : [
        { id: 'fantasy', label: 'Fantasy', icon: '⚔️' }
    ];

    function GENRE_DESCRIPTIONS(id) {
        return window.GenreDefs ? window.GenreDefs.getCharDescription(id) : '';
    }

    const TRAIT_CATEGORIES = [
        {
            id: 'appearance',
            label: 'Appearance',
            groups: [
                {
                    label: 'Hair',
                    traits: [
                        { id: 'hair_blonde', label: 'Blonde', hint: 'Natural or dyed? Does it draw attention or blend in?' },
                        { id: 'hair_brunette', label: 'Brunette', hint: 'What undertones — warm chestnut, cool ash, or true brown?' },
                        { id: 'hair_red', label: 'Red', hint: 'Fiery ginger or deep auburn? Do they lean into the stereotype or defy it?' },
                        { id: 'hair_black', label: 'Black', hint: 'Raven-dark. Stark contrast against pale skin or blends into shadow?' },
                        { id: 'hair_white', label: 'White/Silver', hint: 'Premature, age-related, or a mark of trauma or magic?' },
                        { id: 'hair_unusual', label: 'Unusual Color', hint: 'Blue, pink, green — natural part of their world or a deliberate choice?' },
                        { id: 'hair_long', label: 'Long', hint: 'Worn loose or always tied back? A pain to maintain or a point of pride?' },
                        { id: 'hair_short', label: 'Short', hint: 'Practical choice or a recent change following a life event?' },
                        { id: 'hair_curly', label: 'Curly', hint: 'Unruly ringlets or defined waves? Humid days are their enemy.' },
                        { id: 'hair_straight', label: 'Straight', hint: 'Sleek and controlled, or often windswept and untidy?' },
                        { id: 'hair_bald', label: 'Bald', hint: 'By choice, nature, or circumstance? A scar or tattoo on display?' },
                        { id: 'hair_dreadlocks', label: 'Dreadlocks/Braids', hint: 'Intricate or freeform? Cultural pride or practical style?' },
                        { id: 'hair_wavy', label: 'Wavy', hint: 'Somewhere between straight and curly. Effortless or perpetually untamed?' }
                    ]
                },
                {
                    label: 'Eyes',
                    traits: [
                        { id: 'eyes_blue', label: 'Blue', hint: 'Ice-blue, sky-blue, or深邃 like a winter sea?' },
                        { id: 'eyes_green', label: 'Green', hint: 'Emerald, hazel-green, or something otherworldly?' },
                        { id: 'eyes_brown', label: 'Brown', hint: 'Warm chocolate, cold dark, or golden-flecked?' },
                        { id: 'eyes_grey', label: 'Grey', hint: 'Do they shift color with mood or lighting?' },
                        { id: 'eyes_unusual', label: 'Unusual', hint: 'Violet, gold, heterochromatic — what makes them stand out?' },
                        { id: 'eyes_amber', label: 'Amber/Golden', hint: 'Warm and striking. Cat-like or simply rare?' },
                        { id: 'eyes_hazel', label: 'Hazel', hint: 'Shift between brown and green depending on the light — or the mood.' },
                        { id: 'eyes_black', label: 'Black/Dark', hint: 'Pupil and iris nearly one. Hard to read, impossible to forget.' }
                    ]
                },
                {
                    label: 'Build',
                    traits: [
                        { id: 'build_slim', label: 'Slim', hint: 'Naturally lean or underfed? Quick and agile, or easily winded?' },
                        { id: 'build_average', label: 'Average', hint: 'Unremarkable at first glance — useful for blending in.' },
                        { id: 'build_athletic', label: 'Athletic', hint: 'Trained and toned. Do they maintain it deliberately or is it from labor?' },
                        { id: 'build_heavy', label: 'Heavy', hint: 'Solid and substantial. Strength or softness — or both?' },
                        { id: 'build_petite', label: 'Petite/Delicate', hint: 'Small-framed and light. Often underestimated — a mistake others only make once.' },
                        { id: 'build_stocky', label: 'Stocky/Broad', hint: 'Wide shoulders, thick frame. Built like they can take a hit and keep going.' },
                        { id: 'build_lanky', label: 'Lanky/Gawky', hint: 'Long limbs and loose joints. Still growing into themselves or always will be.' },
                        { id: 'build_curvaceous', label: 'Curvaceous', hint: 'Full hips and soft lines. A body that takes up space and commands attention.' },
                        { id: 'build_sinewy', label: 'Sinewy', hint: 'Lean corded muscle visible with every movement. Strength in every line.' },
                        { id: 'build_buxom', label: 'Buxom/Full-Figured', hint: 'Generous curves and soft fullness. A body of warmth and substance.' },
                        { id: 'build_sculpted', label: 'Sculpted', hint: 'Every muscle group defined through deliberate effort. A body shaped with intention.' },
                        { id: 'build_soft', label: 'Soft/Round', hint: 'Plush contours and inviting softness. Comfort made physical.' },
                        { id: 'build_svelte', label: 'Svelte', hint: 'Slim and elegant. Effortlessly graceful, with refined lines.' },
                        { id: 'build_athletic_slender', label: 'Athletic Slender', hint: 'Runner\'s build — long, lean muscles. Quick and tireless.' },
                        { id: 'build_thick', label: 'Thick/Solid', hint: 'Dense and sturdy. A powerful frame that speaks of strength and endurance.' },
                        { id: 'build_broad', label: 'Broad-Shouldered', hint: 'V-shaped torso. A silhouette that commands space.' },
                        { id: 'build_narrow', label: 'Narrow-Hipped', hint: 'Slender through the pelvis. Athletic lines that taper cleanly.' },
                        { id: 'build_voluptuous', label: 'Voluptuous', hint: 'Dramatic curves with an hourglass emphasis. A body impossible to ignore.' }
                    ]
                },
                {
                    label: 'Height',
                    traits: [
                        { id: 'height_short', label: 'Short', hint: 'Do they resent being overlooked or use it to their advantage?' },
                        { id: 'height_average', label: 'Average', hint: 'Neither towering nor diminutive — unremarkable in a crowd.' },
                        { id: 'height_tall', label: 'Tall', hint: 'Do they stoop to fit in or stand tall with presence?' },
                        { id: 'height_diminutive', label: 'Diminutive', hint: 'Below average — easy to overlook or to underestimate. Small but not fragile.' },
                        { id: 'height_imposing', label: 'Imposing', hint: 'Unusually tall. Their shadow arrives before they do.' },
                        { id: 'height_towering', label: 'Towering', hint: 'Head and shoulders above the crowd. They\'ve given up on finding clothes that fit.' },
                        { id: 'height_petite_frame', label: 'Petite Frame', hint: 'Small-boned and delicate. Light on their feet, often underestimated.' },
                        { id: 'height_statuesque', label: 'Statuesque', hint: 'Tall and striking. Impossible to miss in any room.' },
                        { id: 'height_compact_short', label: 'Compact Short', hint: 'Short but powerfully built. Dense energy in a small package.' }
                    ]
                },
                {
                    label: 'Features',
                    traits: [
                        { id: 'feature_scar', label: 'Scar', hint: 'What caused it? Do they hide it, display it, or touch it when nervous?' },
                        { id: 'feature_glasses', label: 'Glasses', hint: 'Necessity or fashion? Do they push them up when thinking?' },
                        { id: 'feature_beard', label: 'Beard/Facial Hair', hint: 'Well-groomed, rugged, or scruffy? Hiding something?' },
                        { id: 'feature_freckles', label: 'Freckles', hint: 'Barely there or bold across the nose and cheeks?' },
                        { id: 'feature_birthmark', label: 'Birthmark', hint: 'A patch of distinctive skin. Do they hide it or consider it lucky?' },
                        { id: 'feature_nose', label: 'Distinctive Nose', hint: 'Prominent, crooked, or uniquely shaped. A defining facial feature.' },
                        { id: 'feature_missing_teeth', label: 'Missing Teeth', hint: 'Gapped smile or hidden gap. From fighting, poverty, or genetics?' },
                        { id: 'feature_gait', label: 'Unusual Gait', hint: 'A limp, a swagger, a bounce — they move in a way that\'s uniquely theirs.' },
                        { id: 'feature_warm_smile', label: 'Warm Smile', hint: 'A smile that changes the whole face. Open, genuine, disarming.' }
                    ]
                },
                {
                    label: 'Age',
                    traits: [
                        { id: 'age_child', label: 'Child', hint: 'Young and still growing. The world is being discovered, one question at a time.' },
                        { id: 'age_adolescent', label: 'Adolescent/Teen', hint: 'Caught between childhood and adulthood. Body and identity changing faster than they can keep up.' },
                        { id: 'age_young_adult', label: 'Young Adult', hint: 'Early twenties. Energy, uncertainty, and the feeling of a life just beginning.' },
                        { id: 'age_prime', label: 'Prime Adult', hint: 'In their prime. Established, capable, and sure of who they are.' },
                        { id: 'age_middle', label: 'Middle-Aged', hint: 'Wiser, wearier. Life has left its marks — some proud, some regrettable.' },
                        { id: 'age_elderly', label: 'Elderly', hint: 'Carries decades of memory. Slower now, but sharper in ways that matter.' },
                        { id: 'age_ageless', label: 'Ageless', hint: 'Impossible to pin down. Could be twenty-five or two hundred and fifty.' }
                    ]
                },
                {
                    label: 'Skin',
                    traits: [
                        { id: 'skin_pale', label: 'Pale/Fair', hint: 'Light complexion. Burns before it tans. Shows every blush and flush.' },
                        { id: 'skin_olive', label: 'Olive/Tan', hint: 'Warm, sun-kissed tone. Holds color well.' },
                        { id: 'skin_brown', label: 'Brown', hint: 'Rich brown skin. A wide spectrum of warmth and depth.' },
                        { id: 'skin_dark', label: 'Dark/Deep', hint: 'Deep brown or ebony. Striking against lighter fabrics and backgrounds.' },
                        { id: 'skin_ruddy', label: 'Ruddy/Flushed', hint: 'Reddish undertones. Quick to redden from exertion, cold, or embarrassment.' },
                        { id: 'skin_freckled', label: 'Freckled', hint: 'Scattered across the nose, cheeks, shoulders. Marks of sun and genetics.' }
                    ]
                },
                {
                    label: 'Tattoos',
                    traits: [
                        { id: 'tattoo_none', label: 'None', hint: 'Uninked, unmarked. A blank canvas.' },
                        { id: 'tattoo_small', label: 'Small/Subtle', hint: 'A tiny symbol, a name, a date. Meaningful but private.' },
                        { id: 'tattoo_sleeve', label: 'Full Sleeve', hint: 'Arm covered from shoulder to wrist. A curated collection or a chaotic gallery.' },
                        { id: 'tattoo_large', label: 'Large Piece', hint: 'A single bold statement piece. Chest, back, thigh — a canvas for one big story.' },
                        { id: 'tattoo_multiple', label: 'Multiple Scattered', hint: 'Scattered across the body. Each one marks a moment, a person, or a memory.' },
                        { id: 'tattoo_hidden', label: 'Hidden', hint: 'Placed where clothes cover. Not for public consumption — a secret language on the skin.' },
                        { id: 'tattoo_intimate', label: 'Intimate/Private', hint: 'Placed where only a lover would see. A secret meant to be discovered.' },
                        { id: 'tattoo_matching', label: 'Matching/Memorial', hint: 'Shared ink that bonds two people. A promise, a name, a memory carried in skin.' },
                        { id: 'tattoo_artistic', label: 'Artistic/Full Back', hint: 'A masterwork across the back. Hours of pain for a lifetime of art.' },
                        { id: 'tattoo_symbolic', label: 'Symbolic/Minimal', hint: 'Clean lines, deep meaning. A single image that speaks volumes.' },
                        { id: 'tattoo_chest', label: 'Chest Piece', hint: 'Over the heart. Bold, declarative, impossible to hide when bare.' },
                        { id: 'tattoo_neck', label: 'Neck/Throat', hint: 'Visible and bold. A statement that can\'t be covered by a collar.' },
                        { id: 'tattoo_hand', label: 'Hand/Finger', hint: 'Always on display. Every handshake, every touch reveals it.' },
                        { id: 'tattoo_rib', label: 'Ribcage Side', hint: 'Intimate placement on the ribs. One of the most painful spots — worth it for the meaning.' },
                        { id: 'tattoo_leg', label: 'Leg/Calf', hint: 'A large canvas on the thigh or calf. Shown or hidden by choice.' },
                        { id: 'tattoo_wrist', label: 'Wrist/Ankle Bracelet', hint: 'Delicate ink that mimics jewelry. Subtle, personal, often sentimental.' },
                        { id: 'tattoo_cover_up', label: 'Cover-Up', hint: 'Ink laid over old scars, old names, old mistakes. Transformation on the skin.' }
                    ]
                },
                {
                    label: 'Piercings',
                    traits: [
                        { id: 'piercing_none', label: 'None', hint: 'No metal, no holes. Unpierced and unadorned.' },
                        { id: 'piercing_ears', label: 'Ear(s)', hint: 'Classic lobe piercings, or cartilage — simple or stacked.' },
                        { id: 'piercing_facial', label: 'Facial', hint: 'Nose, brow, lip, or septum. Front and center.' },
                        { id: 'piercing_body', label: 'Body', hint: 'Navel, nipple, or elsewhere. Hidden or revealed by choice.' },
                        { id: 'piercing_multiple', label: 'Multiple', hint: 'Ears, face, body — a constellation of metal. Each one deliberate.' },
                        { id: 'piercing_tongue', label: 'Tongue', hint: 'A flash of metal when they speak or laugh. Subtle, noticed, memorable.' },
                        { id: 'piercing_brow', label: 'Eyebrow', hint: 'An edge of rebellion. Catches the light — and the eye.' },
                        { id: 'piercing_navel', label: 'Navel', hint: 'Visible or hidden by choice. A tease, a decoration, a secret.' },
                        { id: 'piercing_dermal', label: 'Dermal Implants', hint: 'Tiny gems set into the skin itself. Subtle sparkle on the chest, face, or collarbone.' },
                        { id: 'piercing_intimate', label: 'Intimate Placement', hint: 'Known only to those who get close enough. A private detail for private moments.' },
                        { id: 'piercing_industrial', label: 'Industrial', hint: 'A bar connecting two ear piercings. Bold, edgy, unmistakable.' },
                        { id: 'piercing_septum', label: 'Septum', hint: 'Center of the face. Bull ring or delicate hoop — always a statement.' },
                        { id: 'piercing_nipple', label: 'Nipple', hint: 'Hidden or revealed by choice. A secret that can be shared in intimacy.' },
                        { id: 'piercing_cartilage', label: 'Cartilage (Helix)', hint: 'Upper ear piercing. Subtle sparkle, easy to miss — delightful to discover.' },
                        { id: 'piercing_daith', label: 'Daith', hint: 'Inner ear cartilage. Unusual placement, distinctive look.' }
                    ]
                },
                {
                    label: 'Magnetic Details',
                    traits: [
                        { id: 'magnetic_contradiction', label: 'Contradictory Presence', hint: 'Soft voice with an unyielding stare. Calloused hands that touch gently. The tension between their edges draws people in.' },
                        { id: 'magnetic_laugh', label: 'Laugh That Stops You', hint: 'Not loud, not performative. A specific, genuine laugh that catches people off guard and makes them want to hear it again.' },
                        { id: 'magnetic_hands', label: 'Hands Worth Watching', hint: 'People notice how they handle things — a pen, a glass, a shoulder. Veins, scars, elegance, or strength. Hands that tell a story.' },
                        { id: 'magnetic_stillness', label: 'A Notable Stillness', hint: 'Doesn\'t fill silence with chatter or motion. When they go quiet, the stillness becomes significant. Makes others lean in.' },
                        { id: 'magnetic_warmth', label: 'Warmth That Radiates', hint: 'Runs noticeably warm. A hand on your shoulder you can feel through fabric. Proximity becomes palpable.' }
                    ]
                }
            ]
        },
        {
            id: 'clothing',
            label: 'Clothing & Style',
            groups: [
                {
                    label: 'Style',
                    traits: [
                        { id: 'style_casual', label: 'Casual', hint: 'Comfort over fashion. Well-worn favorites or just doesn\'t care?' },
                        { id: 'style_formal', label: 'Formal/Elegant', hint: 'Always dressed up. A sign of status, habit, or insecurity?' },
                        { id: 'style_rugged', label: 'Rugged/Practical', hint: 'Built for function, not fashion. Every piece serves a purpose.' },
                        { id: 'style_flowing', label: 'Flowing/Robed', hint: 'Loose fabrics that move. Mysterious, comfortable, or theatrical?' },
                        { id: 'style_armored', label: 'Armored', hint: 'Never caught without protection. Paranoid or practical?' },
                        { id: 'style_modest', label: 'Modest/Concealing', hint: 'Covers up. Cultural, personal, or hiding something?' },
                        { id: 'style_revealing', label: 'Revealing', hint: 'Confident skin-baring. A fashion choice or a tool of influence?' },
                        { id: 'style_colorful', label: 'Colorful/Bright', hint: 'Refuses to be invisible. Their mood is on their sleeve.' },
                        { id: 'style_dark', label: 'Dark/Monochrome', hint: 'All black, all grey. Classic, brooding, or just practical for stains?' },
                        { id: 'style_travel', label: 'Travel Cloak', hint: 'A well-worn outer layer. Pockets full of essentials.' },
                        { id: 'style_uniform', label: 'Uniform', hint: 'Official attire. Do they wear it with pride or resentment?' },
                        { id: 'style_jewelry', label: 'Jewelry', hint: 'A single meaningful piece or a collection? Heirloom or trophy?' }
                    ]
                },
                {
                    label: 'Body Type',
                    traits: [
                        { id: 'body_lean', label: 'Lean/Wiry', hint: 'Deceptively strong. Corded muscle, fast reflexes.' },
                        { id: 'body_muscular', label: 'Muscular', hint: 'Built through training or labor. They own their space.' },
                        { id: 'body_curvy', label: 'Curvy', hint: 'Soft contours. Do they embrace it or try to minimize it?' },
                        { id: 'body_bony', label: 'Bony/Frail', hint: 'Sharp angles and visible bones. Illness, age, or genetics?' },
                        { id: 'body_toned', label: 'Toned', hint: 'Fit without being bulky. Maintained, not obsessed.' },
                        { id: 'body_lithe', label: 'Lithe', hint: 'Flexible and agile. Moves like a dancer — grace in every motion.' },
                        { id: 'body_burly', label: 'Burly', hint: 'Big, broad, and solid. A protective presence that fills doorways.' },
                        { id: 'body_compact', label: 'Compact/Powerful', hint: 'Shorter stature but dense muscle. Unassuming until they move.' },
                        { id: 'body_hourglass', label: 'Hourglass', hint: 'Balanced bust and hips with a defined waist. A classic silhouette of desire.' },
                        { id: 'body_pear', label: 'Pear-Shaped', hint: 'Narrow shoulders, wider hips. Weight settles below the waist.' },
                        { id: 'body_runners_build', label: 'Runner\'s Build', hint: 'Lean with minimal body fat. Long muscles built for endurance.' },
                        { id: 'body_swimmers_build', label: 'Swimmer\'s Build', hint: 'Broad shoulders, defined back, strong core. A V-shape carved by water.' },
                        { id: 'body_soft_curvy', label: 'Soft & Curvy', hint: 'Roundness with gentle curves. Soft to the touch, warm to hold.' },
                        { id: 'body_wiry_strong', label: 'Wiry/Strong', hint: 'Deceptively powerful. Rope-like muscles that don\'t look bulky — until they flex.' },
                        { id: 'body_barrel_chested', label: 'Barrel-Chested', hint: 'Deep chest and sturdy frame. Built for labour or combat.' },
                        { id: 'body_slender', label: 'Slender', hint: 'Narrow and lightly built. Minimal curves, minimal bulk, maximal elegance.' }
                    ]
                }
            ]
        },
        {
            id: 'personality',
            label: 'Personality',
            groups: [
                {
                    label: 'Disposition',
                    traits: [
                        { id: 'disp_optimistic', label: 'Optimistic', hint: 'Sees the glass half-full. Naive or resilient?' },
                        { id: 'disp_pessimistic', label: 'Pessimistic', hint: 'Expects the worst. Realist or defeatist?' },
                        { id: 'disp_stoic', label: 'Stoic', hint: 'Emotions locked away. Controlled or disconnected?' },
                        { id: 'disp_volatile', label: 'Volatile', hint: 'Emotions at the surface. Passionate or unstable?' },
                        { id: 'disp_sarcastic', label: 'Sarcastic', hint: 'Wit as a shield. Jokes that land just shy of mean.' },
                        { id: 'disp_cheerful', label: 'Cheerful', hint: 'Genuinely sunny. A presence that lifts a room — or grates on it.' },
                        { id: 'disp_playful', label: 'Playful', hint: 'Turns everything into a game. Teasing as a love language.' },
                        { id: 'disp_enigmatic', label: 'Enigmatic', hint: 'Hard to read. Every answer raises two more questions.' }
                    ]
                },
                {
                    label: 'Social',
                    traits: [
                        { id: 'social_extrovert', label: 'Extrovert', hint: 'Charged by company. Are they genuinely social or afraid of silence?' },
                        { id: 'social_introvert', label: 'Introvert', hint: 'Drained by crowds. Do they have a small circle or no one?' },
                        { id: 'social_ambivert', label: 'Ambivert', hint: 'Adaptable. Comfortable alone or in company — depends on the day.' },
                        { id: 'social_flirtatious', label: 'Flirtatious', hint: 'Charm is a reflex, not a strategy. Does it mean anything, or is it just how they are?' },
                        { id: 'social_reserved', label: 'Reserved/Wary', hint: 'Slow to open up. Trust is earned in small, careful increments.' },
                        { id: 'social_cold', label: 'Cold/Distant', hint: 'Keeps everyone at arm\'s length. A fortress with no visible entrance.' },
                        { id: 'social_charming', label: 'Charming', hint: 'Knows exactly what to say. People feel drawn in before they realize it.' },
                        { id: 'social_magnetic', label: 'Magnetic', hint: 'People gravitate toward them without knowing why. An unexplainable pull.' },
                        { id: 'social_alienating', label: 'Alienating', hint: 'Rubs people the wrong way. Unintentionally off-putting or proudly so.' },
                        { id: 'social_warm', label: 'Warm/Approachable', hint: 'An open invitation in their demeanor. People feel safe confiding in them.' },
                        { id: 'social_dominant', label: 'Dominant', hint: 'Takes charge in social spaces. Presence that fills the room.' },
                        { id: 'social_submissive', label: 'Submissive', hint: 'Yields, follows, accommodates. Not weakness — a conscious choice of dynamic.' },
                        { id: 'social_aloof', label: 'Aloof', hint: 'Above it all — or just deeply uncomfortable? Their detachment creates intrigue.' }
                    ]
                },
                {
                    label: 'Morality',
                    traits: [
                        { id: 'moral_righteous', label: 'Righteous', hint: 'A strong moral code. What would make them break it?' },
                        { id: 'moral_flexible', label: 'Flexible Morals', hint: 'Circumstances matter. Ends can justify means.' },
                        { id: 'moral_selfish', label: 'Self-Serving', hint: 'Number one comes first. Do they admit it or rationalize?' },
                        { id: 'moral_code', label: 'Code of Honor', hint: 'Lines they will not cross. A personal law stricter than any society\'s.' },
                        { id: 'moral_merciful', label: 'Merciful', hint: 'Believes in second chances. Leniency as a choice, not weakness.' },
                        { id: 'moral_situational', label: 'Situational', hint: 'Every choice depends on context. No absolutes, only variables.' },
                        { id: 'moral_manipulative', label: 'Manipulative', hint: 'People are pieces on a board. Always playing a longer game than others realize.' },
                        { id: 'moral_empathetic', label: 'Empathetic', hint: 'Feels what others feel. Their morality flows from compassion, not rules.' },
                        { id: 'moral_independent', label: 'Independent Morality', hint: 'Makes their own rules. Society\'s judgment doesn\'t factor into their choices.' },
                        { id: 'moral_devoted', label: 'Devoted', hint: 'Their morality centers on a person, not a principle. Would do anything for them.' },
                        { id: 'moral_utilitarian', label: 'Utilitarian', hint: 'The greatest good for the most people. Sacrifice the few to save the many.' },
                        { id: 'moral_self_righteous', label: 'Self-Righteous', hint: 'Absolute conviction in their own moral superiority. Certainty as armor.' },
                        { id: 'moral_opportunistic', label: 'Opportunistic', hint: 'Morality bends to advantage. Right and wrong depend on what\'s at stake.' },
                        { id: 'moral_principled', label: 'Principled', hint: 'Unshakable values. Inconvenient, costly, non-negotiable.' }
                    ]
                },
                {
                    label: 'Temperament',
                    traits: [
                        { id: 'temper_calm', label: 'Calm', hint: 'Hard to rattle. A still surface — what lurks beneath?' },
                        { id: 'temper_passionate', label: 'Passionate', hint: 'Feels everything deeply. Their highs are high and lows are low.' },
                        { id: 'temper_short', label: 'Short-Tempered', hint: 'Quick to anger. Is it a flash that fades or simmering rage?' },
                        { id: 'temper_sullen', label: 'Sullen', hint: 'A heavy silence. Not angry — just weighed down by something.' },
                        { id: 'temper_energetic', label: 'Energetic', hint: 'Bursting with restless energy. Rarely still, rarely quiet.' },
                        { id: 'temper_melancholic', label: 'Melancholic', hint: 'Wears a soft sadness. Finds beauty in bittersweet things.' },
                        { id: 'temper_intense', label: 'Intense', hint: 'Full focus, full feeling. Nothing they do is half-hearted.' },
                        { id: 'temper_warm', label: 'Warm/Giving', hint: 'Radiates comfort. People feel at ease around them without knowing why.' },
                        { id: 'temper_moody', label: 'Moody', hint: 'Shifts with the wind. A beautiful day can turn stormy without warning.' },
                        { id: 'temper_serene', label: 'Serene', hint: 'Untroubled and still. A quiet presence that calms everyone around them.' },
                        { id: 'temper_fiery', label: 'Fiery', hint: 'Passion in everything. Loves hard, fights hard, feels at full volume.' },
                        { id: 'temper_restless', label: 'Restless', hint: 'Always looking for the next thing. Settling feels like surrender.' },
                        { id: 'temper_sensual', label: 'Sensual', hint: 'Deeply attuned to physical pleasure and bodily experience. Touch, taste, scent — the world is felt.' },
                        { id: 'temper_nurturing', label: 'Nurturing', hint: 'Naturally caring with a soft presence. People lean on them without asking.' },
                        { id: 'temper_volatile', label: 'Volatile', hint: 'Explosive highs and crushing lows. Walking through a minefield of their own emotions.' },
                        { id: 'temper_earnest', label: 'Earnest', hint: 'Sincere and open-hearted. No guile, no pretense — what you see is exactly what you get.' },
                        { id: 'temper_dreamy', label: 'Dreamy', hint: 'Head in the clouds. A romantic idealist who sees the world as it could be.' }
                    ]
                },
                {
                    label: 'Openness',
                    traits: [
                        { id: 'open_curious', label: 'Curious', hint: 'Always asking questions. A seeker or just nosy?' },
                        { id: 'open_traditional', label: 'Traditional', hint: 'Values the old ways. Resistance to change or respect for roots?' },
                        { id: 'open_pragmatic', label: 'Pragmatic', hint: 'What works, works. No ideology, just results.' },
                        { id: 'open_experimental', label: 'Experimental', hint: 'Always willing to try something new. Life is a series of firsts.' },
                        { id: 'open_skeptical', label: 'Skeptical', hint: 'Needs proof. Trust must be earned — and so must every claim.' }
                    ]
                },
                {
                    label: 'Core Traits',
                    traits: [
                        { id: 'brave', label: 'Brave', hint: 'Acts despite fear. Is it courage or just not knowing when to retreat?' },
                        { id: 'cunning', label: 'Cunning', hint: 'Always three moves ahead. Smart or manipulative?' },
                        { id: 'shy', label: 'Shy', hint: 'Wants to connect but hesitates. What would draw them out?' },
                        { id: 'honest', label: 'Honest', hint: 'Tells the truth — even when it hurts. A virtue or a lack of filter?' },
                        { id: 'deceptive', label: 'Deceptive', hint: 'Comfortable with lies. For survival, malice, or protection?' },
                        { id: 'loyal', label: 'Loyal', hint: 'Once bonded, unshakeable. What would test that loyalty?' },
                        { id: 'ambitious', label: 'Ambitious', hint: 'Hungry for more. What line won\'t they cross to get it?' },
                        { id: 'compassionate', label: 'Compassionate', hint: 'Feels others\' pain as their own. A healer by nature, not profession.' },
                        { id: 'impulsive', label: 'Impulsive', hint: 'Acts on instinct. Regret comes after — if at all.' },
                        { id: 'patient', label: 'Patient', hint: 'Can wait. Enduring, unshakeable, never rushed.' },
                        { id: 'confident', label: 'Confident', hint: 'Knows their worth. Not arrogant — just certain.' },
                        { id: 'adaptable', label: 'Adaptable', hint: 'Rolls with the changes. Nothing throws them for long.' },
                        { id: 'forgiving', label: 'Forgiving', hint: 'Lets go of grudges. Holds space for people to change.' },
                        { id: 'affectionate', label: 'Affectionate', hint: 'Liberal with hugs, touches, and kind words. Love made physical.' },
                        { id: 'protective', label: 'Protective', hint: 'Shields those they care about. Fierce when someone is threatened.' },
                        { id: 'romantic', label: 'Romantic', hint: 'Believes in love, gestures, and grand moments. A hopeless heart.' },
                        { id: 'nurturing', label: 'Nurturing', hint: 'Takes care of others naturally. A safe place to land.' },
                        { id: 'sensitive', label: 'Sensitive', hint: 'Easily moved — by art, by words, by the moods of those nearby.' },
                        { id: 'idealistic', label: 'Idealistic', hint: 'Sees how the world should be. Refuses to settle for how it is.' },
                        { id: 'charming', label: 'Charming', hint: 'Effortless charisma. People want to be near them.' },
                        { id: 'gentle', label: 'Gentle', hint: 'Soft hands, soft voice, soft presence. A calming force.' }
                    ]
                },
                {
                    label: 'Romantic Style',
                    traits: [
                        { id: 'romance_flirty', label: 'Flirty/Teasing', hint: 'Plays with words and glances. Banter is their love language.' },
                        { id: 'romance_seductive', label: 'Seductive', hint: 'Knows their effect on others. Presence is a tool and a weapon.' },
                        { id: 'romance_sensual', label: 'Sensual', hint: 'Deeply in tune with physical pleasure and intimacy. Touch is essential.' },
                        { id: 'romance_shy', label: 'Shy Romantic', hint: 'Feels deeply but expresses hesitantly. Blushes easily, means everything.' },
                        { id: 'romance_bold', label: 'Bold Pursuer', hint: 'Not afraid to make the first move. Confidence in desire is attractive.' },
                        { id: 'romance_reserved', label: 'Reserved Heart', hint: 'Guarded with feelings at first, but intense when they finally open up.' },
                        { id: 'romance_devoted', label: 'Devoted Partner', hint: 'All in, once committed. Loyalty and affection in equal measure.' }
                    ]
                }
            ]
        },
        {
            id: 'background',
            label: 'Background',
            groups: [
                {
                    label: 'Origin',
                    traits: [
                        { id: 'origin_urban', label: 'Urban/City', hint: 'City-born and bred. The rhythms of crowded streets are in their bones.' },
                        { id: 'origin_rural', label: 'Rural/Village', hint: 'Small-town roots. Wide skies, few faces, simple rhythms.' },
                        { id: 'origin_nomadic', label: 'Nomadic', hint: 'Always moving. Home is a direction, not a place.' },
                        { id: 'origin_foreign', label: 'Foreign/Exotic', hint: 'From elsewhere. An outsider by origin, by choice, or by circumstance.' },
                        { id: 'origin_noble', label: 'Noble', hint: 'Born to privilege. Do they wield it or reject it?' },
                        { id: 'origin_commoner', label: 'Commoner', hint: 'Ordinary roots. No silver spoon — just hard work or luck.' },
                        { id: 'origin_slums', label: 'Slums/Underclass', hint: 'Survived the bottom. Every advantage was earned or stolen.' }
                    ]
                },
                {
                    label: 'Cultural Background',
                    traits: [
                        { id: 'culture_european', label: 'European Heritage', hint: 'Roots in Western or Eastern European cultures. Traditions shaped by centuries of history.' },
                        { id: 'culture_east_asian', label: 'East Asian Heritage', hint: 'Roots in Chinese, Japanese, Korean, or other East Asian cultures.' },
                        { id: 'culture_south_asian', label: 'South Asian Heritage', hint: 'Roots in Indian, Pakistani, Bangladeshi, or other South Asian cultures.' },
                        { id: 'culture_african', label: 'African Heritage', hint: 'Roots in African cultures — north, west, east, or south.' },
                        { id: 'culture_middle_eastern', label: 'Middle Eastern Heritage', hint: 'Roots in Arabic, Persian, or other Middle Eastern cultures.' },
                        { id: 'culture_latin', label: 'Latin American Heritage', hint: 'Roots in Latin American or Caribbean cultures.' },
                        { id: 'culture_indigenous', label: 'Indigenous Heritage', hint: 'Roots in native or First Nations cultures. Deep connection to land and tradition.' },
                        { id: 'culture_mixed', label: 'Mixed Heritage', hint: 'Multiple cultural backgrounds woven together. More than one world to call home.' },
                        { id: 'culture_fictional', label: 'Fictional Culture', hint: 'From a culture unique to this world — with its own customs, values, and history.' }
                    ]
                },
                {
                    label: 'Profession',
                    genres: ['fantasy', 'historical'],
                    traits: [
                        { id: 'profession_warrior', label: 'Warrior/Knight', hint: 'Trained for combat. Is it a calling, a duty, or all they know?' },
                        { id: 'profession_mage', label: 'Mage/Scholar', hint: 'Power through knowledge. What field of study?' },
                        { id: 'profession_merchant', label: 'Merchant/Trader', hint: 'The art of the deal. Coin is their language.' },
                        { id: 'profession_crafter', label: 'Crafter/Artisan', hint: 'Makes things with their hands. Pride in the work.' },
                        { id: 'profession_rogue', label: 'Rogue/Thief', hint: 'Lives by wit and nerve. The shadows are familiar.' },
                        { id: 'profession_healer', label: 'Healer', hint: 'Mends what\'s broken. Do they charge or give freely?' },
                        { id: 'profession_performer', label: 'Performer/Artist', hint: 'Lives for the stage or the canvas. Attention or expression?' },
                        { id: 'profession_farmer', label: 'Farmer/Laborer', hint: 'Works the land or the trades. Calloused hands, honest sweat.' },
                        { id: 'profession_noble_duty', label: 'Noble/Leader', hint: 'Born to rule or administrate. Burden or birthright?' }
                    ]
                },
                {
                    label: 'Profession',
                    genres: ['modern', 'horror', 'romance', 'erotic-romance'],
                    traits: [
                        { id: 'prof_modern_office', label: 'Office Worker', hint: 'Desk job, routine, bureaucracy. Corporate ladder or dead end?' },
                        { id: 'prof_modern_service', label: 'Service Industry', hint: 'Works with people face-to-face. Wears a smile regardless.' },
                        { id: 'prof_modern_creative', label: 'Creative/Artist', hint: 'Writer, designer, musician. Passion project or paying bills?' },
                        { id: 'prof_modern_tech', label: 'Tech/IT', hint: 'Speaks in code. Fixes what others break.' },
                        { id: 'prof_modern_healthcare', label: 'Healthcare', hint: 'Doctor, nurse, therapist. Carries others\' pain.' },
                        { id: 'prof_modern_education', label: 'Educator', hint: 'Teacher, professor, coach. Shapes the next generation.' },
                        { id: 'prof_modern_trades', label: 'Trades/Labor', hint: 'Electrician, plumber, builder. Fixes the physical world.' },
                        { id: 'prof_modern_law', label: 'Law Enforcement', hint: 'Cop, detective, security. Order or just authority?' },
                        { id: 'prof_modern_journalist', label: 'Journalist', hint: 'Chases stories. Words are their weapon and their shield.' },
                        { id: 'prof_modern_business', label: 'Small Business Owner', hint: 'Built something from nothing. Every success is personal.' },
                        { id: 'prof_modern_military', label: 'Military Veteran', hint: 'Served and seen. Carries discipline, trauma, and a different perspective.' },
                        { id: 'prof_modern_chef', label: 'Chef/Restaurateur', hint: 'Creates through food. The kitchen is a stage and a battleground.' },
                        { id: 'prof_modern_barista', label: 'Barista/Café Owner', hint: 'Knows everyone\'s order. A quiet witness to a thousand small moments.' }
                    ]
                },
                {
                    label: 'Profession',
                    genres: ['sci-fi', 'cyberpunk'],
                    traits: [
                        { id: 'prof_scifi_pilot', label: 'Pilot/Navigator', hint: 'At home in the void between stars. Knows every route.' },
                        { id: 'prof_scifi_engineer', label: 'Engineer', hint: 'Keeps the machines running. Ship, station, or suit.' },
                        { id: 'prof_scifi_scientist', label: 'Scientist', hint: 'Pushes the frontier of knowledge. Ethics or ambition?' },
                        { id: 'prof_scifi_medic', label: 'Medic', hint: 'Patch jobs and trauma care. Old-school or high-tech?' },
                        { id: 'prof_scifi_soldier', label: 'Soldier/Marine', hint: 'Trained for conflict in any environment.' },
                        { id: 'prof_scifi_diplomat', label: 'Diplomat/Liaison', hint: 'Bridges cultures and species. Words as weapons.' },
                        { id: 'prof_scifi_hacker', label: 'Hacker/Coder', hint: 'Breaks digital walls. For profit, principle, or thrill.' },
                        { id: 'prof_scifi_trader', label: 'Trader/Scavenger', hint: 'Deals in goods across systems. What\'s in the cargo hold?' }
                    ]
                },
                {
                    label: 'Profession',
                    genres: ['western'],
                    traits: [
                        { id: 'prof_western_cowboy', label: 'Cowboy/Rancher', hint: 'Lives in the saddle. Cattle, land, and open sky.' },
                        { id: 'prof_western_sheriff', label: 'Sheriff/Lawman', hint: 'Keeps the peace in a lawless land. Badge weighs heavy.' },
                        { id: 'prof_western_outlaw', label: 'Outlaw', hint: 'Wanted. Lives outside the law by choice or necessity.' },
                        { id: 'prof_western_gambler', label: 'Gambler', hint: 'Cards and luck. Reads people better than rules.' },
                        { id: 'prof_western_doctor', label: 'Doctor', hint: 'Patchwork medicine in a rough town. Does what they can.' },
                        { id: 'prof_western_saloon', label: 'Saloon Keeper', hint: 'Hears everything. Trusted or just useful?' },
                        { id: 'prof_western_homesteader', label: 'Homesteader', hint: 'Carving a life from hard soil. Stubborn or desperate?' }
                    ]
                },
                {
                    label: 'Profession',
                    genres: ['post-apocalyptic'],
                    traits: [
                        { id: 'prof_apoc_scavenger', label: 'Scavenger', hint: 'Picks through the bones of the old world. Finds value in rubble.' },
                        { id: 'prof_apoc_raider', label: 'Raider', hint: 'Takes what they need. Survivor or predator?' },
                        { id: 'prof_apoc_settler', label: 'Settler/Farmer', hint: 'Trying to rebuild. Seeds of a new world.' },
                        { id: 'prof_apoc_medic', label: 'Medic', hint: 'Medicine from scraps. Life and death in their hands.' },
                        { id: 'prof_apoc_engineer', label: 'Engineer', hint: 'Makes old tech work again. Pre-war knowledge, post-war scarcity.' },
                        { id: 'prof_apoc_trader', label: 'Trader', hint: 'The new economy. Bullets, water, information — everything has a price.' }
                    ]
                },
                {
                    label: 'Profession',
                    genres: ['superhero'],
                    traits: [
                        { id: 'prof_hero_civilian', label: 'Civilian Day Job', hint: 'Reporter, barista, student. A mask of normalcy.' },
                        { id: 'prof_hero_vigilante', label: 'Full-Time Vigilante', hint: 'No secret identity. The mission is the life.' },
                        { id: 'prof_hero_government', label: 'Government Agent', hint: 'Powers in service of the state. Orders or conscience?' },
                        { id: 'prof_hero_scientist', label: 'Scientist/Inventor', hint: 'Created their power or studies those who have it.' },
                        { id: 'prof_hero_mentor', label: 'Mentor/Trainer', hint: 'Shapes the next generation. Seen too much to fight directly.' }
                    ]
                },
                {
                    label: 'Profession',
                    genres: ['romance', 'erotic-romance'],
                    traits: [
                        { id: 'spicy_dancer', label: 'Erotic Dancer/Performer', hint: 'Moves with deliberate sensuality. The stage is where they come alive — and where they hide.' },
                        { id: 'spicy_escort', label: 'Escort/Courtesan', hint: 'Intimacy as a profession. Boundaries are clear; emotions are not.' },
                        { id: 'spicy_content', label: 'Adult Content Creator', hint: 'Curates desire for an audience. The line between performance and self blurs daily.' },
                        { id: 'spicy_dominant', label: 'Dominant/submissive', hint: 'Power exchange is the foundation of their relationships — personal or professional.' },
                        { id: 'spicy_model', label: 'Figure/Intimacy Model', hint: 'The body as art. Comfortable being desired; complicated about being known.' },
                        { id: 'spicy_masseuse', label: 'Erotic Massage Therapist', hint: 'Touch is their language. Healing and sensuality exist on the same spectrum.' },
                        { id: 'spicy_therapist', label: 'Sex Therapist/Counselor', hint: 'Helps others navigate intimacy. Expert in theory, complicated in practice.' },
                        { id: 'spicy_coach', label: 'Intimacy Coach', hint: 'Teaches others how to connect. Their own love life is another story entirely.' },
                        { id: 'spicy_writer', label: 'Erotic Writer/Journalist', hint: 'Chronicles passion for a living. Words are their medium of intimacy.' },
                        { id: 'spicy_photographer', label: 'Boudoir Photographer', hint: 'Captures people at their most vulnerable and beautiful. Sees through the lens of desire.' },
                        { id: 'spicy_artist', label: 'Portrait/Nude Artist', hint: 'Studies the human form as art. Every curve and shadow tells a story.' },
                        { id: 'spicy_boutique', label: 'Lingerie/Boutique Owner', hint: 'Drapes others in desire. Knows the language of fabric, fit, and fantasy.' },
                        { id: 'spicy_designer', label: 'Intimates Designer', hint: 'Creates what hugs the skin. Every stitch is an invitation.' },
                        { id: 'spicy_bartender', label: 'Bartender', hint: 'Serves drinks and witnesses desire. In a dimly lit room, they see everything.' },
                        { id: 'spicy_concierge', label: 'Hotel Concierge', hint: 'Arranges romantic escapes for others. Knows every suite, every sunset, every secret.' },
                        { id: 'spicy_chef', label: 'Private Chef', hint: 'Creates sensual experiences through food. The kitchen is their seduction.' },
                        { id: 'spicy_actor', label: 'Actor (Romance/Intimacy)', hint: 'Plays at love for a living. The line between on-screen chemistry and real feeling gets crossed often.' },
                        { id: 'spicy_musician', label: 'Musician', hint: 'Channels passion through performance. A voice or instrument that makes crowds fall in love.' }
                    ]
                },
                {
                    label: 'Education',
                    traits: [
                        { id: 'education_self', label: 'Self-Taught', hint: 'Learned through trial and error. Practical but uneven.' },
                        { id: 'education_apprentice', label: 'Apprenticed', hint: 'Learned from a master. One method, deeply known.' },
                        { id: 'education_academy', label: 'Academy/University', hint: 'Formal training. Theory and credentials.' },
                        { id: 'education_elite', label: 'Elite Education', hint: 'The best money can buy. Connections and polish.' }
                    ]
                },
                {
                    label: 'Family',
                    traits: [
                        { id: 'family_supportive', label: 'Supportive', hint: 'A safety net. Do they appreciate it or feel smothered?' },
                        { id: 'family_estranged', label: 'Estranged', hint: 'Distant by choice or conflict. A door left open or locked?' },
                        { id: 'family_deceased', label: 'Deceased', hint: 'Gone. How did it happen? How does it still shape them?' },
                        { id: 'family_large', label: 'Large Family', hint: 'One of many. Competition or camaraderie?' },
                        { id: 'family_only', label: 'Only Child', hint: 'All the attention, all the pressure. Used to solitude.' }
                    ]
                },
                {
                    label: 'Origin',
                    genres: ['sci-fi', 'cyberpunk'],
                    traits: [
                        { id: 'origin_colony', label: 'Colony Station', hint: 'Born in a can. The stars are home, not the ground.' },
                        { id: 'origin_spac habitat', label: 'Space Habitat', hint: 'Artificial gravity and recycled air. Earth is a story.' },
                        { id: 'origin_alien_world', label: 'Alien World', hint: 'A foreign biosphere. They adapted to it — or it to them.' },
                        { id: 'origin_generation_ship', label: 'Generation Ship', hint: 'Born in transit. Home is a vessel, not a planet.' },
                        { id: 'origin_underworld', label: 'Underworld', hint: 'The dark side of civilization. Cables, crime, and shadows.' }
                    ]
                },
                {
                    label: 'Origin',
                    genres: ['modern', 'horror', 'romance', 'erotic-romance', 'western'],
                    traits: [
                        { id: 'origin_big_city', label: 'Big City', hint: 'Concrete jungle. Anonymous or connected?' },
                        { id: 'origin_suburb', label: 'Suburb', hint: 'Manicured lawns and quiet streets. Safe or stifling?' },
                        { id: 'origin_small_town', label: 'Small Town', hint: 'Everyone knows everyone. A community or a cage?' },
                        { id: 'origin_international', label: 'International', hint: 'Moved between places. Which passport feels like home?' }
                    ]
                },
                {
                    label: 'Origin',
                    genres: ['post-apocalyptic'],
                    traits: [
                        { id: 'origin_presurvivor', label: 'Pre-War Survivor', hint: 'Remembers the old world. Carries memories like burdens.' },
                        { id: 'origin_wasteland', label: 'Wasteland Born', hint: 'Never knew the before. This broken world is normal.' },
                        { id: 'origin_vault', label: 'Vault/Compound', hint: 'Raised in isolation. The outside is terrifying and new.' },
                        { id: 'origin_nomad_tribe', label: 'Nomad Tribe', hint: 'Travels with a clan. Safety in numbers, strength in motion.' }
                    ]
                },
                {
                    label: 'Origin',
                    genres: ['superhero'],
                    traits: [
                        { id: 'origin_accident', label: 'Accident', hint: 'Powers from a freak event. Radiation, chemicals, cosmic rays.' },
                        { id: 'origin_birthright', label: 'Birthright', hint: 'Born with it. A legacy or a mutation?' },
                        { id: 'origin_trained', label: 'Peak Training', hint: 'No superpowers — just relentless discipline and skill.' },
                        { id: 'origin_alien_hero', label: 'Alien Heritage', hint: 'Not from this world. A refugee or a scout?' },
                        { id: 'origin_artifact', label: 'Artifact-Bearer', hint: 'Power comes from an object. What happens if they lose it?' },
                        { id: 'origin_experiment', label: 'Experiment', hint: 'Made in a lab. A creation seeking purpose.' }
                    ]
                }
            ]
        },
        {
            id: 'skills',
            label: 'Skills & Abilities',
            groups: [
                {
                    label: 'Combat',
                    traits: [
                        { id: 'combat_untrained', label: 'Untrained', hint: 'Never learned to fight. Flailing and hoping.' },
                        { id: 'combat_trained', label: 'Trained', hint: 'Knows the basics. Can hold their own in a scrap.' },
                        { id: 'combat_expert', label: 'Expert', hint: 'Extensive experience. Combat is second nature.' },
                        { id: 'combat_master', label: 'Master', hint: 'A weapon is an extension of their body. Deadly.' }
                    ]
                },
                {
                    label: 'Magic',
                    genres: ['fantasy', 'historical'],
                    traits: [
                        { id: 'magic_none', label: 'No Magic', hint: 'No arcane talent. Relies on wit and steel.' },
                        { id: 'magic_innate', label: 'Innate Magic', hint: 'Born with it. Natural talent, untrained edges.' },
                        { id: 'magic_studied', label: 'Studied Magic', hint: 'Learned through discipline. Spells memorized and controlled.' },
                        { id: 'magic_forbidden', label: 'Forbidden Magic', hint: 'Dark arts, taboo knowledge. Power at a cost.' }
                    ]
                },
                {
                    label: 'Tech',
                    genres: ['sci-fi', 'cyberpunk', 'modern'],
                    traits: [
                        { id: 'tech_luddite', label: 'Luddite', hint: 'Avoids technology. Phones, computers, automation — distrusts it all.' },
                        { id: 'tech_user', label: 'Basic User', hint: 'Can operate common tech. No deep understanding needed.' },
                        { id: 'tech_hacker', label: 'Hacker', hint: 'Breaks systems open. Code is their language.' },
                        { id: 'tech_engineer', label: 'Engineer', hint: 'Builds and repairs. Knows tech inside and out.' },
                        { id: 'tech_ai_specialist', label: 'AI Specialist', hint: 'Talks to machines. Understands synthetic minds.' }
                    ]
                },
                {
                    label: 'Powers',
                    genres: ['superhero'],
                    traits: [
                        { id: 'power_physical', label: 'Physical', hint: 'Strength, speed, durability. The body is the weapon.' },
                        { id: 'power_mental', label: 'Mental', hint: 'Telekinesis, telepathy, psionics. Mind over matter.' },
                        { id: 'power_energy', label: 'Energy', hint: 'Blasts, shields, flight. Raw power projected.' },
                        { id: 'power_transformation', label: 'Transformation', hint: 'Shapeshifting, size change, alternate forms.' },
                        { id: 'power_tech', label: 'Tech-Based', hint: 'Gadgets, armor, vehicles. Power through invention.' },
                        { id: 'power_elemental', label: 'Elemental', hint: 'Fire, water, earth, air — or something stranger.' }
                    ]
                },
                {
                    label: 'Occult',
                    genres: ['horror'],
                    traits: [
                        { id: 'occult_none', label: 'Skeptic', hint: 'Doesn\'t believe. Will learn the hard way.' },
                        { id: 'occult_aware', label: 'Aware', hint: 'Knows the darkness exists. Tries to stay out of its path.' },
                        { id: 'occult_practitioner', label: 'Practitioner', hint: 'Studies the forbidden. Invites what others fear.' },
                        { id: 'occult_hunter', label: 'Hunter', hint: 'Fights the darkness. Armed with knowledge and conviction.' }
                    ]
                },
                {
                    label: 'Social',
                    traits: [
                        { id: 'social_awkward', label: 'Awkward', hint: 'Misses cues. Says the wrong thing. Means well (usually).' },
                        { id: 'social_persuasive', label: 'Persuasive', hint: 'Knows what to say and when. A silver tongue.' },
                        { id: 'social_charismatic', label: 'Charismatic', hint: 'People are drawn to them. Leadership without trying.' },
                        { id: 'social_intimidating', label: 'Intimidating', hint: 'People step back. Presence that demands space.' }
                    ]
                },
                {
                    label: 'Experience',
                    traits: [
                        { id: 'travel_weltered', label: 'Well-Traveled', hint: 'Been many places. Knows customs, roads, and where NOT to go.' },
                        { id: 'travel_insular', label: 'Insular', hint: 'Never left home. The world beyond is strange and vast.' },
                        { id: 'travel_seafarer', label: 'Seafarer', hint: 'At home on water. Knows tides, knots, and the taste of salt.' },
                        { id: 'stealthy', label: 'Stealthy', hint: 'Moves like a shadow. Soft-footed and hard to spot.' },
                        { id: 'perceptive', label: 'Perceptive', hint: 'Notices what others miss. Details speak to them.' },
                        { id: 'survival', label: 'Survivalist', hint: 'Thrives in the wild. Can make fire, find food, read the land.' },
                        { id: 'athletic', label: 'Athletic', hint: 'Physically capable. Runs, climbs, jumps — body obeys.' },
                        { id: 'skill_culinary', label: 'Culinary/Cooking', hint: 'Knows their way around a kitchen. Can feed a crowd or impress a date.' },
                        { id: 'skill_writing', label: 'Writing/Journalism', hint: 'Words come easily. Can craft a story, an article, or a love letter.' },
                        { id: 'skill_first_aid', label: 'First Aid', hint: 'Keeps a cool head in emergencies. Bandages, burns, basic life support.' },
                        { id: 'skill_photography', label: 'Photography', hint: 'Sees the world through a lens. Captures moments others miss.' },
                        { id: 'skill_management', label: 'Management', hint: 'Organizes people and processes. Keeps things running smoothly.' }
                    ]
                }
            ]
        },
        {
            id: 'flaws',
            label: 'Flaws',
            groups: [
                {
                    label: 'Flaws',
                    traits: [
                        { id: 'flaw_pride', label: 'Pride', hint: 'Cannot admit when wrong. The fall will be hard.' },
                        { id: 'flaw_reckless', label: 'Recklessness', hint: 'Acts without thinking. Thrill or desperation?' },
                        { id: 'flaw_greed', label: 'Greed', hint: 'Never enough. What hole are they filling?' },
                        { id: 'flaw_naive', label: 'Naivety', hint: 'Believes too easily. The world will teach them — or break them.' },
                        { id: 'flaw_suspicious', label: 'Suspicion', hint: 'Trusts no one. Sees betrayal in every kindness.' },
                        { id: 'flaw_obsession', label: 'Obsession', hint: 'Cannot let go. A fixation that consumes.' },
                        { id: 'flaw_cowardice', label: 'Cowardice', hint: 'Runs from danger. Survival instinct or something to overcome?' },
                        { id: 'flaw_arrogance', label: 'Arrogance', hint: 'Knows they\'re better. The universe disagrees.' },
                        { id: 'flaw_stubborn', label: 'Stubbornness', hint: 'Immovable. A strength and a weakness wrapped together.' },
                        { id: 'flaw_jealousy', label: 'Jealousy', hint: 'Wants what others have. Resentment that grows.' },
                        { id: 'flaw_lazy', label: 'Laziness', hint: 'Could do more — doesn\'t. A waste of potential.' },
                        { id: 'flaw_vain', label: 'Vanity', hint: 'Obsessed with appearance. The mirror is both friend and enemy.' },
                        { id: 'flaw_vengeful', label: 'Vengeful', hint: 'Never forgets a slight. Revenge is a dish served cold — and they have patience.' },
                        { id: 'flaw_gullible', label: 'Gullible', hint: 'Believes anything. A mark waiting to happen.' },
                        { id: 'flaw_overly_idealistic', label: 'Overly Idealistic', hint: 'Sees the best in everyone — even when they shouldn\'t. Disappointment is inevitable.' },
                        { id: 'flaw_needs_reassurance', label: 'Needs Constant Reassurance', hint: 'Doubts themselves constantly. Seeks validation from others to feel secure.' },
                        { id: 'flaw_fear_vulnerability', label: 'Fear of Vulnerability', hint: 'Keeps walls up. Intimacy feels like surrender, not connection.' },
                        { id: 'flaw_clingy', label: 'Clingy', hint: 'Holds on tight. Fear of losing people makes them hold tighter than they should.' },
                        { id: 'flaw_romanticizes', label: 'Romanticizes Everything', hint: 'Sees life through rose-tinted lenses. Reality rarely matches the fantasy.' },
                        { id: 'flaw_possessive', label: 'Possessive', hint: 'What\'s mine is mine. Jealousy as a form of love — or control.' },
                        { id: 'flaw_self_destructive', label: 'Self-Destructive', hint: 'Sabotages good things before they can be taken away. A self-fulfilling prophecy.' },
                        { id: 'flaw_co_dependent', label: 'Co-Dependent', hint: 'Loses themselves in relationships. Their identity dissolves into their partner\'s.' },
                        { id: 'flaw_emotionally_unavailable', label: 'Emotionally Unavailable', hint: 'Can offer pleasure, attention, presence — but not true intimacy. A wall they won\'t let you past.' },
                        { id: 'flaw_commitment_phobe', label: 'Commitment-Phobe', hint: 'The moment it gets real, they flee. Intimacy triggers an escape reflex.' },
                        { id: 'flaw_needs_saving', label: 'Needs to Be Saved', hint: 'Romance as rescue narrative. They seek partners who will fix, save, or complete them.' },
                        { id: 'flaw_plays_games', label: 'Plays Mind Games', hint: 'Tests partners intentionally. Pushes buttons to see who will stay.' },
                        { id: 'flaw_too_trusting', label: 'Too Trusting', hint: 'Gives themselves away too easily. Every new person is a potential soulmate.' },
                        { id: 'flaw_guarded_heart', label: 'Guarded Heart', hint: 'Keeps everyone at arm\'s length. The walls are high and the drawbridge stays up.' },
                        { id: 'flaw_love_addict', label: 'Love Addict', hint: 'Addicted to the rush of new romance. The chase is the drug; the capture is the comedown.' },
                        { id: 'flaw_uses_sex', label: 'Uses Sex as Currency', hint: 'Intimacy as a tool, not a connection. Pleasure given in exchange for something.' },
                        { id: 'flaw_serial_monogamist', label: 'Serial Monogamist', hint: 'Can\'t be alone. Bounces from relationship to relationship — no gap, no growth.' }
                    ]
                },
                {
                    label: 'Sanity',
                    genres: ['horror'],
                    traits: [
                        { id: 'sanity_stable', label: 'Stable', hint: 'Unshaken — so far. Everyone has a breaking point.' },
                        { id: 'sanity_unsettled', label: 'Unsettled', hint: 'Something is wrong. Sleep is thin, nerves are frayed.' },
                        { id: 'sanity_haunted', label: 'Haunted', hint: 'Carries trauma that whispers. The past is not past.' },
                        { id: 'sanity_broken', label: 'Broken', hint: 'Shattered by what they\'ve seen. Can they be put back together?' }
                    ]
                },
                {
                    label: 'Connection to Horror',
                    genres: ['horror'],
                    traits: [
                        { id: 'horror_witness', label: 'Witness', hint: 'Saw something. Now they\'re part of it.' },
                        { id: 'horror_investigator', label: 'Investigator', hint: 'Looking for answers. Will they like what they find?' },
                        { id: 'horror_victim', label: 'Target/Victim', hint: 'Something is after them. Why?' },
                        { id: 'horror_survivor', label: 'Survivor', hint: 'Been through it before. Knows the rules.' },
                        { id: 'horror_hunter', label: 'Hunter', hint: 'Hunts the darkness. Or does it hunt them back?' }
                    ]
                }
            ]
        },
        {
            id: 'quirks',
            label: 'Quirks & Mannerisms',
            groups: [
                {
                    label: 'Speech',
                    traits: [
                        { id: 'speech_soft', label: 'Soft-Spoken', hint: 'Makes others lean in to hear. Quiet power or shyness?' },
                        { id: 'speech_loud', label: 'Loud Voice', hint: 'Announces presence. Can\'t be ignored — or can\'t read the room.' },
                        { id: 'speech_slow', label: 'Slow/Slurred', hint: 'Words come deliberately. Tired, relaxed, or unfiltered?' },
                        { id: 'speech_fast', label: 'Fast Talker', hint: 'Words tumble out. Racing thoughts or nervous energy?' },
                        { id: 'speech_formal', label: 'Formal', hint: 'Precise and proper. Trained or just old-fashioned?' },
                        { id: 'speech_slang', label: 'Uses Slang', hint: 'Contemporary and casual. Dated or ahead of the curve?' },
                        { id: 'speech_accent', label: 'Distinct Accent', hint: 'Where are they from? Does it thicken under stress?' },
                        { id: 'speech_lisp', label: 'Lisp/Impediment', hint: 'Self-conscious about it, or lean into it with confidence?' }
                    ]
                },
                {
                    label: 'Mannerisms',
                    traits: [
                        { id: 'manner_fidgets', label: 'Fidgets', hint: 'Hands always moving. Restless energy or anxiety?' },
                        { id: 'manner_eye', label: 'Strong Eye Contact', hint: 'Unflinching. Intimidating, intimate, or a power move.' },
                        { id: 'manner_avoids', label: 'Avoids Eye Contact', hint: 'Looks away. Shame, shyness, or hiding something?' },
                        { id: 'manner_rigid', label: 'Stands Rigidly', hint: 'Posture like a statue. Military, guarded, or uncomfortable?' },
                        { id: 'manner_paces', label: 'Paces', hint: 'Thinks on their feet. Literally.' },
                        { id: 'manner_gestures', label: 'Expressive Gestures', hint: 'Talks with their hands. Can\'t tell a story without acting it out.' },
                        { id: 'manner_crossed', label: 'Crossed Arms', hint: 'Defensive posture. Closed off or just comfortable?' },
                        { id: 'manner_head_tilt', label: 'Tilts Head When Listening', hint: 'A subtle lean in. Shows they\'re truly paying attention.' },
                        { id: 'manner_gentle_touch', label: 'Gentle Touch', hint: 'Touches arms, shoulders, hands when speaking. Connection through contact.' }
                    ]
                },
                {
                    label: 'Habits',
                    traits: [
                        { id: 'habit_smokes', label: 'Smokes', hint: 'A ritual. Stress relief, addiction, or just something to do with hands.' },
                        { id: 'habit_hums', label: 'Hums/Whistles', hint: 'Unconscious melody. A tell for when they\'re relaxed or nervous.' },
                        { id: 'habit_coin', label: 'Fidgets with Object', hint: 'Coins, pen, lighter — always something in their hands.' },
                        { id: 'habit_mutters', label: 'Mutters to Self', hint: 'Working through thoughts aloud. Do they know they do it?' },
                        { id: 'habit_taps', label: 'Taps Fingers/Foot', hint: 'Restless rhythm. Counting time or counting down.' },
                        { id: 'habit_bites', label: 'Bites Nails/Lip', hint: 'Self-soothing. A tell for stress they won\'t admit.' },
                        { id: 'habit_notes', label: 'Leaves Little Notes', hint: 'Sticky notes, texts, scribbled reminders. Leaves traces of thought everywhere.' },
                        { id: 'habit_offers_drink', label: 'Always Offers a Drink', hint: 'Tea, coffee, water — offering hospitality is second nature.' }
                    ]
                },
                {
                    label: 'Intimate Gestures',
                    traits: [
                        { id: 'gesture_leans_in', label: 'Leans Into Your Space', hint: 'Stands closer than necessary. Finds reasons to close the gap. The boundary quietly dissolves around them.' },
                        { id: 'gesture_private_look', label: 'A Private Expression', hint: 'Their public face is one thing. But a specific look — half-smile, softened eyes — appears only when it\'s just the two of them.' },
                        { id: 'gesture_reads_you', label: 'Reads the Room Around You', hint: 'Attuned to your mood without being told. Slows down when you\'re tired, lightens up when you need it. Unspoken care.' },
                        { id: 'gesture_finds_reasons', label: 'Finds Reasons to Touch', hint: 'A hand on the back, a shoulder squeeze, fingers brushing when passing something. Contact that seems incidental but never is.' },
                        { id: 'gesture_remembers', label: 'Remembers the Small Things', hint: 'Your coffee order, a story you told once, a name you mentioned in passing. The detail work is how they love.' }
                    ]
                }
            ]
        },
        {
            id: 'narrative_role',
            label: 'Narrative Role',
            groups: [
                {
                    label: 'Role in Story',
                    traits: [
                        { id: 'role_protagonist', label: 'Protagonist', hint: 'The story revolves around them. Their choices drive the plot.' },
                        { id: 'role_antagonist', label: 'Antagonist', hint: 'Stands in opposition. Every hero needs a worthy obstacle.' },
                        { id: 'role_mentor', label: 'Mentor', hint: 'Guides others. Wise, experienced, and probably won\'t last the whole story.' },
                        { id: 'role_comic_relief', label: 'Comic Relief', hint: 'Lightens the mood. Funny doesn\'t mean shallow.' },
                        { id: 'role_love_interest', label: 'Love Interest', hint: 'The heart of someone\'s story. More than just a prize.' },
                        { id: 'role_sidekick', label: 'Sidekick', hint: 'Supports the hero. Loyal, capable, and often underestimated.' },
                        { id: 'role_false_hero', label: 'False Hero', hint: 'Seems heroic — at first. A facade waiting to crack.' },
                        { id: 'role_narrator', label: 'Narrator', hint: 'Tells the story. Observer or reluctant participant?' },
                        { id: 'role_foil', label: 'Foil', hint: 'Reflects and contrasts the main character. What do they reveal?' }
                    ]
                },
                {
                    label: 'Archetype',
                    traits: [
                        { id: 'arch_everyman', label: 'Everyman', hint: 'Ordinary person thrust into extraordinary circumstances.' },
                        { id: 'arch_hero', label: 'Hero', hint: 'Rises to the challenge. Courage, sacrifice, growth.' },
                        { id: 'arch_outlaw', label: 'Outlaw', hint: 'Outside the system. By choice, by nature, or by circumstance.' },
                        { id: 'arch_explorer', label: 'Explorer', hint: 'Driven by curiosity. What lies beyond the map?' },
                        { id: 'arch_sage', label: 'Sage', hint: 'Seeks wisdom. Knowledge is both shield and burden.' },
                        { id: 'arch_innocent', label: 'Innocent', hint: 'Sees the good in things. The world hasn\'t hardened them — yet.' },
                        { id: 'arch_rebel', label: 'Rebel', hint: 'Questions everything. Authority is a challenge, not a command.' },
                        { id: 'arch_caregiver', label: 'Caregiver', hint: 'Nurtures and protects. Puts others before themselves.' },
                        { id: 'arch_trickster', label: 'Trickster', hint: 'Chaos and cleverness. Unpredictable, untamed.' },
                        { id: 'arch_ruler', label: 'Ruler', hint: 'Seeks control or responsibility. Order through leadership.' },
                        { id: 'arch_lover', label: 'Lover', hint: 'Love is their identity. They give and receive through affection, passion, and devotion.' },
                        { id: 'arch_tempter', label: 'Tempter/Seducer', hint: 'Knows the power of desire. Draws people in with presence and unspoken promise.' },
                        { id: 'arch_healer', label: 'Healer', hint: 'Mends what\'s broken — hearts, bodies, spirits. Their strength is in restoration.' },
                        { id: 'arch_protector', label: 'Protector', hint: 'A shield for those they love. Fierce loyalty defined by action, not words.' },
                        { id: 'arch_seeker', label: 'Seeker', hint: 'Searching for something — truth, love, purpose. The journey is the identity.' },
                        { id: 'arch_survivor', label: 'Survivor', hint: 'Has been through darkness and come out the other side. Scarred but unbroken.' },
                        { id: 'arch_martyr', label: 'Martyr', hint: 'Sacrifices themselves for others. Pain with purpose is still pain.' },
                        { id: 'arch_muse', label: 'Muse', hint: 'Inspires others simply by existing. Creativity flows from those who behold them.' },
                        { id: 'arch_temptress', label: 'Temptress', hint: 'Weaponizes allure. Their magnetism is a tool, a shield, and a blade.' },
                        { id: 'arch_guardian', label: 'Guardian', hint: 'Watches over others. A keeper of secrets, a silent sentinel.' },
                        { id: 'arch_wanderer', label: 'Wanderer', hint: 'Belongs nowhere, seeks everywhere. Rootless by choice or circumstance.' },
                        { id: 'arch_romantic', label: 'Romantic', hint: 'Believes in true love, destiny, soulmates. The heart leads, the rest follows.' }
                    ]
                }
            ]
        },
        {
            id: 'motivation',
            label: 'Motivation & Drive',
            groups: [
                {
                    label: 'Core Desire',
                    traits: [
                        { id: 'desire_power', label: 'Power', hint: 'Control over people, resources, or fate itself. Why do they want it?' },
                        { id: 'desire_knowledge', label: 'Knowledge', hint: 'Must know the truth. Some secrets should stay buried.' },
                        { id: 'desire_freedom', label: 'Freedom', hint: 'Refuses to be caged. By whom or what are they constrained?' },
                        { id: 'desire_belonging', label: 'Belonging', hint: 'Wants a place to call home. A family, a tribe, a purpose.' },
                        { id: 'desire_revenge', label: 'Revenge', hint: 'Someone must pay. Justice or vengeance — is there a difference?' },
                        { id: 'desire_redemption', label: 'Redemption', hint: 'Seeks to atone. What did they do that can\'t be forgiven?' },
                        { id: 'desire_peace', label: 'Peace', hint: 'Wants the fighting to stop. Will they fight one more war for it?' },
                        { id: 'desire_justice', label: 'Justice', hint: 'Things should be fair. An unwavering moral compass.' },
                        { id: 'desire_creation', label: 'Creation', hint: 'Builds, makes, invents. Leaving a mark on the world.' },
                        { id: 'desire_survival', label: 'Survival', hint: 'Just getting through the day. What would they die for?' },
                        { id: 'desire_intimacy', label: 'Intimacy', hint: 'To be truly, completely known by another. A soul-level connection that transcends the physical.' },
                        { id: 'desire_passion', label: 'Passion', hint: 'Craves intensity and fire. A life of quiet safety is not worth living.' },
                        { id: 'desire_recognition', label: 'Recognition', hint: 'Wants to be seen and valued. To matter deeply to someone.' },
                        { id: 'desire_devotion', label: 'Devotion', hint: 'Needs someone to devote themselves to. Purpose found through love.' },
                        { id: 'desire_self_actualization', label: 'Self-Actualization', hint: 'Must become who they truly are. Authenticity is not optional.' },
                        { id: 'desire_deep_connection', label: 'Deep Connection', hint: 'Not just love — merging. A bond so deep it feels like two becoming one.' },
                        { id: 'desire_validation', label: 'Validation', hint: 'Needs external approval to feel worthy. The mirror of others\' eyes.' },
                        { id: 'desire_control', label: 'Control', hint: 'Over themselves, over outcomes, over others. Order as safety.' },
                        { id: 'desire_escape', label: 'Escape', hint: 'From circumstances, identity, or memory. Anywhere but here.' },
                        { id: 'desire_pleasure', label: 'Pleasure', hint: 'Sensory fulfillment, joy, indulgence. The good life, fully tasted.' }
                    ]
                },
                {
                    label: 'Emotional Driver',
                    traits: [
                        { id: 'driver_guilt', label: 'Guilt', hint: 'Haunted by the past. Every action is an apology.' },
                        { id: 'driver_hope', label: 'Hope', hint: 'Believes things can get better. Fragile but unbreakable.' },
                        { id: 'driver_duty', label: 'Duty', hint: 'Obligation above all. What happens when duty conflicts with desire?' },
                        { id: 'driver_fear', label: 'Fear', hint: 'Driven by what they dread. Running from something.' },
                        { id: 'driver_love', label: 'Love', hint: 'Would do anything for someone. Strength and vulnerability.' },
                        { id: 'driver_anger', label: 'Anger', hint: 'Burning rage. Fuel or poison?' },
                        { id: 'driver_curiosity', label: 'Curiosity', hint: 'Needs to know what happens next. The unknown pulls them forward.' },
                        { id: 'driver_grief', label: 'Grief', hint: 'Loss shapes every choice. They carry someone with them — always.' },
                        { id: 'driver_loyalty', label: 'Loyalty', hint: 'Would die for the people they love. Devotion as a compass.' },
                        { id: 'driver_connection', label: 'Desire for Connection', hint: 'Deeply wants to be known, held, and understood. The search for a true bond.' },
                        { id: 'driver_loneliness', label: 'Loneliness', hint: 'Fear of being alone drives them toward connection — sometimes too fast, too desperate.' },
                        { id: 'driver_longing', label: 'Longing', hint: 'A quiet ache for something just out of reach. Keeps them moving forward.' },
                        { id: 'driver_jealousy', label: 'Jealousy', hint: 'Seeing others with what they want fuels their fire — for better or worse.' },
                        { id: 'driver_compassion', label: 'Compassion', hint: 'Others\' pain moves them to act. They cannot look away from suffering.' },
                        { id: 'driver_passion_drive', label: 'Raw Passion', hint: 'Everything they do comes from intense feeling. There is no "casual" for them.' },
                        { id: 'driver_insecurity', label: 'Insecurity', hint: 'Deep self-doubt drives them to overcompensate. Every achievement is a patch on a leaky hull.' },
                        { id: 'driver_spite', label: 'Spite', hint: 'Fueled by being counted out. Proving others wrong is a powerful engine.' },
                        { id: 'driver_wonder', label: 'Wonder', hint: 'Awe and curiosity about life, love, and the world. Beauty still moves them.' },
                        { id: 'driver_protective_instinct', label: 'Protective Instinct', hint: 'Would burn the world for the person they love. Protection as the highest calling.' },
                        { id: 'driver_self_preservation', label: 'Self-Preservation', hint: 'Survival above all else. Every choice filtered through: will this keep me safe?' }
                    ]
                }
            ]
        },
        {
            id: 'fears',
            label: 'Fears & Vulnerabilities',
            groups: [
                {
                    label: 'Inner Fears',
                    traits: [
                        { id: 'fear_failure', label: 'Failure', hint: 'Terrified of not being good enough. What\'s at stake if they fail?' },
                        { id: 'fear_abandonment', label: 'Abandonment', hint: 'Fear of being left behind. Clings or pushes away preemptively.' },
                        { id: 'fear_loss_control', label: 'Loss of Control', hint: 'Needs to be in charge. Losing control means losing themselves.' },
                        { id: 'fear_being_known', label: 'Being Known', hint: 'Afraid of being truly seen. The masks protect something.' },
                        { id: 'fear_being_alone', label: 'Being Alone', hint: 'Silence is unbearable. Company at any cost.' },
                        { id: 'fear_death', label: 'Death', hint: 'Mortality terrifies them. What would they do to live?' },
                        { id: 'fear_poverty', label: 'Poverty', hint: 'Has known scarcity. Will never go back.' },
                        { id: 'fear_irrelevance', label: 'Irrelevance', hint: 'Needs to matter. Being forgotten is worse than death.' },
                        { id: 'fear_betrayal', label: 'Betrayal', hint: 'Trusted before and was hurt. Suspicion is self-protection.' },
                        { id: 'fear_change', label: 'Change', hint: 'Fears the unknown. Clings to familiar ground.' },
                        { id: 'fear_rejection', label: 'Rejection', hint: 'Being turned away is unbearable. They protect themselves by not asking.' },
                        { id: 'fear_disappointing', label: 'Disappointing Others', hint: 'Carries the weight of others\' expectations. Failure to meet them is devastating.' },
                        { id: 'fear_losing_loved_one', label: 'Losing a Loved One', hint: 'Has lost before. The thought of losing again is paralyzing.' },
                        { id: 'fear_unlovable', label: 'Being Unlovable', hint: 'Deep down, fears they are fundamentally unworthy of love.' }
                    ]
                },
                {
                    label: 'Triggers',
                    traits: [
                        { id: 'trigger_enclosed', label: 'Enclosed Spaces', hint: 'Walls close in. Elevators, tunnels, crowded rooms.' },
                        { id: 'trigger_heights', label: 'Heights', hint: 'The ground is too far away. Vertigo and paralysis.' },
                        { id: 'trigger_darkness', label: 'Darkness', hint: 'What\'s in the dark? Imagination fills the void.' },
                        { id: 'trigger_crowds', label: 'Crowds', hint: 'Too many people. Overstimulation and anxiety.' },
                        { id: 'trigger_water', label: 'Deep Water', hint: 'What lurks beneath? Unseen depths are terrifying.' },
                        { id: 'trigger_fire', label: 'Fire', hint: 'Trauma linked to flames. Heat triggers memory.' },
                        { id: 'trigger_public_speaking', label: 'Public Speaking', hint: 'All eyes on them. Words dry up, hands shake.' },
                        { id: 'trigger_failure_replay', label: 'Reminders of Past Failure', hint: 'A certain place, sound, or smell brings it all back.' }
                    ]
                }
            ]
        },
        {
            id: 'romance_intimacy',
            label: 'Romance & Intimacy',
            groups: [
                {
                    label: 'Love Language',
                    traits: [
                        { id: 'love_words', label: 'Words of Affirmation', hint: '"I love you" is never enough. They need to hear why — specific, sincere, spoken.' },
                        { id: 'love_touch', label: 'Physical Touch', hint: 'Hand-holding, hugs, casual contact. Touch is how they give and receive love.' },
                        { id: 'love_acts', label: 'Acts of Service', hint: 'Actions speak louder than words. They show love by doing — making tea, fixing things, being useful.' },
                        { id: 'love_gifts', label: 'Gift-Giving', hint: 'Presents are proof of thought. Every gift carries a message: "I was thinking of you."' },
                        { id: 'love_time', label: 'Quality Time', hint: 'Undivided attention is the ultimate gift. Presence over presents, always.' }
                    ]
                },
                {
                    label: 'Intimacy Style',
                    traits: [
                        { id: 'intimacy_slow', label: 'Slow Burn', hint: 'Takes time to open up. Every layer peeled back is hard-won and deeply meaningful.' },
                        { id: 'intimacy_intense', label: 'Intense/All-In', hint: 'Once committed, fully committed. Depth over breadth, passion over caution.' },
                        { id: 'intimacy_cautious', label: 'Cautious', hint: 'Trust is built in millimeters. They need safety before they can surrender.' },
                        { id: 'intimacy_uninhibited', label: 'Uninhibited', hint: 'Open with feelings and body. Shame is not in their vocabulary — authenticity is.' },
                        { id: 'intimacy_pursuer_distancer', label: 'Pursuer/Distancer', hint: 'Alternates between chasing and retreating. A push-pull pattern driven by fear and desire.' },
                        { id: 'intimacy_avoidant', label: 'Avoidant', hint: 'Pulls away when things get close. Intimacy triggers a flight response.' },
                        { id: 'intimacy_anxious', label: 'Anxious', hint: 'Needs constant reassurance about the connection. Every silence feels like rejection.' }
                    ]
                },
                {
                    label: 'Physical Affection',
                    traits: [
                        { id: 'affection_cuddler', label: 'Cuddler', hint: 'Physical closeness is essential. Sleep tangled together, please — and don\'t let go.' },
                        { id: 'affection_hands', label: 'Hold Hands', hint: 'Palm-to-palm connection. A silent anchor in any room, any crowd.' },
                        { id: 'affection_touchy', label: 'Touchy/Handsy', hint: 'Constant contact — waist, shoulder, knee. Every brush is a conversation.' },
                        { id: 'affection_pda', label: 'PDA Enthusiast', hint: 'Public displays of affection come naturally. They are not ashamed of being seen wanting someone.' },
                        { id: 'affection_private', label: 'Private About Affection', hint: 'Intimacy is for behind closed doors. Public restraint, private fervor.' },
                        { id: 'affection_kisses', label: 'Kiss-Oriented', hint: 'Kisses hello, goodbye, and just because. A peck, a lingering press, a language of lips.' },
                        { id: 'affection_casual_touch', label: 'Casual Toucher', hint: 'A shoulder squeeze, an arm brush, a knee pressed close. Touch as punctuation.' }
                    ]
                },
                {
                    label: 'Pacing',
                    traits: [
                        { id: 'pacing_reserved', label: 'Reserved', hint: 'Takes things slowly. Needs emotional safety before physical intimacy can bloom.' },
                        { id: 'pacing_eager', label: 'Eager', hint: 'Moves quickly when chemistry is right. Knows what they want and isn\'t afraid to pursue it.' },
                        { id: 'pacing_casual', label: 'Casual', hint: 'Keeps things light. Depth is optional, not required. Fun without strings.' },
                        { id: 'pacing_committed', label: 'Committed', hint: 'Only interested in something real. Casual connection doesn\'t compute for them.' },
                        { id: 'pacing_avoidant', label: 'Avoidant', hint: 'Flees from pacing altogether. Labels, plans, expectations — all triggers.' },
                        { id: 'pacing_anxious', label: 'Anxious', hint: 'Wants clarity immediately. "Where is this going?" is a recurring thought.' }
                    ]
                },
                {
                    label: 'Chemistry / Attraction',
                    traits: [
                        { id: 'chem_intellectual', label: 'Intellectual', hint: 'Wit and conversation are the turn-on. A sharp mind is the sexiest quality.' },
                        { id: 'chem_emotional', label: 'Emotional', hint: 'Depth of feeling creates attraction. Vulnerability is what draws them in.' },
                        { id: 'chem_physical', label: 'Physical', hint: 'Visual and sensual attraction come first. The body speaks before the mind catches up.' },
                        { id: 'chem_banter', label: 'Banter', hint: 'Teasing and verbal sparring is foreplay. Someone who can keep up is irresistible.' },
                        { id: 'chem_mystery', label: 'Mystery', hint: 'The unknown is what draws them in. Someone who reveals themselves too quickly loses their magic.' },
                        { id: 'chem_familiarity', label: 'Familiarity', hint: 'Attraction grows through time and proximity. Trust is the most attractive quality.' }
                    ]
                },
                {
                    label: 'Relationship Dynamic',
                    traits: [
                        { id: 'dynamic_equal', label: 'Equal Partnership', hint: 'Balanced give and take. Neither leads nor follows — they walk side by side.' },
                        { id: 'dynamic_caregiver', label: 'Caregiver/Nurtured', hint: 'One nurtures, one receives. A dynamic of protection and softness.' },
                        { id: 'dynamic_pursuer', label: 'Pursuer/Pursued', hint: 'The chase is part of the connection. One reaches, one retreats — both enjoy the dance.' },
                        { id: 'dynamic_leader', label: 'Leader/Follower', hint: 'Clear roles in the relationship. One guides, one trusts the direction.' },
                        { id: 'dynamic_independent', label: 'Independent', hint: 'Together but autonomous. Love means space, not fusion.' },
                        { id: 'dynamic_intense', label: 'Intense/All-Consuming', hint: 'The relationship is the center of life. Everything orbits around them.' }
                    ]
                },
                {
                    label: 'Boundary Style',
                    traits: [
                        { id: 'boundary_rigid', label: 'Rigid Boundaries', hint: 'Clear, firm, hard to cross. They protect themselves with walls that do not move.' },
                        { id: 'boundary_porous', label: 'Porous Boundaries', hint: 'Easily lets people in — sometimes too easily. They give trust before it\'s earned.' },
                        { id: 'boundary_healthy', label: 'Healthy Boundaries', hint: 'Flexible but clear. They know their limits and communicate them without apology.' },
                        { id: 'boundary_walled', label: 'Walled Off', hint: 'Doesn\'t let anyone in. The fortress has no door.' },
                        { id: 'boundary_testing', label: 'Boundary Tester', hint: 'Pushes limits to see who stays. They test because they expect to be left.' }
                    ]
                },
                {
                    label: 'Conflict Style',
                    traits: [
                        { id: 'conflict_fighter', label: 'Fighter', hint: 'Confronts head-on. Needs resolution now — silence is not peace.' },
                        { id: 'conflict_avoider', label: 'Avoider', hint: 'Withdraws when things heat up. Needs space to process — or to escape.' },
                        { id: 'conflict_compromiser', label: 'Compromiser', hint: 'Finds middle ground. Willing to bend to keep the peace.' },
                        { id: 'conflict_escalator', label: 'Escalator', hint: 'Arguments grow quickly. Small disagreements become battles.' },
                        { id: 'conflict_placater', label: 'Placater', hint: 'Smooths things over immediately. Avoids the real issue to restore harmony.' },
                        { id: 'conflict_resolver', label: 'Resolver', hint: 'Patient and methodical. Works through conflict with care and persistence.' }
                    ]
                },
                {
                    label: 'Turn-Ons & Turn-Offs',
                    traits: [
                        { id: 'turnon_surrender', label: 'Surrender', hint: 'Giving up control, being taken, letting someone else decide. The relief of not being in charge — and the thrill of trusting someone enough to hand over the reins.' },
                        { id: 'turnon_taking_control', label: 'Taking Control', hint: 'Directing, guiding, commanding. Power feels natural in their hands — and watching someone yield to them is intoxicating.' },
                        { id: 'turnon_praise', label: 'Praise & Validation', hint: 'Being told they\'re good, wanted, perfect. Words of affirmation during intimacy hit like a drug — they crave the approval of their partner\'s voice.' },
                        { id: 'turnon_being_claimed', label: 'Being Claimed', hint: 'Ownership, marking, being told "you\'re mine." The possessiveness of a lover who stakes their territory makes them feel truly desired.' },
                        { id: 'turnon_taboo', label: 'The Forbidden', hint: 'What shouldn\'t be desired is exactly what they want. The wrongness of it amplifies the heat — secrecy, risk, transgression as fuel.' },
                        { id: 'turnon_roughness', label: 'Roughness & Edge', hint: 'A hand in the hair, a bite, being pinned down. Pleasure with an edge of danger — intensity that leaves marks, inside and out.' },
                        { id: 'turnon_teasing_denial', label: 'Denial & Teasing', hint: 'Being brought to the edge and held there. The prolonged ache of not-yet. Orgasm control, denial, the exquisite torture of waiting.' },
                        { id: 'turnon_degradation', label: 'Degradation', hint: 'Having walls stripped away, being made vulnerable in ways that should humiliate but instead liberate. Dirtiness as a form of honesty.' },
                        { id: 'turnon_being_seen', label: 'Being Truly Seen', hint: 'Not just desired — understood. A partner who sees their darkest wants and doesn\'t flinch. Acceptance of the whole, unedited self.' },
                        { id: 'turnon_primal', label: 'Primal / Animalistic', hint: 'Raw, wordless, instinct-driven intimacy. Growls, bites, skin, sweat — the veneer of civilization stripped away to something older.' },
                        { id: 'turnon_danger', label: 'Danger & Edgeplay', hint: 'Risk amplifies everything. Exhibitionism, public risk, pushing boundaries. The line between safe and unsafe is where they feel most alive.' },
                        { id: 'turnon_service', label: 'Service & Devotion', hint: 'Pleasure comes from giving — attending to every need, anticipating desire, being the instrument of their partner\'s satisfaction.' },
                        { id: 'turnon_sensory_play', label: 'Sensory Play', hint: 'Blindfolds, temperature, silk, ice, wax — sensation as its own language. Depriving one sense to heighten others is a form of trust.' },
                        { id: 'turnon_dirty_talk', label: 'Filthy Talk', hint: 'Words are the most intimate act. Being talked through it — graphic, detailed, unflinching — is as essential as touch.' },
                        { id: 'turnoff_rushed', label: 'Killed by Rushing', hint: 'Being hurried out of desire. They need time, patience, and presence — speed destroys the mood.' },
                        { id: 'turnoff_performance', label: 'Killed by Performance', hint: 'Overly rehearsed, performative, or scripted intimacy. They need authenticity, not a show.' },
                        { id: 'turnoff_disrespect', label: 'Killed by Disrespect', hint: 'Cruelty, dismissal, or being treated as an object. Respect isn\'t optional — it\'s the foundation.' },
                        { id: 'turnoff_scripted', label: 'Killed by Scripted Intimacy', hint: 'When every move feels rehearsed from a scene. They need spontaneity, real reactions — not a performance of what someone thinks desire should look like.' }
                    ]
                },
                {
                    label: 'Kink & Fantasy',
                    traits: [
                        { id: 'kink_dom_sub', label: 'Dom / Sub Dynamic', hint: 'The architecture of control and surrender is their language. Whether leading or following, the power exchange is the core of arousal.' },
                        { id: 'kink_switch', label: 'Switch', hint: 'Both giving and receiving control are essential. They need partners who can meet them on either side — or who can handle the unpredictability.' },
                        { id: 'kink_exhibition', label: 'Exhibitionism', hint: 'Being seen, heard, or known to be sexual turns them on. The awareness of an audience — real or imagined — heightens everything.' },
                        { id: 'kink_voyeur', label: 'Voyeurism', hint: 'Watching is its own form of intimacy. Seeing others in their unguarded moments of pleasure is deeply arousing.' },
                        { id: 'kink_bondage', label: 'Bondage / Restraint', hint: 'Being bound or binding another. The surrender of movement, the trust required, the vulnerability of being completely at someone\'s mercy.' },
                        { id: 'kink_bdsm', label: 'BDSM General', hint: 'Pain and pleasure intertwined. Impact play, temperature play, sensation play — intensity as intimacy.' },
                        { id: 'kink_impact', label: 'Impact Play', hint: 'Spanking, flogging, paddling — the sting and the warmth that follows. The rhythm of giving and receiving sensation.' },
                        { id: 'kink_roleplay', label: 'Roleplay & Fantasy', hint: 'Stepping into other personas — stranger, captor, authority, servant. Fantasy as a playground for desire.' },
                        { id: 'kink_cnc', label: 'Consensual Non-Consent', hint: 'The fantasy of being taken against will — negotiated, safe, and deeply intense. Trust at its most extreme expression.' },
                        { id: 'kink_breath', label: 'Breath Play', hint: 'The edge where oxygen becomes a gift given or withheld. Trust at the boundary of safety.' },
                        { id: 'kink_ageplay', label: 'Age Play / Caregiving', hint: 'A dynamic of nurturing and being nurtured. Power exchange through care, discipline, and regression.' },
                        { id: 'kink_latex_leather', label: 'Latex / Leather Fetish', hint: 'Material as magnet. The smell, the feel, the sound of latex or leather against skin. Texture as turn-on.' },
                        { id: 'kink_foot', label: 'Foot / Shoe Fetish', hint: 'Feet, stockings, heels — the lower extremities hold intense erotic charge. Worship, restraint, or simply the shape of them.' },
                        { id: 'kink_public', label: 'Public / Semi-Public', hint: 'The thrill of being caught. Risky locations, thin walls, the car, the alley — proximity to discovery heightens every sensation.' },
                        { id: 'kink_group', label: 'Group Play', hint: 'Expanding the geometry of intimacy. The energy of multiple bodies, multiple attentions, the complexity of shared pleasure.' },
                        { id: 'kink_fantasy_limit', label: 'Has Hard Limits', hint: 'Knows exactly where the line is and isn\'t interested in crossing it. Clarity is a form of confidence.' },
                        { id: 'kink_fantasy_open', label: 'Open to Exploration', hint: 'Curious but inexperienced. Eager to discover what works — with the right partner and the right trust.' }
                    ]
                },
                {
                    label: 'Sensitive Zones',
                    traits: [
                        { id: 'zone_chest', label: 'Chest & Belly', hint: 'The chest is a landscape of vulnerability. On a dense, powerful build it craves deeper pressure — muscle yielding to deliberate hands. On a softer build it is whisper-sensitive, every graze felt through layers. The body\'s mass shapes how touch lands here.' },
                        { id: 'zone_inner_thighs', label: 'Inner Thighs', hint: 'Extreme sensitivity on any body, but the quality shifts. On thick, powerful thighs the contrast of strength and tenderness makes touch here feel like being trusted with something dangerous. On slender or lean builds the skin is near-transparent in its responsiveness — a graze can make them shudder.' },
                        { id: 'zone_neck', label: 'Neck & Throat', hint: 'Always vulnerable, but sensitivity depends on the body it belongs to. A thick, corded neck needs firm, certain attention — it yields to confidence. A long, slim neck is almost hypersensitive; breath and whisper alone are enough.' },
                        { id: 'zone_ears', label: 'Ears', hint: 'Whispered words, the warmth of breath, a gentle nibble. Sound and sensation converge here in electric ways. The response is more about the voice attached to the breath than the touch itself.' },
                        { id: 'zone_hands', label: 'Hands & Wrists', hint: 'The inside of the wrist, the space between fingers — intimate touch here feels almost telepathic. On strong, working hands the palms are grounded; the lighter the frame, the more the bones and tendons telegraph sensation.' },
                        { id: 'zone_lower_back', label: 'Lower Back', hint: 'The small of the back, the dip of the spine. A hand here is possessive, protective, electric. On a broader frame the lower back is a vast territory; on a narrow build it is a concentrated point of heat.' },
                        { id: 'zone_spine', label: 'Spine', hint: 'A fingertip tracing each vertebra from nape to tailbone. The architecture of the back is a roadmap of nerve endings. On a muscular build the spine sits in a deeper channel; on a lean build each bone is close to the surface.' },
                        { id: 'zone_nape', label: 'Nape of the Neck', hint: 'The barest curve where neck meets skull. A breath here, a kiss, a whisper — the whole body shivers. This spot is equally electric regardless of build, but reveals itself differently: on a broader frame it invites leaning in; on a slender frame it invites being held.' },
                        { id: 'zone_hips', label: 'Hips & Waist', hint: 'A hand on the hip can guide, claim, or steady. This is a control point and a pleasure point in one. On a curvy or pear-shaped body the hip is a generous curve to grip; on an athletic frame the jut of bone is a sharp, precise anchor.' },
                        { id: 'zone_tailbone', label: 'Tailbone / Sacrum', hint: 'The base of the spine, the last curve before the body opens. Deep pressure here grounds; light touch electrifies. On a full-figured body this area is soft and warm; on a sinewy build it is a precise switch.' },
                        { id: 'zone_breath', label: 'Breath & Throat', hint: 'A hand at the throat — not squeezing, just present. The awareness of breath as something that can be controlled, taken, or given back. On a thick-necked build the throat feels solid, nearly invulnerable — which makes the trust of offering it more profound. On a slim neck the vulnerability is immediate and visible.' },
                        { id: 'zone_nipples', label: 'Nipples / Chest Points', hint: 'Pain and pleasure converge here. A brush, a pinch, a mouth — response varies wildly but is never neutral. On a built chest or a soft one, the sensitivity of the nipples can be surprisingly consistent or surprisingly absent regardless of body type.' },
                        { id: 'zone_full_body', label: 'Full Body Sensitivity', hint: 'There isn\'t one spot — their whole skin is receptive. Every point of contact matters equally. On any build, this means slow, deliberate attention to the whole canvas rather than target zones.' },
                        { id: 'zone_mouth', label: 'Inside the Mouth', hint: 'The roof of the mouth, the inside of the lip, the tongue. The mouth is a secondary sex organ — every surface is an erogenous zone. This sensitivity has little to do with body type and everything to do with how present they are in the moment.' }
                    ]
                }
            ]
        }
    ];

    const DEFAULT_INSTRUCTION_TEMPLATES = [
        { id: 'appearance', label: 'Describe Appearance', message: 'Describe this character\'s physical appearance in vivid detail — their build, face, clothing style, and how they carry themselves.', relevantCategories: ['appearance', 'clothing'] },
        { id: 'backstory', label: 'Flesh Out Backstory', message: 'Expand on this character\'s background — where they came from, what shaped them, and key events that made them who they are.', relevantCategories: ['background'] },
        { id: 'arc', label: 'Define Arc / Growth Edge', message: 'Describe the arc this character is on — where they are now vs. where they need to go. What must they learn, overcome, or become to grow?', relevantCategories: ['personality', 'motivation', 'fears', 'narrative_role'] },
        { id: 'personality', label: 'Deepen Personality', message: 'Describe this character\'s personality in depth — their emotional landscape, how they treat others, what drives them, and what they fear.', relevantCategories: ['personality'] },
        { id: 'mannerisms', label: 'Add Mannerisms', message: 'Describe this character\'s unique mannerisms, speech patterns, habits, and how they behave in different situations.', relevantCategories: ['personality', 'quirks'] },
        { id: 'daily', label: 'Daily Life / Routine', message: 'Describe a typical day for this character — their morning ritual, small habits, how they occupy quiet moments, and what their everyday life looks like outside of drama or adventure.', relevantCategories: ['background', 'personality', 'quirks'] },
        { id: 'quirks', label: 'Suggest Quirks', message: 'Suggest distinctive quirks, habits, or unique traits that would make this character memorable and feel real.', relevantCategories: ['quirks'] },
        { id: 'skills', label: 'Showcase Skills', message: 'Describe how this character\'s skills and abilities manifest in action — how they fight, create, persuade, or survive. Show their expertise in motion rather than just listing what they know.', relevantCategories: ['skills', 'background'] },
        { id: 'dialogue', label: 'Write Sample Dialogue', message: 'Write a short sample dialogue showing how this character speaks and interacts with others, capturing their voice.', relevantCategories: ['personality', 'quirks', 'background'] },
        { id: 'relations', label: 'Build Relationships', message: 'Suggest relationships this character might have — friends, rivals, family, mentors — and how those connections shape them.', relevantCategories: ['personality', 'background', 'narrative_role'] },
        { id: 'romance', label: 'Romantic Chemistry', message: 'Describe how this character experiences romantic attraction — their tells, their pace, what draws them in, what pushes them away, and how they behave when walls start coming down.', relevantCategories: ['romance_intimacy', 'personality', 'fears'] },
        { id: 'flaws', label: 'Explore Flaws', message: 'Explore this character\'s flaws in depth — what are their weaknesses, blind spots, and the ways they might fail or grow.', relevantCategories: ['flaws', 'personality'] },
        { id: 'fears', label: 'Explore Fears', message: 'Delve into this character\'s deepest fears — what keeps them awake at night, what they avoid, and how their fears shape their choices and relationships.', relevantCategories: ['fears', 'personality', 'motivation'] },
        { id: 'romance_intimacy', label: 'Romance & Intimacy Deep Dive', message: 'Delve into this character\'s intimate side — their love language, how they express desire, their comfort with vulnerability, their pacing in relationships, and what intimacy truly means to them. Show how they love and how they long to be loved.', relevantCategories: ['romance_intimacy', 'personality', 'fears'] },
        { id: 'romantic_archetype', label: 'Romantic Narrative Archetype', message: 'Identify this character\'s romantic narrative archetype — the role they play in their own love story. Are they the reluctant lover who must be won over, the guarded heart learning to trust again, the hopeless romantic chasing an ideal, or the one who doesn\'t believe they deserve love? What classic trope fits their arc — enemies-to-lovers, friends-to-lovers, second chance, forbidden, forced proximity — and how do their personality, fears, and past relationships drive or resist that path?', relevantCategories: ['romance_intimacy', 'narrative_role', 'personality', 'fears'] },
        { id: 'sensuality', label: 'Sensuality & the Body', message: 'Describe this character\'s relationship with their own body and physical sensation. How present are they in their physical self? What turns them on, what kills the mood, and what kinks or fantasies live between those poles? Factor their specific build and body type into every detail — a character with a powerful, sculpted frame experiences touch and sensitivity differently than one with a soft, yielding build or a lean, sinewy form. Their sensitive zones should feel organic to their particular physique, and their physical responses should read as authentic to the body they inhabit. Show how their sensuality reveals itself in everyday moments and in moments of intimacy.', relevantCategories: ['romance_intimacy', 'quirks', 'personality', 'fears'] },
        { id: 'custom', label: 'Custom Instruction', message: '' }
    ];

    const CHARACTER_SYSTEM_PROMPT = 'You are a character creation assistant helping to develop detailed characters for creative writing. Your role is to help flesh out a character based on selected traits, backstory notes, and the user\'s directions.\n\nWhen asked to expand on a character:\n- Write in vivid, narrative prose - show the character, don\'t just list traits\n- Connect traits together into a coherent personality\n- Suggest how the character might speak, move, and react\n- Build a compelling backstory that explains why they are the way they are\n- Keep descriptions evocative but concise (2-4 paragraphs per topic)\n- Do not add new traits or backstory elements unless the user asks you to\n\nIf the user provides specific traits, weave them naturally into the description rather than just listing them.';

    const USER_TRAITS_KEY = 'ww_char_creator_user_traits';
    let userTraits = {};

    function getUserTraits() {
        return userTraits;
    }

    function loadUserTraits() {
        try {
            const saved = localStorage.getItem(USER_TRAITS_KEY);
            if (saved) userTraits = JSON.parse(saved);
        } catch (e) {
            userTraits = {};
        }
    }

    function saveUserTraits() {
        try {
            localStorage.setItem(USER_TRAITS_KEY, JSON.stringify(userTraits));
        } catch (e) {}
    }

    function addUserTrait(categoryId, groupLabel, label, hint) {
        const id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const trait = { id: id, label: label, hint: hint || '' };
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
        const cat = TRAIT_CATEGORIES.find(c => c.id === categoryId);
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
        return category.groups.filter(g => {
            if (!g.genres || g.genres.length === 0) return true;
            return g.genres.some(id => genreIds.includes(id));
        });
    }

    function getFilteredCategories(genreIds) {
        if (!Array.isArray(genreIds)) genreIds = [genreIds];
        return TRAIT_CATEGORIES.map(cat => {
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
            return { ...cat, groups: groups };
        }).filter(cat => cat.groups.length > 0);
    }

    function buildCompendiumEntry(name, notes, genre, selectedTraits, chatHistory) {
        const lines = [];
        const charName = name || 'Unnamed Character';

        if (notes) {
            lines.push('## Notes');
            lines.push('');
            lines.push(notes);
        }

        const catMap = {};
        for (const cat of TRAIT_CATEGORIES) {
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
            lines.push('## Traits');
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
                const stripped = lastUserMsg.replace(/ \(This character is from a .+ world\.\)$/, '');
                const tpl = DEFAULT_INSTRUCTION_TEMPLATES.find(t => t.message && t.message === stripped);
                const label = tpl ? tpl.label : 'Custom Input';
                pairs.push({ label, content: m.content.trim() });
                lastUserMsg = '';
            }
        }

        if (pairs.length > 0) {
            lines.push('');
            lines.push('## Description');
            lines.push('');
            for (const p of pairs) {
                lines.push('### ' + p.label);
                lines.push('');
                lines.push(p.content);
                lines.push('');
            }
        }

        return {
            title: charName,
            body: lines.join('\n').trim(),
            category: 'characters',
            tags: ['created'],
            imageUrl: null,
            alwaysInContext: false,
                _charData: JSON.stringify({ name: charName, genre: genre || '', notes: notes || '', selectedTraits: selectedTraits || {}, chatHistory: chatHistory || [] })
        };
    }

    function randomTraitsForGenre(genreIds) {
        if (!Array.isArray(genreIds)) genreIds = [genreIds];
        const filtered = getFilteredCategories(genreIds);
        const result = {};
        for (const cat of filtered) {
            const ids = [];
            if (cat.id === 'clothing') {
                const styleGroup = cat.groups.find(g => g.label === 'Style');
                if (styleGroup) {
                    const pick = styleGroup.traits[Math.floor(Math.random() * styleGroup.traits.length)];
                    ids.push(pick.id);
                }
                const bodyGroup = cat.groups.find(g => g.label === 'Body Type');
                if (bodyGroup) {
                    const pick = bodyGroup.traits[Math.floor(Math.random() * bodyGroup.traits.length)];
                    ids.push(pick.id);
                }
            } else if (cat.id === 'appearance') {
                for (const group of cat.groups) {
                    const pick = group.traits[Math.floor(Math.random() * group.traits.length)];
                    ids.push(pick.id);
                }
            } else if (cat.id === 'personality') {
                for (const group of cat.groups) {
                    if (group.label === 'Core Traits' && Math.random() > 0.5) continue;
                    const pick = group.traits[Math.floor(Math.random() * group.traits.length)];
                    ids.push(pick.id);
                }
            } else if (cat.id === 'background') {
                const originGroup = cat.groups.find(g => g.label === 'Origin');
                if (originGroup) {
                    const pick = originGroup.traits[Math.floor(Math.random() * originGroup.traits.length)];
                    ids.push(pick.id);
                }
                const profGroups = cat.groups.filter(g => g.label === 'Profession');
                if (profGroups.length > 0) {
                    const profGroup = profGroups[Math.floor(Math.random() * profGroups.length)];
                    const pick = profGroup.traits[Math.floor(Math.random() * profGroup.traits.length)];
                    ids.push(pick.id);
                }
            } else if (cat.id === 'flaws') {
                if (Math.random() > 0.3) {
                    const flawGroup = cat.groups.find(g => g.label === 'Flaws');
                    if (flawGroup) {
                        const pick = flawGroup.traits[Math.floor(Math.random() * flawGroup.traits.length)];
                        ids.push(pick.id);
                    }
                }
            } else if (cat.id === 'quirks') {
                const speechGroup = cat.groups.find(g => g.label === 'Speech');
                if (speechGroup && Math.random() > 0.5) {
                    const pick = speechGroup.traits[Math.floor(Math.random() * speechGroup.traits.length)];
                    ids.push(pick.id);
                }
                const mannerGroup = cat.groups.find(g => g.label === 'Mannerisms');
                if (mannerGroup && Math.random() > 0.5) {
                    const pick = mannerGroup.traits[Math.floor(Math.random() * mannerGroup.traits.length)];
                    ids.push(pick.id);
                }
            } else {
                for (const group of cat.groups) {
                    const pick = group.traits[Math.floor(Math.random() * group.traits.length)];
                    ids.push(pick.id);
                }
            }
            if (ids.length > 0) {
                result[cat.id] = ids;
            }
        }
        return result;
    }

    window.CharacterCreator = {
        GENRES,
        GENRE_DESCRIPTIONS,
        TRAIT_CATEGORIES,
        DEFAULT_INSTRUCTION_TEMPLATES,
        CHARACTER_SYSTEM_PROMPT,
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
    const USER_TEMPLATES_KEY = 'ww_char_creator_instruction_templates';
    const USER_SYSTEM_PROMPT_KEY = 'ww_char_creator_system_prompt';

    window.CharacterCreator.loadInstructionTemplates = function () {
        const stored = localStorage.getItem(USER_TEMPLATES_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            } catch (e) {
                console.warn('Failed to parse saved instruction templates, using defaults');
            }
        }
        const defaults = DEFAULT_INSTRUCTION_TEMPLATES.map(function (t) { return Object.assign({}, t); });
        localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(defaults));
        return defaults;
    };

    window.CharacterCreator.saveInstructionTemplates = function (templates) {
        localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(templates));
    };

    window.CharacterCreator.resetInstructionTemplates = function () {
        localStorage.removeItem(USER_TEMPLATES_KEY);
    };

    window.CharacterCreator.getDefaultInstructionTemplates = function () {
        return DEFAULT_INSTRUCTION_TEMPLATES.map(function (t) { return Object.assign({}, t); });
    };

    window.CharacterCreator.getSystemPrompt = function () {
        var stored = localStorage.getItem(USER_SYSTEM_PROMPT_KEY);
        return stored || CHARACTER_SYSTEM_PROMPT;
    };

    window.CharacterCreator.setSystemPrompt = function (prompt) {
        localStorage.setItem(USER_SYSTEM_PROMPT_KEY, prompt);
    };

    window.CharacterCreator.resetSystemPrompt = function () {
        localStorage.removeItem(USER_SYSTEM_PROMPT_KEY);
    };

    loadUserTraits();
})();
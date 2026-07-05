// Image describer module
// Standalone vision API caller — uses OpenRouter with a hardcoded vision model.
// Does NOT depend on Generation, Compendium, or the user's selected AI provider/model.
(function () {
    var IMAGE_DESCRIPTION_PROMPT = `Examine the character in this image and produce a thorough physical description.

Cover ALL of the following:
- Hair (color, length, style)
- Eyes (color, shape, notable features)
- Skin tone, facial structure
- Head/face shape, neck
- Shoulders, upper body, arms, hands
- Torso (chest, waist, core)
- Hips, legs, feet (if visible)
- Overall proportions, visible height
- Clothing, footwear, accessories, jewelry
- Expression, posture, demeanor
- Any scars, tattoos, or distinguishing marks

Format as concise bullet points. Describe only what is clearly visible. Do NOT use words like "maybe", "probably", "perhaps", or any hedging. If a detail is not visible, state "not visible" — do not guess or speculate.`;

    // Hardcoded — only this model is supported.
    var VISION_MODEL = 'google/gemini-2.5-flash-lite';

    window.ImageDescriber = {
        VISION_MODEL: VISION_MODEL,

        async describe(base64Data, language, apiKey) {
            if (!base64Data) return null;
            if (!apiKey) {
                return { error: 'Image description requires an OpenRouter API key. Set one in AI Settings.' };
            }

            var lang = language || 'English';
            var systemContent = 'You are a visual character description tool. Describe only what you can see. Be concise and factual.';
            if (lang !== 'English') {
                systemContent += ' Write entirely in ' + lang + '.';
            }

            var body = {
                model: VISION_MODEL,
                messages: [
                    { role: 'system', content: systemContent },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: IMAGE_DESCRIPTION_PROMPT },
                            { type: 'image_url', image_url: { url: base64Data } }
                        ]
                    }
                ],
                stream: false
            };

            var response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey,
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'Writingway'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                var errText = await response.text();
                return { error: 'Vision API returned ' + response.status + ': ' + errText };
            }

            var data = await response.json();
            var content = data.choices?.[0]?.message?.content;
            if (!content || !content.trim()) {
                return { error: 'No description generated.' };
            }
            return { description: content.trim() };
        }
    };
})();

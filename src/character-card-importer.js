// Character Card Importer Module
// Imports SillyTavern character cards (JSON/PNG, V1/V2/V3) into the WW2 compendium
(function () {
    const GLOBAL = {};

    function detectFormat(file) {
        const name = file.name.toLowerCase();
        if (name.endsWith('.json')) return 'json';
        if (name.endsWith('.png')) return 'png';
        throw new Error('Unsupported file format: ' + name.slice(name.lastIndexOf('.')) + '. Expected .json or .png');
    }

    function readPNGTextChunks(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        const sig = new Uint8Array(arrayBuffer, 0, 8);
        const pngSig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
        for (let i = 0; i < 8; i++) {
            if (sig[i] !== pngSig[i]) throw new Error('File is not a valid PNG');
        }

        const chunks = {};
        let offset = 8;

        while (offset < arrayBuffer.byteLength) {
            if (offset + 8 > arrayBuffer.byteLength) break;
            const length = view.getUint32(offset);
            offset += 4;
            let chunkType = '';
            for (let i = 0; i < 4; i++) {
                chunkType += String.fromCharCode(view.getUint8(offset + i));
            }
            offset += 4;

            if (length > 0 && offset + length > arrayBuffer.byteLength) break;

            if (chunkType === 'tEXt') {
                const data = new Uint8Array(arrayBuffer, offset, length);
                let nullIdx = -1;
                for (let i = 0; i < data.length; i++) {
                    if (data[i] === 0) { nullIdx = i; break; }
                }
                if (nullIdx !== -1) {
                    const keyword = new TextDecoder().decode(data.slice(0, nullIdx));
                    const value = data.slice(nullIdx + 1);
                    chunks[keyword] = value;
                }
            }

            offset += length + 4;

            if (chunkType === 'IEND') break;
        }

        return chunks;
    }

    function extractJSONFromPNG(arrayBuffer) {
        const chunks = readPNGTextChunks(arrayBuffer);
        const raw = chunks['ccv3'] || chunks['chara'];
        if (!raw) {
            throw new Error('No character data found in PNG. Make sure this is a SillyTavern character card, not a plain image.');
        }
        try {
            const text = new TextDecoder().decode(raw);
            const decoded = atob(text);
            return JSON.parse(decoded);
        } catch (e) {
            throw new Error('Failed to decode character data: ' + e.message);
        }
    }

    function normalizeCardData(raw) {
        if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
            return raw.data;
        }
        return raw;
    }

    function parseJSONFile(text) {
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error('Invalid JSON file: ' + e.message);
        }
    }

    function extractImageFromPNG(arrayBuffer) {
        try {
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        } catch (e) {
            console.warn('Warning: Could not extract image from PNG:', e.message);
            return null;
        }
    }

    function sanitizeCardText(text, charName) {
        if (!text) return '';
        let result = text;
        // Replace {{char}} and {{char_name}} with the character's actual name
        result = result.replace(/\{\{char(_name)?\}\}/gi, charName || '');
        // Replace {{random_user}} and {{random_user_name}} with a generic reference
        result = result.replace(/\{\{random_user(_name)?\}\}/gi, 'someone');
        // Preserve {{user}} and {{user_name}} for dynamic replacement in chat prompt
        // Strip known field references
        result = result.replace(/\{\{description\}\}/gi, '');
        result = result.replace(/\{\{personality\}\}/gi, '');
        result = result.replace(/\{\{scenario\}\}/gi, '');
        result = result.replace(/\{\{system_prompt\}\}/gi, '');
        // Strip any remaining {{...}} patterns (but preserve {{user}} and {{user_name}})
        result = result.replace(/\{\{(?!user(_name)?\})[^}]*\}\}/g, '');
        // Strip [char: ...] and [user: ...] syntax
        result = result.replace(/\[(char|user):[^\]]*\]/gi, '');
        // Strip CSS-style /* ... */ comments
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        // Clean up excessive whitespace from removals
        result = result.replace(/\n{3,}/g, '\n\n');
        result = result.replace(/[ \t]{2,}/g, ' ');
        return result.trim();
    }

    function buildCompendiumContent(importData) {
        const charName = importData.name || '';
        const lines = [];
        if (importData.description) {
            lines.push('## Description');
            lines.push('');
            lines.push(sanitizeCardText(importData.description, charName));
        }
        if (importData.personality) {
            lines.push('');
            lines.push('## Personality');
            lines.push('');
            lines.push(sanitizeCardText(importData.personality, charName));
        }
        if (importData.scenario) {
            lines.push('');
            lines.push('## Scenario');
            lines.push('');
            lines.push(sanitizeCardText(importData.scenario, charName));
        }
        if (importData.first_message) {
            lines.push('');
            lines.push('## First Message');
            lines.push('');
            lines.push(sanitizeCardText(importData.first_message, charName));
        }
        if (importData.examples) {
            lines.push('');
            lines.push('## Example Dialogue');
            lines.push('');
            lines.push(sanitizeCardText(importData.examples, charName));
        }
        if (importData.system_prompt) {
            lines.push('');
            lines.push('## System Prompt');
            lines.push('');
            lines.push(sanitizeCardText(importData.system_prompt, charName));
        }
        if (importData.creator_notes) {
            lines.push('');
            lines.push('## Creator Notes');
            lines.push('');
            lines.push(sanitizeCardText(importData.creator_notes, charName));
        }
        return lines.join('\n').trim();
    }

    function convertToCompendiumEntry(importData) {
        return {
            title: importData.name,
            body: buildCompendiumContent(importData),
            category: 'characters',
            tags: ['imported', 'sillytavern'],
            imageUrl: importData.image_base64 ? 'data:image/png;base64,' + importData.image_base64 : null,
            alwaysInContext: false,
            isPovCharacter: false
        };
    }

    async function importFile(file) {
        return new Promise((resolve, reject) => {
            const format = detectFormat(file);

            if (format === 'json') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const rawData = parseJSONFile(e.target.result);
                        const data = normalizeCardData(rawData);

                        const name = (data.name || '').trim();
                        if (!name) {
                            reject(new Error('Character data is missing a name field'));
                            return;
                        }

                        resolve({
                            name: name,
                            description: (data.description || '').trim(),
                            personality: (data.personality || '').trim(),
                            scenario: (data.scenario || '').trim(),
                            first_message: (data.first_mes || '').trim(),
                            examples: (data.mes_example || '').trim(),
                            system_prompt: (data.system_prompt || '').trim(),
                            creator_notes: (data.creator_notes || '').trim(),
                            image_base64: null,
                            raw_data: data
                        });
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsText(file);
            } else {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const arrayBuffer = e.target.result;
                        const rawData = extractJSONFromPNG(arrayBuffer);
                        const data = normalizeCardData(rawData);

                        const name = (data.name || '').trim();
                        if (!name) {
                            reject(new Error('Character data is missing a name field'));
                            return;
                        }

                        const imageBase64 = extractImageFromPNG(arrayBuffer);

                        resolve({
                            name: name,
                            description: (data.description || '').trim(),
                            personality: (data.personality || '').trim(),
                            scenario: (data.scenario || '').trim(),
                            first_message: (data.first_mes || '').trim(),
                            examples: (data.mes_example || '').trim(),
                            system_prompt: (data.system_prompt || '').trim(),
                            creator_notes: (data.creator_notes || '').trim(),
                            image_base64: imageBase64,
                            raw_data: data
                        });
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsArrayBuffer(file);
            }
        });
    }

    GLOBAL.detectFormat = detectFormat;
    GLOBAL.importFile = importFile;
    GLOBAL.convertToCompendiumEntry = convertToCompendiumEntry;
    GLOBAL.buildCompendiumContent = buildCompendiumContent;
    GLOBAL.normalizeCardData = normalizeCardData;
    GLOBAL.sanitizeCardText = sanitizeCardText;

    window.CharacterCardImporter = GLOBAL;
})();

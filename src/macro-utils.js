/**
 * Shared utilities for resolving/stripping SillyTavern-style macros from text.
 * Applied at prompt-build time so raw data stays intact.
 */

function stripSTMacros(text) {
    if (!text) return '';
    let result = text;
    // Replace {{char}} and {{char_name}} — generic strip for prose gen
    result = result.replace(/\{\{char(_name)?\}\}/gi, '');
    // Replace {{user}} and {{user_name}}
    result = result.replace(/\{\{random_user(_name)?\}\}/gi, '');
    result = result.replace(/\{\{user(_name)?\}\}/gi, '');
    // Replace known field references
    result = result.replace(/\{\{description\}\}/gi, '');
    result = result.replace(/\{\{personality\}\}/gi, '');
    result = result.replace(/\{\{scenario\}\}/gi, '');
    result = result.replace(/\{\{system_prompt\}\}/gi, '');
    // Strip any remaining {{...}} patterns
    result = result.replace(/\{\{[^}]*\}\}/g, '');
    // Strip [char: ...] and [user: ...] syntax
    result = result.replace(/\[(char|user):[^\]]*\]/gi, '');
    // Strip CSS-style /* ... */ comments
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    // Clean up excessive whitespace from removals
    result = result.replace(/\n{3,}/g, '\n\n');
    result = result.replace(/[ \t]{2,}/g, ' ');
    return result.trim();
}

window.MacroUtils = { stripSTMacros };

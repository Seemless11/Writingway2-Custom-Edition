/**
 * SecretStore — small client for the local app server's /api/secrets endpoint.
 *
 * Keeps API keys and tokens OUT of localStorage: they are stored by the local
 * Python server in settings/secrets.json (gitignored, never backed up or
 * committed). Only works when the app is served over http(s) by the local
 * server; on file:// (unsupported path) callers fall back to previous behavior.
 */
(function () {
    'use strict';

    function available() {
        try {
            return window.location.protocol === 'http:' || window.location.protocol === 'https:';
        } catch (e) {
            return false;
        }
    }

    /**
     * Load all stored secrets. Returns {} when unavailable or on any failure
     * (callers keep their previous source in that case).
     * @returns {Promise<Object>}
     */
    async function loadAll() {
        if (!available()) return {};
        try {
            const res = await fetch('/api/secrets', { signal: AbortSignal.timeout(3000) });
            if (!res.ok) return {};
            const data = await res.json();
            return (data && data.secrets) || {};
        } catch (e) {
            return {};
        }
    }

    /**
     * Merge-save a partial secrets payload. Returns true when the server
     * acknowledged the write.
     * @param {Object} partial - e.g. { aiApiKey: '...', githubToken: '...' }
     * @returns {Promise<boolean>}
     */
    async function save(partial) {
        if (!available() || !partial || typeof partial !== 'object') return false;
        try {
            const res = await fetch('/api/secrets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(partial),
                signal: AbortSignal.timeout(5000)
            });
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    window.SecretStore = { available, loadAll, save };
})();

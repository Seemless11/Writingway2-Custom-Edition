// Backup module
// Supports GitHub Gist backups today and local filesystem versioning via the app server.

(function () {
    const BACKUP_INTERVAL = 5 * 60 * 1000;
    const LOCAL_BACKUP_CREATE_ENDPOINT = '/api/create-backup';
    const LOCAL_BACKUP_LIST_ENDPOINT = '/api/list-backups';
    const LOCAL_BACKUP_GET_ENDPOINT = '/api/get-backup';
    let backupIntervalId = null;

    function providerLabel(provider) {
        switch (provider) {
            case 'github': return 'GitHub Gist';
            case 'local': return 'Local Versioning';
            case 'onedrive': return 'OneDrive';
            case 'gdrive': return 'Google Drive';
            default: return 'Backup';
        }
    }

    function providerAvailable(provider) {
        return provider === 'github' || provider === 'local';
    }

    async function listByProject(tableName, projectId, sortField) {
        try {
            if (!db[tableName]) return [];
            if (sortField) return await db[tableName].where('projectId').equals(projectId).sortBy(sortField);
            return await db[tableName].where('projectId').equals(projectId).toArray();
        } catch (e) {
            console.warn(`Failed to load ${tableName} for backup:`, e);
            return [];
        }
    }

    async function getSceneContent(sceneId) {
        let content = null;
        try { content = await db.content.get(sceneId); } catch (e) { content = null; }
        if (!content) {
            try { content = await db.content.where('sceneId').equals(sceneId).first(); } catch (e) { content = null; }
        }
        return content ? (content.text || '') : '';
    }

    const BackupManager = {
        providerLabel,

        providerAvailable,

        isProviderConfigured(app) {
            switch (app.backupProvider) {
                case 'github':
                    return !!app.githubToken;
                case 'local':
                    return true;
                default:
                    return false;
            }
        },

        canBackup(app) {
            return !!app.currentProject && this.isProviderConfigured(app) && this.providerAvailable(app.backupProvider);
        },

        canRestore(app) {
            if (!app.currentProject || !this.providerAvailable(app.backupProvider)) return false;
            if (app.backupProvider === 'github') return !!app.githubToken && !!app.currentProjectGistId;
            if (app.backupProvider === 'local') return true;
            return false;
        },

        isAutoBackupReady(app) {
            return !!app.backupEnabled && this.canBackup(app);
        },

        async validateGitHubToken(token) {
            try {
                const response = await fetch('https://api.github.com/user', {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                if (response.ok) {
                    const user = await response.json();
                    return { valid: true, username: user.login };
                }
                return { valid: false, error: 'Invalid token' };
            } catch (e) {
                return { valid: false, error: e.message };
            }
        },

        async exportProjectData(app) {
            if (!app.currentProject) return null;

            if (window.FileSystemSave && typeof window.FileSystemSave.buildProjectSnapshot === 'function') {
                return await window.FileSystemSave.buildProjectSnapshot(app);
            }

            try {
                const projectId = app.currentProject.id;
                const project = await db.projects.get(projectId);
                if (!project) return null;

                const chapters = await listByProject('chapters', projectId, 'order');
                const scenes = await listByProject('scenes', projectId, 'order');
                const compendium = await listByProject('compendium', projectId);
                const prompts = await listByProject('prompts', projectId);
                const codex = await listByProject('codex', projectId);
                const promptHistory = await listByProject('promptHistory', projectId);
                const workshopSessions = await listByProject('workshopSessions', projectId, 'updatedAt');
                const sceneContents = {};

                for (const scene of scenes) {
                    sceneContents[scene.id] = await getSceneContent(scene.id);
                }

                return {
                    version: '2.1-backup',
                    exportedAt: new Date().toISOString(),
                    project,
                    chapters,
                    scenes,
                    sceneContents,
                    compendium,
                    prompts,
                    codex,
                    promptHistory,
                    workshopSessions
                };
            } catch (e) {
                console.error('Error exporting project data:', e);
                return null;
            }
        },

        async backupNow(app) {
            switch (app.backupProvider) {
                case 'github':
                    return await this.backupToGist(app);
                case 'local':
                    return await this.backupToLocalVersioning(app);
                case 'onedrive':
                case 'gdrive':
                    return { success: false, error: `${providerLabel(app.backupProvider)} backup is not implemented yet.` };
                default:
                    return { success: false, error: 'Unknown backup provider' };
            }
        },

        async listBackups(app) {
            switch (app.backupProvider) {
                case 'github':
                    return await this.listGitHubBackups(app);
                case 'local':
                    return await this.listLocalBackups(app);
                case 'onedrive':
                case 'gdrive':
                    return { success: false, error: `${providerLabel(app.backupProvider)} restore is not implemented yet.` };
                default:
                    return { success: false, error: 'Unknown backup provider' };
            }
        },

        async restoreBackup(app, backupRef) {
            switch (app.backupProvider) {
                case 'github':
                    return await this.restoreFromGitHubBackup(app, backupRef);
                case 'local':
                    return await this.restoreFromLocalBackup(app, backupRef);
                case 'onedrive':
                case 'gdrive':
                    return { success: false, error: `${providerLabel(app.backupProvider)} restore is not implemented yet.` };
                default:
                    return { success: false, error: 'Unknown backup provider' };
            }
        },

        async backupToGist(app) {
            if (!app.githubToken || !app.currentProject) {
                return { success: false, error: 'No GitHub token or project selected' };
            }

            try {
                const projectData = await this.exportProjectData(app);
                if (!projectData) {
                    return { success: false, error: 'No project data' };
                }

                const filename = `${app.currentProject.name.replace(/[^a-z0-9]/gi, '_')}_backup.json`;
                const description = `Writingway Auto-Backup: ${app.currentProject.name}`;
                const gistId = app.currentProjectGistId;

                if (gistId) {
                    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `token ${app.githubToken}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            description,
                            files: {
                                [filename]: {
                                    content: JSON.stringify(projectData, null, 2)
                                }
                            }
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        return {
                            success: true,
                            gistId: data.id,
                            url: data.html_url,
                            updated: true,
                            provider: 'github'
                        };
                    }
                }

                const response = await fetch('https://api.github.com/gists', {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${app.githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        description,
                        public: false,
                        files: {
                            [filename]: {
                                content: JSON.stringify(projectData, null, 2)
                            }
                        }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    return {
                        success: true,
                        gistId: data.id,
                        url: data.html_url,
                        created: true,
                        provider: 'github'
                    };
                }

                return { success: false, error: `HTTP ${response.status}` };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        async listGitHubBackups(app) {
            if (!app.githubToken || !app.currentProjectGistId) {
                return { success: false, error: 'No GitHub token or gist ID' };
            }

            try {
                const response = await fetch(`https://api.github.com/gists/${app.currentProjectGistId}`, {
                    headers: {
                        'Authorization': `token ${app.githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (!response.ok) {
                    return { success: false, error: `HTTP ${response.status}` };
                }

                const gist = await response.json();
                const versions = gist.history || [];

                return {
                    success: true,
                    backups: versions.map(v => ({
                        id: v.version,
                        version: v.version,
                        timestamp: v.committed_at,
                        ref: v.url,
                        user: v.user ? v.user.login : 'unknown',
                        provider: 'github'
                    }))
                };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        async restoreFromGitHubBackup(app, versionUrl) {
            if (!app.githubToken) {
                return { success: false, error: 'No GitHub token' };
            }

            try {
                const response = await fetch(versionUrl, {
                    headers: {
                        'Authorization': `token ${app.githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (!response.ok) {
                    return { success: false, error: `HTTP ${response.status}` };
                }

                const gistVersion = await response.json();
                const firstFile = Object.values(gistVersion.files || {})[0];
                if (!firstFile) {
                    return { success: false, error: 'No backup data found' };
                }

                const backupData = JSON.parse(firstFile.content);
                await this.restoreProjectData(app, backupData);
                return { success: true, provider: 'github' };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        async backupToLocalVersioning(app) {
            if (!app.currentProject) {
                return { success: false, error: 'No project selected' };
            }

            try {
                const projectData = await this.exportProjectData(app);
                if (!projectData) {
                    return { success: false, error: 'No project data' };
                }

                const response = await fetch(LOCAL_BACKUP_CREATE_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(projectData)
                });

                const result = await response.json().catch(() => ({}));
                if (!response.ok || !result.ok) {
                    return { success: false, error: result.error || `HTTP ${response.status}` };
                }

                return {
                    success: true,
                    provider: 'local',
                    backupId: result.backupId,
                    path: result.path,
                    timestamp: result.timestamp
                };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        async listLocalBackups(app) {
            if (!app.currentProject) {
                return { success: false, error: 'No project selected' };
            }

            try {
                const query = new URLSearchParams({ projectId: String(app.currentProject.id) });
                const response = await fetch(`${LOCAL_BACKUP_LIST_ENDPOINT}?${query.toString()}`);
                const result = await response.json().catch(() => ({}));
                if (!response.ok || !result.ok) {
                    return { success: false, error: result.error || `HTTP ${response.status}` };
                }

                return {
                    success: true,
                    backups: (result.backups || []).map(backup => ({
                        id: backup.id,
                        version: backup.id,
                        timestamp: backup.timestamp,
                        ref: backup.id,
                        provider: 'local',
                        path: backup.path,
                        size: backup.size
                    }))
                };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        async restoreFromLocalBackup(app, backupId) {
            if (!app.currentProject) {
                return { success: false, error: 'No project selected' };
            }

            try {
                const query = new URLSearchParams({
                    projectId: String(app.currentProject.id),
                    backupId: String(backupId)
                });
                const response = await fetch(`${LOCAL_BACKUP_GET_ENDPOINT}?${query.toString()}`);
                const backupData = await response.json().catch(() => ({}));
                if (!response.ok || !backupData.ok) {
                    return { success: false, error: backupData.error || `HTTP ${response.status}` };
                }

                await this.restoreProjectData(app, backupData.backup);
                return { success: true, provider: 'local' };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        async restoreProjectData(app, backupData) {
            const projectId = backupData?.project?.id;
            if (!projectId) {
                throw new Error('Backup payload is missing project data');
            }

            await db.projects.put(backupData.project);

            await db.chapters.where('projectId').equals(projectId).delete();
            for (const chapter of backupData.chapters || []) {
                await db.chapters.put(chapter);
            }

            await db.scenes.where('projectId').equals(projectId).delete();
            for (const scene of backupData.scenes || []) {
                await db.scenes.put(scene);
            }

            const sceneIds = Object.keys(backupData.sceneContents || {});
            for (const sceneId of sceneIds) {
                try { await db.content.delete(sceneId); } catch (e) { /* ignore */ }
            }
            for (const [sceneId, text] of Object.entries(backupData.sceneContents || {})) {
                const wordCount = text ? text.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
                await db.content.put({ sceneId, text, wordCount, updatedAt: Date.now() });
            }

            if (db.compendium) {
                await db.compendium.where('projectId').equals(projectId).delete();
                for (const entry of backupData.compendium || []) {
                    await db.compendium.put(entry);
                }
            }

            if (db.prompts) {
                await db.prompts.where('projectId').equals(projectId).delete();
                for (const prompt of backupData.prompts || []) {
                    await db.prompts.put(prompt);
                }
            }

            if (db.codex) {
                await db.codex.where('projectId').equals(projectId).delete();
                for (const entry of backupData.codex || []) {
                    await db.codex.put(entry);
                }
            }

            if (db.promptHistory) {
                await db.promptHistory.where('projectId').equals(projectId).delete();
                for (const entry of backupData.promptHistory || []) {
                    await db.promptHistory.put(entry);
                }
            }

            if (db.workshopSessions) {
                await db.workshopSessions.where('projectId').equals(projectId).delete();
                for (const session of backupData.workshopSessions || []) {
                    await db.workshopSessions.put(session);
                }
            }

            await app.selectProject(projectId);
        },

        startAutoBackup(app) {
            this.stopAutoBackup();
            backupIntervalId = setInterval(async () => {
                if (!this.isAutoBackupReady(app) || !app.currentProject) return;

                app.backupStatus = `Backing up to ${providerLabel(app.backupProvider)}...`;
                const result = await this.backupNow(app);
                if (result.success) {
                    app.lastBackupTime = new Date();
                    app.backupStatus = `${providerLabel(app.backupProvider)} backup complete`;
                    if (result.gistId) {
                        app.currentProjectGistId = result.gistId;
                    }
                    this.saveBackupSettings(app);
                    console.log(`✓ Auto-backup successful (${app.backupProvider})`);
                } else {
                    app.backupStatus = 'Backup failed';
                    console.error('Auto-backup failed:', result.error);
                }
            }, BACKUP_INTERVAL);
        },

        stopAutoBackup() {
            if (backupIntervalId) {
                clearInterval(backupIntervalId);
                backupIntervalId = null;
            }
        },

        saveBackupSettings(app) {
            try {
                const settings = {
                    provider: app.backupProvider,
                    enabled: app.backupEnabled,
                    token: app.githubToken,
                    gistId: app.currentProjectGistId,
                    username: app.githubUsername,
                    lastBackupTime: app.lastBackupTime
                };
                localStorage.setItem('writingway:backupSettings', JSON.stringify(settings));
            } catch (e) {
                console.error('Failed to save backup settings:', e);
            }
        },

        loadBackupSettings(app) {
            try {
                const saved = localStorage.getItem('writingway:backupSettings');
                if (!saved) return;

                const settings = JSON.parse(saved);
                app.backupProvider = settings.provider || 'github';
                app.backupEnabled = settings.enabled || false;
                app.githubToken = settings.token || '';
                app.currentProjectGistId = settings.gistId || '';
                app.githubUsername = settings.username || '';
                app.lastBackupTime = settings.lastBackupTime || null;

                if (app.backupEnabled && this.isProviderConfigured(app) && providerAvailable(app.backupProvider)) {
                    setTimeout(() => {
                        this.startAutoBackup(app);
                    }, 5000);
                }
            } catch (e) {
                console.error('Failed to load backup settings:', e);
            }
        }
    };

    window.BackupManager = BackupManager;
    window.GitHubBackup = BackupManager;
})();

/**
 * backup — Backups and restore.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 *
 * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
            backupProviderName(provider = this.backupProvider) {
                if (window.BackupManager && typeof window.BackupManager.providerLabel === 'function') {
                    return window.BackupManager.providerLabel(provider);
                }
                return provider || 'Backup';
            },

            backupProviderIsAvailable(provider = this.backupProvider) {
                return provider === 'github' || provider === 'local';
            },

            backupProviderRequiresGitHubToken() {
                return this.backupProvider === 'github';
            },

            backupNeedsAttention() {
                if (!this.backupEnabled) return true;
                if (!this.backupProviderIsAvailable()) return true;
                if (this.backupProvider === 'github' && !this.githubToken) return true;
                return false;
            },

            backupWarningMessage() {
                if (!this.backupEnabled) {
                    return 'AUTO BACKUP NOT ENABLED! Data will be lost on deleting the browser cache or site data.';
                }
                if (!this.backupProviderIsAvailable()) {
                    return `${this.backupProviderName()} backup is not available yet.`;
                }
                if (this.backupProvider === 'github' && !this.githubToken) {
                    return 'GitHub backup is enabled, but no token is configured yet.';
                }
                return '';
            },

            async openBackupSettings() {
                this.showBackupSettings = true;
            },

            async closeBackupSettings() {
                this.showBackupSettings = false;
            },

            async saveBackupSettings() {
                if (!this.backupProviderIsAvailable()) {
                    this.backupEnabled = false;
                    this.backupStatus = `${this.backupProviderName()} is coming soon`;
                    if (window.BackupManager) {
                        window.BackupManager.stopAutoBackup();
                        window.BackupManager.saveBackupSettings(this);
                    }
                    alert(`${this.backupProviderName()} backup is not implemented yet.`);
                    return;
                }

                if (this.backupProviderRequiresGitHubToken() && !this.githubToken) {
                    this.backupStatus = 'GitHub token required';
                    alert('Please enter a GitHub token for GitHub Gist backups.');
                    return;
                }

                if (this.backupProviderRequiresGitHubToken() && this.githubToken) {
                    this.backupStatus = 'Validating token...';
                    const result = await window.BackupManager.validateGitHubToken(this.githubToken);

                    if (!result.valid) {
                        alert('Invalid GitHub token: ' + result.error);
                        this.backupStatus = 'Token invalid';
                        return;
                    }

                    this.githubUsername = result.username;
                }

                if (this.backupProvider !== 'github') {
                    this.githubUsername = '';
                }

                window.BackupManager.saveBackupSettings(this);

                if (window.BackupManager.isAutoBackupReady(this)) {
                    window.BackupManager.startAutoBackup(this);
                    this.backupStatus = `Auto-backup enabled: ${this.backupProviderName()}`;
                } else {
                    window.BackupManager.stopAutoBackup();
                    this.backupStatus = 'Auto-backup disabled';
                }

                this.showBackupSettings = false;
            },

            async backupNow() {
                if (!window.BackupManager.canBackup(this)) {
                    alert(`Please configure ${this.backupProviderName()} backup and select a project first.`);
                    return;
                }

                this.backupStatus = `Backing up to ${this.backupProviderName()}...`;
                const result = await window.BackupManager.backupNow(this);

                if (result.success) {
                    this.lastBackupTime = new Date();
                    this.backupStatus = `Backed up to ${this.backupProviderName()}`;
                    if (result.gistId) {
                        this.currentProjectGistId = result.gistId;
                    }
                    window.BackupManager.saveBackupSettings(this);
                    alert(`Backup successful: ${this.backupProviderName()}`);
                } else {
                    this.backupStatus = 'Backup failed';
                    alert('Backup failed: ' + result.error);
                }
            },

            async openRestoreModal() {
                if (!window.BackupManager.canRestore(this)) {
                    alert(`No restorable ${this.backupProviderName()} backups are configured for this project.`);
                    return;
                }

                this.backupStatus = 'Loading backups...';
                const result = await window.BackupManager.listBackups(this);

                if (result.success) {
                    this.backupList = result.backups;
                    this.showRestoreModal = true;
                    this.backupStatus = '';
                } else {
                    alert('Failed to load backups: ' + result.error);
                    this.backupStatus = 'Failed to load';
                }
            },

            async closeRestoreModal() {
                this.showRestoreModal = false;
                this.backupList = [];
            },

            async restoreBestLocalSnapshot() {
                if (!window.DbSnapshot || typeof window.DbSnapshot.listSnapshots !== 'function') {
                    alert('Local snapshot support is not available.');
                    return;
                }

                this.backupStatus = 'Looking for local snapshots...';
                let snapshots = [];
                try {
                    snapshots = await window.DbSnapshot.listSnapshots();
                } catch (e) {
                    this.backupStatus = 'Failed to load snapshots';
                    alert('Could not reach the local server. Make sure Writingway was started with start.bat.');
                    return;
                }

                if (!snapshots.length) {
                    this.backupStatus = 'No local snapshots found';
                    alert('No local snapshots found on disk. Make sure the Writingway server is running.');
                    return;
                }

                let best = null;
                for (const snap of snapshots) {
                    const count = Number(snap.projectCount || 0);
                    if (count > 0 && (!best || count > best.count || (count === best.count && (snap.timestamp || '') > (best.timestamp || '')))) {
                        best = { id: snap.id, timestamp: snap.timestamp, count };
                    }
                }
                if (!best && snapshots.length) {
                    best = { id: snapshots[0].id, timestamp: snapshots[0].timestamp, count: snapshots[0].projectCount || 0 };
                }

                if (!best) {
                    this.backupStatus = 'Failed to read snapshots';
                    alert('Could not read any snapshot from disk.');
                    return;
                }

                const when = best.timestamp ? new Date(best.timestamp).toLocaleString() : 'unknown time';
                if (!confirm(
                    `Restore ${best.count > 0 ? best.count + ' projects' : 'your projects'} from a local snapshot saved ${when}?\n\n` +
                    'This will REPLACE all current browser data (projects, chapters, scenes, compendium, chats) with the snapshot contents.\n\n' +
                    'Continue?'
                )) {
                    return;
                }

                this.backupStatus = 'Restoring from local snapshot...';
                try {
                    await window.DbSnapshot.restoreSnapshot(this, best.id);
                    await this.loadProjects();
                    this.backupStatus = 'Restored from local snapshot';
                    alert(`Restored ${best.count} projects from the local snapshot. Reloading...`);
                    setTimeout(() => window.location.reload(), 800);
                } catch (e) {
                    this.backupStatus = 'Restore failed';
                    alert('Restore failed: ' + (e.message || e));
                }
            },

            async restoreBackup(backupRef) {
                if (!confirm('This will replace your current project with the backup. Continue?')) {
                    return;
                }

                this.backupStatus = 'Restoring...';
                const result = await window.BackupManager.restoreBackup(this, backupRef);

                if (result.success) {
                    this.backupStatus = 'Restored';
                    alert(`${this.backupProviderName()} backup restored successfully!`);
                    this.showRestoreModal = false;
                    this.backupList = [];
                } else {
                    this.backupStatus = 'Restore failed';
                    alert('Restore failed: ' + result.error);
                }
            },
});

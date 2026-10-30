/**
 * ai — AI provider settings, model discovery, local llama setup.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 *
 * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
            // AI Configuration Functions - delegated to AISettings
            async fetchRuntimeInfo() {
                try {
                    const response = await fetch('/api/runtime-info', {
                        signal: AbortSignal.timeout(5000)
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const info = await response.json();
                    this.runtimeInfo = {
                        ...this.runtimeInfo,
                        ...info
                    };

                    this.availableLocalModels = Array.isArray(info.ggufModels) ? info.ggufModels.slice() : [];

                    if (!this.runtimeInfo.localAIAvailable && this.aiMode === 'local') {
                        this.aiMode = 'api';
                    }

                    if (!this.llamaInstallChoice) {
                        this.llamaInstallChoice = (this.runtimeInfo.llamaInstallChoices[0] || {}).id || 'cpu';
                    }
                } catch (e) {
                    console.warn('Failed to fetch runtime info:', e);
                }
            },

            hasLocalAIAvailable() {
                return !!this.runtimeInfo.localAIAvailable;
            },

            hasGGUFModels() {
                return !!this.runtimeInfo.hasGGUFModels;
            },

            needsLlamaInstall() {
                return this.hasGGUFModels() && !this.runtimeInfo.hasLlamaServer &&
                    Array.isArray(this.runtimeInfo.llamaInstallChoices) && this.runtimeInfo.llamaInstallChoices.length > 0;
            },

            shouldOfferLlamaSetup() {
                return !!this.runtimeInfo.llamaSetupRecommended && !this.llamaInstallComplete;
            },

            openLlamaSetupWizard() {
                if (this.runtimeInfo.llamaInstallChoices.length > 0 && !this.llamaInstallChoice) {
                    this.llamaInstallChoice = this.runtimeInfo.llamaInstallChoices[0].id;
                }
                this.llamaInstallError = '';
                this.llamaInstallStatus = '';
                this.showLlamaSetupWizard = true;
            },

            dismissLlamaSetupWizard() {
                if (this.isInstallingLlama || this.llamaInstallComplete) return;
                this.showLlamaSetupWizard = false;
                this.llamaInstallError = '';
                this.llamaInstallStatus = '';
            },

            async installLlamaCpp() {
                if (this.isInstallingLlama) return;

                this.llamaInstallError = '';
                this.llamaInstallStatus = 'Downloading llama.cpp...';
                this.isInstallingLlama = true;

                try {
                    const response = await fetch('/api/install-llama', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            variant: this.llamaInstallChoice || 'cpu'
                        })
                    });

                    const result = await response.json().catch(() => ({}));
                    if (!response.ok || !result.ok) {
                        throw new Error(result.error || `HTTP ${response.status}`);
                    }

                    this.llamaInstallStatus = `Installed ${result.assetName}. Restart Writingway to enable local AI.`;
                    this.llamaInstallComplete = true;
                    this.runtimeInfo = {
                        ...this.runtimeInfo,
                        hasLlamaServer: true
                    };
                } catch (e) {
                    console.error('llama.cpp install failed:', e);
                    this.llamaInstallError = e.message || String(e);
                    this.llamaInstallStatus = '';
                } finally {
                    this.isInstallingLlama = false;
                }
            },

            async shutdownForRestart() {
                try {
                    await fetch('/api/shutdown', {
                        method: 'POST'
                    });
                } catch (e) {
                    console.warn('Shutdown request failed:', e);
                } finally {
                    document.body.innerHTML = `
                        <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#181818;color:#f0f0f0;font-family:system-ui,-apple-system,sans-serif;padding:24px;">
                            <div style="max-width:620px;background:#232323;border:1px solid rgba(102,187,106,0.35);border-radius:14px;padding:32px;">
                                <h1 style="margin:0 0 12px 0;font-size:28px;color:#66bb6a;">llama.cpp installed</h1>
                                <p style="margin:0 0 12px 0;line-height:1.7;color:rgba(255,255,255,0.84);">
                                    Writingway has shut down so the local AI backend can be started cleanly.
                                </p>
                                <p style="margin:0;line-height:1.7;color:rgba(255,255,255,0.84);">
                                    Close this tab, then run <code style="background:#101010;padding:2px 6px;border-radius:4px;">start.sh</code> or <code style="background:#101010;padding:2px 6px;border-radius:4px;">start.bat</code> again.
                                </p>
                            </div>
                        </div>
                    `;
                }
            },

            async fetchProviderModels() {
                await window.AISettings.fetchProviderModels(this);
            },

            async scanLocalModels() {
                await window.AISettings.scanLocalModels(this);
            },

            saveGenerationParams() {
                window.AISettings.saveGenerationParams(this);
            },

            savePresetParam() {
                if (!this.aiModel) return;
                this.modelPresets[this.aiModel] = {
                    temperature: this.temperature,
                    maxTokens: this.maxTokens,
                    reasoningEffort: this.reasoningEffort,
                    topP: this.topP,
                    topK: this.topK,
                    repetitionPenalty: this.repetitionPenalty,
                    frequencyPenalty: this.frequencyPenalty,
                    presencePenalty: this.presencePenalty,
                    minP: this.minP,
                    seed: this.seed
                };
                if (this.useProviderDefaults) this.useProviderDefaults = false;
                window.AISettings.saveGenerationParams(this);
            },

            switchModelPreset() {
                if (!this.aiModel) return;
                const preset = this.modelPresets[this.aiModel];
                if (preset) {
                    this.temperature = preset.temperature;
                    this.maxTokens = preset.maxTokens;
                    this.reasoningEffort = preset.reasoningEffort || 'low';
                    this.topP = preset.topP;
                    this.topK = preset.topK;
                    this.repetitionPenalty = preset.repetitionPenalty;
                    this.frequencyPenalty = preset.frequencyPenalty;
                    this.presencePenalty = preset.presencePenalty;
                    this.minP = preset.minP;
                    this.seed = preset.seed;
                } else {
                    this.temperature = 0.8;
                    this.maxTokens = 300;
                    this.reasoningEffort = 'low';
                    this.topP = 0.9;
                    this.topK = 40;
                    this.repetitionPenalty = 1.0;
                    this.frequencyPenalty = 0.0;
                    this.presencePenalty = 0.0;
                    this.minP = 0.0;
                    this.seed = null;
                }
                window.AISettings.saveGenerationParams(this);
            },

            clearModelPreset() {
                if (!this.aiModel) return;
                delete this.modelPresets[this.aiModel];
                this.switchModelPreset();
            },

            async saveAISettings() {
                await window.AISettings.saveAISettings(this);
            },

            async loadAISettings() {
                await window.AISettings.loadAISettings(this);
            },
});

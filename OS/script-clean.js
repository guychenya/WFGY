// Clean TXT OS - Simplified, Focused Implementation
class CleanTxtOS {
    constructor() {
        this.isConnected = false;
        this.currentService = 'ollama';
        this.groqApiKey = '';
        this.temperature = 0.3;
        this.ollamaUrl = 'http://127.0.0.1:11434';
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.autoConnect();
    }

    // SIMPLIFIED EVENT HANDLING
    setupEventListeners() {
        // Chat input
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        
        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            chatInput.addEventListener('input', () => {
                this.autoResize(chatInput);
            });
        }
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Settings panel
        const settingsToggle = document.getElementById('settings-toggle');
        const settingsPanel = document.getElementById('settings-panel');
        const closeSettings = document.getElementById('close-settings');
        
        if (settingsToggle) {
            settingsToggle.addEventListener('click', () => {
                settingsPanel.classList.add('open');
            });
        }
        
        if (closeSettings) {
            closeSettings.addEventListener('click', () => {
                settingsPanel.classList.remove('open');
            });
        }

        // Settings controls
        const serviceSelect = document.getElementById('service-select');
        const temperaturePreset = document.getElementById('temperature-preset');
        const testConnection = document.getElementById('test-connection');
        
        if (serviceSelect) {
            serviceSelect.addEventListener('change', (e) => {
                this.currentService = e.target.value;
                this.toggleServiceSettings();
                this.saveSettings();
            });
        }
        
        if (temperaturePreset) {
            temperaturePreset.addEventListener('change', (e) => {
                this.temperature = parseFloat(e.target.value);
                this.updateResponseMode();
                this.saveSettings();
            });
        }
        
        if (testConnection) {
            testConnection.addEventListener('click', () => this.testConnection());
        }

        // API Key
        const apiKeyInput = document.getElementById('groq-api-key');
        if (apiKeyInput) {
            apiKeyInput.addEventListener('change', (e) => {
                this.groqApiKey = e.target.value;
                this.saveSettings();
            });
        }

        // Dashboard toggle
        const showDashboard = document.getElementById('show-dashboard');
        if (showDashboard) {
            showDashboard.addEventListener('change', (e) => {
                const dashboard = document.getElementById('dashboard-overlay');
                if (dashboard) {
                    dashboard.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }

        // Close dashboard
        const closeDashboard = document.getElementById('close-dashboard');
        if (closeDashboard) {
            closeDashboard.addEventListener('click', () => {
                const dashboard = document.getElementById('dashboard-overlay');
                const toggle = document.getElementById('show-dashboard');
                if (dashboard) dashboard.style.display = 'none';
                if (toggle) toggle.checked = false;
            });
        }
    }

    // AUTO-RESIZE CHAT INPUT
    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 128) + 'px';
    }

    // SIMPLIFIED MESSAGE SENDING
    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Hide welcome section on first message
        const welcomeSection = document.getElementById('welcome-section');
        if (welcomeSection) {
            welcomeSection.classList.add('hidden');
        }
        
        // Add user message
        this.addMessage(message, 'user');
        input.value = '';
        this.autoResize(input);
        
        // Show typing indicator
        this.showTyping();
        
        try {
            let response;
            if (this.currentService === 'groq') {
                response = await this.sendToGroq(message);
            } else {
                response = await this.sendToOllama(message);
            }
            
            this.hideTyping();
            this.addMessage(response, 'assistant');
            
        } catch (error) {
            this.hideTyping();
            this.addMessage('Sorry, I encountered an error. Please check your connection and try again.', 'assistant');
            console.error('Send message error:', error);
        }
    }

    // SIMPLIFIED MESSAGE DISPLAY
    addMessage(content, type) {
        const messagesArea = document.getElementById('messages-area');
        if (!messagesArea) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(contentDiv);
        messagesArea.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    // SIMPLE TYPING INDICATOR
    showTyping() {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'message assistant';
        typingDiv.innerHTML = '<div class="message-content">Thinking...</div>';
        
        const messagesArea = document.getElementById('messages-area');
        if (messagesArea) {
            messagesArea.appendChild(typingDiv);
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    }

    hideTyping() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // SIMPLIFIED OLLAMA INTEGRATION
    async sendToOllama(message) {
        const response = await fetch(`${this.ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama2',
                prompt: message,
                stream: false,
                options: {
                    temperature: this.temperature
                }
            })
        });

        if (!response.ok) {
            throw new Error('Ollama request failed');
        }

        const data = await response.json();
        return data.response;
    }

    // SIMPLIFIED GROQ INTEGRATION  
    async sendToGroq(message) {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.groqApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'mixtral-8x7b-32768',
                messages: [{ role: 'user', content: message }],
                temperature: this.temperature
            })
        });

        if (!response.ok) {
            throw new Error('Groq request failed');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    // CONNECTION TESTING
    async testConnection() {
        const testBtn = document.getElementById('test-connection');
        if (testBtn) {
            testBtn.textContent = 'Testing...';
            testBtn.disabled = true;
        }

        try {
            if (this.currentService === 'groq') {
                await this.sendToGroq('Hello');
            } else {
                await this.sendToOllama('Hello');
            }
            
            this.updateConnectionStatus(true);
            if (testBtn) testBtn.textContent = 'Connection Successful';
            
        } catch (error) {
            this.updateConnectionStatus(false);
            if (testBtn) testBtn.textContent = 'Connection Failed';
            console.error('Connection test failed:', error);
        } finally {
            if (testBtn) {
                setTimeout(() => {
                    testBtn.textContent = 'Test Connection';
                    testBtn.disabled = false;
                }, 2000);
            }
        }
    }

    // STATUS UPDATES
    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (statusDot) {
            statusDot.classList.toggle('connected', connected);
        }
        
        if (statusText) {
            statusText.textContent = connected ? 'Connected' : 'Disconnected';
        }

        // Update dashboard
        const systemStatus = document.getElementById('system-status');
        if (systemStatus) {
            systemStatus.textContent = connected ? 'Active' : 'Offline';
        }
    }

    updateResponseMode() {
        const responseMode = document.getElementById('response-mode');
        if (responseMode) {
            if (this.temperature <= 0.2) {
                responseMode.textContent = 'Focused';
            } else if (this.temperature <= 0.5) {
                responseMode.textContent = 'Balanced';
            } else {
                responseMode.textContent = 'Creative';
            }
        }
    }

    // SERVICE SETTINGS
    toggleServiceSettings() {
        const groqSettings = document.getElementById('groq-settings');
        if (groqSettings) {
            groqSettings.style.display = this.currentService === 'groq' ? 'block' : 'none';
        }
    }

    // AUTO CONNECT
    async autoConnect() {
        try {
            if (this.currentService === 'ollama') {
                // Try to connect to Ollama
                await fetch(`${this.ollamaUrl}/api/tags`);
                this.updateConnectionStatus(true);
            } else if (this.groqApiKey) {
                // Groq requires API key
                this.updateConnectionStatus(true);
            }
        } catch (error) {
            this.updateConnectionStatus(false);
        }
    }

    // SETTINGS PERSISTENCE
    loadSettings() {
        const saved = localStorage.getItem('txtos-clean-settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.currentService = settings.currentService || 'ollama';
                this.groqApiKey = settings.groqApiKey || '';
                this.temperature = settings.temperature || 0.3;
                this.ollamaUrl = settings.ollamaUrl || 'http://127.0.0.1:11434';
                
                // Update UI
                setTimeout(() => {
                    const serviceSelect = document.getElementById('service-select');
                    const temperaturePreset = document.getElementById('temperature-preset');
                    const apiKeyInput = document.getElementById('groq-api-key');
                    
                    if (serviceSelect) serviceSelect.value = this.currentService;
                    if (temperaturePreset) temperaturePreset.value = this.temperature.toString();
                    if (apiKeyInput) apiKeyInput.value = this.groqApiKey;
                    
                    this.toggleServiceSettings();
                    this.updateResponseMode();
                }, 100);
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        }
    }

    saveSettings() {
        const settings = {
            currentService: this.currentService,
            groqApiKey: this.groqApiKey,
            temperature: this.temperature,
            ollamaUrl: this.ollamaUrl
        };
        
        localStorage.setItem('txtos-clean-settings', JSON.stringify(settings));
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.txtOS = new CleanTxtOS();
});
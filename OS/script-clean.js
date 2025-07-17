// Enhanced Clean TXT OS - Multi-Provider with File Upload and History
class CleanTxtOS {
    constructor() {
        this.isConnected = false;
        this.currentService = 'ollama';
        this.temperature = 0.3;
        this.ollamaUrl = 'http://127.0.0.1:11434';
        this.uploadedFiles = [];
        this.chatHistory = [];
        this.currentChatId = null;
        this.showDashboard = false;
        this.showHistory = false;
        
        // API Keys and Models
        this.apiKeys = {
            groq: '',
            openai: '',
            claude: '',
            gemini: '',
            xai: ''
        };
        
        this.models = {
            groq: 'mixtral-8x7b-32768',
            openai: 'gpt-4',
            claude: 'claude-3-opus-20240229',
            gemini: 'gemini-1.5-pro',
            xai: 'grok-beta'
        };
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.loadChatHistory();
        this.autoConnect();
    }

    // ENHANCED EVENT HANDLING
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

        // File upload
        const fileBtn = document.getElementById('file-btn');
        const fileInput = document.getElementById('file-input');
        
        if (fileBtn) {
            fileBtn.addEventListener('click', () => {
                fileInput.click();
            });
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
            });
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

        // API Key inputs
        ['groq', 'openai', 'claude', 'gemini', 'xai'].forEach(service => {
            const apiKeyInput = document.getElementById(`${service}-api-key`);
            if (apiKeyInput) {
                apiKeyInput.addEventListener('change', (e) => {
                    this.apiKeys[service] = e.target.value;
                    this.saveSettings();
                });
            }
            
            const modelSelect = document.getElementById(`${service}-model`);
            if (modelSelect) {
                modelSelect.addEventListener('change', (e) => {
                    this.models[service] = e.target.value;
                    this.saveSettings();
                });
            }
        });

        // Dashboard toggle
        const showDashboard = document.getElementById('show-dashboard');
        if (showDashboard) {
            showDashboard.addEventListener('change', (e) => {
                this.showDashboard = e.target.checked;
                this.toggleDashboard();
                this.saveSettings();
            });
        }

        // History toggle
        const showHistory = document.getElementById('show-history');
        if (showHistory) {
            showHistory.addEventListener('change', (e) => {
                this.showHistory = e.target.checked;
                this.toggleHistory();
                this.saveSettings();
            });
        }

        // Close dashboard
        const closeDashboard = document.getElementById('close-dashboard');
        if (closeDashboard) {
            closeDashboard.addEventListener('click', () => {
                this.showDashboard = false;
                this.toggleDashboard();
                const toggle = document.getElementById('show-dashboard');
                if (toggle) toggle.checked = false;
                this.saveSettings();
            });
        }

        // Close history
        const closeHistory = document.getElementById('close-history');
        if (closeHistory) {
            closeHistory.addEventListener('click', () => {
                this.showHistory = false;
                this.toggleHistory();
                const toggle = document.getElementById('show-history');
                if (toggle) toggle.checked = false;
                this.saveSettings();
            });
        }
    }

    // FILE UPLOAD HANDLING
    async handleFileUpload(files) {
        const uploadedFilesDiv = document.getElementById('uploaded-files');
        
        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                alert(`File ${file.name} is too large. Maximum size is 10MB.`);
                continue;
            }
            
            try {
                const content = await this.readFile(file);
                const fileObj = {
                    id: Date.now() + Math.random(),
                    name: file.name,
                    size: file.size,
                    content: content,
                    type: file.type
                };
                
                this.uploadedFiles.push(fileObj);
                this.displayUploadedFile(fileObj);
                
                if (uploadedFilesDiv) {
                    uploadedFilesDiv.style.display = 'block';
                }
                
            } catch (error) {
                console.error('Error reading file:', error);
                alert(`Error reading file ${file.name}`);
            }
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    displayUploadedFile(fileObj) {
        const uploadedFilesDiv = document.getElementById('uploaded-files');
        const fileDiv = document.createElement('div');
        fileDiv.className = 'uploaded-file';
        fileDiv.innerHTML = `
            <span class="file-name">${fileObj.name}</span>
            <span class="file-size">(${this.formatFileSize(fileObj.size)})</span>
            <button class="remove-file" onclick="txtOS.removeFile('${fileObj.id}')">×</button>
        `;
        uploadedFilesDiv.appendChild(fileDiv);
    }

    removeFile(fileId) {
        this.uploadedFiles = this.uploadedFiles.filter(file => file.id !== fileId);
        const uploadedFilesDiv = document.getElementById('uploaded-files');
        uploadedFilesDiv.innerHTML = '';
        
        if (this.uploadedFiles.length === 0) {
            uploadedFilesDiv.style.display = 'none';
        } else {
            this.uploadedFiles.forEach(file => this.displayUploadedFile(file));
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // CHAT HISTORY MANAGEMENT
    startNewChat() {
        this.currentChatId = Date.now();
        const messagesArea = document.getElementById('messages-area');
        if (messagesArea) {
            messagesArea.innerHTML = '';
        }
        const welcomeSection = document.getElementById('welcome-section');
        if (welcomeSection) {
            welcomeSection.classList.remove('hidden');
        }
    }

    saveChatToHistory(messages) {
        if (!this.currentChatId || messages.length === 0) return;
        
        const existingChatIndex = this.chatHistory.findIndex(chat => chat.id === this.currentChatId);
        const chatData = {
            id: this.currentChatId,
            title: messages[0].content.substring(0, 50) + (messages[0].content.length > 50 ? '...' : ''),
            messages: messages,
            timestamp: new Date().toISOString(),
            service: this.currentService
        };
        
        if (existingChatIndex >= 0) {
            this.chatHistory[existingChatIndex] = chatData;
        } else {
            this.chatHistory.unshift(chatData);
        }
        
        // Keep only last 50 chats
        if (this.chatHistory.length > 50) {
            this.chatHistory = this.chatHistory.slice(0, 50);
        }
        
        this.saveChatHistory();
        this.updateHistoryUI();
    }

    loadChatHistory() {
        const saved = localStorage.getItem('txtos-chat-history');
        if (saved) {
            try {
                this.chatHistory = JSON.parse(saved);
                this.updateHistoryUI();
            } catch (error) {
                console.error('Failed to load chat history:', error);
            }
        }
    }

    saveChatHistory() {
        localStorage.setItem('txtos-chat-history', JSON.stringify(this.chatHistory));
    }

    updateHistoryUI() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        
        historyList.innerHTML = `
            <div class="history-actions">
                <button class="history-btn" onclick="txtOS.startNewChat()">New Chat</button>
                <button class="history-btn danger" onclick="txtOS.clearHistory()">Clear All</button>
            </div>
        `;
        
        this.chatHistory.forEach(chat => {
            const historyItem = document.createElement('div');
            historyItem.className = `history-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            historyItem.innerHTML = `
                <div class="history-title">${chat.title}</div>
                <div class="history-time">${this.formatTimestamp(chat.timestamp)}</div>
            `;
            historyItem.addEventListener('click', () => this.loadChat(chat.id));
            historyList.appendChild(historyItem);
        });
    }

    loadChat(chatId) {
        const chat = this.chatHistory.find(c => c.id === chatId);
        if (!chat) return;
        
        this.currentChatId = chatId;
        const messagesArea = document.getElementById('messages-area');
        const welcomeSection = document.getElementById('welcome-section');
        
        if (messagesArea) {
            messagesArea.innerHTML = '';
            chat.messages.forEach(msg => {
                this.addMessage(msg.content, msg.type, false);
            });
        }
        
        if (welcomeSection) {
            welcomeSection.classList.add('hidden');
        }
        
        this.updateHistoryUI();
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all chat history?')) {
            this.chatHistory = [];
            this.saveChatHistory();
            this.updateHistoryUI();
        }
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 3600000) { // Less than 1 hour
            return Math.floor(diff / 60000) + 'm ago';
        } else if (diff < 86400000) { // Less than 1 day
            return Math.floor(diff / 3600000) + 'h ago';
        } else {
            return date.toLocaleDateString();
        }
    }

    // DASHBOARD AND HISTORY TOGGLES
    toggleDashboard() {
        const dashboard = document.getElementById('dashboard-overlay');
        if (dashboard) {
            dashboard.style.display = this.showDashboard ? 'block' : 'none';
        }
    }

    toggleHistory() {
        const history = document.getElementById('history-sidebar');
        if (history) {
            history.classList.toggle('open', this.showHistory);
        }
    }

    // AUTO-RESIZE CHAT INPUT
    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 128) + 'px';
    }

    // ENHANCED MESSAGE SENDING
    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message && this.uploadedFiles.length === 0) return;
        
        // Start new chat if none exists
        if (!this.currentChatId) {
            this.startNewChat();
        }
        
        // Hide welcome section on first message
        const welcomeSection = document.getElementById('welcome-section');
        if (welcomeSection) {
            welcomeSection.classList.add('hidden');
        }
        
        // Prepare message with file context
        let fullMessage = message;
        if (this.uploadedFiles.length > 0) {
            const fileContext = this.uploadedFiles.map(file => 
                `File: ${file.name}\nContent:\n${file.content}\n\n`
            ).join('');
            fullMessage = `${fileContext}User message: ${message}`;
        }
        
        // Add user message
        this.addMessage(message, 'user');
        input.value = '';
        this.autoResize(input);
        
        // Clear uploaded files after sending
        this.uploadedFiles = [];
        const uploadedFilesDiv = document.getElementById('uploaded-files');
        if (uploadedFilesDiv) {
            uploadedFilesDiv.style.display = 'none';
            uploadedFilesDiv.innerHTML = '';
        }
        
        // Show typing indicator
        this.showTyping();
        
        try {
            let response;
            switch (this.currentService) {
                case 'groq':
                    response = await this.sendToGroq(fullMessage);
                    break;
                case 'openai':
                    response = await this.sendToOpenAI(fullMessage);
                    break;
                case 'claude':
                    response = await this.sendToClaude(fullMessage);
                    break;
                case 'gemini':
                    response = await this.sendToGemini(fullMessage);
                    break;
                case 'xai':
                    response = await this.sendToXAI(fullMessage);
                    break;
                default:
                    response = await this.sendToOllama(fullMessage);
            }
            
            this.hideTyping();
            this.addMessage(response, 'assistant');
            
        } catch (error) {
            this.hideTyping();
            this.addMessage('Sorry, I encountered an error. Please check your connection and try again.', 'assistant');
            console.error('Send message error:', error);
        }
    }

    // ENHANCED MESSAGE DISPLAY
    addMessage(content, type, saveToHistory = true) {
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
        
        // Save to history
        if (saveToHistory) {
            const messages = Array.from(messagesArea.querySelectorAll('.message')).map(msg => ({
                content: msg.querySelector('.message-content').textContent,
                type: msg.classList.contains('user') ? 'user' : 'assistant'
            }));
            this.saveChatToHistory(messages);
        }
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

    // API INTEGRATIONS
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

    async sendToGroq(message) {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKeys.groq}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.models.groq,
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

    async sendToOpenAI(message) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKeys.openai}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.models.openai,
                messages: [{ role: 'user', content: message }],
                temperature: this.temperature
            })
        });

        if (!response.ok) {
            throw new Error('OpenAI request failed');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async sendToClaude(message) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': this.apiKeys.claude,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: this.models.claude,
                messages: [{ role: 'user', content: message }],
                temperature: this.temperature,
                max_tokens: 4096
            })
        });

        if (!response.ok) {
            throw new Error('Claude request failed');
        }

        const data = await response.json();
        return data.content[0].text;
    }

    async sendToGemini(message) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${this.models.gemini}:generateContent?key=${this.apiKeys.gemini}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: message }] }],
                generationConfig: {
                    temperature: this.temperature
                }
            })
        });

        if (!response.ok) {
            throw new Error('Gemini request failed');
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    async sendToXAI(message) {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKeys.xai}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.models.xai,
                messages: [{ role: 'user', content: message }],
                temperature: this.temperature
            })
        });

        if (!response.ok) {
            throw new Error('X.AI request failed');
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
            let testMessage = 'Hello';
            switch (this.currentService) {
                case 'groq':
                    await this.sendToGroq(testMessage);
                    break;
                case 'openai':
                    await this.sendToOpenAI(testMessage);
                    break;
                case 'claude':
                    await this.sendToClaude(testMessage);
                    break;
                case 'gemini':
                    await this.sendToGemini(testMessage);
                    break;
                case 'xai':
                    await this.sendToXAI(testMessage);
                    break;
                default:
                    await this.sendToOllama(testMessage);
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
        const services = ['groq', 'openai', 'claude', 'gemini', 'xai'];
        services.forEach(service => {
            const settingsDiv = document.getElementById(`${service}-settings`);
            if (settingsDiv) {
                settingsDiv.style.display = this.currentService === service ? 'block' : 'none';
            }
        });
    }

    // AUTO CONNECT
    async autoConnect() {
        try {
            if (this.currentService === 'ollama') {
                await fetch(`${this.ollamaUrl}/api/tags`);
                this.updateConnectionStatus(true);
            } else if (this.apiKeys[this.currentService]) {
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
                this.temperature = settings.temperature || 0.3;
                this.ollamaUrl = settings.ollamaUrl || 'http://127.0.0.1:11434';
                this.apiKeys = { ...this.apiKeys, ...(settings.apiKeys || {}) };
                this.models = { ...this.models, ...(settings.models || {}) };
                this.showDashboard = settings.showDashboard || false;
                this.showHistory = settings.showHistory || false;
                
                // Update UI
                setTimeout(() => {
                    const serviceSelect = document.getElementById('service-select');
                    const temperaturePreset = document.getElementById('temperature-preset');
                    const showDashboardToggle = document.getElementById('show-dashboard');
                    const showHistoryToggle = document.getElementById('show-history');
                    
                    if (serviceSelect) serviceSelect.value = this.currentService;
                    if (temperaturePreset) temperaturePreset.value = this.temperature.toString();
                    if (showDashboardToggle) showDashboardToggle.checked = this.showDashboard;
                    if (showHistoryToggle) showHistoryToggle.checked = this.showHistory;
                    
                    // Load API keys and models
                    Object.keys(this.apiKeys).forEach(service => {
                        const apiKeyInput = document.getElementById(`${service}-api-key`);
                        if (apiKeyInput) apiKeyInput.value = this.apiKeys[service];
                        
                        const modelSelect = document.getElementById(`${service}-model`);
                        if (modelSelect) modelSelect.value = this.models[service];
                    });
                    
                    this.toggleServiceSettings();
                    this.updateResponseMode();
                    this.toggleDashboard();
                    this.toggleHistory();
                }, 100);
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        }
    }

    saveSettings() {
        const settings = {
            currentService: this.currentService,
            temperature: this.temperature,
            ollamaUrl: this.ollamaUrl,
            apiKeys: this.apiKeys,
            models: this.models,
            showDashboard: this.showDashboard,
            showHistory: this.showHistory
        };
        
        localStorage.setItem('txtos-clean-settings', JSON.stringify(settings));
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.txtOS = new CleanTxtOS();
});
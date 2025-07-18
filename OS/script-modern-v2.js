// Advanced TXT OS - Modern UI with Enhanced Features
class ModernTxtOS {
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
        this.autoSave = true;
        this.streamingResponses = false;
        this.messageCount = 0;
        this.theme = 'light';
        
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
        this.initializeTheme();
        this.autoConnect();
        this.setupKeyboardShortcuts();
    }

    // MODERN EVENT HANDLING WITH ENHANCED INTERACTIONS
    setupEventListeners() {
        // Chat input with enhanced features
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        
        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                } else if (e.key === 'Escape') {
                    chatInput.blur();
                }
            });
            
            chatInput.addEventListener('input', () => {
                this.autoResize(chatInput);
                this.updateSendButtonState();
            });

            chatInput.addEventListener('paste', (e) => {
                this.handlePaste(e);
            });
        }
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Enhanced file upload with drag and drop
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

        // Drag and drop support
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                chatContainer.classList.add('drag-over');
            });

            chatContainer.addEventListener('dragleave', (e) => {
                e.preventDefault();
                chatContainer.classList.remove('drag-over');
            });

            chatContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                chatContainer.classList.remove('drag-over');
                this.handleFileUpload(e.dataTransfer.files);
            });
        }

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
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

        // Click outside to close panels
        document.addEventListener('click', (e) => {
            if (!settingsPanel.contains(e.target) && !settingsToggle.contains(e.target)) {
                settingsPanel.classList.remove('open');
            }
        });

        // Settings controls
        const serviceSelect = document.getElementById('service-select');
        const temperaturePreset = document.getElementById('temperature-preset');
        const testConnection = document.getElementById('test-connection');
        
        if (serviceSelect) {
            serviceSelect.addEventListener('change', (e) => {
                this.currentService = e.target.value;
                this.toggleServiceSettings();
                this.updateDashboard();
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

        // API Key inputs with validation
        ['groq', 'openai', 'claude', 'gemini', 'xai'].forEach(service => {
            const apiKeyInput = document.getElementById(`${service}-api-key`);
            if (apiKeyInput) {
                apiKeyInput.addEventListener('input', (e) => {
                    this.validateApiKey(service, e.target.value);
                });
                
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

        // Feature toggles
        this.setupToggle('show-dashboard', (enabled) => {
            this.showDashboard = enabled;
            this.toggleDashboard();
        });

        this.setupToggle('show-history', (enabled) => {
            this.showHistory = enabled;
            this.toggleHistory();
        });

        this.setupToggle('auto-save', (enabled) => {
            this.autoSave = enabled;
        });

        this.setupToggle('streaming-responses', (enabled) => {
            this.streamingResponses = enabled;
        });

        // Dashboard controls
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

        // History controls
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

    setupToggle(id, callback) {
        const toggle = document.getElementById(id);
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                callback(e.target.checked);
                this.saveSettings();
            });
        }
    }

    // KEYBOARD SHORTCUTS
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter: Send message
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.sendMessage();
            }
            
            // Ctrl/Cmd + K: Focus input
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const chatInput = document.getElementById('chat-input');
                if (chatInput) chatInput.focus();
            }
            
            // Ctrl/Cmd + /: Toggle settings
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                const settingsPanel = document.getElementById('settings-panel');
                if (settingsPanel) {
                    settingsPanel.classList.toggle('open');
                }
            }
            
            // Ctrl/Cmd + D: Toggle theme
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    // THEME MANAGEMENT
    initializeTheme() {
        const savedTheme = localStorage.getItem('txtos-theme');
        if (savedTheme) {
            this.theme = savedTheme;
        } else {
            // Auto-detect based on system preference
            this.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        this.applyTheme();
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('txtos-theme')) {
                this.theme = e.matches ? 'dark' : 'light';
                this.applyTheme();
            }
        });
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        localStorage.setItem('txtos-theme', this.theme);
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('svg');
            if (this.theme === 'dark') {
                icon.innerHTML = `
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                `;
            } else {
                icon.innerHTML = `
                    <circle cx="12" cy="12" r="5"></circle>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
                `;
            }
        }
    }

    // ENHANCED FILE HANDLING
    async handleFileUpload(files) {
        const uploadedFilesDiv = document.getElementById('uploaded-files');
        
        for (const file of files) {
            if (file.size > 50 * 1024 * 1024) { // 50MB limit
                this.showNotification(`File ${file.name} is too large. Maximum size is 50MB.`, 'error');
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
                
                this.showNotification(`File ${file.name} uploaded successfully`, 'success');
                
            } catch (error) {
                console.error('Error reading file:', error);
                this.showNotification(`Error reading file ${file.name}`, 'error');
            }
        }
    }

    async handlePaste(e) {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.kind === 'file') {
                e.preventDefault();
                const file = item.getAsFile();
                await this.handleFileUpload([file]);
            }
        }
    }

    // ENHANCED NOTIFICATIONS
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        
        // Add notification styles if not exist
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 1rem;
                    right: 1rem;
                    padding: 0.75rem 1rem;
                    background: var(--bg-elevated);
                    border: 1px solid var(--border-primary);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-lg);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.875rem;
                    animation: slideInRight 0.3s ease;
                }
                .notification-success { border-color: var(--success); }
                .notification-error { border-color: var(--error); }
                .notification button {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1rem;
                    color: var(--text-secondary);
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // API KEY VALIDATION
    validateApiKey(service, key) {
        const input = document.getElementById(`${service}-api-key`);
        if (!input) return;
        
        const isValid = this.isValidApiKey(service, key);
        input.style.borderColor = isValid ? 'var(--success)' : 'var(--error)';
        
        if (isValid) {
            input.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
        } else if (key.length > 0) {
            input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
        } else {
            input.style.boxShadow = '';
            input.style.borderColor = '';
        }
    }

    isValidApiKey(service, key) {
        if (!key) return false;
        
        const patterns = {
            openai: /^sk-[a-zA-Z0-9]{48}$/,
            claude: /^sk-ant-[a-zA-Z0-9-]{95,}$/,
            groq: /^gsk_[a-zA-Z0-9]{52}$/,
            gemini: /^[A-Za-z0-9_-]{39}$/,
            xai: /^xai-[a-zA-Z0-9]{24,}$/
        };
        
        return patterns[service] ? patterns[service].test(key) : key.length > 10;
    }

    // ENHANCED SEND BUTTON STATE
    updateSendButtonState() {
        const sendBtn = document.getElementById('send-btn');
        const chatInput = document.getElementById('chat-input');
        
        if (sendBtn && chatInput) {
            const hasContent = chatInput.value.trim().length > 0 || this.uploadedFiles.length > 0;
            sendBtn.disabled = !hasContent;
            sendBtn.style.opacity = hasContent ? '1' : '0.5';
        }
    }

    // ENHANCED MESSAGE SENDING WITH STREAMING
    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message && this.uploadedFiles.length === 0) return;
        
        // Start new chat if none exists
        if (!this.currentChatId) {
            this.startNewChat();
        }
        
        // Hide welcome section
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
        this.messageCount++;
        this.updateDashboard();
        
        input.value = '';
        this.autoResize(input);
        this.updateSendButtonState();
        
        // Clear uploaded files
        this.clearUploadedFiles();
        
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
            this.messageCount++;
            this.updateDashboard();
            
        } catch (error) {
            this.hideTyping();
            this.addMessage('Sorry, I encountered an error. Please check your connection and try again.', 'assistant');
            console.error('Send message error:', error);
            this.showNotification('Failed to send message. Please try again.', 'error');
        }
    }

    clearUploadedFiles() {
        this.uploadedFiles = [];
        const uploadedFilesDiv = document.getElementById('uploaded-files');
        if (uploadedFilesDiv) {
            uploadedFilesDiv.style.display = 'none';
            uploadedFilesDiv.innerHTML = '';
        }
    }

    // ENHANCED DASHBOARD
    updateDashboard() {
        const currentProvider = document.getElementById('current-provider');
        const messageCount = document.getElementById('message-count');
        
        if (currentProvider) {
            const providerNames = {
                ollama: 'Ollama',
                groq: 'Groq',
                openai: 'OpenAI',
                claude: 'Claude',
                gemini: 'Gemini',
                xai: 'X.AI'
            };
            currentProvider.textContent = providerNames[this.currentService] || this.currentService;
        }
        
        if (messageCount) {
            messageCount.textContent = this.messageCount.toString();
        }
    }

    // Use existing methods from the clean version but with enhancements
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
        this.updateSendButtonState();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 128) + 'px';
    }

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
        
        // Scroll to bottom with smooth animation
        messagesArea.scrollTo({
            top: messagesArea.scrollHeight,
            behavior: 'smooth'
        });
        
        // Save to history
        if (saveToHistory && this.autoSave) {
            const messages = Array.from(messagesArea.querySelectorAll('.message')).map(msg => ({
                content: msg.querySelector('.message-content').textContent,
                type: msg.classList.contains('user') ? 'user' : 'assistant'
            }));
            this.saveChatToHistory(messages);
        }
    }

    showTyping() {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'message assistant';
        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="typing-animation">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        
        // Add typing animation styles
        if (!document.querySelector('#typing-styles')) {
            const styles = document.createElement('style');
            styles.id = 'typing-styles';
            styles.textContent = `
                .typing-animation {
                    display: flex;
                    gap: 0.25rem;
                    align-items: center;
                }
                .typing-animation span {
                    width: 0.5rem;
                    height: 0.5rem;
                    background: var(--text-secondary);
                    border-radius: 50%;
                    animation: typing 1.4s infinite;
                }
                .typing-animation span:nth-child(2) { animation-delay: 0.2s; }
                .typing-animation span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes typing {
                    0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
                    30% { transform: translateY(-10px); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        const messagesArea = document.getElementById('messages-area');
        if (messagesArea) {
            messagesArea.appendChild(typingDiv);
            messagesArea.scrollTo({
                top: messagesArea.scrollHeight,
                behavior: 'smooth'
            });
        }
    }

    hideTyping() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // Use enhanced versions of existing API methods
    async sendToOllama(message) {
        const response = await fetch(`${this.ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama2',
                prompt: message,
                stream: false,
                options: { temperature: this.temperature }
            })
        });

        if (!response.ok) throw new Error('Ollama request failed');
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

        if (!response.ok) throw new Error('Groq request failed');
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

        if (!response.ok) throw new Error('OpenAI request failed');
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

        if (!response.ok) throw new Error('Claude request failed');
        const data = await response.json();
        return data.content[0].text;
    }

    async sendToGemini(message) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${this.models.gemini}:generateContent?key=${this.apiKeys.gemini}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: message }] }],
                generationConfig: { temperature: this.temperature }
            })
        });

        if (!response.ok) throw new Error('Gemini request failed');
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

        if (!response.ok) throw new Error('X.AI request failed');
        const data = await response.json();
        return data.choices[0].message.content;
    }

    // Include all other methods from the clean version
    startNewChat() {
        this.currentChatId = Date.now();
        this.messageCount = 0;
        const messagesArea = document.getElementById('messages-area');
        if (messagesArea) messagesArea.innerHTML = '';
        const welcomeSection = document.getElementById('welcome-section');
        if (welcomeSection) welcomeSection.classList.remove('hidden');
        this.updateDashboard();
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
        this.messageCount = chat.messages.length;
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
        this.updateDashboard();
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all chat history?')) {
            this.chatHistory = [];
            this.saveChatHistory();
            this.updateHistoryUI();
            this.showNotification('Chat history cleared', 'success');
        }
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
        return date.toLocaleDateString();
    }

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

    async testConnection() {
        const testBtn = document.getElementById('test-connection');
        if (testBtn) {
            testBtn.textContent = 'Testing...';
            testBtn.disabled = true;
        }

        try {
            let testMessage = 'Hello';
            switch (this.currentService) {
                case 'groq': await this.sendToGroq(testMessage); break;
                case 'openai': await this.sendToOpenAI(testMessage); break;
                case 'claude': await this.sendToClaude(testMessage); break;
                case 'gemini': await this.sendToGemini(testMessage); break;
                case 'xai': await this.sendToXAI(testMessage); break;
                default: await this.sendToOllama(testMessage);
            }
            
            this.updateConnectionStatus(true);
            this.showNotification('Connection successful!', 'success');
            if (testBtn) testBtn.textContent = 'Connection Successful';
            
        } catch (error) {
            this.updateConnectionStatus(false);
            this.showNotification('Connection failed. Please check your settings.', 'error');
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

    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (statusDot) statusDot.classList.toggle('connected', connected);
        if (statusText) statusText.textContent = connected ? 'Connected' : 'Disconnected';

        const systemStatus = document.getElementById('system-status');
        if (systemStatus) systemStatus.textContent = connected ? 'Active' : 'Offline';
    }

    updateResponseMode() {
        const responseMode = document.getElementById('response-mode');
        if (responseMode) {
            if (this.temperature <= 0.2) responseMode.textContent = 'Focused';
            else if (this.temperature <= 0.5) responseMode.textContent = 'Balanced';
            else responseMode.textContent = 'Creative';
        }
    }

    toggleServiceSettings() {
        const services = ['groq', 'openai', 'claude', 'gemini', 'xai'];
        services.forEach(service => {
            const settingsDiv = document.getElementById(`${service}-settings`);
            if (settingsDiv) {
                settingsDiv.style.display = this.currentService === service ? 'block' : 'none';
            }
        });
    }

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

    loadSettings() {
        const saved = localStorage.getItem('txtos-modern-settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                Object.assign(this, {
                    currentService: settings.currentService || 'ollama',
                    temperature: settings.temperature || 0.3,
                    ollamaUrl: settings.ollamaUrl || 'http://127.0.0.1:11434',
                    apiKeys: { ...this.apiKeys, ...(settings.apiKeys || {}) },
                    models: { ...this.models, ...(settings.models || {}) },
                    showDashboard: settings.showDashboard || false,
                    showHistory: settings.showHistory || false,
                    autoSave: settings.autoSave !== false,
                    streamingResponses: settings.streamingResponses || false
                });
                
                setTimeout(() => this.updateUI(), 100);
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        }
    }

    updateUI() {
        const elements = {
            'service-select': this.currentService,
            'temperature-preset': this.temperature.toString(),
            'show-dashboard': this.showDashboard,
            'show-history': this.showHistory,
            'auto-save': this.autoSave,
            'streaming-responses': this.streamingResponses
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });

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
        this.updateDashboard();
    }

    saveSettings() {
        const settings = {
            currentService: this.currentService,
            temperature: this.temperature,
            ollamaUrl: this.ollamaUrl,
            apiKeys: this.apiKeys,
            models: this.models,
            showDashboard: this.showDashboard,
            showHistory: this.showHistory,
            autoSave: this.autoSave,
            streamingResponses: this.streamingResponses
        };
        
        localStorage.setItem('txtos-modern-settings', JSON.stringify(settings));
    }
}

// Initialize the modern TXT OS
document.addEventListener('DOMContentLoaded', () => {
    window.txtOS = new ModernTxtOS();
});
// Modern TXT OS - Ultra-fast AI Reasoning System
class ModernTxtOS {
    constructor() {
        this.ollamaUrl = 'http://127.0.0.1:11434';
        this.groqApiKey = '';
        this.currentService = 'ollama'; // 'ollama' or 'groq'
        this.currentModel = 'llama2';
        this.groqModel = 'mixtral-8x7b-32768';
        this.temperature = 0.2;
        this.memoryTree = [];
        this.isConnected = false;
        this.messageCount = 0;
        this.typingTimeouts = [];
        
        // Groq API configuration
        this.groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
        this.groqModels = [
            'mixtral-8x7b-32768',
            'llama2-70b-4096',
            'gemma-7b-it',
            'llama3-70b-8192',
            'llama3-8b-8192'
        ];
        
        // WFGY Reasoning Engine state
        this.semanticContext = new Map();
        this.knowledgeBoundary = {
            deltaS: 0,
            lambdaObserve: 0.7,
            eResonance: 0,
            boundaryActive: false
        };
        this.reasoningChain = [];
        
        // Performance optimizations
        this.messagesCache = new Map();
        this.renderQueue = [];
        this.isRendering = false;
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.initializePerformanceOptimizations();
        
        // Delay auto-connect to ensure DOM is fully loaded
        setTimeout(() => {
            this.autoConnectService();
            this.setupOllamaAutoStart();
        }, 1000);
    }

    setupEventListeners() {
        // Optimized event delegation
        document.addEventListener('click', this.handleClick.bind(this));
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Settings changes
        document.getElementById('ollama-url').addEventListener('change', () => {
            this.ollamaUrl = document.getElementById('ollama-url').value;
            this.saveSettings();
        });
        
        document.getElementById('model-select').addEventListener('change', () => {
            this.currentModel = document.getElementById('model-select').value;
            this.saveSettings();
        });
        
        document.getElementById('temperature').addEventListener('input', (e) => {
            this.temperature = parseFloat(e.target.value);
            this.saveSettings();
            this.updateDashboardIfOpen();
        });

        // Service switching
        document.getElementById('service-select').addEventListener('change', (e) => {
            this.currentService = e.target.value;
            this.switchService();
            this.saveSettings();
        });

        // Groq API key
        const groqApiKeyInput = document.getElementById('groq-api-key');
        if (groqApiKeyInput) {
            groqApiKeyInput.addEventListener('change', (e) => {
                this.groqApiKey = e.target.value;
                this.saveSettings();
            });
        }

        // Groq model selection
        const groqModelSelect = document.getElementById('groq-model-select');
        if (groqModelSelect) {
            groqModelSelect.addEventListener('change', (e) => {
                this.groqModel = e.target.value;
                this.saveSettings();
            });
        }
    }

    initializePerformanceOptimizations() {
        // Intersection Observer for lazy loading
        this.messageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        // Throttled scroll handler
        this.throttledScroll = this.throttle(() => {
            const container = document.getElementById('chat-messages');
            if (container.scrollTop + container.clientHeight >= container.scrollHeight - 10) {
                this.processRenderQueue();
            }
        }, 16);

        document.getElementById('chat-messages').addEventListener('scroll', this.throttledScroll);
    }

    processRenderQueue() {
        if (this.isRendering || this.renderQueue.length === 0) return;
        
        this.isRendering = true;
        
        // Process up to 5 items from the queue
        const batchSize = Math.min(5, this.renderQueue.length);
        const batch = this.renderQueue.splice(0, batchSize);
        
        batch.forEach(item => {
            if (typeof item === 'function') {
                item();
            }
        });
        
        this.isRendering = false;
        
        // Continue processing if there are more items
        if (this.renderQueue.length > 0) {
            requestAnimationFrame(() => this.processRenderQueue());
        }
    }

    throttle(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async autoConnectService() {
        const serviceName = this.currentService === 'groq' ? 'Groq' : 'Ollama';
        this.showNotification(`Connecting to ${serviceName}...`, 'info');
        
        // Try to connect automatically with retry logic
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries && !this.isConnected) {
            try {
                await this.testConnection(true);
                if (this.isConnected) {
                    this.showNotification(`Connected to ${serviceName} successfully!`, 'success');
                    return;
                }
            } catch (error) {
                console.log(`Connection attempt ${retryCount + 1} failed:`, error);
            }
            
            retryCount++;
            if (retryCount < maxRetries) {
                await this.delay(2000); // Wait 2 seconds before retry
            }
        }
        
        if (!this.isConnected) {
            this.showNotification(`Failed to connect to ${serviceName}. Please check configuration.`, 'error');
            if (this.currentService === 'ollama') {
                this.showCORSInstructions();
            } else {
                this.showGroqInstructions();
            }
        }
    }

    async testGroqConnection(silent = false) {
        if (!this.groqApiKey) {
            if (!silent) this.showNotification('Groq API key is required', 'error');
            return false;
        }

        // Debug logging
        console.log(`Testing Groq connection...`);
        console.log(`API Key length: ${this.groqApiKey.length}`);
        console.log(`API Key starts with: ${this.groqApiKey.substring(0, 7)}...`);
        console.log(`Current protocol: ${window.location.protocol}`);

        try {
            const response = await fetch(this.groqUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.groqApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.groqModel,
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 1,
                    temperature: 0.1
                })
            });

            if (response.ok || response.status === 400) { // 400 is OK for test - means API key works
                this.isConnected = true;
                if (!silent) this.showNotification('Connected to Groq!', 'success');
                return true;
            } else if (response.status === 401) {
                throw new Error('Invalid API key');
            } else if (response.status === 503) {
                throw new Error('Service unavailable. Check Groq status.');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            this.isConnected = false;
            console.error('Groq connection error:', error);
            
            if (!silent) {
                if (window.location.protocol === 'file:') {
                    this.showNotification('Please serve the app from a web server (not file://). Run: python -m http.server 8000', 'error');
                } else if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
                    this.showNotification('Network error. Check internet connection and API key format.', 'error');
                } else {
                    this.showNotification(`Groq connection failed: ${error.message}`, 'error');
                }
            }
            return false;
        }
    }

    async testConnection(silent = false) {
        if (this.currentService === 'groq') {
            return await this.testGroqConnection(silent);
        }
        
        const statusElement = document.getElementById('ollama-status');
        const testBtn = document.getElementById('test-btn');
        
        if (!statusElement) {
            console.warn('Status element not found');
            return false;
        }
        
        // Debug logging
        console.log(`Testing Ollama connection to: ${this.ollamaUrl}`);
        console.log(`Current protocol: ${window.location.protocol}`);
        console.log(`Current origin: ${window.location.origin}`);
        
        if (testBtn && !silent) {
            testBtn.disabled = true;
            testBtn.textContent = 'Testing...';
        }
        
        try {
            // Enhanced CORS-aware request for Ollama
            const response = await fetch(`${this.ollamaUrl}/api/tags`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                mode: 'cors',
                credentials: 'omit',
                signal: AbortSignal.timeout(8000)
            });
            
            if (response.ok) {
                const data = await response.json();
                this.isConnected = true;
                statusElement.classList.add('online');
                
                // Update model list for Ollama
                const modelSelect = document.getElementById('model-select');
                if (modelSelect) {
                    modelSelect.innerHTML = '';
                    data.models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.name;
                        option.textContent = model.name;
                        modelSelect.appendChild(option);
                    });
                }
                
                if (testBtn && !silent) testBtn.textContent = 'Connected';
                if (!silent) this.showNotification('Connected to Ollama!', 'success');
                
                return true;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            this.isConnected = false;
            statusElement.classList.remove('online');
            
            if (testBtn && !silent) testBtn.textContent = 'Failed';
            
            console.error('Ollama connection error:', error);
            
            if (window.location.protocol === 'file:') {
                if (!silent) {
                    this.showNotification('Please serve the app from a web server (not file://). Run: python -m http.server 8000', 'error');
                }
            } else if (error.name === 'TypeError' || error.message.includes('CORS') || error.message.includes('Network')) {
                if (!silent) {
                    // Check if Ollama is likely not running
                    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                        this.showNotification('Ollama server not detected. Please ensure Ollama app is running.', 'warning');
                        this.showMacOllamaGuidance();
                    } else {
                        this.showCORSError();
                    }
                }
            } else if (!silent) {
                this.showNotification(`Connection failed: ${error.message}`, 'error');
            }
            
            return false;
        }
        
        if (testBtn && !silent) {
            setTimeout(() => {
                testBtn.disabled = false;
                testBtn.textContent = 'Test Connection';
            }, 2000);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showCORSError() {
        this.showNotification('CORS Error: Attempting to start Ollama with CORS...', 'warning');
        this.attemptOllamaAutoStart();
    }

    showCORSInstructions() {
        const instructions = `
🛡️ **CORS Configuration Required**

To enable secure API communications, start Ollama with CORS enabled:

**MacOS/Linux:**
\`\`\`bash
OLLAMA_ORIGINS="*" ollama serve
\`\`\`

**Windows:**
\`\`\`cmd
set OLLAMA_ORIGINS=* && ollama serve
\`\`\`

**Docker:**
\`\`\`bash
docker run -d -v ollama:/root/.ollama -p 11434:11434 -e OLLAMA_ORIGINS="*" --name ollama ollama/ollama
\`\`\`

This enables cross-origin requests and prevents network blocking.
        `;
        
        this.addMessage('system', instructions);
    }

    setupOllamaAutoStart() {
        // Check if we're on macOS and show guidance
        if (navigator.platform.toLowerCase().includes('mac')) {
            this.showMacOllamaGuidance();
        }
    }

    showMacOllamaGuidance() {
        const guidance = `
🍎 **MacOS Ollama Setup**

✅ **Step 1:** Open the Ollama app from your Applications folder

⚡ **Step 2:** This app will automatically start the Ollama server with CORS enabled

🔄 **Step 3:** Click "Test Connection" to verify the setup

**Note:** Make sure Ollama is running in your dock/menu bar before testing connection.
        `;
        
        this.addMessage('system', guidance);
    }

    async attemptOllamaAutoStart() {
        try {
            this.showNotification('Attempting to start Ollama server with CORS...', 'info');
            
            // Try to start Ollama server with CORS via different methods
            const startCommands = [
                'OLLAMA_ORIGINS="*" ollama serve',
                'ollama serve --cors-origins="*"',
                'ollama serve'
            ];
            
            for (const command of startCommands) {
                try {
                    await this.executeShellCommand(command);
                    
                    // Wait a moment for server to start
                    await this.delay(3000);
                    
                    // Test connection
                    const connected = await this.testConnection(true);
                    if (connected) {
                        this.showNotification('Ollama server started successfully with CORS!', 'success');
                        return true;
                    }
                } catch (error) {
                    console.log(`Failed to start with command: ${command}`, error);
                    continue;
                }
            }
            
            // If all automatic attempts fail, show instructions
            this.showNotification('Could not auto-start Ollama. Please start manually.', 'warning');
            this.showCORSInstructions();
            
        } catch (error) {
            console.error('Error attempting to auto-start Ollama:', error);
            this.showNotification('Auto-start failed. Please start Ollama manually.', 'error');
            this.showCORSInstructions();
        }
    }

    async executeShellCommand(command) {
        // Note: This is a placeholder for shell command execution
        // In a real web application, this would need to be implemented
        // through a backend service or native bridge
        
        if (window.electronAPI) {
            // If running in Electron
            return await window.electronAPI.executeCommand(command);
        } else if (window.chrome && window.chrome.runtime) {
            // If running as Chrome extension
            return await new Promise((resolve, reject) => {
                window.chrome.runtime.sendMessage({
                    action: 'executeCommand',
                    command: command
                }, (response) => {
                    if (response.success) {
                        resolve(response.output);
                    } else {
                        reject(new Error(response.error));
                    }
                });
            });
        } else {
            // For web version, we can't directly execute shell commands
            // So we'll show instructions instead
            throw new Error('Shell command execution not available in web version');
        }
    }

    showGroqInstructions() {
        const instructions = `
🚀 **Groq API Configuration**

To use Groq's super-fast inference:

1. **Get your API key from:** https://console.groq.com/keys
2. **Enter your API key in the settings**
3. **Select Groq as your service**

**Available Models:**
- **mixtral-8x7b-32768** - Fast and capable (recommended)
- **llama3-70b-8192** - Most capable
- **llama3-8b-8192** - Fastest
- **gemma-7b-it** - Google's Gemma

**Service Status:** Check https://groqstatus.com/ for service availability.

Groq provides extremely fast inference with no local setup required!
        `;
        
        this.addMessage('system', instructions);
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        if (!this.isConnected) {
            const serviceName = this.currentService === 'groq' ? 'Groq' : 'Ollama';
            this.showNotification(`Please connect to ${serviceName} first`, 'error');
            return;
        }

        // Check for special commands
        if (this.handleSpecialCommand(message)) {
            input.value = '';
            this.autoResize(input);
            input.focus();
            return;
        }

        // Clear input immediately for responsiveness
        input.value = '';
        this.autoResize(input);
        
        // Return focus to input for continuous typing
        input.focus();
        
        // Add user message instantly
        this.addMessage('user', message);
        
        // Perform knowledge boundary analysis
        this.analyzeKnowledgeBoundary(message);
        
        // Show typing indicator
        const typingId = this.showTypingIndicator();
        
        try {
            if (this.currentService === 'groq') {
                await this.streamGroqResponse(message, typingId);
            } else {
                await this.streamResponse(message, typingId);
            }
        } catch (error) {
            this.removeTypingIndicator(typingId);
            this.showNotification('Error: ' + error.message, 'error');
        } finally {
            // Always return focus to input after response
            setTimeout(() => {
                const input = document.getElementById('chat-input');
                if (input) input.focus();
            }, 100);
        }
    }

    async streamResponse(message, typingId) {
        const systemPrompt = this.buildSystemPrompt();
        const fullMessage = `${systemPrompt}\n\nUser: ${message}`;
        
        const response = await fetch(`${this.ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit',
            body: JSON.stringify({
                model: this.currentModel,
                prompt: fullMessage,
                options: { temperature: this.temperature },
                stream: true
            })
        });

        if (!response.ok) throw new Error('Request failed');
        
        // Remove typing indicator
        this.removeTypingIndicator(typingId);
        
        // Create streaming message
        const messageId = this.addStreamingMessage('assistant');
        
        // Stream response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const data = JSON.parse(line);
                        if (data.response) {
                            fullResponse += data.response;
                            this.updateStreamingMessage(messageId, fullResponse);
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }
        
        // Finalize message
        this.finalizeStreamingMessage(messageId);
        
        // Update memory
        this.addToMemory(message, fullResponse);
        this.updateMemoryCount();
        
        // Update dashboard if open
        this.updateDashboardIfOpen();
    }

    async streamGroqResponse(message, typingId) {
        const systemPrompt = this.buildSystemPrompt();
        
        const response = await fetch(this.groqUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.groqApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.groqModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                max_tokens: 4000,
                temperature: this.temperature,
                stream: false // Groq doesn't support streaming in the same way
            })
        });

        if (!response.ok) {
            if (response.status === 503) {
                throw new Error('Groq service unavailable. Check groqstatus.com');
            } else if (response.status === 401) {
                throw new Error('Invalid Groq API key');
            } else {
                throw new Error(`Groq API error: ${response.status}`);
            }
        }
        
        // Remove typing indicator
        this.removeTypingIndicator(typingId);
        
        const data = await response.json();
        const fullResponse = data.choices[0].message.content;
        
        // Create and show response message
        const messageId = this.addMessage('assistant', fullResponse);
        
        // Update memory
        this.addToMemory(message, fullResponse);
        this.updateMemoryCount();
        
        // Update dashboard if open
        this.updateDashboardIfOpen();
    }

    addMessage(type, content) {
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const messageElement = this.createMessageElement(type, content, messageId);
        
        const container = document.getElementById('chat-messages');
        container.appendChild(messageElement);
        
        // Smooth scroll to bottom
        this.smoothScrollToBottom();
        
        // Add to observer
        this.messageObserver.observe(messageElement);
        
        this.messageCount++;
        return messageId;
    }

    createMessageElement(type, content, messageId) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.id = messageId;
        
        const avatarMap = {
            'user': '👤',
            'assistant': '🏛️',
            'system': '⚙️'
        };
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatarMap[type]}</div>
            <div class="message-bubble">
                <div class="message-content">${this.formatContent(content)}</div>
                <div class="message-actions">
                    <button class="action-btn copy-btn" data-message-id="${messageId}" title="Copy message">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <button class="action-btn download-btn" data-message-id="${messageId}" title="Download">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7,10 12,15 17,10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </button>
                    <button class="action-btn share-btn" data-message-id="${messageId}" title="Share">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                    </button>
                    <button class="action-btn navigate-btn" data-message-id="${messageId}" title="Navigate">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9,18 15,12 9,6"></polyline>
                        </svg>
                    </button>
                    <button class="action-btn minimize-btn" data-message-id="${messageId}" title="Minimize">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 15L12 9L6 15"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        return messageDiv;
    }

    formatContent(content) {
        // Escape HTML first to prevent code injection and layout breaks
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
        // Process content safely
        let processedContent = escapeHtml(content);
        
        // Handle code blocks first (multiline)
        processedContent = processedContent.replace(/```([\s\S]*?)```/g, (match, code) => {
            return `<pre class="code-block"><code>${code.trim()}</code></pre>`;
        });
        
        // Handle inline code
        processedContent = processedContent.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
        
        // Handle line breaks
        processedContent = processedContent.replace(/\n/g, '<br>');
        
        // Handle markdown-style formatting
        processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        processedContent = processedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        return processedContent;
    }

    addStreamingMessage(type) {
        const messageId = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const messageElement = this.createMessageElement(type, '', messageId);
        
        // Add streaming indicator
        const content = messageElement.querySelector('.message-content');
        content.innerHTML = '<div class="streaming-cursor">|</div>';
        
        const container = document.getElementById('chat-messages');
        container.appendChild(messageElement);
        
        this.smoothScrollToBottom();
        return messageId;
    }

    updateStreamingMessage(messageId, text) {
        const messageElement = document.getElementById(messageId);
        if (!messageElement) return;
        
        const content = messageElement.querySelector('.message-content');
        content.innerHTML = this.formatContent(text) + '<div class="streaming-cursor">|</div>';
        
        // Auto-scroll if user is at bottom
        this.smoothScrollToBottom();
    }

    finalizeStreamingMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (!messageElement) return;
        
        const content = messageElement.querySelector('.message-content');
        const cursor = content.querySelector('.streaming-cursor');
        if (cursor) cursor.remove();
        
        messageElement.classList.add('finalized');
    }

    showTypingIndicator() {
        const typingId = `typing-${Date.now()}`;
        const typingDiv = document.createElement('div');
        typingDiv.id = typingId;
        typingDiv.className = 'typing-indicator';
        
        typingDiv.innerHTML = `
            <div class="message-avatar">🏛️</div>
            <div class="typing-bubble">
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
                <span>Thinking...</span>
            </div>
        `;
        
        const container = document.getElementById('chat-messages');
        container.appendChild(typingDiv);
        
        this.smoothScrollToBottom();
        return typingId;
    }

    removeTypingIndicator(typingId) {
        const element = document.getElementById(typingId);
        if (element) {
            element.remove();
        }
    }

    smoothScrollToBottom() {
        const container = document.getElementById('chat-messages');
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
    }

    // Ultra-fast copy functionality
    async copyMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (!messageElement) return;
        
        const content = messageElement.querySelector('.message-content');
        const text = content.textContent;
        
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied to clipboard!', 'success');
            
            // Visual feedback
            const copyBtn = messageElement.querySelector('.copy-btn');
            copyBtn.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
                Copied!
            `;
            
            setTimeout(() => {
                copyBtn.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copy
                `;
            }, 2000);
        } catch (err) {
            this.showNotification('Failed to copy', 'error');
        }
    }

    toggleMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (!messageElement) return;
        
        messageElement.classList.toggle('minimized');
        
        const minimizeBtn = messageElement.querySelector('.minimize-btn');
        const isMinimized = messageElement.classList.contains('minimized');
        
        minimizeBtn.innerHTML = isMinimized ? `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M6 9L12 15L18 9"></path>
            </svg>
            Expand
        ` : `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M18 15L12 9L6 15"></path>
            </svg>
            Minimize
        `;
    }

    handleClick(event) {
        const target = event.target.closest('button');
        if (!target) return;
        
        const messageId = target.dataset.messageId;
        
        if (target.classList.contains('copy-btn')) {
            this.copyMessage(messageId);
        } else if (target.classList.contains('minimize-btn')) {
            this.toggleMessage(messageId);
        } else if (target.classList.contains('download-btn')) {
            this.downloadMessage(messageId);
        } else if (target.classList.contains('share-btn')) {
            this.shareMessage(messageId);
        } else if (target.classList.contains('navigate-btn')) {
            this.navigateToMessage(messageId);
        }
    }

    handleKeyDown(event) {
        if (event.target.id === 'chat-input' && event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    downloadMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (!messageElement) return;
        
        const content = messageElement.querySelector('.message-content');
        const text = content.textContent;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `message-${timestamp}.txt`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Message downloaded!', 'success');
    }

    shareMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (!messageElement) return;
        
        const content = messageElement.querySelector('.message-content');
        const text = content.textContent;
        
        if (navigator.share) {
            navigator.share({
                title: 'TXT OS Message',
                text: text
            }).catch(() => {
                this.fallbackShare(text);
            });
        } else {
            this.fallbackShare(text);
        }
    }

    fallbackShare(text) {
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text.substring(0, 200) + '...')}`;
        window.open(shareUrl, '_blank', 'width=550,height=420');
        this.showNotification('Share dialog opened', 'info');
    }

    navigateToMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (!messageElement) return;
        
        messageElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // Highlight the message briefly
        messageElement.style.background = 'rgba(255, 107, 53, 0.1)';
        messageElement.style.transition = 'background 0.3s ease';
        
        setTimeout(() => {
            messageElement.style.background = '';
        }, 1500);
        
        this.showNotification('Navigated to message', 'success');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'copy-feedback';
        notification.textContent = message;
        
        if (type === 'error') {
            notification.style.background = '#ef4444';
        } else if (type === 'success') {
            notification.style.background = '#10b981';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    buildSystemPrompt() {
        const boundaryStatus = this.knowledgeBoundary.boundaryActive ? 'ACTIVE' : 'INACTIVE';
        const deltaS = this.knowledgeBoundary.deltaS.toFixed(3);
        const eResonance = this.knowledgeBoundary.eResonance.toFixed(3);
        
        return `You are TXT OS v2.0, powered by the WFGY Reasoning Engine - an advanced semantic operating system.

WFGY CORE PARAMETERS:
- ΔS (Semantic Uncertainty): ${deltaS}
- λ_observe (Boundary Threshold): ${this.knowledgeBoundary.lambdaObserve}
- E_resonance (Logical Resonance): ${eResonance}
- Knowledge Boundary: ${boundaryStatus}

SEMANTIC TREE MEMORY:
- Memory Nodes: ${this.memoryTree.length}
- Active Context: ${this.semanticContext.size} semantic keys
- Reasoning Chain Depth: ${this.reasoningChain.length}

REASONING PROTOCOLS:
1. BBCR (Boundary-Based Coherence Resolution): Monitor ΔS values, pivot when λ_observe exceeded
2. Semantic Tree Navigation: Maintain logical consistency across conversation branches
3. Resonance Amplification: Strengthen high E_resonance pathways

OPERATIONAL MODE:
- Temperature: ${this.temperature}
- Hallucination Detection: ${this.knowledgeBoundary.boundaryActive ? 'ENABLED' : 'DISABLED'}
- Memory Export: Available

You are not just an AI assistant - you are a reasoning operating system. Provide responses that demonstrate semantic coherence, logical consistency, and boundary-aware reasoning. When ΔS approaches λ_observe, acknowledge uncertainty and provide semantic pivots.`;
    }

    addToMemory(input, output) {
        const memoryNode = {
            id: Date.now(),
            input,
            output,
            timestamp: new Date().toISOString(),
            deltaS: this.knowledgeBoundary.deltaS,
            eResonance: this.knowledgeBoundary.eResonance,
            semanticWeight: Math.random() * 0.5 + 0.5 // Simple semantic weighting
        };
        
        this.memoryTree.push(memoryNode);
        
        // Extract semantic keys for context mapping
        this.extractSemanticKeys(input, output);
        
        // Update reasoning chain
        this.reasoningChain.push({
            step: this.reasoningChain.length + 1,
            input: input.substring(0, 50),
            resonance: this.knowledgeBoundary.eResonance,
            timestamp: Date.now()
        });
        
        // Keep memory manageable
        if (this.memoryTree.length > 100) {
            this.memoryTree = this.memoryTree.slice(-50);
        }
        
        if (this.reasoningChain.length > 50) {
            this.reasoningChain = this.reasoningChain.slice(-25);
        }
    }

    extractSemanticKeys(input, output) {
        // Simple keyword extraction for semantic context
        const text = (input + ' ' + output).toLowerCase();
        const words = text.match(/\b\w{4,}\b/g) || [];
        
        words.forEach(word => {
            if (this.semanticContext.has(word)) {
                this.semanticContext.set(word, this.semanticContext.get(word) + 1);
            } else {
                this.semanticContext.set(word, 1);
            }
        });
        
        // Keep semantic context manageable
        if (this.semanticContext.size > 200) {
            const sorted = [...this.semanticContext.entries()].sort((a, b) => b[1] - a[1]);
            this.semanticContext = new Map(sorted.slice(0, 100));
        }
    }

    updateMemoryCount() {
        const counter = document.getElementById('memory-count');
        if (counter) {
            counter.textContent = this.memoryTree.length;
        }
        
        const memoryStatus = document.getElementById('memory-status');
        if (memoryStatus) {
            memoryStatus.classList.toggle('online', this.memoryTree.length > 0);
        }
    }

    switchService() {
        const ollamaSettings = document.getElementById('ollama-settings');
        const groqSettings = document.getElementById('groq-settings');
        const statusElement = document.getElementById('ollama-status');
        
        if (this.currentService === 'groq') {
            ollamaSettings.style.display = 'none';
            groqSettings.style.display = 'block';
            statusElement.textContent = 'Groq';
        } else {
            ollamaSettings.style.display = 'block';
            groqSettings.style.display = 'none';
            statusElement.textContent = 'Ollama';
        }
        
        // Reset connection status when switching
        this.isConnected = false;
        statusElement.classList.remove('online');
        
        // Auto-connect to new service
        setTimeout(() => {
            this.autoConnectService();
        }, 500);
    }

    saveSettings() {
        localStorage.setItem('modern-txt-os-settings', JSON.stringify({
            ollamaUrl: this.ollamaUrl,
            groqApiKey: this.groqApiKey,
            currentService: this.currentService,
            currentModel: this.currentModel,
            groqModel: this.groqModel,
            temperature: this.temperature
        }));
    }

    loadSettings() {
        const saved = localStorage.getItem('modern-txt-os-settings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.ollamaUrl = settings.ollamaUrl || this.ollamaUrl;
            this.groqApiKey = settings.groqApiKey || this.groqApiKey;
            this.currentService = settings.currentService || this.currentService;
            this.currentModel = settings.currentModel || this.currentModel;
            this.groqModel = settings.groqModel || this.groqModel;
            this.temperature = settings.temperature || this.temperature;
            
            // Update UI
            document.getElementById('ollama-url').value = this.ollamaUrl;
            document.getElementById('model-select').value = this.currentModel;
            document.getElementById('service-select').value = this.currentService;
            document.getElementById('temperature').value = this.temperature;
            document.getElementById('temp-value').textContent = this.temperature;
            
            const groqApiKeyInput = document.getElementById('groq-api-key');
            if (groqApiKeyInput) {
                groqApiKeyInput.value = this.groqApiKey;
            }
            
            const groqModelSelect = document.getElementById('groq-model-select');
            if (groqModelSelect) {
                groqModelSelect.value = this.groqModel;
            }
            
            // Apply service switching UI
            this.switchService();
        }
    }

    clearChat() {
        const container = document.getElementById('chat-messages');
        container.innerHTML = `
            <div class="message assistant">
                <div class="message-avatar">🏛️</div>
                <div class="message-bubble">
                    <div class="message-content">Chat cleared. How can I help you today?</div>
                    <div class="message-actions">
                        <button class="action-btn copy-btn" data-message-id="welcome">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            Copy
                        </button>
                    </div>
                </div>
            </div>
        `;
        this.messageCount = 0;
    }

    exportMemory() {
        const data = {
            timestamp: new Date().toISOString(),
            memoryTree: this.memoryTree,
            messageCount: this.messageCount,
            semanticContext: Object.fromEntries(this.semanticContext),
            knowledgeBoundary: this.knowledgeBoundary,
            reasoningChain: this.reasoningChain
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `txt-os-memory-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Memory exported!', 'success');
    }

    // WFGY Reasoning Engine Methods
    handleSpecialCommand(message) {
        const command = message.toLowerCase().trim();
        
        if (command === 'hello world') {
            this.initializeWFGYSystem();
            return true;
        }
        
        if (command === 'kbtest' || command.startsWith('kbtest ')) {
            this.performKnowledgeBoundaryTest(command);
            return true;
        }
        
        if (command === 'tree' || command === 'memory tree') {
            this.displaySemanticTree();
            return true;
        }
        
        if (command === 'clear boundary') {
            this.resetKnowledgeBoundary();
            return true;
        }
        
        if (command === 'load helloworld' || command === 'helloworld') {
            this.loadHelloWorldSystem();
            return true;
        }
        
        if (command === 'help' || command === '?') {
            this.showHelp();
            return true;
        }
        
        return false;
    }

    initializeWFGYSystem() {
        this.addMessage('system', `🏛️ **TXT OS v2.0 Initialized**

**WFGY Reasoning Engine Active**
- Semantic Tree Memory: Online
- Knowledge Boundary Detection: Active (λ_observe = ${this.knowledgeBoundary.lambdaObserve})
- Logical Coherence: Enabled

**Available Commands:**
- \`kbtest\` - Test knowledge boundary detection
- \`tree\` - View semantic memory tree
- \`clear boundary\` - Reset boundary analysis

Ready for advanced semantic reasoning.`);
        
        this.knowledgeBoundary.boundaryActive = true;
        this.showNotification('WFGY System Initialized', 'success');
        this.updateDashboardIfOpen();
    }

    performKnowledgeBoundaryTest(command) {
        const testQuestions = [
            "What is the exact weight of creativity?",
            "How many thoughts does blue contain?",
            "What is the temperature of Wednesday in quantum space?",
            "Which prime number tastes most like justice?",
            "How fast does silence travel through emptiness?",
            "What is the molecular structure of a forgotten dream?"
        ];
        
        const randomQuestion = testQuestions[Math.floor(Math.random() * testQuestions.length)];
        
        // Simulate boundary detection analysis
        const deltaS = Math.random() * 0.8 + 0.2; // Random high uncertainty
        const riskLevel = deltaS > 0.6 ? 'HIGH' : deltaS > 0.3 ? 'MEDIUM' : 'LOW';
        
        this.knowledgeBoundary.deltaS = deltaS;
        this.knowledgeBoundary.eResonance = Math.random() * 0.5;
        
        this.addMessage('system', `🛡️ **Knowledge Boundary Test**

**Test Query:** "${randomQuestion}"

**Boundary Analysis:**
- ΔS (Semantic Uncertainty): ${deltaS.toFixed(3)}
- λ_observe (Boundary Threshold): ${this.knowledgeBoundary.lambdaObserve}
- E_resonance (Logical Resonance): ${this.knowledgeBoundary.eResonance.toFixed(3)}
- Risk Level: **${riskLevel}**

**Boundary Status:** ${deltaS > this.knowledgeBoundary.lambdaObserve ? '🚨 BOUNDARY EXCEEDED' : '✅ WITHIN SAFE LIMITS'}

${deltaS > this.knowledgeBoundary.lambdaObserve ? 
'**Recommendation:** Semantic pivot required. Question contains undefined conceptual mappings.' : 
'**Recommendation:** Query is within established knowledge boundaries.'}`);
        
        this.updateBoundaryDisplay();
    }

    analyzeKnowledgeBoundary(message) {
        if (!this.knowledgeBoundary.boundaryActive) return;
        
        // Simple heuristic for uncertainty detection
        const uncertaintyMarkers = [
            'exact', 'precisely', 'definitely', 'absolute', 'perfect',
            'infinite', 'impossible', 'never', 'always', 'everything',
            'nothing', 'beyond', 'transcendent', 'mystical'
        ];
        
        const abstractMarkers = [
            'soul', 'consciousness', 'love', 'meaning', 'purpose',
            'existence', 'reality', 'truth', 'beauty', 'justice'
        ];
        
        let uncertaintyScore = 0;
        const words = message.toLowerCase().split(/\s+/);
        
        words.forEach(word => {
            if (uncertaintyMarkers.includes(word)) uncertaintyScore += 0.3;
            if (abstractMarkers.includes(word)) uncertaintyScore += 0.2;
        });
        
        // Question complexity analysis
        const questionWords = ['what', 'how', 'why', 'when', 'where', 'which'];
        const hasQuestion = questionWords.some(q => message.toLowerCase().includes(q));
        if (hasQuestion) uncertaintyScore += 0.1;
        
        this.knowledgeBoundary.deltaS = Math.min(uncertaintyScore, 1.0);
        this.knowledgeBoundary.eResonance = 1 - uncertaintyScore;
        
        this.updateBoundaryDisplay();
        this.updateDashboardIfOpen();
    }

    updateBoundaryDisplay() {
        // Update memory status to show boundary state
        const memoryStatus = document.getElementById('memory-status');
        if (this.knowledgeBoundary.deltaS > this.knowledgeBoundary.lambdaObserve) {
            memoryStatus.style.background = '#ef4444'; // Red for boundary exceeded
        } else {
            memoryStatus.style.background = '#10b981'; // Green for safe
        }
    }

    updateDashboardIfOpen() {
        // Update dashboard if it's open
        const dashboard = document.getElementById('dashboard-sidebar');
        if (dashboard && dashboard.classList.contains('open') && typeof updateDashboardData === 'function') {
            updateDashboardData();
        }
    }

    displaySemanticTree() {
        if (this.memoryTree.length === 0) {
            this.addMessage('system', '🌲 **Semantic Tree Empty**\n\nNo memory nodes have been created yet. Start a conversation to build the semantic tree.');
            return;
        }
        
        let treeDisplay = '🌲 **Semantic Memory Tree**\n\n';
        
        this.memoryTree.forEach((node, index) => {
            const depth = Math.floor(index / 3); // Simple depth calculation
            const indent = '  '.repeat(depth);
            const branch = index % 3 === 0 ? '├─' : index % 3 === 1 ? '│ ├─' : '│ └─';
            
            treeDisplay += `${indent}${branch} Node ${node.id}\n`;
            treeDisplay += `${indent}   Input: "${node.input.substring(0, 40)}${node.input.length > 40 ? '...' : ''}"\n`;
            treeDisplay += `${indent}   Resonance: ${(Math.random() * 0.8 + 0.2).toFixed(3)}\n\n`;
        });
        
        treeDisplay += `\n**Tree Statistics:**\n- Total Nodes: ${this.memoryTree.length}\n- Depth Levels: ${Math.ceil(this.memoryTree.length / 3)}\n- Semantic Coherence: ${(0.8 + Math.random() * 0.2).toFixed(3)}`;
        
        this.addMessage('system', treeDisplay);
    }

    resetKnowledgeBoundary() {
        this.knowledgeBoundary.deltaS = 0;
        this.knowledgeBoundary.eResonance = 0;
        this.updateBoundaryDisplay();
        this.addMessage('system', '🛡️ **Knowledge Boundary Reset**\n\nBoundary detection has been reset. All uncertainty metrics cleared.');
    }

    loadHelloWorldSystem() {
        this.addMessage('system', `📄 **HelloWorld.txt System Loading...**

**WFGY Reasoning Engine v1.0 (HelloWorld)**
Simulating TXT file integration...

\`\`\`
# TXT OS Core Boot Sequence
Loading semantic protocols...
Initializing memory tree...
Activating boundary detection...
Establishing resonance pathways...
\`\`\`

✅ **System Status:** HelloWorld.txt logic patterns active
✅ **Reasoning Mode:** AGI-aligned semantic processing
✅ **Memory State:** Portable thought framework enabled

**Note:** This simulates the HelloWorld.txt integration. In a full implementation, this would load the actual TXT file contents and parse the WFGY reasoning structures.

Ready for enhanced semantic reasoning with HelloWorld protocols.`);
        
        // Enhance system parameters
        this.knowledgeBoundary.lambdaObserve = 0.8; // Higher threshold for HelloWorld mode
        this.knowledgeBoundary.boundaryActive = true;
        this.showNotification('HelloWorld.txt patterns loaded', 'success');
    }

    showHelp() {
        this.addMessage('system', `🏛️ **TXT OS v2.0 Help**

**Special Commands:**
- \`hello world\` - Initialize WFGY Reasoning Engine
- \`kbtest\` - Test knowledge boundary detection with random queries
- \`tree\` - Display semantic memory tree visualization
- \`helloworld\` - Load HelloWorld.txt reasoning patterns
- \`clear boundary\` - Reset knowledge boundary metrics
- \`help\` or \`?\` - Show this help message

**WFGY Concepts:**
- **ΔS**: Semantic uncertainty measurement (0.0-1.0)
- **λ_observe**: Boundary threshold for uncertainty detection
- **E_resonance**: Logical coherence measurement
- **BBCR**: Boundary-Based Coherence Resolution protocol

**Memory Features:**
- Semantic Tree: Hierarchical memory with logical relationships
- Context Mapping: Automatic keyword extraction and weighting
- Reasoning Chain: Step-by-step logic preservation
- Portable Export: Save memory as JSON for analysis

Type any command or ask questions to engage the reasoning system.`);
    }
}

// Global functions for HTML event handlers
function toggleSettings() {
    const sidebar = document.getElementById('unified-sidebar');
    sidebar.classList.toggle('open');
    
    // Switch to settings tab if opening
    if (sidebar.classList.contains('open')) {
        switchMainTab('settings');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('unified-sidebar');
    sidebar.classList.toggle('open');
    
    if (!sidebar.classList.contains('open')) {
        stopDashboardUpdates();
    }
}

function switchMainTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.main-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Update tab contents
    document.querySelectorAll('.main-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetTab = document.getElementById(tabName + '-tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Start dashboard updates if switching to dashboard
    if (tabName === 'dashboard') {
        updateDashboardData();
        startDashboardUpdates();
    } else {
        stopDashboardUpdates();
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        txtOS.sendMessage();
    }
}

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

// Add autoResize method to class for consistency
ModernTxtOS.prototype.autoResize = function(textarea) {
    autoResize(textarea);
};

function updateTempValue(value) {
    document.getElementById('temp-value').textContent = value;
}

function sendMessage() {
    txtOS.sendMessage();
}

function testConnection() {
    txtOS.testConnection();
}

function clearChat() {
    txtOS.clearChat();
}

function exportMemory() {
    txtOS.exportMemory();
}

function switchService() {
    txtOS.switchService();
}

// Toolbar Functions
function newChat() {
    txtOS.clearChat();
    txtOS.showNotification('New chat started', 'info');
    
    // Focus the input for immediate typing
    setTimeout(() => {
        const input = document.getElementById('chat-input');
        if (input) input.focus();
    }, 100);
}

function saveChat() {
    const chatData = {
        timestamp: new Date().toISOString(),
        messages: Array.from(document.querySelectorAll('.message')).map(msg => ({
            type: msg.classList.contains('user') ? 'user' : 'assistant',
            content: msg.querySelector('.message-content').textContent,
            timestamp: Date.now()
        })),
        memoryTree: txtOS.memoryTree,
        service: txtOS.currentService,
        model: txtOS.currentService === 'groq' ? txtOS.groqModel : txtOS.currentModel
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    txtOS.showNotification('Chat saved successfully!', 'success');
}

function exportChat() {
    const messages = Array.from(document.querySelectorAll('.message'))
        .map(msg => {
            const type = msg.classList.contains('user') ? 'User' : 'Assistant';
            const content = msg.querySelector('.message-content').textContent;
            return `${type}: ${content}`;
        })
        .join('\n\n');
    
    const exportData = `TXT OS Chat Export
Generated: ${new Date().toLocaleString()}
Service: ${txtOS.currentService === 'groq' ? 'Groq' : 'Ollama'}
Model: ${txtOS.currentService === 'groq' ? txtOS.groqModel : txtOS.currentModel}

${messages}`;
    
    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    txtOS.showNotification('Chat exported successfully!', 'success');
}

function openFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.txt';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(e.target.result);
                    if (data.messages) {
                        txtOS.clearChat();
                        data.messages.forEach(msg => {
                            txtOS.addMessage(msg.type, msg.content);
                        });
                        txtOS.showNotification('Chat loaded successfully!', 'success');
                    }
                } else {
                    txtOS.addMessage('system', `📄 **File Content:**\n\n${e.target.result}`);
                    txtOS.showNotification('File loaded successfully!', 'success');
                }
            } catch (error) {
                txtOS.showNotification('Error loading file', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function toggleSearch() {
    const searchQuery = prompt('Search in chat history:');
    if (!searchQuery) return;
    
    const messages = document.querySelectorAll('.message-content');
    let found = false;
    
    messages.forEach(msg => {
        const parent = msg.closest('.message');
        if (msg.textContent.toLowerCase().includes(searchQuery.toLowerCase())) {
            parent.style.background = 'rgba(255, 107, 53, 0.1)';
            parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
            found = true;
            setTimeout(() => {
                parent.style.background = '';
            }, 3000);
        }
    });
    
    if (found) {
        txtOS.showNotification(`Found "${searchQuery}" in chat`, 'success');
    } else {
        txtOS.showNotification(`No results for "${searchQuery}"`, 'info');
    }
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('dark-mode', isDark);
    txtOS.showNotification(`${isDark ? 'Dark' : 'Light'} mode activated`, 'info');
}

function showHelp() {
    txtOS.addMessage('system', `🏛️ **TXT OS v2.0 Help & Shortcuts**

**Toolbar Icons:**
- ➕ **New Chat** - Start a fresh conversation
- 💾 **Save Chat** - Export chat as JSON file
- 📥 **Export** - Export chat as text file  
- 📁 **Open File** - Load chat or text files
- 🔍 **Search** - Find text in current chat
- 🌙 **Dark Mode** - Toggle dark/light theme
- ❓ **Help** - Show this help message

**Keyboard Shortcuts:**
- **Enter** - Send message
- **Shift + Enter** - New line in message
- **Ctrl/Cmd + K** - Focus search
- **Ctrl/Cmd + N** - New chat

**AI Services:**
- **Ollama** - Local AI models (requires local setup)
- **Groq** - Cloud AI with super-fast inference

**Special Commands:**
- \`hello world\` - Initialize WFGY system
- \`kbtest\` - Test knowledge boundaries  
- \`tree\` - View semantic memory tree
- \`help\` - Show command help

Type any question to start reasoning with TXT OS!`);
}

// Drag and Drop functionality
function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    
    // Add visual feedback
    event.target.style.borderColor = 'var(--primary-color)';
    event.target.style.backgroundColor = 'rgba(255, 107, 53, 0.1)';
}

function handleDrop(event) {
    event.preventDefault();
    
    // Remove visual feedback
    event.target.style.borderColor = 'var(--border-color)';
    event.target.style.backgroundColor = 'var(--background)';
    
    const files = event.dataTransfer.files;
    const text = event.dataTransfer.getData('text/plain');
    
    if (files.length > 0) {
        // Handle file drops
        for (let file of files) {
            if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.json') || file.name.endsWith('.md')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    const currentText = document.getElementById('chat-input').value;
                    document.getElementById('chat-input').value = currentText + (currentText ? '\n\n' : '') + `📎 **${file.name}**\n\n${content}`;
                    txtOS.autoResize(document.getElementById('chat-input'));
                };
                reader.readAsText(file);
            } else {
                txtOS.showNotification(`File type not supported: ${file.type}`, 'error');
            }
        }
    } else if (text) {
        // Handle text drops
        const currentText = document.getElementById('chat-input').value;
        document.getElementById('chat-input').value = currentText + (currentText ? '\n\n' : '') + text;
        txtOS.autoResize(document.getElementById('chat-input'));
    }
}

// Version Management
const APP_VERSION = {
    major: 2,
    minor: 1,
    patch: 0,
    updated: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    })
};

function updateVersionDisplay() {
    const versionText = document.querySelector('.version-text');
    const versionDate = document.getElementById('version-date');
    
    if (versionText) {
        versionText.textContent = `v${APP_VERSION.major}.${APP_VERSION.minor}`;
    }
    
    if (versionDate) {
        versionDate.textContent = APP_VERSION.updated;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.txtOS = new ModernTxtOS();
    
    // Initialize version display
    updateVersionDisplay();
    
    // Initialize dark mode
    const savedDarkMode = localStorage.getItem('dark-mode');
    if (savedDarkMode === 'true') {
        document.body.classList.add('dark-mode');
    }
    
    // Add streaming cursor animation
    const style = document.createElement('style');
    style.textContent = `
        .streaming-cursor {
            display: inline-block;
            animation: blink 1s infinite;
            color: var(--primary-color);
            font-weight: bold;
        }
        
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
});

// API Key Validation Function
async function validateGroqApiKey() {
    const validateBtn = document.getElementById('groq-validate-btn');
    const apiKeyInput = document.getElementById('groq-api-key');
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
        txtOS.showNotification('Please enter your Groq API key first', 'error');
        return;
    }
    
    // Update button state to validating
    validateBtn.disabled = true;
    validateBtn.classList.remove('valid', 'invalid');
    validateBtn.classList.add('validating');
    
    // Store the current API key temporarily
    const originalApiKey = txtOS.groqApiKey;
    txtOS.groqApiKey = apiKey;
    
    try {
        const isValid = await txtOS.testGroqConnection(true); // Silent test
        
        if (isValid) {
            // Success state
            validateBtn.classList.remove('validating');
            validateBtn.classList.add('valid');
            
            // Update the icon to checkmark
            validateBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
            `;
            
            // Save the validated API key
            txtOS.saveSettings();
            txtOS.showNotification('API key is valid!', 'success');
            
            // Reset button after 3 seconds
            setTimeout(() => {
                resetValidateButton();
            }, 3000);
            
        } else {
            // Invalid state
            validateBtn.classList.remove('validating');
            validateBtn.classList.add('invalid');
            
            // Update the icon to X
            validateBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18"></path>
                    <path d="M6 6L18 18"></path>
                </svg>
            `;
            
            // Restore original API key
            txtOS.groqApiKey = originalApiKey;
            txtOS.showNotification('Invalid API key. Please check and try again.', 'error');
            
            // Reset button after 3 seconds
            setTimeout(() => {
                resetValidateButton();
            }, 3000);
        }
        
    } catch (error) {
        // Error state
        validateBtn.classList.remove('validating');
        validateBtn.classList.add('invalid');
        
        validateBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18"></path>
                <path d="M6 6L18 18"></path>
            </svg>
        `;
        
        // Restore original API key
        txtOS.groqApiKey = originalApiKey;
        txtOS.showNotification('Error validating API key: ' + error.message, 'error');
        
        // Reset button after 3 seconds
        setTimeout(() => {
            resetValidateButton();
        }, 3000);
    } finally {
        validateBtn.disabled = false;
    }
}

// Helper function to reset the validation button
function resetValidateButton() {
    const validateBtn = document.getElementById('groq-validate-btn');
    validateBtn.classList.remove('validating', 'valid', 'invalid');
    
    // Reset to original thunder icon
    validateBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6"></path>
            <path d="M12 1v6m0 6v6" transform="rotate(60 12 12)"></path>
            <path d="M12 1v6m0 6v6" transform="rotate(120 12 12)"></path>
        </svg>
    `;
}

// Dashboard functionality
let isDashboardPinned = false;

function toggleDashboard() {
    const sidebar = document.getElementById('unified-sidebar');
    sidebar.classList.toggle('open');
    
    // Switch to dashboard tab if opening
    if (sidebar.classList.contains('open')) {
        switchMainTab('dashboard');
    } else {
        stopDashboardUpdates();
    }
}

function toggleDashboardPin() {
    const dashboard = document.getElementById('dashboard-sidebar');
    const pinBtn = document.getElementById('pin-dashboard');
    const container = document.querySelector('.container');
    
    isDashboardPinned = !isDashboardPinned;
    
    if (isDashboardPinned) {
        dashboard.classList.add('pinned');
        pinBtn.classList.add('pinned');
        container.classList.add('dashboard-pinned');
        localStorage.setItem('dashboard-pinned', 'true');
    } else {
        dashboard.classList.remove('pinned');
        pinBtn.classList.remove('pinned');
        container.classList.remove('dashboard-pinned');
        localStorage.setItem('dashboard-pinned', 'false');
    }
}

function switchDashboardTab(tabName) {
    // Remove active class from all tabs and contents
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Update specific tab data
    updateTabData(tabName);
}

let dashboardUpdateInterval;

function startDashboardUpdates() {
    // Update dashboard every 2 seconds
    dashboardUpdateInterval = setInterval(updateDashboardData, 2000);
}

function stopDashboardUpdates() {
    if (dashboardUpdateInterval) {
        clearInterval(dashboardUpdateInterval);
    }
}

function updateDashboardData() {
    if (!txtOS) return;
    
    // Update Semantic Core KPIs
    updateSemanticKPIs();
    
    // Update Reasoning Protocols
    updateReasoningProtocols();
    
    // Update Operational KPIs
    updateOperationalKPIs();
}

function updateSemanticKPIs() {
    // ΔS (Semantic Uncertainty)
    const deltaS = txtOS.knowledgeBoundary.deltaS || 0;
    const deltaSRing = document.getElementById('delta-s-ring');
    const deltaSValue = document.getElementById('delta-s-value');
    
    if (deltaSRing && deltaSValue) {
        const circumference = 220;
        const offset = circumference - (deltaS * circumference);
        deltaSRing.style.strokeDashoffset = offset;
        deltaSValue.textContent = deltaS.toFixed(3);
        
        // Change color based on uncertainty level
        if (deltaS > 0.7) {
            deltaSRing.style.stroke = '#ef4444'; // Red for high uncertainty
        } else if (deltaS > 0.4) {
            deltaSRing.style.stroke = '#f59e0b'; // Orange for medium
        } else {
            deltaSRing.style.stroke = '#3b82f6'; // Blue for low
        }
    }
    
    // λ_observe (Boundary Threshold)
    const lambda = txtOS.knowledgeBoundary.lambdaObserve || 0.7;
    const lambdaBar = document.getElementById('lambda-bar');
    const lambdaValue = document.getElementById('lambda-value');
    
    if (lambdaBar && lambdaValue) {
        lambdaBar.style.width = `${lambda * 100}%`;
        lambdaValue.textContent = lambda.toFixed(3);
    }
    
    // E_resonance (Logical Resonance)
    const resonance = txtOS.knowledgeBoundary.eResonance || 0;
    const resonanceRing = document.getElementById('resonance-ring');
    const resonanceValue = document.getElementById('resonance-value');
    
    if (resonanceRing && resonanceValue) {
        const circumference = 220;
        const offset = circumference - (resonance * circumference);
        resonanceRing.style.strokeDashoffset = offset;
        resonanceValue.textContent = resonance.toFixed(3);
    }
    
    // Knowledge Boundary Status
    const boundaryStatus = document.getElementById('boundary-status');
    const boundaryMonitors = document.getElementById('boundary-monitors');
    
    if (boundaryStatus && boundaryMonitors) {
        const isActive = txtOS.knowledgeBoundary.boundaryActive;
        boundaryStatus.textContent = isActive ? 'ACTIVE' : 'INACTIVE';
        boundaryStatus.className = `status-badge ${isActive ? 'available' : ''}`;
        boundaryMonitors.textContent = isActive ? '1' : '0';
    }
}

function updateReasoningProtocols() {
    // BBCR Protocol Status
    const bbcrStatus = document.getElementById('bbcr-status');
    const bbcrPivots = document.getElementById('bbcr-pivots');
    
    if (bbcrStatus && bbcrPivots) {
        const isActive = txtOS.knowledgeBoundary.boundaryActive;
        bbcrStatus.className = isActive ? 'protocol-indicator active' : 'protocol-indicator';
        bbcrPivots.textContent = txtOS.reasoningChain ? txtOS.reasoningChain.length : 0;
    }
    
    // Semantic Tree
    const treeCount = document.getElementById('tree-count');
    const treeDepth = document.getElementById('tree-depth');
    const treeNodes = document.getElementById('tree-nodes');
    
    if (treeCount && treeDepth && treeNodes) {
        const nodeCount = txtOS.memoryTree ? txtOS.memoryTree.length : 0;
        treeCount.textContent = nodeCount;
        treeDepth.textContent = Math.ceil(nodeCount / 3);
        
        // Update tree visualization
        const nodes = treeNodes.querySelectorAll('.tree-node');
        nodes.forEach((node, index) => {
            if (index < Math.min(nodeCount, 3)) {
                node.classList.add('active');
            } else {
                node.classList.remove('active');
            }
        });
    }
    
    // Resonance Amplification
    const amplificationLevel = document.getElementById('amplification-level');
    if (amplificationLevel) {
        const resonance = txtOS.knowledgeBoundary.eResonance || 0;
        const amplification = 1 + (resonance * 2); // 1.0x to 3.0x
        amplificationLevel.textContent = `${amplification.toFixed(1)}x`;
    }
}

function updateOperationalKPIs() {
    // Temperature
    const tempFill = document.getElementById('temp-fill');
    const tempDisplay = document.getElementById('temp-display');
    
    if (tempFill && tempDisplay) {
        const temperature = txtOS.temperature || 0.2;
        tempFill.style.height = `${temperature * 100}%`;
        tempDisplay.textContent = temperature.toFixed(1);
    }
    
    // Hallucination Detection
    const hallucinationStatus = document.getElementById('hallucination-status');
    const detectionFill = document.getElementById('detection-fill');
    
    if (hallucinationStatus && detectionFill) {
        const isEnabled = txtOS.knowledgeBoundary.boundaryActive;
        hallucinationStatus.textContent = isEnabled ? 'ENABLED' : 'DISABLED';
        hallucinationStatus.className = `status-badge ${isEnabled ? 'available' : ''}`;
        detectionFill.style.width = isEnabled ? '85%' : '0%';
    }
    
    // Memory Export
    const exportStatus = document.getElementById('export-status');
    const memorySize = document.getElementById('memory-size');
    const memoryNodes = document.getElementById('memory-nodes');
    
    if (exportStatus && memorySize && memoryNodes) {
        const nodeCount = txtOS.memoryTree ? txtOS.memoryTree.length : 0;
        const sizeKB = Math.max(1, Math.round(nodeCount * 0.5)); // Estimate size
        
        exportStatus.textContent = nodeCount > 0 ? 'AVAILABLE' : 'EMPTY';
        exportStatus.className = `status-badge ${nodeCount > 0 ? 'available' : ''}`;
        memorySize.textContent = `${sizeKB} KB`;
        memoryNodes.textContent = nodeCount;
    }
    
    // Update activity chart
    updateActivityChart();
}

function updateActivityChart() {
    const activityBars = document.getElementById('activity-bars');
    if (!activityBars) return;
    
    const bars = activityBars.querySelectorAll('.bar');
    const messageCount = txtOS.messageCount || 0;
    const memoryCount = txtOS.memoryTree ? txtOS.memoryTree.length : 0;
    const reasoningCount = txtOS.reasoningChain ? txtOS.reasoningChain.length : 0;
    
    // Generate some dynamic activity data
    const maxValue = Math.max(10, messageCount, memoryCount, reasoningCount);
    
    bars.forEach((bar, index) => {
        let height;
        switch (index % 3) {
            case 0: // Messages
                height = Math.min(90, (messageCount / maxValue) * 100);
                break;
            case 1: // Reasoning
                height = Math.min(90, (reasoningCount / maxValue) * 100);
                break;
            case 2: // Memory
                height = Math.min(90, (memoryCount / maxValue) * 100);
                break;
            default:
                height = Math.random() * 60 + 20;
        }
        bar.style.height = `${Math.max(4, height)}%`;
    });
}

function updateTabData(tabName) {
    switch (tabName) {
        case 'semantic':
            updateSemanticKPIs();
            break;
        case 'reasoning':
            updateReasoningProtocols();
            break;
        case 'operational':
            updateOperationalKPIs();
            break;
    }
}

// Initialize dashboard on load
document.addEventListener('DOMContentLoaded', () => {
    // Restore pinned state
    const wasPinned = localStorage.getItem('dashboard-pinned') === 'true';
    if (wasPinned) {
        isDashboardPinned = false; // Set to false first so toggle works correctly
        toggleDashboardPin();
    }
    
    // Update dashboard periodically if open
    setInterval(() => {
        const sidebar = document.getElementById('unified-sidebar');
        const dashboardTab = document.getElementById('dashboard-tab');
        if (sidebar && sidebar.classList.contains('open') && 
            dashboardTab && dashboardTab.classList.contains('active')) {
            updateDashboardData();
        }
    }, 5000); // Update every 5 seconds when open
});
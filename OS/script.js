// Modern TXT OS - Ultra-fast AI Reasoning System
class ModernTxtOS {
    constructor() {
        this.ollamaUrl = 'http://127.0.0.1:11434';
        this.currentModel = 'llama2';
        this.temperature = 0.2;
        this.memoryTree = [];
        this.isConnected = false;
        this.messageCount = 0;
        this.typingTimeouts = [];
        
        // Performance optimizations
        this.messagesCache = new Map();
        this.renderQueue = [];
        this.isRendering = false;
        
        // Dashboard data
        this.isDashboardOpen = false;
        this.performanceData = [];
        this.responseTimings = [];
        this.knowledgeBoundaryData = { confidence: 85, status: 'Confident' };
        this.currentSpeed = 0;
        this.averageSpeed = 0;
        this.selectedTreeNode = null;
        this.treeDepth = 0;
        this.attachedFiles = [];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB limit
        
        this.processRenderQueue = this.processRenderQueue.bind(this);
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.initializePerformanceOptimizations();
        this.initializeDashboard();
        this.requestConnectionPermission();
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
            this.updateTemperatureGauge();
        });
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

    async testConnection(retryCount = 0) {
        const statusElement = document.getElementById('ollama-status');
        const testBtn = document.getElementById('test-btn');
        
        if (testBtn) {
            testBtn.disabled = true;
            testBtn.textContent = retryCount > 0 ? `Retrying... (${retryCount}/3)` : 'Testing...';
        }
        
        try {
            // Check if we need to start Ollama with CORS
            if (retryCount === 0) {
                this.showConnectionStatus('info', 'Testing connection to Ollama server...');
            }
            
            console.log('Testing connection to:', this.ollamaUrl);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${this.ollamaUrl}/api/tags`, {
                signal: controller.signal,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            clearTimeout(timeoutId);
            
            console.log('Response status:', response.status, 'OK:', response.ok);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Connection successful, models:', data.models?.length || 0);
                this.isConnected = true;
                statusElement.classList.add('online');
                
                // Update model list
                const modelSelect = document.getElementById('model-select');
                modelSelect.innerHTML = '';
                
                if (data.models && data.models.length > 0) {
                    data.models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.name;
                        option.textContent = model.name;
                        modelSelect.appendChild(option);
                    });
                    
                    // Set current model if it exists in the list
                    const currentModelExists = data.models.some(model => model.name === this.currentModel);
                    if (currentModelExists) {
                        modelSelect.value = this.currentModel;
                    } else {
                        this.currentModel = data.models[0].name;
                        modelSelect.value = this.currentModel;
                    }
                } else {
                    // Add default models if none found
                    const defaultModels = ['llama2', 'mistral', 'codellama'];
                    defaultModels.forEach(modelName => {
                        const option = document.createElement('option');
                        option.value = modelName;
                        option.textContent = modelName;
                        modelSelect.appendChild(option);
                    });
                }
                
                if (testBtn) testBtn.textContent = 'Connected';
                this.showConnectionStatus('success', `Connected to Ollama server (${data.models?.length || 0} models available)`);
                
                // Update dashboard if open
                if (this.isDashboardOpen) {
                    this.updateDashboardMetrics();
                }
            } else if (response.status === 0) {
                // This might be a CORS issue or server not running
                throw new Error('CORS_OR_SERVER_DOWN');
            } else {
                throw new Error(`Server responded with status ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.log('Connection failed:', error.name, error.message);
            this.isConnected = false;
            statusElement.classList.remove('online');
            
            // Retry logic for transient errors
            if (retryCount < 3 && (error.name === 'AbortError' || error.message.includes('CORS_OR_SERVER_DOWN'))) {
                console.log('Retrying connection...');
                setTimeout(() => {
                    this.testConnection(retryCount + 1);
                }, 2000);
                return;
            }
            
            const errorMessage = this.diagnoseConnectionError(error);
            if (testBtn) testBtn.textContent = 'Failed';
            this.showConnectionStatus('error', errorMessage);
            
            console.log('Is server not running?', this.isOllamaNotRunning(error));
            
            // Show auto-start option if server is not running
            if (this.isOllamaNotRunning(error)) {
                this.showAutoStartOption();
            } else if (error.message.includes('CORS') || error.name === 'TypeError') {
                // Likely CORS issue - show CORS setup instructions
                this.showCORSSetupInstructions();
            }
        }
        
        if (testBtn) {
            setTimeout(() => {
                testBtn.disabled = false;
                testBtn.textContent = 'Test Connection';
            }, 2000);
        }
    }

    diagnoseConnectionError(error) {
        console.error('Connection error:', error); // Log for debugging
        
        if (error.name === 'AbortError') {
            return 'Connection timeout - Ollama server may not be running. Try running `ollama serve` in terminal.';
        }
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return 'CORS error - Ollama server needs CORS configuration for web access.';
        }
        
        if (error.message.includes('CORS_OR_SERVER_DOWN')) {
            return 'Cannot reach Ollama server - Check if it\'s running on the correct port.';
        }
        
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            return 'Network/CORS error - Ollama server may need CORS configuration.';
        }
        
        if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
            return 'CORS error - Run Ollama with: OLLAMA_ORIGINS=* ollama serve';
        }
        
        if (error.message.includes('404')) {
            return 'Ollama API not found - Check server URL and Ollama version compatibility.';
        }
        
        if (error.message.includes('500')) {
            return 'Ollama server error - Check server logs for detailed information.';
        }
        
        if (error.message.includes('ECONNREFUSED')) {
            return 'Connection refused - Ollama server is not running or port is blocked.';
        }
        
        return error.message || 'Unknown connection error - Check console for details.';
    }

    isOllamaNotRunning(error) {
        // Only consider it "not running" if it's actually a connection issue
        // Not CORS issues (which mean server IS running)
        return error.name === 'AbortError' || 
               error.message.includes('ECONNREFUSED') ||
               (error.message.includes('fetch') && !error.message.includes('CORS')) ||
               error.message.includes('CORS_OR_SERVER_DOWN');
    }

    showConnectionStatus(type, message) {
        // Create or update connection status display
        let statusDisplay = document.getElementById('connection-status');
        if (!statusDisplay) {
            statusDisplay = document.createElement('div');
            statusDisplay.id = 'connection-status';
            statusDisplay.className = 'connection-status';
            
            const settingsGroup = document.querySelector('.settings-group');
            if (settingsGroup) {
                settingsGroup.appendChild(statusDisplay);
            }
        }
        
        statusDisplay.className = `connection-status ${type}`;
        statusDisplay.innerHTML = `
            <div class="status-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            </div>
            <div class="status-message">${message}</div>
        `;
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                statusDisplay.style.opacity = '0';
                setTimeout(() => statusDisplay.remove(), 300);
            }, 3000);
        }
    }

    showAutoStartOption() {
        let autoStartDiv = document.getElementById('auto-start-option');
        if (!autoStartDiv) {
            autoStartDiv = document.createElement('div');
            autoStartDiv.id = 'auto-start-option';
            autoStartDiv.className = 'auto-start-option';
            
            const settingsGroup = document.querySelector('.settings-group');
            if (settingsGroup) {
                settingsGroup.appendChild(autoStartDiv);
            }
        }
        
        autoStartDiv.innerHTML = `
            <div class="auto-start-message">
                <p>🚀 Ollama server appears to be offline</p>
                <p>Would you like to try starting it automatically?</p>
            </div>
            <div class="auto-start-buttons">
                <button class="action-btn primary" onclick="txtOS.startOllamaServer()">
                    Start Ollama
                </button>
                <button class="action-btn secondary" onclick="txtOS.hideAutoStartOption()">
                    Manual Setup
                </button>
            </div>
        `;
    }

    hideAutoStartOption() {
        const autoStartDiv = document.getElementById('auto-start-option');
        if (autoStartDiv) {
            autoStartDiv.remove();
        }
    }

    async startOllamaServer() {
        const startBtn = document.querySelector('#auto-start-option .primary');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.textContent = 'Starting...';
        }
        
        try {
            // Check if we can use local commands (this will work in Electron or similar environments)
            if (window.electronAPI) {
                const result = await window.electronAPI.startOllama();
                if (result.success) {
                    this.showConnectionStatus('success', 'Ollama server started successfully');
                    setTimeout(() => this.testConnection(), 2000);
                } else {
                    throw new Error(result.error);
                }
            } else {
                // For web environments, show instructions
                this.showManualStartInstructions();
            }
        } catch (error) {
            this.showConnectionStatus('error', `Failed to start Ollama: ${error.message}`);
        }
        
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'Start Ollama';
        }
    }

    showManualStartInstructions() {
        const instructionsDiv = document.createElement('div');
        instructionsDiv.className = 'manual-instructions';
        instructionsDiv.innerHTML = `
            <h4>Manual Ollama Setup</h4>
            <div class="instruction-steps">
                <div class="step">
                    <span class="step-number">1</span>
                    <span class="step-text">Open Terminal/Command Prompt</span>
                </div>
                <div class="step">
                    <span class="step-number">2</span>
                    <span class="step-text">Run: <code>ollama serve</code></span>
                </div>
                <div class="step">
                    <span class="step-number">3</span>
                    <span class="step-text">Keep terminal open and try connecting again</span>
                </div>
            </div>
            <div class="instruction-links">
                <a href="https://ollama.ai" target="_blank" class="link-btn">
                    📥 Download Ollama
                </a>
                <button class="action-btn" onclick="txtOS.hideManualInstructions()">
                    Got it
                </button>
            </div>
        `;
        
        const autoStartDiv = document.getElementById('auto-start-option');
        if (autoStartDiv) {
            autoStartDiv.replaceWith(instructionsDiv);
        }
    }

    showCORSSetupInstructions() {
        const instructionsDiv = document.createElement('div');
        instructionsDiv.className = 'manual-instructions cors-setup';
        instructionsDiv.innerHTML = `
            <h4>🔒 CORS Setup Required</h4>
            <p>Ollama server is running but needs CORS configuration for web access.</p>
            <div class="instruction-steps">
                <div class="step">
                    <span class="step-number">1</span>
                    <span class="step-text">Stop current Ollama server (Ctrl+C)</span>
                </div>
                <div class="step">
                    <span class="step-number">2</span>
                    <span class="step-text">Run with CORS enabled: <code>OLLAMA_ORIGINS=* ollama serve</code></span>
                </div>
                <div class="step">
                    <span class="step-number">3</span>
                    <span class="step-text">Or set environment variable permanently:</span>
                    <div class="sub-steps">
                        <code>export OLLAMA_ORIGINS=*</code><br>
                        <code>ollama serve</code>
                    </div>
                </div>
                <div class="step">
                    <span class="step-number">4</span>
                    <span class="step-text">Try connecting again</span>
                </div>
            </div>
            <div class="instruction-links">
                <button class="action-btn primary" onclick="txtOS.testConnection()">
                    Test Again
                </button>
                <button class="action-btn" onclick="txtOS.hideCORSInstructions()">
                    Got it
                </button>
            </div>
        `;
        
        const settingsGroup = document.querySelector('.settings-group');
        if (settingsGroup) {
            settingsGroup.appendChild(instructionsDiv);
        }
    }

    hideCORSInstructions() {
        const instructionsDiv = document.querySelector('.cors-setup');
        if (instructionsDiv) {
            instructionsDiv.remove();
        }
    }

    hideManualInstructions() {
        const instructionsDiv = document.querySelector('.manual-instructions');
        if (instructionsDiv) {
            instructionsDiv.remove();
        }
    }

    requestConnectionPermission() {
        // Check if user has already granted permission
        const hasPermission = localStorage.getItem('ollama-connection-permission');
        if (hasPermission === 'granted') {
            this.testConnection();
            return;
        }

        // Show permission request dialog
        this.showPermissionDialog();
    }

    showPermissionDialog() {
        const overlay = document.createElement('div');
        overlay.className = 'permission-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'permission-request';
        dialog.innerHTML = `
            <div class="permission-content">
                <h3>🔗 Connect to Ollama</h3>
                <p>TXT OS would like to connect to your local Ollama server to provide AI responses.</p>
                <p><strong>Local server:</strong> ${this.ollamaUrl}</p>
                <div class="permission-buttons">
                    <button class="approve" onclick="txtOS.approveConnection()">
                        Allow Connection
                    </button>
                    <button class="deny" onclick="txtOS.denyConnection()">
                        Manual Setup
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(dialog);
        
        // Add click handler to overlay
        overlay.addEventListener('click', () => {
            this.denyConnection();
        });
    }

    approveConnection() {
        // Store permission
        localStorage.setItem('ollama-connection-permission', 'granted');
        
        // Remove dialog
        this.hidePermissionDialog();
        
        // Test connection
        this.testConnection();
    }

    denyConnection() {
        // Store denial
        localStorage.setItem('ollama-connection-permission', 'denied');
        
        // Remove dialog
        this.hidePermissionDialog();
        
        // Show connection status
        this.showConnectionStatus('info', 'Connection permission denied. Use settings to connect manually.');
    }

    hidePermissionDialog() {
        const overlay = document.querySelector('.permission-overlay');
        const dialog = document.querySelector('.permission-request');
        
        if (overlay) overlay.remove();
        if (dialog) dialog.remove();
    }

    resetConnectionPermission() {
        // Remove stored permission
        localStorage.removeItem('ollama-connection-permission');
        
        // Reset connection state
        this.isConnected = false;
        const statusElement = document.getElementById('ollama-status');
        if (statusElement) {
            statusElement.classList.remove('online');
        }
        
        // Clear any existing status messages
        const existingStatus = document.getElementById('connection-status');
        if (existingStatus) {
            existingStatus.remove();
        }
        
        // Show permission dialog again
        this.showPermissionDialog();
        
        this.showNotification('Connection permission reset', 'info');
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message && this.attachedFiles.length === 0) return;
        if (!this.isConnected) {
            this.showNotification('Please connect to Ollama first', 'error');
            return;
        }

        // Prepare message content
        let messageContent = message;
        const attachments = [...this.attachedFiles];
        
        // Add file information to message if files are attached
        if (attachments.length > 0) {
            const fileList = attachments.map(f => `📎 ${f.name} (${this.formatFileSize(f.size)})`).join('\n');
            messageContent += `\n\n${fileList}`;
        }

        // Clear input and attachments immediately for responsiveness
        input.value = '';
        this.autoResize(input);
        this.clearFileAttachments();
        
        // Add user message instantly
        this.addMessage('user', messageContent);
        
        // Show typing indicator
        const typingId = this.showTypingIndicator();
        
        try {
            await this.streamResponse(message, typingId);
        } catch (error) {
            this.removeTypingIndicator(typingId);
            this.showNotification('Error: ' + error.message, 'error');
        }
    }

    async streamResponse(message, typingId) {
        const startTime = Date.now();
        const systemPrompt = this.buildSystemPrompt();
        const fullMessage = `${systemPrompt}\n\nUser: ${message}`;
        
        const response = await fetch(`${this.ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        let wordCount = 0;
        
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
                            wordCount += data.response.split(' ').length;
                            this.updateStreamingMessage(messageId, fullResponse);
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }
        
        // Calculate response time
        const responseTime = Date.now() - startTime;
        
        // Finalize message
        this.finalizeStreamingMessage(messageId);
        
        // Update knowledge boundary based on response characteristics
        const confidence = this.calculateConfidence(fullResponse, wordCount);
        this.updateKnowledgeBoundary(confidence);
        
        // Update memory
        this.addToMemory(message, fullResponse, confidence);
        this.updateMemoryCount();
        
        // Update dashboard metrics
        this.updateReasoningSpeed(responseTime);
        
        // Update dashboard if open
        if (this.isDashboardOpen) {
            this.updateDashboardMetrics();
        }
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
                    <button class="action-btn copy-btn" data-message-id="${messageId}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy
                    </button>
                    <button class="action-btn minimize-btn" data-message-id="${messageId}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 15L12 9L6 15"></path>
                        </svg>
                        Minimize
                    </button>
                </div>
            </div>
        `;
        
        return messageDiv;
    }

    formatContent(content) {
        // Fast content formatting
        return content
            .replace(/\n/g, '<br>')
            .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
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

    processRenderQueue() {
        if (this.isRendering || this.renderQueue.length === 0) {
            return;
        }
        this.isRendering = true;
        const batchSize = 5; // Process 5 messages at a time
        const messagesToRender = this.renderQueue.splice(0, batchSize);

        messagesToRender.forEach(messageId => {
            const messageElement = document.getElementById(messageId);
            if (messageElement) {
                messageElement.classList.add('visible');
            }
        });

        this.isRendering = false;
        if (this.renderQueue.length > 0) {
            requestAnimationFrame(() => this.processRenderQueue());
        }
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
        }
    }

    handleKeyDown(event) {
        if (event.target.id === 'chat-input' && event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
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
        return `You are TXT OS, an advanced AI reasoning system with semantic memory and knowledge boundary detection.

Core capabilities:
- Semantic Tree Memory: Remember context and reasoning patterns
- Knowledge Boundary Detection: Identify uncertain territory
- Logical Coherence: Maintain consistent reasoning

Memory nodes: ${this.memoryTree.length}
Temperature: ${this.temperature}

Provide clear, helpful responses while maintaining semantic coherence.`;
    }

    addToMemory(input, output, confidence = null) {
        const nodeId = `node-${Date.now()}`;
        const memoryNode = {
            id: nodeId,
            input,
            output,
            timestamp: new Date().toISOString(),
            confidence: confidence || this.knowledgeBoundaryData.confidence,
            responseTime: this.currentSpeed,
            level: Math.min(this.memoryTree.length, 3) // Max 3 levels deep
        };
        
        this.memoryTree.push(memoryNode);
        
        // Update tree depth
        this.treeDepth = Math.max(this.treeDepth, memoryNode.level + 1);
        
        // Keep memory manageable
        if (this.memoryTree.length > 100) {
            this.memoryTree = this.memoryTree.slice(-50);
            this.treeDepth = Math.min(this.treeDepth, 3);
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

    saveSettings() {
        localStorage.setItem('modern-txt-os-settings', JSON.stringify({
            ollamaUrl: this.ollamaUrl,
            currentModel: this.currentModel,
            temperature: this.temperature
        }));
    }

    loadSettings() {
        const saved = localStorage.getItem('modern-txt-os-settings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.ollamaUrl = settings.ollamaUrl || this.ollamaUrl;
            this.currentModel = settings.currentModel || this.currentModel;
            this.temperature = settings.temperature || this.temperature;
            
            // Update UI
            document.getElementById('ollama-url').value = this.ollamaUrl;
            document.getElementById('model-select').value = this.currentModel;
            document.getElementById('temperature').value = this.temperature;
            document.getElementById('temp-value').textContent = this.temperature;
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

    autoResize(textarea) {
        // Reset height to auto to get accurate scrollHeight
        textarea.style.height = 'auto';
        
        // Calculate the actual content height
        const scrollHeight = textarea.scrollHeight;
        const minHeight = 48; // Match min-height from CSS
        const maxHeight = 200; // Match max-height from CSS
        
        // Set the new height
        const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
        textarea.style.height = newHeight + 'px';
        
        // Only show scrollbar if content exceeds max height
        if (scrollHeight > maxHeight) {
            textarea.style.overflowY = 'auto';
        } else {
            textarea.style.overflowY = 'hidden';
        }
    }

    exportMemory() {
        const data = {
            timestamp: new Date().toISOString(),
            memoryTree: this.memoryTree,
            messageCount: this.messageCount
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

    // Dashboard functionality
    initializeDashboard() {
        this.updateTemperatureGauge();
        this.updateMemoryStats();
        this.initializePerformanceChart();
        this.updateDashboardMetrics();
    }

    toggleDashboard() {
        this.isDashboardOpen = !this.isDashboardOpen;
        const dashboard = document.getElementById('dashboard-panel');
        const chatContainer = document.querySelector('.chat-container');
        
        dashboard.classList.toggle('open', this.isDashboardOpen);
        chatContainer.classList.toggle('dashboard-open', this.isDashboardOpen);
        
        if (this.isDashboardOpen) {
            this.updateDashboardMetrics();
        }
    }

    updateSemanticTree() {
        const treeChildren = document.getElementById('tree-children');
        const treeNodeCount = document.getElementById('tree-node-count');
        const treeDepthEl = document.getElementById('tree-depth');
        
        if (!treeChildren) return;
        
        treeChildren.innerHTML = '';
        
        // Update stats
        if (treeNodeCount) {
            treeNodeCount.textContent = `${this.memoryTree.length} nodes`;
        }
        if (treeDepthEl) {
            treeDepthEl.textContent = `${this.treeDepth} depth`;
        }
        
        // Add recent memory nodes as tree branches
        const recentNodes = this.memoryTree.slice(-10).reverse();
        recentNodes.forEach((node, index) => {
            const nodeDiv = document.createElement('div');
            nodeDiv.className = `tree-node level-${node.level}`;
            nodeDiv.dataset.nodeId = node.id;
            
            // Format timestamp
            const timeAgo = this.formatTimeAgo(node.timestamp);
            
            // Get confidence indicator
            const confidenceIcon = this.getConfidenceIcon(node.confidence);
            
            // Truncate input for display
            const displayText = node.input.length > 25 ? 
                node.input.substring(0, 25) + '...' : 
                node.input;
            
            nodeDiv.innerHTML = `
                <div class="node-content ${index === 0 ? 'active' : ''} ${this.selectedTreeNode === node.id ? 'selected' : ''}" 
                     onclick="txtOS.selectTreeNode('${node.id}')">
                    <div class="node-icon">${confidenceIcon}</div>
                    <div class="node-text">${displayText}</div>
                    <div class="node-timestamp">${timeAgo}</div>
                </div>
            `;
            
            treeChildren.appendChild(nodeDiv);
        });
        
        // If no nodes, show empty state
        if (this.memoryTree.length === 0) {
            treeChildren.innerHTML = `
                <div class="tree-node level-1">
                    <div class="node-content" style="opacity: 0.5; cursor: default;">
                        <div class="node-icon">💭</div>
                        <div class="node-text">No conversations yet</div>
                        <div class="node-timestamp">--</div>
                    </div>
                </div>
            `;
        }
    }

    updateKnowledgeBoundary(confidence = null, status = null) {
        if (confidence !== null) this.knowledgeBoundaryData.confidence = confidence;
        if (status !== null) this.knowledgeBoundaryData.status = status;
        
        const boundaryDot = document.getElementById('boundary-dot');
        const boundaryText = document.getElementById('boundary-text');
        const confidenceFill = document.getElementById('confidence-fill');
        
        if (boundaryDot && boundaryText && confidenceFill) {
            boundaryText.textContent = this.knowledgeBoundaryData.status;
            confidenceFill.style.width = `${this.knowledgeBoundaryData.confidence}%`;
            
            // Update dot color based on confidence
            boundaryDot.classList.remove('online');
            if (this.knowledgeBoundaryData.confidence > 70) {
                boundaryDot.classList.add('online');
            }
        }
    }

    updateTemperatureGauge() {
        const tempDisplay = document.getElementById('temp-display');
        const tempNeedle = document.getElementById('temp-needle');
        
        if (tempDisplay) {
            tempDisplay.textContent = this.temperature.toFixed(1);
        }
        
        if (tempNeedle) {
            // Rotate needle based on temperature (0-1 range maps to -90deg to 90deg)
            const rotation = (this.temperature * 180) - 90;
            tempNeedle.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        }
    }

    updateMemoryStats() {
        const activeNodes = document.getElementById('active-nodes');
        const totalMemory = document.getElementById('total-memory');
        
        if (activeNodes) {
            activeNodes.textContent = this.memoryTree.length;
        }
        
        if (totalMemory) {
            const memorySize = Math.round(JSON.stringify(this.memoryTree).length / 1024);
            totalMemory.textContent = `${memorySize}KB`;
        }
    }

    updateReasoningSpeed(responseTime) {
        this.currentSpeed = responseTime;
        this.responseTimings.push(responseTime);
        
        // Keep only last 10 timings
        if (this.responseTimings.length > 10) {
            this.responseTimings = this.responseTimings.slice(-10);
        }
        
        this.averageSpeed = this.responseTimings.reduce((a, b) => a + b, 0) / this.responseTimings.length;
        
        const currentSpeedEl = document.getElementById('current-speed');
        const avgSpeedEl = document.getElementById('avg-speed');
        const speedFill = document.getElementById('speed-fill');
        
        if (currentSpeedEl) {
            currentSpeedEl.textContent = `${Math.round(responseTime)} ms`;
        }
        
        if (avgSpeedEl) {
            avgSpeedEl.textContent = `Avg: ${Math.round(this.averageSpeed)} ms`;
        }
        
        if (speedFill) {
            // Map response time to percentage (faster = higher percentage)
            const maxTime = 5000; // 5 seconds max
            const percentage = Math.max(0, 100 - (responseTime / maxTime * 100));
            speedFill.style.width = `${percentage}%`;
        }
    }

    initializePerformanceChart() {
        const canvas = document.getElementById('performance-canvas');
        if (!canvas) return;
        
        this.chartCtx = canvas.getContext('2d');
        this.drawPerformanceChart();
    }

    drawPerformanceChart() {
        if (!this.chartCtx) return;
        
        const canvas = this.chartCtx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        this.chartCtx.clearRect(0, 0, width, height);
        
        // Draw grid
        this.chartCtx.strokeStyle = '#e2e8f0';
        this.chartCtx.lineWidth = 1;
        
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            this.chartCtx.beginPath();
            this.chartCtx.moveTo(0, y);
            this.chartCtx.lineTo(width, y);
            this.chartCtx.stroke();
        }
        
        // Draw performance line
        if (this.performanceData.length > 1) {
            this.chartCtx.strokeStyle = '#ff6b35';
            this.chartCtx.lineWidth = 2;
            this.chartCtx.beginPath();
            
            const pointWidth = width / Math.max(this.performanceData.length - 1, 1);
            
            this.performanceData.forEach((point, index) => {
                const x = index * pointWidth;
                const y = height - (point * height);
                
                if (index === 0) {
                    this.chartCtx.moveTo(x, y);
                } else {
                    this.chartCtx.lineTo(x, y);
                }
            });
            
            this.chartCtx.stroke();
        }
    }

    addPerformanceDataPoint(value) {
        this.performanceData.push(Math.min(1, Math.max(0, value)));
        
        // Keep only last 20 points
        if (this.performanceData.length > 20) {
            this.performanceData = this.performanceData.slice(-20);
        }
        
        this.drawPerformanceChart();
    }

    updateDashboardMetrics() {
        this.updateSemanticTree();
        this.updateKnowledgeBoundary();
        this.updateTemperatureGauge();
        this.updateMemoryStats();
        
        // Add a performance data point based on current metrics
        const performanceScore = (this.knowledgeBoundaryData.confidence / 100) * 
                               (this.memoryTree.length > 0 ? 0.8 : 0.3) * 
                               (this.isConnected ? 1 : 0.1);
        this.addPerformanceDataPoint(performanceScore);
    }

    calculateConfidence(response, wordCount) {
        // Simple confidence calculation based on response characteristics
        let confidence = 80; // Base confidence
        
        // Longer responses tend to be more confident
        if (wordCount > 50) confidence += 10;
        if (wordCount > 100) confidence += 5;
        
        // Check for uncertainty indicators
        const uncertaintyWords = ['maybe', 'might', 'possibly', 'uncertain', 'not sure', 'i think'];
        const uncertaintyCount = uncertaintyWords.reduce((count, word) => {
            return count + (response.toLowerCase().split(word).length - 1);
        }, 0);
        
        confidence -= uncertaintyCount * 10;
        
        // Check for confident indicators
        const confidentWords = ['definitely', 'certainly', 'clearly', 'obviously', 'precisely'];
        const confidentCount = confidentWords.reduce((count, word) => {
            return count + (response.toLowerCase().split(word).length - 1);
        }, 0);
        
        confidence += confidentCount * 5;
        
        return Math.min(100, Math.max(20, confidence));
    }

    // Helper functions for tree visualization
    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        
        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        return time.toLocaleDateString();
    }

    getConfidenceIcon(confidence) {
        if (confidence >= 90) return '🟢';
        if (confidence >= 70) return '🟡';
        if (confidence >= 50) return '🟠';
        return '🔴';
    }

    // Tree interaction methods
    selectTreeNode(nodeId) {
        this.selectedTreeNode = nodeId;
        
        // Update visual selection
        document.querySelectorAll('.node-content').forEach(node => {
            node.classList.remove('selected');
        });
        
        if (nodeId === 'root') {
            this.showTreeOutput({
                id: 'root',
                input: 'Conversation started',
                output: 'Welcome to TXT OS! This is the root of your conversation tree.',
                timestamp: new Date().toISOString(),
                confidence: 100
            });
            return;
        }
        
        const memoryNode = this.memoryTree.find(node => node.id === nodeId);
        if (memoryNode) {
            const nodeElement = document.querySelector(`[data-node-id="${nodeId}"] .node-content`);
            if (nodeElement) {
                nodeElement.classList.add('selected');
            }
            
            this.showTreeOutput(memoryNode);
        }
    }

    showTreeOutput(node) {
        const modal = document.getElementById('tree-output-modal');
        const title = document.getElementById('tree-output-title');
        const time = document.getElementById('tree-output-time');
        const length = document.getElementById('tree-output-length');
        const confidence = document.getElementById('tree-output-confidence');
        const input = document.getElementById('tree-output-input');
        const response = document.getElementById('tree-output-response');
        
        if (!modal) return;
        
        // Update modal content
        title.textContent = node.id === 'root' ? 'Conversation Root' : 'Memory Node';
        time.textContent = this.formatTimeAgo(node.timestamp);
        length.textContent = `${(node.input.length + node.output.length)} chars`;
        confidence.textContent = `${node.confidence}%`;
        input.textContent = node.input;
        response.textContent = node.output;
        
        // Store current node for actions
        this.currentOutputNode = node;
        
        // Show modal
        modal.classList.add('show');
        
        // Add escape key listener
        document.addEventListener('keydown', this.handleModalEscape.bind(this));
    }

    closeTreeOutput() {
        const modal = document.getElementById('tree-output-modal');
        if (modal) {
            modal.classList.remove('show');
        }
        
        // Remove escape key listener
        document.removeEventListener('keydown', this.handleModalEscape.bind(this));
        
        this.currentOutputNode = null;
    }

    handleModalEscape(event) {
        if (event.key === 'Escape') {
            this.closeTreeOutput();
        }
    }

    jumpToMessage() {
        if (!this.currentOutputNode) return;
        
        // Find the message in the chat
        const messages = document.querySelectorAll('.message');
        let targetMessage = null;
        
        messages.forEach(message => {
            const content = message.querySelector('.message-content');
            if (content && content.textContent.includes(this.currentOutputNode.input)) {
                targetMessage = message;
            }
        });
        
        if (targetMessage) {
            // Close modal first
            this.closeTreeOutput();
            
            // Scroll to message
            targetMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Highlight message temporarily
            targetMessage.style.backgroundColor = 'rgba(255, 107, 53, 0.1)';
            targetMessage.style.transform = 'scale(1.02)';
            
            setTimeout(() => {
                targetMessage.style.backgroundColor = '';
                targetMessage.style.transform = '';
            }, 2000);
        } else {
            this.showNotification('Message not found in current chat', 'info');
        }
    }

    copyTreeOutput() {
        if (!this.currentOutputNode) return;
        
        const textToCopy = `Input: ${this.currentOutputNode.input}\n\nResponse: ${this.currentOutputNode.output}`;
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            this.showNotification('Copied to clipboard!', 'success');
        }).catch(() => {
            this.showNotification('Failed to copy', 'error');
        });
    }

    clearMemoryTree() {
        if (confirm('Clear all memory tree data? This cannot be undone.')) {
            this.memoryTree = [];
            this.treeDepth = 0;
            this.selectedTreeNode = null;
            this.updateSemanticTree();
            this.updateMemoryStats();
            this.showNotification('Memory tree cleared', 'info');
        }
    }

    // File attachment functionality
    triggerFileUpload() {
        const fileInput = document.getElementById('file-input');
        fileInput.click();
    }

    handleFileUpload(event) {
        const files = Array.from(event.target.files);
        
        files.forEach(file => {
            if (this.validateFile(file)) {
                this.addFileAttachment(file);
            }
        });
        
        // Clear the input so the same file can be selected again
        event.target.value = '';
    }

    validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            this.showNotification(`File "${file.name}" is too large. Maximum size is 10MB.`, 'error');
            return false;
        }
        
        // Check if file already attached
        if (this.attachedFiles.some(f => f.name === file.name && f.size === file.size)) {
            this.showNotification(`File "${file.name}" is already attached.`, 'info');
            return false;
        }
        
        return true;
    }

    addFileAttachment(file) {
        const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const fileData = {
            id: fileId,
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            preview: null
        };
        
        this.attachedFiles.push(fileData);
        
        // Generate preview for images
        if (file.type.startsWith('image/')) {
            this.generateImagePreview(fileData);
        }
        
        this.renderFileAttachments();
    }

    generateImagePreview(fileData) {
        const reader = new FileReader();
        reader.onload = (e) => {
            fileData.preview = e.target.result;
            this.renderFileAttachments();
        };
        reader.readAsDataURL(fileData.file);
    }

    renderFileAttachments() {
        const container = document.getElementById('file-attachments');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.attachedFiles.forEach(fileData => {
            const fileDiv = document.createElement('div');
            fileDiv.className = `file-attachment ${this.getFileCategory(fileData.type)}`;
            fileDiv.dataset.fileId = fileData.id;
            
            const fileIcon = this.getFileIcon(fileData.type);
            const fileSize = this.formatFileSize(fileData.size);
            
            fileDiv.innerHTML = `
                ${fileData.preview ? 
                    `<img src="${fileData.preview}" alt="${fileData.name}" class="file-preview">` : 
                    `<div class="file-icon">${fileIcon}</div>`
                }
                <div class="file-info">
                    <div class="file-name">${fileData.name}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
                <button class="file-remove" onclick="txtOS.removeFileAttachment('${fileData.id}')" title="Remove file">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M18 6L6 18"></path>
                        <path d="M6 6L18 18"></path>
                    </svg>
                </button>
            `;
            
            container.appendChild(fileDiv);
        });
    }

    getFileCategory(mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        return 'document';
    }

    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎥';
        if (mimeType.startsWith('audio/')) return '🎵';
        if (mimeType.includes('pdf')) return '📄';
        if (mimeType.includes('text')) return '📝';
        if (mimeType.includes('json')) return '📋';
        if (mimeType.includes('word') || mimeType.includes('document')) return '📄';
        return '📎';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    removeFileAttachment(fileId) {
        this.attachedFiles = this.attachedFiles.filter(f => f.id !== fileId);
        this.renderFileAttachments();
    }

    clearFileAttachments() {
        this.attachedFiles = [];
        this.renderFileAttachments();
    }
}

// Global functions for HTML event handlers
function toggleSettings() {
    const sidebar = document.getElementById('settings-sidebar');
    sidebar.classList.toggle('open');
}

function toggleDashboard() {
    if (window.txtOS) {
        window.txtOS.toggleDashboard();
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        txtOS.sendMessage();
    }
}



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

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.txtOS = new ModernTxtOS();
    
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
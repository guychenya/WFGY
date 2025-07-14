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
        
        this.processRenderQueue = this.processRenderQueue.bind(this);
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.testConnection();
        this.initializePerformanceOptimizations();
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

    async testConnection() {
        const statusElement = document.getElementById('ollama-status');
        const testBtn = document.getElementById('test-btn');
        
        if (testBtn) {
            testBtn.disabled = true;
            testBtn.textContent = 'Testing...';
        }
        
        try {
            const response = await fetch(`${this.ollamaUrl}/api/tags`, {
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                const data = await response.json();
                this.isConnected = true;
                statusElement.classList.add('online');
                
                // Update model list
                const modelSelect = document.getElementById('model-select');
                modelSelect.innerHTML = '';
                data.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.name;
                    option.textContent = model.name;
                    modelSelect.appendChild(option);
                });
                
                if (testBtn) testBtn.textContent = 'Connected';
            } else {
                throw new Error('Connection failed');
            }
        } catch (error) {
            this.isConnected = false;
            statusElement.classList.remove('online');
            if (testBtn) testBtn.textContent = 'Failed';
        }
        
        if (testBtn) {
            setTimeout(() => {
                testBtn.disabled = false;
                testBtn.textContent = 'Test Connection';
            }, 2000);
        }
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        if (!this.isConnected) {
            this.showNotification('Please connect to Ollama first', 'error');
            return;
        }

        // Clear input immediately for responsiveness
        input.value = '';
        this.autoResize(input);
        
        // Add user message instantly
        this.addMessage('user', message);
        
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

    addToMemory(input, output) {
        this.memoryTree.push({
            id: Date.now(),
            input,
            output,
            timestamp: new Date().toISOString()
        });
        
        // Keep memory manageable
        if (this.memoryTree.length > 100) {
            this.memoryTree = this.memoryTree.slice(-50);
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
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
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
}

// Global functions for HTML event handlers
function toggleSettings() {
    const sidebar = document.getElementById('settings-sidebar');
    sidebar.classList.toggle('open');
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
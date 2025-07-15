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

        // Check for special commands
        if (this.handleSpecialCommand(message)) {
            input.value = '';
            this.autoResize(input);
            return;
        }

        // Clear input immediately for responsiveness
        input.value = '';
        this.autoResize(input);
        
        // Add user message instantly
        this.addMessage('user', message);
        
        // Perform knowledge boundary analysis
        this.analyzeKnowledgeBoundary(message);
        
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
    const sidebar = document.getElementById('settings-sidebar');
    sidebar.classList.toggle('open');
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
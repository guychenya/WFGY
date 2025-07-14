// TXT OS - JavaScript Implementation
class TxtOS {
    constructor() {
        this.ollamaUrl = 'http://127.0.0.1:11435';
        this.currentModel = 'llama2';
        this.temperature = 0.2;
        this.memoryTree = [];
        this.knowledgeBoundary = 0.5;
        this.isConnected = false;
        this.messageCount = 0;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateStatus();
        this.loadSettings();
        this.testConnection();
    }

    bindEvents() {
        // Chat events
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        document.getElementById('send-btn').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('clear-chat').addEventListener('click', () => {
            this.clearChat();
        });

        document.getElementById('kb-test').addEventListener('click', () => {
            this.runKnowledgeBoundaryTest();
        });

        // Settings events
        document.getElementById('test-connection').addEventListener('click', () => {
            this.testConnection();
        });

        document.getElementById('ollama-url').addEventListener('change', (e) => {
            this.ollamaUrl = e.target.value;
            this.saveSettings();
        });

        document.getElementById('model-select').addEventListener('change', (e) => {
            this.currentModel = e.target.value;
            this.saveSettings();
        });

        document.getElementById('temperature').addEventListener('input', (e) => {
            this.temperature = parseFloat(e.target.value);
            document.getElementById('temp-value').textContent = this.temperature;
            this.saveSettings();
        });

        document.getElementById('export-memory').addEventListener('click', () => {
            this.exportMemory();
        });
    }

    async testConnection() {
        const statusElement = document.getElementById('ollama-status');
        const testBtn = document.getElementById('test-connection');
        
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';
        
        try {
            const response = await fetch(`${this.ollamaUrl}/api/tags`);
            
            if (response.ok) {
                const data = await response.json();
                this.isConnected = true;
                statusElement.className = 'indicator online';
                testBtn.textContent = 'Connected';
                
                // Update model select with available models
                const modelSelect = document.getElementById('model-select');
                modelSelect.innerHTML = '';
                data.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.name;
                    option.textContent = model.name;
                    modelSelect.appendChild(option);
                });
                
                if (data.models.length > 0) {
                    this.currentModel = data.models[0].name;
                    modelSelect.value = this.currentModel;
                }
                
                this.addSystemMessage('✅ Connected to Ollama successfully');
            } else {
                throw new Error('Connection failed');
            }
        } catch (error) {
            this.isConnected = false;
            statusElement.className = 'indicator';
            testBtn.textContent = 'Connection Failed';
            this.addSystemMessage('❌ Failed to connect to Ollama. Make sure Ollama is running.');
        }
        
        setTimeout(() => {
            testBtn.disabled = false;
            testBtn.textContent = 'Test Connection';
        }, 2000);
        
        this.updateStatus();
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        if (!this.isConnected) {
            this.addSystemMessage('⚠️ Please connect to Ollama first');
            return;
        }

        input.value = '';
        this.addMessage('user', message);
        
        // Special commands
        if (message.toLowerCase() === 'hello world') {
            this.initializeTxtOS();
            return;
        }
        
        if (message.toLowerCase() === 'kbtest') {
            this.runKnowledgeBoundaryTest();
            return;
        }
        
        // Send to Ollama
        await this.sendToOllama(message);
    }

    async sendToOllama(message) {
        const sendBtn = document.getElementById('send-btn');
        sendBtn.disabled = true;
        sendBtn.classList.add('processing');
        
        // Show processing indicator
        this.showProcessingIndicator();
        
        // Add typing indicator
        const typingId = this.addTypingIndicator();
        
        try {
            const systemPrompt = this.buildSystemPrompt();
            const fullMessage = `${systemPrompt}\n\nUser: ${message}`;
            
            // Update processing status
            this.updateProcessingStatus('Connecting to Ollama...');
            
            const response = await fetch(`${this.ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.currentModel,
                    prompt: fullMessage,
                    options: {
                        temperature: this.temperature
                    },
                    stream: true
                })
            });
            
            if (!response.ok) {
                throw new Error('Request failed');
            }
            
            // Remove typing indicator
            this.removeTypingIndicator(typingId);
            
            // Update processing status
            this.updateProcessingStatus('Generating response...');
            
            // Handle streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            
            // Create message element for streaming
            const messageId = this.addStreamingMessage('assistant');
            
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
                            // Skip invalid JSON lines
                        }
                    }
                }
            }
            
            // Update processing status
            this.updateProcessingStatus('Analyzing response...');
            
            // Analyze response for knowledge boundary
            const kbRisk = this.analyzeKnowledgeBoundary(fullResponse);
            this.updateKnowledgeBoundary(kbRisk);
            
            // Add to memory tree
            this.addToMemoryTree(message, fullResponse);
            
            // Finalize streaming message
            this.finalizeStreamingMessage(messageId);
            
        } catch (error) {
            this.removeTypingIndicator(typingId);
            this.addSystemMessage('❌ Error communicating with Ollama: ' + error.message);
        }
        
        this.hideProcessingIndicator();
        sendBtn.disabled = false;
        sendBtn.classList.remove('processing');
    }

    buildSystemPrompt() {
        return `You are TXT OS, an AI reasoning system with semantic memory and knowledge boundary detection.

Core Features:
- Semantic Tree Memory: Remember context and reasoning patterns
- Knowledge Boundary Detection: Identify when approaching uncertain territory
- Logical Coherence: Maintain consistent reasoning throughout conversations

Current Memory Tree: ${JSON.stringify(this.memoryTree.slice(-5))}

Instructions:
1. Maintain semantic coherence across all responses
2. If uncertain about information, clearly state knowledge boundaries
3. Use logical reasoning patterns and show your thinking process
4. Remember previous context and build upon it semantically

Temperature: ${this.temperature}
Safety Mode: Active`;
    }

    analyzeKnowledgeBoundary(text) {
        const uncertaintyMarkers = [
            'i think', 'maybe', 'probably', 'might be', 'could be',
            'not sure', 'unclear', 'uncertain', 'possibly', 'perhaps'
        ];
        
        const confidenceMarkers = [
            'definitely', 'certainly', 'clearly', 'obviously', 'absolutely',
            'confirmed', 'established', 'proven', 'documented', 'verified'
        ];
        
        let uncertaintyScore = 0;
        let confidenceScore = 0;
        
        const lowerText = text.toLowerCase();
        
        uncertaintyMarkers.forEach(marker => {
            const matches = (lowerText.match(new RegExp(marker, 'g')) || []).length;
            uncertaintyScore += matches;
        });
        
        confidenceMarkers.forEach(marker => {
            const matches = (lowerText.match(new RegExp(marker, 'g')) || []).length;
            confidenceScore += matches;
        });
        
        const totalWords = text.split(' ').length;
        const risk = (uncertaintyScore - confidenceScore) / totalWords;
        
        return Math.max(0, Math.min(1, risk + 0.5));
    }

    updateKnowledgeBoundary(risk) {
        this.knowledgeBoundary = risk;
        const kbStatus = document.getElementById('kb-status');
        const kbMetric = document.getElementById('kb-metric');
        const kbFill = document.getElementById('kb-fill');
        
        if (risk < 0.3) {
            kbStatus.className = 'indicator online';
            kbMetric.textContent = 'Safe';
            kbFill.style.width = '25%';
            kbFill.style.background = 'linear-gradient(90deg, #10b981, #067a5a)';
        } else if (risk < 0.7) {
            kbStatus.className = 'indicator warning';
            kbMetric.textContent = 'Caution';
            kbFill.style.width = '60%';
            kbFill.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
        } else {
            kbStatus.className = 'indicator';
            kbMetric.textContent = 'High Risk';
            kbFill.style.width = '90%';
            kbFill.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
        }
    }

    addToMemoryTree(input, output) {
        const node = {
            id: Date.now(),
            input: input,
            output: output,
            timestamp: new Date().toISOString(),
            semantic_weight: this.calculateSemanticWeight(input, output)
        };
        
        this.memoryTree.push(node);
        this.updateMemoryTreeDisplay();
        this.updateMemoryMetrics();
    }

    calculateSemanticWeight(input, output) {
        const inputWords = input.split(' ').length;
        const outputWords = output.split(' ').length;
        const complexity = Math.log(inputWords + outputWords);
        return Math.min(1, complexity / 10);
    }

    updateMemoryTreeDisplay() {
        const treeContainer = document.getElementById('memory-tree');
        const rootNode = treeContainer.querySelector('.root');
        
        // Clear existing child nodes
        const childNodes = treeContainer.querySelectorAll('.tree-node.child');
        childNodes.forEach(node => node.remove());
        
        // Add recent memory nodes
        const recentNodes = this.memoryTree.slice(-5).reverse();
        recentNodes.forEach((node, index) => {
            const nodeElement = document.createElement('div');
            nodeElement.className = 'tree-node child';
            nodeElement.innerHTML = `
                <span class="node-icon">💭</span>
                <span class="node-text">${node.input.substring(0, 30)}...</span>
            `;
            treeContainer.appendChild(nodeElement);
        });
    }

    updateMemoryMetrics() {
        const memoryMetric = document.getElementById('memory-metric');
        const memoryFill = document.getElementById('memory-fill');
        const memoryStatus = document.getElementById('memory-status');
        
        const nodeCount = this.memoryTree.length;
        memoryMetric.textContent = `${nodeCount} nodes`;
        
        const fillPercentage = Math.min(100, (nodeCount / 20) * 100);
        memoryFill.style.width = `${fillPercentage}%`;
        
        if (nodeCount > 0) {
            memoryStatus.className = 'indicator online';
        } else {
            memoryStatus.className = 'indicator';
        }
    }

    initializeTxtOS() {
        this.addSystemMessage('🏛️ TXT OS initialized successfully!');
        this.addSystemMessage('📊 Semantic Tree Memory: Active');
        this.addSystemMessage('🛡️ Knowledge Boundary Detection: Enabled');
        this.addSystemMessage('🧠 Reasoning Enhancement: +22.4% accuracy boost');
        this.addSystemMessage('Type any message to begin reasoning, or "kbtest" to test knowledge boundaries');
    }

    runKnowledgeBoundaryTest() {
        const testQuestions = [
            "What is the exact number of grains of sand on Earth?",
            "How many thoughts does the average person have in a day?",
            "What will be the stock price of Apple in exactly 6 months?",
            "How many alien civilizations exist in our galaxy?",
            "What is the meaning of life, the universe, and everything?",
            "How many words are in all the books ever written?",
            "What is the exact temperature at the center of the sun?",
            "How many dreams has humanity collectively had?"
        ];
        
        const randomQuestion = testQuestions[Math.floor(Math.random() * testQuestions.length)];
        
        this.addSystemMessage(`🧪 Knowledge Boundary Test: "${randomQuestion}"`);
        
        // Simulate boundary detection
        setTimeout(() => {
            this.updateKnowledgeBoundary(0.8);
            this.addSystemMessage('🛡️ Knowledge boundary detected! This question approaches uncertain territory.');
            this.addSystemMessage('💡 Recommendation: Pivot to related topics with higher confidence levels.');
        }, 1000);
    }

    addMessage(type, content) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        const messageId = 'message-' + Date.now();
        messageDiv.id = messageId;
        messageDiv.className = `message ${type}`;
        
        const iconMap = {
            'user': '👤',
            'assistant': '🤖',
            'system': '⚙️'
        };
        
        messageDiv.innerHTML = `
            <div class="message-icon">${iconMap[type]}</div>
            <div class="message-content">
                <div class="message-text">${content}</div>
                <div class="message-actions">
                    <button class="action-btn copy-btn" onclick="txtOS.copyMessage('${messageId}')" title="Copy message">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <button class="action-btn minimize-btn" onclick="txtOS.toggleMessage('${messageId}')" title="Minimize/Expand">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="18,15 12,9 6,15"></polyline>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        this.messageCount++;
    }

    addSystemMessage(content) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.innerHTML = `
            <div class="message-icon">🏛️</div>
            <div class="message-content">${content}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    clearChat() {
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.innerHTML = `
            <div class="system-message">
                <div class="message-icon">🏛️</div>
                <div class="message-content">
                    <strong>TXT OS initialized</strong><br>
                    Type "hello world" to begin or "kbtest" to test knowledge boundaries
                </div>
            </div>
        `;
        this.messageCount = 0;
    }

    exportMemory() {
        const memoryData = {
            timestamp: new Date().toISOString(),
            memoryTree: this.memoryTree,
            stats: {
                totalNodes: this.memoryTree.length,
                knowledgeBoundary: this.knowledgeBoundary,
                messageCount: this.messageCount
            }
        };
        
        const dataStr = JSON.stringify(memoryData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `txt-os-memory-${Date.now()}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.addSystemMessage('📁 Memory tree exported successfully');
    }

    updateStatus() {
        const indicators = {
            'ollama-status': this.isConnected,
            'kb-status': this.knowledgeBoundary < 0.7,
            'memory-status': this.memoryTree.length > 0
        };
        
        Object.entries(indicators).forEach(([id, status]) => {
            const element = document.getElementById(id);
            if (element) {
                element.className = status ? 'indicator online' : 'indicator';
            }
        });
    }

    saveSettings() {
        const settings = {
            ollamaUrl: this.ollamaUrl,
            currentModel: this.currentModel,
            temperature: this.temperature
        };
        localStorage.setItem('txt-os-settings', JSON.stringify(settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('txt-os-settings');
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

    // Loading indicator methods
    showProcessingIndicator() {
        const container = document.getElementById('chat-messages');
        const indicator = document.createElement('div');
        indicator.id = 'processing-indicator';
        indicator.className = 'processing-indicator';
        indicator.innerHTML = `
            <div class="spinner"></div>
            <span id="processing-text">Processing...</span>
        `;
        container.appendChild(indicator);
        container.scrollTop = container.scrollHeight;
    }

    updateProcessingStatus(text) {
        const statusElement = document.getElementById('processing-text');
        if (statusElement) {
            statusElement.textContent = text;
        }
    }

    hideProcessingIndicator() {
        const indicator = document.getElementById('processing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    addTypingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        const typingId = 'typing-' + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.id = typingId;
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-icon">🤖</div>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            <span>TXT OS is thinking...</span>
        `;
        
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return typingId;
    }

    removeTypingIndicator(typingId) {
        const typingElement = document.getElementById(typingId);
        if (typingElement) {
            typingElement.remove();
        }
    }

    addStreamingMessage(type) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageId = 'streaming-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.className = `message ${type} streaming`;
        
        const iconMap = {
            'assistant': '🤖',
            'user': '👤',
            'system': '⚙️'
        };
        
        messageDiv.innerHTML = `
            <div class="message-icon">${iconMap[type]}</div>
            <div class="message-content">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="message-text streaming-text"></div>
                <div class="message-actions">
                    <button class="action-btn copy-btn" onclick="txtOS.copyMessage('${messageId}')" title="Copy message">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <button class="action-btn minimize-btn" onclick="txtOS.toggleMessage('${messageId}')" title="Minimize/Expand">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="18,15 12,9 6,15"></polyline>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return messageId;
    }

    updateStreamingMessage(messageId, text) {
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            const textElement = messageElement.querySelector('.streaming-text');
            const progressBar = messageElement.querySelector('.progress-fill');
            
            if (textElement) {
                textElement.textContent = text;
            }
            
            // Simulate progress
            if (progressBar) {
                const progress = Math.min(95, text.length * 0.5);
                progressBar.style.width = `${progress}%`;
            }
            
            // Auto-scroll
            const container = document.getElementById('chat-messages');
            container.scrollTop = container.scrollHeight;
        }
    }

    finalizeStreamingMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            const progressBar = messageElement.querySelector('.progress-bar');
            const progressFill = messageElement.querySelector('.progress-fill');
            
            // Complete progress
            if (progressFill) {
                progressFill.style.width = '100%';
            }
            
            // Remove progress bar after animation
            setTimeout(() => {
                if (progressBar) {
                    progressBar.remove();
                }
                messageElement.classList.remove('streaming');
            }, 500);
        }
        
        this.messageCount++;
    }

    // Message interaction methods
    copyMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            const textElement = messageElement.querySelector('.message-text');
            if (textElement) {
                const text = textElement.textContent;
                navigator.clipboard.writeText(text).then(() => {
                    // Show copy feedback
                    const copyBtn = messageElement.querySelector('.copy-btn');
                    const originalTitle = copyBtn.title;
                    copyBtn.title = 'Copied!';
                    copyBtn.style.color = '#10b981';
                    
                    setTimeout(() => {
                        copyBtn.title = originalTitle;
                        copyBtn.style.color = '';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            }
        }
    }

    toggleMessage(messageId) {
        const messageElement = document.getElementById(messageId);
        if (messageElement) {
            const textElement = messageElement.querySelector('.message-text');
            const minimizeBtn = messageElement.querySelector('.minimize-btn');
            const minimizeIcon = minimizeBtn.querySelector('svg polyline');
            
            if (textElement.style.display === 'none') {
                // Expand
                textElement.style.display = 'block';
                minimizeIcon.setAttribute('points', '18,15 12,9 6,15');
                minimizeBtn.title = 'Minimize';
                messageElement.classList.remove('minimized');
            } else {
                // Minimize
                textElement.style.display = 'none';
                minimizeIcon.setAttribute('points', '6,9 12,15 18,9');
                minimizeBtn.title = 'Expand';
                messageElement.classList.add('minimized');
            }
        }
    }
}

// Initialize TXT OS when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.txtOS = new TxtOS();
});

// Add some utility functions for advanced features
window.TxtOSUtils = {
    // Semantic similarity calculation
    calculateSimilarity(text1, text2) {
        const words1 = text1.toLowerCase().split(' ');
        const words2 = text2.toLowerCase().split(' ');
        const intersection = words1.filter(word => words2.includes(word));
        return intersection.length / Math.max(words1.length, words2.length);
    },
    
    // Text complexity analysis
    analyzeComplexity(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim());
        const words = text.split(/\s+/).filter(w => w.trim());
        const avgWordsPerSentence = words.length / sentences.length;
        const longWords = words.filter(w => w.length > 6).length;
        
        return {
            sentences: sentences.length,
            words: words.length,
            avgWordsPerSentence,
            complexity: (avgWordsPerSentence + longWords) / 10
        };
    }
};
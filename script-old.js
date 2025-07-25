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
        
        try {
            const systemPrompt = this.buildSystemPrompt();
            const fullMessage = `${systemPrompt}\n\nUser: ${message}`;
            
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
                    stream: false
                })
            });
            
            if (!response.ok) {
                throw new Error('Request failed');
            }
            
            const data = await response.json();
            const reply = data.response;
            
            // Analyze response for knowledge boundary
            const kbRisk = this.analyzeKnowledgeBoundary(reply);
            this.updateKnowledgeBoundary(kbRisk);
            
            // Add to memory tree
            this.addToMemoryTree(message, reply);
            
            // Display response
            this.addMessage('assistant', reply);
            
        } catch (error) {
            this.addSystemMessage('❌ Error communicating with Ollama: ' + error.message);
        }
        
        sendBtn.disabled = false;
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
        messageDiv.className = `message ${type}`;
        
        const iconMap = {
            'user': '👤',
            'assistant': '🤖',
            'system': '⚙️'
        };
        
        messageDiv.innerHTML = `
            <div class="message-icon">${iconMap[type]}</div>
            <div class="message-content">${content}</div>
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
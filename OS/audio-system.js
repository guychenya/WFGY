// Advanced Audio System for TXT OS
// Sophisticated sound design with Web Audio API

class TxtOSAudioSystem {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.enabled = true;
        this.volume = 0.6;
        this.audioCache = new Map();
        this.currentAmbient = null;
        this.setupAudioContext();
        this.setupAudioSettings();
    }

    async setupAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = this.volume;
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
            this.enabled = false;
        }
    }

    setupAudioSettings() {
        // Load audio preferences
        const savedSettings = localStorage.getItem('txtos-audio-settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            this.enabled = settings.enabled !== false;
            this.volume = settings.volume || 0.6;
        }

        // Update volume if audio context exists
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
    }

    saveAudioSettings() {
        localStorage.setItem('txtos-audio-settings', JSON.stringify({
            enabled: this.enabled,
            volume: this.volume
        }));
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
        this.saveAudioSettings();
    }

    toggleAudio() {
        this.enabled = !this.enabled;
        if (!this.enabled && this.currentAmbient) {
            this.stopAmbient();
        }
        this.saveAudioSettings();
        return this.enabled;
    }

    // ADVANCED SOUND GENERATION FUNCTIONS

    // Sophisticated startup sound with harmonic progression
    async playStartupSound() {
        if (!this.enabled || !this.audioContext) return;

        const duration = 2.5;
        const now = this.audioContext.currentTime;

        // Create a beautiful chord progression
        const frequencies = [
            [261.63, 329.63, 392.00], // C major
            [293.66, 369.99, 440.00], // D major
            [329.63, 415.30, 493.88], // E major
            [349.23, 440.00, 523.25]  // F major
        ];

        frequencies.forEach((chord, chordIndex) => {
            chord.forEach((freq, noteIndex) => {
                const oscillator = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                const filter = this.audioContext.createBiquadFilter();

                // Rich sound with multiple oscillator types
                oscillator.type = noteIndex === 0 ? 'sine' : 'triangle';
                oscillator.frequency.setValueAtTime(freq, now);

                // Sophisticated filter sweep
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(800, now);
                filter.frequency.exponentialRampToValueAtTime(4000, now + duration);

                // Dynamic volume envelope
                gain.gain.setValueAtTime(0, now);
                gain.gain.exponentialRampToValueAtTime(0.15 / chord.length, now + 0.1 + chordIndex * 0.3);
                gain.gain.exponentialRampToValueAtTime(0.05 / chord.length, now + duration - 0.5);
                gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

                oscillator.connect(filter);
                filter.connect(gain);
                gain.connect(this.masterGain);

                oscillator.start(now + chordIndex * 0.3);
                oscillator.stop(now + duration);
            });
        });

        // Add magical sparkle effect
        for (let i = 0; i < 8; i++) {
            setTimeout(() => this.playSparkle(), i * 200 + 500);
        }
    }

    // Delightful sparkle sound for magical moments
    playSparkle() {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        const baseFreq = 800 + Math.random() * 2000;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 2, this.audioContext.currentTime + 0.1);

        filter.type = 'bandpass';
        filter.frequency.value = baseFreq * 1.5;
        filter.Q.value = 5;

        gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }

    // Satisfying message send sound
    playMessageSend() {
        if (!this.enabled || !this.audioContext) return;

        const duration = 0.4;
        const now = this.audioContext.currentTime;

        // Main swoosh sound
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.exponentialRampToValueAtTime(800, now + duration);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(2000, now + duration);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        oscillator.start(now);
        oscillator.stop(now + duration);

        // Add confirmation click
        setTimeout(() => this.playClick('success'), 200);
    }

    // Modern typing indicator sound
    playTypingStart() {
        if (!this.enabled || !this.audioContext) return;

        // Soft, subtle typing indication
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = 220;

        gain.gain.setValueAtTime(0.05, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);

        oscillator.connect(gain);
        gain.connect(this.masterGain);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }

    // Delightful message receive sound
    playMessageReceive() {
        if (!this.enabled || !this.audioContext) return;

        const duration = 0.6;
        const now = this.audioContext.currentTime;

        // Beautiful arrival chime
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
        
        frequencies.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();

            oscillator.type = 'sine';
            oscillator.frequency.value = freq;

            filter.type = 'lowpass';
            filter.frequency.value = freq * 2;

            gain.gain.setValueAtTime(0, now + index * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.12, now + index * 0.1 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            oscillator.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            oscillator.start(now + index * 0.1);
            oscillator.stop(now + duration);
        });
    }

    // Sophisticated UI interaction sounds
    playClick(type = 'default') {
        if (!this.enabled || !this.audioContext) return;

        const configs = {
            default: { freq: 800, duration: 0.1, gain: 0.08 },
            success: { freq: 1000, duration: 0.15, gain: 0.1 },
            error: { freq: 300, duration: 0.2, gain: 0.12 },
            soft: { freq: 600, duration: 0.08, gain: 0.05 }
        };

        const config = configs[type] || configs.default;
        const now = this.audioContext.currentTime;

        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        oscillator.type = 'sine';
        oscillator.frequency.value = config.freq;

        filter.type = 'lowpass';
        filter.frequency.value = config.freq * 2;

        gain.gain.setValueAtTime(config.gain, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + config.duration);

        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        oscillator.start(now);
        oscillator.stop(now + config.duration);
    }

    // Unique sound signatures for each AI provider
    playProviderSwitch(provider) {
        if (!this.enabled || !this.audioContext) return;

        const signatures = {
            ollama: { freqs: [261, 329, 392], type: 'triangle' }, // Local warmth
            groq: { freqs: [440, 554, 659], type: 'sawtooth' },   // Speed energy
            openai: { freqs: [523, 659, 784], type: 'sine' },     // Classic elegance
            claude: { freqs: [349, 440, 523], type: 'triangle' }, // Thoughtful harmony
            gemini: { freqs: [392, 493, 587], type: 'sine' },     // Crystalline clarity
            xai: { freqs: [466, 587, 698], type: 'square' }       // Cutting edge
        };

        const signature = signatures[provider] || signatures.ollama;
        const now = this.audioContext.currentTime;

        signature.freqs.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();

            oscillator.type = signature.type;
            oscillator.frequency.value = freq;

            filter.type = 'lowpass';
            filter.frequency.value = freq * 3;

            gain.gain.setValueAtTime(0, now + index * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.08, now + index * 0.05 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            oscillator.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            oscillator.start(now + index * 0.05);
            oscillator.stop(now + 0.3);
        });
    }

    // Connection status sounds
    playConnectionChange(connected) {
        if (!this.enabled || !this.audioContext) return;

        if (connected) {
            // Uplifting connection sound
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.2);

            gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.4);

            oscillator.connect(gain);
            gain.connect(this.masterGain);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.4);
        } else {
            // Gentle disconnection sound
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(220, this.audioContext.currentTime + 0.3);

            gain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

            oscillator.connect(gain);
            gain.connect(this.masterGain);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.3);
        }
    }

    // File upload sounds
    playFileUpload() {
        if (!this.enabled || !this.audioContext) return;

        // Satisfying upload progression
        const frequencies = [200, 300, 400, 500, 600];
        const now = this.audioContext.currentTime;

        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();

                oscillator.type = 'triangle';
                oscillator.frequency.value = freq;

                gain.gain.setValueAtTime(0.06, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);

                oscillator.connect(gain);
                gain.connect(this.masterGain);

                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.1);
            }, index * 50);
        });
    }

    // Theme toggle sound
    playThemeToggle(isDark) {
        if (!this.enabled || !this.audioContext) return;

        const baseFreq = isDark ? 400 : 600;
        const targetFreq = isDark ? 200 : 1200;

        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(targetFreq, this.audioContext.currentTime + 0.3);

        filter.type = 'lowpass';
        filter.frequency.value = targetFreq;

        gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }

    // Error sound
    playError() {
        if (!this.enabled || !this.audioContext) return;

        // Gentle but noticeable error indication
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
        oscillator.frequency.setValueAtTime(180, this.audioContext.currentTime + 0.1);

        filter.type = 'lowpass';
        filter.frequency.value = 400;

        gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.4);

        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.4);
    }

    // AMBIENT SOUNDSCAPES FOR FOCUS

    async startAmbientFocus() {
        if (!this.enabled || !this.audioContext || this.currentAmbient) return;

        // Gentle brownian noise for focus
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate soft brownian noise
        let lastValue = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = lastValue = (lastValue + (0.02 * white)) / 1.02;
            data[i] *= 0.1; // Keep it very quiet
        }

        const source = this.audioContext.createBufferSource();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        source.buffer = buffer;
        source.loop = true;

        filter.type = 'lowpass';
        filter.frequency.value = 300;

        gain.gain.value = 0.03;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        source.start();
        this.currentAmbient = source;
    }

    stopAmbient() {
        if (this.currentAmbient) {
            this.currentAmbient.stop();
            this.currentAmbient = null;
        }
    }

    // Surprise sound for special moments
    playSuprise() {
        if (!this.enabled || !this.audioContext) return;

        // Magical ascending arpeggio with sparkles
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C major pentatonic
        const now = this.audioContext.currentTime;

        notes.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();

            oscillator.type = 'sine';
            oscillator.frequency.value = freq;

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(freq, now + index * 0.1);
            filter.frequency.exponentialRampToValueAtTime(freq * 4, now + index * 0.1 + 0.2);

            gain.gain.setValueAtTime(0, now + index * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.15, now + index * 0.1 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.3);

            oscillator.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            oscillator.start(now + index * 0.1);
            oscillator.stop(now + index * 0.1 + 0.3);
        });

        // Add sparkle effects
        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.playSparkle(), i * 100 + 300);
        }
    }

    // Easter egg sound for special sequences
    playEasterEgg() {
        if (!this.enabled || !this.audioContext) return;

        // Play a delightful melody
        const melody = [
            { freq: 523.25, time: 0 },    // C5
            { freq: 587.33, time: 0.2 },  // D5
            { freq: 659.25, time: 0.4 },  // E5
            { freq: 698.46, time: 0.6 },  // F5
            { freq: 783.99, time: 0.8 },  // G5
            { freq: 880.00, time: 1.0 },  // A5
            { freq: 987.77, time: 1.2 },  // B5
            { freq: 1046.50, time: 1.4 }  // C6
        ];

        const now = this.audioContext.currentTime;

        melody.forEach(({ freq, time }) => {
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();

            oscillator.type = 'triangle';
            oscillator.frequency.value = freq;

            filter.type = 'lowpass';
            filter.frequency.value = freq * 2;

            gain.gain.setValueAtTime(0, now + time);
            gain.gain.exponentialRampToValueAtTime(0.12, now + time + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.15);

            oscillator.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            oscillator.start(now + time);
            oscillator.stop(now + time + 0.15);
        });

        // Add magical ending
        setTimeout(() => {
            for (let i = 0; i < 10; i++) {
                setTimeout(() => this.playSparkle(), i * 50);
            }
        }, 1600);
    }

    // Resume audio context on user interaction (required by browsers)
    async resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
}

// Initialize the audio system
window.audioSystem = new TxtOSAudioSystem();
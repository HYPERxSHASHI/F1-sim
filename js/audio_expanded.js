/**
 * Audio Expansion - Multi-Car Procedural Audio Swarm
 * Optimized Web Audio API with proximity-based modulation
 * Maintains player synth + AI swarm synth for CPU efficiency
 */

class AudioExpanded {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;

        // Master nodes
        this.masterGain = null;
        this.masterCompressor = null;

        // Player engine synth (high fidelity)
        this.playerOscillators = [];
        this.playerGain = null;
        this.playerFilter = null;
        this.playerDistortion = null;

        // AI swarm synth (optimized, single voice)
        this.swarmOscillators = [];
        this.swarmGain = null;
        this.swarmFilter = null;
        this.swarmPan = null;

        // Real-time modulation
        this.currentPlayerRPM = 0;
        this.currentPlayerThrottle = 0;
        this.swarmRPM = 0;
        this.swarmDistance = Infinity;
        this.swarmPanning = 0;

        // Performance tracking
        this.audioLatency = 0;
    }

    /**
     * Initialize audio context (requires user interaction)
     */
    initialize() {
        if (this.isInitialized) return;

        // Create audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();

        // Resume if suspended (mobile requirement)
        if (this.audioContext.state === 'suspended') {
            document.addEventListener('click', () => {
                this.audioContext.resume().then(() => {
                    console.log('✓ Audio context resumed');
                });
            }, { once: true });
        }

        // Create master chain
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.3;

        this.masterCompressor = this.audioContext.createDynamicsCompressor();
        this.masterCompressor.threshold.value = -30;
        this.masterCompressor.knee.value = 40;
        this.masterCompressor.ratio.value = 12;
        this.masterCompressor.attack.value = 0.003;
        this.masterCompressor.release.value = 0.25;

        this.masterGain.connect(this.masterCompressor);
        this.masterCompressor.connect(this.audioContext.destination);

        // Create player synth
        this.createPlayerSynth();

        // Create AI swarm synth
        this.createSwarmSynth();

        this.isInitialized = true;
        console.log('✓ Audio system initialized');
    }

    /**
     * Create high-fidelity player engine synthesizer
     * Dual oscillators (sawtooth + square) with distortion
     */
    createPlayerSynth() {
        // Gain node for player engine
        this.playerGain = this.audioContext.createGain();
        this.playerGain.gain.value = 0.4;
        this.playerGain.connect(this.masterGain);

        // Sawtooth oscillator (bright, harsh)
        const sawOsc = this.audioContext.createOscillator();
        sawOsc.type = 'sawtooth';
        sawOsc.frequency.value = 200; // Base frequency
        this.playerOscillators.push(sawOsc);

        // Square oscillator (boxy, nasal)
        const squareOsc = this.audioContext.createOscillator();
        squareOsc.type = 'square';
        squareOsc.frequency.value = 200;
        squareOsc.detune.value = 12; // Slight detuning for richness
        this.playerOscillators.push(squareOsc);

        // Create distortion for aggressive tone
        this.playerDistortion = this.audioContext.createWaveShaper();
        this.playerDistortion.curve = this.makeDistortionCurve(400);

        // Low-pass filter for throttle modulation
        this.playerFilter = this.audioContext.createBiquadFilter();
        this.playerFilter.type = 'lowpass';
        this.playerFilter.frequency.value = 2000; // Start muffled
        this.playerFilter.Q.value = 2;

        // Connect: oscillators -> distortion -> filter -> gain
        sawOsc.connect(this.playerDistortion);
        squareOsc.connect(this.playerDistortion);
        this.playerDistortion.connect(this.playerFilter);
        this.playerFilter.connect(this.playerGain);

        // Start oscillators
        sawOsc.start();
        squareOsc.start();
    }

    /**
     * Create optimized AI swarm synthesizer
     * Single-voice for CPU efficiency, represents collective sound
     */
    createSwarmSynth() {
        // Gain for swarm
        this.swarmGain = this.audioContext.createGain();
        this.swarmGain.gain.value = 0; // Start silent

        // Panner for spatial positioning
        this.swarmPan = this.audioContext.createPanner();
        this.swarmPan.panningModel = 'equalpower';
        this.swarmPan.connect(this.masterGain);

        // Swarm oscillator (sawtooth for dense harmonics)
        const swarmOsc = this.audioContext.createOscillator();
        swarmOsc.type = 'sawtooth';
        swarmOsc.frequency.value = 150;
        this.swarmOscillators.push(swarmOsc);

        // Swarm filter
        this.swarmFilter = this.audioContext.createBiquadFilter();
        this.swarmFilter.type = 'lowpass';
        this.swarmFilter.frequency.value = 1500;
        this.swarmFilter.Q.value = 1;

        // Connect: oscillator -> filter -> gain -> panner
        swarmOsc.connect(this.swarmFilter);
        this.swarmFilter.connect(this.swarmGain);
        this.swarmGain.connect(this.swarmPan);

        swarmOsc.start();
    }

    /**
     * Create distortion waveshaper curve
     * Simulates amplifier saturation
     */
    makeDistortionCurve(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }
        return curve;
    }

    /**
     * Update player engine sound
     * @param {number} rpm - Current engine RPM
     * @param {number} throttle - Throttle input (0-1)
     */
    updatePlayerEngine(rpm, throttle) {
        const startTime = performance.now();

        // Convert RPM to frequency (17,500 RPM = ~875 Hz base)
        const rpmFreq = (rpm / 17500) * 875;
        const harmonic1 = rpmFreq; // Fundamental
        const harmonic2 = rpmFreq * 1.5; // +5th

        // Update player oscillator frequencies
        this.playerOscillators[0].frequency.exponentialRampToValueAtTime(
            harmonic1,
            this.audioContext.currentTime + 0.05
        );
        this.playerOscillators[1].frequency.exponentialRampToValueAtTime(
            harmonic2,
            this.audioContext.currentTime + 0.05
        );

        // Throttle modulates filter cutoff (off-throttle = muffled, on-throttle = bright)
        const filterFreq = 1000 + throttle * 4000; // 1kHz to 5kHz range
        this.playerFilter.frequency.exponentialRampToValueAtTime(
            filterFreq,
            this.audioContext.currentTime + 0.1
        );

        // Volume boost on throttle
        this.playerGain.gain.linearRampToValueAtTime(
            0.3 + throttle * 0.3,
            this.audioContext.currentTime + 0.05
        );

        this.currentPlayerRPM = rpm;
        this.currentPlayerThrottle = throttle;

        this.audioLatency = performance.now() - startTime;
    }

    /**
     * Update AI swarm sound based on closest competitors
     * @param {Array} closestAICars - Array of {car, distance} objects
     */
    updateSwarmAudio(closestAICars) {
        if (closestAICars.length === 0) {
            // No AI nearby, fade swarm to silence
            this.swarmGain.gain.linearRampToValueAtTime(
                0,
                this.audioContext.currentTime + 0.5
            );
            return;
        }

        // Calculate average distance, RPM, and position of 3 closest
        let avgDistance = 0;
        let avgRPM = 0;
        let avgX = 0;
        const count = Math.min(closestAICars.length, 3);

        closestAICars.slice(0, count).forEach(({ car, distance }) => {
            avgDistance += distance;
            avgRPM += car.speed * 50; // Approximate RPM from speed
            avgX += car.position.x;
        });

        avgDistance /= count;
        avgRPM /= count;
        avgX /= count;

        // Swarm volume: closer = louder
        const maxDistance = 200;
        const swarmVolume = Math.max(0, 1 - avgDistance / maxDistance) * 0.5;
        this.swarmGain.gain.linearRampToValueAtTime(
            swarmVolume,
            this.audioContext.currentTime + 0.2
        );

        // Swarm pitch from average AI RPM
        const swarmFreq = (avgRPM / 17500) * 875 * 0.8; // Slightly lower than player
        this.swarmOscillators[0].frequency.exponentialRampToValueAtTime(
            swarmFreq,
            this.audioContext.currentTime + 0.1
        );

        // Spatial panning: -1 (left) to 1 (right)
        const panValue = Math.max(-1, Math.min(1, avgX / 50));
        if (this.swarmPan.pan) {
            this.swarmPan.pan.linearRampToValueAtTime(
                panValue,
                this.audioContext.currentTime + 0.2
            );
        }

        this.swarmRPM = avgRPM;
        this.swarmDistance = avgDistance;
        this.swarmPanning = panValue;
    }

    /**
     * Get audio latency for profiling
     */
    getLatency() {
        return this.audioLatency;
    }
}

/**
 * Telemetry & Race Director System
 * Race state machine, lap timing, position tracking, delta calculation
 * Advanced timing tower with sector splits
 */

class RaceDirector {
    constructor(trackGenerator, aiSystem) {
        this.track = trackGenerator;
        this.aiSystem = aiSystem;

        // Race states
        this.STATE = {
            FORMATION: 'FORMATION',
            LIGHTS_OUT: 'LIGHTS_OUT',
            RACING: 'RACING',
            FINISHED: 'FINISHED'
        };

        this.currentState = this.STATE.FORMATION;
        this.stateStartTime = 0;
        this.countdownTime = 3; // Seconds

        // Lap tracking
        this.currentLap = 1;
        this.totalLaps = 10;
        this.isNewLap = false;
        this.lapStartTime = 0;
        this.currentLapTime = 0;

        // Position tracking
        this.playerPosition = 1;
        this.playerTrackProgress = 0;

        // Timing data
        this.lapTimes = []; // Array of completed lap times
        this.bestLapTime = Infinity;
        this.currentSectorTimes = [0, 0, 0]; // 3 sectors
        this.bestSectorTimes = [Infinity, Infinity, Infinity];

        // Delta timing
        this.deltaTime = 0; // +/- seconds vs best lap
        this.currentSectorDelta = 0;
        this.previousSectorTime = 0;
        this.bestSectorSplitTimes = [];

        // Track sectors
        this.sectorStarts = [0, 0.333, 0.667]; // Track progress thresholds
        this.currentSector = 0;
        this.lastSectorCrossTime = 0;

        // Start/Finish line detection
        this.lineStartZ = 0; // Z coordinate of S/F line
        this.playerLastZ = 0;
        this.hasLineCrossed = false;
    }

    /**
     * Update race state and timing
     */
    update(playerPosition, playerTrackProgress, deltaTime) {
        this.playerTrackProgress = playerTrackProgress;
        this.playerLastZ = playerPosition.z;

        // Update race state machine
        this.updateRaceState(deltaTime);

        // Update position
        this.updatePlayerPosition();

        // Update lap timing
        this.updateLapTiming(playerTrackProgress, deltaTime);

        // Update sector timing
        this.updateSectorTiming(playerTrackProgress, deltaTime);

        // Calculate delta
        this.calculateDelta();
    }

    /**
     * State machine for race progression
     */
    updateRaceState(deltaTime) {
        const elapsedTime = (performance.now() - this.stateStartTime) / 1000;

        switch (this.currentState) {
            case this.STATE.FORMATION:
                // Player has ~3 seconds to form up
                if (elapsedTime > 3) {
                    this.currentState = this.STATE.LIGHTS_OUT;
                    this.stateStartTime = performance.now();
                    console.log('✓ Formation complete, lights out...');
                }
                break;

            case this.STATE.LIGHTS_OUT:
                // 3 second countdown to start
                if (elapsedTime > this.countdownTime) {
                    this.currentState = this.STATE.RACING;
                    this.lapStartTime = performance.now();
                    this.stateStartTime = performance.now();
                    this.currentLap = 1;
                    console.log('🏁 LIGHTS OUT AND AWAY WE GO!');
                }
                break;

            case this.STATE.RACING:
                // Check if race is finished
                if (this.currentLap > this.totalLaps && this.playerTrackProgress < 0.1) {
                    this.currentState = this.STATE.FINISHED;
                    console.log('✓ Race finished!');
                }
                break;

            case this.STATE.FINISHED:
                // Race is over
                break;
        }
    }

    /**
     * Calculate player's current race position (1-22)
     */
    updatePlayerPosition() {
        const racePositions = this.aiSystem.getRacePositions();
        let position = 1; // Start as 1st

        // Count how many AI cars are ahead
        for (const aiPos of racePositions) {
            if (aiPos.trackProgress > this.playerTrackProgress) {
                position++;
            }
        }

        this.playerPosition = position;
    }

    /**
     * Detect lap crossings and track lap times
     */
    updateLapTiming(playerTrackProgress, deltaTime) {
        // Lap completed when track progress wraps from near 1.0 to near 0.0
        if (this.playerTrackProgress < 0.1 && !this.hasLineCrossed) {
            if (this.currentLap > 1) {
                // Record completed lap time
                const lapTime = (performance.now() - this.lapStartTime) / 1000;
                this.lapTimes.push(lapTime);

                if (lapTime < this.bestLapTime) {
                    this.bestLapTime = lapTime;
                    this.bestSectorTimes = [...this.currentSectorTimes];
                    console.log(`✓ New best lap! ${this.formatTime(lapTime)}`);
                } else {
                    console.log(`Lap ${this.currentLap}: ${this.formatTime(lapTime)}`);
                }
            }

            // Start new lap
            this.lapStartTime = performance.now();
            this.currentLap++;
            this.currentSectorTimes = [0, 0, 0];
            this.currentSector = 0;
            this.hasLineCrossed = true;
        }

        // Reset line cross flag when back on track
        if (this.playerTrackProgress > 0.2) {
            this.hasLineCrossed = false;
        }

        // Update current lap time
        if (this.currentState === this.STATE.RACING) {
            this.currentLapTime = (performance.now() - this.lapStartTime) / 1000;
        }
    }

    /**
     * Track sector times (3 sectors per lap)
     */
    updateSectorTiming(playerTrackProgress, deltaTime) {
        // Determine current sector
        let newSector = 0;
        if (playerTrackProgress < 0.333) newSector = 0;
        else if (playerTrackProgress < 0.667) newSector = 1;
        else newSector = 2;

        // Sector change detected
        if (newSector !== this.currentSector && playerTrackProgress > 0.05) {
            const sectorTime = (performance.now() - this.lastSectorCrossTime) / 1000;
            this.currentSectorTimes[this.currentSector] = sectorTime;

            // Update best sector
            if (this.currentLap > 1 && sectorTime < this.bestSectorTimes[this.currentSector]) {
                this.bestSectorTimes[this.currentSector] = sectorTime;
            }

            this.lastSectorCrossTime = performance.now();
            this.currentSector = newSector;
        }

        // Track current sector in-progress time
        if (this.currentState === this.STATE.RACING) {
            this.currentSectorTimes[this.currentSector] = (performance.now() - this.lastSectorCrossTime) / 1000;
        }
    }

    /**
     * Calculate delta vs best lap time
     */
    calculateDelta() {
        if (this.bestLapTime === Infinity) {
            this.deltaTime = 0;
            return; // No reference lap yet
        }

        // Interpolate where we are in the best lap based on track progress
        // This is a simplified delta calculation
        const progressInLap = this.playerTrackProgress;
        const currentLapTimeSoFar = (performance.now() - this.lapStartTime) / 1000;

        // Estimate what the best lap time would be at current progress
        const estimatedBestLapProgress = (progressInLap * this.bestLapTime);

        this.deltaTime = currentLapTimeSoFar - estimatedBestLapProgress;
    }

    /**
     * Format time as MM:SS.mmm
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs.toFixed(3)).padStart(6, '0')}`;
    }

    /**
     * Format delta as +/- X.XXXs
     */
    formatDelta(delta) {
        const sign = delta > 0 ? '+' : '';
        return `${sign}${delta.toFixed(3)}s`;
    }

    /**
     * Get current race state
     */
    getState() {
        return this.currentState;
    }

    /**
     * Check if player can accelerate (not jumped start)
     */
    canAccelerate() {
        return this.currentState === this.STATE.RACING;
    }

    /**
     * Check if in pre-race (formation/lights out)
     */
    isPreRace() {
        return this.currentState === this.STATE.FORMATION || this.currentState === this.STATE.LIGHTS_OUT;
    }

    /**
     * Get countdown time remaining (for LIGHTS_OUT state)
     */
    getCountdownRemaining() {
        if (this.currentState !== this.STATE.LIGHTS_OUT) return 0;
        const elapsed = (performance.now() - this.stateStartTime) / 1000;
        return Math.max(0, this.countdownTime - elapsed);
    }

    /**
     * Reset race
     */
    reset() {
        this.currentState = this.STATE.FORMATION;
        this.stateStartTime = performance.now();
        this.currentLap = 1;
        this.lapTimes = [];
        this.bestLapTime = Infinity;
        this.currentSectorTimes = [0, 0, 0];
        this.bestSectorTimes = [Infinity, Infinity, Infinity];
        this.deltaTime = 0;
        this.playerPosition = 1;
        this.playerTrackProgress = 0;
        this.hasLineCrossed = false;
        this.lastSectorCrossTime = performance.now();
        console.log('✓ Race reset');
    }
}

/**
 * Telemetry UI Manager
 * Updates HUD with race data
 */
class TelemetryUI {
    constructor() {
        this.hudElements = {
            speed: document.getElementById('speed'),
            position: document.getElementById('position'),
            lap: document.getElementById('lap'),
            lapTime: document.getElementById('lapTime'),
            delta: document.getElementById('delta'),
            gear: document.getElementById('gear'),
            rpm: document.getElementById('rpm'),
            revBar: document.getElementById('revBar')
        };

        // Create HUD if elements don't exist
        this.ensureHUDExists();
    }

    /**
     * Ensure HUD elements exist in DOM
     */
    ensureHUDExists() {
        if (!document.getElementById('telemetry-hud')) {
            const hudHTML = `
                <div id="telemetry-hud" style="
                    position: absolute;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    color: #00ff00;
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
                    background: rgba(0, 0, 0, 0.8);
                    padding: 20px 40px;
                    border: 2px solid #00ff00;
                    border-radius: 8px;
                    min-width: 400px;
                    z-index: 10;
                ">
                    <div style="text-align: center; margin-bottom: 10px; font-size: 16px; font-weight: bold;">
                        🏁 F1 SIMULATOR - RACE TELEMETRY
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <div style="color: #00aa00; font-size: 11px; text-transform: uppercase;">Speed</div>
                            <div id="speed" style="color: #00ff00; font-size: 18px; font-weight: bold;">0 km/h</div>
                        </div>
                        <div>
                            <div style="color: #00aa00; font-size: 11px; text-transform: uppercase;">Position</div>
                            <div id="position" style="color: #00ff00; font-size: 18px; font-weight: bold;">1/22</div>
                        </div>
                        <div>
                            <div style="color: #00aa00; font-size: 11px; text-transform: uppercase;">Lap</div>
                            <div id="lap" style="color: #00ff00; font-size: 18px; font-weight: bold;">1/10</div>
                        </div>
                        <div>
                            <div style="color: #00aa00; font-size: 11px; text-transform: uppercase;">Current Lap</div>
                            <div id="lapTime" style="color: #00ff00; font-size: 18px; font-weight: bold;">00:00.000</div>
                        </div>
                        <div>
                            <div style="color: #00aa00; font-size: 11px; text-transform: uppercase;">Delta</div>
                            <div id="delta" style="color: #ffff00; font-size: 18px; font-weight: bold;">+0.000s</div>
                        </div>
                        <div>
                            <div style="color: #00aa00; font-size: 11px; text-transform: uppercase;">Gear / RPM</div>
                            <div id="gear" style="color: #00ff00; font-size: 14px; font-weight: bold;">N · 0</div>
                        </div>
                    </div>
                    <div style="margin-top: 15px; border-top: 1px solid #00ff00; padding-top: 10px;">
                        <div style="color: #00aa00; font-size: 11px; text-transform: uppercase;">Rev Bar</div>
                        <div style="background: #1a1a1a; height: 20px; border: 1px solid #00ff00; border-radius: 3px; overflow: hidden;">
                            <div id="revBar" style="
                                background: linear-gradient(90deg, #00ff00 0%, #ffff00 60%, #ff0000 100%);
                                height: 100%;
                                width: 0%;
                                transition: width 0.05s linear;
                            "></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', hudHTML);
            this.hudElements = {
                speed: document.getElementById('speed'),
                position: document.getElementById('position'),
                lap: document.getElementById('lap'),
                lapTime: document.getElementById('lapTime'),
                delta: document.getElementById('delta'),
                gear: document.getElementById('gear'),
                rpm: document.getElementById('rpm'),
                revBar: document.getElementById('revBar')
            };
        }
    }

    /**
     * Update telemetry display
     */
    update(speedKMH, position, lap, totalLaps, lapTime, delta, gear, rpm, revLimiter) {
        if (this.hudElements.speed) {
            this.hudElements.speed.textContent = Math.round(speedKMH) + ' km/h';
        }

        if (this.hudElements.position) {
            this.hudElements.position.textContent = `${position}/22`;
        }

        if (this.hudElements.lap) {
            this.hudElements.lap.textContent = `${lap}/${totalLaps}`;
        }

        if (this.hudElements.lapTime) {
            this.hudElements.lapTime.textContent = this.formatTime(lapTime);
        }

        if (this.hudElements.delta) {
            this.hudElements.delta.textContent = this.formatDelta(delta);
            // Color code delta
            if (delta > 0.5) {
                this.hudElements.delta.style.color = '#ff0000'; // Red - losing time
            } else if (delta > 0.1) {
                this.hudElements.delta.style.color = '#ffff00'; // Yellow - neutral
            } else {
                this.hudElements.delta.style.color = '#00ff00'; // Green - gaining time
            }
        }

        if (this.hudElements.gear) {
            const gearNames = ['R', 'N', '1', '2', '3', '4', '5', '6', '7', '8'];
            const gearName = gearNames[Math.min(gear, 9)] || 'N';
            this.hudElements.gear.textContent = `${gearName} · ${Math.round(rpm)}`;
        }

        if (this.hudElements.revBar) {
            const revPercent = Math.min(100, (rpm / revLimiter) * 100);
            this.hudElements.revBar.style.width = revPercent + '%';

            // Flash effect when near limiter
            if (rpm > revLimiter * 0.95) {
                this.hudElements.revBar.style.animation = 'none';
                setTimeout(() => {
                    this.hudElements.revBar.style.animation = 'pulse 0.2s';
                }, 10);
            }
        }
    }

    /**
     * Format time as MM:SS.mmm
     */
    formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '00:00.000';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs.toFixed(3)).padStart(6, '0')}`;
    }

    /**
     * Format delta as +/- X.XXXs
     */
    formatDelta(delta) {
        if (isNaN(delta)) return '+0.000s';
        const sign = delta > 0 ? '+' : '';
        return `${sign}${Math.abs(delta).toFixed(3)}s`;
    }
}

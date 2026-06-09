/**
 * Input System - Refined Controls with Calibration
 * Keyboard smoothing, gamepad deadzone filtering, gamma curve sensitivity
 */

class InputSystem {
    constructor() {
        // Keyboard state
        this.keys = {
            'w': false,
            'a': false,
            's': false,
            'd': false,
            ' ': false,
            'r': false // Restart
        };

        // Control outputs (raw input before processing)
        this.throttleRaw = 0;
        this.brakeRaw = 0;
        this.steeringRaw = 0;

        // Smoothed outputs (after calibration)
        this.throttle = 0;
        this.brake = 0;
        this.steering = 0;

        // Steering calibration
        this.steerRate = 0.25; // Full lock in ~0.25 seconds
        this.steerReturnRate = 0.35; // Faster return to center
        this.steerMaxAngle = 1.0; // Radians, full lock

        // Throttle/brake calibration
        this.throttleSensitivity = 0.15;
        this.brakeSensitivity = 0.15;

        // Gamepad calibration
        this.gamepadEnabled = true;
        this.gamepadDeadzone = 0.12; // Filter stick drift
        this.gamepadIndex = -1;
        this.gamepadActive = false;

        // Sensitivity curves (gamma correction)
        this.steeringGamma = 2.2; // Precise low-speed, full range high-speed
        this.triggerGamma = 1.8; // Slightly aggressive throttle response

        // Input history for profiling
        this.inputLatency = 0;
        this.lastInputTime = Date.now();

        this.setupKeyboardListeners();
    }

    /**
     * Setup keyboard event listeners
     */
    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) {
                this.keys[key] = true;
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) {
                this.keys[key] = false;
                e.preventDefault();
            }
        });
    }

    /**
     * Update all input sources
     * Called every frame before physics/game update
     */
    update(deltaTime) {
        const startTime = performance.now();

        // Update keyboard inputs
        this.updateKeyboardControls();

        // Update gamepad if available
        const gamepad = this.updateGamepadState();
        if (gamepad && this.gamepadActive) {
            this.updateGamepadControls(gamepad, deltaTime);
        }

        // Apply smoothing and calibration curves
        this.applySmoothingAndCurves(deltaTime);

        this.inputLatency = performance.now() - startTime;
    }

    /**
     * Update keyboard state and map to controls
     */
    updateKeyboardControls() {
        // Throttle (W key)
        this.throttleRaw = this.keys['w'] ? 1.0 : 0.0;

        // Brake (S key)
        this.brakeRaw = this.keys['s'] ? 1.0 : 0.0;

        // Steering (A = -1, D = +1)
        let steeringTarget = 0;
        if (this.keys['a']) steeringTarget -= 1;
        if (this.keys['d']) steeringTarget += 1;
        this.steeringRaw = steeringTarget;
    }

    /**
     * Poll gamepad and update index
     */
    updateGamepadState() {
        const gamepads = navigator.getGamepads();

        // Find first connected gamepad
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i] && gamepads[i].connected) {
                this.gamepadIndex = i;
                this.gamepadActive = true;
                return gamepads[i];
            }
        }

        this.gamepadActive = false;
        return null;
    }

    /**
     * Update controls from gamepad input
     * Dual-analog + trigger support
     */
    updateGamepadControls(gamepad, deltaTime) {
        // Right stick for steering (axis 2)
        let stickX = gamepad.axes[2] || 0;
        stickX = this.applyDeadzone(stickX);
        this.steeringRaw = stickX;

        // Triggers for throttle/brake
        // Standard mapping: LT (axis 4), RT (axis 5)
        // Or buttons 6 (L2), 7 (R2) for PlayStation
        let throttleTrigger = 0;
        let brakeTrigger = 0;

        if (gamepad.axes.length > 5) {
            // Axes mapping
            throttleTrigger = Math.max(0, (gamepad.axes[5] + 1) / 2); // RT: -1 to 1 -> 0 to 1
            brakeTrigger = Math.max(0, (gamepad.axes[4] + 1) / 2);   // LT: -1 to 1 -> 0 to 1
        } else if (gamepad.buttons.length > 7) {
            // Button mapping (pressure-sensitive)
            throttleTrigger = gamepad.buttons[7] ? gamepad.buttons[7].value : 0;
            brakeTrigger = gamepad.buttons[6] ? gamepad.buttons[6].value : 0;
        }

        this.throttleRaw = throttleTrigger;
        this.brakeRaw = brakeTrigger;

        // A button for restart
        if (gamepad.buttons[0] && gamepad.buttons[0].pressed) {
            this.keys['r'] = true;
        } else {
            this.keys['r'] = false;
        }
    }

    /**
     * Apply deadzone filter to analog input
     * Eliminates stick drift
     */
    applyDeadzone(value) {
        if (Math.abs(value) < this.gamepadDeadzone) {
            return 0;
        }

        // Rescale to 0-1 after deadzone
        const sign = Math.sign(value);
        const absolute = Math.abs(value);
        const rescaled = (absolute - this.gamepadDeadzone) / (1 - this.gamepadDeadzone);
        return sign * rescaled;
    }

    /**
     * Apply smoothing (lerp) and gamma correction curves
     * Steering needs precise micro-adjustments at high speed
     * Throttle/brake are more linear
     */
    applySmoothingAndCurves(deltaTime) {
        // Steering smoothing and gamma curve
        const steerTarget = this.steeringRaw * this.steerMaxAngle;
        const steerDelta = steerTarget - this.steering;

        if (Math.abs(steerDelta) > 0.01) {
            // Steering is being actively changed
            const lerpFactor = Math.min(1, this.steerRate * deltaTime);
            this.steering += steerDelta * lerpFactor;
        } else {
            // Return to center
            const returnFactor = Math.min(1, this.steerReturnRate * deltaTime);
            this.steering *= (1 - returnFactor);
        }

        // Apply gamma curve to steering (non-linear response)
        const steerNorm = this.steering / this.steerMaxAngle; // -1 to 1
        const sign = Math.sign(steerNorm);
        const steerGamma = Math.pow(Math.abs(steerNorm), 1 / this.steeringGamma);
        this.steering = sign * steerGamma * this.steerMaxAngle;

        // Throttle smoothing with gamma curve
        this.throttle += (this.throttleRaw - this.throttle) * Math.min(1, this.throttleSensitivity * deltaTime);
        this.throttle = Math.pow(Math.max(0, this.throttle), this.triggerGamma);

        // Brake smoothing with gamma curve
        this.brake += (this.brakeRaw - this.brake) * Math.min(1, this.brakeSensitivity * deltaTime);
        this.brake = Math.pow(Math.max(0, this.brake), this.triggerGamma);
    }

    /**
     * Get steering input normalized to -1 to 1
     */
    getSteering() {
        return this.steering / this.steerMaxAngle;
    }

    /**
     * Get throttle input 0 to 1
     */
    getThrottle() {
        return Math.min(1, this.throttle);
    }

    /**
     * Get brake input 0 to 1
     */
    getBrake() {
        return Math.min(1, this.brake);
    }

    /**
     * Check if restart requested
     */
    isRestartPressed() {
        return this.keys['r'];
    }

    /**
     * Calibrate gamepad deadzone
     */
    calibrateGamepad(testValue) {
        // Auto-adjust deadzone based on input
        if (Math.abs(testValue) < 0.05) {
            this.gamepadDeadzone = Math.min(0.2, this.gamepadDeadzone + 0.01);
        }
    }

    /**
     * Get input latency for profiling
     */
    getLatency() {
        return this.inputLatency;
    }
}

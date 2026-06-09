/**
 * Input Control System
 * Handles keyboard and gamepad inputs with smoothing
 * Supports WASD keyboard and Gamepad API for analog controls
 */

class InputManager {
    constructor() {
        // Keyboard state tracking
        this.keys = {
            'w': false,
            'a': false,
            's': false,
            'd': false,
            ' ': false // space for reset
        };

        // Control outputs (smoothed)
        this.throttle = 0;      // 0-1, player wants to accelerate
        this.brake = 0;         // 0-1, player wants to brake
        this.steering = 0;      // -1 to 1, left to right

        // Input smoothing (prevents abrupt steering)
        this.steeringSensitivity = 0.15; // Lower = slower steering response
        this.throttleSensitivity = 0.12;
        this.brakeSensitivity = 0.12;

        // Gamepad state
        this.gamepadActive = false;
        this.gamepadIndex = -1;

        // Setup event listeners
        this.setupKeyboardListeners();
    }

    /**
     * Setup keyboard event listeners
     * Tracks key press/release states
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
     * Poll gamepad state and update gamepad index if connected
     * Gamepad API requires polling rather than event listeners
     */
    updateGamepadState() {
        const gamepads = navigator.getGamepads();

        // Find first connected gamepad
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                this.gamepadIndex = i;
                this.gamepadActive = true;
                return gamepads[i];
            }
        }

        this.gamepadActive = false;
        return null;
    }

    /**
     * Update all control outputs based on input
     * Combines keyboard and gamepad inputs with smoothing
     */
    update() {
        // Update keyboard-based controls
        this.updateKeyboardControls();

        // Update gamepad controls if available
        const gamepad = this.updateGamepadState();
        if (gamepad && this.gamepadActive) {
            this.updateGamepadControls(gamepad);
        }
    }

    /**
     * Process keyboard input
     * WASD controls with exponential smoothing
     */
    updateKeyboardControls() {
        // Throttle: W key
        const targetThrottle = this.keys['w'] ? 1 : 0;
        this.throttle += (targetThrottle - this.throttle) * this.throttleSensitivity;

        // Brake: S key
        const targetBrake = this.keys['s'] ? 1 : 0;
        this.brake += (targetBrake - this.brake) * this.brakeSensitivity;

        // Steering: A (left) and D (right)
        let targetSteering = 0;
        if (this.keys['a']) targetSteering = -1;
        if (this.keys['d']) targetSteering = 1;

        this.steering += (targetSteering - this.steering) * this.steeringSensitivity;
    }

    /**
     * Process gamepad input
     * Right stick for steering, triggers for throttle/brake
     * @param {Gamepad} gamepad - Gamepad object from navigator.getGamepads()
     */
    updateGamepadControls(gamepad) {
        // Analog sticks (typically axes 0-3)
        // Axis 0: Left stick X
        // Axis 1: Left stick Y
        // Axis 2: Right stick X
        // Axis 3: Right stick Y

        // Use right stick for steering (axis 2)
        const stickX = gamepad.axes[2];
        if (Math.abs(stickX) > 0.1) {
            this.steering = stickX;
        } else {
            this.steering *= 0.95; // Gradual return to center
        }

        // Trigger inputs (buttons or axes depending on gamepad)
        // Most common: R2 (axis 5) for throttle, L2 (axis 4) for brake
        if (gamepad.buttons.length > 7) {
            // Some gamepads use button pressure
            const r2Value = gamepad.buttons[7] ? gamepad.buttons[7].value : 0;
            const l2Value = gamepad.buttons[6] ? gamepad.buttons[6].value : 0;

            this.throttle = r2Value;
            this.brake = l2Value;
        } else if (gamepad.axes.length > 5) {
            // Others use axes
            const r2Axis = gamepad.axes[5];
            const l2Axis = gamepad.axes[4];

            this.throttle = Math.max(0, r2Axis);
            this.brake = Math.max(0, l2Axis);
        }

        // A button (index 0) for reset - alternative to spacebar
        if (gamepad.buttons[0] && gamepad.buttons[0].pressed) {
            this.keys[' '] = true;
        } else {
            this.keys[' '] = false;
        }
    }

    /**
     * Get current steering angle in degrees
     * Useful for steering wheel visualization
     * @returns {number} Steering angle in degrees (-90 to 90)
     */
    getSteeringAngle() {
        return this.steering * 90;
    }

    /**
     * Check if reset key is pressed
     * @returns {boolean}
     */
    isResetPressed() {
        return this.keys[' '];
    }

    /**
     * Get combined throttle (keyboard + gamepad)
     * Already handled in update()
     * @returns {number} 0-1
     */
    getThrottle() {
        return Math.min(this.throttle, 1);
    }

    /**
     * Get combined brake (keyboard + gamepad)
     * Already handled in update()
     * @returns {number} 0-1
     */
    getBrake() {
        return Math.min(this.brake, 1);
    }

    /**
     * Get steering input
     * @returns {number} -1 to 1 (left to right)
     */
    getSteering() {
        return this.steering;
    }
}

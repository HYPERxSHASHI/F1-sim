/**
 * First-Person Camera System
 * Positions camera at driver eye level with smooth movement and G-force dynamics
 * Future phases will add acceleration/braking effects and FOV changes
 */

class DriverCamera {
    constructor(camera, trackGenerator) {
        this.camera = camera;
        this.track = trackGenerator;
        
        // Camera positioning
        this.eyeHeight = 0.9; // Height of driver eyes above chassis (meters)
        this.forwardOffset = 0.2; // Distance forward from center point (meters)
        this.targetPosition = new THREE.Vector3();
        this.currentPosition = new THREE.Vector3(0, this.eyeHeight, 0);
        this.lookAheadDistance = 30; // How far ahead the driver looks
        
        // Camera smoothing
        this.positionSmoothing = 0.15; // Lower = smoother but more lag
        this.rotationSmoothing = 0.1;
        
        // G-force dynamics (populated by vehicle dynamics in Phase 2)
        this.lateralG = 0;
        this.longitudinalG = 0;
        this.verticalG = 0;
        
        // Camera shake parameters
        this.shakeIntensity = 0;
        this.shakeFrequency = 0;
        this.shakeTime = 0;
        
        // Initialize camera
        this.camera.position.copy(this.currentPosition);
        this.camera.fov = 75; // Standard FOV for F1 driver perspective
        this.camera.updateProjectionMatrix();
    }

    /**
     * Update camera position based on player position
     * Implements smooth damping to create cinematic feel
     * @param {THREE.Vector3} playerPosition - Current vehicle position
     * @param {THREE.Vector3} playerDirection - Direction vehicle is facing
     * @param {number} speed - Current vehicle speed (km/h)
     */
    updatePosition(playerPosition, playerDirection, speed = 0) {
        // Calculate target position ahead of the vehicle
        const lookAheadDir = playerDirection.clone().normalize();
        const targetLookPoint = playerPosition.clone()
            .add(lookAheadDir.multiplyScalar(this.lookAheadDistance))
            .add(new THREE.Vector3(0, this.eyeHeight, 0));

        // Apply G-force camera dynamics
        const gForceOffset = new THREE.Vector3(
            this.lateralG * 0.3,  // Lateral lean
            this.longitudinalG * -0.2, // Forward/backward shift
            0
        );

        this.targetPosition.copy(targetLookPoint).add(gForceOffset);

        // Smooth camera movement using exponential damping
        this.currentPosition.lerp(this.targetPosition, this.positionSmoothing);
        this.camera.position.copy(this.currentPosition);

        // Apply camera shake if speed is high
        if (speed > 150) {
            this.applySpeedBasedShake(speed);
        }

        // Look at a point ahead of the vehicle
        const lookAtPoint = playerPosition.clone()
            .add(playerDirection.clone().normalize().multiplyScalar(this.lookAheadDistance * 1.5))
            .add(new THREE.Vector3(0, this.eyeHeight, 0));
        
        this.camera.lookAt(lookAtPoint);
    }

    /**
     * Apply speed-based camera shake and vibration
     * Creates immersion of high-speed driving
     * @param {number} speed - Current vehicle speed (km/h)
     */
    applySpeedBasedShake(speed) {
        // Shake intensity increases with speed
        this.shakeIntensity = (speed - 150) * 0.00005; // Gradually increases
        this.shakeFrequency = speed * 0.02; // Higher speed = faster shake
        this.shakeTime += 0.016; // Increment by ~60fps frame time

        // Generate shake offset using sine waves
        const shakeX = Math.sin(this.shakeTime * this.shakeFrequency) * this.shakeIntensity;
        const shakeY = Math.cos(this.shakeTime * this.shakeFrequency * 0.7) * this.shakeIntensity * 0.5;
        const shakeZ = Math.sin(this.shakeTime * this.shakeFrequency * 0.5) * this.shakeIntensity * 0.3;

        this.camera.position.x += shakeX;
        this.camera.position.y += shakeY;
        this.camera.position.z += shakeZ;
    }

    /**
     * Update camera FOV based on speed
     * Higher speeds get wider FOV to emphasize speed sensation
     * @param {number} speed - Current vehicle speed (km/h)
     */
    updateFOVForSpeed(speed) {
        // Base FOV: 75 degrees
        // At 250+ km/h: expand to ~85 degrees
        const baseFOV = 75;
        const maxFOV = 85;
        const fovThreshold = 250;

        if (speed > fovThreshold) {
            const fovIncrease = ((speed - fovThreshold) / 100) * (maxFOV - baseFOV);
            this.camera.fov = Math.min(baseFOV + fovIncrease, maxFOV);
        } else {
            this.camera.fov = baseFOV;
        }

        this.camera.updateProjectionMatrix();
    }

    /**
     * Simulate braking effect - camera dips down slightly
     * Creates illusion of weight transfer to front tires
     * @param {number} brakePower - Brake intensity (0-1)
     */
    applyBrakingDip(brakePower) {
        this.longitudinalG = -brakePower * 2; // Up to 2G forward on heavy braking
    }

    /**
     * Simulate acceleration effect - camera pushes back
     * Creates illusion of weight transfer to rear tires
     * @param {number} throttlePower - Throttle intensity (0-1)
     */
    applyAccelerationPush(throttlePower) {
        this.longitudinalG = throttlePower * 1.5; // Up to 1.5G backward on acceleration
    }

    /**
     * Simulate cornering effect - camera leans into turn
     * Creates illusion of lateral weight transfer
     * @param {number} steeringAmount - Steering input (-1 to 1)
     * @param {number} lateralAcceleration - Cornering G-forces
     */
    applyCornering(steeringAmount, lateralAcceleration) {
        this.lateralG = steeringAmount * lateralAcceleration;
    }

    /**
     * Reset all dynamic camera effects
     */
    resetDynamics() {
        this.lateralG = 0;
        this.longitudinalG = 0;
        this.verticalG = 0;
        this.shakeIntensity = 0;
        this.shakeTime = 0;
    }
}

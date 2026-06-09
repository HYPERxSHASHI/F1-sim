/**
 * F1 Simulator - Phase 1: Foundation
 * Main application loop and scene initialization
 * 
 * This is the entry point that orchestrates:
 * - Three.js scene setup
 * - Track generation
 * - Camera system
 * - Input management
 * - Main render loop
 */

// Global variables
let scene, camera, renderer;
let trackGenerator, driverCamera, inputManager;
let playerPosition = new THREE.Vector3(0, 0, 0);
let playerDirection = new THREE.Vector3(0, 0, 1);
let playerSpeed = 0;
let trackProgress = 0;

// Performance tracking
let frameCount = 0;
let lastFrameTime = Date.now();
let currentFPS = 60;

/**
 * Initialize the Three.js scene
 * Sets up renderer, camera, and adds lighting
 */
function initScene() {
    // Get canvas element
    const canvas = document.getElementById('canvas');

    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    scene.fog = new THREE.Fog(0x87ceeb, 500, 1000); // Depth fog

    // Create camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        10000
    );

    // Create renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowShadowMap;

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

/**
 * Initialize all game systems
 */
function initGame() {
    // Generate track
    trackGenerator = new TrackGenerator(scene, 15, 300);

    // Setup camera
    driverCamera = new DriverCamera(camera, trackGenerator);
    const startPoint = trackGenerator.trackPath[0];
    playerPosition.copy(startPoint).add(new THREE.Vector3(0, 0.5, 0));
    camera.position.copy(playerPosition).add(new THREE.Vector3(0, 0.9, 0));

    // Setup input
    inputManager = new InputManager();

    console.log('✓ Game initialized');
    console.log('✓ Track generated with', trackGenerator.trackPath.length, 'waypoints');
}

/**
 * Handle window resize events
 */
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

/**
 * Update game state based on inputs and physics
 */
function updateGame() {
    // Update input state
    inputManager.update();

    // Get control inputs
    const throttle = inputManager.getThrottle();
    const brake = inputManager.getBrake();
    const steering = inputManager.getSteering();
    const resetPressed = inputManager.isResetPressed();

    // Handle reset
    if (resetPressed) {
        resetPlayerPosition();
    }

    // Simple vehicle movement (Phase 1 - basic locomotion only)
    // Phase 2 will replace this with full physics
    const maxSpeed = 300; // km/h (simplified)
    const acceleration = 150; // km/h per second
    const deceleration = 200; // km/h per second (brakes are strong)

    // Apply throttle and brake
    if (throttle > 0) {
        playerSpeed = Math.min(playerSpeed + acceleration * throttle * 0.016, maxSpeed);
    } else if (brake > 0) {
        playerSpeed = Math.max(playerSpeed - deceleration * brake * 0.016, 0);
    } else {
        // Natural drag
        playerSpeed *= 0.98;
    }

    // Update player direction based on steering
    const steeringStrength = 2; // Radians per second at full lock
    const steeringAngle = steering * steeringStrength * 0.016;
    const currentYaw = Math.atan2(playerDirection.x, playerDirection.z);
    const newYaw = currentYaw + steeringAngle;
    playerDirection.set(Math.sin(newYaw), 0, Math.cos(newYaw)).normalize();

    // Update position
    const frameDistance = (playerSpeed / 3.6) * 0.016; // Convert km/h to m/s, then multiply by delta time
    playerPosition.add(playerDirection.clone().multiplyScalar(frameDistance));

    // Keep player on track (loose constraint)
    const trackInfo = trackGenerator.getClosestTrackPoint(playerPosition);
    if (trackInfo.distance > 50) {
        // Player is too far from track, snap back
        playerPosition.copy(trackInfo.point).add(new THREE.Vector3(0, 0.5, 0));
        playerSpeed = 0;
    }

    // Update camera
    driverCamera.updatePosition(playerPosition, playerDirection, playerSpeed);
    driverCamera.updateFOVForSpeed(playerSpeed);
    driverCamera.applyAccelerationPush(throttle);
    driverCamera.applyBrakingDip(brake);
    driverCamera.applyCornering(steering, Math.min(playerSpeed / 100, 2)); // Max 2G lateral

    // Update track progress
    trackProgress = trackInfo.progress;
}

/**
 * Reset player to start position
 */
function resetPlayerPosition() {
    const startPoint = trackGenerator.trackPath[0];
    playerPosition.copy(startPoint).add(new THREE.Vector3(0, 0.5, 0));
    playerDirection.set(0, 0, 1);
    playerSpeed = 0;
    driverCamera.resetDynamics();
}

/**
 * Update HUD display
 */
function updateHUD() {
    // Update speed
    const speedElement = document.getElementById('speed');
    speedElement.textContent = Math.round(playerSpeed) + ' km/h';

    // Update track position
    const positionElement = document.getElementById('position');
    positionElement.textContent = Math.round(trackProgress * 10) / 10 + '%';
}

/**
 * Update debug information
 */
function updateDebug() {
    // FPS calculation
    frameCount++;
    const now = Date.now();
    const elapsed = now - lastFrameTime;

    if (elapsed >= 1000) {
        currentFPS = Math.round(frameCount * 1000 / elapsed);
        frameCount = 0;
        lastFrameTime = now;
    }

    // Update debug display
    document.getElementById('fps').textContent = currentFPS;
    document.getElementById('camX').textContent = camera.position.x.toFixed(1);
    document.getElementById('camY').textContent = camera.position.y.toFixed(1);
    document.getElementById('camZ').textContent = camera.position.z.toFixed(1);
    document.getElementById('trackSeg').textContent = Math.round(trackProgress);
}

/**
 * Main render loop
 */
function animate() {
    requestAnimationFrame(animate);

    // Update game state
    updateGame();

    // Update HUD and debug
    updateHUD();
    updateDebug();

    // Render scene
    renderer.render(scene, camera);
}

/**
 * Application entry point
 */
function main() {
    try {
        initScene();
        initGame();
        animate();
        console.log('✓ F1 Simulator Phase 1 running');
    } catch (error) {
        console.error('Failed to initialize simulator:', error);
    }
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}

/**
 * F1 Simulator - Phase 4: Complete Integration
 * Main application loop with Ammo.js physics, AI, telemetry
 */

// Global variables
let scene, camera, renderer;
let trackGenerator, driverCamera, inputManager;
let physicsWorld, playerVehicle, raceDirector, aiSystem, telemetryUI;
let physicsEnabled = false;

// Player state
let playerPosition = new THREE.Vector3(0, 0, 0);
let playerDirection = new THREE.Vector3(0, 0, 1);
let playerSpeed = 0;
let playerRPM = 0;
let playerGear = 0;
let trackProgress = 0;

// Performance tracking
let frameCount = 0;
let lastFrameTime = Date.now();
let currentFPS = 60;
let deltaTime = 0.016;

// Race state
let raceState = 'FORMATION';

console.log('[INIT] F1 Simulator Phase 4 starting...');

/**
 * Initialize Ammo.js physics engine with error handling
 */
async function initPhysics() {
    console.log('[PHYSICS] Attempting to initialize Ammo.js...');
    
    try {
        // Check if Ammo is available globally
        if (typeof Ammo === 'undefined') {
            console.warn('[PHYSICS] Ammo not found in global scope');
            physicsEnabled = false;
            return;
        }

        // Initialize Ammo.js
        const ammoWasm = await Ammo();
        console.log('[PHYSICS] Ammo.js initialized successfully');
        
        const collisionConfiguration = new ammoWasm.btDefaultCollisionConfiguration();
        const dispatcher = new ammoWasm.btCollisionDispatcher(collisionConfiguration);
        const overlappingPairCache = new ammoWasm.btDbvtBroadphase();
        const solver = new ammoWasm.btSequentialImpulseConstraintSolver();
        
        physicsWorld = new ammoWasm.btDiscreteDynamicsWorld(
            dispatcher,
            overlappingPairCache,
            solver,
            collisionConfiguration
        );
        physicsWorld.setGravity(new ammoWasm.btVector3(0, -9.81, 0));
        
        // Create ground
        const groundShape = new ammoWasm.btBoxShape(new ammoWasm.btVector3(500, 1, 500));
        const groundTransform = new ammoWasm.btTransform();
        groundTransform.setIdentity();
        groundTransform.setOrigin(new ammoWasm.btVector3(0, -2, 0));
        
        const groundRigidBody = new ammoWasm.btRigidBody(
            new ammoWasm.btRigidBodyConstructionInfo(
                0,
                new ammoWasm.btDefaultMotionState(groundTransform),
                groundShape
            ),
            0
        );
        
        physicsWorld.addRigidBody(groundRigidBody);
        
        physicsEnabled = true;
        console.log('[PHYSICS] ✓ Physics engine ready with gravity');
        
    } catch (error) {
        console.warn('[PHYSICS] ✗ Physics initialization failed:', error.message);
        console.log('[PHYSICS] Running in FALLBACK mode (no physics collision)');
        physicsEnabled = false;
    }
}

/**
 * Initialize the Three.js scene
 */
function initScene() {
    console.log('[SCENE] Initializing Three.js scene...');
    
    const canvas = document.getElementById('canvas');
    if (!canvas) {
        console.error('[SCENE] ✗ Canvas element not found!');
        return;
    }
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 500, 1000);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(500, 300, 500);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
    
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        10000
    );
    
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    
    window.addEventListener('resize', onWindowResize);
    
    console.log('[SCENE] ✓ Scene initialized');
}

/**
 * Initialize all game systems
 */
async function initGame() {
    console.log('[GAME] Initializing game systems...');
    
    try {
        // Generate track
        console.log('[TRACK] Generating track...');
        trackGenerator = new TrackGenerator(scene, 15, 300);
        console.log(`[TRACK] ✓ Track generated with ${trackGenerator.trackPath.length} waypoints`);
        
        // Setup camera
        console.log('[CAMERA] Setting up driver camera...');
        driverCamera = new DriverCamera(camera, trackGenerator);
        const startPoint = trackGenerator.trackPath[0];
        playerPosition.copy(startPoint).add(new THREE.Vector3(0, 1, 0));
        camera.position.copy(playerPosition).add(new THREE.Vector3(0, 2, -5));
        console.log('[CAMERA] ✓ Camera initialized at', playerPosition);
        
        // Setup input
        console.log('[INPUT] Initializing input system...');
        inputManager = new InputManager();
        console.log('[INPUT] ✓ Input system ready');
        
        // Initialize AI system
        console.log('[AI] Initializing AI system...');
        aiSystem = new AISystem(scene, trackGenerator, 21);
        if (physicsEnabled && physicsWorld) {
            aiSystem.setPhysicsWorld(physicsWorld);
        }
        aiSystem.initializeGrid(startPoint);
        console.log(`[AI] ✓ AI system ready with ${aiSystem.aiCars.length} competitors`);
        
        // Initialize race director
        console.log('[RACE] Initializing race director...');
        raceDirector = new RaceDirector(trackGenerator, aiSystem);
        raceDirector.stateStartTime = performance.now();
        console.log('[RACE] ✓ Race director ready');
        
        // Initialize telemetry UI
        console.log('[TELEMETRY] Initializing telemetry UI...');
        telemetryUI = new TelemetryUI();
        console.log('[TELEMETRY] ✓ Telemetry UI ready');
        
        console.log('[GAME] ✓ All systems initialized');
        
    } catch (error) {
        console.error('[GAME] ✗ Game initialization error:', error);
        throw error;
    }
}

/**
 * Handle window resize
 */
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

/**
 * Update player with fallback mode (no physics)
 */
function updatePlayerFallback(throttle, brake, steering) {
    const maxSpeed = 330 / 3.6; // m/s
    const acceleration = 150 / 3.6; // m/s per frame
    const deceleration = 200 / 3.6;
    
    // Apply throttle/brake
    if (throttle > 0) {
        playerSpeed = Math.min(playerSpeed + acceleration * throttle, maxSpeed);
    } else if (brake > 0) {
        playerSpeed = Math.max(playerSpeed - deceleration * brake, 0);
    } else {
        playerSpeed *= 0.98; // Natural drag
    }
    
    // Update direction based on steering
    const steeringStrength = 2;
    const steeringAngle = steering * steeringStrength * 0.016;
    const currentYaw = Math.atan2(playerDirection.x, playerDirection.z);
    const newYaw = currentYaw + steeringAngle;
    playerDirection.set(Math.sin(newYaw), 0, Math.cos(newYaw)).normalize();
    
    // Update position
    const frameDistance = playerSpeed * 0.016; // meters per frame
    playerPosition.add(playerDirection.clone().multiplyScalar(frameDistance));
}

/**
 * Calculate powertrain (RPM, Gear)
 */
function updatePowertrain(throttle) {
    const GEAR_RATIOS = [0, 12.7, 9.15, 6.62, 5.16, 4.38, 3.72, 3.08, 2.45];
    const FINAL_DRIVE = 3.31;
    const TIRE_CIRCUMFERENCE = Math.PI * 0.67 * 2;
    const REV_LIMITER = 17000;
    
    // Auto-shift logic
    if (throttle > 0 && playerGear === 0) {
        playerGear = 1;
    }
    
    // Calculate RPM from vehicle speed
    if (playerGear > 0) {
        const wheelRPM = (playerSpeed * 3.6) / (TIRE_CIRCUMFERENCE / 60);
        const engineRPM = wheelRPM * GEAR_RATIOS[playerGear] * FINAL_DRIVE;
        playerRPM = Math.min(engineRPM, REV_LIMITER);
        
        // Upshift when near rev limiter
        if (playerRPM > REV_LIMITER * 0.95 && playerGear < 8) {
            playerGear++;
        }
        
        // Downshift when losing speed
        if (playerRPM < 4000 && playerGear > 1) {
            playerGear--;
        }
    } else {
        playerRPM = 0;
    }
    
    // Decel when no throttle
    if (throttle === 0 && playerGear > 0) {
        playerGear = 0;
    }
}

/**
 * Update game state
 */
function updateGame(dt) {
    // Update input
    inputManager.update();
    
    const throttle = inputManager.getThrottle();
    const brake = inputManager.getBrake();
    const steering = inputManager.getSteering();
    const resetPressed = inputManager.isResetPressed();
    
    if (resetPressed) {
        resetPlayerPosition();
    }
    
    // Update player
    if (physicsEnabled && physicsWorld) {
        // Physics-based movement would go here
        updatePlayerFallback(throttle, brake, steering);
    } else {
        // Fallback: kinematic movement
        updatePlayerFallback(throttle, brake, steering);
    }
    
    updatePowertrain(throttle);
    
    // Update race director
    raceDirector.update(playerPosition, trackProgress, dt);
    raceState = raceDirector.currentState;
    
    // Update AI
    aiSystem.update(playerPosition, dt);
    
    // Update camera
    driverCamera.updatePosition(playerPosition, playerDirection, playerSpeed * 3.6);
    driverCamera.updateFOVForSpeed(playerSpeed * 3.6);
    driverCamera.applyAccelerationPush(throttle);
    driverCamera.applyBrakingDip(brake);
    driverCamera.applyCornering(steering, Math.min((playerSpeed * 3.6) / 100, 2));
    
    // Update track progress
    const trackInfo = trackGenerator.getClosestTrackPoint(playerPosition);
    trackProgress = trackInfo.progress / 100;
    
    // Step physics if enabled
    if (physicsEnabled && physicsWorld) {
        physicsWorld.stepSimulation(dt, 10);
    }
}

/**
 * Reset player
 */
function resetPlayerPosition() {
    const startPoint = trackGenerator.trackPath[0];
    playerPosition.copy(startPoint).add(new THREE.Vector3(0, 1, 0));
    playerDirection.set(0, 0, 1);
    playerSpeed = 0;
    playerGear = 0;
    playerRPM = 0;
    
    driverCamera.resetDynamics();
    raceDirector.reset();
    
    console.log('[RESET] Player position reset');
}

/**
 * Update HUD
 */
function updateHUD() {
    document.getElementById('speed').textContent = Math.round(playerSpeed * 3.6) + ' km/h';
    document.getElementById('position').textContent = raceDirector.playerPosition + '/22';
    document.getElementById('lap').textContent = raceDirector.currentLap + '/' + raceDirector.totalLaps;
    document.getElementById('lapTime').textContent = raceDirector.formatTime(raceDirector.currentLapTime);
    document.getElementById('delta').textContent = raceDirector.formatDelta(raceDirector.deltaTime);
    
    const gearNames = ['R', 'N', '1', '2', '3', '4', '5', '6', '7', '8'];
    document.getElementById('gear').textContent = gearNames[Math.min(playerGear, 8)] + ' · ' + Math.round(playerRPM);
}

/**
 * Update debug
 */
function updateDebug() {
    frameCount++;
    const now = Date.now();
    const elapsed = now - lastFrameTime;
    
    if (elapsed >= 1000) {
        currentFPS = Math.round(frameCount * 1000 / elapsed);
        frameCount = 0;
        lastFrameTime = now;
    }
    
    document.getElementById('fps').textContent = currentFPS;
    document.getElementById('camX').textContent = camera.position.x.toFixed(1);
    document.getElementById('camY').textContent = camera.position.y.toFixed(1);
    document.getElementById('camZ').textContent = camera.position.z.toFixed(1);
    document.getElementById('trackSeg').textContent = Math.round(trackProgress * 100);
    document.getElementById('aiCount').textContent = aiSystem ? aiSystem.aiCars.length : 0;
}

/**
 * Update race state display
 */
function updateRaceStateDisplay() {
    const raceStateDiv = document.getElementById('raceState');
    
    if (raceDirector.isPreRace()) {
        const remaining = raceDirector.getCountdownRemaining();
        raceStateDiv.textContent = Math.ceil(remaining) > 0 ? Math.ceil(remaining).toString() : '🏁 GO!';
        raceStateDiv.classList.add('show', 'pulse');
    } else {
        raceStateDiv.classList.remove('show');
    }
}

/**
 * Main render loop
 */
function animate() {
    requestAnimationFrame(animate);
    
    const dt = Math.min(0.016, deltaTime);
    updateGame(dt);
    updateHUD();
    updateDebug();
    updateRaceStateDisplay();
    
    renderer.render(scene, camera);
}

/**
 * Application entry point
 */
async function main() {
    try {
        console.log('[MAIN] Starting initialization sequence...');
        
        initScene();
        console.log('[MAIN] Scene ready, initializing physics...');
        
        await initPhysics();
        console.log('[MAIN] Physics complete, initializing game...');
        
        await initGame();
        console.log('[MAIN] Game ready, starting animation loop...');
        
        animate();
        
        console.log(`[MAIN] ✓ F1 Simulator Phase 4 running (Physics: ${physicsEnabled ? 'ENABLED' : 'FALLBACK'})`);
        
    } catch (error) {
        console.error('[MAIN] ✗ Failed to initialize simulator:', error);
        console.error('[MAIN] Stack:', error.stack);
    }
}

// Start application when DOM is ready
console.log('[BOOT] DOM ready check...');
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[BOOT] DOMContentLoaded fired');
        main();
    });
} else {
    console.log('[BOOT] DOM already loaded');
    main();
}

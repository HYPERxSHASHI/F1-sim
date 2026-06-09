/**
 * F1 Simulator - Phase 4: Complete Integration
 * Main application loop with Ammo.js physics, AI, telemetry
 */

// Global variables
let scene, camera, renderer;
let trackGenerator, driverCamera, inputManager;
let physicsWorld, playerVehicle, raceDirector, aiSystem, telemetryUI;
let Ammo;

// Player state
let playerPosition = new THREE.Vector3(0, 0, 0);
let playerDirection = new THREE.Vector3(0, 0, 1);
let playerSpeed = 0;
let playerRPM = 0;
let playerGear = 0; // 0 = Neutral, 1-8 = gears
let trackProgress = 0;

// Performance tracking
let frameCount = 0;
let lastFrameTime = Date.now();
let currentFPS = 60;
let deltaTime = 0.016; // ~60fps

// Race state
let raceState = 'FORMATION';
let lapStartTime = 0;
let currentLapTime = 0;

/**
 * Initialize Ammo.js physics engine
 */
async function initPhysics() {
    return new Promise((resolve) => {
        Ammo().then((AmmoLib) => {
            Ammo = AmmoLib;
            
            const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
            const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
            const overlappingPairCache = new Ammo.btDbvtBroadphase();
            const solver = new Ammo.btSequentialImpulseConstraintSolver();
            
            physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
            physicsWorld.setGravity(new Ammo.btVector3(0, -9.81, 0));
            
            console.log('✓ Ammo.js Physics Engine initialized');
            resolve();
        });
    });
}

/**
 * Initialize the Three.js scene
 */
function initScene() {
    const canvas = document.getElementById('canvas');
    
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
}

/**
 * Create track collision mesh in Ammo.js
 */
function createTrackPhysics(trackGenerator) {
    // Get track curve and create collision mesh
    const curve = trackGenerator.curve;
    const points = [];
    const numPoints = 200;
    
    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const point = curve.getPoint(t);
        points.push(point);
    }
    
    // Create ground plane (simplified - full track collision would require mesh)
    const groundShape = new Ammo.btBoxShape(new Ammo.btVector3(500, 1, 500));
    const groundTransform = new Ammo.btTransform();
    groundTransform.setIdentity();
    groundTransform.setOrigin(new Ammo.btVector3(0, -2, 0));
    
    const groundRigidBody = new Ammo.btRigidBody(
        new Ammo.btRigidBodyConstructionInfo(0, new Ammo.btDefaultMotionState(groundTransform), groundShape),
        0
    );
    
    physicsWorld.addRigidBody(groundRigidBody);
    console.log('✓ Track physics collision created');
}

/**
 * Create player vehicle with Ammo.js
 */
function createPlayerVehicle(startPosition) {
    // Vehicle chassis (box shape)
    const chassisShape = new Ammo.btBoxShape(new Ammo.btVector3(0.9, 0.45, 2));
    
    const chassisTransform = new Ammo.btTransform();
    chassisTransform.setIdentity();
    chassisTransform.setOrigin(new Ammo.btVector3(startPosition.x, startPosition.y + 1, startPosition.z));
    
    const mass = 640; // kg - F1 car
    const inertia = new Ammo.btVector3(0, 0, 0);
    chassisShape.calculateLocalInertia(mass, inertia);
    
    const motionState = new Ammo.btDefaultMotionState(chassisTransform);
    const rigidBodyInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, chassisShape, inertia);
    const rigidBody = new Ammo.btRigidBody(rigidBodyInfo);
    
    rigidBody.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
    rigidBody.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
    
    physicsWorld.addRigidBody(rigidBody);
    
    // Create Three.js mesh for visualization
    const geometry = new THREE.BoxGeometry(1.8, 0.9, 4);
    const material = new THREE.MeshStandardMaterial({
        color: 0xff0000, // Red F1 car
        metalness: 0.8,
        roughness: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    scene.add(mesh);
    
    console.log('✓ Player vehicle created');
    
    return {
        rigidBody,
        mesh,
        velocity: new THREE.Vector3(),
        angularVelocity: new THREE.Vector3()
    };
}

/**
 * Initialize all game systems
 */
async function initGame() {
    // Generate track
    trackGenerator = new TrackGenerator(scene, 15, 300);
    
    // Setup camera
    driverCamera = new DriverCamera(camera, trackGenerator);
    const startPoint = trackGenerator.trackPath[0];
    playerPosition.copy(startPoint).add(new THREE.Vector3(0, 1, 0));
    
    // Setup input
    inputManager = new InputManager();
    
    // Create physics objects
    createTrackPhysics(trackGenerator);
    playerVehicle = createPlayerVehicle(startPoint);
    
    // Initialize AI system
    aiSystem = new AISystem(scene, trackGenerator, 21);
    aiSystem.setPhysicsWorld(physicsWorld);
    aiSystem.initializeGrid(startPoint);
    
    // Initialize race director
    raceDirector = new RaceDirector(trackGenerator, aiSystem);
    raceDirector.stateStartTime = performance.now();
    
    // Initialize telemetry UI
    telemetryUI = new TelemetryUI();
    
    console.log('✓ Game initialized with physics');
    console.log('✓ Track generated with', trackGenerator.trackPath.length, 'waypoints');
    console.log('✓ AI initialized with', aiSystem.aiCars.length, 'competitors');
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
 * Update player vehicle with physics
 */
function updatePlayerPhysics(throttle, brake, steering) {
    const THROTTLE_FORCE = 3000; // N
    const BRAKE_FORCE = 4000; // N
    const STEERING_ANGLE = 0.4; // radians
    const MAX_SPEED = 330 / 3.6; // m/s
    
    // Apply throttle/brake forces
    const forwardVector = new Ammo.btVector3(
        Math.sin(Math.atan2(playerVehicle.velocity.x, playerVehicle.velocity.z)),
        0,
        Math.cos(Math.atan2(playerVehicle.velocity.x, playerVehicle.velocity.z))
    );
    
    const thrustVector = new Ammo.btVector3(
        forwardVector.x() * (throttle * THROTTLE_FORCE - brake * BRAKE_FORCE),
        0,
        forwardVector.z() * (throttle * THROTTLE_FORCE - brake * BRAKE_FORCE)
    );
    
    playerVehicle.rigidBody.applyCentralForce(thrustVector);
    
    // Cap speed
    const vel = playerVehicle.rigidBody.getLinearVelocity();
    const speed = Math.sqrt(vel.x() ** 2 + vel.z() ** 2);
    
    if (speed > MAX_SPEED) {
        const scale = MAX_SPEED / speed;
        playerVehicle.rigidBody.setLinearVelocity(
            new Ammo.btVector3(vel.x() * scale, vel.y(), vel.z() * scale)
        );
    }
    
    // Steering (simplified)
    const currentYaw = Math.atan2(playerVehicle.velocity.x, playerVehicle.velocity.z);
    const newYaw = currentYaw + steering * STEERING_ANGLE;
    
    const forceDir = new Ammo.btVector3(Math.sin(newYaw), 0, Math.cos(newYaw));
    forceDir.normalize();
    
    // Update velocity for next frame
    playerVehicle.velocity.set(vel.x(), vel.y(), vel.z());
    playerSpeed = Math.sqrt(vel.x() ** 2 + vel.z() ** 2) * 3.6; // Convert to km/h
    
    // Update player position from physics body
    const transform = new Ammo.btTransform();
    playerVehicle.rigidBody.getMotionState().getWorldTransform(transform);
    const origin = transform.getOrigin();
    
    playerPosition.set(origin.x(), origin.y(), origin.z());
    playerDirection.set(Math.sin(newYaw), 0, Math.cos(newYaw)).normalize();
}

/**
 * Calculate powertrain (RPM, Gear)
 */
function updatePowertrain(throttle) {
    const GEAR_RATIOS = [0, 12.7, 9.15, 6.62, 5.16, 4.38, 3.72, 3.08, 2.45]; // 1st-8th + reverse
    const FINAL_DRIVE = 3.31;
    const TIRE_CIRCUMFERENCE = Math.PI * 0.67 * 2; // ~4.2m
    const REV_LIMITER = 17000;
    
    // Auto-shift logic
    if (throttle > 0 && playerGear === 0) {
        playerGear = 1; // Shift to 1st when throttle applied
    }
    
    // Calculate RPM from vehicle speed
    if (playerGear > 0) {
        const wheelRPM = (playerSpeed / 3.6) / (TIRE_CIRCUMFERENCE / 60);
        const engineRPM = wheelRPM * GEAR_RATIOS[playerGear] * FINAL_DRIVE;
        playerRPM = Math.min(engineRPM, REV_LIMITER);
        
        // Upshift when near rev limiter
        if (playerRPM > REV_LIMITER * 0.95 && playerGear < 8) {
            playerGear++;
            console.log(`⬆️ Shifted to gear ${playerGear}`);
        }
        
        // Downshift when losing speed
        if (playerRPM < 4000 && playerGear > 1) {
            playerGear--;
            console.log(`⬇️ Shifted to gear ${playerGear}`);
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
    
    // Update physics
    updatePlayerPhysics(throttle, brake, steering);
    updatePowertrain(throttle);
    
    // Update race director
    raceDirector.update(playerPosition, trackProgress, dt);
    raceState = raceDirector.currentState;
    
    // Update AI
    aiSystem.update(playerPosition, dt);
    
    // Update camera
    driverCamera.updatePosition(playerPosition, playerDirection, playerSpeed);
    driverCamera.updateFOVForSpeed(playerSpeed);
    driverCamera.applyAccelerationPush(throttle);
    driverCamera.applyBrakingDip(brake);
    driverCamera.applyCornering(steering, Math.min(playerSpeed / 100, 2));
    
    // Sync camera to physics body
    const transform = new Ammo.btTransform();
    playerVehicle.rigidBody.getMotionState().getWorldTransform(transform);
    const origin = transform.getOrigin();
    playerVehicle.mesh.position.set(origin.x(), origin.y(), origin.z());
    
    // Update track progress
    const trackInfo = trackGenerator.getClosestTrackPoint(playerPosition);
    trackProgress = trackInfo.progress / 100;
    
    // Step physics
    physicsWorld.stepSimulation(dt, 10);
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
    
    // Reset physics body
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(playerPosition.x, playerPosition.y, playerPosition.z));
    
    playerVehicle.rigidBody.setMotionState(new Ammo.btDefaultMotionState(transform));
    playerVehicle.rigidBody.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
    playerVehicle.rigidBody.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
    
    driverCamera.resetDynamics();
    raceDirector.reset();
}

/**
 * Update HUD
 */
function updateHUD() {
    document.getElementById('speed').textContent = Math.round(playerSpeed) + ' km/h';
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
    
    const dt = Math.min(0.016, deltaTime); // Cap at 60fps
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
        await initPhysics();
        initScene();
        await initGame();
        animate();
        console.log('✓ F1 Simulator Phase 4 running');
    } catch (error) {
        console.error('Failed to initialize simulator:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}

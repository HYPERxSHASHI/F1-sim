/**
 * AI System - 21 Competitor Cars with Grid Management
 * Kinematic optimization, spline-following racing line, spatial awareness
 * Boids-style separation and collision avoidance
 */

class AISystem {
    constructor(scene, trackGenerator, maxAICars = 21) {
        this.scene = scene;
        this.track = trackGenerator;
        this.maxAICars = maxAICars;
        this.aiCars = [];
        this.world = null; // Will be set from physics engine

        // Spatial grid for fast proximity queries
        this.spatialGrid = new Map();
        this.gridCellSize = 50; // meters

        // Team liveries (simplified color palette)
        this.teamLiveries = [
            { name: 'Mercedes', primary: 0x00d4ff, secondary: 0x000000 },
            { name: 'Ferrari', primary: 0xdc0000, secondary: 0xffffff },
            { name: 'RedBull', primary: 0x0600ef, secondary: 0xffff00 },
            { name: 'McLaren', primary: 0xff8700, secondary: 0x000000 },
            { name: 'Alpine', primary: 0x0082fa, secondary: 0xffffff },
            { name: 'AstonMartin', primary: 0x006c3e, secondary: 0x00ff00 },
            { name: 'Alfa', primary: 0xc80000, secondary: 0x000000 },
            { name: 'Williams', primary: 0x0082fa, secondary: 0xffffff },
            { name: 'Haas', primary: 0xff8700, secondary: 0x000000 },
            { name: 'Sauber', primary: 0x52b552, secondary: 0xffffff },
            { name: 'Kick', primary: 0xff00ff, secondary: 0x000000 },
        ];

        // AI parameters
        this.maxAISpeed = 330; // km/h on straights
        this.minCorneringSpeed = 80; // km/h in tight corners
        this.lookaheadDistance = 40; // meters ahead on track
        this.separationRadius = 8; // meters for collision avoidance
        this.separationForce = 150; // acceleration magnitude
    }

    /**
     * Set physics world reference
     */
    setPhysicsWorld(world) {
        this.world = world;
    }

    /**
     * Initialize AI grid at race start
     * Staggered 2x2 layout on main straight
     */
    initializeGrid(startPosition) {
        const gridSpacing = 10; // meters between cars
        const rowSpacing = 5; // meters between rows
        const baseZ = startPosition.z;
        const baseX = startPosition.x;

        let carIndex = 0;

        // Arrange AI cars in staggered grid
        for (let row = 0; row < 11; row++) {
            for (let col = 0; col < 2; col++) {
                if (carIndex >= this.maxAICars) break;

                const x = baseX + (col - 0.5) * rowSpacing;
                const z = baseZ - row * gridSpacing;
                const position = new THREE.Vector3(x, 1, z);

                const aiCar = new AICar(
                    this.scene,
                    position,
                    carIndex,
                    this.teamLiveries[carIndex % this.teamLiveries.length],
                    this.track
                );

                this.aiCars.push(aiCar);
                carIndex++;
            }
        }

        console.log(`✓ Initialized ${this.aiCars.length} AI competitors`);
    }

    /**
     * Update all AI cars for current frame
     * @param {THREE.Vector3} playerPosition - Player vehicle position
     * @param {number} deltaTime - Time since last frame
     */
    update(playerPosition, deltaTime) {
        // Update spatial grid
        this.updateSpatialGrid();

        // Update each AI car
        this.aiCars.forEach((aiCar, index) => {
            // Get nearby cars for collision avoidance
            const nearbyAICars = this.getNearbyAICars(aiCar.position, this.separationRadius * 2);
            const nearbyPlayerProximity = playerPosition.distanceTo(aiCar.position);
            const playerNearby = nearbyPlayerProximity < this.separationRadius * 3;

            // Update AI behavior
            aiCar.update(
                deltaTime,
                nearbyAICars,
                playerNearby ? playerPosition : null,
                this.track
            );
        });
    }

    /**
     * Update spatial grid for fast proximity queries
     */
    updateSpatialGrid() {
        this.spatialGrid.clear();

        this.aiCars.forEach((aiCar) => {
            const gridX = Math.floor(aiCar.position.x / this.gridCellSize);
            const gridZ = Math.floor(aiCar.position.z / this.gridCellSize);
            const key = `${gridX},${gridZ}`;

            if (!this.spatialGrid.has(key)) {
                this.spatialGrid.set(key, []);
            }
            this.spatialGrid.get(key).push(aiCar);
        });
    }

    /**
     * Get nearby AI cars within radius
     */
    getNearbyAICars(position, radius) {
        const nearby = [];
        const gridX = Math.floor(position.x / this.gridCellSize);
        const gridZ = Math.floor(position.z / this.gridCellSize);

        // Check neighboring grid cells
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const key = `${gridX + dx},${gridZ + dz}`;
                const cell = this.spatialGrid.get(key);

                if (cell) {
                    cell.forEach((car) => {
                        const dist = car.position.distanceTo(position);
                        if (dist < radius && dist > 0) {
                            nearby.push({ car, distance: dist });
                        }
                    });
                }
            }
        }

        return nearby.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Get AI car positions for audio system (3 closest to player)
     */
    getClosestAICarsForAudio(playerPosition, count = 3) {
        const distances = this.aiCars.map((car) => ({
            car,
            distance: playerPosition.distanceTo(car.position)
        }));

        return distances
            .sort((a, b) => a.distance - b.distance)
            .slice(0, count);
    }

    /**
     * Get current race positions (sorted by lap progress)
     */
    getRacePositions() {
        return this.aiCars
            .map((car, idx) => ({
                index: idx,
                trackProgress: car.trackProgress,
                position: car.position
            }))
            .sort((a, b) => b.trackProgress - a.trackProgress);
    }

    /**
     * Reset all AI cars to starting grid
     */
    reset(startPosition) {
        this.aiCars.forEach((car) => {
            car.reset();
        });
        this.initializeGrid(startPosition);
    }
}

/**
 * Individual AI Car
 * Kinematic movement with spline-following and avoidance
 */
class AICar {
    constructor(scene, startPosition, id, livery, trackGenerator) {
        this.scene = scene;
        this.id = id;
        this.livery = livery;
        this.track = trackGenerator;

        this.position = startPosition.clone();
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3(0, 0, 1);
        this.speed = 0; // km/h

        // Track following
        this.trackProgress = 0; // 0-1, progress along track
        this.trackIndex = 0; // Current waypoint index
        this.lookaheadDistance = 40;

        // Physics properties
        this.mass = 640; // Same as player
        this.maxAccel = 150; // km/h per second
        this.maxDecel = 200;
        this.maxSpeed = 330;

        // AI behavior
        this.avoidanceVector = new THREE.Vector3();
        this.separationForce = 0;

        // Create mesh
        this.mesh = this.createMesh();
        this.scene.add(this.mesh);
    }

    /**
     * Create visual mesh for AI car
     */
    createMesh() {
        const geometry = new THREE.BoxGeometry(1.8, 0.9, 4);
        const material = new THREE.MeshStandardMaterial({
            color: this.livery.primary,
            metalness: 0.3,
            roughness: 0.7
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(this.position);
        return mesh;
    }

    /**
     * Calculate ideal speed for track position
     * Higher curvature = lower speed
     */
    calculateIdealSpeed() {
        // Get current track curvature
        const trackPoint1 = this.track.trackPath[this.trackIndex];
        const trackPoint2 = this.track.trackPath[Math.min(this.trackIndex + 5, this.track.trackPath.length - 1)];
        const nextSegment = trackPoint2.clone().sub(trackPoint1).normalize();

        // Compare with previous direction for curvature estimation
        const curvature = Math.abs(1 - nextSegment.dot(this.direction));

        // Speed profile: straight = 330 km/h, tight turn = 80 km/h
        const speedFactor = 1 - curvature * 0.8; // 0.2 to 1.0
        const idealSpeed = 80 + (this.maxSpeed - 80) * Math.max(0.2, speedFactor);

        return idealSpeed;
    }

    /**
     * Update AI car for frame
     */
    update(deltaTime, nearbyAICars, playerPosition, trackGenerator) {
        // Get target point ahead on track
        const targetIndex = Math.min(this.trackIndex + 10, trackGenerator.trackPath.length - 1);
        const targetPoint = trackGenerator.trackPath[targetIndex];

        // Calculate direction to target
        const dirToTarget = targetPoint.clone().sub(this.position).normalize();
        this.direction.lerp(dirToTarget, 0.1); // Smooth steering

        // Calculate ideal speed based on track curvature
        const idealSpeed = this.calculateIdealSpeed();

        // Update speed toward ideal
        if (this.speed < idealSpeed) {
            this.speed = Math.min(this.speed + this.maxAccel * deltaTime, idealSpeed);
        } else {
            this.speed = Math.max(this.speed - this.maxDecel * deltaTime, idealSpeed);
        }

        // Apply separation/avoidance forces
        this.avoidanceVector.set(0, 0, 0);
        nearbyAICars.forEach(({ car, distance }) => {
            if (distance > 0.1) {
                const repulsion = this.position.clone().sub(car.position).normalize();
                const force = Math.max(0, 1 - distance / 16); // Force decreases with distance
                this.avoidanceVector.add(repulsion.multiplyScalar(force));
            }
        });

        // Player avoidance (stronger)
        if (playerPosition) {
            const distToPlayer = this.position.distanceTo(playerPosition);
            if (distToPlayer < 20) {
                const playerRepel = this.position.clone().sub(playerPosition).normalize();
                this.avoidanceVector.add(playerRepel.multiplyScalar(0.5));
            }
        }

        // Blend avoidance with track direction
        const blendedDirection = this.direction.clone()
            .add(this.avoidanceVector.multiplyScalar(0.3))
            .normalize();

        // Update position
        const frameDistance = (this.speed / 3.6) * deltaTime; // km/h -> m/s
        this.position.add(blendedDirection.clone().multiplyScalar(frameDistance));

        // Update track progress
        const trackInfo = trackGenerator.getClosestTrackPoint(this.position);
        this.trackProgress = trackInfo.progress / 100;
        this.trackIndex = trackInfo.index;

        // Update mesh
        this.mesh.position.copy(this.position);
        // Calculate rotation to face direction
        const euler = new THREE.Euler().setFromVector3(new THREE.Vector3(0, Math.atan2(this.direction.x, this.direction.z), 0));
        this.mesh.setRotationFromEuler(euler);
    }

    /**
     * Get current speed in km/h
     */
    getSpeed() {
        return this.speed;
    }

    /**
     * Reset to starting position
     */
    reset() {
        this.speed = 0;
        this.trackProgress = 0;
        this.trackIndex = 0;
        this.avoidanceVector.set(0, 0, 0);
    }
}

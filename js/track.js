/**
 * Track Generation System
 * Generates a procedurally created track using Catmull-Rom spline interpolation
 * Features: Smooth curves, asphalt surface, rumble strips, and barrier walls
 */

class TrackGenerator {
    constructor(scene, trackWidth = 15, totalSegments = 300) {
        this.scene = scene;
        this.trackWidth = trackWidth;
        this.totalSegments = totalSegments;
        this.controlPoints = [];
        this.trackPath = [];
        this.trackGroup = new THREE.Group();
        this.scene.add(this.trackGroup);
        
        this.generateTrack();
    }

    /**
     * Generate control points for a realistic F1-style track layout
     * Creates a circuit with corners, straights, and elevation changes
     */
    generateControlPoints() {
        // Define track waypoints (control points for Catmull-Rom spline)
        this.controlPoints = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(100, 0, 0),           // Long straight
            new THREE.Vector3(200, 50, 0),          // High-speed right corner
            new THREE.Vector3(200, 150, 0),         // Fast section
            new THREE.Vector3(150, 200, 0),         // Left hander
            new THREE.Vector3(50, 200, 0),          // Chicane entry
            new THREE.Vector3(0, 150, 0),           // Chicane left
            new THREE.Vector3(-50, 100, 0),         // Chicane right
            new THREE.Vector3(-100, 50, 0),         // Technical section
            new THREE.Vector3(-150, 0, 0),          // Back straight
            new THREE.Vector3(-150, -100, 0),       // Hairpin
            new THREE.Vector3(-50, -150, 0),        // Recovery area
            new THREE.Vector3(50, -150, 0),         // Final corner entry
            new THREE.Vector3(100, -100, 0),        // Final corner exit
            new THREE.Vector3(100, 0, 0)            // Return to start area
        ];
    }

    /**
     * Catmull-Rom spline interpolation
     * Smoothly interpolates between control points
     * @param {THREE.Vector3} p0, p1, p2, p3 - Four control points
     * @param {number} t - Parameter from 0 to 1 (position along segment)
     * @returns {THREE.Vector3} - Interpolated point
     */
    catmullRom(p0, p1, p2, p3, t) {
        const v0 = (p2.clone().sub(p0)).multiplyScalar(0.5);
        const v1 = (p3.clone().sub(p1)).multiplyScalar(0.5);
        const t2 = t * t;
        const t3 = t2 * t;

        return p1.clone().multiplyScalar(2 * t3 - 3 * t2 + 1)
            .add(v0.multiplyScalar(t3 - 2 * t2 + t))
            .add(p2.clone().multiplyScalar(-2 * t3 + 3 * t2))
            .add(v1.multiplyScalar(t3 - t2));
    }

    /**
     * Generate smooth track path from control points
     * Uses Catmull-Rom interpolation for realistic curves
     */
    generateTrackPath() {
        this.trackPath = [];
        const segmentsPerControlPoint = Math.floor(this.totalSegments / (this.controlPoints.length - 3));

        for (let i = 1; i < this.controlPoints.length - 2; i++) {
            for (let t = 0; t < 1; t += 1 / segmentsPerControlPoint) {
                const point = this.catmullRom(
                    this.controlPoints[i - 1],
                    this.controlPoints[i],
                    this.controlPoints[i + 1],
                    this.controlPoints[i + 2],
                    t
                );
                this.trackPath.push(point);
            }
        }
    }

    /**
     * Create the asphalt surface by extruding along the track path
     * Creates a dark gray surface typical of F1 tracks
     */
    createAsphalt() {
        const asphaltGeometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];

        // For each point on the track path
        for (let i = 0; i < this.trackPath.length - 1; i++) {
            const p1 = this.trackPath[i];
            const p2 = this.trackPath[i + 1];

            // Calculate perpendicular direction for track width
            const direction = p2.clone().sub(p1).normalize();
            const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();

            // Left edge of track
            const left = p1.clone().add(perpendicular.clone().multiplyScalar(this.trackWidth / 2));
            // Right edge of track
            const right = p1.clone().add(perpendicular.clone().multiplyScalar(-this.trackWidth / 2));

            const leftNext = p2.clone().add(perpendicular.clone().multiplyScalar(this.trackWidth / 2));
            const rightNext = p2.clone().add(perpendicular.clone().multiplyScalar(-this.trackWidth / 2));

            vertices.push(left.x, left.y, left.z);
            vertices.push(right.x, right.y, right.z);
            vertices.push(rightNext.x, rightNext.y, rightNext.z);
            vertices.push(leftNext.x, leftNext.y, leftNext.z);

            const baseIndex = i * 4;
            indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
            indices.push(baseIndex, baseIndex + 2, baseIndex + 3);
        }

        asphaltGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
        asphaltGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
        asphaltGeometry.computeVertexNormals();

        const asphaltMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        const asphalt = new THREE.Mesh(asphaltGeometry, asphaltMaterial);
        this.trackGroup.add(asphalt);
    }

    /**
     * Create rumble strips (red and white striped curbs) along track edges
     * Provides visual feedback and track boundary indication
     */
    createRumbleStrips() {
        const rumbleWidth = 1.5;

        for (let i = 0; i < this.trackPath.length - 1; i++) {
            const p1 = this.trackPath[i];
            const p2 = this.trackPath[i + 1];

            const direction = p2.clone().sub(p1).normalize();
            const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();

            // Left rumble strip (red and white)
            const leftOuterStart = p1.clone().add(perpendicular.clone().multiplyScalar(this.trackWidth / 2));
            const leftOuterEnd = p1.clone().add(perpendicular.clone().multiplyScalar(this.trackWidth / 2 + rumbleWidth));
            const leftOuterEndNext = p2.clone().add(perpendicular.clone().multiplyScalar(this.trackWidth / 2 + rumbleWidth));
            const leftOuterNextStart = p2.clone().add(perpendicular.clone().multiplyScalar(this.trackWidth / 2));

            this.createRumbleSegment(leftOuterStart, leftOuterEnd, leftOuterEndNext, leftOuterNextStart, i % 2 === 0);

            // Right rumble strip
            const rightOuterStart = p1.clone().add(perpendicular.clone().multiplyScalar(-this.trackWidth / 2));
            const rightOuterEnd = p1.clone().add(perpendicular.clone().multiplyScalar(-this.trackWidth / 2 - rumbleWidth));
            const rightOuterEndNext = p2.clone().add(perpendicular.clone().multiplyScalar(-this.trackWidth / 2 - rumbleWidth));
            const rightOuterNextStart = p2.clone().add(perpendicular.clone().multiplyScalar(-this.trackWidth / 2));

            this.createRumbleSegment(rightOuterStart, rightOuterEnd, rightOuterEndNext, rightOuterNextStart, i % 2 === 0);
        }
    }

    /**
     * Helper function to create individual rumble strip segments
     * @param {THREE.Vector3} p1, p2, p3, p4 - Corner points of rumble segment
     * @param {boolean} isRed - True for red, false for white
     */
    createRumbleSegment(p1, p2, p3, p4, isRed) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [
            p1.x, p1.y, p1.z,
            p2.x, p2.y, p2.z,
            p3.x, p3.y, p3.z,
            p4.x, p4.y, p4.z
        ];
        const indices = [0, 1, 2, 0, 2, 3];

        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: isRed ? 0xff0000 : 0xffffff,
            roughness: 0.9,
            metalness: 0,
            side: THREE.DoubleSide
        });

        const rumble = new THREE.Mesh(geometry, material);
        rumble.position.y = 0.01; // Slight elevation to prevent z-fighting
        this.trackGroup.add(rumble);
    }

    /**
     * Create barrier walls on the sides of the track
     * Prevents drivers from going completely off-track
     */
    createBarriers() {
        const barrierHeight = 1.5;
        const barrierDepth = 0.5;

        for (let i = 0; i < this.trackPath.length - 1; i++) {
            const p1 = this.trackPath[i];
            const p2 = this.trackPath[i + 1];

            const direction = p2.clone().sub(p1).normalize();
            const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();

            // Left barrier
            const leftBarrierOuterStart = p1.clone().add(perpendicular.clone().multiplyScalar(this.trackWidth / 2 + 1.5));
            const leftBarrierInnerStart = p1.clone().add(perpendicular.clone().multiplyScalar(this.trackWidth / 2 + 1.5 + barrierDepth));
            const leftBarrierInnerEnd = p2.clone().add(perpendicular.clone().multiplyScalar(this.trackWidth / 2 + 1.5 + barrierDepth));
            const leftBarrierOuterEnd = p2.clone().add(perpendicular.clone().multiplyScalar(this.trackWidth / 2 + 1.5));

            this.createBarrierSegment(leftBarrierOuterStart, leftBarrierInnerStart, leftBarrierInnerEnd, leftBarrierOuterEnd, barrierHeight);

            // Right barrier
            const rightBarrierOuterStart = p1.clone().add(perpendicular.clone().multiplyScalar(-this.trackWidth / 2 - 1.5));
            const rightBarrierInnerStart = p1.clone().add(perpendicular.clone().multiplyScalar(-this.trackWidth / 2 - 1.5 - barrierDepth));
            const rightBarrierInnerEnd = p2.clone().add(perpendicular.clone().multiplyScalar(-this.trackWidth / 2 - 1.5 - barrierDepth));
            const rightBarrierOuterEnd = p2.clone().add(perpendicular.clone().multiplyScalar(-this.trackWidth / 2 - 1.5));

            this.createBarrierSegment(rightBarrierOuterStart, rightBarrierInnerStart, rightBarrierInnerEnd, rightBarrierOuterEnd, barrierHeight);
        }
    }

    /**
     * Helper function to create barrier wall segments
     * @param {THREE.Vector3} p1, p2, p3, p4 - Bottom corners
     * @param {number} height - Height of barrier wall
     */
    createBarrierSegment(p1, p2, p3, p4, height) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [
            p1.x, p1.y, p1.z,
            p2.x, p2.y, p2.z,
            p3.x, p3.y, p3.z,
            p4.x, p4.y, p4.z,
            p1.x, p1.y + height, p1.z,
            p2.x, p2.y + height, p2.z,
            p3.x, p3.y + height, p3.z,
            p4.x, p4.y + height, p4.z
        ];
        const indices = [
            0, 2, 1, 0, 3, 2, // Bottom
            4, 5, 6, 4, 6, 7, // Top
            0, 1, 5, 0, 5, 4, // Front
            2, 3, 7, 2, 7, 6  // Back
        ];

        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.7,
            metalness: 0.2,
            side: THREE.DoubleSide
        });

        const barrier = new THREE.Mesh(geometry, material);
        this.trackGroup.add(barrier);
    }

    /**
     * Main track generation function
     * Orchestrates all track creation steps
     */
    generateTrack() {
        this.generateControlPoints();
        this.generateTrackPath();
        this.createAsphalt();
        this.createRumbleStrips();
        this.createBarriers();

        // Add environment lighting
        this.createEnvironmentLighting();
    }

    /**
     * Create basic scene lighting
     * Simulates daylight conditions with ambient and directional light
     */
    createEnvironmentLighting() {
        // Ambient light - fills shadows
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Directional light - main sun
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -500;
        directionalLight.shadow.camera.right = 500;
        directionalLight.shadow.camera.top = 500;
        directionalLight.shadow.camera.bottom = -500;
        this.scene.add(directionalLight);
    }

    /**
     * Get closest point on track to a given position
     * Used for track-based positioning and telemetry
     * @param {THREE.Vector3} position - Position to check
     * @returns {object} - Closest point info {point, index, distance}
     */
    getClosestTrackPoint(position) {
        let minDistance = Infinity;
        let closestIndex = 0;

        for (let i = 0; i < this.trackPath.length; i++) {
            const distance = position.distanceTo(this.trackPath[i]);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i;
            }
        }

        return {
            point: this.trackPath[closestIndex],
            index: closestIndex,
            distance: minDistance,
            progress: (closestIndex / this.trackPath.length) * 100
        };
    }
}
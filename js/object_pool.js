/**
 * Object Pooling System
 * Pre-allocated vector and quaternion pools to eliminate GC stutter
 * Critical for maintaining 60 FPS in physics/AI loops
 */

class ObjectPool {
    constructor() {
        // Vector3 pool (for Three.js)
        this.vector3Pool = [];
        this.vector3PoolSize = 500;
        this.vector3Taken = 0;

        // Quaternion pool
        this.quaternionPool = [];
        this.quaternionPoolSize = 100;
        this.quaternionTaken = 0;

        // btVector3 pool (for Ammo.js)
        this.btVector3Pool = [];
        this.btVector3PoolSize = 200;
        this.btVector3Taken = 0;

        // Pre-allocate pools
        this.initializeVectorPools();
    }

    /**
     * Initialize vector and quaternion pools
     */
    initializeVectorPools() {
        // Three.js Vector3 pool
        for (let i = 0; i < this.vector3PoolSize; i++) {
            this.vector3Pool.push(new THREE.Vector3());
        }

        // Three.js Quaternion pool
        for (let i = 0; i < this.quaternionPoolSize; i++) {
            this.quaternionPool.push(new THREE.Quaternion());
        }

        // Ammo.js btVector3 pool
        for (let i = 0; i < this.btVector3PoolSize; i++) {
            this.btVector3Pool.push(new Ammo.btVector3(0, 0, 0));
        }

        console.log('✓ Object pools initialized');
        console.log(`  Vector3 pool: ${this.vector3PoolSize}`);
        console.log(`  Quaternion pool: ${this.quaternionPoolSize}`);
        console.log(`  btVector3 pool: ${this.btVector3PoolSize}`);
    }

    /**
     * Get Vector3 from pool
     */
    getVector3(x = 0, y = 0, z = 0) {
        if (this.vector3Pool.length === 0) {
            // Pool exhausted, allocate new
            this.vector3Taken++;
            return new THREE.Vector3(x, y, z);
        }

        const vec = this.vector3Pool.pop();
        vec.set(x, y, z);
        this.vector3Taken++;
        return vec;
    }

    /**
     * Return Vector3 to pool
     */
    returnVector3(vec) {
        if (this.vector3Pool.length < this.vector3PoolSize) {
            vec.set(0, 0, 0);
            this.vector3Pool.push(vec);
            this.vector3Taken--;
        }
    }

    /**
     * Get Quaternion from pool
     */
    getQuaternion(x = 0, y = 0, z = 0, w = 1) {
        if (this.quaternionPool.length === 0) {
            this.quaternionTaken++;
            return new THREE.Quaternion(x, y, z, w);
        }

        const quat = this.quaternionPool.pop();
        quat.set(x, y, z, w);
        this.quaternionTaken++;
        return quat;
    }

    /**
     * Return Quaternion to pool
     */
    returnQuaternion(quat) {
        if (this.quaternionPool.length < this.quaternionPoolSize) {
            quat.set(0, 0, 0, 1);
            this.quaternionPool.push(quat);
            this.quaternionTaken--;
        }
    }

    /**
     * Get btVector3 from pool
     */
    getBtVector3(x = 0, y = 0, z = 0) {
        if (this.btVector3Pool.length === 0) {
            this.btVector3Taken++;
            return new Ammo.btVector3(x, y, z);
        }

        const vec = this.btVector3Pool.pop();
        vec.setX(x);
        vec.setY(y);
        vec.setZ(z);
        this.btVector3Taken++;
        return vec;
    }

    /**
     * Return btVector3 to pool
     */
    returnBtVector3(vec) {
        if (this.btVector3Pool.length < this.btVector3PoolSize) {
            vec.setX(0);
            vec.setY(0);
            vec.setZ(0);
            this.btVector3Pool.push(vec);
            this.btVector3Taken--;
        }
    }

    /**
     * Get pool statistics
     */
    getStats() {
        return {
            vector3: { taken: this.vector3Taken, available: this.vector3Pool.length },
            quaternion: { taken: this.quaternionTaken, available: this.quaternionPool.length },
            btVector3: { taken: this.btVector3Taken, available: this.btVector3Pool.length }
        };
    }
}

// Global object pool instance
let OBJECT_POOL = null;

/**
 * Initialize global object pool
 */
function initializeObjectPool() {
    OBJECT_POOL = new ObjectPool();
    return OBJECT_POOL;
}

/**
 * Get global object pool
 */
function getObjectPool() {
    if (!OBJECT_POOL) {
        OBJECT_POOL = initializeObjectPool();
    }
    return OBJECT_POOL;
}

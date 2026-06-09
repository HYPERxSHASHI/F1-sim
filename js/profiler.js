/**
 * Performance Profiler - Lightweight FPS/Latency Monitoring
 * Real-time metrics with color-coded warnings
 */

class PerformanceProfiler {
    constructor() {
        this.enabled = true;
        this.isVisible = true;

        // Metrics
        this.frameCount = 0;
        this.fpsHistory = [];
        this.maxHistoryLength = 60;
        this.currentFPS = 60;

        this.physicsLatency = 0;
        this.renderLatency = 0;
        this.inputLatency = 0;
        this.audioLatency = 0;

        this.drawCalls = 0;
        this.geometries = 0;
        this.textures = 0;

        // Timing
        this.lastFrameTime = performance.now();
        this.frameStartTime = 0;

        // Canvas for debug display
        this.canvas = null;
        this.ctx = null;
        this.createDebugPanel();

        // Keyboard toggle
        document.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P') {
                this.toggleVisibility();
            }
        });
    }

    /**
     * Create debug panel canvas
     */
    createDebugPanel() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 320;
        this.canvas.height = 200;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '20px';
        this.canvas.style.right = '20px';
        this.canvas.style.zIndex = '1000';
        this.canvas.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.canvas.style.border = '1px solid #ffff00';
        this.canvas.style.borderRadius = '4px';
        this.canvas.style.cursor = 'pointer';

        this.ctx = this.canvas.getContext('2d');
        document.body.appendChild(this.canvas);
    }

    /**
     * Mark frame start
     */
    markFrameStart() {
        this.frameStartTime = performance.now();
    }

    /**
     * Mark physics step completion
     */
    markPhysicsEnd() {
        this.physicsLatency = performance.now() - this.frameStartTime;
    }

    /**
     * Mark render completion
     */
    markRenderEnd() {
        this.renderLatency = performance.now() - this.frameStartTime;
    }

    /**
     * Update with renderer info
     */
    updateRendererInfo(renderer) {
        if (renderer.info) {
            this.drawCalls = renderer.info.render.calls || 0;
            this.geometries = renderer.info.memory.geometries || 0;
            this.textures = renderer.info.memory.textures || 0;
        }
    }

    /**
     * Update latency metrics from external systems
     */
    setInputLatency(ms) {
        this.inputLatency = ms;
    }

    setAudioLatency(ms) {
        this.audioLatency = ms;
    }

    setPhysicsLatency(ms) {
        this.physicsLatency = ms;
    }

    /**
     * Calculate FPS
     */
    updateFPS() {
        const now = performance.now();
        const frameTime = now - this.lastFrameTime;
        this.lastFrameTime = now;

        if (frameTime > 0) {
            const fps = 1000 / frameTime;
            this.fpsHistory.push(fps);
            if (this.fpsHistory.length > this.maxHistoryLength) {
                this.fpsHistory.shift();
            }

            // Calculate average FPS
            this.currentFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
        }
    }

    /**
     * Render debug panel
     */
    render() {
        if (!this.isVisible || !this.ctx) return;

        this.updateFPS();

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, w, h);

        ctx.font = '11px monospace';
        ctx.fillStyle = '#ffff00';
        let y = 15;
        const lineHeight = 16;

        // Title
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('PERFORMANCE', 10, y);
        y += lineHeight + 5;

        ctx.font = '11px monospace';

        // FPS
        ctx.fillStyle = this.currentFPS >= 55 ? '#00ff00' : this.currentFPS >= 45 ? '#ffff00' : '#ff0000';
        ctx.fillText(`FPS: ${this.currentFPS.toFixed(1)}`, 10, y);
        y += lineHeight;

        // Physics Latency
        ctx.fillStyle = this.physicsLatency > 16 ? '#ff0000' : this.physicsLatency > 8 ? '#ffff00' : '#00ff00';
        ctx.fillText(`Physics: ${this.physicsLatency.toFixed(2)}ms`, 10, y);
        y += lineHeight;

        // Render Latency
        ctx.fillStyle = this.renderLatency > 10 ? '#ff0000' : this.renderLatency > 5 ? '#ffff00' : '#00ff00';
        ctx.fillText(`Render: ${this.renderLatency.toFixed(2)}ms`, 10, y);
        y += lineHeight;

        // Input Latency
        ctx.fillStyle = '#00ff00';
        ctx.fillText(`Input: ${this.inputLatency.toFixed(2)}ms`, 10, y);
        y += lineHeight;

        // Audio Latency
        ctx.fillStyle = '#00ff00';
        ctx.fillText(`Audio: ${this.audioLatency.toFixed(2)}ms`, 10, y);
        y += lineHeight + 5;

        // Draw calls
        ctx.fillStyle = '#00ffff';
        ctx.fillText(`Draw Calls: ${this.drawCalls}`, 10, y);
        y += lineHeight;

        // Memory
        ctx.fillStyle = '#00ffff';
        ctx.fillText(`Geometries: ${this.geometries}`, 10, y);
        y += lineHeight;
        ctx.fillText(`Textures: ${this.textures}`, 10, y);
        y += lineHeight + 5;

        // Instructions
        ctx.fillStyle = '#888888';
        ctx.font = '9px monospace';
        ctx.fillText('Press P to toggle', 10, h - 5);
    }

    /**
     * Toggle visibility
     */
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        this.canvas.style.display = this.isVisible ? 'block' : 'none';
    }

    /**
     * Get FPS as number
     */
    getFPS() {
        return this.currentFPS;
    }
}

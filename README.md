# F1 Simulator - Phase 1: Foundation

## Overview

This is the first phase of a highly realistic browser-based Formula 1 racing simulator built with **Three.js**, **Ammo.js** (Phase 2+), and procedural audio (Phase 3+).

**Phase 1** focuses on establishing the core foundation:
- ✅ Procedurally generated track using Catmull-Rom splines
- ✅ First-person driver camera with eye-level positioning
- ✅ Basic keyboard and gamepad input handling
- ✅ Simple vehicle locomotion (to be replaced by physics in Phase 2)
- ✅ Real-time telemetry HUD

## Features (Phase 1)

### Track System
- **Procedurally generated circuit** using Catmull-Rom spline interpolation
- **Asphalt surface** with realistic dark gray material
- **Red/white rumble strips** marking track boundaries
- **Concrete barrier walls** preventing complete off-track excursions
- **Dynamic track info** (position, progress percentage)

### Camera System
- **Driver eye-level positioning** (0.9m above chassis)
- **Look-ahead distance** for realistic driver perspective
- **Speed-based shake** that intensifies at high speeds
- **FOV expansion** as speed increases beyond 250 km/h
- **G-force dynamics framework** (ready for Phase 2 physics)

### Input System
- **Keyboard controls**: W (throttle), S (brake), A/D (steering), Space (reset)
- **Gamepad support**: Analog triggers for throttle/brake, right stick for steering
- **Input smoothing** to prevent abrupt steering changes
- **Separate sensitivity settings** for steering, throttle, and brake

### HUD & Telemetry
- **Real-time speed display** (km/h)
- **Track progress indicator** (percentage complete)
- **FPS counter**
- **Camera position debug info**
- **Track segment tracking**

## How to Run

1. Clone or download this repository
2. Open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge)
3. Use WASD or gamepad to control the car
4. Press Space to reset position

## Controls

| Input | Action |
|-------|--------|
| **W** | Accelerate |
| **S** | Brake |
| **A** | Steer Left |
| **D** | Steer Right |
| **Space** | Reset Position |
| **Gamepad R2** | Accelerate (analog) |
| **Gamepad L2** | Brake (analog) |
| **Gamepad Right Stick** | Steering (analog) |
| **Gamepad A** | Reset Position |

## Project Structure

```
F1-sim/
├── index.html          # Main HTML file with HUD styling
├── js/
│   ├── main.js        # Application entry point and render loop
│   ├── track.js       # Track generation system
│   ├── camera.js      # First-person camera system
│   └── controls.js    # Input handling (keyboard + gamepad)
└── README.md          # This file
```

## Physics Notes (Placeholder for Phase 2)

Phase 1 uses **simplified arcade physics** for basic movement. Phase 2 will introduce:
- Full rigid body dynamics (Ammo.js)
- Pacejka tire model for grip calculation
- Aerodynamic drag and downforce
- Suspension geometry and stiffness
- Realistic torque curves and gearbox sequencing
- RPM-linked wheel speeds

## Browser Requirements

- **WebGL 2.0 support** (most modern browsers)
- **ES6 JavaScript** (for class syntax)
- **Gamepad API** (optional, for controller support)

Tested on:
- Chrome 120+
- Firefox 121+
- Safari 17+
- Edge 120+

## Roadmap

### Phase 1: ✅ Foundation (COMPLETE)
- Track generation
- Camera system
- Input handling

### Phase 2: Vehicle Dynamics (TODO)
- Ammo.js physics engine integration
- Realistic vehicle mass and inertia
- Suspension raycast system
- Tire grip model (Pacejka Magic Formula)
- Aerodynamic forces

### Phase 3: Powertrain (TODO)
- Engine torque curves
- Sequential gearbox
- RPM-wheel speed linking
- Launch control and clutch modeling

### Phase 4: Advanced Physics (TODO)
- G-force dynamics for camera
- Tire temperature modeling
- Brake fade
- Fuel load effects

### Phase 5: Audio (TODO)
- Procedural engine sound synthesis
- RPM-linked pitch modulation
- Throttle/off-throttle transitions
- Gear change sounds

### Phase 6: Polish & HUD (TODO)
- Advanced telemetry display
- Rev-bar with LED effects
- Pit board information
- Lap timing and sector tracking

## Technical Details

### Catmull-Rom Spline Interpolation
The track is generated using Catmull-Rom spline interpolation for smooth curves. This ensures realistic racing lines without sharp, unnatural corners.

### Camera Positioning
The camera is positioned at driver eye height (0.9m) with a forward offset of 0.2m, simulating the actual position of an F1 driver's head.

### Input Smoothing
Steering, throttle, and brake inputs are smoothed using exponential damping to create responsive but controlled vehicle behavior.

## Performance Optimizations (Phase 1)

- Single-pass track mesh rendering
- Efficient spline interpolation
- Deferred HUD updates
- Optimized camera calculations

## Known Limitations (Phase 1)

- No physics engine (basic arcade movement only)
- No tire grip simulation
- No aerodynamic effects
- No sound
- Limited off-track penalty (just teleport back)
- No collision detection with barriers
- No multiplayer

## Contributing

This is a single-developer prototype. Future phases will be contributed sequentially.

## License

MIT License - Feel free to fork and modify!

---

**Next Phase**: Phase 2 will integrate Ammo.js physics and implement the Pacejka tire model for realistic vehicle dynamics.

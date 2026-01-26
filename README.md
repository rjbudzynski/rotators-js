# Coupled Rotators Simulation

An interactive, browser-based simulation of two coupled mechanical rotators. This application models the complex dynamics of coupled pendulums, providing real-time visualization of their motion, energy distribution, and phase space.

## Features

- **Real-Time Physics:** High-precision numerical integration (RK4) ensures smooth and accurate simulation of the rotators' dynamics.
- **Interactive Controls:** Easily adjust initial angles, angular velocities, gravity, and coupling strength through a responsive control panel.
- **Dynamic Visualization:**
  - **Animation:** A live 2D canvas showing the physical state of the rotators.
  - **Analytics:** Real-time plots for Angle (rad), Velocity (rad/s), and Energy (J) using high-performance charts.
- **Mathematical Clarity:** Professional rendering of the system's Lagrangian formula using KaTeX.

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- npm

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev
```

### Build

```bash
# Create a production build
npm run build
```

## Credits

This project is a JavaScript/React port of an original Python-based simulation.
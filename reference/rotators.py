#! /usr/bin/env -S uv run

"""
Simulation of coupled rotators with a GUI using PySide6 and Matplotlib.
This script models the dynamics of two coupled rotators and provides a
real-time visualization of their motion, energy, and phase space.
"""

import sys
import numpy as np
import collections
from scipy.integrate import solve_ivp
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure

from PySide6.QtWidgets import (
    QApplication,
    QMainWindow,
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QPushButton,
    QLabel,
    QDoubleSpinBox,
    QFormLayout,
    QGroupBox,
    QSlider,
)
from PySide6.QtCore import QTimer, Qt

# --- 0. Configuration ---
class Config:
    """
    Centralized configuration for the simulation and visualization.
    Contains physics constants, simulation parameters, and plotting limits.
    """
    L_ARM = 1.0
    WINDOW_W = 5.0
    DT = 0.02
    SIM_INTERVAL = 20  # ms
    HISTORY_MAX_SIZE = 1000  # Default max points
    
    # Plotting limits
    SIM_X_LIM = (-2.2, 2.2)
    SIM_Y_LIM = (-1.2, 1.4)
    ENERGY_Y_LIM = (-5, 130)
    THETA_Y_LIM = (-3.5, 3.5)
    OMEGA_Y_LIM = (-10, 10)

    @classmethod
    def validate(cls):
        """Validates that the configuration parameters are within reasonable bounds."""
        if cls.WINDOW_W <= 0:
            raise ValueError("WINDOW_W must be positive")
        if cls.DT <= 0:
            raise ValueError("DT must be positive")

Config.validate()

# --- 1. Physics Engine ---
def dynamics(t, y, J, g):
    """
    System of first-order differential equations for the coupled rotators.
    
    Args:
        t: Current time.
        y: State vector [theta1, omega1, theta2, omega2].
        J: Coupling strength.
        g: Gravitational acceleration.
        
    Returns:
        Derivatives [d_theta1, d_omega1, d_theta2, d_omega2].
    """
    t1, w1, t2, w2 = y
    dw1 = -g * np.sin(t1) - J * np.sin(t1 - t2)
    dw2 = -g * np.sin(t2) - J * np.sin(t2 - t1)
    return [w1, dw1, w2, dw2]


class RotatorSimulation:
    """
    Handles the physics simulation and maintains the state history of the rotators.
    Uses a circular buffer for efficient data storage and processing.
    """
    def __init__(self):
        """Initializes the simulation with pre-allocated circular buffers."""
        self.max_history = int(Config.WINDOW_W / Config.DT) + 2
        self.history_t = np.zeros(self.max_history)
        self.history_y = np.zeros((self.max_history, 4))
        self.history_energy = np.zeros((self.max_history, 3)) # E1, E2, Etotal
        self.history_theta_unwrapped = np.zeros((self.max_history, 2))
        
        self.history_idx = 0
        self.history_count = 0
        self.reset()

    def reset(self, t1=np.pi - 0.001, w1=0.0, t2=0.0, w2=0.0, J=2.0, g=9.81):
        """
        Resets the simulation to the specified initial conditions.
        
        Args:
            t1: Initial angle of rotator 1.
            w1: Initial angular velocity of rotator 1.
            t2: Initial angle of rotator 2.
            w2: Initial angular velocity of rotator 2.
            J: Coupling strength.
            g: Gravitational acceleration.
        """
        self.y_state = np.array([t1, w1, t2, w2], dtype=np.float64)
        self.t_curr = 0.0
        self.history_idx = 0
        self.history_count = 0
        self.J = J
        self.g = g
        self.last_theta = np.array([t1, t2], dtype=np.float64)
        self.unwrapped_theta = np.array([t1, t2], dtype=np.float64)
        self._add_to_history(self.t_curr, self.y_state)

    def _add_to_history(self, t, y):
        """
        Internal method to calculate derived quantities and update circular buffers.
        
        Args:
            t: Current time.
            y: Current state vector.
        """
        # Ensure y is a float64 copy
        y = np.array(y, dtype=np.float64)
        # Calculate unwrapped angles
        dtheta = y[[0, 2]] - self.last_theta
        # Wrap dtheta to [-pi, pi]
        dtheta = (dtheta + np.pi) % (2 * np.pi) - np.pi
        self.unwrapped_theta += dtheta
        self.last_theta = y[[0, 2]]

        # Calculate energies
        e1 = 0.5 * y[1]**2 + self.g * (1.0 - np.cos(y[0]))
        e2 = 0.5 * y[3]**2 + self.g * (1.0 - np.cos(y[2]))
        etotal = e1 + e2 + self.J * (1.0 - np.cos(y[0] - y[2]))

        # Store in circular buffer
        idx = self.history_idx
        self.history_t[idx] = t
        self.history_y[idx] = y
        self.history_energy[idx] = [e1, e2, etotal]
        self.history_theta_unwrapped[idx] = self.unwrapped_theta

        self.history_idx = (idx + 1) % self.max_history
        self.history_count = min(self.history_count + 1, self.max_history)

    def get_history_arrays(self):
        """
        Retrieves the history data as a set of chronologically ordered numpy arrays.
        
        Returns:
            Tuple of (time, state, energy, unwrapped_theta) arrays.
        """
        if self.history_count < self.max_history:
            return (self.history_t[:self.history_count], 
                    self.history_y[:self.history_count],
                    self.history_energy[:self.history_count],
                    self.history_theta_unwrapped[:self.history_count])
        else:
            shift = -self.history_idx
            return (np.roll(self.history_t, shift),
                    np.roll(self.history_y, shift, axis=0),
                    np.roll(self.history_energy, shift, axis=0),
                    np.roll(self.history_theta_unwrapped, shift, axis=0))

    def step(self):
        """
        Advances the simulation by one time step (Config.DT) using solve_ivp.
        
        Returns:
            Tuple of (current_time, current_state).
        """
        try:
            sol = solve_ivp(
                dynamics,
                (self.t_curr, self.t_curr + Config.DT),
                self.y_state,
                args=(self.J, self.g),
                rtol=1e-7,
            )
            if not sol.success:
                print(f"Warning: Integration failed at t={self.t_curr}")
                return self.t_curr, self.y_state
            self.y_state = sol.y[:, -1]
            self.t_curr += Config.DT
        except Exception as e:
            print(f"Error in integration: {e}")
            return self.t_curr, self.y_state

        self._add_to_history(self.t_curr, self.y_state)
        return self.t_curr, self.y_state


# --- 2. GUI Component ---
class MainWindow(QMainWindow):
    """
    Main application window providing a GUI for the coupled rotators simulation.
    Manages the UI layout, control panels, and the plotting canvas.
    """
    def __init__(self):
        """Initializes the window, simulation engine, and UI components."""
        super().__init__()
        self.setWindowTitle("Coupled Rotators Simulation")

        self.sim = RotatorSimulation()
        self.is_running = False

        self._setup_ui()
        self._setup_timer()
        self.reset_simulation()

    def _setup_ui(self):
        """Creates the main layouts and panels of the application."""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QHBoxLayout(central_widget)

        # Left Panel: Controls
        control_panel = QVBoxLayout()
        main_layout.addLayout(control_panel, 1)

        self._create_controls(control_panel)

        # Right Panel: Matplotlib Canvas
        self.fig = Figure(figsize=(10, 8))
        self.canvas = FigureCanvas(self.fig)
        main_layout.addWidget(self.canvas, 4)
        self.setup_plots()

    def _create_controls(self, layout):
        """Populates the control panel with parameter inputs and playback buttons."""
        # Initial Conditions Group
        ic_group = QGroupBox("Initial Conditions")
        ic_layout = QVBoxLayout()
        self.sld_t1, l1 = self._create_slider_v("Theta 1", -np.pi, np.pi, np.pi - 0.001)
        self.sb_w1, l2 = self._create_spinbox_v("Omega 1", "rad/s", -20, 20, 0.0)
        self.sld_t2, l3 = self._create_slider_v("Theta 2", -np.pi, np.pi, 0.0)
        self.sb_w2, l4 = self._create_spinbox_v("Omega 2", "rad/s", -20, 20, 0.0)
        for l in [l1, l2, l3, l4]:
            ic_layout.addLayout(l)
        ic_group.setLayout(ic_layout)
        layout.addWidget(ic_group)

        # Physics Parameters Group
        phys_group = QGroupBox("Physics Parameters")
        phys_layout = QVBoxLayout()
        self.sb_g, lg = self._create_spinbox_v("Gravity (g)", "m/s²", 0, 20, 9.81)
        self.sb_j, lj = self._create_spinbox_v("Coupling (J)", "N·m", 0, 50, 2.0)
        for l in [lg, lj]:
            phys_layout.addLayout(l)
        phys_group.setLayout(phys_layout)
        layout.addWidget(phys_group)

        # Playback Controls
        self.btn_start = QPushButton("Start")
        self.btn_start.clicked.connect(self.toggle_simulation)
        layout.addWidget(self.btn_start)
        self.btn_reset = QPushButton("Reset")
        self.btn_reset.clicked.connect(self.reset_simulation)
        layout.addWidget(self.btn_reset)
        self.btn_quit = QPushButton("Quit")
        self.btn_quit.clicked.connect(self.close)
        layout.addWidget(self.btn_quit)
        layout.addStretch()

    def _create_slider_v(self, name, min_val, max_val, init_val):
        """Helper to create a vertical-labeled slider for angle input."""
        layout = QVBoxLayout()
        slider = QSlider(Qt.Horizontal)
        slider.setRange(int(min_val * 100), int(max_val * 100))
        slider.setValue(int(init_val * 100))
        label = QLabel(f"{name}: {init_val:.2f} rad")
        label.setAlignment(Qt.AlignCenter)

        def update_label(val):
            label.setText(f"{name}: {val / 100.0:.2f} rad")

        slider.valueChanged.connect(update_label)
        layout.addWidget(slider)
        layout.addWidget(label)
        return slider, layout

    def _create_spinbox_v(self, name, unit, min_val, max_val, init_val):
        """Helper to create a vertical-labeled spinbox for numeric input."""
        layout = QVBoxLayout()
        sb = QDoubleSpinBox()
        sb.setRange(min_val, max_val)
        sb.setValue(init_val)
        label = QLabel(f"{name}: {init_val:.2f} {unit}")
        label.setAlignment(Qt.AlignCenter)

        def update_label(val):
            label.setText(f"{name}: {val:.2f} {unit}")

        sb.valueChanged.connect(update_label)
        layout.addWidget(sb)
        layout.addWidget(label)
        return sb, layout

    def _setup_timer(self):
        """Configures the QTimer for driving the simulation update loop."""
        self.timer = QTimer()
        self.timer.timeout.connect(self.update_simulation)
        self.timer.setInterval(Config.SIM_INTERVAL)

    def setup_plots(self):
        """Initializes the Matplotlib subplots and artist objects."""
        self.fig.clf()
        grid = self.fig.add_gridspec(
            2, 2, width_ratios=[1, 1.2], wspace=0.3, hspace=0.3
        )
        self.ax_sim = self.fig.add_subplot(grid[0, 0])
        self.ax_sim.set_xlim(*Config.SIM_X_LIM)
        self.ax_sim.set_ylim(*Config.SIM_Y_LIM)
        self.ax_sim.set_aspect("equal")
        self.ax_sim.axis("off")

        # Lagrangian Formula
        self.ax_sim.set_title(
            r"$\mathcal{{L}} = \frac{{1}}{{2}}(\dot{{\theta}}_1^2 + \dot{{\theta}}_2^2) + g(\cos\theta_1 + \cos\theta_2) + J\cos(\theta_1 - \theta_2)$",
            ha="center",
            va="bottom",
            fontsize=10,
        )

        self.circle1 = plt.Circle(
            (-1.0, 0), Config.L_ARM, color="#1f77b4", fill=False, lw=0.5, alpha=0.5
        )
        self.circle2 = plt.Circle(
            (1.0, 0), Config.L_ARM, color="#ff7f0e", fill=False, lw=0.5, alpha=0.5
        )
        self.ax_sim.add_patch(self.circle1)
        self.ax_sim.add_patch(self.circle2)
        (self.line1,) = self.ax_sim.plot([], [], "o-", lw=3, color="#1f77b4")
        (self.line2,) = self.ax_sim.plot([], [], "o-", lw=3, color="#ff7f0e")

        self.ax_energy = self.fig.add_subplot(grid[1, 0])
        self.ax_energy.set_ylabel("Energy (J)")
        self.ax_energy.set_xlabel("Time (s)")
        (self.line_e1,) = self.ax_energy.plot([], [], color="#1f77b4", marker=".", markersize=2)
        (self.line_e2,) = self.ax_energy.plot([], [], color="#ff7f0e", marker=".", markersize=2)
        (self.line_etotal,) = self.ax_energy.plot(
            [], [], "k--", lw=1, alpha=0.7, label="Total"
        )
        self.ax_energy.grid(True, alpha=0.3)
        self.ax_energy.set_ylim(*Config.ENERGY_Y_LIM)

        self.ax_theta = self.fig.add_subplot(grid[0, 1])
        self.ax_theta.set_ylabel("Angle (rad)")
        (self.line_t1,) = self.ax_theta.plot([], [], color="#1f77b4", marker=".", markersize=2)
        (self.line_t2,) = self.ax_theta.plot([], [], color="#ff7f0e", marker=".", markersize=2)
        self.ax_theta.grid(True, alpha=0.3)
        self.ax_theta.set_ylim(*Config.THETA_Y_LIM)

        self.ax_omega = self.fig.add_subplot(grid[1, 1])
        self.ax_omega.set_ylabel("Velocity (rad/s)")
        self.ax_omega.set_xlabel("Time (s)")
        (self.line_w1,) = self.ax_omega.plot([], [], color="#1f77b4", marker=".", markersize=2)
        (self.line_w2,) = self.ax_omega.plot([], [], color="#ff7f0e", marker=".", markersize=2)
        self.ax_omega.grid(True, alpha=0.3)
        self.ax_omega.set_ylim(*Config.OMEGA_Y_LIM)
        self.canvas.draw()

    def toggle_simulation(self):
        """Starts or pauses the simulation timer."""
        if self.is_running:
            self.timer.stop()
            self.btn_start.setText("Start")
        else:
            self.timer.start()
            self.btn_start.setText("Pause")
        self.is_running = not self.is_running

    def reset_simulation(self):
        """Resets the simulation with the current UI parameter values."""
        t1 = self.sld_t1.value() / 100.0
        t2 = self.sld_t2.value() / 100.0
        w1 = self.sb_w1.value()
        w2 = self.sb_w2.value()
        g = self.sb_g.value()
        j = self.sb_j.value()

        self.sim.reset(t1, w1, t2, w2, j, g)
        self.update_plots(force=True)
        if self.is_running:
            self.toggle_simulation()
        self.btn_start.setText("Start")

    def update_simulation(self):
        """Callback for the simulation timer; advances and redraws."""
        t_curr, y_state = self.sim.step()
        self.update_plots()

    def update_plots(self, force=False):
        """
        Updates the data of all plot artists with the latest simulation state.
        
        Args:
            force: If True, forces a canvas redraw even if simulation is paused.
        """
        y, t = self.sim.y_state, self.sim.t_curr
        x1, y1 = -1.0 + Config.L_ARM * np.sin(y[0]), -Config.L_ARM * np.cos(y[0])
        x2, y2 = 1.0 + Config.L_ARM * np.sin(y[2]), -Config.L_ARM * np.cos(y[2])
        self.line1.set_data([-1.0, x1], [0, y1])
        self.line2.set_data([1.0, x2], [0, y2])

        if self.sim.history_count > 0:
            t_data, y_data, e_data, theta_unwrapped = self.sim.get_history_arrays()

            # Display wrapped angles [-pi, pi]
            theta_display = (theta_unwrapped + np.pi) % (2 * np.pi) - np.pi

            # Handle discontinuities for angle plots to avoid "wrap-around" lines
            def get_masked_data(t, y):
                if len(y) < 2: return t, y
                diffs = np.abs(np.diff(y))
                idx = np.where(diffs > np.pi)[0] + 1
                if len(idx) > 0:
                    return np.insert(t, idx, np.nan), np.insert(y, idx, np.nan)
                return t, y

            t_t1, th1 = get_masked_data(t_data, theta_display[:, 0])
            t_t2, th2 = get_masked_data(t_data, theta_display[:, 1])

            self.line_t1.set_data(t_t1, th1)
            self.line_t2.set_data(t_t2, th2)
            self.line_w1.set_data(t_data, y_data[:, 1])
            self.line_w2.set_data(t_data, y_data[:, 3])
            self.line_e1.set_data(t_data, e_data[:, 0])
            self.line_e2.set_data(t_data, e_data[:, 1])
            self.line_etotal.set_data(t_data, e_data[:, 2])

            t_min, t_max = max(0, t - Config.WINDOW_W), max(Config.WINDOW_W, t)
            for ax in [self.ax_theta, self.ax_omega, self.ax_energy]:
                ax.set_xlim(t_min, t_max)
        else:
            for line in [
                self.line_t1,
                self.line_t2,
                self.line_w1,
                self.line_w2,
                self.line_e1,
                self.line_e2,
                self.line_etotal,
            ]:
                line.set_data([], [])
            for ax in [self.ax_theta, self.ax_omega, self.ax_energy]:
                ax.set_xlim(0, Config.WINDOW_W)
        
        self.canvas.draw_idle()


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())

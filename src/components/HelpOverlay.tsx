import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import LagrangianSVG from './LagrangianSVG';

interface Props {
  show: boolean;
  onHide: () => void;
}

const HelpOverlay: React.FC<Props> = ({ show, onHide }) => {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Simulation Guide</Modal.Title>
      </Modal.Header>
      <Modal.Body className="px-4">
        <h5>About the Simulation</h5>
        <p>
          This application models the dynamics of two coupled mechanical rotators. Each rotator consists of a 
          point mass attached to a rigid arm of unit length, rotating in a vertical plane under the influence 
          of gravity and a mutual coupling force.
        </p>

        <h5 className="mt-4">The Mathematics</h5>
        <p>
          The system's behavior is defined by its <strong>Lagrangian (ℒ)</strong>, which is the difference 
          between its total kinetic and potential energy:
        </p>
        <div className="bg-white p-3 rounded text-center my-3 shadow-sm border">
          <LagrangianSVG />
        </div>
        <p>
          Where <strong>θ₁</strong> and <strong>θ₂</strong> are the angular positions, <strong>g</strong> is 
          the gravitational acceleration, and <strong>J</strong> represents the coupling strength. 
          The interaction term <em>J cos(θ₁ - θ₂)</em> creates complex, often chaotic motion as energy 
          transfers between the two rotators.
        </p>

        <h5 className="mt-4">Numerical Integration</h5>
        <p>
          The equations of motion, derived via the Euler-Lagrange equations, are a set of coupled non-linear 
          differential equations. These are solved in real-time using the <strong>Runge-Kutta 4th Order (RK4)</strong> 
          method. This high-precision integration technique ensures numerical stability and maintains 
          physical accuracy even during rapid oscillations.
        </p>

        <h5 className="mt-4">How to Use</h5>
        <ul>
          <li><strong>Initial Conditions:</strong> Use the sliders and input fields to set the starting angles and angular velocities.</li>
          <li><strong>Physics Parameters:</strong> Adjust gravity (g) to simulate different environments, and coupling (J) to change the interaction intensity.</li>
          <li><strong>Interaction:</strong> Click <strong>Apply</strong> to load new parameters into the engine, and <strong>Start/Pause</strong> to control the flow of time.</li>
        </ul>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Dismiss
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default HelpOverlay;

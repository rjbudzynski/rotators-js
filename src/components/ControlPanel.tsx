import React from 'react';
import { Form, Button, Card } from 'react-bootstrap';
import { Play, Pause, RotateCcw, XCircle } from 'lucide-react';
import type { SimulationParams } from '../physics/engine';

interface Props {
  isRunning: boolean;
  onToggle: () => void;
  onReset: (params: SimulationParams) => void;
  onQuit: () => void;
}

const ControlPanel: React.FC<Props> = React.memo(({ isRunning, onToggle, onReset, onQuit }) => {
  const [params, setParams] = React.useState({
    t1: (Math.PI - 0.001).toString(),
    w1: "0",
    t2: "0",
    w2: "0",
    g: "9.81",
    J: "2.0"
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validate = (name: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "Must be a valid number";
    
    if (name === 'g' && (num < 0 || num > 100)) return "Gravity must be between 0 and 100";
    if (name === 'J' && (num < 0 || num > 500)) return "Coupling must be between 0 and 500";
    if ((name === 'w1' || name === 'w2') && (num < -100 || num > 100)) return "Velocity must be between -100 and 100";
    if ((name === 't1' || name === 't2') && (num < -2 * Math.PI || num > 2 * Math.PI)) return "Angle out of bounds";
    
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParams(prev => ({ ...prev, [name]: value }));
    
    const error = validate(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleResetClick = () => {
    const newErrors: Record<string, string> = {};
    Object.entries(params).forEach(([name, value]) => {
      const err = validate(name, value);
      if (err) newErrors[name] = err;
    });

    if (Object.values(newErrors).some(e => e !== "")) {
      setErrors(newErrors);
      return;
    }

    const p: SimulationParams = {
      t1: parseFloat(params.t1),
      w1: parseFloat(params.w1),
      t2: parseFloat(params.t2),
      w2: parseFloat(params.w2),
      g: parseFloat(params.g),
      J: parseFloat(params.J),
    };
    onReset(p);
  };

  const pValues = {
    t1: parseFloat(params.t1) || 0,
    w1: parseFloat(params.w1) || 0,
    t2: parseFloat(params.t2) || 0,
    w2: parseFloat(params.w2) || 0,
    g: parseFloat(params.g) || 0,
    J: parseFloat(params.J) || 0,
  };

  const hasErrors = Object.values(errors).some(e => e !== "");

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <Form noValidate>
          <h5 className="mb-3">Initial Conditions</h5>
          <Form.Group className="mb-2">
            <Form.Label className="small">Theta 1: {pValues.t1.toFixed(2)} rad</Form.Label>
            <Form.Range 
              name="t1"
              min={-Math.PI} 
              max={Math.PI} 
              step={0.01} 
              value={params.t1} 
              onChange={handleChange} 
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label className="small">Omega 1 (rad/s)</Form.Label>
            <Form.Control 
              name="w1"
              type="text" 
              size="sm" 
              value={params.w1} 
              onChange={handleChange} 
              isInvalid={!!errors.w1}
            />
            <Form.Control.Feedback type="invalid" className="very-small">
              {errors.w1}
            </Form.Control.Feedback>
          </Form.Group>
          <hr />
          <Form.Group className="mb-2">
            <Form.Label className="small">Theta 2: {pValues.t2.toFixed(2)} rad</Form.Label>
            <Form.Range 
              name="t2"
              min={-Math.PI} 
              max={Math.PI} 
              step={0.01} 
              value={params.t2} 
              onChange={handleChange} 
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label className="small">Omega 2 (rad/s)</Form.Label>
            <Form.Control 
              name="w2"
              type="text" 
              size="sm" 
              value={params.w2} 
              onChange={handleChange} 
              isInvalid={!!errors.w2}
            />
            <Form.Control.Feedback type="invalid" className="very-small">
              {errors.w2}
            </Form.Control.Feedback>
          </Form.Group>

          <h5 className="mt-4 mb-3">Physics Parameters</h5>
          <Form.Group className="mb-2">
            <Form.Label className="small">Gravity (g) [m/s²]</Form.Label>
            <Form.Control 
              name="g"
              type="text" 
              size="sm" 
              value={params.g} 
              onChange={handleChange} 
              isInvalid={!!errors.g}
            />
            <Form.Control.Feedback type="invalid" className="very-small">
              {errors.g}
            </Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="small">Coupling (J) [N·m]</Form.Label>
            <Form.Control 
              name="J"
              type="text" 
              size="sm" 
              value={params.J} 
              onChange={handleChange} 
              isInvalid={!!errors.J}
            />
            <Form.Control.Feedback type="invalid" className="very-small">
              {errors.J}
            </Form.Control.Feedback>
          </Form.Group>

          <div className="d-grid gap-2 mt-4">
            <Button 
              variant={isRunning ? "warning" : "primary"} 
              onClick={onToggle}
              disabled={hasErrors && !isRunning}
            >
              {isRunning ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Start</>}
            </Button>
            <Button variant="outline-secondary" onClick={handleResetClick} disabled={hasErrors}>
              <RotateCcw size={18} /> Apply
            </Button>
            <Button variant="outline-danger" onClick={onQuit}>
              <XCircle size={18} /> Quit
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
});

export default ControlPanel;

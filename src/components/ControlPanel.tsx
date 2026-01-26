import React from 'react';
import { Form, Button, Card } from 'react-bootstrap';
import { Play, Pause, RotateCcw, XCircle } from 'lucide-react';

interface Props {
  isRunning: boolean;
  onToggle: () => void;
  onReset: (params: any) => void;
  onQuit: () => void;
}

const ControlPanel: React.FC<Props> = ({ isRunning, onToggle, onReset, onQuit }) => {
  const [params, setParams] = React.useState({
    t1: (Math.PI - 0.001).toString(),
    w1: "0",
    t2: "0",
    w2: "0",
    g: "9.81",
    J: "2.0"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParams(prev => ({ ...prev, [name]: value }));
  };

  const handleResetClick = () => {
    const p = {
      t1: parseFloat(params.t1) || 0,
      w1: parseFloat(params.w1) || 0,
      t2: parseFloat(params.t2) || 0,
      w2: parseFloat(params.w2) || 0,
      g: parseFloat(params.g) || 0,
      J: parseFloat(params.J) || 0,
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

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <Form>
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
            <Form.Label className="small">Omega 1: {pValues.w1.toFixed(2)} rad/s</Form.Label>
            <Form.Control 
              name="w1"
              type="text" 
              size="sm" 
              value={params.w1} 
              onChange={handleChange} 
            />
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
            <Form.Label className="small">Omega 2: {pValues.w2.toFixed(2)} rad/s</Form.Label>
            <Form.Control 
              name="w2"
              type="text" 
              size="sm" 
              value={params.w2} 
              onChange={handleChange} 
            />
          </Form.Group>

          <h5 className="mt-4 mb-3">Physics Parameters</h5>
          <Form.Group className="mb-2">
            <Form.Label className="small">Gravity (g): {pValues.g.toFixed(2)} m/s²</Form.Label>
            <Form.Control 
              name="g"
              type="text" 
              size="sm" 
              value={params.g} 
              onChange={handleChange} 
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="small">Coupling (J): {pValues.J.toFixed(2)} N·m</Form.Label>
            <Form.Control 
              name="J"
              type="text" 
              size="sm" 
              value={params.J} 
              onChange={handleChange} 
            />
          </Form.Group>

          <div className="d-grid gap-2 mt-4">
            <Button variant={isRunning ? "warning" : "primary"} onClick={onToggle}>
              {isRunning ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Start</>}
            </Button>
            <Button variant="outline-secondary" onClick={handleResetClick}>
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
};

export default ControlPanel;

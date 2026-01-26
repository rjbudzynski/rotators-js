import React, { useRef, useEffect } from 'react';
import { Config } from '../physics/constants';
import type { State } from '../physics/solver';

import LagrangianSVG from './LagrangianSVG';

interface Props {
  state: State;
}

const SimulationCanvas: React.FC<Props> = ({ state }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [t1, , t2] = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Coordinate transform: 
    // SIM_X_LIM: [-2.2, 2.2]
    // SIM_Y_LIM: [-1.2, 1.4]
    const xMin = Config.SIM_X_LIM[0];
    const xMax = Config.SIM_X_LIM[1];
    const yMin = Config.SIM_Y_LIM[0];
    const yMax = Config.SIM_Y_LIM[1];

    const scaleX = width / (xMax - xMin);
    const scaleY = height / (yMax - yMin);
    const scale = Math.min(scaleX, scaleY);

    const centerX = width / 2;
    const centerY = height / 2 + 50; // Offset a bit like in the Python plot

    const toScreenX = (x: number) => centerX + x * scale;
    const toScreenY = (y: number) => centerY - y * scale;

    // Draw base circles
    ctx.strokeStyle = '#1f77b4';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(toScreenX(-1.0), toScreenY(0), Config.L_ARM * scale, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = '#ff7f0e';
    ctx.beginPath();
    ctx.arc(toScreenX(1.0), toScreenY(0), Config.L_ARM * scale, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.globalAlpha = 1.0;

    // Rotator 1
    const x1 = -1.0 + Config.L_ARM * Math.sin(t1);
    const y1 = -Config.L_ARM * Math.cos(t1);

    ctx.strokeStyle = '#1f77b4';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(toScreenX(-1.0), toScreenY(0));
    ctx.lineTo(toScreenX(x1), toScreenY(y1));
    ctx.stroke();

    ctx.fillStyle = '#1f77b4';
    ctx.beginPath();
    ctx.arc(toScreenX(x1), toScreenY(y1), 8, 0, 2 * Math.PI);
    ctx.fill();

    // Rotator 2
    const x2 = 1.0 + Config.L_ARM * Math.sin(t2);
    const y2 = -Config.L_ARM * Math.cos(t2);

    ctx.strokeStyle = '#ff7f0e';
    ctx.beginPath();
    ctx.moveTo(toScreenX(1.0), toScreenY(0));
    ctx.lineTo(toScreenX(x2), toScreenY(y2));
    ctx.stroke();

    ctx.fillStyle = '#ff7f0e';
    ctx.beginPath();
    ctx.arc(toScreenX(x2), toScreenY(y2), 8, 0, 2 * Math.PI);
    ctx.fill();

  }, [state]);

  return (
    <div className="d-flex flex-column align-items-center">
      <div className="mb-2 text-center" style={{ width: '100%' }}>
        <LagrangianSVG />
      </div>
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={300} 
        style={{ width: '100%', height: 'auto', background: '#f8f9fa', borderRadius: '8px' }}
      />
    </div>
  );
};

export default SimulationCanvas;

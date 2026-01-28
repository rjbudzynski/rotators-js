import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Navbar } from 'react-bootstrap';
import { useSimulation } from './physics/useSimulation';
import { Config } from './physics/constants';
import type { SimulationParams } from './physics/engine';
import SimulationCanvas from './components/SimulationCanvas';
import ControlPanel from './components/ControlPanel';
import UPlotChart from './components/UPlotChart';
import uPlot from 'uplot';
import 'bootstrap/dist/css/bootstrap.min.css';

import { Github } from 'lucide-react';

declare const __BUILD_DATE__: string;
declare const __GIT_HASH__: string;

const App: React.FC = () => {
  const { isRunning, toggle, reset, engine } = useSimulation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(500);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = Math.floor(entry.contentRect.width - 20);
        setContainerWidth(prev => (Math.abs(prev - newWidth) > 2 ? newWidth : prev));
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const chartHeight = 180;

  const thetaOptions: uPlot.Options = useMemo(() => ({
    width: 100, // Initial dummy width
    height: chartHeight,
    title: "Angle (rad)",
    legend: { show: false },
    cursor: { show: false },
    series: [
      {},
      { label: "Theta 1", stroke: "#1f77b4", width: 2, spanGaps: false },
      { label: "Theta 2", stroke: "#ff7f0e", width: 2, spanGaps: false },
    ],
    axes: [
      { grid: { show: true, stroke: "#eee" } },
      { grid: { show: true, stroke: "#eee" } },
    ],
    scales: {
      x: { 
        time: false,
        range: (u) => {
          const dataX = u.data[0];
          const lastX = dataX[dataX.length - 1] || 0;
          return [Math.max(0, lastX - Config.WINDOW_W), Math.max(Config.WINDOW_W, lastX)];
        }
      },
      y: { range: Config.THETA_Y_LIM }
    }
  }), []);

  const omegaOptions: uPlot.Options = useMemo(() => ({
    width: 100,
    height: chartHeight,
    title: "Velocity (rad/s)",
    legend: { show: false },
    cursor: { show: false },
    series: [
      {},
      { label: "Omega 1", stroke: "#1f77b4", width: 2, spanGaps: true },
      { label: "Omega 2", stroke: "#ff7f0e", width: 2, spanGaps: true },
    ],
    axes: [
      { grid: { show: true, stroke: "#eee" } },
      { grid: { show: true, stroke: "#eee" } },
    ],
    scales: {
      x: { 
        time: false,
        range: (u) => {
          const dataX = u.data[0];
          const lastX = dataX[dataX.length - 1] || 0;
          return [Math.max(0, lastX - Config.WINDOW_W), Math.max(Config.WINDOW_W, lastX)];
        }
      },
      y: { range: Config.OMEGA_Y_LIM }
    }
  }), []);

  const energyOptions: uPlot.Options = useMemo(() => ({
    width: 100,
    height: chartHeight,
    title: "Energy (J)",
    legend: { show: false },
    cursor: { show: false },
    series: [
      {},
      { label: "E1", stroke: "#1f77b4", width: 2, spanGaps: true },
      { label: "E2", stroke: "#ff7f0e", width: 2, spanGaps: true },
      { label: "Total", stroke: "#000", width: 1, dash: [5, 5], spanGaps: true },
    ],
    axes: [
      { grid: { show: true, stroke: "#eee" } },
      { grid: { show: true, stroke: "#eee" } },
    ],
    scales: {
      x: { 
        time: false,
        range: (u) => {
          const dataX = u.data[0];
          const lastX = dataX[dataX.length - 1] || 0;
          return [Math.max(0, lastX - Config.WINDOW_W), Math.max(Config.WINDOW_W, lastX)];
        }
      },
      y: { range: Config.ENERGY_Y_LIM }
    }
  }), []);

  const handleReset = React.useCallback((p: SimulationParams) => {
    reset(p.t1, p.w1, p.t2, p.w2, p.J, p.g);
  }, [reset]);

  const handleQuit = React.useCallback(() => {
    window.close();
  }, []);

  const getThetaData = React.useCallback((eng: any) => eng.getUPlotData().theta, []);
  const getOmegaData = React.useCallback((eng: any) => eng.getUPlotData().omega, []);
  const getEnergyData = React.useCallback((eng: any) => eng.getUPlotData().energy, []);

  return (
    <div className="bg-light min-vh-100">
      <Navbar bg="dark" variant="dark" className="mb-4">
        <Container fluid>
          <Navbar.Brand>Coupled Rotators Simulation</Navbar.Brand>
          <Navbar.Collapse className="justify-content-end">
            <a 
              href="https://github.com/rjbudzynski/rotators-js" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white opacity-75 hover-opacity-100"
            >
              <Github size={24} />
            </a>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container fluid className="px-4">
        <Row>
          <Col md={3} lg={2}>
            <ControlPanel 
              isRunning={isRunning} 
              onToggle={toggle} 
              onReset={handleReset} 
              onQuit={handleQuit} 
            />
          </Col>
          <Col md={9} lg={10}>
            <Row>
              <Col lg={5} className="mb-4">
                <SimulationCanvas engine={engine} />
              </Col>
              <Col lg={7} ref={containerRef}>
                <div className="d-flex flex-column gap-3">
                  <div className="bg-white p-2 rounded shadow-sm">
                    <UPlotChart options={thetaOptions} engine={engine} getData={getThetaData} width={containerWidth} />
                  </div>
                  <div className="bg-white p-2 rounded shadow-sm">
                    <UPlotChart options={omegaOptions} engine={engine} getData={getOmegaData} width={containerWidth} />
                  </div>
                  <div className="bg-white p-2 rounded shadow-sm">
                    <UPlotChart options={energyOptions} engine={engine} getData={getEnergyData} width={containerWidth} />
                  </div>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>

      <footer className="mt-auto py-3 text-center text-muted small">
        <Container fluid>
          <span>
            © 2026 <a href="mailto:robert@budzynski.xyz" className="text-decoration-none text-muted fw-bold">Robert Budzyński</a>. 
            All rights reserved. | Build date: {__BUILD_DATE__} | {__GIT_HASH__}
          </span>
        </Container>
      </footer>
    </div>
  );
};

export default App;
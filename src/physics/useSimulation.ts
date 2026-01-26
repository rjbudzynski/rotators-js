import { useState, useEffect, useRef, useCallback } from 'react';
import { RotatorEngine } from './engine';
import { Config } from './constants';
import type { State } from './solver';

export function useSimulation() {
  const engineRef = useRef(new RotatorEngine());
  const [isRunning, setIsRunning] = useState(false);
  const [state, setState] = useState<State>(engineRef.current.yState);
  const [uPlotData, setUPlotData] = useState(engineRef.current.getUPlotData());
  
  const requestRef = useRef<number>(undefined);
  const lastUpdateRef = useRef<number>(0);

  const step = useCallback(() => {
    const [, s] = engineRef.current.step();
    setState(s);
    setUPlotData(engineRef.current.getUPlotData());
  }, []);

  const animate = useCallback((now: number) => {
    if (lastUpdateRef.current === 0) {
      lastUpdateRef.current = now;
    }
    
    const elapsed = now - lastUpdateRef.current;
    
    if (elapsed >= Config.SIM_INTERVAL) {
      step();
      lastUpdateRef.current = now;
    }
    
    requestRef.current = requestAnimationFrame(animate);
  }, [step]);

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isRunning, animate]);

  const toggle = () => setIsRunning(!isRunning);
  
  const reset = (t1: number, w1: number, t2: number, w2: number, J: number, g: number) => {
    engineRef.current.reset(t1, w1, t2, w2, J, g);
    setState(engineRef.current.yState);
    setUPlotData(engineRef.current.getUPlotData());
    setIsRunning(false);
  };

  return {
    state,
    uPlotData,
    isRunning,
    toggle,
    reset,
    engine: engineRef.current
  };
}

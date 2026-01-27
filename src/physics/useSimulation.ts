import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RotatorEngine } from './engine';
import { Config } from './constants';
import type { State } from './solver';

export function useSimulation() {
  const engineRef = useRef(new RotatorEngine());
  const [isRunning, setIsRunning] = useState(false);
  const [state, setState] = useState<State>(engineRef.current.yState);
  // tick is used to force re-render components that need the latest engine data
  const [tick, setTick] = useState(0); 
  
  const requestRef = useRef<number>(undefined);
  const lastUpdateRef = useRef<number>(0);

  const step = useCallback(() => {
    const [, s] = engineRef.current.step();
    setState(s);
    setTick(t => t + 1);
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
    setTick(t => t + 1);
    setIsRunning(false);
  };

  const uPlotData = useMemo(() => engineRef.current.getUPlotData(), [isRunning]);

  return {
    state,
    uPlotData,
    tick,
    isRunning,
    toggle,
    reset,
    engine: engineRef.current
  };
}

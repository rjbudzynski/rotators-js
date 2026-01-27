import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RotatorEngine } from './engine';
import { Config } from './constants';
import type { State } from './solver';

export function useSimulation() {
  const [engine] = useState(() => new RotatorEngine());
  const [isRunning, setIsRunning] = useState(false);
  const [state, setState] = useState<State>(engine.yState);
  const [tick, setTick] = useState(0); 
  
  const requestRef = useRef<number>(undefined);
  const lastUpdateRef = useRef<number>(0);

  const step = useCallback(() => {
    const [, s] = engine.step();
    setState(s);
    setTick(t => t + 1);
  }, [engine]);

  useEffect(() => {
    if (!isRunning) {
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
      }
      return;
    }

    const onTick = (now: number) => {
      if (lastUpdateRef.current === 0) {
        lastUpdateRef.current = now;
      }
      
      const elapsed = now - lastUpdateRef.current;
      
      if (elapsed >= Config.SIM_INTERVAL) {
        step();
        lastUpdateRef.current = now;
      }
      
      requestRef.current = requestAnimationFrame(onTick);
    };

    requestRef.current = requestAnimationFrame(onTick);
    
    return () => {
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isRunning, step]);

  const toggle = useCallback(() => setIsRunning(r => !r), []);
  
  const reset = useCallback((t1: number, w1: number, t2: number, w2: number, J: number, g: number) => {
    engine.reset(t1, w1, t2, w2, J, g);
    setState(engine.yState);
    lastUpdateRef.current = 0;
    setTick(t => t + 1);
    setIsRunning(false);
  }, [engine]);

  // Return a fresh reference to the data structure when tick changes
  const uPlotData = useMemo(() => engine.getUPlotData(), [engine, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    state,
    uPlotData,
    tick,
    isRunning,
    toggle,
    reset,
    engine
  };
}

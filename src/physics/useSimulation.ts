import { useState, useEffect, useRef, useCallback } from 'react';
import { RotatorEngine } from './engine';
import { Config } from './constants';
import type { State } from './solver';

export function useSimulation() {
  const [engine] = useState(() => new RotatorEngine());
  const [isRunning, setIsRunning] = useState(false);
  const [state, setState] = useState<State>(engine.yState);
  
  const requestRef = useRef<number>(undefined);
  const lastUpdateRef = useRef<number>(0);

  const step = useCallback(() => {
    engine.step();
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
      
      let elapsed = now - lastUpdateRef.current;
      
      if (elapsed >= Config.SIM_INTERVAL) {
        // Execute as many steps as needed to catch up with wall-clock time
        while (elapsed >= Config.SIM_INTERVAL) {
          step();
          lastUpdateRef.current += Config.SIM_INTERVAL;
          elapsed -= Config.SIM_INTERVAL;
        }
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
    setState([...engine.yState] as State); // Fresh reference for initial render
    lastUpdateRef.current = 0;
    setIsRunning(false);
  }, [engine]);

  return {
    state,
    isRunning,
    toggle,
    reset,
    engine
  };
}

import React, { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { RotatorEngine } from '../physics/engine';

interface Props {
  options: uPlot.Options;
  engine: RotatorEngine;
  getData: (engine: RotatorEngine) => uPlot.AlignedData;
  width?: number;
}

const UPlotChart: React.FC<Props> = ({ options, engine, getData, width }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const uPlotInstance = useRef<uPlot>(undefined);

  useEffect(() => {
    if (chartRef.current) {
      uPlotInstance.current = new uPlot(options, getData(engine), chartRef.current);
    }
    
    const unsubscribe = engine.subscribe(() => {
      if (uPlotInstance.current) {
        uPlotInstance.current.setData(getData(engine));
      }
    });

    return () => {
      unsubscribe();
      uPlotInstance.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, engine, getData]);

  useEffect(() => {
    if (uPlotInstance.current && width) {
      uPlotInstance.current.setSize({ width, height: options.height });
    }
  }, [width, options.height]);

  return <div ref={chartRef} />;
};

export default UPlotChart;
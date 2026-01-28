import React, { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

interface Props {
  options: uPlot.Options;
  data: uPlot.AlignedData;
  width?: number;
  tick?: number;
}

const UPlotChart: React.FC<Props> = ({ options, data, width, tick }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const uPlotInstance = useRef<uPlot>(undefined);

  useEffect(() => {
    if (chartRef.current) {
      uPlotInstance.current = new uPlot(options, data, chartRef.current);
    }
    return () => {
      uPlotInstance.current?.destroy();
    };
    // We only want to re-create the chart if options change. 
    // Data updates are handled by the setData effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  useEffect(() => {
    if (uPlotInstance.current) {
      uPlotInstance.current.setData(data);
    }
  }, [tick, data]);

  useEffect(() => {
    if (uPlotInstance.current && width) {
      uPlotInstance.current.setSize({ width, height: options.height });
    }
  }, [width, options.height]);

  return <div ref={chartRef} />;
};

export default UPlotChart;
import { Config } from './constants';
import { rk4Step } from './solver';
import type { State } from './solver';
import uPlot from 'uplot';

export interface SimulationParams {
  t1: number;
  w1: number;
  t2: number;
  w2: number;
  g: number;
  J: number;
}

export class RotatorEngine {
  public yState: State = [Math.PI - 0.001, 0, 0, 0];
  public tCurr: number = 0;
  public J: number = 2.0;
  public g: number = 9.81;

  private lastTheta: [number, number] = [0, 0];
  private unwrappedTheta: [number, number] = [0, 0];

  // Circular Buffer Storage
  private head: number = 0;
  private count: number = 0; // Number of valid items currently in buffer
  private readonly capacity: number = Config.MAX_POINTS;

  // Fixed-size backing arrays
  private bufT: number[];
  private bufTh1: (number | null)[];
  private bufTh2: (number | null)[];
  private bufW1: (number | null)[];
  private bufW2: (number | null)[];
  private bufE1: (number | null)[];
  private bufE2: (number | null)[];
  private bufETot: (number | null)[];

  constructor() {
    this.bufT = new Array(this.capacity).fill(0);
    this.bufTh1 = new Array(this.capacity).fill(null);
    this.bufTh2 = new Array(this.capacity).fill(null);
    this.bufW1 = new Array(this.capacity).fill(null);
    this.bufW2 = new Array(this.capacity).fill(null);
    this.bufE1 = new Array(this.capacity).fill(null);
    this.bufE2 = new Array(this.capacity).fill(null);
    this.bufETot = new Array(this.capacity).fill(null);

    this.reset();
  }

  public reset(
    t1: number = Math.PI - 0.001,
    w1: number = 0.0,
    t2: number = 0.0,
    w2: number = 0.0,
    J: number = 2.0,
    g: number = 9.81
  ) {
    this.yState = [t1, w1, t2, w2];
    this.tCurr = 0.0;
    this.J = J;
    this.g = g;
    this.lastTheta = [t1, t2];
    this.unwrappedTheta = [t1, t2];

    // Reset buffer pointers
    this.head = 0;
    this.count = 0;

    this.addToHistory(this.tCurr, this.yState);
  }

  private pushToBuffer(
    pt: number, 
    th1: number | null, 
    th2: number | null, 
    v1: number, 
    v2: number, 
    en1: number, 
    en2: number, 
    entot: number
  ) {
    this.bufT[this.head] = pt;
    this.bufTh1[this.head] = th1;
    this.bufTh2[this.head] = th2;
    this.bufW1[this.head] = v1;
    this.bufW2[this.head] = v2;
    this.bufE1[this.head] = en1;
    this.bufE2[this.head] = en2;
    this.bufETot[this.head] = entot;

    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  private addToHistory(t: number, y: State) {
    const [t1, w1, t2, w2] = y;

    const wrap = (val: number) => {
      const range = 2 * Math.PI;
      const offset = val + Math.PI;
      return ((offset % range + range) % range) - Math.PI;
    };

    let dt1 = t1 - this.lastTheta[0];
    dt1 = wrap(dt1);
    this.unwrappedTheta[0] += dt1;

    let dt2 = t2 - this.lastTheta[1];
    dt2 = wrap(dt2);
    this.unwrappedTheta[1] += dt2;

    this.lastTheta = [t1, t2];

    const dTheta1 = wrap(this.unwrappedTheta[0]);
    const dTheta2 = wrap(this.unwrappedTheta[1]);

    const e1 = 0.5 * w1 * w1 + this.g * (1.0 - Math.cos(t1));
    const e2 = 0.5 * w2 * w2 + this.g * (1.0 - Math.cos(t2));
    const eTotal = e1 + e2 + this.J * (1.0 - Math.cos(t1 - t2));

    // Check for jumps (wrap-around visualization)
    // We check the LAST valid point in the buffer
    if (this.count > 0) {
      const lastIdx = (this.head - 1 + this.capacity) % this.capacity;
      const lastT1 = this.bufTh1[lastIdx];
      const lastT2 = this.bufTh2[lastIdx];

      if (lastT1 !== null && lastT2 !== null) {
        const jump1 = Math.abs(dTheta1 - (lastT1 as number)) > Math.PI;
        const jump2 = Math.abs(dTheta2 - (lastT2 as number)) > Math.PI;
        if (jump1 || jump2) {
          // Push a gap point
          this.pushToBuffer(t - 1e-9, null, null, w1, w2, e1, e2, eTotal);
    return {
      theta: [t, th1, th2] as uPlot.AlignedData,
      omega: [t, w1, w2] as uPlot.AlignedData,
      energy: [t, e1, e2, etot] as uPlot.AlignedData,
    };
  }
}

    this.pushToBuffer(t, dTheta1, dTheta2, w1, w2, e1, e2, eTotal);
  }

  public step(): [number, State] {
    this.yState = rk4Step(this.yState, this.tCurr, Config.DT, this.J, this.g);
    this.tCurr += Config.DT;
    this.addToHistory(this.tCurr, this.yState);
    return [this.tCurr, this.yState];
  }

  // Cache for data arrays to prevent memory leaks
  private cachedData: {
    t: number[];
    th1: (number | null)[];
    th2: (number | null)[];
    w1: (number | null)[];
    w2: (number | null)[];
    e1: (number | null)[];
    e2: (number | null)[];
    etot: (number | null)[];
  } | null = null;

  public getUPlotData() {
    // Reuse cached arrays to prevent memory allocation every call
    if (!this.cachedData) {
      this.cachedData = {
        t: new Array(this.capacity),
        th1: new Array(this.capacity),
        th2: new Array(this.capacity),
        w1: new Array(this.capacity),
        w2: new Array(this.capacity),
        e1: new Array(this.capacity),
        e2: new Array(this.capacity),
        etot: new Array(this.capacity),
      };
    }

    const { t, th1, th2, w1, w2, e1, e2, etot } = this.cachedData;

    // Unroll circular buffer into cached arrays
    let start = (this.head - this.count + this.capacity) % this.capacity;

    for (let i = 0; i < this.count; i++) {
      const idx = (start + i) % this.capacity;
      t[i] = this.bufT[idx];
      th1[i] = this.bufTh1[idx];
      th2[i] = this.bufTh2[idx];
      w1[i] = this.bufW1[idx];
      w2[i] = this.bufW2[idx];
      e1[i] = this.bufE1[idx];
      e2[i] = this.bufE2[idx];
      etot[i] = this.bufETot[idx];
    }

    // Trim arrays to actual count (important for uPlot)
    t.length = this.count;
    th1.length = this.count;
    th2.length = this.count;
    w1.length = this.count;
    w2.length = this.count;
    e1.length = this.count;
    e2.length = this.count;
    etot.length = this.count;

    return {
      theta: [t, th1, th2] as uPlot.AlignedData,
      omega: [t, w1, w2] as uPlot.AlignedData,
      energy: [t, e1, e2, etot] as uPlot.AlignedData,
    };
  }

    return {
      theta: [t, th1, th2] as uPlot.AlignedData,
      omega: [t, w1, w2] as uPlot.AlignedData,
      energy: [t, e1, e2, etot] as uPlot.AlignedData,
    };
  }
}

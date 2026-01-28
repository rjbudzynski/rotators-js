import { Config } from './constants';
import { rk4Step } from './solver';
import type { State } from './solver';

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

  constructor() {
    // For uPlot we need arrays that can hold nulls
    this.uPlotT = [];
    this.uPlotTh1 = [];
    this.uPlotTh2 = [];
    this.uPlotW1 = [];
    this.uPlotW2 = [];
    this.uPlotE1 = [];
    this.uPlotE2 = [];
    this.uPlotETot = [];

    this.reset();
  }

  // Persistent arrays to avoid GC pressure
  private uPlotT: number[];
  private uPlotTh1: (number | null)[];
  private uPlotTh2: (number | null)[];
  private uPlotW1: (number | null)[];
  private uPlotW2: (number | null)[];
  private uPlotE1: (number | null)[];
  private uPlotE2: (number | null)[];
  private uPlotETot: (number | null)[];

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

    // Clear arrays while preserving references
    this.uPlotT.length = 0;
    this.uPlotTh1.length = 0;
    this.uPlotTh2.length = 0;
    this.uPlotW1.length = 0;
    this.uPlotW2.length = 0;
    this.uPlotE1.length = 0;
    this.uPlotE2.length = 0;
    this.uPlotETot.length = 0;

    this.addToHistory(this.tCurr, this.yState);
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

    // Energy calculation: 0.5 * I * omega^2, where I = 1 (unit moment of inertia)
    // Kinetic energy: 0.5 * w^2, Potential energy: g * (1 - cos(theta))
    const e1 = 0.5 * w1 * w1 + this.g * (1.0 - Math.cos(t1));
    const e2 = 0.5 * w2 * w2 + this.g * (1.0 - Math.cos(t2));
    const eTotal = e1 + e2 + this.J * (1.0 - Math.cos(t1 - t2));

    const push = (pt: number, th1: number | null, th2: number | null, v1: number, v2: number, en1: number, en2: number, entot: number) => {
      this.uPlotT.push(pt);
      this.uPlotTh1.push(th1);
      this.uPlotTh2.push(th2);
      this.uPlotW1.push(v1);
      this.uPlotW2.push(v2);
      this.uPlotE1.push(en1);
      this.uPlotE2.push(en2);
      this.uPlotETot.push(entot);

      // Keep window within bounds
      const limit = Math.floor(Config.WINDOW_W / Config.DT) * 1.5;
      if (this.uPlotT.length > limit) {
        this.uPlotT.shift();
        this.uPlotTh1.shift();
        this.uPlotTh2.shift();
        this.uPlotW1.shift();
        this.uPlotW2.shift();
        this.uPlotE1.shift();
        this.uPlotE2.shift();
        this.uPlotETot.shift();
      }
    };

    // Check for jumps
    if (this.uPlotTh1.length > 0) {
      const lastT1 = this.uPlotTh1[this.uPlotTh1.length - 1];
      const lastT2 = this.uPlotTh2[this.uPlotTh2.length - 1];

      if (lastT1 !== null && lastT2 !== null) {
        const jump1 = Math.abs(dTheta1 - (lastT1 as number)) > Math.PI;
        const jump2 = Math.abs(dTheta2 - (lastT2 as number)) > Math.PI;
        if (jump1 || jump2) {
          push(t - 1e-9, jump1 ? null : dTheta1, jump2 ? null : dTheta2, w1, w2, e1, e2, eTotal);
        }
      }
    }

    push(t, dTheta1, dTheta2, w1, w2, e1, e2, eTotal);
  }

  public step(): [number, State] {
    this.yState = rk4Step(this.yState, this.tCurr, Config.DT, this.J, this.g);
    this.tCurr += Config.DT;
    this.addToHistory(this.tCurr, this.yState);
    this.notifyListeners();
    return [this.tCurr, this.yState];
  }

  private listeners: (() => void)[] = [];
  public subscribe(fn: () => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }
  private notifyListeners() {
    for (const l of this.listeners) l();
  }

  // Cache for returning arrays to prevent memory allocation
  private cachedUPlotData: {
    theta: uPlot.AlignedData;
    omega: uPlot.AlignedData;
    energy: uPlot.AlignedData;
  } | null = null;

  public getUPlotData() {
    // Reuse cached data structure to prevent memory allocation every call
    if (!this.cachedUPlotData) {
      this.cachedUPlotData = {
        theta: [this.uPlotT, this.uPlotTh1, this.uPlotTh2] as uPlot.AlignedData,
        omega: [this.uPlotT, this.uPlotW1, this.uPlotW2] as uPlot.AlignedData,
        energy: [this.uPlotT, this.uPlotE1, this.uPlotE2, this.uPlotETot] as uPlot.AlignedData,
      };
    }
    return this.cachedUPlotData;
  }
}
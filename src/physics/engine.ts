import { Config } from './constants';
import { rk4Step } from './solver';
import type { State } from './solver';

export interface SimulationHistory {
  t: number[];
  theta: [number[], number[]];
  omega: [number[], number[]];
  energy: [number[], number[], number[]]; // e1, e2, etotal
}

export class RotatorEngine {
  public yState: State = [Math.PI - 0.001, 0, 0, 0];
  public tCurr: number = 0;
  public J: number = 2.0;
  public g: number = 9.81;

  private maxHistory: number;
  private historyT: number[] = [];
  private historyTheta1: (number | null)[] = [];
  private historyTheta2: (number | null)[] = [];
  private historyOmega1: (number | null)[] = [];
  private historyOmega2: (number | null)[] = [];
  private historyE1: (number | null)[] = [];
  private historyE2: (number | null)[] = [];
  private historyETotal: (number | null)[] = [];

  private lastTheta: [number, number] = [0, 0];
  private unwrappedTheta: [number, number] = [0, 0];

  constructor() {
    this.maxHistory = Math.floor(Config.WINDOW_W / Config.DT) + 2;
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

    this.historyT = [];
    this.historyTheta1 = [];
    this.historyTheta2 = [];
    this.historyOmega1 = [];
    this.historyOmega2 = [];
    this.historyE1 = [];
    this.historyE2 = [];
    this.historyETotal = [];

    this.addToHistory(this.tCurr, this.yState);
  }

  private addToHistory(t: number, y: State) {
    const [t1, w1, t2, w2] = y;

    let dt1 = t1 - this.lastTheta[0];
    dt1 = ((dt1 + Math.PI) % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI) - Math.PI;
    this.unwrappedTheta[0] += dt1;

    let dt2 = t2 - this.lastTheta[1];
    dt2 = ((dt2 + Math.PI) % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI) - Math.PI;
    this.unwrappedTheta[1] += dt2;

    this.lastTheta = [t1, t2];

    const wrap = (val: number) => {
      const range = 2 * Math.PI;
      const offset = val + Math.PI;
      return ((offset % range + range) % range) - Math.PI;
    };

    const dTheta1 = wrap(this.unwrappedTheta[0]);
    const dTheta2 = wrap(this.unwrappedTheta[1]);

    const e1 = 0.5 * w1 * w1 + this.g * (1.0 - Math.cos(t1));
    const e2 = 0.5 * w2 * w2 + this.g * (1.0 - Math.cos(t2));
    const eTotal = e1 + e2 + this.J * (1.0 - Math.cos(t1 - t2));

    // Check for jumps to break lines in uPlot
    if (this.historyTheta1.length > 0) {
      const lastIdx = this.historyTheta1.length - 1;
      const lastT1 = this.historyTheta1[lastIdx];
      const lastT2 = this.historyTheta2[lastIdx];

      if (lastT1 !== null && lastT2 !== null) {
        const jump1 = Math.abs(dTheta1 - (lastT1 as number)) > 5.0;
        const jump2 = Math.abs(dTheta2 - (lastT2 as number)) > 5.0;

        if (jump1 || jump2) {
          this.historyT.push(t - 1e-9);
          this.historyTheta1.push(jump1 ? null : dTheta1);
          this.historyTheta2.push(jump2 ? null : dTheta2);
          this.historyOmega1.push(w1);
          this.historyOmega2.push(w2);
          this.historyE1.push(e1);
          this.historyE2.push(e2);
          this.historyETotal.push(eTotal);
        }
      }
    }

    this.historyT.push(t);
    this.historyTheta1.push(dTheta1);
    this.historyTheta2.push(dTheta2);
    this.historyOmega1.push(w1);
    this.historyOmega2.push(w2);
    this.historyE1.push(e1);
    this.historyE2.push(e2);
    this.historyETotal.push(eTotal);

    while (this.historyT.length > this.maxHistory * 1.5) {
      this.historyT.shift();
      this.historyTheta1.shift();
      this.historyTheta2.shift();
      this.historyOmega1.shift();
      this.historyOmega2.shift();
      this.historyE1.shift();
      this.historyE2.shift();
      this.historyETotal.shift();
    }
  }

  public step(): [number, State] {
    this.yState = rk4Step(this.yState, this.tCurr, Config.DT, this.J, this.g);
    this.tCurr += Config.DT;
    this.addToHistory(this.tCurr, this.yState);
    return [this.tCurr, this.yState];
  }

  public getUPlotData() {
    return {
      theta: [this.historyT, this.historyTheta1, this.historyTheta2],
      omega: [this.historyT, this.historyOmega1, this.historyOmega2],
      energy: [this.historyT, this.historyE1, this.historyE2, this.historyETotal],
    };
  }
}

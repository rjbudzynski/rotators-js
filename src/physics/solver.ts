export type State = [number, number, number, number]; // [theta1, omega1, theta2, omega2]

export function dynamics(_t: number, y: State, J: number, g: number): State {
  const [t1, w1, t2, w2] = y;
  const dw1 = -g * Math.sin(t1) - J * Math.sin(t1 - t2);
  const dw2 = -g * Math.sin(t2) - J * Math.sin(t2 - t1);
  return [w1, dw1, w2, dw2];
}

export function rk4Step(
  y: State,
  t: number,
  dt: number,
  J: number,
  g: number
): State {
  const k1 = dynamics(t, y, J, g);
  
  const y2: State = [
    y[0] + k1[0] * dt / 2,
    y[1] + k1[1] * dt / 2,
    y[2] + k1[2] * dt / 2,
    y[3] + k1[3] * dt / 2,
  ];
  const k2 = dynamics(t + dt / 2, y2, J, g);

  const y3: State = [
    y[0] + k2[0] * dt / 2,
    y[1] + k2[1] * dt / 2,
    y[2] + k2[2] * dt / 2,
    y[3] + k2[3] * dt / 2,
  ];
  const k3 = dynamics(t + dt / 2, y3, J, g);

  const y4: State = [
    y[0] + k3[0] * dt,
    y[1] + k3[1] * dt,
    y[2] + k3[2] * dt,
    y[3] + k3[3] * dt,
  ];
  const k4 = dynamics(t + dt, y4, J, g);

  return [
    y[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    y[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    y[2] + (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
    y[3] + (dt / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]),
  ];
}

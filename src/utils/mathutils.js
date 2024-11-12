export function sumObjectsByKey(...objs) {
  return objs.reduce((a, b) => {
    for (let k in b) {
      if (b.hasOwnProperty(k)) a[k] = (a[k] || 0) + b[k];
    }
    return a;
  }, {});
}

/** Returns a random integer between `min` and `max`. Both are inclusive.*/
export function rand(min, max) {
  const minCeiled = Math.ceil(min);
  let maxFloored = Math.floor(max);
  maxFloored++;
  return (Math.random() * (maxFloored - minCeiled) + minCeiled) | 0;
}

export function flr(value, decimal = 0) {
  const power = Math.pow(10, decimal);
  const floored = Number(Math.floor(value + "e" + decimal) + "e-" + decimal);
  const loss = (value - floored) * power;
  return loss >= 0.99999995 ? floored + 1 / power : floored;
}

export function cel(value, decimal = 0) {
  const power = Math.pow(10, decimal);
  const ceiled = Number(Math.ceil(value + "e" + decimal) + "e-" + decimal);
  const loss = (ceiled - value) * power;
  return loss >= 0.99999995 ? ceiled - 1 / power : ceiled;
}

export function rnd(value, decimal = 0) {
  return Number(Math.round(value + "e" + decimal) + "e-" + decimal);
}

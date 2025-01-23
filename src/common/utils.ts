import {
  ButtonResult,
  CustomGamepad,
  RawGamepad,
  StickResult,
} from '../types.ts';

// dev-helper type: expands object types one level deep
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

// dev-helper type: expands object types recursively
export type ExpendRecursively<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpendRecursively<O[K]> }
    : never
  : T;

export function isConsecutive(target: number[]) {
  const { length } = target;

  if (length <= 1) {
    return true;
  }

  let i = 0;
  while (i < length - 1) {
    if (target[i] + 1 !== target[i + 1]) {
      return false;
    }
    i += 1;
  }

  return true;
}

export function findIndexes(
  iterator: (a: number) => boolean,
  target: ReadonlyArray<number>,
) {
  const { length } = target;
  const result = [];
  let i = 0;

  while (i < length) {
    if (iterator(target[i])) {
      result.push(i);
    }
    i += 1;
  }

  return result;
}

export function getRawGamepads(): ReadonlyArray<RawGamepad | null> {
  if (navigator && navigator.getGamepads) {
    return Array.from(navigator.getGamepads());
  }
  return [];
}

export function gamepadIsValid(
  rawGamepad: RawGamepad | null,
): rawGamepad is RawGamepad {
  return (
    !!rawGamepad &&
    !!rawGamepad.connected &&
    !!rawGamepad.buttons.length &&
    !!rawGamepad.axes.length &&
    rawGamepad.timestamp !== 0 &&
    !!rawGamepad.id
  );
}

export function nameIsValid(name: string) {
  return /^[\da-z]+$/i.test(name);
}

export function isButtonSignificant(value = 0, threshold: number) {
  return Math.abs(value) > threshold;
}

export function isStickSignificant(stickValue: number[], threshold: number) {
  const squaredMagnitude = stickValue.reduce(
    (result, value) => result + value ** 2,
    0,
  );
  return threshold * threshold < squaredMagnitude;
}

export function buttonMap(
  pad: CustomGamepad,
  prevPad: CustomGamepad,
  indexes: number[],
  threshold: number,
  clampThreshold: boolean,
): ButtonResult {
  const { length } = indexes;

  let prevPressed = false;
  let value = 0;
  let pressed = false;

  let i = 0;
  while (i < length) {
    if (!prevPressed) {
      const prevValue = prevPad.buttons[indexes[i]] || 0;
      prevPressed = isButtonSignificant(prevValue, threshold);
    }

    const currValue = pad.buttons[indexes[i]] || 0;
    value = Math.max(value, currValue);
    if (!pressed) {
      pressed = isButtonSignificant(currValue, threshold);
    }

    i += 1;
  }

  return {
    justChanged: pressed !== prevPressed,
    pressed,
    type: 'button',
    value: !clampThreshold || pressed ? value : 0,
  };
}

export function roundSticks(
  indexMaps: number[][],
  axes: ReadonlyArray<number>,
  threshold: number,
) {
  let stickNumber = 0;
  let axesSums: number[] = [];

  indexMaps.forEach((indexes) => {
    const values = indexes.map((i) => axes[i]);

    if (isStickSignificant(values, threshold)) {
      axesSums = values.map((v, i) => v + (axesSums[i] || 0));
      stickNumber += 1;
    }
  });

  return stickNumber === 0
    ? indexMaps[0].map(() => 0)
    : axesSums.map((v) => v / stickNumber);
}

export function stickMap(
  pad: CustomGamepad,
  prevPad: CustomGamepad,
  indexMaps: number[][],
  inverts: boolean[],
  threshold: number,
  clampThreshold: boolean,
): StickResult {
  const prevPressed = isStickSignificant(
    roundSticks(indexMaps, prevPad.axes, threshold),
    threshold,
  );
  const value = roundSticks(indexMaps, pad.axes, threshold);
  const pressed = isStickSignificant(value, threshold);

  return {
    inverts,
    justChanged: pressed !== prevPressed,
    pressed,
    type: 'stick',
    value: value.map(
      !clampThreshold || pressed
        ? (v, i) => (!inverts[i] ? v : v * -1)
        : () => 0,
    ),
  };
}

export function mapValues<T, S>(
  fn: (value: T, key: string) => S,
  object: Record<string, T>,
) {
  const result: Record<string, S> = {};
  for (const key of Object.keys(object)) {
    result[key] = fn(object[key], key);
  }
  return result;
}

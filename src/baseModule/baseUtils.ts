import {
  findIndexes,
  isButtonSignificant,
  isConsecutive,
} from '../common/utils.ts';
import { Button, CustomGamepad, ListenOptions, Stick } from '../types.ts';

export const mockGamepad: CustomGamepad = {
  axes: [],
  buttons: [],
  rawPad: undefined,
};

export function updateListenOptions(
  listenOptions: ListenOptions,
  pad: CustomGamepad,
  threshold: number,
) {
  const {
    allowOffset,
    callback,
    consecutive,
    currentValue,
    quantity,
    targetValue,
    type,
    useTimeStamp,
  } = listenOptions;

  const indexes =
    type === 'axes'
      ? findIndexes((value) => Math.abs(value) > threshold, pad.axes)
      : findIndexes(
          (value) => isButtonSignificant(value, threshold),
          pad.buttons,
        );

  if (
    indexes.length === quantity &&
    (!consecutive || isConsecutive(indexes)) &&
    (allowOffset || indexes[0] % quantity === 0)
  ) {
    if (useTimeStamp && currentValue === 0) {
      listenOptions.currentValue = Date.now();
      return listenOptions;
    }

    const comparison = useTimeStamp
      ? Date.now() - currentValue
      : currentValue + 1;

    if (targetValue <= comparison) {
      if (type === 'axes') {
        callback([indexes]);
      } else {
        callback(indexes);
      }
      return null;
    }

    if (!useTimeStamp) {
      listenOptions.currentValue = comparison;
    }

    return listenOptions;
  }

  listenOptions.currentValue = 0;
  return listenOptions;
}

export function getDefaultButtons(): Record<string, Button> {
  return {
    A: [0],
    B: [1],
    L1: [4],
    L2: [6],
    L3: [10],
    R1: [5],
    R2: [7],
    R3: [11],
    X: [2],
    Y: [3],
    dpadDown: [13],
    dpadLeft: [14],
    dpadRight: [15],
    dpadUp: [12],
    home: [16],
    select: [8],
    start: [9],
  };
}

export function getDefaultSticks(): Record<string, Stick> {
  return {
    L: {
      indexes: [[0, 1]],
      inverts: [false, false],
    },
    R: {
      indexes: [[2, 3]],
      inverts: [false, false],
    },
  };
}

import {
  findIndexes,
  isButtonSignificant,
  isConsecutive,
  nameIsValid,
} from '../common/utils.ts';
import {
  BaseParams,
  Button,
  CustomGamepad,
  Effect,
  ListenOptions,
  RawGamepad,
  Stick,
  StrictEffect,
} from '../types.ts';
import {
  addRumble,
  applyRumble,
  getCurrentEffect,
  MAX_DURATION,
  stopRumble,
  updateChannels,
} from './rumble.ts';

export type BaseModule = ReturnType<typeof createModule>;

interface BaseState {
  buttons: Record<string, Button>;
  clampThreshold: boolean;
  lastRumbleUpdate: number;
  lastUpdate: number;
  pad: CustomGamepad;
  prevPad: CustomGamepad;
  prevRumble: StrictEffect;

  sticks: Record<string, Stick>;
  threshold: number;
}

const mockGamepad: CustomGamepad = {
  axes: [],
  buttons: [],
  rawPad: undefined,
};

function updateListenOptions(
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

function getDefaultButtons(): Record<string, Button> {
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

function getDefaultSticks(): Record<string, Stick> {
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

const findKey = <T>(
  fn: (item: T) => boolean,
  object: Record<string, T>,
): string | null => {
  for (const key of Object.keys(object)) {
    if (fn(object[key])) {
      return key;
    }
  }
  return null;
};

export default function createModule(params: BaseParams = {}) {
  let listenOptions: ListenOptions | null = null;
  let gamepadId = params.padId ? params.padId : null;
  let connected = !!params.padId;

  const state: BaseState = {
    buttons: getDefaultButtons(),
    clampThreshold: params.clampThreshold !== false,
    lastRumbleUpdate: Date.now(),
    lastUpdate: Date.now(),
    pad: mockGamepad,
    prevPad: mockGamepad,
    prevRumble: {
      duration: 0,
      strongMagnitude: 0,
      weakMagnitude: 0,
    },

    sticks: getDefaultSticks(),
    threshold: params.threshold || 0.2,
  };

  const module = {
    addRumble: (effect: Effect | Array<Effect>, channelName?: string) => {
      if (state.pad.rawPad) {
        addRumble(state.pad.rawPad.id, effect, channelName);
      }
    },

    buttonBindOnPress: (
      inputName: string,
      callback: (buttonName?: string) => void,
      allowDuplication = false,
    ) => {
      if (!nameIsValid(inputName)) {
        throw new Error(
          `On buttonBindOnPress('${inputName}'): inputName contains invalid characters`,
        );
      }

      module.listenButton((indexes: Array<number>) => {
        const resultName = findKey(
          (value) => value[0] === indexes[0],
          state.buttons,
        );

        if (!allowDuplication && resultName && state.buttons[inputName]) {
          module.swapButtons(inputName, resultName);
        } else {
          module.setButton(inputName, indexes);
        }

        if (resultName) {
          callback(resultName);
        }
      });
    },

    cancelListen: () => {
      listenOptions = null;
    },

    connect: (padId?: string) => {
      connected = true;
      if (padId) {
        gamepadId = padId;
      }
    },

    destroy: () => {
      module.disconnect();
      state.pad = mockGamepad;
      state.prevPad = mockGamepad;
    },
    disconnect: () => {
      connected = false;
    },

    getButtonIndexes: (...inputNames: Array<string>) => [
      ...new Set(
        inputNames.flatMap((inputName: string) => state.buttons[inputName]),
      ),
    ],

    getPadId: () => gamepadId,

    getStickIndexes: (...inputNames: Array<string>) => [
      ...new Set(
        inputNames
          .flatMap((inputName: string) => state.sticks[inputName].indexes)
          .map(String),
      ),
    ],

    invertSticks: (inverts: Array<boolean>, ...inputNames: Array<string>) => {
      inputNames.forEach((inputName) => {
        const stick = state.sticks[inputName];
        if (stick.inverts.length === inverts.length) {
          stick.inverts = inverts;
        } else {
          throw new Error(
            `On invertSticks(inverts, [..., ${inputName}, ...]): given argument inverts' length does not match '${inputName}' axis' length`,
          );
        }
      });
    },

    isConnected: () => connected,

    isRumbleSupported: (rawPad?: RawGamepad) => {
      const padToTest = rawPad || state.pad.rawPad;
      return padToTest
        ? !!padToTest.vibrationActuator &&
            !!padToTest.vibrationActuator.playEffect
        : null;
    },

    listenAxis: (
      callback: (indexes: Array<Array<number>>) => void,
      quantity = 2,
      {
        allowOffset = true,
        consecutive = true,
        waitFor = [100, 'ms'],
      }: {
        allowOffset?: boolean;
        consecutive?: boolean;
        waitFor?: [number, 'polls' | 'ms'];
      } = {},
    ) => {
      listenOptions = {
        allowOffset,
        callback: callback as (
          indexes: Array<number> | Array<Array<number>>,
        ) => void,
        consecutive,
        currentValue: 0,
        quantity,
        targetValue: waitFor[0],
        type: 'axes',
        useTimeStamp: waitFor[1] === 'ms',
      };
    },

    listenButton: (
      callback: (indexes: Array<number>) => void,
      quantity = 1,
      {
        allowOffset = true,
        consecutive = false,
        waitFor = [1, 'polls'],
      }: {
        allowOffset?: boolean;
        consecutive?: boolean;
        waitFor?: [number, 'polls' | 'ms'];
      } = {},
    ) => {
      listenOptions = {
        allowOffset,
        callback: callback as (
          indexes: Array<number> | Array<Array<number>>,
        ) => void,
        consecutive,
        currentValue: 0,
        quantity,
        targetValue: waitFor[0],
        type: 'buttons',
        useTimeStamp: waitFor[1] === 'ms',
      };
    },

    setButton: (inputName: string, indexes: Array<number>) => {
      if (!nameIsValid(inputName)) {
        throw new Error(
          `On setButton('${inputName}'): argument contains invalid characters`,
        );
      }
      state.buttons[inputName] = indexes;
    },

    setStick: (
      inputName: string,
      indexes: Array<Array<number>>,
      inverts?: Array<boolean>,
    ) => {
      if (!nameIsValid(inputName)) {
        throw new Error(
          `On setStick('${inputName}'): inputName contains invalid characters`,
        );
      }

      if (indexes.length === 0) {
        throw new Error(
          `On setStick('${inputName}', indexes): argument indexes is an empty array`,
        );
      }

      state.sticks[inputName] = {
        indexes,
        inverts: inverts || indexes[0].map(() => false),
      };
    },

    stickBindOnPress: (
      inputName: string,
      callback: (stickName?: string) => void,
      allowDuplication = false,
    ) => {
      if (!nameIsValid(inputName)) {
        throw new Error(
          `On stickBindOnPress('${inputName}'): inputName contains invalid characters`,
        );
      }

      module.listenAxis((indexesResult: Array<Array<number>>) => {
        const resultName = findKey(({ indexes }) => {
          if (indexes.length !== indexesResult.length) {
            return false;
          }

          for (let i = 0; i < indexes.length; i++) {
            if (indexes[i].length !== indexesResult[i].length) {
              return false;
            }

            for (let axis = 0; axis < indexes[i].length; axis++) {
              if (indexes[i][axis] !== indexesResult[i][axis]) {
                return false;
              }
            }
          }
          return true;
        }, state.sticks);

        if (!allowDuplication && resultName && state.sticks[inputName]) {
          module.swapSticks(inputName, resultName);
        } else {
          module.setStick(inputName, indexesResult);
        }

        if (resultName) {
          callback(resultName);
        }
      });
    },

    stopRumble: (channelName?: string) => {
      if (state.pad.rawPad) {
        stopRumble(state.pad.rawPad.id, channelName);
      }
    },

    swapButtons: (btn1: string, btn2: string) => {
      const { buttons } = state;
      [buttons[btn1], buttons[btn2]] = [buttons[btn2], buttons[btn1]];
    },

    swapSticks: (stick1: string, stick2: string, includeInverts = false) => {
      const { sticks } = state;
      if (includeInverts) {
        [sticks[stick1], sticks[stick2]] = [sticks[stick2], sticks[stick1]];
      } else {
        [sticks[stick1].indexes, sticks[stick2].indexes] = [
          sticks[stick2].indexes,
          sticks[stick1].indexes,
        ];
      }
    },

    update: (gamepad: RawGamepad) => {
      state.prevPad = state.pad;
      state.pad = {
        axes: gamepad.axes,
        buttons: gamepad.buttons.map((a) => a.value),
        rawPad: gamepad,
      };

      if (listenOptions) {
        listenOptions = updateListenOptions(
          listenOptions,
          state.pad,
          state.threshold,
        );
      }

      // Update rumble state

      if (module.isRumbleSupported()) {
        const now = Date.now();
        const currentRumble = getCurrentEffect(gamepad.id);
        updateChannels(gamepad.id, now - state.lastUpdate);

        if (
          state.prevRumble.weakMagnitude !== currentRumble.weakMagnitude ||
          state.prevRumble.strongMagnitude !== currentRumble.strongMagnitude ||
          now - state.lastRumbleUpdate >= MAX_DURATION / 2
        ) {
          applyRumble(gamepad, currentRumble);
          state.prevRumble = currentRumble;
          state.lastRumbleUpdate = now;
        }

        state.lastUpdate = now;
      }
    },
  };

  return { module, state };
}

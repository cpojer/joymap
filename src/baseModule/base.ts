import { nameIsValid } from '../common/utils';
import {
  BaseParams,
  Button,
  CustomGamepad,
  Effect,
  ListenOptions,
  RawGamepad,
  Stick,
  StrictEffect,
} from '../types';
import {
  getDefaultButtons,
  getDefaultSticks,
  mockGamepad,
  updateListenOptions,
} from './baseUtils';
import {
  addRumble,
  applyRumble,
  getCurrentEffect,
  MAX_DURATION,
  stopRumble,
  updateChannels,
} from './rumble';

export type BaseModule = ReturnType<typeof createModule>;

interface BaseState {
  threshold: number;
  clampThreshold: boolean;
  pad: CustomGamepad;
  prevPad: CustomGamepad;
  prevRumble: StrictEffect;
  lastRumbleUpdate: number;
  lastUpdate: number;

  buttons: Record<string, Button>;
  sticks: Record<string, Stick>;
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
    threshold: params.threshold || 0.2,
    clampThreshold: params.clampThreshold !== false,
    pad: mockGamepad,
    prevPad: mockGamepad,
    prevRumble: {
      duration: 0,
      weakMagnitude: 0,
      strongMagnitude: 0,
    },
    lastRumbleUpdate: Date.now(),
    lastUpdate: Date.now(),

    buttons: getDefaultButtons(),
    sticks: getDefaultSticks(),
  };

  const module = {
    getPadId: () => gamepadId,

    isConnected: () => connected,

    disconnect: () => {
      connected = false;
    },

    connect: (padId?: string) => {
      connected = true;
      if (padId) {
        gamepadId = padId;
      }
    },

    getButtonIndexes: (...inputNames: string[]) => [
      ...new Set(
        inputNames.flatMap((inputName: string) => state.buttons[inputName]),
      ),
    ],
    getStickIndexes: (...inputNames: string[]) => [
      ...new Set(
        inputNames
          .flatMap((inputName: string) => state.sticks[inputName].indexes)
          .map(String),
      ),
    ],

    setButton: (inputName: string, indexes: number[]) => {
      if (!nameIsValid(inputName)) {
        throw new Error(
          `On setButton('${inputName}'): argument contains invalid characters`,
        );
      }
      state.buttons[inputName] = indexes;
    },

    setStick: (inputName: string, indexes: number[][], inverts?: boolean[]) => {
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

    invertSticks: (inverts: boolean[], ...inputNames: string[]) => {
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
        axes: gamepad.axes as number[],
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

    cancelListen: () => {
      listenOptions = null;
    },

    listenButton: (
      callback: (indexes: number[]) => void,
      quantity = 1,
      {
        waitFor = [1, 'polls'],
        consecutive = false,
        allowOffset = true,
      }: {
        waitFor?: [number, 'polls' | 'ms'];
        consecutive?: boolean;
        allowOffset?: boolean;
      } = {},
    ) => {
      listenOptions = {
        callback: callback as (indexes: number[] | number[][]) => void,
        quantity,
        type: 'buttons',
        currentValue: 0,
        useTimeStamp: waitFor[1] === 'ms',
        targetValue: waitFor[0],
        consecutive,
        allowOffset,
      };
    },

    listenAxis: (
      callback: (indexes: number[][]) => void,
      quantity = 2,
      {
        waitFor = [100, 'ms'],
        consecutive = true,
        allowOffset = true,
      }: {
        waitFor?: [number, 'polls' | 'ms'];
        consecutive?: boolean;
        allowOffset?: boolean;
      } = {},
    ) => {
      listenOptions = {
        callback: callback as (indexes: number[] | number[][]) => void,
        quantity,
        type: 'axes',
        currentValue: 0,
        useTimeStamp: waitFor[1] === 'ms',
        targetValue: waitFor[0],
        consecutive,
        allowOffset,
      };
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

      module.listenButton((indexes: number[]) => {
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

      module.listenAxis((indexesResult: number[][]) => {
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

    isRumbleSupported: (rawPad?: RawGamepad) => {
      const padToTest = rawPad || state.pad.rawPad;
      if (padToTest) {
        return (
          !!padToTest.vibrationActuator &&
          !!padToTest.vibrationActuator.playEffect
        );
      } else {
        return null;
      }
    },

    stopRumble: (channelName?: string) => {
      if (state.pad.rawPad) {
        stopRumble(state.pad.rawPad.id, channelName);
      }
    },

    addRumble: (effect: Effect | Effect[], channelName?: string) => {
      if (state.pad.rawPad) {
        addRumble(state.pad.rawPad.id, effect, channelName);
      }
    },

    destroy: () => {
      module.disconnect();
      state.pad = mockGamepad;
      state.prevPad = mockGamepad;
    },
  };

  return { module, state };
}

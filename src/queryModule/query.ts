import memoize from 'fast-memoize';
import createBaseModule from '../baseModule/base.ts';
import { buttonMap, mapValues, stickMap } from '../common/utils.ts';
import { ButtonResult, StickResult } from '../types.ts';

export type QueryModule = ReturnType<typeof createQueryModule>;

export type MapperResult = Record<string, unknown> | null;

export type Mapper = (module: QueryModule) => MapperResult;

export const emptyMapper: MapperResult = null;

export const emptyStick: StickResult = {
  inverts: [false, false],
  justChanged: false,
  pressed: false,
  type: 'stick',
  value: [0, 0],
};

export const emptyButton: ButtonResult = {
  justChanged: false,
  pressed: false,
  type: 'button',
  value: 0,
};

export default function createQueryModule(params = {}) {
  const { module: baseModule, state } = createBaseModule(params);

  let mappers: Record<string, Mapper> = {};

  // @ts-expect-error
  const buttonMapMemoized = memoize(buttonMap);
  // @ts-expect-error
  const stickMapMemoized = memoize(stickMap);

  const module = Object.assign(baseModule, {
    clearMappers: () => {
      mappers = {};
    },

    destroy: () => {
      baseModule.destroy();
      module.clearMappers();
    },

    getAllButtons: (): Record<string, ButtonResult> => {
      if (!module.isConnected()) {
        return mapValues(() => emptyButton, state.buttons);
      }

      return mapValues(
        (button) =>
          buttonMapMemoized(
            state.pad,
            state.prevPad,
            button,
            state.threshold,
            state.clampThreshold,
          ),
        state.buttons,
      );
    },

    getAllMappers: (): Record<string, MapperResult> => {
      if (!module.isConnected()) {
        return mapValues(() => emptyMapper, mappers);
      }

      return mapValues((mapper) => mapper(module), mappers);
    },

    getAllSticks: (): Record<string, StickResult> => {
      if (!module.isConnected()) {
        return mapValues(() => emptyStick, state.sticks);
      }

      return mapValues((stick) => {
        const { indexes, inverts } = stick;
        return stickMapMemoized(
          state.pad,
          state.prevPad,
          indexes,
          inverts,
          state.threshold,
          state.clampThreshold,
        );
      }, state.sticks);
    },

    getButton: (inputName: string) => {
      if (!module.isConnected()) {
        return emptyButton;
      }

      return buttonMapMemoized(
        state.pad,
        state.prevPad,
        state.buttons[inputName],
        state.threshold,
        state.clampThreshold,
      );
    },

    getButtons: (...inputNames: Array<string>) => {
      if (!module.isConnected()) {
        const result: Record<string, ButtonResult> = {};
        inputNames.forEach((mapperName) => {
          result[mapperName] = emptyButton;
        });

        return result;
      }

      const result: Record<string, ButtonResult> = {};
      inputNames.forEach((inputName) => {
        result[inputName] = buttonMapMemoized(
          state.pad,
          state.prevPad,
          state.buttons[inputName],
          state.threshold,
          state.clampThreshold,
        );
      });

      return result;
    },

    getMapper: (mapperName: string) => {
      if (!module.isConnected()) {
        const emptyMapper = null;
        return emptyMapper;
      }

      return mappers[mapperName](module);
    },

    getMappers: (...mapperNames: Array<string>) => {
      if (!module.isConnected()) {
        const result: Record<string, MapperResult> = {};
        mapperNames.forEach((mapperName) => {
          result[mapperName] = emptyMapper;
        });

        return result;
      }

      const result: Record<string, MapperResult> = {};
      mapperNames.forEach((mapperName) => {
        result[mapperName] = mappers[mapperName](module);
      });

      return result;
    },

    getStick: (inputName: string) => {
      if (!module.isConnected()) {
        return emptyStick;
      }

      const { indexes, inverts } = state.sticks[inputName];
      return stickMapMemoized(
        state.pad,
        state.prevPad,
        indexes,
        inverts,
        state.threshold,
        state.clampThreshold,
      );
    },

    getSticks: (...inputNames: Array<string>) => {
      if (!module.isConnected()) {
        const result: Record<string, StickResult> = {};
        inputNames.forEach((mapperName) => {
          result[mapperName] = emptyStick;
        });

        return result;
      }

      const result: Record<string, StickResult> = {};
      inputNames.forEach((inputName) => {
        const { indexes, inverts } = state.sticks[inputName];
        result[inputName] = stickMapMemoized(
          state.pad,
          state.prevPad,
          indexes,
          inverts,
          state.threshold,
          state.clampThreshold,
        );
      });

      return result;
    },

    removeMapper: (mapperName: string) => {
      delete mappers[mapperName];
    },

    setMapper: (mapperName: string, mapper: Mapper) => {
      mappers[mapperName] = mapper;
    },
  });

  return module;
}

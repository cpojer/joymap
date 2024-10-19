import memoize from 'fast-memoize';
import createBaseModule from '../baseModule/base';
import { buttonMap, mapValues, stickMap } from '../common/utils';
import { ButtonResult, StickResult } from '../types';

export type QueryModule = ReturnType<typeof createQueryModule>;

export type MapperResult = Record<string, unknown> | null;

export type Mapper = (module: QueryModule) => MapperResult;

export const emptyMapper: MapperResult = null;

export const emptyStick: StickResult = {
  type: 'stick',
  value: [0, 0],
  pressed: false,
  justChanged: false,
  inverts: [false, false],
};

export const emptyButton: ButtonResult = {
  type: 'button',
  value: 0,
  pressed: false,
  justChanged: false,
};

export default function createQueryModule(params = {}) {
  const { state, module: baseModule } = createBaseModule(params);

  let mappers: Record<string, Mapper> = {};

  const buttonMapMemoized = memoize(buttonMap);
  const stickMapMemoized = memoize(stickMap);

  const module = Object.assign(baseModule, {
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

    getButtons: (...inputNames: string[]) => {
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

    getSticks: (...inputNames: string[]) => {
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

    getMapper: (mapperName: string) => {
      if (!module.isConnected()) {
        const emptyMapper = null;
        return emptyMapper;
      }

      return mappers[mapperName](module);
    },

    getMappers: (...mapperNames: string[]) => {
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

    getAllMappers: (): Record<string, MapperResult> => {
      if (!module.isConnected()) {
        return mapValues(() => emptyMapper, mappers);
      }

      return mapValues((mapper) => mapper(module), mappers);
    },

    setMapper: (mapperName: string, mapper: Mapper) => {
      mappers[mapperName] = mapper;
    },

    removeMapper: (mapperName: string) => {
      delete mappers[mapperName];
    },

    clearMappers: () => {
      mappers = {};
    },

    destroy: () => {
      baseModule.destroy();
      module.clearMappers();
    },
  });

  return module;
}

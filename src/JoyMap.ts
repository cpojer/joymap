import { BaseModule } from './baseModule/base';
import { gamepadIsValid, getRawGamepads } from './common/utils';
import { QueryModule } from './queryModule/query';
import { JoymapParams, RawGamepad } from './types';

interface JoymapState {
  onPoll: () => void;
  autoConnect: boolean;
  gamepads: RawGamepad[];
  modules: AnyModule[];
}

export type AnyModule = BaseModule['module'] | QueryModule;

export type Joymap = ReturnType<typeof createJoymap>;

export default function createJoymap(params: JoymapParams = {}) {
  let animationFrameRequestId: number | null = null;
  const isSupported = navigator && typeof navigator.getGamepads === 'function';

  const state: JoymapState = {
    onPoll: params.onPoll || (() => {}),
    autoConnect: params.autoConnect !== false,
    gamepads: [],
    modules: [],
  };

  const joymap = {
    isSupported: () => isSupported,

    start: () => {
      if (isSupported && animationFrameRequestId === null) {
        joymap.poll();
        if (state.autoConnect) {
          state.modules.forEach((module) => {
            if (!module.isConnected()) {
              const padId = joymap.getUnusedPadId();
              if (padId) {
                module.connect(padId);
              }
            }
          });
        }
        const step = () => {
          joymap.poll();
          animationFrameRequestId = window.requestAnimationFrame(step);
        };
        animationFrameRequestId = window.requestAnimationFrame(step);
      }
    },

    stop: () => {
      if (animationFrameRequestId !== null) {
        window.cancelAnimationFrame(animationFrameRequestId);
        animationFrameRequestId = null;
      }
    },

    setOnPoll: (onPoll: () => void) => {
      state.onPoll = onPoll;
    },

    setAutoConnect: (autoConnect: boolean) => {
      state.autoConnect = autoConnect;
    },

    getGamepads: () => state.gamepads,

    getModules: () => state.modules,

    getUnusedPadIds: () => {
      const modules = new Set(state.modules.map((module) => module.getPadId()));
      return state.gamepads
        .map(({ id }) => id)
        .filter((id) => !modules.has(id));
    },

    getUnusedPadId: () => {
      const usedIds = new Set(state.modules.map((module) => module.getPadId()));
      return state.gamepads.find(({ id }) => !usedIds.has(id))?.id;
    },

    addModule: (module: AnyModule) => {
      state.modules.push(module);

      if (state.autoConnect && !module.getPadId()) {
        const padId = joymap.getUnusedPadId();
        if (padId) {
          module.connect(padId);
        }
      }
    },

    removeModule: (module: AnyModule) => {
      state.modules = state.modules.filter((m) => m !== module);
      module.destroy();
    },

    clearModules: () => {
      state.modules.forEach((module) => joymap.removeModule(module));
    },

    poll: () => {
      state.gamepads = getRawGamepads().filter(gamepadIsValid) as RawGamepad[];

      state.modules.forEach((module) => {
        if (state.autoConnect && !module.getPadId()) {
          const padId = joymap.getUnusedPadId();
          if (padId) {
            module.connect(padId);
            const pad = state.gamepads.find(
              ({ id }) => id === module.getPadId(),
            );
            if (pad) {
              module.update(pad);
            }
          }
        } else {
          const gamepad = state.gamepads.find(
            ({ id }) => id === module.getPadId(),
          );

          if (gamepad) {
            if (!module.isConnected()) {
              module.connect();
            }
            module.update(gamepad);
          } else if (module.isConnected()) {
            module.disconnect();
          }
        }
      });

      state.onPoll();
    },
  };

  return joymap;
}

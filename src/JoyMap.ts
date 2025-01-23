import { BaseModule } from './baseModule/base.ts';
import { gamepadIsValid, getRawGamepads } from './common/utils.ts';
import { QueryModule } from './queryModule/query.ts';
import { JoymapOptions, RawGamepad } from './types.ts';

type JoymapState = {
  readonly autoConnect: boolean;
  gamepads: ReadonlyArray<RawGamepad>;
  modules: Array<AnyModule>;
  readonly onPoll: () => void;
};

export type AnyModule = BaseModule['module'] | QueryModule;
export type Joymap = ReturnType<typeof createJoymap>;

export default function createJoymap({ autoConnect, onPoll }: JoymapOptions) {
  const state: JoymapState = {
    autoConnect: !!autoConnect,
    gamepads: [],
    modules: [],
    onPoll,
  };

  const onGamepadChange = () => joymap.start();
  let animationFrameRequestId: number | null = null;
  const joymap = {
    addModule: (module: AnyModule) => {
      state.modules.push(module);

      if (state.autoConnect && !module.getPadId()) {
        const padId = joymap.getUnusedPadId();
        if (padId) {
          module.connect(padId);
        }
      }
    },

    clearModules: () => {
      state.modules.forEach((module) => joymap.removeModule(module));
    },

    getGamepads: () => state.gamepads,
    getModules: () => state.modules,

    getUnusedPadId: () => {
      const usedIds = new Set(state.modules.map((module) => module.getPadId()));
      return state.gamepads.find(({ id }) => !usedIds.has(id))?.id;
    },

    getUnusedPadIds: () => {
      const modules = new Set(state.modules.map((module) => module.getPadId()));
      return state.gamepads
        .map(({ id }) => id)
        .filter((id) => !modules.has(id));
    },

    poll: () => {
      state.gamepads = getRawGamepads().filter(gamepadIsValid);

      for (const module of state.modules) {
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
      }

      if (state.gamepads.length > 0) {
        state.onPoll();
      }
    },

    removeModule: (module: AnyModule) => {
      state.modules = state.modules.filter((m) => m !== module);
      module.destroy();
    },

    start: () => {
      if (animationFrameRequestId != null) {
        return;
      }

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

      window.addEventListener('gamepadconnected', onGamepadChange);
      window.addEventListener('gamepaddisconnected', onGamepadChange);

      const step = () => {
        joymap.poll();
        animationFrameRequestId = state.gamepads.length
          ? window.requestAnimationFrame(step)
          : null;
      };

      animationFrameRequestId = window.requestAnimationFrame(step);
    },

    stop: () => {
      if (animationFrameRequestId !== null) {
        window.cancelAnimationFrame(animationFrameRequestId);
        animationFrameRequestId = null;
      }

      window.removeEventListener('gamepadconnected', onGamepadChange);
      window.removeEventListener('gamepaddisconnected', onGamepadChange);
    },
  };

  return joymap;
}

import createBaseModule, { BaseModule } from './baseModule/base.ts';
import createJoymap, { AnyModule, Joymap } from './JoyMap.ts';
import createQueryModule, {
  Mapper,
  MapperResult,
  QueryModule,
} from './queryModule/query.ts';

export { createBaseModule, createQueryModule, createJoymap };

export type {
  BaseModule,
  QueryModule,
  Mapper,
  MapperResult,
  AnyModule,
  Joymap,
};

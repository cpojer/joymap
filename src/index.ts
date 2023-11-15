import createBaseModule, { BaseModule } from './baseModule/base';
import createJoymap, { AnyModule, Joymap } from './JoyMap';
import createQueryModule, {
  Mapper,
  MapperResult,
  QueryModule,
} from './queryModule/query';

export { createBaseModule, createQueryModule, createJoymap };

export type {
  BaseModule,
  QueryModule,
  Mapper,
  MapperResult,
  AnyModule,
  Joymap,
};

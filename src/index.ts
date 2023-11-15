import createBaseModule, { BaseModule } from './baseModule/base';
import createQueryModule, { QueryModule, MapperResult, Mapper } from './queryModule/query';
import createEventModule, { EventModule } from './eventModule/event';
import createJoymap, { Joymap, AnyModule } from './JoyMap';

export * from './types';

export {
  createBaseModule,
  createQueryModule,
  createEventModule,
  createJoymap,
  BaseModule,
  QueryModule,
  Mapper,
  MapperResult,
  EventModule,
  AnyModule,
  Joymap,
};

export default {
  createBaseModule,
  createQueryModule,
  createEventModule,
  createJoymap,
};

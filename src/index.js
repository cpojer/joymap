/* @flow */

// Ugly imports and export because flow does not understand export X from 'path'

import j from './JoyMap';
import p from './Player';

import { makeButtonBinding as makeB, stickBindings as makeS } from './lib/utils';

export default j;

export const Player = p;
export const makeButtonBinding = makeB;
export const stickBindings = makeS;

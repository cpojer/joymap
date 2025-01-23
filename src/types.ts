export type Button = Array<number>;

export type Stick = { indexes: Array<Array<number>>; inverts: Array<boolean> };

export interface ButtonResult {
  justChanged: boolean;
  pressed: boolean;
  type: 'button';
  value: number;
}

export interface StickResult {
  inverts: Array<boolean>;
  justChanged: boolean;
  pressed: boolean;
  type: 'stick';
  value: Array<number>;
}

export type InputResult = ButtonResult | StickResult;

export type RawGamepad = Gamepad;

export type CustomGamepad = {
  axes: ReadonlyArray<number>;
  buttons: Array<number>;
  rawPad?: RawGamepad;
};

export interface JoymapOptions {
  autoConnect?: boolean;
  onPoll: () => void;
}

export interface BaseParams {
  clampThreshold?: boolean;
  padId?: string;
  threshold?: number;
}

export type Effect =
  | number
  | {
      duration: number;
      strongMagnitude?: number;
      weakMagnitude?: number;
    };

// StrictEffect means all values are valid (duration > 0, magnitudes between 0 and 1)
export interface StrictEffect {
  duration: number;
  strongMagnitude: number;
  weakMagnitude: number;
}

export interface ListenOptions {
  allowOffset: boolean;
  callback: (indexes: Array<number> | Array<Array<number>>) => void;
  consecutive: boolean;
  currentValue: number;
  quantity: number;
  targetValue: number;
  type: 'buttons' | 'axes';
  useTimeStamp: boolean;
}

export interface InputToken {
  inputName: string;
  inputState: 'justPressed' | 'justReleased' | 'pressed' | 'released';
}

export type OperatorToken = string;

export type EventToken = InputToken | OperatorToken;

export interface InputEvent {
  callback: (button: Array<InputResult>) => void;
  name: string;
  tokens: Array<EventToken>;
}

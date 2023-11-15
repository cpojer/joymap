import { last } from 'lodash/fp';

export const operatorPrecedence = { '||': 1, '&&': 2 };
export const operators = Object.keys(operatorPrecedence);
export const nonInputs = [...operators, '(', ')'];

/**
 * Takes an array of infix tokens and transforms it to postfix (removing parens)
 */
export default function shuntingYard(tokens: string[]): string[] {
  const stack: string[] = [];

  return tokens
    .reduce<Array<string>>((output, token) => {
      if (!nonInputs.includes(token)) {
        output.push(token);
      }

      if (token in operatorPrecedence) {
        while (
          last(stack)! in operatorPrecedence &&
          // @ts-expect-error Too lazy to type this.
          operatorPrecedence[token] <= operatorPrecedence[last(stack)]
        ) {
          output.push(stack.pop()!);
        }
        stack.push(token);
      }

      if (token === '(') {
        stack.push(token);
      }

      if (token === ')') {
        while (last(stack) !== '(') {
          output.push(stack.pop()!);
        }
        stack.pop();
      }

      return output;
    }, [])
    .concat(stack.reverse());
}

import nkzw from '@nkzw/eslint-config';

export default [
  ...nkzw,
  { ignores: ['lib/**/*'] },
  {
    rules: {
      'no-unused-expressions': 0,
      'prefer-template': 2,
      'require-await': 2,
    },
  },
];

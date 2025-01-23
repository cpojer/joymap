import nkzw from '@nkzw/eslint-config';

export default [
  ...nkzw,
  { ignores: ['lib/**/*'] },
  {
    rules: {
      'no-unused-expressions': 0,
      'require-await': 2,
      'prefer-template': 2,
    },
  },
];

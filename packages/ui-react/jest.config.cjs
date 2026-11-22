/** @type {import('jest').Config} */
const config = {
  displayName: 'ui-react',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          ['@babel/preset-react', { runtime: 'automatic' }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  moduleNameMapper: {
    // Map @levain/tokens to the local tokens package
    '^@levain/tokens$': '<rootDir>/../tokens/index.ts',
    // Map @/lib/hooks to a mock for app-specific hooks
    '^@/lib/hooks/(.*)$': '<rootDir>/src/components/tests/__mocks__/hooks.ts',
    // Map @/lib/themes to tokens package
    '^@/lib/themes(.*)$': '<rootDir>/../tokens/index.ts',
    // Map @/lib/utils to local utils
    '^@/lib/utils$': '<rootDir>/src/utils/cn.ts',
  },
  setupFilesAfterEnv: [
    '@testing-library/jest-dom',
    '<rootDir>/src/components/tests/setup.ts',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/__mocks__/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/tests/**',
    '!src/**/__mocks__/**',
  ],
};

module.exports = config;

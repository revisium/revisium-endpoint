import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',

  modulePaths: ['<rootDir>'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  testRegex: '.*\\.spec\\.ts$',

  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          target: 'es2021',
          parser: { syntax: 'typescript', tsx: false, decorators: true },
          transform: { decoratorMetadata: true },
        },
        module: { type: 'commonjs' },
        sourceMaps: 'inline',
      },
    ],
  },

  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!<rootDir>/src/endpoint-microservice/core-api/generated/**',
    '!<rootDir>/src/**/__tests__/**',
    '!<rootDir>/src/**/index.ts',
    '!<rootDir>/src/**/*.module.ts',
    '!<rootDir>/jest.config.ts',
  ],

  coverageReporters: ['text-summary', 'lcov'],
  coverageDirectory: './coverage',
};

export default config;

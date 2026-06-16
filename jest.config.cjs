module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__'],
  moduleFileExtensions: ['js', 'jsx'],
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { presets: ["@babel/preset-env", "@babel/preset-react"] }]
  },
  setupFilesAfterEnv: [],
  extensionsToTreatAsEsm: ['.jsx'],
};

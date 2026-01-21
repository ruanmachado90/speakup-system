module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src/__tests__'],
  moduleFileExtensions: ['js', 'jsx'],
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { presets: ["@babel/preset-env", "@babel/preset-react"] }]
  },
  setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect'],
  extensionsToTreatAsEsm: ['.jsx'],
};

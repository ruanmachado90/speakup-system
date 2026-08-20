module.exports = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['browser'],
  },
  roots: ['<rootDir>/src/__tests__'],
  moduleFileExtensions: ['js', 'jsx'],
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { presets: ["@babel/preset-env", ["@babel/preset-react", { runtime: "automatic" }]], plugins: ["./babel-plugin-import-meta-env.cjs"] }]
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  extensionsToTreatAsEsm: ['.jsx'],
};

require('@testing-library/jest-dom');

// react-router usa TextEncoder/TextDecoder, que o jsdom não expõe.
const { TextEncoder, TextDecoder } = require('util');
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;

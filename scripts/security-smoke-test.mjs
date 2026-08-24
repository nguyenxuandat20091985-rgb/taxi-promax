import assert from 'node:assert/strict';
import {
  cleanText,
  isPositiveAmount,
  isSafeId
} from '../lib/api-security.js';
import adminLogin from '../api/admin-login.js';
import adminAI from '../api/admin-ai.js';
import systemDiagnostic from '../api/system-diagnostic.js';
import externalAi from '../api/ai-assistant.js';

assert.equal(cleanText('  hello  ', 10), 'hello');
assert.equal(cleanText('1234567890', 5), '12345');
assert.equal(isPositiveAmount(49000), true);
assert.equal(isPositiveAmount(0), false);
assert.equal(isPositiveAmount(100000001), false);
assert.equal(isSafeId('DRV_ABC-123'), true);
assert.equal(isSafeId('../drivers'), false);
assert.equal(isSafeId(''), false);

const originalEnv = {
  ADMIN_PHONE: process.env.ADMIN_PHONE,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
  EXTERNAL_AI_API_KEY: process.env.EXTERNAL_AI_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY
};

delete process.env.ADMIN_PHONE;
delete process.env.ADMIN_PASSWORD_HASH;
delete process.env.ADMIN_SESSION_SECRET;
delete process.env.EXTERNAL_AI_API_KEY;
delete process.env.GROQ_API_KEY;

const response = {
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(value) {
    this.body = value;
    return this;
  },
  setHeader() {}
};

await adminLogin(
  {
    method: 'POST',
    headers: {},
    body: { phone: 'x', password: 'y' }
  },
  response
);

assert.equal(response.statusCode, 401);

const externalAiResponse = {
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(value) {
    this.body = value;
    return this;
  },
  setHeader() {}
};

await externalAi(
  {
    method: 'POST',
    headers: {},
    body: { question: 'Giải thích một vấn đề chung' }
  },
  externalAiResponse
);

assert.equal(externalAiResponse.statusCode, 503);
assert.equal(externalAiResponse.body.externalAi, true);

const adminAIResponse = {
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(value) {
    this.body = value;
    return this;
  },
  setHeader() {}
};

await adminAI(
  {
    method: 'POST',
    headers: {},
    body: { question: 'test' }
  },
  adminAIResponse
);

assert.equal(adminAIResponse.statusCode, 401);

const diagnosticResponse = {
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(value) {
    this.body = value;
    return this;
  },
  setHeader() {}
};

await systemDiagnostic(
  {
    method: 'GET',
    headers: {}
  },
  diagnosticResponse
);

assert.equal(diagnosticResponse.statusCode, 401);

for (const [key, value] of Object.entries(originalEnv)) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

console.log('security smoke tests: OK');

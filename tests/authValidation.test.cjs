const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadTsModule(relativePath) {
  const fullPath = path.join(__dirname, '..', relativePath);
  const source = fs.readFileSync(fullPath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const module = { exports: {} };
  const fn = new Function('module', 'exports', output);
  fn(module, module.exports);
  return module.exports;
}

const {
  isValidEmail,
  validateLoginValues,
  validateSignupValues,
} = loadTsModule('src/utils/authValidation.ts');
const { confirmLogout } = loadTsModule('src/utils/logoutWarning.ts');

test('rejects invalid email formats', () => {
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail('missing-domain@'), false);
  assert.equal(isValidEmail('admin@company.com'), true);
});

test('rejects common email provider typos', () => {
  assert.equal(isValidEmail('alex@gnail.com'), false);

  const result = validateSignupValues({
    firstName: 'Alex',
    lastName: 'Morgan',
    email: 'alex@gnail.com',
    password: 'password123',
    confirmPassword: 'password123',
  });

  assert.equal(result.isValid, false);
  assert.equal(result.errors.email, 'Did you mean gmail.com?');
});

test('rejects login password shorter than 8 characters', () => {
  const result = validateLoginValues({
    email: 'admin@company.com',
    password: 'short',
  });

  assert.equal(result.isValid, false);
  assert.equal(result.errors.password, 'Password must be at least 8 characters');
});

test('rejects signup when passwords do not match', () => {
  const result = validateSignupValues({
    firstName: 'Alex',
    lastName: 'Morgan',
    email: 'alex@company.com',
    password: 'password123',
    confirmPassword: 'different123',
  });

  assert.equal(result.isValid, false);
  assert.equal(result.errors.confirmPassword, 'Passwords do not match');
});

test('logout can be cancelled from the warning prompt', () => {
  assert.equal(confirmLogout(() => false), false);
});

test('logout can continue after warning confirmation', () => {
  assert.equal(confirmLogout(() => true), true);
});

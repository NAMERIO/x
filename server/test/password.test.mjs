import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  hashPassword,
  passwordNeedsRehash,
  verifyPassword,
} from '../dist/auth/password.js';

test('passwords are hashed with Argon2id and can be verified', async () => {
  const password = 'a-long-test-password';
  const passwordHash = await hashPassword(password);

  assert.match(passwordHash, /^\$argon2id\$/);
  assert.equal(await verifyPassword(passwordHash, password), true);
  assert.equal(await verifyPassword(passwordHash, 'incorrect-password'), false);
  assert.equal(passwordNeedsRehash(passwordHash), false);
});

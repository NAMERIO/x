import assert from 'node:assert/strict';
import { test } from 'node:test';

import { API_PREFIX, API_ROUTES, healthResponseSchema } from '@x/shared';

import { buildApp } from '../dist/app.js';

test('GET /api/health reports that the server is running', async () => {
  const app = buildApp({ logger: false });

  const response = await app.inject({
    method: 'GET',
    url: `${API_PREFIX}${API_ROUTES.health}`,
  });

  assert.equal(response.statusCode, 200);

  const body = healthResponseSchema.parse(response.json());
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'x-server');

  await app.close();
});

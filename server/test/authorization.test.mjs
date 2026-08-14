import assert from 'node:assert/strict';
import { test } from 'node:test';

import { API_PREFIX, API_ROUTES, PERMISSIONS } from '@x/shared';
import Fastify from 'fastify';

import { buildApp } from '../dist/app.js';
import {
  hasRequiredPermission,
  requirePermission,
} from '../dist/authorization/guards.js';
import { canGrantPermissions } from '../dist/authorization/service.js';

test('protected authorization endpoints reject unauthenticated requests', async () => {
  const app = buildApp({ logger: false });

  const listResponse = await app.inject({
    method: 'GET',
    url: `${API_PREFIX}${API_ROUTES.authorization.roles}`,
  });
  assert.equal(listResponse.statusCode, 401);
  assert.equal(listResponse.json().error.code, 'UNAUTHENTICATED');

  const createResponse = await app.inject({
    method: 'POST',
    url: `${API_PREFIX}${API_ROUTES.authorization.roles}`,
    payload: {
      name: 'Forged administrator',
      permissions: [PERMISSIONS.MANAGE_ROLES],
    },
  });
  assert.equal(createResponse.statusCode, 401);
  assert.equal(createResponse.json().error.code, 'UNAUTHENTICATED');

  const assignmentResponse = await app.inject({
    method: 'PUT',
    url: `${API_PREFIX}${API_ROUTES.authorization.members}/00000000-0000-4000-8000-000000000000/roles`,
    payload: { roleIds: [] },
  });
  assert.equal(assignmentResponse.statusCode, 401);
  assert.equal(assignmentResponse.json().error.code, 'UNAUTHENTICATED');

  const memberDirectoryResponse = await app.inject({
    method: 'GET',
    url: `${API_PREFIX}${API_ROUTES.members.list}`,
  });
  assert.equal(memberDirectoryResponse.statusCode, 401);
  assert.equal(memberDirectoryResponse.json().error.code, 'UNAUTHENTICATED');

  await app.close();
});

test('authorization policy grants Owner everything and denies missing permissions', () => {
  assert.equal(
    hasRequiredPermission({ isOwner: true }, [], PERMISSIONS.MANAGE_ROLES),
    true,
  );
  assert.equal(
    hasRequiredPermission({ isOwner: false }, [], PERMISSIONS.MANAGE_ROLES),
    false,
  );
  assert.equal(
    hasRequiredPermission(
      { isOwner: false },
      [PERMISSIONS.MANAGE_ROLES],
      PERMISSIONS.MANAGE_ROLES,
    ),
    true,
  );
});

test('role managers cannot grant permissions they do not hold', () => {
  assert.equal(
    canGrantPermissions(
      {
        isOwner: false,
        permissions: [PERMISSIONS.MANAGE_ROLES],
      },
      [PERMISSIONS.MANAGE_APP],
    ),
    false,
  );
  assert.equal(
    canGrantPermissions(
      {
        isOwner: true,
        permissions: [],
      },
      [PERMISSIONS.MANAGE_APP],
    ),
    true,
  );
});

test('client-supplied ownership and permissions cannot bypass a server guard', async () => {
  const app = Fastify({ logger: false });
  app.decorateRequest('authorization', null);
  app.addHook('onRequest', async (request) => {
    request.authorization = {
      user: {
        id: '00000000-0000-4000-8000-000000000001',
        username: 'member',
        displayName: 'Member',
        avatarUrl: null,
        email: 'member@example.com',
        isOwner: false,
        roles: ['Member'],
      },
      permissions: [],
    };
  });
  app.post(
    '/protected',
    { preHandler: requirePermission(PERMISSIONS.MANAGE_ROLES) },
    async () => ({ ok: true }),
  );

  const response = await app.inject({
    method: 'POST',
    url: '/protected',
    payload: {
      isOwner: true,
      roles: ['Owner'],
      permissions: [PERMISSIONS.MANAGE_ROLES],
    },
  });

  assert.equal(response.statusCode, 403);
  assert.equal(response.json().error.code, 'INSUFFICIENT_PERMISSION');
  await app.close();
});

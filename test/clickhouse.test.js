/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-env mocha */
import assert from 'assert';
import { Nock } from './utils.js';
import { ClickHouseLogger } from '../src/clickhouse.js';

describe('ClickHouse Tests', () => {
  let nock;
  beforeEach(() => {
    nock = new Nock();
  });

  afterEach(() => {
    nock.done();
  });

  it('sends entries with correct JSONEachRow body format', async () => {
    nock.clickhouse()
      .reply((_, body) => {
        // nock auto-parses single-line JSON; reconstruct the string
        const raw = typeof body === 'string' ? body : JSON.stringify(body);
        const lines = raw.trim().split('\n');
        assert.strictEqual(lines.length, 1);
        const entry = JSON.parse(lines[0]);
        assert.strictEqual(entry.level, 'info');
        assert.strictEqual(entry.message, 'hello world');
        assert.strictEqual(entry.request_id, 'd12ddc0c-1f6b-51d7-be22-83b52c83d6da');
        assert.strictEqual(entry.function_name, '/services/func/v1');
        assert.strictEqual(entry.app_name, 'app');
        assert.strictEqual(entry.subsystem, 'services');
        assert.strictEqual(entry.log_stream, 'my-stream');
        assert.strictEqual(entry.log_group, '/aws/lambda/services--func');
        // timestamp should be ISO 8601
        assert.ok(entry.timestamp.endsWith('Z'));
        // severity should NOT be in the entry
        assert.strictEqual(entry.severity, undefined);
        return [200];
      });

    const logger = new ClickHouseLogger({
      host: 'ch.example.cloud',
      user: 'writer',
      password: 'secret',
      funcName: '/services/func/v1',
      appName: 'app',
      logStream: 'my-stream',
      logGroup: '/aws/lambda/services--func',
    });
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.doesNotReject(
      async () => logger.sendEntries([
        {
          timestamp: date.getTime(),
          extractedFields: {
            event: 'INFO\thello world\n',
            request_id: 'd12ddc0c-1f6b-51d7-be22-83b52c83d6da',
          },
        },
      ]),
    );
  });

  it('uses Basic Auth header and async_insert query parameters', async () => {
    const expectedAuth = `Basic ${Buffer.from('writer:secret').toString('base64')}`;
    nock.clickhouse()
      .reply(function checkReq() {
        // Verify Basic Auth header
        assert.strictEqual(this.req.headers.authorization, expectedAuth);
        // Verify async_insert query params are in the URL
        const url = new URL(this.req.path, 'https://ch.example.cloud:8443');
        assert.strictEqual(url.searchParams.get('async_insert'), '1');
        assert.strictEqual(url.searchParams.get('wait_for_async_insert'), '0');
        return [200];
      });

    const logger = new ClickHouseLogger({
      host: 'ch.example.cloud',
      user: 'writer',
      password: 'secret',
      funcName: '/services/func/v1',
      appName: 'app',
    });
    await assert.doesNotReject(
      async () => logger.sendEntries([
        {
          timestamp: Date.now(),
          extractedFields: {
            event: 'INFO\tmessage\n',
          },
        },
      ]),
    );
  });

  it('filters entries below configured log level', async () => {
    nock.clickhouse()
      .reply((_, body) => {
        const raw = typeof body === 'string' ? body : JSON.stringify(body);
        const lines = raw.trim().split('\n');
        assert.strictEqual(lines.length, 1);
        const entry = JSON.parse(lines[0]);
        assert.strictEqual(entry.level, 'warn');
        return [200];
      });

    const logger = new ClickHouseLogger({
      host: 'ch.example.cloud',
      user: 'writer',
      password: 'secret',
      funcName: '/services/func/v1',
      appName: 'app',
      level: 'warn',
    });
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.doesNotReject(
      async () => logger.sendEntries([
        {
          timestamp: date.getTime(),
          extractedFields: {
            event: 'WARN\tthis should be visible\n',
          },
        },
        {
          timestamp: date.getTime(),
          extractedFields: {
            event: 'INFO\tthis should not be visible\n',
          },
        },
        {
          timestamp: date.getTime(),
          extractedFields: {
            event: 'DEBUG\tthis should not be visible either\n',
          },
        },
      ]),
    );
  });

  it('handles unknown log level (defaults to INFO)', async () => {
    nock.clickhouse()
      .reply((_, body) => {
        const raw = typeof body === 'string' ? body : JSON.stringify(body);
        const lines = raw.trim().split('\n');
        assert.strictEqual(lines.length, 1);
        const entry = JSON.parse(lines[0]);
        assert.strictEqual(entry.level, 'info');
        return [200];
      });

    const logger = new ClickHouseLogger({
      host: 'ch.example.cloud',
      user: 'writer',
      password: 'secret',
      funcName: '/services/func/v1',
      appName: 'app',
      level: 'chatty',
    });
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.doesNotReject(
      async () => logger.sendEntries([
        {
          timestamp: date.getTime(),
          extractedFields: {
            event: 'INFO\tthis should be visible\n',
          },
        },
        {
          timestamp: date.getTime(),
          extractedFields: {
            event: 'DEBUG\tthis should not be visible\n',
          },
        },
      ]),
    );
  });

  it('maps unknown event log level to INFO severity', async () => {
    nock.clickhouse()
      .reply((_, body) => {
        const raw = typeof body === 'string' ? body : JSON.stringify(body);
        const entry = JSON.parse(raw.trim());
        assert.strictEqual(entry.level, 'bleep');
        return [200];
      });

    const logger = new ClickHouseLogger({
      host: 'ch.example.cloud',
      user: 'writer',
      password: 'secret',
      funcName: '/services/func/v1',
      appName: 'app',
    });
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.doesNotReject(
      async () => logger.sendEntries([
        {
          timestamp: date.getTime(),
          extractedFields: {
            event: 'BLEEP\tthis has unknown level\n',
          },
        },
      ]),
    );
  });

  it('returns rejected entries when extractFields returns null', async () => {
    const logger = new ClickHouseLogger({
      host: 'ch.example.cloud',
      user: 'writer',
      password: 'secret',
      funcName: '/services/func/v1',
      appName: 'app',
    });
    const badEvent = {
      timestamp: Date.now(),
      message: 'This message has no known pattern and will be discarded\n',
    };
    const { rejected } = await logger.sendEntries([badEvent]);
    assert.strictEqual(rejected.length, 1);
    assert.deepStrictEqual(rejected[0], badEvent);
  });

  it('sends nothing when all entries filtered by level', async () => {
    const logger = new ClickHouseLogger({
      host: 'ch.example.cloud',
      user: 'writer',
      password: 'secret',
      funcName: '/services/func/v1',
      appName: 'app',
      level: 'info',
    });
    const date = new Date('2022-11-10T12:53:47.204Z');
    const { sent } = await logger.sendEntries([
      {
        timestamp: date.getTime(),
        extractedFields: {
          event: 'DEBUG\tthis should not be visible\n',
        },
      },
    ]);
    assert.strictEqual(sent, 0);
  });

  it('retries on FetchError, stops on success', async () => {
    nock.clickhouse()
      .replyWithError('that went wrong')
      .post(/.*/)
      .reply(200);
    const logger = new ClickHouseLogger({
      host: 'ch.example.cloud',
      user: 'writer',
      password: 'secret',
      funcName: '/services/func/v1',
      appName: 'app',
    });
    await assert.doesNotReject(
      async () => logger.sendEntries([{
        timestamp: Date.now(),
        extractedFields: {
          event: 'INFO\tmessage\n',
        },
      }]),
    );
  });

  it('throws when all retries exhausted', async () => {
    nock.clickhouse()
      .twice()
      .replyWithError('that went wrong');
    const logger = new ClickHouseLogger({
      host: 'ch.example.cloud',
      user: 'writer',
      password: 'secret',
      funcName: '/services/func/v1',
      appName: 'app',
    });
    await assert.rejects(
      async () => logger.sendEntries([{
        timestamp: Date.now(),
        extractedFields: {
          event: 'INFO\tmessage\n',
        },
      }]),
      /that went wrong/,
    );
  });

  it('throws when posting returns an error other than FetchError', async () => {
    nock.clickhouse()
      .replyWithError(new TypeError('something went wrong'));
    const logger = new ClickHouseLogger({
      host: 'ch.example.cloud',
      user: 'writer',
      password: 'secret',
      funcName: '/services/func/v1',
      appName: 'app',
    });
    await assert.rejects(
      async () => logger.sendEntries([{
        timestamp: Date.now(),
        extractedFields: {
          event: 'INFO\tmessage\n',
        },
      }]),
      /TypeError: something went wrong/,
    );
  });

  it('exposes log via getter', () => {
    const myLog = { info: () => {} };
    const logger = new ClickHouseLogger({
      host: 'ch.example.cloud',
      user: 'writer',
      password: 'secret',
      funcName: '/services/func/v1',
      appName: 'app',
      log: myLog,
    });
    assert.strictEqual(logger.log, myLog);
  });

  it('throws on bad HTTP status code', async () => {
    nock.clickhouse()
      .reply(400, 'input malformed');
    const logger = new ClickHouseLogger({
      host: 'ch.example.cloud',
      user: 'writer',
      password: 'secret',
      funcName: '/services/func/v1',
      appName: 'app',
    });
    await assert.rejects(
      async () => logger.sendEntries([{
        timestamp: Date.now(),
        extractedFields: {
          event: 'INFO\tmessage\n',
        },
      }]),
      /Failed to send logs to ClickHouse with status 400: input malformed/,
    );
  });
});

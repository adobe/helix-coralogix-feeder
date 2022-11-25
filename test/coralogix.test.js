/*
 * Copyright 2019 Adobe. All rights reserved.
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
import { CoralogixLogger } from '../src/coralogix.js';

describe('Coralogix Tests', () => {
  let nock;
  beforeEach(() => {
    nock = new Nock();
  });

  afterEach(() => {
    nock.done();
  });

  it('invokes constructor with different backend URL', async () => {
    nock('https://www.example.com')
      .post('/logs')
      .reply((_, body) => {
        assert.deepStrictEqual(body.logEntries, [{
          severity: 3,
          text: '{"inv":{"invocationId":"n/a","functionName":"/services/func/v1"},"message":"this should end up as INFO message","level":"bleep"}',
          timestamp: 1668084827204,
        }]);
        return [200];
      });
    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app', {
      apiUrl: 'https://www.example.com/',
    });
    const date = new Date('2022-11-10T12:53:47.204Z');
    const resp = await logger.sendEntries([
      {
        timestamp: date.getTime(),
        extractedFields: {
          event: 'BLEEP\tthis should end up as INFO message\n',
        },
      },
      {
        timestamp: date.getTime(),
        extractedFields: {
          event: 'DEBUG\tthis should not be visible\n',
        },
      },
    ]);
    assert.strictEqual(resp.status, 200, await resp.text());
  });

  it('invokes constructor with unknown log level, should be treated as info', async () => {
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.deepStrictEqual(body.logEntries, [{
          severity: 3,
          text: '{"inv":{"invocationId":"n/a","functionName":"/services/func/v1"},"message":"this should be visible","level":"info"}',
          timestamp: 1668084827204,
        }]);
        return [200];
      });
    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app', {
      level: 'chatty',
    });
    const date = new Date('2022-11-10T12:53:47.204Z');
    const resp = await logger.sendEntries([
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
    ]);
    assert.strictEqual(resp.status, 200, await resp.text());
  });

  it('invokes constructor with higher log level, should filter other messages', async () => {
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.deepStrictEqual(body.logEntries, [{
          severity: 4,
          text: '{"inv":{"invocationId":"n/a","functionName":"/services/func/v1"},"message":"this should be visible","level":"warn"}',
          timestamp: 1668084827204,
        }]);
        return [200];
      });
    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app', {
      level: 'warn',
    });
    const date = new Date('2022-11-10T12:53:47.204Z');
    const resp = await logger.sendEntries([
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
          event: 'DEBUG\tthis should not be visible, either\n',
        },
      },
    ]);
    assert.strictEqual(resp.status, 200, await resp.text());
  });

  it('forwards error when posting throws', async () => {
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .replyWithError('that went wrong');
    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app');
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

  it('throws when posting returns a bad status code', async () => {
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply(400, 'input malformed');
    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app');
    await assert.rejects(
      async () => logger.sendEntries([{
        timestamp: Date.now(),
        extractedFields: {
          event: 'INFO\tmessage\n',
        },
      }]),
      /Failed to send logs with status 400: input malformed/,
    );
  });
});

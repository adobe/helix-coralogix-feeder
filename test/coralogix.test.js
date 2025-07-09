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
    nock.coralogix({ url: 'https://www.example.com' })
      .reply((_, body) => {
        assert.deepStrictEqual(body, [{
          applicationName: 'app',
          computerName: 'my-computer',
          severity: 3,
          subsystemName: 'services',
          text: '{"inv":{"invocationId":"d12ddc0c-1f6b-51d7-be22-83b52c83d6da","functionName":"/services/func/v1"},"message":"this should end up as INFO message","level":"bleep","timestamp":"2024-11-21T13:12:30.462Z"}',
          timestamp: 1668084827204,
        }]);
        return [200];
      });
    const logger = new CoralogixLogger({
      apiKey: 'foo-id',
      funcName: '/services/func/v1',
      appName: 'app',
      computerName: 'my-computer',
      apiUrl: 'https://www.example.com/',
    });
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.doesNotReject(
      async () => logger.sendEntries([
        {
          timestamp: date.getTime(),
          extractedFields: {
            timestamp: '2024-11-21T13:12:30.462Z',
            request_id: 'd12ddc0c-1f6b-51d7-be22-83b52c83d6da',
            event: 'BLEEP\tthis should end up as INFO message\n',
          },
        },
        {
          timestamp: date.getTime(),
          extractedFields: {
            event: 'DEBUG\tthis should not be visible\n',
          },
        },
        {
          timestamp: date.getTime(),
          extractedFields: {
            timestamp: '2024-11-21T13:12:30.462Z',
            request_id: 'd12ddc0c-1f6b-51d7-be22-83b52c83d6da',
            event: 'neither should this be visible\n',
            level: 'DEBUG',
          },
        },
      ]),
    );
  });

  it('invokes constructor with unknown log level, should be treated as info', async () => {
    nock.coralogix()
      .reply((_, body) => {
        assert.deepStrictEqual(body, [{
          applicationName: 'app',
          severity: 3,
          subsystemName: 'services',
          text: '{"inv":{"invocationId":"n/a","functionName":"/services/func/v1"},"message":"this should be visible","level":"info"}',
          timestamp: 1668084827204,
        }]);
        return [200];
      });
    const logger = new CoralogixLogger({
      apiKey: 'foo-id',
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

  it('invokes constructor with higher log level, should filter other messages', async () => {
    nock.coralogix()
      .reply((_, body) => {
        assert.deepStrictEqual(body, [{
          applicationName: 'app',
          severity: 4,
          subsystemName: 'services',
          text: '{"inv":{"invocationId":"n/a","functionName":"/services/func/v1"},"message":"this should be visible","level":"warn"}',
          timestamp: 1668084827204,
        }]);
        return [200];
      });
    const logger = new CoralogixLogger({
      apiKey: 'foo-id',
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
            event: 'DEBUG\tthis should not be visible, either\n',
          },
        },
      ]),
    );
  });

  it('sends entry with no log level, should default to INFO', async () => {
    nock.coralogix()
      .reply((_, body) => {
        assert.deepStrictEqual(body, [{
          applicationName: 'app',
          severity: 3,
          subsystemName: 'services',
          text: '{"inv":{"invocationId":"n/a","functionName":"/services/func/v1"},"message":"Task timed out after 60.07 seconds","level":"info"}',
          timestamp: 1668084827204,
        }]);
        return [200];
      });
    const logger = new CoralogixLogger({
      apiKey: 'foo-id',
      funcName: '/services/func/v1',
      appName: 'app',
      level: 'info',
    });
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.doesNotReject(
      async () => logger.sendEntries([
        {
          timestamp: date.getTime(),
          extractedFields: {
            event: 'Task timed out after 60.07 seconds\n\n',
          },
        },
      ]),
    );
  });

  it('invokes constructor, should filter DEBUG messages, and nothing sent', async () => {
    const logger = new CoralogixLogger({
      apiKey: 'foo-id',
      funcName: '/services/func/v1',
      appName: 'app',
      level: 'info',
    });
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.doesNotReject(
      async () => logger.sendEntries([
        {
          timestamp: date.getTime(),
          extractedFields: {
            event: 'DEBUG\tthis should not be visible\n',
          },
        },
      ]),
    );
  });

  it('invokes constructor with customized subsystem', async () => {
    nock.coralogix()
      .reply((_, body) => {
        assert.strictEqual(body[0].subsystemName, 'my-services');
        return [200];
      });
    const logger = new CoralogixLogger({
      apiKey: 'foo-id',
      funcName: '/services/func/v1',
      appName: 'app',
      subsystem: 'my-services',
    });
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.doesNotReject(
      async () => logger.sendEntries([
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
      ]),
    );
  });

  it('retries as many times as we have delays and stops when successful', async () => {
    nock.coralogix()
      .replyWithError('that went wrong')
      .post('/logs/v1/singles')
      .reply(200);
    const logger = new CoralogixLogger({
      apiKey: 'foo-id',
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

  it('forwards error when posting throws when all delays are consumed', async () => {
    nock.coralogix()
      .twice()
      .replyWithError('that went wrong');
    const logger = new CoralogixLogger({
      apiKey: 'foo-id',
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

  it('throws when posting returns a bad status code', async () => {
    nock.coralogix()
      .reply(400, 'input malformed');
    const logger = new CoralogixLogger({
      apiKey: 'foo-id',
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
      /Failed to send logs with status 400: input malformed/,
    );
  });

  it('throws when posting returns an error other than FetchError', async () => {
    nock.coralogix()
      .replyWithError(new TypeError('something went wrong'));
    const logger = new CoralogixLogger({
      apiKey: 'foo-id',
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
});

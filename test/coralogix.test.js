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
      level: 'chatty',
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

  it('returns error when posting fails', async () => {
    nock('https://api.coralogix.com/api/v1/')
      .post('/logs')
      .replyWithError('that went wrong');
    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app');
    const resp = await logger.sendEntries([{
      timestamp: Date.now(),
      extractedFields: {
        event: 'INFO\tmessage\n',
      },
    }]);
    assert.strictEqual(resp.status, 500);
    assert.strictEqual(await resp.text(), 'that went wrong');
  });
});

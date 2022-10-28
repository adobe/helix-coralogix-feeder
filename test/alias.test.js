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
import { resolve } from '../src/alias.js';

describe('Alias Tests', () => {
  let nock;
  beforeEach(() => {
    nock = new Nock();
  });

  afterEach(() => {
    nock.done();
  });

  const env = {
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'aws-access-key-id',
    AWS_SECRET_ACCESS_KEY: 'aws-secret-access-key',
    AWS_SESSION_TOKEN: 'aws-session-token',
  };

  it('invokes resolve with missing env', async () => {
    await assert.rejects(async () => resolve({
      log: console,
      env: {},
    }, 'services--func', '1'));
  });

  it('returns no alias when fetch fails', async () => {
    nock('https://lambda.us-east-1.amazonaws.com')
      .get('/2015-03-31/functions/services--func/aliases?FunctionVersion=1')
      .replyWithError('that went wrong');

    const alias = await resolve({ log: console, env }, 'services--func', '1');
    assert.strictEqual(alias, null);
  });

  it('returns cached alias on subsequent requests', async () => {
    nock('https://lambda.us-east-1.amazonaws.com')
      .get('/2015-03-31/functions/services--func/aliases?FunctionVersion=1')
      .reply(200, {
        Aliases: [{
          Name: 'v1',
        }, {
          Name: '1_0_0',
        }],
      });

    const alias = await resolve({ log: console, env }, 'services--func', '1');
    assert.strictEqual(alias, 'v1');

    // second request should not go to server
    await resolve({ log: console, env }, 'services--func', '1');
  });
});

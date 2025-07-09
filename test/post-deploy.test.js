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
import { noCache } from '@adobe/fetch';
import { createTargets } from './post-deploy-utils.js';

createTargets().forEach((target) => {
  describe(`Post-Deploy Tests (${target.title()})`, () => {
    const fetchContext = noCache();
    const { fetch } = fetchContext;

    after(async () => {
      await fetchContext.reset();
    });

    it('returns the status of the function', async () => {
      const url = `${target.host()}${target.urlPath()}/_status_check/healthcheck.json`;
      const res = await fetch(url, {
        headers: target.headers,
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      delete json.process;
      delete json.response_time;
      // status returns 0.0.0+ci123 for ci versions
      const version = target.version.startsWith('ci')
        ? `0.0.0+${target.version}`
        : target.version;
      assert.deepStrictEqual(json, {
        status: 'OK',
        version,
      });
    }).timeout(50000);

    it('invokes the function without arguments', async () => {
      const url = `${target.host()}${target.urlPath()}`;
      const res = await fetch(url, {
        headers: target.headers,
      });
      assert.strictEqual(res.status, 204);
    }).timeout(50000);

    it('invokes the function with a POST body', async () => {
      const now = new Date();
      const body = {
        messageType: 'DATA_MESSAGE',
        owner: '123456789012',
        logGroup: `/aws/lambda/${target.package}--${target.name}`,
        logStream: '2023/12/21/[$LATEST]b9bef68d412241e8be88efac966e2a5c',
        subscriptionFilters: ['helix-coralogix-feeder'],
        logEvents: [
          {
            id: '37982106607541042296547451702039639661941462854257278977',
            timestamp: now.getTime(),
            message: `${now.toISOString()}\t576e61bb-40b7-4f8d-a6fb-da189d92c437\tINFO\tthis should appear in Coralogix\n`,
          },
        ],
      };
      const url = `${target.host()}${target.urlPath()}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...target.headers,
        },
        body: JSON.stringify(body),
      });
      assert.strictEqual(res.status, 202);
    }).timeout(50000);
  });
});

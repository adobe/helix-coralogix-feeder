/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { context, ALPN_HTTP1_1, FetchError } from '@adobe/fetch';
import wrapFetch from 'fetch-retry';

/**
 * Our global fetch context that limits the number of sockets used.
 */
export const fetchContext = context({
  maxCacheSize: 0,
  alpnProtocols: [ALPN_HTTP1_1],
  h1: { maxSockets: 512, maxTotalSockets: 768, keepAlive: true },
});

const { reset, fetch } = fetchContext;

export const resetConnections = async () => reset();

const MOCHA_ENV = (process.env.HELIX_FETCH_FORCE_HTTP1 === 'true');

/**
 * Create a fetch wrapper that retries on FetchError and throws on bad status.
 *
 * @param {string} label label used in error messages (e.g. "Coralogix", "ClickHouse")
 * @returns wrapped fetch function
 */
export function createFetchRetry(label) {
  return wrapFetch(fetch, {
    retryDelay: (attempt) => {
      if (MOCHA_ENV) {
        return 1;
      }
      /* c8 ignore next */
      return (2 ** attempt * 1000); // 1000, 2000, 4000
    },
    retryOn: async (attempt, error, response) => {
      const retries = MOCHA_ENV ? 1 /* c8 ignore next */ : 2;
      if (error) {
        if (error instanceof FetchError) {
          return attempt < retries;
        }
        throw error;
      }
      if (!response.ok) {
        throw new Error(`Failed to send logs to ${label} with status ${response.status}: ${await response.text()}`);
      }
      return false;
    },
  });
}

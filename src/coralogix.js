/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-disable no-await-in-loop */

import { hostname } from 'os';
import path from 'path';
import util from 'util';
import { FetchError, Request } from '@adobe/fetch';
import { fetchContext } from './support/utils.js';

const LOG_LEVEL_MAPPING = {
  ERROR: 5,
  WARN: 4,
  INFO: 3,
  VERBOSE: 2,
  DEBUG: 1,
  TRACE: 1,
  SILLY: 1,
};

const DEFAULT_RETRY_DELAYS = [
  // wait 5 seconds, try again, wait another 10 seconds, and try again
  5, 10,
];

const sleep = util.promisify(setTimeout);

export class CoralogixLogger {
  constructor(apiKey, funcName, appName, opts = {}) {
    const {
      apiUrl = 'https://api.coralogix.com/api/v1/',
      level = 'info',
      retryDelays = DEFAULT_RETRY_DELAYS,
      logStream,
      subsystem,
    } = opts;

    this._apiKey = apiKey;
    this._appName = appName;
    this._apiUrl = apiUrl;
    this._host = hostname();
    this._severity = LOG_LEVEL_MAPPING[level.toUpperCase()] || LOG_LEVEL_MAPPING.INFO;
    this._retryDelays = retryDelays;
    this._logStream = logStream;

    this._funcName = funcName;
    this._subsystem = subsystem || funcName.split('/')[1];
  }

  async sendPayload(payload) {
    try {
      const { fetch } = fetchContext;
      const resp = await fetch(new Request(path.join(this._apiUrl, '/logs'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      }));
      return resp;
    }
    /* c8 ignore start */
    finally {
      await fetchContext.reset();
    }
    /* c8 ignore end */
  }

  async sendPayloadWithRetries(payload) {
    for (let i = 0; i <= this._retryDelays.length; i += 1) {
      let resp;
      try {
        resp = await this.sendPayload(payload);
        if (!resp.ok) {
          throw new Error(`Failed to send logs with status ${resp.status}: ${await resp.text()}`);
        }
        break;
      } catch (e) {
        if (!(e instanceof FetchError) || i === this._retryDelays.length) {
          throw e;
        }
      }
      await sleep(this._retryDelays[i] * 1000);
    }
  }

  async sendEntries(entries) {
    const logEntries = entries
      .map(({ timestamp, extractedFields, message }) => {
        let level, messageText;
        
        // Handle new Step Function format: timestamp on first line, JSON on subsequent lines
        if (message) {
          const lines = message.split('\n').filter(line => line.trim());
          if (lines.length >= 2) {
            // Check if first line is a timestamp and second line starts with {
            const firstLine = lines[0].trim();
            const secondLine = lines[1].trim();
            
            if (firstLine.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) && 
                secondLine.startsWith('{')) {
              // This is the new Step Function format
              level = 'INFO';
              messageText = message;
              const text = {
                inv: {
                  invocationId: extractedFields?.request_id || 'n/a',
                  functionName: this._funcName,
                },
                message: messageText,
                level: level.toLowerCase(),
                timestamp: extractedFields?.timestamp,
              };
              if (this._logStream) {
                text.logStream = this._logStream;
              }
              return {
                timestamp,
                text: JSON.stringify(text),
                severity: LOG_LEVEL_MAPPING[level] || LOG_LEVEL_MAPPING.INFO,
              };
            }
          }
        }
        
        // Handle existing Lambda format with extractedFields.event
        if (extractedFields?.event) {
          const parts = extractedFields.event.split('\t');
          level = parts[1] ? parts[0] : 'INFO';
          messageText = parts[1] ? parts[1] : parts[0];
        } else if (message) {
          // Handle case where message is directly available but not in new format
          level = 'INFO';
          messageText = message;
        } else {
          // Fallback for unknown format
          level = 'INFO';
          messageText = 'Unknown log format';
        }
        
        const text = {
          inv: {
            invocationId: extractedFields?.request_id || 'n/a',
            functionName: this._funcName,
          },
          message: messageText,
          level: level.toLowerCase(),
          timestamp: extractedFields?.timestamp,
        };
        if (this._logStream) {
          text.logStream = this._logStream;
        }
        return {
          timestamp,
          text: JSON.stringify(text),
          severity: LOG_LEVEL_MAPPING[level] || LOG_LEVEL_MAPPING.INFO,
        };
      })
      .filter(({ severity }) => severity >= this._severity);
    if (logEntries.length === 0) {
      return;
    }

    const payload = {
      privateKey: this._apiKey,
      applicationName: this._appName,
      subsystemName: this._subsystem,
      computerName: this._host,
      logEntries,
    };
    await this.sendPayloadWithRetries(payload);
  }
}

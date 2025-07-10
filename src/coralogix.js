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

import path from 'path';
import wrapFetch from 'fetch-retry';
import { FetchError, Request } from '@adobe/fetch';
import { extractFields } from './extract-fields.js';
import { fetchContext } from './utils.js';

/**
 * @typedef LogEvent
 * @property {string} id event id
 * @property {number} timestamp timestamp
 * @property {string} message message, which might have a variety of formats
 * @property {string} extractedFields extracted fields,
 * only present when a non-empty filter pattern has been specified
 */

/**
 * @typedef CoralogixLogEntry
 * @property {number} timestamp timestamp
 * @property {string} text JSON stringified object, containing various fields
 * @property {number} severity log level (see LOG_LEVEL_MAPPING)
 * @property {string} applicationName application name
 * @property {string} subsystemName subsystem
 * @property {string?} computerName computer name
 */

const LOG_LEVEL_MAPPING = {
  ERROR: 5,
  WARN: 4,
  INFO: 3,
  VERBOSE: 2,
  DEBUG: 1,
  TRACE: 1,
  SILLY: 1,
};

const { fetch } = fetchContext;

const MOCHA_ENV = (process.env.HELIX_FETCH_FORCE_HTTP1 === 'true');

/**
 * Wrapped fetch that retries on certain conditions.
 */
const fetchRetry = wrapFetch(fetch, {
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
      throw new Error(`Failed to send logs with status ${response.status}: ${await response.text()}`);
    }
    return false;
  },
});

/**
 * Coralogix logger.
 */
export class CoralogixLogger {
  constructor(opts) {
    const {
      apiKey,
      funcName,
      appName,
      computerName,
      log = console,
      apiUrl = 'https://ingress.coralogix.com/',
      level = 'info',
      logStream,
      subsystem,
    } = opts;

    this._apiKey = apiKey;
    this._log = log;
    this._apiUrl = apiUrl;
    this._severity = LOG_LEVEL_MAPPING[level.toUpperCase()] || LOG_LEVEL_MAPPING.INFO;
    this._logStream = logStream;
    this._funcName = funcName;

    this._baseEntry = {
      applicationName: appName,
      subsystemName: subsystem || funcName.split('/')[1],
    };
    if (computerName) {
      this._baseEntry.computerName = computerName;
    }
  }

  /**
   * Send payload to Coralogix.
   *
   * @param {CoralogixLogEntry[]} payload payload
   * @returns {Promise<Response>} HTTP answer
   * @throws {Promise<Error>} if an error occurs
   */
  async sendPayload(payload) {
    const resp = await fetchRetry(new Request(path.join(this._apiUrl, '/logs/v1/singles'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this._apiKey}`,
      },
      body: JSON.stringify(payload),
    }));
    return resp;
  }

  /**
   * Create a log entry for Coralogix from a log event. Returns `null` if we cannot
   * make up individual fields in the log event.
   *
   * @param {LogEvent} logEvent log event
   * @returns {CoralogixLogEntry|null} transformed log entry
   */
  createLogEntry(logEvent) {
    const { timestamp } = logEvent;
    const { log } = this;

    const fields = extractFields(logEvent);
    if (!fields) {
      log.warn(`Unable to extract fields from: ${JSON.stringify(logEvent, 0, 2)}`);
      return null;
    }
    const { level, message, requestId } = fields;
    const text = {
      inv: {
        invocationId: requestId || 'n/a',
        functionName: this._funcName,
      },
      message: message.trimEnd(),
      level: level.toLowerCase(),
      timestamp: fields.timestamp,
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

  /**
   * Send entries to Coralogix
   *
   * @param {LogEvent[]} logEvents log events
   * @returns {Promise<LogEvent[]} rejected log entries
   */
  async sendEntries(logEvents) {
    const rejected = [];
    const logEntries = [];

    for (const logEvent of logEvents) {
      const logEntry = this.createLogEntry(logEvent);
      if (!logEntry) {
        rejected.push(logEvent);
      } else if (logEntry.severity >= this._severity) {
        logEntries.push(logEntry);
      }
    }
    if (logEntries.length) {
      await this.sendPayload(logEntries.map((logEntry) => ({
        ...logEntry,
        ...this._baseEntry,
      })));
    }
    return { rejected, sent: logEntries.length };
  }

  get log() {
    return this._log;
  }
}

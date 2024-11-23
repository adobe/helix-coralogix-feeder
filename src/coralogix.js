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

import { setTimeout } from 'node:timers/promises';
import { hostname } from 'os';
import path from 'path';
import { FetchError, Request } from '@adobe/fetch';
import { fetchContext } from './support/utils.js';
import { extractFields } from './extract-fields.js';

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

const DEFAULT_RETRY_DELAYS = [
  // wait 5 seconds, try again, wait another 10 seconds, and try again
  5000, 10000,
];

/**
 * Coralogix logger.
 */
export class CoralogixLogger {
  constructor(opts) {
    const {
      apiKey,
      funcName,
      appName,
      log = console,
      apiUrl = 'https://api.coralogix.com/api/v1/',
      level = 'info',
      retryDelays = DEFAULT_RETRY_DELAYS,
      logStream,
      subsystem,
    } = opts;

    this._apiKey = apiKey;
    this._appName = appName;
    this._log = log;
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
      /* c8 ignore next 3 */
    } finally {
      await fetchContext.reset();
    }
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
      await setTimeout(this._retryDelays[i]);
    }
  }

  /**
   * Transform a log event to a log entry that can be sent to Coralogix
   *
   * @param {LogEvent} logEvent log event
   * @returns {CoralogixLogEntry} transformed log entry
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
      const payload = {
        privateKey: this._apiKey,
        applicationName: this._appName,
        subsystemName: this._subsystem,
        computerName: this._host,
        logEntries,
      };
      await this.sendPayloadWithRetries(payload);
    }
    return rejected;
  }

  get log() {
    return this._log;
  }
}

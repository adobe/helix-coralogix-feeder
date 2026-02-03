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

/* eslint-disable no-await-in-loop */

import { Request } from '@adobe/fetch';
import { extractFields } from './extract-fields.js';
import { createFetchRetry } from './utils.js';
import { LOG_LEVEL_MAPPING } from './constants.js';

const fetchRetry = createFetchRetry('ClickHouse');

export class ClickHouseLogger {
  constructor(opts) {
    const {
      host,
      user,
      password,
      database = 'helix_logs_production',
      table = 'lambda_logs_incoming',
      funcName,
      appName,
      log = console,
      level = 'info',
      logStream,
      logGroup,
      subsystem,
    } = opts;

    this._host = host;
    this._user = user;
    this._password = password;
    this._database = database;
    this._table = table;
    this._funcName = funcName;
    this._appName = appName;
    this._log = log;
    this._severity = LOG_LEVEL_MAPPING[level.toUpperCase()] || LOG_LEVEL_MAPPING.INFO;
    this._logStream = logStream;
    this._logGroup = logGroup;
    this._subsystem = subsystem || funcName.split('/')[1];
  }

  createLogEntry(logEvent) {
    const { timestamp } = logEvent;

    const fields = extractFields(logEvent);
    if (!fields) {
      this._log.warn(`Unable to extract fields from: ${JSON.stringify(logEvent, 0, 2)}`);
      return null;
    }
    const { level, message, requestId } = fields;

    return {
      timestamp: new Date(timestamp).toISOString(),
      level: level.toLowerCase(),
      message: message.trimEnd(),
      request_id: requestId || '',
      function_name: this._funcName,
      app_name: this._appName,
      subsystem: this._subsystem,
      log_stream: this._logStream || '',
      log_group: this._logGroup || '',
      severity: LOG_LEVEL_MAPPING[level] || LOG_LEVEL_MAPPING.INFO,
    };
  }

  async sendPayload(entries) {
    const query = `INSERT INTO ${this._table} FORMAT JSONEachRow`;
    const url = `https://${this._host}:8443/?database=${encodeURIComponent(this._database)}&query=${encodeURIComponent(query)}&async_insert=1&wait_for_async_insert=0`;
    const auth = Buffer.from(`${this._user}:${this._password}`).toString('base64');

    const body = entries.map((entry) => JSON.stringify(entry)).join('\n');

    const resp = await fetchRetry(new Request(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Basic ${auth}`,
      },
      body,
    }));
    return resp;
  }

  async sendEntries(logEvents) {
    const rejected = [];
    const logEntries = [];

    for (const logEvent of logEvents) {
      const logEntry = this.createLogEntry(logEvent);
      if (!logEntry) {
        rejected.push(logEvent);
      } else if (logEntry.severity >= this._severity) {
        // Remove severity from the entry sent to ClickHouse (not a table column)
        const { severity: _, ...entry } = logEntry;
        logEntries.push(entry);
      }
    }
    if (logEntries.length) {
      await this.sendPayload(logEntries);
    }
    return { rejected, sent: logEntries.length };
  }

  get log() {
    return this._log;
  }
}

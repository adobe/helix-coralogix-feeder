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
import { extractFields } from '../src/extract-fields.js';

describe('Extract Fields Tests', () => {
  it('handles INIT_START', async () => {
    const fields = extractFields({
      message: 'INIT_START Runtime Version: nodejs:22.v29\tRuntime Version ARN: arn:aws:lambda:us-east-1::runtime:f494bf5385768c1a5f722eae90b6dd3d343c96ba7ec22b34f5c819e3e8511722\n',
    });
    assert.deepStrictEqual(fields, {
      level: 'DEBUG',
      message: 'INIT_START Runtime Version: nodejs:22.v29\tRuntime Version ARN: arn:aws:lambda:us-east-1::runtime:f494bf5385768c1a5f722eae90b6dd3d343c96ba7ec22b34f5c819e3e8511722',
    });
  });

  it('handles START', async () => {
    const fields = extractFields({
      message: 'START RequestId: 03552aac-6ab8-419f-9136-63431d98ce95 Version: $LATEST\n',
    });
    assert.deepStrictEqual(fields, {
      level: 'DEBUG',
      message: 'START Version: $LATEST',
      requestId: '03552aac-6ab8-419f-9136-63431d98ce95',
    });
  });

  it('handles END', async () => {
    const fields = extractFields({
      message: 'END RequestId: 03552aac-6ab8-419f-9136-63431d98ce95\n',
    });
    assert.deepStrictEqual(fields, {
      level: 'DEBUG',
      message: 'END',
      requestId: '03552aac-6ab8-419f-9136-63431d98ce95',
    });
  });

  it('handles REPORT', async () => {
    const fields = extractFields({
      message: 'REPORT RequestId: 2c17c779-5002-4479-8cf4-7b037c1463a4\tDuration: 26.25 ms\tBilled Duration: 27 ms\tMemory Size: 128 MB\tMax Memory Used: 70 MB\tInit Duration: 145.09 ms\t\n',
    });
    assert.deepStrictEqual(fields, {
      level: 'DEBUG',
      message: 'REPORT Duration: 26.25 ms\tBilled Duration: 27 ms\tMemory Size: 128 MB\tMax Memory Used: 70 MB\tInit Duration: 145.09 ms\t',
      requestId: '2c17c779-5002-4479-8cf4-7b037c1463a4',
    });
  });

  it('handles standard log message', async () => {
    const fields = extractFields({
      id: '38635137308541392840375210768127625533795665023722651661',
      timestamp: 1732459474542,
      message: '2024-11-24T14:44:34.542Z\t8c8b67c9-9ca3-4659-be83-30071e3045be\tINFO\tCreating S3Client without credentials\n',
    });
    assert.deepStrictEqual(fields, {
      level: 'INFO',
      message: 'Creating S3Client without credentials',
      requestId: '8c8b67c9-9ca3-4659-be83-30071e3045be',
      timestamp: '2024-11-24T14:44:34.542Z',
    });
  });

  it('detects an generic service kill', async () => {
    const fields = extractFields({
      message: 'RequestId: 66ce6204-7c13-50f6-a32c-3db39caefc6b Error: Runtime exited with error: signal: killed Runtime.ExitError\n',
    });
    assert.deepStrictEqual(fields, {
      level: 'ERROR',
      message: 'Runtime exited with error: signal: killed Runtime.ExitError',
      requestId: '66ce6204-7c13-50f6-a32c-3db39caefc6b',
    });
  });

  it('detects an invoke timeout', async () => {
    const fields = extractFields({
      message: 'REPORT RequestId: 3dca290b-7b88-47c9-8dbd-84f107ecf9e1\tDuration: 3000.00 ms\tBilled Duration: 3000 ms\tMemory Size: 128 MB\tMax Memory Used: 70 MB\tInit Duration: 164.66 ms\tStatus: timeout\n',
    });
    assert.deepStrictEqual(fields, {
      level: 'ERROR',
      message: 'REPORT Duration: 3000.00 ms\tBilled Duration: 3000 ms\tMemory Size: 128 MB\tMax Memory Used: 70 MB\tInit Duration: 164.66 ms\tStatus: timeout',
      requestId: '3dca290b-7b88-47c9-8dbd-84f107ecf9e1',
    });
  });

  it('detects an out of memory problem', async () => {
    const fields = extractFields({
      message: 'REPORT RequestId: 3dca290b-7b88-47c9-8dbd-84f107ecf9e1\tDuration: 3000.00 ms\tBilled Duration: 3000 ms\tMemory Size: 128 MB\tMax Memory Used: 70 MB\tStatus: error\tError Type: Runtime.OutOfMemory\n',
    });
    assert.deepStrictEqual(fields, {
      level: 'ERROR',
      message: 'REPORT Duration: 3000.00 ms\tBilled Duration: 3000 ms\tMemory Size: 128 MB\tMax Memory Used: 70 MB\tStatus: error\tError Type: Runtime.OutOfMemory',
      requestId: '3dca290b-7b88-47c9-8dbd-84f107ecf9e1',
    });
  });

  it('detects an SQS trigger timeout', async () => {
    const fields = extractFields({
      message: '2024-11-20T18:19:35.211Z\tfb732cef-3a5d-533a-ba09-73571cbf8624\tTask timed out after 900.09 seconds\n',
    });
    assert.deepStrictEqual(fields, {
      level: 'INFO',
      message: 'Task timed out after 900.09 seconds',
      requestId: 'fb732cef-3a5d-533a-ba09-73571cbf8624',
      timestamp: '2024-11-20T18:19:35.211Z',
    });
  });

  it('returns \'null\' for messages with no known pattern', async () => {
    const fields = extractFields({
      message: 'This message has no known pattern and will be discarded\n',
    });
    assert.strictEqual(fields, null);
  });
});

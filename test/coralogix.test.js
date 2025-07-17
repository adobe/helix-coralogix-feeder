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
          text: '{"inv":{"invocationId":"n/a","functionName":"/services/func/v1"},"message":"this should end up as INFO message\\n","level":"bleep"}',
          timestamp: 1668084827204,
        }]);
        return [200];
      });
    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app', {
      apiUrl: 'https://www.example.com/',
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

  it('invokes constructor with unknown log level, should be treated as info', async () => {
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.deepStrictEqual(body.logEntries, [{
          severity: 3,
          text: '{"inv":{"invocationId":"n/a","functionName":"/services/func/v1"},"message":"this should be visible\\n","level":"info"}',
          timestamp: 1668084827204,
        }]);
        return [200];
      });
    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app', {
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
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.deepStrictEqual(body.logEntries, [{
          severity: 4,
          text: '{"inv":{"invocationId":"n/a","functionName":"/services/func/v1"},"message":"this should be visible\\n","level":"warn"}',
          timestamp: 1668084827204,
        }]);
        return [200];
      });
    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app', {
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
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.deepStrictEqual(body.logEntries, [{
          severity: 3,
          text: '{"inv":{"invocationId":"n/a","functionName":"/services/func/v1"},"message":"Task timed out after 60.07 seconds\\n\\n","level":"info"}',
          timestamp: 1668084827204,
        }]);
        return [200];
      });
    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app', {
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

  it('invokes constructor with higher log level, should filter all messages, and nothing sent', async () => {
    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app', {
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
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.strictEqual(body.subsystemName, 'my-services');
        return [200];
      });
    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app', {
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
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .replyWithError('that went wrong')
      .post('/api/v1/logs')
      .reply(200);
    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app', { retryDelays: [1] });
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
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .twice()
      .replyWithError('that went wrong');
    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app', { retryDelays: [1] });
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
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply(400, 'input malformed');
    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app');
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

  it('handles Step Function logs with timestamp and JSON format', async () => {
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.deepStrictEqual(body.logEntries, [{
          severity: 3,
          text: JSON.stringify({
            inv: {
              invocationId: 'n/a',
              functionName: '/services/func/v1',
            },
            message: '2025-07-15T18:04:05.170Z\n{\n    "details": {\n        "input": "{\\"opportunityStatusJob\\":{\\"type\\":\\"opportunity-status-processor\\",\\"siteId\\":\\"f7128a8b-e62e-478e-ad97-c112fe030f89\\",\\"siteUrl\\":\\"https://infosys.com\\",\\"imsOrgId\\":\\"8C6043F15F43B6390A49401A@AdobeOrg\\",\\"organizationId\\":\\"44568c3e-efd4-4a7f-8ecd-8caf615f836c\\",\\"taskContext\\":{\\"auditTypes\\":[\\"scrape-top-pages\\",\\"broken-backlinks\\",\\"broken-internal-links\\",\\"experimentation-opportunities\\",\\"meta-tags\\",\\"sitemap\\",\\"cwv\\",\\"alt-text\\",\\"broken-backlinks-auto-suggest\\",\\"meta-tags-auto-suggest\\",\\"broken-internal-links-auto-suggest\\"],\\"slackContext\\":{\\"channelId\\":\\"C060T2PPF8V\\",\\"threadTs\\":\\"1752602636.998649\\"}}},\\"disableImportAndAuditJob\\":{\\"type\\":\\"disable-import-audit-processor\\",\\"siteId\\":\\"f7128a8b-e62e-478e-ad97-c112fe030f89\\",\\"siteUrl\\":\\"https://infosys.com\\",\\"imsOrgId\\":\\"8C6043F15F43B6390A49401A@AdobeOrg\\",\\"organizationId\\":\\"44568c3e-efd4-4a7f-8ecd-8caf615f836c\\",\\"taskContext\\":{\\"importTypes\\":[\\"organic-traffic\\",\\"top-pages\\",\\"organic-keywords\\",\\"all-traffic\\"],\\"auditTypes\\":[\\"scrape-top-pages\\",\\"broken-backlinks\\",\\"broken-internal-links\\",\\"experimentation-opportunities\\",\\"meta-tags\\",\\"sitemap\\",\\"cwv\\",\\"alt-text\\",\\"broken-backlinks-auto-suggest\\",\\"meta-tags-auto-suggest\\",\\"broken-internal-links-auto-suggest\\"],\\"slackContext\\":{\\"channelId\\":\\"C060T2PPF8V\\",\\"threadTs\\":\\"1752602636.998649\\"}}},\\"demoURLJob\\":{\\"type\\":\\"demo-url-processor\\",\\"siteId\\":\\"f7128a8b-e62e-478e-ad97-c112fe030f89\\",\\"siteUrl\\":\\"https://infosys.com\\",\\"imsOrgId\\":\\"8C6043F15F43B6390A49401A@AdobeOrg\\",\\"organizationId\\":\\"44568c3e-efd4-4a7f-8ecd-8caf615f836c\\",\\"taskContext\\":{\\"experienceUrl\\":\\"https://experience-stage.adobe.com\\",\\"slackContext\\":{\\"channelId\\":\\"C060T2PPF8V\\",\\"threadTs\\":\\"1752602636.998649\\"}}},\\"workflowWaitTime\\":2}","\n        "inputDetails": {\n            "truncated": false\n        },\n        "roleArn": "arn:aws:iam::682033462621:role/spacecat-services--onboard-workflow-role"\n    },\n    "redrive_count": "0",\n    "id": "1",\n    "type": "ExecutionStarted",\n    "previous_event_id": "0",\n    "event_timestamp": "1752602645170",\n    "execution_arn": "arn:aws:states:us-east-1:682033462621:execution:spacecat-dev-services--onboard-workflow:onboard-https---infosys-com-1752602645090"\n}',
            level: 'info',
            timestamp: undefined,
          }),
          timestamp: 1668084827204,
        }]);
        return [200];
      });

    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app');
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.doesNotReject(
      async () => logger.sendEntries([
        {
          timestamp: date.getTime(),
          message: '2025-07-15T18:04:05.170Z\n{\n    "details": {\n        "input": "{\\"opportunityStatusJob\\":{\\"type\\":\\"opportunity-status-processor\\",\\"siteId\\":\\"f7128a8b-e62e-478e-ad97-c112fe030f89\\",\\"siteUrl\\":\\"https://infosys.com\\",\\"imsOrgId\\":\\"8C6043F15F43B6390A49401A@AdobeOrg\\",\\"organizationId\\":\\"44568c3e-efd4-4a7f-8ecd-8caf615f836c\\",\\"taskContext\\":{\\"auditTypes\\":[\\"scrape-top-pages\\",\\"broken-backlinks\\",\\"broken-internal-links\\",\\"experimentation-opportunities\\",\\"meta-tags\\",\\"sitemap\\",\\"cwv\\",\\"alt-text\\",\\"broken-backlinks-auto-suggest\\",\\"meta-tags-auto-suggest\\",\\"broken-internal-links-auto-suggest\\"],\\"slackContext\\":{\\"channelId\\":\\"C060T2PPF8V\\",\\"threadTs\\":\\"1752602636.998649\\"}}},\\"disableImportAndAuditJob\\":{\\"type\\":\\"disable-import-audit-processor\\",\\"siteId\\":\\"f7128a8b-e62e-478e-ad97-c112fe030f89\\",\\"siteUrl\\":\\"https://infosys.com\\",\\"imsOrgId\\":\\"8C6043F15F43B6390A49401A@AdobeOrg\\",\\"organizationId\\":\\"44568c3e-efd4-4a7f-8ecd-8caf615f836c\\",\\"taskContext\\":{\\"importTypes\\":[\\"organic-traffic\\",\\"top-pages\\",\\"organic-keywords\\",\\"all-traffic\\"],\\"auditTypes\\":[\\"scrape-top-pages\\",\\"broken-backlinks\\",\\"broken-internal-links\\",\\"experimentation-opportunities\\",\\"meta-tags\\",\\"sitemap\\",\\"cwv\\",\\"alt-text\\",\\"broken-backlinks-auto-suggest\\",\\"meta-tags-auto-suggest\\",\\"broken-internal-links-auto-suggest\\"],\\"slackContext\\":{\\"channelId\\":\\"C060T2PPF8V\\",\\"threadTs\\":\\"1752602636.998649\\"}}},\\"demoURLJob\\":{\\"type\\":\\"demo-url-processor\\",\\"siteId\\":\\"f7128a8b-e62e-478e-ad97-c112fe030f89\\",\\"siteUrl\\":\\"https://infosys.com\\",\\"imsOrgId\\":\\"8C6043F15F43B6390A49401A@AdobeOrg\\",\\"organizationId\\":\\"44568c3e-efd4-4a7f-8ecd-8caf615f836c\\",\\"taskContext\\":{\\"experienceUrl\\":\\"https://experience-stage.adobe.com\\",\\"slackContext\\":{\\"channelId\\":\\"C060T2PPF8V\\",\\"threadTs\\":\\"1752602636.998649\\"}}},\\"workflowWaitTime\\":2}","\n        "inputDetails": {\n            "truncated": false\n        },\n        "roleArn": "arn:aws:iam::682033462621:role/spacecat-services--onboard-workflow-role"\n    },\n    "redrive_count": "0",\n    "id": "1",\n    "type": "ExecutionStarted",\n    "previous_event_id": "0",\n    "event_timestamp": "1752602645170",\n    "execution_arn": "arn:aws:states:us-east-1:682033462621:execution:spacecat-dev-services--onboard-workflow:onboard-https---infosys-com-1752602645090"\n}',
        },
      ]),
    );
  });

  it('handles Step Function logs with timestamp but no JSON', async () => {
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.deepStrictEqual(body.logEntries, [{
          severity: 3,
          text: JSON.stringify({
            inv: {
              invocationId: 'n/a',
              functionName: '/services/func/v1',
            },
            message: '2025-07-15T18:04:05.170Z\nThis is a plain text message',
            level: 'info',
            timestamp: undefined,
          }),
          timestamp: 1668084827204,
        }]);
        return [200];
      });

    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app');
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.doesNotReject(
      async () => logger.sendEntries([
        {
          timestamp: date.getTime(),
          message: '2025-07-15T18:04:05.170Z\nThis is a plain text message',
        },
      ]),
    );
  });

  it('handles Step Function logs with single line message', async () => {
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.deepStrictEqual(body.logEntries, [{
          severity: 3,
          text: JSON.stringify({
            inv: {
              invocationId: 'n/a',
              functionName: '/services/func/v1',
            },
            message: 'Single line message',
            level: 'info',
            timestamp: undefined,
          }),
          timestamp: 1668084827204,
        }]);
        return [200];
      });

    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app');
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.doesNotReject(
      async () => logger.sendEntries([
        {
          timestamp: date.getTime(),
          message: 'Single line message',
        },
      ]),
    );
  });

  it('handles Step Function logs with invalid timestamp format', async () => {
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.deepStrictEqual(body.logEntries, [{
          severity: 3,
          text: JSON.stringify({
            inv: {
              invocationId: 'n/a',
              functionName: '/services/func/v1',
            },
            message: 'Invalid timestamp format\n{\n    "details": {\n        "input": "test"\n    }\n}',
            level: 'info',
            timestamp: undefined,
          }),
          timestamp: 1668084827204,
        }]);
        return [200];
      });

    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app');
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.doesNotReject(
      async () => logger.sendEntries([
        {
          timestamp: date.getTime(),
          message: 'Invalid timestamp format\n{\n    "details": {\n        "input": "test"\n    }\n}',
        },
      ]),
    );
  });

  it('handles Step Function logs with empty lines', async () => {
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.deepStrictEqual(body.logEntries, [{
          severity: 3,
          text: JSON.stringify({
            inv: {
              invocationId: 'n/a',
              functionName: '/services/func/v1',
            },
            message: '2025-07-15T18:04:05.170Z\n\n{\n    "details": {\n        "input": "test"\n    }\n}\n',
            level: 'info',
            timestamp: undefined,
          }),
          timestamp: 1668084827204,
        }]);
        return [200];
      });

    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app');
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.doesNotReject(
      async () => logger.sendEntries([
        {
          timestamp: date.getTime(),
          message: '2025-07-15T18:04:05.170Z\n\n{\n    "details": {\n        "input": "test"\n    }\n}\n',
        },
      ]),
    );
  });

  it('handles logs with no message or extractedFields', async () => {
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.deepStrictEqual(body.logEntries, [{
          severity: 3,
          text: JSON.stringify({
            inv: {
              invocationId: 'n/a',
              functionName: '/services/func/v1',
            },
            message: 'Unknown log format',
            level: 'info',
            timestamp: undefined,
          }),
          timestamp: 1668084827204,
        }]);
        return [200];
      });

    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app');
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.doesNotReject(
      async () => logger.sendEntries([
        {
          timestamp: date.getTime(),
          // No message or extractedFields
        },
      ]),
    );
  });

  it('handles Step Function logs with logStream in Step Function format', async () => {
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.deepStrictEqual(body.logEntries, [{
          severity: 3,
          text: JSON.stringify({
            inv: {
              invocationId: 'n/a',
              functionName: '/services/func/v1',
            },
            message: '2025-07-15T18:04:05.170Z\n{\n    "details": {\n        "input": "test"\n    }\n}',
            level: 'info',
            timestamp: undefined,
            logStream: 'test-log-stream',
          }),
          timestamp: 1668084827204,
        }]);
        return [200];
      });

    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app', {
      logStream: 'test-log-stream',
    });
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.doesNotReject(
      async () => logger.sendEntries([
        {
          timestamp: date.getTime(),
          message: '2025-07-15T18:04:05.170Z\n{\n    "details": {\n        "input": "test"\n    }\n}',
        },
      ]),
    );
  });

  it('handles Step Function logs without logStream in Step Function format', async () => {
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.deepStrictEqual(body.logEntries, [{
          severity: 3,
          text: JSON.stringify({
            inv: {
              invocationId: 'n/a',
              functionName: '/services/func/v1',
            },
            message: '2025-07-15T18:04:05.170Z\n{\n    "details": {\n        "input": "test"\n    }\n}',
            level: 'info',
            timestamp: undefined,
          }),
          timestamp: 1668084827204,
        }]);
        return [200];
      });

    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app');
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.doesNotReject(
      async () => logger.sendEntries([
        {
          timestamp: date.getTime(),
          message: '2025-07-15T18:04:05.170Z\n{\n    "details": {\n        "input": "test"\n    }\n}',
        },
      ]),
    );
  });

  it('handles sendPayload with fetch error to cover finally block', async () => {
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .replyWithError('Network error');

    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app', { retryDelays: [] });
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.rejects(
      async () => logger.sendEntries([
        {
          timestamp: date.getTime(),
          extractedFields: {
            event: 'INFO\ttest message\n',
          },
        },
      ]),
      /Network error/,
    );
  });

  it('directly tests sendPayload finally block', async () => {
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .replyWithError('Network error');

    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app');
    await assert.rejects(
      async () => logger.sendPayload({ test: 'data' }),
      /Network error/,
    );
  });

  it('handles message that exists but is not Step Function format', async () => {
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.deepStrictEqual(body.logEntries, [{
          severity: 3,
          text: JSON.stringify({
            inv: {
              invocationId: 'n/a',
              functionName: '/services/func/v1',
            },
            message: 'This is a plain message without timestamp format',
            level: 'info',
            timestamp: undefined,
          }),
          timestamp: 1668084827204,
        }]);
        return [200];
      });

    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app');
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.doesNotReject(
      async () => logger.sendEntries([
        {
          timestamp: date.getTime(),
          message: 'This is a plain message without timestamp format',
        },
      ]),
    );
  });

  it('handles sendPayload with non-ok response to cover finally block', async () => {
    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply(500, 'Internal server error');

    const logger = new CoralogixLogger('foo-id', '/services/func/v1', 'app');
    const date = new Date('2022-11-10T12:53:47.204Z');
    await assert.rejects(
      async () => logger.sendEntries([
        {
          timestamp: date.getTime(),
          extractedFields: {
            event: 'INFO\ttest message\n',
          },
        },
      ]),
      /Failed to send logs with status 500/,
    );
  });
});

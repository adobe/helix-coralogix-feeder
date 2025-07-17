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
import util from 'util';
import zlib from 'zlib';
import { Request } from '@adobe/fetch';
import { main } from '../src/index.js';
import { Nock } from './utils.js';

const gzip = util.promisify(zlib.gzip);

const DEFAULT_ENV = {
  AWS_REGION: 'us-east-1',
  AWS_ACCESS_KEY_ID: 'aws-access-key-id',
  AWS_SECRET_ACCESS_KEY: 'aws-secret-access-key',
  AWS_SESSION_TOKEN: 'aws-session-token',
  CORALOGIX_API_KEY: 'api-key',
  CORALOGIX_LEVEL: 'info',
};

describe('Index Tests', () => {
  let nock;
  beforeEach(() => {
    nock = new Nock();
  });

  afterEach(() => {
    nock.done();
  });

  const createContext = (data, env = DEFAULT_ENV) => ({
    invocation: {
      event: {
        awslogs: {
          data,
        },
      },
    },
    runtime: {
      region: 'us-east-1',
      accountId: 'account-id',
    },
    func: {
      app: 'aws-account-id',
      name: 'coralogix-feeder',
    },
    env,
    log: console,
  });

  it('invokes index without payload', async () => {
    await assert.doesNotReject(
      async () => main(new Request('https://localhost/'), createContext()),
    );
  });

  it('invokes index with payload', async () => {
    const payload = 'H4sIAAFPWWMAA92WS2/bMAzH7/0UQc51QlKiROVWYGmxw7ZDe1pTFIqtpAYSJ7OdNkPR7z45rz62AgnaDth8ksCHqD9/oHx/1Ipfexqqyo/Dxc95aPda7U8nFyfXX/rn5ydn/fbx2mV2V4SyMSKKVmwMoXZb42Q2Pitni3lj7/q7qjvx02Hmuzdhki+TKpS3eRqqJMmLLCxjmsew87oMftrEERB1EbrE3Utj1JVYG0ZG+5DZVLMBMZkGj1kw6LWk6TZJtRhWaZnP63xWnOaTOpRVTHe5Mq4cNocmTx3bK/PVYx3921DUzwPvd6t1mqypUlk0IgrYoGU2UQjUBqyQdUhaIWpCg+IAxLHRwspFM2yV2mWr86h57aeNZGiMsSAA7IRe+G06sxUoQUiIL1D3yPQ0d2LA90GN3mvnCJPUDSXRgGniRsonIyInzg+FgQf156+n3wZ1Oit9vG++7LVGk0V1kxfjFrbmociaVRl+LGJdVafTGRQvaw7LuvRpHbLTPEyyRqznEq2dGiGbct963CrbxuF6Lf4+9/xTlqdivypj+1ncw273cLwvEUopcSJMyoJiIGTWAmgF2ZEWJEUKrRW2ELd7EWGA1SFEmA4wvgMR8FuLWtmsCB8Ixd4n/j0u1mK+lQvTdFwp5Dg4kYUYnVgyBhxqceSs5mZSRHBiuzXqfbjAmEsO4IKxEwMiF5lFZ0MKCXqkqJTNElGpTtg3I8t7TjX8D5Nin3seTsRGxrcT4WKflbEkBBxfiPi6WbSKHVojSki0Fgsa4jMYzS/RfYUI4gOJILbvQMS/NSk+jItGzFe5WP9sHD0c/QIdNIXebwkAAA==';

    nock('https://lambda.us-east-1.amazonaws.com')
      .get('/2015-03-31/functions/helix-services--indexer/aliases?FunctionVersion=663')
      .reply(200, {
        Aliases: [{
          Name: 'v4',
        }, {
          Name: '4_3_47',
        }],
      });

    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        // eslint-disable-next-line no-param-reassign
        delete body.computerName;
        assert.deepStrictEqual(body, {
          applicationName: 'aws-account-id',
          logEntries: [{
            timestamp: 1666708005982,
            text: JSON.stringify({
              inv: {
                invocationId: '1aa49921-c9b8-401c-9f3a-f22989ab8505',
                functionName: '/helix-services/indexer/v4',
              },
              message: 'coralogix: flushing 1 pending requests...\n',
              level: 'info',
              timestamp: '2022-10-25T14:26:45.982Z',
              logStream: '2022/10/25/[663]877ef64aed7c456086d40a1de61a48cc',
            }),
            severity: 3,
          }, {
            timestamp: 1666708006053,
            text: JSON.stringify({
              inv: {
                invocationId: '1aa49921-c9b8-401c-9f3a-f22989ab8505',
                functionName: '/helix-services/indexer/v4',
              },
              message: 'coralogix: flushing 0 pending requests done.\n',
              level: 'info',
              timestamp: '2022-10-25T14:26:46.051Z',
              logStream: '2022/10/25/[663]877ef64aed7c456086d40a1de61a48cc',
            }),
            severity: 3,
          }, {
            timestamp: 1666708011188,
            text: JSON.stringify({
              inv: {
                invocationId: 'd7197ec0-1a12-407d-83c4-5a8900aa5c40',
                functionName: '/helix-services/indexer/v4',
              },
              message: 'coralogix: flushing 1 pending requests...\n',
              level: 'info',
              timestamp: '2022-10-25T14:26:51.188Z',
              logStream: '2022/10/25/[663]877ef64aed7c456086d40a1de61a48cc',
            }),
            severity: 3,
          }, {
            timestamp: 1666708011258,
            text: JSON.stringify({
              inv: {
                invocationId: 'd7197ec0-1a12-407d-83c4-5a8900aa5c40',
                functionName: '/helix-services/indexer/v4',
              },
              message: 'coralogix: flushing 0 pending requests done.\n',
              level: 'info',
              timestamp: '2022-10-25T14:26:51.257Z',
              logStream: '2022/10/25/[663]877ef64aed7c456086d40a1de61a48cc',
            }),
            severity: 3,
          }],
          privateKey: DEFAULT_ENV.CORALOGIX_API_KEY,
          subsystemName: 'helix-services',
        });
        return [200];
      });

    await assert.doesNotReject(
      async () => main(new Request('https://localhost/'), createContext(payload)),
    );
  });

  it('allows calling $LATEST version of a function', async () => {
    const payload = (await gzip(JSON.stringify({
      logEvents: [
        {
          extractedFields: {
            event: 'INFO\tthis\nis\na\nmessage\n',
            request_id: '1aa49921-c9b8-401c-9f3a-f22989ab8505',
            timestamp: '2022-10-25T14:26:45.982Z',
          },
          timestamp: 1666708005982,
        },
        {
          extractedFields: {
            event: 'DEBUG\tlirum\nlarum\n',
            request_id: '1aa49921-c9b8-401c-9f3a-f22989ab8506',
            timestamp: '2022-10-25T14:26:45.983Z',
          },
          timestamp: 1666708005983,
        },
      ],
      logGroup: '/aws/lambda/services--func',
      logStream: '2022/10/28/[$LATEST]dbbf94bd5cb34f00aa764103d8ed78f2',
    }))).toString('base64');

    nock('https://api.coralogix.com/api/v1/')
      .post('/logs')
      .reply((_, body) => {
        assert.strictEqual(body.subsystemName, 'my-services');
        assert.deepStrictEqual(body.logEntries, [{
          timestamp: 1666708005982,
          text: JSON.stringify({
            inv: {
              invocationId: '1aa49921-c9b8-401c-9f3a-f22989ab8505',
              functionName: '/services/func/$LATEST',
            },
            message: 'this\nis\na\nmessage\n',
            level: 'info',
            timestamp: '2022-10-25T14:26:45.982Z',
            logStream: '2022/10/28/[$LATEST]dbbf94bd5cb34f00aa764103d8ed78f2',
          }),
          severity: 3,
        }]);
        return [200];
      });

    await assert.doesNotReject(
      async () => main(
        new Request('https://localhost/'),
        createContext(payload, { ...DEFAULT_ENV, CORALOGIX_SUBSYSTEM: 'my-services' }),
      ),
    );
  });

  it('defaults to function version if no alias is available', async () => {
    const payload = (await gzip(JSON.stringify({
      logEvents: [
        {
          extractedFields: {
            event: 'INFO\tthis\nis\na\nmessage\n',
            request_id: '1aa49921-c9b8-401c-9f3a-f22989ab8505',
            timestamp: '2022-10-25T14:26:45.982Z',
          },
          timestamp: 1666708005982,
        },
        {
          extractedFields: {
            event: 'DEBUG\tlirum\nlarum\n',
            request_id: '1aa49921-c9b8-401c-9f3a-f22989ab8506',
            timestamp: '2022-10-25T14:26:45.983Z',
          },
          timestamp: 1666708005983,
        },
      ],
      logGroup: '/aws/lambda/services--func',
      logStream: '2022/10/28/[356]dbbf94bd5cb34f00aa764103d8ed78f2',
    }))).toString('base64');

    nock('https://lambda.us-east-1.amazonaws.com')
      .get('/2015-03-31/functions/services--func/aliases?FunctionVersion=356')
      .reply(200, {
        Aliases: [],
      });

    nock('https://api.coralogix.com/api/v1/')
      .post('/logs')
      .reply((_, body) => {
        assert.strictEqual(body.subsystemName, 'my-services');
        assert.deepStrictEqual(body.logEntries, [{
          timestamp: 1666708005982,
          text: JSON.stringify({
            inv: {
              invocationId: '1aa49921-c9b8-401c-9f3a-f22989ab8505',
              functionName: '/services/func/356',
            },
            message: 'this\nis\na\nmessage\n',
            level: 'info',
            timestamp: '2022-10-25T14:26:45.982Z',
            logStream: '2022/10/28/[356]dbbf94bd5cb34f00aa764103d8ed78f2',
          }),
          severity: 3,
        }]);
        return [200];
      });

    await assert.doesNotReject(
      async () => main(
        new Request('https://localhost/'),
        createContext(payload, { ...DEFAULT_ENV, CORALOGIX_SUBSYSTEM: 'my-services' }),
      ),
    );
  });

  it('returns error when uncompressing fails', async () => {
    const payload = 'this is not compressed'.toString('base64');

    nock('https://sqs.us-east-1.amazonaws.com')
      .post('/')
      .reply(200, `<?xml version="1.0"?>
<SendMessageResponse xmlns="http://queue.amazonaws.com/doc/2012-11-05/">
  <SendMessageResult>
    <MessageId>id</MessageId>
  </SendMessageResult>
  <ResponseMetadata>
    <RequestId>id</RequestId>
  </ResponseMetadata>
</SendMessageResponse>
`);
    await assert.rejects(
      async () => main(new Request('https://localhost/'), createContext(payload)),
      /incorrect header check/,
    );
  });

  it('returns error when CORALOGIX_API_KEY is missing', async () => {
    const payload = (await gzip(JSON.stringify({
      logEvents: [{
        timestamp: Date.now(),
        extractedFields: {
          event: 'INFO\tmessage\n',
        },
      }],
      logGroup: '/aws/lambda/services--func',
      logStream: '2022/10/28/[356]dbbf94bd5cb34f00aa764103d8ed78f2',
    }))).toString('base64');

    const env = { ...DEFAULT_ENV };
    delete env.CORALOGIX_API_KEY;

    const res = await main(new Request('https://localhost/'), createContext(payload, env));
    assert.strictEqual(res.status, 500);
    assert.strictEqual(await res.text(), 'No CORALOGIX_API_KEY set');
  });

  it('returns error when AWS environment is missing', async () => {
    const payload = (await gzip(JSON.stringify({
      logEvents: [{
        timestamp: Date.now(),
        extractedFields: {
          event: 'INFO\tmessage\n',
        },
      }],
      logGroup: '/aws/lambda/services--func',
      logStream: '2022/10/28/[356]dbbf94bd5cb34f00aa764103d8ed78f2',
    }))).toString('base64');

    const env = { ...DEFAULT_ENV };
    delete env.AWS_SECRET_ACCESS_KEY;

    await assert.rejects(
      async () => main(new Request('https://localhost/'), createContext(payload, env)),
      /Missing AWS configuration/,
    );
  });

  it('returns error when posting fails', async () => {
    const payload = (await gzip(JSON.stringify({
      logEvents: [{
        timestamp: Date.now(),
        extractedFields: {
          event: 'INFO\tmessage\n',
        },
      }],
      logGroup: '/aws/lambda/services--func',
      logStream: '2022/10/28/[356]dbbf94bd5cb34f00aa764103d8ed78f2',
    }))).toString('base64');

    nock('https://lambda.us-east-1.amazonaws.com')
      .get('/2015-03-31/functions/services--func/aliases?FunctionVersion=356')
      .reply(200, {
        Aliases: [{
          Name: 'v4',
        }, {
          Name: '4_3_47',
        }],
      });

    nock('https://api.coralogix.com/api/v1/')
      .post('/logs')
      .reply(403, 'that went wrong');

    nock('https://sqs.us-east-1.amazonaws.com')
      .post('/')
      .reply(200, `<?xml version="1.0"?>
<SendMessageResponse xmlns="http://queue.amazonaws.com/doc/2012-11-05/">
  <SendMessageResult>
    <MessageId>id</MessageId>
  </SendMessageResult>
  <ResponseMetadata>
    <RequestId>id</RequestId>
  </ResponseMetadata>
</SendMessageResponse>
`);
    await assert.rejects(
      async () => main(new Request('https://localhost/'), createContext(payload)),
      /that went wrong/,
    );
  });

  it('handles Step Function logs with timestamp and JSON format', async () => {
    const stepFunctionLog = '2025-07-15T18:04:05.170Z\n{\n    "details": {\n        "input": "{\\"opportunityStatusJob\\":{\\"type\\":\\"opportunity-status-processor\\",\\"siteId\\":\\"f7128a8b-e62e-478e-ad97-c112fe030f89\\",\\"siteUrl\\":\\"https://infosys.com\\",\\"imsOrgId\\":\\"8C6043F15F43B6390A49401A@AdobeOrg\\",\\"organizationId\\":\\"44568c3e-efd4-4a7f-8ecd-8caf615f836c\\",\\"taskContext\\":{\\"auditTypes\\":[\\"scrape-top-pages\\",\\"broken-backlinks\\",\\"broken-internal-links\\",\\"experimentation-opportunities\\",\\"meta-tags\\",\\"sitemap\\",\\"cwv\\",\\"alt-text\\",\\"broken-backlinks-auto-suggest\\",\\"meta-tags-auto-suggest\\",\\"broken-internal-links-auto-suggest\\"],\\"slackContext\\":{\\"channelId\\":\\"C060T2PPF8V\\",\\"threadTs\\":\\"1752602636.998649\\"}}},\\"disableImportAndAuditJob\\":{\\"type\\":\\"disable-import-audit-processor\\",\\"siteId\\":\\"f7128a8b-e62e-478e-ad97-c112fe030f89\\",\\"siteUrl\\":\\"https://infosys.com\\",\\"imsOrgId\\":\\"8C6043F15F43B6390A49401A@AdobeOrg\\",\\"organizationId\\":\\"44568c3e-efd4-4a7f-8ecd-8caf615f836c\\",\\"taskContext\\":{\\"importTypes\\":[\\"organic-traffic\\",\\"top-pages\\",\\"organic-keywords\\",\\"all-traffic\\"],\\"auditTypes\\":[\\"scrape-top-pages\\",\\"broken-backlinks\\",\\"broken-internal-links\\",\\"experimentation-opportunities\\",\\"meta-tags\\",\\"sitemap\\",\\"cwv\\",\\"alt-text\\",\\"broken-backlinks-auto-suggest\\",\\"meta-tags-auto-suggest\\",\\"broken-internal-links-auto-suggest\\"],\\"slackContext\\":{\\"channelId\\":\\"C060T2PPF8V\\",\\"threadTs\\":\\"1752602636.998649\\"}}},\\"demoURLJob\\":{\\"type\\":\\"demo-url-processor\\",\\"siteId\\":\\"f7128a8b-e62e-478e-ad97-c112fe030f89\\",\\"siteUrl\\":\\"https://infosys.com\\",\\"imsOrgId\\":\\"8C6043F15F43B6390A49401A@AdobeOrg\\",\\"organizationId\\":\\"44568c3e-efd4-4a7f-8ecd-8caf615f836c\\",\\"taskContext\\":{\\"experienceUrl\\":\\"https://experience-stage.adobe.com\\",\\"slackContext\\":{\\"channelId\\":\\"C060T2PPF8V\\",\\"threadTs\\":\\"1752602636.998649\\"}}},\\"workflowWaitTime\\":2}","\n        "inputDetails": {\n            "truncated": false\n        },\n        "roleArn": "arn:aws:iam::682033462621:role/spacecat-services--onboard-workflow-role"\n    },\n    "redrive_count": "0",\n    "id": "1",\n    "type": "ExecutionStarted",\n    "previous_event_id": "0",\n    "event_timestamp": "1752602645170",\n    "execution_arn": "arn:aws:states:us-east-1:682033462621:execution:spacecat-dev-services--onboard-workflow:onboard-https---infosys-com-1752602645090"\n}';

    const payload = (await gzip(JSON.stringify({
      logEvents: [{
        timestamp: Date.now(),
        message: stepFunctionLog,
      }],
      logGroup: '/aws/states/test-workflow',
      logStream: 'test-execution/2025/01/15/00000000',
    }))).toString('base64');

    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.strictEqual(body.subsystemName, 'test');
        assert.deepStrictEqual(body.logEntries, [{
          timestamp: body.logEntries[0].timestamp,
          text: JSON.stringify({
            inv: {
              invocationId: 'n/a',
              functionName: '/test-workflow/test-workflow/$LATEST',
            },
            message: stepFunctionLog,
            level: 'info',
            timestamp: undefined,
            logStream: 'test-execution/2025/01/15/00000000',
          }),
          severity: 3,
        }]);
        return [200];
      });

    await assert.doesNotReject(
      async () => main(
        new Request('https://localhost/'),
        createContext(payload, { ...DEFAULT_ENV, CORALOGIX_SUBSYSTEM: 'test' }),
      ),
    );
  });

  it('handles Step Function logs with timestamp but no JSON', async () => {
    const payload = (await gzip(JSON.stringify({
      logEvents: [{
        timestamp: Date.now(),
        message: '2025-07-15T18:04:05.170Z\nThis is a plain text message',
      }],
      logGroup: '/aws/states/test-workflow',
      logStream: 'test-execution/2025/01/15/00000000',
    }))).toString('base64');

    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.strictEqual(body.subsystemName, 'test');
        assert.deepStrictEqual(body.logEntries, [{
          timestamp: body.logEntries[0].timestamp,
          text: JSON.stringify({
            inv: {
              invocationId: 'n/a',
              functionName: '/test-workflow/test-workflow/$LATEST',
            },
            message: '2025-07-15T18:04:05.170Z\nThis is a plain text message',
            level: 'info',
            timestamp: undefined,
            logStream: 'test-execution/2025/01/15/00000000',
          }),
          severity: 3,
        }]);
        return [200];
      });

    await assert.doesNotReject(
      async () => main(
        new Request('https://localhost/'),
        createContext(payload, { ...DEFAULT_ENV, CORALOGIX_SUBSYSTEM: 'test' }),
      ),
    );
  });

  it('handles Step Function logs with single line message', async () => {
    const payload = (await gzip(JSON.stringify({
      logEvents: [{
        timestamp: Date.now(),
        message: 'Single line message',
      }],
      logGroup: '/aws/states/test-workflow',
      logStream: 'test-execution/2025/01/15/00000000',
    }))).toString('base64');

    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.strictEqual(body.subsystemName, 'test');
        assert.deepStrictEqual(body.logEntries, [{
          timestamp: body.logEntries[0].timestamp,
          text: JSON.stringify({
            inv: {
              invocationId: 'n/a',
              functionName: '/test-workflow/test-workflow/$LATEST',
            },
            message: 'Single line message',
            level: 'info',
            timestamp: undefined,
            logStream: 'test-execution/2025/01/15/00000000',
          }),
          severity: 3,
        }]);
        return [200];
      });

    await assert.doesNotReject(
      async () => main(
        new Request('https://localhost/'),
        createContext(payload, { ...DEFAULT_ENV, CORALOGIX_SUBSYSTEM: 'test' }),
      ),
    );
  });

  it('handles Step Function logs with invalid timestamp format', async () => {
    const payload = (await gzip(JSON.stringify({
      logEvents: [{
        timestamp: Date.now(),
        message: 'Invalid timestamp format\n{\n    "details": {\n        "input": "test"\n    }\n}',
      }],
      logGroup: '/aws/states/test-workflow',
      logStream: 'test-execution/2025/01/15/00000000',
    }))).toString('base64');

    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.strictEqual(body.subsystemName, 'test');
        assert.deepStrictEqual(body.logEntries, [{
          timestamp: body.logEntries[0].timestamp,
          text: JSON.stringify({
            inv: {
              invocationId: 'n/a',
              functionName: '/test-workflow/test-workflow/$LATEST',
            },
            message: 'Invalid timestamp format\n{\n    "details": {\n        "input": "test"\n    }\n}',
            level: 'info',
            timestamp: undefined,
            logStream: 'test-execution/2025/01/15/00000000',
          }),
          severity: 3,
        }]);
        return [200];
      });

    await assert.doesNotReject(
      async () => main(
        new Request('https://localhost/'),
        createContext(payload, { ...DEFAULT_ENV, CORALOGIX_SUBSYSTEM: 'test' }),
      ),
    );
  });

  it('handles Step Function logs with empty lines', async () => {
    const payload = (await gzip(JSON.stringify({
      logEvents: [{
        timestamp: Date.now(),
        message: '2025-07-15T18:04:05.170Z\n\n{\n    "details": {\n        "input": "test"\n    }\n}\n',
      }],
      logGroup: '/aws/states/test-workflow',
      logStream: 'test-execution/2025/01/15/00000000',
    }))).toString('base64');

    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.strictEqual(body.subsystemName, 'test');
        assert.deepStrictEqual(body.logEntries, [{
          timestamp: body.logEntries[0].timestamp,
          text: JSON.stringify({
            inv: {
              invocationId: 'n/a',
              functionName: '/test-workflow/test-workflow/$LATEST',
            },
            message: '2025-07-15T18:04:05.170Z\n\n{\n    "details": {\n        "input": "test"\n    }\n}\n',
            level: 'info',
            timestamp: undefined,
            logStream: 'test-execution/2025/01/15/00000000',
          }),
          severity: 3,
        }]);
        return [200];
      });

    await assert.doesNotReject(
      async () => main(
        new Request('https://localhost/'),
        createContext(payload, { ...DEFAULT_ENV, CORALOGIX_SUBSYSTEM: 'test' }),
      ),
    );
  });

  it('handles logs with no message or extractedFields', async () => {
    const payload = (await gzip(JSON.stringify({
      logEvents: [{
        timestamp: Date.now(),
        // No message or extractedFields
      }],
      logGroup: '/aws/states/test-workflow',
      logStream: 'test-execution/2025/01/15/00000000',
    }))).toString('base64');

    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.strictEqual(body.subsystemName, 'test');
        assert.deepStrictEqual(body.logEntries, [{
          timestamp: body.logEntries[0].timestamp,
          text: JSON.stringify({
            inv: {
              invocationId: 'n/a',
              functionName: '/test-workflow/test-workflow/$LATEST',
            },
            message: 'Unknown log format',
            level: 'info',
            timestamp: undefined,
            logStream: 'test-execution/2025/01/15/00000000',
          }),
          severity: 3,
        }]);
        return [200];
      });

    await assert.doesNotReject(
      async () => main(
        new Request('https://localhost/'),
        createContext(payload, { ...DEFAULT_ENV, CORALOGIX_SUBSYSTEM: 'test' }),
      ),
    );
  });

  it('handles non-standard log stream format gracefully', async () => {
    const payload = (await gzip(JSON.stringify({
      logEvents: [{
        timestamp: Date.now(),
        message: '2025-07-15T18:04:05.170Z\n{\n    "details": {\n        "input": "test"\n    }\n}',
      }],
      logGroup: '/aws/states/test-workflow',
      logStream: 'non-standard-log-stream-format',
    }))).toString('base64');

    nock('https://api.coralogix.com')
      .post('/api/v1/logs')
      .reply((_, body) => {
        assert.strictEqual(body.subsystemName, 'test');
        assert.deepStrictEqual(body.logEntries, [{
          timestamp: body.logEntries[0].timestamp,
          text: JSON.stringify({
            inv: {
              invocationId: 'n/a',
              functionName: '/test-workflow/test-workflow/$LATEST',
            },
            message: '2025-07-15T18:04:05.170Z\n{\n    "details": {\n        "input": "test"\n    }\n}',
            level: 'info',
            timestamp: undefined,
            logStream: 'non-standard-log-stream-format',
          }),
          severity: 3,
        }]);
        return [200];
      });

    await assert.doesNotReject(
      async () => main(
        new Request('https://localhost/'),
        createContext(payload, { ...DEFAULT_ENV, CORALOGIX_SUBSYSTEM: 'test' }),
      ),
    );
  });
});

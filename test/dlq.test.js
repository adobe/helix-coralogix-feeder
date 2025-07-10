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
import { sendToDLQ } from '../src/dlq.js';

const DEFAULT_ENV = {
  AWS_ACCESS_KEY_ID: 'aws-access-key-id',
  AWS_SECRET_ACCESS_KEY: 'aws-secret-access-key',
  AWS_SESSION_TOKEN: 'aws-session-token',
};

describe('DLQ Tests', () => {
  let nock;
  beforeEach(() => {
    nock = new Nock();
  });

  afterEach(() => {
    nock.done();
  });

  const createContext = (env = DEFAULT_ENV) => ({
    runtime: {
      region: 'us-east-1',
      accountId: 'account-id',
    },
    func: {
      name: 'coralogix-feeder',
    },
    log: console,
    env,
  });

  const message = { contents: 'this is a test ' };

  it('uses correct queue URL', async () => {
    nock('https://sqs.us-east-1.amazonaws.com')
      .post('/')
      .reply((_, body) => {
        const params = new URLSearchParams(body);
        assert.strictEqual(params.get('QueueUrl'), 'https://sqs.us-east-1.amazonaws.com/account-id/helix-coralogix-feeder-dlq');
        return [200, `<?xml version="1.0"?>
  <SendMessageResponse xmlns="http://queue.amazonaws.com/doc/2012-11-05/">
  <SendMessageResult>
    <MessageId>id</MessageId>
  </SendMessageResult>
  <ResponseMetadata>
    <RequestId>id</RequestId>
  </ResponseMetadata>
  </SendMessageResponse>
  `,
        ];
      });
    await sendToDLQ(createContext(), message);
  });

  it('throws when environment is bad', async () => {
    await assert.rejects(
      async () => sendToDLQ(createContext({}), message),
      /Missing AWS configuration/,
    );
  });

  it('throws when posting to queue fails', async () => {
    nock('https://sqs.us-east-1.amazonaws.com')
      .post('/')
      .reply(403, `<?xml version="1.0"?>
<ErrorResponse xmlns="http://queue.amazonaws.com/doc/2012-11-05/">
  <Error>
    <Type>Sender</Type>
      <Code>InvalidClientTokenId</Code>
    <Message>The security token included in the request is invalid.</Message>
    <Detail/>
  </Error>
  <RequestId>id</RequestId>
</ErrorResponse>
`);

    await assert.rejects(
      async () => sendToDLQ(createContext(), message),
      /Failed to send logs with status: 403/,
    );
  });
});

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
import aws4 from 'aws4';
import { fetchContext } from './utils.js';

/**
 * Send a message to our DLQ.
 *
 * @param {UniversalContext} context universal context
 * @param {any} message message to send
 * @returns {Promise<void>}
 * @throws {Promise<Error>} if something goes wrong
 */
export async function sendToDLQ(context, message) {
  const {
    env,
    runtime: {
      region,
      accountId,
    },
    func: {
      name,
    },
  } = context;

  const awsConfig = {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    sessionToken: env.AWS_SESSION_TOKEN,
  };

  if (!awsConfig.accessKeyId || !awsConfig.secretAccessKey) {
    throw new Error('Missing AWS configuration (aws_access_key_id or aws_secret_access_key)');
  }

  const { fetch } = fetchContext;
  const body = {
    Action: 'SendMessage',
    Version: '2012-11-05',
    QueueUrl: `https://sqs.${region}.amazonaws.com/${accountId}/helix-${name}-dlq`,
    MessageBody: JSON.stringify(message),
  };
  const opts = {
    host: `sqs.${region}.amazonaws.com`,
    service: 'sqs',
    region,
    method: 'POST',
    path: '/',
    body: new URLSearchParams(body).toString(),
  };
  const req = aws4.sign(opts, {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
    sessionToken: awsConfig.sessionToken,
  });
  const resp = await fetch(`https://${req.host}${req.path}`, {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });
  if (!resp.ok) {
    throw Error(`Failed to send logs with status: ${resp.status}\n${await resp.text()}`);
  }
}

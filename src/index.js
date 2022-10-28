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
import util from 'util';
import zlib from 'zlib';
import wrap from '@adobe/helix-shared-wrap';
import { wrap as status } from '@adobe/helix-status';
import { Response } from '@adobe/fetch';
import { CoralogixLogger } from './coralogix.js';
import { resolve } from './alias.js';

const gunzip = util.promisify(zlib.gunzip);

/**
 * This is the main function
 * @param {Request} request the request object (see fetch api)
 * @param {UniversalContext} context the context of the universal serverless function
 * @returns {Response} a response
 */
async function run(request, context) {
  const {
    invocation: { event },
    env: {
      CORALOGIX_API_KEY: apiKey,
    },
    func: {
      app,
    },
    log,
  } = context;

  if (!event?.awslogs?.data) {
    return new Response('', { status: 204 });
  }

  const payload = Buffer.from(event.awslogs.data, 'base64');
  const uncompressed = await gunzip(payload);
  const input = JSON.parse(uncompressed.toString());
  log.info(`Received ${input.logEvents.length} events for ${input.logGroup}`);

  const [,,, funcName] = input.logGroup.split('/');
  const [, funcVersion] = input.logStream.match(/\d{4}\/\d{2}\/\d{2}\/\[(\d+)\]\w+/);
  const alias = await resolve(context, funcName, funcVersion);
  const [packageName, serviceName] = funcName.split('--');

  const logger = new CoralogixLogger(apiKey, `/${packageName}/${serviceName}/${alias ?? funcVersion}`, app);
  const resp = await logger.sendEntries(input.logEvents);

  if (!resp.ok) {
    const msg = `Failed to send logs with status ${resp.status}: ${await resp.text()}`;
    log.warn(msg);
    return new Response(msg, { status: resp.status });
  }
  return resp;
}

export const main = wrap(run)
  .with(status)
  .with((fn) => (req, context) => {
    context.log = console;
    return fn(req, context);
  });

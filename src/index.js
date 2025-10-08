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
import { Response } from '@adobe/fetch';
import wrap from '@adobe/helix-shared-wrap';
import { helixStatus } from '@adobe/helix-status';
import { CoralogixLogger } from './coralogix.js';
import { resolve } from './alias.js';
import { sendToDLQ } from './dlq.js';
import { mapSubsystem } from './subsystem.js';
import { resetConnections } from './utils.js';

const gunzip = util.promisify(zlib.gunzip);

/**
 * Gets input to this function.
 * @param {Request} request the request object (see fetch api)
 * @param {UniversalContext} context the context of the universal serverless function
 * @returns input
 */
async function getInput(request, context) {
  const { invocation: { event } } = context;

  if (event?.awslogs?.data) {
    const payload = Buffer.from(event.awslogs.data, 'base64');
    const uncompressed = await gunzip(payload);
    return JSON.parse(uncompressed.toString());
  }
  if (request.method === 'POST' && request.headers.get('content-type') === 'application/json') {
    const json = await request.json();
    return json;
  }
  return null;
}

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
      CORALOGIX_API_URL: apiUrl,
      CORALOGIX_SUBSYSTEM: defaultSubsystem,
      CORALOGIX_COMPUTER_NAME: computerName,
      CORALOGIX_LOG_LEVEL: level = 'info',
    },
    func: {
      app: appName,
    },
    log,
  } = context;

  if (!apiKey) {
    const msg = 'No CORALOGIX_API_KEY set';
    log.error(msg);
    return new Response(msg, { status: 500 });
  }

  let input;

  try {
    input = await getInput(request, context);
    if (input === null) {
      log.info('No AWS logs payload in event');
      return new Response('', { status: 204 });
    }

    const [,,, funcName] = input.logGroup.split('/');
    const [, funcVersion] = input.logStream.match(/\d{4}\/\d{2}\/\d{2}\/[a-z-]*\[(\d+|\$LATEST)\]\w+/);

    let alias;
    if (funcVersion !== '$LATEST') {
      alias = await resolve(context, funcName, funcVersion);
    }
    const [packageName, serviceName] = funcName.split('--');

    // Use mapped subsystem if available, else fallback to default
    const subsystem = mapSubsystem(alias ?? funcVersion, context) || defaultSubsystem;

    const logger = new CoralogixLogger({
      apiKey,
      funcName: `/${packageName}/${serviceName}/${alias ?? funcVersion}`,
      appName,
      computerName,
      log,
      apiUrl,
      level,
      logStream: input.logStream,
      subsystem,
    });
    const { rejected, sent } = await logger.sendEntries(input.logEvents);
    log.info(`Received ${input.logEvents.length} event(s) for [${input.logGroup}][${input.logStream}], sent: ${sent}`);
    if (rejected.length) {
      await sendToDLQ(context, rejected);
    }
    return new Response('', { status: 202 });
  } catch (e) {
    log.error(e.message);
    log.debug('Unexpected problem', e);

    try {
      await sendToDLQ(context, input ?? { data: event.awslogs.data });
    } catch (e2) {
      log.error(`Unable to send to DLQ: ${e2.message}`);
    }
    throw e;
    /* c8 ignore next 3 */
  } finally {
    resetConnections();
  }
}

export const main = wrap(run)
  .with(helixStatus);

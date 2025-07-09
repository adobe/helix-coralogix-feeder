/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-disable class-methods-use-this */
import { config } from 'dotenv';
import packjson from './package.cjs';

config();

export class AWSTarget {
  constructor(opts = {}) {
    Object.assign(this, {
      namespace: 'helix',
      package: 'helix3',
      name: packjson.name.replace('@adobe/helix-', ''),
      version: String(packjson.version),
    }, opts);
    if (process.env.CI && process.env.CIRCLE_BUILD_NUM && process.env.CIRCLE_BRANCH !== 'main' && !opts.version) {
      this.version = `ci${process.env.CIRCLE_BUILD_NUM}`;
    }
    this.headers = process.env.HLX_TEST_HEADERS ? JSON.parse(process.env.HLX_TEST_HEADERS) : {};
  }

  title() {
    return 'AWS';
  }

  host() {
    return `https://${process.env.HLX_AWS_API}.execute-api.${process.env.HLX_AWS_REGION}.amazonaws.com`;
  }

  urlPath() {
    return `/${this.package}/${this.name}/${this.version}`;
  }

  enabled() {
    return process.env.HLX_AWS_API && process.env.HLX_AWS_REGION;
  }
}

const ALL_TARGETS = [
  AWSTarget,
];

export function createTargets(opts) {
  return ALL_TARGETS.map((TargetClass) => new TargetClass(opts));
}

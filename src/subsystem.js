/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/**
 * Maps the lambda alias to a subsystem using the provided alias mapping.
 * If the alias is not defined or mapping fails or is not available,
 * returns null or undefined.
 *
 * @param {string} alias The lambda alias.
 * @param {Object} context The context of the function, containing environment variables.
 *
 * @returns {string|null|undefined} The mapped subsystem or null / undefined.
 */
export function mapSubsystem(alias, context) {
  const { env, log } = context;

  if (!alias) {
    return null;
  }

  const { CORALOGIX_ALIAS_MAPPING: aliasMapping = '{}' } = env;

  try {
    return JSON.parse(aliasMapping)[alias];
  } catch (e) {
    log.error(`Invalid CORALOGIX_ALIAS_MAPPING JSON: ${aliasMapping}`, e);
    return null;
  }
}

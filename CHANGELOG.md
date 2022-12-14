## [1.2.9](https://github.com/adobe/helix-coralogix-feeder/compare/v1.2.8...v1.2.9) (2023-01-09)


### Bug Fixes

* check CORALOGIX_API_KEY is set ([#34](https://github.com/adobe/helix-coralogix-feeder/issues/34)) ([f86fe46](https://github.com/adobe/helix-coralogix-feeder/commit/f86fe46705413a9a1ae77b057e74fd0aeef52245))

## [1.2.8](https://github.com/adobe/helix-coralogix-feeder/compare/v1.2.7...v1.2.8) (2023-01-09)


### Bug Fixes

* logging last 4 letters of CORALOGIX_API_KEY ([e961487](https://github.com/adobe/helix-coralogix-feeder/commit/e961487aac2a4bf0e3f168b13bd41ff29080d82e))

## [1.2.7](https://github.com/adobe/helix-coralogix-feeder/compare/v1.2.6...v1.2.7) (2022-12-25)


### Bug Fixes

* **deps:** update adobe fixes ([#28](https://github.com/adobe/helix-coralogix-feeder/issues/28)) ([647f92a](https://github.com/adobe/helix-coralogix-feeder/commit/647f92a3f2dad18242f14c309c6a78ec56c87dd1))

## [1.2.6](https://github.com/adobe/helix-coralogix-feeder/compare/v1.2.5...v1.2.6) (2022-11-29)


### Bug Fixes

* add retry delays ([#21](https://github.com/adobe/helix-coralogix-feeder/issues/21)) ([a6e8be4](https://github.com/adobe/helix-coralogix-feeder/commit/a6e8be4640036bc8c3489ae908adced974782698))

## [1.2.5](https://github.com/adobe/helix-coralogix-feeder/compare/v1.2.4...v1.2.5) (2022-11-27)


### Bug Fixes

* message with no log level should default to `INFO` ([7092ecf](https://github.com/adobe/helix-coralogix-feeder/commit/7092ecf575086fa72f0ab81535babde1d667079b))

## [1.2.4](https://github.com/adobe/helix-coralogix-feeder/compare/v1.2.3...v1.2.4) (2022-11-25)


### Bug Fixes

* when no log messages remain, don't send ([40f076f](https://github.com/adobe/helix-coralogix-feeder/commit/40f076f3da05c2efecd7dcfb659563211ca97ee4))

## [1.2.3](https://github.com/adobe/helix-coralogix-feeder/compare/v1.2.2...v1.2.3) (2022-11-25)


### Bug Fixes

* send unprocessed messages to DLQ ([#18](https://github.com/adobe/helix-coralogix-feeder/issues/18)) ([beb6cb8](https://github.com/adobe/helix-coralogix-feeder/commit/beb6cb81e0d10c846cdcabc927281348c5614a8f))

## [1.2.2](https://github.com/adobe/helix-coralogix-feeder/compare/v1.2.1...v1.2.2) (2022-11-18)


### Bug Fixes

* include logEntries when status code reports 400 ([8ec6894](https://github.com/adobe/helix-coralogix-feeder/commit/8ec68948724b301cb9bc4ab1147056a4f741f8e7))
* provide more details when sending fails ([f020426](https://github.com/adobe/helix-coralogix-feeder/commit/f020426ad69e9fb2ef90f16d8b8e8d3c55cc9a48))

## [1.2.1](https://github.com/adobe/helix-coralogix-feeder/compare/v1.2.0...v1.2.1) (2022-11-18)


### Bug Fixes

* remove with (console) ([5c5fafd](https://github.com/adobe/helix-coralogix-feeder/commit/5c5fafd5e1852b82670b84ab25c833a591f150e0))

# [1.2.0](https://github.com/adobe/helix-coralogix-feeder/compare/v1.1.0...v1.2.0) (2022-11-11)


### Features

* include logstream for better reverse lookup ([#10](https://github.com/adobe/helix-coralogix-feeder/issues/10)) ([7ca0f5a](https://github.com/adobe/helix-coralogix-feeder/commit/7ca0f5ad46b5d2db40fea3843fd20c29a6fce3e5))

# [1.1.0](https://github.com/adobe/helix-coralogix-feeder/compare/v1.0.5...v1.1.0) (2022-11-10)


### Features

* use CORALOGIX_LOG_LEVEL ([#8](https://github.com/adobe/helix-coralogix-feeder/issues/8)) ([fa10e3b](https://github.com/adobe/helix-coralogix-feeder/commit/fa10e3b7c6f2b2a32e28a4da76bdcb731747d719))

## [1.0.5](https://github.com/adobe/helix-coralogix-feeder/compare/v1.0.4...v1.0.5) (2022-10-30)


### Bug Fixes

* remove linefeeds at the end ([#4](https://github.com/adobe/helix-coralogix-feeder/issues/4)) ([d648e27](https://github.com/adobe/helix-coralogix-feeder/commit/d648e270aa573673f109ba8cae2e7a3e1f1735ee))

## [1.0.4](https://github.com/adobe/helix-coralogix-feeder/compare/v1.0.3...v1.0.4) (2022-10-29)


### Bug Fixes

* use invocationId instead of requestId ([d2504f9](https://github.com/adobe/helix-coralogix-feeder/commit/d2504f972866ce5f82cfeede917b36276908d6cb))

## [1.0.3](https://github.com/adobe/helix-coralogix-feeder/compare/v1.0.2...v1.0.3) (2022-10-28)


### Bug Fixes

* needs specific role ([fa80b7f](https://github.com/adobe/helix-coralogix-feeder/commit/fa80b7fb81836e6bbb1a19d841ccdf4700d34715))

## [1.0.2](https://github.com/adobe/helix-coralogix-feeder/compare/v1.0.1...v1.0.2) (2022-10-28)


### Bug Fixes

* add stack for unexpected error ([169e99c](https://github.com/adobe/helix-coralogix-feeder/commit/169e99c6e845dd9095a00d773ae37cae0251fd3a))
* catch outer errors ([366258b](https://github.com/adobe/helix-coralogix-feeder/commit/366258b101e7bfa7e8e616c4f0e0a6847d4c3780))

## [1.0.1](https://github.com/adobe/helix-coralogix-feeder/compare/v1.0.0...v1.0.1) (2022-10-28)


### Bug Fixes

* use alias in function name ([#2](https://github.com/adobe/helix-coralogix-feeder/issues/2)) ([8a6d392](https://github.com/adobe/helix-coralogix-feeder/commit/8a6d392d494ac5f33e4cdcc553961696e8bfcfe6))

# 1.0.0 (2022-10-28)


### Bug Fixes

* add coverage and tests ([9a75a0e](https://github.com/adobe/helix-coralogix-feeder/commit/9a75a0e96f34455c17a7c05e4edcdd70b75dd138))
* add events ([c6b94ad](https://github.com/adobe/helix-coralogix-feeder/commit/c6b94ad5ffee7d738bda62c190019c10116011f4))
* add gcloud-setup ([825fa79](https://github.com/adobe/helix-coralogix-feeder/commit/825fa7945cd1595936f738fbeec8a23ffe47cdc8))
* add level, message and timestamp ([397ad37](https://github.com/adobe/helix-coralogix-feeder/commit/397ad3736ad4d1867eb6f9b604d907dc4e6d550d))
* add message ([6a921f4](https://github.com/adobe/helix-coralogix-feeder/commit/6a921f454ec452e3ac43d997486d7ffd2d37d27f))
* assert.fail is wrong ([349ff7a](https://github.com/adobe/helix-coralogix-feeder/commit/349ff7a5b28060b240a624c7bb654c61ac139353))
* initial commith ([35c91f7](https://github.com/adobe/helix-coralogix-feeder/commit/35c91f78fd318d85655004489ececfe77efa9d66))
* lower case log level ([e6842b3](https://github.com/adobe/helix-coralogix-feeder/commit/e6842b38f9c50ef7d825f9c1b77bbf5dd89165f0))
* status should be NO CONTENT ([cc49283](https://github.com/adobe/helix-coralogix-feeder/commit/cc492832848e7e7b102a131af23f8e3dd71f7970))

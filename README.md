# Helix Coralogix Feeder

> Service that subscribes to CloudWatch logs for Helix services and pushes them to Coralogix.

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-coralogix-feeder.svg)](https://codecov.io/gh/adobe/helix-coralogix-feeder)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe/helix-coralogix-feeder.svg)](https://circleci.com/gh/adobe/helix-coralogix-feeder)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-coralogix-feeder.svg)](https://github.com/adobe/helix-coralogix-feeder/blob/main/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-coralogix-feeder.svg)](https://github.com/adobe/helix-coralogix-feeder/issues)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe/helix-coralogix-feeder.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe/helix-coralogix-feeder)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Installation

The AWS Console has an issue where a subscription filter can not be added with a specific version or alias, we therefore recommend to use the AWS CLI.

Given the service you want to push logs into Coralogix for, e.g. `helix-services--my-service`, use the following command:

```
$ aws logs put-subscription-filter \
  --log-group-name /aws/lambda/helix-services--my-service \
  --filter-name helix-coralogix-feeder \
  --filter-pattern '[timestamp=*Z, request_id="*-*", event]' \
  --destination-arn 'arn:aws:lambda:<region>:<accountid>:function:helix3--coralogix-feeder:v2'
```

You can filter log events sent by level as follows:
```
  --filter-pattern '[timestamp=*Z, request_id="*-*", level=%WARN|ERROR%, event]'
```
this will invoke the feeder only for WARN and ERROR messages.

If you get an error that CloudWatch is not allowed to execute your function, add the following permission:
```
aws lambda add-permission \
    --function-name 'arn:aws:lambda:<region>:<accountid>:function:helix3--coralogix-feeder:v2' \
    --statement-id 'CloudWatchInvokeCoralogixFeeder' \
    --principal 'logs.amazonaws.com' \
    --action 'lambda:InvokeFunction' \
    --source-arn 'arn:aws:logs:<region>:<accountId>:log-group:/aws/lambda/helix-services--my-service:*' \
    --source-account '<accountId>'
```

The service uses the following environment variables:

| Name  | Description  | Required | Default |
|:------|:-------------|:---------|:--------|
| CORALOGIX_API_KEY | Coralogix Private Key | Yes | - |
| CORALOGIX_COMPUTER_NAME | Computer name | No | - |
| CORALOGIX_LOG_LEVEL | Log level | No | info |
| CORALOGIX_SUBSYSTEM | Subsystem | No | second segment in log group name, e.g. `helix-services` |

If delivery to Coralogix fails, the service will send the unprocessed messages to the AWS SQS queue named `helix-coralogix-feeder-dlq`.

## Development

### Deploying Franklin Coralogix Feeder

All commits to main that pass the testing will be deployed automatically. All commits to branches that will pass the testing will get commited as `helix3--coralogix-feeder@ci<num>` and tagged with the CI build number.

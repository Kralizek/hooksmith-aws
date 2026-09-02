# @hooksmith/aws-lambda

AWS Lambda hosting support for running Hooksmith event processing in Lambda
functions.

This package is the AWS Lambda host for Hooksmith and is allowed to depend on
`@hooksmith/runtime`. Consumers that only need AWS event adapters or listeners
can use [`@hooksmith/aws`](../aws) without taking a runtime dependency.

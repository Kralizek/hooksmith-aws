# @hooksmith/aws

AWS integrations for Hooksmith, with event adapters and listeners for AWS
services.

This package is intended for AWS-specific integration primitives such as
converting AWS service payloads into Hooksmith events and invoking AWS services
from Hooksmith listeners. It does not host the Hooksmith runtime itself.

Lambda hosting support lives in [`@hooksmith/aws-lambda`](../aws-lambda).

# hooksmith-aws

AWS integrations for [Hooksmith](https://github.com/Kralizek/hooksmith).

## Packages

| Package                                                         | Purpose                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------- |
| [`@hooksmith/aws`](https://jsr.io/@hooksmith/aws)               | AWS event adapters and service listeners for Hooksmith. |
| [`@hooksmith/aws-lambda`](https://jsr.io/@hooksmith/aws-lambda) | AWS Lambda hosting support for Hooksmith runtimes.      |

`@hooksmith/aws` contains the AWS integration primitives and depends only on the
Hooksmith contracts it needs. `@hooksmith/aws-lambda` is the hosting package and
can depend on the Hooksmith runtime without forcing that dependency on consumers
that only need AWS adapters or listeners.

## Development

```sh
deno task check
```

## Release

Run the **Release** workflow manually and choose a `major`, `minor`, or `patch`
version bump. Both workspace packages are versioned and released together.

## License

MIT

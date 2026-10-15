# DeepSeek Harness — teammate model-selection fork

English | [中文](README.zh.md)

DeepSeek Harness (`dsh`) is an open-source agent harness developed by [DeepSeek AI](https://deepseek.com).

It is built on an **everything-is-a-plugin** architecture and powered by [Cordis](https://github.com/cordiverse/cordis), whose design is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512).

Documentation: [https://deepseek-harness.github.io/deepseek-harness/](https://deepseek-harness.github.io/deepseek-harness/)

## This fork

This repository is a personal fork of [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness), maintained at [namaenande/deepseek-harness](https://github.com/namaenande/deepseek-harness). It tracks upstream and carries one extra capability on top of the `0.2.1-alpha.4` base: **choosing a fresh teammate's LLM route when the Team Lead creates an Agent Team**. Upstream does not provide it and a pull request is not planned, so read this as an extra build rather than an upstream contribution.

### What the addition does

Enable **Subagent model selection** under Plugins in Settings and add the exact `{ provider, model }` routes you authorize. A Lead Session composed after that records the route list, and the Lead's `spawn_teammate` gains `provider`, `model`, and `reasoning_effort` together with `list_subagent_models` for discovery. Omitting those fields keeps the original behavior: the teammate inherits the Lead's route.

The route is checked against the Session allowlist and preflighted through the LLM runtime before the teammate exists, so an unauthorized, unregistered, or unsupported route fails without creating a member. Fork teammates keep no route selection, because their inherited conversation prefix belongs to the Lead's route.

### Known limits

`list_agents` reports a teammate's own model only while its Agent is loaded; once that Agent is released, the row omits `model` instead of reporting the Lead's. The exact route stays durable in the child Session descriptor and in the `spawn_teammate` result. The [tool-agent-team package README](packages/experimental/tool-agent-team/README.md) owns the complete contract.

### Build this fork

Run from a checkout as described under [Run from source](#run-from-source). The unsigned Windows desktop build is produced with `pnpm run package:desktop:win:x64:unsigned --build-version <version>` after filling in `apps/desktop/.env.windows`; the [packaging guide](apps/desktop/packaging/README.md) owns the requirements.

## Developer preview

DeepSeek Harness is in _developer preview_ and iterating rapidly. **THERE WILL BE COMPATIBILITY-BREAKING CHANGES.**

Review the [safety notice](SAFETY.md) before running the project.

## Run

### Run from `npm`

Install `Node.js`, then run:

```sh
npx @deepseek-ai/dsh web
```

The command starts the Web UI at `http://127.0.0.1:3080` by default and opens it in the default browser for a local launch. An SSH launch only prints the host URL because the SSH client or editor owns the local forwarded address. Pass `--no-open` to run the server without opening a browser. See [Web UI guide](docs/user/guide/index.md).

### Run from source

To run from a repository checkout:

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

`pnpm run build` prepares the repository artifacts. `pnpm dsh web` uses those built artifacts without rebuilding.

## Community and support

- Submit feedback or bug reports through [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions).
- Add the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic to your plugin repository for discoverability.
- Join <a href="https://discord.gg/4MrtZUhpxg">DeepSeek Harness Discord community</a>.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

Start with the [development guide](docs/development.md) and [architecture documentation](docs/architecture.md).

`pnpm run dev:web` builds, serves, and rebuilds client bundles on source edits in one terminal, and `make help` lists the matching Make targets for Web and Desktop; the guide's application commands section owns the full table.

For agents, follow [AGENTS.md](AGENTS.md).

## Citation

```bibtex
@misc{deepseek-harness2026,
  title={DeepSeek Harness: Everything is a Plugin},
  author={DeepSeek-AI},
  year={2026},
  publisher={GitHub},
  howpublished={\url{https://github.com/deepseek-ai/deepseek-harness}},
}
```

## License

[MIT](LICENSE)

Third-party dependencies and their licenses are disclosed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

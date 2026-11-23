## Find components and references

```sh
pnpm exec syntrofic --help
pnpm exec syntrofic list
pnpm exec syntrofic search table
```

Use the component catalog to check imports and open live previews. Run each command with `--help` for supported options.

## Add a template block

```sh
pnpm exec syntrofic template add checkout-address --type block --out ./checkout-address
```

The [template directory](/templates/) includes full pages and reusable blocks.

## Manage a project theme

Use the theme commands to create a local theme and export Web CSS or Native tokens. Edit semantic colors and component rules and test the result in the [Theme lab](/themes/). Run `pnpm exec syntrofic theme --help` to see the available operations.

## Connect MCP

Syntrofic's CLI provides a local MCP entry point. Use `pnpm exec syntrofic --help` to check the installed version's server command, then configure your client to launch it in your project directory. Keep any project-specific credentials in the client's secret storage.

## Release feeds

The [release feed](/blog/) is available as [RSS](/blog/feed.xml).

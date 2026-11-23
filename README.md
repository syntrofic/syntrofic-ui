# Syntrofic UI

English · [简体中文](README.zh-CN.md)

Syntrofic UI is an MIT-licensed component library for Vue 3 and NativeScript-Vue. It includes UI primitives, forms, data tables, charts, page templates, and an Agent UI renderer.

[Website](https://ui.syntrofic.com/en/) · [Vue components](https://ui.syntrofic.com/en/docs/vue/components/) · [Native components](https://ui.syntrofic.com/en/docs/native/components/) · [Templates](https://ui.syntrofic.com/en/templates/) · [Standard design](https://ui.syntrofic.com/en/docs/standard-design/)

## Vue

```sh
pnpm add @syntrofic/ui
```

```vue
<script setup lang="ts">
import { SButton } from '@syntrofic/ui'
import '@syntrofic/ui/style.css'
</script>

<template>
  <SButton>Save changes</SButton>
</template>
```

## NativeScript-Vue

```sh
pnpm add @syntrofic/ui-native
```

Use `SNativeProvider` at the root of your application to configure the theme, direction, typography, and reduced motion. [Native quick start](https://ui.syntrofic.com/en/docs/native/quick-start/)

## Develop locally

```sh
pnpm install --frozen-lockfile
pnpm dev:site
```

Run `pnpm dev` for the component workbench. Run `pnpm build` to build the library and `pnpm build:site` to generate the website in `dist-site/`.

```sh
pnpm typecheck
pnpm check:catalog
pnpm exec playwright install chromium firefox webkit
pnpm test
```

Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to run tests with a local Chromium executable. [Contributing](CONTRIBUTING.md)

## License

Syntrofic UI is available under the [MIT License](LICENSE). Third-party notices are in [LICENSES](LICENSES/).

## Install

Syntrofic UI renders native controls through NativeScript-Vue. Set up the SDK for your target platform before building the sample app.

```sh
pnpm add @syntrofic/ui-native
```

## Configure the root

`SNativeProvider` provides theme, layout direction, typography, and reduced-motion settings. The default canvas is white. Set `appearance="system"` to follow the device. Use NativeScript's `@tap` event for taps.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { SNativeButton, SNativeProvider } from '@syntrofic/ui-native'

const saved = ref(false)
</script>

<template>
  <Page>
    <SNativeProvider>
      <SNativeButton :label="saved ? 'Saved' : 'Save settings'" @tap="saved = true" />
    </SNativeProvider>
  </Page>
</template>
```

## Run the examples

`SNativeIcon` uses the same vector artwork as Vue and the website. Use `<SNativeIcon name="download" />` for the download icon. The Native package copies the font to the app’s `fonts` folder. With custom bundling, copy the package’s `fonts/SyntroficIcons.ttf` there. `provideNativeIcons` still accepts custom glyphs and variants. [Browse icons](/icons/)

Build the Native package and start the sample on a device or simulator. Use the scene number shown on a component page to find the corresponding example.

```sh
pnpm --filter @syntrofic/ui-native build
pnpm --filter @syntrofic/native-demo ios
pnpm --filter @syntrofic/native-demo android
```

[Native components](/docs/native/components/) · [NativeScript setup](https://docs.nativescript.org/setup/)

## Install

```sh
pnpm add @syntrofic/ui
```

## Import styles

Import the stylesheet once at the root. In Nuxt, add it to the `css` array in `nuxt.config.ts`.

```ts
import '@syntrofic/ui/style.css'
```

## Render your first component

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { SButton } from '@syntrofic/ui'

const saved = ref(false)
</script>

<template>
  <SButton @click="saved = true">{{ saved ? 'Saved' : 'Save changes' }}</SButton>
</template>
```

## Explore

[Vue components](/docs/vue/components/) · [Application templates](/templates/) · [Theming and styles](/docs/theming/)

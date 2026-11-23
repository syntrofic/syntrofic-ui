<script setup lang="ts">
import { SNativeProvider, SNativeWorkspaceTemplate } from '@syntrofic/ui-native'
defineProps<{ kind:'wallet'|'fitness'; label:string }>()
</script>
<template>
  <Page>
    <ActionBar :title="label" />
    <SNativeProvider>
      <ScrollView><StackLayout padding="16"><SNativeWorkspaceTemplate :kind="kind" /></StackLayout></ScrollView>
    </SNativeProvider>
  </Page>
</template>

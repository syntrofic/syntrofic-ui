<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import {
  SAvatar, SAvatarGroup, SAvatarGroupOverflow, SAvatarStatusDot, SButton, SDialog,
  SLightbox, SMotionText, SStatusDot, SSwitch, SThumbnail,
} from '../src'
import type { AvatarPerson, AvatarSize } from '../src'
import linPortrait from './assets/profile-lin.jpg'
import chenPortrait from './assets/profile-chen.jpg'

defineProps<{ kind: 'avatar' | 'group' | 'status' | 'thumbnail' }>()

const profileId = useId()
const brokenImage = 'data:image/jpeg;base64,AA=='
const useBackup = ref(false)
const profileOpen = ref(false)
const sizes: AvatarSize[] = ['xsm', 'sm', 'md', 'lg', 'xl', 56]
const presenceOptions = [
  { tone: 'success', label: '在线' },
  { tone: 'neutral', label: '离线' },
  { tone: 'error', label: '请勿打扰' },
] as const
const presenceIndex = ref(0)
const presence = computed(() => presenceOptions[presenceIndex.value % presenceOptions.length]!)

const members: AvatarPerson[] = [
  { id: 'lin', name: '林舟', src: linPortrait },
  { id: 'chen', name: '陈远', src: chenPortrait },
  { id: 'shen', name: '沈宁', tone: 'blue' },
  ...['余秋', '苏榆', '孟冬', '许言', '宋扬', '夏岚', '周悦', '江时', '罗吟', '任清', '郑羽', '顾楠']
    .map((name, index) => ({ id: index, name })),
]
const memberLinks = members.slice(0, 3).map(person => ({ ...person, href: `#${profileId}-${person.id}` }))
const membersOpen = ref(false)
const fewerMembers = ref(false)
const memberTotal = computed(() => fewerMembers.value ? 9 : members.length)

const indicators = [
  { tone: 'neutral', label: '未排期' },
  { tone: 'info', label: '同步中' },
  { tone: 'success', label: '已发布' },
  { tone: 'warning', label: '待评审' },
  { tone: 'danger', label: '交付受阻' },
] as const
const needsReview = ref(false)
const release = computed(() => needsReview.value ? indicators[3] : indicators[2])
const pulsing = ref(true)

const photos = [
  { id: 'lin', src: linPortrait, alt: '浅绿背景的林舟肖像', caption: '林舟 · 设计' },
  { id: 'chen', src: chenPortrait, alt: '深蓝背景的陈远肖像', caption: '陈远 · 工程' },
]
const removed = ref<string[]>([])
const photoOpen = ref(false)
const photoIndex = ref(0)
const visiblePhotos = computed(() => photos.filter(photo => !removed.value.includes(photo.id)))
const pendingUpload = ref(false)
function openPhoto(index: number) {
  photoIndex.value = index
  photoOpen.value = true
}
</script>

<template>
  <div v-if="kind === 'avatar'" class="review__stack">
    <section class="review__stack" aria-label="头像图片和回退">
      <div class="review__row">
        <SAvatar name="林舟" size="lg" :src="useBackup ? brokenImage : linPortrait" :fallback-src="chenPortrait" />
        <SAvatar name="Maya R. Lin" :src="brokenImage" :fallback-src="brokenImage" />
        <SAvatar alt="匿名访客" :src="brokenImage" />
        <SButton size="sm" variant="secondary" @click="useBackup = !useBackup">切换头像来源</SButton>
      </div>
      <div class="review__row" aria-label="六种头像尺寸">
        <SAvatar v-for="size in sizes" :key="size" :size="size" :src="linPortrait" alt="" />
      </div>
    </section>
    <section class="review__stack" aria-label="个人资料与提示">
      <div class="review__row">
        <SAvatar name="查看林舟资料" :href="`#${profileId}`" :src="linPortrait" tooltip="前往个人资料" />
        <SAvatar name="查看陈远资料" :src="chenPortrait" actionable :tooltip="false" @activate="profileOpen = true" />
        <div :id="profileId" class="identity-media__profile">
          <SAvatar alt="" :src="linPortrait" shape="rounded" />
          <span><strong>林舟</strong><small>产品设计师</small></span>
        </div>
      </div>
      <SDialog v-model:open="profileOpen" title="陈远" description="工程负责人" dismiss-label="关闭资料" />
    </section>
    <section class="review__stack" aria-label="头像在线状态">
      <div class="review__row">
        <SAvatar name="沈宁" :status="presence.tone" :status-label="presence.label" />
        <SMotionText :value="presence.label" motion="roll" />
        <SButton size="sm" variant="secondary" @click="presenceIndex++">更新在线状态</SButton>
      </div>
      <div class="review__row">
        <SAvatar v-for="(option, index) in presenceOptions" :key="option.tone" :size="sizes[index + 1]" :alt="'成员 ' + (index + 1)">
          <template #status><span class="identity-media__indicator"><SAvatarStatusDot :variant="option.tone" :label="option.label" /></span></template>
        </SAvatar>
      </div>
    </section>
  </div>

  <section v-else-if="kind === 'group'" class="review__stack" aria-label="项目成员演示">
    <SSwitch v-model="fewerMembers">仅显示本组成员</SSwitch>
    <SAvatarGroup :items="memberLinks" :total="memberTotal" :max="3" label="项目成员" overflow-interactive
      :overflow-label="count => `查看其余 ${count} 位成员`" @overflow="membersOpen = true" />
    <div class="review__row" aria-label="成员超额显示">
      <SAvatarGroup :items="members.slice(0, 2)" :total="5" size="sm" label="标准成员计数"
        :overflow-label="count => `另有 ${count} 位设计同事`" />
      <SAvatarGroup :items="members.slice(0, 2)" :total="14" size="lg" label="自定义成员计数"
        :overflow-label="count => `另有 ${count} 位社区成员`">
        <template #count="{ count, size, label }">
          <SAvatarGroupOverflow :count="count" :size="size" :label="label">{{ count }}+</SAvatarGroupOverflow>
        </template>
      </SAvatarGroup>
    </div>
    <div class="review__row" aria-label="已展示成员资料">
      <span v-for="person in memberLinks" :id="`${profileId}-${person.id}`" :key="person.id">{{ person.name }}</span>
    </div>
    <SDialog v-model:open="membersOpen" title="其余项目成员" :description="`另有 ${memberTotal - memberLinks.length} 人`" dismiss-label="关闭成员名单">
      <ul class="identity-media__members">
        <li v-for="person in members.slice(memberLinks.length, memberTotal)" :key="person.id">{{ person.name }}</li>
      </ul>
    </SDialog>
  </section>

  <div v-else-if="kind === 'status'" class="review__stack">
    <div class="review__row" aria-label="五种交付状态">
      <span v-for="indicator in indicators" :key="indicator.tone" class="identity-media__indicator">
        <SStatusDot :tone="indicator.tone" />{{ indicator.label }}
      </span>
    </div>
    <div class="review__row">
      <SStatusDot :tone="release.tone" :label="release.label" :pulse="pulsing" />
      <SMotionText :value="release.label" motion="roll" />
      <SButton size="sm" variant="secondary" @click="needsReview = !needsReview">切换状态</SButton>
      <SSwitch v-model="pulsing">状态脉冲</SSwitch>
    </div>
  </div>

  <section v-else class="review__stack" aria-label="成员照片缩略图">
    <TransitionGroup name="identity-photos" tag="div" class="review__row">
      <SThumbnail v-for="(photo, index) in visiblePhotos" :key="photo.id"
        :src="photo.src" :alt="photo.alt" :label="photo.caption" actionable removable show-label show-remove-on="always"
        :remove-label="`移除${photo.caption.slice(0, 2)}照片`" :loading="pendingUpload"
        :loading-label="`正在上传${photo.caption.slice(0, 2)}照片`" @activate="openPhoto(index)" @remove="removed.push(photo.id)" />
      <SThumbnail key="queue" label="待上传成员照片" show-label :loading="pendingUpload" loading-label="等待照片上传" />
      <SThumbnail key="archived" :src="chenPortrait" label="已归档成员照片" actionable removable show-label disabled
        show-remove-on="always" remove-label="移除归档成员照片" @activate="openPhoto(0)" @remove="removed.push('chen')" />
    </TransitionGroup>
    <div class="review__row">
      <SSwitch v-model="pendingUpload">显示上传进度</SSwitch>
      <SButton v-if="removed.length" size="sm" variant="secondary" @click="removed = []">恢复成员照片</SButton>
    </div>
    <SLightbox v-model:open="photoOpen" v-model:index="photoIndex" :media="visiblePhotos" label="成员照片预览"
      close-label="关闭照片预览" previous-label="上一张照片" next-label="下一张照片" />
  </section>
</template>

<style scoped>
.identity-media__profile, .identity-media__indicator { display: inline-flex; gap: .5rem; align-items: center; }
.identity-media__profile small { display: block; color: var(--sy-text-muted); }
.identity-media__members { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem 1.25rem; margin-block: 0; }
.identity-photos-move { transition: transform var(--sy-motion-replace) var(--sy-ease-settle); }
.identity-photos-enter-active, .identity-photos-leave-active { transition: opacity var(--sy-motion-replace) var(--sy-ease-settle), transform var(--sy-motion-replace) var(--sy-ease-settle); }
.identity-photos-leave-active { position: absolute; pointer-events: none; }
.identity-photos-enter-from, .identity-photos-leave-to { opacity: 0; transform: scale(.94); }
@media (prefers-reduced-motion: reduce) {
  .identity-photos-move, .identity-photos-enter-active, .identity-photos-leave-active { transition: none; }
}
</style>

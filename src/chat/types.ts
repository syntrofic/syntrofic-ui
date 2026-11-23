import type { AnnotationTone, TableKey } from '../types'
import type { TimelineStatus } from '../components/STimelineItem.vue'
import type { PromptSegment, PromptTokenSegment, PromptTokenSuggestion } from './prompt-tokens'

export type ChatLoaderVariant = 'dots' | 'pulse' | 'spinner' | 'skeleton'
export type ChatAttachmentKind = 'audio' | 'image' | 'video' | 'document' | 'spreadsheet' | 'archive' | 'code' | 'other'
export type ChatAttachmentStatus = 'ready' | 'uploading' | 'error'

export interface ChatAttachmentInfo {
  id: TableKey
  name: string
  mimeType?: string
  kind?: ChatAttachmentKind
  size?: number
  src?: string
  file?: File
  status?: ChatAttachmentStatus
  progress?: number
  error?: string
  alt?: string
  disabled?: boolean
}

export interface ChatActivityStep {
  id: TableKey
  title: string
  description?: string
  time?: string
  datetime?: string
  status?: TimelineStatus
  statusLabel?: string
}

export interface ChatThread {
  id: TableKey
  title: string
  preview?: string
  group?: string
  href?: string
  disabled?: boolean
  datetime?: string
  time?: string
  unread?: number
}

export type ChatTextToken = (PromptTokenSegment | PromptTokenSuggestion | { id?: string; value: string; label?: string }) & { tone?: AnnotationTone }

export type ChatMessageRole = 'assistant' | 'user' | 'system'
export type ChatMessageStatus = 'ready' | 'pending' | 'streaming' | 'error'

export type ChatMessageAction = 'copy' | 'like' | 'dislike' | 'retry' | 'share'
export type ChatMessageFeedback = 'like' | 'dislike' | null
export type ChatCopyStatus = 'idle' | 'copied' | 'error'

export interface ChatSourceInfo {
  id?: TableKey
  title?: string
  href?: string
  description?: string
  faviconUrl?: string
  type?: 'url' | 'document'
  newWindow?: boolean
  actionable?: boolean
}

export type ChatToolState = 'input-streaming' | 'input-available' | 'output-available' | 'output-error' | 'requires-action'

export interface ChatToolInfo {
  id?: TableKey
  toolName: string
  state: ChatToolState
  input?: unknown
  argsText?: string
  output?: unknown
  errorText?: string
  triggerPrefix?: string
}

export type ChatToolCallStatus = 'pending' | 'running' | 'complete' | 'error'

export interface ChatToolCall {
  id: TableKey
  name: string
  target?: string
  status?: ChatToolCallStatus
  node?: string
  duration?: string
  additions?: number
  deletions?: number
  errorMessage?: string
  detail?: boolean
}

export interface PromptSuggestionInfo {
  id: TableKey
  title: string
  prompt?: string
  description?: string
  meta?: string
  tags?: readonly string[]
  accessibleLabel?: string
  disabled?: boolean
}

export type PromptRunStatus = 'ready' | 'submitted' | 'streaming' | 'error'
export interface PromptFeedback { type: 'error' | 'warning'; message: string }
export type PromptLayout = 'stacked' | 'compact' | 'inline'

export interface PromptPayload {
  text: string
  segments?: readonly PromptSegment[]
  files: readonly File[]
}

export interface QueuedPrompt extends PromptPayload {
  id: string
}

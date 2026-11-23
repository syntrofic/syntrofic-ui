import type { ChatReaction } from '../components/SChatReactionBar.vue'

export interface CommentParticipant { id: string; name: string; avatar?: string }
export interface CommentAnchor { text: string; label?: string; status?: 'anchored' | 'orphaned' }
export interface CommentVersion { id: string; text: string; updatedAt?: string; author?: CommentParticipant; current?: boolean }
export interface CommentProgress { label: string; link?: { href: string; label: string } }

export interface CommentActivityEvent {
  id: string
  label: string
  createdAt: string | number
  description?: string
  actor?: CommentParticipant
  href?: string
}

export interface CommentMessage {
  id: string
  author: string
  text: string
  createdAt?: string
  updatedAt?: string
  authorId?: string
  avatar?: string
  format?: 'text' | 'markdown'
  status?: 'pending' | 'error' | 'ready'
  errorMessage?: string
  edited?: boolean
  unread?: boolean
  progress?: CommentProgress
  previousVersions?: readonly CommentVersion[]
  seenBy?: readonly CommentParticipant[]
  reactions?: readonly ChatReaction[]
  canReply?: boolean
  canReact?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

export interface CommentThread {
  id: string
  label: string
  messages: readonly CommentMessage[]
  resolved?: boolean
  resolvedBy?: CommentParticipant
  canResolve?: boolean
  highlighted?: boolean
  anchor?: CommentAnchor
  typingUsers?: readonly CommentParticipant[]
}

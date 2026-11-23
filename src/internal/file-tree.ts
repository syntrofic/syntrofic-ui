import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { flattenTree, type TreeDropPosition } from './tree-data'

export interface FileTreeNode {
  id: string
  label: string
  kind?: 'file' | 'folder'
  children?: readonly FileTreeNode[]
  disabled?: boolean
  description?: string
}

export interface FileTreeSection {
  id: string
  label?: string
  items: readonly FileTreeNode[]
}

export interface FileTreeMove {
  keys: readonly string[]
  target: FileTreeNode
  position: TreeDropPosition
  items: readonly FileTreeNode[]
  sections: readonly FileTreeSection[]
}

export function isFileFolder(node: FileTreeNode) {
  return node.kind === 'folder' || node.children !== undefined
}

export function useFileTree(items: MaybeRefOrGetter<readonly FileTreeNode[]>, isLeaf = (node: FileTreeNode) => !isFileFolder(node)) {
  const entries = computed(() => flattenTree([toValue(items)], node => node.id, node => node.children))
  const leaves = computed(() => entries.value.filter(entry => isLeaf(entry.item)).map(entry => entry.item))
  const expandableKeys = computed(() => entries.value.filter(entry => !isLeaf(entry.item)).map(entry => entry.item.id))
  function filterTree(predicate: (node: FileTreeNode) => boolean): readonly FileTreeNode[] {
    function filter(nodes: readonly FileTreeNode[]): FileTreeNode[] {
      return nodes.flatMap(node => {
        if (isLeaf(node)) return predicate(node) ? [node] : []
        const children = filter(node.children ?? [])
        return children.length || predicate(node) ? [{ ...node, children }] : []
      })
    }
    return filter(toValue(items))
  }
  return { leaves, expandableKeys, filterTree }
}

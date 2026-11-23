export const templateDemos = {
  template: () => import('../src/platform/SWorkspaceTemplate.vue'),
  'standard-template': () => import('./StandardTemplateDemo.vue'),
  'identity-template': () => import('./IdentityTemplateDemo.vue'),
  'operations-template': () => import('./OperationsTemplateDemo.vue'),
  'offering-template': () => import('./OfferingTemplateDemo.vue'),
  'table-template': () => import('./TableTemplateDemo.vue'),
  'reference-template': () => import('./ReferenceTemplateDemo.vue'),
  'workspace-template': () => import('./WorkspaceTemplateDemo.vue'),
  'collection-template': () => import('./CollectionTemplateDemo.vue'),
  'communication-template': () => import('./CommunicationTemplateDemo.vue'),
  'records-template': () => import('./RecordsTemplateDemo.vue'),
}

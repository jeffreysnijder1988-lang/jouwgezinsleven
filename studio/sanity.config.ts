import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes, SINGLETONS} from './schemaTypes'
import {structure} from './structure'

export default defineConfig({
  name: 'default',
  title: 'JouwGezinsleven',
  projectId: 'amxuxo0p',
  dataset: 'production',
  plugins: [structureTool({structure})],
  schema: {
    types: schemaTypes,
    // Singletons niet via "nieuw document" aanmaken
    templates: (templates) => templates.filter(({schemaType}) => !SINGLETONS.includes(schemaType)),
  },
  document: {
    actions: (input, context) =>
      SINGLETONS.includes(context.schemaType)
        ? input.filter(({action}) => action && ['publish', 'discardChanges', 'restore'].includes(action))
        : input,
  },
})

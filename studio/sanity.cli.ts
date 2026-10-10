import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {projectId: 'amxuxo0p', dataset: 'production'},
  // Hosted Studio: https://jouwgezinsleven.sanity.studio (na `npm run deploy`)
  studioHost: 'jouwgezinsleven',
  deployment: {autoUpdates: true},
})

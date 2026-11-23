import { createApp, nextTick } from 'vue'
import { settleInitialStyles } from '../src/internal/initial-styles'
import AgentReview from './AgentReview.vue'
import LegacyReview from './LegacyReview.vue'
import PlatformReview from './PlatformReview.vue'
import PhoneThemeReview from './PhoneThemeReview.vue'
import Workbench from './Workbench.vue'
import ComponentReview from './ComponentReview.vue'
import { reviewItems } from './review-catalog'
import '../src/styles/index.css'
import './workbench.css'
import './review.css'

const search = new URLSearchParams(location.search)
const key = search.get('component')
const agent = search.get('agent')
const legacy = search.get('legacy')
const platform = search.get('platform')
const phone = search.has('theme-preview')
const item = reviewItems.find(([id]) => id === key) ?? reviewItems[0]
const app = phone ? createApp(PhoneThemeReview, { query: location.search }) : platform ? createApp(PlatformReview, { selected: platform }) : legacy ? createApp(LegacyReview, { selected: legacy }) : agent ? createApp(AgentReview, { selected: agent }) : key ? createApp(ComponentReview, { item }) : createApp(Workbench)
const root = document.getElementById('app')!
app.mount(root)
void nextTick(() => settleInitialStyles(root))

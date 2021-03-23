import { createApp } from 'vue'
import App from './App.vue'
import { UserClient } from './multiplayer/UserClient.class'

const app = createApp(App)

app.mount('#app')

declare global {
    interface Window { User: UserClient; }
}

<template>
    <div class="container">
        <div v-if="inMultiplayerGame" class="game">
            <Board
                :game="userClient.game"
            />
        </div>
        <div v-else class="game">
            <Board
                :game="singleplayerGame"
            />
        </div>
        <div class="right-panel">
            <MultiplayerPanel
                :userClient="userClient"
            />
        </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, reactive } from 'vue'

import { Game } from '../game/Game.class'

import Board from './components/Board.vue'
import MultiplayerPanel from './components/MultiplayerPanel.vue'

import { UserClient } from './multiplayer/UserClient.class'

import { socket } from './socket'

export default defineComponent({
    components: {
        Board,
        MultiplayerPanel
    },
    setup () {
        const game = new Game(8, 8)

        game.loadFEN(Game.startPositionFEN)
        
        const userClient = reactive(new UserClient(socket))

        const inMultiplayerGame = computed(() => {
            return userClient.room && userClient.room !== 'lobby'
        })

        return {
            inMultiplayerGame,
            singleplayerGame: game,
            userClient: userClient
        }
    }
})

</script>

<style lang="scss" scoped>

.container {
    display: flex;
    width: 100%;
    justify-content: center;
}

.right-panel {
    flex-basis: 20%;
}
</style>

<style>
* {
	font-family: 'Raleway', sans-serif;
}

body {
    background-color: rgb(129, 129, 129);
}
</style>
<template>
    <h1>SweeperChess</h1>

    <Board
        :game="game"
    />
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue'

import { Game } from '../game/Game.class'

import Board from './components/Board.vue'

const startingFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export default defineComponent({
    components: {
        Board
    },
    setup () {
        const game = new Game(8, 8)

        game.loadFEN(startingFEN)

        return {
            game: reactive(game)
        }
    }
})

</script>

<style lang="scss" scoped>
	
</style>

<style>
* {
	font-family: 'Raleway', sans-serif;
}
</style>
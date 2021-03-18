<template>
    <h1>SweeperChess</h1>

    <Board
        :boardLayout="boardLayout"
        :boardWidth="boardWidth"
        :boardHeight="boardHeight"
        :pieces="pieces"
        :legal-moves="legalMoves"
        @move-piece="movePiece"
    />
</template>

<script lang="ts">
import { defineComponent, ref, readonly } from 'vue'

import { Game } from '../game/Game.class'
import { Move } from '../game/utils'
import { BoardCoords } from '../types/game'

import Board from './components/Board.vue'

const startingFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'

export default defineComponent({
    components: {
        Board
    },
    setup () {
        const boardHeight = ref(8)
        const boardWidth = ref(8)

        const game = new Game(boardHeight.value, boardWidth.value)

        game.loadFEN(startingFEN)

        const movePiece = (startSquare: BoardCoords, targetSquare: BoardCoords) => {
            game.tryMovePiece(startSquare, targetSquare)
        }

        return {
            pieces: readonly(game.pieces),
            movePiece,
            game,
            boardLayout: readonly(game.boardLayout),
            boardHeight,
            boardWidth,
            legalMoves: readonly(game.legalMoves),
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
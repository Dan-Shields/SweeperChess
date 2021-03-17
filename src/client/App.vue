<template>
    <h1>SweeperChess</h1>

    <button @click="flipped = !flipped">
        FLIP
    </button>
    <Board
        :flipped="flipped"
        :boardLayout="boardLayout"
        :boardWidth="boardWidth"
        :boardHeight="boardHeight"
        :pieces="pieces"
        :legal-moves="legalMoves"
        @move-piece="movePiece"
    />
</template>

<script lang="ts">
import { computed, defineComponent, reactive, ref } from 'vue'

import { Game, PieceColor, PieceType, Piece, Move } from './game'

import Board from './components/Board.vue'

const startingFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'

export default defineComponent({
    components: {
        Board
    },
    setup () {

        const flipped = ref(false)

        const boardHeight = ref(8)
        const boardWidth = ref(8)

        const game = reactive<Game>(new Game(boardHeight.value, boardWidth.value))

        game.loadFEN(startingFEN)

        const pieces = computed(() => {
            const result: Piece[] = []
            game.board
                .forEach((piece, index) => {
                    if (piece.type == PieceType.None || piece.color == PieceColor.None) return
                    piece.index = index
                    piece.coords = game.indexToCoords(index)
                    result.push(piece)
                })

            return result
        })

        const movePiece = (startCoords: BoardCoords, targetCoords: BoardCoords) => {
            const move = new Move(game.coordsToIndex(startCoords), game.coordsToIndex(targetCoords))
            game.tryMovePiece(move)
        }

        const legalMoves = computed(() => {
            return game.legalMoves.map(move => {
                return {
                    startSquare: game.indexToCoords(move.startSquare), 
                    targetSquare: game.indexToCoords(move.targetSquare),
                }
            })
        })

        return {
            flipped,
            pieces,
            movePiece,
            game,
            boardLayout: game.boardLayout,
            boardHeight,
            boardWidth,
            legalMoves,
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
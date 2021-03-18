<template>
    <div v-if="game" class="board-container">
        <button class="flip-button" @click="flipped = !flipped">
            FLIP
        </button>
        <div class="y-coords">
            <h2 v-for="r in game.boardHeight" :key="r" class="y-coord">
                {{ flipped ? (game.boardHeight + 1 - r) : r }}
            </h2>
        </div>
        <div ref="boardRef" class="board">
            <div class="tiles" :class="{flipped}">
                <template v-for="(_, rank) in game.boardHeight">
                    <Tile
                        v-for="(__, file) in game.boardWidth"
                        :key="(rank * game.boardWidth) + file"
                        :dark="!!((rank + file + 1) % 2)"
                        :blank="false"
                        :isStartTile="moveStartTile != null && moveStartTile.rank == rank && moveStartTile.file == file"
                        :isEndTile="moveTargetTile != null && moveTargetTile.rank == rank && moveTargetTile.file == file"
                        :possibleMoveTile="possibleMoves !== undefined && possibleMoves[rank] && possibleMoves[rank][file]"
                        class="tile"
                    />
                </template>
            </div>
            <div class="pieces">
                <PieceComponent
                    v-for="piece in game.pieces"
                    :key="piece.guid"
                    :piece="piece"
                    :boardWidth="game.boardWidth"
                    :boardHeight="game.boardHeight"
                    :flipped="flipped"
                    :size="tileSize"
                    class="piece"
                    @pickedUp="piecePickedUp"
                    @dragged="pieceDragged"
                    @dropped="pieceDropped"
                />
            </div>
        </div>
        <div class="x-coords">
            <h2 v-for="c in game.boardWidth" :key="c" class="x-coord">
                {{ String.fromCharCode(96 + (flipped ? (game.boardWidth - c + 1) : c)) }}
            </h2>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, PropType, watch } from 'vue'

import { IBoardCoords, IGameContext } from '../../types/game'

import PieceComponent from './Piece.vue'
import Tile from './Tile.vue'

export default defineComponent({
    components: {
        PieceComponent,
        Tile
    },

    props: {
        game: {
            default: null,
            type: Object as PropType<IGameContext>
        }
    },

    emits: [
        'movePiece'
    ],

    setup (props, ctx) {
        const boardRef = ref<HTMLElement | null>(null)
        let boardRect: {x:number, y:number} | null = null

        const tileSize = ref(135)

        const flipped = ref(false)

        const moveStartTile = ref<IBoardCoords | null>(null)
        const moveTargetTile = ref<IBoardCoords | null>(null)

        const piecePickedUp = (startingPosition: IBoardCoords) => {
            moveStartTile.value = startingPosition
            moveTargetTile.value = startingPosition
        }

        const pieceDragged = ([mouseX, mouseY]: [number, number]) => {
            if (!boardRect) return

            const x = mouseX - boardRect.x, y = mouseY - boardRect.y

            if (x < 0 || y < 0) return
            if (x > props.game.boardWidth * tileSize.value || y > props.game.boardHeight * tileSize.value) return

            const c = Math.floor(x / tileSize.value)
            const r = Math.floor(y / tileSize.value)

            
            moveTargetTile.value = {
                file: flipped.value ? props.game.boardWidth - 1 - c : c,
                rank: flipped.value ? r : props.game.boardHeight - 1 - r
            }
        }

        const pieceDropped = (finished: boolean) => {
            if (finished && moveStartTile.value && moveTargetTile.value) props.game.tryMovePiece(moveStartTile.value, moveTargetTile.value)
            moveStartTile.value = null
            moveTargetTile.value = null
        }

        onMounted(() => {
            if (!boardRef.value) return

            boardRect = boardRef.value.getBoundingClientRect()
        })

        const possibleMoves = computed(() => {
            const result: boolean[][] = new Array(props.game.boardHeight)
            if (moveStartTile.value != null && props.game.legalMoves != undefined) {
                for (let i = 0; i < props.game.legalMoves.length; i++) {
                    const move = props.game.legalMoves[i]
                    if (move.startSquare.file != moveStartTile.value.file || move.startSquare.rank != moveStartTile.value.rank) continue

                    if (!result[move.targetSquare.rank]) result[move.targetSquare.rank] = []

                    result[move.targetSquare.rank][move.targetSquare.file] = true
                }
            }
            return result
        })
    
        const tileSizeText = computed(() => `${tileSize.value}px`)

        return {
            boardRef,
            piecePickedUp,
            pieceDragged,
            pieceDropped,
            tileSize,
            tileSizeText,
            moveStartTile,
            moveTargetTile,
            possibleMoves,
            flipped
        }
    }
})

</script>

<style lang="scss" scoped>

.board-container {
    position: relative;
}

.flip-button {
    display: block;
}

.y-coords {
    float: left;
    width: 25px;
    height: calc(v-bind('game.boardHeight') * v-bind(tileSizeText));
    display: flex;
    flex-direction: column-reverse;
    justify-content: space-between;

    .y-coord {
        height: v-bind(tileSizeText);
        line-height: v-bind(tileSizeText);
        vertical-align: middle;
        margin: 0;
    }
}

.x-coords {
    width: calc(v-bind('game.boardWidth') * v-bind(tileSizeText));
    display: flex;
    flex-direction: row;
    justify-content: space-between;

    margin-top: 10px;
    margin-left: 25px;

    .x-coord {
        width: v-bind(tileSizeText);
        text-align: center;
        margin: 0;
    }
}

.board {
    position: relative;

    display: inline-block;

    width: calc(v-bind('game.boardWidth') * v-bind(tileSizeText));
    height: calc(v-bind('game.boardHeight') * v-bind(tileSizeText));
    margin: 0;

    .tiles {
        width: 100%;
        height: 100%;
        margin: 0;

        position: absolute;
        top: 0;
        left: 0;
        
        display: flex;
        flex-wrap: wrap-reverse;

        &.flipped {
            flex-direction: row-reverse;
            flex-wrap: wrap;
        }
    }
}

.piece {
    width: v-bind(tileSizeText);
    height: v-bind(tileSizeText);
}

.tile {
    height: v-bind(tileSizeText);
    flex-basis: v-bind(tileSizeText);
}
</style>

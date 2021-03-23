<template>
    <div v-if="game" class="board-container">
        <div class="y-coords">
            <h2 v-for="r in game.setup.height" :key="r" class="y-coord">
                {{ flipped ? (game.setup.height + 1 - r) : r }}
            </h2>
        </div>
        <div ref="boardRef" class="board">
            <div class="tiles" :class="{flipped}">
                <template v-for="(_, rank) in game.setup.height">
                    <Tile
                        v-for="(__, file) in game.setup.width"
                        :key="(rank * game.setup.width) + file"
                        :dark="!!((rank + file + 1) % 2)"
                        :blank="false"
                        :isStart="moveStartTile != null && moveStartTile.rank == rank && moveStartTile.file == file"
                        :isTarget="moveTargetTile != null && moveTargetTile.rank == rank && moveTargetTile.file == file"
                        :possibleMove="possibleMoves !== undefined && possibleMoves[rank] && possibleMoves[rank][file] === false"
                        :possibleTake="possibleMoves !== undefined && possibleMoves[rank] && possibleMoves[rank][file] === true"
                        class="tile"
                    />
                </template>
            </div>
            <div class="pieces">
                <PieceComponent
                    v-for="piece in game.pieces"
                    :key="piece.guid"
                    :piece="piece"
                    :boardWidth="game.setup.width"
                    :boardHeight="game.setup.height"
                    :flipped="flipped"
                    :size="tileSize"
                    class="piece"
                    @pickedUp="piecePickedUp"
                    @dragged="pieceDragged"
                    @dropped="pieceDropped"
                />
            </div>
            <PromotionMenu
                v-if="showPromotionMenu"
                :board-height="game.setup.height"
                :board-width="game.setup.width"
                :promotion-color="promotionColor"
                :promotion-tile="promotionTile"
                :tile-size-text="tileSizeText"
                :flipped="flipped"
                @promotion-type-selected="promotionTypeSelected"
            />
        </div>
        <div class="controls">
            <button class="flip-button" @click="flipped = !flipped">
                FLIP
            </button>
        </div>
        <div class="x-coords">
            <h2 v-for="c in game.setup.width" :key="c" class="x-coord">
                {{ String.fromCharCode(96 + (flipped ? (game.setup.width - c + 1) : c)) }}
            </h2>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, PropType } from 'vue'

import { IBoardCoords, IGameRenderContext } from '../../types/game'

import PieceComponent from './Piece.vue'
import PromotionMenu from './PromotionMenu.vue'
import Tile from './Tile.vue'

import moveSound from '../assets/move.wav'
import { PieceColor, PieceType } from '../../game/enums'
import { Coords } from '../../game/utils'

const moveAudio = new Audio(moveSound)

export default defineComponent({
    components: {
        PieceComponent,
        Tile,
        PromotionMenu
    },

    props: {
        game: {
            default: null,
            type: Object as PropType<IGameRenderContext>
        }
    },

    emits: [
        'movePiece'
    ],

    setup (props) {
        const boardRef = ref<HTMLElement | null>(null)
        let boardRect: {x:number, y:number} | null = null

        const tileSize = ref(140)

        const flipped = ref(false)

        const moveStartTile = ref<IBoardCoords | null>(null)
        const moveTargetTile = ref<IBoardCoords | null>(null)

        const showPromotionMenu = ref(false)
        const promotionColor = ref<PieceColor>(PieceColor.None)
        const promotionTile = ref<IBoardCoords>({rank: -1, file: -1})

        const tileSizeText = computed(() => `${tileSize.value}px`)

        const showDebug = ref(true)

        const boardPixelWidth = computed(() => `${tileSize.value * props.game.setup.width}px`)
        const boardPixelHeight = computed(() => `${tileSize.value * props.game.setup.height}px`)

        onMounted(() => {
            if (!boardRef.value) return

            boardRect = boardRef.value.getBoundingClientRect()

            boardRef.value.addEventListener('contextmenu', e => {
                e.preventDefault()
            })

            boardRef.value.addEventListener('mousedown', e => {
                showPromotionMenu.value = false
            })
        })

        const piecePickedUp = (startingPosition: IBoardCoords) => {
            boardRect = boardRef.value?.getBoundingClientRect() || null

            moveStartTile.value = startingPosition
            moveTargetTile.value = startingPosition

            showPromotionMenu.value = false
        }

        const pieceDragged = ([mouseX, mouseY]: [number, number]) => {
            if (!boardRect) return

            const x = mouseX - boardRect.x, y = mouseY - boardRect.y

            if (x < 0 || y < 0) return
            if (x > props.game.setup.width * tileSize.value || y > props.game.setup.height * tileSize.value) return

            const c = Math.floor(x / tileSize.value)
            const r = Math.floor(y / tileSize.value)

            
            moveTargetTile.value = {
                file: flipped.value ? props.game.setup.width - 1 - c : c,
                rank: flipped.value ? r : props.game.setup.height - 1 - r
            }
        }

        const possibleMoves = computed(() => {
            const result: (boolean | null)[][] = Array.from({length: props.game.setup.height}, () => new Array(props.game.setup.width).fill(null))
            if (moveStartTile.value != null && props.game.legalMoves != undefined) {
                for (let i = 0; i < props.game.legalMoves.length; i++) {
                    const move = props.game.legalMoves[i]
                    if (move.startSquare.file != moveStartTile.value.file || move.startSquare.rank != moveStartTile.value.rank) continue

                    if (!result[move.targetSquare.rank]) result[move.targetSquare.rank] = []

                    result[move.targetSquare.rank][move.targetSquare.file] = move.targetPieceCoords !== null
                }
            }
            return result
        })

        const pieceDropped = (finished: boolean) => {
            if (finished && moveStartTile.value && moveTargetTile.value) {
                if (possibleMoves.value[moveTargetTile.value.rank][moveTargetTile.value.file] !== null) {
                    const startTile = moveStartTile.value
                    const droppedPiece = props.game.pieces.find(piece => Coords.Equal(piece.coords, startTile))

                    if (droppedPiece?.type == PieceType.Pawn && (moveTargetTile.value.rank % (props.game.setup.height - 1)) === 0) {
                        // give promotion menu
                        promotionColor.value = droppedPiece.color
                        promotionTile.value = moveTargetTile.value
                        showPromotionMenu.value = true
                        return
                    }

                    const moveProto = props.game.legalMoves.find(move => Coords.Equal(move.startSquare, moveStartTile.value as IBoardCoords) && Coords.Equal(move.targetSquare, moveTargetTile.value as IBoardCoords))

                    if (moveProto && props.game.tryMovePiece(moveProto)) {
                        moveAudio.play()
                    }
                }
            }

            if (!showPromotionMenu.value) {
                moveStartTile.value = null
                moveTargetTile.value = null
            }

        }

        const promotionTypeSelected = (type: PieceType) => {
            if (type !== PieceType.None && moveStartTile.value && moveTargetTile.value) {

                const moveProto = props.game.legalMoves.find(move => Coords.Equal(move.startSquare, moveStartTile.value as IBoardCoords) && Coords.Equal(move.targetSquare, moveTargetTile.value as IBoardCoords) && move.promotionType === type)

                if (moveProto && props.game.tryMovePiece(moveProto)) {
                    moveAudio.play()
                }

                // TODO: play promotion audio instead
                moveAudio.play()
            }

            showPromotionMenu.value = false
            promotionColor.value = PieceColor.None
            promotionTile.value = {rank: -1, file: -1}
        }


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
            flipped,
            showDebug,
            boardPixelWidth,
            boardPixelHeight,
            showPromotionMenu,
            promotionColor,
            promotionTile,
            promotionTypeSelected
        }
    }
})

</script>

<style lang="scss" scoped>

.board-container {
    position: relative;
    margin-right: 50px;    
}

.flip-button {
    display: block;
}

.y-coords {
    float: left;
    width: 25px;
    height: v-bind(boardPixelHeight);
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
    width: v-bind(boardPixelWidth);
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

    width: v-bind(boardPixelWidth);
    height: v-bind(boardPixelHeight);
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

.controls {
    float: right;
    width: 50px;
    height: v-bind(boardPixelHeight);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 10px;
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

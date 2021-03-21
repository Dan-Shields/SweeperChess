<template>
    <div
        ref="pieceRef"
        class="piece"
        :style="`transform: translate(${xOffset}px, ${yOffset}px)`"
        :class="{
            dragging
        }"
        @mousedown="mousedownHandler"
        @mouseup="mouseupHandler"
        @mouseleave="mouseleaveHandler"
        @mousemove="mousemoveHandler"
        @contextmenu="contextmenuHandler"
    >
        <img :src="pieceImage">
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, PropType } from 'vue'

import { Piece } from '../../game/Piece.class'
import { PieceColor, PieceType } from '../../game/enums'
import { IPiece } from '../../types/game'

const images = import.meta.globEager('../assets/pieces/*.svg')

function calculateMouseDistanceFromElement(elem: HTMLElement, mouseX: number, mouseY: number) {
    const rect = elem.getBoundingClientRect()

    return [mouseX - rect.x - (elem.clientWidth / 2), mouseY - rect.y - (elem.clientHeight / 2)]
}

export default defineComponent({
    props: {
        piece: {
            default: () => {
                return {
                    type: PieceType.None,
                    color: PieceColor.None,
                    coords: {
                        rank: -1,
                        file: -1
                    }
                }
            },
            type: Object as PropType<IPiece>
        },
        boardWidth: {
            default: 8,
            type: Number
        },
        boardHeight: {
            default: 8,
            type: Number
        },
        flipped: {
            default: false,
            type: Boolean
        },
        size: {
            default: 120,
            type: Number
        },
        active: {
            default: true,
            type: Boolean
        }
    },

    emits: [
        'pickedUp',
        'dragged',
        'dropped'
    ],

    setup (props, ctx) {
        const pieceImage = computed(() => {
            const color = PieceColor[props.piece.color].toLowerCase()
            const imageName = `../assets/pieces/${Piece.pieceTypeToChar(props.piece.type)}_${color}.svg`

            return images[imageName]?.default || null
        })

        const pieceRef = ref<HTMLElement | null>(null)
        const dragging = ref(false)

        const xOffset = ref(0)
        const yOffset = ref(0)

        let initialX = 0
        let initialY = 0

        const mousedownHandler = (e: MouseEvent) => {
            if (!props.active) return
            if (e.button !== 0) return

            if (pieceRef.value == null) return

            if (e.type === "touchstart") {
                //initialX = e.touches[0].clientX
                //initialY = e.touches[0].clientY
            } else {
                initialX = e.clientX
                initialY = e.clientY
            }

            const offset = calculateMouseDistanceFromElement(pieceRef.value, initialX, initialY)
            initialX -= offset[0]
            initialY -= offset[1]

            if (e.target === pieceRef.value) {
                dragging.value = true

                ctx.emit('pickedUp', props.piece.coords)

                xOffset.value = e.clientX - initialX
                yOffset.value = e.clientY - initialY
            }
        }

        const mousemoveHandler = (e: MouseEvent) => {
            if (!props.active) return
            if (dragging.value) {      
                e.preventDefault()

                let x = 0, y = 0
    
                if (e.type === "touchmove") {
                    //x = e.touches[0].clientX
                    //y = e.touches[0].clientY
                } else {
                    x = e.clientX
                    y = e.clientY
                }

                xOffset.value = x - initialX
                yOffset.value = y - initialY

                ctx.emit('dragged', [x, y])
            }
        }

        const endDrag = (finished: boolean) => {
            if (!props.active || !dragging.value) return
            xOffset.value = 0
            yOffset.value = 0

            dragging.value = false

            ctx.emit('dropped', finished)
        }

        const contextmenuHandler = (e: MouseEvent) => {
            endDrag(false)
            e.preventDefault()
        }

        const mouseupHandler = (e: MouseEvent) => {
            endDrag(e.button === 0)
        }

        const mouseleaveHandler = () => endDrag(false)

        const file = computed(() => {
            if (props.piece.coords === undefined) return 0
            if (!props.flipped) {
                return props.piece.coords.file
            } else {
                return props.boardWidth - props.piece.coords.file - 1
            }
        })

        const rank = computed(() => {
            if (props.piece.coords === undefined) return 0
            if (!props.flipped) {
                return props.piece.coords.rank
            } else {
                return props.boardHeight - props.piece.coords.rank - 1
            }
        })

        return {
            pieceImage,
            file,
            rank,
            xOffset,
            yOffset,
            pieceRef,
            dragging,
            mousedownHandler,
            mousemoveHandler,
            mouseupHandler,
            mouseleaveHandler,
            contextmenuHandler
        }
    }
})

</script>

<style lang="scss" scoped>
.piece {
    position: absolute;
    bottom: calc((100% / v-bind(boardHeight)) * v-bind(rank));
    left: calc((100% / v-bind(boardWidth)) * v-bind(file));

    user-select: none;

    will-change: transform;

    cursor: grab;

    img {
        width: 100%;
        height: 100%;
        pointer-events: none;
        //cursor: grab;
    }

    user-select: none;

    &.dragging {
        cursor: grabbing;
        z-index: 10;
    }
}

</style>

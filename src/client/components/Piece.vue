<template>
    <div
        ref="pieceRef"
        class="piece"
        :style="`transform: translate(${xOffset}px, ${yOffset}px)`"
        :class="{
            dragging
        }"
    >
        <img :src="pieceImage">
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, PropType } from 'vue'

import { Piece } from '../../game/Piece.class'
import { PieceColor, PieceType } from '../../game/enums'

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
                    position: -1
                }
            },
            type: Object as PropType<Piece>
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

        const boardPixelWidth = computed(() => props.boardWidth * props.size)
        const boardPixelHeight = computed(() => props.boardHeight * props.size)

        onMounted(() => {
            if (pieceRef.value == null) return

            let initialX = 0
            let initialY = 0

            pieceRef.value.addEventListener('mousedown', e => {
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
            })

            pieceRef.value.addEventListener('mousemove', e => {
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
            })

            const endDrag = (finished: boolean) => {
                xOffset.value = 0
                yOffset.value = 0

                dragging.value = false

                ctx.emit('dropped', finished)
            }

            pieceRef.value.addEventListener('mouseup', () => endDrag(true))
            pieceRef.value.addEventListener('mouseleave', () => endDrag(false))
        })

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
            dragging
        }
    }
})

</script>

<style lang="scss" scoped>
.piece {
    position: absolute;
    bottom: calc((100% / v-bind(boardWidth)) * v-bind(rank));
    left: calc((100% / v-bind(boardHeight)) * v-bind(file));

    user-select: none;

    will-change: transform;

    cursor: grab;

    img {
        width: 100%;
        height: 100%;
        pointer-events: none;
        cursor: grab;
    }

    user-select: none;

    &.dragging {
        cursor: grabbing;
        z-index: 10;
    }

    &.inCheck {
        background-color: rgba(255, 0, 0, 0.76);
    }
}

</style>

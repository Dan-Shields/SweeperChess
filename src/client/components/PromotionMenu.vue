<template>
    <div class="promotion-menu" :class="{bottom}">
        <PieceComponent
            v-for="piece in promotionPieces"
            :key="piece.coords.rank"
            class="promotion-option"
            :boardWidth="boardWidth"
            :boardHeight="boardHeight"
            :piece="piece"
            :active="false"
            @mousedown="mousedownHandler($event, piece.type)"
        />
        <div class="promotion-option cancel" @mousedown="mousedownHandler($event, 0)">
            CANCEL
        </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from 'vue'
import { PieceColor, PieceType } from '../../game/enums'
import { IBoardCoords } from '../../types/game'
import PieceComponent from './Piece.vue'

export default defineComponent({
    components: {
        PieceComponent
    },

    props: {
        boardWidth: {
            default: 8,
            type: Number
        },
        boardHeight: {
            default: 8,
            type: Number
        },
        promotionTile: {
            default: () => {
                return {
                    rank: -1,
                    file: -1
                }
            },
            type: Object as PropType<IBoardCoords>
        },
        promotionColor: {
            default: PieceColor.White,
            type: Number as PropType<PieceColor>
        },
        tileSizeText: {
            default: `120px`,
            type: String
        },
        flipped: {
            default: false,
            type: Boolean
        }
    },

    emits: [
        'promotionTypeSelected'
    ],

    setup(props, ctx) {

        const promotionPieceTypes = [
            PieceType.Queen,
            PieceType.Bishop,
            PieceType.Rook,
            PieceType.Knight
        ]
        
        const promotionPieces = computed(() => {
            return promotionPieceTypes.map((type) => {
                return {
                    type,
                    coords: { rank: 0, file: 0 },
                    color: props.promotionColor
                }
            })
        })

        const mousedownHandler = (e:MouseEvent, type: PieceType) => {
            if (e.button !== 0 || type == PieceType.None) {
                ctx.emit('promotionTypeSelected', PieceType.None)
            } else {
                ctx.emit('promotionTypeSelected', type)
            }
        }

        const bottom = computed(() => {
            return props.flipped ? props.promotionTile.rank == props.boardHeight - 1 : props.promotionTile.rank == 0
        })

        const xPos = computed(() => {
            return props.flipped ? props.boardWidth - 1 - props.promotionTile.file : props.promotionTile.file
        })

        return {
            promotionPieces,
            mousedownHandler,
            bottom,
            xPos
        }
    }
})
</script>

<style lang="scss" scoped>
.promotion-menu {
    margin: 0;

    z-index: 20;

    $border-width: 15px;

    border-width: $border-width;
    border-color: white;
    border-style: solid;

    box-shadow: 0px 0px 11px 0px black;

    position: absolute;
    top: -$border-width;
    left: calc((100% / v-bind(boardWidth)) * v-bind(xPos) - #{$border-width});

    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;

    &.bottom {
        top: auto;
        bottom: -$border-width;
        flex-direction: column-reverse;

        .promotion-option.cancel {
            margin-top: auto;
            margin-bottom: 15px;
        }
    }

    .promotion-option {
        $color: rgb(255, 255, 255);
        background-color: $color;

        width: v-bind(tileSizeText);
        height: v-bind(tileSizeText);

        position: static;

        cursor: pointer;

        &.cancel {
            margin-top: 15px;
            height: 100%;
            z-index: 40;

            user-select: none;

            background-color: wheat;

            font-weight: 900;
            font-size: 1.5em;
            text-align: center;

            outline-style: solid;
            outline-width: $border-width;
            outline-color: wheat;
        }
    }
}
</style>

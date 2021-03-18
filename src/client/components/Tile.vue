<template>
    <div
        ref="tileRef"
        class="tile"
        :class="{
            dark,
            blank,
            hovering: isEndTile,
            startTile: isStartTile,
            attacked,
            pinned
        }"
    >
        <div v-show="possibleMoveTile" class="possible-move"></div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
    props: {
        dark: {
            default: false,
            type: Boolean
        },
        blank: {
            default: false,
            type: Boolean
        },
        isStartTile: {
            default: false,
            type: Boolean,
        },
        isEndTile: {
            default: false,
            type: Boolean,
        },
        possibleMoveTile: {
            default: false,
            type: Boolean
        },
        attacked: {
            default: false,
            type: Boolean
        },
        pinned: {
            default: false,
            type: Boolean
        },
    },

    setup() {
    }
})
</script>

<style lang="scss" scoped>

.tile {
    $light-color: rgb(218, 221, 202);
    $dark-color: rgb(58, 124, 63);
    
    background-color: $light-color;
    border-color: rgba(233, 233, 233, 0.555);
    border-style: solid;
    border-width: 0;

    box-sizing: border-box;

    margin: 0;
    padding: 0;

    display: inline-block;

    position: relative;

    &.hovering {
        border-width: 6px;
    }

    &.dark {
        background-color: $dark-color;
    }

    &.blank {
        opacity: 0;
    }

    &.startTile {
        $mix-color: yellow;
        $mix-factor: 60%;
        
        background-color: mix($light-color, $mix-color, $mix-factor);

        &.dark {
            background-color: mix($dark-color, $mix-color, $mix-factor);
        }
    }

    &.attacked {
        $mix-color: red;
        $mix-factor: 60%;
        
        background-color: mix($light-color, $mix-color, $mix-factor);

        &.dark {
            background-color: mix($dark-color, $mix-color, $mix-factor);
        }
    }

    &.pinned {
        $mix-color: blue;
        $mix-factor: 60%;
        
        background-color: mix($light-color, $mix-color, $mix-factor);

        &.dark {
            background-color: mix($dark-color, $mix-color, $mix-factor);
        }
    }
}

.possible-move {
    width: 30%;
    height: 30%;

    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(0, 0, 0, 0.384);
    border-radius: 50%;
}
</style>
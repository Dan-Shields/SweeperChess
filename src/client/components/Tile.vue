<template>
    <div
        ref="tileRef"
        class="tile"
        :class="{
            dark,
            blank,
            'start': isStart,
            'target': isTarget
        }"
    >
        <div v-show="possibleMove" class="possible-move"></div>
        <div v-show="possibleTake" class="possible-take"></div>
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
        isStart: {
            default: false,
            type: Boolean,
        },
        isTarget: {
            default: false,
            type: Boolean,
        },
        possibleMove: {
            default: false,
            type: Boolean
        },
        possibleTake: {
            default: false,
            type: Boolean
        }
    },

    setup() {
    }
})
</script>

<style lang="scss" scoped>

.tile {
    $light-color: rgb(225, 228, 192);
    $dark-color: rgb(58, 124, 58);
    
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

.possible-take {
    width: 95%;
    height: 95%;

    box-sizing: border-box;

    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-color: rgba(0, 0, 0, 0.384);
    border-style: solid;
    border-width: 15px;
    border-radius: 50%;
    z-index: 5;
}
</style>
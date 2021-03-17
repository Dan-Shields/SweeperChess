<template>
    <div
        ref="tileRef"
        class="tile"
        :class="{
            dark,
            blank,
            hovering: isEndTile,
            possibleMoveTile
        }"
    >
    </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, computed, onMounted } from 'vue'

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
    },

    setup() {
    }
})
</script>

<style lang="scss" scoped>

.tile {
  $light-color: rgb(250, 237, 194);
  $dark-color: rgb(117, 71, 28);
  
  background-color: $light-color;
  border-color: rgba(233, 233, 233, 0.555);
  border-style: solid;
  border-width: 0;

  box-sizing: border-box;

  margin: 0;
  padding: 0;

  display: inline-block;

  &.hovering {
    border-width: 6px;
  }

  &.dark {
    background-color: $dark-color;
  }

  &.blank {
    opacity: 0;
  }

  &.possibleMoveTile {
    background-color: mix(red, $light-color, 50%);

    &.dark {
      background-color: mix(red, $dark-color, 50%);
    }
  }
}
</style>
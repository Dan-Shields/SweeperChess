<template>
    <div class="multiplayer-panel">
        <h1 class="title">
            SweeperChess
        </h1>
        <hr>

        <div v-if="userSignedIn" class="user-info">
            <h3>Name: {{ userClient.name }}</h3>
            <h3>ID: {{ userClient.uuid }}</h3>
            <h3>Room: {{ userClient.room }}</h3>
        </div>
        <div v-else class="user-register">
            <input
                v-model="userNameInput"
                class="user-name-input"
            >
            <button class="register-button" @click="registerAndSave">
                REGISTER
            </button>
        </div>

        <!-- TODO: add v-if="!(userSignedIn && userClient.game !== null)" -->
        <div class="lobby">
            <div v-if="userSignedIn" class="game-creator">
                <button @click="createGame">
                    CREATE GAME
                </button>
                <button @click="leaveGame">
                    LEAVE GAME
                </button>
            </div>
            <div class="open-games">
                <h4>Open Games</h4>
                <div 
                    v-for="game in openGames"
                    :key="game.uuid"
                    class=""
                >
                    <h6>{{ game.uuid }}</h6>
                    <button v-if="userSignedIn" @click="joinGameAsPlayer(game.uuid)">
                        JOIN GAME
                    </button>
                </div>
            </div>
            <div class="in-progress-games">
                <h4>Games In-progress</h4>
                <div 
                    v-for="game in activeGames"
                    :key="game.uuid"
                    class=""
                >
                    <h6>{{ game.uuid }}</h6>
                    <button v-if="userSignedIn" @click="joinGame(game.uuid)">
                        SPECTATE GAME
                    </button>
                </div>
            </div>
        </div>

        <div class="register-modal">
        </div>
    </div>
</template>

<script lang="ts">
import Cookies from 'js-cookie'
import { computed, defineComponent, PropType, reactive, ref } from 'vue'

import { PieceColor } from '../../game/enums'
import { IGameProto } from '../../types/multiplayer'
import { GameStatus } from '../../types/multiplayer-enums'
import { UserRequestFailReasons } from '../../types/socket-args'
import { UserRequestType } from '../../types/socket-enums'
import { UserClient } from '../multiplayer/UserClient.class'

export default defineComponent({
    props: {
        userClient: {
            default: null,
            type: Object as PropType<UserClient>
        }
    },

    emits: [
        'createdGame'
    ],

    setup(props, ctx) {

        const gameProto: IGameProto = reactive({
            hostColor: PieceColor.White,
            baseTime: 10 * 60,
            increment: 0,
            boardWidth: 8,
            boardHeight: 8,
            boardLayout: []
        })

        const createGame = () => {
            props.userClient.createGame(gameProto)
                .then()
        }

        const leaveGame = () => {
            props.userClient.leaveGame()
                .then()
        }

        const joinGame = (gameId: string) => {
            props.userClient.joinGame(gameId)
                .then()
        }

        const joinGameAsPlayer = (gameId: string) => {
            props.userClient.joinGameAsPlayer(gameId)
                .then()
        }

        const userIdCookie = Cookies.get('user-id')

        const userNameInput = ref('')

        const registerAndSave = () => {
            if (!userNameInput.value || userNameInput.value.length === 0) return

            props.userClient.register(userNameInput.value)
                .then((data) => {
                    Cookies.set('user-id', data.userId)
                })
        }

        if (userIdCookie) {
            props.userClient.ident(userIdCookie)
                .catch((e: UserRequestFailReasons[UserRequestType.Ident]) => {
                    switch (e) {
                        case "userNotFound":
                            registerAndSave()
                            break
                    }
                })
        } else {
            registerAndSave()
        }

        const userSignedIn = computed(() => {
            return props.userClient && props.userClient.uuid
        })

        const openGames = computed(() => {
            return props.userClient.lobbyGames.filter(game => game.status === GameStatus.Open)
        })

        const activeGames = computed(() => {
            return props.userClient.lobbyGames.filter(game => game.status === GameStatus.InProgress)
        })

        return {
            gameProto,
            createGame,
            leaveGame,
            joinGame,
            joinGameAsPlayer,
            userNameInput,
            registerAndSave,
            userSignedIn,
            openGames,
            activeGames
        }
    }
})


</script>

<style lang="scss" scoped>
.multiplayer-panel {
    background-color: rgb(53, 53, 53);
    display: inline-block;

    width: 100%;

    border-radius: 5px;

    height: 100%;

    color: white;

    padding: 20px;

    h3 {
        font-weight: 400;
    }

    .title {
        text-align: center;
    }

    hr {
        width: 90%;
    }

    .lobby {
        width: 100%;
        margin: 0;
        box-sizing: border-box;

        display: flex;
        justify-content: space-around;

        flex-wrap: wrap;

        .game-creator {
            width: 100%;
        }
    }
}
</style>
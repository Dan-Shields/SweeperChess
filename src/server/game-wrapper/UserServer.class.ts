import { Socket } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'

import { UserToGCEvents } from '../../types/socket-args'
import { IUserInfo } from "../../types/multiplayer"
import { UserRequestType } from '../../types/socket-enums'
import { GameCoordinator } from './GameCoordinator'
import { MultiplayerGame } from './MultiplayerGameServer.class'
import { GameStatus } from '../../types/multiplayer-enums'
import e from 'express'

export class User implements IUserInfo  {
    uuid: string
    name: string

    socket: Socket<UserToGCEvents, never> | null = null

    roomId: string | null = null

    constructor(name: string, uuid?: string) {
        this.uuid = uuid || uuidv4()
        this.name = name
    }

    public setSocket(socket: Socket<UserToGCEvents, never>): void {
        this.socket = socket

        socket.join(GameCoordinator.lobbyRoom)

        socket.on(UserRequestType.JoinGameRoom, (gameId, cb) => {
            if (this.roomId === gameId) {
                return cb({ error: "userInGameRoom" })
            }
            
            if (GameCoordinator.isUserInUnfinishedGame(this)) {
                //return cb({ error: "userInUnfinishedGame" })
            }

            const game = GameCoordinator.findGame(gameId)

            if (!game) {
                return cb({ error: "gameDoesntExist" })
            }

            this.setRoom(gameId)

            this.roomId = gameId

            cb({gameContext: game.getGameContext()})
        })

        socket.on(UserRequestType.CreateGame, (gameProto, cb) => {
            if (!MultiplayerGame.validateProto(gameProto)) {
                return cb({ error: "invalidProto" })
            }
            
            if (GameCoordinator.isUserInUnfinishedGame(this)) {
                return cb({ error: "userInUnfinishedGame" })
            }

            const game = GameCoordinator.createGame(gameProto, this)

            if (!game) {
                return cb({ error: "unknown" })
            }

            this.setRoom(game.uuid)

            cb({ gameContext: game.getGameContext() })
        })

        socket.on(UserRequestType.JoinGameAsPlayer, (gameId, color, cb) => {
            if (GameCoordinator.isUserInUnfinishedGame(this)) {
                return cb({ error: "userInUnfinishedGame" })
            }

            const game = GameCoordinator.findGame(gameId)

            if (!game) {
                return cb({ error: "gameDoesntExist" })
            }

            game.joinGame(this)

            this.setRoom(gameId)
            this.roomId = gameId

            cb({ gameContext: game.getGameContext()})
        })

        socket.on(UserRequestType.LeaveGame, (gameId, cb) => {
            const game = GameCoordinator.findGame(gameId)

            if (!game) {
                cb({ error: "gameDoesntExist" })
            } else if (!game.isUserInGame(this)) {
                cb({ error: "userNotInGame" })
            } else if (game.isUserInGame(this) && game.status !== GameStatus.Open) {
                cb({ error: "gameStarted" })
            } else {
                game.leaveGame(this)

                this.setRoom(GameCoordinator.lobbyRoom)

                cb({ lobbyGames: GameCoordinator.getAllGameLobbyInfo() })
            }
        })

        socket.on(UserRequestType.TryMove, (gameId, moveProto, cb) => {
            const game = GameCoordinator.findGame(gameId)

            if (!game) {
                cb({ error: "gameDoesntExist" })
            } else if (!game.isUserInGame(this)) {
                cb({ error: "userNotInGame" })
            } else if (!game.doesPlayerMoveNext(this.uuid)) {
                cb({ error: "notUsersTurn" })
            } else if (!game.tryMovePiece(moveProto)) {
                cb({ error: "moveIllegal" })
            } else {
                cb({})
            }
        })

        socket.on("disconnect", () => {
            this.roomId = null
            this.socket = null
        })
    }

    public setRoom(roomId: string): void {
        if (this.roomId) this.socket?.leave(this.roomId)
        this.socket?.join(roomId)
        this.roomId = roomId
    }

    public static instanceOfUserInfo(object: unknown): object is IUserInfo {
        return (
            object !== null &&
            typeof object === "object" &&
            object !== null &&
            'uuid' in object &&
            'name' in object /* &&
            typeof object.uuid === typeof String &&
            typeof object.name === typeof String */
        )
    }
}

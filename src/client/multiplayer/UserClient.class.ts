import { Socket } from "socket.io-client"
import { plainToClass } from 'class-transformer'

import { IGameLobbyInfo, IGameProto } from "../../types/multiplayer"
import { GCToLobbyEvents, UserRequestSuccessData, UserToGCEvents } from "../../types/socket-args"
import { ClientStatus, LobbyMessageType, UserRequestType } from "../../types/socket-enums"
import { MultiplayerGameClient } from "./MultiplayerGameClient.class"
import { PieceColor } from "../../game/enums"

/**
 * Handles moving between game rooms & lobby, as well as joining/creating games
 * Delegates actual game commands to a MultiplayerGameClient
 */
export class UserClient {
    public uuid?: string
    public name?: string

    public game: MultiplayerGameClient | null = null
    public status: ClientStatus = ClientStatus.PendingInit
    
    private socket: Socket<GCToLobbyEvents, UserToGCEvents>

    public lobbyGames: IGameLobbyInfo[] = []

    public room: string | null = null

    constructor(socket: Socket<GCToLobbyEvents, UserToGCEvents>) {
        this.socket = socket

        this.socket.on(LobbyMessageType.GameOpened, (info) => {
            this.lobbyGames.push(info)
            console.log(this.lobbyGames)
        })
        
        this.socket.on(LobbyMessageType.GameUpdated, (gameId, gameInfo) => {
            const gameIndex = this.lobbyGames.findIndex(game => game.uuid === gameId)

            if (gameIndex) {
                this.lobbyGames[gameIndex] = gameInfo
            }
        })

        this.socket.on(LobbyMessageType.GameEnded, (gameId) => {
            const gameIndex = this.lobbyGames.findIndex(game => game.uuid === gameId)

            if (gameIndex) {
                this.lobbyGames.splice(gameIndex, 1)
            }
        })
    }

    public ident(userId: string): Promise<UserRequestSuccessData[UserRequestType.Ident]> {
        return new Promise((resolve, reject) => {
            this.socket.emit(UserRequestType.Ident, userId, e => {
                if (e.error) {
                    console.error('ident failed. Reason:', e.error)
                    reject(e.error)
                    return
                }
                
                this.status = ClientStatus.Complete
                this.uuid = userId
                this.name = e.userName
                this.lobbyGames = e.lobbyGames
                this.room = 'lobby'

                if (e.existingGameId) {
                    this.socket.emit(UserRequestType.JoinGameRoom, e.existingGameId, e => {
                        console.log(e)
                        if (!e.error) {
                            this.game = plainToClass(MultiplayerGameClient, e.gameContext)
                            this.game.initSocket(this.socket)
                            this.room = this.game.uuid
                        }
                    })
                }
            })
        })

    }

    public register(userName: string): Promise<UserRequestSuccessData[UserRequestType.Register]> {
        return new Promise((resolve, reject) => {
            this.socket.emit(UserRequestType.Register, userName, e => {
                if (e.error) {
                    console.error('registration failed. Reason:', e.error)
                    reject(e.error)
                    return
                }
                
                this.status = ClientStatus.Complete
                this.uuid = e.userId
                this.name = userName
                this.lobbyGames = e.lobbyGames

                this.room = 'lobby'

                resolve(e)
            })
        })
    }

    public createGame(gameProto: IGameProto): Promise<UserRequestSuccessData[UserRequestType.CreateGame]> {
        return new Promise((resolve, reject) => {
            this.socket.emit(UserRequestType.CreateGame, gameProto, e => {
                if (e.error) {
                    console.log('create game failed. Reason:', e.error)
                    reject(e.error)
                    return
                }

                this.game = plainToClass(MultiplayerGameClient, e.gameContext)
                this.game.initSocket(this.socket)
                this.room = this.game.uuid

                resolve(e)
            })
        })
    }

    public joinGame(gameId: string): Promise<UserRequestSuccessData[UserRequestType.JoinGameRoom]> {
        return new Promise((resolve, reject) => {           
            this.socket.emit(UserRequestType.JoinGameRoom, gameId, e => {
                if (e.error) {
                    console.log('leave game failed. Reason:', e.error)
                    reject(e.error)
                    return
                }

                this.game = plainToClass(MultiplayerGameClient, e.gameContext)
                this.game.initSocket(this.socket)
                this.room = this.game.uuid

                resolve(e)
            })
        })
    }

    public leaveGame(): Promise<UserRequestSuccessData[UserRequestType.LeaveGame]> {
        return new Promise((resolve, reject) => {
            if (!this.game) {
                reject()
                return
            }
            
            this.socket.emit(UserRequestType.LeaveGame, this.game.uuid, e => {
                if (e.error) {
                    console.log('leave game failed. Reason:', e.error)
                    reject(e.error)
                    return
                }

                this.game = null

                this.lobbyGames = e.lobbyGames

                this.room = 'lobby'

                resolve(e)
            })
        })
    }

    public joinGameAsPlayer(gameId: string): Promise<UserRequestSuccessData[UserRequestType.JoinGameAsPlayer]> {
        return new Promise((resolve, reject) => {           
            this.socket.emit(UserRequestType.JoinGameAsPlayer, gameId, PieceColor.None, e => {
                if (e.error) {
                    console.log('leave game failed. Reason:', e.error)
                    reject(e.error)
                    return
                }

                this.game = plainToClass(MultiplayerGameClient, e.gameContext)
                this.game.initSocket(this.socket)
                this.room = this.game.uuid

                resolve(e)
            })
        })
    }
}

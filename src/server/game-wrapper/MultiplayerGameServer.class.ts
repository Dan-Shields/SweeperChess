import { Server as SocketServer } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import NanoTimer from 'nanotimer'

import { PieceColor } from '../../game/enums'
import { Game } from '../../game/Game.class'
import { Piece } from '../../game/Piece.class'
import { IMoveProto } from '../../types/game'
import { ITimeRemaining, IGameProto, IGameLobbyInfo, IMultiplayerGameContext } from '../../types/multiplayer'
import { GameRoomMessageType, LobbyMessageType } from '../../types/socket-enums'
import { GameStatus, GameResult } from '../../types/multiplayer-enums'
import { GameCoordinator } from './GameCoordinator'
import { User } from './UserServer.class'
import clone from 'clone'
import { State } from '../../game/State.class'
import { GCToGameRoomEvents, GCToLobbyEvents } from '../../types/socket-args'

export class MultiplayerGame extends Game implements IMultiplayerGameContext {
    uuid = uuidv4()
    status: GameStatus
    requiredPlayers: number

    host: User

    players: User[]
    colors: Record<string, PieceColor>
    timeRemaining: ITimeRemaining

    baseTime: number
    increment: number

    spectators: User[] = []

    result: GameResult | null

    updatedTime: number

    io: SocketServer<never, GCToGameRoomEvents & GCToLobbyEvents>

    private timer: NanoTimer = new NanoTimer()
    
    constructor(gameProto: IGameProto, hostUser: User, io: SocketServer<never, GCToGameRoomEvents & GCToLobbyEvents>) {
        super(gameProto.boardWidth, gameProto.boardHeight, [])

        this.status = GameStatus.Open
        this.requiredPlayers = 2

        this.host = hostUser

        this.players = [hostUser]
        this.colors = {
            [hostUser.uuid]: gameProto.hostColor
        }
        this.timeRemaining = {
            [PieceColor.White]: gameProto.baseTime,
            [PieceColor.Black]: gameProto.baseTime            
        }

        this.baseTime = gameProto.baseTime
        this.increment = gameProto.increment

        this.result = null

        this.updatedTime = + new Date()
        
        this.io = io

        this.loadFEN(Game.startPositionFEN)
    }

    public tryMovePiece(moveProto: IMoveProto): boolean {
        console.log(moveProto)
        if (super.tryMovePiece(moveProto)) {
            if (this.legalMoves.length === 0) {
                const otherPlayerState = clone(this.state)
                otherPlayerState.colorToMove = Piece.invertColor(otherPlayerState.colorToMove)

                let result

                if (State.canKingBeTaken(otherPlayerState, this.setup)) {
                    result = this.state.colorToMove === PieceColor.White ? GameResult.WhiteCheckmate : GameResult.BlackCheckmate
                } else {
                    result = GameResult.StaleMate
                }

                this.endGame(result)

            } else {
                this.io.to(this.uuid).emit(GameRoomMessageType.GameUpdated, this.getGameContext())
            }

            return true
        } else {
            return false
        }
    }

    public start() {
        if (this.requiredPlayers !== this.players.length) return

        this.status = GameStatus.InProgress

        this.startTimer()

        this.io.to(this.uuid).emit(GameRoomMessageType.GameUpdated, this.getGameContext())
        this.io.to(GameCoordinator.lobbyRoom).emit(LobbyMessageType.GameUpdated, this.uuid, this.getLobbyInfo())
    }

    public joinGame(user: User) {
        this.players.push(user)

        this.colors[user.uuid] = Piece.invertColor(this.colors[this.host.uuid])

        if (this.players.length === this.requiredPlayers) {
            this.start()
        } else {
            this.io.to(this.uuid).emit(GameRoomMessageType.GameUpdated, this.getGameContext())
            this.io.to(GameCoordinator.lobbyRoom).emit(LobbyMessageType.GameUpdated, this.uuid, this.getLobbyInfo())
        }
    }

    public leaveGame(user: User) {
        if (!this.isUserInGame(user)) return

        const playerIndex = this.players.findIndex(player => player.uuid === user.uuid)
        if (playerIndex) {
            this.players.splice(playerIndex, 1)
        }

        if (this.players.length === 0 || this.status === GameStatus.InProgress || this.status === GameStatus.Open) {
            this.abortGame()
        }
    }

    public resign(user: User) {
        if (!this.isUserInGame(user)) return

        if (this.status !== GameStatus.InProgress) return

        this.endGame(this.colors[user.uuid] === PieceColor.White ? GameResult.WhiteResigns : GameResult.BlackResigns)

        return
    }

    private abortGame() {
        this.status = GameStatus.Aborted
        this.result = null

        this.io.to(this.uuid).emit(GameRoomMessageType.GameUpdated, this.getGameContext())
        this.io.to(GameCoordinator.lobbyRoom).emit(LobbyMessageType.GameUpdated, this.uuid, this.getLobbyInfo())

        this.players.forEach(player => player.setRoom(GameCoordinator.lobbyRoom))
    }

    private endGame(result: GameResult) {
        this.status = GameStatus.Ended
        this.result = result

        this.io.to(this.uuid).emit(GameRoomMessageType.GameUpdated, this.getGameContext())
        this.io.to(GameCoordinator.lobbyRoom).emit(LobbyMessageType.GameUpdated, this.uuid, this.getLobbyInfo())

        this.players.forEach(player => player.setRoom(GameCoordinator.lobbyRoom))
    }

    public getGameContext(): IMultiplayerGameContext {
        return {
            uuid: this.uuid,

            status: this.status,
            requiredPlayers: this.requiredPlayers,
            players: this.players.map(player => { return { name: player.name, uuid: player.uuid }}),
            colors: this.colors,
            timeRemaining: this.timeRemaining,

            baseTime: this.baseTime,
            increment: this.increment,

            result: this.result,

            updatedTime: this.updatedTime,

            pieces: this.pieces.map(piece => { return { type: piece.type, color: piece.color, coords: piece.coords, guid: piece.guid }}),
            setup: this.setup,
            legalMoves: this.legalMoves.map(move => { return { startSquare: move.startSquare, targetSquare: move.targetSquare, promotionType: move.promotionType, targetPieceCoords: move.targetPieceCoords }}),
            previousMoves: this.previousMoves
        }
    }

    public getLobbyInfo(): IGameLobbyInfo {
        return {
            uuid: this.uuid,
            playerCount: this.players.length,
            baseTime: this.baseTime,
            increment: this.increment,
            host: this.host.name,
            status: this.status,
        }
    }

    public doesPlayerMoveNext(playerId: string): boolean {
        return this.colors[playerId] === this.state.colorToMove
    }

    public isUnfinished() {
        return this.status === GameStatus.Open || this.status === GameStatus.InProgress
    }

    public isUserInGame(user: User) {
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].uuid === user.uuid) return true
        }
        return false
    }

    private startTimer() {
        this.timer.setInterval(MultiplayerGame.runTimer, [this], '100m')
    }

    private static runTimer(game: MultiplayerGame) {
        if (game.state.colorToMove === PieceColor.None) return
        game.timeRemaining[game.state.colorToMove] -= 0.1

        if (game.timeRemaining[game.state.colorToMove] <= 0) {
            game.stopTimer()

            game.endGame(game.state.colorToMove === PieceColor.White ? GameResult.WhiteTimeout : GameResult.BlackTimeout)
        }
    }

    private stopTimer() {
        this.timer.clearInterval()
    }

    public static validateProto(proto: IGameProto): boolean {
        return (
            proto.baseTime > 0 &&
            proto.increment >= 0 &&
            proto.boardHeight > 0 &&
            proto.boardWidth > 0 &&
            (proto.hostColor == PieceColor.White || proto.hostColor == PieceColor.Black || proto.hostColor == PieceColor.None)
        )
    }
}

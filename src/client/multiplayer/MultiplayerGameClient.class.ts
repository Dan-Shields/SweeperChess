import { IBoardSetup, IMoveInfo, IMoveProto, IPiece } from "../../types/game"
import { IMultiplayerGameContext, ITimeRemaining, IUserInfo } from "../../types/multiplayer"
import { Socket } from "socket.io-client"
import { GameRoomMessageType, UserRequestType } from "../../types/socket-enums"
import { GCToGameRoomEvents, UserRequestSuccessData, UserToGCEvents } from "../../types/socket-args"
import { IMultiplayerGameClient } from "../../types/user-client"
import { PieceColor } from "../../game/enums"
import { GameStatus, GameResult } from "../../types/multiplayer-enums"

/**
 * Designed for use in the client for when playing multiplayer
 */
export class MultiplayerGameClient implements IMultiplayerGameClient {
    public uuid: string
 
    public status: GameStatus
    public requiredPlayers: number
    public players: IUserInfo[]
    public colors: Record<string, PieceColor>
    public timeRemaining: ITimeRemaining
 
    public baseTime: number
    public increment: number
 
    public result: GameResult | null
 
    public updatedTime: number

    public pieces: IPiece[]
    public setup: IBoardSetup
    public legalMoves: IMoveProto[]
    public previousMoves: IMoveInfo[]

    private socket: Socket<GCToGameRoomEvents, UserToGCEvents> | null = null

    public initSocket(socket: Socket<GCToGameRoomEvents, never>) {
        this.socket = socket

        this.socket.on(GameRoomMessageType.GameUpdated, (updatedContext) => {
            Object.assign(this, updatedContext)
            console.log(updatedContext)
        })
    }

    public tryMovePiece(moveProto: IMoveProto): boolean {
        if (!this.socket) {
            return false
        }

        let result = true

        this.socket.emit(UserRequestType.TryMove, this.uuid, moveProto, e => {
            if (e.error) {
                console.log("try move failed. Reason:", e.error)
                result = false
            }
        })

        return result

        /*return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject("unknown")
                return
            }
    
            this.socket.emit(UserRequestType.TryMove, this.uuid, moveProto, e => {
                if (e.error) {
                    console.log("try move failed. Reason:", e.error)
                    reject(e.error)
                    return
                }

                resolve(e)
            })
    
            return false
        })*/
    }
}

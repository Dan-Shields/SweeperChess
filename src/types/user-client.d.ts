import { IMoveProto } from "./game"
import { IMultiplayerGameContext } from "./multiplayer"

interface IMultiplayerGameClient extends IMultiplayerGameContext {
    tryMovePiece(moveProto: IMoveProto): boolean
}

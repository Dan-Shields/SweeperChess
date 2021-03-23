import { PieceColor } from "../game/enums"
import { GameResult, GameStatus } from "./multiplayer-enums"
import { IGameRenderContext } from "./game"

interface IGameProto {
    hostColor: PieceColor;
    baseTime: number;
    increment: number;
    boardWidth: number;
    boardHeight: number;
    boardLayout: number[][];
}

interface IUserInfo {
    name: string;
    uuid: string;
}

interface ITimeRemaining {
    [PieceColor.White]: number,
    [PieceColor.Black]: number,
}

interface IGameLobbyInfo {
    uuid: string;
    playerCount: number;
    baseTime: number;
    increment: number;
    host: string;
    status: GameStatus;
}

interface IMultiplayerGameContext extends Omit<IGameRenderContext, 'tryMovePiece'> {
    uuid: string

    status: GameStatus
    requiredPlayers: number
    players: IUserInfo[]
    colors: Record<string, PieceColor>
    timeRemaining: ITimeRemaining

    baseTime: number
    increment: number

    result: GameResult | null

    updatedTime: number
}

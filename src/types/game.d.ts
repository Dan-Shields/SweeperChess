import {SlideDirection, PieceColor} from '../game/enums'
import { Game } from '../game/Game.class'
import { Piece } from '../game/Piece.class'

interface BoardCoords {
    file: number;
    rank: number;
}

interface IMove {
    startSquare: BoardCoords;
    targetSquare: BoardCoords;
    targetPieceCoords: BoardCoords | null;
    subMove: IMove | null;
}

interface IBoardPrecompData extends Record<SlideDirection, number> {}

interface CastleState {
    [PieceColor.Black]: SlideDirection[],
    [PieceColor.White]: SlideDirection[]
}

type MoveConsequence = (game: Game, movedPiece: Piece) => void

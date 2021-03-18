import {SlideDirection, PieceColor} from '../game/enums'
import { Game } from '../game/Game.class'
import { Piece } from '../game/Piece.class'

interface IBoardCoords {
    file: number;
    rank: number;
}

type MoveConsequence = (game: Game, movedPiece: Piece) => void

interface IMove {
    startSquare: IBoardCoords;
    targetSquare: IBoardCoords;
    targetPieceCoords: IBoardCoords | null;
    subMove: IMove | null;
    consequence: MoveConsequence | null;
}

interface IGameContext {
    pieces: Piece[];
    colorToMove: PieceColor;
    boardWidth: number;
    boardHeight: number;
    boardLayout: number[][];
    legalMoves: IMove[];
    tryMovePiece(startSquare: IBoardCoords, targetSquare: IBoardCoords): boolean;
    loadFEN(fen: string): void;
}

interface IBoardPrecompData extends Record<SlideDirection, number> {}

interface ICastleState {
    [PieceColor.Black]: SlideDirection[],
    [PieceColor.White]: SlideDirection[]
}


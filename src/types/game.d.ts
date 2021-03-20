import {SlideDirection, PieceColor, PieceType} from '../game/enums'
import { Piece } from '../game/Piece.class'
import { Move } from '../game/utils'

interface IBoardCoords {
    file: number;
    rank: number;
}
    
interface ICastleState {
    [PieceColor.Black]: SlideDirection[];
    [PieceColor.White]: SlideDirection[];
}

interface IGameState {
    board: Piece[][];
    colorToMove: PieceColor;
    enPassantSquare: IBoardCoords | null;
    castleState: ICastleState;
    halfMoves: number;
    fullMoves: number;
}

interface IBoardPrecompData extends Record<SlideDirection, number> {}

interface IBoardSetup {
    width: number;
    height: number;
    layout: number[][];
    numSquaresToEdge: IBoardPrecompData[][];
}

type MoveConsequence = (afterMoveState: IGameState, movedPiece: Piece) => void;

interface IMove {
    startSquare: IBoardCoords;
    targetSquare: IBoardCoords;
    targetPieceCoords: IBoardCoords | null;
    subMove: IMove | null;
    consequence: MoveConsequence | null;
    promotionType: PieceType | null;
}

interface IGameRenderContext {
    pieces: Piece[];
    setup: IBoardSetup;
    legalMoves: IMove[];
    tryMovePiece(startSquare: IBoardCoords, targetSquare: IBoardCoords, promotionType: PieceType | null): boolean;
    loadFEN(fen: string): void;
}

type MoveGeneratorFunc = (piece: Piece, state: IGameState, boardSetup: IBoardSetup) => Move[];

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
}

type MoveConsequence = (afterMoveState: IGameState, movedPiece: Piece) => void

interface IMoveProto {
    startSquare: IBoardCoords;
    targetSquare: IBoardCoords;
    targetPieceCoords: IBoardCoords | null
    promotionType: PieceType | null;
}

interface IMove extends IMoveProto {
    subMove: IMove | null;
    consequence: MoveConsequence | null;
}

interface IMoveInfo {
    algebraicString: string;
    timeTaken: number | null;
    color: PieceColor;
}

interface IPiece {
    type: PieceType;
    color: PieceColor;
    coords: IBoardCoords;
    guid: string;
}

interface IGameRenderContext {
    pieces: IPiece[];
    setup: IBoardSetup;
    legalMoves: IMoveProto[];
    previousMoves: IMoveInfo[];
    tryMovePiece(moveProto: IMoveProto): boolean;
}

type MoveGeneratorFunc = (piece: Piece, state: IGameState, boardSetup: IBoardSetup) => Move[]


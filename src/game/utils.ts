import { IBoardCoords, IMove, MoveConsequence } from "../types/game"
import { PieceType } from "./enums"
import { Piece } from "./Piece.class"

export class Coords {
    static Add(a: IBoardCoords, b: IBoardCoords): IBoardCoords {
        return {
            rank: a.rank + b.rank,
            file: a.file + b.file
        }
    }

    static Scale(a: IBoardCoords, n: number): IBoardCoords {
        return {
            rank: a.rank * n,
            file: a.file * n
        }
    }

    static Subtract(a: IBoardCoords, b: IBoardCoords): IBoardCoords {
        return {
            rank: a.rank - b.rank,
            file: a.file - b.file
        }
    }

    static Equal(a: IBoardCoords, b: IBoardCoords): boolean {
        return (
            a.file == b.file &&
            a.rank == b.rank
        )
    }

    public static fromAlgebraic(algebraic: string): IBoardCoords {
        return {
            file: algebraic.charCodeAt(0) - 97,
            rank: parseInt(algebraic.charAt(1))
        }
    }

    public static toAlgebraic(coords: IBoardCoords): string {
        return `${String.fromCharCode(97 + coords.file)}${coords.rank + 1}`
    }
}

export class Move implements IMove {
    startSquare: IBoardCoords
    targetSquare: IBoardCoords
    targetPieceCoords: IBoardCoords | null
    subMove: Move | null
    consequence: MoveConsequence | null
    promotionType: PieceType | null

    constructor(startSquare: IBoardCoords, targetSquare: IBoardCoords, targetPieceCoords: IBoardCoords | null = null, subMove: Move | null = null, consequence: MoveConsequence | null = null, promotionType: PieceType | null = null) {
        this.startSquare = startSquare
        this.targetSquare = targetSquare
        this.targetPieceCoords = targetPieceCoords
        this.subMove = subMove
        this.consequence = consequence
        this.promotionType = promotionType
    }

    public toAlgebraic(): string {
        return `${Coords.toAlgebraic(this.startSquare)}${Coords.toAlgebraic(this.targetSquare)}${this.promotionType ? Piece.pieceTypeToChar(this.promotionType) : ''}`
    }
}

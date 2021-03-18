import { IBoardCoords, IMove, MoveConsequence } from "../types/game"

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
}

export class Move implements IMove {
    startSquare: IBoardCoords
    targetSquare: IBoardCoords
    targetPieceCoords: IBoardCoords | null
    subMove: IMove | null
    consequence: MoveConsequence | null

    constructor(startSquare: IBoardCoords, targetSquare: IBoardCoords, targetPieceCoords: IBoardCoords | null = null, subMove: IMove | null = null, consequence: MoveConsequence | null = null) {
        this.startSquare = startSquare
        this.targetSquare = targetSquare
        this.targetPieceCoords = targetPieceCoords
        this.subMove = subMove
        this.consequence = consequence
    }
}

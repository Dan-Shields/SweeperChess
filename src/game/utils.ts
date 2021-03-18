import { BoardCoords, IMove, MoveConsequence } from "../types/game"

export class Coords {
    static Add(a: BoardCoords, b: BoardCoords): BoardCoords {
        return {
            rank: a.rank + b.rank,
            file: a.file + b.file
        }
    }

    static Scale(a: BoardCoords, n: number): BoardCoords {
        return {
            rank: a.rank * n,
            file: a.file * n
        }
    }

    static Subtract(a: BoardCoords, b: BoardCoords): BoardCoords {
        return {
            rank: a.rank - b.rank,
            file: a.file - b.file
        }
    }

    static Equal(a: BoardCoords, b: BoardCoords): boolean {
        return (
            a.file == b.file &&
            a.rank == b.rank
        )
    }
}

export class Move implements IMove {
    startSquare: BoardCoords
    targetSquare: BoardCoords
    targetPieceCoords: BoardCoords | null
    subMove: Move | null
    consequence: MoveConsequence | null

    constructor(startSquare: BoardCoords, targetSquare: BoardCoords, targetPieceCoords: BoardCoords | null = null, subMove: Move | null = null, consequence: MoveConsequence | null = null) {
        this.startSquare = startSquare
        this.targetSquare = targetSquare
        this.targetPieceCoords = targetPieceCoords
        this.subMove = subMove
        this.consequence = consequence
    }
}

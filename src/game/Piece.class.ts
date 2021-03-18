import { v4 as uuidv4 } from 'uuid'
import { reactive } from 'vue'
import { IBoardCoords } from '../types/game'

import { PieceType, PieceColor, SlideDirection } from './enums'
import { Move } from './utils'

export class Piece {
    public type: PieceType
    public color: PieceColor

    public coords: IBoardCoords

    public guid: string

    public inCheck: boolean = false

    constructor(type = PieceType.None, color = PieceColor.None, coords = {file: -1, rank: -1}, inCheck = false) {
        this.type = type
        this.color = color
        this.coords = reactive(coords)

        this.guid = uuidv4()
        this.inCheck = inCheck
    }

    static SlideDirections: Record<SlideDirection, IBoardCoords> = {
        [SlideDirection.North]: {rank: 1, file: 0},
        [SlideDirection.South]: {rank: -1, file: 0},
        [SlideDirection.West]: {rank: 0, file: -1},
        [SlideDirection.East]: {rank: 0, file: 1},
        [SlideDirection.NorthEast]: {rank: 1, file: 1},
        [SlideDirection.SouthWest]: {rank: -1, file: -1},
        [SlideDirection.SouthEast]: {rank: -1, file: 1},
        [SlideDirection.NorthWest]: {rank: 1, file: -1}
    }

    static KnightDirections = [
        {rank: 2, file: 1},
        {rank: 1, file: 2},
        {rank: -1, file: 2},
        {rank: -2, file: 1},
        {rank: -2, file: -1},
        {rank: -1, file: -2},
        {rank: 1, file: -2},
        {rank: 2, file: -1}
    ]

    public isSlidingPiece(): boolean {
        return this.type == PieceType.Bishop || this.type == PieceType.Queen || this.type == PieceType.Rook
    }

    public getSlidingDirections(): SlideDirection[] {
        switch (this.type) {
        case PieceType.Bishop:
            return [SlideDirection.NorthEast, SlideDirection.NorthWest, SlideDirection.SouthEast, SlideDirection.SouthWest]
        case PieceType.Queen:
        case PieceType.King:
            return [SlideDirection.NorthEast, SlideDirection.NorthWest, SlideDirection.SouthEast, SlideDirection.SouthWest, SlideDirection.North, SlideDirection.South, SlideDirection.East, SlideDirection.West]
        case PieceType.Rook:
            return [SlideDirection.North, SlideDirection.South, SlideDirection.East, SlideDirection.West]
        default:
            return []
        }
    }

    public isOnPawnStartRank(boardHeight: number): boolean {
        return this.color == PieceColor.White ? this.coords.rank == 1 : this.coords.rank == boardHeight - 2
    }

    public isOnPromotionRank(boardHeight: number): boolean {
        return this.color == PieceColor.White ? this.coords.rank == boardHeight - 1 : this.coords.rank == 0
    }

    public getMoveDistanceRange(boardHeight: number): {min: number, max: number} {
        let max

        switch (this.type) {
        case PieceType.King:
        case PieceType.Knight:
            max = 1
            break
        case PieceType.Pawn:
            max = this.isOnPawnStartRank(boardHeight) ? 2 : 1
            break
        case PieceType.Queen:
        case PieceType.Rook:
        case PieceType.Bishop:
        default:
            max = Infinity
            break
        }

        return {
            min: 1,
            max: max
        }
    }

    public generateMoves(moves: Move[], board: Piece[]) {
        switch (this.type) {
        case PieceType.King:
        case PieceType.Queen:
        case PieceType.Rook:
        case PieceType.Bishop:
            break
        case PieceType.Pawn:
            break
        case PieceType.Knight:
            break
            
        default:
            break
        }
    }

    static charToPieceType(char: string): PieceType {
        switch (char.toLowerCase()) {
        case 'b':
            return PieceType.Bishop
        case 'q':
            return PieceType.Queen
        case 'r':
            return PieceType.Rook
        case 'k':
            return PieceType.King
        case 'n':
            return PieceType.Knight
        case 'p':
            return PieceType.Pawn
        default:
            return PieceType.None
        }
    }

    static pieceTypeToChar(type: PieceType): string {
        switch (type) {
        case PieceType.Bishop:
            return 'b'
        case PieceType.Queen:
            return 'q'
        case PieceType.Rook:
            return 'r'
        case PieceType.King:
            return 'k'
        case PieceType.Knight:
            return 'n'
        case PieceType.Pawn:
            return 'p'
        default:
            return ''
        }
    }
}

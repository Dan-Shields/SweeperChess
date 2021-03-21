import { v4 as uuidv4 } from 'uuid'
import { reactive } from 'vue'
import { IBoardCoords, IBoardSetup, IGameState, IPiece, MoveConsequence, MoveGeneratorFunc } from '../types/game'

import { PieceType, PieceColor, SlideDirection } from './enums'
import { Game } from './Game.class'
import { State } from './State.class'
import { Coords, Move } from './utils'

export class Piece implements IPiece {
    public type: PieceType
    public color: PieceColor

    public coords: IBoardCoords

    public guid: string

    constructor(type = PieceType.None, color = PieceColor.None, coords = {file: -1, rank: -1}) {
        this.type = type
        this.color = color
        this.coords = reactive(coords)

        this.guid = uuidv4()
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

    static PromotionTypes = [PieceType.Bishop, PieceType.Knight, PieceType.Queen, PieceType.Rook]

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

    public generateMoves(state: IGameState, shallowCheck: boolean, boardSetup: IBoardSetup): Move[] {
        let moves: Move[] = []

        switch (this.type) {
            case PieceType.Queen:
            case PieceType.Rook:
            case PieceType.Bishop:
                moves.push(...Piece.generateSlidingMoves(this, state, boardSetup))
                break
            case PieceType.Pawn:
                moves.push(...Piece.generatePawnMoves(this, state, boardSetup))
                break
            case PieceType.Knight:
                moves.push(...Piece.generateKnightMoves(this, state, boardSetup))
                break
                                
            case PieceType.King:
                moves.push(...Piece.generateSlidingMoves(this, state, boardSetup))
                if (!shallowCheck) {
                    moves.push(...Piece.generateCastlingMoves(this, state, boardSetup))
                }
                break
            default:
                break
        }

        if (!shallowCheck) {
            moves = moves.filter(move => {
                const postMoveState = State.executeMove(state, move, false)
                if (postMoveState === null) return false
                return !State.canKingBeTaken(postMoveState, boardSetup)
            })
        }


        return moves
    }
    
    private static generateSlidingMoves: MoveGeneratorFunc = (piece, state, boardSetup) => {
        const moves: Move[] = []
        const directions = piece.getSlidingDirections()
        const moveDistance = piece.getMoveDistanceRange(boardSetup.height)

        let consequence: null | MoveConsequence = null

        if (piece.type == PieceType.Rook) {
            const castleSide = piece.coords.file == 0 ? SlideDirection.West : SlideDirection.East
            consequence = (afterMoveState: IGameState) => {
                if (piece.color == PieceColor.None) return
                const index = afterMoveState.castleState[piece.color].indexOf(castleSide)
                if (index > -1) {
                    // Remove castle ability on this side
                    afterMoveState.castleState[piece.color].splice(index, 1)
                }
            }
        } else if (piece.type == PieceType.King) {
            consequence = (afterMoveState: IGameState) => {
                if (piece.color == PieceColor.None) return
                // Remove castle ability
                afterMoveState.castleState[piece.color] = []
            }
        }

        directions.forEach(direction => {
            const maxMoveDistance = Math.min(moveDistance.max, boardSetup.numSquaresToEdge[piece.coords.rank][piece.coords.file][direction])

            for (let n = moveDistance.min; n <= maxMoveDistance; n++) {
                const delta = Coords.Scale(Piece.SlideDirections[direction], n)
                const targetSquare = Coords.Add(piece.coords, delta)

                if (!Game.doesTileExist(boardSetup, targetSquare)) return

                const pieceOnTargetSquare = state.board[targetSquare.rank][targetSquare.file]

                // Blocked by friendly piece
                if (pieceOnTargetSquare.color == piece.color) {
                    break
                }

                const isTake = pieceOnTargetSquare.color == Game.invertColor(piece.color)

                const move = new Move(piece.coords, targetSquare, isTake ? targetSquare : null, null, consequence)

                moves.push(move)

                if (isTake) {
                    break
                }
            }
        })

        return moves
    }

    private static generatePawnMoves: MoveGeneratorFunc = (piece, state, boardSetup) => {
        const moves: Move[] = []

        const direction = piece.color == PieceColor.White ? SlideDirection.North : SlideDirection.South

        const moveDistance = piece.getMoveDistanceRange(boardSetup.height)

        
        for (let n = moveDistance.min; n <= moveDistance.max; n++) {
            const delta = Coords.Scale(Piece.SlideDirections[direction], n)
            const targetSquare = Coords.Add(piece.coords, delta)
            
            if (!Game.doesTileExist(boardSetup, targetSquare)) break
            
            const pieceOnTargetSquare = state.board[targetSquare.rank][targetSquare.file]
            
            // Blocked by piece
            if (pieceOnTargetSquare.type != PieceType.None) {
                break
            }

            let consequence: MoveConsequence | null = null

            if (n == 2) {
                consequence = (afterMoveState: IGameState) => {
                    afterMoveState.enPassantSquare = Coords.Add(Coords.Scale(delta, -0.5), targetSquare)
                }
            }
            
            if ((targetSquare.rank == boardSetup.height - 1) || targetSquare.rank == 0) {
                Piece.PromotionTypes.forEach(promotionType => {
                    moves.push(new Move(piece.coords, targetSquare, null , null, null, promotionType))
                })
            } else {
                moves.push(new Move(piece.coords, targetSquare, null, null, consequence))
            }
        }

        const takingDirections: SlideDirection[] = piece.color == PieceColor.White ? [SlideDirection.NorthEast, SlideDirection.NorthWest] : [SlideDirection.SouthEast, SlideDirection.SouthWest]

        takingDirections.forEach(takeDirection => {
            const targetSquare = Coords.Add(piece.coords, Piece.SlideDirections[takeDirection])

            if (!Game.doesTileExist(boardSetup, targetSquare)) return

            const pieceOnTargetSquare = state.board[targetSquare.rank][targetSquare.file]

            let consequence: MoveConsequence | null = null

            if (pieceOnTargetSquare.color == Game.invertColor(piece.color)) {
                // Promotion
                if (targetSquare.rank == boardSetup.height - 1 || targetSquare.rank == 0) {
                    Piece.PromotionTypes.forEach(promotionType => {
                        moves.push(new Move(piece.coords, targetSquare, targetSquare, null, null, promotionType))
                    })
                } else {
                    moves.push(new Move(piece.coords, targetSquare, targetSquare, null, consequence))
                }
            } else if (state.enPassantSquare && Coords.Equal(state.enPassantSquare, targetSquare)) {
                const targetPieceCoords = Coords.Add(Coords.Scale(Piece.SlideDirections[direction], -1), targetSquare,)
                
                moves.push(new Move(piece.coords, targetSquare, targetPieceCoords, null, consequence))
            }
        })

        return moves
    }

    private static generateKnightMoves: MoveGeneratorFunc = (piece, state, boardSetup) => {
        const moves: Move[] = []

        Piece.KnightDirections.forEach(direction => {
            const targetSquare = Coords.Add(piece.coords, direction)

            if (!Game.doesTileExist(boardSetup, targetSquare)) return

            const pieceOnTargetSquare = state.board[targetSquare.rank][targetSquare.file]

            if (pieceOnTargetSquare.color != piece.color) {
                const targetPieceCoords = pieceOnTargetSquare.color == Game.invertColor(piece.color) ? targetSquare : null
                moves.push(new Move(piece.coords, targetSquare, targetPieceCoords))
            }
        })

        return moves
    }

    private static generateCastlingMoves: MoveGeneratorFunc = (piece, state, boardSetup) => {
        const moves: Move[] = []

        if (piece.color == PieceColor.None) return moves

        const nextMoveState = state
        nextMoveState.colorToMove = Game.invertColor(nextMoveState.colorToMove)
        if (State.canKingBeTaken(nextMoveState, boardSetup)) {
            // king currently in check, no castling allowed
            nextMoveState.colorToMove = Game.invertColor(nextMoveState.colorToMove)
            return moves
        }
        nextMoveState.colorToMove = Game.invertColor(nextMoveState.colorToMove)

        state.castleState[piece.color].forEach(direction => {
            const rookFile = direction == SlideDirection.East ? 7 : 0

            const rookStartPosition = {
                rank: piece.coords.rank,
                file: rookFile
            }

            if (state.board[rookStartPosition.rank][rookStartPosition.file].type !== PieceType.Rook) return

            const rookEndPosition = Coords.Add(piece.coords, Piece.SlideDirections[direction])

            const subMove = new Move(rookStartPosition, rookEndPosition)

            const consequence: MoveConsequence = (state: IGameState, piece: Piece) => {
                if (state.colorToMove != PieceColor.None) {
                    state.castleState[state.colorToMove] = []
                }
            }

            let kingMove

            for (let n = 1; n <= boardSetup.numSquaresToEdge[piece.coords.rank][piece.coords.file][direction] - 1; n++) {
                const delta = Coords.Scale(Piece.SlideDirections[direction], n)
                const targetSquare = Coords.Add(piece.coords, delta)

                if (!Game.doesTileExist(boardSetup, targetSquare)) return

                const pieceOnTargetSquare = state.board[targetSquare.rank][targetSquare.file]
                
                if (pieceOnTargetSquare.type != PieceType.None) {
                    // Blocked by piece
                    return
                } else if (n <= 2) {
                    const testMove = new Move(piece.coords, targetSquare, null, null, consequence)

                    const postMoveState = State.executeMove(state, testMove, false)

                    if (postMoveState === null) return

                    // King can't pass through check
                    if (State.canKingBeTaken(postMoveState, boardSetup)) return

                    if (n == 2) {
                        kingMove = testMove
                    }
                }
            }
            
            if (kingMove) {
                kingMove.subMove = subMove
                moves.push(kingMove)
            }
        })

        return moves
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

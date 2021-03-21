import { Piece } from './Piece.class'
import { PieceColor, PieceType, SlideDirection } from './enums'

import { Move, Coords } from './utils'
import { IBoardCoords, IGameRenderContext, IGameState, IBoardSetup } from '../types/game'
import { State } from './State.class'


/**
 * Can be used in the client or server to run a full game
 */
export class Game implements IGameRenderContext {
    public pieces: Piece[]
    public setup: IBoardSetup
    public legalMoves: Move[]
    
    public state: IGameState

    constructor(boardWidth: number, boardHeight: number, boardLayout: number[][] = []) {
        this.state = {
            board: [],
            colorToMove: PieceColor.White,
            castleState: {
                [PieceColor.White]: [
                    SlideDirection.East,
                    SlideDirection.West,
                ],
                [PieceColor.Black]: [
                    SlideDirection.East,
                    SlideDirection.West,
                ]
            },
            enPassantSquare: null,
            halfMoves: 0,
            fullMoves: 0
        }

        this.setup = {
            width: boardWidth,
            height: boardHeight,
            layout: boardLayout
        }

        this.legalMoves = []

        this.pieces = []
    }

    public tryMovePiece (startSquare: IBoardCoords, targetSquare: IBoardCoords, promotionType: PieceType | null): boolean {
        if (startSquare == targetSquare) return false

        const requestedMove = this.legalMoves.find(move => {
            const promotionCorrect = move.promotionType == promotionType
            const squaresCorrect = Coords.Equal(move.startSquare, startSquare) && Coords.Equal(move.targetSquare, targetSquare)
            return promotionCorrect && squaresCorrect
        })
        
        if (!requestedMove) {
            // Move illegal
            return false
        }

        const postMoveState = State.executeMove(this.state, requestedMove)

        if (postMoveState === null) return false
        
        this.state = postMoveState
        this.regenerate()

        return true
    }

    public loadFEN(fen: string) {
        this.state = State.fromFEN(fen)
        this.regenerate()
    }

    public getFEN(): string {
        return State.toFEN(this.state, this.setup)
    }

    private regenerate() {
        this.pieces = State.generatePieces(this.state, this.setup)
        this.legalMoves = State.generateMoves(this.state, false, this.setup)
    }
}

import clone from "clone"
import { IGameState, IBoardSetup } from "../types/game"
import { PieceType, PieceColor } from "./enums"
import { Game } from "./Game.class"
import { Piece } from "./Piece.class"
import { Move } from "./utils"

export class State {
    public static executeMove(state: IGameState, move: Move, isSubMove: boolean = false): IGameState | null {
        let newState = clone(state)

        const movedPiece = newState.board[move.startSquare.rank][move.startSquare.file]
        
        if (!movedPiece) return null

        // Take piece
        if (move.targetPieceCoords != null) {
            const targetPiece = newState.board[move.targetPieceCoords.rank][move.targetPieceCoords.file]
            if (targetPiece && targetPiece.color == Game.invertColor(newState.colorToMove)) {
                newState.board[move.targetPieceCoords.rank][move.targetPieceCoords.file] = new Piece()
            }
            newState.halfMoves = 0
        } else if (movedPiece.type == PieceType.Pawn) {
            newState.halfMoves = 0
        } else {
            newState.halfMoves++
        }

        movedPiece.coords = move.targetSquare

        if (move.promotionType) movedPiece.type = move.promotionType

        newState.board[move.targetSquare.rank][move.targetSquare.file] = movedPiece
        newState.board[move.startSquare.rank][move.startSquare.file] = new Piece()

        newState.enPassantSquare = null

        if (move.subMove) {
            const postSubMoveState = State.executeMove(newState, move.subMove, true)

            if (postSubMoveState === null) return null

            newState = postSubMoveState
        }

        if (move.consequence) move.consequence(newState, movedPiece)

        if (!isSubMove) newState.colorToMove = Game.invertColor(newState.colorToMove)
        if (movedPiece.color == PieceColor.Black) newState.fullMoves++

        return newState
    }

    public static generateMoves(state: IGameState, shallowCheck: boolean, boardSetup: IBoardSetup): Move[] {
        const moves: Move[] = []

        for (let rank = 0; rank < boardSetup.height; rank++) {
            for (let file = 0; file < boardSetup.width; file++) {
                const piece = state.board[rank][file]
                if (piece.color == state.colorToMove) {
                    const newMoves = piece.generateMoves(state, shallowCheck, boardSetup)
                    moves.push(...newMoves)
                }
            }
        }

        return moves
    }

    public static generatePieces(state: IGameState, boardSetup: IBoardSetup): Piece[] {
        const pieces: Piece[] = []

        const board = clone(state.board)

        let pieceCount = 0

        for (let rank = 0; rank < boardSetup.height; rank++) {
            for (let file = 0; file < boardSetup.width; file++) {
                const piece = board[rank][file]
                if (piece.type != PieceType.None) {
                    pieces.push(piece)
                    pieceCount++
                }
            }
        }

        return pieces
    }

    public static canKingBeTaken(state: IGameState, boardSetup: IBoardSetup) {
        const possibleResponses = State.generateMoves(state, true, boardSetup)

        // Returns true if any possible move following move results in a king take
        return possibleResponses.some(move => {
            if (!move.targetPieceCoords) return false

            if (!Game.doesTileExist(boardSetup, move.targetPieceCoords)) {
                console.log(move)
                return false
            }

            const attackedPiece = state.board[move.targetPieceCoords.rank][move.targetPieceCoords.file]
            return attackedPiece.type == PieceType.King
        })
    }
}

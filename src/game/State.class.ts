import clone from "clone"
import { IGameState, IBoardSetup, ICastleState, IBoardCoords } from "../types/game"
import { PieceType, PieceColor, SlideDirection } from "./enums"
import { Game } from "./Game.class"
import { Piece } from "./Piece.class"
import { Coords, Move } from "./utils"

export class State {
    public static executeMove(state: IGameState, move: Move, isSubMove: boolean = false): IGameState | null {
        let newState = clone(state)

        const movedPiece = newState.board[move.startSquare.rank][move.startSquare.file]
        
        if (!movedPiece) return null

        // Take piece
        if (move.targetPieceCoords != null) {
            const targetPiece = newState.board[move.targetPieceCoords.rank][move.targetPieceCoords.file]
            if (targetPiece && targetPiece.color == Piece.invertColor(newState.colorToMove)) {
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

        if (!isSubMove) newState.colorToMove = Piece.invertColor(newState.colorToMove)
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

            if (!State.doesTileExist(boardSetup, move.targetPieceCoords)) {
                console.log(move)
                return false
            }

            const attackedPiece = state.board[move.targetPieceCoords.rank][move.targetPieceCoords.file]
            return attackedPiece.type == PieceType.King
        })
    }

    public static fromFEN(fen: string): IGameState {
        const fenSegments = fen.split(' ')

        const {width, height} = State.getSizeOfFEN(fenSegments[0])

        const board = Array.from({length: 8}, e => Array(8).fill(new Piece()))

        let file = 0, rank = height - 1
        
        for (let i = 0; i < fenSegments[0].length; i++) {
            const char = fenSegments[0].charAt(i)
    
            if (char === '/') {
                file = 0
                rank--
                continue
            }

            const number = parseInt(char)
        
            if (isNaN(number)) {
                const coords = {
                    file,
                    rank
                }

                board[rank][file] = new Piece(
                    Piece.charToPieceType(char),
                    char == char.toUpperCase() ? PieceColor.White : PieceColor.Black,
                    coords
                )
                file++
            } else {
                file += number
            }
        }

        const castleState: ICastleState = {
            [PieceColor.Black]: [],
            [PieceColor.White]: []
        }

        for (let i = 0; i < fenSegments[2].length; i++) {
            const char = fenSegments[2].charAt(i)
            if (char == '-') break

            switch (char) {
                case 'K':
                    castleState[PieceColor.White].push(SlideDirection.East)
                    break
                case 'Q':
                    castleState[PieceColor.White].push(SlideDirection.West)
                    break
                case 'k':
                    castleState[PieceColor.Black].push(SlideDirection.East)
                    break
                case 'q':
                    castleState[PieceColor.Black].push(SlideDirection.West)
                    break
            }
        }

        return {
            board,
            colorToMove: fenSegments[1] == 'b' ? PieceColor.Black : PieceColor.White,
            castleState,
            enPassantSquare: fenSegments[3].charAt(0) == '-' ? null : Coords.fromAlgebraic(fenSegments[3]),
            halfMoves: parseInt(fenSegments[4]),
            fullMoves: parseInt(fenSegments[5]),
        }
    }

    public static toFEN(state: IGameState, boardSetup: IBoardSetup): string {
        let fen = ''

        for (let rank = boardSetup.height; rank >= 0; rank--) {
            let emptySquareCount = 0

            for (let file = 0; file < boardSetup.width; file++) {
                const piece = state.board[rank][file]

                if (piece.type !== PieceType.None) {
                    if (emptySquareCount) fen += emptySquareCount.toString()

                    fen += piece.toFENChar()
                } else {
                    emptySquareCount++
                }
            }

            if (emptySquareCount) fen += emptySquareCount.toString()

            fen += '/'
        }

        fen += ' '

        fen += state.colorToMove === PieceColor.White ? 'w' : 'b'

        fen += state.castleState[PieceColor.White].map(direction => direction === SlideDirection.East ? 'K' : 'Q').join()
        fen += state.castleState[PieceColor.Black].map(direction => direction === SlideDirection.East ? 'k' : 'q').join()

        fen += ' '

        fen += state.enPassantSquare ? Coords.toAlgebraic(state.enPassantSquare) : '-'

        fen += ` ${state.halfMoves.toString()} ${state.fullMoves.toString()}`

        return fen
    }

    public static doesTileExist(setup: IBoardSetup, square: IBoardCoords): boolean {
        return !(
            square.file > setup.width - 1 ||
            square.rank > setup.height - 1 ||
            square.file < 0 ||
            square.rank < 0
        )
    }

    public static getSizeOfFEN(fen: string): {width: number, height: number} {
        let width = 0
    
        const fenArray = fen.split('/')
    
        for (let i = 0; i < fenArray[0].length; i++) {
            const char = fenArray[0].charAt(i)
    
            const number = parseInt(char)
    
            width += isNaN(number) ? 1 : number
        }

        return {
            width,
            height: fenArray.length
        }
    }
}

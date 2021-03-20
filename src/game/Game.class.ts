import { Piece } from './Piece.class'
import { PieceColor, PieceType, SlideDirection } from './enums'

import { Move, Coords } from './utils'
import { IBoardCoords, ICastleState, IBoardPrecompData, IGameRenderContext, IGameState, IBoardSetup, MoveGeneratorFunc } from '../types/game'
import { State } from './State.class'

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
            layout: boardLayout,
            // TODO: re-run this if width, height or layout is changed
            numSquaresToEdge: []
        }

        this.legalMoves = []

        this.pieces = []

        this.setup.numSquaresToEdge = this.precomputeMoveData(this.setup)
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
        this.pieces = State.generatePieces(this.state, this.setup)
        this.legalMoves = State.generateMoves(this.state, false, this.setup)

        return true
    }

    public loadFEN(fen: string) {
        const fenSegments = fen.split(' ')

        const {width, height} = Game.getSizeOfFEN(fenSegments[0])

        if (width != this.setup.width || height != this.setup.height) return

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

        this.state = {
            board,
            colorToMove: fenSegments[1] == 'b' ? PieceColor.Black : PieceColor.White,
            castleState,
            enPassantSquare: fenSegments[3].charAt(0) == '-' ? null : Coords.fromAlgebraic(fenSegments[3]),
            halfMoves: parseInt(fenSegments[4]),
            fullMoves: parseInt(fenSegments[5]),
        }

        this.pieces = State.generatePieces(this.state, this.setup)
        this.legalMoves = State.generateMoves(this.state, false, this.setup)
    }

    /**
     * At all squares on the board, generate the distance to the edges in every direction
     */
    private precomputeMoveData(setup: IBoardSetup): IBoardPrecompData[][] {
        const numSquaresToEdge: IBoardPrecompData[][] = []

        for (let rank = 0; rank < setup.width; rank++) {
            numSquaresToEdge.push([])
            for (let file = 0; file < setup.height; file++) {
                const numNorth = setup.height - 1 - rank
                const numSouth = rank
                const numWest = file
                const numEast = setup.width - 1 - file

                numSquaresToEdge[rank][file] = {
                    [SlideDirection.North]: numNorth,
                    [SlideDirection.South]: numSouth,
                    [SlideDirection.West]: numWest,
                    [SlideDirection.East]: numEast,
                    [SlideDirection.NorthWest]: Math.min(numNorth, numWest),
                    [SlideDirection.SouthEast]: Math.min(numSouth, numEast),
                    [SlideDirection.NorthEast]: Math.min(numNorth, numEast),
                    [SlideDirection.SouthWest]: Math.min(numSouth, numWest)
                }
            }
        }

        return numSquaresToEdge
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
    
    public static invertColor(color: PieceColor): PieceColor {
        return color == PieceColor.White ? PieceColor.Black : PieceColor.White
    }

    public static doesTileExist(setup: IBoardSetup, square: IBoardCoords): boolean {
        return !(
            square.file > setup.width - 1 ||
            square.rank > setup.height - 1 ||
            square.file < 0 ||
            square.rank < 0
        )
    }
}

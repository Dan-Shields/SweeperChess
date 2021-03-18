import { Piece } from './Piece.class'
import { PieceColor, PieceType, SlideDirection } from './enums'

import { Move, Coords } from './utils'
import { reactive } from 'vue'
import { BoardCoords, CastleState, IBoardPrecompData } from '../types/game'

export class Game {
    public pieces: Piece[] = reactive([])

    public colorToMove: PieceColor = PieceColor.White

    public castleState: CastleState = {
        [PieceColor.White]: [
            SlideDirection.East,
            SlideDirection.West,
        ],
        [PieceColor.Black]: [
            SlideDirection.East,
            SlideDirection.West,
        ]
    }

    public enPassantSquare: BoardCoords | null = null

    public board: Piece[][] = reactive([])

    public boardWidth: number
    public boardHeight: number
    public boardLayout: number[]

    public legalMoves: Move[] = []
    public opponentMoves: Move[] = []
    public attackedSquares: BoardCoords[] = []
    public kingAttacks: BoardCoords[][] = []

    numSquaresToEdge: IBoardPrecompData[][] = []

    constructor(boardWidth: number, boardHeight: number, boardLayout: number[] = []) {
        this.boardWidth = boardWidth
        this.boardHeight = boardHeight

        this.boardLayout = boardLayout
        
        this.precomputeMoveData()
    }

    public loadFEN(fen: string) {
        const {width, height} = Game.getSizeOfFEN(fen)

        if (width != this.boardWidth || height != this.boardHeight) return

        this.pieces.length = 0

        let file = 0, rank = height - 1
        
        for (let i = 0; i < fen.length; i++) {
            const char = fen.charAt(i)
    
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

                this.pieces.push(reactive(new Piece(
                    Piece.charToPieceType(char),
                    char == char.toUpperCase() ? PieceColor.White : PieceColor.Black,
                    coords
                )))
                file++
            } else {
                file += number
            }
        }

        this.generateBoard()

        this.generateMoves(this.opponentMoves, Game.invertColor(this.colorToMove))
        this.checkCheck()
        this.generateMoves(this.legalMoves, this.colorToMove)
    }

    public generateBoard() {
        const result = Array.from({length: 8}, e => Array(8).fill(reactive(new Piece())))

        this.pieces.forEach(piece => {
            if (!result[piece.coords.rank]) result[piece.coords.rank] = []

            result[piece.coords.rank][piece.coords.file] = piece
        })

        this.board = result
    }

    precomputeMoveData() {
        this.numSquaresToEdge = []

        for (let rank = 0; rank < this.boardWidth; rank++) {
            this.numSquaresToEdge.push([])
            for (let file = 0; file < this.boardHeight; file++) {
                const numNorth = this.boardHeight - 1 - rank
                const numSouth = rank
                const numWest = file
                const numEast = this.boardWidth - 1 - file

                this.numSquaresToEdge[rank][file] = {
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
    }

    public tryMovePiece(startSquare: BoardCoords, targetSquare: BoardCoords) {
        if (startSquare == targetSquare) return

        const requestedMove = this.legalMoves.find(move => {
            return Coords.Equal(move.startSquare, startSquare) && Coords.Equal(move.targetSquare, targetSquare)
        })
        
        if (!requestedMove) {
            // Move illegal
            return
        }

        this.executeMove(requestedMove)
        
        this.colorToMove = Game.invertColor(this.colorToMove)
        this.generateBoard()
        this.generateMoves(this.opponentMoves, Game.invertColor(this.colorToMove))
        this.checkCheck()
        this.generateMoves(this.legalMoves, this.colorToMove)
    }

    private executeMove(move: Move) {
        const piece = this.board[move.startSquare.rank][move.startSquare.file]
        
        if (piece.color != this.colorToMove) return
        
        // Separated so reactive rules are obeyed
        piece.coords.rank = move.targetSquare.rank
        piece.coords.file = move.targetSquare.file
        
        this.enPassantSquare = null

        // Take piece
        if (move.targetPieceCoords != null) {
            const targetPiece = this.board[move.targetPieceCoords.rank][move.targetPieceCoords.file]
            if (targetPiece && targetPiece.color == Game.invertColor(this.colorToMove)) {
                const targetPieceIndex = this.pieces.indexOf(targetPiece)

                if (targetPieceIndex) {
                    this.pieces.splice(targetPieceIndex, 1)
                }
            }
        }

        if (move.subMove) this.executeMove(move.subMove)

        if (move.consequence) move.consequence(this, piece)
    }

    private generateMoves(moves: Move[], color: PieceColor) {
        // clear moves
        moves.length = 0

        this.pieces.forEach(piece => {
            if (piece.color == color) {
                const startSquare = piece.coords
                if (piece.isSlidingPiece()) {
                    this.generateSlidingMoves(moves, color, startSquare, piece)
                } else if (piece.type == PieceType.Pawn) {
                    this.generatePawnMoves(moves, color, startSquare, piece)
                } else if (piece.type == PieceType.Knight) {
                    this.generateKnightMoves(moves, color, startSquare)
                } else if (piece.type == PieceType.King) {
                    this.generateSlidingMoves(moves, color, startSquare, piece)
                    this.generateCastlingMoves(moves, color, startSquare)
                }
            }
        })
    }
    
    private generateSlidingMoves(moves: Move[], color: PieceColor, startSquare: BoardCoords, piece: Piece) {
        const directions = piece.getSlidingDirections()
        const moveDistance = piece.getMoveDistanceRange(this.boardHeight)

        directions.forEach(direction => {
            const maxMoveDistance = Math.min(moveDistance.max, this.numSquaresToEdge[startSquare.rank][startSquare.file][direction])

            for (let n = moveDistance.min; n <= maxMoveDistance; n++) {
                const delta = Coords.Scale(Piece.SlideDirections[direction], n)
                const targetSquare = Coords.Add(startSquare, delta)

                if (!this.doesTileExist(targetSquare)) return

                const pieceOnTargetSquare = this.board[targetSquare.rank][targetSquare.file]

                // Blocked by friendly piece
                if (pieceOnTargetSquare.color == color) {
                    break
                }

                let consequence = null

                if (piece.type == PieceType.Rook) {
                    const castleSide = startSquare.file == 0 ? SlideDirection.West : SlideDirection.East
                    consequence = (game: Game) => {
                        if (game.colorToMove == PieceColor.None) return
                        const index = game.castleState[game.colorToMove].indexOf(castleSide)
                        if (index > -1) {
                            // Remove castle ability on this side
                            game.castleState[game.colorToMove].splice(index, 1)
                        }
                    }
                }

                const isTake = pieceOnTargetSquare.color == Game.invertColor(color)
                
                moves.push(new Move(startSquare, targetSquare, isTake ? targetSquare : null, null, consequence))

                // Can't move further after a take
                if (isTake) {
                    break
                }
            }
        })
    }

    private generatePawnMoves(moves: Move[], color: PieceColor, startSquare: BoardCoords, piece: Piece) {
        const direction = color == PieceColor.White ? SlideDirection.North : SlideDirection.South

        const moveDistance = piece.getMoveDistanceRange(this.boardHeight)

        for (let n = moveDistance.min; n <= moveDistance.max; n++) {
            const delta = Coords.Scale(Piece.SlideDirections[direction], n)
            const targetSquare = Coords.Add(startSquare, delta)

            if (!this.doesTileExist(targetSquare)) return

            const pieceOnTargetSquare = this.board[targetSquare.rank][targetSquare.file]

            // Blocked by piece
            if (pieceOnTargetSquare.type != PieceType.None) {
                break
            }

            let consequence = null

            if (n == 2) {
                consequence = (game: Game, movedPiece: Piece) => {
                    game.enPassantSquare = Coords.Add(Coords.Scale(delta, -0.5), targetSquare)
                }
            } else if (targetSquare.rank == this.boardHeight - 1 || targetSquare.rank == 0) {
                consequence = (game: Game, movedPiece: Piece) => {
                    movedPiece.type = PieceType.Queen
                }
            }

            moves.push(new Move(startSquare, targetSquare, null, null, consequence))
        }

        const takingDirections: SlideDirection[] = color == PieceColor.White ? [SlideDirection.NorthEast, SlideDirection.NorthWest] : [SlideDirection.SouthEast, SlideDirection.SouthWest]

        takingDirections.forEach(takeDirection => {
            const targetSquare = Coords.Add(startSquare, Piece.SlideDirections[takeDirection])

            if (!this.doesTileExist(targetSquare)) return

            const pieceOnTargetSquare = this.board[targetSquare.rank][targetSquare.file]

            let consequence = null
            if (targetSquare.rank == this.boardHeight - 1 || targetSquare.rank == 0) {
                consequence = (game: Game, movedPiece: Piece) => {
                    movedPiece.type = PieceType.Queen
                }
            }

            if (pieceOnTargetSquare.color == Game.invertColor(color)) {
                moves.push(new Move(startSquare, targetSquare, targetSquare, null, consequence))
            } else if (this.enPassantSquare && Coords.Equal(this.enPassantSquare, targetSquare)) {
                const targetPieceCoords = Coords.Add(Coords.Scale(Piece.SlideDirections[direction], -1), targetSquare,)
                
                moves.push(new Move(startSquare, targetSquare, targetPieceCoords, null, consequence))
            }
        })
    }

    private generateKnightMoves(moves: Move[], color: PieceColor, startSquare: BoardCoords) {
        Piece.KnightDirections.forEach(direction => {
            const targetSquare = Coords.Add(startSquare, direction)

            if (!this.doesTileExist(targetSquare)) return

            const pieceOnTargetSquare = this.board[targetSquare.rank][targetSquare.file]

            if (pieceOnTargetSquare && pieceOnTargetSquare.color != color) {
                moves.push(new Move(startSquare, targetSquare))
            }
        })
    }

    private generateCastlingMoves(moves: Move[], color: PieceColor, startSquare: BoardCoords) {
        if (color == PieceColor.None) return

        this.castleState[color].forEach(direction => {
            const rookFile = direction == SlideDirection.East ? 7 : 0

            const rookStartPosition = {
                rank: startSquare.rank,
                file: rookFile
            }
            const rookEndPosition = Coords.Add(startSquare, Piece.SlideDirections[direction])

            const subMove = new Move(rookStartPosition, rookEndPosition)

            let targetSquare

            for (let n = 1; n <= 2; n++) {
                const delta = Coords.Scale(Piece.SlideDirections[direction], n)
                targetSquare = Coords.Add(startSquare, delta)

                if (!this.doesTileExist(targetSquare)) return

                const pieceOnTargetSquare = this.board[targetSquare.rank][targetSquare.file]
                
                // Blocked by piece
                if (pieceOnTargetSquare.type != PieceType.None) {
                    return
                }
            }

            if (targetSquare) {
                const consequence = (game: Game, piece: Piece) => {
                    if (game.colorToMove != PieceColor.None) {
                        game.castleState[game.colorToMove] = []
                    }
                }

                moves.push(new Move(startSquare, targetSquare, null, subMove, consequence))
            }
        })
    }

    private isSquareAttacked(testSquare: BoardCoords): boolean {
        return !!this.attackedSquares.find(square => Coords.Equal(testSquare, square))
    }
    
    private checkCheck() {
        this.attackedSquares = [...new Set(this.opponentMoves.map(move => move.targetSquare))]
        
        const king = this.pieces.find(piece => piece.type == PieceType.King && piece.color == this.colorToMove)
        
        if (!king) return
        
        const kingAttackMoves = this.opponentMoves.filter(move => Coords.Equal(move.targetSquare, king.coords))

        king.inCheck = kingAttackMoves.length != 0

        if (!king.inCheck) {
            this.kingAttacks = []
            return
        }
        
        this.kingAttacks = kingAttackMoves.map(kingAttackMove => {
            const path: BoardCoords[] = []

            this.opponentMoves.forEach(opponentMove => {
                if (Coords.Equal(opponentMove.startSquare, kingAttackMove.startSquare)) {
                    path.push(opponentMove.targetSquare)
                }
            })

            return path
        })

        console.log(this.kingAttacks)
    }

    private doesMovePreventCheck(move: Move): boolean {
        const kings = this.pieces.filter(piece => piece.type == PieceType.King && piece.color == this.colorToMove)

        let allKingsOnSafeSquare = true

        kings.forEach(king => {
            if (king.coords == move.startSquare) {
                if (this.isSquareAttacked(move.targetSquare)) {
                    allKingsOnSafeSquare = false
                }
            } else if (king.inCheck) {
                allKingsOnSafeSquare = false
            }
        })

        if (!allKingsOnSafeSquare) return false

        return true
    }

    public coordsToIndex(coords: BoardCoords): number {
        return (coords.rank * this.boardWidth) + coords.file
    }

    public indexToCoords(index: number): BoardCoords {
        return {
            file: index % this.boardWidth,
            rank: Math.floor(index / this.boardWidth)
        }
    }

    public doesTileExist(square: BoardCoords) {
        return !(
            square.file > this.boardWidth - 1 ||
            square.rank > this.boardHeight - 1 ||
            square.file < 0 ||
            square.rank < 0
        )
    }

    static getSizeOfFEN(fen: string): {width: number, height: number} {
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
    
    static invertColor(color: PieceColor): PieceColor {
        return color == PieceColor.White ? PieceColor.Black : PieceColor.White
    }
}

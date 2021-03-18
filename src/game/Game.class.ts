import { Piece } from './Piece.class'
import { PieceColor, PieceType, SlideDirection } from './enums'

import { Move, Coords } from './utils'
import { IBoardCoords, ICastleState, IBoardPrecompData, IGameContext, IMoveData } from '../types/game'

export class Game implements IGameContext {
    // IGameContext Implementation:
    public pieces: Piece[] = []
    public colorToMove: PieceColor = PieceColor.White
    public boardWidth: number
    public boardHeight: number
    public boardLayout: number[][]
    public legalMoves: Move[] = []

    // Private members:
    private board: Piece[][] = []
    private enPassantSquare: IBoardCoords | null = null
    public opponentAttackedSquares: IBoardCoords[] = []

    /**
     * Array of attacks that target the friendly king.
     * 
     * Each element lists the squares on the path going from the king to the attacking piece, inclusive of the two pieces and in that direction.
     */
    private opponentKingAttacks: IBoardCoords[][] = []

    public opponentPins: IBoardCoords[][] = []

    private numSquaresToEdge: IBoardPrecompData[][] = []
    private castleState: ICastleState = {
        [PieceColor.White]: [
            SlideDirection.East,
            SlideDirection.West,
        ],
        [PieceColor.Black]: [
            SlideDirection.East,
            SlideDirection.West,
        ]
    }

    constructor(boardWidth: number, boardHeight: number, boardLayout: number[][] = []) {
        this.boardWidth = boardWidth
        this.boardHeight = boardHeight

        this.boardLayout = boardLayout
        
        this.precomputeMoveData()
    }

    //#region PUBLIC METHODS
    ////////////////////////

    public tryMovePiece(startSquare: IBoardCoords, targetSquare: IBoardCoords): boolean {
        if (startSquare == targetSquare) return false

        const requestedMove = this.legalMoves.find(move => {
            return Coords.Equal(move.startSquare, startSquare) && Coords.Equal(move.targetSquare, targetSquare)
        })
        
        if (!requestedMove) {
            // Move illegal
            return false
        }

        this.executeMove(requestedMove)
        
        this.colorToMove = Game.invertColor(this.colorToMove)

        this.regen()

        return true
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

                this.pieces.push(new Piece(
                    Piece.charToPieceType(char),
                    char == char.toUpperCase() ? PieceColor.White : PieceColor.Black,
                    coords
                ))
                file++
            } else {
                file += number
            }
        }

        this.regen()
    }
    
    //#endregion

    //#region PRIVATE METHODS
    /////////////////////////

    private regen() {
        this.generateBoard()

        const opponentMoveData = this.generateMoves(Game.invertColor(this.colorToMove))

        this.opponentAttackedSquares = [...new Set(opponentMoveData.attackedSquares)]
        this.opponentKingAttacks = opponentMoveData.kingAttacks
        this.opponentPins = opponentMoveData.pins

        const friendlyMoveData = this.generateMoves(this.colorToMove)
        this.legalMoves = friendlyMoveData.legalMoves
    }

    private generateBoard() {
        const result = Array.from({length: 8}, e => Array(8).fill(new Piece()))

        this.pieces.forEach(piece => {
            if (!result[piece.coords.rank]) result[piece.coords.rank] = []

            result[piece.coords.rank][piece.coords.file] = piece
        })

        this.board = result
    }

    /**
     * At all squares on the board, generate the distance to the edges in every direction
     */
    private precomputeMoveData() {
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

    private executeMove(move: Move) {
        const piece = this.board[move.startSquare.rank][move.startSquare.file]
        
        if (piece.color != this.colorToMove) return
        
        piece.coords = move.targetSquare
        
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

    private generateMoves(color: PieceColor): IMoveData {
        const legalMoves: Move[] = []
        const attackedSquares: IBoardCoords[] = []
        const kingAttacks: IBoardCoords[][] = []
        const pins: IBoardCoords[][] = []

        this.pieces.forEach(piece => {
            if (piece.color == color) {
                const startSquare = piece.coords
                if (piece.isSlidingPiece()) {
                    this.generateSlidingMoves(legalMoves, color, startSquare, piece, kingAttacks, attackedSquares, pins)
                } else if (piece.type == PieceType.Pawn) {
                    this.generatePawnMoves(legalMoves, color, startSquare, piece, kingAttacks, attackedSquares)
                } else if (piece.type == PieceType.Knight) {
                    this.generateKnightMoves(legalMoves, color, startSquare, kingAttacks, attackedSquares)
                } else if (piece.type == PieceType.King) {
                    this.generateSlidingMoves(legalMoves, color, startSquare, piece, kingAttacks, attackedSquares, pins)
                    this.generateCastlingMoves(legalMoves, color, startSquare)
                }
            }
        })

        return {
            legalMoves,
            attackedSquares,
            kingAttacks,
            pins
        }
    }
    
    private generateSlidingMoves(moves: Move[], color: PieceColor, startSquare: IBoardCoords, piece: Piece, kingAttacks: IBoardCoords[][], attackedSquares: IBoardCoords[], pins: IBoardCoords[][]) {
        const directions = piece.getSlidingDirections()
        const moveDistance = piece.getMoveDistanceRange(this.boardHeight)

        let consequence: null | ((game: Game, piece: Piece) => void) = null

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
        } else if (piece.type == PieceType.King) {
            consequence = (game: Game) => {
                if (game.colorToMove == PieceColor.None) return
                // Remove castle ability
                game.castleState[game.colorToMove] = []
            }
        }

        directions.forEach(direction => {
            const maxMoveDistance = Math.min(moveDistance.max, this.numSquaresToEdge[startSquare.rank][startSquare.file][direction])

            const crossedSquares = []
            let isKingAttack = false
            let checkingPin = false

            for (let n = moveDistance.min; n <= maxMoveDistance; n++) {
                const delta = Coords.Scale(Piece.SlideDirections[direction], n)
                const targetSquare = Coords.Add(startSquare, delta)

                if (!this.doesTileExist(targetSquare)) return

                const pieceOnTargetSquare = this.board[targetSquare.rank][targetSquare.file]

                if (!checkingPin) attackedSquares.push(targetSquare)

                // Blocked by friendly piece
                if (pieceOnTargetSquare.color == color) {
                    break
                }

                crossedSquares.push(targetSquare)

                if (checkingPin) {
                    if (pieceOnTargetSquare.type == PieceType.King) {
                        pins.push([...crossedSquares, startSquare])
                        break
                    }
                } else {
                    if (this.doesMoveAllowKingTake(startSquare, targetSquare, piece.type)) continue

                    const isTake = pieceOnTargetSquare.color == Game.invertColor(color)

                    checkingPin = isTake

                    if (isTake && pieceOnTargetSquare.type == PieceType.King) {
                        isKingAttack = true
                    }

                    moves.push(new Move(startSquare, targetSquare, isTake ? targetSquare : null, null, consequence))
                }
            }

            if (isKingAttack) {
                kingAttacks.push([...crossedSquares, startSquare])
            }
        })
    }

    private generatePawnMoves(moves: Move[], color: PieceColor, startSquare: IBoardCoords, piece: Piece, kingAttacks: IBoardCoords[][], attackedSquares: IBoardCoords[]) {
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

            if (this.doesMoveAllowKingTake(startSquare, targetSquare, piece.type)) continue

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

            if (this.doesMoveAllowKingTake(startSquare, targetSquare, piece.type)) return

            let consequence = null

            // Promotion
            // TODO: add underpromotion
            if (targetSquare.rank == this.boardHeight - 1 || targetSquare.rank == 0) {
                consequence = (game: Game, movedPiece: Piece) => {
                    movedPiece.type = PieceType.Queen
                }
            }

            attackedSquares.push(targetSquare)

            if (pieceOnTargetSquare.color == Game.invertColor(color)) {
                moves.push(new Move(startSquare, targetSquare, targetSquare, null, consequence))

                if (pieceOnTargetSquare.type == PieceType.King) {
                    kingAttacks.push([targetSquare, startSquare])
                }

            } else if (this.enPassantSquare && Coords.Equal(this.enPassantSquare, targetSquare)) {
                const targetPieceCoords = Coords.Add(Coords.Scale(Piece.SlideDirections[direction], -1), targetSquare,)
                
                moves.push(new Move(startSquare, targetSquare, targetPieceCoords, null, consequence))
            }
        })
    }

    private generateKnightMoves(moves: Move[], color: PieceColor, startSquare: IBoardCoords, kingAttacks: IBoardCoords[][], attackedSquares: IBoardCoords[]) {
        Piece.KnightDirections.forEach(direction => {
            const targetSquare = Coords.Add(startSquare, direction)

            if (!this.doesTileExist(targetSquare)) return

            if (this.doesMoveAllowKingTake(startSquare, targetSquare, PieceType.Knight)) return

            const pieceOnTargetSquare = this.board[targetSquare.rank][targetSquare.file]

            attackedSquares.push(targetSquare)

            if (pieceOnTargetSquare.color == Game.invertColor(color)) {
                moves.push(new Move(startSquare, targetSquare, targetSquare))

                if (pieceOnTargetSquare.type == PieceType.King) {
                    kingAttacks.push([targetSquare, startSquare])
                }
            } else if (pieceOnTargetSquare.color == PieceColor.None) {
                moves.push(new Move(startSquare, targetSquare))
            }
        })
    }

    private generateCastlingMoves(moves: Move[], color: PieceColor, startSquare: IBoardCoords) {
        if (color == PieceColor.None) return

        this.castleState[color].forEach(direction => {
            const rookFile = direction == SlideDirection.East ? 7 : 0

            const rookStartPosition = {
                rank: startSquare.rank,
                file: rookFile
            }

            if (this.board[rookStartPosition.rank][rookStartPosition.file].type !== PieceType.Rook) return

            const rookEndPosition = Coords.Add(startSquare, Piece.SlideDirections[direction])


            const subMove = new Move(rookStartPosition, rookEndPosition)

            let targetSquare

            for (let n = 1; n <= 2; n++) {
                const delta = Coords.Scale(Piece.SlideDirections[direction], n)
                targetSquare = Coords.Add(startSquare, delta)

                if (!this.doesTileExist(targetSquare)) return

                const pieceOnTargetSquare = this.board[targetSquare.rank][targetSquare.file]
                
                // Blocked by piece
                if (pieceOnTargetSquare.type != PieceType.None || this.isSquareAttacked(targetSquare)) {
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

    private isSquareAttacked(testSquare: IBoardCoords): boolean {
        return !!this.opponentAttackedSquares.find(square => Coords.Equal(testSquare, square))
    }

    /**
     * 
     * @returns Whether or not the given move would allow the king to be taken next move
     */
    private doesMoveAllowKingTake(startSquare: IBoardCoords, targetSquare: IBoardCoords, movedPieceType: PieceType): boolean {
        let kingOnSafeSquare = this.opponentKingAttacks.length === 0
        let allAttacksBlocked = false
        let allPinsRemain = true

        if (movedPieceType == PieceType.King) {
            // Was the square king moved to safe?
            kingOnSafeSquare = !this.isSquareAttacked(targetSquare)
        } else {
            let remainingAttacks = this.opponentKingAttacks.length
            for (let i = 0; i < this.opponentKingAttacks.length; i++) {
                if (this.opponentKingAttacks[i].find(attackSquare => Coords.Equal(attackSquare, targetSquare))) {
                    // Attack blocked
                    remainingAttacks--
                }
            }

            // All attacks blocked
            allAttacksBlocked = remainingAttacks == 0

            // The following accounts for multiple pins on the king going through one piece, but I'm not sure if that's ever possible

            // Get all pin lines this piece is in
            const pins = this.opponentPins.filter(pin => pin.find(square => Coords.Equal(square, startSquare)))

            pins.forEach(pin => {
                if (!pin.find(square => Coords.Equal(square, targetSquare))) {
                    // move breaks pin
                    allPinsRemain = false
                }
            })
        }        

        return !(kingOnSafeSquare || (allAttacksBlocked && allPinsRemain))
    }

    private coordsToIndex(coords: IBoardCoords): number {
        return (coords.rank * this.boardWidth) + coords.file
    }

    private indexToCoords(index: number): IBoardCoords {
        return {
            file: index % this.boardWidth,
            rank: Math.floor(index / this.boardWidth)
        }
    }

    private doesTileExist(square: IBoardCoords) {
        return !(
            square.file > this.boardWidth - 1 ||
            square.rank > this.boardHeight - 1 ||
            square.file < 0 ||
            square.rank < 0
        )
    }

    //#endregion

    //#region STATIC METHODS
    ////////////////////////

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

    //#endregion
}

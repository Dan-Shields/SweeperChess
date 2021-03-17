import { reactive, watch, ref } from 'vue'

export enum PieceType {
    None,
    King,
    Pawn,
    Knight,
    Bishop,
    Rook,
    Queen
}

export enum PieceColor {
    None,
    White,
    Black
}

export class Move implements IMove {
    startSquare: number
    targetSquare: number

    constructor(startSquare: number, targetSquare: number) {
        this.startSquare = startSquare
        this.targetSquare = targetSquare
    }

    public equals(otherMove: Move): boolean {
        return this.startSquare == otherMove.startSquare && this.targetSquare == otherMove.targetSquare
    }
}

export class Piece {
    public type: PieceType
    public color: PieceColor

    public coords?: BoardCoords
    public index?: number

    constructor(type = PieceType.None, color = PieceColor.None) {
        this.type = type
        this.color = color
    }

    static SlideDirections: { [key in SlideDirection]: number} = {
        North: 8,
        South: -8,
        West: -1,
        East: 1,
        NorthEast: 9,
        SouthWest: -9,
        SouthEast: -7,
        NorthWest: 7
    }

    static KnightDirections = [
        17,
        15,
        10,
        6,
        -6,
        -10,
        -15,
        -17
    ]

    public isSlidingPiece(): boolean {
        return this.type == PieceType.Bishop || this.type == PieceType.Queen || this.type == PieceType.Rook
    }

    public getSlidingDirections(): SlideDirection[] {
        switch (this.type) {
        case PieceType.Bishop:
            return ['NorthEast', 'NorthWest', 'SouthEast', 'SouthWest']
        case PieceType.Queen:
            return ['NorthEast', 'NorthWest', 'SouthEast', 'SouthWest', 'North', 'South', 'East', 'West']
        case PieceType.Rook:
            return ['North', 'South', 'East', 'West']
        default:
            return []
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

export class Game {
    public board: Piece[]
    public colorToMove: PieceColor

    public boardWidth: number
    public boardHeight: number
    public boardLayout: number[]

    public legalMoves: Move[]

    numSquaresToEdge: IBoardPrecompData[] = []

    constructor(boardWidth: number, boardHeight: number, boardLayout: number[] = []) {
        this.boardWidth = boardWidth
        this.boardHeight = boardHeight

        this.boardLayout = boardLayout

        this.board = reactive(new Array(boardWidth * boardHeight).fill(new Piece()))

        this.legalMoves = reactive([])

        this.colorToMove = PieceColor.White
        
        this.precomputeMoveData()
    }

    public loadFEN(fen: string) {
        const {width, height} = getSizeOfFEN(fen)

        if (width != this.boardWidth || height != this.boardHeight) return

        this.board = reactive(new Array(this.boardWidth * this.boardHeight).fill(new Piece()))

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
                this.board[rank * width + file] = new Piece(
                    Piece.charToPieceType(char),
                    char == char.toUpperCase() ? PieceColor.White : PieceColor.Black
                )
                file++
            } else {
                file += number
            }
        }

        this.generateMoves()
    }

    public tryMovePiece(requestedMove: Move) {
        if (requestedMove.startSquare == requestedMove.targetSquare) return

        const piece = this.board[requestedMove.startSquare]
        
        if (piece.color != this.colorToMove) return
        
        if (!this.legalMoves.find(move => move.equals(requestedMove))) {
            // Move illegal
            return
        }
        
        this.board[requestedMove.targetSquare] = piece
        this.board[requestedMove.startSquare] = new Piece()

        this.colorToMove = invertColor(this.colorToMove)
        this.generateMoves()
    }

    precomputeMoveData() {
        this.numSquaresToEdge = []

        for (let file = 0; file < this.boardWidth; file++) {
            for (let rank = 0; rank < this.boardHeight; rank++) {

                const numNorth = this.boardHeight - 1 - rank
                const numSouth = rank
                const numWest = file
                const numEast = this.boardWidth - 1 - file

                const squareIndex = rank * this.boardWidth + file
                this.numSquaresToEdge[squareIndex] = {
                    North: numNorth,
                    South: numSouth,
                    West: numWest,
                    East: numEast,
                    NorthWest: Math.min(numNorth, numWest),
                    SouthEast: Math.min(numSouth, numEast),
                    NorthEast: Math.min(numNorth, numEast),
                    SouthWest: Math.min(numSouth, numWest)
                }
            }
        }
    }

    generateMoves() {
        // clear moves
        this.legalMoves.length = 0
        
        for (let startSquare = 0; startSquare < this.boardWidth * this.boardHeight; startSquare++) {
            const piece = this.board[startSquare]

            if (piece.color == this.colorToMove) {
                if (piece.isSlidingPiece()) {
                    this.generateSlidingMoves(startSquare, piece)
                } else if (piece.type == PieceType.Pawn) {
                    this.generatePawnMoves(startSquare)
                } else if (piece.type == PieceType.Knight) {
                    this.generateKnightMoves(startSquare)
                }
            }
        }
    }
    
    generateSlidingMoves(startSquare: number, piece: Piece) {
        const directions = piece.getSlidingDirections()

        directions.forEach(direction => {
            for (let n = 0; n < this.numSquaresToEdge[startSquare][direction]; n++) {
                const targetSquare = startSquare + (Piece.SlideDirections[direction] * (n + 1))

                const pieceOnTargetSquare = this.board[targetSquare]

                // Blocked by friendly piece
                if (!pieceOnTargetSquare || pieceOnTargetSquare.color == this.colorToMove) {
                    break
                }

                this.legalMoves.push(new Move(startSquare, targetSquare))

                // Can't move further after a take
                if (pieceOnTargetSquare.color == (this.colorToMove == PieceColor.White ? PieceColor.Black : PieceColor.White)) {
                    break
                }
            }
        })
    }

    generatePawnMoves(startSquare: number) {
        const direction = this.colorToMove == PieceColor.White ? 'North' : 'South'

        const rank = Math.floor(startSquare / this.boardWidth)
        const isOnStartRank = this.colorToMove == PieceColor.White ? rank == 1 : rank == this.boardHeight - 2
        const moveDistance = Math.min(isOnStartRank ? 2 : 1, this.numSquaresToEdge[startSquare][direction])

        for (let n = 0; n < moveDistance; n++) {
            const targetSquare = startSquare + (Piece.SlideDirections[direction] * (n + 1))

            const pieceOnTargetSquare = this.board[targetSquare]

            // Blocked by piece
            if (!pieceOnTargetSquare || pieceOnTargetSquare.type != PieceType.None) {
                break
            }

            this.legalMoves.push(new Move(startSquare, targetSquare))

            // Can't move further after a take
            if (pieceOnTargetSquare.color == invertColor(this.colorToMove)) {
                break
            }
        }

        const takingDirections: SlideDirection[] = this.colorToMove == PieceColor.White ? ['NorthEast', 'NorthWest'] : ['SouthEast', 'SouthWest']

        takingDirections.forEach(takeDirection=> {
            const targetSquare = startSquare + (Piece.SlideDirections[takeDirection] * 1)

            const pieceOnTargetSquare = this.board[targetSquare]

            // Enemy piece on square
            if (pieceOnTargetSquare && pieceOnTargetSquare.color == invertColor(this.colorToMove)) {
                this.legalMoves.push(new Move(startSquare, targetSquare))
            }

        })
    }

    generateKnightMoves(startSquare: number) {
        Piece.KnightDirections.forEach(direction => {
            const targetSquare = startSquare + direction

            const pieceOnTargetSquare = this.board[targetSquare]

            if (pieceOnTargetSquare && pieceOnTargetSquare.color != this.colorToMove) {
                console.log(startSquare, targetSquare, direction)
                this.legalMoves.push(new Move(startSquare, targetSquare))
            }
        })
    }

    coordsToIndex(coords: BoardCoords): number {
        return (coords.rank * this.boardWidth) + coords.file
    }

    indexToCoords(index: number): BoardCoords {
        return {
            file: index % this.boardWidth,
            rank: Math.floor(index / this.boardWidth)
        }
    }
}

function getSizeOfFEN(fen: string): {width: number, height: number} {
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

function invertColor(color: PieceColor): PieceColor {
    return color == PieceColor.White ? PieceColor.Black : PieceColor.White
}

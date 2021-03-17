interface BoardCoords {
    file: number;
    rank: number;
}

interface IMove {
    startSquare: number;
    targetSquare: number;
}

interface CoordsMove {
    startSquare: BoardCoords;
    targetSquare: BoardCoords;
}

interface IBoardPrecompData {
    North: number;
    South: number;
    West: number;
    East: number;
    NorthEast: number;
    SouthWest: number;
    SouthEast: number;
    NorthWest: number;
}

type SlideDirection = 'NorthEast' | 'NorthWest' | 'SouthEast' | 'SouthWest' | 'North' | 'South' | 'East' | 'West'

export enum GameResult {
    StaleMate,
    WhiteCheckmate,
    BlackCheckmate,
    WhiteTimeout,
    BlackTimeout,
    WhiteResigns,
    BlackResigns
}

export enum GameStatus {
    Open,
    InProgress,
    Ended,
    Aborted
}

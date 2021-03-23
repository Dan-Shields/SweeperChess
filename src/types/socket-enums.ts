/**
 * Requests that can be sent to the GC by a user.
 */
export enum UserRequestType {
    Register = "user_register",
    Ident = "user_ident",
    JoinGameRoom = "user_join_game",
    JoinGameAsPlayer = "user_join_game_as_player",
    LeaveGame = "user_leave_game",
    CreateGame = "user_create_game",
    TryMove = "user_try_move",
    Resign = "user_resign"
}

/**
 * Messages the GC can send to the lobby room.
 */
export enum LobbyMessageType {
    GameOpened = "lobby_game_opened",
    GameUpdated = "lobby_game_updated",
    GameEnded = "lobby_game_closed"
}

/**
 * Messages the GC can send to game rooms.
 */
export enum GameRoomMessageType {
    GameUpdated = "game_updated"
}

export enum ClientStatus {
    PendingInit,
    Complete
}

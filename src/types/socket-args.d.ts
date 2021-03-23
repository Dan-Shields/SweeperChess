import { PieceColor } from "../game/enums"
import { IMoveProto } from "./game"
import { IGameLobbyInfo, IGameProto, IMultiplayerGameContext } from "./multiplayer"
import { UserRequestType, GameRoomMessageType, LobbyMessageType } from "./socket-enums"

interface UserRequestFailReasons extends Record<UserRequestType, string> {
    [UserRequestType.Register]: "userNameTaken" | "unknown"
    [UserRequestType.Ident]: "userNotFound" | "socketInUse" | "unknown"
    [UserRequestType.JoinGameRoom]: "userInGameRoom" | "userInUnfinishedGame" | "gameDoesntExist" | "unknown"
    [UserRequestType.JoinGameAsPlayer]: "userInGame" | "userInUnfinishedGame" | "gameDoesntExist" | "gameFull" | "unknown"
    [UserRequestType.LeaveGame]: "gameDoesntExist" | "gameStarted" | "userNotInGame" | "unknown"
    [UserRequestType.CreateGame]: "userInUnfinishedGame" | "invalidProto" | "unknown"
    [UserRequestType.TryMove]: "gameDoesntExist" | "userNotInGame" | "moveIllegal" | "notUsersTurn" | "unknown"
}

// eslint-disable-next-line @typescript-eslint/ban-types
interface UserRequestSuccessData extends Record<UserRequestType, object> {
    [UserRequestType.Register]: { userId: string, lobbyGames: IGameLobbyInfo[] };
    [UserRequestType.Ident]: { userName: string, lobbyGames: IGameLobbyInfo[], existingGameId?: string };
    [UserRequestType.CreateGame]: { gameContext: IMultiplayerGameContext };
    [UserRequestType.JoinGameRoom]: { gameContext: IMultiplayerGameContext }
    [UserRequestType.JoinGameAsPlayer]: { gameContext: IMultiplayerGameContext }
    [UserRequestType.LeaveGame]: { lobbyGames: IGameLobbyInfo[] }
}

type RequestCallback<T extends UserRequestType> =
    (e: (
        ( { error: UserRequestFailReasons[T] } ) |
        ( { error?: undefined } & UserRequestSuccessData[T])
    )) => void

interface UserToGCEvents {
    [UserRequestType.Register]: (userName: string, cb: RequestCallback<UserRequestType.Register>) => void;
    [UserRequestType.Ident]: (userId: string, cb: RequestCallback<UserRequestType.Ident>) => void;
    [UserRequestType.JoinGameRoom]: (gameId: string, cb: RequestCallback<UserRequestType.JoinGameRoom>) => void;
    [UserRequestType.JoinGameAsPlayer]: (gameId: string, color: PieceColor, cb: RequestCallback<UserRequestType.JoinGameAsPlayer>) => void;
    [UserRequestType.LeaveGame]: (gameId: string, cb: RequestCallback<UserRequestType.LeaveGame>) => void;
    [UserRequestType.CreateGame]: (gameProto: IGameProto, cb: RequestCallback<UserRequestType.CreateGame>) => void;
    [UserRequestType.TryMove]: (gameId: string, moveProto: IMoveProto, cb: RequestCallback<UserRequestType.TryMove>) => void;
}

interface GCToLobbyEvents {
    [LobbyMessageType.GameOpened]: (info: IGameLobbyInfo) => void;
    [LobbyMessageType.GameUpdated]: (gameId: string, newInfo: IGameLobbyInfo) => void;
    [LobbyMessageType.GameEnded]: (gameId: string) => void;
}

interface GCToGameRoomEvents  {
    [GameRoomMessageType.GameUpdated]: (context: IMultiplayerGameContext) => void;
}

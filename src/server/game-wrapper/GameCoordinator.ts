import { Server as SocketServer, Socket } from 'socket.io'
import { GCToLobbyEvents, UserToGCEvents } from '../../types/socket-args'
import { IGameLobbyInfo, IGameProto } from '../../types/multiplayer'
import { LobbyMessageType, UserRequestType } from '../../types/socket-enums'
import { MultiplayerGame } from './MultiplayerGameServer.class'
import { User } from './UserServer.class'
import { GameStatus } from '../../types/multiplayer-enums'

export class GameCoordinator {
    public static games: MultiplayerGame[] = []
    public static knownUsers: User[] = []

    private static io: SocketServer<never, GCToLobbyEvents>

    public static init(io: SocketServer<never, GCToLobbyEvents>) {
        this.io = io

        io.on('connection', (socket: Socket<UserToGCEvents, never>) => {
            //console.log('New socket connection: ID %s with IP %s', socket.id, socket.handshake.address);

            let socketUser: null | User = null

            socket.on('error', err => {
                console.error(err.stack)
            })

            socket.on(UserRequestType.Register, (userName, cb) => {
                if (socketUser !== null || this.knownUsers.find(user => user.name == userName)) {
                    // user name already taken or socket already assigned to user
                    return cb({ error: "userNameTaken" })
                }

                const user = new User(userName)

                user.setSocket(socket)

                socketUser = user

                cb({ userId: user.uuid, lobbyGames: this.getAllGameLobbyInfo() })

                this.knownUsers.push(user)
            })

            socket.on(UserRequestType.Ident, (userId, cb) => {
                const user = this.knownUsers.find(user => user.uuid == userId)

                if (!user) {
                    return cb({ error: "userNotFound" })
                }

                if (socketUser !== null) {
                    return cb({ error: "socketInUse" })
                } 

                user.setSocket(socket)

                socketUser = user

                const existingGame = this.games.find(game => game.isUnfinished() && game.players.some(player => player.uuid === user.uuid))

                cb({ userName: user.name, lobbyGames: this.getAllGameLobbyInfo(), existingGameId: existingGame?.uuid })
            })
        })
    }

    public static findGame(gameId: string) {
        return this.games.find(game => game.uuid === gameId) || null
    }

    public static createGame(gameProto: IGameProto, hostUser: User): MultiplayerGame | null {
        if (!MultiplayerGame.validateProto(gameProto)) return null

        const game = new MultiplayerGame(gameProto, hostUser, this.io)

        this.games.push(game)

        this.io.to(GameCoordinator.lobbyRoom).emit(LobbyMessageType.GameOpened, game.getLobbyInfo())

        return game
    }

    public static isUserInUnfinishedGame(user: User): boolean {
        return this.games.some(game => {
            return game.isUnfinished() && game.isUserInGame(user)
        })
    }

    public static isUserInActiveGame(user: User): boolean {
        return this.games.some(game => {
            return game.status === GameStatus.InProgress
        })
    }

    public static getAllGameLobbyInfo(): IGameLobbyInfo[] {
        return this.games.map(game => game.getLobbyInfo())
    }

    public static lobbyRoom = 'lobby'
}

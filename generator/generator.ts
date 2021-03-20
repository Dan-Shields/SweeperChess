import { Game } from '../src/game/Game.class'
import { State } from '../src/game/State.class'
import { IGameState } from '../src/types/game'

import { readFileSync } from 'fs'
import path from 'path'

const game = new Game(8,8)

game.loadFEN('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -')

const stockfishResultsText = readFileSync(path.join(__dirname, './stockfish_results.txt'))
const stockfishResults = stockfishResultsText.toString().split('\n').map(result => {
    const parts = result.split(': ')
    return {
        move: parts[0],
        result: parseInt(parts[1])
    }
})

const startDepth = 4

console.time('time taken:')
const positions = generationTest(startDepth, game.state)
console.timeEnd('time taken:')

console.log(positions)

function generationTest(depth: number, state: IGameState) {
    if (depth == 0) return 1

    let numPositions = 0

    const legalMoves = State.generateMoves(state, false, game.setup)

    legalMoves.forEach(move => {
        const postMoveState = State.executeMove(state, move)

        if (postMoveState !== null) {
            const newPositions = generationTest(depth - 1, postMoveState)
            numPositions += newPositions
            game.state = state

            if (depth == startDepth) {
                const stockfishResult = stockfishResults.find(result => result.move == move.toAlgebraic())
                if (stockfishResult) {
                    if (stockfishResult.result !== newPositions) {
                        console.log(`${move.toAlgebraic()}: ${newPositions} EXPECTED ${stockfishResult.result}`)
                    } else {
                        console.log(`${move.toAlgebraic()}: ${newPositions}`)
                    }
                } else {
                    console.log(`Move "${move.toAlgebraic()}" couldn't be found in stockfish`)
                }
            }
        }
    })

    return numPositions
}

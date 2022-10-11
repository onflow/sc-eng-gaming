import RockPaperScissorsGame from "../contracts/RockPaperScissorsGame.cdc"

/// Transaction to submit moves on behalf of players
/// int moves: 0 rock, 1 paper, 2 scissors
// TODO: Reconsider how we submit moves - I don't like that we have to enter NFT ids or enums here or client side
// When we are not testing it manually the 4 last parameters will just be moves: {UInt64: RockPaperScissorsGame.Moves}
// TODO: We'll want to consider how we can submit moves for async games (i.e. one player at a time)
transaction(matchID: UInt64, nftID1: UInt64, move1: UInt8, nftID2: UInt64, move2: UInt8) {
    
    let matchAdminActionsRef: &{RockPaperScissorsGame.MatchAdminActions}
    let moves: {UInt64: RockPaperScissorsGame.Moves}
    
    prepare(acct: AuthAccount) {
        // Borrow a reference to the GameAdmin resource
        let gameAdminRef = acct
            .borrow<&RockPaperScissorsGame.GameAdmin>(
                from: RockPaperScissorsGame.GameAdminStoragePath
            ) ?? panic("Could not borrow reference to GameAdmin!")
        // Get the Capability for the given matchID
        let matchAdminActionsCap: Capability<&{RockPaperScissorsGame.MatchAdminActions}> = gameAdminRef
            .matchAdminActionsCapabilities[matchID]
            ?? panic("Could not retrieve MatchPlayer capability for given matchID!")
        // Borrow a reference to the MathcAdminActions
        self.matchAdminActionsRef = matchAdminActionsCap.borrow() ?? panic("Can not borrow admin actions reference")

        // This is a clunky workaround for easy manual input of moves
        let player1Move = RockPaperScissorsGame.Moves(
            rawValue: move1
        )?? panic("Illegal move for player 1")
        let player2Move = RockPaperScissorsGame.Moves(
            rawValue: move2
        ) ?? panic("Illegal move for player 2")
        // Assign moves for each player's NFT
        self.moves = {
            nftID1: player1Move,
            nftID2: player2Move
        }
        log(self.moves)
    }

    execute {
        // Submit moves for the game
        self.matchAdminActionsRef.submitMoves(moves: self.moves)
    }
}

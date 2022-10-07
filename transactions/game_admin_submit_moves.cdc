import RockPaperScissorsGame from "../contracts/RockPaperScissorsGame.cdc"

/// Transaction to submit moves on behalf of players
// TODO: Reconsider how we submit moves - I don't like that we have to enter NFT ids or enums here or client side
transaction(matchID: UInt64, moves: {UInt64: RockPaperScissorsGame.Moves}) {
    
    let matchAdminActionsRef: &{RockPaperScissorsGame.MatchAdminActions}
    
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
        self.matchAdminActionsRef = matchAdminActionsCap.borrow()!
    }

    execute {
        // Submit moves for the game
        self.matchAdminActionsRef.submitMoves(moves: moves)
    }
}

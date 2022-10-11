import RockPaperScissorsGame from "../contracts/RockPaperScissorsGame.cdc"

/// Transaction to submit moves on behalf of players
// TODO: Reconsider how we submit moves - I don't like that we have to enter NFT ids or enums here or client side
// When we are not testing it manually the 4 last parameters will just be moves: {UInt64: RockPaperScissorsGame.Moves}
// int moves: 1 rock, 2 paper, 3 scissors
transaction(matchID: UInt64, nftID1: UInt64, move1: Int, nftID2: UInt64, move2: Int) {
    
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
        self.moves = {}

        switch (move1) {
            case 1:
                self.moves[nftID1] = RockPaperScissorsGame.Moves.rock
            case 2:
                self.moves[nftID1] = RockPaperScissorsGame.Moves.paper
            case 3:
                self.moves[nftID1] = RockPaperScissorsGame.Moves.scissors
            default:
                panic("That wasn't a legal move for player 1")
        }

        switch (move2) {
            case 1:
                self.moves[nftID2] = RockPaperScissorsGame.Moves.rock
            case 2:
                self.moves[nftID2] = RockPaperScissorsGame.Moves.paper
            case 3:
                self.moves[nftID2] = RockPaperScissorsGame.Moves.scissors
            default:
                panic("That wasn't a legal move for player 2")
        }

        log(self.moves)


    }

    execute {
        // Submit moves for the game
        self.matchAdminActionsRef.submitMoves(moves: self.moves)
    }
}

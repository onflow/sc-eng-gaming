import RockPaperScissorsGame from "../../../contracts/RockPaperScissorsGame.cdc"

/// Transaction to resolve a Match
///
transaction(matchID: UInt64) {
    
    let gamePlayerRef: &RockPaperScissorsGame.GamePlayer

    prepare(acct: AuthAccount) {
        // Get the GamePlayer reference from the signing account's storage
        self.gamePlayerRef = acct
            .borrow<&RockPaperScissorsGame.GamePlayer>(
                from: RockPaperScissorsGame.GamePlayerStoragePath
            ) ?? panic("Could not borrow GamePlayer reference!")
    }

    execute {
        // Submit moves for the game
        self.gamePlayerRef.resolveMatchByID(matchID)
    }
}
 
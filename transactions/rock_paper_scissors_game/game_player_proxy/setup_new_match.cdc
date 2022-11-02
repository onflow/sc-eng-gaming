import RockPaperScissorsGame from "../contracts/RockPaperScissorsGame.cdc"

/// Transaction that creates a new Match
///
transaction(playerOneAddr: Address, playerTwoAddr: Address, matchTimeLimitInMinutes: UInt) {
    
    let gameAdminRef: &RockPaperScissorsGame.GameAdmin
    let gamePlayerTwoPublicRef: &AnyResource{RockPaperScissorsGame.GamePlayerPublic}
    
    prepare(acct: AuthAccount) {
        // Borrow a reference to the GameAdmin resource
        self.gameAdminRef = acct
            .borrow<&RockPaperScissorsGame.GameAdmin>(
                from: RockPaperScissorsGame.GameAdminStoragePath
            ) ?? panic("Could not borrow reference to GameAdmin!")
        
        // Get each player's account
        let playerOneAccount = getAccount(playerOneAddr)
        let playerTwoAccount = getAccount(playerTwoAddr)

        // Make sure references are available for both accounts
        self.gamePlayerOnePublicRef = playerOneAccount
            .getCapability<&AnyResource{RockPaperScissorsGame.GamePlayerPublic}>(
                RockPaperScissorsGame.GamePlayerPublicPath
            ).borrow()
            ?? panic("GamePlayerPublic not accessible at address ".concat(playerOneAddr.toString()))
        self.gamePlayerTwoPublicRef = playerTwoAccount
            .getCapability<&AnyResource{RockPaperScissorsGame.GamePlayerPublic}>(
                RockPaperScissorsGame.GamePlayerPublicPath
            ).borrow()
            ?? panic("GamePlayerPublic not accessible at address ".concat(playerTwoAddr.toString()))
        
    }

    execute {
        // Create a match with the given timeLimit in minutes
        let newMatchID = self.gameAdminRef.createMatch(matchTimeLimit: UFix64(matchTimeLimitInMinutes) * UFix64(60000))
        // Then add the MatchPlayerActions for the match to each player's GamePlayer resource 
        // via the GamePlayerPublic reference
        self.gameAdminRef
            .addPlayerToMatch(
                matchID: newMatchID,
                gamePlayerRef: self.gamePlayerOnePublicRef
        )
        self.gameAdminRef
            .addPlayerToMatch(
            matchID: newMatchID,
            gamePlayerRef: self.gamePlayerTwoPublicRef
        )
    }
}

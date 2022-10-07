import RockPaperScissorsGame from "../contracts/RockPaperScissorsGame.cdc"

/// Transaction that sets up GameAdmin resource in signing account

transaction(playerOneAddr: Address, playerTwoAddr: Address) {
    
    let gameAdminRef: &RockPaperScissorsGame.GameAdmin
    let gamePlayerOnePublicRef: &AnyResource{RockPaperScissorsGame.GamePlayerPublic}
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
        // Create a match with a 5 minute timeout
        let newMatchID = self.gameAdminRef.createMatch(matchTimeout: UFix64(360000))
        // Then add the MatchPlayerActions for the match to each player's GamePlayer resource 
        // via the GamePlayerPublic referenc
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

import GamePieceNFT from "../../../contracts/GamePieceNFT.cdc"
import RockPaperScissorsGame from "../../../contracts/RockPaperScissorsGame.cdc"

/// Transaction that creates a new Match and adds the MatchLobbyActions
/// Capability to their GamePlayerPublic
///
transaction(submittingNFTID: UInt64, playerTwoAddr: Address, matchTimeLimitInMinutes: UInt) {
    
    let gamePlayerRef: &RockPaperScissorsGame.GamePlayer
    let gamePlayerTwoPublicRef: &AnyResource{RockPaperScissorsGame.GamePlayerPublic}
    
    prepare(acct: AuthAccount) {
        // Get a reference to the GamePlayer resource in the signing account's storage
        self.gamePlayerRef = acct
            .borrow<&RockPaperScissorsGame.GamePlayer>(
                from: RockPaperScissorsGame.GamePlayerStoragePath
            ) ?? panic("Could not borrow GamePlayer reference!")
        
        // Get the second player's account
        let playerTwoAccount = getAccount(playerTwoAddr)
        // Get the second player's GamePlayerPublic reference
        self.gamePlayerTwoPublicRef = playerTwoAccount
            .getCapability<&AnyResource{RockPaperScissorsGame.GamePlayerPublic}>(
                RockPaperScissorsGame.GamePlayerPublicPath
            ).borrow()
            ?? panic("GamePlayerPublic not accessible at address ".concat(playerTwoAddr.toString()))
    }

    execute {
        // Create a match with the given timeLimit in minutes
        let newMatchID = self.gamePlayerRef
            .createMatch(
                matchTimeLimit: UFix64(matchTimeLimitInMinutes) * UFix64(60000),
                nftID: submittingNFTID,
                receiverPath: GamePieceNFT.CollectionPublicPath
            )
        // Then add the MatchPlayerActions for the match to each player's GamePlayer resource 
        // via the GamePlayerPublic reference
        self.gamePlayerRef
            .addPlayerToMatch(
                matchID: newMatchID,
                gamePlayerRef: self.gamePlayerTwoPublicRef
            )
    }
}
 
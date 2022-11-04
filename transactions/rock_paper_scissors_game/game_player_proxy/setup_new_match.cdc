import GamePieceNFT from "../../../contracts/GamePieceNFT.cdc"
import RockPaperScissorsGame from "../../../contracts/RockPaperScissorsGame.cdc"

/// Transaction that creates a new Match and adds the MatchLobbyActions
/// Capability to their GamePlayerPublic
///
transaction(submittingNFTID: UInt64, playerTwoAddr: Address, matchTimeLimitInMinutes: UInt) {
    
    let gamePlayerProxyRef: &{RockPaperScissorsGame.GamePlayerProxy}
    let gamePlayerTwoPublicRef: &AnyResource{RockPaperScissorsGame.GamePlayerPublic}
    
    prepare(proxyAcct: AuthAccount) {
        // TODO - this will be replaced with AccountProxies.ProxyManagerPublicInterface.GetCapability(): &G
        //   when we settle the game contracts Capability interface & implement this cap-based proxy account model
        let gamePlayerReceiverRef = proxyAcct
            .borrow<&RockPaperScissorsGame.GamePlayerProxyReceiver>(
                from: RockPaperScissorsGame.GamePlayerProxyReceiverStoragePath
            ) ?? panic("Could not borrow GamePlayerProxyReceiver reference!")
        // Get a reference to GamePlayerProxy contained in the receiver
        self.gamePlayerProxyRef = gamePlayerReceiverRef.gamePlayerProxyCap!
            .borrow()
            ?? panic("Problem with GamePlayerProxy Capability in GamePlayerProxyReceiver!")
        
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
        let newMatchID = self.gamePlayerProxyRef.createMatch(
            matchTimeLimit: UFix64(matchTimeLimitInMinutes) * UFix64(60000),
            nftID: submittingNFTID,
            receiverPath: GamePieceNFT.CollectionPublicPath
        )
        // Then add the MatchPlayerActions for the match to each player's GamePlayer resource 
        // via the GamePlayerPublic reference
        self.gamePlayerProxyRef
            .addPlayerToMatch(
            matchID: newMatchID,
            gamePlayerRef: self.gamePlayerTwoPublicRef
        )
    }
}
 
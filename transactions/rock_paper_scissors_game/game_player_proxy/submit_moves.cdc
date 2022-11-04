import RockPaperScissorsGame from "../../../contracts/RockPaperScissorsGame.cdc"

/// Transaction to submit move using GamePlayerProxy
/// int moves: 0 rock, 1 paper, 2 scissors
///
transaction(matchID: UInt64, move: UInt8) {
    
    let gamePlayerProxyRef: &{RockPaperScissorsGame.GamePlayerProxy}
    let moveAsEnum: RockPaperScissorsGame.Moves
    
    prepare(proxyAcct: AuthAccount) {
        // TODO - this will be replaced with AccountProxies.ProxyManagerPublicInterface.GetCapability(): &G
        //   when we settle the game contracts Capability interface & implement this cap-based proxy account model
        let gamePlayerReceiverRef = proxyAcct
            .borrow<&RockPaperScissorsGame.GamePlayerProxyReceiver>(
                from: RockPaperScissorsGame.GamePlayerProxyReceiverStoragePath
            ) ?? panic("Could not borrow GamePlayerProxyReceiver reference!")
        // Get a reference to GamePlayerProxy contained in the receiver
        let gamePlayerProxyCap = gamePlayerReceiverRef.gamePlayerProxyCap
            ?? panic("Problem with GamePlayerProxy Capability in GamePlayerProxyReceiver!")
        self.gamePlayerProxyRef = gamePlayerProxyCap.borrow() ?? panic("Problem getting proxy cap")
        // Construct a legible move from the raw input value
        self.moveAsEnum = RockPaperScissorsGame.Moves(
            rawValue: move
        ) ?? panic("Given move does not map to a legal RockPaperScissorsGame.Moves value!")
    }

    execute {
        // Submit moves for the game
        self.gamePlayerProxyRef.submitMoveToMatch(matchID: matchID, move: self.moveAsEnum)
    }
}
 
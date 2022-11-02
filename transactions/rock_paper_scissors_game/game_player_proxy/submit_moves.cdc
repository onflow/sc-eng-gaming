import RockPaperScissorsGame from "../../../contracts/RockPaperScissorsGame.cdc"

/// Transaction to submit move using GamePlayerProxy
/// int moves: 0 rock, 1 paper, 2 scissors
///
transaction(matchID: UInt64, move: UInt8) {
    
    let gamePlayerProxyRef: &{RockPaperScissorsGame.GamePlayerProxy}
    let moveAsEnum: RockPaperScissorsGame.Moves
    
    prepare(proxyAcct: AuthAccount) {
        let gamePlayerReceiverRef = proxyAcct
            .borrow<&RockPaperScissorsGame.GamePlayerProxyReceiver>(
                from: RockPaperScissorsGame.GamePlayerProxyReceiverStoragePath
            ) ?? panic("Could not borrow GamePlayerProxyReceiver reference!")
        // Get a reference to GamePlayerProxy contained in the receiver
        self.gamePlayerProxyRef = gamePlayerReceiverRef.gamePlayerProxyCap
            .borrow()
            ?? panic("Problem with GamePlayerProxy Capability in GamePlayerProxyReceiver!")
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
 
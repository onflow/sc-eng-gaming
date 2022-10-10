import RockPaperScissorsGame from "../contracts/RockPaperScissorsGame.cdc"

/// ReturnsNFTs from escrow to their owners' Receiver
transaction(matchID: UInt64) {

    let matchPlayerActionsRef: &{RockPaperScissorsGame.MatchPlayerActions}
    
    prepare(acct: AuthAccount) {
        // Get the MatchPlayer reference from the GamePlayer resource
        let gamePlayerRef = acct
            .borrow<&RockPaperScissorsGame.GamePlayer>(from: RockPaperScissorsGame.GamePlayerStoragePath)
            ?? panic("Could not borrow GamePlayer reference!")
        let matchPlayerActionsCap: Capability<&{RockPaperScissorsGame.MatchPlayerActions}> = gamePlayerRef
            .matchPlayerCapabilities[matchID]
            ?? panic("Could not retrieve MatchPlayer capability for given matchID!")
        self.matchPlayerActionsRef = matchPlayerActionsCap.borrow()!

    }

    execute {
        // Escrow NFT to MatchPlayer
        self.matchPlayerActionsRef.returnPlayerNFTs()
    }
}

import NonFungibleToken from "../contracts/utility/NonFungibleToken.cdc"
import ScoreNFT from "../contracts/ScoreNFT.cdc"
import RockPaperScissorsGame from "../contracts/RockPaperScissorsGame.cdc"

/// Transaction that sets up GamePlayer resource in signing account
/// and exposes GamePlayerPublic capability so matches can be added
/// for the player to participate in
transaction(matchID: UInt64, withdrawID: UInt64) {

    let matchPlayerActionsRef: &{RockPaperScissorsGame.MatchPlayerActions}
    let receiverCap: Capability<&{NonFungibleToken.Receiver}>
    let withdrawRef: &ScoreNFT.Collection
    
    prepare(acct: AuthAccount) {
        // Get the MatchPlayer reference from the GamePlayer resource
        let gamePlayerRef = acct
            .borrow<&RockPaperScissorsGame.GamePlayer>(from: RockPaperScissorsGame.GamePlayerStoragePath)
            ?? panic("Could not borrow GamePlayer reference!")
        let matchPlayerActionsCap: Capability<&{RockPaperScissorsGame.MatchPlayerActions}> = gamePlayerRef
            .matchPlayerCapabilities[matchID]
            ?? panic("Could not retrieve MatchPlayer capability for given matchID!")
        self.matchPlayerActionsRef = matchPlayerActionsCap.borrow()!
        
        // Get the Receiver Capability
        // TODO: Want to check that capability exists
        self.receiverCap = acct
            .getCapability<&{NonFungibleToken.Receiver}>(
                ScoreNFT.CollectionPublicPath
            )

        // Get the reference to withdraw the NFT
        self.withdrawRef = acct
            .borrow<&ScoreNFT.Collection>(from: ScoreNFT.CollectionStoragePath)
            ?? panic("Account does not store an object at the specified path")
    }

    execute {
        // Escrow NFT to MatchPlayer
        let matchNFT <- self.withdrawRef.withdraw(withdrawID: withdrawID) as! @ScoreNFT.NFT
        self.matchPlayerActionsRef.escrowNFT(nft: <-matchNFT, receiver: self.receiverCap)
    }
}

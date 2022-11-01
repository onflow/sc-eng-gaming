import NonFungibleToken from "../../../contracts/utility/NonFungibleToken.cdc"
import GamePieceNFT from "../../../contracts/GamePieceNFT.cdc"
import RockPaperScissorsGame from "../../../contracts/RockPaperScissorsGame.cdc"

/// Transaction that sets up GamePlayer resource in signing account
/// and exposes GamePlayerPublic capability so matches can be added
/// for the player to participate in
///
transaction(matchID: UInt64, withdrawID: UInt64) {

    let matchPlayerActionsRef: &{RockPaperScissorsGame.MatchPlayerActions}
    let receiverCap: Capability<&{NonFungibleToken.Receiver}>
    let withdrawRef: &GamePieceNFT.Collection
    
    prepare(acct: AuthAccount) {
        // Get the MatchPlayer reference from the GamePlayer resource
        let gamePlayerRef = acct
            .borrow<&RockPaperScissorsGame.GamePlayer>(
                from: RockPaperScissorsGame.GamePlayerStoragePath
            ) ?? panic("Could not borrow GamePlayer reference!")
        let matchPlayerActionsCap: Capability<&{RockPaperScissorsGame.MatchPlayerActions}> = gamePlayerRef
            .matchPlayerCapabilities[matchID]
            ?? panic("Could not retrieve MatchPlayer capability for given matchID!")
        self.matchPlayerActionsRef = matchPlayerActionsCap.borrow()!
        
        // Get the Receiver Capability
        self.receiverCap = acct
            .getCapability<&{NonFungibleToken.Receiver}>(
                GamePieceNFT.CollectionPublicPath
            )

        // Get the reference to withdraw the NFT
        self.withdrawRef = acct
            .borrow<&GamePieceNFT.Collection>(from: GamePieceNFT.CollectionStoragePath)
            ?? panic("Account does not store an object at the specified path")
    }

    execute {
        // Escrow NFT to MatchPlayer
        let matchNFT <- self.withdrawRef.withdraw(withdrawID: withdrawID) as! @GamePieceNFT.NFT
        self.matchPlayerActionsRef.escrowNFT(nft: <-matchNFT, receiver: self.receiverCap)
    }
}

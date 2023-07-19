import "NonFungibleToken"
import "GamePieceNFT"
import "RockPaperScissorsGame"

/// Transaction escrows the specified GamePieceNFT to the specified
/// Match.id for which the signer has a MatchLobbyActions in their GamePlayer
///
transaction(matchID: UInt64, escrowNFTID: UInt64) {

    prepare(acct: AuthAccount) {
        // Get the GamePlayer reference from the signing account's storage
        let gamePlayerRef = acct.borrow<&RockPaperScissorsGame.GamePlayer>(
                from: RockPaperScissorsGame.GamePlayerStoragePath
            ) ?? panic("Could not borrow GamePlayer reference!")

        // Get the account's Receiver Capability
        let receiverCap = acct.getCapability<&{NonFungibleToken.Receiver}>(GamePieceNFT.CollectionPublicPath)
        
        // Get a reference to the account's Provider
        let providerRef = acct.borrow<&{NonFungibleToken.Provider}>(from: GamePieceNFT.CollectionStoragePath)
            ?? panic("Could not borrow reference to account's Provider")
        // Withdraw the desired NFT
        let nft <- providerRef.withdraw(withdrawID: escrowNFTID) as! @GamePieceNFT.NFT
        
        // Escrow NFT
        gamePlayerRef.depositNFTToMatchEscrow(nft: <-nft, matchID: matchID, receiverCap: receiverCap)
    }
}
 
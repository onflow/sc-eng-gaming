import GamePieceNFT from "../../contracts/GamePieceNFT.cdc"
import GamingMetadataViews from "../../contracts/GamingMetadataViews.cdc"
import RockPaperScissorsGame from "../../contracts/RockPaperScissorsGame.cdc"

/// Script to get the GameAttachmentsView from GamePieceNFT, revealing all game-related 
/// attachments and their associated game contract's info
///
pub fun main(address: Address, id: UInt64): GamingMetadataViews.GameAttachmentsView? {
    let account = getAccount(address)

    // Borrow ResolverCollection reference
    let collectionPublicRef = account
        .getCapability(GamePieceNFT.CollectionPublicPath)
        .borrow<&{GamePieceNFT.GamePieceNFTCollectionPublic}>()
        ?? panic("Could not borrow a reference to the collection at path: ".concat(GamePieceNFT.CollectionPublicPath.toString()))

    // Get the NFT reference if it exists in the reference collection
    if let nftRef: &GamePieceNFT.NFT = collectionPublicRef.borrowGamePieceNFT(id: id) {
        // Get the GameAttachmentsView from the NFT & return
        return nftRef
            .resolveView(
                Type<GamingMetadataViews.AssignedMovesView>()
            ) as! GamingMetadataViews.GameAttachmentsView?
    }

    // Otherwise return nil
    return nil
}
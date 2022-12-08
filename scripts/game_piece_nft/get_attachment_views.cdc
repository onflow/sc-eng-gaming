import GamePieceNFT from "../../contracts/GamePieceNFT.cdc"
import GamingMetadataViews from "../../contracts/GamingMetadataViews.cdc"
import RockPaperScissorsGame from "../../contracts/RockPaperScissorsGame.cdc"

/// Script to get the views supported by the attachments on a given NFT via mapping
/// containing the View Types indexed on the Type of attachment that supports them
///
pub fun main(address: Address, id: UInt64): {Type: [Type]}? {
    let account = getAccount(address)

    // Borrow ResolverCollection reference
    let collectionPublicRef = account
        .getCapability(GamePieceNFT.CollectionPublicPath)
        .borrow<&{GamePieceNFT.GamePieceNFTCollectionPublic}>()
        ?? panic("Could not borrow a reference to the collection at path: ".concat(GamePieceNFT.CollectionPublicPath.toString()))

    // Get the NFT reference if it exists in the reference collection
    if let nftRef: &GamePieceNFT.NFT = collectionPublicRef.borrowGamePieceNFT(id: id) {
        // Get the views supported by the NFT's attachments
        return nftRef.getAttachmentViews()
    }

    // Otherwise return nil
    return nil
}
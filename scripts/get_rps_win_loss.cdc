import GamePieceNFT from "../contracts/GamePieceNFT.cdc"
import GamingMetadataViews from "../contracts/GamingMetadataViews.cdc"
import RockPaperScissorsGame from "../contracts/RockPaperScissorsGame.cdc"

/// Script to get the RockPaperScissors BasicWinLoss data from a given address's NFT
///
pub fun main(address: Address, id: UInt64): GamingMetadataViews.BasicWinLoss? {
    let account = getAccount(address)

    // Borrow ResolverCollection reference
    let collectionPublicRef = account
        .getCapability(GamePieceNFT.CollectionPublicPath)
        .borrow<&{GamePieceNFT.GamePieceNFTCollectionPublic}>()
        ?? panic("Could not borrow a reference to the collection")

    // Get the NFT reference if it exists in the reference collection
    if let nftRef: &GamePieceNFT.NFT = collectionPublicRef.borrowGamePieceNFT(id: id) {
        // Attempt to get the RPSWinLossRetriever attachment
        if let attachmentRef = nftRef.getAttachmentRef(Type<@RockPaperScissorsGame.RPSWinLossRetriever>()) {
            // Cast returned AnyResource as RPSWinLossRetriever & return the 
            // BasicWinLoss value for given NFT
            let retrieverRef = attachmentRef as! &RockPaperScissorsGame.RPSWinLossRetriever
            return retrieverRef.getWinLossData()
        }
    }

    // Otherwise return nil
    return nil
}
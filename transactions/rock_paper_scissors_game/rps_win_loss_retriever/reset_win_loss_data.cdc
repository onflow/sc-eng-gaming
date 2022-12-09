import GamePieceNFT from "../../../contracts/GamePieceNFT.cdc"
import GamingMetadataViews from "../../../contracts/GamingMetadataViews.cdc"
import RockPaperScissorsGame from "../../../contracts/RockPaperScissorsGame.cdc"

/// This transaction resets the win/loss record for the NFT with the specified id
///
transaction(nftID: UInt64) {

    prepare(account: AuthAccount) {
        // Borrow ResolverCollection reference
        let collectionRef = account
            .borrow<&{GamePieceNFT.GamePieceNFTCollectionPublic}>(
                from: GamePieceNFT.CollectionStoragePath
            ) ?? panic("Could not borrow a reference to the collection at path: ".concat(GamePieceNFT.CollectionStoragePath.toString()))

        // Get the NFT reference if it exists in the reference collection
        if let nftRef = collectionRef.borrowGamePieceNFT(id: nftID) {
            // Attempt to get the RPSWinLossRetriever attachment
            if let attachmentRef = nftRef.getAttachmentRef(Type<@RockPaperScissorsGame.RPSWinLossRetriever>()) {
                // Cast returned AnyResource as RPSWinLossRetriever & return the 
                // BasicWinLoss value for given NFT
                let retrieverRef = attachmentRef as! &RockPaperScissorsGame.RPSWinLossRetriever
                retrieverRef.resetWinLossData()
            }
        }
    }
}

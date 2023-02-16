import NonFungibleToken from "../../contracts/utility/NonFungibleToken.cdc"
import GamePieceNFT from "../../contracts/GamePieceNFT.cdc"
import RockPaperScissorsGame from "../../contracts/RockPaperScissorsGame.cdc"

/// Transaction that removes attachment from the desired NFT.
///
transaction(fromNFT: UInt64, attachmentType: Type) {
    
    prepare(signer: AuthAccount) {

        // Get a reference to the signer's GamePieceNFT.Collection
        let collectionRef = signer
            .borrow<&
                GamePieceNFT.Collection
            >(
                from: GamePieceNFT.CollectionStoragePath
            ) ?? panic("Could now borrow reference to user's Collection!")
        // If the attachment exists on the NFT, remove & destroy it
        if let nftAttachment <-collectionRef.removeAttachmentFromNFT(
            nftID: fromNFT,
            attachmentType: attachmentType
        ) {
            destroy nftAttachment
        }
    }
}
 
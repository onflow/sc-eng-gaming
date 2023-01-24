import NonFungibleToken from "../../contracts/utility/NonFungibleToken.cdc"
import GamePieceNFT from "../../contracts/GamePieceNFT.cdc"
import RockPaperScissorsGame from "../../contracts/RockPaperScissorsGame.cdc"

/// Transaction that removes RockPaperScissorsGame related attachments from the desired NFT
///
transaction(fromNFT: UInt64) {
    
    prepare(signer: AuthAccount) {

        // Get a reference to the signer's GamePieceNFT.Collection
        let collectionRef = signer
            .borrow<&
                GamePieceNFT.Collection
            >(
                from: GamePieceNFT.CollectionStoragePath
            ) ?? panic("Could now borrow reference to user's Collection!")
        // Get base NFT
        let nft <- collectionRef.withdraw(withdrawID: fromNFT)

        // Remove attachments type by stating its static type (a requirement for attaching
        // or removing native attachments)
        if nft[RockPaperScissorsGame.RPSWinLossRetriever] != nil {
            remove RockPaperScissorsGame.RPSWinLossRetriever from nft
        }
        if nft[RockPaperScissorsGame.RPSAssignedMoves] != nil {
            remove RockPaperScissorsGame.RPSAssignedMoves from nft
        }

        // Deposit the NFT back to the signer's Collection, now without the attachments
        collectionRef.deposit(token: <-nft)
    }
}
 
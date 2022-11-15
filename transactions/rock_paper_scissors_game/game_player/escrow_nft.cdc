import NonFungibleToken from "../../../contracts/utility/NonFungibleToken.cdc"
import GamePieceNFT from "../../../contracts/GamePieceNFT.cdc"
import RockPaperScissorsGame from "../../../contracts/RockPaperScissorsGame.cdc"

/// TODO: UPDATE ID TO USE REF
/// Transaction that sets up GamePlayer resource in signing account
/// and exposes GamePlayerPublic capability so matches can be added
/// for the player to participate in
///
transaction(matchID: UInt64, escrowNFTID: UInt64) {

    prepare(acct: AuthAccount) {
        // Get the GamePlayer reference from the signing account's storage
        let gamePlayerRef = acct
            .borrow<&RockPaperScissorsGame.GamePlayer>(
                from: RockPaperScissorsGame.GamePlayerStoragePath
            ) ?? panic("Could not borrow GamePlayer reference!")

        let receiverCap = acct.getCapability<&
                AnyResource{NonFungibleToken.Receiver}
            >(GamePieceNFT.CollectionPublicPath)
        
        // Escrow NFT
        gamePlayerRef
            .depositNFTToMatchEscrow(
                nftID: escrowNFTID,
                matchID: matchID,
                receiverCap: receiverCap
            )
    }
}
 
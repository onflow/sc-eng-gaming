import NonFungibleToken from "../../../contracts/utility/NonFungibleToken.cdc"
import GamePieceNFT from "../../../contracts/GamePieceNFT.cdc"
import RockPaperScissorsGame from "../../../contracts/RockPaperScissorsGame.cdc"

/// Transaction that sets up GamePlayer resource in signing account
/// and exposes GamePlayerPublic capability so matches can be added
/// for the player to participate in
///
transaction(matchID: UInt64, escrowNFTID: UInt64) {
    
    let gamePlayerProxyRef: &{RockPaperScissorsGame.GamePlayerProxy}

    prepare(proxyAcct: AuthAccount) {
        // Get the MatchPlayer reference from the GamePlayer resource
        let gamePlayerReceiverRef = proxyAcct
            .borrow<&RockPaperScissorsGame.GamePlayerProxyReceiver>(
                from: RockPaperScissorsGame.GamePlayerProxyReceiverStoragePath
            ) ?? panic("Could not borrow GamePlayer reference!")
        // Get a reference to GamePlayerProxy contained in the receiver
        self.gamePlayerProxyRef = gamePlayerReceiverRef.gamePlayerProxyCap
            .borrow()
            ?? panic("Problem with GamePlayerProxy Capability in GamePlayerProxyReceiver!")
    }

    execute {
        // Escrow NFT
        self.gamePlayerProxyRef.depositNFTToMatchEscrow(
            nftID: escrowNFTID,
            matchID: matchID,
            receiverPath: GamePieceNFT.CollectionPublicPath
        )
    }
}
 
import GamePieceNFT from "../contracts/GamePieceNFT.cdc"
import MetadataViews from "../contracts/utility/MetadataViews.cdc"
import GamingMetadataViews from "../contracts/GamingMetadataViews.cdc"
import RockPaperScissorsGame from "../contracts/RockPaperScissorsGame.cdc"

/// Script to get the RockPaperScissors BasicWinLoss data from a given address's NFT
///
pub fun main(address: Address, id: UInt64): GamingMetadataViews.BasicWinLoss? {
    let account = getAccount(address)

    // Borrow ResolverCollection reference
    let resolverCollectionRef = account
        .getCapability(GamePieceNFT.CollectionPublicPath)
        .borrow<&{MetadataViews.ResolverCollection}>()
        ?? panic("Could not borrow a reference to the collection")

    // Borrow Resolver reference from ResolverCollection for given NFT.id
    let viewResolver = resolverCollectionRef.borrowViewResolver(id: id)

    // If the WinLossView exists for the given viewResolver, check for winLoss data
    if let wlView: GamingMetadataViews.WinLossView = GamingMetadataViews.getBasicWinLossView(
        viewResolver: viewResolver
    ) {
        return wlView.getBasicWinLoss(gameName: "RockPaperScissors")
    }
    // Otherwise return nil
    return nil
}
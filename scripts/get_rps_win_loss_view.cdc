import ScoreNFT from "../contracts/ScoreNFT.cdc"
import MetadataViews from "../contracts/utility/MetadataViews.cdc"
import GamingMetadataViews from "../contracts/GamingMetadataViews.cdc"
import RockPaperScissorsGame from "../contracts/RockPaperScissorsGame.cdc"


/// Script to get the RockPaperScissors WinLoss data from a given address's NFT
pub fun main(address: Address, id: UInt64): GamingMetadataViews.WinLoss? {
    let account = getAccount(address)

    let resolverCollectionRef = account
        .getCapability(ScoreNFT.CollectionPublicPath)
        .borrow<&{MetadataViews.ResolverCollection}>()
        ?? panic("Could not borrow a reference to the collection")

    let viewResolver = resolverCollectionRef.borrowViewResolver(id: id)

    // If the WinLossView exists for the given viewResolver, check for winLoss data
    if let wlView: GamingMetadataViews.WinLossView = GamingMetadataViews
        .getWinLossView(viewResolver: viewResolver) {
        if wlView.winLossRetrievers.containsKey(RockPaperScissorsGame.name) {
            // Since the WinLossRetriever is stored as AnyStruct in ScoreNFT, we need
            // to cast the result
            let winLossRetriever: RockPaperScissorsGame.WinLossRetriever = wlView.getWinLossRetriever(name: RockPaperScissorsGame.name)! as! RockPaperScissorsGame.WinLossRetriever
            return winLossRetriever!.retrieveWinLoss(id: id)
        }
        return nil
    }
    // Otherwise return nil
    return nil
    
}
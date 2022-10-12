import ScoreNFT from "../contracts/ScoreNFT.cdc"
import MetadataViews from "../contracts/utility/MetadataViews.cdc"
import GamingMetadataViews from "../contracts/GamingMetadataViews.cdc"
import RockPaperScissorsGame from "../contracts/RockPaperScissorsGame.cdc"


/// WIP
pub fun main(address: Address, id: UInt64): GamingMetadataViews.WinLoss {
    let account = getAccount(address)

    let resolverCollectionRef = account
        .getCapability(ScoreNFT.CollectionPublicPath)
        .borrow<&{MetadataViews.ResolverCollection}>()
        ?? panic("Could not borrow a reference to the collection")

    let viewResolver = resolverCollectionRef.borrowViewResolver(id: id)
        

    let wlView = GamingMetadataViews.getWinLossView(viewResolver : viewResolver) ?? 
        panic("Can not borrow WinLossView from NFT")
    
    let winLossRetriever = wlView.winLossRetrievers[RockPaperScissorsGame.name] as! RockPaperScissorsGame.WinLossRetriever 
    
    return winLossRetriever.retrieveWinLoss(id: id) ?? panic("No WinLoss records for this NFT")
}
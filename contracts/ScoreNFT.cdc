import GamingMetadataViews from "./GamingMetadataViews.cdc"


// Then, in the NFT contract, the NFT can just store the dictionary
// of the winLossRetrievers and return it via the metadata view
// The function to add a new retriever can just be public so that 
// we don't have to do any complicated access(contract) things
// and creating a new metadata updater resource.
// Since it is public, any game that the user deposits their NFT
// into can add their win/loss retriever function to it
// and games can implement their escrow mechanics in any way they want
// instead of having to be constrained to what is in here
pub contract ScoreNFT {

    pub resource NFT: NonFungibleToken.INFT, MetadataViews.Resolver{
        pub let id: UInt64

		/// maps the name of the game to its win/loss retriever function
        pub let winLossRetrievers: {String: ((UInt64): GamingMetadataViews.WinLoss)}

		/// When a user deposits their NFT into a game session,
		/// the game can add their retriever to the NFT
        pub fun addWinLossRetriever(gameName: String, retriever: ((UInt64): GamingMetadataViews.WinLoss)) {
			// make sure the name is not already in use
		    // There might be a better way to key the dictionary than by a string Name
            self.winLossRetrievers[gameName] = retriever
        }
        pub fun getViews(): [Type] {
            return [GamingMetadataViews.WinLossView]
        }

		pub fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<GamingMetadataViews.WinLossView>():
					return GamingMetadataViews.WinLossView()			
                default:
                    return nil
            }
        }
    }
}
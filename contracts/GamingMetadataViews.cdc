import MetadataViews from "./utility/MetadataViews.cdc"

/// GamingMetadataViews
///
/// This contract is an initial implementation of gaming related
/// win/loss metadata and mechanisms to retrieve win/loss records
/// from games in which the NFT was played.
/// 
pub contract GamingMetadataViews {

    /// Interface that should be implemented by game contracts
    /// which returns BasicWinLoss data of given NFT.id
    /// The implementing resource expose a capability which
    /// is added to the escrowed NFT so that the BasicWinloss
    /// stored on the game contract can be retrieved by the NFT
    ///
    pub resource interface BasicWinLossRetriever {
        
        /// Retrieves the BasicWinLoss for a given NFT
        ///
        /// @param nftID: The id of the NFT the caller is attempting to
        /// retrieve a BasicWinLoss for
        ///
        pub fun getWinLossData(nftID: UInt64): BasicWinLoss?
    }

    /// Struct that contains attributes and methods relevant to win/loss/tie
    /// record and mechanisms to increment such values
    ///
    pub struct BasicWinLoss {
        /// The name of the associated game
        pub let gameName: String

        /// The id of the associated NFT
        pub let nftID: UInt64
   
        /// Aggregate game results
        pub var wins: UInt64
        pub var losses: UInt64
        pub var ties: UInt64

        init (game: String, nftID: UInt64){
            self.gameName = game
            self.nftID = nftID
            self.wins = 0
            self.losses = 0
            self.ties = 0
        }

        /** --- Value Incrementers --- */
        ///
        /// Below are methods to increment and decrement win/loss/ties
        /// aggregate values.

        pub fun addWin () {
            self.wins = self.wins + 1
        }

        pub fun addLoss () {
            self.losses = self.losses + 1
        }

        pub fun addTie () {
            self.ties = self.ties + 1
        }

        pub fun subtractWin() {
            pre {
                self.wins > 0: "Cannot set wins below 0!"
            }
            self.wins = self.wins + 1
        }

        pub fun subtractLoss() {
            pre {
                self.losses > 0: "Cannot set losses below 0!"
            }
            self.losses = self.losses - 1
        }

        pub fun subtractTie() {
            pre {
                self.ties > 0: "Cannot set ties below 0!"
            }
            self.ties = self.ties - 1
        }
    }

    /// A struct which contains a mapping of game names to the games associated
    /// implementation of BasicWinLossRetriever
    ///
    pub struct WinLossView {

        /// Maintain associated NFT.id so we can easily return BasicWinLoss
        pub let nftID: UInt64
        /// Dictionary mapping game name to BasicWinLossRetriever Capability
        pub let retrieverCaps: {String: Capability<&AnyResource{BasicWinLossRetriever}>}

        init (id: UInt64, _ retrieverCaps: {String: Capability<&AnyResource{BasicWinLossRetriever}>}) {
            self.nftID = id
            self.retrieverCaps = retrieverCaps
        }

        /// This function retrieves the BasicWinLoss value for the given game name by 
        /// accessing the game's BasicWinLossRetriever Capability from the retrieverCaps
        /// mapping and calling getWinlossData() for this WinLossView's associate NFT id.
        ///
        /// @param gameName: The name of the game to which the retriever is indexed
        ///
        /// @return The BasicWinLoss for the nft in the given gameName or nil if none was found
        ///
        pub fun getBasicWinLoss(gameName: String): BasicWinLoss? {
            if let gameCap: Capability<&AnyResource{BasicWinLossRetriever}> = self.retrieverCaps[gameName] {
                if let gameCapRef: &AnyResource{BasicWinLossRetriever} = gameCap.borrow() {
                    return gameCapRef.getWinLossData(nftID: self.nftID)
                }
            }
            return nil
        }
    }

    /// A struct which contains an NFT's game moves
    ///
    pub struct MovesView {
        /// The NFT's id    
        pub let nftID: UInt64
        /// Mapping of game names to array of AnyStruct as generic game moves
        pub var moves: {String: [AnyStruct]}

        init(id: UInt64, _ moves: {String: [AnyStruct]}) {
            self.nftID = id
            self.moves = moves
        }
    }

    /// TODO: Implement in RockPaperScissorsGame along with these attributes & a resolver impl
    /// A standard struct containing basic metadata about a game
    ///
    pub struct GameContractMetadata {
        pub let name: String
        pub let description: String
        pub let icon: AnyStruct{MetadataViews.File}
        pub let thumbnail: AnyStruct{MetadataViews.File}
        pub let contractAddress: Address
        pub let externalURL: MetadataViews.ExternalURL
        
        init(
            name: String,
            description: String,
            icon: AnyStruct{MetadataViews.File},
            thumbnail: AnyStruct{MetadataViews.File},
            contractAddress: Address,
            externalURL: MetadataViews.ExternalURL
        ) {
            self.name = name
            self.description = description
            self.icon = icon
            self.thumbnail = thumbnail
            self.contractAddress = contractAddress
            self.externalURL = externalURL
        }
    }

    /// Helper to get a Win/Loss view in a type-safe way
    ///
    /// @param viewResolver: A reference to the resolver resource
    ///
    /// @return A WinLossView structure
    ///
    pub fun getBasicWinLossView(viewResolver: &{MetadataViews.Resolver}): WinLossView? {
        let maybeWinLossView = viewResolver.resolveView(Type<WinLossView>())
        if let winLossView = maybeWinLossView {
            return winLossView as! WinLossView
        }
        return nil
    }

}
 
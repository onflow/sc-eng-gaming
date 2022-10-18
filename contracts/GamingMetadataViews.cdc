import MetadataViews from "./utility/MetadataViews.cdc"

pub contract GamingMetadataViews {

    /// Interface that should be implemented by game contracts
    /// which returns BasicWinLoss data of given NFT.id
    /// The implementing resource expose a capability which
    /// is added to the escrowed NFT so that the BasicWinloss
    /// stored on the game contract can be retrieved by the NFT
    pub resource interface BasicWinLossRetriever {
        /// Returns a WinLoss if one exists for the given NFT.id
        pub fun getWinLossData(nftID: UInt64): BasicWinLoss?
    }

    /// Struct that represents the win/loss record for a given NFT in a game
    pub struct BasicWinLoss {
        /// name of the game
        pub let gameName: String

        /// id of the NFT
        pub let nftID: UInt64
   
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

    pub struct WinLossView {
        /// We can store any number of functions that link
        /// to the individual gaming contracts' records of win/loss
        /// for their games
        /// Maintain associated NFT.id so we can easily return BasicWinLoss
        pub let nftID: UInt64
        /// Dictionary mapping game name to BasicWinLossRetriever Capability
        pub let retrieverCaps: {String: Capability<&AnyResource{BasicWinLossRetriever}>}

        init (id: UInt64, _ retrieverCaps: {String: Capability<&AnyResource{BasicWinLossRetriever}>}) {
            self.nftID = id
            self.retrieverCaps = retrieverCaps
        }

        pub fun getBasicWinLoss(name: String): BasicWinLoss? {
            if let gameCap: Capability<&AnyResource{BasicWinLossRetriever}> = self.retrieverCaps[name] {
                if let gameCapRef: &AnyResource{BasicWinLossRetriever} = gameCap.borrow() {
                    return gameCapRef.getWinLossData(nftID: self.nftID)
                }
            }
            return nil
        }
    }

    /// Helper to get a Win/Loss view in a type-safe way
    ///
    /// @param viewResolver: A reference to the resolver resource
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
 
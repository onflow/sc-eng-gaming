import MetadataViews from "./utility/MetadataViews.cdc"

pub contract GamingMetadataViews {

	/// Struct that represents the win/loss record for a given NFT in a game
    pub struct WinLoss {
        /// name of the game
        pub let game: String

		/// id of the NFT
		pub let nftID: UInt64
   
        pub var wins: UInt64
        pub var losses: UInt64
        pub var ties: UInt64

        /// I'm sure that games will want to have much more complex ways
        /// of categorizing win/loss, but this is just a simple example
        /// This needs more research

        init (game: String, nftID: UInt64){
            self.game = game
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

    }

    pub struct WinLossView {
        /// We can store any number of functions that link
		/// to the individual gaming contracts' records of win/loss
        /// for their games
		/// Dictionary mapping game name to function that returns a WinLoss struct
		pub let winLossRetrievers: {String: AnyStruct}

        init (_ retrievers: {String: AnyStruct}) {
            self.winLossRetrievers = retrievers
        }

        pub fun getWinLossRetriever(name: String): AnyStruct? {
            return self.winLossRetrievers[name]
        }
    }

    /// Helper to get a Win/Loss view in a type-safe way
    ///
    /// @param viewResolver: A reference to the resolver resource
    /// @return A WinLossView structure
    ///
    pub fun getWinLossView(viewResolver: &{MetadataViews.Resolver}): WinLossView? {
        let maybeWinLossView = viewResolver.resolveView(Type<WinLossView>())
        if let winLossView = maybeWinLossView {
            return winLossView as! WinLossView
        }
        return nil
    }

}
 
pub contract GamingMetadataViews {

	/// Struct that represents the win/loss record for a given NFT in a game
    ///
    /// I'm sure that games will want to have much more complex ways
    /// of categorizing win/loss, but this is just a simple example
    /// This needs more research
    pub struct WinLoss {
        /// name of the game
        pub let game: String

		/// id of the NFT
		pub let nftID: UInt64
   
        /// Win & loss records
        access(self) var wins: UInt64
        access(self) var losses: UInt64

        // Add a win to the NFT's record
        pub fun addWin () {
            self.wins = self.wins + 1
        }
        
        // Add a loss to the NFT's record
        pub fun addLoss () {
            self.losses = self.losses + 1
        }

        pub fun getWins(): UInt64 {
            return self.wins
        }

        pub fun getLosses(): UInt64 {
            return self.losses
        }

        init (game: String, nftID: UInt64){
            self.game = game
            self.nftID = nftID
            self.wins = 0
            self.losses = 0
        }  
    }

    pub struct TotalWinLoss {
        /// id of the NFT
		pub let nftID: UInt64
        pub let winLossRetrievers: {String: ((UInt64): WinLoss?)}

        pub fun getGameWinLoss(gameName: String): WinLoss? {
            if let retriever: ((UInt64): WinLoss?) = self.winLossRetrievers[gameName] {
                return retriever(id: self.nftID)
            }
            return nil
        }
        
        init(id: UInt64, _ retrievers: {String: ((UInt64): WinLoss?)}) {
            self.nftID = id
            self.winLossRetrievers = retrievers
        }
    }
}
 
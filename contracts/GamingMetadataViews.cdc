pub contract GamingMetadataViews {

	/// Struct that represents the win/loss record for a given NFT in a game
    pub struct WinLoss {
        /// name of the game
        pub let game: String

		/// id of the NFT
		pub let nftID: UInt64
   
        pub var wins: UInt64
        pub var losses: UInt64

        /// I'm sure that games will want to have much more complex ways
        /// of categorizing win/loss, but this is just a simple example
        /// This needs more research

        init (game: String, nftID: UInt64){
            self.game = game
            self.nftID = nftID
            self.wins = 0
            self.losses = 0
        }

        pub fun addWin () {
            self.wins = self.wins + 1
        }

        pub fun addLoss () {
            self.losses = self.losses + 1
        }

    }

    pub struct WinLossView {
        /// We can store any number of functions that link
		/// to the individual gaming contracts' records of win/loss
        /// for their games
		/// Dictionary mapping game name to function that returns a WinLoss struct
        pub let nftID: UInt64
		pub let winLossRetrievers: {String: ((UInt64): WinLoss)}

        init (id: UInt64, retrievers: {String: ((UInt64): WinLoss)}) {
            self.nftID = id
            self.winLossRetrievers = retrievers
        }
    }

}
 
/// This contract contains resource interfaces designed to be used as
/// attachments to gaming NFTs
///
pub contract GameAttachments {

    /// A resource interface defining an attachment representative of a simple
    /// win/loss record that could live locally on an NFT as an attachment
    ///
    pub resource interface WinLoss {
        /** --- Game record variables --- */
        access(contract) var wins: UInt64
        access(contract) var losses: UInt64
        access(contract) var ties: UInt64
        
        /** --- Getter methods --- */
        pub fun getWins(): UInt64
        pub fun getLosses(): UInt64
        pub fun getTies(): UInt64
    }

    /// An encapsulated resource containing an array of generic moves
    /// and a getter method for those moves
    ///
    pub resource interface AssignedMoves {
        /// Array designed to contain an array of generic moves
        access(contract) let moves: [AnyStruct]
        /// Getter method returning an generic AnyStruct array
        pub fun getMoves(): [AnyStruct]
        access(contract) fun addMoves(newMoves: [AnyStruct])
        access(contract) fun removeMove(targetIdx: Int): AnyStruct?
    }

}
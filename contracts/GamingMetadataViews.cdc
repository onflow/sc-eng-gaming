import MetadataViews from "./utility/MetadataViews.cdc"

/// GamingMetadataViews
///
/// This contract is an initial implementation of gaming related
/// win/loss metadata and mechanisms to retrieve win/loss records
/// from games in which the NFT was played.
/// 
pub contract GamingMetadataViews {

    /// A struct defining metadata relevant to a game
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

        pub fun reset() {
            self.wins = 0
            self.losses = 0
            self.ties = 0
        }
    }

    /// Interface that should be implemented by game contracts
    /// which returns BasicWinLoss data of given NFT.id
    /// The implementing resource expose a capability which
    /// is added to the escrowed NFT so that the BasicWinLoss
    /// stored on the game contract can be retrieved by the NFT
    ///
    pub resource interface BasicWinLossRetriever {
        
        /// Retrieves the BasicWinLoss for a given NFT
        ///
        /// @param nftID: The id of the NFT the caller is attempting to
        /// retrieve a BasicWinLoss for
        ///
        pub fun getWinLossData(): BasicWinLoss?

        /// Allows the owner to reset the WinLoss records of the NFT where this is attached
        ///
        pub fun resetWinLossData()
    }

    /// A resource interface defining an attachment representative of a simple
    /// win/loss record that could live locally on an NFT as an attachment
    ///
    pub resource interface WinLoss {
        pub let gameContractInfo: GameContractMetadata
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
        pub let gameContractInfo: GameContractMetadata
        /// Array designed to contain an array of generic moves
        access(contract) let moves: [AnyStruct]
        /// Getter method returning an generic AnyStruct array
        pub fun getMoves(): [AnyStruct]
        access(contract) fun addMoves(newMoves: [AnyStruct])
        access(contract) fun removeMove(targetIdx: Int): AnyStruct?
    }
}
 
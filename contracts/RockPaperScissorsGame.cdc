import FungibleToken from "./utility/FungibleToken.cdc"
import ExampleToken from "./utility/ExampleToken.cdc"
import GamePieceNFT from "./GamePieceNFT.cdc"
import GamingMetadataViews from "./GamingMetadataViews.cdc"
import NonFungibleToken from "./utility/NonFungibleToken.cdc"

/// TODO: Top level comment
///
/// RockPaperScissorsGame
///
/// Contract defines the logic of a game of Rock Paper Scissors
/// and resources to support gameplay between two players
/// mediated by an administrative Capability as well as 
/// resources to receive and maintain player and admin
/// Capabilities.
///
/// Gameplay occurs through Match resources in which players
/// must escrow their GamePieceNFTs for the length of the Match
/// or until the Match timeLimit is reached. New Matches are stored
/// in this contract's account storage to provide a neutral party
/// in which NFTs are escrowed. MatchAdminActions allow
/// for submission of moves on behalf of players while
/// MatchPlayerActions allow players to escrow NFTs and request
/// that escrowed NFTs be returned.
///
/// To maintain the player's Capabilities, the GamePlayer
/// resource is included in this contract. GamePlayers can create new
/// Matches, but must escrow a GamePieceNFT to do so (to limit spam).
///
/// This contract is designed to be built upon by others in a composable
/// manner, so please create your own Matches, combine logic and Moves
/// from this game contract with other game contracts in other Matches
/// and tournaments, and get creative to build a thriving community of
/// composable games on Flow!
///
pub contract RockPaperScissorsGame {

    /// Simple enum to identify moves
    pub enum Moves: UInt8 {
        pub case rock
        pub case paper
        pub case scissors
    }

    /// Set canonical paths for easy storage of resources in transactions
    pub let GamePlayerStoragePath: StoragePath
    pub let GamePlayerPublicPath: PublicPath
    /// Contract Admin paths
    pub let ContractAdminStoragePath: StoragePath
    pub let ContractAdminPrivatePath: PrivatePath
    /// Set base path as strings - will be concatenated with matchID they apply to
    pub let MatchStorageBasePathString: String
    pub let MatchPrivateBasePathString: String
    /// Canonical paths for RPSWinLossRetriever resource
    pub let RPSWinLossRetrieverStoragePath: StoragePath
    pub let RPSWinLossRetrieverPrivatePath: PrivatePath
    /// Path for the GameRegistrationTicket
    pub let GameRegistrationTicketStoragePath: StoragePath
    pub let GameRegistrationTicketPrivatePath: PrivatePath

    /// Name of the game
    pub let name: String
    /// Field that stores win/loss records for every NFT that has played this game
    access(contract) let winLossRecords: {UInt64: GamingMetadataViews.BasicWinLoss}

    /// Maintain history of completed Matches
    access(contract) let completedMatchIDs: [UInt64]

    /// Capability granted by GamePieceNFT to amend NFT metadata
    access(contract) var gameRegistrationTicketCap: Capability<&GamePieceNFT.GameRegistrationTicket>?

    /// Relevant events to watch
    pub event NewMatchCreated(gameName: String, matchID: UInt64, creatorID: UInt64)
    pub event PlayerSignedUpForMatch(gameName: String, matchID: UInt64, addedPlayerID: UInt64)
    pub event PlayerAddedToMatch(gameName: String, matchID: UInt64, addedPlayerID: UInt64)
    pub event PlayerNFTEscrowed(gameName: String, matchID: UInt64, nftID: UInt64, numberOfNFTsInEscrow: UInt8)
    pub event MoveSubmitted(gameName: String, matchID: UInt64, totalRoundMovesSubmitted: UInt8)
    pub event MatchOver(gameName: String, matchID: UInt64, winningGamePlayer: UInt64?, winningNFTID: UInt64?, returnedNFTIDs: [UInt64])

    /** --- WinLossRetreiver Implementation --- */
    /// Resource acts as a retriever for an NFT's WinLoss data
    pub resource RPSWinLossRetriever: GamingMetadataViews.BasicWinLossRetriever {

        /// Retriever for winloss data to be added to deposited NFTs metadata retrievers
        ///
        /// @param nftID: the id of the NFT for which GamingMetadataViews.BasicWinLoss
        /// is indexed in RockPaperScissorsGame.winLossRecords
        ///
        /// @return the GamingMetadataViews.BasicWinLoss for the given nft.id or
        /// nil if it does not exist in the mapping of winLossRecords
        ///
        pub fun getWinLossData(nftID: UInt64): GamingMetadataViews.BasicWinLoss? {
            return RockPaperScissorsGame.winLossRecords[nftID]
        }
    }

    /** --- Interface to expose Player Capabilities --- */

    pub resource interface MatchLobbyActions {
        pub let id: UInt64
        pub fun escrowNFTToMatch(
            nft: @GamePieceNFT.NFT,
            receiver: Capability<&{NonFungibleToken.Receiver}>,
            playerID: UInt64
        ): Capability<&{MatchPlayerActions}>
        pub fun returnPlayerNFTs(): [UInt64]
    }

    /// Interface exposing the player type of actions for a Match
    ///
    /// Through MatchPlayerActions, player NFTs can be escrowed and
    /// a call can be made for NFTs to be returned to their owners
    ///
    pub resource interface MatchPlayerActions {
        pub let id: UInt64
        pub var winningNFTID: UInt64?
        pub var winningPlayerID: UInt64?
        pub fun getNFTGameMoves(forPlayerID: UInt64): [Moves]
        pub fun submitMove(move: Moves, gamePlayerIDRef: &{GamePlayerID})
        pub fun returnPlayerNFTs(): [UInt64]
    }

    /// Resource defining a Match as a single round of Rock Paper Scissors
    /// between two players who must first escrow their NFTs in the
    /// Match before play can begin
    ///
    pub resource Match : MatchLobbyActions, MatchPlayerActions, GamePieceNFT.NFTEscrow {
        /// The id of the Match is used to derive the path at which it's stored
        /// in this contract account's storage and to index associated Capabilities.
        /// It is also helpful for watching related Match events.
        pub let id: UInt64
        
        /// Match timeLimit parameters defining how long the Match can escrow
        /// player NFTs before they exercise their right to have them returned.
        pub let createdTimestamp: UFix64
        pub let timeLimit: UFix64

        /// Defines whether match is still in play or not
        pub var inPlay: Bool

        /// GamePieceNFT Capability to custody NFTs during gameplay
        pub let escrowedNFTs: @{UInt64: GamePieceNFT.NFT}
        /// Track NFT associate with GamePlayer
        pub let gamePlayerIDToNFTID: {UInt64: UInt64}
        /// Keep Receiver Capabilities to easily return NFTs
        pub let nftReceivers: {UInt64: Capability<&{NonFungibleToken.Receiver}>}

        /// Define the allowable Moves in this Match
        pub let allowedMoves: [Moves]
        /// Maintain number of moves submitted
        pub let submittedMoves: {UInt64: Moves}

        /// Maintain ids of winning nft and GamePlayer ids
        pub var winningNFTID: UInt64?
        pub var winningPlayerID: UInt64?

        init(matchTimeLimit: UFix64) {
            pre {
                matchTimeLimit <= UFix64(86400000): "matchTimeLimit must be less than a day (86400000 ms)"
            }
            self.id = self.uuid
            self.inPlay = true
            self.createdTimestamp = getCurrentBlock().timestamp
            self.timeLimit = matchTimeLimit
            self.escrowedNFTs <- {}
            self.nftReceivers = {}
            self.gamePlayerIDToNFTID = {}
            self.allowedMoves = [
                RockPaperScissorsGame.Moves.paper,
                RockPaperScissorsGame.Moves.rock,
                RockPaperScissorsGame.Moves.scissors
            ]
            self.submittedMoves = {}
            self.winningNFTID = nil
            self.winningPlayerID = nil
        }

        /** --- MatchLobbyActions ---*/

        /// Allows for an NFT to be deposited to escrow, returning a Capability
        /// that enables the holder to engage in gameplay
        ///
        /// @param nft: The NFT to be escrowed into the Match
        /// @param receiver: The Receiver to which the NFT will be returned
        /// after the Match is over
        /// @param playerID: The GamePlayer.id of the depositing player
        ///
        /// @return MatchPlayerActions Capability for this Match
        ///
        pub fun escrowNFTToMatch(
            nft: @GamePieceNFT.NFT,
            receiver: Capability<&{NonFungibleToken.Receiver}>,
            playerID: UInt64
        ): Capability<&{MatchPlayerActions}> {
            pre {
                !self.gamePlayerIDToNFTID.keys.contains(playerID):
                    "Player has already joined this Match!"
                self.escrowedNFTs.length < 2:
                    "Both players have adready escrowed their NFTs, Match is full!"
                self.inPlay == true:
                    "Match is over!"
            }

            // Get MatchPlayerActions Capability from contract account's storage
            let matchPrivatePath = RockPaperScissorsGame.getMatchPrivatePath(self.id)!
            let matchPlayerActionsCap = RockPaperScissorsGame.account
                .getCapability<&{
                    MatchPlayerActions
                }>(
                    matchPrivatePath
                )
            assert(
                matchPlayerActionsCap.check(),
                message: "Problem retrieving Match's MatchPlayerActions Capability!"
            )

            let nftID: UInt64 = nft.id

            // Call the GamePieceNFT.NFTEscrow.escrowNFT() implementation
            self.escrowNFT(nft: <-nft, receiverCap: receiver)

            // Maintain association of this NFT with the depositing GamePlayer
            self.gamePlayerIDToNFTID.insert(key: playerID, nftID)

            emit PlayerNFTEscrowed(
                gameName: RockPaperScissorsGame.name,
                matchID: self.id,
                nftID: nftID,
                numberOfNFTsInEscrow: UInt8(self.escrowedNFTs.length)
            )

            if let escrowedNFTRef = &self.escrowedNFTs[nftID] as &GamePieceNFT.NFT? {
                let nftMoves: [RockPaperScissorsGame.Moves] = escrowedNFTRef.getGameMoves(gameName: RockPaperScissorsGame.name) as! [Moves]
                // Assert that the NFT has the necessary game moves to play the game
                assert(
                    nftMoves != nil,
                    message: "Moves not correctly added to escrowed NFT!"
                )
                for i, m in nftMoves {
                    assert(
                        self.allowedMoves.contains(m) &&
                        nftMoves.contains(self.allowedMoves[i]),
                        message: "NFT contains moves that are not allowed in this Match!"       
                    )
                }
                // return MatchPlayerActions Capability
                return matchPlayerActionsCap
            }
            panic("Could not get reference to escrowed NFT")
        }

        /** --- GamePieceNFT.NFTEscrow --- */

        /// This method allows players to escrow their NFTs for gameplay so that the
        /// contract can add associated Metadata to the NFT and add the NFT's id into
        /// the historical mapping of GamingMetadataViews.BasicWinLoss data
        ///
        /// @param nft: The player's NFT they want to escrow for the Match
        /// @param receiver: The Receiver to which the NFT will be deposited after the Match
        /// has resolved
        ///
        pub fun escrowNFT(
            nft: @GamePieceNFT.NFT,
            receiverCap: Capability<&{NonFungibleToken.Receiver}>
        ) {
            let nftID = nft.id
            // Ensure the NFT has a way to retrieve win/loss data with a GamingMetadataViews.BasicWinLossRetriever
            // Check for existing retrievers for this game is done on the side of the NFT contract
            let winLossRetrieverCap: Capability<&{GamingMetadataViews.BasicWinLossRetriever}> = RockPaperScissorsGame
                .getWinLossRetrieverCapability()
            nft.addWinLossRetriever(gameName: RockPaperScissorsGame.name, retrieverCap: winLossRetrieverCap)

            // Insert GamingMetadataViews.BasicWinLoss for this game
            // Check for existing record occurs in function definition
            RockPaperScissorsGame.insertWinLossRecord(nftID: nftID)

            // Then store player's NFT & Receiver
            self.escrowedNFTs[nftID] <-! nft
            self.nftReceivers.insert(key: nftID, receiverCap)

            // Add the allowed Moves to this NFT
            self.addMovesToNFT(
                nftID: nftID,
                regTicketCap: RockPaperScissorsGame.gameRegistrationTicketCap!,
                newMoves: self.allowedMoves
            )
        }

        /** --- MatchPlayerActions --- */

        /// Allows the caller to retrieve the moves assigned to the NFT
        /// deposited by the given GamePlayer.id
        pub fun getNFTGameMoves(forPlayerID: UInt64): [Moves] {
            pre {
                self.gamePlayerIDToNFTID[forPlayerID] != nil: 
                    "Player does not have an NFT in this Match!"
            }

            // Get a reference to their escrowed NFT
            let playerNFTID = self.gamePlayerIDToNFTID[forPlayerID]!
            if let nftRef = &self.escrowedNFTs[playerNFTID] as &GamePieceNFT.NFT? {
                // Check that there are moves associated with given NFT.id
                if let moves = nftRef.getGameMoves(gameName: RockPaperScissorsGame.name) as! [Moves]? {
                    return moves
                }
                panic("No moves associated with this game are assigned to player's NFT!")
            }
            panic("Could not get reference to player's NFT!")
        }

        /// Function allows for MatchAdminActions to submit moves on behalf of players.
        /// Doing so determines the winner with the given moves, updates the BasicWinLossRecord
        /// for the associated NFT.id and returns the escrowed NFTs to their owners.
        ///
        /// @param moves: a mapping of nft.id to Moves (rock, paper, or scissors)
        /// with the expectation that there are exactly two entries
        ///
        pub fun submitMove(move: Moves, gamePlayerIDRef: &{GamePlayerID}) {
            pre {
                self.escrowedNFTs.length == 2: 
                    "Both players must escrow NFTs before play begins!"
                self.gamePlayerIDToNFTID.keys.contains(gamePlayerIDRef.id):
                    "Player is not associated with this Match!"
                !self.submittedMoves.keys.contains(gamePlayerIDRef.id):
                    "Player has already submitted move for this Match!"
                self.submittedMoves.length < 2:
                    "Both moves have already been submitted for this Match!"
                self.inPlay == true:
                    "Match is not in play any longer!"
            }

            // Add the move to the mapping of submitted moves indexed by the
            // submitting player's GamePlayerID.id
            self.submittedMoves.insert(key: gamePlayerIDRef.id, move)

            // If this is the second of 2 moves, resolve the Match
            if self.submittedMoves.length == 2 {

                // Determine the ids of winning GamePlayer.id & NFT.id
                self.winningPlayerID = RockPaperScissorsGame
                    .determineRockPaperScissorsWinner(
                        moves: self.submittedMoves
                    )
                if self.winningPlayerID != nil {
                    self.winningNFTID = self.gamePlayerIDToNFTID[self.winningPlayerID!]!
                }
                // Ammend NFTs win/loss
                for nftID in self.escrowedNFTs.keys {
                    RockPaperScissorsGame.updateWinLossRecord(
                        nftID: nftID,
                        winner: self.winningNFTID
                    )
                }
                // Mark the Match as no longer in play
                self.inPlay = false
                // Return the escrowed NFTs to the depositing players
                let returnedNFTIDs = self.returnPlayerNFTs()
                // Add the Match.id to the contract's list of completed Matches
                RockPaperScissorsGame.completedMatchIDs.append(self.id)
                // Announce the Match results
                emit MatchOver(
                    gameName: RockPaperScissorsGame.name,
                    matchID: self.id,
                    winningGamePlayer: self.winningPlayerID,
                    winningNFTID: self.winningNFTID,
                    returnedNFTIDs: returnedNFTIDs
                )
            }
        }

        /// Can be called by any interface if there's a timeLimit or assets weren't returned
        /// for some reason
        ///
        /// @return An array containing the nft.ids of all NFTs returned to their owners
        ///
        pub fun returnPlayerNFTs(): [UInt64] {
            pre {
                getCurrentBlock().timestamp >= self.createdTimestamp + self.timeLimit ||
                self.inPlay == false: "Cannot return NFTs while Match is still in play!"
            }

            let returnedNFTs: [UInt64] = []
            // Written so that issues with one player's Receiver won't affect the return of
            // any other player's NFT
            for id in self.nftReceivers.keys {
                if let receiverCap: Capability<&{NonFungibleToken.Receiver}> = self.nftReceivers[id] {
                    if let receiverRef = receiverCap.borrow() {
                        // We know we have the proper Receiver reference, so we'll now move the token & deposit
                        if let token: @GamePieceNFT.NFT <- self.escrowedNFTs.remove(key: id)  {
                            receiverRef.deposit(token: <- token)
                            returnedNFTs.append(id)
                        }
                    }
                }
            }
            // Add the id of this Match to the history of completed Matches
            // as long as all it does not contain NFTs
            if self.escrowedNFTs.length == 0 {
                RockPaperScissorsGame.completedMatchIDs.append(self.id)
            }
            // Return an array containing ids of the successfully returned NFTs
            return returnedNFTs
        }
        
        /// Custom destroyer to prevent destroying escrowed NFTs
        destroy() {
            pre {
                self.escrowedNFTs.length == 0:
                    "Cannot destroy while NFTs in escrow!"
                getCurrentBlock().timestamp >= self.createdTimestamp + self.timeLimit ||
                self.inPlay == false: 
                    "Cannot destroy while Match is still in play!"
            }
            destroy self.escrowedNFTs
        }
    }

    /// A simple interface a player would use to demonstrate that they are
    /// the given ID
    pub resource interface GamePlayerID {
        pub let id: UInt64
    }

    /// Public interface allowing others to add GamePlayer to matches. Of course, there is
    /// no obligation for matches to be played, but this makes it so that other players
    /// each other to a Match
    ///
    pub resource interface GamePlayerPublic {
        pub let id: UInt64
        pub fun addMatchLobbyActionsCapability(
            matchID: UInt64,
            _ cap: Capability<&{MatchLobbyActions}>
        )
    }

    /// Interface defining a Capability that would enable a proxy account given
    /// this Capability to act on behalf of the GamePlayer
    ///
    pub resource interface GamePlayerProxy {
        pub fun getMatchLobbyCaps(): {UInt64: Capability<&{MatchLobbyActions}>}
        pub fun getMatchPlayerCaps(): {UInt64: Capability<&{MatchPlayerActions}>}
        pub fun createMatch(
            matchTimeLimit: UFix64,
            nftID: UInt64,
            receiverPath: PublicPath
        ): UInt64
        pub fun signUpForMatch(matchID: UInt64)
        pub fun depositNFTToMatchEscrow(
            nftID: UInt64,
            matchID: UInt64,
            receiverPath: PublicPath
        )
        pub fun getAvailableMoves(matchID: UInt64): [Moves]
        pub fun submitMoveToMatch(matchID: UInt64, move: Moves)
        pub fun addPlayerToMatch(
            matchID: UInt64,
            gamePlayerRef: &AnyResource{GamePlayerPublic}
        )
    }

    /** --- Receiver for Match Capabilities --- */

    /// Resource that maintains all the player's MatchPlayerActions capabilities
    /// Players can add themselves to games or be added if they expose GamePlayerPublic
    /// capability
    ///
    pub resource GamePlayer : GamePlayerPublic, GamePlayerProxy, GamePlayerID {
        pub let id: UInt64
        access(self) let matchLobbyCapabilities: {UInt64: Capability<&{MatchLobbyActions}>}
        access(self) let matchPlayerCapabilities: {UInt64: Capability<&{MatchPlayerActions}>}
        access(self) var nftProviderCapability: Capability<&{NonFungibleToken.Provider}>

        init(_ providerCap: Capability<&{NonFungibleToken.Provider}>) {
            self.id = self.uuid
            self.matchPlayerCapabilities = {}
            self.matchLobbyCapabilities = {}
            self.nftProviderCapability = providerCap
        }
        
        /** --- GamePlayer --- */

        /// Allows GamePlayer to delete capabilities from their mapping to free up space used
        /// by old matches.
        ///
        /// @param matchID: The id for the MatchPlayerActions Capability that the GamePlayer 
        /// would like to delete from their matchPlayerCapabilities
        ///
        pub fun deletePlayerActionsCapability(matchID: UInt64) {
            self.matchPlayerCapabilities.remove(key: matchID)
        }

        /// Allows the Provider Capability to be updated
        ///
        /// @param newCap: The Capability that will become the GamePlayer's new 
        /// nftCollectionCapability
        ///
        pub fun updateNFTProviderCapability(newCap: Capability<&{NonFungibleToken.Provider}>) {
            self.nftProviderCapability = newCap
        }

        pub fun getGamePlayerIDRef(): &{GamePlayerID} {
            return &self as &{GamePlayerID}
        }

        /** --- GamePlayerProxy --- */

        /// Simple getter for mapping of MatchLobbyActions Capabilities
        ///
        /// @return mapping of Match.id to MatchLobbyActions Capabilities
        ///
        pub fun getMatchLobbyCaps(): {UInt64: Capability<&{MatchLobbyActions}>} {
            return self.matchLobbyCapabilities
        }

        /// Simple getter for mapping of MatchPlayerActions Capabilities
        ///
        /// @return mapping of Match.id to MatchPlayerActions Capabilities
        ///
        pub fun getMatchPlayerCaps(): {UInt64: Capability<&{MatchPlayerActions}>} {
            return self.matchPlayerCapabilities
        }

        /// Creates a new Match resource, saving it in the contract account's storage
        /// and linking MatchPlayerActions at a dynamic path derived with the Match.id.
        /// Creating a match requires an NFT and Receiver Capability to mitigate spam
        /// vector where an attacker creates an exorbitant number of Matches.
        ///
        /// @param matchTimeLimit: Time before players have right to retrieve their
        /// escrowed NFTs
        /// 
        /// @return: Match.id of the newly created Match
        ///
        pub fun createMatch(
            matchTimeLimit: UFix64,
            nftID: UInt64,
            receiverPath: PublicPath
        ): UInt64 {
            pre {
                self.nftProviderCapability.check():
                    "GamePlayer does not have NFT.Provider configured!"
            }
            // Create the new match & preserve its ID
            let newMatch <- create Match(matchTimeLimit: matchTimeLimit)
            let newMatchID = newMatch.id
            
            // Derive paths using matchID
            let matchStoragePath = RockPaperScissorsGame.getMatchStoragePath(newMatchID)!
            let matchPrivatePath = RockPaperScissorsGame.getMatchPrivatePath(newMatchID)!
            
            // Save the match to game contract account's storage
            RockPaperScissorsGame.account.save(<-newMatch, to: matchStoragePath)
            
            // Link each Capability to game contract account's private
            RockPaperScissorsGame.account.link<&{
                MatchLobbyActions,
                MatchPlayerActions
            }>(
                matchPrivatePath,
                target: matchStoragePath
            )

            // Get the MatchLobbyActions Capability we just linked
            let lobbyCap = RockPaperScissorsGame.account
                .getCapability<&{
                    MatchLobbyActions
                }>(
                    matchPrivatePath
                )
            // Add that Capability to the GamePlayer's mapping
            self.matchLobbyCapabilities[newMatchID] = lobbyCap

            // Deposit the specified NFT to the new Match & return the Match.id
            self.depositNFTToMatchEscrow(nftID: nftID, matchID: newMatchID, receiverPath: receiverPath)
            return newMatchID
        }

        /// Allows for GamePlayer to sign up for a match that already exists. Doing so retrieves the 
        /// MatchPlayerActions Capability from the contract account's private storage and add
        /// it to the GamePlayers mapping of Capabilities.
        ///
        /// @param matchID: The id of the Match for which they want to retrieve the
        /// MatchPlayerActions Capability
        ///
        pub fun signUpForMatch(matchID: UInt64) {
            // Derive path to capability
            let matchPrivatePath = PrivatePath(identifier: RockPaperScissorsGame
                .MatchPrivateBasePathString.concat(matchID.toString()))!
            // Get the Capability
            let matchPlayerActionsCap = RockPaperScissorsGame.account
                .getCapability<&{MatchPlayerActions}>(matchPrivatePath)

            // Ensure Capability is not nil
            assert(
                matchPlayerActionsCap.check(),
                message: "Not able to retrieve MatchPlayerActions Capability for given matchID!"
            )

            // Add it to the mapping
            self.matchPlayerCapabilities.insert(key: matchID, matchPlayerActionsCap)

            emit PlayerSignedUpForMatch(gameName: RockPaperScissorsGame.name, matchID: matchID, addedPlayerID: self.id)
        }

        /// Allows for NFTs to be taken from GamePlayer's Collection and escrowed into the given Match.id
        /// using the MatchPlayerActions Capability already in their mapping
        ///
        /// @param nftID: The id of the NFT to be escrowed
        /// @param matchID: The id of the Match into which the NFT will be escrowed
        ///
        pub fun depositNFTToMatchEscrow(
            nftID: UInt64,
            matchID: UInt64,
            receiverPath: PublicPath
        ) {
            pre {
                self.nftProviderCapability.check():
                    "GamePlayer does not have NFT.Provider configured!"
                self.matchLobbyCapabilities.keys.contains(matchID) &&
                !self.matchPlayerCapabilities.keys.contains(matchID):
                    "GamePlayer does not have the Capability to play this Match!"
            }
            post {
                self.matchPlayerCapabilities.keys.contains(matchID):
                    "MatchPlayerActions Capability not successfully added!"
                !self.matchLobbyCapabilities.keys.contains(matchID) &&
                self.matchPlayerCapabilities.keys.contains(matchID):
                    "GamePlayer does not have the Capability to play this Match!"
            }
            // Retrieve the Receiver Capability from this resource owner's account
            if let ownerAccount = self.owner {
                // Note, we could have passed this in via arguments, but that could have exposed the user to
                // a malicious proxy including a Receiver Capability to another account's Collection, meaning
                // the user would lose their NFT. This way we enable the moving of resources (NFT -> Match)
                // via Capabilities and know that the NFT will be returned to the correct Collection
                let receiverCap = ownerAccount
                    .getCapability<&AnyResource{NonFungibleToken.Receiver}>(receiverPath)
                
                // Ensure the Capability is valid
                assert(
                    receiverCap.check(),
                    message: "Could not access Receiver Capability at the given path for this account!"
                )

                // Get a reference to the Provider from which the NFT will be withdrawn
                let providerRef = self.nftProviderCapability
                    .borrow()
                    ?? panic("Couldn't borrow reference to Provider! Update & try again.")
                
                // Get the MatchPlayerActions Capability from this GamePlayer's mapping
                let matchLobbyCap: Capability<&{MatchLobbyActions}> = self.matchLobbyCapabilities[matchID]!
                let matchLobbyActionsRef = matchLobbyCap
                    .borrow()
                    ?? panic("Could not borrow reference to MatchPlayerActions")

                // Withdraw the given NFT
                let nft <- providerRef.withdraw(withdrawID: nftID) as! @GamePieceNFT.NFT
                // Escrow the NFT to the Match, getting back a Capability
                let playerActionsCap: Capability<&{MatchPlayerActions}> = matchLobbyActionsRef
                    .escrowNFTToMatch(
                        nft: <-nft,
                        receiver: receiverCap,
                        playerID: self.id
                    )
                // Add that Capability to the GamePlayer's mapping & remove from
                // mapping of MatchLobbyCapabilities
                self.matchPlayerCapabilities.insert(key: matchID, playerActionsCap)
                self.matchLobbyCapabilities.remove(key: matchID)
            }
            panic("Could not find receiver at owner's provided receiverPath")
        }

        /// Getter for the GamePlayer's available moves assigned to their escrowed NFT
        ///
        /// @param matchID: Match.id for which they are querying
        ///
        /// @return the Moves assigned to their escrowed NFT
        ///
        pub fun getAvailableMoves(matchID: UInt64): [Moves] {
            pre {
                self.matchPlayerCapabilities[matchID] != nil:
                    "Player is not engaged with the given Match"
                self.matchPlayerCapabilities[matchID]!.check():
                    "Problem with MatchPlayerMoves Capability for given Match.id!"
            }
            let matchCap = self.matchPlayerCapabilities[matchID]!
            return matchCap.borrow()!.getNFTGameMoves(forPlayerID: self.id)
        }

        /// Allows the GamePlayer to submit a move to the provided Match.id
        ///
        /// @param matchID: Match.id of the Match into which the move will be submited
        /// @param move: The move to be played
        ///
        pub fun submitMoveToMatch(matchID: UInt64, move: Moves) {
            pre {
                self.matchPlayerCapabilities.keys.contains(matchID):
                    "Player does not have the ability to play this Match!"
                self.matchPlayerCapabilities[matchID]!.check():
                    "Problem with the MatchPlayerActions Capability for given Match!"
            }
            let matchRef = self.matchPlayerCapabilities[matchID]!.borrow()!
            let gamePlayerIDRef = self.getGamePlayerIDRef()
            matchRef.submitMove(move: move, gamePlayerIDRef: gamePlayerIDRef)
        }

        /// Adds the referenced GamePlayer to the Match defined by the given Match.id by retrieving
        /// the associated Match's MatchPlayerActions Capability and passing it as a parameter to
        /// GamePlayerPublic.addMatchPlayerActionsCapability() along with the Match.id
        ///
        /// @param matchID: The id of the associated Match
        /// @param gamePlayerRef: Reference to GamePlayerPublic that will receive
        /// a MatchPlayerResource Capability
        ///
        pub fun addPlayerToMatch(matchID: UInt64, gamePlayerRef: &AnyResource{GamePlayerPublic}) {
            // Derive match's private path from matchID
            let matchPrivatePath = RockPaperScissorsGame.getMatchPrivatePath(matchID)!
            // Get the capability
            let matchLobbyActionsCap: Capability<&AnyResource{MatchLobbyActions}> = RockPaperScissorsGame.account
                .getCapability<&{MatchLobbyActions}>(matchPrivatePath)

            // Ensure we actually got the Capability we need
            assert(
                matchLobbyActionsCap.check(),
                message: "Not able to retrieve MatchPlayerActions Capability for given matchID"
            )

            // Add it to the player's matchPlayerCapabilities
            gamePlayerRef.addMatchLobbyActionsCapability(matchID: matchID, matchLobbyActionsCap)
        }

        /** --- GamePlayerPublic --- */

        /// Allows others to add MatchPlayerActions Capabilities to their mapping for ease of Match setup.
        ///
        /// @param matchID: The id associated with the MatchPlayerActions the GamePlayer is being given access
        /// @param cap: The MatchPlayerActions Capability for which the GamePlayer is being given access
        ///
        pub fun addMatchLobbyActionsCapability(matchID: UInt64, _ cap: Capability<&{MatchLobbyActions}>) {
            pre {
                !self.matchLobbyCapabilities.containsKey(matchID) && !self.matchPlayerCapabilities.containsKey(matchID):
                    "Player already has capability for this Match!"
            }
            post {
                self.matchLobbyCapabilities.containsKey(matchID): "Capability for match has not been saved into player"
            }

            self.matchLobbyCapabilities.insert(key: matchID, cap)
            // Event that could be used to notify player they were added
            emit PlayerAddedToMatch(gameName: RockPaperScissorsGame.name, matchID: matchID, addedPlayerID: self.id)
        }
    }

    /// Administrator resource that manages the game's registration with GamePieceNFT
    pub resource ContractAdmin {

        /// A function that registers the game name with GamePieceNFT, assigning
        /// the GameRegistrationTicket Capability to the contract
        ///
        /// @param feeVault: ExampleToken.Vault containing the fee required to register
        ///
        pub fun registerGameWithGamePieceNFT(feeVault: @ExampleToken.Vault) {
            post {
                RockPaperScissorsGame.gameRegistrationTicketCap != nil:
                    "Problem registering with GamePieceNFT - GameRegistrationTicket was not updated!"
            }

            // Downcast the given vault
            let ftVault <- feeVault as @FungibleToken.Vault

            // Register, receiving a GameRegistrationTicket in return
            let registrationTicket: @GamePieceNFT.GameRegistrationTicket <- GamePieceNFT
                .registerGameName(
                    gameName: RockPaperScissorsGame.name,
                    registrationFee: <-ftVault
                )

            // Save & link the resource
            RockPaperScissorsGame.account.save(<-registrationTicket, to: RockPaperScissorsGame.GameRegistrationTicketStoragePath)
            RockPaperScissorsGame.account.link<&GamePieceNFT.GameRegistrationTicket>(
                RockPaperScissorsGame.GameRegistrationTicketPrivatePath,
                target: RockPaperScissorsGame.GameRegistrationTicketStoragePath
            )
            // Get the Capability to the resource & assign to the contract
            RockPaperScissorsGame.gameRegistrationTicketCap = RockPaperScissorsGame.account
                .getCapability<&GamePieceNFT.GameRegistrationTicket>(
                    RockPaperScissorsGame.GameRegistrationTicketPrivatePath
                )
        }

        /// Allows the ContractAdmin to update the GameRegistrationTicket Capability
        ///
        /// @param cap: The Capability that will be replacing the old one in the contract
        ///
        pub fun updateGameRegistrationTicketCapability(_ cap: Capability<&GamePieceNFT.GameRegistrationTicket>) {
            pre {
                cap.check(): "Problem with given Capability!"
            }
            RockPaperScissorsGame.gameRegistrationTicketCap = cap
        }
    }

    /** --- Contract helper functions --- */

    /// Create a GamePlayer resource
    ///
    /// @return a fresh GamePlayer resource
    ///
    pub fun createGamePlayer(providerCap: Capability<&{NonFungibleToken.Provider}>): @GamePlayer {
        return <- create GamePlayer(providerCap)
    }

    /// Method to determine outcome of a RockPaperScissors with given moves
    /// Exposing game logic allows for some degree of composability with other
    /// games and match types
    ///
    /// @param moves: a mapping of GamePlayer.id to Moves (rock, paper, or scissors)
    /// with the expectation that there are exactly two entries
    ///
    /// @return the id of the winning GamePlayer or nil if result is a tie
    ///
    pub fun determineRockPaperScissorsWinner(moves: {UInt64: Moves}): UInt64? {
        pre {
            moves.length == 2: "RockPaperScissors requires two moves"
        }
        
        let player1 = moves.keys[0]
        let player2 = moves.keys[1]

        // Choose one move to compare against other
        switch moves[player1]! {
            case RockPaperScissorsGame.Moves.rock:
                if moves[player2] == RockPaperScissorsGame.Moves.paper {
                    return player2
                } else if moves[player2] == RockPaperScissorsGame.Moves.scissors {
                    return player1
                }
            case RockPaperScissorsGame.Moves.paper:
                if moves[player2] == RockPaperScissorsGame.Moves.rock {
                    return player1
                } else if moves[player2] == RockPaperScissorsGame.Moves.scissors {
                    return player2
                }
            case RockPaperScissorsGame.Moves.scissors:
                if moves[player2] == RockPaperScissorsGame.Moves.rock {
                    return player2
                } else if moves[player2] == RockPaperScissorsGame.Moves.paper {
                    return player1
                }
        }
        // If they played the same move, it's a tie -> return nil
        return nil
    }

    /// Getter method for winLossRecords
    ///
    /// @return A Mapping of GamingMetadataViews.BasicWinLoss struct defining the
    /// total win/loss/tie record of the nft.id on which it's indexed
    ///
    pub fun getTotalWinLossRecords(): {UInt64: GamingMetadataViews.BasicWinLoss} {
        return self.winLossRecords
    }

    /// Allows the public to clean up Matches that are no longer necessary, 
    /// helping to reduce contract's use of storage
    ///
    pub fun destroyCompletedMatches(): [UInt64] {
        
        let destroyedMatchIDs: [UInt64] = []
        // Iterate through completedMatchIDs
        for matchID in self.completedMatchIDs {
            
            // Derive the StoragePath of the Match with given id
            if let matchStoragePath = RockPaperScissorsGame.getMatchStoragePath(matchID) {
                
                // Load and destroy the Match
                let completedMatch <- self.account.load<@Match>(from: matchStoragePath)
                destroy completedMatch
                
                // Remove the id of the destroyed Match, adding to array
                // maintaining destroyed IDs
                destroyedMatchIDs.append(self.completedMatchIDs.removeFirst())
            }
        }
        // Return the IDs of the destroyed Matches
        return destroyedMatchIDs
    }
    
    /// Returns a Capability for GamingMetadataViews.BasicWinLossRetriever implemented in
    /// RPSWinLossRetriever
    ///
    /// @return A Capability for GamingMetadataViews.BasicWinLossRetriever
    ///
    access(contract) fun getWinLossRetrieverCapability(): Capability<&{GamingMetadataViews.BasicWinLossRetriever}> {
        return self.account.getCapability<&{GamingMetadataViews.BasicWinLossRetriever}>(
            self.RPSWinLossRetrieverPrivatePath
        )
    }

    /// Inserts a WinLoss record into the winLossRecords mapping if one does
    /// not already exist for the given nft.id
    ///
    /// @param nftID: id of the NFT for which a GamingMetadataViews.BasicWinLoss
    /// will be indexed into the contract's historical winLossRecords mapping
    ///
    access(contract) fun insertWinLossRecord(nftID: UInt64) {
        // Before inserting, make sure there is not already a record for the
        // given nftID
        if self.winLossRecords[nftID] == nil {
            self.winLossRecords.insert(key: nftID, GamingMetadataViews.BasicWinLoss(
                game: RockPaperScissorsGame.name,
                nftID: nftID
            ))
        }
    }

    /// Method to update GamingMetadataViews.BasicWinLoss for each NFT based
    /// on Match winner results
    ///
    /// @param: nftID: id of associated NFT in winLossRecords
    /// @param: winner: id of winning NFT or nil if event was a tie
    ///
    access(contract) fun updateWinLossRecord(nftID: UInt64, winner: UInt64?) {
        if nftID == winner {
            self.winLossRecords[nftID]!.addWin()
        } else if nftID != winner && winner != nil{
            self.winLossRecords[nftID]!.addLoss()
        } else {
            self.winLossRecords[nftID]!.addTie()
        }
    }

    /// Function for easy derivation of a Match's StoragePath. Provides no guarantees
    /// that a Match is stored there.
    ///
    /// @param matchID: the id of the target Match
    ///
    /// @return the StoragePath where that Match would be stored or nil
    ///
    access(contract) fun getMatchStoragePath(_ matchID: UInt64): StoragePath? {
        let identifier = self.MatchStorageBasePathString.concat(matchID.toString())
        return StoragePath(identifier: identifier)
    }

    /// Function for easy derivation of a Match's PrivatePath. Provides no guarantees
    /// that a Match is stored there.
    ///
    /// @param matchID: the id of the target Match
    ///
    /// @return the PrivatePath where that Match would be stored or nil
    ///
    access(contract) fun getMatchPrivatePath(_ matchID: UInt64): PrivatePath? {
        let identifier = self.MatchStorageBasePathString.concat(matchID.toString())
        return PrivatePath(identifier: identifier)
    }

    init() {
        // Initialize variables
        self.name = "RockPaperScissors"
        self.winLossRecords = {}
        self.completedMatchIDs = []

        // Assign canonical paths
        self.ContractAdminStoragePath = /storage/ContractAdmin
        self.ContractAdminPrivatePath = /private/ContractAdmin
        self.GamePlayerStoragePath = /storage/RockPaperScissorsGamePlayer
        self.GamePlayerPublicPath = /public/RockPaperScissorsGamePlayer
        self.RPSWinLossRetrieverStoragePath = /storage/RPSWinLossRetriever
        self.RPSWinLossRetrieverPrivatePath = /private/RPSWinLossRetriever
        // Assign paths for GameRegistrationTicket
        self.GameRegistrationTicketStoragePath = /storage/GameRegistrationTicket
        self.GameRegistrationTicketPrivatePath = /private/GameRegistrationTicket
        // Assign base paths for later concatenation
        self.MatchStorageBasePathString = "Match"
        self.MatchPrivateBasePathString = "Match"

        // Initialize value to nil - should be updated by ContractAdmin
        self.gameRegistrationTicketCap = nil
        
        // Create & link RPSWinLossRetriever resource
        let keeper <- create RPSWinLossRetriever()
        self.account.save(<-keeper, to: self.RPSWinLossRetrieverStoragePath)
        self.account.link<&RPSWinLossRetriever>(self.RPSWinLossRetrieverPrivatePath, target: self.RPSWinLossRetrieverStoragePath)

        // Create the ContractAdmin resource
        let admin <- create ContractAdmin()
        self.account.save(<-admin, to: self.ContractAdminStoragePath)
        self.account.link<
            &ContractAdmin
        >(
            self.ContractAdminPrivatePath,
            target: self.ContractAdminStoragePath
        )
    }
}
 
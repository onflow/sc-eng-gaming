import FungibleToken from "./utility/FungibleToken.cdc"
import ExampleToken from "./utility/ExampleToken.cdc"
import NonFungibleToken from "./utility/NonFungibleToken.cdc"
import MetadataViews from "./utility/MetadataViews.cdc"
import GamingMetadataViews from "./GamingMetadataViews.cdc"

/// GamePieceNFT
///
/// In this contract, we defined an NFT designed for use in games.
/// The primary differentiation between this and standard NFTs is the
/// mapping of GamingMetadataViews.BasicWinLossRetriever Capabilities
/// and the function addWinLossRetriever() which is included so that
/// games in which the NFT is used can add said Capability. This pattern
/// emerged as a way to enable win/loss data for games where the NFT is
/// played to be mutated by the games and enable the NFT to maintain
/// win/loss data for any game in which it's played without the need for
/// the owner to pay for the storage of that win/loss data.
///
/// We hope that this pattern can be built on for more complex gaming
/// applications with more complex metadata as a powerful method for 
/// defining attributes that can be mutated, but in a manner that ensures
/// mutation is only performed by the game in which the NFT is played.
///
pub contract GamePieceNFT: NonFungibleToken {

    /// Counter to track total circulating supply
    pub var totalSupply: UInt64

    /// Collection related paths
    pub let CollectionStoragePath: StoragePath
    pub let CollectionPublicPath: PublicPath

    /// Vault related paths
    pub let VaultStoragePath: StoragePath
    pub let ProviderPrivatePath: PrivatePath
    pub let ReceiverPublicPath: PublicPath

    /// Administrator related paths
    pub let AdminStoragePath: StoragePath
    pub let AdminPrivatePath: PrivatePath
    
    pub event ContractInitialized()
    /// NFT related events
    pub event MintingAuthorizationUpdated(mintingAllowed: Bool)
    pub event MintedNFT(id: UInt64, totalSupply: UInt64)
    pub event Withdraw(id: UInt64, from: Address?)
    pub event Deposit(id: UInt64, to: Address?)

    /// Game Registration events
    pub event GameRegistrationAuthorizationChanged(registrationAllowed: Bool)
    pub event GameRegistrationFeeUpdated(registrationFee: UFix64)
    pub event GameNameRegistered(gameName: String)
    /// Mapping of registered game names & associated registration fee & permission vars
    pub let gameNameRegistry: {UInt64: String}
    pub var registrationFee: UFix64
    pub var registrationAllowed: Bool

    /// Provider and Balance Capability for the contract's ExampleToken.Vault
    access(self) let vaultProviderCap: Capability<&{FungibleToken.Provider, FungibleToken.Balance}>
    /// Variable defining whether minting is allowed or not
    access(contract) var mintingAllowed: Bool

    /** --- NFT --- */

    /// The definition of the GamePieceNFT.NFT resource, an NFT designed to be used for gameplay with
    /// attributes relevant to win/loss histories and basic gameplay moves
    ///
    pub resource NFT : NonFungibleToken.INFT, MetadataViews.Resolver {
        pub let id: UInt64
        /// Dictionary mapping game name to Capability to GamingMetadataViews.BasicWinLossRetriever
        pub let winLossRetrieverCaps: {String: Capability<&{GamingMetadataViews.BasicWinLossRetriever}>}
        /// Mapping of registered game names to an array of game moves
        access(contract) let gameMoves: {String: [AnyStruct]}

        init() {
            self.id = self.uuid
            self.winLossRetrieverCaps = {}
            self.gameMoves = {}
        }

        /// When a user deposits their NFT into a game Match, the game contract can 
        /// add their GamingMetadataViews.BasicWinLossRetriever implementation to the NFT
        /// so that win/loss data can be retrieved when referencing the NFT
        ///
        /// @param gameName: The name of the game the BasicWinLossRetriever is associated with
        /// @param retrieverCap: A Capability for a GamingMetadataViews.BasicWinLossRetriever
        /// implementing resource
        ///
        pub fun addWinLossRetriever(gameName: String, retrieverCap: Capability<&{GamingMetadataViews.BasicWinLossRetriever}>) {
            // make sure the name is not already in use
            if self.winLossRetrieverCaps[gameName] == nil {
                self.winLossRetrieverCaps.insert(key: gameName, retrieverCap)
            }
        }

        /// Retrieve relevant GameMetadataViews
        ///
        /// @return array of GameMetadataView Types relevant to this NFT
        ///
        pub fun getViews(): [Type] {
            return [Type<GamingMetadataViews.WinLossView>()]
        }
        
        /// Function that resolve the given GameMetadataView
        ///
        /// @param view: The Type of GameMetadataView to resolve
        ///
        /// @return The resolved GameMetadataView for this NFT with this NFT's
        /// metadata or nil if none exists
        ///
        pub fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<GamingMetadataViews.WinLossView>():
                    return GamingMetadataViews.WinLossView(id: self.id, self.winLossRetrieverCaps)
                case Type<GamingMetadataViews.MovesView>():
                    return GamingMetadataViews.MovesView(id: self.id, self.gameMoves)
                default:
                    return nil
            }
        }

        /// Getter to retrieve the assigned moves for the given game name
        ///
        /// @param gameName: The name of the game as a String
        ///
        /// @return the array of game moves as AnyStruct or nil if no moves have been
        /// assigned for the given game name
        ///
        pub fun getGameMoves(gameName: String): [AnyStruct]? {
            return self.gameMoves[gameName]
        }

        /// An internal method allowing for moves to be added
        access(contract) fun addMoves(gameName: String, _ newMoves: [AnyStruct]) {
            if self.gameMoves.keys.contains(gameName) {
                self.gameMoves[gameName]!.appendAll(newMoves)
            } else {
                self.gameMoves.insert(key: gameName, newMoves)
            }
        }

        /// An internal method allowing for a move to be removed
        access(contract) fun removeMove(gameName: String, targetIndex: Int): AnyStruct? {
            if self.gameMoves.keys.contains(gameName) {
                return self.gameMoves[gameName]!.remove(at: targetIndex)
            }
            return nil
        }

        /// A private method allowing for game moves to be deleted
        access(self) fun deleteGameMoves(gameName: String): [AnyStruct]? {
            return self.gameMoves.remove(key: gameName)
        }
    }

    /** --- Collection Interface & resource --- */

    /// An interface defining the public methods for a GamePieceNFT Collection
    pub resource interface GamePieceNFTCollectionPublic {
        pub fun deposit(token: @NonFungibleToken.NFT)
        pub fun getIDs(): [UInt64]
        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT
        pub fun borrowGamePieceNFT(id: UInt64): &GamePieceNFT.NFT? {
            post {
                (result == nil) || (result?.id == id):
                    "Cannot borrow GamePieceNFT reference: the ID of the returned reference is incorrect"
            }
        }
        pub fun borrowViewResolver(id: UInt64): &AnyResource{MetadataViews.Resolver}
    }

    pub resource Collection : GamePieceNFTCollectionPublic, NonFungibleToken.Provider, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection {
        // dictionary of NFT conforming tokens
        // NFT is a resource type with an `UInt64` ID field
        pub var ownedNFTs: @{UInt64: NonFungibleToken.NFT}

        init () {
            self.ownedNFTs <- {}
        }

        // withdraw removes an NFT from the collection and moves it to the caller
        pub fun withdraw(withdrawID: UInt64): @NonFungibleToken.NFT {
            let token <- self.ownedNFTs.remove(key: withdrawID) ?? panic("missing NFT")

            emit Withdraw(id: token.id, from: self.owner?.address)

            return <-token
        }

        // deposit takes a NFT and adds it to the collections dictionary
        // and adds the ID to the id array
        pub fun deposit(token: @NonFungibleToken.NFT) {
            let token <- token as! @GamePieceNFT.NFT

            let id: UInt64 = token.id

            // add the new token to the dictionary which removes the old one
            let oldToken <- self.ownedNFTs[id] <- token

            emit Deposit(id: id, to: self.owner?.address)

            destroy oldToken
        }

        // getIDs returns an array of the IDs that are in the collection
        pub fun getIDs(): [UInt64] {
            return self.ownedNFTs.keys
        }

        // borrowNFT gets a reference to an NFT in the collection
        // so that the caller can read its metadata and call its methods
        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT {
            return (&self.ownedNFTs[id] as &NonFungibleToken.NFT?)!
        }
 
        pub fun borrowGamePieceNFT(id: UInt64): &GamePieceNFT.NFT? {
            if self.ownedNFTs[id] != nil {
                // Create an authorized reference to allow downcasting
                let ref = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
                return ref as! &GamePieceNFT.NFT
            }

            return nil
        }

        pub fun borrowViewResolver(id: UInt64): &AnyResource{MetadataViews.Resolver} {
            let nft = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
            let gamePieceNFT = nft as! &GamePieceNFT.NFT
            return gamePieceNFT as &AnyResource{MetadataViews.Resolver}
        }

        destroy() {
            destroy self.ownedNFTs
        }
    }

    /** --- Game Registration Ticket --- */
    ///
    /// A resource defining proof of game name registration with this contract.
    /// Registering gives a registrant the ability to control the registered namespace of moves
    /// and win/loss data on NFTs via an NFTEscrow implementing interface.
    /// The registration construct exists to ensure that game contracts only alter those values
    /// which are relevant to their game, and no other names in the NFT's namespace. In effect,
    /// the NFT contract doesn't trust a game to provide its own name when asking to alter data
    /// on the NFT, so before an external actor can alter NFT data, they must register under their
    /// designated name and be returned this registration ticket. From then on, the external actor
    /// will provide reference to this ticket and the game name from which the game name will be
    /// retrieved whenever changes are to be made to values in their namespace.
    ///
    pub resource GameRegistrationTicket {
        pub let id: UInt64
        pub let gameName: String

        init(gameName: String) {
            self.id = self.uuid
            self.gameName = gameName
        }
    }

    /** --- NFT Escrow --- */
    ///
    /// Implementation of this resource have the ability to alter NFT.gameMoves
    ///
    pub resource interface NFTEscrow {
        pub let escrowedGamePieceNFTs: @{UInt64: NFT}
        pub fun escrowNFT(nft: @NFT, receiverCap: Capability<&{NonFungibleToken.Receiver}>)
        
        /// A default method implementation adding provided moves to an NFT with the given id.
        /// Note that the NFT must be in escrow for these changes to occur.
        ///
        /// @param nftID: The id of the NFT to which moves will be added
        /// @param regTicketRef: A reference to the GameRegistrationTicket resource associated with
        /// the game for which moves will be added. This ensures that any external actor adding moves
        /// will only be able to do so for the namespace for which they're registered
        /// @param newMoves: An array of AnyStruct representing generic game moves that will be 
        /// added to the specified NFT
        /// 
        pub fun addMovesToNFT(
            nftID: UInt64,
            regTicketRef: &GameRegistrationTicket,
            newMoves: [AnyStruct]
        ) {
            pre {
                self.escrowedGamePieceNFTs.keys.contains(nftID): "No NFTs in escrow with given ID!"
            }
            let nftRef = (&self.escrowedGamePieceNFTs[nftID] as &NFT?)!
            nftRef.addMoves(gameName: regTicketRef.gameName, newMoves)
        }

        /// A default method implementation adding provided moves to an NFT with the given id.AccountKey
        /// Note that the NFT must be in escrow for these changes to occur.
        ///
        /// @param nftID: The id of the NFT from which the move will be removed
        /// @param regTicketRef: A reference to the GameRegistrationTicket resource associated with
        /// the game for which moves will be removed. This ensures that any external actor removing moves
        /// will only be able to do so for the namespace for which they're registered
        /// @param targetIndex: the index of the move in nft.gameMoves[gameName] to be removed
        ///
        /// @return the AnyStruct removed from the nft's gameMoves
        /// 
        pub fun removeMove(
            nftID: UInt64,
            regTicketRef: &GameRegistrationTicket,
            targetIndex: Int
        ): AnyStruct? {
            pre {
                self.escrowedGamePieceNFTs.keys.contains(nftID): "No NFTs in escrow with given ID!"
            }
            let nftRef = (&self.escrowedGamePieceNFTs[nftID] as &NFT?)!
            let removedMove: AnyStruct? = nftRef
                .removeMove(
                    gameName: regTicketRef.gameName,
                    targetIndex: targetIndex
                )
            return removedMove
        }
    }
    
    /** --- Interfaces Defining Contract Admin Roles --- */

    pub resource interface FundsAdmin {
        pub fun getBalance(): UFix64?
        pub fun borrowTokenProviderReference(): &AnyResource{FungibleToken.Provider}?
    }

    pub resource interface MintingAdmin {
        pub fun getBalance(): UFix64?
        pub fun allowMinting(_ permissions: Bool)
    }

    pub resource interface RegistryAdmin {
        pub fun getBalance(): UFix64?
        pub fun allowRegistration(_ permissions: Bool)
        pub fun setRegistrationFee(_ feeAmount: UFix64)
    }

    /// An Admin resource used to manage this contract and its funds
    /// associated with game name registration
    ///
    pub resource Administrator : FundsAdmin, MintingAdmin, RegistryAdmin {

        /** --- MintingAdmin --- */
        ///
        /// Sets the contract's minting permissions to those passed
        ///
        /// @param permissions: Boolean value determining if minting is allowed or not
        ///
        pub fun allowMinting(_ permissions: Bool) {
            if permissions != GamePieceNFT.mintingAllowed {
                GamePieceNFT.mintingAllowed = permissions
                emit MintingAuthorizationUpdated(mintingAllowed: GamePieceNFT.mintingAllowed)
            }
        }

        /** --- RegistryAdmin --- */
        ///
        /// Sets the permissions associated with game name registration
        /// via GamePieceNFT.registerGameName()
        ///
        /// @param permissions: Boolean value determining if registration is allowed or not
        ///
        pub fun allowRegistration(_ permissions: Bool) {
            if permissions != GamePieceNFT.registrationAllowed {
                GamePieceNFT.registrationAllowed = permissions
                emit GameRegistrationAuthorizationChanged(registrationAllowed: GamePieceNFT.registrationAllowed)
            }
        }

        /// Sets the fee that must be passed in the form of ExampleToken upon
        /// game name registration
        ///
        /// @param feeAmount: The amount of tokens that must be given to this contract on registration
        ///
        pub fun setRegistrationFee(_ feeAmount: UFix64) {
            if feeAmount != GamePieceNFT.registrationFee {
                GamePieceNFT.registrationFee = feeAmount
                emit GameRegistrationFeeUpdated(registrationFee: GamePieceNFT.registrationFee)
            }
        }

        /** --- FundsAdmin --- */
        ///
        /// Returns the caller a reference to the FungibleToken.Provider Capability
        /// stored in the contract account's private storage
        ///
        /// @return Reference to FungibleToken.Provider Capability linked to ExampleToken.Vault
        ///
        pub fun borrowTokenProviderReference(): &AnyResource{FungibleToken.Provider}? {
            let providerCap = GamePieceNFT.account.getCapability
                <&{FungibleToken.Provider}>(
                    GamePieceNFT.ProviderPrivatePath
                )
            return providerCap.borrow()
        }

        /** --- Common --- */
        ///
        /// Returns the balance of the contract's ExampleToken.Vault
        ///
        /// @return The balance of the contract's ExampleToken.Vault
        ///
        pub fun getBalance(): UFix64? {
            let balanceCap = GamePieceNFT.account.getCapability
                <&{FungibleToken.Balance}>(
                    GamePieceNFT.ProviderPrivatePath
                )
            if let balanceRef = balanceCap.borrow() {
                return balanceRef.balance
            }
            return nil
        }
    }

    /// Public function that anyone can call to create a new empty collection
    ///
    /// @return a new empty Collection resource
    ///
    pub fun createEmptyCollection(): @NonFungibleToken.Collection {
        let newCollection <- create Collection() as! @NonFungibleToken.Collection
        return <- newCollection
    }

    /// Allows for minting of NFTs. For the purposes of this proof of concept,
    /// this is set to free. Rudimentary spam minimization is done by
    /// GamePieceNFT.allowMinting, but one might consider requiring payment
    /// to mint an NFT
    ///
    /// @param recipient: A reference to the requestor's CollectionPublic
    /// to which the NFT will be deposited
    ///
    pub fun mintNFT(recipient: &{NonFungibleToken.CollectionPublic}) {
        pre {
            self.mintingAllowed: "Minting is not allowed at this time!"
        }
        self.totalSupply = self.totalSupply + UInt64(1)
        let newNFT <- create NFT() as! @NonFungibleToken.NFT
        let newID: UInt64 = newNFT.id
        recipient.deposit(token: <-newNFT)
        emit MintedNFT(id: newID, totalSupply: self.totalSupply)
    }

    /// Function to enable registering to the NFT's namespace. This can be
    /// analogized to licensing. In order for a game to add metadata to this
    /// contract's NFTs, the game name must pay for registration. This prevents
    /// spam attacks whereby the namespace can be filled with arbitrary game
    /// names as well as introduces new monetization mechanisms for NFT contracts
    /// and therefore incentives to create new and novel game NFTs
    ///
    /// @param gameName: The name of the game as a String
    /// @param registrationFee: An ExampleToken.Vault containing the fee to
    /// complete registration
    ///
    /// @return A GameRegistrationTicket resource that can be used in conjunction
    /// with NFTEscrow implementation to update NFT metadata
    ///
    pub fun registerGameName(
        gameName: String,
        registrationFee: @FungibleToken.Vault
    ): @GameRegistrationTicket {
        pre {
            self.registrationAllowed:
                "Registration not allowed at this time!"
            registrationFee.balance == self.registrationFee:
                "Incorrect fee amount provided!"
            !self.gameNameRegistry.values.contains(gameName):
                "GameName has already been registered!"
        }
        // Cast as ExampleToken.Vault to confirm denomination
        let castedVault <- registrationFee as! @ExampleToken.Vault
        
        // Create new registration Ticket
        let regTicket <- create GameRegistrationTicket(gameName: gameName)
        // Add the given game name to the registry
        self.gameNameRegistry.insert(key: regTicket.id, gameName)
        
        // Get a reference to the contract account's vault
        let vaultRef = self.account
            .borrow<&ExampleToken.Vault>(from: self.VaultStoragePath)
            ?? panic("Could not borrow reference to contract's ExampleToken.Vault!")
        // Deposit given vault
        let uncastedVault <- castedVault as! @FungibleToken.Vault
        vaultRef.deposit(from: <-uncastedVault)
        
        // Emit event & return registration ticket
        emit GameNameRegistered(gameName: gameName)
        return <- regTicket
    }

    init() {
        
        self.totalSupply = 0
        // Minting & registration disallowed by default
        self.mintingAllowed = false
        self.registrationAllowed = false

        // Set Collection paths
        self.CollectionStoragePath = /storage/GamePieceNFTCollection
        self.CollectionPublicPath = /public/GamePieceNFTCollection
        // Set Vault paths
        self.VaultStoragePath = /storage/GamePieceNFTVault
        self.ProviderPrivatePath = /private/GamePieceNFTContractVaultProvider
        self.ReceiverPublicPath = /public/GamePieceNFTContractVaultReceiver
        // Set Administrator paths
        self.AdminStoragePath = /storage/Administrator
        self.AdminPrivatePath = /private/Administrator

        // Set GameNameRegistry values, fee set to 0 by default
        self.registrationFee = UFix64(0)
        self.gameNameRegistry = {}

        // Init the Vault for this contract
        let vault: @ExampleToken.Vault <- ExampleToken.createEmptyVault()
        self.account.save(<-vault, to: self.VaultStoragePath)

        // Link Provider & Balance Capabilities to PrivateStorage
        self.account.link<&{
            FungibleToken.Provider,
            FungibleToken.Balance
        }>(
            self.ProviderPrivatePath,
            target: self.VaultStoragePath
        )
        // Link Receiver Capability to PublicStorage
        self.account.link<&{FungibleToken.Receiver}>(
            self.ReceiverPublicPath,
            target: self.VaultStoragePath
        )
        // Assign Vault Capability to contract variable
        self.vaultProviderCap = self.account.getCapability<&{
            FungibleToken.Provider,
            FungibleToken.Balance
        }>(
            self.ProviderPrivatePath
        )

        // Init the Administrator
        let admin <- create Administrator()
        self.account.save(<-admin, to: self.AdminStoragePath)
        // Link Administrator Capabilities to PrivateStorage
        self.account.link<&{
            FundsAdmin,
            MintingAdmin,
            RegistryAdmin
        }>(
            self.AdminPrivatePath,
            target: self.AdminStoragePath
        )

        emit ContractInitialized()
    }
}
 
import FungibleToken from "./utility/FungibleToken.cdc"
import NonFungibleToken from "./utility/NonFungibleToken.cdc"
import MetadataViews from "./utility/MetadataViews.cdc"
import GamingMetadataViews from "./GamingMetadataViews.cdc"
import DynamicNFT from "./DynamicNFT.cdc"

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

    /* Collection related paths */
    pub let CollectionStoragePath: StoragePath
    pub let CollectionPublicPath: PublicPath
    pub let ProviderPrivatePath: PrivatePath
    
    /* Minter related paths */
    pub let MinterStoragePath: StoragePath
    pub let MinterPublicPath: PublicPath
    pub let MinterPrivatePath: PrivatePath
    
    pub event ContractInitialized()
    /* NFT related events */
    pub event MintedNFT(id: UInt64, totalSupply: UInt64)
    pub event Withdraw(id: UInt64, from: Address?)
    pub event Deposit(id: UInt64, to: Address?)
    // pub event AttachmentAdded(attachmentType: Type, to: UInt64)
    // pub event AttachmentRemoved(attachmentType: Type, from: UInt64)

    /// The definition of the GamePieceNFT.NFT resource, an NFT designed to be used for gameplay with
    /// attributes relevant to win/loss histories and basic gameplay moves
    ///
    pub resource NFT : NonFungibleToken.INFT, MetadataViews.Resolver, DynamicNFT.AttachmentViewResolver {
        /// Unique id tied to resource's UUID
        pub let id: UInt64

        /// Metadata fields
        pub let name: String
        pub let description: String
        pub let thumbnail: String

        init(
            metadata: {String: AnyStruct}
        ) {
            self.id = self.uuid
            self.name = metadata["name"]! as! String
            self.description = metadata["description"]! as! String
            self.thumbnail = metadata["thumbnail"]! as! String
        }

        /** --- DynamicNFT.Dynamic --- */
        // /// Method allowing an attachment to be added by a party registered to add the given type
        // ///
        // /// @param attachment: the resource to be attached
        // ///
        // pub fun addAttachment(_ attachment: @{MetadataViews.Resolver}) {
        //     pre {
        //         !self.hasAttachmentType(attachment.getType()):
        //             "NFT already contains attachment of this type!"
        //     }
        //     var attachable = false
        //     // Iterate over array of types the attachment is designed to be attached to
        //     for type in attachment.attachmentFor {
        //         // Assign attachable to true and break if this type or an interface it
        //         // implements is found
        //         if self.getType().isSubtype(of: type) {
        //             attachable = true
        //             break
        //         }
        //     }
        //     // Assert that attachable is true
        //     assert(
        //         attachable == true,
        //         message: "Cannot attach given attachment - not designed to be attached to this NFT!"
        //     )
        //     // Given the conditions have been satisfied, attach & emit event
        //     let attachmentType: Type = attachment.getType()
        //     self.attachments[attachmentType] <-! attachment
        //     emit AttachmentAdded(attachmentType: attachmentType, to: self.id)
        // }

        // /// Method allowing for removal of attachments, enabling users to clean up the storage used
        // /// by their NFT
        // ///
        // /// @return the resource that was removed from attachments
        // ///
        // access(contract) fun removeAttachment(
        //     type: Type
        // ): @{DynamicNFT.Attachment, MetadataViews.Resolver}? {
        //     // Get the attachment, emit event & return
        //     let attachment <-self.attachments.remove(key: type)
        //     emit AttachmentRemoved(attachmentType: attachment.getType(), from: self.id)
        //     return <-attachment
        // }

        // /** --- DynamicNFT.Dynamic & DynamicNFT.DynamicPublic --- */

        // /// Function revealing whether NFT has an attachment of the given Type
        // ///
        // /// @param type: The type in question
        // ///
        // /// @return true if NFT has given Type attached and false otherwise
        // ///
        // pub fun hasAttachmentType(_ type: Type): Bool {
        //     return self.attachments.containsKey(type)
        // }

        // /// Returns a reference to the attachment of the given Type
        // ///
        // /// @param type: Type of the desired attachment reference
        // ///
        // /// @return Generic auth reference ready for downcasting
        // ///
        // pub fun getAttachmentRef(_ type: Type): auth &AnyResource{DynamicNFT.Attachment, MetadataViews.Resolver}? {
        //     return &self.attachments[type] as auth &AnyResource{DynamicNFT.Attachment, MetadataViews.Resolver}?
        // }

        // /// Getter method for array of types attached to this NFT
        // ///
        // /// @return array of attached Types
        // ///
        // pub fun getAttachmentTypes(): [Type] {
        //     return self.attachments.keys
        // }

        /** --- MetadataViews.Resolver --- */
        /// Retrieve relevant MetadataViews and/or GamingMetadataViews struct types supported by this
        /// NFT. If a caller wants the views supported by the NFT's attachments, they should call
        /// getAttachmentViews(): {Type: [Type]} which is inherited from DynamicNFT.AttachmentViewResolver
        ///
        /// @return array of view Types relevant to this NFT
        ///
        pub fun getViews(): [Type] {
            let views: [Type] = [
                    Type<DynamicNFT.AttachmentsView>(),
                    Type<GamingMetadataViews.GameAttachmentsView>(),
                    Type<MetadataViews.Display>(),
                    Type<MetadataViews.Serial>(),
                    Type<MetadataViews.ExternalURL>(),
                    Type<MetadataViews.NFTCollectionData>()
                ]
            return views
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
                // case Type<DynamicNFT.AttachmentsView>():
                //     return DynamicNFT.AttachmentsView(
                //         nftID: self.id,
                //         attachmentTypes: self.attachments.keys,
                //         attachmentViews: self.getAttachmentViews()
                //     )
                // case Type<GamingMetadataViews.GameAttachmentsView>():
                //     return GamingMetadataViews.GameAttachmentsView(
                //         nftID: self.id,
                //         attachmentGameContractMetadata: self.getAllAttachmentGameContractMetadata()
                //     )
                case Type<MetadataViews.Display>():
                    return MetadataViews.Display(
                        name: self.name,
                        description: self.description,
                        thumbnail: MetadataViews.HTTPFile(
                            url: self.thumbnail
                        )
                    )
                case Type<MetadataViews.Serial>():
                    return MetadataViews.Serial(
                        self.id
                    )
                case Type<MetadataViews.ExternalURL>():
                    return MetadataViews.ExternalURL("https://gamepiece-nft.onflow.org/".concat(self.id.toString()))
                case Type<MetadataViews.NFTCollectionData>():
                    return MetadataViews.NFTCollectionData(
                        storagePath: GamePieceNFT.CollectionStoragePath,
                        publicPath: GamePieceNFT.CollectionPublicPath,
                        providerPath: GamePieceNFT.ProviderPrivatePath,
                        publicCollection: Type<&GamePieceNFT.Collection{GamePieceNFT.GamePieceNFTCollectionPublic}>(),
                        publicLinkedType: Type<&GamePieceNFT.Collection{GamePieceNFT.GamePieceNFTCollectionPublic, NonFungibleToken.CollectionPublic, NonFungibleToken.Receiver, MetadataViews.ResolverCollection}>(),
                        providerLinkedType: Type<&GamePieceNFT.Collection{GamePieceNFT.GamePieceNFTCollectionPublic, NonFungibleToken.CollectionPublic, NonFungibleToken.Provider, MetadataViews.ResolverCollection}>(),
                        createEmptyCollectionFunction: (fun (): @NonFungibleToken.Collection {
                            return <-GamePieceNFT.createEmptyCollection()
                        })
                    )
                default:
                    return nil
            }
        }

        /// Helper function that returns an array of GamingMetadataViews.GameContractMetadata
        /// from attachments that implement the GamingMetadataViews.GameAttachment interface
        ///
        // TODO: Determine if this is necessary - if so impl with new attachments
        // access(self) fun getAllAttachmentGameContractMetadata(): {Type: GamingMetadataViews.GameContractMetadata} {
        //     // Array that will be returned containing the GameContractMetadata of related attachments
        //     let gameInfo: {Type: GamingMetadataViews.GameContractMetadata} = {}

        //     // Iterate over attachments
        //     for type in self.getAttachmentTypes() { 
        //         // Add the attachments info to the return value if it implements GameAttachment
        //         if type.isSubtype(of: Type<@{GamingMetadataViews.GameResource}>()) {
        //             let gameAttachmentRef = (self.getAttachmentRef(type) as! &{GamingMetadataViews.GameResource}?)!
        //             gameInfo.insert(key: type, gameAttachmentRef.gameContractInfo)
        //         }
        //     }
        //     return gameInfo
        // }

        // destroy() {
        //     // Prevent loss of attachment resources
        //     pre {
        //         self.attachments.length == 0:
        //             "NFT still has nested attachments!"
        //     }
        //     destroy self.attachments
        // }
    }

    /** --- Collection Interface & resource --- */

    /// An interface defining the public methods for a GamePieceNFT Collection
    pub resource interface GamePieceNFTCollectionPublic {
        pub fun deposit(token: @NonFungibleToken.NFT)
        pub fun getIDs(): [UInt64]
        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT
        pub fun borrowNFTSafe(id: UInt64): &NonFungibleToken.NFT? {
            post {
                result == nil || result!.id == id: "The returned reference's ID does not match the requested ID"
            }
        }
        pub fun borrowGamePieceNFT(
            id: UInt64
        ): &GamePieceNFT.NFT? {
            post {
                (result == nil) || (result?.id == id):
                    "Cannot borrow GamePieceNFT reference: the ID of the returned reference is incorrect"
            }
            return nil
        }
        pub fun borrowViewResolver(id: UInt64): &{MetadataViews.Resolver}
    }

    pub resource Collection : GamePieceNFTCollectionPublic, NonFungibleToken.Provider, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection {
        /// Dictionary of NFT conforming tokens
        /// NFT is a resource type with an `UInt64` ID field
        pub var ownedNFTs: @{UInt64: NonFungibleToken.NFT}

        init () {
            self.ownedNFTs <- {}
        }

        /// Removes an NFT from the collection and moves it to the caller
        pub fun withdraw(withdrawID: UInt64): @NonFungibleToken.NFT {
            let token <- self.ownedNFTs.remove(key: withdrawID) ?? panic("missing NFT")

            emit Withdraw(id: token.id, from: self.owner?.address)

            return <-token
        }

        /// Takes a NonFungibleToken.NFT and adds it to the collections dictionary
        /// indexed on the tokens id
        pub fun deposit(token: @NonFungibleToken.NFT) {
            let token <- token as! @GamePieceNFT.NFT

            let id: UInt64 = token.id

            // add the new token to the dictionary which removes the old one
            let oldToken <- self.ownedNFTs[id] <- token

            emit Deposit(id: id, to: self.owner?.address)

            destroy oldToken
        }

        /// Returns an array of the IDs that are in the collection
        pub fun getIDs(): [UInt64] {
            return self.ownedNFTs.keys
        }

        /// Gets a reference to an NFT in the collection as NonFungibleToken.NFT
        /// so that the caller can read its metadata and call its methods
        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT {
            return (&self.ownedNFTs[id] as &NonFungibleToken.NFT?)!
        }

        /// Safe way to borrow a reference to an NFT that does not panic
        ///
        /// @param id: The ID of the NFT that want to be borrowed
        /// @return An optional reference to the desired NFT, will be nil if the passed id does not exist
        ///
        pub fun borrowNFTSafe(id: UInt64): &NonFungibleToken.NFT? {
            if let nftRef = &self.ownedNFTs[id] as &NonFungibleToken.NFT? {
                return nftRef
            }
            return nil
        }
 
        /// Returns a reference to the GamePieceNFT.NFT as a restricted composite Type
        /// The returned reference allows all functionality on the NFT except for addition
        /// and removal of attachments
        ///
        /// @param id: The id of the NFT for which a reference will be returned 
        ///
        /// @return The reference to the NFT or nil if it is not contained in the Collection
        ///
        pub fun borrowGamePieceNFT(
            id: UInt64
        ): &GamePieceNFT.NFT? {
            if self.ownedNFTs[id] != nil {
                // Create an authorized reference to allow downcasting
                let ref = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
                return ref as! &GamePieceNFT.NFT
            }
            return nil
        }

        /// Returns a reference to the nft with given id as a MetadataViews.Resolver
        pub fun borrowViewResolver(id: UInt64): &AnyResource{MetadataViews.Resolver} {
            pre {
                self.ownedNFTs.containsKey(id):
                    "Collection does not contain Resolver with id ".concat(id.toString())
            }
            let nft = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
            let gamePieceNFT = nft as! &GamePieceNFT.NFT
            return gamePieceNFT
        }

        /// Removes the attachment of the specified type from the nft with the given id,
        /// returning the attachment if the nft & attachment exist. 
        // TODO: Impl with new attachments so NFT doesn't have to be withdrawn from collection to remove
        // pub fun removeAttachmentFromNFT(
        //     nftID: UInt64,
        //     attachmentType: Type
        // ): @AnyResource{MetadataViews.Resolver}? {
        //     // Get a reference to the NFT if it is contained
        //     if let nftRef = &self.ownedNFTs[nftID] as auth &NonFungibleToken.NFT? {
        //         // Cast the reference as a GamePieceNFT & remove the attachment, returning it
        //         let gamePieceNFTRef = nftRef as! &GamePieceNFT.NFT
        //         return <-gamePieceNFTRef.removeAttachment(type: attachmentType)
        //     }
        //     return nil
        // }

        destroy() {
            pre {
                self.ownedNFTs.length == 0:
                    "NFTs still contained in this Collection!"
            }
            destroy self.ownedNFTs
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
    // pub fun mintNFT(recipient: &{NonFungibleToken.CollectionPublic}) {
    //     // Increment the supply
    //     GamePieceNFT.totalSupply = GamePieceNFT.totalSupply + UInt64(1)
        
    //     // Create a new NFT. A typical NFT's Metadata would vary, but for simplicity and because the attachments
    //     // are really what characterize each NFT, we've standardized each
    //     let newNFT <- create NFT(
    //             name: "GamePieceNFT",
    //             description: "One game piece NFT to rule them all!",
    //             thumbnail: "https://www.cheezewizards.com/static/img/prizePool/coin.svg"
    //         ) as @NonFungibleToken.NFT

    //     // Get the id & deposit the token to the Receiver
    //     let newID: UInt64 = newNFT.id
    //     recipient.deposit(token: <-newNFT)

    //     emit MintedNFT(id: newID, totalSupply: GamePieceNFT.totalSupply)
    // }

    pub resource interface MinterAdmin {
        pub fun setMetadata(metadata: {String: AnyStruct})
        pub fun setMintingPermissions(allowMinting: Bool)
        pub fun mintingAllowed(): Bool
        pub fun mintNFT(recipient: &{NonFungibleToken.CollectionPublic})
    }

    pub resource interface MinterPublic {
        pub fun mintingAllowed(): Bool
        pub fun mintNFT(recipient: &{NonFungibleToken.CollectionPublic})
    }

    pub resource Minter : MinterAdmin, MinterPublic {
        access(self) var allowMinting: Bool
        access(self) var metadata: {String: AnyStruct}
        
        init() {
            self.allowMinting = true
            self.metadata = {
                "name": "GamePieceNFT",
                "description": "One game piece NFT to rule them all!",
                "thumbnail": "https://www.cheezewizards.com/static/img/prizePool/coin.svg"
            }
        }

        pub fun setMetadata(metadata: {String: AnyStruct}) {
            self.metadata = metadata
        }

        pub fun setMintingPermissions(allowMinting: Bool) {
            self.allowMinting = allowMinting
        }

        pub fun mintingAllowed(): Bool {
            return self.allowMinting
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
                self.allowMinting: "Minting is not currently enabled!"
            }
            // Increment the supply
            GamePieceNFT.totalSupply = GamePieceNFT.totalSupply + UInt64(1)
            
            // Create a new NFT. A typical NFT's Metadata would vary, but for simplicity and because the attachments
            // are really what characterize each NFT, we've standardized each
            let newNFT <- create NFT(
                    metadata: self.metadata
                ) as @NonFungibleToken.NFT

            // Get the id & deposit the token to the Receiver
            let newID: UInt64 = newNFT.id
            recipient.deposit(token: <-newNFT)

            emit MintedNFT(id: newID, totalSupply: GamePieceNFT.totalSupply)
        }
    }

    init() {
        
        self.totalSupply = 0

        // Set Collection paths
        self.CollectionStoragePath = /storage/GamePieceNFTCollection
        self.CollectionPublicPath = /public/GamePieceNFTCollection
        self.ProviderPrivatePath = /private/GamePieceNFTCollectionProvider
        // Set Minter paths
        self.MinterStoragePath = /storage/GamePieceNFTMinter
        self.MinterPublicPath = /public/GamePieceNFTMinter
        self.MinterPrivatePath = /private/GamePieceNFTMinter

        // Create & save the Minter resource
        self.account.save(<-create Minter(), to: self.MinterStoragePath)
        // Link the minter as a Public Capability
        self.account.link<&{MinterPublic}>(self.MinterPublicPath, target: self.MinterStoragePath)
        self.account.link<&{MinterAdmin}>(self.MinterPrivatePath, target: self.MinterStoragePath)

        emit ContractInitialized()
    }
}
 
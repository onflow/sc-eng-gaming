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

    /// Collection related paths
    pub let CollectionStoragePath: StoragePath
    pub let CollectionPublicPath: PublicPath
    pub let ProviderPrivatePath: PrivatePath
    
    pub event ContractInitialized()
    /// NFT related events
    pub event MintedNFT(id: UInt64, totalSupply: UInt64)
    pub event Withdraw(id: UInt64, from: Address?)
    pub event Deposit(id: UInt64, to: Address?)

    /// The definition of the GamePieceNFT.NFT resource, an NFT designed to be used for gameplay with
    /// attributes relevant to win/loss histories and basic gameplay moves
    ///
    pub resource NFT : NonFungibleToken.INFT, MetadataViews.Resolver, DynamicNFT.AttachmentViewResolver, DynamicNFT.Dynamic {
        /// Unique id tied to resource's UUID
        pub let id: UInt64
        /// Mapping of generic attached resource indexed by their type
        access(contract) let attachments: @{Type: AnyResource{DynamicNFT.Attachment, MetadataViews.Resolver}}

        /// Metadata fields
        pub let name: String
        pub let description: String
        pub let thumbnail: String

        init(
            name: String,
            description: String,
            thumbnail: String
        ) {
            self.id = self.uuid
            self.attachments <- {}
            self.name = name
            self.description = description
            self.thumbnail = thumbnail
        }

        /// Method allowing an attachment to be added by a party registered to add the given type
        ///
        /// @param attachment: the resource to be attached
        ///
        pub fun addAttachment(_ attachment: @{DynamicNFT.Attachment, MetadataViews.Resolver}) {
            pre {
                !self.hasAttachmentType(attachment.getType()):
                    "NFT already contains attachment of this type!"
            }
            var attachable = false
            // Iterate over array of types the attachment is designed to be attached to
            for type in attachment.attachmentFor {
                // Assign attachable to true and break if this type or an interface it
                // implements is found
                if self.getType().isSubtype(of: type) {
                    attachable = true
                    break
                }
            }
            // Assert that attachable is true
            assert(
                attachable == true,
                message: "Cannot attach given attachment - not designed to be attached to this NFT!"
            )
            // Given the conditions have been satisfied, attach
            self.attachments[attachment.getType()] <-! attachment
        }

        /// Method allowing for removal of attachments, enabling users to clean up the storage used
        /// by their NFT
        ///
        /// @return the resource that was removed from attachments
        ///
        access(contract) fun removeAttachment(type: Type): @{DynamicNFT.Attachment, MetadataViews.Resolver}? {
            return <-self.attachments.remove(key: type)
        }

        /// Retrieve relevant MetadataViews and/or GamingMetadataViews struct types supported by this
        /// NFT and its Attachments
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
            // Iterate over the NFT's attachments and get the views they support
            for type in self.attachments.keys {
                if let attachmentRef = self.getAttachmentRef(type) as &{MetadataViews.Resolver}? {
                    views.appendAll(attachmentRef.getViews())
                }
            }
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
                case Type<DynamicNFT.AttachmentsView>():
                    return DynamicNFT.AttachmentsView(
                        nftID: self.id,
                        attachmentTypes: self.attachments.keys,
                        attachmentViews: self.getAttachmentViews()
                    )
                case Type<GamingMetadataViews.GameAttachmentsView>():
                    return GamingMetadataViews.GameAttachmentsView(
                        nftID: self.id,
                        attachmentGameContractMetadata: self.getAllAttachmentGameContractMetadata()
                    )
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
        access(self) fun getAllAttachmentGameContractMetadata(): {Type: GamingMetadataViews.GameContractMetadata} {
            // Array that will be returned containing the GameContractMetadata of related attachments
            let gameInfo: {Type: GamingMetadataViews.GameContractMetadata} = {}

            // Iterate over attachments
            for type in self.getAttachmentTypes() { 
                // Add the attachments info to the return value if it implements GameAttachment
                if type.isSubtype(of: Type<@{GamingMetadataViews.GameResource}>()) {
                    let gameAttachmentRef = (self.getAttachmentRef(type) as! &{GamingMetadataViews.GameResource}?)!
                    gameInfo.insert(key: type, gameAttachmentRef.gameContractInfo)
                }
            }
            return gameInfo
        }

        destroy() {
            pre {
                self.attachments.length == 0:
                    "NFT still has nested attachments!"
            }
            destroy self.attachments
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
 
        /// Returns a reference to the GamePieceNFT.NFT with given id
        pub fun borrowGamePieceNFT(id: UInt64): &GamePieceNFT.NFT? {
            if self.ownedNFTs[id] != nil {
                // Create an authorized reference to allow downcasting
                let ref = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
                return ref as! &GamePieceNFT.NFT
            }

            return nil
        }

        /// Returns a reference to the nft with given id as a MetadataViews.Resolver
        pub fun borrowViewResolver(id: UInt64): &AnyResource{MetadataViews.Resolver} {
            let nft = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
            let gamePieceNFT = nft as! &GamePieceNFT.NFT
            return gamePieceNFT as &AnyResource{MetadataViews.Resolver}
        }

        /// Removes the attachment of the specified type from the nft with the given id,
        /// returning the attachment if the nft & attachment exist
        pub fun removeAttachmentFromNFT(nftID: UInt64, attachmentType: Type): @AnyResource{DynamicNFT.Attachment, MetadataViews.Resolver}? {
            if let nftRef = self.borrowGamePieceNFT(id: nftID) {
                return <-nftRef.removeAttachment(type: attachmentType)
            }
            return nil
        }

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
    pub fun mintNFT(recipient: &{NonFungibleToken.CollectionPublic}) {
        // Increment the supply
        GamePieceNFT.totalSupply = GamePieceNFT.totalSupply + UInt64(1)
        
        // Create a new NFT. A typical NFT's Metadata would vary, but for simplicity and because the attachments
        // are really what characterize each NFT, we've standardized each
        let newNFT <- create NFT(
                name: "GamePieceNFT",
                description: "One game piece NFT to rule them all!",
                thumbnail: "https://www.cheezewizards.com/static/img/prizePool/coin.svg"
            ) as @NonFungibleToken.NFT

        // Get the id & deposit the token to the Receiver
        let newID: UInt64 = newNFT.id
        recipient.deposit(token: <-newNFT)

        emit MintedNFT(id: newID, totalSupply: GamePieceNFT.totalSupply)
    }

    init() {
        
        self.totalSupply = 0

        // Set Collection paths
        self.CollectionStoragePath = /storage/GamePieceNFTCollection
        self.CollectionPublicPath = /public/GamePieceNFTCollection
        self.ProviderPrivatePath = /private/GamePieceNFTCollectionProvider

        emit ContractInitialized()
    }
}
 
/* 
*
*  This is a Simple implementation of a Flow Non-Fungible Token
*  It is not part of the official standard but it assumed to be
*  similar to how many NFTs would implement the core functionality.
*
*  This contract does not implement any sophisticated classification
*  system for its NFTs. It defines a simple NFT with minimal metadata.
*   
*/

import NonFungibleToken from 0xNFTContractAddress
import FungibleToken from 0xFungibleTokenAddress

pub contract FlarpNarbleNFT2: NonFungibleToken {

    pub var totalSupply: UInt64

    pub event ContractInitialized()
    pub event Withdraw(id: UInt64, from: Address?)
    pub event Deposit(id: UInt64, to: Address?)

    pub let CollectionStoragePath: StoragePath
    pub let CollectionPublicPath: PublicPath
    pub let CollectionPrivatePath: PrivatePath
    pub let CollectionProxyPath: PrivatePath
    pub let MinterStoragePath: StoragePath
    pub let MinterPublicPath : PublicPath

    pub resource NFT: NonFungibleToken.INFT {
        pub let id: UInt64
        pub let name: String
    
        init(
            id: UInt64,
            name: String,
        ) {
            self.id = id
            self.name = name
        }
    }

    pub resource interface CollectionPublic {
        pub fun deposit(token: @NonFungibleToken.NFT)
        pub fun getIDs(): [UInt64]
        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT
        pub fun borrowFlarpNarbleNFT2(id: UInt64): &FlarpNarbleNFT2.NFT? 
    }
    
    pub resource interface CollectionPrivate {
    }
    
    pub resource interface CollectionProxy {
        pub fun SendToGame()
        pub fun RetrieveFromGame()
    }

    pub resource Collection: CollectionPublic, CollectionProxy, CollectionPrivate, NonFungibleToken.Provider, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic {
        // dictionary of NFT conforming tokens
        // NFT is a resource type with an `UInt64` ID field
        pub var ownedNFTs: @{UInt64: NonFungibleToken.NFT}

        init () {
            self.ownedNFTs <- {}
        }
        
        pub fun SendToGame() {
            log("Sent to game")
        }
        
        pub fun RetrieveFromGame() {
            log("Retrieved from game")
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
            let token <- token as! @FlarpNarbleNFT2.NFT

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
 
        pub fun borrowFlarpNarbleNFT2(id: UInt64): &FlarpNarbleNFT2.NFT? {
            if self.ownedNFTs[id] != nil {
                // Create an authorized reference to allow downcasting
                let ref = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
                return ref as! &FlarpNarbleNFT2.NFT
            }

            return nil
        }

        destroy() {
            destroy self.ownedNFTs
        }
    }

    // public function that anyone can call to create a new empty collection
    pub fun createEmptyCollection(): @FlarpNarbleNFT2.Collection {
        return <- create Collection()
    }

    pub resource interface PublicMinter {
        pub fun mintNFT(recipient: &{NonFungibleToken.CollectionPublic}, name: String) 
    }

    // Resource that an admin or something similar would own to be
    // able to mint new NFTs
    pub resource NFTMinter: PublicMinter {

        // mintNFT mints a new NFT with a new ID
        // and deposit it in the recipients collection using their collection reference
        pub fun mintNFT(
            recipient: &{NonFungibleToken.CollectionPublic},
            name: String
        ) 
        {
            // create a new NFT
            var newNFT <- create NFT(
                id: FlarpNarbleNFT2.totalSupply,
                name: name,
            )

            // deposit it in the recipient's account using their reference
            recipient.deposit(token: <-newNFT)

            FlarpNarbleNFT2.totalSupply = FlarpNarbleNFT2.totalSupply + UInt64(1)
        }
    }

    init() {
        // Initialize the total supply
        self.totalSupply = 0

        // Set the named paths
        self.CollectionStoragePath = /storage/FlarpNarbleNFT2Collection
        self.CollectionPublicPath = /public/FlarpNarbleNFT2Collection
        self.CollectionPrivatePath = /private/FlarpNarbleNFT2CollectionPrivate
        self.CollectionProxyPath = /private/FlarpNarbleNFT2CollectionProxy
        self.MinterStoragePath = /storage/FlarpNarbleNFT2Minter
        self.MinterPublicPath = /public/FlarpNarbleMinter

        /*
        // Create a Collection resource and save it to storage
        let collection <- create Collection()
        self.account.save(<-collection, to: self.CollectionStoragePath)

        // create a public capability for the collection
        self.account.link<&FlarpNarbleNFT.Collection{NonFungibleToken.CollectionPublic, FlarpNarbleNFT.CollectionPublic, MetadataViews.ResolverCollection}>(
            self.CollectionPublicPath,
            target: self.CollectionStoragePath
        )
        */

        // Create a Minter resource and save it to storage
        let minter <- create NFTMinter()
        self.account.save(<-minter, to: self.MinterStoragePath)

        self.account.link<&{PublicMinter}>(self.MinterPublicPath, target: /storage/FlarpNarbleNFT2Minter)

        emit ContractInitialized()
    }
}
 
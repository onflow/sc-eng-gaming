/* 
*
*  Very basic NFT implementation that supports proxy accounts
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

    //The collection that stores the NFTs
    pub resource Collection: CollectionPublic, CollectionProxy, CollectionPrivate, NonFungibleToken.Provider, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic {
        // dictionary of NFT conforming tokens
        // NFT is a resource type with an `UInt64` ID field
        pub var ownedNFTs: @{UInt64: NonFungibleToken.NFT}

        init () {
            self.ownedNFTs <- {}
        }
        
        //Placeholder for logic which would send an NFT to the game
        pub fun SendToGame() {
            log("Sent to game")
        }
        
        //Placeholder for logic which would retrieve an NFT from the game
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
 
        // Gets a reference to the NFT in the collection as this specific NFT type
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

        // Create a Minter resource and save it to storage
        let minter <- create NFTMinter()
        self.account.save(<-minter, to: self.MinterStoragePath)

        // Link the minter capability to a public path
        self.account.link<&{PublicMinter}>(self.MinterPublicPath, target: /storage/FlarpNarbleNFT2Minter)

        emit ContractInitialized()
    }
}
 
import NonFungibleToken from "./utility/NonFungibleToken.cdc"
import MetadataViews from "./utility/MetadataViews.cdc"
import GamingMetadataViews from "./GamingMetadataViews.cdc"

// Then, in the NFT contract, the NFT can just store the dictionary
// of the winLossRetrievers and return it via the metadata view
// The function to add a new retriever can just be public so that 
// we don't have to do any complicated access(contract) things
// and creating a new metadata updater resource.
// Since it is public, any game that the user deposits their NFT
// into can add their win/loss retriever function to it
// and games can implement their escrow mechanics in any way they want
// instead of having to be constrained to what is in here
pub contract ScoreNFT: NonFungibleToken {

	pub var totalSupply: UInt64
	pub let CollectionStoragePath: StoragePath
	pub let CollectionPublicPath: PublicPath

	pub event ContractInitialized()
	pub event Withdraw(id: UInt64, from: Address?)
    pub event Deposit(id: UInt64, to: Address?)

	pub resource NFT: NonFungibleToken.INFT, MetadataViews.Resolver {
		pub let id: UInt64
		/// maps the name of the game to its win/loss retriever function
		pub let winLossRetrievers: {String: ((UInt64): GamingMetadataViews.WinLoss?)}

		init() {
			self.id = self.uuid
			self.winLossRetrievers = {}
		}

		/// When a user deposits their NFT into a game session,
		/// the game can add their retriever to the NFT
		pub fun addWinLossRetriever(gameName: String, retriever: ((UInt64): GamingMetadataViews.WinLoss?)) {
			// make sure the name is not already in use
			if self.winLossRetrievers[gameName] != nil {
				self.winLossRetrievers[gameName] = retriever
			}
		}

		pub fun getViews(): [Type] {
			return [Type<GamingMetadataViews.WinLossView>()]
		}

		pub fun resolveView(_ view: Type): AnyStruct? {
			switch view {
				case Type<GamingMetadataViews.WinLossView>():
					return GamingMetadataViews.WinLossView(self.winLossRetrievers)
				default:
					return nil
			}
		}
	}

	pub resource interface ScoreNFTCollectionPublic {
        pub fun deposit(token: @NonFungibleToken.NFT)
        pub fun getIDs(): [UInt64]
        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT
        pub fun borrowScoreNFT(id: UInt64): &ScoreNFT.NFT? {
            post {
                (result == nil) || (result?.id == id):
                    "Cannot borrow ScoreNFT reference: the ID of the returned reference is incorrect"
            }
        }
    }

	pub resource Collection: ScoreNFTCollectionPublic, NonFungibleToken.Provider, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection {
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
            let token <- token as! @ScoreNFT.NFT

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
 
        pub fun borrowScoreNFT(id: UInt64): &ScoreNFT.NFT? {
            if self.ownedNFTs[id] != nil {
                // Create an authorized reference to allow downcasting
                let ref = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
                return ref as! &ScoreNFT.NFT
            }

            return nil
        }

        pub fun borrowViewResolver(id: UInt64): &AnyResource{MetadataViews.Resolver} {
            let nft = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
            let scoreNFT = nft as! &ScoreNFT.NFT
            return scoreNFT as &AnyResource{MetadataViews.Resolver}
        }

        destroy() {
            destroy self.ownedNFTs
        }
    }

	// public function that anyone can call to create a new empty collection
    pub fun createEmptyCollection(): @NonFungibleToken.Collection {
        let newCollection <- create Collection() as! @NonFungibleToken.Collection
        return <- newCollection
    }

	// TODO: Make a Minter resource
	pub fun mintNFT(recipient: &{NonFungibleToken.CollectionPublic}) {
		self.totalSupply = self.totalSupply + UInt64(1)
		let newNFT <- create NFT() as! @NonFungibleToken.NFT
		recipient.deposit(token: <-newNFT)
	}

	init() {
		self.totalSupply = 0
		self.CollectionStoragePath = /storage/ScoreNFTCollection
		self.CollectionPublicPath = /public/ScoreNFTCollection

		emit ContractInitialized()
	}
}

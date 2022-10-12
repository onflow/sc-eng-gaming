import NonFungibleToken from "./utility/NonFungibleToken.cdc"
import MetadataViews from "./utility/MetadataViews.cdc"
import ScoreNFT from "./contracts/ScoreNFT.cdc"

/// Transaction to setup ScoreNFT collection in the signer's account
transaction {

    prepare(acct: AuthAccount) {
        // Return early if the account already has a collection
        if acct.borrow<&ScoreNFT.Collection>(from: ScoreNFT.CollectionStoragePath) != nil {
            return
        }

        // Create a new empty collection
        let collection <- ScoreNFT.createEmptyCollection()

        // save it to the account
        acct.save(<-collection, to: ScoreNFT.CollectionStoragePath)

        // create a public capability for the collection
        acct.link<&{NonFungibleToken.CollectionPublic, ScoreNFT.ScoreNFTCollectionPublic, MetadataViews.ResolverCollection}>(
            ScoreNFT.CollectionPublicPath,
            target: ScoreNFT.CollectionStoragePath
        )
    }
}

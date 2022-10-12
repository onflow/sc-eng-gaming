import NonFungibleToken from "./utility/NonFungibleToken.cdc"
import ScoreNFT from "./contracts/ScoreNFT.cdc"

/// Transaction to setup ScoreNFT collection in the signer's account
transaction {

    let recipientCollectionRef: &{NonFungibleToken.CollectionPublic}
    prepare(acct: AuthAccount) {
        self.recipientCollectionRef = acct
            .getCapability(ScoreNFT.CollectionPublicPath)
            .borrow<&{NonFungibleToken.CollectionPublic}>()
            ?? panic("Could not get receiver reference to the NFT Collection")
    }

    execute {
        // Realistically, we should make a minter for game NFTs, but this will do for proof of concept
        ScoreNFT.mintNFT(recipient: self.recipientCollectionRef)
    }
}

import NonFungibleToken from "../../contracts/utility/NonFungibleToken.cdc"
import GamePieceNFT from "../../contracts/GamePieceNFT.cdc"

/// Transaction to setup GamePieceNFT collection in the signer's account
transaction {

    let recipientCollectionRef: &{NonFungibleToken.CollectionPublic}
    prepare(acct: AuthAccount) {
        self.recipientCollectionRef = acct
            .getCapability(GamePieceNFT.CollectionPublicPath)
            .borrow<&{NonFungibleToken.CollectionPublic}>()
            ?? panic("Could not get receiver reference to the NFT Collection")
    }

    execute {
        // Realistically, we should make a minter for game NFTs, but this will do for proof of concept
        GamePieceNFT.mintNFT(recipient: self.recipientCollectionRef)
    }
}

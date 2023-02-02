import NonFungibleToken from "../../contracts/utility/NonFungibleToken.cdc"
import ArcadePrize from "../../contracts/ArcadePrize.cdc"

/// Script to get NFT IDs in an account's collection
///
pub fun main(address: Address): [UInt64]? {

    if let collectionRef = getAccount(address)
        .getCapability<
            &ArcadePrize.Collection{NonFungibleToken.CollectionPublic}
        >(
            ArcadePrize.CollectionPublicPath
        ).borrow() {
        return collectionRef.getIDs()
    }

    return nil
}

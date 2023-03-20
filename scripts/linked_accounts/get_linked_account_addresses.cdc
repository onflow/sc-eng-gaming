import LinkedAccounts from "../../contracts/LinkedAccounts.cdc"

/// Returns the an account's linked account addresses 
///
pub fun main(parentAddress: Address): [Address] {

    // Get a ref to the parentAddress's LinkedAccounts.Collection
    let collectionRef = parentAccount.getCapability<
            &LinkedAccounts.Collection{LinkedAccounts.CollectionPublic}
        >(
            LinkedAccounts.CollectionPublicPath
        ).borrow()
        ?? panic(
            "Could not get a reference to the LinkedAccounts.Collection at address "
            .concat(parentAddress.toString())
        )
    // Return the linked accounts managed by the Collection
    return collectionRef.getLinkedAccountAddresses()
}

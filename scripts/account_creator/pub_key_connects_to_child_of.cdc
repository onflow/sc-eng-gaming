import AccountCreator from "../../contracts/utility/AccountCreator.cdc"
import LinkedAccounts from "../../contracts/LinkedAccounts.cdc"

/// Takes the address where a AccountCreator.CreatorPublic Capability lives, a public key as a String, and the address
/// where a LinkedAccounts.CollectionPublic Capability lives and return whether the given public key is tied to an
/// account that is an active child account of the specified parent address and the given public key is active on the 
/// account.
///
/// This would be helpful for our demo dapp determining if the key it has is valid for a user's child account or a 
/// child account needs to be created & linked
///
pub fun main(creatorAddress: Address, pubKey: String, parentAddress: Address): Bool {
    // Get a reference to the CreatorPublic Capability from creatorAddress
    if let creatorRef = getAccount(creatorAddress).getCapability<&AccountCreator.Creator{AccountCreator.CreatorPublic}>(
            AccountCreator.CreatorPublicPath
        ).borrow() {
        // Get the child address if it exists
        if let childAddress = creatorRef.getAddressFromPublicKey(publicKey: pubKey) {
            // Get a reference to the LinkedAccounts.CollectionPublic Capability from parentAddress
            if let collectionRef = getAccount(parentAddress).getCapability<
                    &LinkedAccounts.Collection{LinkedAccounts.CollectionPublic}
                >(LinkedAccounts.CollectionPublicPath).borrow() {
                return collectionRef.isLinkActive(onAddress: childAddress) &&
                    LinkedAccounts.isKeyActiveOnAccount(publicKey: pubKey, address: childAddress)
            }
        }
    }
    return false
}
 
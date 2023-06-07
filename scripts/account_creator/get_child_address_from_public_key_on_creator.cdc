import AccountCreator from "../../contracts/utility/AccountCreator.cdc"

/// Returns the address created by the AccountCreator.Creator with the given public key
///
pub fun main(creatorAddress: Address,): [Address]? {
    // Get a reference to the CreatorPublic Capability from creatorAddress & return its created addresses
    return getAccount(creatorAddress).getCapability<&AccountCreator.Creator{AccountCreator.CreatorPublic}>(
            AccountCreator.CreatorPublicPath
        ).borrow()?.getAllCreatedAddresses() ?? nil
}
 
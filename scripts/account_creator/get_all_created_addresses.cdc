import AccountCreator from "../../contracts/utility/AccountCreator.cdc"

/// Returns the addresses created by the AccountCreator.Creator at the given address or nil if such a Creator is not
/// accessible.
///
pub fun main(creatorAddress: Address,): [Address]? {
    // Get a reference to the CreatorPublic Capability from creatorAddress & return its created addresses
    return getAccount(creatorAddress).getCapability<&AccountCreator.Creator{AccountCreator.CreatorPublic}>(
            AccountCreator.CreatorPublicPath
        ).borrow()?.getAllCreatedAddresses() ?? nil
}
 
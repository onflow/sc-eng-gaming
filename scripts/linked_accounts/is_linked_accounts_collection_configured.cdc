import LinkedAccounts from "../../contracts/LinkedAccounts.cdc"

/// This script allows one to determine if a given account has a LinkedAccounts.Collection configured
///
pub fun main(address: Address): Bool {

    // Return whether the LinkedAccounts.Collection is configured as expected at the given address
    return getAuthAccount(address).type(at: LinkedAccounts.CollectionStoragePath) == Type<@LinkedAccounts.Collection>() &&
        getAccount(address).getCapability<&LinkedAccounts.Collection{LinkedAccounts.CollectionPublic}>(
            LinkedAccounts.CollectionPublicPath
        ).check()
}
 
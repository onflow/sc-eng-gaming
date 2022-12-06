import ChildAccount from "../contracts/ChildAccount.cdc"

/// This script allows one to determine if a given account is a child 
/// account of the specified parent account as the parent-child account
/// relationship is defined in the ChildAccount contract
///
pub fun main(parent: Address, child: Address): Bool {
    
    // Get a reference to the child account's ChildAccountTagPublic
    let childAccountTagRef = getAccount(child).
        getCapability<&{ChildAccount.ChildAccountTagPublic}>(
            ChildAccount.ChildAccountTagPublicPath
        ).borrow()
        ?? panic("Could not borrow reference to child's ChildAccountTagPublic Capability")
    
    // Return the result
    return childAccountTagRef.isChildAccountOf(parent)
}
 
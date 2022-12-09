import ChildAccount from "../../contracts/ChildAccount.cdc"

/// This script allows one to determine if a given account is a child 
/// account of the specified parent account as the parent-child account
/// relationship is defined in the ChildAccount contract
///
pub fun main(parent: Address, child: Address): Bool {

    // Get a reference to the ChildAccountManagerViewer in parent's account
    let viewerRef = getAccount(parent)
        .getCapability<&{
            ChildAccount.ChildAccountManagerViewer
        }>(
            ChildAccount.ChildAccountManagerPublicPath
        ).borrow()
        ?? panic("Could not borrow reference to parent's ChildAccountManagerViewer")
    
    // Return whether or not child address is contained in list of parent's children accounts
    return viewerRef.getChildAccountAddresses().contains(child)
}
 
import ChildAccount from "../../contracts/ChildAccount.cdc"

/// Adds the labeled child account as a Child Account in the parent accounts'
/// ChildAccountManager resource. The parent is given key access to the child
/// account
///
transaction(parent: Address) {

    prepare(child: AuthAccount) {
        // Get a reference to the ChildAcccountManager resource
        if let managerRef = getAccount(parent)
            .getCapability<
                {&ChildAccount.ChildAccountManagerPublic}
            >(
                ChildAccount.ChildAccountManagerPublicPath
            ).borrow() {
            
            // Create the child account
            managerRef.addAsChildAccount(newAccount: child)
        }
    }
}

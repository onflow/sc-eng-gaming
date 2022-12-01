import ChildAccount from "../../contracts/ChildAccount.cdc"

/// Adds the labeled child account as a Child Account in the parent accounts'
/// ChildAccountManager resource. The parent is given key access to the child
/// account
///
transaction {

    // ?? We can do this as a multi-sig txn or create a private ChildAccountManager Cap
    //    then give that to the child account & have them add themselves as a child account

    prepare(parent: AuthAccount, child: AuthAccount) {
        // Get a reference to the ChildAcccountManager resource
        if let managerRef = parent
            .borrow<&
                ChildAccount.ChildAccountManager
            >(from: ChildAccount.ChildAccountManagerStoragePath) {
            
            // Create the child account
            managerRef.addAsChildAccount(newAccount: child)
        }
    }
}

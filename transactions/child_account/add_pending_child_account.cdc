import ChildAccount from "../../contracts/ChildAccount.cdc"

/// Creates a new account, establishing an on-chain association between the two
/// accounts via ChildAccountManager (in the parent account) & ChildAccountAdmin
/// (in the child account). The parent funds the creation of the new account & 
/// additionally adds any specified funds, and is given key access to the new
/// account
///
/// Note: A "child account" is an account to which the signer's account's PublicKey is added,
/// at 1000.0 weight, giving them full signatory access to that account. This relationship
/// is represented on-chain via the ChildAccountManager.childAccounts mapping. Know that the
/// private key to this child account is generated outside of the context of this transaction and that
/// any assets in child accounts should be considered at risk if any party other than the signer has 
/// access to the given public key's paired private key
///
transaction(childAddress: Address) {

    prepare(signer: AuthAccount) {
        // Get a reference to the ChildAcccountManager resource
        if let managerRef = signer
            .borrow<&
                ChildAccount.ChildAccountManager
            >(from: ChildAccount.ChildAccountManagerStoragePath) {
            
            // Add the given Address as a pending child account, authorizing
            // the account with the address to add itself as a child account
            managerRef.addPendingChildAccount(address: childAddress)
        }
    }

}

import ChildAccount from "../../contracts/ChildAccount.cdc"

/// Creates a new account, establishing an on-chain association between the two
/// accounts via ChildAccountManager (in the parent account) & ChildAccountAdmin
/// (in the child account). The parent funds the creation of the new account & 
/// additionally adds any specified funds, and is given key access to the new
/// account
///
transaction(pubKey: String, fundingAmt: UFix64) {

    prepare(signer: AuthAccount) {
        // Get a reference to the ChildAcccountManager resource
        if let managerRef = signer
            .borrow<&
                ChildAccount.ChildAccountManager
            >(from: ChildAccount.ChildAccountManagerStoragePath) {
            
            // Create the child account
            managerRef.createChildAccount(
                signer: signer,
                publicKey: pubKey,
                initialFundingAmount: fundingAmt
            )
        }
    }

}

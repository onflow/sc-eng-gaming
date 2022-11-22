import ChildAccount from "../../contracts/ChildAccount.cdc"

transaction(pubKey: String, fundingAmt: UFix64) {

    prepare(signer: AuthAccount) {
        // Get a reference to the ChildAcccountManager resource
        if let managerRef = signer
            .borrow<&
                ChildAccount.ChildAccountManager
            >(from: ChildAccount.ChildAccountManagerStoragePath) {
            
            // Create the child account
            ChildAccount.createChildAccount(
                signer: signer,
                managerRef: managerRef,
                publicKey: pubKey,
                initialFundingAmount: fundingAmt
            )
        }
    }

}

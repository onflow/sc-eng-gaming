#allowAccountLinking

import FungibleToken from "../../contracts/utility/FungibleToken.cdc"
import FlowToken from "../../contracts/utility/FlowToken.cdc"
import MetadataViews from "../../contracts/utility/MetadataViews.cdc"
import NonFungibleToken from "../../contracts/utility/NonFungibleToken.cdc"
import LinkedAccountMetadataViews from "../../contracts/LinkedAccountMetadataViews.cdc"
import LinkedAccounts from "../../contracts/LinkedAccounts.cdc"

/// This transaction creates an account, funding creation via the signing account and adding the provided
/// public key (presumably custodied by the signing client/dApp). The new account then links a Capability to its
/// AuthAccount, and publishes that Capability to be claimed by the given parent account.
///
transaction(
    pubKey: String,
    fundingAmt: UFix64,
    authAccountPathSuffix: String,
    parentAddress: Address
  ) {
	
	prepare(signer: AuthAccount) {
		
		/* --- Account Creation (your dApp may choose to handle creation differently depending on your custodial model) --- */
		//
		// Create the child account, funding via the signer
		let newAccount = AuthAccount(payer: signer)
		// Create a public key for the proxy account from string value in the provided arg
		// **NOTE:** You may want to specify a different signature algo for your use case
		let key = PublicKey(
			publicKey: pubKey.decodeHex(),
			signatureAlgorithm: SignatureAlgorithm.ECDSA_P256
		)
		// Add the key to the new account
		// **NOTE:** You may want to specify a different hash algo & weight best for your use case
		newAccount.keys.add(
			publicKey: key,
			hashAlgorithm: HashAlgorithm.SHA3_256,
			weight: 1000.0
		)

		/* (Optional) Additional Account Funding */
		//
		// Fund the new account if specified
		if fundingAmt > 0.0 {
			// Get a vault to fund the new account
			let fundingProvider = signer.borrow<&FlowToken.Vault{FungibleToken.Provider}>(
					from: /storage/flowTokenVault
				)!
			// Fund the new account with the initialFundingAmount specified
			newAccount.getCapability<&FlowToken.Vault{FungibleToken.Receiver}>(
				/public/flowTokenReceiver
			).borrow()!
			.deposit(
				from: <-fundingProvider.withdraw(
					amount: fundingAmt
				)
			)
		}

		// At this point, the newAccount can further be configured as suitable for
		// use in your dapp (e.g. Setup a Collection, Mint NFT, Configure Vault, etc.)
		// ...

		/* --- Link the new account's AuthAccount Capability & publish --- */
        //
		// Assign the PrivatePath where we'll link the AuthAccount Capability
        let authAccountPath: PrivatePath = PrivatePath(identifier: authAccountPathSuffix)
            ?? panic("Could not construct PrivatePath from given suffix: ".concat(authAccountPathSuffix))
		// Link the new account's AuthAccount Capability
		let authAccountCap: Capability<&AuthAccount> = newAccount.linkAccount(authAccountPath)
        // Publish AuthAccount Capability to be claimed by parent
        // **NOTE:** You could specify a name for the published Capability in the txn args if you wished
        newAccount.inbox.publish(self.authAccountCap!, name: "AuthAccountCapability", recipient: parentAddress)
	}
}

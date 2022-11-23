import FungibleToken from 0xee82856bf20e2aa6
import FlowToken from 0x0ae53cb6e3f42a79

pub contract ChildAccount {

    // Establish metadataview when child account is created
    // - dapp name/publisher name
    // - publisher logo
    // - etc
    // Track resources added and removed to child account
    //
    // Child account per game per device - tied to physical location of where keys are stored
    //
    // Offer quick utility to bulk move assets between child
    pub let ChildAccountManagerStoragePath: StoragePath

    pub resource ChildAccountManager {
        pub let childAccounts: @{Address: ChildAccountAdmin}

        init() {
            self.childAccounts <-{}
        }

        /// Add a ChildAccountAdmin to this manager resource
        pub fun addChildAccount(handle: @ChildAccountAdmin) {
            pre {
                !self.childAccounts.containsKey(handle.address):
                    "Child account with given address already exists!"
            }
            let addr = handle.address
            self.childAccounts[addr] <-! handle
        }

        /// Remove ChildAccountAdmin, returning if it exists
        pub fun removeChildAccountAdmin(withAddress: Address): @ChildAccountAdmin? {
            return <-self.childAccounts.remove(key: withAddress)
        }

        destroy() {
            pre {
                self.childAccounts.length == 0
            }
            destroy self.childAccounts
        }
    }

    pub resource ChildAccountAdmin {
        pub let address: Address

        init(address: Address) {
            self.address = address
        }
    }

    pub fun createChildAccount(
        signer: AuthAccount,
        managerRef: &ChildAccountManager,
        publicKey: String,
        initialFundingAmount: UFix64
    ) {
        //Create a public key for the proxy account from the passed in string
        let key = PublicKey(
            publicKey: publicKey.decodeHex(),
            signatureAlgorithm: SignatureAlgorithm.ECDSA_P256
        )
        
        //Create the proxy account
        let newAccount = AuthAccount(payer: signer)
        
        //Add the key to the new account
        newAccount.keys.add(
            publicKey: key,
            hashAlgorithm: HashAlgorithm.SHA3_256,
            weight: 1000.0
        )

        //Add some initial funds to the new account, pulled from the signing account.  Amount determined by initialFundingAmount
        newAccount.getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)!
            .borrow()!
            .deposit(
                from: <- signer.borrow<&{
                    FungibleToken.Provider
                }>(
                    from: /storage/flowTokenVault
                )!.withdraw(amount: 0.0)
            )
        
        newAccount.save(signer.address, to: /storage/MainAccountAddress)

        managerRef.addChildAccount(handle: <-create ChildAccountAdmin(address: newAccount.address))
    }

    pub fun createChildAccountManager(): @ChildAccountManager {
        return <-create ChildAccountManager()
    }

    init() {
        self.ChildAccountManagerStoragePath = /storage/ChildAccountManager
    }
}

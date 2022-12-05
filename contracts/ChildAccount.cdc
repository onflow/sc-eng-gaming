import FungibleToken from 0xee82856bf20e2aa6
import FlowToken from 0x0ae53cb6e3f42a79
import MetadataViews from "./utility/MetadataViews.cdc"

pub contract ChildAccount {

    // Establish metadataview when child account is created
    // - dapp name/publisher name
    // - publisher logo
    // - etc

    // Offer quick utility to bulk move assets between child
    pub let ChildAccountManagerStoragePath: StoragePath
    pub let ChildAccountManagerPublicPath: PublicPath
    pub let ChildAccountManagerPrivatePath: PrivatePath

    pub resource interface ChildAccountManagerPublic {
        pub fun addAsChildAccount(newAccount: AuthAccount, childAccountInfo: ChildAccountInfo)
    }

    pub resource interface ChildAccountManagerViewer {
        pub fun getChildAccountAddresses(): [Address]
        pub fun getChildAccountInfo(address: Address): ChildAccountInfo?
    }

    pub resource ChildAccountManager : ChildAccountManagerPublic, ChildAccountManagerViewer {
        pub let childAccounts: @{Address: ChildAccountTag}
        pub let pendingChildAccounts: [Address]

        init() {
            self.childAccounts <-{}
            self.pendingChildAccounts = []
        }

        /** --- ChildAccountManagerPublic --- */

        /// Add a ChildAccountAdmin to this manager resource
        pub fun addAsChildAccount(newAccount: AuthAccount, childAccountInfo: ChildAccountInfo) {
            pre {
                !self.childAccounts.containsKey(newAccount.address):
                    "Child account with given address already exists!"
                self.pendingChildAccounts.contains(newAccount.address):
                    "Provided accounts is not authorized to be added as a child account"
            }
            newAccount.keys.add(
                publicKey: self.owner!.keys.get(keyIndex: 0)!.publicKey,
                hashAlgorithm: HashAlgorithm.SHA3_256,
                weight: 1000.0
            )
            // Create ChildAccountTag
            let child <-create ChildAccountTag(
                    parentAddress: self.owner!.address,
                    address: newAccount.address,
                    info: childAccountInfo
                )
            // Add ChildAccountTag indexed by the account's address
            self.childAccounts[newAccount.address] <-! child
            // Remove from the pending child accounts array
            self.pendingChildAccounts.remove(at: self.pendingChildAccounts.firstIndex(of: newAccount.address)!)
        }

        /** --- ChildAccountManagerViewer --- */

        /// Returns an array of all child account addresses
        pub fun getChildAccountAddresses(): [Address] {
            return self.childAccounts.keys
        }
        
        /// Returns ChildAccountInfo struct containing info about the child account
        /// or nil if there is no child account with the given address
        pub fun getChildAccountInfo(address: Address): ChildAccountInfo? {
            if let childAccount = &self.childAccounts[address] as &ChildAccountTag? {
                return childAccount.info
            }
            return nil
        }

        pub fun createChildAccount(
            signer: AuthAccount,
            publicKey: String,
            initialFundingAmount: UFix64,
            childAccountInfo: ChildAccountInfo
        ) {
            // Create a public key for the proxy account from the passed in string
            let key = PublicKey(
                publicKey: publicKey.decodeHex(),
                signatureAlgorithm: SignatureAlgorithm.ECDSA_P256
            )
            
            // Create the proxy account
            let newAccount = AuthAccount(payer: signer)
            
            //Add the key to the new account
            newAccount.keys.add(
                publicKey: key,
                hashAlgorithm: HashAlgorithm.SHA3_256,
                weight: 1000.0
            )

            // Add the signer's public key to the new account 
            newAccount.keys.add(
                publicKey: signer.keys.get(keyIndex: 0)!.publicKey,
                hashAlgorithm: HashAlgorithm.SHA3_256,
                weight: 1000.0
            )

            // Add some initial funds to the new account, pulled from the signing account.  Amount determined by initialFundingAmount
            newAccount.getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
                .borrow()!
                .deposit(
                    from: <- signer.borrow<&{
                        FungibleToken.Provider
                    }>(
                        from: /storage/flowTokenVault
                    )!.withdraw(amount: initialFundingAmount)
                )
            
            newAccount.save(signer.address, to: /storage/MainAccountAddress)

            let child <-create ChildAccountTag(
                    parentAddress: signer.address,
                    address: newAccount.address,
                    info: childAccountInfo
                )
            self.childAccounts[newAccount.address] <-! child
        }

        /// Remove ChildAccountTag, returning if it exists
        pub fun removeChildAccount(withAddress: Address): @ChildAccountTag? {
            return <-self.childAccounts.remove(key: withAddress)
        }

        /// Add address to list of pendingChildAccounts so that account can add itself as a
        /// ChildAccount to this resource's owner
        ///
        pub fun addPendingChildAccount(address: Address) {
            self.pendingChildAccounts.append(address)
        }

        destroy() {
            pre {
                self.childAccounts.length == 0
            }
            destroy self.childAccounts
        }
    }

    /// Resource that identifies an account as a child account
    pub resource ChildAccountTag {
        pub let parentAddress: Address
        pub let address: Address
        pub let info: ChildAccountInfo
        access(self) var revoked: Bool

        init(parentAddress: Address, address: Address, info: ChildAccountInfo) {
            self.parentAddress = parentAddress
            self.address = address
            self.info = info
            self.revoked = false
        }
    }

    pub struct ChildAccountInfo {
        pub let name: String
        pub let description: String
        pub let icon: AnyStruct{MetadataViews.File}
        pub let externalURL: MetadataViews.ExternalURL

        init(
            name: String,
            description: String,
            icon: AnyStruct{MetadataViews.File},
            externalURL: MetadataViews.ExternalURL
        ) {
            self.name = name
            self.description = description
            self.icon = icon
            self.externalURL = externalURL
        }
    }

    pub fun createChildAccountManager(): @ChildAccountManager {
        return <-create ChildAccountManager()
    }

    init() {
        self.ChildAccountManagerStoragePath = /storage/ChildAccountManager
        self.ChildAccountManagerPublicPath = /public/ChildAccountManager
        self.ChildAccountManagerPrivatePath = /private/ChildAccountManager
    }
}

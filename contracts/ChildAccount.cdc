import FungibleToken from 0xee82856bf20e2aa6
import FlowToken from 0x0ae53cb6e3f42a79
import MetadataViews from "./utility/MetadataViews.cdc"

/// This contract is an attempt at establishing and representing a
/// parent-child (AKA puppet or proxy) account hierarchy between accounts.
/// The ChildAccountManager allows a parent account to create child accounts, and
/// maintains a mapping of child accounts as they are created.AccountKey
///
/// An account is deemed a child of a parent if the parent has 1000.0 weight
/// key access to the child account. This means that both the parent's private key
/// and the pairwise private key of the public key provided on creation have access
/// to the accounts created via that ChildAccountManager resource.
///
/// While one generally would not want to share account access with other parties,
/// this can be helpful in a low-stakes environment where the parent account's owner
/// wants to delegate transaction signing to a secondary party. The idea for this setup
/// was born out of pursuit of a more seamless on-chain gameplay UX where a user could
/// let a game client submit transactions on their behalf without signing over the whole
/// of their primary account, and do so in a way that didn't require custom a Capability.
///
/// With that said, users should bare in mind that any assets in a child account incur
/// obvious custody risk, and that it's generally an anti-patter to pass around AuthAccounts.
/// In this case, a user owns both accounts so they are technically passing an AuthAccount
/// to themselves in calls to resources that reside in their own account, so it was deemed
/// a valid application of the pattern.
///
pub contract ChildAccount {

    // Establish metadataview when child account is created
    // - dapp name/publisher name
    // - publisher logo
    // - etc
    // Offer quick utility to bulk move assets between child

    pub let ChildAccountManagerStoragePath: StoragePath
    pub let ChildAccountManagerPublicPath: PublicPath
    pub let ChildAccountManagerPrivatePath: PrivatePath
    pub let ChildAccountTagStoragePath: StoragePath
    pub let ChildAccountTagPrivatePath: PrivatePath

    /** --- ChildAccountManager --- */

    /// Interface that exposes ability for an account to add itself as a child account
    /// on the account in which the implementing resource resides
    ///
    pub resource interface ChildAccountManagerPublic {
        pub fun addAsChildAccount(newAccount: AuthAccount, childAccountInfo: ChildAccountInfo)
    }

    /// Interface that allows one to view information about the owning account's
    /// child accounts including the addresses for all child accounts and information
    /// about specific child accounts by Address
    ///
    pub resource interface ChildAccountManagerViewer {
        pub fun getChildAccountAddresses(): [Address]
        pub fun getChildAccountInfo(address: Address): ChildAccountInfo?
    }

    /// Resource that both identifies a parent account and allows for management of on-
    /// chain associations between those accounts. Note that while creating child accounts
    /// is available in this resource, revoking keys on those child accounts is not.
    /// 
    pub resource ChildAccountManager : ChildAccountManagerPublic, ChildAccountManagerViewer {
        /// Mapping of child accounts, representing all child accounts 
        pub let childAccounts: {Address: Capability<&ChildAccountTag>}
        pub let pendingChildAccounts: [Address]

        init() {
            self.childAccounts = {}
            self.pendingChildAccounts = []
        }

        /** --- ChildAccountManagerPublic --- */

        /// Add a ChildAccountAdmin to this manager resource
        ///
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
            // Save the ChildAccountTag in the child account's storage & link
            newAccount.save(<-child, to: ChildAccount.ChildAccountTagStoragePath)
            newAccount.link<&ChildAccountTag>(
                ChildAccount.ChildAccountTagPrivatePath,
                target: ChildAccount.ChildAccountTagStoragePath
            )
            // Get a Capability to the linked ChildAccountTag Cap in child's private storage
            let tagCap = newAccount
                .getCapability<&
                    ChildAccountTag
                >(
                    ChildAccount.ChildAccountTagPrivatePath
                )
            // Ensure the capability is valid before inserting it in manager's childAccounts mapping
            assert(tagCap.check(), message: "Problem linking ChildAccoutTag Capability in new child account!")
            self.childAccounts.insert(key: newAccount.address, tagCap)
            
            // Remove from the pending child accounts array
            self.pendingChildAccounts.remove(
                at: self.pendingChildAccounts.firstIndex(of: newAccount.address)!
            )
        }

        /** --- ChildAccountManagerViewer --- */

        /// Returns an array of all child account addresses
        ///
        pub fun getChildAccountAddresses(): [Address] {
            return self.childAccounts.keys
        }
        
        /// Returns ChildAccountInfo struct containing info about the child account
        /// or nil if there is no child account with the given address
        ///
        pub fun getChildAccountInfo(address: Address): ChildAccountInfo? {
            if let tagCap = self.childAccounts[address] {
                let tagRef = tagCap.borrow() ?? panic("ChildAccountTag has been unlinked!")
                return tagRef.info
            }
            return nil
        }

        /// Creates an account out of the given public key, funding it with Flow from the
        /// signer's vault and adding the signer's public key to the new account with 1000.0
        /// weight. The on-chain association between ChildAccountManager & ChildAccountTag
        /// identifies the parent-child hierarchy between accounts on-chain in a manner that
        /// is easily interpretable by wallets & DApps.AccountKey
        ///
        pub fun createChildAccount(
            signer: AuthAccount,
            initialFundingAmount: UFix64,
            childAccountInfo: ChildAccountInfo
        ) {
            // Create a public key for the proxy account from the passed in string
            let key = PublicKey(
                publicKey: childAccountInfo.originatingPublicKey.decodeHex(),
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

            // Create the ChildAccountTag for the new account
            let child <-create ChildAccountTag(
                    parentAddress: signer.address,
                    address: newAccount.address,
                    info: childAccountInfo
                )
            // Save the ChildAccountTag in the child account's storage & link
            newAccount.save(<-child, to: ChildAccount.ChildAccountTagStoragePath)
            newAccount.link<&ChildAccountTag>(
                ChildAccount.ChildAccountTagPrivatePath,
                target: ChildAccount.ChildAccountTagStoragePath
            )
            // Add ChildAccountTag Capability indexed by the account's address
            let tagCap = newAccount
                .getCapability<&
                    ChildAccountTag
                >(
                    ChildAccount.ChildAccountTagPrivatePath
                )
            // Ensure the capability is valid before inserting it in manager's childAccounts mapping
            assert(tagCap.check(), message: "Problem linking ChildAccoutTag Capability in new child account!")
            self.childAccounts.insert(key: newAccount.address, tagCap)
        }

        /// Remove ChildAccountTag, returning its Capability if it exists. Note, doing so
        /// does not revoke the key on the child account. This should be done in the same
        /// transaction in which this method is called.
        ///
        pub fun removeChildAccount(withAddress: Address): Capability<&ChildAccountTag>? {
            if let cap = self.childAccounts.remove(key: withAddress) {
                // Set the ChildAccountTag to inactive since it's being removed
                cap.borrow()?.setInactive()
                return cap
            }
            return nil
        }

        /// Add address to list of pendingChildAccounts so that account can add itself as a
        /// ChildAccount to this resource's owner
        ///
        pub fun addPendingChildAccount(address: Address) {
            self.pendingChildAccounts.append(address)
        }
    }

    /** --- Child Account Taq--- */

    /// Resource that identifies an account as a child account and maintains info
    /// about its parent & association
    ///
    pub resource ChildAccountTag {
        pub let parentAddress: Address
        pub let address: Address
        pub let info: ChildAccountInfo
        access(contract) var isActive: Bool

        init(parentAddress: Address, address: Address, info: ChildAccountInfo) {
            self.parentAddress = parentAddress
            self.address = address
            self.info = info
            self.isActive = false
        }

        access(contract) fun setInactive() {
            self.isActive = false
        }
    }

    /// Struct that identifies information that could be used to determine the off-chain
    /// associations of a child account
    pub struct ChildAccountInfo {
        pub let name: String
        pub let description: String
        pub let icon: AnyStruct{MetadataViews.File}
        pub let externalURL: MetadataViews.ExternalURL
        pub let originatingPublicKey: String

        init(
            name: String,
            description: String,
            icon: AnyStruct{MetadataViews.File},
            externalURL: MetadataViews.ExternalURL,
            originatingPublicKey: String
        ) {
            self.name = name
            self.description = description
            self.icon = icon
            self.externalURL = externalURL
            self.originatingPublicKey = originatingPublicKey
        }
    }

    pub fun createChildAccountManager(): @ChildAccountManager {
        return <-create ChildAccountManager()
    }

    init() {
        self.ChildAccountManagerStoragePath = /storage/ChildAccountManager
        self.ChildAccountManagerPublicPath = /public/ChildAccountManager
        self.ChildAccountManagerPrivatePath = /private/ChildAccountManager

        self.ChildAccountTagStoragePath = /storage/ChildAccountTag
        self.ChildAccountTagPrivatePath = /private/ChildAccountTag
    }
}
 
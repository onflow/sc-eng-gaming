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
    pub let ChildAccountTagPublicPath: PublicPath
    pub let ChildAccountTagPrivatePath: PrivatePath
    pub let ChildAccountCreatorStoragePath: StoragePath


        //check
    /// This should be rather a view (I'm using it as a view)
    ///
    /// Identifies information that could be used to determine the off-chain
    /// associations of a child account
    ///
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


    /** --- Child Account Tag--- */
        //check
    ///
    ///
    ///
    pub resource interface ChildAccountTagPublic {
        pub let parentAddress: Address
        pub let address: Address
        pub let info: ChildAccountInfo
        pub fun getGrantedCapabilityTypes(): [Type]
        pub fun isCurrentlyActive(): Bool
    }

        //check
    /// Identifies an account as a child account and maintains info
    /// about its parent & association as well as Capabilities granted by
    /// its parent's ChildAccountManager
    ///
    pub resource ChildAccountTag : ChildAccountTagPublic {
        pub let parentAddress: Address
        pub let address: Address
        pub let info: ChildAccountInfo
        access(contract) let grantedCapabilities: {Type: Capability}
        access(contract) var isActive: Bool

        init(
            parentAddress: Address,
            address: Address,
            info: ChildAccountInfo
        ) {
            self.parentAddress = parentAddress
            self.address = address
            self.info = info
            self.grantedCapabilities = {}
            self.isActive = true
        }

        /** --- ChildAccountTagPublic --- */
        pub fun getGrantedCapabilityTypes(): [Type] {
            return self.grantedCapabilities.keys
        }
        
        pub fun isCurrentlyActive(): Bool {
            return self.isActive
        }

        /** --- ChildAccountTag --- */
        pub fun getGrantedCapabilityAsRef(_ type: Type): &Capability? {
            return &self.grantedCapabilities[type] as &Capability?
        }
        
        pub fun getGrantedCapabilities(): {Type: Capability} {
            return self.grantedCapabilities
        }

        access(contract) fun grantCapability(_ cap: Capability) {
            pre {
                !self.grantedCapabilities.containsKey(cap.getType()):
                    "Already granted Capability of given type!"
            }
            self.grantedCapabilities.insert(key: cap.getType(), cap)
        }

        access(contract) fun revokeCapability(_ type: Type): Capability? {
            return self.grantedCapabilities.remove(key: type)
        }

        access(contract) fun setInactive() {
            self.isActive = false
        }
    }

        //check
    /// Wrapper for the child's info and authacct and tag capabilities
    ///
    pub resource ChildAccountController: MetadataViews.Resolver {
        
        access(self) let authAccountCapability: Capability<&AuthAccount>
        access(self) var childAccountTagCapability: Capability<&ChildAccountTag>?

        init(authAccountCapability: Capability<&AuthAccount>) {
            self.authAccountCapability = authAccountCapability
            self.childAccountTagCapability = nil
        }

        /// Store the child account tag capability
        ///
        pub fun setTagCapability (tagCapability: Capability<&ChildAccountTag>) {
            self.childAccountTagCapability = tagCapability
        }

        /// Function that returns all the Metadata Views implemented by a Child Account controller
        ///
        /// @return An array of Types defining the implemented views. This value will be used by
        ///         developers to know which parameter to pass to the resolveView() method.
        ///
        pub fun getViews(): [Type] {
            return [
                Type<ChildAccount.ChildAccountInfo>()
            ]
        }

        /// Function that resolves a metadata view for this ChildAccount.
        ///
        /// @param view: The Type of the desired view.
        /// @return A structure representing the requested view.
        ///
        pub fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<ChildAccount.ChildAccountInfo>():
                    return self.childAccountTagCapability.borrow()!.info
                default:
                    return nil
            }
        }
        // If we need to access the ChildTag data we need to create getters here

        /// Get a reference to the child AuthAccount object.
        /// What is better to do if the capability can not be borrowed? return an optional or just panic?
        ///
        /// We could explore making the account controller a more generic solution (resource interface)
        /// and allow developers to create their own application specific more restricted getters that only expose
        /// specific parts of the account (e.g.: a certain NFT collection). This could not be very useful for the child 
        /// accounts since you will be restricting the highest permission level account access to something it owns, but
        /// could be useful for other forms of delegated access
        ///
        pub fun getAuthAcctRef(): &AuthAccount {
            return self.authAccountCapability.borrow()!
        }

        pub fun getTagPublicRef(): &{ChildAccountTagPublic} {
            return self.childAccountTagCapability.borrow()!
        }
    }

    
    
    /// Anyone holding this resource could create accounts, keeping a mapping of their public keys to their addresses,
    /// and later associate a parent account to any of it, by creating a ChildTagAccount into the previously created 
    /// account and creating a ChildAccountController resource that should be hold by the parent account in a ChildAccountManager
    /// 
    pub resource ChildAccountCreator {
        // mapping of public_key: address
        access(self) let createdChildren: {String: Address}

        pub fun createChildAccount(
            signer: AuthAccount,
            initialFundingAmount: UFix64,
            childAccountInfo: ChildAccountInfo
        ): AuthAccount {
            
            // Create the proxy account
            let newAccount = AuthAccount(payer: signer)

            self.unclaimedChildren[newAccount.address]
                <-! create ChildAccountController(
                    authAccountCapability: newAccount.linkAccount(/private/authAccountCapability))


            // Create a public key for the proxy account from the passed in string
            let key = PublicKey(
                publicKey: childAccountInfo.originatingPublicKey.decodeHex(),
                signatureAlgorithm: SignatureAlgorithm.ECDSA_P256
            )
            
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
            newAccount.link<&{ChildAccountTagPublic}>(
                ChildAccount.ChildAccountTagPublicPath,
                target: ChildAccount.ChildAccountTagStoragePath
            )
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

            return newAccount
        }

        pub fun adoptChild (): ChildAccountController {


        }

        pub fun getChildAddress (publicKey: String): Address? {
            return self.createdChildren[publicKey]
        }

        init () {
            self.createdChildren = {}
        }

    }




    /** --- ChildAccountManager --- */

    /// Interface that allows one to view information about the owning account's
    /// child accounts including the addresses for all child accounts and information
    /// about specific child accounts by Address
    ///
    pub resource interface ChildAccountManagerViewer {
        pub fun getChildAccountAddresses(): [Address]
        // Metadata views collection?
        pub fun getChildAccountInfo(address: Address): ChildAccountInfo?
    }

    /// Resource allows for management of on-chain associations between accounts.
    ///  Note that while creating child accounts
    /// is available in this resource, revoking keys on those child accounts is not.
    /// 
    pub resource ChildAccountManager : ChildAccountManagerViewer {

        pub let childAccounts: @{Address: ChildAccountController}

        init() {
            self.childAccounts <- {}
        }

        /** --- ChildAccountManagerPublic --- */

        /// Add a ChildAccountAdmin to this manager resource
        ///
        pub fun addChildAccountController(newAccountController: @ChildAccountController, addOwnKey: Bool) {
            pre {
                !self.childAccounts.containsKey(newAccountController.getTagPublicRef().address):
                    "Child account with given address already exists!"
            }
            if (addOwnKey) {
                newAccountController.getAuthAcctRef().keys.add(
                    publicKey: self.owner!.keys.get(keyIndex: 0)!.publicKey,
                    hashAlgorithm: HashAlgorithm.SHA3_256,
                    weight: 1000.0
                )
            }
            // Create ChildAccountTag
            let child <-create ChildAccountTag(
                    parentAddress: self.owner!.address,
                    address: newAccountController.getTagPublicRef().address,
                    info: newAccountController.getTagPublicRef().info
                )
            // Save the ChildAccountTag in the child account's storage & link
            newAccountController.getAuthAcctRef().save(<-child, to: ChildAccount.ChildAccountTagStoragePath)
            newAccountController.getAuthAcctRef().link<&{ChildAccountTagPublic}>(
                ChildAccount.ChildAccountTagPublicPath,
                target: ChildAccount.ChildAccountTagStoragePath
            )
            newAccountController.getAuthAcctRef().link<&ChildAccountTag>(
                ChildAccount.ChildAccountTagPrivatePath,
                target: ChildAccount.ChildAccountTagStoragePath
            )
            // Get a Capability to the linked ChildAccountTag Cap in child's private storage
            let tagCap = newAccountController.getAuthAcctRef()
                .getCapability<&
                    ChildAccountTag
                >(
                    ChildAccount.ChildAccountTagPrivatePath
                )
            // Ensure the capability is valid before inserting it in the controller
            assert(tagCap.check(), message: "Problem linking ChildAccoutTag Capability in new child account!")
            // Add the capability to the ChildAccountController
            newAccountController.setTagCapability(tagCapability: tagCap)
            // Add the controller to the dictionary
            let oldController <- self.childAccounts[newAccountController.getTagPublicRef().address] <- newAccountController
            destroy oldController
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
            return self.getChildAccountTagRef(address: address)?.info ?? nil
        }

        /** --- ChildAccountManager --- */

        /// Allows the ChildAccountManager to retrieve a reference to the ChildAccountTag
        /// for a specified child account address
        ///
        /// @param address: The Address of the child account
        ///
        /// @return the reference to the child account's ChildAccountTag
        ///
        pub fun getChildAccountTagRef(address: Address): &ChildAccountTag? {
            if let tagCap = self.childAccounts[address] {
                let tagRef = tagCap
                    .borrow()
                    ?? panic("Could not borrow reference to ChildAccountTag for child address ".concat(address.toString()))
                return tagRef
            }
            return nil
        }

        /// Remove ChildAccountTag, returning its Capability if it exists. Note, doing so
        /// does not revoke the key on the child account. This should be done in the same
        /// transaction in which this method is called.
        ///
        pub fun removeChildAccount(withAddress: Address): Capability<&ChildAccountTag>? {
            if let tagCap = self.childAccounts.remove(key: withAddress) {
                // Get a reference to the ChildAccountTag from the Capability
                let tagRef = tagCap
                    .borrow()
                    ?? panic("Link to ChildAccountTag Capability is broken!")
                // Set the tag as inactive
                tagRef.setInactive()

                // Remove all capabilities from the ChildAccountTag
                for capType in tagRef.getGrantedCapabilityTypes() {
                    tagRef.revokeCapability(capType)
                }

                // Finally, return the Capability
                return tagCap
            }
            return nil
        }

        destroy () {
            destroy self.childAccounts
        }
        
    }

    pub fun createChildAccountManager(): @ChildAccountManager {
        return <-create ChildAccountManager()
    }

    pub fun createChildAccountCreator(): @ChildAccountCreator {
        return <-create ChildAccountCreator()
    }

    init() {
        self.ChildAccountManagerStoragePath = /storage/ChildAccountManager
        self.ChildAccountManagerPublicPath = /public/ChildAccountManager
        self.ChildAccountManagerPrivatePath = /private/ChildAccountManager

        self.ChildAccountTagStoragePath = /storage/ChildAccountTag
        self.ChildAccountTagPublicPath = /public/ChildAccountTag
        self.ChildAccountTagPrivatePath = /private/ChildAccountTag

        self.ChildAccountCreatorStoragePath = /storage/ChildAccountCreator
    }
}
 
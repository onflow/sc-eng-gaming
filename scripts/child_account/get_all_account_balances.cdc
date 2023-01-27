import FungibleToken from "../../contracts/utility/FungibleToken.cdc"
import MetadataViews from "../../contracts/utility/MetadataViews.cdc"
// import ChildAccount from "../../contracts/ChildAccount.cdc"
import ChildAccount from "../../contracts/ChildAuthAccount.cdc"

// TODO - convert to support FungibleToken balances
pub struct VaultView {
    pub let vaultType: Type
    pub let balance: UFix64
    pub let ownerAddress: Address
    init(
        vaultType: Type,
        balance: UFix64,
        ownerAddress: Address
    ) {
        self.vaultType = vaultType
        self.balance = balance
        self.ownerAddress = ownerAddress
    }
}

pub fun getAllBalancesFromAddress(_ address: Address): {Type: VaultView} {
    // Get the account
    let account = getAccount(address)
    // Init for return value
    let balances: {Type: VaultView} = {}
    // Assign the types we'll need
    let balanceType: Type = Type<&{FungibleToken.Balance}>()

    // Iterate over each public path
    account.forEachPublic(fun (path: PublicPath, type: Type): Bool {
        // Check if it's a Collection we're interested in, if so, get a reference
        if type.isSubtype(of: balanceType) {
            if let balanceRef = account.getCapability<
                &{FungibleToken.Balance}
            >(path)
            .borrow() {
                // Add it to our balances
                if balances[type] != nil {
                    let vaultView = VaultView(
                        vaultType: type,
                        balance: balanceRef.balance,
                        ownerAddress: balanceRef.owner!.address
                    )
                    balances.insert(key: type, vaultView)
                } else {
                    // Update the balance for the given Vault type
                    let beforeBalance = balances[type]!.balance
                    let newVaultView = VaultView(
                        vaultType: type,
                        balance: beforeBalance + balanceRef.balance,
                        ownerAddress: balanceRef.owner!.address
                    )
                    // Remove the old value & replace with the updated one
                    balances.remove(key: type)
                    balances.insert(key: type, newVaultView)
                }
            }
        }
        return true
    })
    return balances
}

// {Address: {Type: Balance}}
// [VaultView]
// -> {Type: VaultView}
pub fun main(address: Address): {Type: VaultView} {
    let balances: {Type: VaultView} = {}
    
    // Get views from specified address
    let mainAccountViews = getAllBalancesFromAddress(address)

    // TODO: change approach - get all types of vaults & their paths
    // iterate over the 
    
    // Add all retrieved views to the running array
    balances(mainAccountViews)
    
    /* Iterate over any child accounts */ 
    //
    // Get reference to ChildAccountManager if it exists
    if let managerRef = getAccount(address).getCapability<
            &{ChildAccount.ChildAccountManagerViewer}
        >(
            ChildAccount.ChildAccountManagerPublicPath
        ).borrow() {
        // Iterate over each child account in ChildAccountManagerRef
        for childAddress in managerRef.getChildAccountAddresses() {
            // Append the NFT metadata for those NFTs in each child account
            balances.appendAll(getAllViewsFromAddress(childAddress))
        }
    }
    return balances 
}

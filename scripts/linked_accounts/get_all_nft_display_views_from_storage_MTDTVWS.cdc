import NonFungibleToken from "../../contracts/utility/NonFungibleToken.cdc"
import MetadataViews from "../../contracts/utility/MetadataViews.cdc"
import LinkedAccounts from "../../contracts/LinkedAccounts.cdc"

/// Helper function that retrieves data about all publicly accessible NFTs in an account
///
pub fun getAllViewsFromAddress(_ address: Address): [MetadataViews.NFTView] {
    // Get the account
    let account: AuthAccount = getAuthAccount(address)
    // Init for return value
    let data: [MetadataViews.NFTView] = []
    // Assign the types we'll need
    let collectionType: Type = Type<@{NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>()
    let displayType: Type = Type<MetadataViews.Display>()
    let collectionDisplayType: Type = Type<MetadataViews.NFTCollectionDisplay>()
    let collectionDataType: Type = Type<MetadataViews.NFTCollectionData>()

    // Iterate over each public path
    account.forEachStored(fun (path: StoragePath, type: Type): Bool {
        // Check if it's a Collection we're interested in, if so, get a reference
        // TODO: Will need to fix how LinkedAccounts contract resolves Collection Metadata since NFT.CollectionPublic is not public atm
        if type.isSubtype(of: collectionType) && !type.isSubtype(of: Type<@LinkedAccounts.Collection>()) {
            if let collectionRef = account.borrow<
                &{NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}
            >(from: path) {
                // Iterate over the Collection's NFTs, continuing if the NFT resolves the views we want
                for id in collectionRef.getIDs() {
                    let resolverRef: &{MetadataViews.Resolver} = collectionRef.borrowViewResolver(id: id)
                    data.append(MetadataViews.getNFTView(id: id, viewResolver: resolverRef))
                }
            }
        }
        return true
    })
    return data
}

/// Script that retrieve data about all publicly accessible NFTs in an account and any of its
/// child accounts
///
/// Note that this script does not consider accounts with exceptionally large collections 
/// which would result in memory errors. To compose a script that does cover accounts with
/// a large number of sub-accounts and/or NFTs within those accounts, see example 5 in
/// the NFT Catalog's README: https://github.com/dapperlabs/nft-catalog and adapt for use
/// with LinkedAccounts.Collection
///
pub fun main(address: Address): {Address: [MetadataViews.NFTView]} {
    let allNFTData: {Address: [MetadataViews.NFTView]} = {}
    
    // Add all retrieved views to the running mapping indexed on address
    allNFTData.insert(key: address, getAllViewsFromAddress(address))

    /* Iterate over any child accounts */ 
    //
    // Get reference to LinkedAccounts.Collection if it exists
    if let collectionRef = getAccount(address).getCapability<
            &LinkedAccounts.Collection{LinkedAccounts.CollectionPublic}
        >(
            LinkedAccounts.CollectionPublicPath
        ).borrow() {
        // Iterate over each linked account in LinkedAccounts.Collection
        for childAddress in collectionRef.getLinkedAccountAddresses() {
            if !allNFTData.containsKey(childAddress) {
                // Insert the NFT metadata for those NFTs in each child account
                // indexing on the account's address
                allNFTData.insert(key: childAddress, getAllViewsFromAddress(childAddress))
            }
        }
    }
    return allNFTData 
}

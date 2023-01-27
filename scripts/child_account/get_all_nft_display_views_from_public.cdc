import NonFungibleToken from "../../contracts/utility/NonFungibleToken.cdc"
import MetadataViews from "../../contracts/utility/MetadataViews.cdc"
import ChildAccount from "../../contracts/ChildAccount.cdc"

pub struct NFTData {
    pub let name: String
    pub let description: String
    pub let thumbnail: String
    pub let resourceID: UInt64
    pub let ownerAddress: Address
    pub let collectionName: String
    pub let collectionDescription: String
    pub let collectionURL: String

    init(
        name: String,
        description: String,
        thumbnail: String,
        resourceID: UInt64,
        ownerAddress: Address,
        collectionName: String,
        collectionDescription: String,
        collectionURL: String
    ) {
        self.name = name
        self.description = description
        self.thumbnail = thumbnail
        self.resourceID = resourceID
        self.ownerAddress = ownerAddress
        self.collectionName = collectionName
        self.collectionDescription = collectionDescription
        self.collectionURL = collectionURL
    }
}

pub fun getAllViewsFromAddress(_ address: Address): [NFTData] {
    // Get the account
    let account = getAccount(address)
    // Init for return value
    let views: [NFTData] = []
    // Assign the types we'll need
    let collectionType: Type = Type<Capability<&{NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>>()
    let displayType: Type = Type<MetadataViews.Display>()
    let collectionDisplay: Type = Type<MetadataViews.NFTCollectionDisplay>()

    // Iterate over each public path
    account.forEachPublic(fun (path: PublicPath, type: Type): Bool {
        // Check if it's a Collection we're interested in, if so, get a reference
        if type.isSubtype(of: collectionType) {
            if let collectionRef = account.getCapability<
                &{NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}
            >(path)
            .borrow() {
                // Iterate over the Collection's NFTs, continuing if the NFT resolves the views we want
                for id in collectionRef.getIDs() {
                    let resolverRef = collectionRef.borrowViewResolver(id: id)
                    if let display = resolverRef.resolveView(displayType) as! MetadataViews.Display? {
                        if let collectionDisplay = resolverRef.resolveView(collectionDisplay) as! MetadataViews.NFTCollectionDisplay? {
                            // Build our NFTData struct from the metadata
                            let nftData = NFTData(
                                name: display.name,
                                description: display.description,
                                thumbnail: display.thumbnail.uri(),
                                resourceID: resolverRef.uuid,
                                ownerAddress: resolverRef.owner!.address,
                                collectionName: collectionDisplay.name,
                                collectionDescription: collectionDisplay.description,
                                collectionURL: collectionDisplay.externalURL.url
                            )
                            // Add it to our views
                            views.append(nftData)
                        }
                    }
                }
            }
        }
        return true
    })
    return views
}

pub fun main(address: Address): [NFTData] {
    let views: [NFTData] = []
    
    // Get views from specified address
    let mainAccountViews = getAllViewsFromAddress(address)
    
    // Add all retrieved views to the running array
    views.appendAll(mainAccountViews)
    
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
            views.appendAll(getAllViewsFromAddress(childAddress))
        }
    }
    return views 
}

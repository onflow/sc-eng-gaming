import MetadataViews from "./utility/MetadataViews.cdc"

/// DynamicNFT
/// 
/// In this contract, we've specified a set of interfaces that enable the implementing
/// resources to define resource to which they can be attached & receive resources
/// as Attachments. An Attachment is simply a resource that can be attached to another
/// via the Dynamic interface. Dynamic implies that attributes on the NFT can be altered
/// by entities outside of the NFT's defining contract, and perhaps even with limitations
/// defined by access control that allows another party to alter information that the NFT's
/// owner cannot.
///
/// Why would one want to alter NFT attributes? This sort of behavior is desirable when NFTs
/// are used in games where you want a contract's game logic to govern the data held on
/// an NFT and don't necessarily trust the owner of the resource to not tamper with it in
/// their favor.
/// 
/// Why would you want attachments? They can be very useful for a variety of use cases. 
/// Recall CryptoKitties & KittyItems! Attachments on NFTs introduce a world of composability
/// not available otherwise. We're showcasing that in the first application of DynamicNFT,
/// RockPaperScissorsGame. Any NFT that implements Dynamic can be used in the game which
/// attaches Moves & the ability to recall win/loss records. 
///
/// Note that Attachments will soon be native to Cadence, but this is our best attempt
/// to emulate the specifications in the [Attachments FLIP](https://github.com/onflow/flips/pull/11)
/// with the current language features while also remaining backwards compatible. 
/// If you're reading this when Attachments are live, we recommend leveraging the native
/// feature.
/// 
///
// TODO: Delete this contract - no longer needed with native attachments
pub contract DynamicNFT {

    /// A view struct that contains information about the types attached to a resource
    ///
    pub struct AttachmentsView {
        /// The id of the associated NFT
        pub let nftID: UInt64
        /// A mapping of the Types attached to the NFT
        pub let attachmentTypes: [Type]
        /// A mapping of the views supported by each type attached to this NFT
        pub let attachmentViews: {Type: [Type]}

        init(nftID: UInt64, attachmentTypes: [Type], attachmentViews: {Type: [Type]}) {
            self.nftID = nftID
            self.attachmentTypes = attachmentTypes
            self.attachmentViews = attachmentViews
        }
    }

    pub resource interface NFTAttachment {
        pub let nftID: UInt64
    }

    // TODO: Need to figure out another way to resolve attachment views - or maybe we keep this?
    /// Interface that enables the implementing resource to return the views supported by their attachments
    ///
    // pub resource interface AttachmentViewResolver {

    //     /// Returns the views supported by all of the attachments indexed by the supporting attachment's type
    //     ///
    //     /// @return mapping to attachment's Type to view Type
    //     ///
    //     // TODO: Do this without attachments mapping
    //     pub fun getAttachmentViews(): {Type: [Type]} {

    //         let viewsByAttachmentType: {Type: [Type]} = {}
            
    //         // Iterate over the NFT's attachments and get the views they support
    //         for type in self.attachments.keys {
    //             if let attachmentRef = &self.attachments[type] as auth &AnyResource{MetadataViews.Resolver}? {
    //                 viewsByAttachmentType.insert(key: type, attachmentRef.getViews())
    //             }
    //         }
            
    //         return viewsByAttachmentType
    //     }

    //     /// Given an attachment Type and the view Type, will return the view resolved by the attachment of given Type
    //     ///
    //     /// @param attachmentType: The Type of the attachment
    //     /// @param view: The Type of the desired view to resolve
    //     ///
    //     /// @return The resolved view as AnyStruct if it exists and nil otherwise
    //     ///
    //     // TODO: Do this without attachments mapping
    //     pub fun resolveAttachmentView(attachmentType: Type, view: Type): AnyStruct? {
    //         if let attachmentRef = &self.attachments[attachmentType] as auth &AnyResource{MetadataViews.Resolver}? {
    //             return attachmentRef.resolveView(view)
    //         }
    //         return nil
    //     }
    // }
}
 
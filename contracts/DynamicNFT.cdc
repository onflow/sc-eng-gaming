import MetadataViews from "./utility/MetadataViews.cdc"

pub contract DynamicNFT {

    /// A view struct that contains information about the types attached to a resource
    ///
    pub struct AttachmentsView {
        pub let nftID: UInt64
        pub let attachmentTypes: [Type]

        init(nftID: UInt64, attachmentTypes: [Type]) {
            self.nftID = nftID
            self.attachmentTypes = attachmentTypes
        }
    }

    /// Interface that enables the implementing resource to return the views supported by their attachments
    ///
    pub resource interface AttachmentViewResolver {
        /// Mapping of attachments added to the implementing resource
        access(contract) let attachments: @{Type: AnyResource{Attachment, MetadataViews.Resolver}}

        /// Returns the views supported by all of the attachments indexed by the supporting attachment's type
        ///
        /// @return mapping to attachment's Type to view Type
        ///
        pub fun getAttachmentViews(): {Type: [Type]} {

            let viewsByAttachmentType: {Type: [Type]} = {}
            
            // Iterate over the NFT's attachments and get the views they support
            for type in self.attachments.keys {
                if let attachmentRef = &self.attachments[type] as auth &AnyResource{Attachment, MetadataViews.Resolver}? {
                    viewsByAttachmentType.insert(key: type, attachmentRef.getViews())
                }
            }
            
            return viewsByAttachmentType
        }

        /// Given an attachment Type and the view Type, will return the view resolved by the attachment of given Type
        ///
        /// @param attachmentType: The Type of the attachment
        /// @param view: The Type of the desired view to resolve
        ///
        /// @return The resolved view as AnyStruct if it exists and nil otherwise
        ///
        pub fun resolveAttachmentView(attachmentType: Type, view: Type): AnyStruct? {
            if let attachmentRef = &self.attachments[attachmentType] as auth &AnyResource{Attachment, MetadataViews.Resolver}? {
                return attachmentRef.resolveView(view)
            }
            return nil
        }
    }

    /// An interface for a resource defining the Type that an attachment is
    /// designed to be attached to
    ///
    pub resource interface Attachment {
        pub let nftID: UInt64
        pub let attachmentFor: [Type]
    }

    /// An interface defining a resource that can receive and maintain Composite Types implementing 
    /// Attachment and MetadataViews.Resolver
    ///
    pub resource interface Dynamic {
        /// Mapping of attachments added to the implementing resource
        access(contract) let attachments: @{Type: AnyResource{Attachment, MetadataViews.Resolver}}

        pub fun addAttachment(_ attachment: @AnyResource{Attachment, MetadataViews.Resolver}) {
            pre {
                !self.hasAttachmentType(attachment.getType()):
                    "NFT already contains attachment of this type!"
            }
        }

        /// Function revealing whether NFT has an attachment of the given Type
        ///
        /// @param type: The type in question
        ///
        /// @return true if NFT has given Type attached and false otherwise
        ///
        pub fun hasAttachmentType(_ type: Type): Bool {
            return self.attachments.containsKey(type)
        }

        /// Returns a reference to the attachment of the given Type
        ///
        /// @param type: Type of the desired attachment reference
        ///
        /// @return Generic auth reference ready for downcasting
        ///
        pub fun getAttachmentRef(_ type: Type): auth &AnyResource{Attachment, MetadataViews.Resolver}? {
            return &self.attachments[type] as auth &AnyResource{Attachment, MetadataViews.Resolver}?
        }

        /// Getter method for array of types attached to this NFT
        ///
        /// @return array of attached Types
        ///
        pub fun getAttachmentTypes(): [Type] {
            return self.attachments.keys
        }

        /// Allows for removal of attachments, but should be handled by the contract in which
        /// the implementing resource is defined
        ///
        ///
        /// @param type: The Type of the Attachment that is to be removed
        ///
        /// @return the removed Attachment if one of the given type exists, nil otherwise
        ///
        access(contract) fun removeAttachment(type: Type): @{DynamicNFT.Attachment}?
    }
}
 
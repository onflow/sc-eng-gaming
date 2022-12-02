import GamePieceNFT from "../../contracts/GamePieceNFT.cdc"
import RockPaperScissorsGame from "../../contracts/RockPaperScissorsGame.cdc"

/// This transaction moves all RockPaperScissorsGame & GamePieceNFT
/// assets from the child account to the parent account
///
transaction {

    let parentCollectionRef: &GamePieceNFT.Collection
    let childCollectionRef: &GamePieceNFT.Collection
    
    prepare(parent: AuthAccount, child: AuthAccount) {
        pre {
            parent.borrow<&RockPaperScissorsGame.GamePlayer>(from: RockPaperScissorsGame.GamePlayerStoragePath) == nil :
                "Parent [".concat(parent.address.toString()).concat("] already contains GamePlayer at expected storage path!")
            parent.borrow<&GamePieceNFT.Collection>(from: GamePieceNFT.CollectionStoragePath) != nil :
                "Parent [".concat(parent.address.toString()).concat("] does not have Collection at expected storage path!")
            child.borrow<&GamePieceNFT.Collection>(from: GamePieceNFT.CollectionStoragePath) != nil :
                "Child [".concat(parent.address.toString()).concat("] does not have Collection at expected storage path!")
        }

        // Check if there is a GamePlayer at the expected path in the child account
        if let gamePlayerRef = child
            .borrow<
                &RockPaperScissorsGame.GamePlayer
            >(
                from: RockPaperScissorsGame.GamePlayerStoragePath
            ) {
            
            // Ensure there's not already a GamePlayer in the parent account
            if let parentGamePlayerRef = parent
                .borrow<
                    &RockPaperScissorsGame.GamePlayer
                >(
                    from: RockPaperScissorsGame.GamePlayerStoragePath
                ) {
                panic(
                    "Avoiding overwrite: GamePlayer already exists at expected path ["
                    .concat(RockPaperScissorsGame.GamePlayerStoragePath.toString())
                    .concat("] in parent account [")
                    .concat(parent.address.toString())
                    .concat("]")
                )
            }
            // Now save the GamePlay in the parent account
            parent.save(
                <-child.load<
                    @RockPaperScissorsGame.GamePlayer
                >(
                    from: RockPaperScissorsGame.GamePlayerStoragePath
                ), to: RockPaperScissorsGame.GamePlayerStoragePath
            )
        }
        // Get a reference to Collections in both accounts
        self.parentCollectionRef = parent
            .borrow<
                &GamePieceNFT.Collection
            >(
                from: GamePieceNFT.CollectionStoragePath
            )!
        self.childCollectionRef = child
            .borrow<
                &GamePieceNFT.Collection
            >(
                from: GamePieceNFT.CollectionStoragePath
            )!
    }

    execute {
        // Withdraw all NFTs from child's Collection into parent's Collection
        for id in self.childCollectionRef.getIDs() {
            self.parentCollectionRef.deposit(token: <-self.childCollectionRef.withdraw(withdrawID: id))
        }
    }
}

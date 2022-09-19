import CommitReveal from "./CommitReveal.cdc"

pub contract ExampleCommitReveal {

    pub let ExampleCommitRevealStoragePath: StoragePath
    pub let ExampleRevealPublicPath: PublicPath

    pub let revealationCooldownPeriod: UInt64

    event Commited(publicCommitment: String, secretCommitment: String)

    event Revealed(publicCommitment: String, revealedData: String)

    pub resource ExampleReveal: CommitReveal.Reveal {}


    pub resource ExampleCommit: CommitReveal.Commit, ExampleReveal {

        pub var commitments : {UInt64: string}

        pub var commitmentTimings: {UInt64: UInt64}

        init(){}

        pub fun commit(publicCommitment: AnyStruct, secretCommitment: String) {
            pre {
                secretCommitment != "", "Secret commitment is empty string"
            }
            let publicValue = (publicCommitment as? UInt64) ?? panic("Incorrect type value provided to publicCommitment")
            self.commitments.insert(key: publicValue, value: secretCommitment)
            self.commitmentTimings.insert(key: publicValue, value: getCurrentBlock().height)
            emit Commited(publicCommitment: publicValue, secretCommitment: secretCommitment)
        } 

        pub fun isRevealationAllowed(identifer: AnyStruct) : Bool {
            if let validIdentifier = identifer as? UInt64 {
                if let commitmentAt = self.commitmentTimings[validIdentifier] {
                    return getCurrentBlock().height < commitmentAt + ExampleCommitReveal.revealationCooldownPeriod
                }
            }
            return false
        }

        pub fun reveal(publicCommitment: AnyStruct, remainingPartialCommitment: AnyStruct, salt: String) {
            pre {
                    self.isRevealationAllowed(publicCommitment) == true, "Reveal phase is not kicked in yet."
            }
            let publicCommitmentIdentifer = (publicCommitment as? UInt64) ?? panic("Unable to downcast the publicCommitment value")
            let secretCommitment = self.commitments[publicCommitmentIdentifer] ?? panic("Commitment does not exists")
            // Verify the commitment value.
            // TODO: Need to create a variable to set the type of secret commitment.
            let validRemainingPartialCommitment = (remainingPartialCommitment as? String) ?? panic("Unable to downcast the remainingPartialCommitment to its valid type")
            let data = HashAlgorithm.SHA3_256.hash(validRemainingPartialCommitment.concat(salt).decodeHex())
            assert(secretCommitment == HashAlgorithm.SHA3_256.hash(data).encodeHex(), message: "Incorrect values of salt or remainingPartialCommitment provided")
            
            // If we want to delete the commitments then we can otherwise we can keep it.
            emit Revealed(publicCommitment: publicCommitmentIdentifer, revealedData: validRemainingPartialCommitment)
        }
    }

    pub fun createExampleCommitResource() : @ExampleCommit {
        return <- create ExampleCommit()
    }

    init() {
        self.ExampleCommitRevealStoragePath = /storage/ExampleCommitRevealPath
        self.ExampleRevealPublicPath = /public/ExampleRevealPublicPath
        self.revealationCooldownPeriod = 10
    }

}
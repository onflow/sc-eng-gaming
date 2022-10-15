
/// Basic interface to fulfil the commit reveal technique
pub contract interface CommitReveal {

    /// Public resource responsible to reveal the partial secret commitment.
    /// It can be used by anyone to reveal the secret commitment, given that the caller
    /// posses the `salt` that was used to create secret commitment.
    pub resource interface Reveal {

        /// It can be used when reveal is based on a certain on-chain event
        /// ex - Only reveal after a certain block or once all participants are committed. 
        pub fun isRevealationAllowed(identifer: AnyStruct): Bool


        /// Function used to reveal the partial secret commitment.
        /// @param publicCommitment It is the partial data that get committed to the chain. Used to know
        /// which commitment needs to get revealed to the public.
        /// @param remainingPartialCommitment Remaining part of the commitment that was secret during the commitment phase.
        /// @param salt Private key or any random string used to generate the `secretCommitment`.
        pub fun reveal(publicCommitment: AnyStruct, remainingPartialCommitment: AnyStruct, salt: String) {
            pre {
                    self.isRevealationAllowed(identifer: publicCommitment) == true, "Reveal phase is not kicked in yet."
            }
        }
    } 

    /// Resource responsible to commit the partial commitment on-chain.
    /// User will own the resource to secretly commit the on-chain data in hash form
    /// and also provide the public data that links to its secret commitment.
    pub resource interface Commit: Reveal {
        /// Function used to commit anything on-chain.
        /// @param publicCommitment It is the partial data that get committed to the chain.
        /// @param secretCommitment It is the other partial data secretly committed to the chain. 
        pub fun commit(publicCommitment: AnyStruct, secretCommitment: String) 
    }

}
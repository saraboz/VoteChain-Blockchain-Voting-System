// Voting.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./New_UserRegistration.sol";
import "./New_ElectionManager.sol";
import "./New_Results.sol";

contract Voting {
    UserRegistration public userReg;
    ElectionManager public electionMgr;
    Results public results;

    // Track votes by election ID and user UUID
    mapping(string => mapping(string => bool)) private hasVoted;
    // Additionally track votes by election ID and wallet address
    mapping(string => mapping(address => bool)) private walletHasVoted;

    event VoteCasted(string indexed electionId, string voterUuid, string candidate);

    constructor(
        address userRegAddr,
        address electionMgrAddr,
        address resultsAddr
    ) {
        userReg = UserRegistration(userRegAddr);
        electionMgr = ElectionManager(electionMgrAddr);
        results = Results(resultsAddr);
    }

    function vote(string calldata electionId, string calldata candidate) external {
        string memory uuid = userReg.walletToUuid(msg.sender);
        
        // Combine validation checks to reduce gas
        require(bytes(uuid).length > 0, "Wallet not registered");
        require(!hasVoted[electionId][uuid], "Already voted");
        require(!walletHasVoted[electionId][msg.sender], "Wallet already voted");
        require(electionMgr.isElectionActive(electionId), "Election not active");
        
        // Use direct validity check instead of looping through candidates
        require(electionMgr.isCandidateInElection(electionId, candidate), "Invalid candidate");

        // mark vote (combined assignment saves gas)
        hasVoted[electionId][uuid] = walletHasVoted[electionId][msg.sender] = true;

        // record on-chain tally
        results.recordVote(electionId, candidate);

        emit VoteCasted(electionId, uuid, candidate);
    }

    function hasCurrentUserVoted(string calldata electionId) external view returns (bool) {
        string memory uuid = userReg.walletToUuid(msg.sender);
        if (bytes(uuid).length == 0) {
            return false;
        }
        return hasVoted[electionId][uuid];
    }

    function getRemainingTime(string calldata electionId) external view returns (uint64) {
        return electionMgr.getRemainingTime(electionId);
    }

    function getEndTime(string calldata electionId) external view returns (uint64) {
        return electionMgr.getEndTime(electionId);
    }
    
    function hasWalletVoted(string calldata electionId, address wallet) external view returns (bool) {
        return walletHasVoted[electionId][wallet];
    }
}
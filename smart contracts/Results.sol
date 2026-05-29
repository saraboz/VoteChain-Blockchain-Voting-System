// Results.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Results {
    mapping(string => mapping(string => uint64)) public candidateVotes; // Reduced from uint256 to uint64
    mapping(string => uint64) public totalVotes; // Reduced from uint256 to uint64
    mapping(string => string[]) internal electionCandidates;
    // Mapping for O(1) candidate existence check
    mapping(string => mapping(string => bool)) internal candidateExists;
    mapping(string => bool) public resultsVisible;

    event VoteRecorded(string indexed electionId, string candidate, uint64 votes);
    event ResultsVisibilityChanged(string indexed electionId, bool visible);

    function recordVote(string calldata electionId, string calldata candidate) external {
        if (!candidateExists[electionId][candidate]) {
            electionCandidates[electionId].push(candidate);
            candidateExists[electionId][candidate] = true;
        }

        candidateVotes[electionId][candidate]++;
        totalVotes[electionId]++;

        emit VoteRecorded(electionId, candidate, candidateVotes[electionId][candidate]);
    }

    function setResultsVisible(string calldata electionId, bool visible) external {
        resultsVisible[electionId] = visible;
        emit ResultsVisibilityChanged(electionId, visible);
    }

    function getResults(
        string calldata electionId
    ) external view returns (string[] memory, uint64[] memory) {
        require(resultsVisible[electionId], "Results not visible");

        string[] memory cands = electionCandidates[electionId];
        uint64[] memory votes = new uint64[](cands.length);
        for (uint256 i = 0; i < cands.length; i++) {
            // Use the mapping to get votes, will return 0 if no votes
            votes[i] = candidateVotes[electionId][cands[i]];
        }
        return (cands, votes);
    }

    function getWinner(string calldata electionId) external view returns (string memory) {
        require(resultsVisible[electionId], "Results not visible");
        require(totalVotes[electionId] > 0, "No votes recorded");

        string[] memory cands = electionCandidates[electionId];
        uint64 highest = 0;
        string memory winner = "";

        for (uint256 i = 0; i < cands.length; i++) {
            uint64 v = candidateVotes[electionId][cands[i]];
            if (v > highest) {
                highest = v;
                winner = cands[i];
            }
        }
        return winner;
    }

    function isCandidateRegistered(string calldata electionId, string calldata candidate) external view returns (bool) {
        return candidateExists[electionId][candidate];
    }
}
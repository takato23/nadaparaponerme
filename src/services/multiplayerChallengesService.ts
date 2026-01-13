/**
 * Multiplayer Challenges Service (re-export from root services)
 * 
 * This module re-exports the multiplayer challenges service for unified imports.
 */

export {
    getActiveChallenges,
    createChallenge,
    joinChallenge,
    submitOutfitToChallenge,
    voteOnSubmission,
    getChallengeDetails,
    getChallengeLeaderboard,
    getUserChallengeHistory,
    type MultiplayerChallenge,
    type ChallengeSubmission,
    type ChallengeVote,
} from '../../services/multiplayerChallengesService';

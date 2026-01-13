/**
 * Friendship Service (re-export from root services)
 * 
 * This module re-exports the friendship service for unified imports.
 */

export {
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    getFriendsList,
    getPendingRequests,
    getSentRequests,
    searchUsers,
    getUserProfile,
    getFriendCloset,
    getMutualFriends,
    getFollowersCount,
    getFollowingCount,
    type Friend,
    type FriendRequest,
    type UserSearchResult,
} from '../../services/friendshipService';

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchSuggestedUsers, followUser, SuggestedUser } from '@/src/services/socialService';


export const SuggestedUsers: React.FC = () => {
    const [users, setUsers] = useState<SuggestedUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSuggestions();
    }, []);

    const loadSuggestions = async () => {
        try {
            const data = await fetchSuggestedUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to load suggestions', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async (userId: string) => {
        try {
            await followUser(userId);
            // Remove user from list after following
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error('Failed to follow user', error);
            toast.error('Error al seguir usuario');
        }
    };

    if (loading) return <div className="animate-pulse h-40 bg-gray-100 rounded-xl"></div>;
    if (users.length === 0) return null;

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/20 mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Gente con tu vibra ✨</h3>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {users.map(user => (
                    <div key={user.id} className="flex-shrink-0 w-32 flex flex-col items-center bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                        <div className="relative mb-2">
                            <img
                                src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}&background=random`}
                                alt={user.username}
                                className="w-16 h-16 rounded-full object-cover border-2 border-purple-100"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-purple-100 text-purple-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                                {Math.round(user.similarity_score * 100)}%
                            </div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate w-full text-center">
                            {user.display_name || user.username}
                        </span>
                        <span className="text-xs text-gray-500 mb-2 truncate w-full text-center">
                            {user.common_preferences.length} gustos en común
                        </span>
                        <button
                            onClick={() => handleFollow(user.id)}
                            className="w-full py-1 px-2 bg-black text-white text-xs font-medium rounded-full hover:bg-gray-800 transition-colors"
                        >
                            Seguir
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Talent } from '../lib/supabase';
import {
  Plus,
  Heart,
  Filter,
  X,
  Upload,
  Image as ImageIcon,
  Video,
  Search,
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Music',
  'Dance',
  'Art',
  'Sports',
  'Photography',
  'Writing',
  'Acting',
  'Coding',
  'Other',
];

export const TalentShowcase = () => {
  const { user } = useAuth();
  const [talents, setTalents] = useState<Talent[]>([]);
  const [filteredTalents, setFilteredTalents] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchTalents();
  }, []);

  useEffect(() => {
    filterTalents();
  }, [talents, selectedCategory, searchQuery]);

  const fetchTalents = async () => {
    try {
      const { data, error } = await supabase
        .from('talents')
        .select(
          `
          *,
          profile:profiles(*)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (user) {
        const { data: likesData } = await supabase
          .from('talent_likes')
          .select('talent_id')
          .eq('user_id', user.id);

        const likedIds = new Set(likesData?.map((like) => like.talent_id) || []);
        const talentsWithLikes = (data || []).map((talent) => ({
          ...talent,
          is_liked: likedIds.has(talent.id),
        }));

        setTalents(talentsWithLikes);
      } else {
        setTalents(data || []);
      }
    } catch (error) {
      console.error('Error fetching talents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTalents = () => {
    let filtered = talents;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter((talent) => talent.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (talent) =>
          talent.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          talent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          talent.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredTalents(filtered);
  };

  const handleLike = async (talentId: string) => {
    if (!user) return;

    const talent = talents.find((t) => t.id === talentId);
    if (!talent) return;

    try {
      if (talent.is_liked) {
        await supabase
          .from('talent_likes')
          .delete()
          .eq('talent_id', talentId)
          .eq('user_id', user.id);

        await supabase
          .from('talents')
          .update({ likes_count: Math.max(0, talent.likes_count - 1) })
          .eq('id', talentId);
      } else {
        await supabase.from('talent_likes').insert({
          talent_id: talentId,
          user_id: user.id,
        });

        await supabase
          .from('talents')
          .update({ likes_count: talent.likes_count + 1 })
          .eq('id', talentId);
      }

      fetchTalents();
    } catch (error) {
      console.error('Error liking talent:', error);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Talent Showcase</h1>
          <p className="text-gray-600 mt-1">Discover and share amazing talents</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Upload Talent
        </button>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search talents, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Filter size={20} />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3">Category</h3>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading talents...</p>
        </div>
      ) : filteredTalents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-600">No talents found. Be the first to upload!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTalents.map((talent) => (
            <TalentCard key={talent.id} talent={talent} onLike={handleLike} />
          ))}
        </div>
      )}

      {showUploadModal && (
        <UploadTalentModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={fetchTalents}
        />
      )}
    </div>
  );
};

const TalentCard = ({
  talent,
  onLike,
}: {
  talent: Talent;
  onLike: (id: string) => void;
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="aspect-video bg-gray-200 relative">
        {talent.media_url ? (
          talent.media_type === 'video' ? (
            <video src={talent.media_url} className="w-full h-full object-cover" controls />
          ) : (
            <img
              src={talent.media_url}
              alt={talent.title}
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={48} className="text-gray-400" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700">
            {talent.category}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 mb-1">{talent.title}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{talent.description}</p>

        {talent.tags && talent.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {talent.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-600">
                {talent.profile?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <span className="text-sm text-gray-700">{talent.profile?.full_name}</span>
          </div>
          <button
            onClick={() => onLike(talent.id)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full transition-colors ${
              talent.is_liked
                ? 'bg-red-50 text-red-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Heart size={16} fill={talent.is_liked ? 'currentColor' : 'none'} />
            <span className="text-sm font-medium">{talent.likes_count}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const UploadTalentModal = ({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Other',
    media_url: '',
    media_type: 'image',
    tags: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('talents').insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        media_url: formData.media_url,
        media_type: formData.media_type,
        tags: formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error uploading talent:', error);
      alert('Error uploading talent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Upload Your Talent</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {CATEGORIES.filter((c) => c !== 'All').map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Media Type
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, media_type: 'image' })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  formData.media_type === 'image'
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                <ImageIcon size={20} />
                Image
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, media_type: 'video' })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  formData.media_type === 'video'
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                <Video size={20} />
                Video
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Media URL
            </label>
            <input
              type="url"
              value={formData.media_url}
              onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="guitar, acoustic, performance"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Upload size={20} />
              {loading ? 'Uploading...' : 'Upload Talent'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

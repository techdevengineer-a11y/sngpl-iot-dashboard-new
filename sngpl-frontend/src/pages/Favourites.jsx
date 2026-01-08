import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Activity, TrendingUp } from 'lucide-react';
import Layout from '../components/Layout';

const Favourites = () => {
  const navigate = useNavigate();
  const [favourites, setFavourites] = useState([]);

  useEffect(() => {
    // Load favourites from localStorage
    const saved = localStorage.getItem('favouriteStations');
    if (saved) {
      setFavourites(JSON.parse(saved));
    }
  }, []);

  const removeFavourite = (stationId) => {
    const updated = favourites.filter(f => f.id !== stationId);
    setFavourites(updated);
    localStorage.setItem('favouriteStations', JSON.stringify(updated));
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3">
            <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Favourite Stations
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Quick access to your most monitored stations
              </p>
            </div>
          </div>
        </div>

        {/* Favourites Grid */}
        {favourites.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
            <Star className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Favourites Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Mark stations as favourites for quick access
            </p>
            <button
              onClick={() => navigate('/sections')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Sections
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favourites.map((station) => (
              <div
                key={station.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer"
                onClick={() => navigate(`/stations/${station.id}`)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {station.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {station.client_id}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavourite(station.id);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  </button>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <MapPin className="w-4 h-4" />
                  <span>{station.location}</span>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">Status</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {station.status || 'Online'}
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">Flow</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {station.flow || 'N/A'} m³
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Favourites;

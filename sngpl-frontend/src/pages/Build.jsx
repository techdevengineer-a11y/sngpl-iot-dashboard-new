import React, { useState } from 'react';
import { Hammer, Plus, Save, FileText, Calendar, Users, AlertTriangle } from 'lucide-react';

const Build = () => {
  const [buildName, setBuildName] = useState('');
  const [buildType, setBuildType] = useState('observation');
  const [description, setDescription] = useState('');
  const [builds, setBuilds] = useState([]);

  const handleSave = () => {
    if (!buildName.trim()) {
      alert('Please enter a build name');
      return;
    }

    const newBuild = {
      id: Date.now(),
      name: buildName,
      type: buildType,
      description: description,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    setBuilds([...builds, newBuild]);

    // Clear form
    setBuildName('');
    setDescription('');

    alert('Build created successfully!');
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Hammer className="w-8 h-8 text-orange-600" />
          Build
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create and manage observation builds, reports, and configurations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create New Build */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Create New Build
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Build Name *
              </label>
              <input
                type="text"
                value={buildName}
                onChange={(e) => setBuildName(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors"
                placeholder="e.g., Weekly Monitoring Report"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Build Type
              </label>
              <select
                value={buildType}
                onChange={(e) => setBuildType(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors"
              >
                <option value="observation">Observation Report</option>
                <option value="analytics">Analytics Build</option>
                <option value="monitoring">Monitoring Configuration</option>
                <option value="alert">Alert Rule Set</option>
                <option value="custom">Custom Build</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="4"
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors resize-none"
                placeholder="Describe what this build is for..."
              />
            </div>

            <button
              onClick={handleSave}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
            >
              <Save className="w-5 h-5" />
              Create Build
            </button>
          </div>
        </div>

        {/* Recent Builds */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Builds
            </h2>
          </div>

          {builds.length === 0 ? (
            <div className="text-center py-12">
              <Hammer className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">No builds created yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Create your first build to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {builds.slice().reverse().map((build) => (
                <div
                  key={build.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {build.name}
                    </h3>
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full">
                      {build.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {build.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(build.createdAt).toLocaleDateString()}
                    </span>
                    <span className="capitalize">
                      {build.type.replace('-', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Build Templates */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Build Templates
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer">
            <FileText className="w-8 h-8 text-blue-600 mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Daily Report
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Generate daily observation reports with key metrics
            </p>
          </div>

          <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-orange-500 dark:hover:border-orange-400 transition-colors cursor-pointer">
            <AlertTriangle className="w-8 h-8 text-orange-600 mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Alert Configuration
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Set up custom alert rules and thresholds
            </p>
          </div>

          <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 dark:hover:border-green-400 transition-colors cursor-pointer">
            <Users className="w-8 h-8 text-green-600 mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Team Dashboard
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Build custom dashboards for team monitoring
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Build;

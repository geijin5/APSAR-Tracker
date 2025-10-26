import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { PlusIcon, CubeIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'

export default function Assets() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [deletingAsset, setDeletingAsset] = useState(null)

  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await api.get('/assets')
      return response.data
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (assetId) => {
      const res = await api.delete(`/assets/${assetId}`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assets'])
      setDeletingAsset(null)
    }
  })

  const handleDelete = (e, asset) => {
    e.preventDefault()
    e.stopPropagation()
    if (window.confirm(`Are you sure you want to delete "${asset.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(asset._id)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800'
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800'
      case 'repair':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Assets</h1>
        <Link
          to="/assets/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Asset
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets?.map((asset) => (
          <div
            key={asset._id}
            className="card hover:shadow-lg transition-shadow relative"
          >
            <Link to={`/assets/${asset._id}`} className="block">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <CubeIcon className="h-10 w-10 text-gray-400" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{asset.name}</h3>
                  <p className="text-sm text-gray-500">#{asset.assetNumber}</p>
                  <div className="mt-2 flex items-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        asset.status
                      )}`}
                    >
                      {asset.status}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
            {user?.role === 'admin' && (
              <button
                onClick={(e) => handleDelete(e, asset)}
                disabled={deleteMutation.isLoading}
                className="absolute top-3 right-3 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete asset"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {assets?.length === 0 && (
        <div className="text-center py-12">
          <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No assets</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new asset.</p>
        </div>
      )}
    </div>
  )
}

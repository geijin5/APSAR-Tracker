import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'

export default function AssetDetail() {
  const { id } = useParams()

  const { data: asset, isLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: async () => {
      const response = await api.get(`/assets/${id}`)
      return response.data
    }
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!asset) {
    return <div>Asset not found</div>
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/assets" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
          ← Back to Assets
        </Link>
      </div>

      <div className="card mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{asset.name}</h1>
        <p className="text-gray-500">#{asset.assetNumber}</p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Category</h3>
            <p className="mt-1 text-sm text-gray-900">{asset.category}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <p className="mt-1 text-sm text-gray-900">{asset.status}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Location</h3>
            <p className="mt-1 text-sm text-gray-900">{asset.currentLocation || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Assigned Unit</h3>
            <p className="mt-1 text-sm text-gray-900">{asset.assignedUnit || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Additional sections for maintenance history, notes, etc. would go here */}
    </div>
  )
}

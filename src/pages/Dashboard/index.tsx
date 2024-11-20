import { motion } from 'framer-motion'
import { ArrowTrendingUpIcon, ClockIcon, MicrophoneIcon, UserGroupIcon } from '@heroicons/react/24/outline'

const stats = [
  { name: 'Total Episodes', value: '12', icon: MicrophoneIcon },
  { name: 'Total Hours', value: '24.5', icon: ClockIcon },
  { name: 'Total Guests', value: '18', icon: UserGroupIcon },
  { name: 'Avg. Engagement', value: '87%', icon: ArrowTrendingUpIcon },
]

const recentEpisodes = [
  {
    id: 1,
    title: 'The Future of AI in Content Creation',
    guest: 'Dr. Sarah Johnson',
    date: '2024-02-15',
    duration: '1:15:00',
    status: 'published',
  },
  {
    id: 2,
    title: 'Building Sustainable Tech Companies',
    guest: 'Michael Chen',
    date: '2024-02-10',
    duration: '0:55:30',
    status: 'editing',
  },
  {
    id: 3,
    title: 'The Art of Product Management',
    guest: 'Emma Williams',
    date: '2024-02-05',
    duration: '1:05:45',
    status: 'recorded',
  },
]

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Welcome back!
        </h2>
        <p className="mt-2 text-lg text-gray-600">Here's what's happening with your podcast</p>
      </div>

      <div>
        <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={item.name}
              className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6"
            >
              <dt>
                <div className="absolute rounded-md bg-gray-900 p-3">
                  <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-500">{item.name}</p>
              </dt>
              <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
                <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Episodes</h3>
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                  Title
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Guest
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Date
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Duration
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {recentEpisodes.map((episode) => (
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={episode.id}
                >
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {episode.title}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{episode.guest}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{episode.date}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{episode.duration}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                        episode.status === 'published'
                          ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                          : episode.status === 'editing'
                          ? 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                          : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                      }`}
                    >
                      {episode.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

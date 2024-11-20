import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import GuestResearch from './pages/GuestResearch'

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <main className="py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<GuestResearch />} />
              <Route path="/guest-research" element={<GuestResearch />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  )
}

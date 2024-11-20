import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import GuestResearch from './pages/GuestResearch'

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <main className="flex-1 flex flex-col justify-center items-center w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<GuestResearch />} />
            <Route path="/guest-research" element={<GuestResearch />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

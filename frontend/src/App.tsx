import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Discover from './pages/Discover'
import './App.css'
import Watchlist from './pages/Watchlist'

// Every page shares the Layout (header + footer); the page itself renders in its <Outlet />
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="discover" element={<Discover />} />
        <Route path="watchlist" element={<Watchlist />} />
      </Route>
    </Routes>
  )
}

export default App

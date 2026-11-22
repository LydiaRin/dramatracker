import { Routes, Route, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Discover from './pages/Discover'
import Watchlist from './pages/Watchlist'
import DramaPage from './pages/DramaPage'
import Subscriptions from './pages/Subscriptions'
import './App.css'

// key = id, so moving from one drama page to another starts with fresh state
function DramaRoute() {
  const { id } = useParams()
  return <DramaPage key={id} id={Number(id)} />
}

// Every page shares the Layout (header + footer); the page itself renders in its <Outlet />
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="discover" element={<Discover />} />
        <Route path="watchlist" element={<Watchlist />} />
        <Route path="drama/:id" element={<DramaRoute />} />
        <Route path="subscriptions" element={<Subscriptions />} />
      </Route>
    </Routes>
  )
}

export default App

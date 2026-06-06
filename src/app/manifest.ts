import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Controle Futebol',
    short_name: 'Futebol',
    description: 'Controle financeiro da pelada',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a140e',
    theme_color: '#0a140e',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}

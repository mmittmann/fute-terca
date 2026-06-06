import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Controle Futebol',
    short_name: 'Futebol',
    description: 'Controle financeiro da pelada',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#16a34a',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}

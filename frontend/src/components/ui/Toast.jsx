export default function ToastContainer({ toasts }) {
  if (!toasts.length) return null
  const colors = { success:'bg-green-600', error:'bg-red-600', info:'bg-blue-600' }
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full px-4">
      {toasts.map(t => (
        <div key={t.id} className={`${colors[t.type]||'bg-gray-800'} text-white text-sm px-4 py-3 rounded-lg shadow-lg flex items-start gap-2 animate-fade-in`}>
          <span className="flex-1">{t.msg}</span>
        </div>
      ))}
    </div>
  )
}

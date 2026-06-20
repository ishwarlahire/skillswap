export default function EmptyState({ icon='📭', title, desc, action }) {
  return (
    <div className="text-center py-16 px-4">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="font-semibold text-gray-700 text-base mb-1">{title}</p>
      {desc && <p className="text-sm text-gray-400 mb-4">{desc}</p>}
      {action}
    </div>
  )
}

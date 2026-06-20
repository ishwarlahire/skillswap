const STYLES = {
  pending:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  accepted:  'bg-green-50  text-green-700  border-green-200',
  rejected:  'bg-red-50    text-red-600    border-red-200',
  completed: 'bg-gray-100  text-gray-600   border-gray-200',
  cancelled: 'bg-gray-100  text-gray-500   border-gray-200',
  scheduled: 'bg-blue-50   text-blue-700   border-blue-200',
  ongoing:   'bg-purple-50 text-purple-700 border-purple-200',
}
export default function Badge({ status }) {
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${STYLES[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  )
}

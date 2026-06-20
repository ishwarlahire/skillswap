export default function Spinner({ size='md' }) {
  const sz = { sm:'w-4 h-4', md:'w-8 h-8', lg:'w-12 h-12' }[size]
  return (
    <div className="flex justify-center items-center py-10">
      <div className={`${sz} border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin`} />
    </div>
  )
}

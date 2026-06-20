export default function Avatar({ name, url, size = 'md' }) {
  const sz = { sm:'w-8 h-8 text-xs', md:'w-10 h-10 text-sm', lg:'w-14 h-14 text-lg', xl:'w-20 h-20 text-2xl' }[size]
  const initials = (name||'U').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
  if (url) return <img src={url} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />
  return (
    <div className={`${sz} rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center flex-shrink-0 select-none`}>
      {initials}
    </div>
  )
}

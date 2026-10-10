import { useState } from 'react'
import { countryName } from '../data/worldmates'

export default function CountryBadge({ country, compact = false }) {
  const [failedCountry, setFailedCountry] = useState(null)

  if (!country || !/^[A-Z]{2}$/.test(country)) return null

  const name = countryName(country)

  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-500">
      {failedCountry === country ? (
        <span className="rounded bg-slate-100 px-1 text-xs">
          {country}
        </span>
      ) : (
        <img
          src={`https://flagcdn.com/${country.toLowerCase()}.svg`}
          alt={`${name} flag`}
          width="24"
          height="16"
          className="h-4 w-6 rounded-sm object-cover ring-1 ring-black/10"
          loading="lazy"
          onError={() => setFailedCountry(country)}
        />
      )}

      {!compact && <span>{name}</span>}
    </span>
  )
}
import * as React from "react"
import Image from "next/image"

interface flatrate {
  provider_name: string
  provider_id: string
  logo_path: string
}
interface IWatchProvidersProps {
  providers: {
    flatrate: flatrate[]
  }
}

const WatchProviders: React.FunctionComponent<IWatchProvidersProps> = ({
  providers,
}) => {
  const { flatrate } = providers
  return (
    <div className=" flex justify-between space-x-2 items-center">
      <div className="font-fira text-sm font-thin flex flex-col items-start justify-center">
        <div>Disponilble en streaming</div>
        <div className="font-bold">Regarder maintenant</div>
      </div>
      <div className="grid col-auto">
        {flatrate?.length > 0 &&
          flatrate?.map(({ provider_id, provider_name, logo_path }) => {
            return (
              <div key={provider_id} className="w-9 h-9">
                <Image
                  src={`${process.env.NEXT_PUBLIC_CLOUDINARY_FETCH_URL}/https://image.tmdb.org/t/p/original${logo_path}`}
                  width={100}
                  height={100}
                  alt={provider_name}
                />
              </div>
            )
          })}
      </div>
    </div>
  )
}

export default WatchProviders

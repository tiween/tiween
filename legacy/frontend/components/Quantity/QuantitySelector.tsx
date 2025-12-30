import React, { useState } from "react"

const QuantitySelector: React.FC = () => {
  const [count, setCount] = useState(0)

  return (
    <div className="flex">
      <button
        className=" bg-gray-100 px-4 py-0 hover:bg-red-500 hover:text-white"
        onClick={() => setCount(count - 1)}
        disabled={count === 0}
      >
        -
      </button>
      <output className="px-6 py-0  text-center text-lg  text-blue-600 border-solid border-2">
        {count}
      </output>
      <button
        className=" bg-gray-100 px-4 py-0 hover:bg-green-500 hover:text-white"
        onClick={() => setCount(count + 1)}
      >
        +
      </button>
      <br />
    </div>
  )
}

export default QuantitySelector
